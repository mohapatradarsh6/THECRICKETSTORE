let cart = [];
const cartBtn = document.getElementById("cart-btn");
const cartDropdown = document.getElementById("cart-dropdown");
const cartItemsContainer = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const checkoutBtn = document.getElementById("checkout-btn");

const modal = document.getElementById("demo-payment-modal");
const closeModal = document.querySelector(".modal .close");
const paymentItems = document.getElementById("payment-items");
const paymentTotal = document.getElementById("payment-total");
const payNowBtn = document.getElementById("pay-now");

const paymentRadios = document.querySelectorAll('input[name="payment"]');
const cardUpiInput = document.getElementById("card-upi-input");

cartBtn.addEventListener("click", () => {
  cartDropdown.style.display =
    cartDropdown.style.display === "block" ? "none" : "block";
});

function updateCart() {
  cartItemsContainer.innerHTML = "";
  cartCount.textContent = cart.length;
  cart.forEach((item) => {
    const div = document.createElement("div");
    div.textContent = `${item.title} - ₹${item.price}`;
    cartItemsContainer.appendChild(div);
  });
}

document.querySelectorAll(".btn-add-cart").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".product-card");
    const title = card.getAttribute("data-title");
    const price = card.getAttribute("data-price");
    cart.push({ title, price });
    updateCart();
  });
});

function openPaymentModal(items) {
  paymentItems.innerHTML = "";
  let total = 0;
  items.forEach((item) => {
    const div = document.createElement("div");
    div.textContent = `${item.title} - ₹${item.price}`;
    paymentItems.appendChild(div);
    total += parseInt(item.price);
  });
  paymentTotal.textContent = total;
  modal.style.display = "block";
}

closeModal.onclick = () => {
  modal.style.display = "none";
};
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
};

document.querySelectorAll(".btn-buy-now").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".product-card");
    const title = card.getAttribute("data-title");
    const price = card.getAttribute("data-price");
    openPaymentModal([{ title, price }]);
  });
});

checkoutBtn.addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Cart is empty!");
    return;
  }
  openPaymentModal(cart);
});

function togglePaymentDetails() {
  const selected = document.querySelector(
    'input[name="payment"]:checked'
  ).value;
  if (selected === "Card" || selected === "UPI") {
    cardUpiInput.style.display = "block";
  } else {
    cardUpiInput.style.display = "none";
  }
}

paymentRadios.forEach((radio) => {
  radio.addEventListener("change", togglePaymentDetails);
});

togglePaymentDetails();

payNowBtn.addEventListener("click", () => {
  const selectedMethod = document.querySelector(
    'input[name="payment"]:checked'
  ).value;
  let details = "";
  if (selectedMethod === "Card" || selectedMethod === "UPI") {
    details = cardUpiInput.value.trim();
    if (details === "") {
      alert(`Please enter your ${selectedMethod} details.`);
      return;
    }
  }
  alert(
    `Payment Successful!\nPayment Method: ${selectedMethod}\nDetails: ${
      details || "N/A"
    }`
  );
  modal.style.display = "none";
  cart = [];
  updateCart();
});
