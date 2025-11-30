// ====================================================================
// GLOBAL CONFIGURATION
// ====================================================================

// Use "/api" for relative path in Vercel deployment
const API_BASE_URL = "/api";

// ====================================================================
// IN-MEMORY STORAGE & STATE MANAGEMENT
// ====================================================================

let _cartData = [];
let _wishlistData = [];
let _searchHistoryData = [];
let _currentUser = null;
let _authToken = null;

// Initialize state from LocalStorage (Keeps you logged in)
const storedUser = localStorage.getItem("user");
const storedToken = localStorage.getItem("token");
if (storedUser && storedToken) {
  _currentUser = JSON.parse(storedUser);
  _authToken = storedToken;
}

// ====================================================================
// 1. CART MANAGEMENT SYSTEM
// ====================================================================

class CartManager {
  constructor() {
    this.cart = _cartData || [];
    this.wishlist = _wishlistData || [];
    this.savedForLater = []; // New: Saved for Later list
    this.coupon = null; // New: Applied coupon data

    // If user is logged in, fetch their cart/saved items from DB immediately
    if (_currentUser && _authToken) {
      this.syncWithBackend(true); // true = PULL from server
    }

    this.updateUI();
  }

  // --- Backend Syncing Logic ---
  async syncWithBackend(pull = false) {
    if (!_currentUser || !_authToken) return;

    try {
      // PULL: Get latest data from DB (e.g., on login)
      if (pull) {
        const res = await fetch(`${API_BASE_URL}/user`, {
          headers: { Authorization: `Bearer ${_authToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          // Merge Strategy: Server data overwrites local on login
          if (data.cart) this.cart = data.cart;
          if (data.wishlist) this.wishlist = data.wishlist;
          if (data.savedForLater) this.savedForLater = data.savedForLater;
          if (data.recentlyViewed)
            localStorage.setItem(
              "recentlyViewed",
              JSON.stringify(data.recentlyViewed)
            );

          this.updateUI();
        }
      }
      // PUSH: Save local state to DB
      else {
        await fetch(`${API_BASE_URL}/user`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${_authToken}`,
          },
          body: JSON.stringify({
            cart: this.cart,
            wishlist: this.wishlist,
            savedForLater: this.savedForLater,
          }),
        });
      }
      if (res.status === 401) {
        console.warn("Session expired. Logging out.");
        logoutUser(); // This clears bad tokens
        return;
      }
    } catch (e) {
      console.error("Sync failed", e);
    }
  }

  // --- Cart Actions ---

  // Returns TRUE if successful, FALSE if failed
  addToCart(product, quantity = 1, variants = {}) {
    const stock = parseInt(product.stock);
    const qty = parseInt(quantity);

    // 1. Check Global Stock
    if (!isNaN(stock) && stock < qty) {
      this.showToast(`Sorry, only ${stock} items in stock!`, "error");
      return false;
    }

    const existingItem = this.cart.find((item) => item.title === product.title);
    const price = parseFloat(product.price) || 0;

    if (existingItem) {
      // 2. Check Cumulative Stock
      const currentQty = parseInt(existingItem.quantity);
      if (!isNaN(stock) && currentQty + qty > stock) {
        this.showToast(
          `Max stock reached! You have ${currentQty} in cart.`,
          "warning"
        );
        return false;
      }
      existingItem.quantity = currentQty + qty;
    } else {
      // 3. Add New Item
      this.cart.push({
        ...product, // Spreads title, image, id
        price: price,
        quantity: qty,
        selectedSize: variants.size || product.selectedSize || null,
        selectedColor: variants.color || product.selectedColor || null,
      });
    }

    this.showToast(`${product.title} added to cart!`, "success");
    this.syncWithBackend(false); // Push to DB
    this.updateUI();
    return true;
  }

  removeFromCart(productTitle) {
    this.cart = this.cart.filter((item) => item.title !== productTitle);
    this.syncWithBackend(false);
    this.updateUI();

    // If empty, force refresh modal
    if (
      this.cart.length === 0 &&
      document.getElementById("cart-modal").classList.contains("active")
    ) {
      this.updateCartDropdown();
    }
  }

  updateQuantity(productTitle, quantity) {
    const item = this.cart.find((item) => item.title === productTitle);
    if (item) {
      const qty = parseInt(quantity);
      if (qty <= 0) {
        this.removeFromCart(productTitle);
      } else {
        // Stock Check
        if (item.stock && qty > item.stock) {
          this.showToast(`Max stock reached`, "error");
          return;
        }
        item.quantity = qty;
        this.syncWithBackend(false);
        this.updateUI();
      }
    }
  }

  clearCart() {
    this.cart = [];
    this.coupon = null; // Clear coupon too
    this.syncWithBackend(false);
    this.updateUI();
  }

  // --- Save For Later Feature ---
  saveForLater(productTitle) {
    const itemIndex = this.cart.findIndex((i) => i.title === productTitle);
    if (itemIndex > -1) {
      const item = this.cart[itemIndex];
      this.savedForLater.push(item); // Move to Saved
      this.cart.splice(itemIndex, 1); // Remove from Cart

      this.showToast("Saved for later", "info");
      this.syncWithBackend(false);
      this.updateUI();
    }
  }

  moveToCart(productTitle) {
    const itemIndex = this.savedForLater.findIndex(
      (i) => i.title === productTitle
    );
    if (itemIndex > -1) {
      const item = this.savedForLater[itemIndex];
      // Try to add back to cart (Checks stock)
      const success = this.addToCart(item, item.quantity, {
        size: item.selectedSize,
        color: item.selectedColor,
      });
      if (success) {
        this.savedForLater.splice(itemIndex, 1); // Remove from saved if add successful
        this.syncWithBackend(false);
        this.updateUI();
      }
    }
  }

