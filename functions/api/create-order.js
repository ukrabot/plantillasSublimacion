/**
 * Cloudflare Pages Function: /api/create-order
 * Recibe los datos del carrito, firma criptográficamente los parámetros HMAC-SHA256
 * y solicita a Flow.cl la URL de pago de Webpay / Servipag / Mach.
 *
 * Variables de entorno requeridas en Cloudflare Pages:
 * - FLOW_API_KEY: Tu API Key de Flow.cl
 * - FLOW_SECRET_KEY: Tu Secret Key de Flow.cl
 * - FLOW_ENV: 'sandbox' o 'production' (por defecto: 'sandbox')
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { subject, amount, email, customerName, customerPhone, orderId } = body;

    if (!amount || !email) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos (amount, email)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const apiKey = env.FLOW_API_KEY || "TEST_API_KEY";
    const secretKey = env.FLOW_SECRET_KEY || "TEST_SECRET_KEY";
    const isProduction = env.FLOW_ENV === "production";
    const flowBaseUrl = isProduction ? "https://www.flow.cl/api" : "https://sandbox.flow.cl/api";

    // URLs de retorno
    const url = new URL(request.url);
    const origin = url.origin;
    const urlReturn = `${origin}/confirmacion.html?orderId=${encodeURIComponent(orderId || "")}`;
    const urlConfirmation = `${origin}/api/flow-return`;

    // Parámetros obligatorios de Flow
    const params = {
      apiKey: apiKey,
      commerceOrder: orderId || `SUB-${Date.now()}`,
      subject: (subject || "Compra de Plantillas").substring(0, 100),
      currency: "CLP",
      amount: Math.round(amount),
      email: email,
      paymentMethod: 9, // Todos los medios de pago (Webpay, Servipag, Mach, etc.)
      urlConfirmation: urlConfirmation,
      urlReturn: urlReturn
    };

    // Si aún no se configuraron claves reales, devolver respuesta informativa de desarrollo
    if (apiKey === "TEST_API_KEY") {
      return new Response(JSON.stringify({
        mock: true,
        message: "Modo demo: configura FLOW_API_KEY y FLOW_SECRET_KEY en las variables de entorno de Cloudflare.",
        redirectUrl: `${urlReturn}&status=simulated_success&amount=${amount}`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Ordenar claves alfabéticamente para calcular la firma HMAC-SHA256
    const sortedKeys = Object.keys(params).sort();
    let toSign = "";
    for (const key of sortedKeys) {
      toSign += key + params[key];
    }

    // Calcular HMAC-SHA256 usando Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(toSign);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signatureBuffer));
    const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Agregar firma al payload
    const formData = new URLSearchParams();
    for (const key of sortedKeys) {
      formData.append(key, params[key]);
    }
    formData.append("s", signatureHex);

    // Llamar a la API de Flow
    const flowResponse = await fetch(`${flowBaseUrl}/payment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });

    const flowResult = await flowResponse.json();

    if (!flowResponse.ok) {
      return new Response(JSON.stringify({
        error: "Error en respuesta de Flow",
        details: flowResult
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Flow retorna: { url: "https://www.flow.cl/...", token: "..." }
    const redirectUrl = `${flowResult.url}?token=${flowResult.token}`;

    return new Response(JSON.stringify({
      success: true,
      token: flowResult.token,
      redirectUrl: redirectUrl
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
