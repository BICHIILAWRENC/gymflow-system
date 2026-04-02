
-- Allow all authenticated users to view trainers (so members can select a trainer when booking)
CREATE POLICY "Authenticated users can view trainers" ON public.trainers FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to view trainer profiles
CREATE POLICY "Authenticated users can view profiles for trainers" ON public.profiles FOR SELECT TO authenticated USING (
  user_id IN (SELECT user_id FROM public.trainers)
);
