/**
 * FoodFlow — Admin Operations Dashboard Logic
 */

const client = window.FoodFlow.getClient();

// DOM Elements - Containers & Security
const adminDenied = document.getElementById('admin-access-denied');
const adminMain = document.getElementById('admin-main-container');
const adminRefreshBtn = document.getElementById('admin-refresh-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');

// DOM Elements - Metrics
const statRevenue = document.getElementById('adm-stat-revenue');
const statTotalOrders = document.getElementById('adm-stat-total-orders');
const statActiveOrders = document.getElementById('adm-stat-active-orders');
const statDishes = document.getElementById('adm-stat-dishes');
const statCustomers = document.getElementById('adm-stat-customers');

// DOM Elements - Tabs & Sections
const tabOrdersMgmt = document.getElementById('tab-orders-mgmt');
const tabFoodMgmt = document.getElementById('tab-food-mgmt');
const tabCustomersMgmt = document.getElementById('tab-customers-mgmt');
const secOrdersMgmt = document.getElementById('section-orders-mgmt');
const secFoodMgmt = document.getElementById('section-food-mgmt');
const secCustomersMgmt = document.getElementById('section-customers-mgmt');

// DOM Elements - Orders Tab
const adminOrderSearch = document.getElementById('admin-order-search');
const adminOrdersList = document.getElementById('admin-orders-list');
const statusChips = document.querySelectorAll('#admin-status-filters .category-chip');

// DOM Elements - Food Tab
const adminFoodTableBody = document.getElementById('admin-food-table-body');
const openAddFoodBtn = document.getElementById('open-add-food-btn');

// DOM Elements - Customers Tab
const adminCustomersTableBody = document.getElementById('admin-customers-table-body');

// DOM Elements - Food Form Modal
const foodFormModal = document.getElementById('food-form-modal');
const foodFormClose = document.getElementById('food-form-close');
const foodFormCancel = document.getElementById('food-form-cancel');
const adminFoodForm = document.getElementById('admin-food-form');
const foodFormTitle = document.getElementById('food-form-title');
const editFoodIdInput = document.getElementById('edit-food-id');
const foodNameInput = document.getElementById('food-name-input');
const foodPriceInput = document.getElementById('food-price-input');
const foodCategorySelect = document.getElementById('food-category-select');
const foodImageInput = document.getElementById('food-image-input');
const foodDescInput = document.getElementById('food-desc-input');
const foodIsVegCheckbox = document.getElementById('food-is-veg');
const foodIsAvailableCheckbox = document.getElementById('food-is-available');

// State
let allOrders = [];
let allFoods = [];
let allProfiles = [];
let selectedStatusFilter = 'all';

// --------------------------------------------------------------------------
// 1. Admin Authentication & Role Gatekeeper
// --------------------------------------------------------------------------
async function verifyAdminAccess() {
  if (!client) {
    window.location.href = 'login.html';
    return;
  }

  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    window.location.href = 'login.html?redirect=admin.html';
    return;
  }

  const { data: profile, error } = await client
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || profile?.role !== 'admin') {
    adminDenied.style.display = 'block';
    adminMain.style.display = 'none';
    return;
  }

  adminDenied.style.display = 'none';
  adminMain.style.display = 'block';

  loadAllAdminData();
}

// --------------------------------------------------------------------------
// 2. Fetch & Render All Admin Data
// --------------------------------------------------------------------------
async function loadAllAdminData(isSilent = false) {
  if (!isSilent) {
    adminOrdersList.innerHTML = '<div class="skeleton" style="height: 180px; border-radius: 14px;"></div>';
    adminFoodTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading menu items...</td></tr>';
  }

  try {
    const [ordersRes, foodsRes, profilesRes] = await Promise.all([
      client.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
      client.from('food_items').select('*').order('created_at', { ascending: true }),
      client.from('profiles').select('*').order('created_at', { ascending: false })
    ]);

    allOrders = ordersRes.data || [];
    allFoods = foodsRes.data || [];
    allProfiles = profilesRes.data || [];

    updateAnalytics();
    renderOrders();
    renderFoodTable();
    renderCustomersTable();
  } catch (err) {
    console.error('Error loading admin dashboard:', err);
    window.FoodFlow.showToast('Could not load all dashboard data: ' + err.message, 'error');
  }
}