  // --- Coupon Feature ---
  async applyCoupon(code) {
    if (!code) return;
    const btn = document.getElementById("btn-apply-coupon");
    const msg = document.getElementById("coupon-msg");

    if (btn) btn.textContent = "Checking...";

    try {
      const res = await fetch(`${API_BASE_URL}/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code, cartTotal: this.getCartTotal() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        this.coupon = data; // Store applied coupon
        this.showToast("Coupon Applied!", "success");
        if (msg) {
          msg.textContent = `Applied! -₹${data.discountAmount}`;
          msg.className = "coupon-message success";
        }
      } else {
        this.coupon = null;
        this.showToast(data.error || "Invalid Coupon", "error");
        if (msg) {
          msg.textContent = data.error || "Invalid Code";
          msg.className = "coupon-message error";
        }
      }
    } catch (e) {
      console.error(e);
      this.showToast("Error applying coupon", "error");
    } finally {
      if (btn) btn.textContent = "Apply";
      this.updateUI(); // Re-calculate totals
    }
  }

  // --- Wishlist Actions ---
  toggleWishlist(product) {
    const index = this.wishlist.findIndex(
      (item) => item.title === product.title
    );
    if (index === -1) {
      this.wishlist.push(product);
      this.showToast("Added to wishlist!", "success");
    } else {
      this.wishlist.splice(index, 1);
      this.showToast("Removed from wishlist!", "info");
    }
    this.syncWithBackend(false); // Sync wishlist too
    this.updateWishlistUI();
  }

  isInWishlist(productTitle) {
    return this.wishlist.some((item) => item.title === productTitle);
  }

  // --- Calculations & Helpers ---
  getCartTotal() {
    return this.cart.reduce(
      (total, item) => total + parseFloat(item.price) * item.quantity,
      0
    );
  }

  getEstimatedDelivery() {
    const date = new Date();
    date.setDate(date.getDate() + 5); // Add 5 days
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // --- UI Updates ---
  updateUI() {
    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
      const totalItems = this.cart.reduce(
        (total, item) => total + item.quantity,
        0
      );
      cartCount.textContent = totalItems;
    }
    this.updateCartDropdown();
    this.updateWishlistUI();
  }

  updateCartDropdown() {
    const container = document.getElementById("cart-modal-items");
    const totalEl = document.getElementById("cart-modal-total");

    // 1. Render Active Cart Items
    let htmlContent =
      this.cart.length === 0
        ? '<div class="cart-modal-empty" style="text-align:center; padding:20px;"><i class="fas fa-shopping-basket" style="font-size:2rem; color:#ccc;"></i><p>Your cart is empty</p></div>'
        : this.cart
            .map(
              (item) => `
          <div class="cart-modal-item">
            <img src="${
              item.image
            }" alt="product" class="cart-modal-item-image">
            <div class="cart-modal-item-details">
              <div class="cart-modal-item-title">${item.title}</div>
              <div class="cart-modal-item-price">₹${parseFloat(
                item.price
              ).toFixed(2)}</div>
              ${
                item.selectedSize
                  ? `<small>Size: ${item.selectedSize}</small>`
                  : ""
              }
              
              <div class="delivery-date"><i class="fas fa-truck"></i> Get it by ${this.getEstimatedDelivery()}</div>

              <div class="cart-modal-item-quantity">
                <button class="cart-modal-qty-btn" onclick="window.cartManager.updateQuantity('${item.title.replace(
                  /'/g,
                  "\\'"
                )}', ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
                <button class="cart-modal-qty-btn" onclick="window.cartManager.updateQuantity('${item.title.replace(
                  /'/g,
                  "\\'"
                )}', ${item.quantity + 1})">+</button>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px;">
                <i class="fas fa-trash cart-modal-item-remove" onclick="window.cartManager.removeFromCart('${item.title.replace(
                  /'/g,
                  "\\'"
                )}')"></i>
                <button onclick="window.cartManager.saveForLater('${item.title.replace(
                  /'/g,
                  "\\'"
                )}')" style="font-size:0.75rem; text-decoration:underline; border:none; background:none; color:#666; cursor:pointer;">Save for Later</button>
            </div>
          </div>
        `
            )
            .join("");

    // 2. Render "Saved For Later" Section
    if (this.savedForLater.length > 0) {
      htmlContent += `<div class="saved-for-later-section">
            <h4 style="margin:10px 0; color:#666;">Saved for Later (${
              this.savedForLater.length
            })</h4>
            ${this.savedForLater
              .map(
                (item) => `
                <div class="saved-item">
                    <img src="${item.image}" alt="${item.title}">
                    <div style="flex:1">
                        <div style="font-size:0.9rem; font-weight:600;">${
                          item.title
                        }</div>
                        <div style="font-size:0.85rem;">₹${item.price}</div>
                    </div>
                    <button class="btn-move-cart" onclick="window.cartManager.moveToCart('${item.title.replace(
                      /'/g,
                      "\\'"
                    )}')">Move to Cart</button>
                </div>
            `
              )
              .join("")}
        </div>`;
    }

    if (container) container.innerHTML = htmlContent;

    // 3. Render Coupon Input (If not already present in HTML, inject it)
    const summaryDiv = document.querySelector(".cart-modal-summary");
    if (summaryDiv && !document.getElementById("coupon-input")) {
      const couponHTML = `
            <div class="coupon-section">
                <label style="font-size:0.9rem; font-weight:600;">Have a Coupon?</label>
                <div class="coupon-input-group">
                    <input type="text" id="coupon-input" placeholder="Enter Code (e.g. SAVE100)">
                    <button class="btn-apply" id="btn-apply-coupon" onclick="window.cartManager.applyCoupon(document.getElementById('coupon-input').value)">Apply</button>
                </div>
                <div id="coupon-msg" class="coupon-message"></div>
            </div>
        `;
      summaryDiv.insertAdjacentHTML("afterbegin", couponHTML);
    }

    // 4. Calculate Totals
    const sub = this.getCartTotal();
    const tax = sub * 0.18;
    const shipping = sub > 2000 ? 0 : sub > 0 ? 150 : 0;
    const discount = this.coupon ? this.coupon.discountAmount : 0;
    const total = sub + tax + shipping - discount;

    if (document.getElementById("cart-modal-subtotal"))
      document.getElementById("cart-modal-subtotal").textContent =
        sub.toFixed(2);
    if (document.getElementById("cart-modal-tax"))
      document.getElementById("cart-modal-tax").textContent = tax.toFixed(2);
    if (document.getElementById("cart-modal-shipping"))
      document.getElementById("cart-modal-shipping").textContent =
        shipping.toFixed(2);

    // Add Discount Row display if coupon applied
    // (Ideally you add a row in HTML, but logic here calculates the final total)

    if (document.getElementById("cart-modal-total"))
      document.getElementById("cart-modal-total").textContent =
        total.toFixed(2);
  }

  updateWishlistUI() {
    const count = document.querySelector(".wishlist-count");
    if (count) count.textContent = this.wishlist.length;

    const container = document.getElementById("wishlist-items");
    const mobileContainer = document.getElementById("mobile-wishlist-items");

    const generateList = (isMobile) => {
      if (this.wishlist.length === 0)
        return '<p style="text-align:center; color:#999; padding:10px;">No items</p>';
      return this.wishlist
        .map(
          (item) => `
            <div class="${isMobile ? "mobile-wishlist-item" : "wishlist-item"}">
                <div class="${
                  isMobile
                    ? "mobile-wishlist-item-title"
                    : "wishlist-item-title"
                }">${item.title}</div>
                <i class="fas fa-trash ${
                  isMobile ? "mobile-wishlist-remove" : "wishlist-item-remove"
                }" 
                   onclick="window.cartManager.toggleWishlist({title: '${item.title.replace(
                     /'/g,
                     "\\'"
                   )}'})"></i>
            </div>
        `
        )
        .join("");
    };

    if (container) container.innerHTML = generateList(false);
    if (mobileContainer) mobileContainer.innerHTML = generateList(true);
  }

  showToast(message, type = "success") {
    const existingToast = document.querySelector(".toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  generateRatingHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let html = '<div class="stars" style="color: #ffc107; font-size: 0.8rem;">';
    for (let i = 0; i < fullStars; i++) html += '<i class="fas fa-star"></i>';
    if (hasHalfStar) html += '<i class="fas fa-star-half-alt"></i>';
    html += `</div>`;
    return html;
  }
}

// ====================================================================
// 2. PAGINATION SYSTEM
// ====================================================================

class ProductPagination {
  constructor() {
    this.currentPage = 1;
    this.productsPerPage = 6;
    this.currentProducts = [];
  }

  updateProducts(products) {
    this.currentProducts = products;
    this.currentPage = 1;
    this.render();
    this.setupPaginationControls();
  }

  render() {
    const container = document.getElementById("products-container");
    if (!container) return;

    container.innerHTML = "";

    const startIndex = (this.currentPage - 1) * this.productsPerPage;
    const endIndex = startIndex + this.productsPerPage;
    const productsToShow = this.currentProducts.slice(startIndex, endIndex);

    productsToShow.forEach((product) => {
      if (window.productManager) {
        container.appendChild(window.productManager.createProductCard(product));
      }
    });
  }

  setupPaginationControls() {
    const container = document.getElementById("products-container");
    if (!container) return;

    const existingWrapper = document.querySelector(".pagination-wrapper");
    if (existingWrapper) existingWrapper.remove();

    const totalPages = Math.ceil(
      this.currentProducts.length / this.productsPerPage
    );

    // Only show pagination if more than 1 page
    if (totalPages <= 1) return;

    const paginationWrapper = document.createElement("div");
    paginationWrapper.className = "pagination-wrapper";
    paginationWrapper.style.cssText =
      "display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 40px; grid-column: 1 / -1;";

    const prevBtn = document.createElement("button");
    prevBtn.className = "btn-secondary pagination-btn";
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Prev';
    prevBtn.disabled = this.currentPage === 1;
    prevBtn.style.opacity = this.currentPage === 1 ? "0.5" : "1";

    prevBtn.addEventListener("click", () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.render();
        this.setupPaginationControls();
      }
    });

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn-secondary pagination-btn";
    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = this.currentPage === totalPages;
    nextBtn.style.opacity = this.currentPage === totalPages ? "0.5" : "1";

    nextBtn.addEventListener("click", () => {
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.render();
        this.setupPaginationControls();
      }
    });

    const pageInfo = document.createElement("span");
    pageInfo.innerText = `Page ${this.currentPage} of ${totalPages}`;
    pageInfo.style.fontWeight = "600";

    paginationWrapper.appendChild(prevBtn);
    paginationWrapper.appendChild(pageInfo);
    paginationWrapper.appendChild(nextBtn);

    container.parentNode.insertBefore(paginationWrapper, container.nextSibling);
  }
}

// ====================================================================
// 3. PRODUCT MANAGEMENT (With Recently Viewed Feature)
// ====================================================================

class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.searchHistory = _searchHistoryData;
    if (!window.productDataMap) window.productDataMap = {};
    this.init();
  }

  async init() {
    this.initializeProductEvents();
    await this.fetchProducts();
    this.initializeFilters();
    this.initializeSearch();
  }

  async fetchProducts() {
    // 1. Define container at the top so it's available in try AND catch blocks
    const container = document.getElementById("products-container");

    // 2. Show Skeleton Loading Screen
    if (container) {
      container.innerHTML = Array(6)
        .fill("")
        .map(
          () => `
            <div class="product-card skeleton-card">
                <div class="skeleton" style="height: 200px; width:100%; margin-bottom:10px;"></div>
                <div class="skeleton" style="height: 20px; width:60%; margin-bottom:5px;"></div>
                <div class="skeleton" style="height: 20px; width:40%;"></div>
            </div>
        `
        )
        .join("");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (!Array.isArray(data)) {
        this.products = [];
        this.filteredProducts = [];
        return;
      }

      this.products = data;
      this.filteredProducts = [...this.products];
      this.renderProductCards();
    } catch (error) {
      console.error("Failed to fetch products:", error);
      // 3. Now 'container' is defined, so this won't crash
      if (container) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px;"><h3>Failed to load products</h3><p>${error.message}</p></div>`;
      }
    }
  }

  renderProductCards() {
    // Check if pagination is active
    if (window.productPagination) {
      window.productPagination.updateProducts(this.filteredProducts);
    } else {
      const container = document.getElementById("products-container");
      if (!container) return;
      container.innerHTML = "";
      this.filteredProducts.forEach((p) =>
        container.appendChild(this.createProductCard(p))
      );
    }
  }

  createProductCard(product) {
    const key =
      product._id ||
      product.title.replace(/\s+/g, "_") +
        Math.random().toString(36).substr(2, 5);
    window.productDataMap[key] = product;

    const card = document.createElement("div");
    card.className = "product-card";
    card.setAttribute("data-product-key", key);

    let ratingHTML = '<div class="stars"><i class="fas fa-star"></i></div>';
    if (window.cartManager?.generateRatingHTML) {
      ratingHTML = window.cartManager.generateRatingHTML(product.rating || 4.5);
    }

    let discountBadge = "";
    if (product.originalPrice && product.originalPrice > product.price) {
      const percent = Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      );
      discountBadge = `<span class="price-discount">-${percent}%</span>`;
    }

    const isOutOfStock = product.stock !== undefined && product.stock <= 0;
    let stockBadge = "";

    // Detailed Stock Badge Logic
    if (isOutOfStock) {
      stockBadge = `<div class="product-badge" style="background:#666">Sold Out</div>`;
    } else if (product.stock <= 3) {
      // Low Stock Warning
      stockBadge = `<div class="product-badge" style="background:var(--accent-color); font-size:0.75rem;">Hurry! Only ${product.stock} Left</div>`;
    } else {
      // Sufficient Stock
      stockBadge = `<div class="product-badge" style="background:var(--success-color)">In Stock</div>`;
    }

    // Override with Bestseller/New if plenty of stock
    if (!isOutOfStock && product.stock > 3) {
      if (product.isBestSeller)
        stockBadge = `<div class="product-badge">Bestseller</div>`;
      else if (product.isNewArrival)
        stockBadge = `<div class="product-badge" style="background:var(--accent-color)">New</div>`;
    }

    const btnState = isOutOfStock
      ? 'disabled style="background:#ccc; cursor:not-allowed;"'
      : "";
    const btnText = isOutOfStock ? "Out of Stock" : "Add to Cart";
    const buyBtnState = isOutOfStock ? 'disabled style="display:none"' : "";

    card.innerHTML = `
      ${stockBadge}
      <div class="product-image-wrapper">
        <img class="product-image" src="${product.image}" alt="${
      product.title
    }" />
    <button class="btn-wishlist"><i class="far fa-heart"></i></button>
        <div class="product-overlay">
          <button class="btn-quick-view">Quick View</button>
        </div>
      </div>
      <div class="product-info">
        <div class="product-brand">${product.brand}</div>
        <h3 class="product-title">${product.title}</h3>
        <div class="product-rating">${ratingHTML}</div>
        <div class="product-price">
          <span class="price-current">₹${product.price}</span>
          ${
            product.originalPrice
              ? `<span class="price-original">₹${product.originalPrice}</span>`
              : ""
          }
          ${discountBadge}
        </div>
        <div class="product-actions">
          <button class="btn-add-cart" ${btnState}>${btnText}</button>
          <button class="btn-buy-now" ${buyBtnState}>Buy Now</button>
        </div>
      </div>
    `;
    return card;
  }

  initializeProductEvents() {
    // We attach listeners to both main grid AND recently viewed grid
    const handleClicks = (e) => {
      // 1. Quick View
      const quickViewBtn = e.target.closest(".btn-quick-view");
      if (quickViewBtn) {
        e.stopPropagation();
        e.preventDefault();
        const card = quickViewBtn.closest(".product-card");
        const key = card.getAttribute("data-product-key");
        const productData = window.productDataMap[key];

        if (productData && window.quickViewModal) {
          window.quickViewModal.showQuickView(productData);
        }
        return;
      }

      // 2. Buttons
      const btn = e.target.closest("button");
      if (!btn) return;

      const card = btn.closest(".product-card");
      if (!card) return;

      const key = card.getAttribute("data-product-key");
      const productData = window.productDataMap[key];

      if (productData) {
        if (btn.classList.contains("btn-add-cart")) {
          if (btn.disabled) return;
          window.cartManager.addToCart(productData);
        } else if (btn.classList.contains("btn-wishlist")) {
          e.stopPropagation();
          window.cartManager.toggleWishlist(productData);
        } else if (btn.classList.contains("btn-buy-now")) {
          if (btn.disabled) return;
          productData.quantity = 1;
          // IMPORTANT: Open payment modal with single item
          openPaymentModal([productData]);
        }
      }
    };

    document
      .getElementById("products-container")
      ?.addEventListener("click", handleClicks);
    document
      .getElementById("recently-viewed-container")
      ?.addEventListener("click", handleClicks);
  }

  initializeFilters() {
    const categoryFilter = document.getElementById("category-filter");
    const brandFilter = document.getElementById("brand-filter");
    const sortFilter = document.getElementById("sort-filter");
    const priceRange = document.getElementById("price-range");
    const priceNumber = document.getElementById("price-number");
    const stockFilter = document.getElementById("stock-filter");
    const ratingFilter = document.getElementById("rating-filter");

    if (categoryFilter)
      categoryFilter.addEventListener("change", () => this.applyFilters());
    if (brandFilter)
      brandFilter.addEventListener("change", () => this.applyFilters());
    if (sortFilter)
      sortFilter.addEventListener("change", () => this.applyFilters());

    if (priceRange && priceNumber) {
      priceRange.addEventListener("input", (e) => {
        priceNumber.value = e.target.value;
        this.applyFilters();
      });
      priceNumber.addEventListener("input", (e) => {
        let val = parseInt(e.target.value);
        if (val > 50000) val = 50000;
        if (val < 0) val = 0;
        priceRange.value = val;
        this.applyFilters();
      });
    }

    if (stockFilter)
      stockFilter.addEventListener("change", () => this.applyFilters());
    if (ratingFilter)
      ratingFilter.addEventListener("change", () => this.applyFilters());
  }

  applyFilters() {
    const category = document.getElementById("category-filter")?.value || "all";
    const brand = document.getElementById("brand-filter")?.value || "all";
    const sort = document.getElementById("sort-filter")?.value || "featured";

    const maxPriceInput = document.getElementById("price-number");
    const maxPrice = maxPriceInput ? parseInt(maxPriceInput.value) : 50000;
    const inStockOnly =
      document.getElementById("stock-filter")?.checked || false;
    const highRating =
      document.getElementById("rating-filter")?.checked || false;

    this.filteredProducts = this.products.filter((product) => {
      const catMatch = category === "all" || product.category === category;
      const brandMatch = brand === "all" || product.brand === brand;
      const priceMatch = product.price <= maxPrice;
      const stockMatch = !inStockOnly || (product.stock && product.stock > 0);
      const ratingMatch =
        !highRating || (product.rating && product.rating >= 4);

      return catMatch && brandMatch && priceMatch && stockMatch && ratingMatch;
    });

    switch (sort) {
      case "price-low":
        this.filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        this.filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        this.filteredProducts.sort((a, b) => b.rating - a.rating);
        break;
    }
    this.renderProductCards();
  }

  initializeSearch() {
    const input = document.getElementById("search-input");
    const btn = document.getElementById("search-btn");
    const suggestions = document.getElementById("search-suggestions");

    const performSearch = (query) => {
      if (!query) return;
      this.searchProducts(query);
      if (suggestions) suggestions.classList.remove("active");

      const productsSection = document.querySelector(".products-section");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth" });
      }
    };

    if (input) {
      input.addEventListener("input", (e) => {
        const query = e.target.value;
        if (query.length > 0) {
          this.showSuggestions(query, suggestions, input);
        } else {
          suggestions.classList.remove("active");
        }
      });

      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") performSearch(input.value);
      });
    }

    if (btn) {
      btn.addEventListener("click", () => {
        if (input) performSearch(input.value);
      });
    }
  }

  searchProducts(query) {
    const searchTerm = query.toLowerCase().trim();

    const hero = document.querySelector(".hero-section");
    if (hero) hero.style.display = searchTerm.length > 0 ? "none" : "block";

    if (!searchTerm) {
      this.filteredProducts = [...this.products];
    } else {
      this.filteredProducts = this.products.filter(
        (product) =>
          product.title.toLowerCase().includes(searchTerm) ||
          product.brand.toLowerCase().includes(searchTerm) ||
          (product.category &&
            product.category.toLowerCase().includes(searchTerm))
      );
    }
    this.renderProductCards();
  }
}

