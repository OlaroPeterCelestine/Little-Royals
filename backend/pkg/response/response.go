package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Body struct {
	OK    bool        `json:"ok"`
	Data  interface{} `json:"data,omitempty"`
	Error string      `json:"error,omitempty"`
}

func JSON(c *gin.Context, status int, data interface{}) {
	c.JSON(status, Body{OK: true, Data: data})
}

func Error(c *gin.Context, status int, msg string) {
	c.AbortWithStatusJSON(status, Body{OK: false, Error: msg})
}

func Health(c *gin.Context, service string) {
	JSON(c, http.StatusOK, gin.H{
		"service": service,
		"status":  "up",
	})
}
