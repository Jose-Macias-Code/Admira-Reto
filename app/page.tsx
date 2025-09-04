"use client";

import { useEffect, useState } from "react";

type PricePoint = [number, number];

export default function Home() {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("Inicializando…");

  useEffect(() => {
    async function fetchData() {
      try {
        setStatus("Consultando API real…");
        const res = await fetch("/api/proxy?coin=bitcoin&days=30", { cache: "no-store" });
        if (!res.ok) throw new Error("Fallo en /api/proxy");
        const json = await res.json();
        if (!json?.prices) throw new Error("Respuesta sin datos");
        setData(json.prices);
        setStatus("Datos cargados desde /api/proxy");
      } catch {
        try {
          setStatus("Fallo la API real, usando /api/mock…");
          const res = await fetch("/api/mock", { cache: "no-store" });
          const json = await res.json();
          setData(json.prices || []);
          setStatus("Datos cargados desde /api/mock");
        } catch {
          setStatus("Error cargando datos (ni proxy ni mock disponibles)");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const count = data.length;
  const last = count > 0 ? data[count - 1] : null;
  const lastDate = last ? new Date(last[0]).toLocaleString("es-MX") : null;
  const lastPrice = last
    ? last[1].toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
    : null;

  return (
    <div className="min-h-screen p-8 font-sans bg-gray-50 text-gray-900">
      <h1 className="text-2xl font-bold mb-4">Conexión back – front</h1>

      {loading ? (
        <p className="text-blue-700">{status}</p>
      ) : (
        <>
          <p className="mb-2 text-gray-800">{status}</p>
          {count === 0 ? (
            <p className="text-gray-600">No hay datos disponibles</p>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-gray-700">Datos recibidos: {count}</p>
              <p className="text-sm text-gray-700">
                Último dato: {lastDate} — {lastPrice}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
