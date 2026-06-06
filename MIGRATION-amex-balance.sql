-- Amex Tracker v2 - manual balance reconciliation
-- Already applied to the live project (cvuznuccqquqqramcqzn). Safe + idempotent.
-- Adds two nullable columns so the household can record the *actual* Amex balance
-- read off the Amex app at any time and compare it against tracked cycle spend.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS amex_actual_balance numeric;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS amex_balance_updated_at text;
