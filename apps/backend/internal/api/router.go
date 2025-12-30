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
	lineageHandler        *LineageHandler
	classificationHandler *ClassificationHandler
	findingsHandler       *FindingsHandler
	assetHandler          *AssetHandler
	graphHandler          *GraphHandler
	datasetHandler        *DatasetHandler
}

// NewRouter creates a new router with all handlers
func NewRouter(
	ingestionService *service.IngestionService,
	lineageService *service.LineageService,
	classificationService *service.ClassificationService,
	classificationSummaryService *service.ClassificationSummaryService,
	findingsService *service.FindingsService,
	assetService *service.AssetService,
	semanticLineageService *service.SemanticLineageService,
	datasetService *service.DatasetService,
) *Router {
	return &Router{
		ingestionHandler:      NewIngestionHandler(ingestionService),
		lineageHandler:        NewLineageHandler(lineageService),
		classificationHandler: NewClassificationHandler(classificationService, classificationSummaryService),
		findingsHandler:       NewFindingsHandler(findingsService),
		assetHandler:          NewAssetHandler(assetService),
		graphHandler:          NewGraphHandler(semanticLineageService),
		datasetHandler:        NewDatasetHandler(datasetService),
	}
}

// SetupRoutes configures all routes and middleware
func (r *Router) SetupRoutes(router *gin.Engine, allowedOrigins string) {
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
			scans.POST("/ingest", r.ingestionHandler.IngestScan)
			scans.GET("/latest", r.ingestionHandler.GetLatestScan)
			scans.GET("/:id", r.ingestionHandler.GetScanStatus)
		}

		// Lineage
		v1.GET("/lineage", r.lineageHandler.GetLineage)

		// Semantic Graph (NEW - Aggregated Neo4j Graph)
		graph := v1.Group("/graph")
		{
			graph.GET("/semantic", r.graphHandler.GetSemanticGraph)
		}

		// Classification
		classification := v1.Group("/classification")
		{
			classification.GET("/summary", r.classificationHandler.GetClassificationSummary)
			classification.POST("/predict", r.classificationHandler.Predict)
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
