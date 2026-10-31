// How the hero writes a probability: one decimal of a percent from 1% up, two significant figures
// below that (0.0082%), and odds against a whole sequence in words (1 in 10.4 million).

export const count = (n: number) => n.toLocaleString("en-US");

export function percent(p: number): string {
  const value = p * 100;
  return `${value >= 1 ? value.toFixed(1) : Number(value.toPrecision(2))}%`;
}

export function oneIn(p: number): string {
  const n = 1 / p;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} million`;
  return count(Math.round(n));
}
