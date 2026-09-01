-- An invitation is issued to an Auth account before its application profile is
-- provisioned. Keep that relationship accurate so an invitation can safely
-- represent an incomplete, recoverable account.
ALTER TABLE public.employee_invitations
  DROP CONSTRAINT IF EXISTS employee_invitations_invited_uid_fkey;

ALTER TABLE public.employee_invitations
  ADD CONSTRAINT employee_invitations_invited_uid_fkey
  FOREIGN KEY (invited_uid)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
