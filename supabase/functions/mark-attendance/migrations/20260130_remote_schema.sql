-- 1. Create the profiles table for Roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student'
);

-- 2. Enable Row Level Security (Security best practice)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow users to view their own profile/role
-- (We use DROP first to avoid errors if you run this script multiple times)
DROP POLICY IF EXISTS "View own profile" ON public.profiles;
CREATE POLICY "View own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

-- 4. Trigger: Automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();