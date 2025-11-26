// ====================================================================
// CORE FUNCTIONS AND CLASSES
// ====================================================================

// --- 1. Cart Management System ---
class CartManager {
  constructor() {
    this.cart = this.loadCart();
    this.wishlist = this.loadWishlist();
    this.initializeEventListeners();
    this.updateUI();
  }

  loadCart() {
    try {
      const saved = localStorage.getItem("cricketStoreCart");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem("cricketStoreCart", JSON.stringify(this.cart));
    this.updateUI();
  }

  loadWishlist() {
    try {
      const saved = localStorage.getItem("cricketStoreWishlist");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveWishlist() {
    localStorage.setItem("cricketStoreWishlist", JSON.stringify(this.wishlist));
    this.updateWishlistUI();
  }

  // UPDATED: Validates stock before adding
  addToCart(product, quantity = 1) {
    // Check for stock limit (simple client-side check)
    if (product.stock !== undefined && product.stock < quantity) {
      this.showToast(`Sorry, only ${product.stock} items in stock!`, "error");
      return;
    }

    const existingItem = this.cart.find((item) => item.title === product.title);
    const price = parseFloat(product.price) || 0;

    if (existingItem) {
      // UPDATED: Check if adding more would exceed stock
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock !== undefined && newQuantity > product.stock) {
        const canAdd = product.stock - existingItem.quantity;
        if (canAdd <= 0) {
          this.showToast(
            `You already have the maximum stock (${existingItem.quantity}) in cart.`,
            "warning"
          );
        } else {
          this.showToast(
            `Can only add ${canAdd} more. You have ${existingItem.quantity} in cart.`,
            "warning"
          );
        }
        return;
      }
      existingItem.quantity = newQuantity;
    } else {
      this.cart.push({
        ...product,
        price: price,
        quantity: quantity,
        selectedSize: product.selectedSize || null,
        selectedColor: product.selectedColor || null,
      });
    }

    this.saveCart();
    this.showToast(`${product.title} added to cart!`, "success");
  }

  removeFromCart(productTitle) {
    this.cart = this.cart.filter((item) => item.title !== productTitle);
    this.saveCart();
  }

  updateQuantity(productTitle, quantity) {
    const item = this.cart.find((item) => item.title === productTitle);
    if (item) {
      if (quantity <= 0) {
        this.removeFromCart(productTitle);
      } else {
        // Check stock limit on update
        if (item.stock !== undefined && quantity > item.stock) {
          this.showToast(`Max stock reached (${item.stock})`, "error");
          return;
        }
        item.quantity = quantity;
        this.saveCart();
      }
    }
  }

  getCartTotal() {
    return this.cart.reduce(
      (total, item) => total + parseFloat(item.price) * item.quantity,
      0
    );
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
    this.showToast("Cart cleared!", "info");
  }

  toggleWishlist(product) {
    const index = this.wishlist.findIndex(
      (item) => item.title === product.title
    );

    if (index === -1) {
      this.wishlist.push(product);
      this.showToast(`${product.title} added to wishlist!`, "success");
    } else {
      this.wishlist.splice(index, 1);
      this.showToast(`${product.title} removed from wishlist!`, "info");
    }

    this.saveWishlist();
  }

  clearWishlist() {
    this.wishlist = [];
    this.saveWishlist();
  }

  isInWishlist(productTitle) {
    return this.wishlist.some((item) => item.title === productTitle);
  }

  updateUI() {
    this.updateCartCount();
    this.updateCartDropdown();
    this.updateWishlistUI();
  }

  updateCartCount() {
    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
      const totalItems = this.cart.reduce(
        (total, item) => total + item.quantity,
        0
      );
      cartCount.textContent = totalItems;
    }
  }

  updateCartDropdown() {
    const cartItemsContainer = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total");

    if (!cartItemsContainer) return;

    if (this.cart.length === 0) {
      cartItemsContainer.innerHTML =
        '<p style="text-align: center; color: #666;">Your cart is empty</p>';
      if (cartTotal) cartTotal.textContent = "₹0";
      return;
    }

    cartItemsContainer.innerHTML = this.cart
      .map(
        (item) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-price">₹${parseFloat(item.price).toFixed(
            2
          )}</div>
          <div class="cart-item-details" style="font-size:0.8rem; color:#666">
             ${item.selectedSize ? `Size: ${item.selectedSize}` : ""} 
             ${item.selectedColor ? `| Color: ${item.selectedColor}` : ""}
          </div>
          <div class="cart-item-quantity">
            <button class="qty-btn" onclick="window.cartManager.updateQuantity('${item.title.replace(
              /'/g,
              "\\'"
            )}', ${item.quantity - 1})">-</button>
            <span>Qty: ${item.quantity}</span>
            <button class="qty-btn" onclick="window.cartManager.updateQuantity('${item.title.replace(
              /'/g,
              "\\'"
            )}', ${item.quantity + 1})">+</button>
          </div>
        </div>
        <i class="fas fa-trash cart-item-remove" onclick="window.cartManager.removeFromCart('${item.title.replace(
          /'/g,
          "\\'"
        )}')"></i>
      </div>
    `
      )
      .join("");

    if (cartTotal) {
      cartTotal.textContent = `₹${this.getCartTotal().toFixed(2)}`;
    }
  }

  updateWishlistDropdown() {
    const wishlistItemsContainer = document.getElementById("wishlist-items");
    if (!wishlistItemsContainer) return;

    if (this.wishlist.length === 0) {
      wishlistItemsContainer.innerHTML =
        '<p style="text-align: center; color: #666; padding: 10px 0;">Your wishlist is empty</p>';
      return;
    }

    wishlistItemsContainer.innerHTML = this.wishlist
      .map(
        (item) => `
        <div class="wishlist-item">
          <div class="wishlist-item-title">${item.title}</div>
          <i class="fas fa-trash wishlist-item-remove" onclick="window.cartManager.toggleWishlist({title: '${item.title.replace(
            /'/g,
            "\\'"
          )}', price: '${item.price}'})"></i>
        </div>
      `
      )
      .join("");
  }

  updateWishlistUI() {
    const wishlistCount = document.querySelector(".wishlist-count");
    if (wishlistCount) {
      wishlistCount.textContent = this.wishlist.length;
    }
    this.updateWishlistDropdown();
  }

  showToast(message, type = "success") {
    const existingToast = document.querySelector(".toast");
    if (existingToast) existingToast.remove();

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  generateRatingHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let html = '<div class="stars" style="color: #ffc107; font-size: 0.8rem;">';

    for (let i = 0; i < fullStars; i++) {
      html += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
      html += '<i class="fas fa-star-half-alt"></i>';
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      html += '<i class="far fa-star"></i>';
    }

    html += `</div><span class="rating-count" style="font-size: 0.7rem; color: #666; margin-left: 4px;">(${
      Math.floor(Math.random() * 200) + 50
    })</span>`;
    return html;
  }

  initializeEventListeners() {
    const cartBtn = document.getElementById("cart-btn");
    const cartDropdown = document.getElementById("cart-dropdown");
    const wishlistBtn = document.getElementById("wishlist-btn");
    const wishlistDropdown = document.getElementById("wishlist-dropdown");

    if (cartBtn && cartDropdown) {
      cartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (wishlistDropdown) wishlistDropdown.style.display = "none";
        cartDropdown.style.display =
          cartDropdown.style.display === "block" ? "none" : "block";
      });
    }

    if (wishlistBtn && wishlistDropdown) {
      wishlistBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (cartDropdown) cartDropdown.style.display = "none";
        wishlistDropdown.style.display =
          wishlistDropdown.style.display === "block" ? "none" : "block";
      });
    }

    document.addEventListener("click", (e) => {
      if (
        cartDropdown &&
        !cartDropdown.contains(e.target) &&
        !cartBtn.contains(e.target)
      ) {
        cartDropdown.style.display = "none";
      }
      if (
        wishlistDropdown &&
        !wishlistDropdown.contains(e.target) &&
        !wishlistBtn.contains(e.target)
      ) {
        wishlistDropdown.style.display = "none";
      }
    });

    const checkoutBtn = document.getElementById("checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        if (this.cart.length === 0) {
          this.showToast("Your cart is empty!", "warning");
          return;
        }
        openPaymentModal(this.cart);
      });
    }
  }
}

// --- 2. Product Management ---
class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.searchHistory =
      JSON.parse(localStorage.getItem("searchHistory")) || [];
    this.init();
  }

  async init() {
    await this.fetchProducts();
    this.initializeFilters();
    this.initializeSearch();
  }

  async fetchProducts() {
    try {
      const response = await fetch("/api/products");
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
      const container = document.getElementById("products-container");
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
      this.attachCardListeners(container);
    }
  }

  createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";

    card.setAttribute("data-title", product.title);
    card.setAttribute("data-price", product.price);
    card.setAttribute("data-product", JSON.stringify(product));

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
    const stockBadge = isOutOfStock
      ? `<div class="product-badge" style="background:#666">Sold Out</div>`
      : product.isBestSeller
      ? `<div class="product-badge">Bestseller</div>`
      : product.isNewArrival
      ? `<div class="product-badge" style="background:var(--accent-color)">New</div>`
      : "";

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
          <button class="btn-wishlist"><i class="far fa-heart"></i></button>
          <button class="btn-add-cart" ${btnState}>${btnText}</button>
          <button class="btn-buy-now" ${buyBtnState}>Buy Now</button>
        </div>
      </div>
    `;

    return card;
  }

  attachCardListeners(container) {
    container.querySelectorAll(".btn-add-cart").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return; // Prevent click if OOS

        const card = btn.closest(".product-card");
        // Parse the full product object we saved
        const productData = JSON.parse(card.getAttribute("data-product"));

        window.cartManager.addToCart(productData);
      });
    });

    container.querySelectorAll(".btn-wishlist").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const card = btn.closest(".product-card");
        const productData = JSON.parse(card.getAttribute("data-product"));
        window.cartManager.toggleWishlist(productData);
      });
    });

    container.querySelectorAll(".btn-buy-now").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const card = btn.closest(".product-card");
        const productData = JSON.parse(card.getAttribute("data-product"));

        // Add qty 1 for instant checkout
        productData.quantity = 1;
        openPaymentModal([productData]);
      });
    });

    container.querySelectorAll(".btn-quick-view").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const card = btn.closest(".product-card");
        // We pass the FULL product object now to support variants
        const productData = JSON.parse(card.getAttribute("data-product"));
        if (window.quickViewModal)
          window.quickViewModal.showQuickView(productData);
      });
    });
  }

  initializeFilters() {
    const categoryFilter = document.getElementById("category-filter");
    const brandFilter = document.getElementById("brand-filter");
    const sortFilter = document.getElementById("sort-filter");

    // Advanced Filters
    const priceRange = document.getElementById("price-range");
    const priceNumber = document.getElementById("price-number"); // New
    const stockFilter = document.getElementById("stock-filter");
    const ratingFilter = document.getElementById("rating-filter");

    // Bind Dropdowns
    if (categoryFilter)
      categoryFilter.addEventListener("change", () => this.applyFilters());
    if (brandFilter)
      brandFilter.addEventListener("change", () => this.applyFilters());
    if (sortFilter)
      sortFilter.addEventListener("change", () => this.applyFilters());

    // Bind Price Slider -> Number
    if (priceRange && priceNumber) {
      priceRange.addEventListener("input", (e) => {
        priceNumber.value = e.target.value;
        this.applyFilters();
      });

      // Bind Number -> Slider
      priceNumber.addEventListener("input", (e) => {
        let val = parseInt(e.target.value);
        if (val > 50000) val = 50000; // Max limit
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

    // NEW VALUES
    const maxPriceInput = document.getElementById("price-number");
    const maxPrice = maxPriceInput ? parseInt(maxPriceInput.value) : 50000;
    const inStockOnly =
      document.getElementById("stock-filter")?.checked || false;
    const highRating =
      document.getElementById("rating-filter")?.checked || false;

    this.filteredProducts = this.products.filter((product) => {
      const catMatch = category === "all" || product.category === category;
      const brandMatch = brand === "all" || product.brand === brand;

      // NEW CHECKS
      const priceMatch = product.price <= maxPrice;
      const stockMatch = !inStockOnly || (product.stock && product.stock > 0);
      const ratingMatch =
        !highRating || (product.rating && product.rating >= 4);

      return catMatch && brandMatch && priceMatch && stockMatch && ratingMatch;
    });

    // Sorting
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
      case "relevance":
        // Simple relevance: matches keyword first (if search active) or default
        break;
    }

    this.renderProductCards();
  }

  initializeSearch() {
    const setupSearchListener = (inputId, btnId, suggestionsId) => {
      const input = document.getElementById(inputId);
      const btn = document.getElementById(btnId);
      const suggestions = document.getElementById(suggestionsId);

      if (input) {
        // Show history on focus
        input.addEventListener("focus", () => {
          if (!input.value.trim()) this.showSearchHistory(suggestions, input);
        });

        // Handle typing
        input.addEventListener("input", (e) => {
          const query = e.target.value;
          if (query.length > 0) {
            this.showSuggestions(query, suggestions, input);
          } else {
            this.showSearchHistory(suggestions, input);
          }
          // Real-time search (optional, or keep distinct)
          this.searchProducts(query);
        });

        // Hide suggestions on click outside
        document.addEventListener("click", (e) => {
          if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.remove("active");
          }
        });

        // ... (Keep existing Enter key logic) ...
      }
      // ... (Keep existing Button click logic) ...
    };

    setupSearchListener("search-input", "search-btn", "search-suggestions");
    setupSearchListener(
      "mobile-search-input",
      "mobile-search-btn",
      "mobile-search-suggestions"
    );
  }

  // NEW: Show Autocomplete Suggestions
  showSuggestions(query, container, inputElement) {
    const matches = this.products
      .filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.brand.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5); // Limit to 5

    if (matches.length === 0) {
      container.classList.remove("active");
      return;
    }

    container.innerHTML = matches
      .map(
        (p) => `
          <div class="suggestion-item" onclick="window.productManager.selectSuggestion('${p.title.replace(
            /'/g,
            "\\'"
          )}')">
              <img src="${p.image}" alt="${p.title}">
              <div class="suggestion-info">
                  <div>${p.title}</div>
                  <small style="color:#666">${p.brand}</small>
              </div>
          </div>
      `
      )
      .join("");

    // Helper to handle click (attach to window/class instance)
    window.productManager.selectSuggestion = (title) => {
      inputElement.value = title;
      this.searchProducts(title);
      this.addToSearchHistory(title);
      container.classList.remove("active");
    };

    container.classList.add("active");
  }

  // NEW: Search History Logic
  showSearchHistory(container, inputElement) {
    if (this.searchHistory.length === 0) return;

    container.innerHTML =
      `<div class="search-history-header">Recent Searches</div>` +
      this.searchHistory
        .map(
          (term) => `
          <div class="suggestion-item" onclick="window.productManager.selectSuggestion('${term}')">
              <i class="fas fa-history" style="color:#ccc"></i>
              <span>${term}</span>
          </div>
      `
        )
        .join("");

    container.classList.add("active");
  }

  addToSearchHistory(term) {
    const hero = document.querySelector(".hero-section");
    if (hero) {
      if (searchTerm.length > 0) {
        hero.style.display = "none"; // Hide on search
        // Add padding to body or main container if needed to prevent jump
      } else {
        hero.style.display = "block"; // Show if search cleared
      }
    }

    if (!term) return;
    // Remove duplicate and add to top
    this.searchHistory = this.searchHistory.filter((t) => t !== term);
    this.searchHistory.unshift(term);
    if (this.searchHistory.length > 5) this.searchHistory.pop();
    localStorage.setItem("searchHistory", JSON.stringify(this.searchHistory));
  }
  searchProducts(query) {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
      // If search is empty, show all products
      this.filteredProducts = [...this.products];
    } else {
      // Filter products based on title, brand, or category
      this.filteredProducts = this.products.filter((product) => {
        return (
          product.title.toLowerCase().includes(searchTerm) ||
          product.brand.toLowerCase().includes(searchTerm) ||
          (product.category &&
            product.category.toLowerCase().includes(searchTerm))
        );
      });
    }

    this.renderProductCards();

    // Show feedback if no results
    if (this.filteredProducts.length === 0) {
      const container = document.getElementById("products-container");
      if (container) {
        container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
          <h3>No products found for "${query}"</h3>
          <p style="color: #666;">Try searching with different keywords</p>
        </div>
      `;
      }
    }
  }
}

// --- 3. Quick View Modal ---
class QuickViewModal {
  constructor() {
    this.modal = document.getElementById("quick-view-modal");
    this.initializeQuickView();
    this.currentProduct = null;
  }

  initializeQuickView() {
    const closeBtn = document.getElementById("close-quick-view");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeModal());
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    const qtyMinus = this.modal?.querySelector(".qty-minus");
    const qtyPlus = this.modal?.querySelector(".qty-plus");
    const qtyInput = this.modal?.querySelector(".qty-input");

    if (qtyMinus) {
      qtyMinus.addEventListener("click", () => {
        if (qtyInput && qtyInput.value > 1)
          qtyInput.value = parseInt(qtyInput.value) - 1;
      });
    }
    if (qtyPlus) {
      qtyPlus.addEventListener("click", () => {
        // SMART STOCK LIMIT: Check max stock
        if (this.currentProduct && this.currentProduct.stock !== undefined) {
          if (parseInt(qtyInput.value) >= this.currentProduct.stock) {
            window.cartManager.showToast(`Max stock reached!`, "warning");
            return;
          }
        }
        if (qtyInput) qtyInput.value = parseInt(qtyInput.value) + 1;
      });
    }
  }

  showQuickView(product) {
    if (!this.modal) return;
    this.currentProduct = product;

    // Populate Basic Info
    this.modal.querySelector("#quick-view-title").textContent = product.title;
    this.modal.querySelector("#quick-view-img").src = product.image;
    this.modal.querySelector("#quick-view-description").textContent =
      product.description || "No description.";
    this.modal.querySelector(
      "#quick-view-price"
    ).innerHTML = `<span class="price-current">₹${product.price}</span>`;

    // --- NEW: Variants Logic (Sizes & Colors) ---
    const detailsContainer = this.modal.querySelector(".quick-view-details");

    // FIX: Remove BOTH old selectors AND old stock status to prevent stacking
    const oldElements = detailsContainer.querySelectorAll(
      ".variant-group, .stock-status"
    );
    oldElements.forEach((el) => el.remove());

    // --- SMART STOCK LOGIC ---
    let stockHTML = "";
    if (product.stock !== undefined) {
      // Default: No message if stock is plentiful (>= 5)
      if (product.stock <= 0) {
        stockHTML = `<div class="stock-status" style="color:var(--danger-color); font-weight:600; margin:10px 0;">Out of Stock</div>`;
      } else if (product.stock < 5) {
        // Low Stock Warning
        stockHTML = `<div class="stock-status" style="color:#e67e22; font-weight:600; margin:10px 0;">
                <i class="fas fa-exclamation-circle"></i> Hurry! Only ${product.stock} left in stock
             </div>`;
      }
      // If stock >= 5, we show nothing (cleaner look)
    }

    // Create Variant Selectors HTML
    let variantsHTML = stockHTML;

    if (product.sizes && product.sizes.length > 0) {
      variantsHTML += `
        <div class="variant-group" style="margin:10px 0;">
            <strong>Size:</strong> 
            <select id="qv-size" style="padding:5px; margin-left:5px;">
                ${product.sizes
                  .map((s) => `<option value="${s}">${s}</option>`)
                  .join("")}
            </select>
        </div>`;
    }

    if (product.colors && product.colors.length > 0) {
      variantsHTML += `
        <div class="variant-group" style="margin:10px 0;">
            <strong>Color:</strong> 
            <select id="qv-color" style="padding:5px; margin-left:5px;">
                ${product.colors
                  .map((c) => `<option value="${c}">${c}</option>`)
                  .join("")}
            </select>
        </div>`;
    }

    // Insert before price
    const priceEl = this.modal.querySelector("#quick-view-price");
    priceEl.insertAdjacentHTML("beforebegin", variantsHTML);

    // Button Logic
    const addToCartBtn = this.modal.querySelector(".btn-add-cart-modal");
    const qtyInput = this.modal.querySelector(".qty-input");
    if (qtyInput) qtyInput.value = 1;

    if (addToCartBtn) {
      const newBtn = addToCartBtn.cloneNode(true);
      addToCartBtn.parentNode.replaceChild(newBtn, addToCartBtn);

      if (product.stock <= 0) {
        newBtn.disabled = true;
        newBtn.textContent = "Out of Stock";
        newBtn.style.background = "#ccc";
        newBtn.style.cursor = "not-allowed";
      } else {
        newBtn.disabled = false;
        newBtn.textContent = "Add to Cart";
        newBtn.style.background = ""; // Reset to CSS default
        newBtn.style.cursor = "pointer";

        newBtn.addEventListener("click", () => {
          const quantity = parseInt(qtyInput?.value || 1);

          // Check stock
          if (product.stock !== undefined && quantity > product.stock) {
            window.cartManager.showToast(
              `Cannot add ${quantity}. Only ${product.stock} left!`,
              "error"
            );
            return;
          }

          // NEW: Check what's already in cart
          const existingItem = window.cartManager.cart.find(
            (item) => item.title === product.title
          );
          if (existingItem) {
            const totalQuantity = existingItem.quantity + quantity;
            if (product.stock !== undefined && totalQuantity > product.stock) {
              const canAdd = product.stock - existingItem.quantity;
              if (canAdd <= 0) {
                window.cartManager.showToast(
                  `You already have ${existingItem.quantity} in cart (max stock).`,
                  "warning"
                );
              } else {
                window.cartManager.showToast(
                  `Can only add ${canAdd} more. You have ${existingItem.quantity} in cart.`,
                  "warning"
                );
              }
              return;
            }
          }

          const sizeSelect = this.modal.querySelector("#qv-size");
          const colorSelect = this.modal.querySelector("#qv-color");

          const productToAdd = {
            ...product,
            selectedSize: sizeSelect ? sizeSelect.value : null,
            selectedColor: colorSelect ? colorSelect.value : null,
          };

          window.cartManager.addToCart(productToAdd, quantity);
          this.closeModal();
        });
      }
    }

    this.modal.style.display = "flex";
  }

  closeModal() {
    if (this.modal) this.modal.style.display = "none";
  }
}

// --- 4. Hero Carousel ---
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

    const prevBtn = document.getElementById("hero-prev");
    const nextBtn = document.getElementById("hero-next");

    if (prevBtn) prevBtn.addEventListener("click", () => this.changeSlide(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => this.changeSlide(1));

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
// PAGINATION SYSTEM
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

    if (window.productManager) {
      window.productManager.attachCardListeners(container);
    }

    const productsSection = document.querySelector(".products-section");
    if (productsSection && this.currentPage > 1) {
      productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
    paginationWrapper.style.display = "flex";
    paginationWrapper.style.justifyContent = "center";
    paginationWrapper.style.alignItems = "center";
    paginationWrapper.style.gap = "15px";
    paginationWrapper.style.marginTop = "40px";
    paginationWrapper.style.gridColumn = "1 / -1";

    const prevBtn = document.createElement("button");
    prevBtn.className = "btn-secondary pagination-btn";
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Prev';

    if (this.currentPage === 1) {
      prevBtn.style.visibility = "hidden";
    }

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

    if (this.currentPage === totalPages) {
      nextBtn.style.visibility = "hidden";
    }

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
// AUTHENTICATION LOGIC
// ====================================================================

const AUTH_KEY = "cricketStoreCurrentUser";

function saveUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function getUser() {
  try {
    const user = localStorage.getItem(AUTH_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

function logoutUser() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem("authToken");
  if (window.cartManager) {
    window.cartManager.clearCart();
    window.cartManager.clearWishlist();
    window.cartManager.showToast("Logged out successfully!");
  }
  updateAccountUI();
}

// GLOBAL: Update UI text based on login state
function updateAccountUI() {
  const user = getUser();
  const accountName = document.querySelector(".user-btn span");
  const accountMenu = document.querySelector(".account-menu");

  if (!accountName || !accountMenu) return;

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

// GLOBAL: Auth Modal Controls
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

    loginForm?.classList.remove("active");
    signupForm?.classList.remove("active");
    forgotForm?.classList.remove("active");

    if (loginTab) loginTab.style.display = "block";
    if (signupTab) signupTab.style.display = "block";

    if (mode === "signup") {
      signupTab?.classList.add("active");
      loginTab?.classList.remove("active");
      signupForm?.classList.add("active");
    } else {
      loginTab?.classList.add("active");
      signupTab?.classList.remove("active");
      loginForm?.classList.add("active");
    }
    modal.style.display = "flex";
  }
}

function openForgotPasswordForm() {
  document.getElementById("login-form")?.classList.remove("active");
  document.getElementById("signup-form")?.classList.remove("active");

  const loginTab = document.getElementById("login-tab");
  if (loginTab) loginTab.style.display = "none";

  const signupTab = document.getElementById("signup-tab");
  if (signupTab) signupTab.style.display = "none";

  const forgotForm = document.getElementById("forgot-password-form");
  if (forgotForm) forgotForm.classList.add("active");
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "none";
}

async function openOrdersModal() {
  const user = getUser();
  if (!user) {
    openAuthModal("login");
    return;
  }

  let modal = document.getElementById("orders-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "orders-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>My Orders</h2>
          <span class="close" id="close-orders-modal">&times;</span>
        </div>
        <div class="modal-body" id="orders-modal-body">
          <div style="text-align:center; padding:40px;">Loading orders...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal
      .querySelector("#close-orders-modal")
      .addEventListener("click", closeOrdersModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeOrdersModal();
    });
  }

  modal.style.display = "flex";
  const modalBody = document.getElementById("orders-modal-body");

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      openAuthModal("login");
      return;
    }

    const res = await fetch("/api/orders", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to fetch");
    const orders = await res.json();

    if (orders.length === 0) {
      modalBody.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <h3>No Orders Yet</h3>
            <p style="color: #999;">Start shopping to see your orders here!</p>
          </div>`;
    } else {
      modalBody.innerHTML = `
          <div class="orders-list">
            ${orders
              .map(
                (order) => `
              <div class="order-card">
                <div class="order-header">
                  <div>
                    <h3>Order #${
                      order.trackingId || order._id.slice(-6).toUpperCase()
                    }</h3>
                    <p class="order-date">${formatDate(order.orderDate)}</p>
                    <p class="order-address" style="font-size:0.9rem; color:#444;">
                      To: ${order.shippingAddress?.street}, ${
                  order.shippingAddress?.city
                }
                    </p>
                  </div>
                  <div class="order-status" style="color: var(--primary-color)">${
                    order.status
                  }</div>
                </div>
                <div class="order-items">
                  ${order.items
                    .map(
                      (item) => `
                    <div class="order-item">
                      <span>${item.title} × ${item.quantity}</span>
                      <span>₹${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  `
                    )
                    .join("")}
                </div>
                <div class="order-footer">
                  <strong>Total: ₹${order.total.toFixed(2)}</strong>
                </div>
              </div>
            `
              )
              .join("")}
          </div>`;
    }
  } catch (err) {
    modalBody.innerHTML = `<p style="color:red; text-align:center;">Failed to load orders.</p>`;
  }
}

