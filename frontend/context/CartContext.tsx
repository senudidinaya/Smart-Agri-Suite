import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type CartItem = {
    id: string;         // listing ID (same as listingId)
    listingId: string;  // explicit link to StockContext listing
    farmerId: string;
    farmerName: string;
    hubName: string;
    spice: string;
    variety: string;
    region: string;
    price: number; // per kg
    qty: number;
    stock: number;
};

type CartContextType = {
    cartItems: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (id: string) => void;
    updateQty: (id: string, qty: number) => void;
    clearCart: () => void;
    cartCount: number;
    cartTotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    const addToCart = useCallback((item: CartItem) => {
        setCartItems(prev => {
            const existing = prev.findIndex(c => c.id === item.id);
            if (existing > -1) {
                // If already in cart, update qty
                const updated = [...prev];
                updated[existing] = { ...updated[existing], qty: Math.min(updated[existing].stock, updated[existing].qty + item.qty) };
                return updated;
            }
            return [...prev, item];
        });
    }, []);

    const removeFromCart = useCallback((id: string) => {
        setCartItems(prev => prev.filter(c => c.id !== id));
    }, []);

    const updateQty = useCallback((id: string, qty: number) => {
        setCartItems(prev => prev.map(c => c.id === id ? { ...c, qty } : c));
    }, []);

    const clearCart = useCallback(() => setCartItems([]), []);

    const cartCount = cartItems.reduce((sum, c) => sum + c.qty, 0);
    const cartTotal = cartItems.reduce((sum, c) => sum + c.price * c.qty, 0);

    return (
        <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, clearCart, cartCount, cartTotal }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