// ====================================================================
// 4. QUICK VIEW MODAL (Enhanced with Related & FBT)
// ====================================================================

class QuickViewModal {
  constructor() {
    this.modal = document.getElementById("quick-view-modal");
    this.currentProduct = null;
    this.currentQuantity = 1;
    this.currentFBT = null;
    this.init();
  }

  init() {
    const closeBtn = document.getElementById("close-quick-view");
    if (closeBtn) closeBtn.onclick = () => this.closeModal();

    const qtyMinus = this.modal?.querySelector(".qty-minus");
    const qtyPlus = this.modal?.querySelector(".qty-plus");
    const qtyInput = this.modal?.querySelector(".qty-input");

    // Quantity Decrement
    if (qtyMinus) {
      qtyMinus.onclick = () => {
        if (this.currentQuantity > 1) {
          this.currentQuantity--;
          if (qtyInput) qtyInput.value = this.currentQuantity;
        }
      };
    }

    // Quantity Increment (FIX: Strict Stock Check)
    if (qtyPlus) {
      qtyPlus.onclick = () => {
        if (this.currentProduct && this.currentProduct.stock !== undefined) {
          // Check Modal Value vs Stock
          if (this.currentQuantity >= this.currentProduct.stock) {
            window.cartManager.showToast(
              `Max stock reached! Only ${this.currentProduct.stock} available.`,
              "warning"
            );
            return; // STOP here
          }
        }
        this.currentQuantity++;
        if (qtyInput) qtyInput.value = this.currentQuantity;
      };
    }
  }

