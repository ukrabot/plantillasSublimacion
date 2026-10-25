/**
 * Integración de Pagos con Flow.cl
 * Maneja la creación de órdenes de compra, redirección a Webpay/Flow y fallbacks seguros.
 */
class FlowCheckout {
  constructor(config) {
    this.config = config || window.CONFIG;
  }

  /**
   * Procesa el pago de una orden
   * @param {Object} orderData - { customer: { name, email, phone }, items: [], total: number, discount: number }
   * @returns {Promise<Object>}
   */
  async processOrder(orderData) {
    const { customer, items, total } = orderData;

    if (!customer.name || !customer.email) {
      throw new Error("Por favor ingresa tu nombre y correo electrónico para enviar los enlaces de descarga.");
    }

    if (!items || items.length === 0) {
      throw new Error("El carrito de compras está vacío.");
    }

    // Descripción del pedido para Flow
    const subject = items.length === 1 
      ? `Plantillas: ${items[0].title}`
      : `Pack ${items.length} Plantillas Sublimación (${items.map(i => i.code).join(", ")})`;

    // Payload de la transacción
    const payload = {
      subject: subject.substring(0, 100),
      currency: "CLP",
      amount: Math.round(total),
      email: customer.email,
      customerName: customer.name,
      customerPhone: customer.phone || "",
      items: items.map(item => ({
        id: item.id,
        code: item.code,
        title: item.title,
        price: item.price,
        quantity: item.quantity
      })),
      orderId: "SUB-" + Date.now().toString(36).toUpperCase()
    };

    console.log("Iniciando checkout con Flow:", payload);

    try {
      // Intentar llamar al backend serverless de Cloudflare (Pages Function o Worker)
      const response = await fetch(this.config.flow.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.redirectUrl) {
          // Guardar orden pendiente en localStorage
          localStorage.setItem("pending_order", JSON.stringify({
            ...payload,
            token: data.token,
            createdAt: new Date().toISOString()
          }));

          // Redirigir al cliente a Flow.cl / Webpay
          window.location.href = data.redirectUrl;
          return { success: true, redirectUrl: data.redirectUrl };
        }
      }
      
      // Si la API responde con error o no está desplegada en local, usar fallback amigable
      console.warn("Backend Flow no disponible en este entorno o sin credenciales, activando checkout asistido.");
      return this.fallbackCheckout(payload);

    } catch (err) {
      console.warn("Error de conexión con endpoint Flow, activando checkout asistido:", err);
      return this.fallbackCheckout(payload);
    }
  }

  /**
   * Fallback amigable cuando el sitio corre en local o GitHub Pages sin Worker activo:
   * Ofrece generar pago por WhatsApp directo o simular confirmación.
   */
  fallbackCheckout(payload) {
    const orderCode = payload.orderId;
    const itemsList = payload.items.map(i => `• ${i.code} - ${i.title} ($${i.price.toLocaleString("es-CL")})`).join("\n");
    const totalFormatted = `$${payload.amount.toLocaleString("es-CL")} CLP`;

    const message = `👋 ¡Hola! Quiero comprar las siguientes plantillas de sublimación:\n\n` +
      `🧾 *Pedido N°:* ${orderCode}\n` +
      `👤 *Cliente:* ${payload.customerName}\n` +
      `📧 *Email:* ${payload.email}\n` +
      `📱 *Teléfono:* ${payload.customerPhone || "No especificado"}\n\n` +
      `📦 *Diseños seleccionados:*\n${itemsList}\n\n` +
      `💰 *Total a Pagar:* ${totalFormatted}\n\n` +
      `¿Me puedes enviar el link de Flow / datos de transferencia para completar el pago y recibir la descarga? ¡Muchas gracias!`;

    const cleanPhone = (this.config.contact.whatsapp || "").replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return {
      success: true,
      mode: "fallback",
      orderId: orderCode,
      whatsappUrl: whatsappUrl,
      payload: payload
    };
  }
}

window.FlowCheckout = FlowCheckout;
