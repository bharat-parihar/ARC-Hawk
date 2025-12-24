package api

import (
	"net/http"

	"github.com/arc-platform/backend/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// LineageHandler handles lineage graph requests
type LineageHandler struct {
	service *service.LineageService
}

// NewLineageHandler creates a new lineage handler
func NewLineageHandler(service *service.LineageService) *LineageHandler {
	return &LineageHandler{service: service}
}

// GetLineage handles GET /api/v1/lineage
func (h *LineageHandler) GetLineage(c *gin.Context) {
	// Parse query parameters
	filters := service.LineageFilters{
		Source:   c.Query("source"),
		Severity: c.Query("severity"),
		DataType: c.Query("data_type"),
		Level:    c.Query("level"),
	}

	// Parse asset_id if provided
	if assetIDStr := c.Query("asset_id"); assetIDStr != "" {
		assetID, err := uuid.Parse(assetIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid asset_id format",
				"details": err.Error(),
			})
			return
		}
		filters.AssetID = &assetID
	}

	// Build lineage graph
	graph, err := h.service.BuildLineage(c.Request.Context(), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to build lineage graph",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": graph,
	})
}
