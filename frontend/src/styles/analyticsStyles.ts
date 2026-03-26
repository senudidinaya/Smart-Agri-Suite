import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    // ===== LAYOUT =====
    safeArea: {
        flex: 1,
        backgroundColor: "#f8fafc"},

    centerContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: 20},

    scrollContainer: {
        padding: 16,
        paddingTop: 8,
        paddingBottom: 32,
        backgroundColor: "#f8fafc"},

    // ===== HEADER =====
    headerSection: {
        marginBottom: 20},

    pageTitle: {
        fontSize: 28,
        fontWeight: "900",
        color: "#0f172a",
        letterSpacing: 0.3},

    pageSubtitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#64748b",
        marginTop: 4},

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

    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14},

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
        marginTop: 4,
        marginBottom: 14},

    errorCard: {
        backgroundColor: "#fef2f2",
        borderLeftColor: "#dc2626"},

    errorTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: "#dc2626",
        marginBottom: 8},

    errorText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#991b1b",
        marginBottom: 16,
        lineHeight: 20},

    warningCard: {
        backgroundColor: "#fffbeb",
        borderLeftColor: "#ca8a04"},

    warningTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: "#ca8a04",
        marginBottom: 8},

    warningText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#92400e",
        marginBottom: 16,
        lineHeight: 20},

    loadingText: {
        fontSize: 16,
        fontWeight: "800",
        color: "#64748b",
        marginTop: 12},

    // ===== PREDICTION =====
    predictionBox: {
        marginBottom: 12},

    landLabelChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 14,
        marginBottom: 12,
        alignSelf: "flex-start",
        minWidth: 100},

    landLabelText: {
        fontSize: 16,
        fontWeight: "900",
        textAlign: "center"},

    confidenceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 4},

    confidenceValue: {
        fontSize: 22,
        fontWeight: "900",
        color: "#0f172a",
        minWidth: 50},

    confidenceBar: {
        flex: 1,
        height: 12,
        backgroundColor: "#e5e7eb",
        borderRadius: 999,
        overflow: "hidden"},

    confidenceFill: {
        height: "100%",
        borderRadius: 999},

    smallText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        marginTop: 10,
        lineHeight: 18},

    descriptionText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#475569",
        marginTop: 12,
        lineHeight: 18},

    // ===== DIVIDER =====
    divider: {
        height: 1,
        backgroundColor: "#e5e7eb",
        marginVertical: 14},

    // ===== INDEX BLOCK =====
    indexBlock: {
        marginBottom: 10},

    indexHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        gap: 12},

    metricLabel: {
        fontSize: 14,
        fontWeight: "800",
        color: "#1e293b",
        flex: 1},

    metricValue: {
        fontSize: 18,
        fontWeight: "900",
        color: "#0f172a",
        minWidth: 45,
        textAlign: "right"},

    unitText: {
        fontSize: 12,
        fontWeight: "600"},

    barContainer: {
        marginVertical: 8},

    barBackground: {
        height: 12,
        backgroundColor: "#e5e7eb",
        borderRadius: 999,
        overflow: "hidden"},

    barRow: {
        flexDirection: "row",
        width: "100%",
        height: "100%"},

    statusTitle: {
        fontSize: 14,
        fontWeight: "900",
        marginTop: 10,
        marginBottom: 6},

    statusChip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        marginVertical: 8},

    statusChipText: {
        fontSize: 12,
        fontWeight: "800"},

    explainText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#475569",
        marginTop: 6,
        lineHeight: 17},

    tipText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#a16207",
        marginTop: 6,
        lineHeight: 17},

    hintText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#64748b",
        marginTop: 4},

    terrainRow: {
        marginVertical: 8},

    // ===== SPICE CARD =====
    spiceCardWrapper: {
        backgroundColor: "#f8f9fa",
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        borderLeftWidth: 5,
        borderLeftColor: "#cbd5e1"},

    spiceCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
        gap: 8},

    spiceName: {
        fontSize: 16,
        fontWeight: "900",
        color: "#0f172a",
        flex: 1},

    labelPill: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        alignSelf: "flex-start"},

    labelPillText: {
        fontSize: 11,
        fontWeight: "900"},

    scoreRow: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 6,
        marginBottom: 10},

    scoreNum: {
        fontSize: 24,
        fontWeight: "900",
        color: "#0f172a"},

    scoreOutOf: {
        fontSize: 12,
        fontWeight: "800",
        color: "#64748b"},

    ruleConf: {
        fontSize: 11,
        fontWeight: "800",
        color: "#64748b",
        marginLeft: "auto"},

    barExplain: {
        fontSize: 11,
        fontWeight: "700",
        color: "#475569",
        marginTop: 8,
        lineHeight: 16},

    bold: {
        fontWeight: "900"},

    spiceNote: {
        fontSize: 12,
        fontWeight: "800",
        color: "#64748b",
        marginTop: 8},

    reasonText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#475569",
        lineHeight: 17,
        marginBottom: 4},

    reasonsContainer: {
        marginTop: 10},

    toggleBtn: {
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: "center"},

    toggleBtnText: {
        fontWeight: "900",
        color: "#0f172a",
        fontSize: 13},

    afterImprovementContainer: {
        marginTop: 12},

    afterTitle: {
        fontSize: 13,
        fontWeight: "800",
        color: "#475569",
        marginBottom: 8},

    afterBarContainer: {
        marginTop: 12},

    showBoostContainer: {
        marginTop: 12},

    recommendationBox: {
        backgroundColor: "#f0fdf4",
        borderWidth: 1,
        borderColor: "#bbf7d0",
        borderRadius: 14,
        padding: 12,
        marginTop: 12},

    recTitle: {
        fontSize: 13,
        fontWeight: "900",
        color: "#14532d"},

    recHeadline: {
        fontSize: 13,
        fontWeight: "900",
        color: "#14532d",
        marginTop: 6,
        lineHeight: 18},

    recStep: {
        fontSize: 12,
        fontWeight: "800",
        color: "#14532d",
        lineHeight: 17,
        marginTop: 6},

    recStepsContainer: {
        marginTop: 10},

    // ===== INTERCROPPING =====
    pairSubtitle: {
        fontSize: 13,
        fontWeight: "900",
        color: "#0f172a",
        marginBottom: 8},

    pairSubtitleWarning: {
        marginTop: 12},

    pairRow: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#f0fdf4",
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#16a34a",
        marginBottom: 8},

    pairRowWarning: {
        backgroundColor: "#fef3c7",
        borderLeftColor: "#ca8a04"},

    pairTitle: {
        fontSize: 13,
        fontWeight: "900",
        color: "#0f172a"},

    pairWhy: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        marginTop: 4,
        lineHeight: 16},

    emptyText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#94a3b8",
        textAlign: "center",
        paddingVertical: 16,
        fontStyle: "italic"},

    // ===== FARMER SUMMARY =====
    summaryHeadline: {
        fontSize: 16,
        fontWeight: "900",
        color: "#065f46",
        marginTop: 10,
        marginBottom: 10,
        lineHeight: 22},

    bulletPoint: {
        fontSize: 13,
        fontWeight: "700",
        color: "#374151",
        lineHeight: 19,
        marginBottom: 6},

    summaryTip: {
        fontSize: 12,
        fontWeight: "700",
        color: "#16a34a",
        marginTop: 12,
        lineHeight: 17},

    // ===== PRIMARY BUTTON =====
    primaryBtn: {
        backgroundColor: "#16a34a",
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        shadowColor: "#16a34a",
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2},

    primaryBtnText: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 16,
        letterSpacing: 0.2},

    spacer: {
        height: 24}});

export default styles;
