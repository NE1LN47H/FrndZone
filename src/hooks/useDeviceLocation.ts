import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

type LocationPoint = { lat: number; lng: number };

interface UseDeviceLocationOptions {
  highAccuracy?: boolean;
  watch?: boolean;
  maximumAgeMs?: number;
  timeoutMs?: number;
}

interface UseDeviceLocationValue {
  location: LocationPoint | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const STORAGE_KEY = "frndzone:lastLocation";

const readStoredLocation = (): LocationPoint | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number"
    ) {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  } catch (error) {
    console.warn("Failed to parse stored location", error);
  }
  return null;
};

const storeLocation = (location: LocationPoint) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch (error) {
    console.warn("Failed to persist location", error);
  }
};

const ensureNativePermission = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const current = await Geolocation.checkPermissions();
    if (current.location === "granted") return true;
    const requested = await Geolocation.requestPermissions();
    return requested.location === "granted";
  } catch (error) {
    console.error("Permission request failed", error);
    return false;
  }
};

const getWebPosition = (
  settings: Required<Pick<UseDeviceLocationOptions, "highAccuracy" | "maximumAgeMs" | "timeoutMs">>
): Promise<LocationPoint> => {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (error) => reject(error),
      {
        enableHighAccuracy: settings.highAccuracy,
        maximumAge: settings.maximumAgeMs,
        timeout: settings.timeoutMs,
      }
    );
  });
};

const getNativePosition = async (
  settings: Required<Pick<UseDeviceLocationOptions, "highAccuracy" | "maximumAgeMs" | "timeoutMs">>
): Promise<LocationPoint> => {
  const granted = await ensureNativePermission();
  if (!granted) {
    throw new Error("Location permission denied");
  }

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: settings.highAccuracy,
    timeout: settings.timeoutMs,
    maximumAge: settings.maximumAgeMs,
  });

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
};

export const useDeviceLocation = (
  options: UseDeviceLocationOptions = {}
): UseDeviceLocationValue => {
  const settings = useMemo(
    () => ({
      highAccuracy: options.highAccuracy ?? false,
      watch: options.watch ?? true,
      maximumAgeMs: options.maximumAgeMs ?? 60_000,
      timeoutMs: options.timeoutMs ?? 10_000,
    }),
    [options.highAccuracy, options.watch, options.maximumAgeMs, options.timeoutMs]
  );

  const [location, setLocation] = useState<LocationPoint | null>(() => readStoredLocation());
  const [isLoading, setIsLoading] = useState(() => location === null);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const applyLocation = useCallback((loc: LocationPoint) => {
    setLocation(loc);
    storeLocation(loc);
    setError(null);
  }, []);

  const resolveCurrentLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      const resolver = Capacitor.isNativePlatform() ? getNativePosition : getWebPosition;
      const loc = await resolver(settings);
      if (!isMountedRef.current) return;
      applyLocation(loc);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("Failed fetching location", err);
      setError(err instanceof Error ? err.message : "Failed to get location");
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyLocation, settings]);

  useEffect(() => {
    isMountedRef.current = true;
    resolveCurrentLocation();
    return () => {
      isMountedRef.current = false;
    };
  }, [resolveCurrentLocation]);

  useEffect(() => {
    if (!settings.watch) return;

    let nativeWatchId: string | undefined;
    let webWatchId: number | undefined;
    let cancelled = false;

    const startWatch = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          if (!(await ensureNativePermission())) {
            setError("Location permission denied");
            return;
          }
          nativeWatchId = await Geolocation.watchPosition(
            {
              enableHighAccuracy: settings.highAccuracy,
              maximumAge: settings.maximumAgeMs,
              timeout: settings.timeoutMs,
            },
            (pos, err) => {
              if (cancelled || !isMountedRef.current) return;
              if (err || !pos) {
                console.error("Native watch error", err);
                setError(err?.message ?? "Failed to monitor location");
                return;
              }
              applyLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            }
          );
        } else if ("geolocation" in navigator) {
          webWatchId = navigator.geolocation.watchPosition(
            (pos) => {
              if (cancelled || !isMountedRef.current) return;
              applyLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            },
            (err) => {
              if (cancelled || !isMountedRef.current) return;
              console.error("Web watch error", err);
              setError(err.message);
            },
            {
              enableHighAccuracy: settings.highAccuracy,
              maximumAge: settings.maximumAgeMs,
              timeout: settings.timeoutMs,
            }
          );
        }
      } catch (err) {
        console.error("Failed to start location watch", err);
        if (!cancelled && isMountedRef.current) {
          setError("Unable to monitor location");
        }
      }
    };

    startWatch();

    return () => {
      cancelled = true;
      if (nativeWatchId) {
        Geolocation.clearWatch({ id: nativeWatchId }).catch((err) =>
          console.error("Failed to clear native watch", err)
        );
      }
      if (webWatchId !== undefined) {
        navigator.geolocation.clearWatch(webWatchId);
      }
    };
  }, [applyLocation, settings.highAccuracy, settings.maximumAgeMs, settings.timeoutMs, settings.watch]);

  const refresh = useCallback(async () => {
    await resolveCurrentLocation();
  }, [resolveCurrentLocation]);

  return useMemo(
    () => ({ location, isLoading, error, refresh }),
    [location, isLoading, error, refresh]
  );
};

export type { LocationPoint, UseDeviceLocationOptions };

