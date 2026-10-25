/**
 * Cloudflare Pages Function: /api/flow-return
 * Endpoint de notificación asíncrona que Flow.cl invoca cuando una transacción cambia de estado.
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const token = formData.get("token");

    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    const apiKey = env.FLOW_API_KEY || "TEST_API_KEY";
    const secretKey = env.FLOW_SECRET_KEY || "TEST_SECRET_KEY";
    const isProduction = env.FLOW_ENV === "production";
    const flowBaseUrl = isProduction ? "https://www.flow.cl/api" : "https://sandbox.flow.cl/api";

    // Si está en modo demo/test
    if (apiKey === "TEST_API_KEY") {
      return new Response(JSON.stringify({ status: 2, message: "Demo mode payment confirmed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Consultar el estado del pago a Flow usando getStatus
    // Firma HMAC-SHA256 para getStatus?apiKey=...&token=...
    const toSign = `apiKey${apiKey}token${token}`;
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(toSign));
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const statusResponse = await fetch(`${flowBaseUrl}/payment/getStatus?apiKey=${apiKey}&token=${token}&s=${signatureHex}`);
    const statusData = await statusResponse.json();

    // status = 2 significa PAGADA
    console.log("Notificación recibida de Flow:", statusData);

    return new Response(JSON.stringify({ success: true, status: statusData.status }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
