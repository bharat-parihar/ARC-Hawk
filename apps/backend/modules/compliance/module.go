package compliance

import (
	"log"

	"github.com/arc-platform/backend/modules/compliance/api"
	"github.com/arc-platform/backend/modules/compliance/service"
	"github.com/arc-platform/backend/modules/shared/infrastructure/persistence"
	"github.com/arc-platform/backend/modules/shared/interfaces"
	"github.com/gin-gonic/gin"
)

type ComplianceModule struct {
	complianceService *service.ComplianceService
	complianceHandler *api.ComplianceHandler
	deps              *interfaces.ModuleDependencies
}

func (m *ComplianceModule) Name() string {
	return "compliance"
}

func (m *ComplianceModule) Initialize(deps *interfaces.ModuleDependencies) error {
	m.deps = deps
	log.Printf("⚖️  Initializing Compliance Module...")

	repo := persistence.NewPostgresRepository(deps.DB)

	m.complianceService = service.NewComplianceService(repo, deps.Neo4jRepo)
	m.complianceHandler = api.NewComplianceHandler(m.complianceService)

	log.Printf("✅ Compliance Module initialized")
	return nil
}

func (m *ComplianceModule) RegisterRoutes(router *gin.RouterGroup) {
	compliance := router.Group("/compliance")
	{
		compliance.GET("/overview", m.complianceHandler.GetComplianceOverview)
		compliance.GET("/violations", m.complianceHandler.GetConsentViolations)
		compliance.GET("/critical", m.complianceHandler.GetCriticalAssets)
	}
	log.Printf("⚖️  Compliance routes registered")
}

func (m *ComplianceModule) Shutdown() error {
	log.Printf("🔌 Shutting down Compliance Module...")
	return nil
}

func NewComplianceModule() *ComplianceModule {
	return &ComplianceModule{}
}
