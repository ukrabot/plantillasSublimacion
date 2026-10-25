/**
 * Cloudflare Worker: flow-worker.js
 * Backend serverless independiente para procesar pagos con Flow.cl (Webpay Plus).
 * 
 * Variables de entorno en Cloudflare Worker:
 * - FLOW_API_KEY
 * - FLOW_SECRET_KEY
 * - FLOW_ENV: 'sandbox' o 'production'
 * - ALLOWED_ORIGIN: '*' o 'https://ukrabot.github.io'
 */

export default {
  async fetch(request, env, ctx) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Endpoint: /api/create-order
    if (url.pathname === "/api/create-order" && request.method === "POST") {
      try {
        const body = await request.json();
        const { subject, amount, email, orderId, returnUrl } = body;

        if (!amount || !email) {
          return new Response(JSON.stringify({ error: "Faltan parámetros requeridos" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const apiKey = env.FLOW_API_KEY || "TEST_API_KEY";
        const secretKey = env.FLOW_SECRET_KEY || "TEST_SECRET_KEY";
        const isProduction = env.FLOW_ENV === "production";
        const flowBaseUrl = isProduction ? "https://www.flow.cl/api" : "https://sandbox.flow.cl/api";

        const params = {
          apiKey: apiKey,
          commerceOrder: orderId || `SUB-${Date.now()}`,
          subject: (subject || "Compra de Plantillas").substring(0, 100),
          currency: "CLP",
          amount: Math.round(amount),
          email: email,
          paymentMethod: 9,
          urlConfirmation: `${url.origin}/api/flow-return`,
          urlReturn: returnUrl || `${url.origin}/confirmacion.html`
        };

        if (apiKey === "TEST_API_KEY") {
          return new Response(JSON.stringify({
            mock: true,
            redirectUrl: `${params.urlReturn}?status=simulated_success&amount=${amount}`
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Ordenar claves y firmar HMAC-SHA256
        const sortedKeys = Object.keys(params).sort();
        let toSign = "";
        for (const k of sortedKeys) toSign += k + params[k];

        const encoder = new TextEncoder();
        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          encoder.encode(secretKey),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(toSign));
        const signatureHex = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");

        const formData = new URLSearchParams();
        for (const k of sortedKeys) formData.append(k, params[k]);
        formData.append("s", signatureHex);

        const flowRes = await fetch(`${flowBaseUrl}/payment/create`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString()
        });

        const flowData = await flowRes.json();
        if (!flowRes.ok) {
          return new Response(JSON.stringify({ error: flowData }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          token: flowData.token,
          redirectUrl: `${flowData.url}?token=${flowData.token}`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
