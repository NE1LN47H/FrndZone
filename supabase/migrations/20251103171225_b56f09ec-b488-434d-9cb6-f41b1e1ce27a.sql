-- Fix search_path for security functions
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
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_friend_posts(
  requesting_user_id UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  image_url TEXT,
  radius_km INTEGER,
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
    p.created_at,
    p.expires_at
  FROM public.posts p
  INNER JOIN public.friends f ON (p.user_id = f.friend_id AND f.user_id = requesting_user_id)
  WHERE p.expires_at > now()
  ORDER BY p.created_at DESC;
END;
$$;