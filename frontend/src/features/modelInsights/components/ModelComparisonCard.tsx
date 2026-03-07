import { View, Text } from "react-native";
import { styles } from "../styles/modelStyles";

export function ModelComparisonCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Model Selection</Text>

      <View style={styles.row}>
        <Text style={styles.badge}>Final</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.modelName}>XGBoost</Text>
          <Text style={styles.modelText}>
            Selected for stronger overall accuracy and more reliable decision boundaries on multi-feature satellite inputs.
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={[styles.badge, styles.badgeAlt]}>Alt</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.modelName}>Random Forest</Text>
          <Text style={styles.modelText}>
            Strong baseline and interpretable, but underperformed relative to XGBoost under your evaluation settings.
          </Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <Text style={styles.metric}>Accuracy (XGBoost): ~80%</Text>
        <Text style={styles.metric}>Classes: Bare (0), Vegetation (1), Built-up (2)</Text>
      </View>
    </View>
  );
}
