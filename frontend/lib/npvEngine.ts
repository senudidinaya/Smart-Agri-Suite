export function calculateNPV(profits: number[], r = 0.1) {
  let npv = 0;

  for (let t = 0; t < profits.length; t++) {
    npv += profits[t] / Math.pow(1 + r, t + 1);
  }

  return npv;
}
