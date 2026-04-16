import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// IP хаяг зөв форматтай эсэхийг шалгана (SSRF хамгаалалт)
const isValidIP = (ip: string): boolean =>
  /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
  ip.split(".").every((n) => parseInt(n) <= 255);

export async function GET(req: NextRequest) {
  const ip = req.nextUrl.searchParams.get("ip");

  if (!ip || !isValidIP(ip)) {
    return NextResponse.json({ error: "Буруу IP хаяг" }, { status: 400 });
  }

  try {
    // ESP32-CAM-ын stream endpoint
    const upstream = await fetch(`http://${ip}/stream`, {
      headers: {
        Accept: "multipart/x-mixed-replace",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      // 30 секундийн timeout
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: "Камертай холбогдож чадсангүй" },
        { status: 502 },
      );
    }

    // Stream-ийг шууд дамжуулна
    return new Response(upstream.body, {
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ??
          "multipart/x-mixed-replace; boundary=frame",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Accel-Buffering": "no", // Nginx buffer унтраана
      },
    });
  } catch (err) {
    console.error("[Stream Proxy Error]", err);
    return NextResponse.json(
      { error: "Stream холболт тасарлаа" },
      { status: 500 },
    );
  }
}
