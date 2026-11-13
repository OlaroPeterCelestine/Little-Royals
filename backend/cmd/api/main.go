package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/casbin/casbin/v2"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"

	authhandler "github.com/little-royals/school-api/internal/modules/auth/handler"
	authsvc "github.com/little-royals/school-api/internal/modules/auth/service"
	attendancemodel "github.com/little-royals/school-api/internal/modules/attendance/model"
	classmodel "github.com/little-royals/school-api/internal/modules/classes/model"
	feemodel "github.com/little-royals/school-api/internal/modules/fees/model"
	notifhandler "github.com/little-royals/school-api/internal/modules/notifications/handler"
	notifsvc "github.com/little-royals/school-api/internal/modules/notifications/service"
	parentmodel "github.com/little-royals/school-api/internal/modules/parents/model"
	paymentmodel "github.com/little-royals/school-api/internal/modules/payments/model"
	schoolmodel "github.com/little-royals/school-api/internal/modules/school/model"
	staffmodel "github.com/little-royals/school-api/internal/modules/staff/model"
	studentmodel "github.com/little-royals/school-api/internal/modules/students/model"
	subjectmodel "github.com/little-royals/school-api/internal/modules/subjects/model"
	userhandler "github.com/little-royals/school-api/internal/modules/users/handler"
	"github.com/little-royals/school-api/internal/platform/cache"
	"github.com/little-royals/school-api/internal/platform/config"
	"github.com/little-royals/school-api/internal/platform/database"
	"github.com/little-royals/school-api/internal/platform/logger"
	"github.com/little-royals/school-api/internal/platform/realtime"
	redisplat "github.com/little-royals/school-api/internal/platform/redis"
	"github.com/little-royals/school-api/internal/platform/security"
	"github.com/little-royals/school-api/internal/shared/crud"
	"github.com/little-royals/school-api/internal/shared/middleware"
	"github.com/little-royals/school-api/internal/shared/response"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	log, err := logger.New(cfg.AppEnv)
	if err != nil {
		panic(err)
	}
	defer log.Sync() //nolint:errcheck

	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	db, err := database.Connect(cfg.DBDriver, cfg.DBDSN, log)
	if err != nil {
		log.Fatal("database", zap.Error(err))
	}
	if err := database.AutoMigrate(db); err != nil {
		log.Fatal("migrate", zap.Error(err))
	}
	if err := database.SeedOneSchool(db, cfg, log); err != nil {
		log.Fatal("seed", zap.Error(err))
	}

	var enforcer *casbin.Enforcer
	enforcer, err = security.NewEnforcer()
	if err != nil {
		log.Fatal("casbin", zap.Error(err))
	}
	log.Info("casbin RBAC ready")

	rdb, err := redisplat.Connect(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB, log)
	if err != nil {
		rdb = nil
	}

	cch := cache.New(rdb, log)
	hub := realtime.NewHub(rdb, log, cfg.CORSOrigins...)
	limiter := middleware.NewLimiter(rdb)
	notifService := notifsvc.New(db, hub, cch)
	tokens := security.NewTokenService(cfg.JWTSecret, cfg.JWTTTL)
	authService := authsvc.New(db, tokens)
	authH := authhandler.New(authService, enforcer)
	notifH := notifhandler.New(notifService, hub, tokens)
	usersH := userhandler.New(db, cch, hub)

	crudOpts := crud.Options{Cache: cch, Hub: hub, TTL: 45 * time.Second, Enforcer: enforcer}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())
	r.Use(middleware.SecureHeaders())
	r.Use(middleware.LimitBody(1 << 20))
	r.Use(middleware.RateLimit(limiter, 300, time.Minute)) // API-wide: 300 req/min/IP
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type"},
		ExposeHeaders:    []string{"X-Cache", "X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.GET("/health", func(c *gin.Context) {
		payload := gin.H{
			"service": cfg.AppName,
			"status":  "up",
			"mode":    "single-school",
		}
		if cfg.AppEnv != "production" {
			payload["school"] = cfg.SchoolName
			payload["cache"] = cch.Backend()
			payload["redis"] = rdb != nil
			payload["realtime"] = gin.H{
				"clients":   hub.ClientCount(),
				"transport": map[bool]string{true: "redis+ws", false: "memory+ws"}[rdb != nil],
			}
		}
		response.OK(c, payload)
	})

	if cfg.AppEnv != "production" {
		r.GET("/metrics", gin.WrapH(promhttp.Handler()))
	} else {
		r.GET("/metrics", middleware.JWTAuth(tokens), middleware.RequireRoles("SuperAdmin", "Admin"), gin.WrapH(promhttp.Handler()))
	}

	r.GET("/api/v1/ws", notifH.WS)

	api := r.Group("/api/v1")
	{
		api.POST("/auth/login", middleware.LoginRateLimit(limiter, 10, 5, time.Minute), authH.Login)

		protected := api.Group("")
		protected.Use(middleware.JWTAuth(tokens))

		protected.GET("/auth/me", authH.Me)

		protected.GET("/school", middleware.Authorize(enforcer, "school", "read"), func(c *gin.Context) {
			const key = "school:profile"
			var school schoolmodel.School
			if ok, _ := cch.GetJSON(c.Request.Context(), key, &school); ok {
				c.Header("X-Cache", "HIT")
				response.OK(c, school)
				return
			}
			if err := db.First(&school).Error; err != nil {
				response.Error(c, http.StatusNotFound, "school not configured")
				return
			}
			_ = cch.SetJSON(c.Request.Context(), key, school, 2*time.Minute)
			c.Header("X-Cache", "MISS")
			response.OK(c, school)
		})

		usersH.Register(protected.Group("/users"))
		crud.Register[studentmodel.Student](protected.Group("/students"), db, "students", crudOpts)
		crud.Register[staffmodel.Staff](protected.Group("/staff"), db, "staff", crudOpts)
		crud.Register[parentmodel.Parent](protected.Group("/parents"), db, "parents", crudOpts)
		crud.Register[classmodel.Class](protected.Group("/classes"), db, "classes", crudOpts)
		crud.Register[subjectmodel.Subject](protected.Group("/subjects"), db, "subjects", crudOpts)
		crud.Register[attendancemodel.Attendance](protected.Group("/attendance"), db, "attendance", crudOpts)
		crud.Register[feemodel.FeeStructure](protected.Group("/fees"), db, "fees", crudOpts)
		crud.Register[feemodel.Invoice](protected.Group("/invoices"), db, "invoices", crudOpts)
		crud.Register[paymentmodel.Payment](protected.Group("/payments"), db, "payments", crudOpts)

		notifH.Register(protected.Group("/notifications"))

		protected.GET("/modules", middleware.RequireRoles("SuperAdmin", "Admin", "HeadTeacher"), func(c *gin.Context) {
			response.OK(c, []string{
				"auth", "users", "school", "students", "staff", "parents",
				"classes", "subjects", "attendance", "fees", "invoices", "payments",
				"notifications", "ws",
			})
		})
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		var n int64
		_ = db.Table("notifications").Count(&n).Error
		if n == 0 {
			_, _ = notifService.Broadcast(ctx, "School desk online", "Realtime notifications and caching are active.", "/dashboard", "green")
		}
	}()

	srv := &http.Server{
		Addr:              ":" + cfg.HTTPPort,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	go func() {
		log.Info("school API listening",
			zap.String("addr", srv.Addr),
			zap.String("school", cfg.SchoolName),
			zap.String("cache", cch.Backend()),
			zap.Bool("redis", rdb != nil),
		)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("server", zap.Error(err))
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	log.Info("shutdown complete")
}
