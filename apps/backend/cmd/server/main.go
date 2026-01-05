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
		os.Getenv("DATABASE_USER"),
		os.Getenv("DATABASE_PASSWORD"),
		os.Getenv("DATABASE_HOST"),
		os.Getenv("DATABASE_PORT"),
		os.Getenv("DATABASE_NAME"),
		os.Getenv("DATABASE_SSLMODE"))

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

	// MANDATORY: Presidio ML integration (Presidio-first architecture)
	presidioURL := os.Getenv("PRESIDIO_URL")
	if presidioURL == "" {
		presidioURL = "http://localhost:5001" // Default
	}

	// Create Presidio client
	presidioClient := service.NewPresidioClient(presidioURL, true) // always enabled

	// Health check - GRACEFUL DEGRADATION: Fall back to rules-only if Presidio unavailable
	healthCtx, healthCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer healthCancel()

	if err := presidioClient.HealthCheck(healthCtx); err != nil {
		log.Printf("⚠️ WARNING: Presidio ML service unavailable - falling back to rules-only classification mode")
		log.Printf("   Error: %v", err)
		log.Printf("   Expected location: %s", presidioURL)
		log.Printf("   Classification will continue with reduced ML confidence (pattern matching + context only)")
		classificationService.SetPresidioClient(nil) // Disable ML signal, enable rules-only mode
	} else {
		log.Printf("✅ Presidio ML connected and healthy at %s", presidioURL)
		classificationService.SetPresidioClient(presidioClient)
	}

	// Neo4j configuration (optional - needed for semantic graph)
	neo4jEnabled := os.Getenv("NEO4J_ENABLED")
	neo4jURI := os.Getenv("NEO4J_URI")
	if neo4jURI == "" {
		neo4jURI = "bolt://localhost:7687"
	}
	neo4jUsername := os.Getenv("NEO4J_USERNAME")
	if neo4jUsername == "" {
		neo4jUsername = "neo4j"
	}
	neo4jPassword := os.Getenv("NEO4J_PASSWORD")
	if neo4jPassword == "" {
		neo4jPassword = "password123"
	}

	// Create semantic lineage service (required by ingestion)
	var semanticLineageService *service.SemanticLineageService
	log.Printf("Neo4j Configuration: ENABLED=%s, URI=%s, USER=%s", neo4jEnabled, neo4jURI, neo4jUsername)

	if neo4jEnabled == "true" {
		log.Printf("Attempting to connect to Neo4j at %s...", neo4jURI)
		neo4jRepo, err := persistence.NewNeo4jRepository(neo4jURI, neo4jUsername, neo4jPassword)
		if err != nil {
			log.Printf("❌ WARNING: Neo4j connection failed: %v", err)
			log.Printf("   Falling back to PostgreSQL-only lineage (Neo4j features will be unavailable)")
			semanticLineageService = service.NewSemanticLineageService(nil, repo)
		} else {
			log.Printf("✅ Neo4j semantic lineage ENABLED at %s", neo4jURI)
			log.Printf("   Assets will be synced to Neo4j graph during ingestion")
			semanticLineageService = service.NewSemanticLineageService(neo4jRepo, repo)
		}
	} else {
		log.Printf("ℹ️  Neo4j DISABLED (set NEO4J_ENABLED=true to enable)")
		log.Printf("   Using PostgreSQL-only lineage (relational graph)")
		semanticLineageService = service.NewSemanticLineageService(nil, repo)
	}

	// Create remaining services
	ingestionService := service.NewIngestionService(repo, classificationService, enrichmentService, semanticLineageService)
	lineageService := service.NewLineageService(repo)
	findingsService := service.NewFindingsService(repo)
	assetService := service.NewAssetService(repo)
	datasetService := service.NewDatasetService(repo)

	// Initialize router
	r := gin.Default()
	apiRouter := api.NewRouter(
		ingestionService,
		lineageService,
		classificationService,
		classificationSummaryService,
		findingsService,
		assetService,
		semanticLineageService,
		datasetService,
	)

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000"
	}
	apiRouter.SetupRoutes(r, allowedOrigins)

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
