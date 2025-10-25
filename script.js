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

document.querySelectorAll(".btn-add-cart").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".product-card");
    const title = card.dataset.title;
    const price = parseInt(card.dataset.price);
    const existing = cart.find((item) => item.title === title);
    if (existing) existing.quantity++;
    else cart.push({ title, price, quantity: 1 });
    updateCart();
  });
});

document.querySelectorAll(".btn-buy-now").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".product-card");
    const title = card.dataset.title;
    const price = parseInt(card.dataset.price);
    openPaymentModal([{ title, price, quantity: 1 }]);
  });
});

function updateCart() {
  cartItemsContainer.innerHTML = "";
  cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  cart.forEach((item, index) => {
    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      ${item.title} - ₹${item.price} × 
      <button class="quantity-btn" data-action="decrease" data-index="${index}">-</button>
      ${item.quantity}
      <button class="quantity-btn" data-action="increase" data-index="${index}">+</button>
      <button class="remove-item" data-index="${index}">X</button>
    `;
    cartItemsContainer.appendChild(div);
  });

  document.querySelectorAll(".remove-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = btn.dataset.index;
      cart.splice(i, 1);
      updateCart();
    });
  });

  document.querySelectorAll(".quantity-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = btn.dataset.index;
      const action = btn.dataset.action;
      if (action === "increase") cart[i].quantity++;
      if (action === "decrease") {
        cart[i].quantity--;
        if (cart[i].quantity <= 0) cart.splice(i, 1);
      }
      updateCart();
    });
  });
}

checkoutBtn.addEventListener("click", () => {
  if (cart.length === 0) {
    alert("Cart is empty!");
    return;
  }
  openPaymentModal(cart);
});

function openPaymentModal(items) {
  paymentItems.innerHTML = "";
  let total = 0;
  items.forEach((item) => {
    const div = document.createElement("div");
    div.textContent = `${item.title} - ₹${item.price} × ${item.quantity || 1}`;
    paymentItems.appendChild(div);
    total += item.price * (item.quantity || 1);
  });
  paymentTotal.textContent = total;
  modal.style.display = "flex";

  const selectedRadio = document.querySelector('input[name="payment"]:checked');
  if (selectedRadio) {
    togglePaymentDetails();
  }
}
closeModal.onclick = () => (modal.style.display = "none");
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
};

function togglePaymentDetails() {
  const selectedRadio = document.querySelector('input[name="payment"]:checked');
  if (!selectedRadio) return;
  const selected = selectedRadio.value;
  if (selected === "Card") {
    cardUpiInput.style.display = "block";
    cardUpiInput.placeholder = "Enter Card Number";
  } else if (selected === "UPI") {
    cardUpiInput.style.display = "block";
    cardUpiInput.placeholder = "Enter UPI ID";
  } else {
    cardUpiInput.style.display = "none";
    cardUpiInput.value = "";
  }
}

paymentRadios.forEach((r) =>
  r.addEventListener("change", togglePaymentDetails)
);

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
    `Order placed!\nPayment Method: ${selectedMethod}\nDetails: ${
      details || "N/A"
    }`
  );
  modal.style.display = "none";
  cart = [];
  updateCart();
});
