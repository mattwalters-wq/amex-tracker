-- Amex Tracker v2 - safe-to-spend ceiling per cycle
-- Already applied to the live project (cvuznuccqquqqramcqzn). Safe + idempotent.
-- The most the household should charge on the Amex in one statement cycle and
-- still pay it off in full. Default ~$4,000, derived from income minus fixed
-- commitments minus a savings buffer. Editable in Settings.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS amex_cycle_target numeric DEFAULT 4000;
