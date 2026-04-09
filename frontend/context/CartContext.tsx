import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type CartContextType = {
    cartItems: any[];
    addToCart: (product: any, selectedQty: number, selectedUnit: string) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<any[]>([]);

    const addToCart = useCallback((product: any, selectedQty: number, selectedUnit: string) => {
        setCartItems(prev => {
            const existingIndex = prev.findIndex(item => item._id === product._id && item.selectedUnit === selectedUnit);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = { 
                    ...updated[existingIndex], 
                    selectedQty: updated[existingIndex].selectedQty + selectedQty 
                };
                return updated;
            }
            return [...prev, { ...product, selectedQty, selectedUnit }];
        });
    }, []);

    const removeFromCart = useCallback((id: string) => {
        setCartItems(prev => prev.filter(item => item._id !== id));
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
    }, []);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error("useCart must be used within a CartProvider");
    return context;
};
