-- Add gender + seeking to users_meta and update generate_daily_matches to filter on them.

CREATE TYPE public.gender AS ENUM ('woman', 'man');
CREATE TYPE public.seeking AS ENUM ('men', 'women', 'everyone');

ALTER TABLE public.users_meta
  ADD COLUMN gender public.gender,
  ADD COLUMN seeking public.seeking;

CREATE OR REPLACE FUNCTION public.generate_daily_matches(_viewer uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_meta public.users_meta%ROWTYPE;
  v_inserted int := 0;
BEGIN
  IF _viewer IS NULL OR _viewer <> auth.uid() THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.daily_matches
    WHERE viewer_id = _viewer AND match_date = current_date
  ) THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_meta FROM public.users_meta WHERE id = _viewer;
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = _viewer;

  IF v_meta IS NULL OR NOT v_meta.onboarding_complete THEN
    RETURN 0;
  END IF;

  WITH scored AS (
    SELECT
      cm.id AS candidate_id,
      (
        CASE WHEN cp.family_timeline = v_profile.family_timeline THEN 25 ELSE 10 END
        + COALESCE((
            SELECT (COUNT(*) FILTER (WHERE cp.parenting_philosophy->>vp.key = vp.value))::numeric
                   * 30 / NULLIF((SELECT count(*) FROM jsonb_object_keys(v_profile.parenting_philosophy)), 0)
            FROM jsonb_each_text(v_profile.parenting_philosophy) AS vp(key, value)
          ), 0)
        + COALESCE((
            SELECT (COUNT(*) FILTER (WHERE cp.lifestyle->>vl.key = vl.value))::numeric
                   * 25 / NULLIF((SELECT count(*) FROM jsonb_object_keys(v_profile.lifestyle)), 0)
            FROM jsonb_each_text(v_profile.lifestyle) AS vl(key, value)
          ), 0)
        + CASE WHEN cp.relationship_structure = v_profile.relationship_structure THEN 10 ELSE 0 END
        + CASE
            WHEN cp.children_wanted IS NOT NULL AND v_profile.children_wanted IS NOT NULL
            THEN GREATEST(0, 10 - ABS(cp.children_wanted - v_profile.children_wanted) * 3)
            ELSE 0
          END
      )::int AS score,
      CASE
        WHEN cp.family_timeline = v_profile.family_timeline
          THEN 'Aligned on family timeline'
        WHEN cp.children_wanted IS NOT NULL AND cp.children_wanted = v_profile.children_wanted
          THEN 'Both want ' || cp.children_wanted || CASE WHEN cp.children_wanted = 1 THEN ' child' ELSE ' children' END
        WHEN cp.relationship_structure = v_profile.relationship_structure
          THEN 'Aligned on relationship structure'
        WHEN cp.parenting_philosophy->>'faith' IS NOT NULL
             AND cp.parenting_philosophy->>'faith' = v_profile.parenting_philosophy->>'faith'
          THEN 'Shared view on faith in family life'
        ELSE 'Shared values worth exploring'
      END AS highlight
    FROM public.users_meta cm
    JOIN public.profiles cp ON cp.user_id = cm.id
    WHERE cm.id <> _viewer
      AND cm.onboarding_complete = true
      AND cm.paused = false
      -- Gender x seeking constraint (both directions). NULL gender/seeking on either side excludes the candidate.
      AND v_meta.gender IS NOT NULL AND v_meta.seeking IS NOT NULL
      AND cm.gender IS NOT NULL AND cm.seeking IS NOT NULL
      AND (
        v_meta.seeking = 'everyone'
        OR (v_meta.seeking = 'women' AND cm.gender = 'woman')
        OR (v_meta.seeking = 'men'   AND cm.gender = 'man')
      )
      AND (
        cm.seeking = 'everyone'
        OR (cm.seeking = 'women' AND v_meta.gender = 'woman')
        OR (cm.seeking = 'men'   AND v_meta.gender = 'man')
      )
      AND NOT (v_profile.open_to_existing_children = 'no' AND COALESCE(cp.children_current, 0) > 0)
      AND NOT (cp.open_to_existing_children = 'no' AND COALESCE(v_profile.children_current, 0) > 0)
      AND NOT EXISTS (
        SELECT 1 FROM public.matches m
        WHERE (m.user_id_1 = _viewer AND m.user_id_2 = cm.id)
           OR (m.user_id_1 = cm.id  AND m.user_id_2 = _viewer)
      )
  )
  INSERT INTO public.daily_matches (viewer_id, candidate_id, compatibility_score, highlight)
  SELECT _viewer, candidate_id, score, highlight
  FROM scored
  ORDER BY score DESC
  LIMIT 5;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$;