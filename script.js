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
    const saved = localStorage.getItem("cricketStoreCart");
    return saved ? JSON.parse(saved) : [];
  }

  saveCart() {
    localStorage.setItem("cricketStoreCart", JSON.stringify(this.cart));
    this.updateUI();
  }

  loadWishlist() {
    const saved = localStorage.getItem("cricketStoreWishlist");
    return saved ? JSON.parse(saved) : [];
  }

  saveWishlist() {
    localStorage.setItem("cricketStoreWishlist", JSON.stringify(this.wishlist));
    this.updateWishlistUI();
  }

  addToCart(product, quantity = 1) {
    const existingItem = this.cart.find((item) => item.title === product.title);
    const price = parseFloat(product.price) || 0;

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.cart.push({
        ...product,
        price: price,
        quantity: quantity,
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

    document.querySelectorAll(".btn-wishlist").forEach((btn) => {
      const card = btn.closest(".product-card");
      if (card) {
        const title = card.getAttribute("data-title");
        if (this.isInWishlist(title)) {
          btn.classList.add("active");
          btn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
          btn.classList.remove("active");
          btn.innerHTML = '<i class="far fa-heart"></i>';
        }
      }
    });
  }

  showToast(message, type = "success") {
    const existingToast = document.querySelector(".toast");
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  initializeEventListeners() {
    const cartBtn = document.getElementById("cart-btn");
    const cartDropdown = document.getElementById("cart-dropdown");
    const wishlistBtn = document.getElementById("wishlist-btn");
    const wishlistDropdown = document.getElementById("wishlist-dropdown");

    if (cartBtn && cartDropdown) {
      cartBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        if (wishlistDropdown) {
          wishlistDropdown.style.display = "none";
        }

        cartDropdown.style.display =
          cartDropdown.style.display === "block" ? "none" : "block";
      });

      document.addEventListener("click", (e) => {
        if (
          cartDropdown &&
          !cartDropdown.contains(e.target) &&
          !cartBtn.contains(e.target)
        ) {
          cartDropdown.style.display = "none";
        }
      });
    }

    if (wishlistBtn && wishlistDropdown) {
      wishlistBtn.addEventListener("click", (e) => {
        e.stopPropagation();

        if (cartDropdown) {
          cartDropdown.style.display = "none";
        }

        wishlistDropdown.style.display =
          wishlistDropdown.style.display === "block" ? "none" : "block";
      });

      document.addEventListener("click", (e) => {
        if (
          wishlistDropdown &&
          !wishlistDropdown.contains(e.target) &&
          !wishlistBtn.contains(e.target)
        ) {
          wishlistDropdown.style.display = "none";
        }
      });
    }

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
    await this.fetchProducts(); // Get data from backend
    this.initializeFilters();
    this.initializeSearch();
  }

  async fetchProducts() {
    try {
      // Use relative path so it works on both localhost and deployed site
      const response = await fetch("/api/products");

      // Check if response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Ensure data is an array before using it
      if (!Array.isArray(data)) {
        console.error("API returned non-array data:", data);
        this.products = [];
        this.filteredProducts = [];
        return;
      }

      this.products = data;
      this.filteredProducts = [...this.products];

      this.renderProductCards();
    } catch (error) {
      console.error("Failed to fetch products:", error);
      // Set empty arrays so the app doesn't crash
      this.products = [];
      this.filteredProducts = [];

      // Show error message to user
      const container = document.getElementById("products-container");
      if (container) {
        container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <h3>Failed to load products</h3>
          <p>Please try refreshing the page. Error: ${error.message}</p>
        </div>
      `;
      }
    }
  }

  // Helper to generate star icons
  generateRatingHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let html = '<div class="stars" style="color: #ffc107; font-size: 0.8rem;">';

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      html += '<i class="fas fa-star"></i>';
    }
    // Add half star if needed
    if (hasHalfStar) {
      html += '<i class="fas fa-star-half-alt"></i>';
    }
    // Fill remaining with empty stars
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      html += '<i class="far fa-star"></i>';
    }

    html += `</div><span class="rating-count">(${
      Math.floor(Math.random() * 200) + 50
    })</span>`;
    return html;
  }

  renderProductCards() {
    const container = document.getElementById("products-container");
    container.innerHTML = ""; // Clear existing static HTML

    this.filteredProducts.forEach((product) => {
      const card = document.createElement("div");
      card.className = "product-card";

      // Set attributes for easy access
      card.setAttribute("data-title", product.title);
      card.setAttribute("data-price", product.price);
      card.setAttribute("data-category", product.category);
      card.setAttribute("data-brand", product.brand);

      // Generate Star Rating HTML
      const ratingHTML = this.generateRatingHTML(product.rating || 4.5);

      // Calculate Discount Badge
      let discountBadge = "";
      if (product.originalPrice && product.originalPrice > product.price) {
        const percent = Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) *
            100
        );
        discountBadge = `<span class="price-discount">-${percent}%</span>`;
      }

      card.innerHTML = `
        <div class="product-badge">${
          product.isBestSeller
            ? "Bestseller"
            : product.isNewArrival
            ? "New"
            : ""
        }</div>
        
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

          <p class="product-description" style="display: none;">${
            product.description || "No description available."
          }</p>

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
            <button class="btn-add-cart">Add to Cart</button>
          </div>
        </div>
      `;

      // Hide empty badges
      if (!product.isBestSeller && !product.isNewArrival) {
        const badge = card.querySelector(".product-badge");
        if (badge) badge.style.display = "none";
      }

      container.appendChild(card);
    });

    // --- RE-ATTACH EVENT LISTENERS ---

    // 1. Add to Cart
    container.querySelectorAll(".btn-add-cart").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const card = btn.closest(".product-card");
        const product = {
          title: card.getAttribute("data-title"),
          price: card.getAttribute("data-price"),
          image: card.querySelector(".product-image").src,
        };
        window.cartManager.addToCart(product);
      });
    });

    // 2. Wishlist
    container.querySelectorAll(".btn-wishlist").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const card = btn.closest(".product-card");
        const product = {
          title: card.getAttribute("data-title"),
          price: card.getAttribute("data-price"),
        };
        window.cartManager.toggleWishlist(product);
        window.cartManager.updateWishlistUI();
      });
    });

    // 3. Quick View
    container.querySelectorAll(".btn-quick-view").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const card = btn.closest(".product-card");
        if (window.quickViewModal) {
          window.quickViewModal.showQuickView(card);
        } else {
          console.error("QuickViewModal not initialized");
        }
      });
    });

    // 4. Update Pagination
    if (window.productPagination) {
      window.productPagination.setup();
    }
  }

  initializeFilters() {
    const categoryFilter = document.getElementById("category-filter");
    const brandFilter = document.getElementById("brand-filter");
    const sortFilter = document.getElementById("sort-filter");

    if (categoryFilter) {
      categoryFilter.addEventListener("change", () => this.applyFilters());
    }

    if (brandFilter) {
      brandFilter.addEventListener("change", () => this.applyFilters());
    }

    if (sortFilter) {
      sortFilter.addEventListener("change", () => this.applyFilters());
    }
  }

  initializeSearch() {
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");

    if (searchInput) {
      searchInput.addEventListener("input", (e) =>
        this.searchProducts(e.target.value)
      );
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.searchProducts(e.target.value);
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        if (searchInput) {
          this.searchProducts(searchInput.value);
        }
      });
    }
  }

  applyFilters() {
    const category = document.getElementById("category-filter")?.value || "all";
    const brand = document.getElementById("brand-filter")?.value || "all";
    const sort = document.getElementById("sort-filter")?.value || "featured";

    this.filteredProducts = this.products.filter((product) => {
      const categoryMatch = category === "all" || product.category === category;
      const brandMatch = brand === "all" || product.brand === brand;
      return categoryMatch && brandMatch;
    });

    switch (sort) {
      case "price-low":
        this.filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        this.filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        this.filteredProducts.sort(() => Math.random() - 0.5);
        break;
    }
    if (window.productPagination) {
      window.productPagination.currentPage = 1;
    }
    this.displayProducts();
  }

  searchProducts(query) {
    const trimmedQuery = query ? query.trim() : "";

    if (!trimmedQuery) {
      this.filteredProducts = [...this.products];
    } else {
      const searchTerm = trimmedQuery.toLowerCase();
      this.filteredProducts = this.products.filter(
        (product) =>
          product.title.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm) ||
          product.brand.toLowerCase().includes(searchTerm)
      );
    }

    if (window.productPagination) {
      window.productPagination.currentPage = 1;
    }

    this.displayProducts();

    if (trimmedQuery && this.filteredProducts.length === 0) {
      this.showNoResultsMessage(trimmedQuery);
    }
  }

  showNoResultsMessage(searchTerm) {
    const container = document.getElementById("products-container");
    if (!container) return;

    const existingMsg = document.getElementById("no-products-message");
    if (existingMsg) existingMsg.remove();

    const message = document.createElement("div");
    message.id = "no-products-message";
    message.style.gridColumn = "1 / -1";
    message.style.textAlign = "center";
    message.style.padding = "40px";
    message.innerHTML = `
    <h3>No products found for "${searchTerm}"</h3>
    <p>Try adjusting your search terms or browse our categories</p>
  `;
    container.appendChild(message);
  }

  displayProducts() {
    const container = document.getElementById("products-container");
    if (!container) {
      console.error("Products container not found!");
      return;
    }

    if (window.productPagination) {
      window.productPagination.updateProducts(this.filteredProducts);
    } else {
      console.error("ProductPagination not initialized!");
    }

    if (this.filteredProducts.length === 0) {
      if (!document.getElementById("no-products-message")) {
        const message = document.createElement("div");
        message.id = "no-products-message";
        message.style.gridColumn = "1 / -1";
        message.style.textAlign = "center";
        message.style.padding = "40px";
        message.innerHTML =
          "<h3>No products found</h3><p>Try adjusting your filters or search terms</p>";
        container.appendChild(message);
      }
    } else {
      const noProductsMessage = document.getElementById("no-products-message");
      if (noProductsMessage) {
        noProductsMessage.remove();
      }
    }
  }
}

// --- 3. Quick View Modal ---
class QuickViewModal {
  constructor() {
    this.modal = document.getElementById("quick-view-modal");
    this.initializeQuickView();
  }

  initializeQuickView() {
    document.querySelectorAll(".btn-quick-view").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const productCard = btn.closest(".product-card");
        if (productCard) {
          this.showQuickView(productCard);
        }
      });
    });

    const closeBtn = document.getElementById("close-quick-view");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeModal());
    }

    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    const qtyMinus = this.modal?.querySelector(".qty-minus");
    const qtyPlus = this.modal?.querySelector(".qty-plus");
    const qtyInput = this.modal?.querySelector(".qty-input");

    if (qtyMinus) {
      qtyMinus.addEventListener("click", () => {
        if (qtyInput && qtyInput.value > 1) {
          qtyInput.value = parseInt(qtyInput.value) - 1;
        }
      });
    }

    if (qtyPlus) {
      qtyPlus.addEventListener("click", () => {
        if (qtyInput) {
          qtyInput.value = parseInt(qtyInput.value) + 1;
        }
      });
    }
  }

  showQuickView(productCard) {
    if (!this.modal) return;

    const title = productCard.querySelector(".product-title")?.textContent;
    const brand = productCard.querySelector(".product-brand")?.textContent;
    const description = productCard.querySelector(
      ".product-description"
    )?.textContent;
    const price = productCard.querySelector(".price-current")?.textContent;
    const originalPrice =
      productCard.querySelector(".price-original")?.textContent;
    const discount = productCard.querySelector(".price-discount")?.textContent;
    const rating = productCard.querySelector(".product-rating")?.innerHTML;
    const imageSrc = productCard.querySelector(".product-image")?.src;

    const modalTitle = this.modal.querySelector("#quick-view-title");
    const modalImg = this.modal.querySelector("#quick-view-img");
    const modalRating = this.modal.querySelector("#quick-view-rating");
    const modalDescription = this.modal.querySelector(
      "#quick-view-description"
    );
    const modalPrice = this.modal.querySelector("#quick-view-price");

    if (modalTitle) modalTitle.textContent = `${brand} ${title}`;
    if (modalImg) modalImg.src = imageSrc;
    if (modalRating) modalRating.innerHTML = rating || "";
    if (modalDescription) modalDescription.textContent = description;
    if (modalPrice) {
      modalPrice.innerHTML = `
        <span class="price-current">${price}</span>
        ${
          originalPrice
            ? `<span class="price-original">${originalPrice}</span>`
            : ""
        }
        ${discount ? `<span class="price-discount">${discount}</span>` : ""}
      `;
    }

    const qtyInput = this.modal.querySelector(".qty-input");
    if (qtyInput) qtyInput.value = 1;

    const addToCartBtn = this.modal.querySelector(".btn-add-cart-modal");
    if (addToCartBtn) {
      addToCartBtn.onclick = () => {
        const quantity = parseInt(qtyInput?.value || 1);
        const product = {
          title: productCard.getAttribute("data-title"),
          price: productCard.getAttribute("data-price"),
        };
        window.cartManager.addToCart(product, quantity);
        this.closeModal();
      };
    }

    this.modal.style.display = "flex";
  }

  closeModal() {
    if (this.modal) {
      this.modal.style.display = "none";
    }
  }
}

// ====================================================================
// PAGINATION SYSTEM
// ====================================================================

class ProductPagination {
  constructor() {
    this.currentPage = 1;
    this.productsPerPage = 6;
    this.allProducts = [];
    this.filteredProducts = [];
  }

  init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    const productCards = document.querySelectorAll(".product-card");
    console.log(`Found ${productCards.length} product cards`);

    this.allProducts = Array.from(productCards).map((card) => ({
      element: card,
      title: card.getAttribute("data-title"),
      price: parseFloat(card.getAttribute("data-price")),
      category: card.getAttribute("data-category"),
      brand: card.getAttribute("data-brand"),
    }));

    this.filteredProducts = [...this.allProducts];

    if (this.allProducts.length === 0) {
      return;
    }

    this.createPaginationControls();
    this.displayPage(1);
  }

  createPaginationControls() {
    const container = document.getElementById("products-container");
    if (!container) return;

    if (document.querySelector(".pagination-wrapper")) return;

    const paginationWrapper = document.createElement("div");
    paginationWrapper.className = "pagination-wrapper";
    paginationWrapper.innerHTML = `
      <div class="pagination-info">
        Showing <span id="page-start">1</span>-<span id="page-end">6</span> of <span id="total-products">0</span> products
      </div>
      <div class="pagination-controls">
        <button id="prev-page" class="pagination-btn" disabled>
          <i class="fas fa-chevron-left"></i> <span>Previous</span>
        </button>
        <div id="page-numbers" class="page-numbers"></div>
        <button id="next-page" class="pagination-btn">
          <span>Next</span> <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;

    container.parentNode.insertBefore(paginationWrapper, container.nextSibling);

    document
      .getElementById("prev-page")
      .addEventListener("click", () => this.previousPage());
    document
      .getElementById("next-page")
      .addEventListener("click", () => this.nextPage());
  }

  updateProducts(filteredProducts) {
    this.filteredProducts = filteredProducts;
    this.currentPage = 1;
    this.displayPage(1);
  }

  displayPage(pageNumber) {
    this.currentPage = pageNumber;

    const startIndex = (pageNumber - 1) * this.productsPerPage;
    const endIndex = startIndex + this.productsPerPage;

    // Hide ALL products first
    this.allProducts.forEach((productObj) => {
      if (productObj.element) {
        productObj.element.style.display = "none";
      }
    });

    // Get the products to show on this page
    const productsToShow = this.filteredProducts.slice(startIndex, endIndex);

    // Show selected products
    productsToShow.forEach((productObj) => {
      if (productObj.element) {
        productObj.element.style.display = "block";
      }
    });

    this.updatePaginationUI();

    // Smooth scroll to products section
    const productsSection = document.querySelector(".products-section");
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  updatePaginationUI() {
    const totalPages = Math.ceil(
      this.filteredProducts.length / this.productsPerPage
    );
    const startIndex = (this.currentPage - 1) * this.productsPerPage + 1;
    const endIndex = Math.min(
      this.currentPage * this.productsPerPage,
      this.filteredProducts.length
    );

    const pageStartEl = document.getElementById("page-start");
    const pageEndEl = document.getElementById("page-end");
    const totalProductsEl = document.getElementById("total-products");

    if (pageStartEl)
      pageStartEl.textContent =
        this.filteredProducts.length > 0 ? startIndex : 0;
    if (pageEndEl) pageEndEl.textContent = endIndex;
    if (totalProductsEl)
      totalProductsEl.textContent = this.filteredProducts.length;

    const prevBtn = document.getElementById("prev-page");
    const nextBtn = document.getElementById("next-page");

    if (prevBtn) {
      prevBtn.disabled = this.currentPage === 1;
    }

    if (nextBtn) {
      nextBtn.disabled =
        this.currentPage >= totalPages || this.filteredProducts.length === 0;
    }

    this.updatePageNumbers(totalPages);
  }

  updatePageNumbers(totalPages) {
    const pageNumbersContainer = document.getElementById("page-numbers");
    if (!pageNumbersContainer) return;

    pageNumbersContainer.innerHTML = "";

    if (totalPages <= 1) return;

    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
      this.createPageButton(1, pageNumbersContainer);
      if (startPage > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "page-ellipsis";
        ellipsis.textContent = "...";
        pageNumbersContainer.appendChild(ellipsis);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      this.createPageButton(i, pageNumbersContainer);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.className = "page-ellipsis";
        ellipsis.textContent = "...";
        pageNumbersContainer.appendChild(ellipsis);
      }
      this.createPageButton(totalPages, pageNumbersContainer);
    }
  }

  createPageButton(pageNumber, container) {
    const button = document.createElement("button");
    button.className = "page-number-btn";
    button.textContent = pageNumber;

    if (pageNumber === this.currentPage) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => this.displayPage(pageNumber));
    container.appendChild(button);
  }

  nextPage() {
    const totalPages = Math.ceil(
      this.filteredProducts.length / this.productsPerPage
    );
    if (this.currentPage < totalPages) {
      this.displayPage(this.currentPage + 1);
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.displayPage(this.currentPage - 1);
    }
  }
}

// --- 4. Payment Modal Functions ---

function closePaymentModal() {
  const modal = document.getElementById("demo-payment-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function openPaymentModal(items) {
  const modal = document.getElementById("demo-payment-modal");
  const paymentItems = document.getElementById("payment-items");
  const paymentSubtotal = document.getElementById("payment-subtotal");
  const paymentShipping = document.getElementById("payment-shipping");
  const paymentTax = document.getElementById("payment-tax");
  const paymentTotal = document.getElementById("payment-total");

  if (!modal || !paymentItems) return;

  paymentItems.innerHTML = items
    .map(
      (item) => `
    <div class="payment-item">
      <span>${item.title} (×${item.quantity})</span>
      <span>₹${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `
    )
    .join("");

  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 2000 ? 0 : 150;
  const tax = subtotal * 0.18;
  const total = subtotal + shipping + tax;

  if (paymentSubtotal) paymentSubtotal.textContent = subtotal.toFixed(2);
  if (paymentShipping) paymentShipping.textContent = shipping.toFixed(2);
  if (paymentTax) paymentTax.textContent = tax.toFixed(2);
  if (paymentTotal) paymentTotal.textContent = total.toFixed(2);

  modal.style.display = "flex";

  const paymentRadios = document.querySelectorAll('input[name="payment"]');
  const cardForm = document.getElementById("card-form");
  const upiForm = document.getElementById("upi-form");

  paymentRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (cardForm) cardForm.style.display = "none";
      if (upiForm) upiForm.style.display = "none";

      switch (e.target.value) {
        case "card":
          if (cardForm) cardForm.style.display = "block";
          break;
        case "upi":
          if (upiForm) upiForm.style.display = "block";
          break;
      }
    });
  });
}

