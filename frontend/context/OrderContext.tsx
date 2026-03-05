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

export const OrderProvider = ({ children }: { children: React.ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>([]);
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
            setOrders((prev) => [{...order, _id: Date.now().toString()}, ...prev]);
            console.warn("Failed to save to backend, saved locally");
        }
    } catch(err) {
        // Fallback
        setOrders((prev) => [{...order, _id: Date.now().toString()}, ...prev]);
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
    } catch(err) {
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
