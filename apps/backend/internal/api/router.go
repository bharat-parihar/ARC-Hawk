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
}

// NewRouter creates a new router with all handlers
func NewRouter(
	ingestionService *service.IngestionService,
	lineageService *service.LineageService,
	classificationService *service.ClassificationService,
	findingsService *service.FindingsService,
	assetService *service.AssetService,
) *Router {
	return &Router{
		ingestionHandler:      NewIngestionHandler(ingestionService),
		lineageHandler:        NewLineageHandler(lineageService),
		classificationHandler: NewClassificationHandler(classificationService),
		findingsHandler:       NewFindingsHandler(findingsService),
		assetHandler:          NewAssetHandler(assetService),
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
			scans.GET("/:id", r.ingestionHandler.GetScanStatus)
		}

		// Lineage
		v1.GET("/lineage", r.lineageHandler.GetLineage)

		// Classification
		classification := v1.Group("/classification")
		{
			classification.GET("/summary", r.classificationHandler.GetClassificationSummary)
		}

		// Findings
		// Findings
		v1.GET("/findings", r.findingsHandler.GetFindings)

		// Assets
		v1.GET("/assets/:id", r.assetHandler.GetAsset)
	}
}
