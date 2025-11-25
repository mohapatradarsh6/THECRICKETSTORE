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
      existingItem.quantity += quantity;
    } else {
      this.cart.push({
        ...product,
        price: price,
        quantity: quantity,
        // Store selected variants if passed
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

  // Helper to generate star icons
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

    // Store core data
    card.setAttribute("data-title", product.title);
    card.setAttribute("data-price", product.price);
    // Store full object stringified for easier variant access later
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

    // --- INVENTORY LOGIC ---
    const isOutOfStock = product.stock !== undefined && product.stock <= 0;
    const stockBadge = isOutOfStock
      ? `<div class="product-badge" style="background:#666">Sold Out</div>`
      : product.isBestSeller
      ? `<div class="product-badge">Bestseller</div>`
      : product.isNewArrival
      ? `<div class="product-badge" style="background:var(--accent-color)">New</div>`
      : "";

    // Button state
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

    if (categoryFilter)
      categoryFilter.addEventListener("change", () => this.applyFilters());
    if (brandFilter)
      brandFilter.addEventListener("change", () => this.applyFilters());
    if (sortFilter)
      sortFilter.addEventListener("change", () => this.applyFilters());
  }

  initializeSearch() {
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");

    if (searchInput) {
      searchInput.addEventListener("input", (e) =>
        this.searchProducts(e.target.value)
      );
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.searchProducts(e.target.value);
      });
    }
    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        if (searchInput) this.searchProducts(searchInput.value);
      });
    }
  }

  applyFilters() {
    const category = document.getElementById("category-filter")?.value || "all";
    const brand = document.getElementById("brand-filter")?.value || "all";
    const sort = document.getElementById("sort-filter")?.value || "featured";

    this.filteredProducts = this.products.filter((product) => {
      const catMatch = category === "all" || product.category === category;
      const brandMatch = brand === "all" || product.brand === brand;
      return catMatch && brandMatch;
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

  searchProducts(query) {
    const term = query.toLowerCase();
    this.filteredProducts = this.products.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term)
    );
    this.renderProductCards();
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
        if (qtyInput) qtyInput.value = parseInt(qtyInput.value) + 1;
      });
    }
  }

  // UPDATED: Accepts full product object
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

    // Remove old selectors if any
    const oldSelectors = detailsContainer.querySelectorAll(".variant-group");
    oldSelectors.forEach((el) => el.remove());

    let stockHTML = "";
    if (product.stock !== undefined) {
      const stockColor = product.stock > 0 ? "green" : "red";
      const stockText =
        product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock";
      stockHTML = `<div style="color:${stockColor}; font-weight:600; margin:10px 0;">${stockText}</div>`;
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
      } else {
        newBtn.disabled = false;
        newBtn.textContent = "Add to Cart";
        newBtn.style.background = ""; // Reset to CSS default

        newBtn.addEventListener("click", () => {
          const quantity = parseInt(qtyInput?.value || 1);
          // Capture selected variants
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

  // --- Account Dropdown Logic ---
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

  // --- Login ---
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

  // --- Signup ---
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

  // --- Forgot Password ---
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

  // --- NEW: View Cart Button Logic ---
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

  updateAccountUI();
});

// Payment Modal Functions (Global)
function closePaymentModal() {
  const modal = document.getElementById("demo-payment-modal");
  if (modal) modal.style.display = "none";
}

function openPaymentModal(items) {
  const modal = document.getElementById("demo-payment-modal");
  const paymentItems = document.getElementById("payment-items");
  const paymentTotal = document.getElementById("payment-total");

  if (!modal || !paymentItems) return;

  // --- PAYMENT TOGGLE LOGIC ---
  const paymentRadios = modal.querySelectorAll('input[name="payment"]');
  const cardForm = modal.querySelector("#card-form");
  const upiForm = modal.querySelector("#upi-form");

  const updatePaymentForms = () => {
    const selected = modal.querySelector('input[name="payment"]:checked').value;
    if (cardForm)
      cardForm.style.display = selected === "card" ? "block" : "none";
    if (upiForm) upiForm.style.display = selected === "upi" ? "block" : "none";
  };

  paymentRadios.forEach((radio) => {
    radio.addEventListener("change", updatePaymentForms);
  });
  updatePaymentForms();

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

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const subtotal = total;
  const shipping = subtotal > 2000 ? 0 : 150;
  const tax = subtotal * 0.18;
  const finalTotal = subtotal + shipping + tax;

  if (paymentTotal) paymentTotal.textContent = finalTotal.toFixed(2);

  // Update summary
  const elSub = document.getElementById("payment-subtotal");
  const elShip = document.getElementById("payment-shipping");
  const elTax = document.getElementById("payment-tax");

  if (elSub) elSub.textContent = subtotal.toFixed(2);
  if (elShip) elShip.textContent = shipping.toFixed(2);
  if (elTax) elTax.textContent = tax.toFixed(2);

  modal.style.display = "flex";

  const closeBtn = modal.querySelector(".close");
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  newCloseBtn.addEventListener("click", closePaymentModal);

  const cancelBtn = document.getElementById("cancel-payment");
  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  newCancelBtn.addEventListener("click", closePaymentModal);

  const payNowBtn = document.getElementById("pay-now");
  const newPayNowBtn = payNowBtn.cloneNode(true);
  payNowBtn.parentNode.replaceChild(newPayNowBtn, payNowBtn);

  newPayNowBtn.addEventListener("click", async () => {
    const user = getUser();
    if (!user) {
      closePaymentModal();
      window.cartManager.showToast("Please login first", "warning");
      openAuthModal("login");
      return;
    }

    const selectedMethod = modal.querySelector(
      'input[name="payment"]:checked'
    ).value;

    if (selectedMethod === "card") {
      const cardInput = cardForm.querySelector("input");
      if (!cardInput || !cardInput.value.trim()) {
        window.cartManager.showToast("Please enter card details", "error");
        return;
      }
    } else if (selectedMethod === "upi") {
      const upiInput = upiForm.querySelector("input");
      if (!upiInput || !upiInput.value.trim()) {
        window.cartManager.showToast("Please enter UPI ID", "error");
        return;
      }
    }

    try {
      newPayNowBtn.textContent = "Processing...";
      newPayNowBtn.disabled = true;

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
      newPayNowBtn.textContent = "Pay Now";
      newPayNowBtn.disabled = false;
    }
  });
}
