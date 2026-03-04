import { MarketRecord } from "./dataLoader";

/* DEMAND */
export function calculateDemand(spice: string, data: MarketRecord[]) {
  const totalOrders = data.length;

  const spiceOrders = data.filter((item) => item.spice === spice).length;

  if (totalOrders === 0) return 0;

  return spiceOrders / totalOrders;
}

/* SUPPLY */
export function calculateSupply(spice: string, data: MarketRecord[]) {
  const totalStock = data.reduce((sum, item) => sum + item.quantity, 0);

  const spiceStock = data
    .filter((item) => item.spice === spice)
    .reduce((sum, item) => sum + item.quantity, 0);

  if (totalStock === 0) return 0;

  return spiceStock / totalStock;
}

/* BASE PRICE */
export function getBasePrice(spice: string, data: MarketRecord[]) {
  const filtered = data.filter((item) => item.spice === spice);

  if (filtered.length === 0) return 0;

  const total = filtered.reduce((sum, item) => sum + item.price_per_kg, 0);

  return total / filtered.length;
}

/* PRICE TREND */
export const getTrendData = (
  spice: string,
  data: any[],
): { labels: string[]; prices: number[] } => {
  if (!data || data.length === 0) {
    return { labels: [], prices: [] };
  }

  const filtered = data
    .filter((item) => item.spice === spice)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const labels = filtered.map((item, index) => {
    const date = new Date(item.date);
    return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
  });

  const prices = filtered.map((item) => Number(item.price_per_kg));

  return {
    labels,
    prices,
  };
};
