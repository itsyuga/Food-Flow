/**
 * FoodFlow — Checkout Logic & Order Placement
 */

const client = window.FoodFlow.getClient();

// DOM Elements
const checkoutMainGrid = document.getElementById('checkout-main-grid');
const checkoutEmptyNotice = document.getElementById('checkout-empty-notice');
const checkoutForm = document.getElementById('checkout-form');
const customerNameInput = document.getElementById('customer-name');
const customerPhoneInput = document.getElementById('customer-phone');
const customerAddressInput = document.getElementById('customer-address');
const orderNotesInput = document.getElementById('order-notes');
const placeOrderBtn = document.getElementById('place-order-btn');
const btnTotalAmount = document.getElementById('btn-total-amount');
const checkoutItemsList = document.getElementById('checkout-items-list');
const checkoutSubtotal = document.getElementById('checkout-subtotal');
const checkoutDeliveryFee = document.getElementById('checkout-delivery-fee');
const checkoutGrandTotal = document.getElementById('checkout-grand-total');
const errorBox = document.getElementById('checkout-error-box');
const mockUpiDetails = document.getElementById('mock-upi-details');
const optCod = document.getElementById('opt-cod');
const optUpi = document.getElementById('opt-upi');

let currentUser = null;

async function initCheckout() {
  const cart = window.FoodFlow.getCart();

  if (!cart.length) {
    checkoutMainGrid.style.display = 'none';
    checkoutEmptyNotice.style.display = 'block';
    return;
  }

  // Render Order Summary
  renderOrderSummary();

  // Check Authentication & Preload Profile
  currentUser = await window.FoodFlow.getCurrentUser();
  if (!currentUser) {
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }

  const profile = await window.FoodFlow.getUserProfile(currentUser.id);
  const fullName = profile?.full_name || currentUser.user_metadata?.full_name || '';
  const phone = profile?.phone || currentUser.user_metadata?.phone || '';
  const address = profile?.address || '';

  if (fullName && !customerNameInput.value) customerNameInput.value = fullName;
  if (phone && !customerPhoneInput.value) customerPhoneInput.value = phone;
  if (address && !customerAddressInput.value) customerAddressInput.value = address;
}

function renderOrderSummary() {
  const cart = window.FoodFlow.getCart();
  const { subtotal, deliveryFee, total } = window.FoodFlow.calculateCartTotals();

  checkoutItemsList.replaceChildren();
  cart.forEach(item => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.fontSize = '0.9rem';

    row.innerHTML = `
      <div style="flex: 1;">
        <span style="font-weight: 600;">${item.name}</span>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">Qty: ${item.quantity} × ₹${item.price}</div>
      </div>
      <span style="font-weight: 700; color: var(--text-primary);">₹${item.price * item.quantity}</span>
    `;
    checkoutItemsList.appendChild(row);
  });

  checkoutSubtotal.textContent = `₹${subtotal}`;
  checkoutDeliveryFee.innerHTML = deliveryFee === 0
    ? '<span class="free-delivery-badge">FREE</span>'
    : `₹${deliveryFee}`;
  checkoutGrandTotal.textContent = `₹${total}`;
  btnTotalAmount.textContent = total;
}

// Payment method selection listeners
document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const isUpi = e.target.value === 'UPI';
    mockUpiDetails.style.display = isUpi ? 'block' : 'none';
    optCod.classList.toggle('selected', !isUpi);
    optUpi.classList.toggle('selected', isUpi);
  });
});

// Checkout Form Submission
checkoutForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';

  const cart = window.FoodFlow.getCart();
  if (!cart.length) {
    showError('Your cart is empty.');
    return;
  }

  currentUser = await window.FoodFlow.getCurrentUser();
  if (!currentUser) {
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }

  const customer_name = customerNameInput.value.trim();
  const phone = customerPhoneInput.value.trim();
  let address = customerAddressInput.value.trim();
  const notes = orderNotesInput.value.trim();
  if (notes) {
    address = `${address} (Note: ${notes})`;
  }

  const payment_method = document.querySelector('input[name="payment_method"]:checked')?.value || 'Cash on Delivery';

  // Validation
  if (!customer_name || !phone || !address) {
    showError('Please complete all required fields (Name, Phone, Delivery Address).');
    return;
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
    showError('Please enter a valid 10-digit mobile phone number.');
    return;
  }

  const { subtotal, deliveryFee, total } = window.FoodFlow.calculateCartTotals();

  placeOrderBtn.disabled = true;
  placeOrderBtn.textContent = 'Processing Order... 🍲';

  try {
    // 1. Insert into orders table
    const { data: order, error: orderError } = await client
      .from('orders')
      .insert({
        user_id: currentUser.id,
        customer_name,
        phone,
        address,
        payment_method,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: total,
        status: 'Order Placed'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Insert into order_items table
    const orderItemsPayload = cart.map(item => ({
      order_id: order.id,
      food_name: item.name,
      unit_price: Number(item.price),
      quantity: Number(item.quantity)
    }));

    const { error: itemsError } = await client
      .from('order_items')
      .insert(orderItemsPayload);

    if (itemsError) {
      console.warn('Order items insert error:', itemsError);
    }

    // 3. Save profile address & phone if empty
    await client.from('profiles').upsert({
      id: currentUser.id,
      full_name: customer_name,
      phone,
      address: customerAddressInput.value.trim()
    });

    // 4. Clear cart & redirect
    window.FoodFlow.saveCart([]);
    window.FoodFlow.showToast('Order placed successfully! 🚀', 'success', 4000);

    setTimeout(() => {
      window.location.href = 'orders.html';
    }, 800);

  } catch (err) {
    showError(`Could not place order: ${err.message || 'Please check your connection and try again.'}`);
    placeOrderBtn.disabled = false;
    placeOrderBtn.innerHTML = `Place Order • ₹<span id="btn-total-amount">${total}</span>`;
  }
});

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

initCheckout();
