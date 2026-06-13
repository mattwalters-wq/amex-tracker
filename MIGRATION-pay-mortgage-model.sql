-- Amex Tracker v2 - pay and mortgage model for forward-looking coverage
-- Already applied to the live project (cvuznuccqquqqramcqzn). Safe + idempotent.
-- Coverage on the home screen projects to the payment due date instead of
-- freezing on today: incoming fortnightly pays land before the bill is due and
-- the weekly mortgage leaves CBA. Fields are editable in Settings.
--   projectedAvailable = setAsideNow + incomingPays - mortgageOut
--   coverage           = projectedAvailable - projectedBill
-- Anchors are ISO dates (yyyy-mm-dd) of a known pay; pays repeat fortnightly.
-- mortgage_weekday is a JS weekday (0=Sun .. 6=Sat); Thursday = 4.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS matt_pay numeric DEFAULT 2824.61;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS matt_pay_anchor text DEFAULT '2026-06-11';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS liz_pay numeric DEFAULT 1600;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS liz_pay_anchor text DEFAULT '2026-06-18';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS mortgage_weekly numeric DEFAULT 895;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS mortgage_weekday numeric DEFAULT 4;
