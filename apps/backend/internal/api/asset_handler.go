package api

import (
	"net/http"

	"github.com/arc-platform/backend/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AssetHandler handles asset-related requests
type AssetHandler struct {
	service *service.AssetService
}

// NewAssetHandler creates a new asset handler
func NewAssetHandler(service *service.AssetService) *AssetHandler {
	return &AssetHandler{service: service}
}

// GetAsset handles GET /api/v1/assets/:id
func (h *AssetHandler) GetAsset(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset ID"})
		return
	}

	asset, err := h.service.GetAsset(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": asset})
}

// ListAssets handles GET /api/v1/assets
func (h *AssetHandler) ListAssets(c *gin.Context) {
	assets, err := h.service.ListAssets(c.Request.Context(), 100, 0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list assets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assets})
}
