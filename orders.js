/**
 * FoodFlow — Order Tracking & Lifecycle Management
 */

const client = window.FoodFlow.getClient();

// DOM Elements
const ordersList = document.getElementById('orders-list');
const tabActiveOrders = document.getElementById('tab-active-orders');
const tabPastOrders = document.getElementById('tab-past-orders');
const activeOrdersCount = document.getElementById('active-orders-count');
const pastOrdersCount = document.getElementById('past-orders-count');
const refreshOrdersBtn = document.getElementById('refresh-orders-btn');

let currentUser = null;
let allOrders = [];
let showPastTab = false;

const ORDER_STAGES = [
  { key: 'Order Placed', label: 'Placed' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Preparing', label: 'Kitchen' },
  { key: 'Ready', label: 'Ready' },
  { key: 'Out for Delivery', label: 'On The Way' },
  { key: 'Delivered', label: 'Delivered' }
];

async function loadUserOrders(isSilent = false) {
  if (!client) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = await window.FoodFlow.getCurrentUser();
  if (!currentUser) {
    window.location.href = 'login.html?redirect=orders.html';
    return;
  }

  if (!isSilent) {
    ordersList.innerHTML = `
      <div class="skeleton" style="height: 220px; border-radius: var(--radius-lg); margin-bottom: 1.5rem;"></div>
      <div class="skeleton" style="height: 220px; border-radius: var(--radius-lg);"></div>
    `;
  }

  try {
    const { data: orders, error } = await client
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allOrders = orders || [];
    renderOrdersView();
  } catch (err) {
    console.error('Error fetching orders:', err);
    ordersList.innerHTML = `
      <div class="empty-state-box">
        <span class="empty-state-icon">⚠️</span>
        <h3>Could not load your orders</h3>
        <p>${err.message || 'Please check your connection and try again.'}</p>
        <button type="button" class="btn btn-secondary btn-sm" onclick="loadUserOrders()">Try Again</button>
      </div>
    `;
  }
}

function renderOrdersView() {
  const activeOrders = allOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  const pastOrders = allOrders.filter(o => o.status === 'Delivered' || o.status === 'Cancelled');

  activeOrdersCount.textContent = activeOrders.length;
  pastOrdersCount.textContent = pastOrders.length;

  const currentList = showPastTab ? pastOrders : activeOrders;

  ordersList.replaceChildren();

  if (!currentList.length) {
    const emptyTitle = showPastTab ? 'No past orders yet' : 'No active orders right now';
    const emptyMsg = showPastTab
      ? 'Delivered meals and completed orders will show up here.'
      : 'Hungry? Place an order and track its preparation in real-time!';

    ordersList.innerHTML = `
      <div class="empty-state-box">
        <span class="empty-state-icon">${showPastTab ? '📜' : '🍲'}</span>
        <h3>${emptyTitle}</h3>
        <p>${emptyMsg}</p>
        <a href="index.html" class="btn btn-primary">Browse Delicious Menu</a>
      </div>
    `;
    return;
  }

  currentList.forEach(order => {
    const card = document.createElement('article');
    card.className = 'order-card';

    const orderCode = `#FF-${order.id.slice(0, 8).toUpperCase()}`;
    const orderDate = new Date(order.created_at).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const statusBadgeClass = getStatusBadgeClass(order.status);
    const stepperHTML = renderStepper(order.status);

    const itemsRows = (order.order_items || []).map(item => `
      <tr>
        <td style="font-weight: 600;">${item.food_name}</td>
        <td style="text-align: center; color: var(--text-secondary);">× ${item.quantity}</td>
        <td style="text-align: right;">₹${item.unit_price * item.quantity}</td>
      </tr>
    `).join('');

    card.innerHTML = `
      <div class="order-header-row">
        <div>
          <span class="order-id-code">${orderCode}</span>
          <div class="order-date-text">Placed on ${orderDate}</div>
        </div>
        <span class="status-badge ${statusBadgeClass}">${order.status}</span>
      </div>

      ${stepperHTML}

      <div style="background: var(--bg-page); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
        <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; font-size: 0.85rem; color: var(--text-secondary);">
          <div><strong>📍 Delivery Address:</strong> ${order.address}</div>
          <div><strong>📞 Phone:</strong> ${order.phone}</div>
          <div><strong>💳 Payment:</strong> ${order.payment_method}</div>
        </div>
      </div>

      <table class="order-items-table">
        <thead>
          <tr>
            <th>Dish</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="order-card-footer">
        <div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">
            Delivery Fee: ${order.delivery_fee === 0 ? 'FREE' : `₹${order.delivery_fee || 0}`}
          </div>
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">
            Total Paid: ₹${order.total_amount}
          </div>
        </div>

        <button type="button" class="btn btn-secondary btn-sm" onclick="handleOrderAgain('${order.id}')">
          <span>🔁</span> Order Again
        </button>
      </div>
    `;

    ordersList.appendChild(card);
  });
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Order Placed':
    case 'Pending':
      return 'status-placed';
    case 'Confirmed':
      return 'status-confirmed';
    case 'Preparing':
      return 'status-preparing';
    case 'Ready':
      return 'status-ready';
    case 'Out for Delivery':
      return 'status-out';
    case 'Delivered':
      return 'status-delivered';
    case 'Cancelled':
      return 'status-cancelled';
    default:
      return 'status-placed';
  }
}

