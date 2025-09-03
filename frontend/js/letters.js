const backendURL = "/api";

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

async function loadLetter() {
  const letterId = getQueryParam("id");
  const container = document.getElementById("letterContainer");

  if (!letterId) {
    container.innerHTML = `<p class="text-red-400">No letter ID provided.</p>`;
    return;
  }

  try {
    const res = await fetch(`${backendURL}/letters`);
    const letters = await res.json();
    const letter = letters.find(l => l.id === letterId);

    if (!letter) {
      container.innerHTML = `<p class="text-red-400">Letter not found.</p>`;
      return;
    }

    // Render full letter
    const toList = Array.isArray(letter.to) ? letter.to.join(", ") : letter.to;
    const ccList = Array.isArray(letter.cc) && letter.cc.length ? letter.cc.join(", ") : "";
    const timestamp = new Date(letter.timestamp).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    container.innerHTML = `
      <h2 class="text-xl font-bold mb-2">${letter.subject || "No Subject"}</h2>
      <p class="text-gray-400"><strong>From:</strong> ${letter.from || "Unknown"}</p>
      <p class="text-gray-400"><strong>To:</strong> ${toList}</p>
      ${ccList ? `<p class="text-gray-400"><strong>CC:</strong> ${ccList}</p>` : ''}
      <p class="text-gray-400 mb-2"><strong>Sent:</strong> ${timestamp}</p>
      <hr class="border-gray-600 my-4">
      <p class="text-white whitespace-pre-wrap">${letter.body || "No content"}</p>
    `;
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="text-red-400">Error loading letter. Please try again.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadLetter);
