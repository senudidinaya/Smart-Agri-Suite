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
import { useLanguage } from "../../context/LanguageContext";

// ==================== MAIN SCREEN ====================
export default function OverviewScreen() {
  const router = useRouter();
  const { langConfig } = useLanguage();

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
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#334155" }}>{langConfig['common.backToHub']}</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== HERO SECTION ====================*/}
        <View style={[styles.card, styles.heroCard]}>
          <Text style={styles.heroTitle}>{langConfig['ov.heroTitle']}</Text>
          <Text style={styles.heroSubtitle}>
            {langConfig['ov.heroSub']}
          </Text>
          <Text style={styles.heroDescription}>
            {langConfig['ov.heroDesc']}
          </Text>
        </View>

        {/* ==================== WHAT CAN THIS APP DO ====================*/}
        <View style={[styles.card, styles.cardPurple]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>✨</Text>
            <Text style={[styles.cardTitle, styles.cardTitlePurple]}>
              {langConfig['ov.whatAppDo']}
            </Text>
          </View>

          <View style={styles.featureGrid}>
            <FeatureCard
              emoji="🗺️"
              text={langConfig['ov.f1.title']}
              desc={langConfig['ov.f1.desc']}
              color="#8b5cf6"
            />
            <FeatureCard
              emoji="💧"
              text={langConfig['ov.f2.title']}
              desc={langConfig['ov.f2.desc']}
              color="#06b6d4"
            />
            <FeatureCard
              emoji="🌶️"
              text={langConfig['ov.f3.title']}
              desc={langConfig['ov.f3.desc']}
              color="#ea580c"
            />
            <FeatureCard
              emoji="🌱"
              text={langConfig['ov.f4.title']}
              desc={langConfig['ov.f4.desc']}
              color="#16a34a"
            />
          </View>
        </View>

        {/* ==================== STUDY AREA ====================*/}
        <View style={[styles.card, styles.cardBlue]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>📍</Text>
            <Text style={[styles.cardTitle, styles.cardTitleBlue]}>
              {langConfig['ov.studyArea']}
            </Text>
          </View>

          <Text style={styles.bodyText}>
            {langConfig['ov.studyDesc1']}
            <Text style={styles.bold}>{langConfig['ov.studyDescBlue']}</Text>
          </Text>
          <Text style={styles.bodySub}>
            {langConfig['ov.studyDesc2']}
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {langConfig['ov.studyTip']}
            </Text>
          </View>
        </View>

        {/* ==================== HOW TO USE ====================*/}
        <View style={[styles.card, styles.cardAmber]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>❗</Text>
            <Text style={[styles.cardTitle, styles.cardTitleAmber]}>
              {langConfig['ov.howToUse']}
            </Text>
          </View>

          <StepCard
            number="1"
            emoji="🗺️"
            text={langConfig['ov.step1.title']}
            desc={langConfig['ov.step1.desc']}
          />
          <StepCard
            number="2"
            emoji="📍"
            text={langConfig['ov.step2.title']}
            desc={langConfig['ov.step2.desc']}
          />
          <StepCard
            number="3"
            emoji="📊"
            text={langConfig['ov.step3.title']}
            desc={langConfig['ov.step3.desc']}
          />

          <Text style={styles.helperText}>
            {langConfig['ov.helperText']}
          </Text>
        </View>

        {/* ==================== COLOR MEANINGS ====================*/}
        <View style={[styles.card, styles.cardGreen]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>🎨</Text>
            <Text style={[styles.cardTitle, styles.cardTitleGreen]}>
              {langConfig['ov.colors']}
            </Text>
          </View>

          <ColorLegend
            color="#16a34a"
            title={langConfig['ov.color1']}
            desc={langConfig['ov.color1Desc']}
          />
          <ColorLegend
            color="#ca8a04"
            title={langConfig['ov.color2']}
            desc={langConfig['ov.color2Desc']}
          />
          <ColorLegend
            color="#dc2626"
            title={langConfig['ov.color3']}
            desc={langConfig['ov.color3Desc']}
          />

          <View style={styles.colorTip}>
            <Text style={styles.colorTipText}>
              {langConfig['ov.colorTip']}
            </Text>
          </View>
        </View>

        {/* ==================== WHO CAN USE ====================*/}
        <View style={[styles.card, styles.cardPink]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>👨‍🌾</Text>
            <Text style={[styles.cardTitle, styles.cardTitlePink]}>
              {langConfig['ov.whoCanUse']}
            </Text>
          </View>

          <UserCard emoji="👨‍🌾" text={langConfig['ov.user1']} />
          <UserCard emoji="🏛️" text={langConfig['ov.user2']} />
          <UserCard emoji="🎓" text={langConfig['ov.user3']} />
          <UserCard emoji="🌍" text={langConfig['ov.user4']} />

          <Text style={styles.userNote}>
            {langConfig['ov.userNote']}
          </Text>
        </View>

        {/* ==================== KEY FEATURES ====================*/}
        <View style={[styles.card, styles.cardTeal]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>⭐</Text>
            <Text style={[styles.cardTitle, styles.cardTitleTeal]}>
              {langConfig['ov.keyFeatures']}
            </Text>
          </View>

          <FeatureHighlight
            icon="📊"
            title={langConfig['ov.kf1.title']}
            desc={langConfig['ov.kf1.desc']}
          />
          <FeatureHighlight
            icon="🤖"
            title={langConfig['ov.kf2.title']}
            desc={langConfig['ov.kf2.desc']}
          />
          <FeatureHighlight
            icon="🌶️"
            title={langConfig['ov.kf3.title']}
            desc={langConfig['ov.kf3.desc']}
          />
          <FeatureHighlight
            icon="🌱"
            title={langConfig['ov.kf4.title']}
            desc={langConfig['ov.kf4.desc']}
          />
          <FeatureHighlight
            icon="👨‍🌾"
            title={langConfig['ov.kf5.title']}
            desc={langConfig['ov.kf5.desc']}
          />
        </View>

        {/* ==================== TIPS & BEST PRACTICES ====================*/}
        <View style={[styles.card, styles.cardOrange]}>
          <View style={styles.cardIconHeader}>
            <Text style={styles.cardIcon}>💡</Text>
            <Text style={[styles.cardTitle, styles.cardTitleOrange]}>
              {langConfig['ov.tips']}
            </Text>
          </View>

          <TipItem emoji="📍" text={langConfig['ov.tip1']} />
          <TipItem emoji="🔍" text={langConfig['ov.tip2']} />
          <TipItem emoji="🗺️" text={langConfig['ov.tip3']} />
          <TipItem emoji="📋" text={langConfig['ov.tip4']} />
          <TipItem emoji="🌱" text={langConfig['ov.tip5']} />

          <Text style={styles.tipsFooter}>
            {langConfig['ov.tipsFooter']}
          </Text>
        </View>

        {/* ==================== CTA BUTTON ====================*/}
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push("/map")}
        >
          <Text style={styles.ctaButtonText}>{langConfig['ov.cta']}</Text>
        </Pressable>

        {/* ==================== FOOTER TIP ====================*/}
        <View style={styles.footerTip}>
          <Text style={styles.footerTipText}>
            {langConfig['ov.footerTip']}
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