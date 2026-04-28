-- Migration: Drop sync operations and dead letter tables
-- Part of online-first sync removal
-- Date: 2026-04-28

-- Drop dead letter queue first (depends on nothing)
DROP TABLE IF EXISTS sync_dead_letter;

-- Drop sync operations table
DROP TABLE IF EXISTS sync_operations;
