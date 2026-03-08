import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "space-between"
    },

    // ===== HEADER =====
    headerContainer: {
        backgroundColor: "transparent",
        paddingBottom: 0
    },

    dashboardContainer: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 24,
        paddingVertical: 5,
        paddingHorizontal: 5,
        flexDirection: "row",
        gap: 4,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5
    },

    dashboardBtn: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 18,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
        position: "relative"
    },

    dashboardBtnActive: {
        backgroundColor: "#e0f2fe"
    },

    dashboardBtnText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748b"
    },

    dashboardBtnTextActive: {
        color: "#0284c7",
        fontWeight: "700"
    },

    // ===== TOOLBOX =====
    toolboxContainer: {
        position: "absolute",
        right: 16,
        alignItems: "flex-end"
    },

    toolboxGrid: {
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        borderRadius: 24,
        padding: 8,
        gap: 8,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6
    },

    toolboxBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: "#f0f4f8",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "rgba(59, 130, 246, 0.1)"
    },

    toolboxBtnActive: {
        backgroundColor: "#dbeafe",
        borderColor: "#0284c7"
    },

    toolboxBtnText: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0f172a"
    },

    // ===== BOTTOM CONTROLS =====
    bottomControlsContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -2 },
        elevation: 3
    },

    errorBanner: {
        backgroundColor: "#fee2e2",
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: "#dc2626",
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10
    },

    errorText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#7f1d1d"
    },

    areaBanner: {
        backgroundColor: "#dbeafe",
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: "#0284c7",
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10
    },

    areaText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#0c4a6e"
    },

    bottomControls: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center"
    },

    actionBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2
    },

    cancelBtn: {
        backgroundColor: "#ef4444",
        minWidth: 70
    },

    undoBtn: {
        backgroundColor: "#f59e0b"
    },

    analyzeBtn: {
        backgroundColor: "#10b981",
        minWidth: 50
    },

    disabledBtn: {
        backgroundColor: "#cbd5e1",
        opacity: 0.6
    },

    actionBtnText: {
        fontWeight: "700",
        color: "white",
        fontSize: 13
    },

    pointInfo: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e5e7eb"
    },

    pointInfoText: {
        fontWeight: "700",
        color: "#0f172a",
        fontSize: 12
    },

    // ===== LEGEND =====
    legendBox: {
        position: "absolute",
        left: 16,
        bottom: 20,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 10,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3
    },

    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 8
    },

    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6
    },

    legendDotVegetation: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#22c55e"
    },

    legendDotIdle: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#f59e0b"
    },

    legendDotBuilt: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#9ca3af"
    },

    legendText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1e293b"
    },

    // ===== SELECTION SHEET =====
    selectionSheet: {
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 20,
        backgroundColor: "white",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4
    },

    sheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#f8fafc",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24
    },

    sheetTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0f172a"
    },

    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#f1f5f9",
        alignItems: "center",
        justifyContent: "center"
    },

    closeBtnText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#64748b"
    },

    sheetContent: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12
    },

    coordLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569"
    },

    statusBadge: {
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 10,
        alignItems: "center"
    },

    statusBadgeInside: {
        backgroundColor: "#dcfce7"
    },

    statusBadgeOutside: {
        backgroundColor: "#fee2e2"
    },

    statusText: {
        fontSize: 13,
        fontWeight: "700"
    },

    statusTextInside: {
        color: "#16a34a"
    },

    statusTextOutside: {
        color: "#ef4444"
    },

    analyzePointBtn: {
        backgroundColor: "#10b981",
        paddingVertical: 11,
        borderRadius: 10,
        alignItems: "center",
        shadowColor: "#10b981",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2
    },

    analyzePointBtnDisabled: {
        backgroundColor: "#cbd5e1",
        opacity: 0.6
    },

    analyzePointBtnText: {
        color: "white",
        fontWeight: "700",
        fontSize: 14
    },

    // ===== SAFE AREA ROOT =====
    safeArea: {
        flex: 1,
        backgroundColor: "#f8fafc"
    }
});

export default styles;
