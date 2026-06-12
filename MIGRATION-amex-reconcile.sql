-- Amex Tracker v2 - proper balance reconciliation
-- Safe + idempotent.
-- The actual Amex balance = cycle-start balance + new charges - payments, so a
-- single tracked-vs-balance diff can't show tracking accuracy. These columns
-- record the balance owed when the cycle began and payments made since, letting
-- the dashboard compute implied untracked spend:
--   untracked = actual - (start + tracked - payments)
-- amex_cycle_key holds the yyyy-mm-dd cycle start the snapshot belongs to, so a
-- stale snapshot is ignored once a new cycle begins.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS amex_cycle_start_balance numeric;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS amex_payments_cycle numeric DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS amex_cycle_key text;
