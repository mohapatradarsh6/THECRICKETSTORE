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
    // NEW: Added 'success' type for toast
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
      // NEW: Ensure toast shows item name and is type 'success'
      this.showToast(`${product.title} added to wishlist!`, "success");
    } else {
      this.wishlist.splice(index, 1);
      // NEW: Ensure toast shows item name and is type 'info'
      this.showToast(`${product.title} removed from wishlist!`, "info");
    }

    this.saveWishlist();
  }

  isInWishlist(productTitle) {
    return this.wishlist.some((item) => item.title === productTitle);
  }

  // Inside CartManager Class (around line 102)

  // ... after toggleWishlist(product) { ... }

  clearWishlist() {
    // <-- NEW METHOD
    this.wishlist = [];
    this.saveWishlist();
    this.showToast("Your wishlist has been cleared.", "info");
  }

  isInWishlist(productTitle) {
    return this.wishlist.some((item) => item.title === productTitle);
  }

  updateUI() {
    this.updateCartCount();
    this.updateCartDropdown();
    this.updateWishlistUI();
  }

  // ... (updateCartCount and updateCartDropdown remain the same)

  updateWishlistUI() {
    // <-- MODIFIED METHOD
    const wishlistCount = document.querySelector(".wishlist-count");
    if (wishlistCount) {
      wishlistCount.textContent = this.wishlist.length;
    }

    this.updateWishlistDropdown(); // <-- NEW CALL

    // Update wishlist button states
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

  updateWishlistDropdown() {
    // <-- NEW METHOD for the dropdown content
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
          <i class="fas fa-trash wishlist-item-remove" onclick="cartManager.toggleWishlist({title: '${item.title}'})"></i>
        </div>
      `
      )
      .join("");
  }

  // ... (rest of CartManager class)
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

  updateWishlistUI() {
    const wishlistCount = document.querySelector(".wishlist-count");
    if (wishlistCount) {
      wishlistCount.textContent = this.wishlist.length;
    }

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

    if (cartBtn && cartDropdown) {
      cartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
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

    const checkoutBtn = document.getElementById("checkout-btn");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        if (this.cart.length === 0) {
          this.showToast("Your cart is empty!", "warning");
          return;
        }
        // Assuming openPaymentModal is defined globally
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
    this.initializeProducts();
    this.initializeFilters();
    this.initializeSearch();
  }

  initializeProducts() {
    const productCards = document.querySelectorAll(".product-card");
    this.products = Array.from(productCards).map((card) => ({
      element: card,
      title: card.getAttribute("data-title"),
      price: parseFloat(card.getAttribute("data-price")),
      category: card.getAttribute("data-category"),
      brand: card.getAttribute("data-brand"),
    }));
    this.filteredProducts = [...this.products];
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

    this.displayProducts();
  }

  searchProducts(query) {
    if (!query) {
      this.filteredProducts = [...this.products];
    } else {
      const searchTerm = query.toLowerCase();
      this.filteredProducts = this.products.filter(
        (product) =>
          product.title.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm) ||
          product.brand.toLowerCase().includes(searchTerm)
      );
    }
    this.displayProducts();
  }

  displayProducts() {
    const container = document.getElementById("products-container");
    if (!container) return;

    this.products.forEach((product) => {
      product.element.style.display = "none";
    });

    this.filteredProducts.forEach((product) => {
      product.element.style.display = "block";
    });

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

    this.modal.style.display = "block";
  }

  closeModal() {
    if (this.modal) {
      this.modal.style.display = "none";
    }
  }
}

// --- 4. Payment Modal Functions (Moved to a standard function group) ---

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

  modal.style.display = "block";

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

// --- 5. Mobile Navigation ---
class MobileNav {
  constructor() {
    this.nav = document.getElementById("mobile-nav");
    this.toggleBtn = document.getElementById("mobile-menu-toggle");
    this.closeBtn = document.getElementById("close-mobile-nav");
    this.initializeNav();
  }

  initializeNav() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.openNav());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.closeNav());
    }

    if (this.nav) {
      this.nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => this.closeNav());
      });
    }

    document.addEventListener("click", (e) => {
      if (this.nav && this.nav.classList.contains("active")) {
        if (
          !this.nav.contains(e.target) &&
          !this.toggleBtn?.contains(e.target)
        ) {
          this.closeNav();
        }
      }
    });
  }

  openNav() {
    if (this.nav) {
      this.nav.classList.add("active");
    }
  }

  closeNav() {
    if (this.nav) {
      this.nav.classList.remove("active");
    }
  }
}

// --- 6. Hero Carousel (Unified & Functional) ---
class HeroCarousel {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 3;
    this.autoPlayInterval = null;
    this.autoPlayDuration = 5000;
    this.progressInterval = null;
    this.isPaused = false;
    this.slider = null; // Defined here for clarity
    this.slides = []; // Defined here for clarity

    this.init();
  }

  init() {
    this.cacheElements();
    // Only initialize if we found the necessary elements
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
    this.setupHeroButtons(); // Includes the fix for slides 2 & 3 buttons
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
    // FIX: This function already correctly targets ALL .btn-hero elements,
    // ensuring the buttons on slides 2 and 3 scroll to the product section
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

// --- State Management ---
function saveUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function getUser() {
  const user = localStorage.getItem(AUTH_KEY);
  return user ? JSON.parse(user) : null;
}

function logoutUser() {
  // 1. Genuinely logs the user out using the correct key (AUTH_KEY)
  localStorage.removeItem(AUTH_KEY);

  if (typeof cartManager !== "undefined") {
    // 2. Clear the cart (makes cart count 0)
    cartManager.clearCart();

    // 3. Clear the wishlist (makes wishlist count 0, as requested)
    cartManager.clearWishlist();

    cartManager.showToast("Logged out successfully!", "success");
  }

  // 4. Updates the header UI from "User Name" back to "Account"
  updateAccountUI();
}

// --- Modal & Form Handlers ---
function openAuthModal(mode = "login") {
  const modal = document.getElementById("auth-modal");
  const loginTab = document.getElementById("login-tab");
  const signupTab = document.getElementById("signup-tab");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  if (modal) {
    document.getElementById("login-form")?.reset();
    document.getElementById("signup-form")?.reset();

    if (mode === "signup") {
      loginTab?.classList.remove("active");
      signupTab?.classList.add("active");
      loginForm?.classList.remove("active");
      signupForm?.classList.add("active");
    } else {
      loginTab?.classList.add("active");
      signupTab?.classList.remove("active");
      loginForm?.classList.add("active");
      signupForm?.classList.remove("active");
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
      <a href="#">My Orders</a>
      <a href="#" id="logout-link">Logout</a>
    `;
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
  // 1. Initialize Managers and make them global
  window.cartManager = new CartManager();
  window.productManager = new ProductManager();
  window.quickViewModal = new QuickViewModal();
  window.mobileNav = new MobileNav();
  window.heroCarousel = new HeroCarousel(); // Unified and functional carousel

  // 2. Auth Modal Event Listeners
  const authModal = document.getElementById("auth-modal");
  const closeAuth = document.querySelector(".close-auth");

  // Close modal on 'X' click
  if (closeAuth) closeAuth.addEventListener("click", closeAuthModal);

  // Close modal on outside click
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  // Modal tab switching
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

  // Auth Form Submission Handlers
  document.getElementById("login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-password").value;
    const storedUser = getUser();

    if (
      !storedUser ||
      (storedUser.email === email && storedUser.password === pass)
    ) {
      if (!storedUser) {
        saveUser({ name: "Demo User", email: email, password: pass });
      }
      closeAuthModal();
      updateAccountUI();
      cartManager.showToast("Login successful!", "success");
    } else {
      cartManager.showToast("Invalid credentials!", "danger");
    }
  });

  document.getElementById("signup-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const pass = document.getElementById("signup-password").value;

    if (getUser() && getUser().email === email) {
      cartManager.showToast(
        "Account already exists with this email.",
        "danger"
      );
      return;
    }

    const newUser = { name, email, password: pass };
    saveUser(newUser);
    closeAuthModal();
    updateAccountUI();
    cartManager.showToast(
      `Sign up successful! Logged in as ${name.split(" ")[0]}.`,
      "success"
    );
  });

  // Account Button Dropdown Toggle (Activated on click)
  const accountDropdown = document.querySelector(".account-dropdown");
  const accountBtn = document.getElementById("account-btn");

  if (accountBtn && accountDropdown) {
    accountBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
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

  // 3. Product Action Buttons
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
        cartManager.toggleWishlist(product); // Now uses 'success'/'info' type
      }
    });
  });

  // 4. Payment Modal Close Handlers
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

      cartManager.showToast(
        "Order placed successfully! You will receive a confirmation email.",
        "success"
      );
      cartManager.clearCart();
      closePaymentModal();
    });
  }

  // 5. Other general DOM logic
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

  // Hero button (Scrolls to products-section - applies to all slides)
  const heroBtn = document.querySelector(".btn-hero");
  if (heroBtn) {
    heroBtn.addEventListener("click", () => {
      document
        .querySelector(".products-section")
        ?.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Category cards
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

  // Smooth scroll for navigation links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Card formatting logic
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

  // View cart button
  const viewCartBtn = document.getElementById("view-cart-btn");
  if (viewCartBtn) {
    viewCartBtn.addEventListener("click", () => {
      cartManager.showToast("Full cart page coming soon!", "warning");
    });
  }

  // Final UI Initialization
  updateAccountUI();

  // Parallax effect (kept separate for readability)
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
});

// Window resize handler
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    const mobileNav = document.getElementById("mobile-nav");
    if (mobileNav) {
      mobileNav.classList.remove("active");
    }
  }
});

// Prevent form resubmission on page refresh
if (window.history.replaceState) {
  window.history.replaceState(null, null, window.location.href);
}
