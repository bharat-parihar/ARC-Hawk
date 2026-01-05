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

// PostgresTransaction wraps sql.Tx and provides repository methods
type PostgresTransaction struct {
	tx *sql.Tx
	db *sql.DB
}

// NewPostgresRepository creates a new PostgreSQL repository
func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

// BeginTx starts a new database transaction
func (r *PostgresRepository) BeginTx(ctx context.Context) (*PostgresTransaction, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}

	return &PostgresTransaction{
		tx: tx,
		db: r.db,
	}, nil
}

// Commit commits the transaction
func (t *PostgresTransaction) Commit() error {
	return t.tx.Commit()
}

// Rollback rolls back the transaction
func (t *PostgresTransaction) Rollback() error {
	return t.tx.Rollback()
}

// GetDB returns the underlying database connection (for read-only operations outside transaction)
func (r *PostgresRepository) GetDB() *sql.DB {
	return r.db
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
