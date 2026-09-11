package mllp

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"sync"
	"sync/atomic"
	"time"
)

const (
	MLLPStartByte = 0x0B // <VT> Vertical Tab
	MLLPEndByte1  = 0x1C // <FS> File Separator
	MLLPEndByte2  = 0x0D // <CR> Carriage Return
)

// MessageHandler is invoked whenever an HL7 message is successfully received and parsed.
type MessageHandler func(msg *HL7Message)

// Server implements a native HL7 MLLP TCP listener.
type Server struct {
	port          int
	listener      net.Listener
	handler       MessageHandler
	mu            sync.Mutex
	running       bool
	totalMessages uint64
	activeConns   int32
	startTime     time.Time
}

// NewServer creates a new MLLP Server.
func NewServer(port int, handler MessageHandler) *Server {
	if port <= 0 {
		port = 2575
	}
	return &Server{
		port:      port,
		handler:   handler,
		startTime: time.Now(),
	}
}

// Start begins listening for TCP connections.
func (s *Server) Start() error {
	addr := fmt.Sprintf(":%d", s.port)
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to bind MLLP listener on %s: %w", addr, err)
	}

	s.mu.Lock()
	s.listener = l
	s.running = true
	s.mu.Unlock()

	log.Printf("✓ HL7 MLLP Live Stream Server listening on TCP port %d (MLLP 2575 standard)", s.port)

	go func() {
		for {
			conn, err := l.Accept()
			if err != nil {
				s.mu.Lock()
				isRunning := s.running
				s.mu.Unlock()
				if !isRunning {
					return
				}
				log.Printf("[MLLP] Accept error: %v", err)
				continue
			}

			atomic.AddInt32(&s.activeConns, 1)
			go s.handleConnection(conn)
		}
	}()

	return nil
}

// Stop closes the TCP listener.
func (s *Server) Stop(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.running = false
	if s.listener != nil {
		return s.listener.Close()
	}
	return nil
}

// handleConnection handles an MLLP TCP connection session.
func (s *Server) handleConnection(conn net.Conn) {
	defer func() {
		conn.Close()
		atomic.AddInt32(&s.activeConns, -1)
	}()

	buf := make([]byte, 4096)
	var msgBuffer bytes.Buffer
	inMessage := false

	for {
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		n, err := conn.Read(buf)
		if err != nil {
			if err != io.EOF {
				// timeout or closed
			}
			return
		}

		for i := 0; i < n; i++ {
			b := buf[i]

			if b == MLLPStartByte {
				inMessage = true
				msgBuffer.Reset()
				continue
			}

			if inMessage {
				if b == MLLPEndByte1 {
					// Check for following 0x0D
					if i+1 < n && buf[i+1] == MLLPEndByte2 {
						i++ // skip CR
					}
					// Completed message
					raw := msgBuffer.String()
					inMessage = false
					msgBuffer.Reset()

					s.processMessage(conn, raw)
					continue
				}
				msgBuffer.WriteByte(b)
			}
		}
	}
}

// processMessage parses the message, triggers handler, and returns an ACK.
func (s *Server) processMessage(conn net.Conn, raw string) {
	atomic.AddUint64(&s.totalMessages, 1)

	msg, err := ParseHL7(raw)
	var ackStr string
	if err != nil {
		log.Printf("[MLLP] Error parsing HL7 payload: %v", err)
		ackStr = fmt.Sprintf("MSH|^~\\&|CAREDATA|ORG_CENTRAL|||%s||ACK||P|2.5\rMSA|AE|MSG-ERR|%s\r",
			time.Now().Format("20060102150405"), err.Error())
	} else {
		ackStr = GenerateACK(msg, "AA", "Message processed successfully")
		if s.handler != nil {
			s.handler(msg)
		}
	}

	// Send MLLP wrapped ACK
	ackBytes := append([]byte{MLLPStartByte}, []byte(ackStr)...)
	ackBytes = append(ackBytes, MLLPEndByte1, MLLPEndByte2)
	_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	_, _ = conn.Write(ackBytes)
}

// Stats returns runtime statistics of the MLLP server.
func (s *Server) Stats() (uint64, int32, bool, int) {
	return atomic.LoadUint64(&s.totalMessages), atomic.LoadInt32(&s.activeConns), s.running, s.port
}
