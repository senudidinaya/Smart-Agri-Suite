import React, { useState } from "react";
import {
    View,
    Text,
    Modal,
    Pressable,
    StyleSheet,
    Animated,
} from "react-native";

export type LandTypeFilter = "VEGETATION_LAND" | "IDLE_LAND" | "BUILT_LAND";

interface Props {
    visible: boolean;
    activeFilters: LandTypeFilter[];
    onApply: (filters: LandTypeFilter[]) => void;
    onClose: () => void;
}

const ALL_FILTERS: LandTypeFilter[] = [
    "VEGETATION_LAND",
    "IDLE_LAND",
    "BUILT_LAND",
];

const FILTER_META: Record<
    LandTypeFilter,
    { label: string; color: string; emoji: string }
> = {
    VEGETATION_LAND: { label: "Vegetation Land", color: "#22c55e", emoji: "🟢" },
    IDLE_LAND: { label: "Idle Land", color: "#a16207", emoji: "🟤" },
    BUILT_LAND: { label: "Built-up Land", color: "#6b7280", emoji: "⚫" },
};

export default function MarketplaceFilter({
    visible,
    activeFilters,
    onApply,
    onClose,
}: Props) {
    const [selected, setSelected] = useState<LandTypeFilter[]>(activeFilters);

    const toggle = (f: LandTypeFilter) => {
        setSelected((prev) =>
            prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
        );
    };

    const handleApply = () => {
        onApply(selected);
        onClose();
    };

    const handleClear = () => {
        setSelected([...ALL_FILTERS]);
        onApply([...ALL_FILTERS]);
        onClose();
    };

    // Sync local state when modal opens
    React.useEffect(() => {
        if (visible) setSelected(activeFilters);
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            {/* Backdrop */}
            <Pressable style={s.backdrop} onPress={onClose} />

            {/* Sheet */}
            <View style={s.sheet}>
                {/* Handle */}
                <View style={s.handle} />

                {/* Header */}
                <View style={s.header}>
                    <Text style={s.title}>Filter Listings</Text>
                    <Pressable style={s.closeBtn} onPress={onClose}>
                        <Text style={s.closeBtnText}>✕</Text>
                    </Pressable>
                </View>

                {/* Section */}
                <Text style={s.sectionLabel}>Land Type</Text>

                {ALL_FILTERS.map((f) => {
                    const meta = FILTER_META[f];
                    const isChecked = selected.includes(f);
                    return (
                        <Pressable
                            key={f}
                            style={s.checkRow}
                            onPress={() => toggle(f)}
                        >
                            <View
                                style={[
                                    s.checkbox,
                                    isChecked && { backgroundColor: meta.color, borderColor: meta.color },
                                ]}
                            >
                                {isChecked && <Text style={s.checkmark}>✓</Text>}
                            </View>
                            <Text style={s.checkEmoji}>{meta.emoji}</Text>
                            <Text style={s.checkLabel}>{meta.label}</Text>
                        </Pressable>
                    );
                })}

                {/* Buttons */}
                <View style={s.btnRow}>
                    <Pressable style={s.btnClear} onPress={handleClear}>
                        <Text style={s.btnClearText}>Clear All</Text>
                    </Pressable>
                    <Pressable style={s.btnApply} onPress={handleApply}>
                        <Text style={s.btnApplyText}>Apply Filters</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
        backgroundColor: "#1e293b",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: "#334155",
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#475569",
        alignSelf: "center",
        marginBottom: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#f8fafc",
    },
    closeBtn: {
        padding: 6,
    },
    closeBtnText: {
        fontSize: 18,
        color: "#94a3b8",
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: 12,
    },
    checkRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#334155",
        gap: 12,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#475569",
        alignItems: "center",
        justifyContent: "center",
    },
    checkmark: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "700",
    },
    checkEmoji: {
        fontSize: 18,
    },
    checkLabel: {
        fontSize: 15,
        color: "#e2e8f0",
        fontWeight: "500",
    },
    btnRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
    },
    btnClear: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#475569",
        alignItems: "center",
    },
    btnClearText: {
        color: "#94a3b8",
        fontSize: 15,
        fontWeight: "600",
    },
    btnApply: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#3b82f6",
        alignItems: "center",
    },
    btnApplyText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "700",
    },
});
