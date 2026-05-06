
-- Fix touch_updated_at search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Revoke EXECUTE from public/anon/authenticated on SECURITY DEFINER helpers.
-- RLS policies invoke them as the table owner via the policy expression,
-- so users do not need direct EXECUTE.
REVOKE ALL ON FUNCTION public.users_are_mutually_matched(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_in_match(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Restrict storage listing: only allow owner to list/select their own folder,
-- but also keep public read possible by file path (needed for <img> via public URL).
DROP POLICY IF EXISTS "profile-photos public read" ON storage.objects;

-- Photos are served via public URLs, but we don't want anonymous LIST of all paths.
-- Allow SELECT only when the request includes a specific path the requester owns,
-- OR via the public CDN URL (which doesn't go through RLS). The public bucket
-- already serves files via /object/public/... without auth.
CREATE POLICY "profile-photos owner select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