function updateAnalytics() {
  const nonCancelledOrders = allOrders.filter(o => o.status !== 'Cancelled');
  const revenue = nonCancelledOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const activeOrders = allOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');

  statRevenue.textContent = `₹${revenue}`;
  statTotalOrders.textContent = allOrders.length;
  statActiveOrders.textContent = activeOrders.length;
  statDishes.textContent = allFoods.length;
  statCustomers.textContent = allProfiles.length;
}

// --------------------------------------------------------------------------
// 3. Tab 1: Orders Management
// --------------------------------------------------------------------------
function renderOrders() {
  const searchQuery = (adminOrderSearch.value || '').toLowerCase().trim();

  const filtered = allOrders.filter(order => {
    // Status filter
    const statusMatch = selectedStatusFilter === 'all' || order.status === selectedStatusFilter;

    // Search query match (Customer Name, Phone, or Order ID)
    const nameMatch = order.customer_name?.toLowerCase().includes(searchQuery);
    const phoneMatch = order.phone?.includes(searchQuery);
    const idMatch = order.id?.toLowerCase().includes(searchQuery);
    const searchMatch = !searchQuery || nameMatch || phoneMatch || idMatch;

    return statusMatch && searchMatch;
  });

  adminOrdersList.replaceChildren();

  if (!filtered.length) {
    adminOrdersList.innerHTML = `
      <div class="empty-state-box">
        <span class="empty-state-icon">📦</span>
        <h3>No orders found</h3>
        <p>No customer orders match the current search or status filter.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(order => {
    const card = document.createElement('article');
    card.className = 'admin-order-card';

    const orderDate = new Date(order.created_at).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const statusBadgeClass = getStatusBadgeClass(order.status);
    const itemsList = (order.order_items || []).map(i => `
      <li style="font-size: 0.9rem; margin-bottom: 0.25rem;">
        <strong>${i.food_name}</strong> × ${i.quantity} — ₹${i.unit_price * i.quantity}
      </li>
    `).join('');

    card.innerHTML = `
      <div class="order-top">
        <div>
          <h3 style="font-size: 1.15rem; margin-bottom: 0.25rem;">
            Order #FF-${order.id.slice(0, 8).toUpperCase()}
          </h3>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">
            Placed on ${orderDate} • Customer: <strong>${order.customer_name}</strong> (📞 ${order.phone})
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.2rem;">
            📍 <em>${order.address}</em>
          </div>
        </div>
        <span class="status-badge ${statusBadgeClass}">${order.status}</span>
      </div>

      <div style="margin: 1rem 0; padding: 0.75rem 1rem; background: var(--bg-page); border-radius: var(--radius-md);">
        <h4 style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem;">Order Items:</h4>
        <ul style="padding-left: 1.25rem; margin: 0;">
          ${itemsList}
        </ul>
        <div style="margin-top: 0.5rem; font-weight: 800; font-size: 1.05rem; color: var(--primary);">
          Total: ₹${order.total_amount} <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-muted);">(${order.payment_method})</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <label style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin: 0;">
          Update Status:
        </label>
        <select class="form-control" style="width: auto; padding: 0.45rem 0.85rem; font-size: 0.9rem;" onchange="updateOrderStatus('${order.id}', this.value)">
          ${['Order Placed', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Delivered', 'Cancelled'].map(st => `
            <option value="${st}" ${order.status === st ? 'selected' : ''}>${st}</option>
          `).join('')}
        </select>
      </div>
    `;

    adminOrdersList.appendChild(card);
  });
}

window.updateOrderStatus = async function(orderId, newStatus) {
  try {
    const { error } = await client
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) throw error;

    window.FoodFlow.showToast(`Order status updated to "${newStatus}"!`, 'success');
    
    // Update local state
    const target = allOrders.find(o => o.id === orderId);
    if (target) target.status = newStatus;
    
    updateAnalytics();
    renderOrders();
  } catch (err) {
    window.FoodFlow.showToast(`Failed to update status: ${err.message}`, 'error');
  }
};

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

