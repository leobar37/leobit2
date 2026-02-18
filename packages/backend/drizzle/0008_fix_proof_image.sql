ALTER TABLE "abonos" DROP COLUMN IF EXISTS "proof_image_url";
ALTER TABLE "abonos" ADD COLUMN "proof_image_id" uuid;
ALTER TABLE "abonos" ADD COLUMN "reference_number" varchar(50);