// --- 5. Enhanced Mobile Navigation ---
class MobileNav {
  constructor() {
    this.nav = document.getElementById("mobile-nav");
    this.toggleBtn = document.getElementById("mobile-menu-toggle");
    this.closeBtn = document.getElementById("close-mobile-nav");
    this.overlay = this.createOverlay();
    this.initializeNav();
    this.initializeMobileSearch();
    this.initializeDropdowns();
  }

  createOverlay() {
    let overlay = document.getElementById("mobile-nav-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "mobile-nav-overlay";
      overlay.className = "mobile-nav-overlay";
      document.body.appendChild(overlay);

      overlay.addEventListener("click", () => this.closeNav());
    }
    return overlay;
  }

  initializeNav() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.openNav());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.closeNav());
    }

    if (this.nav) {
      this.nav
        .querySelectorAll("a:not(.mobile-dropdown-toggle)")
        .forEach((link) => {
          link.addEventListener("click", () => {
            if (link.hasAttribute("data-category")) {
              const category = link.getAttribute("data-category");
              const categoryFilter = document.getElementById("category-filter");
              if (categoryFilter) {
                categoryFilter.value = category;
                window.productManager.applyFilters();
                setTimeout(() => {
                  document.querySelector(".products-section")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }, 300);
              }
            }
            this.closeNav();
          });
        });
    }
  }

  initializeDropdowns() {
    const dropdownToggles = document.querySelectorAll(
      ".mobile-dropdown-toggle"
    );

    dropdownToggles.forEach((toggle) => {
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        const parent = toggle.closest(".mobile-dropdown");
        const isActive = parent.classList.contains("active");

        document.querySelectorAll(".mobile-dropdown").forEach((dropdown) => {
          dropdown.classList.remove("active");
        });

        if (!isActive) {
          parent.classList.add("active");
        }
      });
    });
  }

  initializeMobileSearch() {
    const searchInput = document.getElementById("mobile-search-input");
    const searchBtn = document.getElementById("mobile-search-btn");

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        if (window.productManager) {
          window.productManager.searchProducts(e.target.value);
        }
      });

      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          if (window.productManager) {
            window.productManager.searchProducts(e.target.value);
          }
          this.closeNav();
          setTimeout(() => {
            document.querySelector(".products-section")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 300);
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        if (searchInput && window.productManager) {
          window.productManager.searchProducts(searchInput.value);
          this.closeNav();
          setTimeout(() => {
            document.querySelector(".products-section")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 300);
        }
      });
    }
  }

  openNav() {
    if (this.nav) {
      this.nav.classList.add("active");
      this.overlay.classList.add("active");
      document.body.style.overflow = "hidden";
      const cartDropdown = document.getElementById("cart-dropdown");
      const wishlistDropdown = document.getElementById("wishlist-dropdown");
      if (cartDropdown) cartDropdown.style.display = "none";
      if (wishlistDropdown) wishlistDropdown.style.display = "none";
    }
  }

  closeNav() {
    if (this.nav) {
      this.nav.classList.remove("active");
      this.overlay.classList.remove("active");
      document.body.style.overflow = "";
      document.querySelectorAll(".mobile-dropdown").forEach((dropdown) => {
        dropdown.classList.remove("active");
      });
    }
  }
}