function closeOrdersModal() {
  const modal = document.getElementById("orders-modal");
  if (modal) modal.style.display = "none";
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// --- USER PROFILE LOGIC ---

// 1. Tab Switcher
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

// 2. Toggle Address Form visibility
window.toggleAddressForm = function (show) {
  document.getElementById("new-address-form").style.display = show
    ? "block"
    : "none";
  document.getElementById("add-address-btn").style.display = show
    ? "none"
    : "block";
};

// 3. Open Modal & Fetch Data
async function openProfileModal() {
  const user = getUser();
  if (!user) {
    openAuthModal("login");
    return;
  }

  const modal = document.getElementById("profile-modal");
  modal.style.display = "flex";

  // Close button logic
  const closeBtn = modal.querySelector(".close");
  if (closeBtn) {
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener("click", () => (modal.style.display = "none"));
  }

  // Load data from API
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      openAuthModal("login");
      return;
    }

    const res = await fetch("/api/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const userData = await res.json();

      // Populate Info
      const nameInput = document.getElementById("profile-name");
      const emailInput = document.getElementById("profile-email");

      if (nameInput) nameInput.value = userData.name || "";
      if (emailInput) emailInput.value = userData.email || "";

      // Populate Addresses
      renderAddresses(userData.addresses || []);

      // Update local storage with complete user data
      saveUser(userData);
    } else {
      const errorData = await res.json();
      console.error("Failed to load profile:", errorData);
      window.cartManager.showToast("Failed to load profile data", "error");
    }
  } catch (error) {
    console.error("Profile load error:", error);
    window.cartManager.showToast("Connection error", "error");
  }
}
// 4. Render Address List
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
      <h5>Address #${index + 1}</h5>
      <p>${addr.street}, ${addr.city}</p>
      <p>${addr.state} - ${addr.zip}, ${addr.country}</p>
      <button class="btn-delete-addr" onclick="deleteAddress(${index})">Delete</button>
    `;
    container.appendChild(div);
  });
}

// 5. Save Profile (Name)
// 5. Save Profile (Name)
async function saveProfileInfo() {
  const newName = document.getElementById("profile-name").value;
  const token = localStorage.getItem("authToken");

  if (!newName || !newName.trim()) {
    window.cartManager.showToast("Name cannot be empty", "error");
    return;
  }

  try {
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      saveUser(data.user); // Update local storage
      updateAccountUI(); // Update header name
      window.cartManager.showToast("Profile updated!", "success");
    } else {
      const errorData = await res.json();
      window.cartManager.showToast(errorData.error || "Update failed", "error");
    }
  } catch (e) {
    console.error("Profile update error:", e);
    window.cartManager.showToast("Update failed", "error");
  }
}

// 6. Save New Address
async function saveNewAddress() {
  const street = document.getElementById("addr-street").value;
  const city = document.getElementById("addr-city").value;
  const state = document.getElementById("addr-state").value;
  const zip = document.getElementById("addr-zip").value;
  const country = document.getElementById("addr-country").value;

  if (!street || !city || !zip) {
    window.cartManager.showToast("Please fill required fields", "error");
    return;
  }

  const user = getUser();
  const newAddress = { street, city, state, zip, country };
  const updatedAddresses = [...(user.addresses || []), newAddress];

  try {
    const token = localStorage.getItem("authToken");
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ addresses: updatedAddresses }),
    });

    if (res.ok) {
      const data = await res.json();
      saveUser(data.user);
      renderAddresses(data.user.addresses);
      window.toggleAddressForm(false);

      document.getElementById("addr-street").value = "";
      document.getElementById("addr-city").value = "";
      document.getElementById("addr-state").value = "";
      document.getElementById("addr-zip").value = "";

      window.cartManager.showToast("Address saved!", "success");
    }
  } catch (e) {
    window.cartManager.showToast("Failed to save address", "error");
  }
}

// 7. Delete Address
window.deleteAddress = async function (index) {
  if (!confirm("Are you sure you want to delete this address?")) return;

  const user = getUser();
  const updatedAddresses = user.addresses.filter((_, i) => i !== index);

  try {
    const token = localStorage.getItem("authToken");
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ addresses: updatedAddresses }),
    });

    if (res.ok) {
      const data = await res.json();
      saveUser(data.user);
      renderAddresses(data.user.addresses);
      window.cartManager.showToast("Address deleted", "info");
    }
  } catch (e) {
    window.cartManager.showToast("Failed to delete", "error");
  }
};

// ====================================================================
// INITIALIZATION
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing App...");

  window.cartManager = new CartManager();
  window.productManager = new ProductManager();
  window.productPagination = new ProductPagination();
  window.quickViewModal = new QuickViewModal();
  window.heroCarousel = new HeroCarousel();

  // --- Account Dropdown Logic (Event Delegation) ---
  const accountDropdown = document.querySelector(".account-dropdown");
  const accountBtn = document.getElementById("account-btn");
  const accountMenu = document.querySelector(".account-menu");

  if (accountBtn && accountDropdown && accountMenu) {
    // Toggle Menu
    accountBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      updateAccountUI();
      accountDropdown.classList.toggle("active");
    });

    // Handle Clicks on Login/Signup/Logout (Delegation)
    accountMenu.addEventListener("click", (e) => {
      if (e.target.classList.contains("auth-action")) {
        e.preventDefault();
        const action = e.target.getAttribute("data-action");

        if (action === "login") openAuthModal("login");
        if (action === "signup") openAuthModal("signup");
        if (action === "profile") openProfileModal();
        if (action === "orders") openOrdersModal();
        if (action === "logout") logoutUser();

        accountDropdown.classList.remove("active");
      }
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !accountDropdown.contains(e.target) &&
        !accountBtn.contains(e.target)
      ) {
        accountDropdown.classList.remove("active");
      }
    });
  }

  // --- Auth Modal Events ---
  const closeAuth = document.querySelector(".close-auth");
  if (closeAuth) closeAuth.addEventListener("click", closeAuthModal);

  document
    .getElementById("login-tab")
    ?.addEventListener("click", () => openAuthModal("login"));
  document
    .getElementById("signup-tab")
    ?.addEventListener("click", () => openAuthModal("signup"));

  document
    .getElementById("forgot-password-link")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      openForgotPasswordForm();
    });

  document
    .getElementById("back-to-login-link")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal("login");
    });

  // --- Login Form Submission ---
  document
    .getElementById("login-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;
      const submitBtn = e.target.querySelector("button");

      try {
        submitBtn.textContent = "Logging in...";
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (res.ok) {
          saveUser(data.user);
          localStorage.setItem("authToken", data.token);
          closeAuthModal();
          updateAccountUI();
          window.cartManager.showToast(
            `Welcome back, ${data.user.name}!`,
            "success"
          );
        } else {
          window.cartManager.showToast(data.error, "danger");
        }
      } catch (error) {
        window.cartManager.showToast("Login failed.", "error");
      } finally {
        submitBtn.textContent = "Login";
      }
    });

  // --- Signup Form Submission ---
  document
    .getElementById("signup-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("signup-name").value;
      const email = document.getElementById("signup-email").value;
      const password = document.getElementById("signup-password").value;
      const submitBtn = e.target.querySelector("button");

      try {
        submitBtn.textContent = "Signing up...";
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();

        if (res.ok) {
          saveUser(data.user);
          window.cartManager.showToast(
            "Account created! Please login.",
            "success"
          );
          e.target.reset();
          openAuthModal("login");
        } else {
          window.cartManager.showToast(data.error, "danger");
        }
      } catch (error) {
        window.cartManager.showToast("Signup failed.", "error");
      } finally {
        submitBtn.textContent = "Sign Up";
        submitBtn.disabled = false;
      }
    });

  // --- Forgot Password Submission ---
  document
    .getElementById("forgot-password-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("forgot-email").value;
      const submitBtn = e.target.querySelector("button");

      try {
        submitBtn.textContent = "Sending...";
        const res = await fetch("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();

        if (res.ok) {
          window.cartManager.showToast(data.message, "success");
          openAuthModal("login");
        } else {
          window.cartManager.showToast(data.error, "danger");
        }
      } catch (error) {
        window.cartManager.showToast("Request failed.", "error");
      } finally {
        submitBtn.textContent = "Send Link";
      }
    });

  // --- View Cart Button Logic ---
  const viewCartBtn = document.getElementById("view-cart-btn");
  if (viewCartBtn) {
    viewCartBtn.addEventListener("click", () => {
      // Close cart dropdown
      const cartDropdown = document.getElementById("cart-dropdown");
      if (cartDropdown) cartDropdown.style.display = "none";

      // Open cart review modal
      openCartReviewModal();
    });
  }

  // Mobile Nav Logic
  const mobileNav = document.getElementById("mobile-nav");
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const closeMobileNav = document.getElementById("close-mobile-nav");
  const mobileNavOverlay = document.getElementById("mobile-nav-overlay");

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", () => {
      mobileNav.classList.add("active");
      mobileNavOverlay.classList.add("active");
    });
  }
  if (closeMobileNav) {
    closeMobileNav.addEventListener("click", () => {
      mobileNav.classList.remove("active");
      mobileNavOverlay.classList.remove("active");
    });
  }
  if (mobileNavOverlay) {
    mobileNavOverlay.addEventListener("click", () => {
      mobileNav.classList.remove("active");
      mobileNavOverlay.classList.remove("active");
    });
  }

  // Mobile Dropdowns
  document.querySelectorAll(".mobile-dropdown-toggle").forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      toggle.closest(".mobile-dropdown").classList.toggle("active");
    });
  });

  // Mobile Menu Links - Close sidebar ONLY for Home link
  document.querySelectorAll(".mobile-menu-list a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");

      // Only handle the #home link
      if (href === "#home") {
        e.preventDefault();

        // Close mobile nav
        mobileNav.classList.remove("active");
        mobileNavOverlay.classList.remove("active");

        // Scroll to top
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  // Profile Form Listeners
  document
    .getElementById("save-profile-btn")
    ?.addEventListener("click", saveProfileInfo);
  document
    .getElementById("add-address-btn")
    ?.addEventListener("click", () => window.toggleAddressForm(true));
  document
    .getElementById("save-address-btn")
    ?.addEventListener("click", saveNewAddress);

  // Update UI on load
  updateAccountUI();
});

// Payment Modal Functions (Global)
function closePaymentModal() {
  const modal = document.getElementById("demo-payment-modal");
  if (modal) modal.style.display = "none";

  // FIX: Reset Step Indicators when closing
  const stepAddress = document.getElementById("step-address");
  const stepPayment = document.getElementById("step-payment");
  if (stepAddress) stepAddress.classList.remove("active");
  if (stepPayment) stepPayment.classList.remove("active");
}

// Cart Review Modal Functions
function openCartReviewModal() {
  const modal = document.getElementById("cart-review-modal");
  const items = window.cartManager.cart;

  if (items.length === 0) {
    window.cartManager.showToast("Your cart is empty!", "warning");
    return;
  }

  // Populate cart items
  const cartReviewItems = document.getElementById("cart-review-items");
  cartReviewItems.innerHTML = items
    .map(
      (item) => `
    <div class="payment-item" style="padding: 15px; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>${item.title}</strong>
          <div style="font-size: 0.9rem; color: #666;">
            Quantity: ${item.quantity}
            ${item.selectedSize ? `| Size: ${item.selectedSize}` : ""}
            ${item.selectedColor ? `| Color: ${item.selectedColor}` : ""}
          </div>
        </div>
        <div style="font-weight: 600;">₹${(item.price * item.quantity).toFixed(
          2
        )}</div>
      </div>
    </div>
  `
    )
    .join("");

  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 2000 ? 0 : 150;
  const tax = subtotal * 0.18;
  const total = subtotal + shipping + tax;

  document.getElementById("cart-review-subtotal").textContent =
    subtotal.toFixed(2);
  document.getElementById("cart-review-shipping").textContent =
    shipping.toFixed(2);
  document.getElementById("cart-review-tax").textContent = tax.toFixed(2);
  document.getElementById("cart-review-total").textContent = total.toFixed(2);

  modal.style.display = "flex";

  // Close button
  const closeBtn = document.getElementById("close-cart-review");
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  newCloseBtn.addEventListener("click", () => (modal.style.display = "none"));

  // Continue Shopping button
  const continueBtn = document.getElementById("continue-shopping-btn");
  const newContinueBtn = continueBtn.cloneNode(true);
  continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);
  newContinueBtn.addEventListener(
    "click",
    () => (modal.style.display = "none")
  );

  // Proceed to Checkout button
  const proceedBtn = document.getElementById("proceed-checkout-btn");
  const newProceedBtn = proceedBtn.cloneNode(true);
  proceedBtn.parentNode.replaceChild(newProceedBtn, proceedBtn);
  newProceedBtn.addEventListener("click", () => {
    modal.style.display = "none";
    openPaymentModal(items);
  });
}

function openPaymentModal(items) {
  const user = getUser();
  if (!user) {
    window.cartManager.showToast("Please login to checkout", "warning");
    document.getElementById("auth-modal").style.display = "flex";
    return;
  }

  const modal = document.getElementById("demo-payment-modal");
  // FIX: Hide cart dropdown to prevent visual overlap
  const cartDropdown = document.getElementById("cart-dropdown");
  if (cartDropdown) cartDropdown.style.display = "none";

  const addressSection = document.getElementById("checkout-address-section");
  const paymentSection = document.getElementById("checkout-payment-section");
  const addressList = document.getElementById("checkout-addresses-list");
  const continueBtn = document.getElementById("btn-continue-payment");
  const payNowBtn = document.getElementById("pay-now");

  // Reset View (Show Address, Hide Payment)
  if (addressSection) addressSection.style.display = "block";
  if (paymentSection) paymentSection.style.display = "none";
  if (payNowBtn) payNowBtn.style.display = "none";

  // Step Indicators
  const stepCart = document.querySelector(".checkout-steps .step:first-child");
  const stepAddress = document.getElementById("step-address");
  const stepPayment = document.getElementById("step-payment");

  if (stepCart) stepCart.classList.remove("active");
  if (stepAddress) stepAddress.classList.remove("active");
  if (stepPayment) stepPayment.classList.remove("active");

  if (stepAddress) stepAddress.classList.add("active");

  // FIX: Make selectedAddress accessible throughout the function
  let selectedAddress = null;

  // --- RENDER ADDRESSES ---
  const addresses = user.addresses || [];

  if (addressList) {
    addressList.innerHTML = "";

    if (addresses.length === 0) {
      addressList.innerHTML = `
        <p style="text-align:center; color:#666; margin-bottom:15px">No saved addresses found.</p>
        <button class="btn-secondary" style="width:100%" onclick="closePaymentModal(); openProfileModal(); window.switchProfileTab('address');">
          + Add New Address in Profile
        </button>
      `;
      if (continueBtn) continueBtn.style.display = "none";
    } else {
      if (continueBtn) continueBtn.style.display = "block";
      addresses.forEach((addr, index) => {
        const card = document.createElement("div");
        card.className = "address-option-card";

        if (index === 0) {
          card.classList.add("selected");
          selectedAddress = addr;
        }

        card.innerHTML = `
          <div style="font-weight:600">${user.name}</div>
          <div>${addr.street}, ${addr.city}</div>
          <div>${addr.state} - ${addr.zip}</div>
        `;

        card.addEventListener("click", () => {
          document
            .querySelectorAll(".address-option-card")
            .forEach((c) => c.classList.remove("selected"));
          card.classList.add("selected");
          selectedAddress = addr;
        });

        addressList.appendChild(card);
      });
    }
  }

  // --- POPULATE PAYMENT ITEMS (Needed for both steps) ---
  const paymentItems = document.getElementById("payment-items");
  if (paymentItems) {
    paymentItems.innerHTML = items
      .map(
        (item) => `
        <div class="payment-item">
          <span>${item.title} (x${item.quantity})</span>
          <span>₹${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      `
      )
      .join("");
  }

  // Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 2000 ? 0 : 150;
  const tax = subtotal * 0.18;
  const finalTotal = subtotal + shipping + tax;

  // Update summary text
  const elSub = document.getElementById("payment-subtotal");
  const elShip = document.getElementById("payment-shipping");
  const elTax = document.getElementById("payment-tax");
  const elTot = document.getElementById("payment-total");

  if (elSub) elSub.textContent = subtotal.toFixed(2);
  if (elShip) elShip.textContent = shipping.toFixed(2);
  if (elTax) elTax.textContent = tax.toFixed(2);
  if (elTot) elTot.textContent = finalTotal.toFixed(2);

  // Payment Toggles
  const paymentRadios = modal.querySelectorAll('input[name="payment"]');
  const cardForm = document.getElementById("card-form");
  const upiForm = document.getElementById("upi-form");

  const updatePaymentForms = () => {
    const selected = modal.querySelector('input[name="payment"]:checked').value;
    if (cardForm)
      cardForm.style.display = selected === "card" ? "block" : "none";
    if (upiForm) upiForm.style.display = selected === "upi" ? "block" : "none";
  };
  paymentRadios.forEach((r) =>
    r.addEventListener("change", updatePaymentForms)
  );
  updatePaymentForms();

  // --- CONTINUE BUTTON LOGIC ---
  if (continueBtn) {
    const newContinue = continueBtn.cloneNode(true);
    continueBtn.parentNode.replaceChild(newContinue, continueBtn);

    newContinue.addEventListener("click", () => {
      if (!selectedAddress) {
        window.cartManager.showToast("Please select an address", "warning");
        return;
      }
      // Move to Payment Step
      addressSection.style.display = "none";
      paymentSection.style.display = "block";

      const payBtn = document.getElementById("pay-now"); // Get fresh reference
      if (payBtn) {
        payBtn.style.display = "block";
        payBtn.style.visibility = "visible"; // Extra safety
      }

      if (stepAddress) stepAddress.classList.add("active");
      if (stepPayment) stepPayment.classList.add("active");
    });
  }

  // --- FINAL PAY BUTTON LOGIC ---
  if (payNowBtn) {
    const payNowBtnNew = payNowBtn.cloneNode(true);
    payNowBtn.parentNode.replaceChild(payNowBtnNew, payNowBtn);

    payNowBtnNew.addEventListener("click", async () => {
      // FIX: Check if address was selected
      if (!selectedAddress) {
        window.cartManager.showToast(
          "Please select a delivery address",
          "error"
        );
        return;
      }

      const selectedMethod = modal.querySelector(
        'input[name="payment"]:checked'
      )?.value;

      if (!selectedMethod) {
        window.cartManager.showToast("Please select a payment method", "error");
        return;
      }

      // Validation
      if (selectedMethod === "card") {
        const cardInput = cardForm?.querySelector("input");
        if (!cardInput || !cardInput.value?.trim()) {
          window.cartManager.showToast("Please enter card details", "error");
          return;
        }
      } else if (selectedMethod === "upi") {
        const upiInput = upiForm?.querySelector("input");
        if (!upiInput || !upiInput.value?.trim()) {
          window.cartManager.showToast("Please enter UPI ID", "error");
          return;
        }
      }

      try {
        payNowBtnNew.textContent = "Processing...";
        payNowBtnNew.disabled = true;

        const token = localStorage.getItem("authToken");

        const res = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items,
            subtotal,
            shipping,
            tax,
            total: finalTotal,
            paymentMethod: selectedMethod,
            shippingAddress: selectedAddress, // FIX: Now this has the correct address
          }),
        });

        if (res.ok) {
          window.cartManager.showToast("Order placed successfully!", "success");
          window.cartManager.clearCart();
          closePaymentModal();
        } else {
          const errorData = await res.json();
          throw new Error(errorData.error || "Order failed");
        }
      } catch (e) {
        console.error("Order error:", e);
        window.cartManager.showToast(
          e.message || "Failed to place order",
          "error"
        );
      } finally {
        payNowBtnNew.textContent = "Pay Now";
        payNowBtnNew.disabled = false;
      }
    });
  }

  modal.style.display = "flex";

  // Cancel button handler
  const cancelBtn = document.getElementById("cancel-payment");
  if (cancelBtn) {
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    newCancelBtn.addEventListener("click", closePaymentModal);
  }

  // Close X button handler
  const closeBtn = modal.querySelector(".close");
  if (closeBtn) {
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener("click", closePaymentModal);
  }
}
