
-- ============ ENUMS ============
CREATE TYPE family_timeline AS ENUM ('within_1_year','1_to_2_years','2_to_4_years','open_but_serious');
CREATE TYPE relationship_structure AS ENUM ('traditional_marriage','open_to_alternatives','either');
CREATE TYPE match_status AS ENUM ('pending','mutual','connected','passed');

-- ============ USERS META ============
CREATE TABLE public.users_meta (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  age INT,
  city TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  x_connected BOOLEAN NOT NULL DEFAULT false,
  x_handle TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT age_range CHECK (age IS NULL OR (age >= 25 AND age <= 55))
);

ALTER TABLE public.users_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_meta self select" ON public.users_meta
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_meta self insert" ON public.users_meta
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_meta self update" ON public.users_meta
  FOR UPDATE USING (auth.uid() = id);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_timeline family_timeline,
  children_current INT DEFAULT 0,
  children_wanted INT,
  open_to_existing_children TEXT, -- 'yes' | 'no' | 'open'
  parenting_philosophy JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifestyle JSONB NOT NULL DEFAULT '{}'::jsonb,
  relationship_structure relationship_structure,
  attachment_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  open_text_sunday TEXT,
  open_text_parenting TEXT,
  open_text_future TEXT,
  bio TEXT,
  semantic_scores JSONB,
  x_readiness_signal INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles self select" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles self insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles self update" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============ MATCHES ============
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status match_status NOT NULL DEFAULT 'pending',
  initiator UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  compatibility_score INT,
  compatibility_narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT distinct_users CHECK (user_id_1 <> user_id_2),
  CONSTRAINT unique_pair UNIQUE (user_id_1, user_id_2)
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches participant select" ON public.matches
  FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "matches participant insert" ON public.matches
  FOR INSERT WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "matches participant update" ON public.matches
  FOR UPDATE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Security definer helpers for cross-user reads on mutual matches
CREATE OR REPLACE FUNCTION public.users_are_mutually_matched(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE status IN ('mutual','connected')
      AND ((user_id_1 = _a AND user_id_2 = _b) OR (user_id_1 = _b AND user_id_2 = _a))
  );
$$;

-- Allow viewing other users' meta + profile if mutually matched
CREATE POLICY "users_meta matched select" ON public.users_meta
  FOR SELECT USING (public.users_are_mutually_matched(auth.uid(), id));
CREATE POLICY "profiles matched select" ON public.profiles
  FOR SELECT USING (public.users_are_mutually_matched(auth.uid(), user_id));

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_in_match(_match UUID, _user UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = _match AND (user_id_1 = _user OR user_id_2 = _user)
      AND status IN ('mutual','connected')
  );
$$;

CREATE POLICY "messages participant select" ON public.messages
  FOR SELECT USING (public.user_in_match(match_id, auth.uid()));
CREATE POLICY "messages participant insert" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id AND public.user_in_match(match_id, auth.uid()));

-- ============ CONVERSATION STARTERS ============
CREATE TABLE public.conversation_starters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  starters TEXT[] NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_starters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "starters participant select" ON public.conversation_starters
  FOR SELECT USING (public.user_in_match(match_id, auth.uid()));
CREATE POLICY "starters participant insert" ON public.conversation_starters
  FOR INSERT WITH CHECK (public.user_in_match(match_id, auth.uid()));

-- ============ SUCCESS ============
CREATE TABLE public.success (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marked_matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_paid BOOLEAN NOT NULL DEFAULT false,
  partner_found TEXT
);

ALTER TABLE public.success ENABLE ROW LEVEL SECURITY;

CREATE POLICY "success self select" ON public.success
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "success self insert" ON public.success
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_users_meta_updated BEFORE UPDATE ON public.users_meta
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_matches_updated BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create users_meta + profiles row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users_meta (id, name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name',''));
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE BUCKET FOR PHOTOS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos','profile-photos', true);

CREATE POLICY "profile-photos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');
CREATE POLICY "profile-photos owner insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "profile-photos owner update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "profile-photos owner delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
