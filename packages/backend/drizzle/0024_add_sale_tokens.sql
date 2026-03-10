-- Migration: Add sale_tokens table for sharing sales with customers
-- This replaces order_tokens for the unified sales system

-- Create sale_tokens table
CREATE TABLE IF NOT EXISTS sale_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    token VARCHAR(12) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP,
    CONSTRAINT unique_sale_token UNIQUE (sale_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sale_tokens_token ON sale_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sale_tokens_sale_id ON sale_tokens(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_tokens_is_active ON sale_tokens(is_active);

-- Add REPLICA IDENTITY FULL for ElectricSQL sync
ALTER TABLE sale_tokens REPLICA IDENTITY FULL;

-- Add comment
COMMENT ON TABLE sale_tokens IS 'Tokens for sharing sales with customers via public URLs';
