const backendURL = "/api/letters";
const wsURL = "wss://trans4trans.win/ws/letters";

const lettersContainer = document.getElementById("lettersContainer");

// Load existing letters
async function loadLetters() {
  try {
    const res = await fetch(backendURL);
    const letters = await res.json();
    lettersContainer.innerHTML = "";
    letters.reverse().forEach(letter => addLetterToPage(letter));
  } catch (err) {
    console.error("Error loading letters:", err);
  }
}

// Add a single letter to the page
function addLetterToPage(letter) {
  const div = document.createElement("div");
  div.className = "bg-gray-800 p-4 rounded-xl shadow-md";
  div.innerHTML = `
    <p><strong>To:</strong> ${letter.to.join(", ")}</p>
    <p><strong>From:</strong> ${letter.from}</p>
    <p><strong>CC:</strong> ${letter.cc.join(", ") || "-"}</p>
    <p><strong>BCC:</strong> ${letter.bcc.join(", ") || "-"}</p>
    <p><strong>Subject:</strong> ${letter.subject}</p>
    <p class="whitespace-pre-wrap mt-2">${letter.body}</p>
    <p class="text-sm text-gray-400 mt-2">${new Date(letter.timestamp).toLocaleString()}</p>
  `;
  lettersContainer.prepend(div); // New letters on top
}

// WebSocket for live updates
const socket = new WebSocket(wsURL);
socket.onmessage = (event) => {
  const letter = JSON.parse(event.data);
  addLetterToPage(letter);
};

socket.onopen = () => console.log("Connected to WebSocket for live updates");
socket.onclose = () => console.log("WebSocket closed");

// Initial load
loadLetters();
