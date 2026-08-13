let cart = JSON.parse(localStorage.getItem("foodCart")) || [];
let selectedCategory = "all";

const cartItems = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const totalPrice = document.getElementById("total-price");
const searchInput = document.getElementById("search-input");
const foodList = document.getElementById("food-list");

function saveCart() { localStorage.setItem("foodCart", JSON.stringify(cart)); }

function addToCart(name, price) {
  const existingFood = cart.find((item) => item.name === name);
  if (existingFood) existingFood.quantity += 1;
  else cart.push({ name, price, quantity: 1 });
  saveCart();
  updateCart();
}

function removeFromCart(name) {
  cart = cart.filter((item) => item.name !== name);
  saveCart();
  updateCart();
}

function changeQuantity(name, change) {
  const item = cart.find((food) => food.name === name);
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) return removeFromCart(name);
  saveCart();
  updateCart();
}

function clearCart() {
  if (!cart.length || confirm("Clear all items from your cart?")) {
    cart = [];
    saveCart();
    updateCart();
  }
}

function updateCart() {
  cartItems.replaceChildren();
  let total = 0;
  let totalItems = 0;
  if (!cart.length) cartItems.innerHTML = "<p>Your cart is empty.</p>";

  cart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    totalItems += item.quantity;
    const row = document.createElement("div");
    row.className = "cart-item";
    const info = document.createElement("div");
    info.innerHTML = `<p></p><small>₹${item.price} each</small>`;
    info.querySelector("p").textContent = item.name;
    const actions = document.createElement("div");
    actions.className = "cart-item-actions";
    const minus = makeButton("−", "quantity-button", () => changeQuantity(item.name, -1));
    minus.setAttribute("aria-label", `Remove one ${item.name}`);
    const quantity = document.createElement("strong"); quantity.textContent = item.quantity;
    const plus = makeButton("+", "quantity-button", () => changeQuantity(item.name, 1));
    plus.setAttribute("aria-label", `Add one ${item.name}`);
    const subtotal = document.createElement("strong"); subtotal.textContent = `₹${itemTotal}`;
    actions.append(minus, quantity, plus, subtotal, makeButton("Remove", "remove-button", () => removeFromCart(item.name)));
    row.append(info, actions);
    cartItems.append(row);
  });
  cartCount.textContent = totalItems;
  totalPrice.textContent = total;
}

function makeButton(label, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

function goToCheckout() {
  if (!cart.length) return alert("Your cart is empty. Please add food first.");
  window.location.href = "checkout.html";
}

function applyFilters() {
  const searchText = searchInput.value.toLowerCase().trim();
  document.querySelectorAll(".food-card").forEach((card) => {
    const visible = (selectedCategory === "all" || card.dataset.category === selectedCategory) && card.dataset.name.includes(searchText);
    card.hidden = !visible;
  });
}

document.querySelectorAll(".category-button").forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;
    document.querySelectorAll(".category-button").forEach((item) => item.classList.toggle("active", item === button));
    applyFilters();
  });
});
searchInput.addEventListener("input", applyFilters);

function showCustomFoods() {
  const customFoods = JSON.parse(localStorage.getItem("customFoods")) || [];
  customFoods.forEach((food) => {
    const card = document.createElement("article");
    card.className = "food-card";
    card.dataset.category = food.category;
    card.dataset.name = food.name.toLowerCase();
    const image = document.createElement("img"); image.src = food.image; image.alt = food.name;
    image.onerror = () => { image.src = "https://placehold.co/600x400/f4a261/ffffff?text=Food+Image"; };
    const title = document.createElement("h3"); title.textContent = food.name;
    const price = document.createElement("p"); price.className = "food-price"; price.textContent = `₹${food.price}`;
    const button = makeButton("Add to Cart", "", () => addToCart(food.name, food.price));
    card.append(image, title, price, button);
    foodList.append(card);
  });
}

showCustomFoods();
updateCart();
applyFilters();

async function loadSupabaseMenu() {
  const { data: foods, error } = await window.foodFlowSupabase
    .from("food_items")
    .select("id, name, price, category, image_url")
    .order("created_at");
  if (error || !foods?.length) return;
  foodList.replaceChildren();
  foods.forEach((food) => {
    const card = document.createElement("article"); card.className = "food-card";
    card.dataset.category = food.category; card.dataset.name = food.name.toLowerCase();
    const image = document.createElement("img"); image.src = food.image_url; image.alt = food.name;
    image.onerror = () => { image.src = "https://placehold.co/600x400/f4a261/ffffff?text=Food+Image"; };
    const title = document.createElement("h3"); title.textContent = food.name;
    const price = document.createElement("p"); price.className = "food-price"; price.textContent = `₹${food.price}`;
    card.append(image, title, price, makeButton("Add to Cart", "", () => addToCart(food.name, food.price)));
    foodList.append(card);
  });
  applyFilters();
}

loadSupabaseMenu();
