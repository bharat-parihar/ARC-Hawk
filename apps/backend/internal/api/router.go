package api

import (
	"time"

	"github.com/arc-platform/backend/internal/service"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Router holds all handlers
type Router struct {
	ingestionHandler      *IngestionHandler
	classificationHandler *ClassificationHandler
	findingsHandler       *FindingsHandler
	assetHandler          *AssetHandler
	graphHandler          *GraphHandler
	datasetHandler        *DatasetHandler
	scanTriggerHandler    *ScanTriggerHandler
}

// NewRouter creates a new router with all handlers
func NewRouter(
	ingestionService *service.IngestionService,
	classificationService *service.ClassificationService,
	classificationSummaryService *service.ClassificationSummaryService,
	findingsService *service.FindingsService,
	assetService *service.AssetService,
	semanticLineageService *service.SemanticLineageService,
	datasetService *service.DatasetService,
) *Router {
	return &Router{
		ingestionHandler:      NewIngestionHandler(ingestionService),
		classificationHandler: NewClassificationHandler(classificationService, classificationSummaryService),
		findingsHandler:       NewFindingsHandler(findingsService),
		assetHandler:          NewAssetHandler(assetService),
		graphHandler:          NewGraphHandler(semanticLineageService),
		datasetHandler:        NewDatasetHandler(datasetService),
		scanTriggerHandler:    NewScanTriggerHandler(),
	}
}

// SetupRoutes configures all routes and middleware
func (r *Router) SetupRoutes(
	router *gin.Engine,
	allowedOrigins string,
	sdkIngestHandler *SDKIngestHandler,
	lineageHandlerV2 *LineageHandlerV2,
) {
	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{allowedOrigins},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Recovery middleware
	router.Use(gin.Recovery())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "arc-platform-backend",
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Scan ingestion
		scans := v1.Group("/scans")
		{
			// PRODUCTION: SDK-verified ingestion only (Intelligence-at-Edge)
			scans.POST("/ingest-verified", sdkIngestHandler.IngestVerified)

			// Scan trigger
			scans.POST("/trigger", r.scanTriggerHandler.TriggerScan)

			// Scan management
			scans.GET("/latest", r.ingestionHandler.GetLatestScan)
			scans.GET("/:id", r.ingestionHandler.GetScanStatus)
			scans.DELETE("/clear", r.ingestionHandler.ClearScanData)
		}

		// Phase 3: Unified lineage (NEW - Neo4j only)
		v1.GET("/lineage", lineageHandlerV2.GetLineage)
		v1.GET("/lineage/stats", lineageHandlerV2.GetLineageStats)
		v1.POST("/lineage/sync", lineageHandlerV2.SyncLineage) // Added manual sync

		// Semantic Graph (NEW - Aggregated Neo4j Graph)
		graph := v1.Group("/graph")
		{
			graph.GET("/semantic", r.graphHandler.GetSemanticGraph)
		}

		// Classification
		classification := v1.Group("/classification")
		{
			classification.GET("/summary", r.classificationHandler.GetClassificationSummary)
		}

		// Findings
		// Findings
		v1.GET("/findings", r.findingsHandler.GetFindings)
		v1.POST("/findings/:id/feedback", r.findingsHandler.SubmitFeedback)

		// Assets
		v1.GET("/assets", r.assetHandler.ListAssets)
		v1.GET("/assets/:id", r.assetHandler.GetAsset)

		// Dataset (Golden)
		v1.GET("/dataset/golden", r.datasetHandler.GetGoldenDataset)
	}
}
