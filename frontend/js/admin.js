const backendURL = "http://127.0.0.1:8003";
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

  const fromSelect = document.getElementById("from");
  data.from.forEach(user => {
    const option = document.createElement("option");
    option.value = user.email;
    option.textContent = user.name;
    fromSelect.appendChild(option);
  });

  const toSelect = document.getElementById("to");
  data.to.forEach(user => {
    const option = document.createElement("option");
    option.value = user.email;
    option.textContent = user.name;
    toSelect.appendChild(option);
  });

  ["cc","bcc"].forEach(field => {
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

  const to = Array.from(document.getElementById("to").selectedOptions).map(o => o.value).join(",");
  const from_ = document.getElementById("from").value;
  const cc = Array.from(document.getElementById("cc").selectedOptions).map(o => o.value).join(",");
  const bcc = Array.from(document.getElementById("bcc").selectedOptions).map(o => o.value).join(",");
  const subject = document.getElementById("subject").value;
  const body = document.getElementById("body").value;

  try {
    const res = await fetch(`${backendURL}/letters`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwtToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ to, from_, cc, bcc, subject, body })
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
