const cart = JSON.parse(localStorage.getItem("foodCart")) || [];
const orderSummary = document.getElementById("order-summary");
const checkoutForm = document.getElementById("checkout-form");
const client = window.foodFlowSupabase;

function showOrderSummary() {
  orderSummary.replaceChildren();
  if (!cart.length) { orderSummary.innerHTML = '<p>Your cart is empty.</p><a href="index.html">Go back to the menu</a>'; checkoutForm.hidden = true; return; }
  const heading = document.createElement("h3"); heading.textContent = "Your Order"; orderSummary.append(heading);
  let total = 0;
  cart.forEach((item) => { total += item.price * item.quantity; const line = document.createElement("p"); line.textContent = `${item.name} × ${item.quantity} — ₹${item.price * item.quantity}`; orderSummary.append(line); });
  const totalLine = document.createElement("h3"); totalLine.textContent = `Total Amount: ₹${total}`; orderSummary.append(totalLine);
}

checkoutForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const { data: { user } } = await client.auth.getUser();
  if (!user) { window.location.href = "login.html"; return; }
  const button = checkoutForm.querySelector("button[type=submit]"); button.disabled = true; button.textContent = "Placing order…";
  const totalAmount = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const { data: order, error } = await client.from("orders").insert({
    user_id: user.id,
    customer_name: document.getElementById("customer-name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    address: document.getElementById("address").value.trim(),
    payment_method: document.getElementById("payment-method").value,
    total_amount: totalAmount
  }).select().single();
  if (error) { alert(`Could not place order: ${error.message}`); button.disabled = false; button.textContent = "Place Order"; return; }
  const { error: itemsError } = await client.from("order_items").insert(cart.map((item) => ({ order_id: order.id, food_name: item.name, unit_price: item.price, quantity: item.quantity })));
  if (itemsError) { alert(`Order created, but items could not be saved: ${itemsError.message}`); }
  localStorage.removeItem("foodCart"); window.location.href = "orders.html";
});

showOrderSummary();
