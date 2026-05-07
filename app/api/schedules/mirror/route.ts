import { NextResponse } from "next/server";

/**
 * Хөтөчинд `localhost:3000 → localhost:8787` CORS/алдаатай алгасах —
 * Next серверээр Cloudflare Worker руу дамжуулна (dev + production).
 */
export async function POST(req: Request) {
  const base =
    process.env.WORKER_API_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:8787";

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  try {
    const res = await fetch(`${base}/api/schedules/mirror`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Worker unreachable";
    return NextResponse.json(
      {
        error: msg,
        hint: "Ажиллуул: cd backend && npx wrangler dev (эсвэл WORKER_API_URL зөв тохируул).",
      },
      { status: 502 },
    );
  }
}