// --- 6. Hero Carousel ---
class HeroCarousel {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 3;
    this.autoPlayInterval = null;
    this.autoPlayDuration = 5000;
    this.progressInterval = null;
    this.isPaused = false;
    this.slider = null;
    this.slides = [];

    this.init();
  }

  init() {
    this.cacheElements();
    if (this.slides.length > 0) {
      this.attachEventListeners();
      this.startAutoPlay();
    }
  }

  cacheElements() {
    this.slider = document.getElementById("hero-slider");
    this.slides = document.querySelectorAll(".hero-slide");
    this.dots = document.querySelectorAll(".hero-dots .dot");
    this.prevBtn = document.getElementById("hero-prev");
    this.nextBtn = document.getElementById("hero-next");
    this.progressBar = document.getElementById("hero-progress-bar");
  }

  attachEventListeners() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => {
        this.stopAutoPlay();
        this.previousSlide();
        this.startAutoPlay();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => {
        this.stopAutoPlay();
        this.nextSlide();
        this.startAutoPlay();
      });
    }

    this.dots.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        const slideNum = parseInt(e.target.getAttribute("data-slide"));
        this.stopAutoPlay();
        this.goToSlide(slideNum);
        this.startAutoPlay();
      });
    });

    if (this.slider) {
      this.slider.addEventListener("mouseenter", () => {
        this.pauseAutoPlay();
      });

      this.slider.addEventListener("mouseleave", () => {
        this.resumeAutoPlay();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        this.stopAutoPlay();
        this.previousSlide();
        this.startAutoPlay();
      } else if (e.key === "ArrowRight") {
        this.stopAutoPlay();
        this.nextSlide();
        this.startAutoPlay();
      }
    });

    this.setupTouchEvents();
    this.setupHeroButtons();
  }

  setupTouchEvents() {
    let touchStartX = 0;
    let touchEndX = 0;

    if (this.slider) {
      this.slider.addEventListener(
        "touchstart",
        (e) => {
          touchStartX = e.changedTouches[0].screenX;
        },
        { passive: true }
      );

      this.slider.addEventListener(
        "touchend",
        (e) => {
          touchEndX = e.changedTouches[0].screenX;
          this.handleSwipe(touchStartX, touchEndX);
        },
        { passive: true }
      );
    }
  }

  handleSwipe(startX, endX) {
    const swipeThreshold = 50;
    const diff = startX - endX;

    if (Math.abs(diff) > swipeThreshold) {
      this.stopAutoPlay();
      if (diff > 0) {
        this.nextSlide();
      } else {
        this.previousSlide();
      }
      this.startAutoPlay();
    }
  }

  setupHeroButtons() {
    const heroButtons = document.querySelectorAll(".btn-hero");
    heroButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const productsSection = document.querySelector(".products-section");
        if (productsSection) {
          productsSection.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });
  }

  goToSlide(slideNum) {
    this.slides.forEach((slide) => slide.classList.remove("active"));
    this.dots.forEach((dot) => dot.classList.remove("active"));

    const targetSlide = document.querySelector(
      `.hero-slide[data-slide="${slideNum}"]`
    );
    const targetDot = document.querySelector(
      `.hero-dots .dot[data-slide="${slideNum}"]`
    );

    if (targetSlide) {
      targetSlide.classList.add("active");
    }

    if (targetDot) {
      targetDot.classList.add("active");
    }

    this.currentSlide = slideNum;
    this.resetProgress();
  }

  nextSlide() {
    let nextSlide = this.currentSlide + 1;
    if (nextSlide > this.totalSlides) {
      nextSlide = 1;
    }
    this.goToSlide(nextSlide);
  }

  previousSlide() {
    let prevSlide = this.currentSlide - 1;
    if (prevSlide < 1) {
      prevSlide = this.totalSlides;
    }
    this.goToSlide(prevSlide);
  }

  startAutoPlay() {
    this.stopAutoPlay();
    this.startProgress();

    this.autoPlayInterval = setInterval(() => {
      if (!this.isPaused) {
        this.nextSlide();
      }
    }, this.autoPlayDuration);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
    this.stopProgress();
  }

  pauseAutoPlay() {
    this.isPaused = true;
  }

  resumeAutoPlay() {
    this.isPaused = false;
  }

  startProgress() {
    this.stopProgress();
    if (!this.progressBar) return;

    let progress = 0;
    const increment = 100 / (this.autoPlayDuration / 50);

    this.progressInterval = setInterval(() => {
      if (!this.isPaused) {
        progress += increment;
        if (progress >= 100) {
          progress = 100;
        }
        this.progressBar.style.width = progress + "%";
      }
    }, 50);
  }

  stopProgress() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  resetProgress() {
    if (this.progressBar) {
      this.progressBar.style.width = "0%";
    }
  }
}

