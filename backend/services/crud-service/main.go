package main

import (
	"log"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/little-royals/school-api/pkg/config"
	"github.com/little-royals/school-api/pkg/crudkit"
	"github.com/little-royals/school-api/pkg/ginserver"
	"github.com/little-royals/school-api/pkg/modules"
	"github.com/little-royals/school-api/pkg/response"
)

// Generic CRUD microservice (Gin).
//
//	CRUD_MODULE=students → only /api/v1/students
//	CRUD_MODULE=all      → all catalog CRUD modules
func main() {
	config.LoadDotEnv()
	module := strings.TrimSpace(config.Get("CRUD_MODULE", "all"))
	secret := []byte(config.MustJWTSecret())

	fallbackPort := "8090"
	if module != "all" {
		if p := modules.Port(module); p > 0 {
			fallbackPort = strconv.Itoa(p)
		}
	}
	port := config.Port("PORT", fallbackPort)

	var selected []string
	if module == "all" {
		selected = modules.All()
	} else {
		if !modules.Exists(module) {
			log.Fatalf("unknown CRUD_MODULE %q — known: %v", module, modules.All())
		}
		selected = []string{module}
	}

	serviceName := "crud-service"
	if module != "all" {
		serviceName = module + "-service"
	}

	r := ginserver.New(serviceName)
	r.GET("/health", func(c *gin.Context) {
		response.JSON(c, 200, gin.H{
			"service": serviceName,
			"status":  "up",
			"modules": selected,
		})
	})

	for _, mod := range selected {
		store := crudkit.NewStore(mod, modules.Seed(mod))
		crudkit.NewHandler(store, secret).Mount(r)
	}

	addr := ":" + port
	log.Printf("[%s] listening on %s modules=%v (gin)", serviceName, addr, selected)
	log.Fatal(r.Run(addr))
}
