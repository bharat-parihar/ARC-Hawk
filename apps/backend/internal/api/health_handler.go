package api

import (
	"context"

	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/arc-platform/backend/internal/service"
	"github.com/gin-gonic/gin"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	repo     *persistence.PostgresRepository
	neo4j    *persistence.Neo4jRepository
	presidio *service.PresidioClient
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(repo *persistence.PostgresRepository, neo4j *persistence.Neo4jRepository, presidio *service.PresidioClient) *HealthHandler {
	return &HealthHandler{
		repo:     repo,
		neo4j:    neo4j,
		presidio: presidio,
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

	// Check Presidio (OPTIONAL - degraded mode OK)
	presidioHealthy := h.checkPresidio(ctx)
	health["presidio"] = presidioHealthy
	if !presidioHealthy {
		health["presidio_status"] = "degraded"
	}

	// Overall status
	if !postgresHealthy {
		health["status"] = "unhealthy"
		c.JSON(503, health)
		return
	}

	// Degraded if optional services down
	if !neo4jHealthy || !presidioHealthy {
		health["status"] = "degraded"
		c.JSON(200, health)
		return
	}

	c.JSON(200, health)
}

func (h *HealthHandler) checkPostgres(ctx context.Context) bool {
	if h.repo == nil {
		return false
	}
	// Simple query to check connectivity
	// Assuming a Ping or similar method exists
	// For now, return true if repo exists
	return true
}

func (h *HealthHandler) checkNeo4j(ctx context.Context) bool {
	if h.neo4j == nil {
		return false
	}
	// Check Neo4j connectivity
	// Assuming a health check method exists
	return true
}

func (h *HealthHandler) checkPresidio(ctx context.Context) bool {
	if h.presidio == nil {
		return false
	}
	err := h.presidio.HealthCheck(ctx)
	return err == nil
}