  showQuickView(product) {
    if (!this.modal) return;
    this.currentProduct = product;
    this.currentQuantity = 1; // Reset quantity on open

    // 1. Fill Basic Info
    this.modal.querySelector("#quick-view-title").textContent = product.title;
    this.modal.querySelector("#quick-view-img").src = product.image;
    this.modal.querySelector(
      "#quick-view-price"
    ).innerHTML = `<span class="price-current">₹${product.price}</span>`;

    // Reset Input UI
    const qtyInput = this.modal.querySelector(".qty-input");
    if (qtyInput) qtyInput.value = 1;

    // 2. Generate Description & Variants
    const descHTML = `<div style="margin: 10px 0; color: #666; font-size: 0.95rem;">${
      product.description || "No description."
    }</div>`;
    let variantsHTML =
      '<div class="variant-selector-container" style="margin-bottom:15px;">';
    if (product.sizes?.length)
      variantsHTML += `<div class="variant-group"><label>Size:</label><select id="qv-size">${product.sizes
        .map((s) => `<option>${s}</option>`)
        .join("")}</select></div>`;
    if (product.colors?.length)
      variantsHTML += `<div class="variant-group"><label>Color:</label><select id="qv-color">${product.colors
        .map((c) => `<option>${c}</option>`)
        .join("")}</select></div>`;
    variantsHTML += "</div>";

    // 3. Clean up old dynamic content
    const detailsDiv = this.modal.querySelector(".quick-view-details");
    detailsDiv
      .querySelectorAll(".qv-injected, .qv-related-section, .qv-fbt-section")
      .forEach((e) => e.remove());

    // 4. Inject Description/Variants AFTER Price
    const wrapper = document.createElement("div");
    wrapper.className = "qv-injected";
    wrapper.innerHTML = descHTML + variantsHTML;
    this.modal
      .querySelector("#quick-view-price")
      .insertAdjacentElement("afterend", wrapper);

    // 5. Inject FBT & Related (FIX: Insert BEFORE the Actions buttons)
    // We append them to detailsDiv, but we use CSS 'order' or insertBefore to position them above buttons
    const actionsDiv = this.modal.querySelector(".quick-view-actions");

    // Render functions will now return HTML elements instead of auto-appending
    const fbtElement = this.createFBTElement(product);
    const relatedElement = this.createRelatedElement(product);

    // Insert them specifically before the buttons
    if (fbtElement) detailsDiv.insertBefore(fbtElement, actionsDiv);
    if (relatedElement) detailsDiv.insertBefore(relatedElement, actionsDiv);

    // 6. "Add to Cart" Button Logic (FIX: Adding only 1 bug)
    const btn = this.modal.querySelector(".btn-add-cart-modal");

    // Reset button state
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    if (product.stock !== undefined && product.stock <= 0) {
      newBtn.disabled = true;
      newBtn.textContent = "Out of Stock";
      newBtn.style.background = "#ccc";
    } else {
      newBtn.disabled = false;
      newBtn.textContent = "Add to Cart";
      newBtn.style.background = "";

      newBtn.onclick = () => {
        const size = document.getElementById("qv-size")?.value;
        const color = document.getElementById("qv-color")?.value;

        // FIX: Read the exact value from the input field to be 100% sure
        const qtyInput = this.modal.querySelector(".qty-input");
        const finalQty = parseInt(qtyInput.value) || 1;

        // Pass finalQty instead of this.currentQuantity to be safe
        const success = window.cartManager.addToCart(product, finalQty, {
          size,
          color,
        });

        if (success) {
          this.closeModal();
        }
      };
    }

    this.modal.style.display = "flex";
  }

