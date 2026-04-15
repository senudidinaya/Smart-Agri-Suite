import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, fetchWithTimeout } from "../lib/apiConfig";

// ─── Transport Logic ─────────────────────────────────────────────────────────
// Based on quantity (kg):
//   0–5 kg   → Bike
//   6–30 kg  → Three-Wheeler
//   31–150 kg→ Lorry
//   151+ kg  → Heavy Truck
export function getTransportMode(qty: number): string {
  if (qty <= 5)   return "Bike";
  if (qty <= 30)  return "Three-Wheeler";
  if (qty <= 150) return "Lorry";
  return "Heavy Truck";
}

// ─── Status Flow ─────────────────────────────────────────────────────────────
// PENDING → ACCEPTED / REJECTED  (farmer decision)
// ACCEPTED → IN_TRANSIT          (farmer hands to transport)
// IN_TRANSIT → DELIVERED         (logistics completion)
export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_TRANSIT"
  | "DELIVERED";

export type Order = {
  _id?: string;
  id?: string;
  listingId?: string;  // links to StockContext listing for stock deduction
  spice: string;
  qty: number;
  quantity?: number;
  unitPrice: number;
  transportCost: number;
  productionCost: number;
  revenue: number;
  totalCost: number;
  profit: number;
  customer: string;
  status: OrderStatus;
  mode?: string;       // auto-assigned from qty
  createdAt?: string;
};

type OrderContextType = {
  orders: Order[];
  addOrder: (order: Order) => Promise<void>;
  updateStatus: (id: string, status: OrderStatus, mode?: string) => Promise<void>;
  acceptOrder: (id: string) => Promise<void>;
  rejectOrder: (id: string) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  totalRevenue: number;
  totalProfit: number;
  loading: boolean;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// ─── Sample Data ─────────────────────────────────────────────────────────────
const SAMPLE_ORDERS: Order[] = [
  { _id: 'ord-1025', id: 'ord-1025', spice: 'Pepper',   qty: 120, unitPrice: 1550, transportCost: 4500,  productionCost: 80000, revenue: 186000, totalCost: 84500, profit: 101500, customer: 'Sahan (Colombo)',         status: 'IN_TRANSIT', mode: 'Lorry' },
  { _id: 'ord-1028', id: 'ord-1028', spice: 'Cinnamon', qty: 45,  unitPrice: 2450, transportCost: 3200,  productionCost: 55000, revenue: 110250, totalCost: 58200, profit: 52050,  customer: 'Dilshan (Negombo)',        status: 'ACCEPTED',   mode: 'Lorry' },
  { _id: 'ord-1032', id: 'ord-1032', spice: 'Clove',    qty: 15,  unitPrice: 2950, transportCost: 1500,  productionCost: 24000, revenue: 44250,  totalCost: 25500, profit: 18750,  customer: 'Global Exports (Galle)',   status: 'PENDING',    mode: 'Three-Wheeler' },
];

// ─── Provider ─────────────────────────────────────────────────────────────────
export const OrderProvider = ({ children }: { children: React.ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/orders`);
        if (!res.ok) throw new Error("Failed to fetch orders.");
        const data = await res.json();
        setOrders([...data, ...SAMPLE_ORDERS]);
      } catch {
        // fall back silently to sample data
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const addOrder = async (order: Order) => {
    // Auto-assign transport mode from quantity
    const mode = order.mode || getTransportMode(order.qty);
    // Ensure both id and _id are always set for consistent lookup
    const localId = order.id || order._id || `ORD-${Date.now()}`;
    const enriched: Order = { ...order, mode, id: localId, _id: localId };

    // Optimistically add to state immediately so UI updates right away
    setOrders((prev) => [enriched, ...prev]);

    try {
      // Map frontend 'qty' to backend 'quantity' for database compatibility
      const apiPayload = { ...enriched, quantity: enriched.qty };
      
      const res = await fetchWithTimeout(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });
      if (res.ok) {
        const serverOrder = await res.json();
        const serverId = serverOrder._id || serverOrder.id || localId;
        // Replace the optimistic entry with the server response
        setOrders((prev) =>
          prev.map((o) =>
            o.id === localId || o._id === localId
              ? { ...serverOrder, id: serverId, _id: serverId }
              : o
          )
        );
      }
    } catch {
      // Already added locally — nothing more to do
    }
  };

  const updateStatus = async (id: string, status: OrderStatus, mode?: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o._id === id || o.id === id
          ? { ...o, status, ...(mode ? { mode } : {}) }
          : o
      )
    );
    try {
      await fetchWithTimeout(`${API_BASE_URL}/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(mode ? { mode } : {}) }),
      });
    } catch {
      // Already updated locally, no rollback needed
    }
  };

  const acceptOrder = (id: string) => updateStatus(id, 'ACCEPTED');
  const rejectOrder = (id: string) => updateStatus(id, 'REJECTED');
  const updateOrderStatus = (id: string, status: OrderStatus) => updateStatus(id, status);

  const totalRevenue = useMemo(
    () => orders.filter(o => o.status !== 'REJECTED').reduce((s, o) => s + (o.revenue || 0), 0),
    [orders]
  );
  const totalProfit = useMemo(
    () => orders.filter(o => o.status !== 'REJECTED').reduce((s, o) => s + (o.profit || 0), 0),
    [orders]
  );

  return (
    <OrderContext.Provider value={{
      orders, addOrder, updateStatus,
      acceptOrder, rejectOrder, updateOrderStatus,
      totalRevenue, totalProfit, loading
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrders must be used inside OrderProvider");
  return context;
};
