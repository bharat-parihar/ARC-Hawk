package service

import (
	"fmt"
	"io/ioutil"
	"sync"

	"gopkg.in/yaml.v3"
)

type ConnectionService struct {
	configPath string
	mu         sync.Mutex
}

func NewConnectionService() *ConnectionService {
	// Relative path from apps/backend to apps/scanner/config/connection.yml
	return &ConnectionService{
		configPath: "../scanner/config/connection.yml",
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
