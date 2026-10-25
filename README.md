# SublimaPack Chile 🇨🇱 — Tienda de Plantillas para Sublimación

Tienda web moderna, rápida y responsiva para la venta de plantillas y diseños editables para sublimación (tazones, poleras, cojines, botellas y recuerdos). Integrada con pasarela de pagos **Flow.cl** (Webpay Plus, CuentaRUT, Débito, Crédito y Mach).

---

## 🚀 Características Principales

- **Catálogo Dinámico**: Más de 35 packs categorizados (Fútbol Chile, Series, Avengers, Día de la Madre, Día del Padre, Profesiones, Anime, Gaming, etc.).
- **Filtros y Búsqueda en Tiempo Real**: Filtrado por pestañas de categoría, buscador predictivo instantáneo y ordenamiento por precio o popularidad.
- **Ficha Detallada de Producto**: Vista previa de mockups, requisitos de software (Photoshop, Photopea, Illustrator, CorelDraw), resolución en 300 DPI y contenido del pack.
- **Carrito de Compras con Persistencia**: Almacenamiento local (`localStorage`), control de cantidades y soporte de cupones de descuento (ej: `SUBLIMA10`).
- **Integración con Flow.cl**:
  - Backend serverless listo para **Cloudflare Pages Functions** (`/functions/api/create-order.js`) o **Cloudflare Worker** (`/worker/flow-worker.js`).
  - Firma criptográfica segura HMAC-SHA256 sin exponer claves secretas en el cliente.
  - Modo asistido con redirección directa a WhatsApp cuando se previsualiza en entornos sin backend activo.
- **Página de Confirmación y Descarga**: Pantalla de éxito con acceso directo a la carpeta compartida en Google Drive.

---

## 📁 Estructura del Repositorio

```text
├── index.html                    # Página principal de la tienda (Catálogo, Hero, Carrito, FAQ)
├── confirmacion.html             # Página de agradecimiento y entrega de enlaces tras el pago
├── css/
│   └── custom.css                # Estilos visuales personalizados, animaciones y glassmorphism
├── js/
│   ├── app.js                   # Lógica principal del catálogo, filtros, carrito y modales
│   ├── config.js                # Variables configurables (WhatsApp, moneda, cupones, Flow)
│   └── flow.js                  # Manejador del flujo de pago y checkout
├── data/
│   └── products.json            # Base de datos JSON de los packs con precios y especificaciones
├── functions/
│   └── api/
│       ├── create-order.js      # Cloudflare Pages Function (crea orden firmada en Flow.cl)
│       └── flow-return.js       # Cloudflare Pages Function (recibe confirmación de Flow.cl)
├── worker/
│   └── flow-worker.js           # Cloudflare Worker standalone (opción alternativa)
├── .github/
│   └── workflows/
│       └── deploy.yml           # Despliegue automático en GitHub Pages
└── README.md                    # Documentación del proyecto
```

---

## 🛠️ Configuración y Despliegue

### Opción 1: Despliegue en GitHub Pages (Gratis)

1. En el repositorio de GitHub (`ukrabot/plantillasSublimacion`), dirígete a:
   **Settings** > **Pages**
2. En la sección **Build and deployment**, bajo **Source**, selecciona:
   **GitHub Actions**.
3. El workflow `.github/workflows/deploy.yml` compilará y publicará el sitio automáticamente en:
   `https://ukrabot.github.io/plantillasSublimacion/`

---

### Opción 2: Despliegue en Cloudflare Pages (Recomendado para pagos Flow)

Cloudflare Pages permite ejecutar las funciones serverless de `/functions/api/` para conectar con Flow de forma 100% segura:

1. Ve a tu panel de [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Selecciona el repositorio `ukrabot/plantillasSublimacion`.
3. Configuración de Build:
   - **Framework preset**: None
   - **Build command**: *(dejar vacío)*
   - **Build output directory**: `/`
4. En **Settings** > **Environment variables** de tu proyecto Pages, añade:
   - `FLOW_API_KEY`: Tu API Key obtenida en [flow.cl](https://www.flow.cl).
   - `FLOW_SECRET_KEY`: Tu Secret Key de Flow.cl.
   - `FLOW_ENV`: `production` (o `sandbox` para pruebas).
5. Haz clic en **Save and Deploy**.

---

## ⚙️ Personalización Rápida

### Cambiar número de WhatsApp o Datos de Contacto
Edita el archivo `js/config.js`:
```javascript
contact: {
  whatsapp: "+56912345678", // Ingresa aquí tu número con código de país
  whatsappDisplay: "+56 9 1234 5678",
  email: "contacto@ukrabot.cl"
}
```

### Agregar o Modificar Productos
Edita `data/products.json` o actualiza y ejecuta `python generate_catalog.py`. Cada producto sigue este esquema:
```json
{
  "id": "pack-xxx",
  "code": "#xxx",
  "title": "Nombre del Pack",
  "category": "Tazas y Tazones",
  "target": "Tazones 11oz",
  "price": 2990,
  "originalPrice": 5990,
  "rating": 5.0,
  "reviewsCount": 40,
  "badge": "Más Vendido",
  "formats": ["PSD", "PNG", "Mockups"],
  "resolution": "300 DPI",
  "description": "Descripción del pack...",
  "features": ["Capas editables", "PNG sin fondo"],
  "tags": ["tazas", "sublimacion"]
}
```

---

## 📝 Licencia

Proyecto desarrollado para **ukrabot** / Natalia Díaz.
Uso exclusivo y comercial para la tienda SublimaPack Chile.
