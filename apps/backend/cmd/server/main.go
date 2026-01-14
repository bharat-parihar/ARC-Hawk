package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/arc-platform/backend/internal/api"
	"github.com/arc-platform/backend/internal/config"
	"github.com/arc-platform/backend/internal/infrastructure/database"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/arc-platform/backend/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load application configuration
	cfg := config.LoadConfig()

	// Set Gin mode
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "debug"
	}
	gin.SetMode(ginMode)

	// Connect to database
	dbConfig := database.NewConfig()
	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("Database connection established")

	// Initialize repository
	repo := persistence.NewPostgresRepository(db)

	// Run database migrations using golang-migrate
	migrationURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
		getEnv("DB_SSLMODE", "disable"))

	m, err := migrate.New(
		"file://migrations_versioned",
		migrationURL)
	if err != nil {
		log.Fatalf("Failed to initialize migrations: %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	version, dirty, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		log.Printf("Warning: Could not get migration version: %v", err)
	} else if err == nil {
		log.Printf("✅ Database migrated to version %d (dirty: %v)", version, dirty)
	}

	// Initialize services
	enrichmentService := service.NewEnrichmentService(repo)
	classificationService := service.NewClassificationService(repo, cfg)
	classificationSummaryService := service.NewClassificationSummaryService(repo)

	// REMOVED: Presidio initialization - Intelligence-at-Edge architecture
	// Presidio SDK now runs ONLY in Python scanner, not in Go backend
	// Backend trusts scanner's verified findings without re-running ML

	// ==================================================================================
	// Neo4j Configuration - REQUIRED (Intelligence-at-Edge Architecture)
	// ==================================================================================
	// Neo4j is the ONLY source of truth for lineage - no fallbacks allowed
	// System will FAIL to start if Neo4j is unavailable
	// ==================================================================================

	neo4jURI := os.Getenv("NEO4J_URI")
	if neo4jURI == "" {
		neo4jURI = "bolt://127.0.0.1:7687" // Default
	}
	neo4jUsername := os.Getenv("NEO4J_USERNAME")
	if neo4jUsername == "" {
		neo4jUsername = "neo4j"
	}
	neo4jPassword := os.Getenv("NEO4J_PASSWORD")
	if neo4jPassword == "" {
		neo4jPassword = "password123"
	}

	log.Printf("🔗 Connecting to Neo4j (REQUIRED) at %s...", neo4jURI)

	neo4jRepo, err := persistence.NewNeo4jRepository(neo4jURI, neo4jUsername, neo4jPassword)
	if err != nil {
		log.Fatalf("❌ FATAL: Neo4j connection REQUIRED but failed: %v\n"+
			"   Neo4j is mandatory for lineage - system cannot start without it.\n"+
			"   Please ensure Neo4j is running at %s", err, neo4jURI)
	}

	log.Printf("✅ Neo4j lineage ONLINE (REQUIRED) at %s", neo4jURI)
	log.Printf("   All asset lineage will be stored in Neo4j graph")

	// Create semantic lineage service with mandatory Neo4j
	semanticLineageService := service.NewSemanticLineageService(neo4jRepo, repo)

	// Create remaining services
	ingestionService := service.NewIngestionService(repo, classificationService, enrichmentService, semanticLineageService)
	findingsService := service.NewFindingsService(repo)
	assetService := service.NewAssetService(repo)
	datasetService := service.NewDatasetService(repo)

	// NEW: Product & UX services
	scanOrchestrationService := service.NewScanOrchestrationService(repo)
	complianceService := service.NewComplianceService(repo, neo4jRepo)
	analyticsService := service.NewAnalyticsService(repo)
	connectionService := service.NewConnectionService()

	// Phase 2: SDK-verified ingestion handler
	sdkIngestHandler := api.NewSDKIngestHandler(ingestionService)

	// Phase 3: Unified lineage handler (V2 - 3-level hierarchy only)
	lineageHandlerV2 := api.NewLineageHandlerV2(semanticLineageService)

	// Initialize router (NO old lineage service)
	r := gin.Default()
	apiRouter := api.NewRouter(
		ingestionService,
		classificationService,
		classificationSummaryService,
		findingsService,
		assetService,
		semanticLineageService,
		datasetService,
		scanOrchestrationService,
		complianceService,
		analyticsService,
		connectionService,
	)

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000"
	}
	apiRouter.SetupRoutes(r, allowedOrigins, sdkIngestHandler, lineageHandlerV2)

	// Server configuration
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting server on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
