package crud

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/casbin/casbin/v2"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/little-royals/school-api/internal/platform/cache"
	"github.com/little-royals/school-api/internal/platform/realtime"
	"github.com/little-royals/school-api/internal/shared/middleware"
	"github.com/little-royals/school-api/internal/shared/pagination"
	"github.com/little-royals/school-api/internal/shared/response"
)

type Options struct {
	Cache    *cache.Cache
	Hub      *realtime.Hub
	TTL      time.Duration
	Enforcer *casbin.Enforcer
}

// Register mounts standard list/get/create/update/delete for a GORM model.
func Register[T any](r *gin.RouterGroup, db *gorm.DB, resource string, opts ...Options) {
	var opt Options
	if len(opts) > 0 {
		opt = opts[0]
	}
	if opt.TTL == 0 {
		opt.TTL = 45 * time.Second
	}

	cacheKey := func(suffix string) string {
		return fmt.Sprintf("%s:%s", resource, suffix)
	}

	invalidate := func(ctx context.Context, action string) {
		if opt.Cache != nil {
			opt.Cache.DeletePrefix(ctx, resource+":")
		}
		if opt.Hub != nil {
			opt.Hub.Publish(ctx, realtime.Event{
				Type: "resource." + action,
				Payload: map[string]string{
					"resource": resource,
					"action":   action,
				},
				At: time.Now().UTC(),
			})
		}
	}

	withRBAC := func(action string, h gin.HandlerFunc) gin.HandlerFunc {
		if opt.Enforcer == nil {
			return h
		}
		return func(c *gin.Context) {
			claims := middleware.Claims(c)
			if claims == nil {
				response.Error(c, http.StatusUnauthorized, "unauthorized")
				return
			}
			if !middleware.Can(opt.Enforcer, claims.Role, resource, action) {
				response.Error(c, http.StatusForbidden, "insufficient permissions")
				return
			}
			h(c)
		}
	}

	r.GET("", withRBAC("read", func(c *gin.Context) {
		p := pagination.FromContext(c)
		type listPayload struct {
			Items []T             `json:"items"`
			Meta  pagination.Meta `json:"meta"`
		}
		key := cacheKey(fmt.Sprintf("list:%d:%d", p.Page, p.Limit))
		if opt.Cache != nil {
			var cached listPayload
			if ok, _ := opt.Cache.GetJSON(c.Request.Context(), key, &cached); ok {
				c.Header("X-Cache", "HIT")
				response.JSONMeta(c, http.StatusOK, cached.Items, cached.Meta)
				return
			}
		}

		var items []T
		var total int64
		q := db.Model(new(T))
		if err := q.Count(&total).Error; err != nil {
			response.Error(c, http.StatusInternalServerError, "list failed")
			return
		}
		if err := q.Order("created_at desc").Offset(p.Offset()).Limit(p.Limit).Find(&items).Error; err != nil {
			response.Error(c, http.StatusInternalServerError, "list failed")
			return
		}
		meta := pagination.Meta{Page: p.Page, Limit: p.Limit, Total: total}
		if opt.Cache != nil {
			_ = opt.Cache.SetJSON(c.Request.Context(), key, listPayload{Items: items, Meta: meta}, opt.TTL)
		}
		c.Header("X-Cache", "MISS")
		response.JSONMeta(c, http.StatusOK, items, meta)
	}))

	r.GET("/:id", withRBAC("read", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			response.Error(c, http.StatusBadRequest, "invalid id")
			return
		}
		key := cacheKey("id:" + id.String())
		if opt.Cache != nil {
			var item T
			if ok, _ := opt.Cache.GetJSON(c.Request.Context(), key, &item); ok {
				c.Header("X-Cache", "HIT")
				response.OK(c, item)
				return
			}
		}
		var item T
		if err := db.First(&item, "id = ?", id).Error; err != nil {
			response.Error(c, http.StatusNotFound, resource+" not found")
			return
		}
		if opt.Cache != nil {
			_ = opt.Cache.SetJSON(c.Request.Context(), key, item, opt.TTL)
		}
		c.Header("X-Cache", "MISS")
		response.OK(c, item)
	}))

	r.POST("", withRBAC("create", func(c *gin.Context) {
		var item T
		if err := c.ShouldBindJSON(&item); err != nil {
			response.Error(c, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if err := db.Create(&item).Error; err != nil {
			response.Error(c, http.StatusBadRequest, "create failed")
			return
		}
		invalidate(c.Request.Context(), "created")
		response.Created(c, item)
	}))

	r.PUT("/:id", withRBAC("update", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			response.Error(c, http.StatusBadRequest, "invalid id")
			return
		}
		var existing T
		if err := db.First(&existing, "id = ?", id).Error; err != nil {
			response.Error(c, http.StatusNotFound, resource+" not found")
			return
		}
		var body map[string]any
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, "invalid JSON body")
			return
		}
		updates := FilterUpdateMap[T](body)
		if len(updates) == 0 {
			response.Error(c, http.StatusBadRequest, "no updatable fields")
			return
		}
		if err := db.Model(&existing).Updates(updates).Error; err != nil {
			response.Error(c, http.StatusBadRequest, "update failed")
			return
		}
		_ = db.First(&existing, "id = ?", id)
		invalidate(c.Request.Context(), "updated")
		response.OK(c, existing)
	}))

	r.DELETE("/:id", withRBAC("delete", func(c *gin.Context) {
		id, err := uuid.Parse(c.Param("id"))
		if err != nil {
			response.Error(c, http.StatusBadRequest, "invalid id")
			return
		}
		res := db.Delete(new(T), "id = ?", id)
		if res.Error != nil || res.RowsAffected == 0 {
			response.Error(c, http.StatusNotFound, resource+" not found")
			return
		}
		invalidate(c.Request.Context(), "deleted")
		response.OK(c, gin.H{"deleted": id})
	}))
}
