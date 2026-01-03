import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import MapView, {
  PROVIDER_GOOGLE,
  Region,
  UrlTile,
  Polygon,
  LatLng,
  MapPressEvent,
} from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";

// ✅ IMPORTANT: backend base URL
const API_URL = "http://10.0.2.2:8000";

// ✅ Malabe raster bounds (still useful to reduce tile requests)
const MALABE_BOUNDS = {
  minLng: 79.94143645990987,
  minLat: 6.882981538452185,
  maxLng: 79.9844657620192,
  maxLat: 6.924753199163743,
};

type AoiResponse = {
  ok: boolean;
  aoi: {
    type: string;
    coordinates: number[][][];
  };
};

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

// ✅ point-in-polygon (ray casting) for LatLng[]
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

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [mapType, setMapType] = useState<"standard" | "satellite" | "terrain">(
    "standard"
  );

  const [showClassifiedOverlay, setShowClassifiedOverlay] = useState(false);

  const [userLoc, setUserLoc] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const initialRegion: Region = useMemo(
    () => ({
      latitude: 6.904,
      longitude: 79.969,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    }),
    []
  );

  const [region, setRegion] = useState<Region>(initialRegion);

  // ✅ AOI coords now come from backend (/aoi)
  const [AOI_COORDS, setAOI_COORDS] = useState<LatLng[]>([]);
  const [aoiLoaded, setAoiLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/aoi`);
        const json = (await res.json()) as AoiResponse;
        if (!alive) return;

        const ring = json?.aoi?.coordinates?.[0] ?? [];
        const coords: LatLng[] = ring.map((p) => ({
          longitude: p[0],
          latitude: p[1],
        }));

        setAOI_COORDS(coords);
      } catch {
        setAOI_COORDS([]);
      } finally {
        if (!alive) return;
        setAoiLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ Selected point
  const [selected, setSelected] = useState<{
    latitude: number;
    longitude: number;
    inside: boolean;
  } | null>(null);

  // ✅ Only request tiles near bounds (performance)
  const showOverlayNow = showClassifiedOverlay && regionIntersectsBounds(region);

  // ✅ Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setUserLoc({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  // ✅ When user turns ON GEE → zoom to AOI polygon
  useEffect(() => {
    if (!showClassifiedOverlay) return;
    if (!mapRef.current) return;
    if (!AOI_COORDS.length) return;

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(AOI_COORDS, {
        // ✅ slightly smaller padding => shows the full AOI like your reference
        edgePadding: { top: 90, right: 40, bottom: 220, left: 40 },
        animated: true,
      });
    }, 150);
  }, [showClassifiedOverlay, AOI_COORDS]);

  // ✅ Zoom controls
  const zoomIn = () => {
    const next: Region = {
      ...region,
      latitudeDelta: Math.max(region.latitudeDelta / 2, 0.0008),
      longitudeDelta: Math.max(region.longitudeDelta / 2, 0.0008),
    };
    mapRef.current?.animateToRegion(next, 250);
    setRegion(next);
  };

  const zoomOut = () => {
    const next: Region = {
      ...region,
      latitudeDelta: Math.min(region.latitudeDelta * 2, 8),
      longitudeDelta: Math.min(region.longitudeDelta * 2, 8),
    };
    mapRef.current?.animateToRegion(next, 250);
    setRegion(next);
  };

  const centerToUser = () => {
    if (!userLoc) return;
    const next: Region = {
      latitude: userLoc.latitude,
      longitude: userLoc.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
    mapRef.current?.animateToRegion(next, 400);
    setRegion(next);
  };

  const onMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    // If AOI not loaded yet => treat as outside
    const inside =
      AOI_COORDS.length > 2
        ? pointInPolygon({ latitude, longitude }, AOI_COORDS)
        : false;

    setSelected({ latitude, longitude, inside });
  };

  const openAnalytics = () => {
    if (!selected) return;
    router.push({
      pathname: "/analytics",
      params: {
        lat: String(selected.latitude),
        lng: String(selected.longitude),
      },
    });
  };

  // Legend bottom offset so it never sits under the bottom sheet
  const legendBottom = selected ? 170 : 18;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
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
        {/* ✅ GeoTIFF overlay tiles */}
        {showOverlayNow && (
          <UrlTile
            urlTemplate={`${API_URL}/tiles/classified/{z}/{x}/{y}.png`}
            maximumZ={20}
            tileSize={256}
            zIndex={2}
            opacity={0.92}
          />
        )}

        {/* ✅ AOI outline (blue) */}
        {showClassifiedOverlay && AOI_COORDS.length > 2 && (
          <Polygon
            coordinates={AOI_COORDS}
            strokeColor="#2563eb"
            strokeWidth={3}
            fillColor="rgba(0,0,0,0)"
            zIndex={20}
          />
        )}
      </MapView>

      {/* ✅ Overlay UI */}
      <View pointerEvents="box-none" style={styles.overlay}>
        {/* Layer buttons */}
        <View style={styles.layerRow} pointerEvents="auto">
          <Pressable
            style={[
              styles.layerBtn,
              mapType === "standard" && styles.layerBtnActive,
            ]}
            onPress={() => setMapType("standard")}
          >
            <Text style={styles.layerTxt}>Normal</Text>
          </Pressable>

          <Pressable
            style={[
              styles.layerBtn,
              mapType === "satellite" && styles.layerBtnActive,
            ]}
            onPress={() => setMapType("satellite")}
          >
            <Text style={styles.layerTxt}>Satellite</Text>
          </Pressable>

          <Pressable
            style={[
              styles.layerBtn,
              mapType === "terrain" && styles.layerBtnActive,
            ]}
            onPress={() => setMapType("terrain")}
          >
            <Text style={styles.layerTxt}>Terrain</Text>
          </Pressable>

          <Pressable
            style={[
              styles.layerBtn,
              showClassifiedOverlay && styles.layerBtnActive,
            ]}
            onPress={() => {
              setShowClassifiedOverlay((v) => !v);
              setSelected(null);
            }}
          >
            <Text style={styles.layerTxt}>GEE</Text>
          </Pressable>
        </View>

        {/* Zoom buttons (NO gap -> safer) */}
        <View style={styles.zoomCol} pointerEvents="auto">
          <Pressable style={styles.fab} onPress={zoomIn}>
            <Text style={styles.fabText}>＋</Text>
          </Pressable>
          <Pressable style={[styles.fab, styles.fabGap]} onPress={zoomOut}>
            <Text style={styles.fabText}>－</Text>
          </Pressable>
          <Pressable style={[styles.fab, styles.fabGap]} onPress={centerToUser}>
            <Text style={styles.fabText}>📍</Text>
          </Pressable>
        </View>

        {/* ✅ Legend */}
        {showClassifiedOverlay && (
          <View style={[styles.legend, { bottom: legendBottom }]} pointerEvents="none">
            <Text style={styles.legendTitle}>Legend</Text>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(139,69,19,0.9)" }]} />
              <Text style={styles.legendTxt}>Idle / Bare land</Text>
            </View>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(34,139,34,0.9)" }]} />
              <Text style={styles.legendTxt}>Vegetation land</Text>
            </View>

            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "rgba(128,128,128,0.9)" }]} />
              <Text style={styles.legendTxt}>Built-up</Text>
            </View>

            <Text style={styles.legendHint}>Overlay is clipped to AOI polygon</Text>

            {!aoiLoaded && <Text style={styles.legendHint}>Loading AOI…</Text>}
            {aoiLoaded && AOI_COORDS.length < 3 && (
              <Text style={styles.legendHint}>AOI failed to load (check backend /aoi).</Text>
            )}
          </View>
        )}

        {/* ✅ Selected Point Bottom Sheet */}
        {selected && (
          <View style={styles.sheet} pointerEvents="auto">
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Selected Point</Text>
              <Pressable style={styles.closeBtn} onPress={() => setSelected(null)}>
                <Text style={styles.closeTxt}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.sheetSmall}>
              Lat: {selected.latitude.toFixed(6)} | Lng: {selected.longitude.toFixed(6)}
            </Text>

            <Text style={styles.sheetSmall}>
              Status: {selected.inside ? "Inside AOI ✅" : "Outside AOI ❌"}
            </Text>

            <Pressable
              style={[styles.openBtn, !selected.inside && styles.openBtnDisabled]}
              onPress={openAnalytics}
              disabled={!selected.inside}
            >
              <Text style={styles.openBtnText}>Open Analytics</Text>
            </Pressable>

            {!selected.inside && (
              <Text style={styles.sheetHint}>Tap inside the blue boundary to enable analytics.</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },

  layerRow: {
    marginTop: 10,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  layerBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  layerBtnActive: { backgroundColor: "#e5f0ff" },
  layerTxt: { fontSize: 12, fontWeight: "700" },

  zoomCol: {
    position: "absolute",
    right: 14,
    bottom: 18,
  },
  fabGap: { marginTop: 10 },
  fab: {
    backgroundColor: "white",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { fontSize: 18, fontWeight: "900" },

  legend: {
    position: "absolute",
    left: 12,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: 190,
  },
  legendTitle: { fontSize: 12, fontWeight: "900", marginBottom: 6 },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
  legendTxt: { fontSize: 12, fontWeight: "700" },
  legendHint: { marginTop: 6, fontSize: 11, opacity: 0.75, fontWeight: "700" },

  sheet: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sheetTitle: { fontSize: 14, fontWeight: "900" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  closeTxt: { fontSize: 22, fontWeight: "900", lineHeight: 22 },

  sheetSmall: { fontSize: 12, opacity: 0.85, fontWeight: "700", marginTop: 2 },
  sheetHint: { marginTop: 8, fontSize: 11, opacity: 0.7, fontWeight: "700" },

  openBtn: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  openBtnDisabled: { backgroundColor: "#9ca3af" },
  openBtnText: { color: "white", fontWeight: "900" },
});
