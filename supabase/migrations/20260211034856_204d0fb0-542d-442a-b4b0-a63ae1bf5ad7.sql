
-- 1) Remove public SELECT policy
DROP POLICY IF EXISTS "Anyone can read config" ON public.admin_config;

-- 2) Create SECURITY DEFINER RPC for public-safe config
CREATE OR REPLACE FUNCTION public.get_public_config(_keys text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_keys constant text[] := ARRAY['cal_screening_practice', 'cal_interview_training', 'cal_operations_call'];
  result jsonb := '{}';
  rec record;
BEGIN
  FOR rec IN
    SELECT config_key, config_value
    FROM public.admin_config
    WHERE config_key = ANY(
      CASE WHEN _keys IS NULL THEN allowed_keys
      ELSE (SELECT array_agg(k) FROM unnest(_keys) k WHERE k = ANY(allowed_keys))
      END
    )
  LOOP
    result := result || jsonb_build_object(rec.config_key, rec.config_value);
  END LOOP;

  RETURN result;
END;
$$;
