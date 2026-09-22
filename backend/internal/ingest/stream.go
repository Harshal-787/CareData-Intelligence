package ingest

import (
	"bufio"
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/xitongsys/parquet-go-source/local"
	"github.com/xitongsys/parquet-go/reader"
)

// RecordIterator provides a common streaming interface for CSV, JSON, NDJSON, and Parquet.
type RecordIterator interface {
	Next() (map[string]interface{}, error) // Returns io.EOF when done
	Close() error
}

type csvIterator struct {
	reader  *csv.Reader
	closer  io.Closer
	headers []string
}

func NewCSVIterator(r io.ReadCloser) (RecordIterator, error) {
	reader := csv.NewReader(r)
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	// Read headers to know column names
	headers, err := reader.Read()
	if err != nil {
		r.Close()
		return nil, fmt.Errorf("failed to read CSV headers: %w", err)
	}

	// Detect delimiter dynamically if needed (omitted for brevity, assume commas or we can add it back)
	for i, h := range headers {
		headers[i] = strings.TrimSpace(h)
		if headers[i] == "" {
			headers[i] = fmt.Sprintf("column_%d", i+1)
		}
	}

	return &csvIterator{
		reader:  reader,
		closer:  r,
		headers: headers,
	}, nil
}

func (c *csvIterator) Next() (map[string]interface{}, error) {
	for {
		row, err := c.reader.Read()
		if err != nil {
			return nil, err // Returns io.EOF when finished
		}
		if len(row) == len(c.headers) {
			m := make(map[string]interface{}, len(c.headers))
			for i, h := range c.headers {
				m[h] = strings.TrimSpace(row[i])
			}
			return m, nil
		}
		// Skip malformed rows
	}
}

func (c *csvIterator) Close() error {
	return c.closer.Close()
}

type ndjsonIterator struct {
	scanner *bufio.Scanner
	closer  io.Closer
}

func NewNDJSONIterator(r io.ReadCloser) (RecordIterator, error) {
	return &ndjsonIterator{
		scanner: bufio.NewScanner(r),
		closer:  r,
	}, nil
}

func (n *ndjsonIterator) Next() (map[string]interface{}, error) {
	for n.scanner.Scan() {
		line := bytes.TrimSpace(n.scanner.Bytes())
		if len(line) == 0 {
			continue
		}
		var m map[string]interface{}
		if err := json.Unmarshal(line, &m); err == nil {
			return m, nil
		}
	}
	if err := n.scanner.Err(); err != nil {
		return nil, err
	}
	return nil, io.EOF
}

func (n *ndjsonIterator) Close() error {
	return n.closer.Close()
}

type jsonArrayIterator struct {
	decoder *json.Decoder
	closer  io.Closer
	started bool
}

func NewJSONIterator(r io.ReadCloser) (RecordIterator, error) {
	dec := json.NewDecoder(r)
	// Expect the start of an array
	t, err := dec.Token()
	if err != nil {
		r.Close()
		return nil, err
	}
	if delim, ok := t.(json.Delim); !ok || delim != '[' {
		r.Close()
		return nil, fmt.Errorf("expected JSON array")
	}
	return &jsonArrayIterator{
		decoder: dec,
		closer:  r,
	}, nil
}

func (j *jsonArrayIterator) Next() (map[string]interface{}, error) {
	if !j.decoder.More() {
		// Read the closing bracket
		_, _ = j.decoder.Token()
		return nil, io.EOF
	}
	var m map[string]interface{}
	if err := j.decoder.Decode(&m); err != nil {
		return nil, err
	}
	return m, nil
}

func (j *jsonArrayIterator) Close() error {
	return j.closer.Close()
}

type parquetIterator struct {
	reader *reader.ParquetReader
	closer io.Closer
	numRows int64
	cursor  int64
}

// NewParquetIterator expects a local file path because parquet-go needs an io.ReadSeeker
func NewParquetIterator(filePath string) (RecordIterator, error) {
	fileReader, err := local.NewLocalFileReader(filePath)
	if err != nil {
		return nil, err
	}
	pr, err := reader.NewParquetReader(fileReader, nil, 4)
	if err != nil {
		fileReader.Close()
		return nil, err
	}
	return &parquetIterator{
		reader: pr,
		closer: fileReader,
		numRows: pr.GetNumRows(),
		cursor: 0,
	}, nil
}

func (p *parquetIterator) Next() (map[string]interface{}, error) {
	if p.cursor >= p.numRows {
		return nil, io.EOF
	}
	res, err := p.reader.ReadByNumber(1)
	if err != nil {
		return nil, err
	}
	p.cursor++

	if len(res) == 0 {
		return nil, io.EOF
	}

	jsonBs, err := json.Marshal(res[0])
	if err != nil {
		return nil, err
	}
	var rec map[string]interface{}
	if err := json.Unmarshal(jsonBs, &rec); err != nil {
		return nil, err
	}

	// Lowercase the keys like before
	fixedRec := make(map[string]interface{}, len(rec))
	for k, v := range rec {
		fixedRec[strings.ToLower(k)] = v
	}

	return fixedRec, nil
}

func (p *parquetIterator) Close() error {
	p.reader.ReadStop()
	return p.closer.Close()
}

// NewRecordIterator determines the right iterator based on fileType.
// For parquet, we need a local file path because it needs a seeker, so we pass it if possible.
func NewRecordIterator(fileType string, stream io.ReadCloser, filePath string) (RecordIterator, error) {
	switch strings.ToLower(fileType) {
	case "csv":
		return NewCSVIterator(stream)
	case "json":
		return NewJSONIterator(stream)
	case "ndjson", "jsonl":
		return NewNDJSONIterator(stream)
	case "parquet":
		if filePath != "" {
			// Stream is ignored for Parquet; we use LocalFileReader
			if stream != nil {
				stream.Close()
			}
			return NewParquetIterator(filePath)
		}
		return nil, fmt.Errorf("parquet requires a valid local file path")
	default:
		return NewCSVIterator(stream)
	}
}

type memoryIterator struct {
	records []map[string]interface{}
	cursor  int
}

// NewMemoryIterator creates an iterator from an in-memory slice of records.
func NewMemoryIterator(records []map[string]interface{}) RecordIterator {
	return &memoryIterator{
		records: records,
		cursor:  0,
	}
}

func (m *memoryIterator) Next() (map[string]interface{}, error) {
	if m.cursor >= len(m.records) {
		return nil, io.EOF
	}
	res := m.records[m.cursor]
	m.cursor++
	return res, nil
}

func (m *memoryIterator) Close() error {
	return nil
}
