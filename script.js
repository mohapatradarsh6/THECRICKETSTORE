let cart = [];

const cartCountEl = document.getElementById("cart-count");
const cartTotalEl = document.getElementById("cart-total");
const cartDropdown = document.getElementById("cart-dropdown");
const cartItemsEl = document.getElementById("cart-items");
const cartTotalDropdownEl = document.getElementById("cart-total-dropdown");
const cartToggle = document.getElementById("cart-toggle");
const checkoutBtn = document.getElementById("checkout-btn");

function updateCartDisplay() {
  cartCountEl.textContent = cart.length;
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  cartTotalEl.textContent = total;
  cartTotalDropdownEl.textContent = total;

  cartItemsEl.innerHTML = "";
  cart.forEach((item, i) => {
    const div = document.createElement("div");
    div.textContent = `${item.name} - ₹${item.price}`;
    cartItemsEl.appendChild(div);
  });
}

document.querySelectorAll(".btn-add-cart").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".product-card");
    const price = parseInt(card.dataset.price);
    const name = card.querySelector(".product-title").textContent;
    cart.push({ name, price });
    updateCartDisplay();
  });
});

document.querySelectorAll(".btn-buy-now").forEach((button) => {
  button.addEventListener("click", () => {
    const card = button.closest(".product-card");
    const price = parseInt(card.dataset.price);
    const name = card.querySelector(".product-title").textContent;
    const confirmPayment = confirm(`Pay ₹${price} for ${name}?`);
    if (confirmPayment) {
      window.open("https://rzp.io/l/demo", "_blank");
    }
  });
});

cartToggle.addEventListener("click", () => {
  cartDropdown.style.display =
    cartDropdown.style.display === "block" ? "none" : "block";
});

checkoutBtn.addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }
  alert(
    `Proceeding to payment of ₹${cart.reduce(
      (sum, item) => sum + item.price,
      0
    )}`
  );
  window.open("https://rzp.io/l/demo", "_blank");
});
