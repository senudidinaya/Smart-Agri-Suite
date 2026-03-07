import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { API_BASE_URL, fetchWithTimeout } from "../lib/apiConfig";

export type OrderStatus = "PENDING" | "CONFIRMED" | "DISPATCHED" | "DELIVERED";

export type Order = {
  _id?: string;
  id?: string; // backwards compatibility
  spice: string;
  quantity: number;
  unitPrice: number;
  transportCost: number;
  productionCost: number;
  revenue: number;
  totalCost: number;
  profit: number;
  customer: string;
  status: OrderStatus;
  createdAt?: string;
};

type OrderContextType = {
  orders: Order[];
  addOrder: (order: Order) => Promise<void>;
  updateStatus: (id: string, status: OrderStatus) => Promise<void>;
  totalRevenue: number;
  totalProfit: number;
  loading: boolean;
};

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const SEED_ORDERS: Order[] = [
  {
    _id: "1",
    spice: "Cinnamon",
    quantity: 50,
    unitPrice: 2200,
    revenue: 110000,
    productionCost: 80000,
    transportCost: 21500,
    totalCost: 101500,
    profit: 8500,
    status: "DELIVERED",
    customer: "Colombo Traders",
    createdAt: "2026-03-01T10:00:00Z"
  },
  {
    _id: "2",
    spice: "Pepper",
    quantity: 30,
    unitPrice: 1800,
    revenue: 54000,
    productionCost: 40000,
    transportCost: 8600,
    totalCost: 48600,
    profit: 5400,
    status: "DISPATCHED",
    customer: "Kandy Market",
    createdAt: "2026-03-03T11:30:00Z"
  },
  {
    _id: "3",
    spice: "Cardamom",
    quantity: 20,
    unitPrice: 3400,
    revenue: 68000,
    productionCost: 50000,
    transportCost: 6000,
    totalCost: 56000,
    profit: 12000,
    status: "CONFIRMED",
    customer: "Galle Exports",
    createdAt: "2026-03-05T09:15:00Z"
  },
  {
    _id: "4",
    spice: "Clove",
    quantity: 40,
    unitPrice: 2800,
    revenue: 112000,
    productionCost: 90000,
    transportCost: 12800,
    totalCost: 102800,
    profit: 9200,
    status: "PENDING",
    customer: "Matale Spice Co",
    createdAt: "2026-03-06T14:45:00Z"
  },
  {
    _id: "5",
    spice: "Nutmeg",
    quantity: 25,
    unitPrice: 2500,
    revenue: 62500,
    productionCost: 50000,
    transportCost: 5400,
    totalCost: 55400,
    profit: 7100,
    status: "DELIVERED",
    customer: "Kurunegala Traders",
    createdAt: "2026-03-07T08:20:00Z"
  },
];

export const OrderProvider = ({ children }: { children: React.ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>(SEED_ORDERS);
  const [loading, setLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/orders`);
        if (!res.ok) throw new Error("Failed to fetch orders.");
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        // Quietly fallback directly to local states
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const addOrder = async (order: Order) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });

      if (res.ok) {
        const newOrder = await res.json();
        setOrders((prev) => [newOrder, ...prev]);
      } else {
        // Fallback for offline/no-backend run
        setOrders((prev) => [{ ...order, _id: Date.now().toString() }, ...prev]);
        console.warn("Failed to save to backend, saved locally");
      }
    } catch (err) {
      // Fallback
      setOrders((prev) => [{ ...order, _id: Date.now().toString() }, ...prev]);
    }
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      const res = await fetchWithTimeout(`${API_BASE_URL}/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => ((o._id === id || o.id === id) ? { ...o, status } : o)));
      } else {
        setOrders((prev) => prev.map((o) => ((o._id === id || o.id === id) ? { ...o, status } : o)));
        console.warn("Failed to update status on backend, updated locally");
      }
    } catch (err) {
      setOrders((prev) => prev.map((o) => ((o._id === id || o.id === id) ? { ...o, status } : o)));
    }
  };

  const totalRevenue = useMemo(
    () => orders.reduce((sum, o) => sum + o.revenue, 0),
    [orders],
  );

  const totalProfit = useMemo(
    () => orders.reduce((sum, o) => sum + o.profit, 0),
    [orders],
  );

  return (
    <OrderContext.Provider
      value={{
        orders,
        addOrder,
        updateStatus,
        totalRevenue,
        totalProfit,
        loading
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders must be used inside OrderProvider");
  }
  return context;
};