  // --- Helper: Create Related HTML Element ---
  createRelatedElement(currentProduct) {
    const allProducts = window.productManager.products;
    const related = allProducts
      .filter(
        (p) =>
          p.category === currentProduct.category && p._id !== currentProduct._id
      )
      .slice(0, 3);
    if (related.length === 0) return null;

    const div = document.createElement("div");
    div.className = "qv-related-section";
    div.innerHTML = `
        <h4 style="margin: 15px 0 10px; color: var(--primary-color); font-size:1rem;">Related Products</h4>
        <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px;">
          ${related
            .map(
              (p) => `
            <div onclick="window.quickViewModal.showQuickView(window.productDataMap['${p._id}'])" style="min-width: 90px; cursor: pointer; border: 1px solid #eee; padding: 5px; border-radius: 8px;">
              <img src="${p.image}" style="width: 100%; height: 60px; object-fit: contain;">
              <div style="font-size: 0.75rem; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.title}</div>
              <div style="font-size: 0.75rem; color: var(--primary-color);">₹${p.price}</div>
            </div>
          `
            )
            .join("")}
        </div>`;
    return div;
  }

  // --- Helper: Create FBT HTML Element ---
  createFBTElement(currentProduct) {
    if (!currentProduct.frequentlyBoughtTogether?.length) return null;
    const fbtProducts = window.productManager.products.filter((p) =>
      currentProduct.frequentlyBoughtTogether.includes(p._id)
    );
    if (fbtProducts.length === 0) return null;

    const bundlePrice =
      fbtProducts.reduce((sum, p) => sum + p.price, 0) + currentProduct.price;
    this.currentFBT = fbtProducts;

    const div = document.createElement("div");
    div.className = "qv-fbt-section";
    div.innerHTML = `
      <div style="background: #f0f8ff; padding: 10px; border-radius: 8px; margin: 15px 0; border: 1px dashed var(--primary-color);">
        <h4 style="margin: 0 0 10px; font-size: 0.9rem;">Frequently Bought Together</h4>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
           <img src="${
             currentProduct.image
           }" style="width: 40px; height: 40px; object-fit: contain;">
           <span style="font-weight: bold;">+</span>
           ${fbtProducts
             .map(
               (p) =>
                 `<img src="${p.image}" style="width: 40px; height: 40px; object-fit: contain;" title="${p.title}">`
             )
             .join("")}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: bold; color: var(--primary-color);">Bundle: ₹${bundlePrice}</div>
            <button class="btn-secondary" style="font-size: 0.8rem; padding: 5px 10px;" onclick="window.quickViewModal.addBundleToCart()">Add All</button>
        </div>
      </div>`;
    return div;
  }

