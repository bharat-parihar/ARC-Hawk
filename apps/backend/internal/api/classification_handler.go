package api

import (
	"net/http"

	"github.com/arc-platform/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// ClassificationHandler handles classification requests
type ClassificationHandler struct {
	service        *service.ClassificationService
	summaryService *service.ClassificationSummaryService
}

// NewClassificationHandler creates a new classification handler
func NewClassificationHandler(service *service.ClassificationService, summaryService *service.ClassificationSummaryService) *ClassificationHandler {
	return &ClassificationHandler{
		service:        service,
		summaryService: summaryService,
	}
}

// GetClassificationSummary handles GET /api/v1/classification/summary
func (h *ClassificationHandler) GetClassificationSummary(c *gin.Context) {
	summary, err := h.summaryService.GetClassificationSummary(c.Request.Context())
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
