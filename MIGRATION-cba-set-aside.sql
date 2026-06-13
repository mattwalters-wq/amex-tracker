-- Amex Tracker v2 - CBA set-aside (home screen coverage)
-- Already applied to the live project (cvuznuccqquqqramcqzn). Safe + idempotent.
-- The amount the household has set aside in their Commonwealth (CBA) account to
-- pay the Amex bill off in full when it falls due. Editable inline on the home
-- screen; the coverage line compares it against the projected bill (logged spend).

ALTER TABLE settings ADD COLUMN IF NOT EXISTS cba_set_aside numeric DEFAULT 4600;
