import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { API_BASE_URL } from '../config';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Listing = {
  id?: string;          // database _id
  _id?: string;         // database _id
  farmerId: string;     // farmer's profile.name (identifier)
  farmerName: string;
  hubName: string;
  region: string;
  lat: number;
  lng: number;
  spice: string;
  variety: string;
  price: number;        // LKR per kg
  totalStock: number;   // original quantity farmer entered
  stock: number;        // remaining physical stock (decremented on farmer Accept)
  reserved: number;     // soft hold — in customer carts, not yet accepted
  rating: number;
  reviews: number;
  status: 'Active' | 'SoldOut' | 'Paused';
  createdAt: string;
};

type StockContextType = {
  listings: Listing[];
  loading: boolean;
  myListings: (farmerId: string) => Listing[];
  addListing: (data: Partial<Listing>) => Promise<void>;
  removeListing: (id: string) => Promise<void>;
  updateListing: (id: string, data: Partial<Listing>) => Promise<void>;
  reserveStock: (id: string, qty: number) => Promise<boolean>;
  releaseReservation: (id: string, qty: number) => Promise<void>;
  commitDeduction: (id: string, qty: number) => Promise<void>;
  getAvailableStock: (id: string) => number;
  refreshListings: () => Promise<void>;
};

const StockContext = createContext<StockContextType | undefined>(undefined);

// ─── Seed Data (Fallback if DB empty) ──────────────────────────────────────────
const SEED_LISTINGS: Partial<Listing>[] = [
  { farmerId: 'Linton Fernando',  farmerName: 'Linton Fernando',  hubName: 'Galle Coastal Hub',    region: 'Galle',        lat: 6.0367, lng: 80.2170, spice: 'Cinnamon', variety: 'Ceylon Alba',    price: 2450, totalStock: 80,  stock: 80,  reserved: 0, rating: 4.8, reviews: 124, status: 'Active' },
  { farmerId: 'G. Piyadasa',      farmerName: 'G. Piyadasa',      hubName: 'Matara Lowlands',      region: 'Matara',       lat: 5.9485, lng: 80.5353, spice: 'Cinnamon', variety: 'Grade A Quills', price: 2380, totalStock: 50,  stock: 50,  reserved: 0, rating: 4.6, reviews: 88,  status: 'Active' },
  { farmerId: 'Sunil Perera',     farmerName: 'Sunil Perera',     hubName: 'Matale Spice Valley',  region: 'Matale',       lat: 7.4675, lng: 80.6234, spice: 'Pepper',   variety: 'Bold Grade',     price: 1620, totalStock: 200, stock: 200, reserved: 0, rating: 4.9, reviews: 201, status: 'Active' },
  { farmerId: 'Aruna Jayamaha',  farmerName: 'Aruna Jayamaha',  hubName: 'Nuwara Eliya Highs',   region: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891, spice: 'Cardamom', variety: 'Green Bold',     price: 3800, totalStock: 20,  stock: 20,  reserved: 0, rating: 4.9, reviews: 201, status: 'Active' },
];

export const StockProvider = ({ children }: { children: ReactNode }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/inventory`);
      const data = await res.json();
      
      if (data.length === 0) {
        // First time initialization — seed the DB
        console.log("Seeding backend with initial farmers...");
        for (const seed of SEED_LISTINGS) {
          await fetch(`${API_BASE_URL}/inventory/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(seed),
          });
        }
        // Fetch again after seeding
        const res2 = await fetch(`${API_BASE_URL}/inventory`);
        const data2 = await res2.json();
        setListings(data2);
      } else {
        setListings(data);
      }
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const myListings = useCallback(
    (farmerId: string) => listings.filter(l => l.farmerId === farmerId),
    [listings]
  );

  const addListing = useCallback(async (data: Partial<Listing>) => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          stock: data.stock || 0,
          totalStock: data.stock || 0,
          reserved: 0,
          rating: 4.5,
          reviews: 0,
          status: 'Active',
        }),
      });
      const saved = await res.json();
      setListings(prev => [saved, ...prev]);
    } catch (err) {
      console.error("Add listing failed:", err);
    }
  }, []);

  const removeListing = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/inventory/${id}`, { method: 'DELETE' });
      setListings(prev => prev.filter(l => (l._id || l.id) !== id));
    } catch (err) {
      console.error("Delete listing failed:", err);
    }
  }, []);

  const updateListing = useCallback(async (id: string, data: Partial<Listing>) => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      setListings(prev => prev.map(l => (l._id || l.id) === id ? updated : l));
    } catch (err) {
      console.error("Update listing failed:", err);
    }
  }, []);

  const reserveStock = useCallback(async (id: string, qty: number): Promise<boolean> => {
    const listing = listings.find(l => (l._id || l.id) === id);
    if (!listing) return false;

    const available = listing.stock - listing.reserved;
    if (qty > available) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reserved: listing.reserved + qty }),
      });
      const updated = await res.json();
      setListings(prev => prev.map(l => (l._id || l.id) === id ? updated : l));
      return true;
    } catch (err) {
      console.error("Reservation failed:", err);
      return false;
    }
  }, [listings]);

  const releaseReservation = useCallback(async (id: string, qty: number) => {
    const listing = listings.find(l => (l._id || l.id) === id);
    if (!listing) return;

    try {
      const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reserved: Math.max(0, listing.reserved - qty) }),
      });
      const updated = await res.json();
      setListings(prev => prev.map(l => (l._id || l.id) === id ? updated : l));
    } catch (err) {
      console.error("Release reservation failed:", err);
    }
  }, [listings]);

  const commitDeduction = useCallback(async (id: string, qty: number) => {
    const listing = listings.find(l => (l._id || l.id) === id);
    if (!listing) return;

    try {
      const newStock = Math.max(0, listing.stock - qty);
      const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: newStock,
          reserved: Math.max(0, listing.reserved - qty),
          status: newStock === 0 ? 'SoldOut' : 'Active',
        }),
      });
      const updated = await res.json();
      setListings(prev => prev.map(l => (l._id || l.id) === id ? updated : l));
    } catch (err) {
      console.error("Commit deduction failed:", err);
    }
  }, [listings]);

  const getAvailableStock = useCallback((id: string): number => {
    const listing = listings.find(l => (l._id || l.id) === id);
    if (!listing) return 0;
    return listing.stock - listing.reserved;
  }, [listings]);

  return (
    <StockContext.Provider value={{
      listings,
      loading,
      myListings,
      addListing,
      removeListing,
      updateListing,
      reserveStock,
      releaseReservation,
      commitDeduction,
      getAvailableStock,
      refreshListings: fetchListings,
    }}>
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error('useStock must be used inside StockProvider');
  return ctx;
};
