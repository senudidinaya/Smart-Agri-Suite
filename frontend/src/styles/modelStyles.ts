import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    // ===== LAYOUT =====
    safeArea: {
        flex: 1,
        backgroundColor: "#f8fafc"},

    scrollContainer: {
        padding: 16,
        paddingTop: 8,
        paddingBottom: 32,
        backgroundColor: "#f8fafc"},

    // ===== CARD =====
    card: {
        backgroundColor: "#fff",
        borderRadius: 22,
        padding: 18,
        marginBottom: 16,
        borderLeftWidth: 6,
        borderLeftColor: "#cbd5e1",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2},

    heroCard: {
        backgroundColor: "#d1fae5",
        borderLeftColor: "#16a34a",
        borderWidth: 1,
        borderColor: "#a7f3d0"},

    heroTitle: {
        fontSize: 28,
        fontWeight: "900",
        color: "#065f46",
        letterSpacing: 0.3,
        marginBottom: 6},

    heroSubtitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#166534",
        lineHeight: 20,
        marginBottom: 12},

    domainChip: {
        alignSelf: "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        marginTop: 6},

    domainChipText: {
        fontSize: 14,
        fontWeight: "900"},

    centerCard: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 30},

    errorCard: {
        backgroundColor: "#fef2f2",
        borderLeftColor: "#dc2626"},

    errorTitle: {
        fontSize: 17,
        fontWeight: "900",
        color: "#dc2626",
        marginBottom: 8},

    errorText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#991b1b",
        marginBottom: 16,
        lineHeight: 20},

    loadingText: {
        fontSize: 15,
        fontWeight: "800",
        color: "#64748b",
        marginTop: 12},

    // ===== CARD HEADER =====
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
        gap: 10},

    cardTitle: {
        fontSize: 17,
        fontWeight: "900",
        color: "#0f172a",
        flex: 1},

    cardBadge: {
        fontSize: 11,
        fontWeight: "800",
        backgroundColor: "#f0f0f0",
        color: "#64748b",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999},

    cardDescription: {
        fontSize: 13,
        fontWeight: "700",
        color: "#64748b",
        marginTop: 4},

    // ===== CONFIDENCE =====
    confidenceBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        alignSelf: "flex-start"},

    confidenceBadgeText: {
        fontSize: 12,
        fontWeight: "900"},

    confidenceDisplay: {
        marginVertical: 12},

    bigNumber: {
        fontSize: 42,
        fontWeight: "900",
        color: "#0f172a",
        marginBottom: 12},

    // ===== PROGRESS BAR =====
    progressTrack: {
        height: 12,
        backgroundColor: "#e5e7eb",
        borderRadius: 999,
        overflow: "hidden"},

    progressFill: {
        height: "100%",
        borderRadius: 999},

    meaningText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#475569",
        marginTop: 12,
        lineHeight: 18},

    // ===== SEGMENT BAR =====
    segmentTrack: {
        height: 14,
        backgroundColor: "#e5e7eb",
        borderRadius: 999,
        overflow: "hidden",
        flexDirection: "row",
        marginVertical: 12},

    segment: {
        height: "100%"},

    // ===== LEGEND =====
    legendContainer: {
        marginTop: 14,
        gap: 8},

    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10},

    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6},

    legendLabel: {
        fontSize: 13,
        fontWeight: "800",
        color: "#1e293b",
        flex: 1},

    bold: {
        fontWeight: "900"},

    footnoteText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        marginTop: 10,
        fontStyle: "italic"},

    // ===== HISTOGRAM =====
    histogramSection: {
        marginTop: 14,
        marginBottom: 14},

    histogramTitle: {
        fontSize: 14,
        fontWeight: "900",
        color: "#0f172a",
        marginBottom: 10},

    histogramBox: {
        backgroundColor: "#f3f4f6",
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 10},

    histogramRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        height: 78,
        width: "100%",
        gap: 5},

    histogramBar: {
        flex: 1,
        borderRadius: 6,
        backgroundColor: "#2563eb"},

    translationBox: {
        marginTop: 10,
        backgroundColor: "#ecfdf5",
        borderWidth: 1,
        borderColor: "#a7f3d0",
        borderRadius: 14,
        padding: 12},

    translationTitle: {
        fontSize: 13,
        fontWeight: "900",
        color: "#065f46",
        marginBottom: 8},

    translationText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#166534",
        lineHeight: 17,
        marginBottom: 4},

    directionHint: {
        fontSize: 13,
        fontWeight: "900",
        marginTop: 6,
        lineHeight: 18},

    // ===== MEANS GRID =====
    meansGrid: {
        marginTop: 14,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10},

    meanChip: {
        flex: 1,
        minWidth: 140,
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 14,
        padding: 12,
        alignItems: "center"},

    meanChipLabel: {
        fontSize: 11,
        fontWeight: "900",
        color: "#64748b",
        marginBottom: 6},

    meanChipValue: {
        fontSize: 22,
        fontWeight: "900",
        color: "#0f172a",
        marginBottom: 4,
        textAlign: "center"},

    meanChipHint: {
        fontSize: 10,
        fontWeight: "700",
        color: "#94a3b8",
        textAlign: "center"},

    // ===== NEXT STEPS CARD =====
    nextStepsCard: {
        backgroundColor: "#f0fdf4",
        borderLeftColor: "#16a34a"},

    stepRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10},

    nextStepsContainer: {
        gap: 10,
        marginTop: 12},

    stepEmoji: {
        fontSize: 20,
        marginTop: 2},

    stepText: {
        flex: 1,
        fontSize: 13,
        fontWeight: "800",
        color: "#14532d",
        lineHeight: 19},

    emptyText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#94a3b8",
        textAlign: "center",
        marginVertical: 12,
        fontStyle: "italic"},

    // ===== TOGGLE BUTTON =====
    toggleBtn: {
        backgroundColor: "#111827",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2},

    toggleBtnText: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 15},

    // ===== RAW JSON =====
    rawBox: {
        backgroundColor: "#0b1020",
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
        marginBottom: 12},

    rawText: {
        color: "#e5e7eb",
        fontFamily: "monospace",
        fontSize: 11,
        lineHeight: 16},

    // ===== RETRY BUTTON =====
    retryBtn: {
        marginTop: 12,
        backgroundColor: "#111827",
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center"},

    retryBtnText: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 14},

    spacer: {
        height: 24}});

export default styles;