function renderStepper(currentStatus) {
  if (currentStatus === 'Cancelled') {
    return `
      <div style="background: var(--danger-light); color: var(--danger); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.88rem; font-weight: 600; text-align: center; margin: 1.25rem 0;">
        ❌ This order was cancelled.
      </div>
    `;
  }

  // Normalize status index
  let activeIndex = ORDER_STAGES.findIndex(s => s.key.toLowerCase() === (currentStatus || '').toLowerCase());
  if (activeIndex === -1) {
    if (currentStatus === 'Pending') activeIndex = 0;
    else activeIndex = 0;
  }

  const nodesHTML = ORDER_STAGES.map((stage, idx) => {
    let nodeClass = 'step-node';
    let icon = idx + 1;

    if (idx < activeIndex) {
      nodeClass += ' completed';
      icon = '✓';
    } else if (idx === activeIndex) {
      nodeClass += ' active';
      icon = '🔥';
    }

    return `
      <div class="${nodeClass}">
        <div class="step-circle">${icon}</div>
        <span class="step-label">${stage.label}</span>
      </div>
    `;
  }).join('');

  return `<div class="order-stepper">${nodesHTML}</div>`;
}

// Order Again handler
window.handleOrderAgain = function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order || !order.order_items || !order.order_items.length) return;

  order.order_items.forEach(item => {
    window.FoodFlow.addToCart({
      id: `reorder_${item.id}`,
      name: item.food_name,
      price: Number(item.unit_price),
      category: 'rice',
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'
    }, Number(item.quantity));
  });

  window.FoodFlow.showToast('Added items from previous order to your cart! 🛒', 'success');
  window.FoodFlow.openCartDrawer();
};

// Filter Tab listeners
tabActiveOrders?.addEventListener('click', () => {
  showPastTab = false;
  tabActiveOrders.classList.add('active');
  tabPastOrders.classList.remove('active');
  tabActiveOrders.setAttribute('aria-selected', 'true');
  tabPastOrders.setAttribute('aria-selected', 'false');
  renderOrdersView();
});

tabPastOrders?.addEventListener('click', () => {
  showPastTab = true;
  tabPastOrders.classList.add('active');
  tabActiveOrders.classList.remove('active');
  tabPastOrders.setAttribute('aria-selected', 'true');
  tabActiveOrders.setAttribute('aria-selected', 'false');
  renderOrdersView();
});

// Refresh button listener
refreshOrdersBtn?.addEventListener('click', () => {
  window.FoodFlow.showToast('Refreshing order status...', 'info', 1500);
  loadUserOrders(true);
});

// Auto-refresh active orders every 20 seconds
setInterval(() => {
  const hasActive = allOrders.some(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
  if (hasActive) {
    loadUserOrders(true);
  }
}, 20000);

loadUserOrders();
