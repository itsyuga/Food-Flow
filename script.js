let cart = [];

function addToCart(foodName, foodPrice) {
  cart.push({
    name: foodName,
    price: foodPrice
  });

  updateCart();
}

function updateCart() {
  const cartItems = document.getElementById("cart-items");
  const cartCount = document.getElementById("cart-count");
  const totalPrice = document.getElementById("total-price");

  cartItems.innerHTML = "";

  let total = 0;

  cart.forEach(function (item) {
    cartItems.innerHTML += `<p>${item.name} - ₹${item.price}</p>`;
    total += item.price;
  });

  if (cart.length === 0) {
    cartItems.innerHTML = "<p>Your cart is empty.</p>";
  }

  cartCount.textContent = cart.length;
  totalPrice.textContent = total;
}