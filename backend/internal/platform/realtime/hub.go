package realtime

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	goredis "github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

const channel = "lr:notifications"

type Event struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
	At      time.Time   `json:"at"`
}

type client struct {
	userID string
	role   string
	send   chan []byte
	conn   *websocket.Conn
}

// Hub fans out realtime events to WebSocket clients (Redis pub/sub when available).
type Hub struct {
	mu       sync.RWMutex
	clients  map[*client]struct{}
	rdb      *goredis.Client
	log      *zap.Logger
	local    chan Event
	upgrader websocket.Upgrader
}

func NewHub(rdb *goredis.Client, log *zap.Logger, allowedOrigins ...string) *Hub {
	originSet := map[string]struct{}{}
	for _, o := range allowedOrigins {
		o = strings.TrimRight(strings.TrimSpace(o), "/")
		if o != "" {
			originSet[o] = struct{}{}
		}
	}
	h := &Hub{
		clients: make(map[*client]struct{}),
		rdb:     rdb,
		log:     log,
		local:   make(chan Event, 64),
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				origin := strings.TrimRight(strings.TrimSpace(r.Header.Get("Origin")), "/")
				if origin == "" {
					// Non-browser clients (no Origin) — token still required at HTTP layer.
					return true
				}
				if len(originSet) == 0 {
					return false
				}
				_, ok := originSet[origin]
				return ok
			},
		},
	}
	go h.localLoop()
	if rdb != nil {
		go h.redisLoop()
		log.Info("realtime hub ready", zap.String("transport", "redis+ws"))
	} else {
		log.Info("realtime hub ready", zap.String("transport", "memory+ws"))
	}
	return h
}

func (h *Hub) Publish(ctx context.Context, evt Event) {
	if evt.At.IsZero() {
		evt.At = time.Now().UTC()
	}
	data, err := json.Marshal(evt)
	if err != nil {
		return
	}
	if h.rdb != nil {
		if err := h.rdb.Publish(ctx, channel, data).Err(); err != nil {
			h.log.Warn("redis publish failed — local fanout", zap.Error(err))
			h.broadcast(data)
		}
		return
	}
	h.broadcast(data)
}

func (h *Hub) localLoop() {
	for evt := range h.local {
		data, _ := json.Marshal(evt)
		h.broadcast(data)
	}
}

func (h *Hub) redisLoop() {
	ctx := context.Background()
	sub := h.rdb.Subscribe(ctx, channel)
	ch := sub.Channel()
	for msg := range ch {
		h.broadcast([]byte(msg.Payload))
	}
}

func (h *Hub) broadcast(data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		select {
		case c.send <- data:
		default:
			// slow client — drop
		}
	}
}

func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request, userID, role string) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.log.Warn("websocket upgrade failed", zap.Error(err))
		return
	}
	cl := &client{
		userID: userID,
		role:   role,
		send:   make(chan []byte, 16),
		conn:   conn,
	}
	h.mu.Lock()
	h.clients[cl] = struct{}{}
	h.mu.Unlock()

	welcome, _ := json.Marshal(Event{
		Type:    "connected",
		Payload: map[string]string{"userId": userID, "role": role},
		At:      time.Now().UTC(),
	})
	_ = conn.WriteMessage(websocket.TextMessage, welcome)

	go h.writePump(cl)
	h.readPump(cl)
}

func (h *Hub) writePump(c *client) {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		h.remove(c)
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (h *Hub) readPump(c *client) {
	defer h.remove(c)
	c.conn.SetReadLimit(4096)
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (h *Hub) remove(c *client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
		_ = c.conn.Close()
	}
	h.mu.Unlock()
}

func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
