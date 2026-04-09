import { StyleSheet } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

const FARM = { latitude: 7.4675, longitude: 80.6234 };
const MARKET = { latitude: 7.8731, longitude: 80.7718 };

export default function LogisticsMap() {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: (FARM.latitude + MARKET.latitude) / 2,
        longitude: (FARM.longitude + MARKET.longitude) / 2,
        latitudeDelta: 1.2,
        longitudeDelta: 1.2,
      }}
    >
      <Marker coordinate={FARM} title="Your Farm" />
      <Marker coordinate={MARKET} title="Market" />
      <Polyline
        coordinates={[FARM, MARKET]}
        strokeColor="#4CAF50"
        strokeWidth={4}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 240,
    borderRadius: 20,
  },
});
