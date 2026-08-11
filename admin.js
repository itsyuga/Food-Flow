let orders = JSON.parse(localStorage.getItem("foodOrders")) || [];
let customFoods = JSON.parse(localStorage.getItem("customFoods")) || [];

const adminOrdersList = document.getElementById("admin-orders-list");
const addFoodForm = document.getElementById("add-food-form");
const adminFoodList = document.getElementById("admin-food-list");
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

addFoodForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const foodName = document.getElementById("food-name").value.trim();
  const foodPrice = Number(document.getElementById("food-price").value);
  const foodCategory = document.getElementById("food-category").value;
  const foodImage = document.getElementById("food-image").value.trim();

  const newFood = {
    id: "food-" + Date.now(),
    name: foodName,
    price: foodPrice,
    category: foodCategory,
    image: foodImage
  };

  customFoods.push(newFood);

  localStorage.setItem("customFoods", JSON.stringify(customFoods));

alert(foodName + " was added to the menu successfully.");
addFoodForm.reset();
showAdminFoods();  
});

showAdminOrders();
function showAdminFoods() {
  if (customFoods.length === 0) {
    adminFoodList.innerHTML = `
      <div class="empty-orders">
        <p>No custom food items have been added yet.</p>
      </div>
    `;
    return;
  }

  let foodHTML = "";

  customFoods.forEach(function (food) {
    foodHTML += `
      <article class="admin-food-card">
        <img
          src="${food.image}"
          alt="${food.name}"
          onerror="this.src='https://placehold.co/600x400/f4a261/ffffff?text=Food+Image'"
        >

        <div>
          <h3>${food.name}</h3>
          <p><strong>Price:</strong> ₹${food.price}</p>
          <p><strong>Category:</strong> ${food.category}</p>

          <button
            class="delete-food-button"
            onclick="deleteFood('${food.id}')"
          >
            Delete Food
          </button>
        </div>
      </article>
    `;
  });

  adminFoodList.innerHTML = foodHTML;
}

function deleteFood(foodId) {
  const userConfirmed = confirm("Are you sure you want to delete this food item?");

  if (!userConfirmed) {
    return;
  }

  customFoods = customFoods.filter(function (food) {
    return food.id !== foodId;
  });

  localStorage.setItem("customFoods", JSON.stringify(customFoods));

  showAdminFoods();

  alert("Food item deleted successfully.");
}
showAdminOrders();
showAdminFoods();