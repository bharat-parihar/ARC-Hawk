package connections

import (
	"log"

	"github.com/arc-platform/backend/modules/connections/api"
	"github.com/arc-platform/backend/modules/connections/service"
	"github.com/arc-platform/backend/modules/shared/infrastructure/persistence"
	"github.com/arc-platform/backend/modules/shared/interfaces"
	"github.com/gin-gonic/gin"
)

type ConnectionsModule struct {
	connectionService        *service.ConnectionService
	scanOrchestrationService *service.ScanOrchestrationService

	connectionHandler        *api.ConnectionHandler
	scanOrchestrationHandler *api.ScanOrchestrationHandler

	deps *interfaces.ModuleDependencies
}

func (m *ConnectionsModule) Name() string {
	return "connections"
}

func (m *ConnectionsModule) Initialize(deps *interfaces.ModuleDependencies) error {
	m.deps = deps
	log.Printf("🔌 Initializing Connections Module...")

	repo := persistence.NewPostgresRepository(deps.DB)

	m.connectionService = service.NewConnectionService(repo)
	m.scanOrchestrationService = service.NewScanOrchestrationService(repo)

	m.connectionHandler = api.NewConnectionHandler(m.connectionService)
	m.scanOrchestrationHandler = api.NewScanOrchestrationHandler(m.scanOrchestrationService)

	log.Printf("✅ Connections Module initialized")
	return nil
}

func (m *ConnectionsModule) RegisterRoutes(router *gin.RouterGroup) {
	router.POST("/connections", m.connectionHandler.AddConnection)
	router.GET("/connections", m.connectionHandler.GetConnections)

	scans := router.Group("/scans")
	{
		scans.POST("/scan-all", m.scanOrchestrationHandler.ScanAllAssets)
		scans.GET("/status", m.scanOrchestrationHandler.GetScanStatus)
		scans.GET("/jobs", m.scanOrchestrationHandler.GetAllJobs)
	}

	log.Printf("🔌 Connections routes registered")
}

func (m *ConnectionsModule) Shutdown() error {
	log.Printf("🔌 Shutting down Connections Module...")
	return nil
}

func NewConnectionsModule() *ConnectionsModule {
	return &ConnectionsModule{}
}
