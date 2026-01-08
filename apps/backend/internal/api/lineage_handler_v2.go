package api

import (
	"net/http"

	"github.com/arc-platform/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// LineageHandlerV2 handles lineage-related requests
// Phase 3: Unified Neo4j-Only Lineage
type LineageHandlerV2 struct {
	semanticLineageService *service.SemanticLineageService
}

// NewLineageHandlerV2 creates a new lineage handler
func NewLineageHandlerV2(semanticLineageService *service.SemanticLineageService) *LineageHandlerV2 {
	return &LineageHandlerV2{
		semanticLineageService: semanticLineageService,
	}
}

// GetLineage handles GET /api/v1/lineage
// Returns the complete 4-level hierarchy with aggregations
func (h *LineageHandlerV2) GetLineage(c *gin.Context) {
	// Parse filters from query params
	systemFilter := c.Query("system")
	riskFilter := c.Query("risk") // CRITICAL, HIGH, MEDIUM

	// Get hierarchy from Neo4j
	ctx := c.Request.Context()
	hierarchy, err := h.semanticLineageService.GetHierarchy(ctx, systemFilter, riskFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve lineage",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data":   hierarchy,
	})
}

// GetLineageStats handles GET /api/v1/lineage/stats
// Returns aggregated statistics only
func (h *LineageHandlerV2) GetLineageStats(c *gin.Context) {
	ctx := c.Request.Context()

	hierarchy, err := h.semanticLineageService.GetHierarchy(ctx, "", "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve stats",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"stats":  hierarchy.Aggregations,
	})
}
