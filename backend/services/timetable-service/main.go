package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"github.com/little-royals/school-api/pkg/config"
	"github.com/little-royals/school-api/pkg/crudkit"
	"github.com/little-royals/school-api/pkg/ginserver"
	"github.com/little-royals/school-api/pkg/modules"
	"github.com/little-royals/school-api/pkg/response"
)

const moduleName = "timetable"

func main() {
	config.LoadDotEnv()
	if !modules.Exists(moduleName) {
		log.Fatalf("module %s missing from registry", moduleName)
	}
	port := config.Port("PORT", "8092")
	secret := []byte(config.MustJWTSecret())
	serviceName := moduleName + "-service"

	store := crudkit.NewStore(moduleName, modules.Seed(moduleName))
	h := crudkit.NewHandler(store, secret)

	r := ginserver.New(serviceName)
	r.GET("/health", func(c *gin.Context) {
		response.JSON(c, 200, gin.H{
			"service": serviceName,
			"status":  "up",
			"module":  moduleName,
		})
	})
	h.Mount(r)

	addr := ":" + port
	log.Printf("[%s] listening on %s (gin)", serviceName, addr)
	log.Fatal(r.Run(addr))
}
