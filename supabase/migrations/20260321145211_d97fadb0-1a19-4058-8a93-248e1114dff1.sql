
-- Allow authenticated users to insert their own role
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to create their own member record
CREATE POLICY "Users can insert own member record" ON public.members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to create their own trainer record
CREATE POLICY "Users can insert own trainer record" ON public.trainers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
