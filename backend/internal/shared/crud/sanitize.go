package crud

import (
	"encoding/json"
	"reflect"
	"strings"
)

var alwaysForbidden = map[string]struct{}{
	"id":           {},
	"createdAt":    {},
	"created_at":   {},
	"updatedAt":    {},
	"updated_at":   {},
	"deletedAt":    {},
	"deleted_at":   {},
	"passwordHash": {},
	"password_hash": {},
	"PasswordHash": {},
	"lastLoginAt":  {},
	"last_login_at": {},
}

// FilterUpdateMap keeps only keys that match exported JSON tags on T and
// drops immutable / sensitive fields. Returns column-oriented values for GORM.
func FilterUpdateMap[T any](raw map[string]any) map[string]any {
	allowed := jsonFieldAllowlist[T]()
	out := make(map[string]any, len(raw))
	for k, v := range raw {
		if _, ban := alwaysForbidden[k]; ban {
			continue
		}
		col, ok := allowed[k]
		if !ok {
			continue
		}
		if v == nil {
			continue
		}
		out[col] = v
	}
	return out
}

// jsonFieldAllowlist maps json tag → gorm column name (snake_case default).
func jsonFieldAllowlist[T any]() map[string]string {
	var zero T
	t := reflect.TypeOf(zero)
	if t.Kind() == reflect.Pointer {
		t = t.Elem()
	}
	out := make(map[string]string)
	if t.Kind() != reflect.Struct {
		return out
	}
	for i := 0; i < t.NumField(); i++ {
		f := t.Field(i)
		if f.PkgPath != "" { // unexported
			continue
		}
		jt := f.Tag.Get("json")
		if jt == "-" || jt == "" {
			continue
		}
		name := strings.Split(jt, ",")[0]
		if name == "" || name == "-" {
			continue
		}
		if _, ban := alwaysForbidden[name]; ban {
			continue
		}
		col := columnName(f)
		out[name] = col
	}
	return out
}

func columnName(f reflect.StructField) string {
	g := f.Tag.Get("gorm")
	for _, part := range strings.Split(g, ";") {
		part = strings.TrimSpace(part)
		if strings.HasPrefix(part, "column:") {
			return strings.TrimPrefix(part, "column:")
		}
	}
	return toSnake(f.Name)
}

func toSnake(s string) string {
	if s == "" {
		return s
	}
	var b strings.Builder
	for i, r := range s {
		if r >= 'A' && r <= 'Z' {
			if i > 0 {
				b.WriteByte('_')
			}
			b.WriteRune(r + ('a' - 'A'))
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

// StructToUpdateMap encodes a bound struct to a filtered update map.
func StructToUpdateMap[T any](item T) (map[string]any, error) {
	raw, err := json.Marshal(item)
	if err != nil {
		return nil, err
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, err
	}
	return FilterUpdateMap[T](m), nil
}
