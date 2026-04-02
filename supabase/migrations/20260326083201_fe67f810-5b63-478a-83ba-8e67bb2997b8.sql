
-- Allow admins to delete members
CREATE POLICY "Admins can delete members"
ON public.members FOR DELETE TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage payments (update/delete)
CREATE POLICY "Admins can manage payments"
ON public.payments FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage sessions (delete)
CREATE POLICY "Admins can manage sessions"
ON public.sessions FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE TO public
USING (has_role(auth.uid(), 'admin'::app_role));
