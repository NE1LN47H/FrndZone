-- Create function to get nearby profiles with optional search
CREATE OR REPLACE FUNCTION public.get_nearby_profiles(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_km INTEGER,
  search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  distance_km DOUBLE PRECISION
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 AS distance_km
  FROM profiles p
  WHERE 
    p.location IS NOT NULL
    AND p.id != auth.uid()
    AND ST_DWithin(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_km * 1000
    )
    AND (search_term IS NULL OR p.username ILIKE '%' || search_term || '%')
  ORDER BY distance_km;
END;
$$;