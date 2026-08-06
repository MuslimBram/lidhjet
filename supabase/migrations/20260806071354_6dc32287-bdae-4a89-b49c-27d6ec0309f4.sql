DROP POLICY IF EXISTS "attachments readable" ON public.attachments;

CREATE POLICY "attachments visible to relevant users"
ON public.attachments
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = attachments.post_id
      AND p.author_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.interests i
    WHERE i.post_id = attachments.post_id
      AND (i.buyer_id = auth.uid() OR i.seller_id = auth.uid())
  )
);