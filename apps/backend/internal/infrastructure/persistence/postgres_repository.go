package persistence

import (
	"context"
	"database/sql"
	"fmt"
)

// PostgresRepository implements all repository interfaces
type PostgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository creates a new PostgreSQL repository
func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// MigrateSchema updates the database schema with new columns
func (r *PostgresRepository) MigrateSchema(ctx context.Context) error {
	queries := []string{
		"ALTER TABLE assets ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT ''",
		"ALTER TABLE assets ADD COLUMN IF NOT EXISTS owner TEXT DEFAULT ''",
		"ALTER TABLE assets ADD COLUMN IF NOT EXISTS source_system TEXT DEFAULT ''",
	}
	for _, q := range queries {
		if _, err := r.db.ExecContext(ctx, q); err != nil {
			return fmt.Errorf("migration failed: %s: %w", q, err)
		}
	}
	return nil
}
