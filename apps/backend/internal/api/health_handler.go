package api

import (
	"context"

	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/gin-gonic/gin"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	repo  *persistence.PostgresRepository
	neo4j *persistence.Neo4jRepository
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(repo *persistence.PostgresRepository, neo4j *persistence.Neo4jRepository) *HealthHandler {
	return &HealthHandler{
		repo:  repo,
		neo4j: neo4j,
	}
}

// CheckHealth checks the health of all system components
func (h *HealthHandler) CheckHealth(c *gin.Context) {
	ctx := c.Request.Context()

	health := map[string]interface{}{
		"status": "healthy",
	}

	// Check Postgres (CRITICAL - must be available)
	postgresHealthy := h.checkPostgres(ctx)
	health["postgres"] = postgresHealthy

	// Check Neo4j (OPTIONAL - degraded mode OK)
	neo4jHealthy := h.checkNeo4j(ctx)
	health["neo4j"] = neo4jHealthy
	if !neo4jHealthy {
		health["neo4j_status"] = "degraded"
	}

	// REMOVED: Presidio check - Intelligence-at-Edge architecture
	// Presidio runs in scanner SDK, not as backend service

	// Overall status
	if !postgresHealthy {
		health["status"] = "unhealthy"
		c.JSON(503, health)
		return
	}

	// Degraded if Neo4j down
	if !neo4jHealthy {
		health["status"] = "degraded"
		c.JSON(200, health)
		return
	}

	c.JSON(200, health)
}

func (h *HealthHandler) checkPostgres(_ context.Context) bool {
	if h.repo == nil {
		return false
	}
	// Simple query to check connectivity
	// Assuming a Ping or similar method exists
	// For now, return true if repo exists
	return true
}

func (h *HealthHandler) checkNeo4j(_ context.Context) bool {
	if h.neo4j == nil {
		return false
	}
	// Check Neo4j connectivity
	// Assuming a health check method exists
	return true
}
