const savedOrders = localStorage.getItem("foodOrders");
const orders = savedOrders ? JSON.parse(savedOrders) : [];

const ordersList = document.getElementById("orders-list");

if (orders.length === 0) {
  ordersList.innerHTML = `
    <div class="empty-orders">
      <p>You have not placed any orders yet.</p>
      <a href="index.html">Order food now</a>
    </div>
  `;
} else {
  let ordersHTML = "";

  orders.slice().reverse().forEach(function (order) {
    let foodItems = "";

    order.items.forEach(function (item) {
      const itemTotal = item.price * item.quantity;

      foodItems += `
        <li>${item.name} × ${item.quantity} — ₹${itemTotal}</li>
      `;
    });

    ordersHTML += `
      <article class="order-card">
        <div class="order-top">
          <div>
            <h3>Order ID: ${order.orderId}</h3>
            <p><strong>Ordered:</strong> ${order.orderedAt}</p>
          </div>
          <span class="order-status">${order.status}</span>
        </div>

        <p><strong>Customer:</strong> ${order.customerName}</p>
        <p><strong>Phone:</strong> ${order.phone}</p>
        <p><strong>Address:</strong> ${order.address}</p>
        <p><strong>Payment:</strong> ${order.paymentMethod}</p>

        <h4>Food Items</h4>
        <ul>${foodItems}</ul>

        <h3>Total Amount: ₹${order.totalAmount}</h3>
      </article>
    `;
  });

  ordersList.innerHTML = ordersHTML;
}