const backendURL = "/api";
let jwtToken = null;

// --- LOGIN ---
const loginForm = document.getElementById("loginForm");
const loginContainer = document.getElementById("loginContainer");
const letterContainer = document.getElementById("letterContainer");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("hidden");

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch(`${backendURL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password })
    });

    if (res.ok) {
      const data = await res.json();
      jwtToken = data.access_token;
      loginContainer.classList.add("hidden");
      letterContainer.classList.remove("hidden");
      loadUsers();
    } else {
      loginError.classList.remove("hidden");
    }
  } catch (err) {
    loginError.classList.remove("hidden");
  }
});

// --- LOAD USERS ---
async function loadUsers() {
  const res = await fetch(`${backendURL}/users`);
  const data = await res.json();

  // Populate From
  const fromSelect = document.getElementById("from");
  data.from.forEach(user => {
    const option = document.createElement("option");
    option.value = user.email;
    option.textContent = user.name;
    fromSelect.appendChild(option);
  });

  // Populate To, CC, BCC
  ["to", "cc", "bcc"].forEach(field => {
    const select = document.getElementById(field);
    data.to.forEach(user => {
      const option = document.createElement("option");
      option.value = user.email;
      option.textContent = user.name;
      select.appendChild(option);
    });
  });
}

// --- POST LETTER ---
const letterForm = document.getElementById("letterForm");
const successMsg = document.getElementById("successMsg");
const errorMsg = document.getElementById("errorMsg");

letterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  successMsg.classList.add("hidden");
  errorMsg.classList.add("hidden");

  // Convert selected options to array
  const getSelectedValues = (id) => Array.from(document.getElementById(id).selectedOptions).map(o => o.value);

  const to = getSelectedValues("to");
  const from = document.getElementById("from").value;
  const cc = getSelectedValues("cc");
  const bcc = getSelectedValues("bcc");
  const subject = document.getElementById("subject").value;
  const body = document.getElementById("body").value;

  try {
    const res = await fetch(`${backendURL}/letters`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwtToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ to, from, cc, bcc, subject, body })
    });

    if (res.ok) {
      successMsg.classList.remove("hidden");
      letterForm.reset();
    } else {
      errorMsg.classList.remove("hidden");
    }
  } catch (err) {
    errorMsg.classList.remove("hidden");
  }
});
