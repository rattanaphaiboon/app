// Supabase Edge Function: notify-discord
// รับ { wh, embed, username } จากแอป → เลือก Discord webhook ตามคลัง (wh) จาก env secret → ยิง Discord
// webhook URL เก็บเป็น secret ฝั่ง server (DISCORD_W1..W4) — ไม่โผล่ในหน้าเว็บ
//
// Deploy: Supabase Dashboard → Edge Functions → notify-discord → paste → Deploy (Verify JWT = OFF)
// Secrets: ตั้ง DISCORD_W1, DISCORD_W2, DISCORD_W3, DISCORD_W4 = webhook URL ของแต่ละคลัง

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function webhookFor(wh: string): string | undefined {
  const w = String(wh || "").trim().toUpperCase();
  return Deno.env.get("DISCORD_" + w) || Deno.env.get("DISCORD_DEFAULT") || undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const { wh, embed, username } = await req.json();
    if (!embed) return json({ ok: false, error: "missing embed" }, 400);
    const url = webhookFor(wh);
    if (!url) return json({ ok: false, error: "no webhook for wh: " + wh }, 400);
    const payload: Record<string, unknown> = { embeds: [embed] };
    if (username) payload.username = username;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return json({ ok: r.ok }, r.ok ? 200 : 502);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
