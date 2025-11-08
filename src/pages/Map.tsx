import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useDeviceLocation } from "@/hooks/useDeviceLocation";

interface NearbyUser {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
}

// Memoized icon cache to avoid recreating icons on every render
const iconCache = new globalThis.Map<string, L.DivIcon>();

// Create a divIcon that displays username text instead of a default marker icon
const createUsernameIcon = (username: string): L.DivIcon => {
  if (iconCache.has(username)) {
    return iconCache.get(username)!;
  }
  const icon = L.divIcon({
    className: "leaflet-username-label",
    html: `<span class="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow">@${username}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
  iconCache.set(username, icon);
  return icon;
};

const Map = () => {
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { location, isLoading: locationLoading, error: locationError } = useDeviceLocation({
    highAccuracy: true,
    maximumAgeMs: 30_000,
    timeoutMs: 10_000,
  });
  const lastRefreshedLocation = useRef<string>("");

  const loadMyUsername = useCallback(async () => {
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
  }, []);

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

  // Load username immediately, don't block map rendering
  useEffect(() => {
    loadMyUsername();
  }, [loadMyUsername]);

  const loadNearbyUsers = useCallback(async (coords: [number, number]) => {
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
  }, []);

  useEffect(() => {
    if (!location) return;

    const coords: [number, number] = [location.lat, location.lng];
    const key = `${coords[0].toFixed(5)}:${coords[1].toFixed(5)}`;
    if (lastRefreshedLocation.current === key) return;
    lastRefreshedLocation.current = key;

    // Don't block map rendering - load users in background
    setLoading(true);

    // Run location update and user loading in parallel
    Promise.all([
      updateMyLocation(coords[0], coords[1]).catch((error) =>
        console.error("Failed to sync my location:", error)
      ),
      loadNearbyUsers(coords),
    ]).catch((error) => {
      console.error("Error loading map data:", error);
      setLoading(false);
    });
  }, [location, loadNearbyUsers]);

  // Poll nearby users periodically for near real-time updates
  useEffect(() => {
    if (!location) return;
    const interval = setInterval(() => {
      loadNearbyUsers([location.lat, location.lng]);
    }, 10_000); // 10 seconds
    return () => clearInterval(interval);
  }, [location, loadNearbyUsers]);

  useEffect(() => {
    if (locationError) {
      toast.error("Please enable location to view map");
    }
  }, [locationError]);

  const userLocation = useMemo(() => {
    if (!location) return null;
    return [location.lat, location.lng] as [number, number];
  }, [location]);

  // Memoize markers to avoid unnecessary re-renders
  const myMarkerIcon = useMemo(() => createUsernameIcon(myUsername || "You"), [myUsername]);
  const userMarkers = useMemo(() => {
    return users.map((user) => ({
      id: user.id,
      position: [user.latitude, user.longitude] as [number, number],
      icon: createUsernameIcon(user.username),
    }));
  }, [users]);


  if (locationLoading && !userLocation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground mb-2">Location required</p>
          <p className="text-muted-foreground">
            We couldn't detect your current location. Please enable location services and try again.
          </p>
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
        preferCanvas={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          tileSize={256}
          zoomOffset={0}
          crossOrigin={true}
        />

        {/* Show my own username label at my current location */}
        <Marker position={userLocation} icon={myMarkerIcon} />

        {/* Nearby user labels (no default markers) */}
        {userMarkers.map((marker) => (
          <Marker key={marker.id} position={marker.position} icon={marker.icon} />
        ))}
      </MapContainer>

      {loading && (
        <div className="pointer-events-none absolute inset-0 z-[900] flex items-start justify-center pt-20">
          <div className="rounded-full bg-background/90 px-4 py-2 text-sm text-muted-foreground shadow-lg">
            Updating nearby users...
          </div>
        </div>
      )}

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