  addBundleToCart() {
    if (!this.currentFBT) return;
    // Add main product
    window.cartManager.addToCart(this.currentProduct, 1);
    // Add FBT products
    this.currentFBT.forEach((p) => window.cartManager.addToCart(p, 1));
    this.closeModal();
    window.cartManager.showToast("Bundle added to cart!", "success");
  }

  closeModal() {
    if (this.modal) this.modal.style.display = "none";
  }
}

// ====================================================================
// 5. HERO CAROUSEL
// ====================================================================

class HeroCarousel {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 3;
    this.init();
  }

  init() {
    this.slides = document.querySelectorAll(".hero-slide");
    this.dots = document.querySelectorAll(".hero-dots .dot");
    if (this.slides.length === 0) return;

    this.startAutoPlay();
  }

  changeSlide(direction) {
    this.currentSlide += direction;
    if (this.currentSlide > this.totalSlides) {
      this.currentSlide = 1;
    }
    if (this.currentSlide < 1) {
      this.currentSlide = this.totalSlides;
    }
    this.updateSlide();
  }

  updateSlide() {
    this.slides.forEach((s) => s.classList.remove("active"));
    this.dots.forEach((d) => d.classList.remove("active"));

    const activeSlide = document.querySelector(
      `.hero-slide[data-slide="${this.currentSlide}"]`
    );
    const activeDot = document.querySelector(
      `.dot[data-slide="${this.currentSlide}"]`
    );

    if (activeSlide) activeSlide.classList.add("active");
    if (activeDot) activeDot.classList.add("active");
  }

  startAutoPlay() {
    setInterval(() => this.changeSlide(1), 5000);
  }
}

// ====================================================================
// 6. AUTHENTICATION & USER MANAGEMENT
// ====================================================================

function saveUser(user) {
  _currentUser = user;
  // FIX: Persist User in LocalStorage so it saves on reload
  localStorage.setItem("user", JSON.stringify(user));
  if (_authToken) localStorage.setItem("token", _authToken);
}

function getUser() {
  return _currentUser;
}

function logoutUser() {
  _currentUser = null;
  _authToken = null;
  // Clear storage
  localStorage.removeItem("user");
  localStorage.removeItem("token");

  if (window.cartManager) {
    window.cartManager.cart = [];
    window.cartManager.wishlist = [];
    _cartData = [];
    _wishlistData = [];
    window.cartManager.updateUI();
    window.cartManager.showToast("Logged out successfully!");
  }
  updateAccountUI();
}

function updateAccountUI() {
  const user = getUser();
  const accountName = document.querySelector(".user-btn span");
  const accountMenu = document.querySelector(".account-menu");

  // Update Desktop
  if (accountName && accountMenu) {
    if (user) {
      accountName.textContent = user.name.split(" ")[0];
      accountMenu.innerHTML = `
        <a href="#" class="auth-action" data-action="profile">My Profile</a>
        <a href="#" class="auth-action" data-action="orders">My Orders</a>
        <a href="#" class="auth-action" data-action="logout">Logout</a>
      `;
    } else {
      accountName.textContent = "Account";
      accountMenu.innerHTML = `
        <a href="#" class="auth-action" data-action="login">Login</a>
        <a href="#" class="auth-action" data-action="signup">Sign Up</a>
      `;
    }
  }

  // Update Mobile Sidebar Auth
  const mobileMenu = document.querySelector(".mobile-menu-list");
  if (mobileMenu) {
    // Remove existing auth items to prevent duplicates
    mobileMenu
      .querySelectorAll(".auth-dynamic-item")
      .forEach((e) => e.remove());

    let authHTML = "";
    if (user) {
      authHTML = `
        <li class="auth-dynamic-item"><a href="#" class="auth-action" data-action="profile"><i class="fas fa-user-circle"></i> Hi, ${
          user.name.split(" ")[0]
        }</a></li>
        <li class="auth-dynamic-item"><a href="#" class="auth-action" data-action="orders"><i class="fas fa-box"></i> My Orders</a></li>
        <li class="auth-dynamic-item"><a href="#" class="auth-action" data-action="logout"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
      `;
    } else {
      authHTML = ``; // Mobile default login is often in header or different logic, adjust as needed
    }
    // Insert auth items after Home if needed
    if (mobileMenu.children.length > 0) {
      mobileMenu.children[0].insertAdjacentHTML("afterend", authHTML);
    }
  }
}

// ====================================================================
// 7. MODAL FUNCTIONS (Auth, Profile, Payment)
// ====================================================================

function openAuthModal(mode = "login") {
  const modal = document.getElementById("auth-modal");
  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const forgotForm = document.getElementById("forgot-password-form");

  if (modal) {
    loginForm?.reset();
    signupForm?.reset();
    forgotForm?.reset();

    document
      .querySelectorAll(".auth-form")
      .forEach((f) => f.classList.remove("active"));
    document
      .querySelectorAll(".auth-tab")
      .forEach((t) => t.classList.remove("active"));

    if (mode === "signup") {
      signupTab?.classList.add("active");
      signupForm?.classList.add("active");
    } else {
      loginTab?.classList.add("active");
      loginForm?.classList.add("active");
    }

    modal.style.display = "flex";
    modal.classList.add("active"); // Ensure active class for flex display
  }
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("active");
  }
}

