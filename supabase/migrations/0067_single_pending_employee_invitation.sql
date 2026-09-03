-- Keep exactly one usable employee invitation per email and business. Older
-- attempts stay in history as revoked records, but can no longer be accepted.
-- Historical rows do not need to retain a plaintext credential after they
-- have been accepted or revoked.
UPDATE public.employee_invitations
SET temporary_password =
  CASE
    WHEN status = 'accepted' THEN 'USED-' || gen_random_uuid()::text
    ELSE 'REVOKED-' || gen_random_uuid()::text
  END
WHERE status IN ('accepted', 'revoked');

WITH ranked_pending AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY business_id, lower(email)
      ORDER BY created_at DESC, id DESC
    ) AS invitation_rank
  FROM public.employee_invitations
  WHERE status = 'pending'
)
UPDATE public.employee_invitations AS invitation
SET
  status = 'revoked',
  temporary_password = 'REVOKED-' || gen_random_uuid()::text
FROM ranked_pending
WHERE invitation.id = ranked_pending.id
  AND ranked_pending.invitation_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS employee_invitations_one_pending_email_per_business
  ON public.employee_invitations (business_id, lower(email))
  WHERE status = 'pending';
