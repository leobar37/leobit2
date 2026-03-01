ALTER TABLE "closings"
ADD COLUMN IF NOT EXISTS "backdate_reason" text;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, seller_id, closing_date
      ORDER BY created_at DESC, id DESC
    ) AS row_num
  FROM closings
)
DELETE FROM closings
USING ranked
WHERE closings.id = ranked.id
  AND ranked.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_closings_business_seller_date"
ON "closings" USING btree ("business_id", "seller_id", "closing_date");
