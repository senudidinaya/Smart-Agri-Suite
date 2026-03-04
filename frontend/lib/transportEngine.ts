import { distanceTable } from "./distanceTable";

const rates: any = {
  Bike: 40,
  Threewheel: 60,
  Van: 80,
  Lorry: 120,
};

export function calculateTransportCost(
  farmer: string,
  customer: string,
  mode: string,
) {
  const distance =
    distanceTable?.[farmer]?.[customer] ??
    distanceTable?.[customer]?.[farmer] ??
    0;

  const rate = rates[mode] || 0;

  const cost = distance * rate;

  return {
    distance,
    rate,
    cost,
  };
}