// --------------------------------------------------------------------------
// 4. Tab 2: Food & Menu Management
// --------------------------------------------------------------------------
function renderFoodTable() {
  adminFoodTableBody.replaceChildren();

  if (!allFoods.length) {
    adminFoodTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No menu items created yet.</td></tr>';
    return;
  }

  allFoods.forEach(food => {
    const tr = document.createElement('tr');
    const isVeg = food.is_veg !== false;
    const isAvailable = food.is_available !== false;

    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${food.image_url}" alt="${food.name}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px;" onerror="this.src='https://placehold.co/100x100?text=Food'">
          <div>
            <strong style="display: block; font-size: 0.95rem;">${food.name}</strong>
            <small style="color: var(--text-secondary);">${(food.description || '').substring(0, 45)}...</small>
          </div>
        </div>
      </td>
      <td>
        <span class="category-tag-badge">${food.category}</span>
      </td>
      <td>
        <strong style="color: var(--accent);">₹${food.price}</strong>
      </td>
      <td>
        ${isVeg 
          ? '<span style="color: var(--veg-green); font-weight: 700; font-size: 0.85rem;">🟢 Veg</span>' 
          : '<span style="color: var(--nonveg-red); font-weight: 700; font-size: 0.85rem;">🔺 Non-Veg</span>'
        }
      </td>
      <td>
        <span class="food-rating-pill">⭐ ${food.rating || 4.5}</span>
      </td>
      <td>
        <label class="switch">
          <input type="checkbox" ${isAvailable ? 'checked' : ''} onchange="toggleFoodStock('${food.id}', this.checked)">
          <span class="slider"></span>
        </label>
      </td>
      <td style="text-align: right;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="openEditFoodModal('${food.id}')" style="margin-right: 0.35rem;">
          ✏️ Edit
        </button>
        <button type="button" class="btn btn-danger btn-sm" onclick="deleteFoodItem('${food.id}', '${food.name.replace(/'/g, "\\'")}')">
          🗑️
        </button>
      </td>
    `;

    adminFoodTableBody.appendChild(tr);
  });
}

window.toggleFoodStock = async function(foodId, isAvailable) {
  try {
    const { error } = await client
      .from('food_items')
      .update({ is_available: isAvailable })
      .eq('id', foodId);

    if (error) throw error;

    const food = allFoods.find(f => f.id === foodId);
    if (food) food.is_available = isAvailable;

    window.FoodFlow.showToast(`Updated stock availability for dish!`, 'success');
  } catch (err) {
    window.FoodFlow.showToast(`Error updating availability: ${err.message}`, 'error');
  }
};

window.openEditFoodModal = function(foodId) {
  const food = allFoods.find(f => f.id === foodId);
  if (!food) return;

  foodFormTitle.textContent = 'Edit Menu Item';
  editFoodIdInput.value = food.id;
  foodNameInput.value = food.name;
  foodPriceInput.value = food.price;
  foodCategorySelect.value = food.category;
  foodImageInput.value = food.image_url;
  foodDescInput.value = food.description || '';
  foodIsVegCheckbox.checked = food.is_veg !== false;
  foodIsAvailableCheckbox.checked = food.is_available !== false;

  foodFormModal.classList.add('active');
};

openAddFoodBtn?.addEventListener('click', () => {
  foodFormTitle.textContent = 'Add New Food Item';
  adminFoodForm.reset();
  editFoodIdInput.value = '';
  foodIsVegCheckbox.checked = true;
  foodIsAvailableCheckbox.checked = true;
  foodFormModal.classList.add('active');
});

function closeFoodFormModal() {
  foodFormModal.classList.remove('active');
}

foodFormClose?.addEventListener('click', closeFoodFormModal);
foodFormCancel?.addEventListener('click', closeFoodFormModal);

adminFoodForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = editFoodIdInput.value;
  const name = foodNameInput.value.trim();
  const price = Number(foodPriceInput.value);
  const category = foodCategorySelect.value;
  const image_url = foodImageInput.value.trim();
  const description = foodDescInput.value.trim();
  const is_veg = foodIsVegCheckbox.checked;
  const is_available = foodIsAvailableCheckbox.checked;

  const payload = {
    name,
    price,
    category,
    image_url,
    description,
    is_veg,
    is_available
  };

  try {
    if (id) {
      // Update
      const { error } = await client
        .from('food_items')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      window.FoodFlow.showToast('Dish updated successfully! ✨', 'success');
    } else {
      // Insert
      const { error } = await client
        .from('food_items')
        .insert(payload);

      if (error) throw error;
      window.FoodFlow.showToast('New dish added to menu! 🍲', 'success');
    }

    closeFoodFormModal();
    loadAllAdminData(true);
  } catch (err) {
    window.FoodFlow.showToast(`Error saving dish: ${err.message}`, 'error');
  }
});

window.deleteFoodItem = async function(foodId, foodName) {
  const confirmed = await window.FoodFlow.confirm({
    title: `Delete "${foodName}"?`,
    message: 'This will permanently remove this dish from the customer menu.',
    confirmText: 'Delete Dish',
    isDanger: true
  });

  if (!confirmed) return;

  try {
    const { error } = await client
      .from('food_items')
      .delete()
      .eq('id', foodId);

    if (error) throw error;

    window.FoodFlow.showToast(`Deleted ${foodName}`, 'info');
    loadAllAdminData(true);
  } catch (err) {
    window.FoodFlow.showToast(`Could not delete dish: ${err.message}`, 'error');
  }
};

// --------------------------------------------------------------------------
// 5. Tab 3: Customers Directory
// --------------------------------------------------------------------------
function renderCustomersTable() {
  adminCustomersTableBody.replaceChildren();

  if (!allProfiles.length) {
    adminCustomersTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No registered profiles found.</td></tr>';
    return;
  }

  allProfiles.forEach(profile => {
    const tr = document.createElement('tr');
    const joined = new Date(profile.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    tr.innerHTML = `
      <td>
        <strong style="font-size: 0.95rem;">${profile.full_name || 'Anonymous Foodie'}</strong>
      </td>
      <td>
        <span class="status-badge ${profile.role === 'admin' ? 'status-ready' : 'status-confirmed'}">
          ${profile.role || 'customer'}
        </span>
      </td>
      <td>${profile.phone || '—'}</td>
      <td><small style="color: var(--text-secondary);">${profile.address || '—'}</small></td>
      <td>${joined}</td>
    `;

    adminCustomersTableBody.appendChild(tr);
  });
}

// --------------------------------------------------------------------------
// 6. Navigation Tabs Switching & Events
// --------------------------------------------------------------------------
tabOrdersMgmt?.addEventListener('click', () => switchTab('orders'));
tabFoodMgmt?.addEventListener('click', () => switchTab('food'));
tabCustomersMgmt?.addEventListener('click', () => switchTab('customers'));

function switchTab(tab) {
  [tabOrdersMgmt, tabFoodMgmt, tabCustomersMgmt].forEach(t => t.classList.remove('active'));
  [secOrdersMgmt, secFoodMgmt, secCustomersMgmt].forEach(s => s.style.display = 'none');

  if (tab === 'orders') {
    tabOrdersMgmt.classList.add('active');
    secOrdersMgmt.style.display = 'block';
  } else if (tab === 'food') {
    tabFoodMgmt.classList.add('active');
    secFoodMgmt.style.display = 'block';
  } else if (tab === 'customers') {
    tabCustomersMgmt.classList.add('active');
    secCustomersMgmt.style.display = 'block';
  }
}

// Search & Status filters
adminOrderSearch?.addEventListener('input', renderOrders);

statusChips.forEach(chip => {
  chip.addEventListener('click', () => {
    statusChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedStatusFilter = chip.dataset.status;
    renderOrders();
  });
});

// Refresh & Logout
adminRefreshBtn?.addEventListener('click', () => {
  window.FoodFlow.showToast('Refreshing kitchen operations...', 'info', 1500);
  loadAllAdminData(true);
});

adminLogoutBtn?.addEventListener('click', () => {
  window.FoodFlow.logout();
});

// Auto-refresh orders every 15 seconds
setInterval(() => {
  if (adminMain.style.display !== 'none') {
    loadAllAdminData(true);
  }
}, 15000);

verifyAdminAccess();
