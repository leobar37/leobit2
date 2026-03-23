-- Migration: Fix missing draft value in purchase_status enum
-- The Neon database was seeded/created without the 'draft' value
-- that was supposed to be added by migration 0039

ALTER TYPE purchase_status ADD VALUE IF NOT EXISTS 'draft';
