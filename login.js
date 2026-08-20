/**
 * FoodFlow — Authentication Logic (Sign In & Sign Up)
 */

const client = window.FoodFlow.getClient();
let isSignUpMode = false;

// DOM Elements
const authForm = document.getElementById('auth-form');
const tabSignIn = document.getElementById('tab-signin');
const tabSignUp = document.getElementById('tab-signup');
const nameGroup = document.getElementById('name-group');
const phoneGroup = document.getElementById('phone-group');
const fullNameInput = document.getElementById('full-name');
const phoneInput = document.getElementById('auth-phone');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const passwordToggleBtn = document.getElementById('password-toggle-btn');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authHeading = document.getElementById('auth-main-heading');
const authSubHeading = document.getElementById('auth-sub-heading');
const authSwitchPrompt = document.getElementById('auth-switch-prompt');
const authSwitchLink = document.getElementById('auth-switch-link');
const errorBox = document.getElementById('auth-error-box');

// Auto-redirect if already signed in
async function checkExistingSession() {
  if (!client) return;
  const { data: { session } } = await client.auth.getSession();
  if (session) {
    window.location.replace('index.html');
  }
}

// Switch mode (Sign In <-> Sign Up)
function setMode(signUp) {
  isSignUpMode = signUp;
  errorBox.style.display = 'none';

  if (isSignUpMode) {
    tabSignUp.classList.add('active');
    tabSignIn.classList.remove('active');
    tabSignUp.setAttribute('aria-selected', 'true');
    tabSignIn.setAttribute('aria-selected', 'false');

    nameGroup.style.display = 'flex';
    phoneGroup.style.display = 'flex';
    fullNameInput.required = true;

    authHeading.textContent = 'Create Your Account';
    authSubHeading.textContent = 'Join FoodFlow to enjoy quick delivery and delicious food.';
    authSubmitBtn.textContent = 'Create Account';
    authSwitchPrompt.textContent = 'Already have an account?';
    authSwitchLink.textContent = 'Sign In';
  } else {
    tabSignIn.classList.add('active');
    tabSignUp.classList.remove('active');
    tabSignIn.setAttribute('aria-selected', 'true');
    tabSignUp.setAttribute('aria-selected', 'false');

    nameGroup.style.display = 'none';
    phoneGroup.style.display = 'none';
    fullNameInput.required = false;

    authHeading.textContent = 'Sign In to Your Account';
    authSubHeading.textContent = 'Access your orders, saved addresses, and favorite dishes.';
    authSubmitBtn.textContent = 'Sign In';
    authSwitchPrompt.textContent = "Don't have an account?";
    authSwitchLink.textContent = 'Create an account';
  }
}

// Event Listeners
tabSignIn?.addEventListener('click', () => setMode(false));
tabSignUp?.addEventListener('click', () => setMode(true));
authSwitchLink?.addEventListener('click', () => setMode(!isSignUpMode));

// Password visibility toggle
passwordToggleBtn?.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  passwordToggleBtn.textContent = isPassword ? '🙈' : '👁️';
  passwordToggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
});

// Form Submit Handler
authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.style.display = 'none';

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const fullName = fullNameInput.value.trim();
  const phone = phoneInput.value.trim();

  // Basic validation
  if (!email || !password) {
    showError('Please enter both your email and password.');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters long.');
    return;
  }

  if (isSignUpMode && !fullName) {
    showError('Please enter your full name.');
    return;
  }

  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = isSignUpMode ? 'Creating Account...' : 'Signing In...';

  try {
    if (isSignUpMode) {
      // Sign Up Flow
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });

      if (error) throw error;

      // Also ensure profile row is created/updated directly if session exists
      if (data?.user) {
        await client.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          phone: phone,
          role: 'customer'
        });
      }

      if (data?.session) {
        window.FoodFlow.showToast('Account created successfully! Welcome to FoodFlow 🎉', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
      } else {
        // Confirmation email required
        window.FoodFlow.showToast('Account created! Please check your email to verify your account.', 'info', 6000);
        showError('Verification email sent. Please check your inbox, confirm your email, and then sign in.');
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = 'Sign In';
        setMode(false);
      }
    } else {
      // Sign In Flow
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      window.FoodFlow.showToast('Signed in successfully! Welcome back 👋', 'success');
      setTimeout(() => {
        // Check for redirect param
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || 'index.html';
        window.location.href = redirect;
      }, 800);
    }
  } catch (err) {
    showError(err.message || 'Authentication failed. Please try again.');
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
  }
});

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

checkExistingSession();
