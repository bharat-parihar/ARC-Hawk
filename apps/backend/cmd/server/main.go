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
	"github.com/arc-platform/backend/internal/infrastructure/database"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/arc-platform/backend/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

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

	// Run database migrations
	if err := repo.MigrateSchema(context.Background()); err != nil {
		log.Fatalf("Failed to migrate schema: %v", err)
	}

	// Initialize services
	enrichmentService := service.NewEnrichmentService(repo)
	classificationService := service.NewClassificationService(repo)
	classificationSummaryService := service.NewClassificationSummaryService(repo)

	// Optional: Presidio ML integration
	presidioEnabled := os.Getenv("PRESIDIO_ENABLED")
	presidioURL := os.Getenv("PRESIDIO_URL")
	if presidioEnabled == "true" && presidioURL != "" {
		log.Printf("Presidio ML enabled at %s", presidioURL)
	} else {
		log.Println("Presidio ML disabled (rules-only mode)")
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
	if neo4jEnabled == "true" {
		neo4jRepo, err := persistence.NewNeo4jRepository(neo4jURI, neo4jUsername, neo4jPassword)
		if err != nil {
			log.Printf("WARNING: Neo4j connection failed: %v (falling back to PostgreSQL)", err)
			semanticLineageService = service.NewSemanticLineageService(nil, repo)
		} else {
			log.Println("✅ Neo4j semantic lineage enabled at", neo4jURI)
			semanticLineageService = service.NewSemanticLineageService(neo4jRepo, repo)
		}
	} else {
		log.Println("Neo4j disabled - using PostgreSQL-only lineage")
		semanticLineageService = service.NewSemanticLineageService(nil, repo)
	}

	// Create remaining services
	ingestionService := service.NewIngestionService(repo, classificationService, enrichmentService, semanticLineageService)
	lineageService := service.NewLineageService(repo)
	findingsService := service.NewFindingsService(repo)
	assetService := service.NewAssetService(repo)

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
