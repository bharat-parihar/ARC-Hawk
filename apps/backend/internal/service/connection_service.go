package service

import (
	"context"
	"fmt"
	"io/ioutil"
	"sync"

	"github.com/arc-platform/backend/internal/domain/entity"
	"github.com/arc-platform/backend/internal/infrastructure/persistence"
	"github.com/google/uuid"
	"gopkg.in/yaml.v3"
)

type ConnectionService struct {
	configPath string
	pgRepo     *persistence.PostgresRepository
	mu         sync.Mutex
}

func NewConnectionService(pgRepo *persistence.PostgresRepository) *ConnectionService {
	// Relative path from apps/backend to apps/scanner/config/connection.yml
	return &ConnectionService{
		configPath: "../scanner/config/connection.yml",
		pgRepo:     pgRepo,
	}
}

type ConnectionConfig struct {
	Sources map[string]map[string]interface{} `yaml:"sources"`
}

// AddConnection appends a new connection configuration to connection.yml
func (s *ConnectionService) AddConnection(sourceType, profileName string, config map[string]interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Read existing file
	data, err := ioutil.ReadFile(s.configPath)
	if err != nil {
		return fmt.Errorf("failed to read config file: %w", err)
	}

	var root ConnectionConfig
	if err := yaml.Unmarshal(data, &root); err != nil {
		return fmt.Errorf("failed to parse yaml: %w", err)
	}

	// Initialize maps if nil
	if root.Sources == nil {
		root.Sources = make(map[string]map[string]interface{})
	}

	if root.Sources[sourceType] == nil {
		root.Sources[sourceType] = make(map[string]interface{})
	}

	// Add new config
	root.Sources[sourceType][profileName] = config

	// Write back to file
	newData, err := yaml.Marshal(&root)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := ioutil.WriteFile(s.configPath, newData, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// GetConnections returns the current connection configuration
func (s *ConnectionService) GetConnections() (*ConnectionConfig, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := ioutil.ReadFile(s.configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var root ConnectionConfig
	if err := yaml.Unmarshal(data, &root); err != nil {
		return nil, fmt.Errorf("failed to parse yaml: %w", err)
	}

	return &root, nil
}

// SyncConnectionsToAssets creates or updates assets in PostgreSQL from connection.yml
func (s *ConnectionService) SyncConnectionsToAssets(ctx context.Context) error {
	// Note: No mutex lock here - caller (scan orchestration) manages its own locking

	config, err := s.GetConnections()
	if err != nil {
		return fmt.Errorf("failed to get connections: %w", err)
	}

	fmt.Printf("🔄 Syncing connections to assets...\n")

	// Process filesystem connections
	if fsConnections, ok := config.Sources["fs"]; ok {
		for profileName, configData := range fsConnections {
			configMap, ok := configData.(map[string]interface{})
			if !ok {
				fmt.Printf("⚠️  Skipping invalid fs config: %s\n", profileName)
				continue
			}

			path, _ := configMap["path"].(string)
			if path == "" {
				fmt.Printf("⚠️  Skipping fs connection without path: %s\n", profileName)
				continue
			}

			// Create stable ID from profile name
			stableID := fmt.Sprintf("fs_%s", profileName)

			// Check if asset exists
			existingAsset, err := s.pgRepo.GetAssetByStableID(ctx, stableID)
			if err == nil && existingAsset != nil {
				fmt.Printf("✅ Asset already exists: %s\n", profileName)
				continue
			}

			// Create new asset
			asset := &entity.Asset{
				ID:           uuid.New(),
				StableID:     stableID,
				Name:         profileName,
				AssetType:    "filesystem",
				Path:         path,
				DataSource:   "local",
				Host:         "localhost",
				Environment:  "production",
				SourceSystem: "filesystem",
			}

			if err := s.pgRepo.CreateAsset(ctx, asset); err != nil {
				fmt.Printf("❌ Failed to create asset %s: %v\n", profileName, err)
				continue
			}

			fmt.Printf("✅ Created asset: %s (path: %s)\n", profileName, path)
		}
	}

	// Process PostgreSQL connections
	if pgConnections, ok := config.Sources["postgresql"]; ok {
		for profileName, configData := range pgConnections {
			configMap, ok := configData.(map[string]interface{})
			if !ok {
				fmt.Printf("⚠️  Skipping invalid postgresql config: %s\n", profileName)
				continue
			}

			host, _ := configMap["host"].(string)
			database, _ := configMap["database"].(string)
			if host == "" || database == "" {
				fmt.Printf("⚠️  Skipping postgresql connection without host/database: %s\n", profileName)
				continue
			}

			// Create stable ID from profile name
			stableID := fmt.Sprintf("pg_%s", profileName)

			// Check if asset exists
			existingAsset, err := s.pgRepo.GetAssetByStableID(ctx, stableID)
			if err == nil && existingAsset != nil {
				fmt.Printf("✅ Asset already exists: %s\n", profileName)
				continue
			}

			// Create new asset
			asset := &entity.Asset{
				ID:           uuid.New(),
				StableID:     stableID,
				Name:         profileName,
				AssetType:    "database",
				Path:         database,
				DataSource:   "postgresql",
				Host:         host,
				Environment:  "production",
				SourceSystem: "postgresql",
			}

			if err := s.pgRepo.CreateAsset(ctx, asset); err != nil {
				fmt.Printf("❌ Failed to create asset %s: %v\n", profileName, err)
				continue
			}

			fmt.Printf("✅ Created asset: %s (host: %s, db: %s)\n", profileName, host, database)
		}
	}

	fmt.Printf("✅ Connection sync complete\n")
	return nil
}
