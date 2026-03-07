import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  UIManager,
  StyleSheet,
  Modal
} from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import styles from "../../src/styles/mapStyles";
import { ComplexitySearch } from "../../components/ComplexitySearch";
import MapView, {
  PROVIDER_GOOGLE,
  Region,
  UrlTile,
  Polygon,
  Polyline,
  LatLng,
  MapPressEvent,
  Circle,
  Marker
} from "react-native-maps";
import * as Location from "expo-location";
import { useRouter, useLocalSearchParams } from "expo-router";
import { API_BASE_URL } from "../../src/config";

// ==================== ENABLE LAYOUT ANIMATION ====================
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==================== CONSTANTS ====================
// ==================== TYPES ====================
interface ListingSummary {
  id: number;
  title: string;
  listing_purpose: string;
  status: string;
  area_hectares: number | null;
  analytics?: {
    prediction_label: string | null;
  } | null;
}

interface ListingWithPolygon extends ListingSummary {
  polygon_coordinates: number[][] | null;
}

const MALABE_BOUNDS = {
  minLng: 79.94143645990987,
  minLat: 6.882981538452185,
  maxLng: 79.9844657620192,
  maxLat: 6.924753199163743
};



type AoiResponse = {
  ok: boolean;
  aoi: {
    type: string;
    coordinates: number[][][];
  };
};

// ==================== GEOMETRY UTILITIES ====================

function orientation(p: LatLng, q: LatLng, r: LatLng): number {
  const val = (q.latitude - p.latitude) * (r.longitude - q.longitude) -
    (q.longitude - p.longitude) * (r.latitude - q.latitude);

  if (Math.abs(val) < 1e-10) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(p: LatLng, q: LatLng, r: LatLng): boolean {
  return (
    q.longitude <= Math.max(p.longitude, r.longitude) &&
    q.longitude >= Math.min(p.longitude, r.longitude) &&
    q.latitude <= Math.max(p.latitude, r.latitude) &&
    q.latitude >= Math.min(p.latitude, r.latitude)
  );
}

function doSegmentsIntersect(
  p1: LatLng,
  q1: LatLng,
  p2: LatLng,
  q2: LatLng
): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

function validateNewPoint(
  points: LatLng[],
  newPoint: LatLng
): { isValid: boolean; intersectingEdge?: number } {
  if (points.length < 2) return { isValid: true };

  const lastPoint = points[points.length - 1];

  for (let i = 0; i < points.length - 1; i++) {
    const edgeStart = points[i];
    const edgeEnd = points[i + 1];

    if (i === points.length - 2) continue;

    if (doSegmentsIntersect(lastPoint, newPoint, edgeStart, edgeEnd)) {
      return { isValid: false, intersectingEdge: i };
    }
  }

  if (points.length >= 3) {
    const firstPoint = points[0];

    for (let i = 1; i < points.length - 2; i++) {
      const edgeStart = points[i];
      const edgeEnd = points[i + 1];

      if (doSegmentsIntersect(firstPoint, newPoint, edgeStart, edgeEnd)) {
        return { isValid: false, intersectingEdge: i };
      }
    }
  }

  return { isValid: true };
}

function calculatePolygonArea(points: LatLng[]): {
  areaDegrees: number;
  areaMeters: number;
  areaHectares: number;
  areaAcres: number;
} {
  if (points.length < 3) {
    return { areaDegrees: 0, areaMeters: 0, areaHectares: 0, areaAcres: 0 };
  }

  let areaDegrees = 0;

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];

    areaDegrees += (p2.longitude - p1.longitude) * (p2.latitude + p1.latitude);
  }

  areaDegrees = Math.abs(areaDegrees) / 2;

  const meanLat =
    points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const latRadians = (meanLat * Math.PI) / 180;

  const degreeToMeter = 111320;
  const latToMeter = degreeToMeter;
  const lngToMeter = degreeToMeter * Math.cos(latRadians);

  const areaMeters = areaDegrees * latToMeter * lngToMeter;
  const areaHectares = areaMeters / 10000;
  const areaAcres = areaMeters / 4046.86;

  return {
    areaDegrees,
    areaMeters: Math.round(areaMeters),
    areaHectares: parseFloat(areaHectares.toFixed(2)),
    areaAcres: parseFloat(areaAcres.toFixed(2))
  };
}

