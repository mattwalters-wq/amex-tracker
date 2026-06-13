-- Amex Tracker v2 - per-payday commitments for coverage
-- Already applied to the live project (cvuznuccqquqqramcqzn). Safe + idempotent.
-- Each payday sweeps committed money out of CBA (mortgage, bills, savings), so
-- only the net is available for the Amex. Replaces the flat weekly mortgage
-- model. Per pay event in the window (after today, on or before due):
--   net = pay - mortgage - bills - savings
--   projectedAvailable = setAsideNow + sum(net)
-- The savings sweep is discretionary and can be excluded via a Settings toggle.
-- (The earlier mortgage_weekly / mortgage_weekday columns are now unused.)

ALTER TABLE settings ADD COLUMN IF NOT EXISTS matt_mortgage numeric DEFAULT 1160;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS matt_bills numeric DEFAULT 650;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS matt_savings numeric DEFAULT 300;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS liz_mortgage numeric DEFAULT 580;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS liz_bills numeric DEFAULT 320;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS liz_savings numeric DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS include_savings_sweep boolean DEFAULT true;
