export function calculatePrice(
  basePrice: number,
  demand: number,
  supply: number,
) {
  const Pf = basePrice * (1 + demand - supply);

  return Pf;
}
