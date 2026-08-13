const client = window.foodFlowSupabase;
const form = document.getElementById("auth-form");
const message = document.getElementById("auth-message");
const toggle = document.getElementById("auth-toggle");
let signUpMode = false;

async function redirectIfSignedIn() {
  const { data: { session } } = await client.auth.getSession();
  if (session) window.location.replace("index.html");
}

function setMode() {
  document.getElementById("auth-title").textContent = signUpMode ? "Create your account" : "Sign in";
  document.getElementById("auth-copy").textContent = signUpMode ? "Create an account to place and track your orders." : "Sign in to place and track your orders.";
  document.getElementById("auth-submit").textContent = signUpMode ? "Create account" : "Sign in";
  document.getElementById("name-label").hidden = !signUpMode;
  document.getElementById("full-name").hidden = !signUpMode;
  document.getElementById("full-name").required = signUpMode;
  toggle.textContent = signUpMode ? "Already have an account? Sign in" : "New here? Create an account";
  message.textContent = "";
}

toggle.addEventListener("click", () => { signUpMode = !signUpMode; setMode(); });
form.addEventListener("submit", async (event) => {
  event.preventDefault(); message.textContent = "";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const fullName = document.getElementById("full-name").value.trim();
  const result = signUpMode
    ? await client.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
    : await client.auth.signInWithPassword({ email, password });
  if (result.error) { message.textContent = result.error.message; return; }
  if (signUpMode && !result.data.session) { message.textContent = "Account created. Check your email to confirm it, then sign in."; return; }
  window.location.href = "index.html";
});
redirectIfSignedIn();
