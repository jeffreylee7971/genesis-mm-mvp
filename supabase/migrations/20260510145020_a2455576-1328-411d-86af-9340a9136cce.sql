DELETE FROM public.success
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.success
  ORDER BY user_id, marked_matched_at ASC
);

ALTER TABLE public.success
  ADD CONSTRAINT success_user_id_key UNIQUE (user_id);