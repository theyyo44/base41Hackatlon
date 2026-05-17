-- Supabase SQL Editor'da çalıştır
CREATE OR REPLACE FUNCTION find_user_by_email(lookup_email text)
RETURNS TABLE(user_id uuid, user_name text, user_email text)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- First try profiles table
  RETURN QUERY
  SELECT p.id, p.full_name, p.email
  FROM profiles p
  WHERE lower(p.email) = lower(lookup_email)
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Fallback: search auth.users and backfill
  RETURN QUERY
  WITH matched_user AS (
    SELECT au.id, au.email
    FROM auth.users au
    WHERE lower(au.email) = lower(lookup_email)
    LIMIT 1
  ),
  backfill AS (
    UPDATE profiles
    SET email = mu.email
    FROM (SELECT id, email FROM matched_user) mu
    WHERE profiles.id = mu.id AND profiles.email IS NULL
  )
  SELECT p.id, p.full_name, mu.email
  FROM matched_user mu
  JOIN profiles p ON p.id = mu.id;
END;
$$;
