
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';

interface GlobalContextType {
  inventory: any[];
  cart: any[];
  refreshInventory: () => Promise<void>;
  addToCart: (item: any) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  isLoading: boolean;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error("useGlobal must be used within GlobalProvider");
  return context;
};

export const GlobalProvider = ({ children }: { children: React.ReactNode }) => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshInventory = async () => {
    setIsLoading(true);
    try {
      const res = await apiService.getInventory();
      setInventory(res.data);
    } catch (error) {
      console.error("Failed to refresh inventory:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, cartQuantity: (i.cartQuantity || 1) + 1 } : i);
      }
      return [...prev, { ...item, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = (i.cartQuantity || 1) + delta;
        return { ...i, cartQuantity: newQty > 0 ? newQty : 1 };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  useEffect(() => {
    refreshInventory();
  }, []);

  return (
    <GlobalContext.Provider value={{ 
      inventory, 
      cart, 
      refreshInventory, 
      addToCart, 
      removeFromCart, 
      updateCartQuantity, 
      clearCart,
      isLoading 
    }}>
      {children}
    </GlobalContext.Provider>
  );
};
