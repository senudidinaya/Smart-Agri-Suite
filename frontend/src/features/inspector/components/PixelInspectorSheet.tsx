import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useMemo, useRef, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/shared/theme/useTheme";
import { useGeospatialStore } from "@/features/geospatial/state/geospatialStore";
import { useInspectorStore } from "../state/inspectorStore";
import { inspectPixel } from "../data/inspectionRepository.mock";
import { FEATURE_GROUPS } from "../domain/featureSchema";
import { styles } from "../styles/inspectorStyles";

const label = (id: 0 | 1 | 2 | null) => (id === 0 ? "Bare Land" : id === 1 ? "Vegetation" : id === 2 ? "Built-up" : "Unknown");

export function PixelInspectorSheet() {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["12%", "55%", "92%"], []);
  const selectedPoint = useGeospatialStore((s) => s.selectedPoint);
  const { isOpen, close, features, setFeatures, classId, setClassId, open } = useInspectorStore();

  useEffect(() => {
    if (!selectedPoint) return;
    open(selectedPoint.latitude, selectedPoint.longitude);

    const ndviLike = (Math.abs(selectedPoint.latitude) * 17 + Math.abs(selectedPoint.longitude) * 13) % 1;
    const c: 0 | 1 | 2 = ndviLike > 0.62 ? 1 : ndviLike > 0.35 ? 2 : 0;
    setClassId(c);

    inspectPixel(selectedPoint.latitude, selectedPoint.longitude).then(setFeatures);
    sheetRef.current?.snapToIndex(1);
  }, [selectedPoint]);

  const chipColor = classId === 0 ? colors.landBare : classId === 1 ? colors.landVegetation : colors.landBuilt;

  const onCopy = async () => {
    if (!features || !selectedPoint) return;
    const lines: string[] = [
      "Idle Land Mobilization System — Pixel Report",
      `Lat: ${selectedPoint.latitude.toFixed(6)}, Lon: ${selectedPoint.longitude.toFixed(6)}`,
      `Class: ${label(classId)}`,
      ""
    ];
    FEATURE_GROUPS.forEach((g) => {
      lines.push(g.title);
      g.items.forEach((it: any) => lines.push(`- ${it.label}: ${features[it.key as keyof typeof features]}${it.unit ? " " + it.unit : ""}`));
      lines.push("");
    });
    await Clipboard.setStringAsync(lines.join("\n"));
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={close}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.headerRow}>
          <View style={[styles.classChip, { backgroundColor: chipColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Pixel Inspector</Text>
            <Text style={styles.subtitle}>
              {selectedPoint ? `Lat ${selectedPoint.latitude.toFixed(5)} • Lon ${selectedPoint.longitude.toFixed(5)} • ${label(classId)}` : "Tap on the map to inspect a pixel"}
            </Text>
          </View>

          <Pressable onPress={onCopy} style={styles.actionBtn}>
            <Text style={styles.actionText}>Copy</Text>
          </Pressable>
        </View>

        {!features ? (
          <Text style={styles.loading}>Loading features…</Text>
        ) : (
          FEATURE_GROUPS.map((g: any) => (
            <View key={g.title} style={styles.group}>
              <Text style={styles.groupTitle}>{g.title}</Text>
              <View style={styles.groupCard}>
                {g.items.map((it: any, idx: number) => (
                  <View key={it.key} style={[styles.row, idx === 0 ? { borderTopWidth: 0 } : null]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>{it.label}</Text>
                      <Text style={styles.hint}>{it.hint}</Text>
                    </View>
                    <Text style={styles.value}>
                      {features[it.key as keyof typeof features]}
                      {it.unit ? <Text style={styles.unit}> {it.unit}</Text> : null}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
