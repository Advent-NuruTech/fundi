-- Employee compensation is optional. A missing salary must remain NULL rather
-- than being silently converted to KES 0 with a default pay period.

ALTER TABLE profiles
  ALTER COLUMN pay_rate DROP NOT NULL,
  ALTER COLUMN pay_rate DROP DEFAULT,
  ALTER COLUMN pay_period DROP NOT NULL,
  ALTER COLUMN pay_period DROP DEFAULT;

ALTER TABLE business_members
  ALTER COLUMN pay_rate DROP NOT NULL,
  ALTER COLUMN pay_rate DROP DEFAULT,
  ALTER COLUMN pay_period DROP NOT NULL,
  ALTER COLUMN pay_period DROP DEFAULT;
