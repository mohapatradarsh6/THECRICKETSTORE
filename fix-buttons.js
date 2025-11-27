// Complete fix for all button functionality
// Replace or add this to your script.js file

// Ensure DOM is fully loaded before attaching listeners
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeButtons);
} else {
  // DOM is already loaded
  initializeButtons();
}

function initializeButtons() {
  console.log("Initializing all button handlers...");

  // 1. Cart Button
  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) {
    cartBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const cartDropdown = document.querySelector(
        ".cart-dropdown, #cart-dropdown"
      );
      if (cartDropdown) {
        cartDropdown.classList.toggle("show");
        cartDropdown.classList.toggle("active");
        cartDropdown.style.display =
          cartDropdown.style.display === "block" ? "none" : "block";
      }
      console.log("Cart toggled");
    });
  }

  // 2. Wishlist Button
  const wishlistBtn = document.getElementById("wishlist-btn");
  if (wishlistBtn) {
    wishlistBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const wishlistDropdown = document.querySelector(
        ".wishlist-dropdown, #wishlist-dropdown"
      );
      if (wishlistDropdown) {
        wishlistDropdown.classList.toggle("show");
        wishlistDropdown.classList.toggle("active");
        wishlistDropdown.style.display =
          wishlistDropdown.style.display === "block" ? "none" : "block";
      }
      console.log("Wishlist toggled");
    });
  }

  // 3. Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById("mobile-menu-toggle");
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const sidebar = document.querySelector(".sidebar, #sidebar");
      const overlay = document.querySelector(
        ".sidebar-overlay, #sidebar-overlay"
      );

      if (sidebar) {
        sidebar.classList.toggle("active");
        document.body.classList.toggle("sidebar-open");
      }
      if (overlay) {
        overlay.classList.toggle("active");
      }
      console.log("Mobile menu toggled");
    });
  }

  // 4. Search Button
  const searchBtn = document.getElementById("search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const searchInput = document.querySelector(
        ".search-bar input, #search-input"
      );
      if (searchInput && searchInput.value) {
        console.log("Searching for:", searchInput.value);
        // Add your search logic here
        filterProducts(searchInput.value);
      }
    });
  }

  // 5. Add to Cart Buttons (for all products)
  document
    .querySelectorAll(
      '.add-to-cart, .btn-add-to-cart, button[onclick*="addToCart"]'
    )
    .forEach((button) => {
      // Remove any inline onclick first
      button.removeAttribute("onclick");

      button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const productCard = this.closest(".product-card, .product");
        if (productCard) {
          const productName =
            productCard.querySelector(".product-name, h3")?.textContent ||
            "Product";
          const productPrice =
            productCard.querySelector(".product-price, .price")?.textContent ||
            "$0";

          console.log("Adding to cart:", productName, productPrice);

          // Show visual feedback
          this.textContent = "Added!";
          this.style.backgroundColor = "#4CAF50";

          setTimeout(() => {
            this.textContent = "Add to Cart";
            this.style.backgroundColor = "";
          }, 1500);

          // Update cart count
          updateCartCount();
        }
      });
    });

  // 6. Quantity buttons
  document.querySelectorAll(".quantity-btn").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const input = this.parentElement.querySelector('input[type="number"]');
      if (input) {
        let value = parseInt(input.value) || 1;

        if (this.classList.contains("minus") || this.textContent === "-") {
          value = Math.max(1, value - 1);
        } else if (
          this.classList.contains("plus") ||
          this.textContent === "+"
        ) {
          value = Math.min(99, value + 1);
        }

        input.value = value;
        console.log("Quantity updated:", value);
      }
    });
  });

  // 7. Checkout buttons
  const checkoutBtns = document.querySelectorAll(
    "#checkout-btn, #view-cart-btn, #proceed-to-checkout"
  );
  checkoutBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Checkout action:", this.id);

      // Handle different checkout steps
      if (this.id === "view-cart-btn") {
        showCartPage();
      } else if (this.id === "proceed-to-checkout") {
        showCheckoutPage();
      }
    });
  });

  // 8. Close buttons for modals
  document
    .querySelectorAll('.close, .close-btn, [class*="close"]')
    .forEach((button) => {
      button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const modal = this.closest('.modal, .dropdown, [class*="modal"]');
        if (modal) {
          modal.style.display = "none";
          modal.classList.remove("show", "active");
        }
        console.log("Modal closed");
      });
    });

  // 9. Filter buttons
  document.querySelectorAll(".filter-btn, .category-btn").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const category = this.dataset.category || this.textContent;
      console.log("Filtering by:", category);

      // Remove active class from all filter buttons
      document.querySelectorAll(".filter-btn, .category-btn").forEach((b) => {
        b.classList.remove("active");
      });
      this.classList.add("active");

      // Add your filter logic here
      filterByCategory(category);
    });
  });

  console.log("All button handlers initialized successfully!");
}

// Helper functions
function updateCartCount() {
  const cartCount = document.querySelector(".cart-count, #cart-count");
  if (cartCount) {
    let count = parseInt(cartCount.textContent) || 0;
    cartCount.textContent = count + 1;
  }
}

function showCartPage() {
  console.log("Showing cart page");
  // Add your cart page logic
}

function showCheckoutPage() {
  console.log("Showing checkout page");
  // Add your checkout logic
}

function filterProducts(searchTerm) {
  console.log("Filtering products by:", searchTerm);
  // Add your search filter logic
}

function filterByCategory(category) {
  console.log("Filtering by category:", category);
  // Add your category filter logic
}

// Prevent any errors from breaking the script
window.addEventListener("error", function (e) {
  console.error("Button script error:", e.message);
  return true; // Prevent default error handling
});
