// Debug script to test and fix button functionality
// Add this to your HTML file right after your script.js

console.log("Starting button debug...");

// Wait for DOM to fully load
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, checking buttons...");

  // Find all buttons and add click logging
  const allButtons = document.querySelectorAll("button, .btn, [onclick]");
  console.log(`Found ${allButtons.length} buttons total`);

  // List all buttons with their properties
  allButtons.forEach((button, index) => {
    const info = {
      index: index,
      id: button.id || "no-id",
      class: button.className || "no-class",
      text: button.textContent.trim().substring(0, 30),
      onclick: button.onclick ? "has onclick" : "no onclick",
      disabled: button.disabled,
    };
    console.log("Button:", info);

    // Add a test click listener to EVERY button
    button.addEventListener(
      "click",
      function (e) {
        console.log(`CLICKED: Button #${index} - ${info.id} - "${info.text}"`);
        console.log("Event target:", e.target);
        console.log("Current target:", e.currentTarget);
      },
      true
    ); // Use capture phase to catch events early
  });

  // Check for specific important buttons
  const criticalButtons = [
    "cart-btn",
    "wishlist-btn",
    "mobile-menu-toggle",
    "search-btn",
    "view-cart-btn",
    "checkout-btn",
  ];

  console.log("\nChecking critical buttons:");
  criticalButtons.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      console.log(`✓ ${id} found`);
    } else {
      console.error(`✗ ${id} NOT FOUND!`);
    }
  });

  // Check if any buttons have event listeners
  console.log("\nChecking event listeners...");

  // Test if jQuery is loaded (if your site uses it)
  if (typeof $ !== "undefined") {
    console.log("jQuery is loaded, version:", $.fn.jquery);
    // Check jQuery event handlers
    $("button").each(function () {
      var events = $._data(this, "events");
      if (events) {
        console.log(
          "jQuery events on",
          this.id || this.className,
          ":",
          Object.keys(events)
        );
      }
    });
  }

  // Force re-attachment of common event listeners
  console.log("\nForce-attaching event listeners...");

  // Cart button
  const cartBtn = document.getElementById("cart-btn");
  if (cartBtn) {
    cartBtn.onclick = null; // Clear any existing onclick
    cartBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Cart button clicked!");
      // Try to toggle cart - adjust function name as needed
      if (typeof toggleCart === "function") {
        toggleCart();
      } else if (typeof openCart === "function") {
        openCart();
      } else {
        console.error("No cart toggle function found!");
      }
    });
    console.log("Cart button listener attached");
  }

  // Add to cart buttons
  document
    .querySelectorAll('.add-to-cart, [class*="add-to-cart"]')
    .forEach((btn) => {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        console.log("Add to cart clicked!", this);
        if (typeof addToCart === "function") {
          const productId =
            this.dataset.productId || this.getAttribute("data-product-id");
          addToCart(productId);
        } else {
          console.error("addToCart function not found!");
        }
      });
    });

  // Mobile menu
  const mobileMenu = document.getElementById("mobile-menu-toggle");
  if (mobileMenu) {
    mobileMenu.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Mobile menu clicked!");
      const sidebar = document.querySelector(
        ".sidebar, #sidebar, .mobile-sidebar"
      );
      if (sidebar) {
        sidebar.classList.toggle("active");
      } else {
        console.error("Sidebar element not found!");
      }
    });
  }
});

// Also try to catch any JavaScript errors
window.addEventListener("error", function (e) {
  console.error(
    "JavaScript Error:",
    e.message,
    "at",
    e.filename,
    ":",
    e.lineno,
    ":",
    e.colno
  );
  console.error("Stack:", e.error?.stack);
});

console.log("Debug script loaded successfully");
