import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { colors } from "@/constants/colors";

export default function Profile() {
  const user = {
    name: "Jana Kalyani",
    role: "User",
    email: "example@email.com",
    region: "Kandy",
    preferredSpice: "Cinnamon",
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join("")}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.sub}>{user.role} • {user.email}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Default Region</Text>
          <Text style={styles.statValue}>{user.region}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Fav Spice</Text>
          <Text style={styles.statValue}>{user.preferredSpice}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Details</Text>

        <View style={styles.item}>
          <Text style={styles.itemLabel}>Full Name</Text>
          <Text style={styles.itemValue}>{user.name}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.item}>
          <Text style={styles.itemLabel}>Role</Text>
          <Text style={styles.itemValue}>{user.role}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.item}>
          <Text style={styles.itemLabel}>Email</Text>
          <Text style={styles.itemValue}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actions</Text>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
          <Text style={styles.actionText}>Edit Profile</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85}>
          <Text style={styles.actionText}>Change Password</Text>
          <Text style={styles.actionArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn]} activeOpacity={0.85}>
          <Text style={[styles.actionText, { color: "#991B1B" }]}>Logout</Text>
          <Text style={[styles.actionArrow, { color: "#991B1B" }]}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },

  header: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.softGreen,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: { fontWeight: "900", color: colors.darkGreen, fontSize: 18 },

  name: { fontSize: 18, fontWeight: "900", color: colors.text },
  sub: { marginTop: 4, color: colors.muted, fontWeight: "700" },

  statsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  statValue: { marginTop: 6, color: colors.text, fontWeight: "900", fontSize: 16 },

  card: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: "900", color: colors.text, marginBottom: 10 },

  item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemLabel: { color: colors.muted, fontWeight: "800" },
  itemValue: { color: colors.text, fontWeight: "900" },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },

  actionBtn: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionText: { color: colors.text, fontWeight: "900" },
  actionArrow: { color: colors.muted, fontWeight: "900", fontSize: 18 },

  logoutBtn: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
});
