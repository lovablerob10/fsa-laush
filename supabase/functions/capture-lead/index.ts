import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { tenant_id, launch_id, landing_page_id, name, email, phone, source } = body;

    if (!tenant_id || !name || !phone) {
      return new Response(
        JSON.stringify({ error: "tenant_id, name e phone são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert lead — ignore duplicate phone per tenant (upsert-like behavior)
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        tenant_id,
        launch_id: launch_id || null,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone.trim(),
        source: "organic",
        status: "active",
        stage: "lead",
        custom_fields: {
          captured_from: source || "landing_page",
          landing_page_id: landing_page_id || null,
          captured_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single();

    // Ignore duplicate phone error (23505 = unique_violation) — lead already exists
    if (leadError && !leadError.code?.includes("23505")) {
      console.error("[capture-lead] insert error:", leadError);
      throw new Error(leadError.message);
    }

    // Increment landing_page leads_count atomically
    if (landing_page_id) {
      await supabase.rpc("increment_landing_page_leads", { page_id: landing_page_id });
    }

    return new Response(
      JSON.stringify({ success: true, lead_id: lead?.id || null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[capture-lead] error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
