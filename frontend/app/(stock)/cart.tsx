
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPICE_IMAGES } from '../../data/dashboardData';
import { useGlobal } from '../../context/GlobalContext';

const CartItemCard = ({ 
  item, 
  onIncrease, 
  onDecrease, 
  onRemove 
}: { 
  item: any; 
  onIncrease: () => void; 
  onDecrease: () => void; 
  onRemove: () => void; 
}) => (
  <View style={styles.cartCard}>
    <View style={styles.cardHeader}>
      <View style={styles.itemThumb}>
        <Image source={SPICE_IMAGES[item.spice]} style={styles.thumbImage} resizeMode="contain" />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.spice}</Text>
        <Text style={styles.itemFarmer}>Farmer: {item.farmerName}</Text>
        <View style={styles.itemLocRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.itemLocText}>{item.region}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
        <Ionicons name="trash-outline" size={20} color={COLORS.redDark} />
      </TouchableOpacity>
    </View>
    
    <View style={styles.cardFooter}>
      <View style={styles.quantityControl}>
        <TouchableOpacity onPress={onDecrease} style={styles.qtyBtn}>
          <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.qtyValue}>{item.cartQuantity || 1}</Text>
        <TouchableOpacity onPress={onIncrease} style={styles.qtyBtn}>
          <Ionicons name="add" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.priceInfo}>
        <Text style={styles.priceLabel}>Current kg Selection</Text>
        <Text style={styles.priceTotal}>{item.cartQuantity || 1} kg</Text>
      </View>
    </View>
  </View>
);

export default function CartScreen() {
  const router = useRouter();
  const { cart, removeFromCart, updateCartQuantity, clearCart } = useGlobal();

  const totalKg = cart.reduce((sum, item) => sum + (item.cartQuantity || 1), 0);

  const handleCheckout = () => {
    Alert.alert(
      "Confirm Order",
      `Are you sure you want to order ${totalKg}kg of spices?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: () => {
            Alert.alert("Order Placed", "Your local farmers have been notified. They will contact you for delivery.");
            clearCart();
            router.replace('/customer-dashboard');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.brandDark} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSubtitle}>{cart.length} items selected</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {cart.length > 0 ? (
          <>
            {cart.map(item => (
              <CartItemCard 
                key={item.id}
                item={item}
                onIncrease={() => updateCartQuantity(item.id, 1)}
                onDecrease={() => updateCartQuantity(item.id, -1)}
                onRemove={() => removeFromCart(item.id)}
              />
            ))}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Items</Text>
                <Text style={styles.summaryValue}>{cart.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Weight</Text>
                <Text style={styles.summaryValue}>{totalKg} kg</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalValue}>{totalKg} kg Stock</Text>
              </View>

              <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                <Text style={styles.checkoutBtnText}>Confirm Order</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.surface} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="cart-outline" size={80} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySubtitle}>Browse the marketplace for available spices from local farmers.</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/customer-dashboard')}>
              <Text style={styles.browseBtnText}>Go to Marketplace</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.brandDark },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  scrollContent: { padding: 16 },

  cartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  itemThumb: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  thumbImage: { width: '80%', height: '80%' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 18, fontWeight: '800', color: COLORS.brandDark, marginBottom: 2 },
  itemFarmer: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  itemLocRow: { flexDirection: 'row', alignItems: 'center' },
  itemLocText: { marginLeft: 4, fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  removeBtn: { padding: 8 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyValue: { marginHorizontal: 16, fontSize: 16, fontWeight: '800', color: COLORS.brandDark },
  priceInfo: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 2 },
  priceTotal: { fontSize: 16, fontWeight: '800', color: COLORS.primaryGreen },

  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: COLORS.brandDark, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  summaryValue: { fontSize: 14, color: COLORS.brandDark, fontWeight: '700' },
  totalRow: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 24,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.brandDark },
  totalValue: { fontSize: 20, fontWeight: '800', color: COLORS.primaryGreen },
  checkoutBtn: {
    backgroundColor: COLORS.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  checkoutBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: '800' },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.brandDark, marginTop: 24, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40, marginBottom: 32 },
  browseBtn: { backgroundColor: COLORS.primaryGreen, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14 },
  browseBtnText: { color: COLORS.surface, fontSize: 16, fontWeight: '700' },
});
