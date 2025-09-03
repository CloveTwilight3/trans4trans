const backendURL = "/api";
const params = new URLSearchParams(window.location.search);
const letterId = params.get("id");

const letterSubjectEl = document.getElementById("letterSubject");
const letterContentEl = document.getElementById("letterContent");

async function loadLetter() {
  if (!letterId) {
    letterContentEl.innerHTML = `<p class="text-red-400">No letter ID provided.</p>`;
    return;
  }

  try {
    const res = await fetch(`${backendURL}/letters`);
    const letters = await res.json();
    const letter = letters.find(l => l.id === letterId);

    if (!letter) {
      letterContentEl.innerHTML = `<p class="text-red-400">Letter not found.</p>`;
      return;
    }

    // --- Update tab title and metadata ---
    const subject = letter.subject || 'No Subject';
    document.title = `${subject} - Trans4Trans Letters`;
    updateMetadata(subject, letter.body);

    // --- Render letter ---
    const toList = Array.isArray(letter.to) ? letter.to.join(", ") : letter.to;
    const ccList = Array.isArray(letter.cc) && letter.cc.length > 0 ? letter.cc.join(", ") : "";
    const bccList = Array.isArray(letter.bcc) && letter.bcc.length > 0 ? letter.bcc.join(", ") : "";

    const timestamp = new Date(letter.timestamp).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    letterSubjectEl.textContent = subject;
    letterContentEl.innerHTML = `
      <p class="text-gray-400 text-sm mb-2"><strong>From:</strong> ${letter.from}</p>
      <p class="text-gray-400 text-sm mb-2"><strong>To:</strong> ${toList}</p>
      ${ccList ? `<p class="text-gray-400 text-sm mb-2"><strong>CC:</strong> ${ccList}</p>` : ''}
      ${bccList ? `<p class="text-gray-400 text-sm mb-2"><strong>BCC:</strong> ${bccList}</p>` : ''}
      <p class="text-gray-400 text-xs mb-4">${timestamp}</p>
      <div class="text-gray-200 whitespace-pre-line">${letter.body}</div>
    `;

  } catch (err) {
    console.error("Error loading letter:", err);
    letterContentEl.innerHTML = `<p class="text-red-400">Error loading letter. Please refresh.</p>`;
  }
}

// --- Update Open Graph / Twitter Metadata dynamically ---
function updateMetadata(subject, body) {
  const description = body ? body.substring(0, 150) + (body.length > 150 ? "..." : "") : "Trans4Trans Letter";

  updateMeta("og:title", subject);
  updateMeta("og:description", description);
  updateMeta("twitter:title", subject);
  updateMeta("twitter:description", description);
}

function updateMeta(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
  if (el) {
    el.setAttribute("content", content);
  } else {
    el = document.createElement("meta");
    el.setAttribute(property.includes("twitter") ? "name" : "property", property);
    el.setAttribute("content", content);
    document.head.appendChild(el);
  }
}

document.addEventListener("DOMContentLoaded", loadLetter);
