package crudkit

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	mw "github.com/little-royals/school-api/pkg/middleware"
	"github.com/little-royals/school-api/pkg/response"
)

type Handler struct {
	store  *Store
	secret []byte
}

func NewHandler(store *Store, jwtSecret []byte) *Handler {
	return &Handler{store: store, secret: jwtSecret}
}

// Mount registers /api/v1/{module} CRUD routes on the Gin engine.
func (h *Handler) Mount(r *gin.Engine) {
	base := "/api/v1/" + h.store.Module()
	api := r.Group(base)
	api.Use(mw.JWTAuth(h.secret))

	api.GET("", func(c *gin.Context) {
		response.JSON(c, http.StatusOK, h.store.List())
	})

	api.GET("/:id", func(c *gin.Context) {
		item, ok := h.store.Get(c.Param("id"))
		if !ok {
			response.Error(c, http.StatusNotFound, h.store.Module()+" not found")
			return
		}
		response.JSON(c, http.StatusOK, item)
	})

	api.POST("", func(c *gin.Context) {
		var body Record
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if name, _ := body["name"].(string); strings.TrimSpace(name) == "" {
			response.Error(c, http.StatusBadRequest, "name is required")
			return
		}
		response.JSON(c, http.StatusCreated, h.store.Create(body))
	})

	api.PUT("/:id", func(c *gin.Context) {
		var body Record
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, "invalid JSON body")
			return
		}
		item, ok := h.store.Update(c.Param("id"), body)
		if !ok {
			response.Error(c, http.StatusNotFound, h.store.Module()+" not found")
			return
		}
		response.JSON(c, http.StatusOK, item)
	})

	api.PATCH("/:id", func(c *gin.Context) {
		var body Record
		if err := c.ShouldBindJSON(&body); err != nil {
			response.Error(c, http.StatusBadRequest, "invalid JSON body")
			return
		}
		item, ok := h.store.Update(c.Param("id"), body)
		if !ok {
			response.Error(c, http.StatusNotFound, h.store.Module()+" not found")
			return
		}
		response.JSON(c, http.StatusOK, item)
	})

	api.DELETE("/:id", func(c *gin.Context) {
		id := c.Param("id")
		if !h.store.Delete(id) {
			response.Error(c, http.StatusNotFound, h.store.Module()+" not found")
			return
		}
		response.JSON(c, http.StatusOK, gin.H{"deleted": id})
	})
}