// ====================================================================
// AUTHENTICATION AND ACCOUNT MANAGEMENT
// ====================================================================

const AUTH_KEY = "cricketStoreCurrentUser";

function saveUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function getUser() {
  const user = localStorage.getItem(AUTH_KEY);
  return user ? JSON.parse(user) : null;
}

function logoutUser() {
  localStorage.removeItem(AUTH_KEY);

  if (typeof cartManager !== "undefined") {
    cartManager.clearCart();
    cartManager.clearWishlist();
    cartManager.showToast("Logged out successfully!", "success");
  }

  updateAccountUI();
}

// --- Order Management ---
const ORDERS_KEY = "cricketStoreOrders";

function generateOrderId() {
  const prefix = "ORD";
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}${timestamp}${random}`;
}

function saveOrder(orderData) {
  const user = getUser();
  if (!user) {
    console.error("User must be logged in to save orders");
    return null;
  }

  const orderId = generateOrderId();
  const order = {
    orderId: orderId,
    userEmail: user.email,
    items: orderData.items,
    subtotal: orderData.subtotal,
    shipping: orderData.shipping,
    tax: orderData.tax,
    total: orderData.total,
    paymentMethod: orderData.paymentMethod,
    orderDate: new Date().toISOString(),
    status: "Processing",
  };

  const allOrders = getAllOrders();
  allOrders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(allOrders));

  return order;
}

function getAllOrders() {
  const orders = localStorage.getItem(ORDERS_KEY);
  return orders ? JSON.parse(orders) : [];
}

function getUserOrders() {
  const user = getUser();
  if (!user) return [];

  const allOrders = getAllOrders();
  return allOrders.filter((order) => order.userEmail === user.email);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// New function to switch to the Forgot Password form (Hoisted to global scope)
function openForgotPasswordForm() {
  document.getElementById("login-form")?.classList.remove("active");
  document.getElementById("signup-form")?.classList.remove("active");
  
  // Hide tabs since they don't apply here
  document.getElementById("login-tab")?.style.display = 'none';
  document.getElementById("signup-tab")?.style.display = 'none';
  
  // Show the new form
  const forgotForm = document.getElementById("forgot-password-form");
  if (forgotForm) {
    forgotForm.classList.add("active");
  }
}

// Corrected and updated openAuthModal (Hoisted to global scope)
function openAuthModal(mode = "login") {
  const modal = document.getElementById("auth-modal");
  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const forgotForm = document.getElementById("forgot-password-form"); // New

  if (modal) {
    document.getElementById("login-form")?.reset();
    document.getElementById("signup-form")?.reset();
    document.getElementById("forgot-password-form")?.reset(); // New Reset

    // Show tabs again
    if (loginTab) loginTab.style.display = 'block';
    if (signupTab) signupTab.style.display = 'block';
    
    // Hide all forms initially
    loginForm?.classList.remove("active");
    signupForm?.classList.remove("active");
    forgotForm?.classList.remove("active"); // New Hide
    
    // Set the active form based on mode
    if (mode === "signup") {
      loginTab?.classList.remove("active");
      signupTab?.classList.add("active");
      signupForm?.classList.add("active");
    } else { // default to login
      loginTab?.classList.add("active");
      signupTab?.classList.remove("active");
      loginForm?.classList.add("active");
    }

    modal.style.display = "flex";
  }
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function openOrdersModal() {
  const user = getUser();
  if (!user) {
    openAuthModal("login");
    return;
  }

  const orders = getUserOrders();

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
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document
      .getElementById("close-orders-modal")
      ?.addEventListener("click", closeOrdersModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeOrdersModal();
    });
  }

  const modalBody = document.getElementById("orders-modal-body");

  if (orders.length === 0) {
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <i class="fas fa-shopping-bag" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
        <h3 style="color: #666;">No Orders Yet</h3>
        <p style="color: #999;">Start shopping to see your orders here!</p>
      </div>
    `;
  } else {
    modalBody.innerHTML = `
      <div class="orders-list">
        ${orders
          .reverse()
          .map(
            (order) => `
          <div class="order-card">
            <div class="order-header">
              <div>
                <h3>Order #${order.orderId}</h3>
                <p class="order-date">${formatDate(order.orderDate)}</p>
              </div>
              <div class="order-status status-${order.status.toLowerCase()}">
                ${order.status}
              </div>
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
            <div class="order-summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>₹${order.subtotal.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span>Shipping:</span>
                <span>₹${order.shipping.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span>Tax:</span>
                <span>₹${order.tax.toFixed(2)}</span>
              </div>
              <div class="summary-row total">
                <span>Total:</span>
                <span>₹${order.total.toFixed(2)}</span>
              </div>
            </div>
            <div class="order-footer">
              <span>Payment: ${order.paymentMethod}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  modal.style.display = "flex";
}

function closeOrdersModal() {
  const modal = document.getElementById("orders-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function updateAccountUI() {
  const user = getUser();
  const accountName = document.querySelector(".user-btn span");
  const accountMenu = document.querySelector(".account-menu");
  const accountDropdown = document.querySelector(".account-dropdown");

  if (!accountName || !accountMenu) return;

  accountMenu.innerHTML = "";

  if (user) {
    accountName.textContent = user.name.split(" ")[0];
    accountMenu.innerHTML = `
      <a href="#" id="my-orders-link">My Orders</a>
      <a href="#" id="logout-link">Logout</a>
    `;
    document
      .getElementById("my-orders-link")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        openOrdersModal();
        accountDropdown?.classList.remove("active");
      });
    document.getElementById("logout-link")?.addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser();
      accountDropdown?.classList.remove("active");
    });
  } else {
    accountName.textContent = "Account";
    accountMenu.innerHTML = `
      <a href="#" id="login-link">Login</a>
      <a href="#" id="signup-link">Sign Up</a>
    `;
    document.getElementById("login-link")?.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal("login");
      accountDropdown?.classList.remove("active");
    });
    document.getElementById("signup-link")?.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal("signup");
      accountDropdown?.classList.remove("active");
    });
  }
}

