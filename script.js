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
    // Use in-memory storage instead of localStorage
    return this._cartData || [];
  }

  saveCart() {
    this._cartData = this.cart;
    this.updateUI();
  }

  loadWishlist() {
    return this._wishlistData || [];
  }

  saveWishlist() {
    this._wishlistData = this.wishlist;
    this.updateWishlistUI();
    updateMobileWishlist();
  }

  addToCart(product, quantity = 1) {
    // Check stock limit
    if (product.stock !== undefined && product.stock < quantity) {
      this.showToast(`Sorry, only ${product.stock} items in stock!`, "error");
      return;
    }

    const existingItem = this.cart.find((item) => item.title === product.title);
    const price = parseFloat(product.price) || 0;

    if (existingItem) {
      if (
        product.stock !== undefined &&
        existingItem.quantity + quantity > product.stock
      ) {
        this.showToast(`Cannot add more! Max stock reached.`, "warning");
        return;
      }
      existingItem.quantity += quantity;
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
      this.showToast("Added to wishlist!", "success");
    } else {
      this.wishlist.splice(index, 1);
      this.showToast("Removed from wishlist!", "info");
    }
    this.saveWishlist();
  }

  isInWishlist(productTitle) {
    return this.wishlist.some((item) => item.title === productTitle);
  }

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
    const container = document.getElementById("cart-items");
    const totalEl = document.getElementById("cart-total");
    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666;">Your cart is empty</p>';
      if (totalEl) totalEl.textContent = "₹0";
      return;
    }

    container.innerHTML = this.cart
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

    if (totalEl) totalEl.textContent = `₹${this.getCartTotal().toFixed(2)}`;
  }

  updateWishlistUI() {
    const count = document.querySelector(".wishlist-count");
    if (count) count.textContent = this.wishlist.length;

    const container = document.getElementById("wishlist-items");
    if (!container) return;

    if (this.wishlist.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666; padding: 10px 0;">Your wishlist is empty</p>';
      return;
    }

    container.innerHTML = this.wishlist
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

    for (let i = 0; i < fullStars; i++) html += '<i class="fas fa-star"></i>';
    if (hasHalfStar) html += '<i class="fas fa-star-half-alt"></i>';
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) html += '<i class="far fa-star"></i>';

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
        // NEW: Always open cart modal
        openCartModal();
      });
    }

    if (wishlistBtn && wishlistDropdown) {
      wishlistBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
          // On mobile, open sidebar
          const mobileNav = document.getElementById("mobile-nav");
          const mobileOverlay = document.getElementById("mobile-nav-overlay");
          if (mobileNav) mobileNav.classList.add("active");
          if (mobileOverlay) mobileOverlay.classList.add("active");
        } else {
          // On desktop, show dropdown
          if (cartDropdown) cartDropdown.style.display = "none";
          wishlistDropdown.style.display =
            wishlistDropdown.style.display === "block" ? "none" : "block";
        }
      });
    }

    document.addEventListener("click", (e) => {
      if (
        cartDropdown &&
        !cartDropdown.contains(e.target) &&
        cartBtn &&
        !cartBtn.contains(e.target)
      ) {
        cartDropdown.style.display = "none";
      }
      if (
        wishlistDropdown &&
        !wishlistDropdown.contains(e.target) &&
        wishlistBtn &&
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
        openCartModal();
      });
    }
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("en-US", options);
}

// Sync Wishlist to Mobile Sidebar
function updateMobileWishlist() {
  const container = document.getElementById("mobile-wishlist-items");
  if (!container || !window.cartManager) return;

  const wishlist = window.cartManager.wishlist;

  if (wishlist.length === 0) {
    container.innerHTML =
      '<p style="text-align:center; color:#999; font-size:0.85rem;">No items yet</p>';
    return;
  }

  container.innerHTML = wishlist
    .map(
      (item) => `
    <div class="mobile-wishlist-item">
      <span>${item.title}</span>
      <i class="fas fa-trash mobile-wishlist-remove" 
         onclick="window.cartManager.toggleWishlist({title: '${item.title.replace(
           /'/g,
           "\\'"
         )}', price: ${item.price}})">
      </i>
    </div>
  `
    )
    .join("");
}