function getPolygonColor(points: LatLng[]): string {
  if (points.length < 3) return "#a855f7";

  for (let i = 0; i < points.length - 1; i++) {
    const validation = validateNewPoint(points.slice(0, i + 1), points[i + 1]);
    if (!validation.isValid) return "#ef4444";
  }

  return "#22c55e";
}

function polygonCentroid(coords: LatLng[]) {
  let lat = 0, lng = 0;
  for (const c of coords) {
    lat += c.latitude;
    lng += c.longitude;
  }
  return { latitude: lat / coords.length, longitude: lng / coords.length };
}

// ==================== UTILITY FUNCTIONS ====================
function regionIntersectsBounds(r: Region) {
  const north = r.latitude + r.latitudeDelta / 2;
  const south = r.latitude - r.latitudeDelta / 2;
  const east = r.longitude + r.longitudeDelta / 2;
  const west = r.longitude - r.longitudeDelta / 2;

  return !(
    east < MALABE_BOUNDS.minLng ||
    west > MALABE_BOUNDS.maxLng ||
    north < MALABE_BOUNDS.minLat ||
    south > MALABE_BOUNDS.maxLat
  );
}

function pointInPolygon(pt: LatLng, poly: LatLng[]) {
  if (poly.length < 3) return false;
  const x = pt.longitude;
  const y = pt.latitude;

  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].longitude,
      yi = poly[i].latitude;
    const xj = poly[j].longitude,
      yj = poly[j].latitude;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

