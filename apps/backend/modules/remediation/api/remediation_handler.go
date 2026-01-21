package api

import (
	"net/http"

	"github.com/arc-platform/backend/modules/remediation/service"
	"github.com/gin-gonic/gin"
)

// RemediationHandler handles remediation API requests
type RemediationHandler struct {
	service *service.RemediationService
}

// NewRemediationHandler creates a new remediation handler
func NewRemediationHandler(svc *service.RemediationService) *RemediationHandler {
	return &RemediationHandler{
		service: svc,
	}
}

// ExecuteRemediationRequest represents a remediation execution request
type ExecuteRemediationRequest struct {
	FindingIDs []string `json:"finding_ids" binding:"required"`
	ActionType string   `json:"action_type" binding:"required,oneof=MASK DELETE ENCRYPT"`
	UserID     string   `json:"user_id" binding:"required"`
}

// ExecuteRemediationResponse represents a remediation execution response
type ExecuteRemediationResponse struct {
	ActionIDs []string `json:"action_ids"`
	Success   int      `json:"success"`
	Failed    int      `json:"failed"`
	Errors    []string `json:"errors,omitempty"`
}

// ExecuteRemediation executes remediation for multiple findings
func (h *RemediationHandler) ExecuteRemediation(c *gin.Context) {
	var req ExecuteRemediationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var actionIDs []string
	var errors []string
	success := 0
	failed := 0

	for _, findingID := range req.FindingIDs {
		actionID, err := h.service.ExecuteRemediation(c.Request.Context(), findingID, req.ActionType, req.UserID)
		if err != nil {
			errors = append(errors, err.Error())
			failed++
		} else {
			actionIDs = append(actionIDs, actionID)
			success++
		}
	}

	c.JSON(http.StatusOK, ExecuteRemediationResponse{
		ActionIDs: actionIDs,
		Success:   success,
		Failed:    failed,
		Errors:    errors,
	})
}

// RollbackRemediation rolls back a remediation action
func (h *RemediationHandler) RollbackRemediation(c *gin.Context) {
	actionID := c.Param("actionId")

	if err := h.service.RollbackRemediation(c.Request.Context(), actionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Remediation rolled back successfully",
		"action_id": actionID,
	})
}

// GeneratePreview generates a remediation preview
func (h *RemediationHandler) GeneratePreview(c *gin.Context) {
	var req struct {
		FindingIDs []string `json:"finding_ids"`
		ActionType string   `json:"action_type"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	preview, err := h.service.GenerateRemediationPreview(c.Request.Context(), req.FindingIDs, req.ActionType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, preview)
}

// GetRemediationAction retrieves a single remediation action
func (h *RemediationHandler) GetRemediationAction(c *gin.Context) {
	actionID := c.Param("id")

	action, err := h.service.GetRemediationAction(c.Request.Context(), actionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, action)
}

// GetRemediationActions retrieves remediation actions for a finding
func (h *RemediationHandler) GetRemediationActions(c *gin.Context) {
	findingID := c.Param("findingId")

	// TODO: Implement query to get remediation actions
	c.JSON(http.StatusOK, gin.H{
		"finding_id": findingID,
		"actions":    []interface{}{},
	})
}

// GetRemediationHistory retrieves remediation history for an asset
func (h *RemediationHandler) GetRemediationHistory(c *gin.Context) {
	assetID := c.Param("assetId")

	// TODO: Implement query to get remediation history
	c.JSON(http.StatusOK, gin.H{
		"asset_id": assetID,
		"history":  []interface{}{},
	})
}

// GetPIIPreview returns masked preview of PII before remediation
func (h *RemediationHandler) GetPIIPreview(c *gin.Context) {
	findingID := c.Param("findingId")

	// TODO: Implement PII preview with masking
	c.JSON(http.StatusOK, gin.H{
		"finding_id":     findingID,
		"masked_preview": "XXXX-XXXX-1234",
		"pii_type":       "IN_AADHAAR",
	})
}
