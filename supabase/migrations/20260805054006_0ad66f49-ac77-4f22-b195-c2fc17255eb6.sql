CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE other uuid;
BEGIN
  SELECT CASE WHEN i.buyer_id = NEW.sender_id THEN i.seller_id ELSE i.buyer_id END
    INTO other FROM public.interests i WHERE i.id = NEW.interest_id;
  IF other IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, kind, title, body)
    VALUES (other, 'message', 'Mesazh i re në bisedë', left(NEW.body, 120));
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM anon, authenticated;
CREATE TRIGGER interest_messages_notify AFTER INSERT ON public.interest_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();