-- Amex Tracker v2 - bucket restructure migration
-- Run this ONCE in the Supabase SQL editor after deploying the new build.
-- It moves your existing transactions into the new bucket structure.

-- 1. Add the wine_monthly setting column if it does not exist
ALTER TABLE settings ADD COLUMN IF NOT EXISTS wine_monthly numeric DEFAULT 250;

-- 2. Bump the bills cap and set the wine cap on the main settings row
UPDATE settings
SET bills_monthly = 1500,
    wine_monthly = 250
WHERE id = 'main';

-- 3. Move all WINE transactions into the new dedicated wine bucket.
--    (They were previously category 'wine' inside the splurge or daily bucket.)
UPDATE transactions
SET bucket = 'wine',
    category = CASE
      WHEN lower(note) LIKE '%vinomofo%' OR lower(note) LIKE '%langton%' OR lower(note) LIKE '%delivery%' THEN 'wine_delivery'
      ELSE 'wine_shop'
    END
WHERE category = 'wine'
   OR lower(note) LIKE '%vinomofo%'
   OR lower(note) LIKE '%langtons%'
   OR lower(note) LIKE '%barrique%'
   OR lower(note) LIKE '%liquorland%'
   OR lower(note) LIKE '%dan murphy%'
   OR lower(note) LIKE '%bws%'
   OR lower(note) LIKE '%black gold%';

-- 4. Move all FUEL transactions into the bills bucket (fuel is now a fixed monthly cost).
UPDATE transactions
SET bucket = 'bill',
    category = 'fuel'
WHERE category = 'fuel'
   OR lower(note) LIKE '%ampol%'
   OR lower(note) LIKE '%bp %'
   OR lower(note) LIKE '%shell%'
   OR lower(note) LIKE '%7-eleven%'
   OR lower(note) LIKE '%united petroleum%'
   OR lower(note) LIKE '%calder freeway svc%';

-- 5. Optional sanity check - see your new bucket totals for the current month
SELECT bucket, COUNT(*) AS count, ROUND(SUM(amount)::numeric, 2) AS total
FROM transactions
WHERE created_at >= date_trunc('month', now())
GROUP BY bucket
ORDER BY total DESC;
