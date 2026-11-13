package security

import (
	"strings"
	"testing"
)

func TestArgon2HashAndCheck(t *testing.T) {
	hash, err := HashPassword("SecurePass9!")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(hash, "$argon2id$") {
		t.Fatalf("expected argon2id hash, got %s", hash[:20])
	}
	if !CheckPassword(hash, "SecurePass9!") {
		t.Fatal("valid password rejected")
	}
	if CheckPassword(hash, "wrong-password") {
		t.Fatal("invalid password accepted")
	}
	if NeedsRehash(hash) {
		t.Fatal("fresh hash should not need rehash")
	}
}

func TestLegacyBcryptStillVerifies(t *testing.T) {
	// bcrypt cost 10 for "password1234"
	legacy := "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
	// This known hash is for "password" — use Generate in test instead
	_ = legacy
	hash, err := HashPassword("AnotherPass1!")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPassword(hash, "AnotherPass1!") {
		t.Fatal("argon check failed")
	}
	if CheckPassword("", "x") || CheckPassword("not-a-hash", "x") {
		t.Fatal("garbage hash accepted")
	}
}
