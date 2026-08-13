const ordersList = document.getElementById("orders-list");
const client = window.foodFlowSupabase;

async function loadOrders() {
  const { data: { user } } = await client.auth.getUser();
  if (!user) { window.location.href = "login.html"; return; }
  const { data: orders, error } = await client.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (error) { ordersList.innerHTML = `<div class="empty-orders"><p>Could not load orders: ${error.message}</p></div>`; return; }
  if (!orders.length) { ordersList.innerHTML = '<div class="empty-orders"><p>You have not placed any orders yet.</p><a href="index.html">Order food now</a></div>'; return; }
  orders.forEach((order) => {
    const card = document.createElement("article"); card.className = "order-card";
    const top = document.createElement("div"); top.className = "order-top";
    const meta = document.createElement("div"); const title = document.createElement("h3"); title.textContent = `Order ID: ${order.id.slice(0, 8).toUpperCase()}`;
    const date = document.createElement("p"); date.textContent = `Ordered: ${new Date(order.created_at).toLocaleString()}`; meta.append(title, date);
    const status = document.createElement("span"); status.className = "order-status"; status.textContent = order.status; top.append(meta, status);
    const itemTitle = document.createElement("h4"); itemTitle.textContent = "Food Items"; const list = document.createElement("ul");
    order.order_items.forEach((item) => { const line = document.createElement("li"); line.textContent = `${item.food_name} × ${item.quantity} — ₹${item.unit_price * item.quantity}`; list.append(line); });
    const payment = document.createElement("p"); payment.textContent = `Payment: ${order.payment_method}`;
    const total = document.createElement("h3"); total.textContent = `Total Amount: ₹${order.total_amount}`;
    card.append(top, payment, itemTitle, list, total); ordersList.append(card);
  });
}
loadOrders();
