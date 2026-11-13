package modules

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sort"

	"github.com/little-royals/school-api/pkg/crudkit"
)

//go:embed seeds.json
var seedsJSON []byte

//go:embed ports.json
var portsJSON []byte

var (
	seeds map[string][]crudkit.Record
	ports map[string]int
)

func init() {
	if err := json.Unmarshal(seedsJSON, &seeds); err != nil {
		panic(fmt.Sprintf("modules seeds: %v", err))
	}
	if err := json.Unmarshal(portsJSON, &ports); err != nil {
		panic(fmt.Sprintf("modules ports: %v", err))
	}
}

// All returns sorted catalog module keys.
func All() []string {
	keys := make([]string, 0, len(seeds))
	for k := range seeds {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func Exists(module string) bool {
	_, ok := seeds[module]
	return ok
}

func Seed(module string) []crudkit.Record {
	rows := seeds[module]
	out := make([]crudkit.Record, len(rows))
	copy(out, rows)
	return out
}

func Port(module string) int {
	if p, ok := ports[module]; ok {
		return p
	}
	return 0
}

func DefaultURL(module string) string {
	p := Port(module)
	if p == 0 {
		return ""
	}
	return fmt.Sprintf("http://127.0.0.1:%d", p)
}
