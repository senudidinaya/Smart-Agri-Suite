import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable
} from "react-native";
import { useRouter } from "expo-router";

// ==================== MAIN SCREEN ====================
export default function OverviewScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
      }}>
        <Pressable
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#f1f5f9",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              gap: 6,
            },
            pressed && { opacity: 0.7, backgroundColor: "#e2e8f0" }
          ]}
          onPress={() => router.replace("/")}
        >
          <Text style={{ fontSize: 16, color: "#334155", fontWeight: "800" }}>←</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#334155" }}>Back to Hub</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== HERO SECTION ====================*/}
        <View style={[styles.card, styles.heroCard]}>
          <Text style={styles.heroTitle}>🌱 Spice Cultivation Optimization</Text>
          <Text style={styles.heroSubtitle}>
            Through Idle Land Mobilization
          </Text>
          <Text style={styles.heroDescription}>
            Understand your land condition and get simple farming guidance using
            satellite data. Tap a location on the map to analyze its potential
            for spice cultivation.
          </Text>
        </View>

        {/* ==================== WHAT CAN THIS APP DO ====================*/}
        <View style={[styles.card, styles.cardPurple]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>✨</Text>
            <Text style={[styles.cardTitle, styles.cardTitlePurple]}>
              What can this app help you with?
            </Text>
          </View>

          <View style={styles.featureGrid}>
            <FeatureCard
              emoji="🗺️"
              text="Check land type"
              desc="Vegetation / Idle / Built-up"
              color="#8b5cf6"
            />
            <FeatureCard
              emoji="💧"
              text="Water & vegetation"
              desc="Health indicators"
              color="#06b6d4"
            />
            <FeatureCard
              emoji="🌶️"
              text="Crop suitability"
              desc="Which spices fit best"
              color="#ea580c"
            />
            <FeatureCard
              emoji="🌱"
              text="Intercropping advice"
              desc="Grow multiple crops"
              color="#16a34a"
            />
          </View>
        </View>

        {/* ==================== STUDY AREA ====================*/}
        <View style={[styles.card, styles.cardBlue]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>📍</Text>
            <Text style={[styles.cardTitle, styles.cardTitleBlue]}>
              Study Area
            </Text>
          </View>

          <Text style={styles.bodyText}>
            This analysis covers land inside the{" "}
            <Text style={styles.bold}>blue AOI boundary (Malabe area)</Text>.
          </Text>
          <Text style={styles.bodySub}>
            Satellite imagery is used to assess land conditions and potential.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Higher resolution data helps us understand terrain, vegetation
              health, and moisture levels.
            </Text>
          </View>
        </View>

        {/* ==================== HOW TO USE ====================*/}
        <View style={[styles.card, styles.cardAmber]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>❗</Text>
            <Text style={[styles.cardTitle, styles.cardTitleAmber]}>
              How to use this app
            </Text>
          </View>

          <StepCard
            number="1"
            emoji="🗺️"
            text="Go to Map"
            desc="Tap the Map tab at the bottom"
          />
          <StepCard
            number="2"
            emoji="📍"
            text="Select a location"
            desc="Tap inside the blue AOI boundary"
          />
          <StepCard
            number="3"
            emoji="📊"
            text="View analytics"
            desc="Get land health & crop recommendations"
          />

          <Text style={styles.helperText}>
            ✓ No technical knowledge needed. Tap and explore!
          </Text>
        </View>

        {/* ==================== COLOR MEANINGS ====================*/}
        <View style={[styles.card, styles.cardGreen]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>🎨</Text>
            <Text style={[styles.cardTitle, styles.cardTitleGreen]}>
              Color meanings
            </Text>
          </View>

          <ColorLegend
            color="#16a34a"
            title="Green (Good)"
            desc="Good for farming • Healthy conditions"
          />
          <ColorLegend
            color="#ca8a04"
            title="Amber (Moderate)"
            desc="Needs care • With management possible"
          />
          <ColorLegend
            color="#dc2626"
            title="Red (Poor)"
            desc="Improvement needed • Plan ahead"
          />

          <View style={styles.colorTip}>
            <Text style={styles.colorTipText}>
              💡 Colors appear in charts, scores, and status indicators to help
              you quickly understand land conditions.
            </Text>
          </View>
        </View>

        {/* ==================== WHO CAN USE ====================*/}
        <View style={[styles.card, styles.cardPink]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>👨‍🌾</Text>
            <Text style={[styles.cardTitle, styles.cardTitlePink]}>
              Who can use this app?
            </Text>
          </View>

          <UserCard emoji="👨‍🌾" text="Farmers & Landowners" />
          <UserCard emoji="🏛️" text="Agriculture Officers" />
          <UserCard emoji="🎓" text="Students & Researchers" />
          <UserCard emoji="🌍" text="Environmental Planners" />

          <Text style={styles.userNote}>
            This tool is designed for anyone interested in understanding land
            potential for agricultural use.
          </Text>
        </View>

        {/* ==================== KEY FEATURES ====================*/}
        <View style={[styles.card, styles.cardTeal]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>⭐</Text>
            <Text style={[styles.cardTitle, styles.cardTitleTeal]}>
              Key features
            </Text>
          </View>

          <FeatureHighlight
            icon="📊"
            title="Satellite Analytics"
            desc="Real-time vegetation, moisture & terrain data"
          />
          <FeatureHighlight
            icon="🤖"
            title="ML Model"
            desc="Predicts land type: Vegetation, Idle, or Built-up"
          />
          <FeatureHighlight
            icon="🌶️"
            title="Spice Scoring"
            desc="Personalized suitability for Cinnamon, Pepper, Clove & Cardamom"
          />
          <FeatureHighlight
            icon="🌱"
            title="Intercropping"
            desc="Smart recommendations for growing multiple crops together"
          />
          <FeatureHighlight
            icon="👨‍🌾"
            title="Farmer-Friendly"
            desc="Simple language & practical guidance, no jargon"
          />
        </View>

        {/* ==================== TIPS & BEST PRACTICES ====================*/}
        <View style={[styles.card, styles.cardOrange]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>💡</Text>
            <Text style={[styles.cardTitle, styles.cardTitleOrange]}>
              Tips for best results
            </Text>
          </View>

          <TipItem emoji="📍" text="Tap multiple points across your land to see variations" />
          <TipItem emoji="🔍" text="Zoom in for more detailed analysis in specific areas" />
          <TipItem emoji="🗺️" text="Check satellite view for visual context" />
          <TipItem emoji="📋" text="Compare scores with field observations" />
          <TipItem emoji="🌱" text="Use recommendations as a starting point for planning" />

          <Text style={styles.tipsFooter}>
            Remember: Satellite analysis is a tool to help planning, not a
            replacement for field knowledge and local expertise.
          </Text>
        </View>

        {/* ==================== CTA BUTTON ====================*/}
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push("/map")}
        >
          <Text style={styles.ctaButtonText}>🗺️ Open Map & Analyze</Text>
        </Pressable>

        {/* ==================== FOOTER TIP ====================*/}
        <View style={styles.footerTip}>
          <Text style={styles.footerTipText}>
            🌍 Tip: Tap anywhere inside the blue boundary on the map to start
            analyzing land!
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ==================== SUB-COMPONENTS ====================

function FeatureCard({
  emoji,
  text,
  desc,
  color }: {
    emoji: string;
    text: string;
    desc: string;
    color: string;
  }) {
  return (
    <View style={[styles.featureCardWrapper, { borderTopColor: color }]}>
      <Text style={[styles.featureEmoji, { color }]}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
      <Text style={styles.featureDesc}>{desc}</Text>
    </View>
  );
}

function StepCard({
  number,
  emoji,
  text,
  desc }: {
    number: string;
    emoji: string;
    text: string;
    desc: string;
  }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumberCircle}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>
          {emoji} {text}
        </Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function ColorLegend({
  color,
  title,
  desc }: {
    color: string;
    title: string;
    desc: string;
  }) {
  return (
    <View style={styles.colorLegendRow}>
      <View style={[styles.colorDot, { backgroundColor: color }]} />
      <View style={styles.colorLegendContent}>
        <Text style={[styles.colorLegendTitle, { color }]}>{title}</Text>
        <Text style={styles.colorLegendDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function UserCard({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.userCardRow}>
      <Text style={styles.userEmoji}>{emoji}</Text>
      <Text style={styles.userText}>{text}</Text>
    </View>
  );
}

function FeatureHighlight({
  icon,
  title,
  desc }: {
    icon: string;
    title: string;
    desc: string;
  }) {
  return (
    <View style={styles.featureHighlightRow}>
      <Text style={styles.featureHighlightIcon}>{icon}</Text>
      <View style={styles.featureHighlightContent}>
        <Text style={styles.featureHighlightTitle}>{title}</Text>
        <Text style={styles.featureHighlightDesc}>{desc}</Text>
      </View>
    </View>
  );
}

function TipItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.tipRow}>
      <Text style={styles.tipEmoji}>{emoji}</Text>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  scrollContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
    backgroundColor: "#f8fafc"
  },

  // ===== CARD STYLES =====
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },

  heroCard: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    paddingVertical: 22,
    marginBottom: 18
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#14532d",
    letterSpacing: 0.3,
    marginBottom: 6
  },

  heroSubtitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#16a34a",
    marginBottom: 12
  },

  heroDescription: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065f46",
    lineHeight: 21
  },

  cardIconHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10
  },

  cardIcon: {
    fontSize: 24
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    flex: 1,
    letterSpacing: 0.2
  },

  cardTitlePurple: {
    color: "#4c1d95"
  },

  cardTitleBlue: {
    color: "#1e3a8a"
  },

  cardTitleAmber: {
    color: "#92400e"
  },

  cardTitleGreen: {
    color: "#065f46"
  },

  cardTitlePink: {
    color: "#9f1239"
  },

  cardTitleTeal: {
    color: "#0f766e"
  },

  cardTitleOrange: {
    color: "#9a3412"
  },

  cardPurple: {
    backgroundColor: "#f5f3ff",
    borderTopWidth: 2,
    borderTopColor: "#8b5cf6"
  },

  cardBlue: {
    backgroundColor: "#eff6ff",
    borderTopWidth: 2,
    borderTopColor: "#2563eb"
  },

  cardAmber: {
    backgroundColor: "#fffbeb",
    borderTopWidth: 2,
    borderTopColor: "#ca8a04"
  },

  cardGreen: {
    backgroundColor: "#ecfdf5",
    borderTopWidth: 2,
    borderTopColor: "#16a34a"
  },

  cardPink: {
    backgroundColor: "#fff1f2",
    borderTopWidth: 2,
    borderTopColor: "#dc2626"
  },

  cardTeal: {
    backgroundColor: "#f0fdfa",
    borderTopWidth: 2,
    borderTopColor: "#14b8a6"
  },

  cardOrange: {
    backgroundColor: "#fffbeb",
    borderTopWidth: 2,
    borderTopColor: "#ea580c"
  },

  // ===== FEATURE GRID =====
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },

  featureCardWrapper: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderTopWidth: 4,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderColor: "#cbd5e1"
  },

  featureEmoji: {
    fontSize: 28,
    marginBottom: 8
  },

  featureText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 4
  },

  featureDesc: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 15
  },

  // ===== INFO BOX =====
  infoBox: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12
  },

  infoText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e3a8a",
    lineHeight: 17
  },

  // ===== STEP CARD =====
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12
  },

  stepNumberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ca8a04"
  },

  stepNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: "#92400e"
  },

  stepContent: {
    flex: 1,
    paddingTop: 2
  },

  stepTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4
  },

  stepDesc: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    lineHeight: 16
  },

  helperText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065f46",
    marginTop: 10,
    backgroundColor: "#dcfce7",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    textAlign: "center"
  },

  // ===== COLOR LEGEND =====
  colorLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12
  },

  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    flexShrink: 0
  },

  colorLegendContent: {
    flex: 1
  },

  colorLegendTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 2
  },

  colorLegendDesc: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    lineHeight: 16
  },

  colorTip: {
    backgroundColor: "#f0fdf4",
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12
  },

  colorTipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#14532d",
    lineHeight: 17
  },

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
    borderLeftColor: "#dc2626"
  },

  userEmoji: {
    fontSize: 22
  },

  userText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    flex: 1
  },

  userNote: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginTop: 10,
    fontStyle: "italic",
    lineHeight: 17
  },

  // ===== FEATURE HIGHLIGHT =====
  featureHighlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9"
  },

  featureHighlightIcon: {
    fontSize: 24,
    marginTop: 2
  },

  featureHighlightContent: {
    flex: 1
  },

  featureHighlightTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4
  },

  featureHighlightDesc: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    lineHeight: 17
  },

  // ===== TIP ITEM =====
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10
  },

  tipEmoji: {
    fontSize: 18,
    marginTop: 2
  },

  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 18
  },

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
    fontStyle: "italic"
  },

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
    elevation: 4
  },

  ctaButtonText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
    letterSpacing: 0.3
  },

  // ===== FOOTER TIP =====
  footerTip: {
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 16,
    alignItems: "center"
  },

  footerTipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065f46",
    textAlign: "center",
    lineHeight: 18
  },

  // ===== UTILITIES =====
  bodyText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
    lineHeight: 18
  },

  bodySub: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    lineHeight: 17
  },

  bold: {
    fontWeight: "900"
  }
});