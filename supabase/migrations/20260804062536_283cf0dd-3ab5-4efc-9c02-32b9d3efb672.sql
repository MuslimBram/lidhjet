-- ROLES
CREATE TYPE public.app_role AS ENUM ('owner','admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner','admin'))
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "staff manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  offer_type text NOT NULL DEFAULT 'tjeter',
  phone text,
  email text,
  verification_status text NOT NULL DEFAULT 'pending',
  ai_risk_score integer NOT NULL DEFAULT 0,
  ai_notes text,
  approved_at timestamptz,
  review_ends_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  notifications_enabled boolean NOT NULL DEFAULT true,
  notification_mode text NOT NULL DEFAULT 'normal',
  suspended_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile readable" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_staff(auth.uid()));

-- Public-safe view: vetem emri i plote per te tjeret
CREATE VIEW public.public_profiles
WITH (security_invoker = off) AS
  SELECT id, full_name, offer_type, created_at FROM public.profiles;
GRANT SELECT ON public.public_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.email,
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- POSTS
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'tjeter',
  offer_type text NOT NULL DEFAULT 'tjeter',
  price numeric NOT NULL DEFAULT 0,
  service_tax numeric NOT NULL DEFAULT 0,
  price_justification text,
  status text NOT NULL DEFAULT 'approved',
  sales integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved posts readable" ON public.posts FOR SELECT TO authenticated
  USING (status = 'approved' OR author_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own posts insert" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "own posts update" ON public.posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (author_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own posts delete" ON public.posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_staff(auth.uid()));

-- kufizim: 1 postim / 24 ore + pezullim
CREATE OR REPLACE FUNCTION public.enforce_post_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE susp timestamptz; last_at timestamptz;
BEGIN
  SELECT suspended_until INTO susp FROM public.profiles WHERE id = NEW.author_id;
  IF susp IS NOT NULL AND susp > now() THEN
    RAISE EXCEPTION 'Llogaria është pezulluar deri më %', susp;
  END IF;
  SELECT max(created_at) INTO last_at FROM public.posts WHERE author_id = NEW.author_id;
  IF last_at IS NOT NULL AND last_at > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Mund të postoni vetëm një herë në 24 orë';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER posts_rules BEFORE INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.enforce_post_rules();

-- COMMENTS
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments readable" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "own comments insert" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "own comments delete" ON public.comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_comment_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE susp timestamptz; cnt integer;
BEGIN
  SELECT suspended_until INTO susp FROM public.profiles WHERE id = NEW.author_id;
  IF susp IS NOT NULL AND susp > now() THEN
    RAISE EXCEPTION 'Llogaria është pezulluar deri më %', susp;
  END IF;
  SELECT count(*) INTO cnt FROM public.comments WHERE post_id = NEW.post_id AND author_id = NEW.author_id;
  IF cnt >= 2 THEN
    RAISE EXCEPTION 'Maksimumi 2 komente për postim';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER comments_rules BEFORE INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_rules();

-- RATINGS
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings readable" ON public.ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "own rating insert" ON public.ratings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND stars BETWEEN 1 AND 5);
CREATE POLICY "own rating update" ON public.ratings FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND stars BETWEEN 1 AND 5);

-- VIOLATIONS
CREATE TABLE public.violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.violations TO authenticated;
GRANT ALL ON public.violations TO service_role;
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own violations readable" ON public.violations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own violations insert" ON public.violations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.apply_suspension()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cnt integer;
BEGIN
  SELECT count(*) INTO cnt FROM public.violations WHERE user_id = NEW.user_id;
  IF cnt >= 3 THEN
    UPDATE public.profiles
      SET suspended_until = GREATEST(COALESCE(suspended_until, now()), now() + interval '7 days')
      WHERE id = NEW.user_id;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER violations_suspend AFTER INSERT ON public.violations
FOR EACH ROW EXECUTE FUNCTION public.apply_suspension();

-- ATTACHMENTS
CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  scan_verdict text NOT NULL DEFAULT 'pending',
  scan_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.attachments TO authenticated;
GRANT ALL ON public.attachments TO service_role;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attachments readable" ON public.attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "own attachments insert" ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "own attachments delete" ON public.attachments FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER posts_touch BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX posts_created_idx ON public.posts (created_at DESC);
CREATE INDEX comments_post_idx ON public.comments (post_id);
CREATE INDEX ratings_post_idx ON public.ratings (post_id);