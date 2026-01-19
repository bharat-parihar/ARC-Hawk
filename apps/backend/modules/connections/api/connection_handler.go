package api

import (
	"net/http"

	"github.com/arc-platform/backend/modules/connections/service"
	"github.com/gin-gonic/gin"
)

type ConnectionHandler struct {
	service *service.ConnectionService
}

func NewConnectionHandler(s *service.ConnectionService) *ConnectionHandler {
	return &ConnectionHandler{service: s}
}

type AddConnectionRequest struct {
	SourceType  string                 `json:"source_type" binding:"required"`
	ProfileName string                 `json:"profile_name" binding:"required"`
	Config      map[string]interface{} `json:"config" binding:"required"`
}

// AddConnection handles POST requests to add a new data source connection
func (h *ConnectionHandler) AddConnection(c *gin.Context) {
	var req AddConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.AddConnection(req.SourceType, req.ProfileName, req.Config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add connection: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Connection added successfully"})
}

// GetConnections handles GET requests to retrieve current connections
func (h *ConnectionHandler) GetConnections(c *gin.Context) {
	config, err := h.service.GetConnections()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get connections: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, config)
}
