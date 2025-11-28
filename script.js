// ====================================================================
// GLOBAL CONFIGURATION
// ====================================================================

const API_BASE_URL = "/api"; // Change this to your actual API base URL if deployed

// ====================================================================
// IN-MEMORY STORAGE (Simulates Database/LocalStorage)
// ====================================================================

let _cartData = [];
let _wishlistData = [];
let _searchHistoryData = [];
let _currentUser = null;
let _authToken = null;

// ====================================================================
// 1. CART MANAGEMENT SYSTEM
// ====================================================================

class CartManager {
  constructor() {
    this.cart = _cartData;
    this.wishlist = _wishlistData;
    // We update UI immediately upon instantiation
    this.updateUI();
  }

  // --- Data Persistence (Mock) ---
  saveCart() {
    _cartData = this.cart;
    this.updateUI();
  }

  saveWishlist() {
    _wishlistData = this.wishlist;
    this.updateWishlistUI();
  }

  // --- Cart Actions ---
  addToCart(product, quantity = 1) {
    // 1. Check Global Stock
    if (product.stock !== undefined && product.stock < quantity) {
      this.showToast(`Sorry, only ${product.stock} items in stock!`, "error");
      return;
    }

    const existingItem = this.cart.find((item) => item.title === product.title);
    const price = parseFloat(product.price) || 0;

    if (existingItem) {
      // 2. Check Cumulative Stock
      if (
        product.stock !== undefined &&
        existingItem.quantity + quantity > product.stock
      ) {
        this.showToast(`Cannot add more! Max stock reached.`, "warning");
        return;
      }
      existingItem.quantity += quantity;
    } else {
      // 3. Add New Item
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
    this.saveWishlist();
  }

  isInWishlist(productTitle) {
    return this.wishlist.some((item) => item.title === productTitle);
  }

  // --- UI Updates ---
  updateUI() {
    // Update Badge
    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
      const totalItems = this.cart.reduce(
        (total, item) => total + item.quantity,
        0
      );
      cartCount.textContent = totalItems;
    }
    // Update Dropdown/Modal Content
    this.updateCartDropdown();
    this.updateWishlistUI();
  }

