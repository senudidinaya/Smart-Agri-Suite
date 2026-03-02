import { View, Text } from "react-native";
import { styles } from "../styles/modelStyles";

export function ExplainabilityPanel() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Explainability</Text>
      <Text style={styles.modelText}>
        This system emphasizes trust and transparency. Each pixel can be inspected using satellite-derived indices, spectral bands,
        terrain attributes, and texture features. This supports evidence-based decisions for planning and policy.
      </Text>
      <View style={styles.metrics}>
        <Text style={styles.metric}>Pixel-level feature inspection: Implemented</Text>
        <Text style={styles.metric}>Per-pixel SHAP/LIME (PP3): UI contract ready</Text>
      </View>
    </View>
  );
}
