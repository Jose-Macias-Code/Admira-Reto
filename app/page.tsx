"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Legend, Cell } from "recharts";
import { toDaily, withPctChange, withSMA, lastNDays, PricePoint } from "@/lib/transform";

type ApiResp = { prices: PricePoint[]; market_caps?: PricePoint[]; total_volumes?: PricePoint[] };

const COINS = [
  { label: "Bitcoin", value: "bitcoin" },
  { label: "Ethereum", value: "ethereum" },
  { label: "Solana", value: "solana" },
];

const DAY_OPTIONS = [
  { label: "7 días", value: "7" },
  { label: "30 días", value: "30" },
  { label: "90 días", value: "90" },
  { label: "365 días", value: "365" },
];

export default function Page() {
  const [coin, setCoin] = useState("bitcoin");
  const [days, setDays] = useState("30");
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [barDetail, setBarDetail] = useState<null | { dateLabel: string; price: number; pctChange: number; sma7?: number; volume?: number }>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null); setBarDetail(null);
      try {
        const r = await fetch(`/api/proxy?coin=${coin}&days=${days}`, { cache: "no-store" });
        if (!r.ok) throw new Error("proxy");
        const j: ApiResp = await r.json();
        if (!cancelled) setData(j);
      } catch {
        try {
          const r = await fetch("/api/mock", { cache: "no-store" });
          const j: ApiResp = await r.json();
          if (!cancelled) { setData(j); setErr("Usando datos mock"); }
        } catch { if (!cancelled) setErr("Error cargando datos"); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [coin, days]);

  const daily = useMemo(() => (data?.prices ? toDaily(data.prices) : []), [data]);
  const withRate = useMemo(() => withPctChange(daily), [daily]);
  const withAvg = useMemo(() => withSMA(withRate, 7), [withRate]);

  const volumeDaily = useMemo(() => (data?.total_volumes ? toDaily(data.total_volumes) : []), [data]);
  const volumeMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of volumeDaily) { const key = v.date.toISOString().slice(0, 10); m.set(key, v.value); }
    return m;
  }, [volumeDaily]);

  const N = 60;
  const chartData = useMemo(() => lastNDays(withAvg.map(d => {
    const dateKey = d.date.toISOString().slice(0, 10);
    return { dateKey, dateLabel: d.date.toLocaleDateString("es-MX", { month: "2-digit", day: "2-digit" }), price: d.value, pctChange: d.pctChange, sma7: d.sma7 ?? undefined, volume: volumeMap.get(dateKey) };
  }), N), [withAvg, volumeMap]);

  const pieData = useMemo(() => lastNDays(volumeDaily, 7).map(v => ({ name: v.date.toLocaleDateString("es-MX", { month: "2-digit", day: "2-digit" }), value: v.value })), [volumeDaily]);

  return (
    <div className="min-h-screen p-6 md:p-8 bg-gray-50 text-gray-900">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Crypto Dashboard</h1>
          <p className="text-xs text-gray-600">API CoinGecko · Transformaciones · 4 visualizaciones · Filtros</p>
          {err && <p className="text-xs text-amber-700 mt-1">{err}</p>}
        </div>
        <div className="flex gap-3">
          <label className="text-sm">Moneda
            <select className="ml-2 border rounded px-2 py-1 bg-white" value={coin} onChange={(e) => setCoin(e.target.value)}>
              {COINS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="text-sm">Rango
            <select className="ml-2 border rounded px-2 py-1 bg-white" value={days} onChange={(e) => setDays(e.target.value)}>
              {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>
        </div>
      </header>

      {loading && <p className="text-sm text-blue-700">Cargando…</p>}
      {!loading && chartData.length === 0 && <p className="text-sm text-gray-700">Sin datos.</p>}

      {!loading && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-medium mb-2">Precio</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="price" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-medium mb-2">Media móvil (7 días)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sma7" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-medium mb-2">% cambio diario</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="pctChange" onClick={(entry: any) => {
                  const payload = entry?.payload ?? entry;
                  if (payload) setBarDetail({ dateLabel: payload.dateLabel, price: payload.price, pctChange: payload.pctChange, sma7: payload.sma7, volume: payload.volume });
                }} />
              </BarChart>
            </ResponsiveContainer>

            {barDetail && (
              <div className="mt-3 border rounded p-3 text-sm bg-gray-50">
                <div className="flex flex-wrap gap-4">
                  <div><span className="text-gray-500">Fecha:</span> {barDetail.dateLabel}</div>
                  <div><span className="text-gray-500">Precio:</span> {barDetail.price.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })}</div>
                  <div><span className="text-gray-500">% cambio:</span> {barDetail.pctChange.toFixed(2)}%</div>
                  <div><span className="text-gray-500">Volumen:</span> {barDetail.volume !== undefined ? barDetail.volume.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "N/D"}</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-medium mb-2">Volumen (últimos 7 días)</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                  {pieData.map((_, i) => <Cell key={i} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}
    </div>
  );
}
