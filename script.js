// Cart Management System
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

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      this.cart.push({
        ...product,
        quantity: quantity,
      });
    }

    this.saveCart();
    this.showToast(`${product.title} added to cart!`);
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
  }

  toggleWishlist(product) {
    const index = this.wishlist.findIndex(
      (item) => item.title === product.title
    );

    if (index === -1) {
      this.wishlist.push(product);
      this.showToast(`${product.title} added to wishlist!`);
    } else {
      this.wishlist.splice(index, 1);
      this.showToast(`${product.title} removed from wishlist!`);
    }

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
          <div class="cart-item-price">₹${item.price}</div>
          <div class="cart-item-quantity">
            <button class="qty-btn" onclick="cartManager.updateQuantity('${
              item.title
            }', ${item.quantity - 1})">-</button>
            <span>Qty: ${item.quantity}</span>
            <button class="qty-btn" onclick="cartManager.updateQuantity('${
              item.title
            }', ${item.quantity + 1})">+</button>
          </div>
        </div>
        <i class="fas fa-trash cart-item-remove" onclick="cartManager.removeFromCart('${
          item.title
        }')"></i>
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
    // Cart button toggle
    const cartBtn = document.getElementById("cart-btn");
    const cartDropdown = document.getElementById("cart-dropdown");

    if (cartBtn && cartDropdown) {
      cartBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        cartDropdown.style.display =
          cartDropdown.style.display === "block" ? "none" : "block";
      });

      document.addEventListener("click", (e) => {
        if (!cartDropdown.contains(e.target) && !cartBtn.contains(e.target)) {
          cartDropdown.style.display = "none";
        }
      });
    }

    // Checkout button
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

// Product Management
class ProductManager {
  constructor() {
    this.products = [];
    this.filteredProducts = [];
    this.initializeProducts();
    this.initializeFilters();
    this.initializeSearch();
  }

  initializeProducts() {
    // Get all products from DOM
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

    // Filter products
    this.filteredProducts = this.products.filter((product) => {
      const categoryMatch = category === "all" || product.category === category;
      const brandMatch = brand === "all" || product.brand === brand;
      return categoryMatch && brandMatch;
    });

    // Sort products
    switch (sort) {
      case "price-low":
        this.filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        this.filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        // For demo, random sort
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

    // Hide all products
    this.products.forEach((product) => {
      product.element.style.display = "none";
    });

    // Show filtered products
    this.filteredProducts.forEach((product) => {
      product.element.style.display = "block";
    });

    // Show message if no products found
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

// Quick View Modal
class QuickViewModal {
  constructor() {
    this.modal = document.getElementById("quick-view-modal");
    this.initializeQuickView();
  }

  initializeQuickView() {
    // Quick view buttons
    document.querySelectorAll(".btn-quick-view").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const productCard = btn.closest(".product-card");
        if (productCard) {
          this.showQuickView(productCard);
        }
      });
    });

