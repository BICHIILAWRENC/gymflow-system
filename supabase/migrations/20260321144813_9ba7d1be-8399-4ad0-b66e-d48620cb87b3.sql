
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'trainer', 'member');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_expiry DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trainers table
CREATE TABLE public.trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  specialization TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  sauna BOOLEAN NOT NULL DEFAULT false,
  sauna_duration INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_duration CHECK (
    (end_time - start_time) >= INTERVAL '45 minutes' AND
    (end_time - start_time) <= INTERVAL '2 hours'
  ),
  CONSTRAINT valid_sauna_duration CHECK (
    (sauna = false AND sauna_duration = 0) OR
    (sauna = true AND sauna_duration BETWEEN 10 AND 15)
  )
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  months INT NOT NULL CHECK (months > 0),
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa', 'card')),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Members policies
CREATE POLICY "Members can view own data" ON public.members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Members can update own data" ON public.members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all members" ON public.members FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage members" ON public.members FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trainers policies
CREATE POLICY "Trainers can view own data" ON public.trainers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trainers" ON public.trainers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage trainers" ON public.trainers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Sessions policies
CREATE POLICY "Members can view own sessions" ON public.sessions FOR SELECT
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can create sessions" ON public.sessions FOR INSERT
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Trainers can view own sessions" ON public.sessions FOR SELECT
  USING (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));
CREATE POLICY "Trainers can update own sessions" ON public.sessions FOR UPDATE
  USING (trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all sessions" ON public.sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Payments policies
CREATE POLICY "Members can view own payments" ON public.payments FOR SELECT
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Members can create payments" ON public.payments FOR INSERT
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update membership expiry after payment
CREATE OR REPLACE FUNCTION public.update_membership_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_expiry DATE;
  base_date DATE;
BEGIN
  SELECT membership_expiry INTO current_expiry FROM public.members WHERE id = NEW.member_id;
  IF current_expiry IS NULL OR current_expiry < CURRENT_DATE THEN
    base_date := CURRENT_DATE;
  ELSE
    base_date := current_expiry;
  END IF;
  UPDATE public.members SET membership_expiry = base_date + (NEW.months * INTERVAL '1 month')
  WHERE id = NEW.member_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_created
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_membership_expiry();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
