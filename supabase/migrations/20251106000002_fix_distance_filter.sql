-- Fix get_nearby_posts to also filter by calculated distance_km for precision
CREATE OR REPLACE FUNCTION public.get_nearby_posts(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_km INTEGER DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  image_url TEXT,
  radius_km INTEGER,
  distance_km DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.content,
    p.image_url,
    p.radius_km,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 AS distance_km,
    p.created_at,
    p.expires_at
  FROM public.posts p
  WHERE 
    p.expires_at > now()
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_km * 1000
    )
    -- Additional filter by calculated distance for precision
    AND (ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000) <= max_distance_km
  ORDER BY p.created_at DESC;
END;
$$;

