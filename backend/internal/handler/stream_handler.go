package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"caredata/backend/internal/service"
	"caredata/backend/internal/streaming"
)

// StreamHandler handles REST and WebSocket streaming endpoints.
type StreamHandler struct {
	streamService *service.StreamService
	hub           *streaming.Hub
}

// NewStreamHandler creates a new StreamHandler.
func NewStreamHandler(streamService *service.StreamService, hub *streaming.Hub) *StreamHandler {
	return &StreamHandler{
		streamService: streamService,
		hub:           hub,
	}
}

// GetStats returns current streaming metrics and socket health.
func (h *StreamHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats := h.streamService.GetStats()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    stats,
	})
}

// GetEvents returns recent stream events.
func (h *StreamHandler) GetEvents(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
			limit = val
		}
	}

	events := h.streamService.GetHistory(limit)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    events,
		"count":   len(events),
	})
}

// IngestRaw receives a raw HL7 string via POST.
func (h *StreamHandler) IngestRaw(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RawHL7 string `json:"rawHl7"`
		Source string `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.RawHL7 == "" {
		http.Error(w, `{"error":"Invalid request payload: rawHl7 is required"}`, http.StatusBadRequest)
		return
	}

	msg, err := h.streamService.IngestRawHL7(body.RawHL7, body.Source)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    msg,
	})
}

// Simulate generates a synthetic HL7 event for demo/testing.
func (h *StreamHandler) Simulate(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Scenario string `json:"scenario"` // "icu_deterioration", "ed_admission", "routine_lab", "burst"
		Count    int    `json:"count"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)

	if body.Scenario == "burst" {
		count := body.Count
		if count <= 0 {
			count = 10
		}
		sent := h.streamService.TriggerBurst(count)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"message": "Stream burst generated successfully",
			"count":   sent,
		})
		return
	}

	scenario := body.Scenario
	if scenario == "" {
		scenario = "icu_deterioration"
	}

	msg, err := h.streamService.SimulateScenario(scenario)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"scenario": scenario,
		"data":     msg,
	})
}

// WebSocket upgrades the HTTP connection to a live event stream.
func (h *StreamHandler) WebSocket(w http.ResponseWriter, r *http.Request) {
	h.hub.HandleWS(w, r)
}
