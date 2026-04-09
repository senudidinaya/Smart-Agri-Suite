import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { API_BASE_URL, fetchWithTimeout } from "../lib/apiConfig";

export type OrderStatus = "PENDING" | "CONFIRMED" | "DISPATCHED" | "DELIVERED";

export type Order = {
  _id?: string;
  id?: string; // backwards compatibility
  spice: string;
  qty: number; // Support for short name used in tracking/listing
  quantity?: number; // Backwards compatible
  unitPrice: number;
  transportCost: number;
  productionCost: number;
  revenue: number;
  totalCost: number;
  profit: number;
  customer: string;
  status: OrderStatus;
  mode?: string;
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

// SAMPLE DATA FOR AGRI-COMMAND DEMONSTRATION
const SAMPLE_ORDERS: Order[] = [
    {
        _id: 'ord-1025',
        id: 'ord-1025',
        spice: 'Pepper',
        qty: 120,
        unitPrice: 1550,
        transportCost: 4500,
        productionCost: 80000,
        revenue: 186000,
        totalCost: 84500,
        profit: 101500,
        customer: 'Sahan (Colombo)',
        status: 'DISPATCHED',
        mode: 'Heavy Truck'
    },
    {
        _id: 'ord-1028',
        id: 'ord-1028',
        spice: 'Cinnamon',
        qty: 45,
        unitPrice: 2450,
        transportCost: 3200,
        productionCost: 55000,
        revenue: 110250,
        totalCost: 58200,
        profit: 52050,
        customer: 'Dilshan (Negombo)',
        status: 'CONFIRMED',
        mode: 'Lorry'
    },
    {
        _id: 'ord-1032',
        id: 'ord-1032',
        spice: 'Clove',
        qty: 15,
        unitPrice: 2950,
        transportCost: 1500,
        productionCost: 24000,
        revenue: 44250,
        totalCost: 25500,
        profit: 18750,
        customer: 'Global Exports (Galle)',
        status: 'PENDING',
        mode: 'Lorry'
    }
];

export const OrderProvider = ({ children }: { children: React.ReactNode }) => {
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS);
  const [loading, setLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/orders`);
        if (!res.ok) throw new Error("Failed to fetch orders.");
        const data = await res.json();
        // Merge background orders with samples for demo
        setOrders([...data, ...SAMPLE_ORDERS]);
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
            setOrders((prev) => [{...order, _id: Date.now().toString()}, ...prev]);
        }
    } catch(err) {
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
        }
    } catch(err) {
        setOrders((prev) => prev.map((o) => ((o._id === id || o.id === id) ? { ...o, status } : o)));
    }
  };

  const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + (o.revenue || 0), 0), [orders]);
  const totalProfit = useMemo(() => orders.reduce((sum, o) => sum + (o.profit || 0), 0), [orders]);

  return (
    <OrderContext.Provider
      value={{ orders, addOrder, updateStatus, totalRevenue, totalProfit, loading }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrders must be used inside OrderProvider");
  return context;
};
