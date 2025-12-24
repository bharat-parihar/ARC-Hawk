package api

import (
	"encoding/json"
	"net/http"

	"github.com/arc-platform/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// IngestionHandler handles scan ingestion requests
type IngestionHandler struct {
	service *service.IngestionService
}

// NewIngestionHandler creates a new ingestion handler
func NewIngestionHandler(service *service.IngestionService) *IngestionHandler {
	return &IngestionHandler{service: service}
}

// IngestScan handles POST /api/v1/scans/ingest
func (h *IngestionHandler) IngestScan(c *gin.Context) {
	var input service.HawkeyeScanInput

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Validate input
	if len(input.FS) == 0 && len(input.PostgreSQL) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No findings in scan input",
		})
		return
	}

	// Process ingestion
	result, err := h.service.IngestScan(c.Request.Context(), &input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to ingest scan",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Scan ingested successfully",
		"data":    result,
	})
}

// GetScanStatus handles GET /api/v1/scans/:id
func (h *IngestionHandler) GetScanStatus(c *gin.Context) {
	// Implementation for getting scan status
	c.JSON(http.StatusOK, gin.H{
		"message": "Get scan status endpoint",
	})
}

// Ensure handler can marshal to JSON
func (h *IngestionHandler) MarshalJSON() ([]byte, error) {
	return json.Marshal(struct{}{})
}
