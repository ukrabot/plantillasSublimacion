/**
 * Configuración Principal de la Tienda
 * SublimaPack Chile - Plantillas para Sublimación
 */
const CONFIG = {
  siteName: "SublimaPack Chile",
  tagline: "Plantillas y Diseños Premium para Sublimación y DTF",
  domain: "plantillas.ukrabot.cl",
  currency: "CLP",
  currencySymbol: "$",
  
  // Datos de Contacto y Soporte
  contact: {
    whatsapp: "+56912345678", // Reemplazar con tu número real
    whatsappDisplay: "+56 9 1234 5678",
    email: "contacto@ukrabot.cl",
    instagram: "@sublimapack_chile"
  },

  // Integración Flow.cl
  // Para producción, se utiliza Cloudflare Pages Functions (/api/create-order) o Cloudflare Worker
  // de forma que las claves secretas NUNCA queden expuestas en el navegador.
  flow: {
    // URL del endpoint backend (en Cloudflare Pages Functions es /api/create-order)
    endpoint: "/api/create-order",
    // Modo sandbox para pruebas (true) o producción (false)
    sandbox: true,
    // Moneda Flow
    currency: "CLP",
    // URL a la que Flow redirige al cliente tras el pago exitoso
    urlConfirmation: "/confirmacion.html"
  },

  // Códigos de Descuento Promocionales
  coupons: {
    "SUBLIMA10": { discount: 0.10, label: "10% de Descuento Especial" },
    "PACKPRO": { discount: 0.15, label: "15% Descuento Emprendedores" },
    "BIENVENIDA": { discount: 0.20, label: "20% en tu Primera Compra" }
  }
};

window.CONFIG = CONFIG;