  updateCartDropdown() {
    // This updates the Cart Modal items list
    const container = document.getElementById("cart-modal-items"); // Targeting Modal ID
    const totalEl = document.getElementById("cart-modal-total");

    // Also update header dropdown if it exists (legacy)
    const headerContainer = document.getElementById("cart-items");
    const headerTotal = document.getElementById("cart-total");

    const htmlContent =
      this.cart.length === 0
        ? '<div class="empty-cart-msg"><i class="fas fa-shopping-basket"></i><p>Your cart is empty</p></div>'
        : this.cart
            .map(
              (item, index) => `
          <div class="cart-item">
            <img src="${item.image}" alt="product" class="cart-item-img">
            <div class="cart-item-info">
              <div class="cart-item-title">${item.title}</div>
              <div class="cart-item-price">₹${parseFloat(item.price).toFixed(
                2
              )}</div>
              <div class="cart-item-quantity">
                <button class="qty-btn" onclick="window.cartManager.updateQuantity('${item.title.replace(
                  /'/g,
                  "\\'"
                )}', ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
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

    const totalVal = this.getCartTotal().toFixed(2);

    // Update Modal
    if (container) container.innerHTML = htmlContent;
    if (totalEl) totalEl.textContent = totalVal;

    // Update Legacy Header Dropdown
    if (headerContainer) headerContainer.innerHTML = htmlContent;
    if (headerTotal) headerTotal.textContent = totalVal;

    // Update Summary in Modal
    const tax = this.getCartTotal() * 0.18;
    const shipping =
      this.getCartTotal() > 2000 ? 0 : this.getCartTotal() > 0 ? 150 : 0;
    const sub = this.getCartTotal();

    if (document.getElementById("cart-modal-subtotal"))
      document.getElementById("cart-modal-subtotal").textContent =
        sub.toFixed(2);
    if (document.getElementById("cart-modal-tax"))
      document.getElementById("cart-modal-tax").textContent = tax.toFixed(2);
    if (document.getElementById("cart-modal-shipping"))
      document.getElementById("cart-modal-shipping").textContent =
        shipping.toFixed(2);
    if (document.getElementById("cart-modal-total"))
      document.getElementById("cart-modal-total").textContent = (
        sub +
        tax +
        shipping
      ).toFixed(2);
  }

  updateWishlistUI() {
    const count = document.querySelector(".wishlist-count");
    if (count) count.textContent = this.wishlist.length;

    const container = document.getElementById("wishlist-items");
    if (!container) return;

    if (this.wishlist.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #999; padding: 10px;">No items in wishlist</p>';
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

    html += `</div>`;
    return html;
  }
}

// ====================================================================
// 2. PAGINATION SYSTEM (Restored)
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

    // Optional: Scroll to top of products on page change
    // const productsSection = document.querySelector(".products-section");
    // if (productsSection && this.currentPage > 1) {
    //   productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    // }
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
// 3. PRODUCT MANAGEMENT
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
            <img src="${p.image}" alt="${
          p.title
        }" style="width:30px; height:30px; object-fit:contain; margin-right:10px;">
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
      container.classList.remove("active");
      const productsSection = document.querySelector(".products-section");
      if (productsSection)
        productsSection.scrollIntoView({ behavior: "smooth" });
    };

    container.classList.add("active");
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
      authHTML = ``;
    }
    // Insert auth items after Home
    mobileMenu.children[0].insertAdjacentHTML("afterend", authHTML);
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
  }
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "none";
}

// --- Payment Modal (Support 4 Methods) ---
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

  // 4. Reset View to Step 1
  document.getElementById("checkout-address-section").style.display = "block";
  document.getElementById("checkout-payment-section").style.display = "none";

  // 5. Button Logic
  const continueBtn = document.getElementById("btn-continue-payment");
  continueBtn.onclick = () => {
    if (!user.addresses || user.addresses.length === 0) {
      window.cartManager.showToast("Please add an address first", "error");
      return;
    }
    document.getElementById("checkout-address-section").style.display = "none";
    document.getElementById("checkout-payment-section").style.display = "block";
  };

  // 6. Pay Now Logic (Handles all 4 methods)
  const payBtn = document.getElementById("pay-now");
  payBtn.onclick = async () => {
    const method = document.querySelector(
      'input[name="payment"]:checked'
    ).value;

    // Basic Validation per method
    if (method === "card") {
      const num = document.querySelector(
        "#card-form input[placeholder*='Card Number']"
      ).value;
      if (num.length < 16) {
        window.cartManager.showToast("Invalid Card Number", "error");
        return;
      }
    }
    if (method === "upi") {
      const upi = document.querySelector("#upi-form input").value;
      if (!upi.includes("@")) {
        window.cartManager.showToast("Invalid UPI ID", "error");
        return;
      }
    }

    payBtn.textContent = "Processing...";
    payBtn.disabled = true;

    try {
      const token = _authToken;
      // In a real scenario, you post to backend
      /* const res = await fetch(`${API_BASE_URL}/orders`, { ... }); */

      // Simulating success
      setTimeout(() => {
        window.cartManager.showToast("Order placed successfully!", "success");
        window.cartManager.clearCart();
        closePaymentModal();
        closeCartModal();
        payBtn.textContent = "Place Order";
        payBtn.disabled = false;
      }, 2000);
    } catch (e) {
      window.cartManager.showToast("Failed to place order", "error");
      payBtn.textContent = "Place Order";
      payBtn.disabled = false;
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
  document.getElementById("cart-modal").style.display = "none";
}

function openCartModal() {
  window.cartManager.updateCartDropdown();
  document.getElementById("cart-modal").style.display = "flex";
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

  document.getElementById("profile-name").value = user.name;
  document.getElementById("profile-email").value = user.email;
  renderAddresses(user.addresses || []);
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
    div.style.cssText =
      "border:1px solid #ccc; padding:10px; margin-bottom:5px; border-radius:5px;";
    div.innerHTML = `
      <p><b>Address #${index + 1}</b></p>
      <p>${addr.street}, ${addr.city}</p>
      <p>${addr.state} - ${addr.zip}, ${addr.country}</p>
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
  // Initial loading state
  modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header"><h2>My Orders</h2><span class="close" onclick="this.closest('.modal').style.display='none'">&times;</span></div>
        <div class="modal-body"><p style="text-align:center; padding:20px;">Fetching orders...</p></div>
      </div>
    `;
  modal.style.display = "flex";

  // Simulate fetch
  try {
    // const res = await fetch(...)
    // For demo, show empty or static
    setTimeout(() => {
      modal.querySelector(".modal-body").innerHTML = `
                <div style="text-align:center; padding:40px;">
                    <i class="fas fa-box-open" style="font-size:3rem; color:#ccc;"></i>
                    <p>No past orders found.</p>
                </div>
            `;
    }, 1000);
  } catch (e) {
    console.error(e);
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
        document.getElementById("mobile-nav-overlay").style.display = "none";
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
        saveUser(data.user);
        _authToken = data.token;
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

  // 3. Address Saving (Local Mock)
  document.getElementById("save-address-btn")?.addEventListener("click", () => {
    const street = document.getElementById("addr-street").value;
    const city = document.getElementById("addr-city").value;
    const state = document.getElementById("addr-state").value;
    const zip = document.getElementById("addr-zip").value;

    if (!street || !city) {
      window.cartManager.showToast("Fill required fields", "error");
      return;
    }

    const user = getUser();
    user.addresses = user.addresses || [];
    user.addresses.push({ street, city, state, zip, country: "India" });

    saveUser(user);
    renderAddresses(user.addresses);

    // Hide form
    document.getElementById("new-address-form").style.display = "none";
    document.getElementById("add-address-btn").style.display = "block";
    window.cartManager.showToast("Address Saved", "success");
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

  // In script.js, inside document.addEventListener("DOMContentLoaded", () => { ...

  // ... existing code ...

  // ADD THESE LINES to make the tabs inside the modal switch the forms
  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");

  if (loginTab) {
    loginTab.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal("login"); // Switches to Login form
    });
  }

  if (signupTab) {
    signupTab.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal("signup"); // Switches to Sign Up form
    });
  }

  updateAccountUI();
  console.log("✅ App fully initialized");
});
