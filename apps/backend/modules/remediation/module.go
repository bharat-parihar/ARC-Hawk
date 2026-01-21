package remediation

import (
	"database/sql"
	"log"

	"github.com/arc-platform/backend/modules/remediation/api"
	"github.com/arc-platform/backend/modules/remediation/service"
	"github.com/arc-platform/backend/modules/shared/interfaces"
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// RemediationModule implements the Module interface
type RemediationModule struct {
	db          *sql.DB
	neo4jDriver neo4j.DriverWithContext
	service     *service.RemediationService
}

// NewRemediationModule creates a new remediation module
func NewRemediationModule() *RemediationModule {
	return &RemediationModule{}
}

// Name returns the module name
func (m *RemediationModule) Name() string {
	return "Remediation"
}

// Initialize sets up the module
func (m *RemediationModule) Initialize(deps *interfaces.ModuleDependencies) error {
	m.db = deps.DB
	m.neo4jDriver = deps.Neo4jRepo.GetDriver()

	// Initialize service
	m.service = service.NewRemediationService(m.db, m.neo4jDriver)

	log.Println("✅ Remediation module initialized")
	return nil
}

// RegisterRoutes registers the module's routes
func (m *RemediationModule) RegisterRoutes(router *gin.RouterGroup) {
	handler := api.NewRemediationHandler(m.service)

	// Create remediation group
	g := router.Group("/remediation")
	{
		g.POST("/preview", handler.GeneratePreview)
		g.POST("/execute", handler.ExecuteRemediation)
		g.POST("/rollback/:id", handler.RollbackRemediation)
		g.GET("/:id", handler.GetRemediationAction)
	}
}

// Shutdown cleans up resources
func (m *RemediationModule) Shutdown() error {
	return nil
}
