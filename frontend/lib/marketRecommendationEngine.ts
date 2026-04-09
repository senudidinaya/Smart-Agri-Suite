import { forecastPrice } from "./forecastEngine";

export interface MarketRecommendation {
  district: string;
  price: number;
  transportMode: string;
  transportCost: number;
  projectedProfit: number;
}

const MARKETS = [
  { district: "Colombo", distance: 140 },
  { district: "Kandy", distance: 30 },
  { district: "Dambulla", distance: 25 },
  { district: "Kurunegala", distance: 80 },
];

const TRANSPORT_MODES = [
  { mode: "Bike", rate: 40 },
  { mode: "Threewheel", rate: 60 },
  { mode: "Van", rate: 80 },
  { mode: "Lorry", rate: 120 },
];

export function getBestMarketRecommendation(
  spice: string,
  quantity: number,
  productionCost: number,
): MarketRecommendation | null {
  const forecast = forecastPrice(spice);

  const predictedPrice = forecast.predictedPrice;

  let best: MarketRecommendation | null = null;

  MARKETS.forEach((market) => {
    TRANSPORT_MODES.forEach((mode) => {
      const transportCost = market.distance * mode.rate;

      const revenue = predictedPrice * quantity;

      const totalCost = productionCost + transportCost;

      const profit = revenue - totalCost;

      if (!best || profit > best.projectedProfit) {
        best = {
          district: market.district,
          price: predictedPrice,
          transportMode: mode.mode,
          transportCost,
          projectedProfit: profit,
        };
      }
    });
  });

  return best;
}
