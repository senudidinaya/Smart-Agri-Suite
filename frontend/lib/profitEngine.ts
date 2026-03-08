export function calculateProfit(
  pricePerKg: number,
  quantity: number,
  transportCost: number,
  baseCost: number,
) {
  const revenue = pricePerKg * quantity;

  const cost = baseCost + transportCost;

  const profit = revenue - cost;

  return {
    revenue,
    cost,
    profit,
  };
}
