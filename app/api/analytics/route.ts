import { getAnalyticsDb } from "../../../db/analytics";

const ANALYTICS_EVENTS = [
  "page_view",
  "card_complete",
  "png_download",
  "share",
  "copy_text",
] as const;
const ANALYTICS_STARTED_AT = "2026-08-14";

type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
type DeviceType = "mobile" | "desktop";

type MetricRow = {
  date?: string;
  event: AnalyticsEvent;
  device?: DeviceType;
  count: number;
};

type VisitorRow = {
  date: string;
  device: DeviceType;
  count: number;
};

const allowedOrigins = new Set([
  "https://saitgyeol-friend-card.epcp0627.chatgpt.site",
  "https://epcp0627-ai.github.io",
]);

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  });
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function responseJson(request: Request, body: unknown, init?: ResponseInit) {
  const headers = corsHeaders(request);
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }
  return Response.json(body, { ...init, headers });
}

function koreanDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dateDaysAgo(days: number) {
  return koreanDate(new Date(Date.now() - days * 86_400_000));
}

async function hashVisitor(date: string, visitorId: string) {
  const bytes = new TextEncoder().encode(`${date}:${visitorId}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function OPTIONS(request: Request) {
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return responseJson(request, { error: "origin not allowed" }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as {
      event?: unknown;
      device?: unknown;
      visitorId?: unknown;
    };
    const event = typeof payload.event === "string" ? payload.event : "";
    const device = payload.device === "mobile" ? "mobile" : payload.device === "desktop" ? "desktop" : "";
    const visitorId = typeof payload.visitorId === "string" ? payload.visitorId : "";

    if (!ANALYTICS_EVENTS.includes(event as AnalyticsEvent) || !device) {
      return responseJson(request, { error: "invalid analytics event" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_-]{12,80}$/.test(visitorId)) {
      return responseJson(request, { error: "invalid visitor id" }, { status: 400 });
    }

    const date = koreanDate();
    const db = getAnalyticsDb();
    const increment = db
      .prepare(
        `INSERT INTO analytics_daily (date, event, device, count)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(date, event, device)
         DO UPDATE SET count = count + 1`,
      )
      .bind(date, event, device);

    if (event === "page_view") {
      const visitorHash = await hashVisitor(date, visitorId);
      const visitor = db
        .prepare(
          `INSERT OR IGNORE INTO analytics_visitors (date, visitor_hash, device)
           VALUES (?, ?, ?)`,
        )
        .bind(date, visitorHash, device);
      await db.batch([increment, visitor]);
    } else {
      await increment.run();
    }

    return responseJson(request, { ok: true }, { status: 202 });
  } catch {
    return responseJson(request, { error: "analytics unavailable" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return responseJson(request, { error: "origin not allowed" }, { status: 403 });
  }

  try {
    const db = getAnalyticsDb();
    const today = koreanDate();
    const last30 = dateDaysAgo(29);
    const last14 = dateDaysAgo(13);
    const [totalResult, recentVisitorResult, dailyResult] = await Promise.all([
      db.prepare(
        `SELECT event, device, SUM(count) AS count
         FROM analytics_daily
         GROUP BY event, device`,
      ).all<MetricRow>(),
      db.prepare(
        `SELECT date, device, COUNT(*) AS count
         FROM analytics_visitors
         WHERE date >= ?
         GROUP BY date, device
         ORDER BY date ASC`,
      ).bind(last30).all<VisitorRow>(),
      db.prepare(
        `SELECT date, event, SUM(count) AS count
         FROM analytics_daily
         WHERE date >= ?
         GROUP BY date, event
         ORDER BY date ASC`,
      ).bind(last14).all<MetricRow>(),
    ]);

    const totals = {
      visits: 0,
      cardCompletions: 0,
      pngDownloads: 0,
      shares: 0,
      copies: 0,
    };
    let mobileVisits = 0;
    totalResult.results.forEach((row) => {
      const count = Number(row.count) || 0;
      if (row.event === "page_view") {
        totals.visits += count;
        if (row.device === "mobile") mobileVisits += count;
      }
      if (row.event === "card_complete") totals.cardCompletions += count;
      if (row.event === "png_download") totals.pngDownloads += count;
      if (row.event === "share") totals.shares += count;
      if (row.event === "copy_text") totals.copies += count;
    });

    const todayVisitors = recentVisitorResult.results
      .filter((row) => row.date === today)
      .reduce((sum, row) => sum + (Number(row.count) || 0), 0);
    const recentVisitors = recentVisitorResult.results
      .reduce((sum, row) => sum + (Number(row.count) || 0), 0);

    const daily = Array.from({ length: 14 }, (_, index) => {
      const date = dateDaysAgo(13 - index);
      return { date, visits: 0, cardCompletions: 0, pngDownloads: 0 };
    });
    const dailyByDate = new Map(daily.map((row) => [row.date, row]));
    dailyResult.results.forEach((row) => {
      const target = row.date ? dailyByDate.get(row.date) : undefined;
      if (!target) return;
      const count = Number(row.count) || 0;
      if (row.event === "page_view") target.visits = count;
      if (row.event === "card_complete") target.cardCompletions = count;
      if (row.event === "png_download") target.pngDownloads = count;
    });

    return responseJson(request, {
      summary: {
        ...totals,
        todayVisitors,
        recentVisitors,
        mobilePercent: totals.visits ? Math.round((mobileVisits / totals.visits) * 100) : 0,
      },
      daily,
      trackingSince: ANALYTICS_STARTED_AT,
    });
  } catch {
    return responseJson(request, { error: "analytics unavailable" }, { status: 500 });
  }
}

