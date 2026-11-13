package security

import (
	"fmt"

	"github.com/casbin/casbin/v2"
	"github.com/casbin/casbin/v2/model"
)

const modelText = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = (g(r.sub, p.sub) || r.sub == p.sub) && (r.obj == p.obj || p.obj == "*") && (r.act == p.act || p.act == "*")
`

// APIResources are Casbin objects mounted by cmd/api.
var APIResources = []string{
	"school", "users", "students", "staff", "parents", "classes", "subjects",
	"attendance", "fees", "invoices", "payments", "notifications",
}

// NewEnforcer builds an in-memory Casbin enforcer with school RBAC defaults.
func NewEnforcer() (*casbin.Enforcer, error) {
	m, err := model.NewModelFromString(modelText)
	if err != nil {
		return nil, fmt.Errorf("casbin model: %w", err)
	}
	enforcer, err := casbin.NewEnforcer(m)
	if err != nil {
		return nil, fmt.Errorf("casbin enforcer: %w", err)
	}

	policies := [][]string{
		{"SuperAdmin", "*", "*"},
		{"Admin", "*", "*"},

		{"HeadTeacher", "school", "read"},
		{"HeadTeacher", "users", "read"},
		{"HeadTeacher", "students", "*"},
		{"HeadTeacher", "staff", "read"},
		{"HeadTeacher", "parents", "read"},
		{"HeadTeacher", "classes", "*"},
		{"HeadTeacher", "subjects", "*"},
		{"HeadTeacher", "attendance", "*"},
		{"HeadTeacher", "fees", "read"},
		{"HeadTeacher", "invoices", "read"},
		{"HeadTeacher", "payments", "read"},
		{"HeadTeacher", "notifications", "*"},

		{"Teacher", "school", "read"},
		{"Teacher", "students", "read"},
		{"Teacher", "attendance", "*"},
		{"Teacher", "subjects", "read"},
		{"Teacher", "classes", "read"},
		{"Teacher", "notifications", "read"},

		{"Accountant", "school", "read"},
		{"Accountant", "students", "read"},
		{"Accountant", "parents", "read"},
		{"Accountant", "fees", "*"},
		{"Accountant", "payments", "*"},
		{"Accountant", "invoices", "*"},
		{"Accountant", "notifications", "read"},

		{"Admissions", "school", "read"},
		{"Admissions", "students", "*"},
		{"Admissions", "parents", "*"},
		{"Admissions", "classes", "read"},
		{"Admissions", "notifications", "read"},

		{"Librarian", "school", "read"},
		{"Librarian", "students", "read"},
		{"Librarian", "notifications", "read"},

		{"Staff", "school", "read"},
		{"Staff", "notifications", "read"},

		{"Parent", "school", "read"},
		{"Parent", "students", "read"},
		{"Parent", "fees", "read"},
		{"Parent", "payments", "read"},
		{"Parent", "invoices", "read"},
		{"Parent", "notifications", "read"},

		{"Student", "school", "read"},
		{"Student", "students", "read"},
		{"Student", "notifications", "read"},
	}
	for _, p := range policies {
		if _, err := enforcer.AddPolicy(p); err != nil {
			return nil, err
		}
	}
	return enforcer, nil
}

// EffectivePermissions returns resource → allowed actions for a role.
func EffectivePermissions(e *casbin.Enforcer, role string) map[string][]string {
	out := make(map[string][]string, len(APIResources))
	actions := []string{"read", "create", "update", "delete"}
	for _, res := range APIResources {
		allowed := make([]string, 0, 4)
		for _, act := range actions {
			ok, err := e.Enforce(role, res, act)
			if err == nil && ok {
				allowed = append(allowed, act)
			}
		}
		if len(allowed) > 0 {
			out[res] = allowed
		}
	}
	return out
}
