/**
 * FoodFlow — Homepage & Menu Discovery Logic
 */

let allFoodItems = [];
let activeCategory = 'all';
let isVegOnly = false;
let currentSort = 'default';
let activeModalFood = null;
let modalQuantity = 1;
let userFavorites = [];

// Fallback seed items in case Supabase is empty or connecting
const DEFAULT_FALLBACK_ITEMS = [
  {
    id: 'f1',
    name: 'Royal Chicken Biryani',
    description: 'Aromatic basmati rice cooked with tender spiced chicken, saffron, and caramelised onions served with raita.',
    price: 240,
    category: 'rice',
    image_url: 'https://images.unsplash.com/photo-1631515242808-497c3fbd3972?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    rating: 4.8,
    is_available: true
  },
  {
    id: 'f2',
    name: 'Hyderabadi Veg Biryani',
    description: 'Fragrant basmati rice layered with fresh seasonal vegetables, paneer cubes, mint, and whole spices.',
    price: 180,
    category: 'rice',
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    rating: 4.6,
    is_available: true
  },
  {
    id: 'f3',
    name: 'Paneer Tikka Pizza',
    description: 'Hand-stretched dough topped with smoky tandoori paneer, crisp bell peppers, red onions, and melted mozzarella.',
    price: 280,
    category: 'pizza',
    image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    rating: 4.7,
    is_available: true
  },
  {
    id: 'f4',
    name: 'Classic Margherita Pizza',
    description: 'Rich San Marzano tomato sauce, fresh buffalo mozzarella, fragrant basil leaves, and extra virgin olive oil.',
    price: 230,
    category: 'pizza',
    image_url: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    rating: 4.5,
    is_available: true
  },
  {
    id: 'f5',
    name: 'Crispy Veg Burger',
    description: 'Golden spiced potato & corn patty with crisp lettuce, pickled gherkins, sliced tomatoes, and house herb mayo.',
    price: 140,
    category: 'burger',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    rating: 4.4,
    is_available: true
  },
  {
    id: 'f6',
    name: 'Grilled BBQ Chicken Burger',
    description: 'Juicy flame-grilled chicken breast glazed with smoky BBQ sauce, aged cheddar cheese, and fresh coleslaw.',
    price: 210,
    category: 'burger',
    image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    is_veg: false,
    rating: 4.7,
    is_available: true
  },
  {
    id: 'f7',
    name: 'Loaded Peri Peri Fries',
    description: 'Golden crispy skin-on potato fries dusted with tangy African peri-peri spices and served with cheese dip.',
    price: 120,
    category: 'snacks',
    image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    rating: 4.6,
    is_available: true
  },
  {
    id: 'f8',
    name: 'Fresh Mango Lassi',
    description: 'Thick creamy churned yogurt blended with sweet Alphonso mango pulp and a pinch of green cardamom.',
    price: 90,
    category: 'beverages',
    image_url: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    rating: 4.8,
    is_available: true
  },
  {
    id: 'f9',
    name: 'Belgian Chocolate Brownie',
    description: 'Warm fudgy dark chocolate brownie packed with toasted walnuts and drizzled with Belgian chocolate ganache.',
    price: 130,
    category: 'desserts',
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
    is_veg: true,
    rating: 4.9,
    is_available: true
  }
];

// DOM Elements
const foodList = document.getElementById('food-list');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const vegOnlyBtn = document.getElementById('veg-only-btn');
const sortSelect = document.getElementById('sort-select');
const menuCountText = document.getElementById('menu-count-text');
const categoryChips = document.querySelectorAll('.category-chip');

// Modal Elements
const foodModal = document.getElementById('food-detail-modal');
const modalCloseBtn = document.getElementById('food-modal-close');
const modalFoodImg = document.getElementById('modal-food-img');
const modalDietaryBadge = document.getElementById('modal-dietary-badge');
const modalFoodCategory = document.getElementById('modal-food-category');
const modalFoodTitle = document.getElementById('modal-food-title');
const modalFoodRating = document.getElementById('modal-food-rating');
const modalFoodDesc = document.getElementById('modal-food-desc');
const modalFoodPrice = document.getElementById('modal-food-price');
const modalQtyDisplay = document.getElementById('modal-qty-display');
const modalQtyMinus = document.getElementById('modal-qty-minus');
const modalQtyPlus = document.getElementById('modal-qty-plus');
const modalAddToCartBtn = document.getElementById('modal-add-to-cart-btn');