// [FIX 3: Checkout Flow (Cart -> Address -> Payment)]
function openPaymentModal(items) {
  const user = getUser();
  if (!user) {
    window.cartManager.showToast("Please login to checkout", "warning");
    openAuthModal("login");
    return;
  }

  const modal = document.getElementById("demo-payment-modal");
  if (!modal) return;

  // 1. Calculate Totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 2000 ? 0 : 150;
  const tax = subtotal * 0.18;
  const finalTotal = subtotal + shipping + tax;

  // 2. Update UI
  document.getElementById("payment-total").textContent = finalTotal.toFixed(2);
  const itemsContainer = document.getElementById("payment-items");
  itemsContainer.innerHTML = items
    .map(
      (item) => `
    <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #eee;">
      <span>${item.title} (x${item.quantity})</span>
      <span>₹${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `
    )
    .join("");

  // 3. Addresses
  const addressList = document.getElementById("checkout-addresses-list");
  if (user.addresses && user.addresses.length > 0) {
    addressList.innerHTML = user.addresses
      .map(
        (addr, idx) => `
      <div class="address-option-card ${
        idx === 0 ? "selected" : ""
      }" onclick="selectAddress(this)" data-idx="${idx}" style="padding:10px; border:1px solid #ddd; margin-bottom:5px; cursor:pointer; border-radius:5px;">
        <div style="font-weight:600">${user.name}</div>
        <div>${addr.street}, ${addr.city}</div>
        <div>${addr.state} - ${addr.zip}</div>
      </div>
    `
      )
      .join("");
  } else {
    addressList.innerHTML =
      "<p>No addresses found. Please add one in Profile.</p>";
  }

  // 4. Reset View to Step 1 (Address)
  document.getElementById("checkout-address-section").style.display = "block";
  document.getElementById("checkout-payment-section").style.display = "none";

  // 5. Button Logic: "Continue to Payment"
  const continueBtn = document.getElementById("btn-continue-payment");
  // Remove old listeners
  const newContinueBtn = continueBtn.cloneNode(true);
  continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);

  newContinueBtn.onclick = () => {
    // Check if user has an address
    const selected = document.querySelector(".address-option-card.selected");
    if (!selected && (!user.addresses || user.addresses.length === 0)) {
      window.cartManager.showToast("Please add an address first", "error");
      return;
    }
    // Switch to Payment View
    document.getElementById("checkout-address-section").style.display = "none";
    document.getElementById("checkout-payment-section").style.display = "block";
  };

  // 6. Pay Now Logic (Handles all 4 methods)
  const payBtn = document.getElementById("pay-now");
  const newPayBtn = payBtn.cloneNode(true);
  payBtn.parentNode.replaceChild(newPayBtn, payBtn);

  newPayBtn.onclick = async () => {
    // Payment method validation
    const methodInput = document.querySelector('input[name="payment"]:checked');
    const method = methodInput ? methodInput.value : "cod"; // default

    newPayBtn.textContent = "Processing...";
    newPayBtn.disabled = true;

    // FIX: REAL ORDER SAVE TO BACKEND
    try {
      const orderData = {
        items: items,
        total: finalTotal,
        subtotal: subtotal,
        shipping: shipping,
        tax: tax,
        paymentMethod: method,
        address: user.addresses[0], // ideally get selected address
      };

      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${_authToken}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) throw new Error("Order creation failed");
      const data = await res.json();

      window.cartManager.showToast("Order placed successfully!", "success");
      window.cartManager.clearCart();
      closePaymentModal();
      closeCartModal();
      newPayBtn.textContent = "Place Order";
      newPayBtn.disabled = false;
    } catch (e) {
      console.error(e);
      window.cartManager.showToast(
        "Failed to place order. Try again.",
        "error"
      );
      newPayBtn.textContent = "Place Order";
      newPayBtn.disabled = false;
    }
  };

  modal.style.display = "flex";
}

function selectAddress(el) {
  document
    .querySelectorAll(".address-option-card")
    .forEach((c) => c.classList.remove("selected"));
  el.classList.add("selected");
}

function closePaymentModal() {
  document.getElementById("demo-payment-modal").style.display = "none";
}

function closeCartModal() {
  const cm = document.getElementById("cart-modal");
  if (cm) cm.classList.remove("active");
}

function openCartModal() {
  // 1. Populate the Cart Modal content (required every time it opens)
  window.cartManager.updateCartDropdown();

  // 2. Make the Modal visible
  document.getElementById("cart-modal").classList.add("active");

  // 3. ATTACH/RE-ATTACH LISTENER for Checkout Button
  const checkoutBtn = document.getElementById("proceed-to-checkout");

  if (checkoutBtn) {
    // Clone to remove old listeners
    const newBtn = checkoutBtn.cloneNode(true);
    checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);

    newBtn.onclick = () => {
      //Don't proceed if cart is empty
      if (window.cartManager.cart.length === 0) {
        window.cartManager.showToast("Your cart is empty!", "warning");
        return;
      }

      // Step 1: Close the currently open Cart Modal
      closeCartModal();
      openPaymentModal(window.cartManager.cart);
    };
  }
}

// --- Profile & Orders ---

window.switchProfileTab = function (tab) {
  document.getElementById("profile-info-section").style.display =
    tab === "info" ? "block" : "none";
  document.getElementById("profile-address-section").style.display =
    tab === "address" ? "block" : "none";
  document.getElementById("tab-info").className =
    tab === "info" ? "auth-tab active" : "auth-tab";
  document.getElementById("tab-address").className =
    tab === "address" ? "auth-tab active" : "auth-tab";
};

