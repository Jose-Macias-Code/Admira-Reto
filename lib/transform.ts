// lib/transform.ts
export type PricePoint = [number, number];
export type BasePoint = { date: Date; value: number };

export function toDaily(prices: PricePoint[]): BasePoint[] {
  const byDay = new Map<string, number>();
  for (const [ts, value] of prices) {
    const d = new Date(ts);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    byDay.set(key, value);
  }
  return Array.from(byDay.entries())
    .map(([iso, value]) => ({ date: new Date(iso), value }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function withPctChange<T extends BasePoint>(arr: T[]): (T & { pctChange: number })[] {
  return arr.map((p, i) => {
    const prev = i > 0 ? arr[i - 1].value : null;
    const pctChange = prev ? ((p.value - prev) / prev) * 100 : 0;
    return { ...p, pctChange };
  });
}

export function withSMA<T extends BasePoint>(arr: T[], window = 7): (T & { sma7: number | null })[] {
  const out: (T & { sma7: number | null })[] = [];
  let sum = 0;
  const q: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i].value;
    q.push(v);
    sum += v;
    if (q.length > window) sum -= q.shift()!;
    const sma = q.length === window ? sum / window : null;
    out.push({ ...arr[i], sma7: sma });
  }
  return out;
}

export function lastNDays<T>(arr: T[], n: number) {
  return n >= arr.length ? arr : arr.slice(arr.length - n);
}
