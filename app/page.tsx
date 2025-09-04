"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Legend, Cell, ReferenceLine
} from "recharts";
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
  const [barDetail, setBarDetail] = useState<null | {
    dateLabel: string;
    price: number;
    pctChange: number;
    sma7?: number;
    volume?: number;
  }>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      setBarDetail(null);
      try {
        const r = await fetch(`/api/proxy?coin=${coin}&days=${days}`, { cache: "no-store" });
        if (!r.ok) throw new Error("proxy");
        const j: ApiResp = await r.json();
        if (!cancelled) setData(j);
      } catch {
        try {
          const r = await fetch("/api/mock", { cache: "no-store" });
          const j: ApiResp = await r.json();
          if (!cancelled) {
            setData(j);
            setErr("Usando datos mock");
          }
        } catch {
          if (!cancelled) setErr("Error cargando datos");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [coin, days]);

  const daily = useMemo(() => (data?.prices ? toDaily(data.prices) : []), [data]);
  const withRate = useMemo(() => withPctChange(daily), [daily]);
  const withAvg = useMemo(() => withSMA(withRate, 7), [withRate]);

  const volumeDaily = useMemo(() => (data?.total_volumes ? toDaily(data.total_volumes) : []), [data]);
  const volumeMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of volumeDaily) m.set(v.date.toISOString().slice(0, 10), v.value);
    return m;
  }, [volumeDaily]);

  const N = 60;
  const chartData = useMemo(() => lastNDays(withAvg.map(d => {
    const dateKey = d.date.toISOString().slice(0, 10);
    return {
      dateKey,
      dateLabel: d.date.toLocaleDateString("es-MX", { month: "2-digit", day: "2-digit" }),
      price: d.value,
      pctChange: d.pctChange,
      sma7: d.sma7 ?? undefined,
      volume: volumeMap.get(dateKey),
    };
  }), N), [withAvg, volumeMap]);

  const pieData = useMemo(() => lastNDays(volumeDaily, 7).map(v => ({
    name: v.date.toLocaleDateString("es-MX", { month: "2-digit", day: "2-digit" }),
    value: v.value,
  })), [volumeDaily]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="mb-8 px-6 md:px-10 pt-6 pb-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Crypto Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">API CoinGecko · Transformaciones · 4 visualizaciones · Filtros</p>
            {err && <p className="mt-1 text-xs text-amber-700">{err}</p>}
          </div>
          <div className="flex gap-4">
            <label className="text-sm font-medium text-gray-700 flex items-center"> Moneda
              <select
                className="ml-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                value={coin}
                onChange={(e) => setCoin(e.target.value)}
              >
                {COINS.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700 flex items-center"> Rango
              <select
                className="ml-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              >
                {DAY_OPTIONS.map(d => (<option key={d.value} value={d.value}>{d.label}</option>))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <main className="px-6 md:px-8 pb-10">
        {loading && <p className="text-sm text-blue-700">Cargando…</p>}
        {!loading && chartData.length === 0 && <p className="text-sm text-gray-700">Sin datos.</p>}
        {!loading && chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition p-4">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 tracking-tight">Evolución del Precio</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="dateLabel" tickMargin={6} />
                  <YAxis width={60} />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" dot={false} strokeWidth={2.5} stroke="#6366F1" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition p-4">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 tracking-tight">Media Móvil (7 días)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="dateLabel" tickMargin={6} />
                  <YAxis width={60} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sma7" dot={false} strokeWidth={2.25} stroke="#10B981" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition p-4">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 tracking-tight">% de Cambio Diario</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="dateLabel" tickMargin={6} />
                  <YAxis width={60} />
                  <Tooltip />
                  <ReferenceLine y={0} stroke="#9CA3AF" />
                  <Bar dataKey="pctChange" radius={[6, 6, 0, 0]} onClick={(entry: unknown) => {
                      const { payload } = entry as { payload: typeof chartData[0] };
                      if (payload) {
                        setBarDetail({
                          dateLabel: payload.dateLabel,
                          price: payload.price,
                          pctChange: payload.pctChange,
                          sma7: payload.sma7,
                          volume: payload.volume,
                        });
                      }
                    }}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.pctChange >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {barDetail && (
                <div className="mt-3 border border-gray-200 rounded-xl p-3 text-sm bg-gray-50">
                  <div className="flex flex-wrap gap-4">
                    <div><span className="text-gray-500">Fecha:</span> {barDetail.dateLabel}</div>
                    <div><span className="text-gray-500">Precio:</span> {barDetail.price.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })}</div>
                    <div><span className="text-gray-500">% cambio:</span> <span className={barDetail.pctChange >= 0 ? "text-emerald-600" : "text-rose-600"}>{barDetail.pctChange.toFixed(2)}%</span></div>
                    <div><span className="text-gray-500">Volumen:</span> {barDetail.volume !== undefined ? barDetail.volume.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "N/D"}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition p-4">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 tracking-tight">Distribución de Volumen (7 días)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Tooltip />
                  <Legend />
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                    {pieData.map((_, i) => (<Cell key={i} fill={["#6366F1","#06B6D4","#10B981","#F59E0B","#EF4444","#84CC16","#8B5CF6"][i % 7]} />))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