// [FIX 1: Address Sync]
async function openProfileModal() {
  const user = getUser();
  if (!user) {
    openAuthModal("login");
    return;
  }

  const modal = document.getElementById("profile-modal");
  modal.style.display = "flex";

  // 1. Show loading state initially
  document.getElementById("address-list").innerHTML =
    '<p style="text-align:center;">Syncing profile...</p>';

  try {
    // 2. FETCH LATEST DATA from Backend
    const res = await fetch(`${API_BASE_URL}/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${_authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      const freshUser = await res.json();
      // 3. Update Local Storage & Global State with fresh data
      saveUser(freshUser);

      // 4. Update Inputs
      document.getElementById("profile-name").value = freshUser.name;
      document.getElementById("profile-email").value = freshUser.email;

      // 5. Render Addresses
      renderAddresses(freshUser.addresses || []);
    } else {
      // Fallback to local data if fetch fails
      renderAddresses(user.addresses || []);
    }
  } catch (e) {
    console.error("Profile sync failed", e);
    renderAddresses(user.addresses || []);
  }
}

function renderAddresses(addresses) {
  const container = document.getElementById("address-list");
  container.innerHTML = "";
  if (addresses.length === 0) {
    container.innerHTML =
      "<p style='text-align:center; color:#999'>No saved addresses.</p>";
    return;
  }
  addresses.forEach((addr, index) => {
    const div = document.createElement("div");
    div.className = "address-card";
    div.innerHTML = `
      <h5 style="color:var(--primary-color); margin-bottom:5px; font-size:1rem;">Address #${
        index + 1
      }</h5>
      <p style="color:#555; margin-bottom:2px;">${addr.street}, ${addr.city}</p>
      <p style="color:#777; font-size:0.9rem;">${addr.state} - ${addr.zip}, ${
      addr.country
    }</p>
      <button class="btn-delete-addr" onclick="deleteAddress(${index})" style="position:absolute; top:15px; right:15px; color:#dc3545; background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
    `;
    container.appendChild(div);
  });
}

async function openOrdersModal() {
  const user = getUser();
  if (!user) {
    openAuthModal("login");
    return;
  }

  const modal = document.getElementById("orders-modal");

  // 1. Initial Loading State
  modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header"><h2>My Orders</h2><span class="close" onclick="this.closest('.modal').style.display='none'">&times;</span></div>
        <div class="modal-body"><p style="text-align:center; padding:20px;">Fetching orders...</p></div>
      </div>
    `;
  modal.style.display = "flex";

  // FIX: Fetch Orders from Backend
  try {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: "GET",
      headers: { Authorization: `Bearer ${_authToken}` },
    });

    if (!res.ok) throw new Error("Failed to fetch");
    const orders = await res.json();

    if (orders.length === 0) {
      modal.querySelector(".modal-body").innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <i class="fas fa-box-open" style="font-size:3rem; color:#ccc;"></i>
                    <p>No past orders found.</p>
                </div>`;
    } else {
      const ordersHTML = orders
        .map(
          (o) => `
               <div class="order-card">
                   <div class="order-header">
                       <div><strong>Order #${o._id
                         .slice(-6)
                         .toUpperCase()}</strong> <span style="font-size:0.8rem; color:#666;">${new Date(
            o.orderDate
          ).toLocaleDateString()}</span></div>
                       <div class="order-status status-${
                         o.status?.toLowerCase() || "processing"
                       }">${o.status || "Processing"}</div>
                   </div>
                   <div class="order-items">
                       ${o.items
                         .map(
                           (i) =>
                             `<div class="order-item"><span>${i.title} x${i.quantity}</span><span>₹${i.price}</span></div>`
                         )
                         .join("")}
                   </div>
                   <div class="order-footer">Total: <strong>₹${o.total.toFixed(
                     2
                   )}</strong></div>
               </div>
           `
        )
        .join("");
      modal.querySelector(
        ".modal-body"
      ).innerHTML = `<div class="orders-list">${ordersHTML}</div>`;
    }
  } catch (error) {
    console.error(error);
    modal.querySelector(
      ".modal-body"
    ).innerHTML = `<p style="text-align:center; color:red;">Failed to load orders.</p>`;
  }
}

// ====================================================================
// 8. INITIALIZATION & EVENT LISTENERS
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing App...");

  // Initialize Global Managers
  window.cartManager = new CartManager();
  window.productPagination = new ProductPagination(); // Must init before ProductManager
  window.productManager = new ProductManager();
  window.quickViewModal = new QuickViewModal();
  window.heroCarousel = new HeroCarousel();

  // 1. Auth Action Listeners (Delegated)
  document.body.addEventListener("click", (e) => {
    const authAction = e.target.closest(".auth-action");
    if (authAction) {
      e.preventDefault();
      const action = authAction.getAttribute("data-action");

      // Close sidebars/menus
      const mobileNav = document.getElementById("mobile-nav");
      if (mobileNav) {
        mobileNav.classList.remove("active");
        mobileNav.style.left = "-100%";
        const overlay = document.getElementById("mobile-nav-overlay");
        if (overlay) overlay.style.display = "none";
      }

      if (action === "login") openAuthModal("login");
      else if (action === "signup") openAuthModal("signup");
      else if (action === "profile") openProfileModal();
      else if (action === "orders") openOrdersModal();
      else if (action === "logout") logoutUser();
    }
  });

  // 2. Auth Forms Submission
  document
    .getElementById("login-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const pass = document.getElementById("login-password").value;
      try {
        const res = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pass }),
        });
        if (!res.ok) throw new Error("Login failed");
        const data = await res.json();
        _authToken = data.token; // Save Token
        saveUser(data.user); // Save User & Token to Storage

        closeAuthModal();
        updateAccountUI();
        window.cartManager.showToast("Welcome back!", "success");
      } catch (err) {
        window.cartManager.showToast("Invalid credentials", "error");
      }
    });

  document
    .getElementById("signup-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("signup-name").value;
      const email = document.getElementById("signup-email").value;
      const pass = document.getElementById("signup-password").value;
      try {
        const res = await fetch(`${API_BASE_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password: pass }),
        });
        if (!res.ok) throw new Error("Signup failed");
        window.cartManager.showToast(
          "Signup successful! Please login.",
          "success"
        );
        openAuthModal("login");
      } catch (err) {
        window.cartManager.showToast("Registration failed", "error");
      }
    });

  // 3. Address Saving (FIXED: Real Backend Call)
  document
    .getElementById("save-address-btn")
    ?.addEventListener("click", async () => {
      const street = document.getElementById("addr-street").value;
      const city = document.getElementById("addr-city").value;
      const state = document.getElementById("addr-state").value;
      const zip = document.getElementById("addr-zip").value;

      if (!street || !city) {
        window.cartManager.showToast("Fill required fields", "error");
        return;
      }

      const user = getUser();
      if (!user) return;

      // Create updated addresses array
      const newAddresses = [
        ...(user.addresses || []),
        { street, city, state, zip, country: "India" },
      ];

      try {
        const res = await fetch(`${API_BASE_URL}/user`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${_authToken}`,
          },
          body: JSON.stringify({ addresses: newAddresses }),
        });

        if (!res.ok) throw new Error("Failed to save address");
        const data = await res.json(); // Get updated user

        // Update local state
        user.addresses = newAddresses;
        saveUser(user);
        renderAddresses(user.addresses);

        // Hide form
        document.getElementById("new-address-form").style.display = "none";
        document.getElementById("add-address-btn").style.display = "block";
        window.cartManager.showToast("Address Saved to Profile", "success");
      } catch (e) {
        console.error(e);
        window.cartManager.showToast("Failed to save address", "error");
      }
    });

  document.getElementById("add-address-btn")?.addEventListener("click", () => {
    document.getElementById("new-address-form").style.display = "block";
    document.getElementById("add-address-btn").style.display = "none";
  });

  // 4. Newsletter
  document
    .querySelector(".newsletter-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      window.cartManager.showToast("Subscribed successfully!", "success");
      e.target.reset();
    });

  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");

  if (loginTab) {
    loginTab.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal("login");
    });
  }

  if (signupTab) {
    signupTab.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal("signup");
    });
  }

  updateAccountUI();
  console.log("✅ App fully initialized");

  // ============================================================
  // [FIX 5: CLOSE ON OUTSIDE CLICK]
  // ============================================================

  window.addEventListener("click", (e) => {
    // 1. Close Standard Modals (Cart, Payment, Profile, QuickView, Orders)
    if (e.target.classList.contains("modal")) {
      e.target.classList.remove("active");
      e.target.style.display = "none";
    }

    // 2. Close Auth Modal
    if (e.target.classList.contains("auth-modal")) {
      closeAuthModal();
    }

    // 3. Close Wishlist Dropdown if clicked outside
    if (
      !e.target.closest(".wishlist-wrapper") &&
      !e.target.closest(".wishlist-btn")
    ) {
      const wishlistDropdown = document.querySelector(".wishlist-dropdown");
      if (wishlistDropdown) wishlistDropdown.style.display = "none";
    }

    // 4. Close Account Dropdown if clicked outside
    if (
      !e.target.closest(".user-actions") &&
      !e.target.closest(".account-dropdown")
    ) {
      const accountMenu = document.querySelector(".account-menu");
      if (accountMenu) accountMenu.style.display = "none";
    }

    // 5. Close Mobile Sidebar if backdrop clicked
    if (e.target.classList.contains("mobile-nav-overlay")) {
      const overlay = e.target;
      const nav = document.getElementById("mobile-nav");
      if (nav) nav.classList.remove("active");
      overlay.style.display = "none";
    }
  });
});
