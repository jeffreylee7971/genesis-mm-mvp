REVOKE EXECUTE ON FUNCTION public.generate_daily_matches(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_daily_matches(uuid) TO authenticated;