import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface NearbyUser {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
}

// Create a divIcon that displays username text instead of a default marker icon
const createUsernameIcon = (username: string) =>
  L.divIcon({
    className: "leaflet-username-label",
    html: `<span class="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow">@${username}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

const Map = () => {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadMyUsername = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      setMyUsername(data?.username || null);
    } catch (err) {
      console.error("Failed loading my username:", err);
    }
  };

  const updateMyLocation = async (lat: number, lng: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ location: `POINT(${lng} ${lat})` })
        .eq("id", user.id);
    } catch (err) {
      console.error("Failed updating my location:", err);
    }
  };

  useEffect(() => {
    loadMyUsername();

    if ("geolocation" in navigator) {
      const onSuccess = async (position: GeolocationPosition) => {
        const coords: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(coords);
        loadNearbyUsers(coords);
        await updateMyLocation(coords[0], coords[1]);
      };

      const onError = (error: GeolocationPositionError) => {
        toast.error("Please enable location to view map");
        console.error("Location error:", error);
        setLoading(false);
      };

      navigator.geolocation.getCurrentPosition(onSuccess, onError);

      // Watch position updates so others see your latest location
      const watchId = navigator.geolocation.watchPosition(async (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        await updateMyLocation(coords[0], coords[1]);
      });

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const loadNearbyUsers = async (coords: [number, number]) => {
    try {
      const { data, error } = await supabase.rpc("get_nearby_users", {
        user_lat: coords[0],
        user_lng: coords[1],
        max_distance_km: 100,
      });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading nearby users:", error);
      toast.error("Failed to load nearby users");
    } finally {
      setLoading(false);
    }
  };

  // Poll nearby users periodically for near real-time updates
  useEffect(() => {
    if (!userLocation) return;
    const interval = setInterval(() => {
      loadNearbyUsers(userLocation);
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [userLocation]);

  if (loading || !userLocation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <div className="absolute top-4 left-4 z-[1000]">
        <Button
          onClick={() => navigate("/")}
          variant="secondary"
          size="icon"
          className="shadow-lg"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <MapContainer
        center={userLocation}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          // Attribution removed per request
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Show my own username label at my current location */}
        <Marker
          position={userLocation}
          icon={createUsernameIcon(myUsername || "You")}
        />

        {/* Nearby user labels (no default markers) */}
        {users.map((user) => (
          <Marker
            key={user.id}
            position={[user.latitude, user.longitude]}
            icon={createUsernameIcon(user.username)}
          />
        ))}
      </MapContainer>

      <BottomNav />

      {/* Inline style to refine label appearance positioning on the map */}
      <style>{`
        .leaflet-username-label {
          background: transparent;
          border: none;
        }
        .leaflet-username-label span {
          white-space: nowrap;
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default Map;
