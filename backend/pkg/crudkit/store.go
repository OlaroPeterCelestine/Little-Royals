package crudkit

import (
	"fmt"
	"sync"
)

// Record is a flexible CRUD document (catalog-style rows).
type Record map[string]interface{}

type Store struct {
	mu      sync.RWMutex
	module  string
	items   map[string]Record
	nextSeq int
}

func NewStore(module string, seed []Record) *Store {
	s := &Store{
		module:  module,
		items:   make(map[string]Record, len(seed)),
		nextSeq: 1000,
	}
	for _, row := range seed {
		id, _ := row["id"].(string)
		if id == "" {
			continue
		}
		s.items[id] = clone(row)
	}
	return s
}

func (s *Store) Module() string { return s.module }

func (s *Store) List() []Record {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Record, 0, len(s.items))
	for _, item := range s.items {
		out = append(out, clone(item))
	}
	return out
}

func (s *Store) Get(id string) (Record, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	item, ok := s.items[id]
	if !ok {
		return nil, false
	}
	return clone(item), true
}

func (s *Store) Create(body Record) Record {
	s.mu.Lock()
	defer s.mu.Unlock()
	id, _ := body["id"].(string)
	if id == "" {
		s.nextSeq++
		id = fmt.Sprintf("%s-%d", s.module, s.nextSeq)
		body["id"] = id
	}
	if status, _ := body["status"].(string); status == "" {
		body["status"] = "Active"
	}
	s.items[id] = clone(body)
	return clone(body)
}

func (s *Store) Update(id string, body Record) (Record, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	cur, ok := s.items[id]
	if !ok {
		return nil, false
	}
	merged := clone(cur)
	for k, v := range body {
		if k == "id" {
			continue
		}
		merged[k] = v
	}
	merged["id"] = id
	s.items[id] = merged
	return clone(merged), true
}

func (s *Store) Delete(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.items[id]; !ok {
		return false
	}
	delete(s.items, id)
	return true
}

func clone(in Record) Record {
	out := make(Record, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}
