-- Runs automatically on first container start (empty data volume only).
-- The pgvector/pgvector image ships the extension binary, but it still
-- needs to be enabled per-database.
CREATE EXTENSION IF NOT EXISTS vector;
