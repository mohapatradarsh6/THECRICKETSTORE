// ====================================================================
// GLOBAL CONFIGURATION
// ====================================================================

const API_BASE_URL = "/api"; // Change this to your actual API base URL if deployed

// ====================================================================
// IN-MEMORY STORAGE (Replaces localStorage)
// ====================================================================

let _cartData = [];
let _wishlistData = [];
let _searchHistoryData = [];
let _currentUser = null;
let _authToken = null;

// ====================================================================
// CORE FUNCTIONS AND CLASSES
// ====================================================================

// --- 1. Cart Management System ---
class CartManager {
  constructor() {
    this.cart = _cartData;
    this.wishlist = _wishlistData;
    this.initializeEventListeners();
    this.updateUI();
  }

  loadCart() {
    return _cartData;
  }

  saveCart() {
    _cartData = this.cart;
    this.updateUI();
  }

  loadWishlist() {
    return _wishlistData;
  }

  saveWishlist() {
    _wishlistData = this.wishlist;
    this.updateWishlistUI();
    if (typeof updateMobileWishlist === "function") {
      updateMobileWishlist();
    }
  }

  addToCart(product, quantity = 1) {
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
    const wishlistBtn = document.getElementById("wishlist-btn");
    const wishlistDropdown = document.getElementById("wishlist-dropdown");

    if (cartBtn) {
      cartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (wishlistDropdown) wishlistDropdown.style.display = "none";
        openCartModal();
      });
    }

    if (wishlistBtn && wishlistDropdown) {
      wishlistBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
          const mobileNav = document.getElementById("mobile-nav");
          const mobileOverlay = document.getElementById("mobile-nav-overlay");
          if (mobileNav) mobileNav.classList.add("active");
          if (mobileOverlay) {
            mobileOverlay.classList.add("active");
            mobileOverlay.style.display = "block";
          }
        } else {
          const cartDropdown = document.getElementById("cart-dropdown");
          if (cartDropdown) cartDropdown.style.display = "none";
          wishlistDropdown.style.display =
            wishlistDropdown.style.display === "block" ? "none" : "block";
        }
      });
    }

    document.addEventListener("click", (e) => {
      const cartDropdown = document.getElementById("cart-dropdown");
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

// --- 2. Product Management ---
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

  initializeProductEvents() {
    const container = document.getElementById("products-container");
    if (!container) return;

    container.addEventListener("click", (e) => {
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
          openPaymentModal([productData]);
        }
      }
    });
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
    const setupSearchListener = (inputId, btnId, suggestionsId) => {
      const input = document.getElementById(inputId);
      const btn = document.getElementById(btnId);
      const suggestions = document.getElementById(suggestionsId);

      const performSearch = (query) => {
        if (!query) return;
        this.searchProducts(query);

        const mobileNav = document.getElementById("mobile-nav");
        const mobileOverlay = document.getElementById("mobile-nav-overlay");
        const mobileSearchBar = document.getElementById("mobile-search-bar");

        if (mobileNav) mobileNav.classList.remove("active");
        if (mobileOverlay) {
          mobileOverlay.classList.remove("active");
          mobileOverlay.style.display = "none";
        }
        if (mobileSearchBar) mobileSearchBar.classList.remove("active");
        if (suggestions) suggestions.classList.remove("active");

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

    setupSearchListener("search-input", "search-btn", "search-suggestions");
    setupSearchListener(
      "mobile-search-input-overlay",
      null,
      "mobile-search-suggestions-overlay"
    );

    const mobileSearchToggle = document.getElementById("mobile-search-toggle");
    const mobileSearchBar = document.getElementById("mobile-search-bar");
    const closeMobileSearch = document.getElementById("close-mobile-search");

    if (mobileSearchToggle && mobileSearchBar) {
      mobileSearchToggle.addEventListener("click", () => {
        mobileSearchBar.classList.add("active");
        setTimeout(
          () => document.getElementById("mobile-search-input-overlay")?.focus(),
          100
        );
      });
    }
    if (closeMobileSearch && mobileSearchBar) {
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

    window.productManager.selectSuggestion = (title) => {
      inputElement.value = title;
      this.searchProducts(title);
      this.addToSearchHistory(title);
      container.classList.remove("active");

      const productsSection = document.querySelector(".products-section");
      if (productsSection) {
        const headerOffset = 100;
        const elementPosition = productsSection.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
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
    _searchHistoryData = this.searchHistory;
  }

  searchProducts(query) {
    const searchTerm = query.toLowerCase().trim();

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

    if (qtyMinus && qtyInput) {
      qtyMinus.addEventListener("click", () => {
        if (qtyInput.value > 1) qtyInput.value = parseInt(qtyInput.value) - 1;
      });
    }
    if (qtyPlus && qtyInput) {
      qtyPlus.addEventListener("click", () => {
        if (this.currentProduct && this.currentProduct.stock !== undefined) {
          if (parseInt(qtyInput.value) >= this.currentProduct.stock) {
            window.cartManager.showToast(`Max stock reached!`, "warning");
            return;
          }
        }
        qtyInput.value = parseInt(qtyInput.value) + 1;
      });
    }
  }

  showQuickView(product) {
    if (!this.modal) return;
    this.currentProduct = product;

    this.modal.querySelector("#quick-view-title").textContent = product.title;
    this.modal.querySelector("#quick-view-img").src = product.image;

    this.modal.querySelector(
      "#quick-view-price"
    ).innerHTML = `<span class="price-current">₹${product.price}</span>`;

    const desc = this.modal.querySelector("#quick-view-description");
    if (desc)
      desc.textContent = product.description || "No description available.";

    const addToCartBtn = this.modal.querySelector(".btn-add-cart-modal");
    if (addToCartBtn) {
      if (product.stock !== undefined && product.stock <= 0) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = "Out of Stock";
        addToCartBtn.style.background = "#ccc";
      } else {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = "Add to Cart";
        addToCartBtn.style.background = "";

        addToCartBtn.onclick = () => {
          const qtyInput = this.modal.querySelector(".qty-input");
          const quantity = parseInt(qtyInput?.value || 1);
          window.cartManager.addToCart(product, quantity);
          this.closeModal();
        };
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
// AUTHENTICATION & USER MANAGEMENT
// ====================================================================

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

  const mobileMenu = document.querySelector(".mobile-menu-list");
  if (mobileMenu) {
    const existingAuth = mobileMenu.querySelectorAll(".mobile-auth-item");
    existingAuth.forEach((el) => el.remove());

    let authHTML = "";
    if (user) {
      authHTML = `
        <li class="mobile-auth-item"><a href="#" class="auth-action" data-action="profile"><i class="fas fa-user-circle"></i> Hi, ${
          user.name.split(" ")[0]
        }</a></li>
        <li class="mobile-auth-item"><a href="#" class="auth-action" data-action="orders"><i class="fas fa-box"></i> My Orders</a></li>
        <li class="mobile-auth-item"><a href="#" class="auth-action" data-action="logout"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
      `;
    } else {
      authHTML = `
        <li class="mobile-auth-item"><a href="#" class="auth-action" data-action="login"><i class="fas fa-sign-in-alt"></i> Login</a></li>
        <li class="mobile-auth-item"><a href="#" class="auth-action" data-action="signup"><i class="fas fa-user-plus"></i> Sign Up</a></li>
      `;
    }
    mobileMenu.insertAdjacentHTML("afterbegin", authHTML);
  }
}

// ====================================================================
// MODAL FUNCTIONS
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
    closeBtn.onclick = () => (modal.style.display = "none");
  }

  try {
    const token = _authToken;
    const res = await fetch(`${API_BASE_URL}/user`, {
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

async function saveProfileInfo() {
  const newName = document.getElementById("profile-name").value;
  const token = _authToken;
  try {
    const res = await fetch(`${API_BASE_URL}/user`, {
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
    const res = await fetch(`${API_BASE_URL}/user`, {
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
    const res = await fetch(`${API_BASE_URL}/user`, {
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
// CART & PAYMENT MODALS
// ====================================================================

function closePaymentModal() {
  const modal = document.getElementById("demo-payment-modal");
  if (modal) modal.style.display = "none";

  const stepAddress = document.getElementById("step-address");
  const stepPayment = document.getElementById("step-payment");
  if (stepAddress) stepAddress.classList.remove("active");
  if (stepPayment) stepPayment.classList.remove("active");
}

function openCartModal() {
  if (!window.cartManager || window.cartManager.cart.length === 0) {
    window.cartManager.showToast("Your cart is empty!", "warning");
    return;
  }

  const modal = document.getElementById("cart-modal");
  if (!modal) return;

  const cartDropdown = document.getElementById("cart-dropdown");
  if (cartDropdown) cartDropdown.style.display = "none";

  renderCartModal();

  modal.classList.add("active");
  modal.style.display = "flex";

  const checkoutBtn = document.getElementById("proceed-to-checkout");
  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      closeCartModal();
      openPaymentModal(window.cartManager.cart);
    };
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeCartModal();
    }
  });

  const closeBtn = modal.querySelector(".close");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeCartModal();
    };
  }

  const continueBtn = document.getElementById("continue-shopping");
  if (continueBtn) {
    continueBtn.onclick = (e) => {
      e.stopPropagation();
      closeCartModal();
    };
  }
}

function closeCartModal() {
  const modal = document.getElementById("cart-modal");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
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
    openAuthModal("login");
    return;
  }

  const modal = document.getElementById("demo-payment-modal");

  const cartDrop = document.getElementById("cart-dropdown");
  if (cartDrop) cartDrop.style.display = "none";

  const addressSection = document.getElementById("checkout-address-section");
  const paymentSection = document.getElementById("checkout-payment-section");
  const addressList = document.getElementById("checkout-addresses-list");
  const continueBtn = document.getElementById("btn-continue-payment");
  const payNowBtn = document.getElementById("pay-now");

  if (addressSection) addressSection.style.display = "block";
  if (paymentSection) paymentSection.style.display = "none";
  if (payNowBtn) payNowBtn.style.display = "none";

  const stepAddress = document.getElementById("step-address");
  const stepPayment = document.getElementById("step-payment");
  const stepCart = document.querySelector(".checkout-steps .step");
  if (stepAddress) stepAddress.classList.remove("active");
  if (stepPayment) stepPayment.classList.remove("active");
  if (stepCart) stepCart.classList.add("active");

  let selectedAddress = null;

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

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 2000 ? 0 : 150;
  const tax = subtotal * 0.18;
  const finalTotal = subtotal + shipping + tax;

  const elSub = document.getElementById("payment-subtotal");
  const elShip = document.getElementById("payment-shipping");
  const elTax = document.getElementById("payment-tax");
  const elTot = document.getElementById("payment-total");

  if (elSub) elSub.textContent = subtotal.toFixed(2);
  if (elShip) elShip.textContent = shipping.toFixed(2);
  if (elTax) elTax.textContent = tax.toFixed(2);
  if (elTot) elTot.textContent = finalTotal.toFixed(2);

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

  if (continueBtn) {
    continueBtn.onclick = () => {
      if (!selectedAddress) {
        window.cartManager.showToast("Please select an address", "warning");
        return;
      }
      addressSection.style.display = "none";
      paymentSection.style.display = "block";
      payNowBtn.style.display = "block";
      continueBtn.style.display = "none";

      if (stepAddress) stepAddress.classList.add("active");
      if (stepPayment) stepPayment.classList.add("active");
    };
  }

  payNowBtn.onclick = async () => {
    const selectedMethod = modal.querySelector(
      'input[name="payment"]:checked'
    ).value;

    if (selectedMethod === "card") {
      const cardInputs = cardForm.querySelectorAll("input");
      const cardNumber = cardInputs[0]?.value?.trim();
      const cardExpiry = cardInputs[1]?.value?.trim();
      const cardCVV = cardInputs[2]?.value?.trim();
      const cardName = cardInputs[3]?.value?.trim();

      if (
        !cardNumber ||
        cardNumber.length !== 16 ||
        !/^\d+$/.test(cardNumber)
      ) {
        window.cartManager.showToast(
          "Please enter a valid 16-digit card number",
          "error"
        );
        return;
      }
      if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        window.cartManager.showToast(
          "Please enter expiry in MM/YY format",
          "error"
        );
        return;
      }
      if (!cardCVV || cardCVV.length !== 3 || !/^\d+$/.test(cardCVV)) {
        window.cartManager.showToast(
          "Please enter a valid 3-digit CVV",
          "error"
        );
        return;
      }
      if (!cardName || cardName.length < 3) {
        window.cartManager.showToast("Please enter cardholder name", "error");
        return;
      }
    } else if (selectedMethod === "upi") {
      const upiInput = upiForm.querySelector("input");
      const upiId = upiInput?.value?.trim();
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

      if (!upiId) {
        window.cartManager.showToast("Please enter UPI ID", "error");
        return;
      }
      if (!upiRegex.test(upiId)) {
        window.cartManager.showToast(
          "Please enter a valid UPI ID (e.g., user@paytm)",
          "error"
        );
        return;
      }
    }

    try {
      payNowBtn.textContent = "Processing...";
      payNowBtn.disabled = true;

      const token = _authToken;

      const res = await fetch(`${API_BASE_URL}/orders`, {
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
          shippingAddress: selectedAddress,
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
      payNowBtn.textContent = "Place Order";
      payNowBtn.disabled = false;
    }
  };

  modal.style.display = "flex";

  const cancelBtn = document.getElementById("cancel-payment");
  if (cancelBtn) {
    cancelBtn.onclick = closePaymentModal;
  }

  const closeBtn = modal.querySelector(".close");
  if (closeBtn) {
    closeBtn.onclick = closePaymentModal;
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

    const res = await fetch(`${API_BASE_URL}/orders`, {
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

// ====================================================================
// INITIALIZATION
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing App...");

  // 1. INITIALIZE CLASSES
  window.cartManager = new CartManager();
  window.productManager = new ProductManager();
  window.productPagination = new ProductPagination();
  window.quickViewModal = new QuickViewModal();
  window.heroCarousel = new HeroCarousel();

  // 2. MOBILE SIDEBAR LOGIC - FIXED
  const mobileNav = document.getElementById("mobile-nav");
  const mobileOverlay = document.getElementById("mobile-nav-overlay");
  const mobileMenuToggles = document.querySelectorAll(
    ".mobile-menu-toggle, #mobile-menu-toggle"
  );
  const closeMobileNav = document.getElementById("close-mobile-nav");

  function toggleSidebar(show) {
    if (show) {
      if (mobileNav) mobileNav.classList.add("active");
      if (mobileOverlay) {
        mobileOverlay.classList.add("active");
        mobileOverlay.style.display = "block";
      }
    } else {
      if (mobileNav) mobileNav.classList.remove("active");
      if (mobileOverlay) {
        mobileOverlay.classList.remove("active");
        mobileOverlay.style.display = "none";
      }
    }
  }

  mobileMenuToggles.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Mobile menu clicked");
      toggleSidebar(true);
    });
  });

  if (closeMobileNav)
    closeMobileNav.addEventListener("click", () => toggleSidebar(false));
  if (mobileOverlay)
    mobileOverlay.addEventListener("click", () => toggleSidebar(false));

  // 3. MOBILE DROPDOWN TOGGLES
  document.querySelectorAll(".mobile-dropdown-toggle").forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = toggle.closest(".mobile-dropdown");
      if (parent) parent.classList.toggle("active");
    });
  });

  // 4. AUTHENTICATION - FIXED EVENT DELEGATION
  document.addEventListener("click", (e) => {
    const authAction = e.target.closest(".auth-action");
    if (authAction) {
      e.preventDefault();
      e.stopPropagation();

      const action = authAction.getAttribute("data-action");
      console.log("Auth action:", action);

      // Close dropdowns
      const accountDropdown = document.querySelector(".account-dropdown");
      if (accountDropdown) accountDropdown.classList.remove("active");
      toggleSidebar(false);

      // Handle actions
      if (action === "login") {
        openAuthModal("login");
      } else if (action === "signup") {
        openAuthModal("signup");
      } else if (action === "profile") {
        if (!getUser()) openAuthModal("login");
        else openProfileModal();
      } else if (action === "orders") {
        if (!getUser()) openAuthModal("login");
        else openOrdersModal();
      } else if (action === "logout") {
        logoutUser();
      }
      return;
    }
  });

  // 5. AUTH MODAL TAB SWITCHING - FIXED
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

  // 6. CLOSE AUTH MODAL - FIXED
  const closeAuthBtn = document.querySelector(".close-auth");
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeAuthModal();
    });
  }

  const authModal = document.getElementById("auth-modal");
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) {
        closeAuthModal();
      }
    });
  }

  // 7. FORGOT PASSWORD LINKS
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

  // 8. FORGOT PASSWORD FORM SUBMIT
  document
    .getElementById("forgot-password-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("forgot-email").value;
      const submitBtn = e.target.querySelector("button");
      submitBtn.textContent = "Sending...";

      try {
        const res = await fetch(`${API_BASE_URL}/forget-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        if (res.ok) {
          window.cartManager.showToast(
            "Password reset link sent to your email!",
            "success"
          );
          openAuthModal("login");
          e.target.reset();
        } else {
          window.cartManager.showToast("Failed to send reset link", "error");
        }
      } catch (error) {
        window.cartManager.showToast("Connection error", "error");
      } finally {
        submitBtn.textContent = "Send Link";
      }
    });

  // 9. LOGIN FORM - FIXED
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector("button[type='submit']");
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Logging in...";
      submitBtn.disabled = true;

      try {
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        const res = await fetch(`${API_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Login failed");
        }

        const data = await res.json();
        saveUser(data.user);
        _authToken = data.token;

        closeAuthModal();
        updateAccountUI();
        window.cartManager.showToast(
          `Welcome back, ${data.user.name}!`,
          "success"
        );
        e.target.reset();
      } catch (error) {
        console.error("Login error:", error);
        window.cartManager.showToast(
          error.message || "Login failed. Please try again.",
          "error"
        );
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // 10. SIGNUP FORM - FIXED
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector("button[type='submit']");
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Signing up...";
      submitBtn.disabled = true;

      try {
        const name = document.getElementById("signup-name").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;

        const res = await fetch(`${API_BASE_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Registration failed");
        }

        window.cartManager.showToast(
          "Account created successfully! Please login.",
          "success"
        );
        openAuthModal("login");
        e.target.reset();
      } catch (error) {
        console.error("Signup error:", error);
        window.cartManager.showToast(
          error.message || "Registration failed. Please try again.",
          "error"
        );
      } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // 11. ACCOUNT BUTTON - FIXED
  const accountBtn = document.getElementById("account-btn");
  if (accountBtn) {
    accountBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      updateAccountUI();

      const accountMenu = document.querySelector(".account-menu");
      if (accountMenu) {
        if (accountMenu.style.display === "block") {
          accountMenu.style.display = "none";
        } else {
          accountMenu.style.display = "block";
        }
      }
    });
  }

  // Close account dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const accountMenu = document.querySelector(".account-menu");
    const accountBtn = document.getElementById("account-btn");

    if (accountMenu && accountBtn) {
      if (!accountBtn.contains(e.target) && !accountMenu.contains(e.target)) {
        accountMenu.style.display = "none";
      }
    }
  });

  // 12. PROFILE SAVE BUTTONS
  document
    .getElementById("save-profile-btn")
    ?.addEventListener("click", saveProfileInfo);
  document
    .getElementById("save-address-btn")
    ?.addEventListener("click", saveNewAddress);
  document.getElementById("add-address-btn")?.addEventListener("click", () => {
    window.toggleAddressForm(true);
  });

  // 13. NEWSLETTER FORM
  document
    .querySelector(".newsletter-form")
    ?.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = e.target.querySelector('input[type="email"]').value;
      window.cartManager.showToast("Thank you for subscribing!", "success");
      e.target.reset();
    });

  // 14. VIEW CART BUTTON
  document.getElementById("view-cart-btn")?.addEventListener("click", () => {
    const cartDropdown = document.getElementById("cart-dropdown");
    if (cartDropdown) cartDropdown.style.display = "none";
    openCartModal();
  });

  // 15. HERO BUTTONS
  document.querySelectorAll(".btn-hero").forEach((btn) => {
    btn.addEventListener("click", () => {
      const productsSection = document.querySelector(".products-section");
      if (productsSection) {
        const headerOffset = 100;
        const elementPosition = productsSection.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    });
  });

  // 16. CATEGORY FILTER LINKS
  document.querySelectorAll("[data-category]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const category = e.target
        .closest("[data-category]")
        .getAttribute("data-category");
      const categoryFilter = document.getElementById("category-filter");
      if (categoryFilter) {
        categoryFilter.value = category;
        window.productManager?.applyFilters();
      }

      const productsSection = document.querySelector(".products-section");
      if (productsSection) {
        const headerOffset = 100;
        const elementPosition = productsSection.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    });
  });

  // 17. HOME RESET LOGIC
  document.querySelectorAll('a[href="#home"], .logo').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      toggleSidebar(false);
    });
  });

  // 18. INITIALIZE UI
  updateAccountUI();
  updateMobileWishlist();

  console.log("✅ App initialized successfully");
});

// ====================================================================
// ENHANCED BUTTON FIX - Add this at the very end of script.js
// ====================================================================

// Force re-initialization of critical buttons after a delay
setTimeout(() => {
  console.log("🔧 Applying enhanced button fixes...");

  // FIX 1: Mobile Menu - Multiple selectors
  const mobileMenuToggles = document.querySelectorAll(
    '.mobile-menu-toggle, #mobile-menu-toggle, [class*="mobile-menu"]'
  );

  mobileMenuToggles.forEach((btn, index) => {
    console.log(`Found mobile toggle #${index}:`, btn);

    // Remove old listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("🍔 Mobile menu clicked!");

      const mobileNav = document.getElementById("mobile-nav");
      const overlay = document.getElementById("mobile-nav-overlay");

      if (mobileNav && overlay) {
        // Force show with inline styles
        mobileNav.classList.add("active");
        mobileNav.style.cssText =
          "display: flex !important; left: 0 !important; z-index: 9999 !important;";

        overlay.classList.add("active");
        overlay.style.cssText =
          "display: block !important; opacity: 1 !important; z-index: 9998 !important;";

        console.log("✅ Sidebar opened");
      } else {
        console.error("❌ Sidebar elements not found");
      }
    });
  });

  // FIX 2: Account Button
  const accountBtn = document.getElementById("account-btn");
  if (accountBtn) {
    const newAccountBtn = accountBtn.cloneNode(true);
    accountBtn.parentNode.replaceChild(newAccountBtn, accountBtn);

    newAccountBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("👤 Account clicked");

      const accountMenu = document.querySelector(".account-menu");
      if (accountMenu) {
        const isVisible = accountMenu.style.display === "block";
        accountMenu.style.display = isVisible ? "none" : "block";
        console.log("Account menu toggled:", !isVisible);
      }
    });
  }

  // FIX 3: Auth Actions - Use event delegation on body
  document.body.addEventListener("click", function (e) {
    const authAction = e.target.closest(".auth-action");
    if (authAction) {
      e.preventDefault();
      e.stopPropagation();

      const action = authAction.getAttribute("data-action");
      console.log("🔐 Auth action:", action);

      switch (action) {
        case "login":
          openAuthModal("login");
          break;
        case "signup":
          openAuthModal("signup");
          break;
        case "profile":
          if (getUser()) openProfileModal();
          else openAuthModal("login");
          break;
        case "orders":
          if (getUser()) openOrdersModal();
          else openAuthModal("login");
          break;
        case "logout":
          logoutUser();
          break;
      }
    }
  });

  // FIX 4: Cart Button
  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) {
    const newCartBtn = cartBtn.cloneNode(true);
    cartBtn.parentNode.replaceChild(newCartBtn, cartBtn);

    newCartBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("🛒 Cart clicked");
      openCartModal();
    });
  }

  // FIX 5: Wishlist Button
  const wishlistBtn = document.getElementById("wishlist-btn");
  if (wishlistBtn) {
    const newWishlistBtn = wishlistBtn.cloneNode(true);
    wishlistBtn.parentNode.replaceChild(newWishlistBtn, wishlistBtn);

    newWishlistBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("❤️ Wishlist clicked");

      const wishlistDropdown = document.getElementById("wishlist-dropdown");
      if (wishlistDropdown) {
        const isVisible = wishlistDropdown.style.display === "block";
        wishlistDropdown.style.display = isVisible ? "none" : "block";
      }
    });
  }

  // FIX 6: Close Mobile Nav
  const closeMobileNav = document.getElementById("close-mobile-nav");
  if (closeMobileNav) {
    const newCloseBtn = closeMobileNav.cloneNode(true);
    closeMobileNav.parentNode.replaceChild(newCloseBtn, closeMobileNav);

    newCloseBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("❌ Close mobile nav");

      const mobileNav = document.getElementById("mobile-nav");
      const overlay = document.getElementById("mobile-nav-overlay");

      if (mobileNav) {
        mobileNav.classList.remove("active");
        mobileNav.style.left = "-100%";
      }
      if (overlay) {
        overlay.classList.remove("active");
        overlay.style.display = "none";
      }
    });
  }

  // FIX 7: Overlay Click
  const overlay = document.getElementById("mobile-nav-overlay");
  if (overlay) {
    const newOverlay = overlay.cloneNode(true);
    overlay.parentNode.replaceChild(newOverlay, overlay);

    newOverlay.addEventListener("click", function () {
      console.log("Overlay clicked - closing");
      const mobileNav = document.getElementById("mobile-nav");
      if (mobileNav) {
        mobileNav.classList.remove("active");
        mobileNav.style.left = "-100%";
      }
      this.classList.remove("active");
      this.style.display = "none";
    });
  }

  console.log("✅ Enhanced fixes applied!");
}, 500); // Wait 500ms for everything to load
