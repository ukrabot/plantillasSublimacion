/**
 * SublimaPack Chile - Lógica Principal de la Tienda
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Estado Global
  const state = {
    products: [],
    categories: [],
    site: {},
    activeCategory: "todos",
    searchQuery: "",
    sortBy: "destacados",
    cart: JSON.parse(localStorage.getItem("sublima_cart") || "[]"),
    coupon: null,
    selectedProduct: null
  };

  const flow = new FlowCheckout(window.CONFIG);

  // Elementos DOM
  const elements = {
    productsGrid: document.getElementById("products-grid"),
    categoriesNav: document.getElementById("categories-nav"),
    searchInput: document.getElementById("search-input"),
    sortSelect: document.getElementById("sort-select"),
    cartCounter: document.getElementById("cart-counter"),
    cartDrawer: document.getElementById("cart-drawer"),
    cartBackdrop: document.getElementById("cart-backdrop"),
    cartItemsList: document.getElementById("cart-items-list"),
    cartSubtotal: document.getElementById("cart-subtotal"),
    cartDiscount: document.getElementById("cart-discount"),
    cartDiscountRow: document.getElementById("cart-discount-row"),
    cartTotal: document.getElementById("cart-total"),
    openCartBtn: document.getElementById("open-cart-btn"),
    closeCartBtn: document.getElementById("close-cart-btn"),
    couponInput: document.getElementById("coupon-input"),
    applyCouponBtn: document.getElementById("apply-coupon-btn"),
    checkoutBtn: document.getElementById("checkout-btn"),
    productModal: document.getElementById("product-modal"),
    closeModalBtn: document.getElementById("close-modal-btn"),
    checkoutModal: document.getElementById("checkout-modal"),
    closeCheckoutModalBtn: document.getElementById("close-checkout-modal-btn"),
    checkoutForm: document.getElementById("checkout-form"),
    checkoutSummary: document.getElementById("checkout-summary"),
    toastContainer: document.getElementById("toast-container")
  };

  // 1. Cargar Catálogo
  try {
    const res = await fetch("data/products.json");
    if (!res.ok) throw new Error("No se pudo cargar data/products.json");
    const data = await res.json();
    state.products = data.products || [];
    state.categories = data.categories || [];
    state.site = data.site || {};
    
    renderCategories();
    renderProducts();
    updateCartUI();
  } catch (err) {
    console.error("Error al inicializar tienda:", err);
    elements.productsGrid.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <p class="text-xl font-medium text-rose-400 mb-2">Error cargando el catálogo</p>
        <p class="text-sm">Por favor verifica que data/products.json esté disponible.</p>
      </div>
    `;
  }

  // 2. Renderizar Categorías
  function renderCategories() {
    if (!elements.categoriesNav) return;
    elements.categoriesNav.innerHTML = state.categories.map(cat => {
      const isActive = state.activeCategory === cat.id;
      return `
        <button 
          data-category="${cat.id}"
          class="cat-btn px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
            isActive 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
          }">
          <span>${cat.name}</span>
          <span class="text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-700 text-slate-400'}">
            ${cat.count}
          </span>
        </button>
      `;
    }).join("");

    // Event listeners de categorías
    elements.categoriesNav.querySelectorAll(".cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        state.activeCategory = btn.dataset.category;
        renderCategories();
        renderProducts();
      });
    });
  }

  // 3. Filtrar y Ordenar Productos
  function getFilteredProducts() {
    let list = [...state.products];

    // Filtro por categoría
    if (state.activeCategory !== "todos") {
      list = list.filter(p => p.category === state.activeCategory);
    }

    // Filtro por buscador
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Ordenamiento
    switch (state.sortBy) {
      case "precio-bajo":
        list.sort((a, b) => a.price - b.price);
        break;
      case "precio-alto":
        list.sort((a, b) => b.price - a.price);
        break;
      case "calificacion":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "nombre":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default: // destacados
        list.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
        break;
    }

    return list;
  }

  // 4. Renderizar Tarjetas de Productos
  function renderProducts() {
    const filtered = getFilteredProducts();

    if (filtered.length === 0) {
      elements.productsGrid.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-400 glass rounded-2xl p-8">
          <svg class="w-16 h-16 mx-auto mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <h3 class="text-lg font-semibold text-white mb-1">No se encontraron diseños</h3>
          <p class="text-sm">Prueba ajustando los términos de búsqueda o cambiando de categoría.</p>
        </div>
      `;
      return;
    }

    elements.productsGrid.innerHTML = filtered.map(product => {
      const formatsHTML = product.formats.slice(0, 3).map(f => 
        `<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-indigo-500/20">${f}</span>`
      ).join(" ");

      return `
        <article class="glass-card rounded-2xl overflow-hidden flex flex-col group relative">
          <!-- Visual Mockup Banner -->
          <div class="mockup-visual h-48 bg-gradient-to-br ${product.accent || 'from-indigo-600 to-purple-800'} p-4 flex flex-col justify-between relative cursor-pointer open-details-btn" data-id="${product.id}">
            <div class="flex items-center justify-between z-10">
              <span class="text-xs font-bold tracking-wider bg-black/50 text-white px-2.5 py-1 rounded-full backdrop-blur-md">
                ${product.code}
              </span>
              <span class="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 shadow-md">
                ${product.badge || 'Pack Pro'}
              </span>
            </div>

            <!-- Silueta decorativa de Producto (Taza / Textil) -->
            <div class="flex items-center justify-center my-auto z-0 transform group-hover:scale-105 transition-transform duration-300">
              <div class="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner">
                <svg class="w-12 h-12 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-white/80 z-10">
              <span>${product.target}</span>
              <span class="flex items-center gap-1 font-semibold">
                ★ ${product.rating} <span class="text-white/60 text-[10px]">(${product.reviewsCount})</span>
              </span>
            </div>
          </div>

          <!-- Información y Precios -->
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex flex-wrap gap-1 mb-2">
                ${formatsHTML}
              </div>
              <h3 class="text-base font-bold text-white mb-2 line-clamp-2 hover:text-indigo-300 cursor-pointer transition-colors open-details-btn" data-id="${product.id}">
                ${product.title}
              </h3>
              <p class="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                ${product.description}
              </p>
            </div>

            <div class="pt-4 border-t border-slate-800/80">
              <div class="flex items-baseline justify-between mb-4">
                <div>
                  <span class="text-xl font-extrabold text-white">
                    $${product.price.toLocaleString("es-CL")}
                  </span>
                  <span class="text-xs font-semibold text-slate-400">CLP</span>
                </div>
                ${product.originalPrice ? `
                  <span class="text-xs text-slate-500 line-through">
                    $${product.originalPrice.toLocaleString("es-CL")}
                  </span>
                ` : ""}
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button 
                  data-id="${product.id}"
                  class="open-details-btn w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-700/60">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  <span>Ver Detalle</span>
                </button>

                <button 
                  data-id="${product.id}"
                  class="add-to-cart-btn w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 active:scale-95">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                  </svg>
                  <span>Agregar</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    // Conectar botones
    elements.productsGrid.querySelectorAll(".open-details-btn").forEach(btn => {
      btn.addEventListener("click", () => openProductModal(btn.dataset.id));
    });

    elements.productsGrid.querySelectorAll(".add-to-cart-btn").forEach(btn => {
      btn.addEventListener("click", () => addToCart(btn.dataset.id));
    });
  }

  // 5. Modal de Detalle de Producto
  function openProductModal(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    state.selectedProduct = product;

    const modalContent = document.getElementById("modal-product-content");
    modalContent.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        <!-- Mockup Visual de Gran Tamaño -->
        <div class="rounded-2xl p-6 bg-gradient-to-br ${product.accent || 'from-indigo-600 to-purple-800'} flex flex-col justify-between relative min-h-[300px]">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold bg-black/60 px-3 py-1 rounded-full text-white backdrop-blur-md">
              Código: ${product.code}
            </span>
            <span class="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-amber-400 text-amber-950">
              ${product.badge}
            </span>
          </div>

          <div class="text-center my-8">
            <div class="w-32 h-32 mx-auto rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl mb-4">
              <svg class="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <p class="text-xs font-medium text-white/80 tracking-widest uppercase">Muestra Visual del Pack</p>
          </div>

          <div class="bg-black/40 backdrop-blur-md rounded-xl p-3 text-xs text-slate-200">
            <p class="font-semibold text-white mb-1">Compatibilidad de Software:</p>
            <p class="text-slate-300">Adobe Photoshop, Illustrator, CorelDraw, Photopea (Gratis), Cricut Design Space.</p>
          </div>
        </div>

        <!-- Ficha Técnica y Compra -->
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
              <span>${product.category}</span>
              <span>•</span>
              <span>${product.target}</span>
            </div>

            <h2 class="text-2xl font-extrabold text-white mb-3 leading-tight">
              ${product.title}
            </h2>

            <div class="flex items-center gap-4 mb-4">
              <div class="flex items-center gap-1 text-amber-400 font-bold text-sm">
                ★ <span>${product.rating}</span>
                <span class="text-slate-400 text-xs font-normal">(${product.reviewsCount} valoraciones de clientes)</span>
              </div>
            </div>

            <p class="text-sm text-slate-300 leading-relaxed mb-6">
              ${product.description}
            </p>

            <!-- Características Incluidas -->
            <div class="mb-6">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">¿Qué incluye este pack?</h4>
              <ul class="space-y-2 text-xs text-slate-300">
                ${product.features.map(f => `
                  <li class="flex items-start gap-2">
                    <svg class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span>${f}</span>
                  </li>
                `).join("")}
                <li class="flex items-start gap-2 text-indigo-300 font-semibold">
                  <svg class="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  <span>Resolución: ${product.resolution}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Precios y Acciones -->
          <div class="pt-6 border-t border-slate-800">
            <div class="flex items-baseline justify-between mb-4">
              <div>
                <span class="text-3xl font-extrabold text-white">
                  $${product.price.toLocaleString("es-CL")}
                </span>
                <span class="text-sm font-semibold text-slate-400">CLP</span>
              </div>
              ${product.originalPrice ? `
                <div class="text-right">
                  <span class="text-sm text-slate-500 line-through">
                    $${product.originalPrice.toLocaleString("es-CL")}
                  </span>
                  <span class="block text-[11px] font-bold text-emerald-400">
                    Ahorras $${(product.originalPrice - product.price).toLocaleString("es-CL")} CLP
                  </span>
                </div>
              ` : ""}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                id="modal-add-cart-btn"
                class="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all border border-slate-700 flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
                <span>Añadir al Carrito</span>
              </button>

              <button 
                id="modal-direct-buy-btn"
                class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                <span>Comprar Ahora (Flow)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById("modal-add-cart-btn").addEventListener("click", () => {
      addToCart(product.id);
      closeProductModal();
    });

    document.getElementById("modal-direct-buy-btn").addEventListener("click", () => {
      // Agregar al carrito si no está y abrir checkout de inmediato
      if (!state.cart.some(i => i.id === product.id)) {
        addToCart(product.id, false);
      }
      closeProductModal();
      openCheckoutModal();
    });

    elements.productModal.classList.remove("hidden");
    elements.productModal.classList.add("flex");
  }

  function closeProductModal() {
    elements.productModal.classList.add("hidden");
    elements.productModal.classList.remove("flex");
    state.selectedProduct = null;
  }

  // 6. Carrito de Compras
  function addToCart(productId, notify = true) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      state.cart.push({
        id: product.id,
        code: product.code,
        title: product.title,
        price: product.price,
        target: product.target,
        accent: product.accent,
        quantity: 1
      });
    }

    saveCart();
    updateCartUI();
    if (notify) {
      showToast(`¡Añadido! ${product.code} está en tu carrito`, "success");
    }
  }

  function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    showToast("Pack eliminado del carrito", "info");
  }

  function updateQuantity(productId, delta) {
    const item = state.cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      saveCart();
      updateCartUI();
    }
  }

  function saveCart() {
    localStorage.setItem("sublima_cart", JSON.stringify(state.cart));
  }

  function getCartTotals() {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = 0;
    if (state.coupon && state.coupon.discount) {
      discount = Math.round(subtotal * state.coupon.discount);
    }
    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total };
  }

  function updateCartUI() {
    // Contador en navbar
    const totalCount = state.cart.reduce((sum, i) => sum + i.quantity, 0);
    elements.cartCounter.textContent = totalCount;
    elements.cartCounter.classList.toggle("hidden", totalCount === 0);

    // Listado en slide-over
    if (state.cart.length === 0) {
      elements.cartItemsList.innerHTML = `
        <div class="py-16 text-center text-slate-400">
          <svg class="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
          </svg>
          <p class="font-medium text-white mb-1">Tu carrito está vacío</p>
          <p class="text-xs">Explora el catálogo y añade los diseños que te gusten.</p>
        </div>
      `;
      elements.checkoutBtn.disabled = true;
      elements.checkoutBtn.classList.add("opacity-50", "cursor-not-allowed");
    } else {
      elements.cartItemsList.innerHTML = state.cart.map(item => `
        <div class="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div class="w-12 h-12 rounded-lg bg-gradient-to-br ${item.accent || 'from-indigo-600 to-purple-800'} flex items-center justify-center shrink-0 text-white font-bold text-xs">
            ${item.code}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-xs font-bold text-white truncate">${item.title}</h4>
            <p class="text-[11px] text-slate-400">$${item.price.toLocaleString("es-CL")} CLP c/u</p>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center bg-slate-900 rounded-lg border border-slate-700 text-xs">
              <button class="px-2 py-1 text-slate-400 hover:text-white qty-minus-btn" data-id="${item.id}">-</button>
              <span class="px-2 font-bold text-white">${item.quantity}</span>
              <button class="px-2 py-1 text-slate-400 hover:text-white qty-plus-btn" data-id="${item.id}">+</button>
            </div>
            <button class="text-slate-500 hover:text-rose-400 p-1 remove-item-btn" data-id="${item.id}" title="Eliminar">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>
      `).join("");

      elements.checkoutBtn.disabled = false;
      elements.checkoutBtn.classList.remove("opacity-50", "cursor-not-allowed");

      // Botones de cantidad
      elements.cartItemsList.querySelectorAll(".qty-minus-btn").forEach(btn => {
        btn.addEventListener("click", () => updateQuantity(btn.dataset.id, -1));
      });
      elements.cartItemsList.querySelectorAll(".qty-plus-btn").forEach(btn => {
        btn.addEventListener("click", () => updateQuantity(btn.dataset.id, 1));
      });
      elements.cartItemsList.querySelectorAll(".remove-item-btn").forEach(btn => {
        btn.addEventListener("click", () => removeFromCart(btn.dataset.id));
      });
    }

    // Totales
    const { subtotal, discount, total } = getCartTotals();
    elements.cartSubtotal.textContent = `$${subtotal.toLocaleString("es-CL")} CLP`;
    
    if (discount > 0) {
      elements.cartDiscountRow.classList.remove("hidden");
      elements.cartDiscount.textContent = `-$${discount.toLocaleString("es-CL")} CLP`;
    } else {
      elements.cartDiscountRow.classList.add("hidden");
    }

    elements.cartTotal.textContent = `$${total.toLocaleString("es-CL")} CLP`;
  }

  // 7. Drawer del Carrito (Abrir / Cerrar)
  function openCart() {
    elements.cartDrawer.classList.remove("translate-x-full");
    elements.cartBackdrop.classList.remove("hidden");
  }

  function closeCart() {
    elements.cartDrawer.classList.add("translate-x-full");
    elements.cartBackdrop.classList.add("hidden");
  }

  // 8. Aplicar Cupón
  function applyCoupon() {
    const code = elements.couponInput.value.trim().toUpperCase();
    if (!code) return;

    const couponData = window.CONFIG.coupons[code];
    if (couponData) {
      state.coupon = { code, ...couponData };
      updateCartUI();
      showToast(`¡Cupón aplicado! ${couponData.label}`, "success");
      elements.couponInput.disabled = true;
      elements.applyCouponBtn.textContent = "Aplicado ✓";
      elements.applyCouponBtn.classList.add("bg-emerald-600");
    } else {
      showToast("Código de descuento no válido", "error");
    }
  }

  // 9. Modal de Checkout (Pago Flow)
  function openCheckoutModal() {
    if (state.cart.length === 0) return;
    closeCart();

    const { total, itemsCount } = getCartTotals();
    elements.checkoutSummary.innerHTML = `
      <div class="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 mb-4">
        <div class="flex justify-between text-xs text-slate-400 mb-1">
          <span>Total de Packs a comprar:</span>
          <span class="font-bold text-white">${state.cart.length}</span>
        </div>
        <div class="flex justify-between items-baseline pt-2 border-t border-slate-700/60">
          <span class="text-sm font-bold text-white">Monto Total a Pagar:</span>
          <span class="text-xl font-extrabold text-emerald-400">$${total.toLocaleString("es-CL")} CLP</span>
        </div>
      </div>
    `;

    elements.checkoutModal.classList.remove("hidden");
    elements.checkoutModal.classList.add("flex");
  }

  function closeCheckoutModal() {
    elements.checkoutModal.classList.add("hidden");
    elements.checkoutModal.classList.remove("flex");
  }

  // 10. Procesar Checkout (Flow o WhatsApp Directo)
  elements.checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("submit-order-btn");
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
      </svg>
      <span>Conectando con Flow.cl...</span>
    `;

    const customer = {
      name: document.getElementById("customer-name").value.trim(),
      email: document.getElementById("customer-email").value.trim(),
      phone: document.getElementById("customer-phone").value.trim()
    };

    const { total, discount } = getCartTotals();

    try {
      const result = await flow.processOrder({
        customer,
        items: state.cart,
        total,
        discount
      });

      if (result.mode === "fallback") {
        // Modo asistido / WhatsApp para cuando se previsualiza sin backend activo
        showToast("¡Pedido generado! Abriendo contacto directo...", "success");
        setTimeout(() => {
          window.open(result.whatsappUrl, "_blank");
          closeCheckoutModal();
        }, 1000);
      }

    } catch (err) {
      showToast(err.message || "Error procesando el pedido", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

  // 11. Toast Notifications
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = "toast";
    
    let icon = `
      <svg class="w-5 h-5 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    `;

    if (type === "success") {
      icon = `
        <svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      `;
    } else if (type === "error") {
      icon = `
        <svg class="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      `;
    }

    toast.innerHTML = `
      ${icon}
      <span class="text-xs font-medium text-slate-200">${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // 12. Listeners de Búsqueda y Ordenamiento
  elements.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderProducts();
  });

  elements.sortSelect.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderProducts();
  });

  // 13. Listeners del Carrito
  elements.openCartBtn.addEventListener("click", openCart);
  elements.closeCartBtn.addEventListener("click", closeCart);
  elements.cartBackdrop.addEventListener("click", closeCart);
  elements.checkoutBtn.addEventListener("click", openCheckoutModal);
  elements.applyCouponBtn.addEventListener("click", applyCoupon);

  // 14. Listeners Modales
  elements.closeModalBtn.addEventListener("click", closeProductModal);
  elements.productModal.addEventListener("click", (e) => {
    if (e.target === elements.productModal) closeProductModal();
  });

  elements.closeCheckoutModalBtn.addEventListener("click", closeCheckoutModal);
  elements.checkoutModal.addEventListener("click", (e) => {
    if (e.target === elements.checkoutModal) closeCheckoutModal();
  });

  // Tecla Escape para cerrar modales
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeProductModal();
      closeCheckoutModal();
      closeCart();
    }
  });
});