// ==================== MAIN SCREEN ====================
export default function MapScreen() {
  const router = useRouter();
  const { startDraw, cityMode, lat, lng, cityName, boundary, geeTileUrl } = useLocalSearchParams<{
    startDraw?: string;
    cityMode?: 'point' | 'analysis' | 'listings';
    lat?: string;
    lng?: string;
    cityName?: string;
    boundary?: string;
    geeTileUrl?: string;
  }>();
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();

  // ==================== STATE ====================
  const [mapType, setMapType] = useState<"standard" | "satellite" | "terrain">("standard");
  const [showClassifiedOverlay, setShowClassifiedOverlay] = useState(false);
  const [geeOpacity, setGeeOpacity] = useState(0.7);
  const [dynamicTileUrl, setDynamicTileUrl] = useState<string | null>(null);



  const [drawMode, setDrawMode] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<LatLng[]>([]);

  // Auto-enable draw mode when navigated from marketplace "List Land"
  useEffect(() => {
    if (startDraw === 'true') {
      setDrawMode(true);
    }
  }, [startDraw]);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [polygonError, setPolygonError] = useState<string | null>(null);
  const [pointHistory, setPointHistory] = useState<LatLng[][]>([]);
  const [cityBoundary, setCityBoundary] = useState<LatLng[]>([]);
  const [targetCity, setTargetCity] = useState<string | null>(null);
  const [nearbyListings, setNearbyListings] = useState<ListingWithPolygon[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Function to fetch listings for a city or region
  const fetchCityListings = useCallback(async (name: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/listings?city=${encodeURIComponent(name)}&limit=50`);
      const data = await res.json();
      if (data.ok) {
        // Fetch detail for each listing (to get polygon_coordinates)
        const summaries: ListingSummary[] = data.listings ?? [];
        const details = await Promise.all(
          summaries.map((s) =>
            fetch(`${API_BASE_URL}/api/listings/${s.id}`)
              .then((r) => r.json())
              .then((d) => d.listing as ListingWithPolygon)
              .catch(() => null)
          )
        );
        setNearbyListings(details.filter(Boolean) as ListingWithPolygon[]);
      }
    } catch (e) {
      console.error("Failed to fetch listings for city:", e);
    }
  }, []);

  // Handle Incoming City Search Params
  useEffect(() => {
    if (lat && lng) {
      setShowSearchModal(false);
      const targetLat = parseFloat(lat);
      const targetLng = parseFloat(lng);

      const newRegion: Region = {
        latitude: targetLat,
        longitude: targetLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      };

      setTimeout(() => {
        mapRef.current?.animateToRegion(newRegion, 1000);
      }, 500);

      if (cityName) setTargetCity(cityName);

      if (geeTileUrl) {
        setDynamicTileUrl(geeTileUrl);
        if (cityMode === 'analysis') {
          setShowClassifiedOverlay(true);
        }
      }

      if (boundary) {
        try {
          const parsed = JSON.parse(boundary);
          if (parsed.type === "Polygon") {
            const coords: LatLng[] = parsed.coordinates[0].map((c: any) => ({
              longitude: c[0],
              latitude: c[1]
            }));
            setCityBoundary(coords);

            // If Analysis mode, trigger boundary analysis
            if (cityMode === 'analysis') {
              setPolygonPoints(coords);
              setTimeout(() => {
                analyzePolygonAuto(coords);
              }, 1500);
            }

            if (cityMode === 'listings' && cityName) {
              fetchCityListings(cityName);
            }
          } else if (parsed.type === "MultiPolygon") {
            const coords: LatLng[] = parsed.coordinates[0][0].map((c: any) => ({
              longitude: c[0],
              latitude: c[1]
            }));
            setCityBoundary(coords);
            if (cityMode === 'analysis') {
              setPolygonPoints(coords);
              setTimeout(() => {
                analyzePolygonAuto(coords);
              }, 1500);
            }
            if (cityMode === 'listings' && cityName) {
              fetchCityListings(cityName);
            }
          }
        } catch (e) {
          console.error("Failed to parse boundary GeoJSON", e);
        }
      }
    }
  }, [lat, lng, boundary, cityMode, cityName, fetchCityListings]);

  const analyzePolygonAuto = async (points: LatLng[]) => {
    setAnalyzeLoading(true);
    try {
      const coords = points.map((p) => [p.longitude, p.latitude]);
      const res = await fetch(`${API_BASE_URL}/aoi/analyze-polygon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: coords })
      });
      const result = await res.json();
      if (result.ok) {
        // @ts-ignore
        router.push({
          pathname: "/analytics",
          params: { type: "polygon", result: JSON.stringify(result) }
        } as any);
      }
    } catch (e) {
      console.error("Auto analysis failed:", e);
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const [userLoc, setUserLoc] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const initialRegion: Region = useMemo(
    () => ({
      latitude: 6.904,
      longitude: 79.969,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06
    }),
    []
  );

  const [region, setRegion] = useState<Region>(initialRegion);
  const [AOI_COORDS, setAOI_COORDS] = useState<LatLng[]>([]);
  const [aoiLoaded, setAoiLoaded] = useState(false);

  const [selected, setSelected] = useState<{
    latitude: number;
    longitude: number;
    inside: boolean;
  } | null>(null);

  // ==================== COMPUTED VALUES ====================
  const polygonArea = useMemo(() => {
    return calculatePolygonArea(polygonPoints);
  }, [polygonPoints]);

  const polygonColor = useMemo(() => {
    return getPolygonColor(polygonPoints);
  }, [polygonPoints]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/aoi`);
        const json = (await res.json()) as AoiResponse;
        if (!alive) return;

        const ring = json?.aoi?.coordinates?.[0] ?? [];
        const coords: LatLng[] = ring.map((p) => ({
          longitude: p[0],
          latitude: p[1]
        }));

        setAOI_COORDS(coords);
      } catch (e) {
        console.error("Failed to load AOI:", e);
      } finally {
        if (!alive) return;
        setAoiLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setUserLoc({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
    })();
  }, []);

  useEffect(() => {
    if (!showClassifiedOverlay) return;
    if (!mapRef.current) return;
    if (!AOI_COORDS.length) return;

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(AOI_COORDS, {
        edgePadding: { top: 120, right: 80, bottom: 220, left: 40 },
        animated: true
      });
    }, 150);
  }, [showClassifiedOverlay, AOI_COORDS]);

  // ==================== HANDLERS ====================
  const showOverlayNow = showClassifiedOverlay && regionIntersectsBounds(region);

  const onMapPress = useCallback(
    (e: MapPressEvent) => {
      if (drawMode) {
        const newPoint = e.nativeEvent.coordinate;
        const validation = validateNewPoint(polygonPoints, newPoint);

        if (!validation.isValid) {
          setPolygonError("⚠️ Lines crossing! Choose a different point.");
          return;
        }

        setPointHistory([...pointHistory, polygonPoints]);
        setPolygonPoints([...polygonPoints, newPoint]);
        setPolygonError(null);
        return;
      }

      const { latitude, longitude } = e.nativeEvent.coordinate;
      const inside =
        AOI_COORDS.length > 2
          ? pointInPolygon({ latitude, longitude }, AOI_COORDS)
          : false;

      setSelected({ latitude, longitude, inside });
    },
    [drawMode, polygonPoints, pointHistory, AOI_COORDS]
  );

  const handleUndo = useCallback(() => {
    if (pointHistory.length === 0) return;

    const previousPoints = pointHistory[pointHistory.length - 1];
    setPolygonPoints(previousPoints);
    setPointHistory(pointHistory.slice(0, -1));
    setPolygonError(null);
  }, [pointHistory]);

  const handleClear = useCallback(() => {
    Alert.alert("Clear polygon", "Remove all points?", [
      { text: "Cancel", onPress: () => { } },
      {
        text: "Clear",
        onPress: () => {
          setPolygonPoints([]);
          setPointHistory([]);
          setPolygonError(null);
        },
        style: "destructive"
      },
    ]);
  }, []);

  const zoomIn = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next: Region = {
      ...region,
      latitudeDelta: Math.max(region.latitudeDelta / 2, 0.0008),
      longitudeDelta: Math.max(region.longitudeDelta / 2, 0.0008)
    };
    mapRef.current?.animateToRegion(next, 250);
    setRegion(next);
  }, [region]);

  const zoomOut = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next: Region = {
      ...region,
      latitudeDelta: Math.min(region.latitudeDelta * 2, 8),
      longitudeDelta: Math.min(region.longitudeDelta * 2, 8)
    };
    mapRef.current?.animateToRegion(next, 250);
    setRegion(next);
  }, [region]);

  const centerToUser = useCallback(() => {
    if (!userLoc) return;
    const next: Region = {
      latitude: userLoc.latitude,
      longitude: userLoc.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02
    };
    mapRef.current?.animateToRegion(next, 400);
    setRegion(next);
  }, [userLoc]);

  const openAnalytics = useCallback(() => {
    if (!selected) return;
    // @ts-ignore
    router.push({
      pathname: "/analytics",
      params: {
        lat: String(selected.latitude),
        lng: String(selected.longitude),
        type: "point"
      }
    } as any);
  }, [selected, router]);

  const startDrawing = useCallback(() => {
    setDrawMode(true);
    setPolygonPoints([]);
    setPointHistory([]);
    setSelected(null);
    setPolygonError(null);
  }, []);

  const cancelDrawing = useCallback(() => {
    setDrawMode(false);
    setPolygonPoints([]);
    setPointHistory([]);
    setPolygonError(null);
  }, []);

  const analyzePolygon = async () => {
    if (polygonPoints.length < 3) {
      Alert.alert("Invalid Polygon", "At least 3 points required.");
      return;
    }

    if (polygonColor === "#ef4444") {
      setPolygonError("⚠️ Polygon is invalid! Self-intersecting.");
      return;
    }

    setAnalyzeLoading(true);
    try {
      const coords = polygonPoints.map((p) => [p.longitude, p.latitude]);

      // Try GEE-based global analysis first (works anywhere)
      let result: any = null;
      let useGee = true;

      try {
        const geeResponse = await fetch(`${API_BASE_URL}/api/analysis/polygon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates: coords })
        });
        if (geeResponse.ok) {
          result = await geeResponse.json();
        }
      } catch {
        useGee = false;
      }

      // Fall back to local AOI analysis (Malabe)
      if (!result || !result.ok) {
        useGee = false;
        const response = await fetch(`${API_BASE_URL}/aoi/analyze-polygon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coordinates: coords })
        });

        const responseText = await response.text();

        if (!response.ok) {
          Alert.alert("Error", `Status ${response.status}`);
          setAnalyzeLoading(false);
          return;
        }

        try {
          result = JSON.parse(responseText);
        } catch {
          Alert.alert("Error", "Parse failed");
          setAnalyzeLoading(false);
          return;
        }
      }

      if (!result || !result.ok) {
        Alert.alert("Error", result?.message || result?.error || "Analysis failed");
        setAnalyzeLoading(false);
        return;
      }

      setDrawMode(false);
      setPolygonPoints([]);
      setPointHistory([]);
      setPolygonError(null);

      // @ts-ignore
      router.push({
        pathname: "/analytics",
        params: {
          type: "polygon",
          result: JSON.stringify(result)
        }
      } as any);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setAnalyzeLoading(false);
    }
  };

  // ==================== RENDER ====================
  return (
    <SafeAreaView style={styles.safeArea}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        mapType={mapType}
        showsUserLocation
        zoomEnabled
        scrollEnabled
        rotateEnabled
        pitchEnabled
        onRegionChangeComplete={(r) => setRegion(r)}
        onPress={onMapPress}
      >
        {(showClassifiedOverlay || dynamicTileUrl) && (
          <UrlTile
            urlTemplate={dynamicTileUrl || `${API_BASE_URL}/tiles/classified/{z}/{x}/{y}.png`}
            maximumZ={20}
            tileSize={256}
            zIndex={2}
            opacity={geeOpacity}
          />
        )}

        {showClassifiedOverlay && AOI_COORDS.length > 2 && (
          <Polygon
            coordinates={AOI_COORDS}
            strokeColor="#2563eb"
            strokeWidth={2.5}
            fillColor="rgba(0,0,0,0)"
            zIndex={20}
          />
        )}

        {/* City Boundary Polygon */}
        {cityBoundary.length > 2 && (
          <Polygon
            coordinates={cityBoundary}
            strokeColor="#64748b" // Ash color for boundary
            strokeWidth={3}
            fillColor="rgba(148, 163, 184, 0.1)" // Light ash fill
            zIndex={15}
          />
        )}

        {/* Nearby Listing Polygons & Markers */}
        {nearbyListings.map((listing) => {
          if (!listing.polygon_coordinates || listing.polygon_coordinates.length < 3) return null;
          const coords = listing.polygon_coordinates.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng
          }));
          const centroid = polygonCentroid(coords);
          return (
            <React.Fragment key={`listing-${listing.id}`}>
              <Polygon
                coordinates={coords}
                strokeColor="#22c55e"
                fillColor="rgba(34, 197, 94, 0.2)"
                strokeWidth={2}
              />
              <Marker
                coordinate={centroid}
                pinColor="green"
                title={listing.title}
                // @ts-ignore
                onCalloutPress={() => router.push({ pathname: "/listings/detail", params: { id: String(listing.id) } })}
              />
            </React.Fragment>
          );
        })}

        {/* ALWAYS show Polyline for all points to securely draw the boundaries (chain) */}
        {polygonPoints.length >= 2 && (
          <Polyline
            coordinates={drawMode ? polygonPoints : [...polygonPoints, polygonPoints[0]]}
            strokeColor={polygonColor}
            strokeWidth={drawMode ? 2 : 3}
            lineDashPattern={drawMode ? [8, 4] : undefined}
            zIndex={39}
          />
        )}

        {/* Real-time polygon preview fill (>= 3 points) */}
        {polygonPoints.length >= 3 && (
          <Polygon
            coordinates={polygonPoints}
            strokeColor="transparent"
            fillColor={
              polygonColor === "#22c55e"
                ? "rgba(34, 197, 94, 0.15)"
                : polygonColor === "#ef4444"
                  ? "rgba(239, 68, 68, 0.15)"
                  : "rgba(168, 85, 247, 0.15)"
            }
            strokeWidth={0}
            zIndex={38}
          />
        )}

        {/* Markers — ALWAYS MUST BE LAST to render on top of polylines/polygons */}
        {polygonPoints.map((pt, i) => (
          <Marker
            key={`marker-${i}-${pt.latitude}-${pt.longitude}`}
            coordinate={pt}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={41}
            tracksViewChanges={true}
          >
            <View style={{
              width: 26, height: 26, borderRadius: 13,
              backgroundColor: polygonColor, borderWidth: 2.5,
              borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 }, elevation: 6
            }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{i + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* ==================== UI ====================*/}
      <View pointerEvents="box-none" style={styles.overlay}>
        {/* HEADER: Compact Pill-Shaped Dashboard */}
        <View
          style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}
          pointerEvents="auto"
        >
          {drawMode && (
            <View style={{
              backgroundColor: "rgba(15,23,42,0.85)",
              borderRadius: 12,
              padding: 12,
              marginHorizontal: 16,
              marginBottom: 10
            }}>
              <Text style={{ color: "#f8fafc", fontSize: 13, textAlign: "center", fontWeight: "500" }}>
                📍 Tap the map to place zone boundary points ({polygonPoints.length}{" "}
                placed)
              </Text>
            </View>
          )}
          <View style={styles.dashboardContainer}>
            {(["Normal", "Satellite", "Terrain", "GEE"] as const).map((type) => {
              const isActive = type === "GEE"
                ? showClassifiedOverlay
                : mapType === type.toLowerCase();

              return (
                <Pressable
                  key={type}
                  style={[styles.dashboardBtn, isActive && styles.dashboardBtnActive]}
                  onPress={() => {
                    if (type === "GEE") {
                      setShowClassifiedOverlay(!showClassifiedOverlay);
                    } else {
                      setMapType(type.toLowerCase() as any);
                    }
                  }}
                >
                  <Text style={[styles.dashboardBtnText, isActive && styles.dashboardBtnTextActive]}>
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Native Opacity Slider */}
          {showClassifiedOverlay && (
            <View style={{
              marginHorizontal: 16,
              marginTop: 4,
              marginBottom: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8
            }} pointerEvents="auto">
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#0284c7', width: 36, textAlign: 'center' }}>
                {Math.round(geeOpacity * 100)}%
              </Text>
              <Slider
                style={{ flex: 1, height: 44 }}
                minimumValue={0.3}
                maximumValue={1.0}
                step={0.01}
                value={geeOpacity}
                onValueChange={(val: number) => setGeeOpacity(Math.round(val * 100) / 100)}
                minimumTrackTintColor="#0284c7"
                maximumTrackTintColor="rgba(203,213,225,0.6)"
                thumbTintColor="#0284c7"
              />
            </View>
          )}
        </View>

        {/* UNIFIED CONTROL GRID - Farmer's Toolbox */}
        <View
          style={[
            styles.toolboxContainer,
            { bottom: drawMode ? 160 : 20 + insets.bottom }
          ]}
          pointerEvents="auto"
        >
          <View style={styles.toolboxGrid}>
            {/* Zoom In */}
            <Pressable
              style={styles.toolboxBtn}
              onPress={zoomIn}
              android_ripple={{ color: "rgba(59, 130, 246, 0.2)", radius: 24 }}
            >
              <Text style={styles.toolboxBtnText}>+</Text>
            </Pressable>

            {/* Zoom Out */}
            <Pressable
              style={styles.toolboxBtn}
              onPress={zoomOut}
              android_ripple={{ color: "rgba(59, 130, 246, 0.2)", radius: 24 }}
            >
              <Text style={styles.toolboxBtnText}>−</Text>
            </Pressable>

            {/* Current Location */}
            <Pressable
              style={styles.toolboxBtn}
              onPress={centerToUser}
              android_ripple={{ color: "rgba(59, 130, 246, 0.2)", radius: 24 }}
            >
              <Text style={styles.toolboxBtnText}>📍</Text>
            </Pressable>

            {/* Search City */}
            <Pressable
              style={[styles.toolboxBtn, showSearchModal && styles.toolboxBtnActive]}
              onPress={() => setShowSearchModal(true)}
              android_ripple={{ color: "rgba(59, 130, 246, 0.2)", radius: 24 }}
            >
              <Text style={styles.toolboxBtnText}>🔍</Text>
            </Pressable>

            {/* Smart Pricing Link */}
            <Pressable
              style={styles.toolboxBtn}
              onPress={() => router.push("/(tabs)/seasonal-price-analytics" as any)}
              android_ripple={{ color: "rgba(59, 130, 246, 0.2)", radius: 24 }}
            >
              <Text style={styles.toolboxBtnText}>📈</Text>
            </Pressable>

            {/* Draw/Edit */}
            <Pressable
              style={[
                styles.toolboxBtn,
                drawMode && styles.toolboxBtnActive,
              ]}
              onPress={startDrawing}
              android_ripple={{ color: "rgba(59, 130, 246, 0.2)", radius: 24 }}
            >
              <Text style={styles.toolboxBtnText}>✏️</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom Controls - Drawing Mode */}
        {drawMode && (
          <View style={styles.bottomControlsContainer} pointerEvents="auto">
            {polygonError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{polygonError}</Text>
              </View>
            )}

            {polygonPoints.length >= 3 && (
              <View style={styles.areaBanner}>
                <Text style={styles.areaText}>
                  📍 {polygonArea.areaHectares} ha • {polygonArea.areaAcres} acres
                </Text>
              </View>
            )}

            <View style={styles.bottomControls}>
              <Pressable
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={cancelDrawing}
              >
                <Text style={styles.actionBtnText}>Cancel</Text>
              </Pressable>

              <View style={styles.pointInfo}>
                <Text style={styles.pointInfoText}>
                  {polygonPoints.length === 0
                    ? "Start marking"
                    : `${polygonPoints.length} points`}
                </Text>
              </View>

              <Pressable
                style={[styles.actionBtn, styles.undoBtn]}
                disabled={polygonPoints.length === 0}
                onPress={handleUndo}
              >
                <Text style={styles.actionBtnText}>↶</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionBtn,
                  styles.analyzeBtn,
                  polygonPoints.length < 3 && styles.disabledBtn,
                ]}
                disabled={polygonPoints.length < 3 || analyzeLoading}
                onPress={analyzePolygon}
              >
                {analyzeLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionBtnText}>✓</Text>
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.actionBtn,
                  { backgroundColor: "#059669", marginLeft: 6 },
                  polygonPoints.length < 3 && styles.disabledBtn,
                ]}
                disabled={polygonPoints.length < 3}
                onPress={() => {
                  const coords = polygonPoints.map((p) => [p.longitude, p.latitude]);
                  // @ts-ignore
                  router.push({
                    pathname: "/land/list-land-form",
                    params: { polygon: JSON.stringify(coords) }
                  } as any);
                }}
              >
                <Text style={styles.actionBtnText}>📋</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Legend */}
        {showClassifiedOverlay && !selected && !drawMode && (
          <View style={styles.legendBox} pointerEvents="auto">
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotVegetation]} />
              <Text style={styles.legendText}>Vegetation</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotIdle]} />
              <Text style={styles.legendText}>Idle Land</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotBuilt]} />
              <Text style={styles.legendText}>Built-up</Text>
            </View>
          </View>
        )}

        {/* Point Selection Sheet */}
        {selected && !drawMode && (
          <View style={styles.selectionSheet} pointerEvents="auto">
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>📍 Location</Text>
              <Pressable
                style={styles.closeBtn}
                onPress={() => setSelected(null)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.sheetContent}>
              <Text style={styles.coordLabel}>
                Lat: {selected.latitude.toFixed(6)}
              </Text>
              <Text style={styles.coordLabel}>
                Lng: {selected.longitude.toFixed(6)}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  selected.inside ? styles.statusBadgeInside : styles.statusBadgeOutside,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    selected.inside ? styles.statusTextInside : styles.statusTextOutside,
                  ]}
                >
                  {selected.inside ? "✅ Inside Malabe AOI" : "🌍 Global Analysis (GEE)"}
                </Text>
              </View>

              <Pressable
                style={[
                  styles.analyzePointBtn,
                ]}
                onPress={selected.inside ? openAnalytics : () => {
                  // @ts-ignore
                  router.push({
                    pathname: "/analytics",
                    params: {
                      lat: String(selected.latitude),
                      lng: String(selected.longitude),
                      type: "gee_point"
                    }
                  } as any);
                }}
              >
                <Text style={styles.analyzePointBtnText}>
                  {selected.inside ? "📊 Analyze (Local)" : "🔬 Analyze (XGBoost)"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Search Modal */}
        <Modal
          visible={showSearchModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSearchModal(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            padding: 20
          }}>
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 24,
              padding: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 16 }}>
                <Pressable onPress={() => setShowSearchModal(false)} style={{ padding: 4 }}>
                  <View style={{ backgroundColor: '#f1f5f9', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#64748b' }}>✕</Text>
                  </View>
                </Pressable>
              </View>
              <ComplexitySearch theme={{
                background: "#f8fafc",
                cardBg: "#ffffff",
                borderColor: "rgba(0,0,0,0.06)",
                textPrimary: "#0f172a",
                textSecondary: "#475569",
                textMuted: "#64748b",
                textHighlight: "#16a34a",
                badgeBg: "rgba(22, 163, 74, 0.1)",
                badgeBorder: "rgba(22, 163, 74, 0.2)",
                badgeText: "#16a34a"
              }} />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
