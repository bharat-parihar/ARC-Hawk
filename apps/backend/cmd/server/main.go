package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/arc-platform/backend/modules/analytics"
	"github.com/arc-platform/backend/modules/assets"
	"github.com/arc-platform/backend/modules/auth"
	"github.com/arc-platform/backend/modules/auth/service"
	"github.com/arc-platform/backend/modules/compliance"
	"github.com/arc-platform/backend/modules/connections"
	"github.com/arc-platform/backend/modules/fplearning"
	"github.com/arc-platform/backend/modules/lineage"
	"github.com/arc-platform/backend/modules/masking"
	"github.com/arc-platform/backend/modules/remediation"
	"github.com/arc-platform/backend/modules/scanning"
	"github.com/arc-platform/backend/modules/shared/config"
	"github.com/arc-platform/backend/modules/shared/infrastructure/database"
	"github.com/arc-platform/backend/modules/shared/infrastructure/persistence"
	"github.com/arc-platform/backend/modules/shared/interfaces"
	"github.com/arc-platform/backend/modules/websocket"
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
	log.Println(strings.Repeat("=", 70))

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
	log.Println(strings.Repeat("=", 70))

	registry := interfaces.NewModuleRegistry()

	// Prepare base module dependencies (without interfaces)
	baseDeps := &interfaces.ModuleDependencies{
		DB:        db,
		Neo4jRepo: neo4jRepo,
		Config:    cfg,
		Registry:  registry,
	}

	// Phase 1: Initialize Assets Module first (no dependencies)
	log.Println("📦 Phase 1: Initializing Assets Module...")
	assetsModule := assets.NewAssetsModule()
	if err := registry.Register(assetsModule); err != nil {
		log.Fatalf("Failed to register Assets module: %v", err)
	}
	if err := assetsModule.Initialize(baseDeps); err != nil {
		log.Fatalf("Failed to initialize Assets module: %v", err)
	}
	log.Println("✅ Assets Module initialized")

	// Phase 2: Initialize Lineage Module (depends on FindingsProvider from Assets)
	log.Println("📦 Phase 2: Initializing Lineage Module...")
	lineageModule := lineage.NewLineageModule()
	if err := registry.Register(lineageModule); err != nil {
		log.Fatalf("Failed to register Lineage module: %v", err)
	}

	// Inject FindingsProvider from Assets Module
	baseDeps.FindingsProvider = assetsModule.GetFindingsService()

	if err := lineageModule.Initialize(baseDeps); err != nil {
		log.Fatalf("Failed to initialize Lineage module: %v", err)
	}
	log.Println("✅ Lineage Module initialized")

	// Phase 3: Inject AssetManager and LineageSync for other modules
	log.Println("📦 Phase 3: Injecting interfaces for remaining modules...")
	baseDeps.AssetManager = assetsModule.GetAssetService()
	baseDeps.LineageSync = lineageModule.GetSemanticLineageService()

	// Phase 4: Initialize remaining modules with full dependencies
	log.Println("📦 Phase 4: Initializing remaining modules...")

	// Initialize WebSocket module first to get the service
	websocketModule := websocket.NewWebSocketModule()
	baseDeps.WebSocketService = websocketModule.GetWebSocketService()

	remainingModules := []interfaces.Module{
		scanning.NewScanningModule(),       // Scanning & Classification
		auth.NewAuthModule(),               // Authentication
		compliance.NewComplianceModule(),   // Compliance Posture
		masking.NewMaskingModule(),         // Data Masking
		analytics.NewAnalyticsModule(),     // Analytics & Heatmaps
		connections.NewConnectionsModule(), // Connections & Orchestration
		remediation.NewRemediationModule(), // Remediation
		fplearning.NewFPlearningModule(),   // Fingerprint Learning
		websocketModule,                    // Real-time WebSocket Communication
	}

	for _, module := range remainingModules {
		if err := registry.Register(module); err != nil {
			log.Fatalf("Failed to register module %s: %v", module.Name(), err)
		}
		if err := module.Initialize(baseDeps); err != nil {
			log.Fatalf("Failed to initialize module %s: %v", module.Name(), err)
		}
		log.Printf("✅ %s Module initialized", module.Name())
	}

	log.Println("\n✅ All modules initialized successfully")
	log.Println(strings.Repeat("=", 70))

	log.Println(strings.Repeat("=", 70))

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

	// Initialize JWT service
	jwtService := service.NewJWTService()

	// Auth middleware
	authMiddleware := func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No token, allow anonymous access for now
			c.Next()
			return
		}

		// Extract Bearer token
		if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
			c.JSON(401, gin.H{"error": "Invalid authorization header"})
			c.Abort()
			return
		}

		token := authHeader[7:]
		claims, err := jwtService.ValidateToken(token)
		if err != nil {
			c.JSON(401, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Set user context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("tenant_id", claims.TenantID)
		c.Next()
	}

	// Health check with detailed status
	router.GET("/health", func(c *gin.Context) {
		// Check database connectivity
		dbHealthy := true
		if err := db.Ping(); err != nil {
			dbHealthy = false
		}

		// Check Neo4j connectivity
		neo4jHealthy := true
		if err := neo4jRepo.GetDriver().VerifyConnectivity(c.Request.Context()); err != nil {
			neo4jHealthy = false
		}

		status := "healthy"
		if !dbHealthy || !neo4jHealthy {
			status = "unhealthy"
		}

		c.JSON(200, gin.H{
			"status":           status,
			"service":          "arc-platform-backend",
			"architecture":     "modular-monolith",
			"modules":          len(registry.GetAll()),
			"database":         gin.H{"healthy": dbHealthy},
			"neo4j":            gin.H{"healthy": neo4jHealthy},
			"temporal_enabled": false,
		})
	})

	// Register all module routes
	log.Println("\n🛣️  Registering Module Routes...")
	log.Println(strings.Repeat("=", 70))

	apiV1 := router.Group("/api/v1", authMiddleware)
	for _, module := range registry.GetAll() {
		module.RegisterRoutes(apiV1)
	}

	log.Println("\n✅ All routes registered")
	log.Println(strings.Repeat("=", 70))

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
		log.Println(strings.Repeat("=", 70))

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("\n🛑 Shutting down server...")

	// TODO: Shutdown Temporal worker

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
