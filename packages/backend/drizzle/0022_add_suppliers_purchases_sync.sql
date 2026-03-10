-- Migration: Add sync support for suppliers and purchases tables
-- Adds sync_status and sync_attempts columns for TanStack DB / ElectricSQL

-- Suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS sync_attempts INTEGER DEFAULT 0;

-- Purchases table
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS sync_attempts INTEGER DEFAULT 0;

-- Purchase items table
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS sync_attempts INTEGER DEFAULT 0;

-- Add REPLICA IDENTITY FULL for ElectricSQL sync
ALTER TABLE suppliers REPLICA IDENTITY FULL;
ALTER TABLE purchases REPLICA IDENTITY FULL;
ALTER TABLE purchase_items REPLICA IDENTITY FULL;
