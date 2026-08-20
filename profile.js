/**
 * FoodFlow — Customer Profile & Favorites Logic
 */

const client = window.FoodFlow.getClient();

// DOM Elements
const profileAvatar = document.getElementById('profile-avatar');
const profileDisplayName = document.getElementById('profile-display-name');
const profileDisplayEmail = document.getElementById('profile-display-email');
const statTotalOrders = document.getElementById('stat-total-orders');
const statTotalSpent = document.getElementById('stat-total-spent');
const statMemberSince = document.getElementById('stat-member-since');
const profileForm = document.getElementById('profile-form');
const profileNameInput = document.getElementById('profile-name');
const profileEmailInput = document.getElementById('profile-email');
const profilePhoneInput = document.getElementById('profile-phone');
const profileAddressInput = document.getElementById('profile-address');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileLogoutBtn = document.getElementById('profile-logout-btn');
const favoritesList = document.getElementById('profile-favorites-list');

let currentUser = null;

async function initProfile() {
  if (!client) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = await window.FoodFlow.getCurrentUser();
  if (!currentUser) {
    window.location.href = 'login.html?redirect=profile.html';
    return;
  }

  // Set email
  profileEmailInput.value = currentUser.email || '';
  profileDisplayEmail.textContent = currentUser.email || '';

  // Load profile data
  const profile = await window.FoodFlow.getUserProfile(currentUser.id);
  const name = profile?.full_name || currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
  
  profileNameInput.value = name;
  profileDisplayName.textContent = name;
  profileAvatar.textContent = name.substring(0, 2).toUpperCase();
  profilePhoneInput.value = profile?.phone || currentUser.user_metadata?.phone || '';
  profileAddressInput.value = profile?.address || '';

  // Member since date
  const joinedDate = new Date(profile?.created_at || currentUser.created_at);
  statMemberSince.textContent = `Member since: ${joinedDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`;

  // Load user order stats
  loadOrderStats();

  // Load user favorites
  loadFavorites();
}

async function loadOrderStats() {
  try {
    const { data: orders, error } = await client
      .from('orders')
      .select('total_amount, status')
      .eq('user_id', currentUser.id);

    if (!error && orders) {
      statTotalOrders.textContent = orders.length;
      const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      statTotalSpent.textContent = `₹${totalSpent}`;
    }
  } catch (err) {
    console.warn('Could not load customer stats:', err);
  }
}

async function loadFavorites() {
  if (!favoritesList) return;
  favoritesList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Loading your favorites...</p>';

  try {
    const favIds = await window.FoodFlow.getFavorites();

    if (!favIds || !favIds.length) {
      favoritesList.innerHTML = `
        <div class="empty-state-box" style="grid-column: 1 / -1; padding: 2rem 1rem;">
          <span class="empty-state-icon" style="font-size: 2rem;">🤍</span>
          <h4>No favorites saved yet</h4>
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">Browse our menu and tap the heart icon on dishes you love!</p>
          <a href="index.html" class="btn btn-secondary btn-sm">Explore Menu</a>
        </div>
      `;
      return;
    }

    const { data: foods, error } = await client
      .from('food_items')
      .select('*')
      .in('id', favIds);

    if (error || !foods || !foods.length) {
      favoritesList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No favorite items found.</p>';
      return;
    }

    favoritesList.replaceChildren();
    foods.forEach(food => {
      const card = document.createElement('article');
      card.className = 'food-card';
      card.innerHTML = `
        <div class="food-card-media">
          <img src="${food.image_url}" alt="${food.name}" onerror="this.src='https://placehold.co/200x150?text=Food'">
          <button type="button" class="favorite-btn active" onclick="removeFavoriteFromProfile(event, '${food.id}', '${food.name.replace(/'/g, "\\'")}')" aria-label="Remove from favorites">
            ❤️
          </button>
        </div>
        <div class="food-card-body" style="padding: 0.9rem;">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.25rem;">${food.name}</h4>
          <span style="color: var(--accent); font-weight: 700; font-size: 0.95rem;">₹${food.price}</span>
        </div>
        <div class="food-card-footer" style="padding: 0 0.9rem 0.9rem;">
          <button type="button" class="btn btn-primary btn-sm btn-block" onclick="addFavoriteToCart(event, '${food.id}')">
            <span>🛒</span> Add to Cart
          </button>
        </div>
      `;
      favoritesList.appendChild(card);
    });
  } catch (err) {
    console.warn('Could not load favorites:', err);
    favoritesList.innerHTML = '<p style="color: var(--text-muted);">Could not load favorites.</p>';
  }
}

window.removeFavoriteFromProfile = async function(event, foodId, foodName) {
  event.stopPropagation();
  await window.FoodFlow.toggleFavorite(foodId, foodName);
  loadFavorites();
};

window.addFavoriteToCart = async function(event, foodId) {
  event.stopPropagation();
  const { data: food } = await client.from('food_items').select('*').eq('id', foodId).single();
  if (food) {
    window.FoodFlow.addToCart(food, 1);
  }
};

// Handle profile update
profileForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const full_name = profileNameInput.value.trim();
  const phone = profilePhoneInput.value.trim();
  const address = profileAddressInput.value.trim();

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = 'Saving Changes...';

  try {
    const { error } = await client
      .from('profiles')
      .upsert({
        id: currentUser.id,
        full_name,
        phone,
        address
      });

    if (error) throw error;

    // Update metadata as well
    await client.auth.updateUser({
      data: { full_name, phone, address }
    });

    profileDisplayName.textContent = full_name;
    profileAvatar.textContent = full_name.substring(0, 2).toUpperCase();

    window.FoodFlow.showToast('Profile updated successfully! ✅', 'success');
  } catch (err) {
    window.FoodFlow.showToast(`Failed to update profile: ${err.message}`, 'error');
  } finally {
    saveProfileBtn.disabled = false;
    saveProfileBtn.textContent = 'Save Profile Changes';
  }
});

profileLogoutBtn?.addEventListener('click', () => {
  window.FoodFlow.logout();
});

initProfile();
