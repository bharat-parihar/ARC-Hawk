package scanning

import (
	"log"

	"github.com/arc-platform/backend/modules/scanning/api"
	"github.com/arc-platform/backend/modules/scanning/service"
	"github.com/arc-platform/backend/modules/shared/infrastructure/persistence"
	"github.com/arc-platform/backend/modules/shared/interfaces"
	"github.com/gin-gonic/gin"
)

// ScanningModule handles scan ingestion, PII classification, and enrichment
type ScanningModule struct {
	// Services
	ingestionService             *service.IngestionService
	classificationService        *service.ClassificationService
	classificationSummaryService *service.ClassificationSummaryService
	enrichmentService            *service.EnrichmentService

	// Handlers
	ingestionHandler      *api.IngestionHandler
	classificationHandler *api.ClassificationHandler
	sdkIngestHandler      *api.SDKIngestHandler
	scanTriggerHandler    *api.ScanTriggerHandler

	// Dependencies
	deps *interfaces.ModuleDependencies
}

// Name returns the module name
func (m *ScanningModule) Name() string {
	return "scanning"
}

// Initialize sets up the scanning module
func (m *ScanningModule) Initialize(deps *interfaces.ModuleDependencies) error {
	m.deps = deps

	log.Printf("📡 Initializing Scanning & Classification Module...")

	// Create PostgreSQL repository
	repo := persistence.NewPostgresRepository(deps.DB)

	// Get lineage service from registry (if available)

	// Initialize services
	m.enrichmentService = service.NewEnrichmentService(repo)
	m.classificationService = service.NewClassificationService(repo, deps.Config)
	m.classificationSummaryService = service.NewClassificationSummaryService(repo)

	// Ingestion service needs lineage service
	// For now, pass nil and handle gracefully
	m.ingestionService = service.NewIngestionService(
		repo,
		m.classificationService,
		m.enrichmentService,
		nil,
	)

	// Initialize handlers
	m.ingestionHandler = api.NewIngestionHandler(m.ingestionService)
	m.classificationHandler = api.NewClassificationHandler(
		m.classificationService,
		m.classificationSummaryService,
	)
	m.sdkIngestHandler = api.NewSDKIngestHandler(m.ingestionService)
	m.scanTriggerHandler = api.NewScanTriggerHandler()

	log.Printf("✅ Scanning & Classification Module initialized")
	return nil
}

// RegisterRoutes registers the module's HTTP routes
func (m *ScanningModule) RegisterRoutes(router *gin.RouterGroup) {
	scans := router.Group("/scans")
	{
		// SDK-verified ingestion (Intelligence-at-Edge)
		scans.POST("/ingest-verified", m.sdkIngestHandler.IngestVerified)

		// Scan trigger
		scans.POST("/trigger", m.scanTriggerHandler.TriggerScan)

		// Scan management
		scans.GET("/latest", m.ingestionHandler.GetLatestScan)
		scans.GET("/:id", m.ingestionHandler.GetScanStatus)
		scans.DELETE("/clear", m.ingestionHandler.ClearScanData)
	}

	// Classification
	classification := router.Group("/classification")
	{
		classification.GET("/summary", m.classificationHandler.GetClassificationSummary)
	}

	log.Printf("📡 Scanning & Classification routes registered")
}

// Shutdown performs cleanup
func (m *ScanningModule) Shutdown() error {
	log.Printf("🔌 Shutting down Scanning & Classification Module...")
	// Cleanup if needed
	return nil
}

// NewScanningModule creates a new scanning module
func NewScanningModule() *ScanningModule {
	return &ScanningModule{}
}