// --- 2. Product Management (Enhanced) ---
class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.searchHistory = this._searchHistoryData || [];
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
        if (btn.disabled) return;
        const card = btn.closest(".product-card");
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
        productData.quantity = 1;
        openPaymentModal([productData]);
      });
    });

    container.querySelectorAll(".btn-quick-view").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const card = btn.closest(".product-card");
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
    const priceNumber = document.getElementById("price-number");
    const stockFilter = document.getElementById("stock-filter");
    const ratingFilter = document.getElementById("rating-filter");

    if (categoryFilter)
      categoryFilter.addEventListener("change", () => this.applyFilters());
    if (brandFilter)
      brandFilter.addEventListener("change", () => this.applyFilters());
    if (sortFilter)
      sortFilter.addEventListener("change", () => this.applyFilters());

    // Bind Price Inputs
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
    const setupSearchListener = (inputId, btnId, suggestionsId) => {
      const input = document.getElementById(inputId);
      const btn = document.getElementById(btnId);
      const suggestions = document.getElementById(suggestionsId);

      // Shared Search Logic
      const performSearch = (query) => {
        if (!query) return;
        this.searchProducts(query);

        // Close mobile UI
        const mobileNav = document.getElementById("mobile-nav");
        const mobileOverlay = document.getElementById("mobile-nav-overlay");
        const mobileSearchBar = document.getElementById("mobile-search-bar");

        if (mobileNav) mobileNav.classList.remove("active");
        if (mobileOverlay) mobileOverlay.classList.remove("active");
        if (mobileSearchBar) mobileSearchBar.classList.remove("active");
        if (suggestions) suggestions.classList.remove("active");

        // Smooth scroll to products
        const productsSection = document.querySelector(".products-section");
        if (productsSection) {
          const headerOffset = 100;
          const elementPosition = productsSection.getBoundingClientRect().top;
          const offsetPosition =
            elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
      };

      if (input) {
        input.addEventListener("focus", () => {
          if (!input.value.trim()) this.showSearchHistory(suggestions, input);
        });

        input.addEventListener("input", (e) => {
          const query = e.target.value;
          if (query.length > 0) {
            this.showSuggestions(query, suggestions, input);
          } else {
            this.showSearchHistory(suggestions, input);
          }
        });

        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") performSearch(input.value);
        });

        document.addEventListener("click", (e) => {
          if (
            suggestions &&
            !input.contains(e.target) &&
            !suggestions.contains(e.target)
          ) {
            suggestions.classList.remove("active");
          }
        });
      }

      if (btn) {
        btn.addEventListener("click", () => {
          if (input) performSearch(input.value);
        });
      }
    };

    // 1. Desktop
    setupSearchListener("search-input", "search-btn", "search-suggestions");
    // 2. Mobile Overlay
    setupSearchListener(
      "mobile-search-input-overlay",
      null,
      "mobile-search-suggestions-overlay"
    );

    // Mobile Search Toggle Logic
    const mobileSearchToggle = document.getElementById("mobile-search-toggle");
    const mobileSearchBar = document.getElementById("mobile-search-bar");
    const closeMobileSearch = document.getElementById("close-mobile-search");

    if (mobileSearchToggle) {
      mobileSearchToggle.addEventListener("click", () => {
        mobileSearchBar.classList.add("active");
        setTimeout(
          () => document.getElementById("mobile-search-input-overlay")?.focus(),
          100
        );
      });
    }
    if (closeMobileSearch) {
      closeMobileSearch.addEventListener("click", () => {
        mobileSearchBar.classList.remove("active");
      });
    }
  }

  showSuggestions(query, container, inputElement) {
    if (!container) return;
    const matches = this.products
      .filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.brand.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5);

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
        </div>`
      )
      .join("");

    // Global helper for onclick
    window.productManager.selectSuggestion = (title) => {
      inputElement.value = title;
      this.searchProducts(title);
      this.addToSearchHistory(title);
      container.classList.remove("active");

      // Also perform scroll
      const productsSection = document.querySelector(".products-section");
      if (productsSection) {
        const headerOffset = 100;
        const elementPosition = productsSection.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
      // Close mobile search if open
      document.getElementById("mobile-search-bar")?.classList.remove("active");
    };

    container.classList.add("active");
  }

  showSearchHistory(container, inputElement) {
    if (!container || this.searchHistory.length === 0) return;

    container.innerHTML =
      `<div class="search-history-header">Recent Searches</div>` +
      this.searchHistory
        .map(
          (term) => `
          <div class="suggestion-item" onclick="window.productManager.selectSuggestion('${term}')">
              <i class="fas fa-history" style="color:#ccc"></i>
              <span>${term}</span>
          </div>`
        )
        .join("");

    container.classList.add("active");
  }

  addToSearchHistory(term) {
    if (!term) return;
    this.searchHistory = this.searchHistory.filter((t) => t !== term);
    this.searchHistory.unshift(term);
    if (this.searchHistory.length > 5) this.searchHistory.pop();
    this._searchHistoryData = this.searchHistory;
  }

  searchProducts(query) {
    const searchTerm = query.toLowerCase().trim();

    // Hide/Show Hero
    const hero = document.querySelector(".hero-section");
    if (hero) hero.style.display = searchTerm.length > 0 ? "none" : "block";

    if (!searchTerm) {
      this.filteredProducts = [...this.products];
    } else {
      this.addToSearchHistory(query);
      this.filteredProducts = this.products.filter(
        (product) =>
          product.title.toLowerCase().includes(searchTerm) ||
          product.brand.toLowerCase().includes(searchTerm) ||
          (product.category &&
            product.category.toLowerCase().includes(searchTerm))
      );
    }
    this.renderProductCards();

    if (this.filteredProducts.length === 0) {
      const container = document.getElementById("products-container");
      if (container)
        container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px"><h3>No products found</h3></div>`;
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
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeModal());
    }
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

    this.modal.querySelector("#quick-view-title").textContent = product.title;
    this.modal.querySelector("#quick-view-img").src = product.image;
    const descriptionEl = this.modal.querySelector("#quick-view-description");
    if (descriptionEl) {
      descriptionEl.textContent =
        product.description || "No description available.";
      descriptionEl.style.display = "block";
      descriptionEl.style.marginTop = "20px";
      descriptionEl.style.paddingTop = "20px";
      descriptionEl.style.borderTop = "1px solid #e0e0e0";
    }

    this.modal.querySelector(
      "#quick-view-price"
    ).innerHTML = `<span class="price-current">₹${product.price}</span>`;

    // Clear old variant elements
    const detailsContainer = this.modal.querySelector(".quick-view-details");
    const oldElements = detailsContainer.querySelectorAll(
      ".variant-group, .stock-status"
    );
    oldElements.forEach((el) => el.remove());

    // Build stock status HTML
    let stockHTML = "";
    if (product.stock !== undefined) {
      if (product.stock <= 0) {
        stockHTML = `<div class="stock-status" style="background:#ffe0e0; color:var(--danger-color); padding:10px; border-radius:6px; font-weight:600;">
        <i class="fas fa-times-circle"></i> Out of Stock
      </div>`;
      } else if (product.stock < 5) {
        stockHTML = `<div class="stock-status" style="background:#fff3cd; color:#856404; padding:10px; border-radius:6px; font-weight:600;">
        <i class="fas fa-exclamation-circle"></i> Only ${product.stock} left!
      </div>`;
      } else {
        stockHTML = `<div class="stock-status" style="background:#d4edda; color:#155724; padding:10px; border-radius:6px; font-weight:600;">
        <i class="fas fa-check-circle"></i> In Stock
      </div>`;
      }
    }

    // Build variants HTML
    let variantsHTML = stockHTML;

    if (product.sizes && product.sizes.length > 0) {
      variantsHTML += `
      <div class="variant-group">
        <strong>Size:</strong>
        <select id="qv-size">
          ${product.sizes
            .map((s) => `<option value="${s}">${s}</option>`)
            .join("")}
        </select>
      </div>`;
    }

    if (product.colors && product.colors.length > 0) {
      variantsHTML += `
      <div class="variant-group">
        <strong>Color:</strong>
        <select id="qv-color">
          ${product.colors
            .map((c) => `<option value="${c}">${c}</option>`)
            .join("")}
        </select>
      </div>`;
    }

    // Insert after price (before description)
    const priceEl = this.modal.querySelector("#quick-view-price");
    priceEl.insertAdjacentHTML("afterend", variantsHTML);

    // Reset quantity
    const qtyInput = this.modal.querySelector(".qty-input");
    if (qtyInput) qtyInput.value = 1;

    // Handle Add to Cart button
    const addToCartBtn = this.modal.querySelector(".btn-add-cart-modal");
    if (addToCartBtn) {
      const newBtn = addToCartBtn.cloneNode(true);
      addToCartBtn.parentNode.replaceChild(newBtn, addToCartBtn);

      if (product.stock <= 0) {
        newBtn.disabled = true;
        newBtn.textContent = "Out of Stock";
        newBtn.style.background = "#ccc";
      } else {
        newBtn.disabled = false;
        newBtn.textContent = "Add to Cart";
        newBtn.style.background = "";

        newBtn.addEventListener("click", () => {
          const quantity = parseInt(qtyInput?.value || 1);

          if (quantity > product.stock) {
            window.cartManager.showToast(
              `Only ${product.stock} available!`,
              "error"
            );
            return;
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
// AUTHENTICATION & INITIALIZATION
// ====================================================================

// Use in-memory storage
let _currentUser = null;

function saveUser(user) {
  _currentUser = user;
}

function getUser() {
  return _currentUser;
}

function logoutUser() {
  _currentUser = null;
  _authToken = null;
  if (window.cartManager) {
    window.cartManager.cart = [];
    window.cartManager.wishlist = [];
    window.cartManager._cartData = [];
    window.cartManager._wishlistData = [];
    window.cartManager.updateUI();
    window.cartManager.showToast("Logged out successfully!");
  }
  updateAccountUI();
}

let _authToken = null;
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

// Auth Modals
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

    // FIX: Use flex display instead of block
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

// Profile Modals
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

window.toggleAddressForm = function (show) {
  document.getElementById("new-address-form").style.display = show
    ? "block"
    : "none";
  document.getElementById("add-address-btn").style.display = show
    ? "none"
    : "block";
};

async function openProfileModal() {
  const user = getUser();
  if (!user) {
    openAuthModal("login");
    return;
  }

  const modal = document.getElementById("profile-modal");
  modal.style.display = "flex";

  const closeBtn = modal.querySelector(".close");
  if (closeBtn) {
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener("click", () => (modal.style.display = "none"));
  }

  try {
    const token = _authToken;
    const res = await fetch("/api/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const userData = await res.json();
      const nameInput = document.getElementById("profile-name");
      const emailInput = document.getElementById("profile-email");

      if (nameInput) nameInput.value = userData.name || "";
      if (emailInput) emailInput.value = userData.email || "";

      renderAddresses(userData.addresses || []);
      saveUser(userData);
    } else {
      window.cartManager.showToast("Failed to load profile data", "error");
    }
  } catch (error) {
    window.cartManager.showToast("Connection error", "error");
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
      <h5>Address #${index + 1}</h5>
      <p>${addr.street}, ${addr.city}</p>
      <p>${addr.state} - ${addr.zip}, ${addr.country}</p>
      <button class="btn-delete-addr" onclick="deleteAddress(${index})">Delete</button>
    `;
    container.appendChild(div);
  });
}

// Saving Profile Data
async function saveProfileInfo() {
  const newName = document.getElementById("profile-name").value;
  const token = _authToken;
  try {
    const res = await fetch("/api/user", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      const data = await res.json();
      saveUser(data.user);
      updateAccountUI();
      window.cartManager.showToast("Profile updated!", "success");
    }
  } catch (e) {
    window.cartManager.showToast("Update failed", "error");
  }
}

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
    const token = _authToken;
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

window.deleteAddress = async function (index) {
  if (!confirm("Are you sure you want to delete this address?")) return;
  const user = getUser();
  const updatedAddresses = user.addresses.filter((_, i) => i !== index);

  try {
    const token = _authToken;
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

// Payment Modal Functions (Global)
function closePaymentModal() {
  const modal = document.getElementById("demo-payment-modal");
  if (modal) modal.style.display = "none";

  // Reset Step Indicators
  const stepAddress = document.getElementById("step-address");
  const stepPayment = document.getElementById("step-payment");
  if (stepAddress) stepAddress.classList.remove("active");
  if (stepPayment) stepPayment.classList.remove("active");
}
// ===== CART MODAL FUNCTIONS =====
function openCartModal() {
  if (!window.cartManager || window.cartManager.cart.length === 0) {
    window.cartManager.showToast("Your cart is empty!", "warning");
    return;
  }

  const modal = document.getElementById("cart-modal");
  if (!modal) return;

  // Hide cart dropdown if open
  const cartDropdown = document.getElementById("cart-dropdown");
  if (cartDropdown) cartDropdown.style.display = "none";

  renderCartModal();
  modal.style.display = "flex";

  // Close button
  const closeBtn = modal.querySelector(".close");
  if (closeBtn) {
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    newCloseBtn.addEventListener("click", closeCartModal);
  }

  // Continue Shopping button
  const continueBtn = document.getElementById("continue-shopping");
  if (continueBtn) {
    const newContinueBtn = continueBtn.cloneNode(true);
    continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);
    newContinueBtn.addEventListener("click", closeCartModal);
  }

  // Proceed to Checkout button
  const checkoutBtn = document.getElementById("proceed-to-checkout");
  if (checkoutBtn) {
    const newCheckoutBtn = checkoutBtn.cloneNode(true);
    checkoutBtn.parentNode.replaceChild(newCheckoutBtn, checkoutBtn);
    newCheckoutBtn.addEventListener("click", () => {
      closeCartModal();
      openPaymentModal(window.cartManager.cart);
    });
  }

  // Close on outside click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeCartModal();
  });
}

function closeCartModal() {
  const modal = document.getElementById("cart-modal");
  if (modal) modal.style.display = "none";
}

function renderCartModal() {
  const container = document.getElementById("cart-modal-items");
  if (!container || !window.cartManager) return;

  const cart = window.cartManager.cart;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-modal-empty">
        <i class="fas fa-shopping-cart"></i>
        <h3>Your cart is empty</h3>
        <p>Add some items to get started!</p>
      </div>
    `;
    document.getElementById("proceed-to-checkout").disabled = true;
    return;
  }

  container.innerHTML = cart
    .map(
      (item, index) => `
    <div class="cart-modal-item" data-index="${index}">
      <img src="${item.image}" alt="${
        item.title
      }" class="cart-modal-item-image" />
      
      <div class="cart-modal-item-details">
        <div class="cart-modal-item-title">${item.title}</div>
        <div class="cart-modal-item-price">₹${parseFloat(item.price).toFixed(
          2
        )}</div>
        ${
          item.selectedSize || item.selectedColor
            ? `<div class="cart-modal-item-meta">
            ${item.selectedSize ? `Size: ${item.selectedSize}` : ""}
            ${item.selectedColor ? ` | Color: ${item.selectedColor}` : ""}
          </div>`
            : ""
        }
        <div class="cart-modal-item-quantity">
          <button class="cart-modal-qty-btn" onclick="updateCartItemQty('${item.title.replace(
            /'/g,
            "\\'"
          )}', ${item.quantity - 1})">−</button>
          <span style="font-weight:600; min-width:30px; text-align:center;">Qty: ${
            item.quantity
          }</span>
          <button class="cart-modal-qty-btn" onclick="updateCartItemQty('${item.title.replace(
            /'/g,
            "\\'"
          )}', ${item.quantity + 1})">+</button>
        </div>
      </div>
      
      <div class="cart-modal-item-actions">
        <i class="fas fa-trash cart-modal-item-remove" onclick="removeCartItem('${item.title.replace(
          /'/g,
          "\\'"
        )}')"></i>
        <div class="cart-modal-item-subtotal">₹${(
          item.price * item.quantity
        ).toFixed(2)}</div>
      </div>
    </div>
  `
    )
    .join("");

  updateCartModalSummary();
}

function updateCartModalSummary() {
  if (!window.cartManager) return;

  const subtotal = window.cartManager.cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 2000 ? 0 : 150;
  const tax = subtotal * 0.18;
  const total = subtotal + shipping + tax;

  document.getElementById("cart-modal-subtotal").textContent =
    subtotal.toFixed(2);
  document.getElementById("cart-modal-shipping").textContent =
    shipping.toFixed(2);
  document.getElementById("cart-modal-tax").textContent = tax.toFixed(2);
  document.getElementById("cart-modal-total").textContent = total.toFixed(2);
}

function updateCartItemQty(title, newQty) {
  if (window.cartManager) {
    window.cartManager.updateQuantity(title, newQty);
    renderCartModal();
  }
}

function removeCartItem(title) {
  if (window.cartManager) {
    window.cartManager.removeFromCart(title);
    if (window.cartManager.cart.length === 0) {
      closeCartModal();
    } else {
      renderCartModal();
    }
  }
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
  const cartDrop = document.getElementById("cart-dropdown");
  if (cartDrop) cartDrop.style.display = "none";

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
  const stepAddress = document.getElementById("step-address");
  const stepPayment = document.getElementById("step-payment");
  const stepCart = document.querySelector(".checkout-steps .step");
  if (stepAddress) stepAddress.classList.remove("active");
  if (stepPayment) stepPayment.classList.remove("active");
  if (stepCart) stepCart.classList.add("active");

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

      // FIX: Explicitly show the Pay button now
      payNowBtn.style.display = "block";
      continueBtn.style.display = "none";

      if (stepAddress) stepAddress.classList.add("active");
      if (stepPayment) stepPayment.classList.add("active");
    });
  }

  // --- FINAL PAY BUTTON LOGIC ---
  const payNowBtnNew = payNowBtn.cloneNode(true);
  payNowBtn.parentNode.replaceChild(payNowBtnNew, payNowBtn);

  payNowBtnNew.addEventListener("click", async () => {
    const selectedMethod = modal.querySelector(
      'input[name="payment"]:checked'
    ).value;

    // Validation
    if (selectedMethod === "card") {
      if (!cardForm.querySelector("input")?.value?.trim()) {
        window.cartManager.showToast("Please enter card details", "error");
        return;
      }
    } else if (selectedMethod === "upi") {
      if (!upiForm.querySelector("input")?.value?.trim()) {
        window.cartManager.showToast("Please enter UPI ID", "error");
        return;
      }
    }

    try {
      payNowBtnNew.textContent = "Processing...";
      payNowBtnNew.disabled = true;

      const token = _authToken;

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
          shippingAddress: selectedAddress, // SENDING SELECTED ADDRESS
        }),
      });

      if (res.ok) {
        window.cartManager.showToast("Order placed successfully!", "success");
        window.cartManager.clearCart();
        closePaymentModal();
      } else {
        throw new Error("Order failed");
      }
    } catch (e) {
      window.cartManager.showToast("Failed to place order", "error");
    } finally {
      payNowBtnNew.textContent = "Pay Now";
      payNowBtnNew.disabled = false;
    }
  });

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
          <div style="text-align:center; padding:40px;">
            <div class="spinner"></div>
            <p>Loading orders...</p>
          </div>
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
    const token = _authToken;
    if (!token) {
      modalBody.innerHTML = `
        <div style="text-align:center; padding:40px;">
          <p style="color:var(--danger-color);">Please login to view orders</p>
        </div>
      `;
      return;
    }

    const res = await fetch("/api/orders", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const orders = await res.json();

    if (orders.length === 0) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <i class="fas fa-shopping-bag" style="font-size:3rem; color:#ccc; margin-bottom:15px;"></i>
          <h3>No Orders Yet</h3>
          <p style="color: #999;">Start shopping to see your orders here!</p>
          <button class="btn-primary" onclick="closeOrdersModal()" style="margin-top:15px;">
            Continue Shopping
          </button>
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
                </div>
                <span class="order-status status-${order.status
                  .toLowerCase()
                  .replace(/ /g, "-")}">${order.status}</span>
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
              <div class="order-summary" style="margin-top:10px; padding-top:10px; border-top:1px solid #e0e0e0;">
                <div class="summary-row"><span>Subtotal:</span><span>₹${order.subtotal.toFixed(
                  2
                )}</span></div>
                <div class="summary-row"><span>Shipping:</span><span>₹${order.shipping.toFixed(
                  2
                )}</span></div>
                <div class="summary-row"><span>Tax:</span><span>₹${order.tax.toFixed(
                  2
                )}</span></div>
                <div class="summary-row total"><span>Total:</span><span>₹${order.total.toFixed(
                  2
                )}</span></div>
              </div>
              <div class="order-footer" style="margin-top:10px; font-size:0.85rem; color:#666;">
                Payment: ${order.paymentMethod.toUpperCase()}
              </div>
            </div>
          `
            )
            .join("")}
        </div>`;
    }
  } catch (err) {
    console.error("Orders fetch error:", err);
    modalBody.innerHTML = `
      <div style="text-align:center; padding:40px;">
        <i class="fas fa-exclamation-circle" style="font-size:3rem; color:var(--danger-color); margin-bottom:15px;"></i>
        <h3>Failed to Load Orders</h3>
        <p style="color:#999;">${err.message}</p>
        <button class="btn-secondary" onclick="openOrdersModal()" style="margin-top:15px;">
          Retry
        </button>
      </div>`;
  }
}
function closeOrdersModal() {
  const modal = document.getElementById("orders-modal");
  if (modal) modal.style.display = "none";
}

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

  const accountDropdown = document.querySelector(".account-dropdown");
  const accountBtn = document.getElementById("account-btn");
  const accountMenu = document.querySelector(".account-menu");

  if (accountBtn && accountDropdown && accountMenu) {
    accountBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      updateAccountUI();
      accountDropdown.classList.toggle("active");
    });

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

    document.addEventListener("click", (e) => {
      if (
        !accountDropdown.contains(e.target) &&
        !accountBtn.contains(e.target)
      ) {
        accountDropdown.classList.remove("active");
      }
    });
  }

  // Auth Event Listeners
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

  // Form Submissions
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
          _authToken = data.token;
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

  // View Cart Button Logic
  const viewCartBtn = document.getElementById("view-cart-btn");
  if (viewCartBtn) {
    viewCartBtn.addEventListener("click", () => {
      if (window.cartManager.cart.length === 0) {
        window.cartManager.showToast("Your cart is empty!", "warning");
        return;
      }
      openPaymentModal(window.cartManager.cart);
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

  document.querySelectorAll(".mobile-dropdown-toggle").forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      toggle.closest(".mobile-dropdown").classList.toggle("active");
    });
  });

  // --- ADVANCED HOME RESET LOGIC ---
  const resetHomeState = (e) => {
    e.preventDefault();

    // 1. Reset Search
    const searchInput = document.getElementById("search-input");
    const mobileSearchInput = document.getElementById(
      "mobile-search-input-overlay"
    );
    if (searchInput) searchInput.value = "";
    if (mobileSearchInput) mobileSearchInput.value = "";

    // 2. Reset Filters
    const categoryFilter = document.getElementById("category-filter");
    if (categoryFilter) categoryFilter.value = "all";

    // Reset Advanced Filters
    const priceRange = document.getElementById("price-range");
    const priceNumber = document.getElementById("price-number");
    if (priceRange) priceRange.value = 50000;
    if (priceNumber) priceNumber.value = 50000;

    document.getElementById("stock-filter").checked = false;
    document.getElementById("rating-filter").checked = false;

    // 3. Reset Logic in ProductManager
    if (window.productManager) {
      window.productManager.applyFilters(); // Re-fetches/resets list
    }

    // 4. Show Hero Section
    const hero = document.querySelector(".hero-section");
    if (hero) hero.style.display = "block"; // Bring back hero

    // 5. Close Mobile Menu
    const mobileNav = document.getElementById("mobile-nav");
    const mobileOverlay = document.getElementById("mobile-nav-overlay");
    if (mobileNav) mobileNav.classList.remove("active");
    if (mobileOverlay) mobileOverlay.classList.remove("active");

    // 6. Scroll to Top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Attach to ALL Home links (Desktop & Mobile)
  document.querySelectorAll('a[href="#home"]').forEach((link) => {
    link.addEventListener("click", resetHomeState);
  });
  // Profile Listeners
  document
    .getElementById("save-profile-btn")
    ?.addEventListener("click", saveProfileInfo);
  document
    .getElementById("add-address-btn")
    ?.addEventListener("click", () => window.toggleAddressForm(true));
  document
    .getElementById("save-address-btn")
    ?.addEventListener("click", saveNewAddress);

  updateAccountUI();
});
