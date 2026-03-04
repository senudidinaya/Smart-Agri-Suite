import marketData from "../data/market.json";

export interface MarketRecord {
  date: string;
  spice: string;
  farmer: string;
  district: string;
  price_per_kg: number;
  quantity: number;
}

export interface OrderRecord {
  id: string;
  spice: string;
  quantity: number;
  revenue: number;
  profit: number;
  createdAt: string;
}

/*
LINEAR REGRESSION
Used for price forecasting
*/
function linearRegression(y: number[]) {
  const n = y.length;

  if (n === 0) {
    return { slope: 0, intercept: 0 };
  }

  const x = Array.from({ length: n }, (_, i) => i + 1);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
  const sumXX = x.reduce((acc, val) => acc + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);

  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/*
PRICE FORECAST
Predict next price using regression
*/
export function forecastPrice(spice: string) {
  const records = (marketData as MarketRecord[])
    .filter((r) => r.spice === spice)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const prices = records.map((r) => r.price_per_kg);

  if (prices.length < 2) {
    return {
      currentPrice: prices[prices.length - 1] || 0,
      predictedPrice: prices[prices.length - 1] || 0,
      growthRate: 0,
    };
  }

  const { slope, intercept } = linearRegression(prices);

  const nextX = prices.length + 1;

  const predictedPrice = slope * nextX + intercept;

  const currentPrice = prices[prices.length - 1];

  const growthRate = ((predictedPrice - currentPrice) / currentPrice) * 100;

  return {
    currentPrice,
    predictedPrice,
    growthRate,
  };
}

/*
DEMAND FORECAST PER REGION
*/
export function forecastDemandByRegion(spice: string) {
  const records = (marketData as MarketRecord[]).filter(
    (r) => r.spice === spice,
  );

  const regionDemand: Record<string, number> = {};

  records.forEach((r) => {
    if (!regionDemand[r.district]) {
      regionDemand[r.district] = 0;
    }

    regionDemand[r.district] += r.quantity;
  });

  const sorted = Object.entries(regionDemand).sort((a, b) => b[1] - a[1]);

  return sorted.map(([district, demand]) => ({
    district,
    demand,
  }));
}

/*
PROFIT FORECAST FROM ORDER HISTORY
*/
export function forecastProfitTrend(orders: OrderRecord[]) {
  if (orders.length < 2) {
    return {
      predictedProfit: 0,
      growthRate: 0,
    };
  }

  const profits = orders
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((o) => o.profit);

  const { slope, intercept } = linearRegression(profits);

  const nextX = profits.length + 1;

  const predictedProfit = slope * nextX + intercept;

  const currentProfit = profits[profits.length - 1];

  const growthRate =
    ((predictedProfit - currentProfit) / (currentProfit || 1)) * 100;

  return {
    predictedProfit,
    growthRate,
  };
}
