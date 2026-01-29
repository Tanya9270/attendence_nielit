import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-mark-fn-api-key",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const markFnKey = Deno.env.get("MARK_FN_API_KEY");
    const incomingApiKey = req.headers.get("x-mark-fn-api-key");

    if (markFnKey && incomingApiKey !== markFnKey) {
      return new Response(JSON.stringify({ error: "Invalid API Key" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const rawBody = await req.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const { qr_payload } = body;
    const rpcUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/mark_attendance`;
    
    const rpcRes = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${svcKey}`,
        "apikey": svcKey,
      },
      body: JSON.stringify({ qr_payload }),
    });

    const resultText = await rpcRes.text();
    return new Response(resultText, { 
      status: rpcRes.status, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});