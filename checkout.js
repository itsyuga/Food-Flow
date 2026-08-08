const cart = JSON.parse(localStorage.getItem("foodCart")) || [];
const orderSummary = document.getElementById("order-summary");
const checkoutForm = document.getElementById("checkout-form");

function showOrderSummary() {
  if (cart.length === 0) {
    orderSummary.innerHTML = `
      <p>Your cart is empty.</p>
      <a href="index.html">Go back to the menu</a>
    `;

    checkoutForm.style.display = "none";
    return;
  }

  let total = 0;
  let summaryHTML = "<h3>Your Order</h3>";

  cart.forEach(function (item) {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    summaryHTML += `
      <p>${item.name} × ${item.quantity} — ₹${itemTotal}</p>
    `;
  });

  summaryHTML += `<h3>Total Amount: ₹${total}</h3>`;
  orderSummary.innerHTML = summaryHTML;
}

checkoutForm.addEventListener("submit", function (event) {
  event.preventDefault();

  let total = 0;

  cart.forEach(function (item) {
    total += item.price * item.quantity;
  });

  const order = {
    orderId: "TT" + Date.now(),
    customerName: document.getElementById("customer-name").value,
    phone: document.getElementById("phone").value,
    address: document.getElementById("address").value,
    paymentMethod: document.getElementById("payment-method").value,
    items: cart,
    totalAmount: total,
    status: "Order Placed",
    orderedAt: new Date().toLocaleString()
  };

  const savedOrders = JSON.parse(localStorage.getItem("foodOrders")) || [];
  savedOrders.push(order);

  localStorage.setItem("foodOrders", JSON.stringify(savedOrders));
  localStorage.removeItem("foodCart");

  alert("Order placed successfully! Your Order ID is: " + order.orderId);

  window.location.href = "orders.html";
});

showOrderSummary();