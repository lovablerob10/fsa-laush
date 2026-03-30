import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:4rem">
        <h1>❌ Parâmetro <code>id</code> ausente</h1>
        <p>Use: <code>/serve-landing-page?id=UUID</code></p>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("landing_pages")
    .select("html_content, status, name")
    .eq("id", id)
    .single();

  if (error || !data) {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:4rem">
        <h1>😢 Página não encontrada</h1>
        <p>A landing page solicitada não existe ou foi removida.</p>
      </body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (data.status !== "published") {
    return new Response(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:4rem">
        <h1>🚧 Página em Rascunho</h1>
        <p>Esta página ainda não foi publicada.</p>
      </body></html>`,
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Increment views async (fire-and-forget)
  supabase.rpc("increment_landing_page_views", { page_id: id }).then(() => {});

  return new Response(data.html_content, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "X-Frame-Options": "ALLOWALL",
    },
  });
});
