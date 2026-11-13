package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Body struct {
	OK    bool        `json:"ok"`
	Data  interface{} `json:"data,omitempty"`
	Error string      `json:"error,omitempty"`
	Meta  interface{} `json:"meta,omitempty"`
}

func JSON(c *gin.Context, status int, data interface{}) {
	c.JSON(status, Body{OK: true, Data: data})
}

func JSONMeta(c *gin.Context, status int, data, meta interface{}) {
	c.JSON(status, Body{OK: true, Data: data, Meta: meta})
}

func Error(c *gin.Context, status int, msg string) {
	c.AbortWithStatusJSON(status, Body{OK: false, Error: msg})
}

func OK(c *gin.Context, data interface{}) {
	JSON(c, http.StatusOK, data)
}

func Created(c *gin.Context, data interface{}) {
	JSON(c, http.StatusCreated, data)
}
