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

    // ===== CARD BASE =====
    card: {
        backgroundColor: "#fff",
        borderRadius: 22,
        padding: 18,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2},

    heroCard: {
        backgroundColor: "#dcfce7",
        borderWidth: 1,
        borderColor: "#a7f3d0",
        paddingVertical: 22,
        marginBottom: 18},

    heroTitle: {
        fontSize: 26,
        fontWeight: "900",
        color: "#14532d",
        letterSpacing: 0.3,
        marginBottom: 6},

    heroSubtitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#16a34a",
        marginBottom: 12},

    heroDescription: {
        fontSize: 14,
        fontWeight: "700",
        color: "#065f46",
        lineHeight: 21},

    // ===== CARD ICON HEADER =====
    cardIconHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
        gap: 10},

    cardIcon: {
        fontSize: 24},

    cardTitle: {
        fontSize: 17,
        fontWeight: "900",
        flex: 1,
        letterSpacing: 0.2},

    // ===== CARD TITLE VARIANTS =====
    cardTitlePurple: {
        color: "#4c1d95"},

    cardTitleBlue: {
        color: "#1e3a8a"},

    cardTitleAmber: {
        color: "#92400e"},

    cardTitleGreen: {
        color: "#065f46"},

    cardTitlePink: {
        color: "#9f1239"},

    cardTitleTeal: {
        color: "#0f766e"},

    cardTitleOrange: {
        color: "#9a3412"},

    // ===== CARD BACKGROUND VARIANTS =====
    cardPurple: {
        backgroundColor: "#f5f3ff",
        borderTopWidth: 2,
        borderTopColor: "#8b5cf6"},

    cardBlue: {
        backgroundColor: "#eff6ff",
        borderTopWidth: 2,
        borderTopColor: "#2563eb"},

    cardAmber: {
        backgroundColor: "#fffbeb",
        borderTopWidth: 2,
        borderTopColor: "#ca8a04"},

    cardGreen: {
        backgroundColor: "#ecfdf5",
        borderTopWidth: 2,
        borderTopColor: "#16a34a"},

    cardPink: {
        backgroundColor: "#fff1f2",
        borderTopWidth: 2,
        borderTopColor: "#dc2626"},

    cardTeal: {
        backgroundColor: "#f0fdfa",
        borderTopWidth: 2,
        borderTopColor: "#14b8a6"},

    cardOrange: {
        backgroundColor: "#fffbeb",
        borderTopWidth: 2,
        borderTopColor: "#ea580c"},

    // ===== FEATURE GRID =====
    featureGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10},

    featureCardWrapper: {
        width: "48%",
        backgroundColor: "#f8fafc",
        borderTopWidth: 4,
        borderRadius: 14,
        padding: 12,
        alignItems: "center",
        borderColor: "#cbd5e1"},

    featureEmoji: {
        fontSize: 28,
        marginBottom: 8},

    featureText: {
        fontSize: 13,
        fontWeight: "900",
        color: "#0f172a",
        textAlign: "center",
        marginBottom: 4},

    featureDesc: {
        fontSize: 11,
        fontWeight: "700",
        color: "#64748b",
        textAlign: "center",
        lineHeight: 15},

    // ===== INFO BOX =====
    infoBox: {
        backgroundColor: "#eff6ff",
        borderLeftWidth: 4,
        borderLeftColor: "#2563eb",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 12},

    infoText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#1e3a8a",
        lineHeight: 17},

    // ===== STEP CARD =====
    stepRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
        gap: 12},

    stepNumberCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#fef3c7",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#ca8a04"},

    stepNumber: {
        fontSize: 18,
        fontWeight: "900",
        color: "#92400e"},

    stepContent: {
        flex: 1,
        paddingTop: 2},

    stepTitle: {
        fontSize: 14,
        fontWeight: "900",
        color: "#0f172a",
        marginBottom: 4},

    stepDesc: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        lineHeight: 16},

    helperText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#065f46",
        marginTop: 10,
        backgroundColor: "#dcfce7",
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        textAlign: "center"},

    // ===== COLOR LEGEND =====
    colorLegendRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 12},

    colorDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        flexShrink: 0},

    colorLegendContent: {
        flex: 1},

    colorLegendTitle: {
        fontSize: 14,
        fontWeight: "900",
        marginBottom: 2},

    colorLegendDesc: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        lineHeight: 16},

    colorTip: {
        backgroundColor: "#f0fdf4",
        borderLeftWidth: 4,
        borderLeftColor: "#16a34a",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginTop: 12},

    colorTipText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#14532d",
        lineHeight: 17},

    // ===== USER CARD =====
    userCardRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        marginBottom: 10,
        gap: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#dc2626"},

    userEmoji: {
        fontSize: 22},

    userText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#0f172a",
        flex: 1},

    userNote: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        marginTop: 10,
        fontStyle: "italic",
        lineHeight: 17},

    // ===== FEATURE HIGHLIGHT =====
    featureHighlightRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9"},

    featureHighlightIcon: {
        fontSize: 24,
        marginTop: 2},

    featureHighlightContent: {
        flex: 1},

    featureHighlightTitle: {
        fontSize: 14,
        fontWeight: "900",
        color: "#0f172a",
        marginBottom: 4},

    featureHighlightDesc: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        lineHeight: 17},

    // ===== TIP ITEM =====
    tipRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 10,
        gap: 10},

    tipEmoji: {
        fontSize: 18,
        marginTop: 2},

    tipText: {
        flex: 1,
        fontSize: 13,
        fontWeight: "800",
        color: "#0f172a",
        lineHeight: 18},

    tipsFooter: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: "#f9fafb",
        borderRadius: 10,
        lineHeight: 17,
        fontStyle: "italic"},

    // ===== CTA BUTTON =====
    ctaButton: {
        backgroundColor: "#16a34a",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        shadowColor: "#16a34a",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4},

    ctaButtonText: {
        color: "#fff",
        fontWeight: "900",
        fontSize: 17,
        letterSpacing: 0.3},

    // ===== FOOTER TIP =====
    footerTip: {
        backgroundColor: "#d1fae5",
        borderWidth: 1,
        borderColor: "#a7f3d0",
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginTop: 16,
        alignItems: "center"},

    footerTipText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#065f46",
        textAlign: "center",
        lineHeight: 18},

    // ===== UTILITIES =====
    bodyText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 6,
        lineHeight: 18},

    bodySub: {
        fontSize: 12,
        fontWeight: "700",
        color: "#64748b",
        lineHeight: 17},

    bold: {
        fontWeight: "900"},

    spacer: {
        height: 24}});

export default styles;
