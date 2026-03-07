export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (offset = 0) => {
    let x = h + offset * 1013904223;
    x ^= x << 13; x ^= x >> 17; x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}
