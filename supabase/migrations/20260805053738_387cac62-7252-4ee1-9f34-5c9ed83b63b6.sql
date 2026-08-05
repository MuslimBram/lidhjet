-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications readable" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- INTERESTS
CREATE TABLE public.interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_price numeric,
  note text,
  status text NOT NULL DEFAULT 'open',
  tax_amount numeric NOT NULL DEFAULT 0,
  tax_paid boolean NOT NULL DEFAULT false,
  tax_paid_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, buyer_id)
);
GRANT SELECT, INSERT, UPDATE ON public.interests TO authenticated;
GRANT ALL ON public.interests TO service_role;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read interests" ON public.interests
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "buyer creates interest" ON public.interests
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid() AND seller_id <> auth.uid());
CREATE POLICY "participants update interest" ON public.interests
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid())
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE TRIGGER interests_touch BEFORE UPDATE ON public.interests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- MESSAGES
CREATE TABLE public.interest_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id uuid NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.interest_messages TO authenticated;
GRANT ALL ON public.interest_messages TO service_role;
ALTER TABLE public.interest_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read messages" ON public.interest_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.interests i
    WHERE i.id = interest_id AND (i.buyer_id = auth.uid() OR i.seller_id = auth.uid())
  ));
CREATE POLICY "participants send messages" ON public.interest_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.interests i
    WHERE i.id = interest_id
      AND (i.buyer_id = auth.uid() OR i.seller_id = auth.uid())
      AND i.tax_paid = true
      AND i.status IN ('open','chat')
  ));

-- Notify seller on new interest
CREATE OR REPLACE FUNCTION public.notify_new_interest()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body)
  VALUES (
    NEW.seller_id, 'interest', 'Interes i re për ofertën tuaj',
    CASE WHEN NEW.offer_price IS NOT NULL
      THEN 'Kërkesë për ulje: ' || NEW.offer_price::text || ' L'
      ELSE 'Një anëtar shprehu interes. Paguani taksën e shërbimit për të hapur bisedën.' END
  );
  RETURN NEW;
END; $$;
CREATE TRIGGER interests_notify AFTER INSERT ON public.interests
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_interest();

-- Notify buyer when chat opens (tax paid)
CREATE OR REPLACE FUNCTION public.notify_chat_open()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tax_paid = true AND COALESCE(OLD.tax_paid, false) = false THEN
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (NEW.buyer_id, 'chat', 'Biseda është hapur',
            'Shitësi hapi bisedën për ofertën. Biseda mbyllet automatikisht pas 24 orësh.');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER interests_notify_chat AFTER UPDATE ON public.interests
  FOR EACH ROW EXECUTE FUNCTION public.notify_chat_open();

-- 24h expiry job
CREATE OR REPLACE FUNCTION public.expire_stale_records()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN
    UPDATE public.interests SET status = 'expired'
    WHERE status IN ('open','chat') AND expires_at <= now()
    RETURNING buyer_id, seller_id
  LOOP
    INSERT INTO public.notifications (user_id, kind, title, body) VALUES
      (r.buyer_id, 'expiry', 'Interesi skadoi', 'Dritarja 24-orëshe përfundoi dhe biseda u mbyll.'),
      (r.seller_id, 'expiry', 'Interesi skadoi', 'Dritarja 24-orëshe përfundoi dhe biseda u mbyll.');
  END LOOP;

  FOR r IN
    UPDATE public.profiles SET verification_status = 'expired'
    WHERE verification_status IN ('pending','review') AND review_ends_at <= now()
    RETURNING id
  LOOP
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (r.id, 'review', 'Dritarja 24-orëshe skadoi',
            'Verifikimi i llogarisë nuk u përfundua brenda 24 orëve. Kontaktoni administratën.');
  END LOOP;
END; $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('expire-stale-records', '0 * * * *', $$SELECT public.expire_stale_records();$$);