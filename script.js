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
  try {
    _currentUser = JSON.parse(storedUser);
    _authToken = storedToken;
    console.log("User session restored:", _currentUser.email);
  } catch (e) {
    console.error("Failed to parse user data", e);
    localStorage.clear();
  }
}

// ====================================================================
// 1. CART MANAGEMENT SYSTEM
// ====================================================================

class CartManager {
  constructor() {
    this.cart = _cartData || [];
    this.wishlist = _wishlistData || [];
    this.savedForLater = [];
    this.coupon = null;

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
      let res;

      if (pull) {
        // PULL: Get latest data from DB
        res = await fetch(`${API_BASE_URL}/user`, {
          headers: { Authorization: `Bearer ${_authToken}` },
        });
      } else {
        // PUSH: Save local state to DB
        res = await fetch(`${API_BASE_URL}/user`, {
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

      if (!res.ok) {
        console.warn("Sync response not OK:", res.status);
      }

      // Process Data (Only if pulling and success)
      if (pull && res.ok) {
        const data = await res.json();
        if (data.addresses) {
          _currentUser.addresses = data.addresses;
          saveUser(_currentUser); // Update LocalStorage
        }
        if (data.cart) this.cart = data.cart;
        if (data.wishlist) this.wishlist = data.wishlist;
        if (data.savedForLater) this.savedForLater = data.savedForLater;

        this.updateUI();
      }

      this.updateUI();
    } catch (e) {
      console.warn("Sync failed (Offline mode):", e);
    }
  }

  // --- Cart Actions ---

  // Returns TRUE if successful, FALSE if failed
  addToCart(product, quantity = 1, variants = {}) {
    // Safety Check
    if (!product) {
      console.error("Product undefined in addToCart");
      return false;
    }

    // Default stock to 999 if not defined to prevent blocking sales
    const stock = product.stock !== undefined ? parseInt(product.stock) : 999;
    const qty = parseInt(quantity) || 1;

    // 1. Check Global Stock
    if (stock < qty) {
      this.showToast(`Sorry, only ${stock} items in stock!`, "error");
      return false;
    }

    const existingItem = this.cart.find((item) => item.title === product.title);
    const price = parseFloat(product.price) || 0;

    if (existingItem) {
      // 2. Check Cumulative Stock
      const currentQty = parseInt(existingItem.quantity) || 0;
      if (currentQty + qty > stock) {
        this.showToast(
          `Max limit reached! You have ${currentQty} in cart.`,
          "warning"
        );
        return false;
      }
      existingItem.quantity = currentQty + qty;
    } else {
      // 3. Add New Item
      this.cart.push({
        ...product,
        price: price,
        quantity: qty,
        selectedSize: variants.size || product.selectedSize || null,
        selectedColor: variants.color || product.selectedColor || null,
      });
    }

    // UPDATE UI IMMEDIATELY
    this.showToast(`${product.title} added to cart!`, "success");
    this.updateUI();

    // Sync in background
    this.syncWithBackend(false);

    return true;
  }

  removeFromCart(productTitle) {
    this.cart = this.cart.filter((item) => item.title !== productTitle);
    this.updateUI(); // Update immediately
    this.syncWithBackend(false);

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
          this.showToast(`Max stock reached (${item.stock})`, "error");
          return;
        }
        item.quantity = qty;
        this.updateUI();
        this.syncWithBackend(false);
      }
    }
  }

  clearCart() {
    this.cart = [];
    this.coupon = null;
    this.updateUI();
    this.syncWithBackend(false);
  }

  // --- Save For Later Feature ---
  saveForLater(productTitle) {
    const itemIndex = this.cart.findIndex((i) => i.title === productTitle);
    if (itemIndex > -1) {
      const item = this.cart[itemIndex];
      this.savedForLater.push(item);
      this.cart.splice(itemIndex, 1);

      this.showToast("Item saved for later", "info");
      this.updateUI();
      this.syncWithBackend(false);
    }
  }

  moveToCart(productTitle) {
    const itemIndex = this.savedForLater.findIndex(
      (i) => i.title === productTitle
    );
    if (itemIndex > -1) {
      const item = this.savedForLater[itemIndex];
      const success = this.addToCart(item, item.quantity, {
        size: item.selectedSize,
        color: item.selectedColor,
      });

      if (success) {
        this.savedForLater.splice(itemIndex, 1);
        this.updateUI();
        this.syncWithBackend(false);
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
        this.coupon = data;
        this.showToast("Coupon Applied Successfully!", "success");
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
      this.showToast("Error verifying coupon", "error");
    } finally {
      if (btn) btn.textContent = "Apply";
      this.updateUI();
    }
  }

  removeCoupon() {
    this.coupon = null;
    this.showToast("Coupon Removed", "info");
    this.updateUI();
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
    this.syncWithBackend(false);
    this.updateWishlistUI();
  }

  isInWishlist(productTitle) {
    return this.wishlist.some((item) => item.title === productTitle);
  }

  moveToWishlist(productTitle) {
    const item = this.cart.find((i) => i.title === productTitle);
    if (item) {
      if (!this.isInWishlist(item.title)) this.toggleWishlist(item);
      this.removeFromCart(item.title);
      this.showToast("Moved to Wishlist", "info");
    }
  }

  // --- Calculations ---
  getCartTotal() {
    return this.cart.reduce(
      (total, item) =>
        total + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
      0
    );
  }

  getEstimatedDelivery() {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  calculateTotals(customItems = null) {
    const itemsToCalc = customItems || this.cart;

    if (itemsToCalc.length === 0)
      return {
        subtotal: 0,
        bulkSavings: 0,
        tax: 0,
        shipping: 0,
        giftCost: 0,
        insuranceCost: 0,
        couponDiscount: 0,
        finalTotal: 0,
      };

    let subtotal = 0;
    let bulkSavings = 0;

    itemsToCalc.forEach((item) => {
      let itemTotal =
        (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
      if (item.quantity >= 2) {
        // Bulk Discount
        bulkSavings += itemTotal * 0.1;
      }
      subtotal += itemTotal;
    });

    // --- NEW: Dynamic Shipping Logic ---
    // We read the selected radio button from the DOM
    const deliveryMethod =
      document.querySelector('input[name="delivery-method"]:checked')?.value ||
      "Standard";

    let shipping = 0;
    if (deliveryMethod === "Pickup") {
      shipping = 0;
    } else if (deliveryMethod === "Same-Day") {
      shipping = 250; // Premium cost
    } else if (deliveryMethod === "International") {
      shipping = 2500; // High cost
    } else {
      // Standard / Scheduled
      shipping = subtotal - bulkSavings > 2000 ? 0 : 150;
    }

    const isGift = document.getElementById("is-gift")?.checked || false;
    const hasInsurance =
      document.getElementById("has-insurance")?.checked || false;

    const giftCost = isGift ? 50 : 0;
    const insuranceCost = hasInsurance ? 100 : 0;
    const tax = (subtotal - bulkSavings) * 0.18;

    let couponDiscount = 0;
    if (this.coupon && !customItems) {
      couponDiscount = this.coupon.discountAmount;
    }

    const finalTotal = Math.max(
      0,
      subtotal -
        bulkSavings +
        tax +
        shipping +
        giftCost +
        insuranceCost -
        couponDiscount
    );

    // Update DOM if visible
    if (document.getElementById("payment-total")) {
      document.getElementById("payment-total").textContent =
        finalTotal.toFixed(2);
    }

    return {
      subtotal,
      bulkSavings,
      tax,
      shipping,
      giftCost,
      insuranceCost,
      couponDiscount,
      finalTotal,
      deliveryMethod,
    };
  }

  // --- Rating Logic Helper ---
  generateRatingHTML(rating) {
    const score = parseFloat(rating) || 0;
    let stars = "";

    // Loop 5 times to create 5 stars
    for (let i = 1; i <= 5; i++) {
      if (score >= i) {
        // Full Star
        stars += '<i class="fas fa-star" style="color: #ffc107;"></i>';
      } else if (score >= i - 0.5) {
        // Half Star
        stars += '<i class="fas fa-star-half-alt" style="color: #ffc107;"></i>';
      } else {
        // Empty Star
        stars += '<i class="far fa-star" style="color: #ccc;"></i>';
      }
    }

    return `<div class="stars" style="display:flex; gap:2px;">${stars}</div>`;
  }

  // --- UI Updates ---
  updateUI() {
    // Badge Update
    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
      const totalItems = this.cart.reduce(
        (total, item) => total + (parseInt(item.quantity) || 0),
        0
      );
      cartCount.textContent = totalItems;

      // Animation Bump
      cartCount.style.transform = "scale(1.2)";
      setTimeout(() => (cartCount.style.transform = "scale(1)"), 200);
    }

    this.updateCartDropdown();
    this.updateWishlistUI();
  }

  updateCartDropdown() {
    const container = document.getElementById("cart-modal-items");

    let htmlContent =
      this.cart.length === 0
        ? '<div class="cart-modal-empty" style="text-align:center; padding:40px;"><i class="fas fa-shopping-basket" style="font-size:3rem; color:#eee; margin-bottom:15px;"></i><p style="color:#666;">Your cart is empty</p></div>'
        : this.cart
            .map((item) => {
              const isLowStock = item.stock && item.stock <= 3;
              const stockWarning = isLowStock
                ? `<div class="stock-warning" style="color:#e67e22; font-size:0.75rem; margin-top:4px;"><i class="fas fa-exclamation-circle"></i> Hurry! Only ${item.stock} left</div>`
                : "";

              return `
                  <div class="cart-modal-item">
                    <img src="${item.image}" alt="${
                item.title
              }" class="cart-modal-item-image">
                    <div class="cart-modal-item-details">
                      <div class="cart-modal-item-title">${item.title}</div>
                      <div class="cart-modal-item-price">₹${parseFloat(
                        item.price
                      ).toFixed(2)}</div>
                      ${
                        item.selectedSize
                          ? `<small style="color:#888; font-size:0.8rem;">Size: ${item.selectedSize}</small>`
                          : ""
                      }
                      
                      <div class="delivery-date" style="font-size:0.75rem; color:#27ae60; margin-top:2px;"><i class="fas fa-truck"></i> Get by ${this.getEstimatedDelivery()}</div>
                      ${stockWarning}

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
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:10px;">
                        <i class="fas fa-trash cart-modal-item-remove" title="Remove" onclick="window.cartManager.removeFromCart('${item.title.replace(
                          /'/g,
                          "\\'"
                        )}')"></i>
                        <button onclick="window.cartManager.saveForLater('${item.title.replace(
                          /'/g,
                          "\\'"
                        )}')" style="font-size:0.7rem; text-decoration:underline; border:none; background:none; color:#666; cursor:pointer;">Save for Later</button>
                    </div>
                  </div>
                `;
            })
            .join("");

    if (this.savedForLater.length > 0) {
      htmlContent += `<div class="saved-for-later-section" style="margin-top:20px; padding-top:15px; border-top:1px dashed #ddd;">
            <h4 style="margin:10px 0; color:#666; font-size:0.9rem;">Saved for Later (${
              this.savedForLater.length
            })</h4>
            ${this.savedForLater
              .map(
                (item) => `
                <div class="saved-item" style="display:flex; gap:10px; margin-bottom:10px; opacity:0.8;">
                    <img src="${item.image}" alt="${
                  item.title
                }" style="width:40px; height:40px; object-fit:contain;">
                    <div style="flex:1">
                        <div style="font-size:0.85rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${
                          item.title
                        }</div>
                        <div style="font-size:0.8rem;">₹${item.price}</div>
                    </div>
                    <button class="btn-move-cart" onclick="window.cartManager.moveToCart('${item.title.replace(
                      /'/g,
                      "\\'"
                    )}')" style="font-size:0.75rem; border:1px solid var(--primary-color); color:var(--primary-color); background:white; padding:2px 8px; border-radius:4px; cursor:pointer;">Move to Cart</button>
                </div>
            `
              )
              .join("")}
        </div>`;
    }

    if (container) container.innerHTML = htmlContent;

    const summaryDiv = document.querySelector(".cart-modal-summary");
    if (summaryDiv) {
      // Refresh Coupon UI
      const oldCoupon = document.querySelector(".coupon-section");
      if (oldCoupon) oldCoupon.remove();

      if (this.cart.length > 0) {
        const couponCode = this.coupon ? this.coupon.code : "";
        const couponHTML = `
                <div class="coupon-section" style="margin-bottom:15px; padding-bottom:15px; border-bottom:1px solid #eee;">
                    <label style="font-size:0.9rem; font-weight:600;">Have a Coupon?</label>
                    <div class="coupon-input-group" style="display:flex; gap:10px; margin-top:5px;">
                        <input type="text" id="coupon-input" value="${couponCode}" ${
          this.coupon ? "disabled" : ""
        } placeholder="Enter Code (e.g. WELCOME10)" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;">
                         ${
                           this.coupon
                             ? `<button class="btn-remove-coupon" onclick="window.cartManager.removeCoupon()" style="background:#dc3545; color:white; border:none; padding:0 15px; border-radius:4px; cursor:pointer;">Remove</button>`
                             : `<button class="btn-apply-coupon" onclick="window.cartManager.applyCoupon(document.getElementById('coupon-input').value)" style="background:#333; color:white; border:none; padding:0 15px; border-radius:4px; cursor:pointer;">Apply</button>`
                         }
                    </div>
                    <div id="coupon-msg" class="coupon-message" style="font-size:0.8rem; margin-top:5px;"></div>
                </div>
            `;
        summaryDiv.insertAdjacentHTML("afterbegin", couponHTML);
      }
    }

    const calc = this.calculateTotals();

    if (document.getElementById("cart-modal-subtotal"))
      document.getElementById("cart-modal-subtotal").textContent =
        calc.subtotal.toFixed(2);
    if (document.getElementById("cart-modal-tax"))
      document.getElementById("cart-modal-tax").textContent =
        calc.tax.toFixed(2);
    if (document.getElementById("cart-modal-shipping"))
      document.getElementById("cart-modal-shipping").textContent =
        calc.shipping.toFixed(2);
    if (document.getElementById("cart-modal-total"))
      document.getElementById("cart-modal-total").textContent =
        calc.finalTotal.toFixed(2);

    const discountRowId = "cart-discount-row";
    let discountRow = document.getElementById(discountRowId);

    if (calc.couponDiscount > 0) {
      if (!discountRow) {
        discountRow = document.createElement("div");
        discountRow.id = discountRowId;
        discountRow.className = "summary-row";
        discountRow.style.color = "var(--success-color)";
        const totalRow = document.querySelector(
          ".cart-modal-summary .summary-row.total"
        );
        if (totalRow) totalRow.parentNode.insertBefore(discountRow, totalRow);
      }
      discountRow.innerHTML = `<span>Coupon (${
        this.coupon.code
      })</span><span>-₹${calc.couponDiscount.toFixed(2)}</span>`;
    } else if (discountRow) {
      discountRow.remove();
    }
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
    // FORCE HIGH Z-INDEX
    toast.style.zIndex = "999999";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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
