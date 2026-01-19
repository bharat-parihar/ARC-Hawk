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

	"github.com/arc-platform/backend/modules/shared/config"
	"github.com/arc-platform/backend/modules/analytics"
	"github.com/arc-platform/backend/modules/assets"
	"github.com/arc-platform/backend/modules/compliance"
	"github.com/arc-platform/backend/modules/connections"
	"github.com/arc-platform/backend/modules/lineage"
	"github.com/arc-platform/backend/modules/masking"
	"github.com/arc-platform/backend/modules/scanning"
	"github.com/arc-platform/backend/modules/shared/infrastructure/database"
	"github.com/arc-platform/backend/modules/shared/infrastructure/persistence"
	"github.com/arc-platform/backend/modules/shared/interfaces"
	"github.com/gin-contrib/cors"
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

	log.Println("🚀 Starting ARC-Hawk Backend (Modular Monolith Architecture)")
	log.Println("=" + string(make([]byte, 70)))

	// Connect to database
	dbConfig := database.NewConfig()
	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("✅ Database connection established")

	// Run database migrations
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

	// Connect to Neo4j
	neo4jURI := getEnv("NEO4J_URI", "bolt://127.0.0.1:7687")
	neo4jUsername := getEnv("NEO4J_USERNAME", "neo4j")
	neo4jPassword := getEnv("NEO4J_PASSWORD", "password123")

	log.Printf("🔗 Connecting to Neo4j at %s...", neo4jURI)

	neo4jRepo, err := persistence.NewNeo4jRepository(neo4jURI, neo4jUsername, neo4jPassword)
	if err != nil {
		log.Fatalf("❌ FATAL: Neo4j connection failed: %v", err)
	}

	log.Printf("✅ Neo4j connection established")

	// Initialize Module Registry
	log.Println("\n📦 Initializing Modules...")
	log.Println("=" + string(make([]byte, 70)))

	registry := interfaces.NewModuleRegistry()

	// Register all modules
	modules := []interfaces.Module{
		scanning.NewScanningModule(),       // Scanning & Classification (combined)
		assets.NewAssetsModule(),           // Asset Management
		lineage.NewLineageModule(),         // Data Lineage
		compliance.NewComplianceModule(),   // Compliance Posture
		masking.NewMaskingModule(),         // Data Masking
		analytics.NewAnalyticsModule(),     // Analytics & Heatmaps
		connections.NewConnectionsModule(), // Connections & Orchestration
	}

	for _, module := range modules {
		if err := registry.Register(module); err != nil {
			log.Fatalf("Failed to register module %s: %v", module.Name(), err)
		}
		log.Printf("📌 Registered module: %s", module.Name())
	}

	// Prepare module dependencies
	deps := &interfaces.ModuleDependencies{
		DB:        db,
		Neo4jRepo: neo4jRepo,
		Config:    cfg,
		Registry:  registry,
	}

	// Initialize all modules
	if err := registry.InitializeAll(deps); err != nil {
		log.Fatalf("Failed to initialize modules: %v", err)
	}

	log.Println("\n✅ All modules initialized successfully")
	log.Println("=" + string(make([]byte, 70)))

	// Setup HTTP server
	router := gin.Default()

	// CORS middleware
	allowedOrigins := getEnv("ALLOWED_ORIGINS", "http://localhost:3000")
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
			"status":       "healthy",
			"service":      "arc-platform-backend",
			"architecture": "modular-monolith",
			"modules":      len(modules),
		})
	})

	// Register all module routes
	log.Println("\n🛣️  Registering Module Routes...")
	log.Println("=" + string(make([]byte, 70)))

	apiV1 := router.Group("/api/v1")
	for _, module := range registry.GetAll() {
		module.RegisterRoutes(apiV1)
	}

	log.Println("\n✅ All routes registered")
	log.Println("=" + string(make([]byte, 70)))

	// Server configuration
	port := getEnv("PORT", "8080")

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("\n🚀 Server starting on port %s", port)
		log.Printf("📡 API endpoint: http://localhost:%s/api/v1", port)
		log.Printf("🏥 Health check: http://localhost:%s/health", port)
		log.Println("=" + string(make([]byte, 70)))

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("\n🛑 Shutting down server...")

	// Shutdown all modules
	if err := registry.ShutdownAll(); err != nil {
		log.Printf("Error during module shutdown: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("✅ Server exited cleanly")
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
