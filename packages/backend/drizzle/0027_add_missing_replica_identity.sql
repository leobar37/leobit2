-- Migration: Add REPLICA IDENTITY FULL for missing tables
-- This allows ElectricSQL to capture all column changes for these tables
-- Required for tags, customer_tags, inventory, and variant_inventory sync

ALTER TABLE tags REPLICA IDENTITY FULL;
ALTER TABLE customer_tags REPLICA IDENTITY FULL;
ALTER TABLE inventory REPLICA IDENTITY FULL;
ALTER TABLE variant_inventory REPLICA IDENTITY FULL;
