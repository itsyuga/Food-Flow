let orders = JSON.parse(localStorage.getItem("foodOrders")) || [];

const adminOrdersList = document.getElementById("admin-orders-list");

function showAdminOrders() {
  if (orders.length === 0) {
    adminOrdersList.innerHTML = `
      <div class="empty-orders">
        <p>No customer orders have been placed yet.</p>
      </div>
    `;
    return;
  }

  let ordersHTML = "";

  orders.slice().reverse().forEach(function (order) {
    let itemsHTML = "";

    order.items.forEach(function (item) {
      itemsHTML += `
        <li>${item.name} × ${item.quantity} — ₹${item.price * item.quantity}</li>
      `;
    });

    ordersHTML += `
      <article class="admin-order-card">
        <div class="order-top">
          <div>
            <h3>Order ID: ${order.orderId}</h3>
            <p><strong>Customer:</strong> ${order.customerName}</p>
            <p><strong>Phone:</strong> ${order.phone}</p>
            <p><strong>Address:</strong> ${order.address}</p>
          </div>

          <span class="order-status">${order.status}</span>
        </div>

        <h4>Food Items</h4>
        <ul>${itemsHTML}</ul>

        <p><strong>Total:</strong> ₹${order.totalAmount}</p>

        <label for="status-${order.orderId}">Change Order Status</label>

        <select
          id="status-${order.orderId}"
          onchange="updateOrderStatus('${order.orderId}', this.value)"
        >
          <option value="Order Placed" ${order.status === "Order Placed" ? "selected" : ""}>
            Order Placed
          </option>

          <option value="Preparing" ${order.status === "Preparing" ? "selected" : ""}>
            Preparing
          </option>

          <option value="Out for Delivery" ${order.status === "Out for Delivery" ? "selected" : ""}>
            Out for Delivery
          </option>

          <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>
            Delivered
          </option>
        </select>
      </article>
    `;
  });

  adminOrdersList.innerHTML = ordersHTML;
}

function updateOrderStatus(orderId, newStatus) {
  orders = orders.map(function (order) {
    if (order.orderId === orderId) {
      order.status = newStatus;
    }

    return order;
  });

  localStorage.setItem("foodOrders", JSON.stringify(orders));
  showAdminOrders();
}

showAdminOrders();