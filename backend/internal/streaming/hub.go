package streaming

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"caredata/backend/internal/mllp"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all frontend origins
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// StreamEvent represents a broadcasted event over WebSocket.
type StreamEvent struct {
	ID              string            `json:"id"`
	Type            string            `json:"type"` // "HL7_EVENT", "CRITICAL_ALERT", "THROUGHPUT_PULSE", "HEARTBEAT"
	Source          string            `json:"source"` // "MLLP_TCP:2575", "FHIR_WEBHOOK", "SIMULATOR"
	Timestamp       time.Time         `json:"timestamp"`
	Payload         *mllp.HL7Message  `json:"payload,omitempty"`
	RawText         string            `json:"rawText,omitempty"`
	Severity        string            `json:"severity"` // NORMAL, WARNING, CRITICAL
	ClinicalSummary string            `json:"clinicalSummary,omitempty"`
}

// Hub maintains the set of active clients and broadcasts messages.
type Hub struct {
	clients        map[*websocket.Conn]bool
	broadcast      chan StreamEvent
	register       chan *websocket.Conn
	unregister     chan *websocket.Conn
	mu             sync.RWMutex
	history        []StreamEvent
	maxHistory     int
	totalEvents    uint64
	criticalAlerts uint64
	startTime      time.Time
	recentEvents   []int64 // timestamps for calculating msgs/sec
	rateMu         sync.Mutex
}

// NewHub creates and returns a new Hub.
func NewHub() *Hub {
	h := &Hub{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan StreamEvent, 256),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
		history:    make([]StreamEvent, 0),
		maxHistory: 200,
		startTime:  time.Now(),
	}
	go h.run()
	return h
}

func (h *Hub) run() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			// Send initial history and heartbeat
			h.sendInitialState(client)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mu.Unlock()

		case event := <-h.broadcast:
			atomic.AddUint64(&h.totalEvents, 1)
			if event.Severity == "CRITICAL" {
				atomic.AddUint64(&h.criticalAlerts, 1)
			}

			// Track throughput
			h.rateMu.Lock()
			h.recentEvents = append(h.recentEvents, time.Now().UnixNano())
			// Prune older than 5 seconds
			cutoff := time.Now().Add(-5 * time.Second).UnixNano()
			filtered := make([]int64, 0, len(h.recentEvents))
			for _, ts := range h.recentEvents {
				if ts >= cutoff {
					filtered = append(filtered, ts)
				}
			}
			h.recentEvents = filtered
			h.rateMu.Unlock()

			// Append to history buffer
			h.mu.Lock()
			h.history = append(h.history, event)
			if len(h.history) > h.maxHistory {
				h.history = h.history[len(h.history)-h.maxHistory:]
			}

			data, err := json.Marshal(event)
			if err != nil {
				h.mu.Unlock()
				continue
			}

			for client := range h.clients {
				err := client.WriteMessage(websocket.TextMessage, data)
				if err != nil {
					client.Close()
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()

		case <-ticker.C:
			// Periodic heartbeat and throughput pulse
			rate := h.GetThroughputRate()
			pulse := StreamEvent{
				ID:        time.Now().Format("20060102150405.000"),
				Type:      "HEARTBEAT",
				Source:    "STREAM_HUB",
				Timestamp: time.Now().UTC(),
				Severity:  "NORMAL",
				ClinicalSummary: "Stream Hub Active",
			}
			_ = rate
			h.Broadcast(pulse)
		}
	}
}

// Broadcast dispatches a stream event to all connected clients.
func (h *Hub) Broadcast(event StreamEvent) {
	select {
	case h.broadcast <- event:
	default:
		// Queue full, drop non-critical or log
	}
}

// HandleWS handles WebSocket upgrade requests.
func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[StreamHub] WS Upgrade error: %v", err)
		return
	}
	h.register <- conn

	go func() {
		defer func() {
			h.unregister <- conn
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}

func (h *Hub) sendInitialState(conn *websocket.Conn) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	// Send current history as initial batch
	type InitMsg struct {
		Type    string        `json:"type"`
		History []StreamEvent `json:"history"`
	}
	payload, _ := json.Marshal(InitMsg{
		Type:    "INIT_HISTORY",
		History: h.history,
	})
	_ = conn.WriteMessage(websocket.TextMessage, payload)
}

// GetHistory returns the circular history buffer.
func (h *Hub) GetHistory(limit int) []StreamEvent {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if limit <= 0 || limit > len(h.history) {
		limit = len(h.history)
	}
	res := make([]StreamEvent, limit)
	copy(res, h.history[len(h.history)-limit:])
	return res
}

// GetThroughputRate computes current events per second over the last 5 seconds.
func (h *Hub) GetThroughputRate() float64 {
	h.rateMu.Lock()
	defer h.rateMu.Unlock()

	cutoff := time.Now().Add(-5 * time.Second).UnixNano()
	count := 0
	for _, ts := range h.recentEvents {
		if ts >= cutoff {
			count++
		}
	}
	return float64(count) / 5.0
}

// Stats returns aggregate metrics.
type HubStats struct {
	TotalEvents     uint64  `json:"totalEvents"`
	CriticalAlerts  uint64  `json:"criticalAlerts"`
	ConnectedClients int    `json:"connectedClients"`
	EventsPerSec    float64 `json:"eventsPerSec"`
	UptimeSeconds   int64   `json:"uptimeSeconds"`
}

func (h *Hub) Stats() HubStats {
	h.mu.RLock()
	clientCount := len(h.clients)
	h.mu.RUnlock()

	return HubStats{
		TotalEvents:      atomic.LoadUint64(&h.totalEvents),
		CriticalAlerts:   atomic.LoadUint64(&h.criticalAlerts),
		ConnectedClients: clientCount,
		EventsPerSec:     h.GetThroughputRate(),
		UptimeSeconds:    int64(time.Since(h.startTime).Seconds()),
	}
}
