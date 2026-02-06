-- Function to add a user role by email (admin only)
CREATE OR REPLACE FUNCTION public.add_user_role_by_email(_email text, _role app_role)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _new_role_id uuid;
BEGIN
  -- Check if the calling user is an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can add user roles';
  END IF;

  -- Find the user by email in auth.users
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = lower(_email);

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. The user must create an account first.', _email;
  END IF;

  -- Check if user already has this role
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role) THEN
    RAISE EXCEPTION 'User already has the % role', _role;
  END IF;

  -- Insert the new role
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, _role)
  RETURNING id INTO _new_role_id;

  RETURN _new_role_id;
END;
$$;

-- Function to get user emails for user_roles (admin only)
CREATE OR REPLACE FUNCTION public.get_user_roles_with_emails()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  role app_role,
  created_at timestamptz,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the calling user is an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view user roles with emails';
  END IF;

  RETURN QUERY
  SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    ur.created_at,
    au.email::text
  FROM user_roles ur
  LEFT JOIN auth.users au ON ur.user_id = au.id
  ORDER BY ur.created_at DESC;
END;
$$;