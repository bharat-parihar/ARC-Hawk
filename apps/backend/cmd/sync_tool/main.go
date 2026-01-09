package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/arc-platform/backend/internal/infrastructure/database"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/arc-platform/backend/internal/service"
	"github.com/joho/godotenv"
)

func main() {
	// Load env
	if err := godotenv.Load(); err != nil {
		log.Println("Note: No .env file found")
	}

	// Connect to Postgres
	dbConfig := database.NewConfig()
	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	repo := persistence.NewPostgresRepository(db)

	// Connect to Neo4j
	neo4jURI := os.Getenv("NEO4J_URI")
	if neo4jURI == "" {
		neo4jURI = "bolt://127.0.0.1:7687"
	}
	neo4jUser := os.Getenv("NEO4J_USERNAME")
	if neo4jUser == "" {
		neo4jUser = "neo4j"
	}
	neo4jPass := os.Getenv("NEO4J_PASSWORD")
	if neo4jPass == "" {
		neo4jPass = "password123"
	}

	neo4jRepo, err := persistence.NewNeo4jRepository(neo4jURI, neo4jUser, neo4jPass)
	if err != nil {
		log.Fatalf("Failed to connect to Neo4j: %v", err)
	}
	defer neo4jRepo.Close(context.Background())

	// Create service
	svc := service.NewSemanticLineageService(neo4jRepo, repo)

	log.Println("Starting manual sync...")
	start := time.Now()

	// Run sync
	ctx := context.Background()
	if err := svc.SyncLineage(ctx); err != nil {
		log.Fatalf("Sync failed: %v", err)
	}

	log.Printf("Sync finished in %v", time.Since(start))
}
