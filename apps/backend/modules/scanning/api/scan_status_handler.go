package api

import (
	"net/http"

	"github.com/arc-platform/backend/modules/scanning/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ScanStatusHandler handles scan status requests
type ScanStatusHandler struct {
	scanService *service.ScanService
}

// NewScanStatusHandler creates a new scan status handler
func NewScanStatusHandler(scanService *service.ScanService) *ScanStatusHandler {
	return &ScanStatusHandler{
		scanService: scanService,
	}
}

// GetScan handles GET /api/v1/scans/:id
// Returns full scan details
func (h *ScanStatusHandler) GetScan(c *gin.Context) {
	scanID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid scan ID",
		})
		return
	}

	scan, err := h.scanService.GetScanRun(c.Request.Context(), scanID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Scan not found",
		})
		return
	}

	c.JSON(http.StatusOK, scan)
}

// GetScanStatus handles GET /api/v1/scans/:id/status
// Returns lightweight status for polling
func (h *ScanStatusHandler) GetScanStatus(c *gin.Context) {
	scanID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid scan ID",
		})
		return
	}

	scan, err := h.scanService.GetScanRun(c.Request.Context(), scanID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Scan not found",
		})
		return
	}

	// Calculate progress (simple estimation)
	progress := 0
	if scan.Status == "completed" {
		progress = 100
	} else if scan.Status == "running" {
		progress = 50 // Estimate
	} else if scan.Status == "pending" {
		progress = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"scan_id":        scan.ID,
		"status":         scan.Status,
		"progress":       progress,
		"findings_count": scan.TotalFindings,
		"assets_count":   scan.TotalAssets,
	})
}

// ListScans handles GET /api/v1/scans
// Returns a paginated list of scan runs
func (h *ScanStatusHandler) ListScans(c *gin.Context) {
	limit := 10
	offset := 0

	// TODO: Parse limit and offset from query params

	scans, err := h.scanService.ListScanRuns(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch scan list",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": scans,
	})
}
