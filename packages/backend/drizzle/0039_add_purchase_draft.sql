-- Add draft status to purchase_status enum
ALTER TYPE purchase_status ADD VALUE IF NOT EXISTS 'draft';

-- Make supplier_id nullable for drafts
ALTER TABLE purchases ALTER COLUMN supplier_id DROP NOT NULL;

-- Make purchase_date nullable for drafts
ALTER TABLE purchases ALTER COLUMN purchase_date DROP NOT NULL;

-- Change default status to draft
ALTER TABLE purchases ALTER COLUMN status SET DEFAULT 'draft';
