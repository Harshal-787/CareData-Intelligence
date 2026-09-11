package middleware

import (
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
)

// SecurityHeaders applies enterprise-grade HTTP security headers for HIPAA / SOC2 compliance
func SecurityHeaders() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("X-XSS-Protection", "1; mode=block")
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("X-Permitted-Cross-Domain-Policies", "none")
			w.Header().Set("Cache-Control", "no-store, max-age=0")
			w.Header().Set("Pragma", "no-cache")
			next.ServeHTTP(w, r)
		})
	}
}

// RateLimiter provides in-memory IP rate limiting
type ipRateLimiter struct {
	mu      sync.Mutex
	clients map[string][]time.Time
	limit   int
	window  time.Duration
}

var globalLimiter = &ipRateLimiter{
	clients: make(map[string][]time.Time),
	limit:   200, // 200 requests per minute per IP
	window:  time.Minute,
}

func RateLimitMiddleware(limit int, window time.Duration) func(http.Handler) http.Handler {
	if limit <= 0 {
		limit = 200
	}
	if window <= 0 {
		window = time.Minute
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr
			if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				ip = strings.Split(forwarded, ",")[0]
			}

			globalLimiter.mu.Lock()
			now := time.Now()
			cutoff := now.Add(-window)

			var filtered []time.Time
			for _, t := range globalLimiter.clients[ip] {
				if t.After(cutoff) {
					filtered = append(filtered, t)
				}
			}

			if len(filtered) >= limit {
				globalLimiter.mu.Unlock()
				writeJSONError(w, http.StatusTooManyRequests, "Rate limit exceeded. Please retry in a moment.")
				return
			}

			filtered = append(filtered, now)
			globalLimiter.clients[ip] = filtered
			globalLimiter.mu.Unlock()

			next.ServeHTTP(w, r)
		})
	}
}

// PHI & PII Sanitizer RegEx patterns
var (
	ssnRegex   = regexp.MustCompile(`\b\d{3}-\d{2}-\d{4}\b`)
	phoneRegex = regexp.MustCompile(`\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b`)
	mrnRegex   = regexp.MustCompile(`\b(?:MRN|mrn)[-:\s]?\d{6,10}\b`)
)

// MaskPHI redacts sensitive healthcare identifiers from logs and outputs
func MaskPHI(input string) string {
	if input == "" {
		return ""
	}
	s := ssnRegex.ReplaceAllString(input, "***-**-****")
	s = phoneRegex.ReplaceAllString(s, "(***) ***-****")
	s = mrnRegex.ReplaceAllString(s, "MRN-******")
	return s
}