// 3. PRODUCT MANAGEMENT
// ====================================================================

class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    window.productDataMap = {};
    this.init();
  }

  async init() {
    this.initializeProductEvents();
    await this.fetchProducts();
    this.initializeFilters();
    this.initializeSearch();
    this.syncFiltersFromURL();
    this.renderRecentlyViewed();
  }

  syncFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);

    const category = params.get("category");
    const brand = params.get("brand");
    const sort = params.get("sort");
    const search = params.get("search");

    if (category && document.getElementById("category-filter"))
      document.getElementById("category-filter").value = category;
    if (brand && document.getElementById("brand-filter"))
      document.getElementById("brand-filter").value = brand;
    if (sort && document.getElementById("sort-filter"))
      document.getElementById("sort-filter").value = sort;

    if (search && document.getElementById("search-input")) {
      document.getElementById("search-input").value = search;
      const hero = document.querySelector(".hero-section");
      if (hero) hero.style.display = "none";
    }

    this.updateBreadcrumbs(category, brand, search);
    this.applyFilters(false);
  }

  updateBreadcrumbs(category, brand, search) {
    const breadcrumbs = document.getElementById("catalogue-breadcrumbs");
    if (breadcrumbs) {
      // logic to update breadcrumbs
    }
  }

  updateURLState() {
    const category = document.getElementById("category-filter")?.value;
    const brand = document.getElementById("brand-filter")?.value;
    const sort = document.getElementById("sort-filter")?.value;
    const searchTerm = document.getElementById("search-input")?.value;
    const params = new URLSearchParams();

    if (category && category !== "all") params.set("category", category);
    if (brand && brand !== "all") params.set("brand", brand);
    if (sort && sort !== "featured") params.set("sort", sort);
    if (searchTerm) params.set("search", searchTerm);

    const newURL = `${window.location.pathname}${
      params.toString() ? "?" + params.toString() : ""
    }`;
    window.history.replaceState({}, "", newURL);
  }

  async fetchProducts() {
    const container = document.getElementById("products-container");
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
      this.syncFiltersFromURL();
    } catch (error) {
      console.error("Failed to fetch products:", error);
      if (container) {
        container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px;"><h3>Failed to load products</h3><p>${error.message}</p></div>`;
      }
    }
  }

  renderProductCards() {
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
    const stockWarning =
      !isOutOfStock && product.stock <= 3
        ? `<div class="stock-warning" style="color:#e67e22; font-size:0.7rem; margin-top:4px; background:rgba(230,126,34,0.1); padding:2px 6px; border-radius:4px; width:fit-content;">Only ${product.stock} left!</div>`
        : "";

    const btnState = isOutOfStock
      ? 'disabled style="background:#ccc; cursor:not-allowed;"'
      : "";
    const btnText = isOutOfStock ? "Out of Stock" : "Add to Cart";
    const buyBtnState = isOutOfStock ? 'disabled style="display:none"' : "";

    card.innerHTML = `
      ${
        isOutOfStock
          ? '<div class="product-badge" style="background:#666">Sold Out</div>'
          : ""
      }
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
        ${stockWarning}
        <div class="product-actions">
          <button class="btn-add-cart" ${btnState}>${btnText}</button>
          <button class="btn-buy-now" ${buyBtnState}>Buy Now</button>
        </div>
      </div>
    `;
    return card;
  }

  addToRecentlyViewed(product) {
    let recent = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
    recent = recent.filter((p) => p._id !== product._id);
    recent.unshift(product);
    if (recent.length > 5) recent.pop();
    localStorage.setItem("recentlyViewed", JSON.stringify(recent));
    this.renderRecentlyViewed();
  }

  renderRecentlyViewed() {
    const container = document.getElementById("recently-viewed-container");
    const section = document.getElementById("recently-viewed-section");
    if (!container || !section) return;

    const recent = JSON.parse(localStorage.getItem("recentlyViewed")) || [];
    if (recent.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    container.innerHTML = "";

    recent.forEach((product) => {
      const card = this.createProductCard(product);
      container.appendChild(card);
    });
  }

  initializeProductEvents() {
    const handleClicks = (e) => {
      const card = e.target.closest(".product-card");
      if (!card) return;
      const key = card.getAttribute("data-product-key");
      const product = window.productDataMap[key];

      if (e.target.closest(".btn-quick-view")) {
        e.stopPropagation();
        window.quickViewModal.showQuickView(product);
      } else if (e.target.closest(".btn-add-cart")) {
        if (e.target.disabled) return;
        window.cartManager.addToCart(product);
      } else if (e.target.closest(".btn-wishlist")) {
        e.stopPropagation();
        window.cartManager.toggleWishlist(product);
      } else if (e.target.closest(".btn-buy-now")) {
        if (e.target.disabled) return;
        openPaymentModal([product]);
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
    const apply = (updateUrl = true) => this.applyFilters(updateUrl);

    const categoryFilter = document.getElementById("category-filter");
    if (categoryFilter)
      categoryFilter.addEventListener("change", () => apply(true));

    const brandFilter = document.getElementById("brand-filter");
    if (brandFilter) brandFilter.addEventListener("change", () => apply(true));

    const sortFilter = document.getElementById("sort-filter");
    if (sortFilter) sortFilter.addEventListener("change", () => apply(true));

    const priceRange = document.getElementById("price-range");
    const priceNumber = document.getElementById("price-number");
    if (priceRange && priceNumber) {
      priceRange.addEventListener("input", (e) => {
        priceNumber.value = e.target.value;
        apply(true);
      });
      priceNumber.addEventListener("input", (e) => {
        let val = parseInt(e.target.value);
        if (val > 50000) val = 50000;
        if (val < 0) val = 0;
        priceRange.value = val;
        apply(true);
      });
    }

    const stockFilter = document.getElementById("stock-filter");
    if (stockFilter) stockFilter.addEventListener("change", () => apply(true));
    const ratingFilter = document.getElementById("rating-filter");
    if (ratingFilter)
      ratingFilter.addEventListener("change", () => apply(true));
  }

  applyFilters(updateUrl = true) {
    const category = document.getElementById("category-filter")?.value || "all";
    const brand = document.getElementById("brand-filter")?.value || "all";
    const sort = document.getElementById("sort-filter")?.value || "featured";
    const maxPrice = parseInt(
      document.getElementById("price-number")?.value || 50000
    );
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

    if (updateUrl) this.updateURLState();
  }

  initializeSearch() {
    const input = document.getElementById("search-input");
    const btn = document.getElementById("search-btn");

    const performSearch = (query) => {
      if (!query) return;
      this.searchProducts(query);
      const productsSection = document.querySelector(".products-section");
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: "smooth" });
      }
      this.updateURLState();
    };

    if (input) {
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
// 4. QUICK VIEW MODAL
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

    if (qtyMinus) {
      qtyMinus.onclick = () => {
        if (this.currentQuantity > 1) {
          this.currentQuantity--;
          if (qtyInput) qtyInput.value = this.currentQuantity;
        }
      };
    }

    if (qtyPlus) {
      qtyPlus.onclick = () => {
        if (this.currentProduct && this.currentProduct.stock !== undefined) {
          if (this.currentQuantity >= this.currentProduct.stock) {
            window.cartManager.showToast(
              `Max stock reached! Only ${this.currentProduct.stock} available.`,
              "warning"
            );
            return;
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
    this.currentQuantity = 1;

    window.productManager.addToRecentlyViewed(product);

    this.modal.querySelector("#quick-view-title").textContent = product.title;
    this.modal.querySelector("#quick-view-img").src = product.image;
    this.modal.querySelector(
      "#quick-view-price"
    ).innerHTML = `<span class="price-current">₹${product.price}</span>`;

    const qtyInput = this.modal.querySelector(".qty-input");
    if (qtyInput) qtyInput.value = 1;

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

    const detailsDiv = this.modal.querySelector(".quick-view-details");
    detailsDiv
      .querySelectorAll(".qv-injected, .qv-related-section, .qv-fbt-section")
      .forEach((e) => e.remove());

    const wrapper = document.createElement("div");
    wrapper.className = "qv-injected";
    wrapper.innerHTML = descHTML + variantsHTML;
    this.modal
      .querySelector("#quick-view-price")
      .insertAdjacentElement("afterend", wrapper);

    const actionsDiv = this.modal.querySelector(".quick-view-actions");

    // FIX: Insert New Sections BEFORE the Add to Cart Button
    const fbtElement = this.createFBTElement(product);
    const relatedElement = this.createRelatedElement(product);

    if (fbtElement) detailsDiv.insertBefore(fbtElement, actionsDiv);
    if (relatedElement) detailsDiv.insertBefore(relatedElement, actionsDiv);

    const btn = this.modal.querySelector(".btn-add-cart-modal");
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
        const qtyInput = this.modal.querySelector(".qty-input");
        const finalQty = parseInt(qtyInput.value) || 1;

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
    window.cartManager.addToCart(this.currentProduct, 1);
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
  if (!user.addresses) user.addresses = [];
  localStorage.setItem("user", JSON.stringify(user));
  if (_authToken) localStorage.setItem("token", _authToken);
}

function getUser() {
  return _currentUser;
}

function logoutUser() {
  _currentUser = null;
  _authToken = null;
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("recentlyViewed");

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
      authHTML = ``; // Mobile default login
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

  // Render Items List
  document.getElementById("payment-items").innerHTML = items
    .map(
      (item) => `
    <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #eee;">
      <span>${item.title} (x${item.quantity || 1})</span>
      <span>₹${(item.price * (item.quantity || 1)).toFixed(2)}</span>
    </div>
  `
    )
    .join("");

  // Render Addresses
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
  const paymentSection = document.getElementById("checkout-payment-section");
  paymentSection
    .querySelectorAll(".delivery-section, .checkout-extras")
    .forEach((el) => el.remove());

  const deliveryHTML = `
    <div class="delivery-section" style="margin-bottom:20px; padding-bottom:15px; border-bottom:1px solid #eee;">
        <h4 style="margin:15px 0 10px; font-size:1rem;">Delivery Method</h4>
        <div class="payment-methods-grid" style="grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap:10px; margin:0;">
            <label class="payment-option">
                <input type="radio" name="delivery-method" value="Standard" checked onchange="renderSummary()"> 
                <div class="payment-option-content" style="padding:10px; font-size:0.8rem; min-height:auto;">
                    <i class="fas fa-truck" style="font-size:1.2rem;"></i> <span>Standard</span>
                </div>
            </label>
            <label class="payment-option">
                <input type="radio" name="delivery-method" value="Same-Day" onchange="renderSummary()"> 
                <div class="payment-option-content" style="padding:10px; font-size:0.8rem; min-height:auto;">
                    <i class="fas fa-bolt" style="font-size:1.2rem;"></i> <span>Same-Day</span>
                </div>
            </label>
            <label class="payment-option">
                <input type="radio" name="delivery-method" value="Pickup" onchange="renderSummary()"> 
                <div class="payment-option-content" style="padding:10px; font-size:0.8rem; min-height:auto;">
                    <i class="fas fa-store" style="font-size:1.2rem;"></i> <span>Pickup</span>
                </div>
            </label>
            <label class="payment-option">
                <input type="radio" name="delivery-method" value="International" onchange="renderSummary()"> 
                <div class="payment-option-content" style="padding:10px; font-size:0.8rem; min-height:auto;">
                    <i class="fas fa-globe" style="font-size:1.2rem;"></i> <span>Global</span>
                </div>
            </label>
        </div>

        <div style="margin-top:15px;">
            <label style="font-size:0.9rem; font-weight:600; display:block; margin-bottom:5px;"><i class="fas fa-pen"></i> Delivery Instructions</label>
            <textarea id="delivery-instructions" rows="2" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-family:inherit;" placeholder="Gate code, leave at door, etc."></textarea>
        </div>

         <div class="checkout-extras" style="margin-top:15px;">
            <label style="display:flex; align-items:center; gap:10px; cursor:pointer; margin-bottom:5px;">
                <input type="checkbox" id="is-gift" onchange="renderSummary()"> 
                <span><i class="fas fa-gift"></i> Add Gift Wrap (+₹50)</span>
            </label>
            <div id="gift-message-box" style="display:none; margin-left:25px; margin-bottom:10px;">
                <input type="text" id="gift-message" placeholder="Enter gift message..." style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>

            <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                <input type="checkbox" id="has-insurance" onchange="renderSummary()"> 
                <span><i class="fas fa-shield-alt"></i> Add Shipping Insurance (+₹100)</span>
            </label>
        </div>
    </div>
  `;

  const paymentHeader = paymentSection.querySelector("h3"); // "Select Payment Method"
  if (paymentHeader) {
    paymentHeader.insertAdjacentHTML("beforebegin", deliveryHTML);
  }

  document.getElementById("checkout-address-section").style.display = "block";
  document.getElementById("checkout-payment-section").style.display = "none";

  // Continue Button Logic
  const continueBtn = document.getElementById("btn-continue-payment");
  const newContinueBtn = continueBtn.cloneNode(true);
  continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);

  newContinueBtn.onclick = () => {
    const selected = document.querySelector(".address-option-card.selected");
    if (!selected && (!user.addresses || user.addresses.length === 0)) {
      window.cartManager.showToast("Please add an address first", "error");
      return;
    }
    document.getElementById("checkout-address-section").style.display = "none";
    document.getElementById("checkout-payment-section").style.display = "block";
  };

  // Detailed Price Breakdown Logic (The Fix for C)
  const renderSummary = () => {
    const calc = window.cartManager.calculateTotals(items);
    const summaryHTML = `
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Subtotal</span><span>₹${calc.subtotal.toFixed(
            2
          )}</span></div>
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Tax (18%)</span><span>₹${calc.tax.toFixed(
            2
          )}</span></div>
          <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>Shipping</span><span>₹${calc.shipping.toFixed(
            2
          )}</span></div>
          ${
            calc.giftCost > 0
              ? `<div style="display:flex; justify-content:space-between; margin-bottom:5px; color:#d35400;"><span>Gift Wrap</span><span>+₹${calc.giftCost}</span></div>`
              : ""
          }
          ${
            calc.insuranceCost > 0
              ? `<div style="display:flex; justify-content:space-between; margin-bottom:5px; color:#2980b9;"><span>Insurance</span><span>+₹${calc.insuranceCost}</span></div>`
              : ""
          }
          ${
            calc.bulkSavings > 0
              ? `<div style="display:flex; justify-content:space-between; margin-bottom:5px; color:#27ae60;"><span>Bulk Discount</span><span>-₹${calc.bulkSavings.toFixed(
                  2
                )}</span></div>`
              : ""
          }
          ${
            calc.couponDiscount > 0
              ? `<div style="display:flex; justify-content:space-between; margin-bottom:5px; color:#27ae60;"><span>Coupon</span><span>-₹${calc.couponDiscount.toFixed(
                  2
                )}</span></div>`
              : ""
          }
          <div style="display:flex; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px solid #ddd; font-weight:bold; font-size:1.1rem;">
              <span>Total</span><span>₹${calc.finalTotal.toFixed(2)}</span>
          </div>
      `;
    // Use .order-summary which is the container in your HTML
    document.querySelector(".order-summary").innerHTML = summaryHTML;
  };

  renderSummary();
  document.getElementById("is-gift")?.addEventListener("change", renderSummary);
  document
    .getElementById("has-insurance")
    ?.addEventListener("change", renderSummary);

  // Pay Now Logic
  const payBtn = document.getElementById("pay-now");
  const newPayBtn = payBtn.cloneNode(true);
  payBtn.parentNode.replaceChild(newPayBtn, payBtn);

  newPayBtn.onclick = async () => {
    const methodInput = document.querySelector('input[name="payment"]:checked');
    const method = methodInput ? methodInput.value : "cod";

    if (method === "card") {
      const num = document.querySelector(
        "#card-form input[placeholder*='Card Number']"
      )?.value;
      const cvv = document.querySelector(
        "#card-form input[placeholder*='CVV']"
      )?.value;
      if (!num || !cvv || num.length < 16 || cvv.length < 3) {
        window.cartManager.showToast(
          "Please enter valid card details",
          "error"
        );
        return; // STOP HERE
      }
    } else if (method === "upi") {
      const upiId = document.querySelector("#upi-form input")?.value;
      if (!upiId || !upiId.includes("@")) {
        window.cartManager.showToast("Please enter valid UPI ID", "error");
        return; // STOP HERE
      }
    }

    newPayBtn.textContent = "Processing...";
    newPayBtn.disabled = true;

    const calc = window.cartManager.calculateTotals(items);

    // Safely get address
    const selectedAddrIdx =
      document.querySelector(".address-option-card.selected")?.dataset.idx || 0;
    const shippingAddress = user.addresses
      ? user.addresses[selectedAddrIdx]
      : null;

    if (!shippingAddress) {
      window.cartManager.showToast("Address error. Please re-select.", "error");
      newPayBtn.disabled = false;
      return;
    }

    const deliverySlot =
      document.getElementById("delivery-slot")?.value || "Standard";
    const isGift = document.getElementById("is-gift")?.checked || false;
    const giftMessage = document.getElementById("gift-message")?.value || "";
    const hasInsurance =
      document.getElementById("has-insurance")?.checked || false;

    try {
      const orderData = {
        items: items,
        total: calc.finalTotal,
        subtotal: calc.subtotal,
        shipping: calc.shipping,
        tax: calc.tax,
        paymentMethod: method,
        address: shippingAddress, // Fix for Defect A
        deliverySlot: deliverySlot,
        giftOption: { isGift, message: giftMessage, wrapCost: isGift ? 50 : 0 },
        insurance: { hasInsurance, cost: hasInsurance ? 100 : 0 },
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
  window.cartManager.updateCartDropdown();
  document.getElementById("cart-modal").classList.add("active");
  const checkoutBtn = document.getElementById("proceed-to-checkout");

  if (checkoutBtn) {
    const newBtn = checkoutBtn.cloneNode(true);
    checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);

    newBtn.onclick = () => {
      if (window.cartManager.cart.length === 0) {
        window.cartManager.showToast("Your cart is empty!", "warning");
        return;
      }
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

async function openProfileModal() {
  const user = getUser();
  if (!user) {
    openAuthModal("login");
    return;
  }

  const modal = document.getElementById("profile-modal");
  modal.style.display = "flex";
  document.getElementById("address-list").innerHTML =
    '<p style="text-align:center;">Syncing profile...</p>';

  try {
    const res = await fetch(`${API_BASE_URL}/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${_authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) {
      const freshUser = await res.json();
      saveUser(freshUser);
      document.getElementById("profile-name").value = freshUser.name;
      document.getElementById("profile-email").value = freshUser.email;
      renderAddresses(freshUser.addresses || []);
    } else {
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
  modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header"><h2>My Orders</h2><span class="close" onclick="this.closest('.modal').style.display='none'">&times;</span></div>
        <div class="modal-body"><p style="text-align:center; padding:20px;">Fetching orders...</p></div>
      </div>
    `;
  modal.style.display = "flex";
  const getStepClass = (currentStatus, stepStatus) => {
    const stages = ["Processing", "Shipped", "Out for Delivery", "Delivered"];
    return stages.indexOf(currentStatus) >= stages.indexOf(stepStatus)
      ? "active"
      : "";
  };
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
                       <div class="order-timeline">
    <div class="timeline-step ${getStepClass(o.status, "Processing")}">
        <div class="timeline-icon"><i class="fas fa-box"></i></div>
        <p>Processing</p>
    </div>
    <div class="timeline-step ${getStepClass(o.status, "Shipped")}">
        <div class="timeline-icon"><i class="fas fa-shipping-fast"></i></div>
        <p>Shipped</p>
    </div>
    <div class="timeline-step ${getStepClass(o.status, "Delivered")}">
        <div class="timeline-icon"><i class="fas fa-check"></i></div>
        <p>Delivered</p>
    </div>
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

  window.cartManager = new CartManager();
  window.productPagination = new ProductPagination();
  window.productManager = new ProductManager();
  window.quickViewModal = new QuickViewModal();
  window.heroCarousel = new HeroCarousel();

  document.body.addEventListener("click", (e) => {
    const authAction = e.target.closest(".auth-action");
    if (authAction) {
      e.preventDefault();
      const action = authAction.getAttribute("data-action");
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

  // AUTH HANDLERS
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
        _authToken = data.token;
        saveUser(data.user);
        closeAuthModal();
        updateAccountUI();
        window.cartManager.syncWithBackend(true); // Trigger Sync on Login
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

  // ADDRESS HANDLERS
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
        const data = await res.json();

        user.addresses = newAddresses;
        saveUser(user);
        renderAddresses(user.addresses);

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

  // UTILS
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

  // GLOBAL CLICK HANDLERS
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.classList.remove("active");
      e.target.style.display = "none";
    }

    if (e.target.classList.contains("auth-modal")) {
      closeAuthModal();
    }

    if (
      !e.target.closest(".wishlist-wrapper") &&
      !e.target.closest(".wishlist-btn")
    ) {
      const wishlistDropdown = document.querySelector(".wishlist-dropdown");
      if (wishlistDropdown) wishlistDropdown.style.display = "none";
    }

    if (
      !e.target.closest(".user-actions") &&
      !e.target.closest(".account-dropdown")
    ) {
      const accountMenu = document.querySelector(".account-menu");
      if (accountMenu) accountMenu.style.display = "none";
    }

    if (e.target.classList.contains("mobile-nav-overlay")) {
      const overlay = e.target;
      const nav = document.getElementById("mobile-nav");
      if (nav) nav.classList.remove("active");
      overlay.style.display = "none";
    }
  });
});
