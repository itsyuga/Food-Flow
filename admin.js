const client = window.foodFlowSupabase;
const adminOrdersList = document.getElementById("admin-orders-list");
const adminFoodList = document.getElementById("admin-food-list");
const addFoodForm = document.getElementById("add-food-form");

function setStats(orders, foods) {
  document.getElementById("total-orders").textContent = orders.length;
  document.getElementById("active-orders").textContent = orders.filter((order) => order.status !== "Delivered").length;
  document.getElementById("menu-items").textContent = foods.length;
}

function showMessage(target, text) { target.innerHTML = `<div class="empty-orders"><p>${text}</p></div>`; }

async function updateOrderStatus(id, status) {
  const { error } = await client.from("orders").update({ status }).eq("id", id);
  if (error) alert(`Could not update order: ${error.message}`);
  else loadAdminData();
}

function renderOrders(orders) {
  adminOrdersList.replaceChildren();
  if (!orders.length) return showMessage(adminOrdersList, "No customer orders have been placed yet.");
  orders.forEach((order) => {
    const card = document.createElement("article"); card.className = "admin-order-card";
    const top = document.createElement("div"); top.className = "order-top";
    const info = document.createElement("div");
    const title = document.createElement("h3"); title.textContent = `Order ID: ${order.id.slice(0, 8).toUpperCase()}`;
    const customer = document.createElement("p"); customer.textContent = `Customer: ${order.customer_name}`;
    const address = document.createElement("p"); address.textContent = `Address: ${order.address}`;
    info.append(title, customer, address);
    const badge = document.createElement("span"); badge.className = "order-status"; badge.textContent = order.status; top.append(info, badge);
    const list = document.createElement("ul"); order.order_items.forEach((item) => { const line = document.createElement("li"); line.textContent = `${item.food_name} × ${item.quantity} — ₹${item.unit_price * item.quantity}`; list.append(line); });
    const total = document.createElement("p"); total.textContent = `Total: ₹${order.total_amount}`;
    const label = document.createElement("label"); label.textContent = "Change Order Status";
    const select = document.createElement("select"); ["Order Placed", "Preparing", "Out for Delivery", "Delivered"].forEach((value) => { const option = new Option(value, value, false, value === order.status); select.append(option); });
    select.addEventListener("change", () => updateOrderStatus(order.id, select.value));
    card.append(top, list, total, label, select); adminOrdersList.append(card);
  });
}

function renderFoods(foods) {
  adminFoodList.replaceChildren();
  if (!foods.length) return showMessage(adminFoodList, "No food items are available.");
  foods.forEach((food) => {
    const card = document.createElement("article"); card.className = "admin-food-card";
    const image = document.createElement("img"); image.src = food.image_url; image.alt = food.name;
    const info = document.createElement("div"); const title = document.createElement("h3"); title.textContent = food.name;
    const price = document.createElement("p"); price.textContent = `Price: ₹${food.price}`;
    const category = document.createElement("p"); category.textContent = `Category: ${food.category}`;
    const remove = document.createElement("button"); remove.className = "delete-food-button"; remove.textContent = "Delete Food";
    remove.addEventListener("click", async () => { if (!confirm(`Delete ${food.name}?`)) return; const { error } = await client.from("food_items").delete().eq("id", food.id); if (error) alert(error.message); else loadAdminData(); });
    info.append(title, price, category, remove); card.append(image, info); adminFoodList.append(card);
  });
}

async function loadAdminData() {
  const [ordersResponse, foodsResponse] = await Promise.all([
    client.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
    client.from("food_items").select("*").order("created_at")
  ]);
  if (ordersResponse.error || foodsResponse.error) { showMessage(adminOrdersList, `Could not load dashboard data. ${ordersResponse.error?.message || foodsResponse.error?.message}`); return; }
  setStats(ordersResponse.data, foodsResponse.data); renderOrders(ordersResponse.data); renderFoods(foodsResponse.data);
}

addFoodForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const food = { name: document.getElementById("food-name").value.trim(), price: Number(document.getElementById("food-price").value), category: document.getElementById("food-category").value, image_url: document.getElementById("food-image").value.trim() };
  const { error } = await client.from("food_items").insert(food);
  if (error) { alert(`Could not add food: ${error.message}`); return; }
  addFoodForm.reset(); loadAdminData();
});

async function startAdmin() {
  const { data: { user } } = await client.auth.getUser();
  if (!user) { window.location.href = "login.html"; return; }
  const { data: profile, error } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (error || profile?.role !== "admin") {
    document.querySelector(".admin-page").innerHTML = '<div class="empty-orders"><h2>Admin access required</h2><p>This account is not an admin yet. Ask the project owner to activate admin access.</p><a href="index.html">Return to menu</a></div>';
    return;
  }
  loadAdminData();
}
startAdmin();