    // Close button
    const closeBtn = document.getElementById("close-quick-view");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeModal());
    }

    // Close on outside click
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    // Quantity controls
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

    // Update modal content
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

    // Reset quantity
    const qtyInput = this.modal.querySelector(".qty-input");
    if (qtyInput) qtyInput.value = 1;

    // Set up add to cart button
    const addToCartBtn = this.modal.querySelector(".btn-add-cart-modal");
    if (addToCartBtn) {
      addToCartBtn.onclick = () => {
        const quantity = parseInt(qtyInput?.value || 1);
        const product = {
          title: productCard.getAttribute("data-title"),
          price: productCard.getAttribute("data-price"),
        };
        cartManager.addToCart(product, quantity);
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

// Payment Modal
function openPaymentModal(items) {
  const modal = document.getElementById("demo-payment-modal");
  const paymentItems = document.getElementById("payment-items");
  const paymentSubtotal = document.getElementById("payment-subtotal");
  const paymentShipping = document.getElementById("payment-shipping");
  const paymentTax = document.getElementById("payment-tax");
  const paymentTotal = document.getElementById("payment-total");

  if (!modal || !paymentItems) return;

  // Display items
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

  // Calculate totals
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

  // Payment method switching
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

// Mobile Navigation
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

    // Close on link click
    if (this.nav) {
      this.nav.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => this.closeNav());
      });
    }

    // Close on outside click
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

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize managers
  window.cartManager = new CartManager();
  window.productManager = new ProductManager();
  window.quickViewModal = new QuickViewModal();
  window.mobileNav = new MobileNav();

  // Add to cart buttons
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

  // Buy now buttons
  document.querySelectorAll(".btn-buy-now").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".product-card");
      if (card) {
        const product = {
          title: card.getAttribute("data-title"),
          price: card.getAttribute("data-price"),
        };
        openPaymentModal([{ ...product, quantity: 1 }]);
      }
    });
  });

  // Wishlist buttons
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

  // Payment modal close
  const modalClose = document.querySelector("#demo-payment-modal .close");
  const modal = document.getElementById("demo-payment-modal");
  const cancelBtn = document.getElementById("cancel-payment");

  if (modalClose) {
    modalClose.addEventListener("click", () => {
      if (modal) modal.style.display = "none";
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (modal) modal.style.display = "none";
    });
  }

  // Pay now button
  const payNowBtn = document.getElementById("pay-now");
  if (payNowBtn) {
    payNowBtn.addEventListener("click", () => {
      const selectedMethod = document.querySelector(
        'input[name="payment"]:checked'
      )?.value;

      // Basic validation
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

      // Success message
      cartManager.showToast(
        "Order placed successfully! You will receive a confirmation email.",
        "success"
      );
      cartManager.clearCart();
      if (modal) modal.style.display = "none";
    });
  }

  // Newsletter form
  const newsletterForm = document.querySelector(".newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = newsletterForm.querySelector('input[type="email"]').value;
      cartManager.showToast(
        "Successfully subscribed to newsletter!",
        "success"
      );
      newsletterForm.reset();
    });
  }

  // Hero button
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

  // Format card numbers
  const cardInput = document.querySelector('input[placeholder="Card Number"]');
  if (cardInput) {
    cardInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\s/g, "");
      let formattedValue = value.match(/.{1,4}/g)?.join(" ") || value;
      e.target.value = formattedValue;
    });
  }

  // Format expiry date
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

  // Initialize cart UI
  cartManager.updateUI();
});

