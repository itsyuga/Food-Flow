/**
 * FoodFlow — Global Application Utilities & Shared State
 * Handles Authentication, Shared Navigation, Cart Drawer, Toasts, and Modals.
 */

// Initialize global FoodFlow object
window.FoodFlow = window.FoodFlow || {};

(function() {
  const FF = window.FoodFlow;

  // Supabase client instance
  FF.getClient = function() {
    return window.foodFlowSupabase || null;
  };

  // ------------------------------------------------------------------------
  // 1. Toast Notification System
  // ------------------------------------------------------------------------
  FF.showToast = function(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    if (type === 'warning') icon = '⚡';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  // ------------------------------------------------------------------------
  // 2. Custom Confirmation Modal Dialog
  // ------------------------------------------------------------------------
  FF.confirm = function({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
    return new Promise((resolve) => {
      let modalBackdrop = document.getElementById('ff-confirm-modal');
      if (modalBackdrop) modalBackdrop.remove();

      modalBackdrop = document.createElement('div');
      modalBackdrop.id = 'ff-confirm-modal';
      modalBackdrop.className = 'modal-backdrop active';
      modalBackdrop.innerHTML = `
        <div class="modal-dialog" style="max-width: 420px; padding: 1.75rem;">
          <h3 style="margin-bottom: 0.5rem; font-size: 1.25rem;">${title}</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.95rem;">${message}</p>
          <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" id="ff-confirm-cancel">${cancelText}</button>
            <button type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-primary'} btn-sm" id="ff-confirm-ok">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(modalBackdrop);

      const close = (result) => {
        modalBackdrop.classList.remove('active');
        setTimeout(() => modalBackdrop.remove(), 250);
        resolve(result);
      };

      document.getElementById('ff-confirm-cancel').addEventListener('click', () => close(false));
      document.getElementById('ff-confirm-ok').addEventListener('click', () => close(true));
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) close(false);
      });
    });
  };

  // ------------------------------------------------------------------------
  // 3. Cart State & Calculations
  // ------------------------------------------------------------------------
  const CART_KEY = 'foodFlow_cart';

  FF.getCart = function() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      return [];
    }
  };

  FF.saveCart = function(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    FF.updateNavCartCount();
    FF.renderCartDrawer();
    window.dispatchEvent(new CustomEvent('foodflow:cart-updated', { detail: { cart } }));
  };

  FF.calculateCartTotals = function() {
    const cart = FF.getCart();
    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    // Standard delivery is Rs 40; Free delivery for orders Rs 500 and above
    const deliveryFee = subtotal === 0 ? 0 : (subtotal >= 500 ? 0 : 40);
    const total = subtotal + deliveryFee;
    const amountToFreeDelivery = Math.max(0, 500 - subtotal);

    return { subtotal, deliveryFee, total, totalItems, amountToFreeDelivery };
  };

  FF.addToCart = function(foodItem, quantity = 1) {
    if (!foodItem || !foodItem.name) return;
    const cart = FF.getCart();
    const existingIndex = cart.findIndex(item => item.id ? item.id === foodItem.id : item.name === foodItem.name);

    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        id: foodItem.id || `food_${Date.now()}`,
        name: foodItem.name,
        price: Number(foodItem.price) || 0,
        image_url: foodItem.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
        category: foodItem.category || 'snacks',
        is_veg: foodItem.is_veg !== undefined ? foodItem.is_veg : true,
        quantity: Math.max(1, quantity)
      });
    }

    FF.saveCart(cart);
    FF.showToast(`Added ${foodItem.name} to cart!`, 'success');
  };

  FF.removeFromCart = function(identifier) {
    let cart = FF.getCart();
    cart = cart.filter(item => item.id !== identifier && item.name !== identifier);
    FF.saveCart(cart);
  };

  FF.updateCartQuantity = function(identifier, change) {
    const cart = FF.getCart();
    const item = cart.find(i => i.id === identifier || i.name === identifier);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
      FF.removeFromCart(identifier);
    } else {
      FF.saveCart(cart);
    }
  };

  FF.clearCart = async function(skipConfirm = false) {
    const cart = FF.getCart();
    if (!cart.length) return;
    if (!skipConfirm) {
      const confirmed = await FF.confirm({
        title: 'Clear Cart?',
        message: 'Are you sure you want to remove all items from your cart?',
        confirmText: 'Clear All',
        isDanger: true
      });
      if (!confirmed) return;
    }
    FF.saveCart([]);
    FF.showToast('Cart cleared', 'info');
  };

  // ------------------------------------------------------------------------
  // 4. Sliding Cart Drawer (Injected dynamically)
  // ------------------------------------------------------------------------
  FF.initCartDrawer = function() {
    if (document.getElementById('ff-cart-drawer-root')) return;

    const root = document.createElement('div');
    root.id = 'ff-cart-drawer-root';
    root.innerHTML = `
      <div class="cart-drawer-overlay" id="ff-cart-overlay"></div>
      <aside class="cart-drawer" id="ff-cart-drawer" aria-label="Shopping Cart">
        <div class="cart-drawer-header">
          <h2><span>🛒</span> Your Cart</h2>
          <button class="close-drawer-btn" id="ff-cart-close" aria-label="Close cart">&times;</button>
        </div>
        <div class="cart-drawer-items" id="ff-cart-items-container"></div>
        <div class="cart-drawer-footer" id="ff-cart-footer"></div>
      </aside>
    `;
    document.body.appendChild(root);

    document.getElementById('ff-cart-overlay').addEventListener('click', FF.closeCartDrawer);
    document.getElementById('ff-cart-close').addEventListener('click', FF.closeCartDrawer);

    FF.renderCartDrawer();
  };

  FF.openCartDrawer = function() {
    FF.initCartDrawer();
    FF.renderCartDrawer();
    document.getElementById('ff-cart-overlay')?.classList.add('active');
    document.getElementById('ff-cart-drawer')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  FF.closeCartDrawer = function() {
    document.getElementById('ff-cart-overlay')?.classList.remove('active');
    document.getElementById('ff-cart-drawer')?.classList.remove('active');
    document.body.style.overflow = '';
  };

  FF.renderCartDrawer = function() {
    const itemsContainer = document.getElementById('ff-cart-items-container');
    const footerContainer = document.getElementById('ff-cart-footer');
    if (!itemsContainer || !footerContainer) return;

    const cart = FF.getCart();
    const { subtotal, deliveryFee, total, totalItems, amountToFreeDelivery } = FF.calculateCartTotals();

    if (!cart.length) {
      itemsContainer.innerHTML = `
        <div class="empty-state-box" style="margin: auto 0; border: none;">
          <span class="empty-state-icon">🛍️</span>
          <h3>Your cart is empty</h3>
          <p>Add some delicious meals from the menu!</p>
          <button class="btn btn-primary btn-sm" onclick="FoodFlow.closeCartDrawer()">Explore Menu</button>
        </div>
      `;
      footerContainer.innerHTML = '';
      return;
    }

    itemsContainer.innerHTML = cart.map(item => `
      <div class="cart-item-row">
        <img src="${item.image_url}" alt="${item.name}" style="width: 54px; height: 54px; object-fit: cover; border-radius: 8px;" onerror="this.src='https://placehold.co/100x100?text=Food'">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p class="cart-item-unit-price">₹${item.price} each</p>
        </div>
        <div class="cart-quantity-stepper">
          <button type="button" class="qty-step-btn" onclick="FoodFlow.updateCartQuantity('${item.id || item.name}', -1)" aria-label="Decrease quantity">−</button>
          <span class="qty-val-display">${item.quantity}</span>
          <button type="button" class="qty-step-btn" onclick="FoodFlow.updateCartQuantity('${item.id || item.name}', 1)" aria-label="Increase quantity">+</button>
        </div>
        <div class="cart-item-total">₹${item.price * item.quantity}</div>
      </div>
    `).join('');

    const freeDeliveryHint = amountToFreeDelivery > 0
      ? `<div class="delivery-progress-hint">Add <strong>₹${amountToFreeDelivery}</strong> more for <strong>FREE Delivery!</strong> 🚚</div>`
      : `<div class="delivery-progress-hint" style="background: var(--success-light); border-color: var(--success); color: var(--veg-green);">🎉 You've unlocked <strong>FREE Delivery!</strong></div>`;

    footerContainer.innerHTML = `
      ${freeDeliveryHint}
      <div class="cart-bill-summary">
        <div class="bill-row">
          <span>Subtotal (${totalItems} items)</span>
          <span>₹${subtotal}</span>
        </div>
        <div class="bill-row">
          <span>Delivery Fee</span>
          <span>${deliveryFee === 0 ? '<span class="free-delivery-badge">FREE</span>' : `₹${deliveryFee}`}</span>
        </div>
        <div class="bill-row total-row">
          <span>To Pay</span>
          <span>₹${total}</span>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="FoodFlow.clearCart()">Clear</button>
        <a href="checkout.html" class="btn btn-primary btn-block" style="font-weight: 700;">Proceed to Checkout →</a>
      </div>
    `;
  };

  FF.updateNavCartCount = function() {
    const { totalItems } = FF.calculateCartTotals();
    document.querySelectorAll('.cart-badge-count, #cart-count').forEach(el => {
      el.textContent = totalItems;
    });
  };

  // ------------------------------------------------------------------------
  // 5. Authentication & Navigation State Management
  // ------------------------------------------------------------------------
  FF.getCurrentUser = async function() {
    const client = FF.getClient();
    if (!client) return null;
    try {
      const { data: { user } } = await client.auth.getUser();
      return user;
    } catch (err) {
      console.warn('Auth check error:', err);
      return null;
    }
  };

  FF.getUserProfile = async function(userId) {
    const client = FF.getClient();
    if (!client || !userId) return null;
    try {
      const { data: profile } = await client.from('profiles').select('*').eq('id', userId).single();
      return profile;
    } catch (err) {
      return null;
    }
  };

  FF.logout = async function() {
    const client = FF.getClient();
    if (client) {
      await client.auth.signOut();
      FF.showToast('Logged out successfully', 'info');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 500);
    }
  };

  FF.initGlobalNav = async function() {
    FF.initCartDrawer();
    FF.updateNavCartCount();

    // Hook up Cart toggle buttons on page
    document.querySelectorAll('.cart-toggle-btn, [href="#cart-section"], .open-cart-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        FF.openCartDrawer();
      });
    });

    // Check user authentication
    const user = await FF.getCurrentUser();
    const authNavContainer = document.getElementById('nav-auth-links');
    const adminNavContainer = document.getElementById('nav-admin-link');

    if (user) {
      const profile = await FF.getUserProfile(user.id);
      const isAdmin = profile?.role === 'admin';
      const displayName = profile?.full_name || user.email?.split('@')[0] || 'Foodie';
      const initials = displayName.substring(0, 2).toUpperCase();

      if (adminNavContainer && isAdmin) {
        adminNavContainer.innerHTML = `
          <a href="admin.html" class="nav-link admin-badge-link" aria-label="Admin Dashboard">
            <span>⚙️ Admin Panel</span>
          </a>
        `;
      }

      if (authNavContainer) {
        authNavContainer.innerHTML = `
          <a href="orders.html" class="nav-link">My Orders</a>
          <a href="profile.html" class="user-profile-chip" aria-label="My Profile">
            <span class="user-avatar-initials">${initials}</span>
            <span>${displayName.split(' ')[0]}</span>
          </a>
          <button type="button" class="nav-link" id="nav-logout-btn" title="Sign out" style="color: #fca5a5;">
            <span>🚪</span>
          </button>
        `;
        document.getElementById('nav-logout-btn')?.addEventListener('click', FF.logout);
      }
    } else {
      if (authNavContainer) {
        authNavContainer.innerHTML = `
          <a href="orders.html" class="nav-link">My Orders</a>
          <a href="login.html" class="btn btn-secondary btn-sm btn-pill" style="color: var(--primary); font-weight: 700;">Sign In</a>
        `;
      }
    }

    // Mobile nav toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');
    if (mobileToggle && mainNav) {
      mobileToggle.addEventListener('click', () => {
        mainNav.classList.toggle('mobile-active');
      });
    }
  };

  // ------------------------------------------------------------------------
  // 6. Favorites System (Persistent with Supabase / Fallback to LocalStorage)
  // ------------------------------------------------------------------------
  const FAV_KEY = 'foodFlow_favorites';

  FF.getFavorites = async function() {
    const user = await FF.getCurrentUser();
    const client = FF.getClient();

    if (user && client) {
      try {
        const { data: favs } = await client.from('favorites').select('food_id').eq('user_id', user.id);
        if (favs) {
          const ids = favs.map(f => f.food_id);
          localStorage.setItem(FAV_KEY, JSON.stringify(ids));
          return ids;
        }
      } catch (e) {
        console.warn('Could not fetch Supabase favorites:', e);
      }
    }

    try {
      return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
    } catch {
      return [];
    }
  };

  FF.toggleFavorite = async function(foodId, foodName = 'Food Item') {
    const user = await FF.getCurrentUser();
    const client = FF.getClient();
    let favs = JSON.parse(localStorage.getItem(FAV_KEY)) || [];
    const isFav = favs.includes(foodId);

    if (isFav) {
      favs = favs.filter(id => id !== foodId);
      FF.showToast(`Removed ${foodName} from favorites`, 'info');
      if (user && client) {
        await client.from('favorites').delete().match({ user_id: user.id, food_id: foodId });
      }
    } else {
      favs.push(foodId);
      FF.showToast(`Saved ${foodName} to favorites! ❤️`, 'success');
      if (user && client) {
        await client.from('favorites').insert({ user_id: user.id, food_id: foodId });
      }
    }

    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    window.dispatchEvent(new CustomEvent('foodflow:favorites-updated', { detail: { favorites: favs } }));
    return !isFav;
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', FF.initGlobalNav);
  } else {
    FF.initGlobalNav();
  }

})();
