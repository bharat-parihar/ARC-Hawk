package connectors

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

// PostgreSQLConnector implements remediation for PostgreSQL databases
type PostgreSQLConnector struct {
	db *sql.DB
}

// Connect establishes connection to PostgreSQL
func (c *PostgreSQLConnector) Connect(ctx context.Context, config map[string]interface{}) error {
	host := config["host"].(string)
	port := config["port"].(int)
	user := config["user"].(string)
	password := config["password"].(string)
	database := config["database"].(string)

	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, database)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("failed to connect to PostgreSQL: %w", err)
	}

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("failed to ping PostgreSQL: %w", err)
	}

	c.db = db
	return nil
}

// Close closes the PostgreSQL connection
func (c *PostgreSQLConnector) Close() error {
	if c.db != nil {
		return c.db.Close()
	}
	return nil
}

// Mask redacts PII in place
func (c *PostgreSQLConnector) Mask(ctx context.Context, location string, fieldName string, recordID string) error {
	query := fmt.Sprintf("UPDATE %s SET %s = 'REDACTED' WHERE id = $1", location, fieldName)
	_, err := c.db.ExecContext(ctx, query, recordID)
	if err != nil {
		return fmt.Errorf("failed to mask PII: %w", err)
	}
	return nil
}

// Delete removes the entire record
func (c *PostgreSQLConnector) Delete(ctx context.Context, location string, recordID string) error {
	query := fmt.Sprintf("DELETE FROM %s WHERE id = $1", location)
	_, err := c.db.ExecContext(ctx, query, recordID)
	if err != nil {
		return fmt.Errorf("failed to delete record: %w", err)
	}
	return nil
}

// Encrypt encrypts PII value
func (c *PostgreSQLConnector) Encrypt(ctx context.Context, location string, fieldName string, recordID string, encryptionKey string) error {
	// Get original value
	originalValue, err := c.GetOriginalValue(ctx, location, fieldName, recordID)
	if err != nil {
		return err
	}

	// Encrypt value (simplified - in production use proper encryption)
	encryptedValue := fmt.Sprintf("ENC:%s", originalValue) // Placeholder

	query := fmt.Sprintf("UPDATE %s SET %s = $1 WHERE id = $2", location, fieldName)
	_, err = c.db.ExecContext(ctx, query, encryptedValue, recordID)
	if err != nil {
		return fmt.Errorf("failed to encrypt PII: %w", err)
	}
	return nil
}

// GetOriginalValue retrieves original value before remediation
func (c *PostgreSQLConnector) GetOriginalValue(ctx context.Context, location string, fieldName string, recordID string) (string, error) {
	query := fmt.Sprintf("SELECT %s FROM %s WHERE id = $1", fieldName, location)

	var value string
	err := c.db.QueryRowContext(ctx, query, recordID).Scan(&value)
	if err != nil {
		return "", fmt.Errorf("failed to get original value: %w", err)
	}

	return value, nil
}

// RestoreValue restores original value (rollback)
func (c *PostgreSQLConnector) RestoreValue(ctx context.Context, location string, fieldName string, recordID string, originalValue string) error {
	query := fmt.Sprintf("UPDATE %s SET %s = $1 WHERE id = $2", location, fieldName)
	_, err := c.db.ExecContext(ctx, query, originalValue, recordID)
	if err != nil {
		return fmt.Errorf("failed to restore value: %w", err)
	}
	return nil
}
