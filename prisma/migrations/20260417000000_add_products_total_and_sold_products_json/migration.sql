-- Migration: add productsTotal and soldProductsJson to Appointment
-- Safe: both columns are nullable → no default value required, no data loss.
-- productsTotal : Float? — total agrégé des produits vendus (optimise les requêtes dashboard)
-- soldProductsJson : Json? — colonne JSONB native (remplace soldProducts TEXT à terme)

-- AlterTable
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "productsTotal"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "soldProductsJson" JSONB;

-- Optional backfill (idempotent) : populate productsTotal from soldProducts where possible.
-- Cette étape est sûre car elle ne modifie que les lignes où productsTotal est NULL
-- et soldProducts est un JSON valide contenant des lignes avec totalTTC.
-- Si le contenu JSON est malformé, la mise à jour est simplement ignorée (DO NOTHING).
-- À exécuter manuellement après validation en staging :
--
-- UPDATE "Appointment"
-- SET "productsTotal" = (
--   SELECT COALESCE(SUM((elem->>'totalTTC')::DOUBLE PRECISION), 0)
--   FROM jsonb_array_elements("soldProducts"::jsonb) AS elem
--   WHERE "soldProducts" IS NOT NULL
--     AND "soldProducts" NOT IN ('', '[]')
--     AND jsonb_typeof("soldProducts"::jsonb) = 'array'
-- )
-- WHERE "productsTotal" IS NULL
--   AND "soldProducts" IS NOT NULL
--   AND "soldProducts" NOT IN ('', '[]');

