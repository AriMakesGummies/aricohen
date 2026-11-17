import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

// Private page: shows page-view counts. Needs ?key= matching the STATS_KEY environment variable.
export default async (req: Request, _context: Context) => {
  const given = new URL(req.url).searchParams.get("key");
  const secret = Netlify.env.get("STATS_KEY");
  if (!secret || given !== secret) return new Response("Not found", { status: 404 });

  const store = getStore({ name: "visits", consistency: "strong" });
  const { blobs } = await store.list();
  const byDay = new Map<string, number>();
  for (const b of blobs) {
    const day = b.key.split("/")[0];
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const rows: Array<[string, number]> = [...byDay.entries()].sort((x, y) => (x[0] < y[0] ? 1 : -1));
  const total = blobs.length;
  console.log("stats: entries", total);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const todayCount = rows.find((r) => r[0] === today)?.[1] ?? 0;
  const last7 = rows.slice(0, 7).reduce((a, r) => a + r[1], 0);
  const table = rows.length
    ? rows.map(([d, n]) => `<tr><td>${d}</td><td>${n}</td></tr>`).join("")
    : `<tr><td colspan="2">No visits recorded yet.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>aricohen.ca visits</title>
<style>
body{margin:0;background:#1c1c1e;color:#ececee;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
.wrap{max-width:520px;margin:0 auto;padding:28px 16px 48px}
h1{font-size:1.4rem;margin:0 0 4px}.sub{color:#a9a9b0;margin:0 0 22px;font-size:.9rem}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px}
.tile{background:#242427;border:1px solid #35353a;border-radius:8px;padding:14px}
.tile b{display:block;font-size:1.9rem;line-height:1.1;font-variant-numeric:tabular-nums}.tile span{color:#a9a9b0;font-size:.8rem}
table{width:100%;border-collapse:collapse;background:#242427;border:1px solid #35353a;border-radius:8px;overflow:hidden}
td,th{padding:9px 14px;text-align:left;border-bottom:1px solid #35353a;font-variant-numeric:tabular-nums}
td:last-child,th:last-child{text-align:right}th{color:#a9a9b0;font-weight:500;font-size:.8rem}
tr:last-child td{border-bottom:0}
button{margin-top:20px;font:inherit;color:#ececee;background:#2c2c30;border:1px solid #46464c;border-radius:6px;padding:9px 14px;cursor:pointer}
.note{color:#7c7c85;font-size:.8rem;margin-top:10px}
</style></head><body><div class="wrap">
<h1>aricohen.ca visits</h1><p class="sub">Page loads of the main page, by day (Toronto time). Refreshes count again.</p>
<div class="tiles"><div class="tile"><b>${todayCount}</b><span>today</span></div><div class="tile"><b>${last7}</b><span>last 7 days with visits</span></div><div class="tile"><b>${total}</b><span>all time</span></div></div>
<table><tr><th>Day</th><th>Page loads</th></tr>${table}</table>
<button type="button" id="toggle"></button>
<p class="note" id="state"></p>
</div><script>
(function(){var b=document.getElementById('toggle'),s=document.getElementById('state');
function get(){try{return localStorage.getItem('ac-nocount')==='1'}catch(e){return false}}
function paint(){var off=get();b.textContent=off?'Count my visits on this device again':'Stop counting my visits on this device';s.textContent=off?'Visits from this browser are not being counted.':'Visits from this browser are being counted.'}
b.addEventListener('click',function(){try{if(get())localStorage.removeItem('ac-nocount');else localStorage.setItem('ac-nocount','1')}catch(e){}paint()});paint()})();
</script></body></html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  });
};

export const config: Config = { path: "/stats", method: "GET" };