// Window resize handler
window.addEventListener("resize", () => {
  // Close mobile nav on desktop resize
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

// Enhanced Hero Carousel with Auto-play and Animations
class HeroCarousel {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 3;
    this.autoPlayInterval = null;
    this.autoPlayDuration = 5000; // 5 seconds per slide
    this.progressInterval = null;
    this.isPaused = false;

    this.init();
  }

  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.startAutoPlay();
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
    // Previous button
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => {
        this.stopAutoPlay();
        this.previousSlide();
        this.startAutoPlay();
      });
    }

    // Next button
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => {
        this.stopAutoPlay();
        this.nextSlide();
        this.startAutoPlay();
      });
    }

    // Dots navigation
    this.dots.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        const slideNum = parseInt(e.target.getAttribute("data-slide"));
        this.stopAutoPlay();
        this.goToSlide(slideNum);
        this.startAutoPlay();
      });
    });

    // Pause on hover
    if (this.slider) {
      this.slider.addEventListener("mouseenter", () => {
        this.pauseAutoPlay();
      });

      this.slider.addEventListener("mouseleave", () => {
        this.resumeAutoPlay();
      });
    }

    // Keyboard navigation
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

    // Touch support for mobile
    this.setupTouchEvents();

    // Hero buttons
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
        // Swipe left - next slide
        this.nextSlide();
      } else {
        // Swipe right - previous slide
        this.previousSlide();
      }
      this.startAutoPlay();
    }
  }

  setupHeroButtons() {
    // All hero buttons scroll to products section
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
    // Remove active class from all slides and dots
    this.slides.forEach((slide) => slide.classList.remove("active"));
    this.dots.forEach((dot) => dot.classList.remove("active"));

    // Add active class to target slide and dot
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
    this.stopAutoPlay(); // Clear any existing intervals

    // Progress bar animation
    this.startProgress();

    // Auto slide change
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
    const increment = 100 / (this.autoPlayDuration / 50); // Update every 50ms

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

// Initialize Hero Carousel when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Initialize hero carousel
  window.heroCarousel = new HeroCarousel();

  // Add parallax effect to hero section
  window.addEventListener("scroll", () => {
    const heroSection = document.querySelector(".hero-section");
    if (!heroSection) return;

    const scrolled = window.pageYOffset;
    const heroHeight = heroSection.offsetHeight;

    if (scrolled <= heroHeight) {
      // Parallax effect on hero content
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

  // Add entrance animation on page load
  setTimeout(() => {
    const heroSection = document.querySelector(".hero-section");
    if (heroSection) {
      heroSection.style.opacity = "1";
    }
  }, 100);

  // Performance optimization: Pause carousel when tab is hidden
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

// Enhanced Hero Carousel with Auto-play and Animations
class HeroCarousel {
  constructor() {
    this.currentSlide = 1;
    this.totalSlides = 3;
    this.autoPlayInterval = null;
    this.autoPlayDuration = 5000; // 5 seconds per slide
    this.progressInterval = null;
    this.isPaused = false;

    this.init();
  }

  init() {
    this.cacheElements();
    this.attachEventListeners();
    this.startAutoPlay();
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
    // Previous button
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => {
        this.stopAutoPlay();
        this.previousSlide();
        this.startAutoPlay();
      });
    }

    // Next button
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => {
        this.stopAutoPlay();
        this.nextSlide();
        this.startAutoPlay();
      });
    }

    // Dots navigation
    this.dots.forEach((dot) => {
      dot.addEventListener("click", (e) => {
        const slideNum = parseInt(e.target.getAttribute("data-slide"));
        this.stopAutoPlay();
        this.goToSlide(slideNum);
        this.startAutoPlay();
      });
    });

    // Pause on hover
    if (this.slider) {
      this.slider.addEventListener("mouseenter", () => {
        this.pauseAutoPlay();
      });

      this.slider.addEventListener("mouseleave", () => {
        this.resumeAutoPlay();
      });
    }

    // Keyboard navigation
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

    // Touch support for mobile
    this.setupTouchEvents();

    // Hero buttons
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
        // Swipe left - next slide
        this.nextSlide();
      } else {
        // Swipe right - previous slide
        this.previousSlide();
      }
      this.startAutoPlay();
    }
  }

  setupHeroButtons() {
    // All hero buttons scroll to products section
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
    // Remove active class from all slides and dots
    this.slides.forEach((slide) => slide.classList.remove("active"));
    this.dots.forEach((dot) => dot.classList.remove("active"));

    // Add active class to target slide and dot
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
    this.stopAutoPlay(); // Clear any existing intervals

    // Progress bar animation
    this.startProgress();

    // Auto slide change
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
    const increment = 100 / (this.autoPlayDuration / 50); // Update every 50ms

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

// Initialize Hero Carousel when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Initialize hero carousel
  window.heroCarousel = new HeroCarousel();

  // Check if mobile device
  const isMobile = window.innerWidth <= 768;

  // Add parallax effect to hero section (desktop only)
  if (!isMobile) {
    window.addEventListener("scroll", () => {
      const heroSection = document.querySelector(".hero-section");
      if (!heroSection) return;

      const scrolled = window.pageYOffset;
      const heroHeight = heroSection.offsetHeight;

      if (scrolled <= heroHeight) {
        // Parallax effect on hero content
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

  // Add entrance animation on page load
  setTimeout(() => {
    const heroSection = document.querySelector(".hero-section");
    if (heroSection) {
      heroSection.style.opacity = "1";
    }
  }, 100);

  // Performance optimization: Pause carousel when tab is hidden
  document.addEventListener("visibilitychange", () => {
    if (window.heroCarousel) {
      if (document.hidden) {
        window.heroCarousel.pauseAutoPlay();
      } else {
        window.heroCarousel.resumeAutoPlay();
      }
    }
  });

  // Handle window resize - adjust carousel behavior
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const isMobileNow = window.innerWidth <= 768;

      // Reset parallax on resize
      if (isMobileNow) {
        const heroContent = document.querySelector(
          ".hero-slide.active .hero-content"
        );
        const heroImage = document.querySelector(
          ".hero-slide.active .hero-image"
        );

        if (heroContent) {
          heroContent.style.transform = "";
          heroContent.style.opacity = "";
        }

        if (heroImage) {
          heroImage.style.transform = "";
        }
      }
    }, 250);
  });
});
