package service

import (
	"fmt"
	"log"
	"time"

	"caredata/backend/internal/config"
	"caredata/backend/internal/dedupe"
	"caredata/backend/internal/domain"
	"caredata/backend/internal/ingest"
	"caredata/backend/internal/repository"
	"caredata/backend/internal/storage"
	"github.com/google/uuid"
)

type DedupeService struct {
	repo    *repository.Repository
	storage storage.Storage
	cfg     *config.Config
}

func NewDedupeService(repo *repository.Repository, store storage.Storage, cfg *config.Config) *DedupeService {
	return &DedupeService{
		repo:    repo,
		storage: store,
		cfg:     cfg,
	}
}

// RunDeduplication performs demographic blocking and fuzzy similarity matching across a dataset
func (s *DedupeService) RunDeduplication(datasetID, orgID string, dedupeConfig domain.DeduplicationConfig) ([]domain.DuplicatePair, *domain.DeduplicationStats, error) {
	dataset, err := s.repo.GetDatasetByID(datasetID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to fetch dataset: %w", err)
	}
	if dataset == nil {
		return nil, nil, fmt.Errorf("dataset not found")
	}

	// 1. Open raw data stream from storage
	stream, err := s.storage.GetStream("raw-data", dataset.StoragePath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open dataset stream: %w", err)
	}
	defer stream.Close()

	// 2. Stream and parse rows
	fullPath := ""
	if dataset.FileType == "parquet" {
		fullPath = s.storage.GetStoragePath("raw-data", dataset.StoragePath)
	}
	iter, err := ingest.NewRecordIterator(dataset.FileType, stream, fullPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create iterator: %w", err)
	}
	defer iter.Close()

	var allRows []map[string]interface{}
	for {
		row, err := iter.Next()
		if err != nil {
			break
		}
		allRows = append(allRows, row)
	}

	// 3. Setup default configuration if not provided
	if dedupeConfig.ConfidenceThreshold <= 0 {
		dedupeConfig.ConfidenceThreshold = 0.65
	}
	if dedupeConfig.Weights.FirstNameWeight == 0 && dedupeConfig.Weights.LastNameWeight == 0 {
		dedupeConfig.Weights = dedupe.DefaultDemographicWeights()
	}

	// 4. Fetch existing resolved pairs so we preserve prior user decisions
	resolvedMap, _ := s.repo.GetResolvedPairsByDataset(datasetID)

	// 5. Generate candidate duplicate pairs
	candidatePairs := dedupe.GenerateCandidatePairs(allRows, datasetID, orgID, dedupeConfig)

	// Filter candidate pairs to keep only new pending pairs that haven't been resolved yet
	var newPendingPairs []domain.DuplicatePair
	for _, p := range candidatePairs {
		key := fmt.Sprintf("%s:%s", p.RecordAID, p.RecordBID)
		if _, alreadyResolved := resolvedMap[key]; !alreadyResolved {
			newPendingPairs = append(newPendingPairs, p)
		}
	}

	log.Printf("Generated %d duplicate candidate pairs (new pending: %d, preserved resolved: %d) for dataset %s (threshold: %.2f)",
		len(candidatePairs), len(newPendingPairs), len(resolvedMap)/2, datasetID, dedupeConfig.ConfidenceThreshold)

	// 6. Clean ONLY prior PENDING duplicates for this dataset and save new candidates
	_ = s.repo.DeletePendingDuplicatePairsByDataset(datasetID)
	if len(newPendingPairs) > 0 {
		if err := s.repo.SaveDuplicatePairs(newPendingPairs); err != nil {
			log.Printf("Warning: failed to persist duplicate pairs: %v", err)
		}
	}

	stats, _ := s.repo.GetDeduplicationStats(orgID, datasetID)
	return candidatePairs, stats, nil
}

// ListDuplicatePairs retrieves candidate pairs with filtering and search
func (s *DedupeService) ListDuplicatePairs(filter domain.DuplicateFilterParams) ([]domain.DuplicatePair, int64, error) {
	return s.repo.ListDuplicatePairs(filter)
}

// GetDuplicatePairByID retrieves a single candidate pair
func (s *DedupeService) GetDuplicatePairByID(id string) (*domain.DuplicatePair, error) {
	pair, err := s.repo.GetDuplicatePairByID(id)
	if err != nil {
		return nil, err
	}
	if pair == nil {
		return nil, fmt.Errorf("duplicate pair not found")
	}
	return pair, nil
}