// Fetch food items from Supabase
async function loadFoodItems() {
  const client = window.FoodFlow.getClient();
  userFavorites = await window.FoodFlow.getFavorites();

  if (client) {
    try {
      const { data, error } = await client
        .from('food_items')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        allFoodItems = data.map(item => ({
          ...item,
          is_veg: item.is_veg !== undefined ? item.is_veg : true,
          rating: item.rating ? Number(item.rating) : 4.5,
          is_available: item.is_available !== undefined ? item.is_available : true,
          description: item.description || 'Prepared fresh with premium ingredients and our signature seasoning blend.'
        }));
      } else {
        allFoodItems = DEFAULT_FALLBACK_ITEMS;
      }
    } catch (e) {
      console.warn('Supabase fetch failed, using fallback seed items:', e);
      allFoodItems = DEFAULT_FALLBACK_ITEMS;
    }
  } else {
    allFoodItems = DEFAULT_FALLBACK_ITEMS;
  }

  renderMenu();
}

// Render filtered and sorted food items
function renderMenu() {
  foodList.replaceChildren();

  const searchQuery = searchInput.value.toLowerCase().trim();

  let filtered = allFoodItems.filter(item => {
    // Category match
    const categoryMatch = activeCategory === 'all' || item.category === activeCategory;
    
    // Veg match
    const vegMatch = !isVegOnly || item.is_veg === true;

    // Search query match
    const nameMatch = item.name.toLowerCase().includes(searchQuery);
    const descMatch = item.description ? item.description.toLowerCase().includes(searchQuery) : false;
    const searchMatch = !searchQuery || nameMatch || descMatch;

    return categoryMatch && vegMatch && searchMatch;
  });

  // Apply sorting
  if (currentSort === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (currentSort === 'rating-desc') {
    filtered.sort((a, b) => (b.rating || 4.5) - (a.rating || 4.5));
  } else if (currentSort === 'name-asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Update item counter
  menuCountText.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'dish' : 'dishes'}`;

  // Empty state
  if (!filtered.length) {
    foodList.innerHTML = `
      <div class="empty-state-box" style="grid-column: 1 / -1;">
        <span class="empty-state-icon">🔍</span>
        <h3>No dishes found</h3>
        <p>We couldn't find any dishes matching your filters. Try clearing your search or filters.</p>
        <button type="button" class="btn btn-secondary btn-sm" onclick="resetFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  // Render cards
  filtered.forEach(food => {
    const isFav = userFavorites.includes(food.id);
    const card = document.createElement('article');
    card.className = 'food-card';
    card.setAttribute('aria-label', food.name);

    const dietaryIcon = food.is_veg
      ? '<span class="dietary-icon-veg" title="Pure Vegetarian"></span>'
      : '<span class="dietary-icon-nonveg" title="Non-Vegetarian"></span>';

    card.innerHTML = `
      <div class="food-card-media" onclick="openFoodModal('${food.id}')">
        <img src="${food.image_url}" alt="${food.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'">
        <div class="food-badge-container">
          <div class="dietary-badge">${dietaryIcon}</div>
          <span class="category-tag-badge">${food.category}</span>
        </div>
        <button type="button" class="favorite-btn ${isFav ? 'active' : ''}" onclick="handleFavoriteClick(event, '${food.id}', '${food.name.replace(/'/g, "\\'")}')" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
          ${isFav ? '❤️' : '🤍'}
        </button>
      </div>

      <div class="food-card-body" onclick="openFoodModal('${food.id}')">
        <div class="food-meta-row">
          <span class="food-rating-pill">⭐ ${food.rating || 4.5}</span>
        </div>
        <h3 class="food-card-title">${food.name}</h3>
        <p class="food-card-desc">${food.description || ''}</p>
      </div>

      <div class="food-card-footer">
        <span class="food-price-tag">₹${food.price}</span>
        ${food.is_available !== false 
          ? `<button type="button" class="add-to-cart-btn" onclick="handleAddToCartClick(event, '${food.id}')">
               <span>+</span> Add
             </button>`
          : `<span class="out-of-stock-badge">Sold Out</span>`
        }
      </div>
    `;

    foodList.appendChild(card);
  });
}

// Favorite click handler
window.handleFavoriteClick = async function(event, foodId, foodName) {
  event.stopPropagation();
  const btn = event.currentTarget;
  const isNowFav = await window.FoodFlow.toggleFavorite(foodId, foodName);
  btn.classList.toggle('active', isNowFav);
  btn.innerHTML = isNowFav ? '❤️' : '🤍';
  userFavorites = await window.FoodFlow.getFavorites();
};

// Add to cart click handler
window.handleAddToCartClick = function(event, foodId) {
  event.stopPropagation();
  const food = allFoodItems.find(item => item.id === foodId);
  if (food) {
    window.FoodFlow.addToCart(food, 1);
  }
};

// Food Detail Modal
window.openFoodModal = function(foodId) {
  const food = allFoodItems.find(item => item.id === foodId);
  if (!food) return;

  activeModalFood = food;
  modalQuantity = 1;

  modalFoodImg.src = food.image_url;
  modalFoodImg.alt = food.name;
  modalFoodTitle.textContent = food.name;
  modalFoodDesc.textContent = food.description || 'Freshly made to order using premium quality ingredients.';
  modalFoodPrice.textContent = `₹${food.price}`;
  modalFoodCategory.textContent = food.category;
  modalFoodRating.textContent = `⭐ ${food.rating || 4.5}`;
  modalQtyDisplay.textContent = '1';

  modalDietaryBadge.innerHTML = food.is_veg
    ? '<span class="dietary-icon-veg" title="Pure Vegetarian"></span>'
    : '<span class="dietary-icon-nonveg" title="Non-Vegetarian"></span>';

  if (food.is_available === false) {
    modalAddToCartBtn.disabled = true;
    modalAddToCartBtn.textContent = 'Sold Out';
  } else {
    modalAddToCartBtn.disabled = false;
    modalAddToCartBtn.innerHTML = `<span>🛒</span> Add to Cart • ₹${food.price}`;
  }

  foodModal.classList.add('active');
  foodModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
};

function closeFoodModal() {
  foodModal.classList.remove('active');
  foodModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  activeModalFood = null;
}

modalCloseBtn?.addEventListener('click', closeFoodModal);
foodModal?.addEventListener('click', (e) => {
  if (e.target === foodModal) closeFoodModal();
});

modalQtyMinus?.addEventListener('click', () => {
  if (modalQuantity > 1) {
    modalQuantity -= 1;
    modalQtyDisplay.textContent = modalQuantity;
    if (activeModalFood) {
      modalAddToCartBtn.innerHTML = `<span>🛒</span> Add to Cart • ₹${activeModalFood.price * modalQuantity}`;
    }
  }
});

modalQtyPlus?.addEventListener('click', () => {
  modalQuantity += 1;
  modalQtyDisplay.textContent = modalQuantity;
  if (activeModalFood) {
    modalAddToCartBtn.innerHTML = `<span>🛒</span> Add to Cart • ₹${activeModalFood.price * modalQuantity}`;
  }
});

modalAddToCartBtn?.addEventListener('click', () => {
  if (activeModalFood) {
    window.FoodFlow.addToCart(activeModalFood, modalQuantity);
    closeFoodModal();
  }
});

// Category pills selection
categoryChips.forEach(chip => {
  chip.addEventListener('click', () => {
    categoryChips.forEach(c => {
      c.classList.remove('active');
      c.setAttribute('aria-selected', 'false');
    });
    chip.classList.add('active');
    chip.setAttribute('aria-selected', 'true');
    activeCategory = chip.dataset.category;
    renderMenu();
  });
});

// Pure Veg toggle
vegOnlyBtn?.addEventListener('click', () => {
  isVegOnly = !isVegOnly;
  vegOnlyBtn.classList.toggle('active', isVegOnly);
  vegOnlyBtn.setAttribute('aria-pressed', isVegOnly.toString());
  renderMenu();
});

// Sort select
sortSelect?.addEventListener('change', (e) => {
  currentSort = e.target.value;
  renderMenu();
});

// Search input
searchInput?.addEventListener('input', (e) => {
  const hasValue = e.target.value.length > 0;
  searchClearBtn.style.display = hasValue ? 'block' : 'none';
  renderMenu();
});

searchClearBtn?.addEventListener('click', () => {
  searchInput.value = '';
  searchClearBtn.style.display = 'none';
  renderMenu();
  searchInput.focus();
});

// Reset all filters
window.resetFilters = function() {
  activeCategory = 'all';
  isVegOnly = false;
  currentSort = 'default';
  searchInput.value = '';
  searchClearBtn.style.display = 'none';
  vegOnlyBtn.classList.remove('active');
  vegOnlyBtn.setAttribute('aria-pressed', 'false');
  sortSelect.value = 'default';

  categoryChips.forEach(c => {
    c.classList.toggle('active', c.dataset.category === 'all');
    c.setAttribute('aria-selected', (c.dataset.category === 'all').toString());
  });

  renderMenu();
};

// Listen for global favorites update
window.addEventListener('foodflow:favorites-updated', async (e) => {
  userFavorites = e.detail.favorites || [];
  renderMenu();
});

// Keyboard ESC to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && foodModal?.classList.contains('active')) {
    closeFoodModal();
  }
});

// Initialize on page load
loadFoodItems();
