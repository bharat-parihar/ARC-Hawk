package api

import (
	"net/http"

	"github.com/arc-platform/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// ClassificationHandler handles classification requests
type ClassificationHandler struct {
	service *service.ClassificationService
}

// NewClassificationHandler creates a new classification handler
func NewClassificationHandler(service *service.ClassificationService) *ClassificationHandler {
	return &ClassificationHandler{service: service}
}

// GetClassificationSummary handles GET /api/v1/classification/summary
func (h *ClassificationHandler) GetClassificationSummary(c *gin.Context) {
	summary, err := h.service.GetClassificationSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get classification summary",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": summary,
	})
}