// ====================================================================
// INITIALIZATION AND GENERAL EVENT LISTENERS
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded - Initializing...");

  window.cartManager = new CartManager();
  console.log("✓ CartManager initialized");

  window.productPagination = new ProductPagination();
  console.log("✓ ProductPagination initialized");

  window.productManager = new ProductManager();
  console.log("✓ ProductManager initialized");

  window.quickViewModal = new QuickViewModal();
  console.log("✓ QuickViewModal initialized");

  window.mobileNav = new MobileNav();
  console.log("✓ MobileNav initialized");

  window.heroCarousel = new HeroCarousel();
  console.log("✓ HeroCarousel initialized");

  // --- FORGOT PASSWORD EVENT LISTENERS ---

  // Link to open Forgot Password form
  document.getElementById("forgot-password-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    openForgotPasswordForm();
  });

  // Link to go back to Login form
  document.getElementById("back-to-login-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    openAuthModal("login"); // Reuses existing function to show login form
  });
  // --- REAL FORGOT PASSWORD LOGIC ---
  document.getElementById("forgot-password-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value;
    const submitBtn = e.target.querySelector("button");

    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    try {
      
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
       if (res.ok) {
        // Response 200 is expected for security reasons (even if email isn't found)
        window.cartManager.showToast(data.message, "success");
        e.target.reset();
        openAuthModal("login"); 
      } else {
       
        window.cartManager.showToast(data.error || "Reset failed. Please try again.", "danger");
      }
      
    } catch (error) {
      console.error("Forgot password frontend error:", error);
      window.cartManager.showToast("Connection failed. Check your network.", "error");
    } finally {
      submitBtn.textContent = "Send Reset Link";
      submitBtn.disabled = false;
    }
  });

 
  // Home button click - Reset to default state
  document.querySelectorAll('a[href="#home"]').forEach((homeLink) => {
    homeLink.addEventListener("click", (e) => {
      e.preventDefault();

      const searchInput = document.getElementById("search-input");
      const mobileSearchInput = document.getElementById("mobile-search-input");
      if (searchInput) searchInput.value = "";
      if (mobileSearchInput) mobileSearchInput.value = "";

      const categoryFilter = document.getElementById("category-filter");
      const brandFilter = document.getElementById("brand-filter");
      const sortFilter = document.getElementById("sort-filter");

      if (categoryFilter) categoryFilter.value = "all";
      if (brandFilter) brandFilter.value = "all";
      if (sortFilter) sortFilter.value = "featured";

      if (window.productManager) {
        window.productManager.filteredProducts = [
          ...window.productManager.products,
        ];
        if (window.productPagination) {
          window.productPagination.currentPage = 1;
          window.productPagination.updateProducts(
            window.productManager.filteredProducts
          );
        }
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  const authModal = document.getElementById("auth-modal");
  const closeAuth = document.querySelector(".close-auth");

  if (closeAuth) closeAuth.addEventListener("click", closeAuthModal);

  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  document.getElementById("login-tab")?.addEventListener("click", () => {
    document.getElementById("login-form")?.classList.add("active");
    document.getElementById("signup-form")?.classList.remove("active");
    document.getElementById("login-tab")?.classList.add("active");
    document.getElementById("signup-tab")?.classList.remove("active");
  });

  document.getElementById("signup-tab")?.addEventListener("click", () => {
    document.getElementById("signup-form")?.classList.add("active");
    document.getElementById("login-form")?.classList.remove("active");
    document.getElementById("signup-tab")?.classList.add("active");
    document.getElementById("login-tab")?.classList.remove("active");
  });

  // --- REAL LOGIN LOGIC ---
  document
    .getElementById("login-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;
      const submitBtn = e.target.querySelector("button");

      try {
        submitBtn.textContent = "Logging in...";
        submitBtn.disabled = true;

        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok) {
          // Save the Token and User Info
          saveUser(data.user);
          localStorage.setItem("authToken", data.token); // Store JWT

          closeAuthModal();
          updateAccountUI();
          cartManager.showToast(`Welcome back, ${data.user.name}!`, "success");
        } else {
          cartManager.showToast(data.error, "danger");
        }
      } catch (error) {
        cartManager.showToast("Login failed. Check connection.", "error");
      } finally {
        submitBtn.textContent = "Login";
        submitBtn.disabled = false;
      }
    });

  // --- REAL SIGNUP LOGIC (CORRECTED) ---
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
        submitBtn.disabled = true;

        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();

        if (res.ok) {
          // Show success toast and switch to login tab
          cartManager.showToast("Account created! Please login.", "success");
          document.getElementById("login-tab")?.click();

          // Clear the signup form
          e.target.reset();
        } else {
          // Correct error handling
          cartManager.showToast(data.error, "danger");
        }
      } catch (error) {
        console.error("Signup failed:", error);
        cartManager.showToast("Signup failed. Check connection.", "error");
      } finally {
        submitBtn.textContent = "Sign Up";
        submitBtn.disabled = false;
      }
    });

  const accountDropdown = document.querySelector(".account-dropdown");
  const accountBtn = document.getElementById("account-btn");

  if (accountBtn && accountDropdown) {
    accountBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // *** FIX APPLIED HERE: Ensures the UI updates to show Login/Logout based on status ***
      updateAccountUI(); 
      
      accountDropdown.classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
      if (
        !accountDropdown.contains(e.target) &&
        accountDropdown.classList.contains("active")
      ) {
        accountDropdown.classList.remove("active");
      }
    });
  }

  document.querySelectorAll(".btn-add-cart").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".product-card");
      if (card) {
        const product = {
          title: card.getAttribute("data-title"),
          price: card.getAttribute("data-price"),
        };
        cartManager.addToCart(product);
      }
    });
  });

  document.querySelectorAll(".btn-buy-now").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".product-card");
      if (card) {
        const product = {
          title: card.getAttribute("data-title"),
          price: card.getAttribute("data-price"),
        };
        const priceNum = parseFloat(product.price) || 0;
        openPaymentModal([
          { title: product.title, price: priceNum, quantity: 1 },
        ]);
      }
    });
  });

  document.querySelectorAll(".btn-wishlist").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".product-card");
      if (card) {
        const product = {
          title: card.getAttribute("data-title"),
          price: card.getAttribute("data-price"),
        };
        cartManager.toggleWishlist(product);
      }
    });
  });

  const modalClose = document.querySelector("#demo-payment-modal .close");
  const cancelBtn = document.getElementById("cancel-payment");
  const paymentModal = document.getElementById("demo-payment-modal");

  if (modalClose) {
    modalClose.addEventListener("click", closePaymentModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", closePaymentModal);
  }

  if (paymentModal) {
    paymentModal.addEventListener("click", (e) => {
      if (e.target === paymentModal) {
        closePaymentModal();
      }
    });
  }

  const payNowBtn = document.getElementById("pay-now");
  if (payNowBtn) {
    payNowBtn.addEventListener("click", () => {
      const user = getUser();

      if (!user) {
        closePaymentModal();
        cartManager.showToast("Please login to place an order", "warning");
        setTimeout(() => openAuthModal("login"), 500);
        return;
      }

      const selectedMethod = document.querySelector(
        'input[name="payment"]:checked'
      )?.value;

      if (selectedMethod === "card") {
        const inputs = document.querySelectorAll("#card-form input");
        for (let input of inputs) {
          if (!input.value.trim()) {
            cartManager.showToast("Please fill in all card details", "error");
            return;
          }
        }
      } else if (selectedMethod === "upi") {
        const upiInput = document.querySelector("#upi-form input");
        if (upiInput && !upiInput.value.trim()) {
          cartManager.showToast("Please enter UPI ID", "error");
          return;
        }
      }

      const subtotal = parseFloat(
        document.getElementById("payment-subtotal").textContent
      );
      const shipping = parseFloat(
        document.getElementById("payment-shipping").textContent
      );
      const tax = parseFloat(
        document.getElementById("payment-tax").textContent
      );
      const total = parseFloat(
        document.getElementById("payment-total").textContent
      );

      const items = cartManager.cart.map((item) => ({
        title: item.title,
        price: item.price,
        quantity: item.quantity,
      }));

      const paymentMethodNames = {
        card: "Credit/Debit Card",
        upi: "UPI",
        netbanking: "Net Banking",
        cod: "Cash on Delivery",
      };

      const order = saveOrder({
        items: items,
        subtotal: subtotal,
        shipping: shipping,
        tax: tax,
        total: total,
        paymentMethod: paymentMethodNames[selectedMethod] || selectedMethod,
      });

      if (order) {
        cartManager.showToast(
          `Order #${order.orderId} placed successfully! Check "My Orders" for details.`,
          "success"
        );
        cartManager.clearCart();
        closePaymentModal();
      } else {
        cartManager.showToast(
          "Failed to place order. Please try again.",
          "error"
        );
      }
    });
  }

  const newsletterForm = document.querySelector(".newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      cartManager.showToast(
        "Successfully subscribed to newsletter!",
        "success"
      );
      newsletterForm.reset();
    });
  }

  const heroBtn = document.querySelector(".btn-hero");
  if (heroBtn) {
    heroBtn.addEventListener("click", () => {
      document
        .querySelector(".products-section")
        ?.scrollIntoView({ behavior: "smooth" });
    });
  }

  document.querySelectorAll(".category-card").forEach((card) => {
    card.addEventListener("click", () => {
      const categoryName = card.querySelector("h3")?.textContent;
      if (categoryName) {
        const categoryMap = {
          "Cricket Bats": "bats",
          "Cricket Balls": "balls",
          "Protective Gear": "pads",
          Gloves: "gloves",
        };

        const categoryFilter = document.getElementById("category-filter");
        if (categoryFilter && categoryMap[categoryName]) {
          categoryFilter.value = categoryMap[categoryName];
          productManager.applyFilters();
          document
            .querySelector(".products-section")
            ?.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  document
    .querySelectorAll(".dropdown-content a[data-category]")
    .forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const category = link.getAttribute("data-category");
        const categoryFilter = document.getElementById("category-filter");

        if (categoryFilter) {
          categoryFilter.value = category;
          productManager.applyFilters();

          document.querySelector(".products-section")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      });
    });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  const cardInput = document.querySelector('input[placeholder="Card Number"]');
  if (cardInput) {
    cardInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\s/g, "");
      let formattedValue = value.match(/.{1,4}/g)?.join(" ") || value;
      e.target.value = formattedValue;
    });
  }

  const expiryInput = document.querySelector('input[placeholder="MM/YY"]');
  if (expiryInput) {
    expiryInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length >= 2) {
        value = value.slice(0, 2) + "/" + value.slice(2, 4);
      }
      e.target.value = value;
    });
  }

  const viewCartBtn = document.getElementById("view-cart-btn");
  if (viewCartBtn) {
    viewCartBtn.addEventListener("click", () => {
      cartManager.showToast("Full cart page coming soon!", "warning");
    });
  }

  const viewWishlistBtn = document.getElementById("view-wishlist-btn");
  if (viewWishlistBtn) {
    viewWishlistBtn.addEventListener("click", () => {
      cartManager.showToast("Full wishlist page coming soon!", "warning");
    });
  }

  updateAccountUI();

  const isMobile = window.innerWidth <= 768;
  if (!isMobile) {
    window.addEventListener("scroll", () => {
      const heroSection = document.querySelector(".hero-section");
      if (!heroSection) return;
      const scrolled = window.pageYOffset;
      const heroHeight = heroSection.offsetHeight;

      if (scrolled <= heroHeight) {
        const heroContent = document.querySelector(
          ".hero-slide.active .hero-content"
        );
        const heroImage = document.querySelector(
          ".hero-slide.active .hero-image"
        );

        if (heroContent) {
          heroContent.style.transform = `translateY(${scrolled * 0.3}px)`;
          heroContent.style.opacity = 1 - (scrolled / heroHeight) * 0.8;
        }

        if (heroImage) {
          heroImage.style.transform = `translateY(${scrolled * 0.2}px) scale(${
            1 - (scrolled / heroHeight) * 0.1
          })`;
        }
      }
    });
  }

  setTimeout(() => {
    const heroSection = document.querySelector(".hero-section");
    if (heroSection) {
      heroSection.style.opacity = "1";
    }
  }, 100);

  document.addEventListener("visibilitychange", () => {
    if (window.heroCarousel) {
      if (document.hidden) {
        window.heroCarousel.pauseAutoPlay();
      } else {
        window.heroCarousel.resumeAutoPlay();
      }
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      const mobileNav = document.getElementById("mobile-nav");
      if (mobileNav) {
        mobileNav.classList.remove("active");
      }
    }
  });

  if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
  }
});