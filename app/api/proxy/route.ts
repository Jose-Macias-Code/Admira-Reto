// app/api/proxy/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const COINGECKO_BASE = process.env.COINGECKO_BASE || "";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
const DEFAULT_VS_CURRENCY = process.env.DEFAULT_VS_CURRENCY || "usd";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const coin = searchParams.get("coin") || "bitcoin";
  const vs = searchParams.get("vs") || DEFAULT_VS_CURRENCY;
  const days = searchParams.get("days") || "30";
  const interval = searchParams.get("interval") || "daily";

  const url = `${COINGECKO_BASE}/coins/${coin}/market_chart?vs_currency=${vs}&days=${days}&interval=${interval}`;
  const start = Date.now();

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    const logDir = path.join(process.cwd(), "server", "logs");
    fs.mkdirSync(logDir, { recursive: true });
    const traceFile = path.join(logDir, "http_trace.jsonl");
    const entry = {
      ts: new Date().toISOString(),
      url,
      coin,
      vs,
      days,
      status: res.status,
      duration_ms: Date.now() - start,
    };
    fs.appendFileSync(traceFile, JSON.stringify(entry) + "\n");

    if (WEBHOOK_URL) {
      fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).catch(() => {});
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Proxy error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
