let cart = JSON.parse(localStorage.getItem("foodCart")) || [];

function addToCart(foodName, foodPrice) {
  const existingFood = cart.find(function (item) {
    return item.name === foodName;
  });

  if (existingFood) {
    existingFood.quantity += 1;
  } else {
    cart.push({
      name: foodName,
      price: foodPrice,
      quantity: 1
    });
  }

  saveCart();
  updateCart();
}

function removeFromCart(foodName) {
  cart = cart.filter(function (item) {
    return item.name !== foodName;
  });

  saveCart();
  updateCart();
}

function clearCart() {
  cart = [];
  saveCart();
  updateCart();
}

function saveCart() {
  localStorage.setItem("foodCart", JSON.stringify(cart));
}

function updateCart() {
  const cartItems = document.getElementById("cart-items");
  const cartCount = document.getElementById("cart-count");
  const totalPrice = document.getElementById("total-price");

  cartItems.innerHTML = "";

  let total = 0;
  let totalItems = 0;

  cart.forEach(function (item) {
    const itemTotal = item.price * item.quantity;

    cartItems.innerHTML += `
      <div class="cart-item">
        <p>${item.name} × ${item.quantity} = ₹${itemTotal}</p>
        <button class="remove-button" onclick="removeFromCart('${item.name}')">
          Remove
        </button>
      </div>
    `;

    total += itemTotal;
    totalItems += item.quantity;
  });

  if (cart.length === 0) {
    cartItems.innerHTML = "<p>Your cart is empty.</p>";
  }

  cartCount.textContent = totalItems;
  totalPrice.textContent = total;
}

function goToCheckout() {
  if (cart.length === 0) {
    alert("Your cart is empty. Please add food first.");
    return;
  }

  window.location.href = "checkout.html";
}

updateCart();

function filterFood(category) {
  const foodCards = document.querySelectorAll(".food-card");

  foodCards.forEach(function (card) {
    if (category === "all" || card.dataset.category === category) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

const searchInput = document.getElementById("search-input");

searchInput.addEventListener("input", function () {
  const searchText = searchInput.value.toLowerCase();
  const foodCards = document.querySelectorAll(".food-card");

  foodCards.forEach(function (card) {
    const foodName = card.dataset.name;

    if (foodName.includes(searchText)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
});