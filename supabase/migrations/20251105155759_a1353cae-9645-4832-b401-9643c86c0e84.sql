-- Create function to get nearby users
CREATE OR REPLACE FUNCTION get_nearby_users(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance_km DOUBLE PRECISION DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.bio,
    ST_Y(p.location::geometry) as latitude,
    ST_X(p.location::geometry) as longitude,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) / 1000 as distance_km
  FROM profiles p
  WHERE p.location IS NOT NULL
    AND p.id != auth.uid()  -- Exclude current user
    AND ST_DWithin(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance_km * 1000
    )
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;