/*
  # Create user profile on signup

  The browser can fail the direct `user_profiles` insert when the new session is
  not available yet. Creating the profile from an auth.users trigger keeps RLS
  strict while making sign up reliable.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'name', ''), split_part(NEW.email, '@', 1), ''),
    CASE
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('senior', 'worker')
        THEN NEW.raw_user_meta_data ->> 'role'
      ELSE 'senior'
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_create_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_create_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

INSERT INTO public.user_profiles (id, name, role)
SELECT
  auth.users.id,
  COALESCE(NULLIF(auth.users.raw_user_meta_data ->> 'name', ''), split_part(auth.users.email, '@', 1), ''),
  CASE
    WHEN auth.users.raw_user_meta_data ->> 'role' IN ('senior', 'worker')
      THEN auth.users.raw_user_meta_data ->> 'role'
    ELSE 'senior'
  END
FROM auth.users
ON CONFLICT (id) DO NOTHING;
