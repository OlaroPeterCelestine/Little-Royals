package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/little-royals/school-api/pkg/config"
	"github.com/little-royals/school-api/pkg/ginserver"
	"github.com/little-royals/school-api/pkg/modules"
	"github.com/little-royals/school-api/pkg/response"
)

const serviceName = "gateway"

func main() {
	config.LoadDotEnv()
	port := config.Port("GATEWAY_PORT", "8080")
	authURL := config.Get("AUTH_SERVICE_URL", "http://127.0.0.1:8081")

	upstreams := map[string]string{"auth": authURL}
	proxies := map[string]*httputil.ReverseProxy{"auth": mustProxy(authURL)}

	for _, mod := range modules.All() {
		envKey := strings.ToUpper(strings.ReplaceAll(mod, "-", "_")) + "_SERVICE_URL"
		u := config.Get(envKey, modules.DefaultURL(mod))
		upstreams[mod] = u
		proxies[mod] = mustProxy(u)
	}

	r := ginserver.New(serviceName)

	r.GET("/health", func(c *gin.Context) {
		response.JSON(c, http.StatusOK, gin.H{
			"service":   serviceName,
			"status":    "up",
			"upstreams": upstreams,
		})
	})

	r.GET("/health/ready", func(c *gin.Context) {
		checks := map[string]string{}
		ready := true
		for name, u := range upstreams {
			status := probe(u + "/health")
			checks[name] = status
			if status != "up" {
				ready = false
			}
		}
		code := http.StatusOK
		if !ready {
			code = http.StatusServiceUnavailable
		}
		response.JSON(c, code, gin.H{
			"service": serviceName,
			"ready":   ready,
			"checks":  checks,
		})
	})

	r.GET("/api/v1/modules", func(c *gin.Context) {
		response.JSON(c, http.StatusOK, modules.All())
	})

	proxyAny := func(name string) gin.HandlerFunc {
		p := proxies[name]
		return func(c *gin.Context) {
			p.ServeHTTP(c.Writer, c.Request)
		}
	}

	r.Any("/api/v1/auth", proxyAny("auth"))
	r.Any("/api/v1/auth/*path", proxyAny("auth"))

	for _, mod := range modules.All() {
		m := mod
		r.Any("/api/v1/"+m, proxyAny(m))
		r.Any("/api/v1/"+m+"/*path", proxyAny(m))
	}

	addr := ":" + port
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("[%s] listening on %s with %d CRUD microservices (gin)", serviceName, addr, len(modules.All()))
	log.Fatal(srv.ListenAndServe())
}

func mustProxy(raw string) *httputil.ReverseProxy {
	target, err := url.Parse(raw)
	if err != nil {
		log.Fatalf("invalid upstream %q: %v", raw, err)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	original := proxy.Director
	proxy.Director = func(req *http.Request) {
		original(req)
		req.Host = target.Host
		req.Header.Set("X-Forwarded-Host", req.Header.Get("Host"))
		req.Header.Set("X-Gateway", serviceName)
	}
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("[%s] proxy error %s %s → %s: %v", serviceName, r.Method, r.URL.Path, raw, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(fmt.Sprintf(`{"ok":false,"error":%q}`, "upstream unavailable: "+raw)))
	}
	return proxy
}

func probe(u string) string {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(u)
	if err != nil {
		return "down"
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return "up"
	}
	return "down"
}