// ResolveDuplicate handles merging records into a Golden Record or marking them as distinct
func (s *DedupeService) ResolveDuplicate(pairID, orgID, userID, userEmail, ipAddress string, req domain.ResolveDuplicateRequest) (*domain.DuplicatePair, error) {
	pair, err := s.repo.GetDuplicatePairByID(pairID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve pair: %w", err)
	}
	if pair == nil {
		return nil, fmt.Errorf("duplicate pair not found")
	}

	if req.Action != domain.DuplicateStatusMerged && req.Action != domain.DuplicateStatusDistinct {
		return nil, fmt.Errorf("invalid action: must be MERGED or DISTINCT")
	}

	// If MERGED, synthesize or save Master Patient Index (MPI) Golden Record
	if req.Action == domain.DuplicateStatusMerged {
		goldenData := req.GoldenRecordData
		if len(goldenData) == 0 {
			// Auto-consolidate: prefer non-empty attributes, prioritize survivor record if indicated
			goldenData = make(map[string]interface{})
			primary := pair.RecordAData
			secondary := pair.RecordBData
			if req.SurvivorRecordID == pair.RecordBID {
				primary = pair.RecordBData
				secondary = pair.RecordAData
			}

			// Copy primary attributes
			for k, v := range primary {
				goldenData[k] = v
			}
			// Fill empty fields from secondary
			for k, v := range secondary {
				if curVal, exists := goldenData[k]; !exists || curVal == nil || fmt.Sprintf("%v", curVal) == "" {
					goldenData[k] = v
				}
			}
		}

		req.GoldenRecordData = goldenData

		// Save / Update Master Patient Index
		masterPatientID := fmt.Sprintf("MPI-%s", uuid.New().String()[:8])
		if mrn, ok := goldenData["mrn"]; ok && mrn != nil && fmt.Sprintf("%v", mrn) != "" {
			masterPatientID = fmt.Sprintf("MPI-%v", mrn)
		} else if pid, ok := goldenData["patient_id"]; ok && pid != nil && fmt.Sprintf("%v", pid) != "" {
			masterPatientID = fmt.Sprintf("MPI-%v", pid)
		}

		mpiRecord := &domain.GoldenRecord{
			ID:               fmt.Sprintf("mpi-%s", uuid.New().String()[:12]),
			OrganizationID:   orgID,
			DatasetID:        pair.DatasetID,
			MasterPatientID:  masterPatientID,
			ConsolidatedData: goldenData,
			SourceRecordIDs:  []string{pair.RecordAID, pair.RecordBID},
			DuplicatePairIDs: []string{pair.ID},
			CreatedBy:        userEmail,
			CreatedAt:        time.Now(),
			UpdatedAt:        time.Now(),
		}
		_ = s.repo.SaveMPIRecord(mpiRecord)
	}

	// Update the duplicate pair record
	if err := s.repo.ResolveDuplicatePair(pairID, orgID, userEmail, req); err != nil {
		return nil, fmt.Errorf("failed to update duplicate pair: %w", err)
	}

	// Log audit trail
	auditDetails := fmt.Sprintf("Action: %s on duplicate pair %s (Confidence: %.1f%%). Notes: %s",
		req.Action, pairID, pair.ConfidenceScore*100, req.ResolutionNotes)
	_ = s.repo.CreateAuditLog(&domain.AuditLog{
		ID:             fmt.Sprintf("aud-%s", uuid.New().String()[:12]),
		OrganizationID: orgID,
		UserID:         userID,
		UserEmail:      userEmail,
		Action:         fmt.Sprintf("DUPLICATE_%s", req.Action),
		Resource:       fmt.Sprintf("duplicate_pair:%s", pairID),
		Details:        auditDetails,
		IPAddress:      ipAddress,
		CreatedAt:      time.Now(),
	})

	return s.repo.GetDuplicatePairByID(pairID)
}

// UnresolveDuplicate resets a duplicate pair back to PENDING status
func (s *DedupeService) UnresolveDuplicate(pairID, orgID, userID, userEmail, ipAddress string) (*domain.DuplicatePair, error) {
	pair, err := s.repo.GetDuplicatePairByID(pairID)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve pair: %w", err)
	}
	if pair == nil {
		return nil, fmt.Errorf("duplicate pair not found")
	}

	if err := s.repo.UnresolveDuplicatePair(pairID, orgID); err != nil {
		return nil, fmt.Errorf("failed to re-open duplicate pair: %w", err)
	}

	// Audit Log
	_ = s.repo.CreateAuditLog(&domain.AuditLog{
		ID:             fmt.Sprintf("aud-%s", uuid.New().String()[:12]),
		OrganizationID: orgID,
		UserID:         userID,
		UserEmail:      userEmail,
		Action:         "DUPLICATE_REOPENED",
		Resource:       fmt.Sprintf("duplicate_pair:%s", pairID),
		Details:        fmt.Sprintf("Reopened duplicate pair %s from status %s to PENDING", pairID, pair.Status),
		IPAddress:      ipAddress,
		CreatedAt:      time.Now(),
	})

	return s.repo.GetDuplicatePairByID(pairID)
}

// BulkResolve automatically merges or marks distinct pending pairs meeting confidence criteria
func (s *DedupeService) BulkResolve(orgID, userID, userEmail, ipAddress string, req domain.BulkResolveRequest) (int64, error) {
	if req.MinConfidence <= 0 {
		req.MinConfidence = 0.90
	}
	if req.Action != domain.DuplicateStatusMerged && req.Action != domain.DuplicateStatusDistinct {
		req.Action = domain.DuplicateStatusMerged
	}

	count, err := s.repo.BulkResolveDuplicatePairs(orgID, userEmail, req)
	if err != nil {
		return 0, fmt.Errorf("bulk resolve failed: %w", err)
	}

	// Audit Log
	_ = s.repo.CreateAuditLog(&domain.AuditLog{
		ID:             fmt.Sprintf("aud-%s", uuid.New().String()[:12]),
		OrganizationID: orgID,
		UserID:         userID,
		UserEmail:      userEmail,
		Action:         fmt.Sprintf("DUPLICATE_BULK_%s", req.Action),
		Resource:       "duplicate_pairs:bulk",
		Details:        fmt.Sprintf("Bulk resolved %d duplicate candidates with threshold >= %.0f%% to %s", count, req.MinConfidence*100, req.Action),
		IPAddress:      ipAddress,
		CreatedAt:      time.Now(),
	})

	return count, nil
}

// GetStats returns summary counts and confidence distributions
func (s *DedupeService) GetStats(orgID, datasetID string) (*domain.DeduplicationStats, error) {
	return s.repo.GetDeduplicationStats(orgID, datasetID)
}

// ListMPIRecords returns consolidated Master Patient Index entries
func (s *DedupeService) ListMPIRecords(orgID, datasetID string, limit, offset int) ([]domain.GoldenRecord, int64, error) {
	return s.repo.ListMPIRecords(orgID, datasetID, limit, offset)
}
