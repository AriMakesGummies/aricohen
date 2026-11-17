import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

// Records one page view as its own small entry, filed under the day it happened (Toronto time).
const BOT = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|facebookexternalhit|curl|wget|python|node-fetch|axios/i;

export default async (req: Request, _context: Context) => {
  const ua = req.headers.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const key = `${day}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await getStore("visits").set(key, "1");
  return new Response(null, { status: 204 });
};

export const config: Config = { path: "/api/hit", method: "POST" };
