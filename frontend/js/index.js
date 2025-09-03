const backendURL = "/api";
const wsURL = "wss://trans4trans.win/ws/letters";

const lettersContainer = document.getElementById("lettersContainer");

// Load existing letters
async function loadLetters() {
  try {
    const res = await fetch(`${backendURL}/letters`);
    const letters = await res.json();
    lettersContainer.innerHTML = "";
    
    if (letters.length === 0) {
      lettersContainer.innerHTML = `
        <div class="bg-gray-800 p-8 rounded-xl shadow-md text-center">
          <p class="text-gray-400 text-lg">No letters yet...</p>
          <p class="text-gray-500 text-sm mt-2">When letters are posted, they'll appear here.</p>
        </div>
      `;
      return;
    }
    
    letters.reverse().forEach(letter => addLetterToPage(letter));
  } catch (err) {
    console.error("Error loading letters:", err);
    lettersContainer.innerHTML = `
      <div class="bg-red-900 p-4 rounded-xl shadow-md text-center">
        <p class="text-red-300">Error loading letters. Please refresh the page.</p>
      </div>
    `;
  }
}

// Add a single letter to the page
function addLetterToPage(letter) {
  const div = document.createElement("div");
  div.className = "bg-gray-800 p-4 rounded-xl shadow-md cursor-pointer hover:bg-gray-700 transition-colors border-l-4 border-blue-500";

  div.onclick = async () => {
    window.location.href = `letter.html?id=${letter.id}`;

    // Optimistically mark as read
    if (letter.status === "unread") {
      letter.status = "read";
      updateLetterReadStatus(letter.id);
      const statusDot = div.querySelector('span[title="New letter"]');
      if (statusDot) {
        statusDot.classList.remove("bg-blue-500", "animate-pulse");
        statusDot.classList.add("bg-gray-600");
        statusDot.title = "Read";
      }
    }
  };

  // Show status indicator for unread letters
  const statusIndicator = letter.status === 'unread' ? 
    '<span class="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse" title="New letter"></span>' : 
    '<span class="inline-block w-3 h-3 bg-gray-600 rounded-full mr-2" title="Read"></span>';
  
  // Format the recipient list nicely
  const toList = Array.isArray(letter.to) ? letter.to.join(", ") : letter.to;
  const ccList = Array.isArray(letter.cc) && letter.cc.length > 0 ? letter.cc.join(", ") : "";
  
  // Truncate body for preview
  const bodyPreview = letter.body && letter.body.length > 150 ? 
    letter.body.substring(0, 150) + "..." : 
    letter.body || "";
  
  // Format timestamp
  const timestamp = new Date(letter.timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  div.innerHTML = `
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center flex-1 min-w-0">
        ${statusIndicator}
        <div class="flex-1 min-w-0">
          <p class="text-white font-semibold truncate">
            <strong>To:</strong> ${toList}
          </p>
          <p class="text-gray-300 text-sm truncate">
            <strong>From:</strong> ${letter.from || 'Unknown'}
          </p>
        </div>
      </div>
      <span class="text-xs text-gray-400 ml-4 whitespace-nowrap">${timestamp}</span>
    </div>
    
    ${ccList ? `<p class="text-gray-400 text-sm mb-2"><strong>CC:</strong> ${ccList}</p>` : ''}
    
    <h3 class="text-lg font-semibold text-white mb-2 line-clamp-1">
      ${letter.subject || 'No Subject'}
    </h3>
    
    ${bodyPreview ? `
      <p class="text-gray-300 text-sm leading-relaxed line-clamp-3 mb-3">
        ${bodyPreview}
      </p>
    ` : ''}
    
    <div class="flex items-center justify-between text-xs text-gray-500">
      <span>Click to read full letter</span>
      <span class="bg-gray-700 px-2 py-1 rounded">
        ${letter.body ? `${letter.body.length} characters` : 'Empty'}
      </span>
    </div>
  `;
  
  lettersContainer.prepend(div); // New letters on top
}

// Mark a letter as read in the backend (optional for JSON storage)
async function updateLetterReadStatus(letterId) {
  try {
    const letters = await (await fetch(`${backendURL}/letters`)).json();
    const letter = letters.find(l => l.id === letterId);
    if (letter) {
      letter.status = "read";
      await fetch(`${backendURL}/letters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(letters)
      });
    }
  } catch (err) {
    console.error("Error updating read status:", err);
  }
}

// WebSocket for live updates
let socket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectWebSocket() {
  try {
    socket = new WebSocket(wsURL);
    
    socket.onopen = () => {
      console.log("Connected to WebSocket for live updates");
      reconnectAttempts = 0;
      showConnectionStatus("Connected", "green");
    };
    
    socket.onmessage = (event) => {
      try {
        const letter = JSON.parse(event.data);
        addLetterToPage(letter);
        showNotification(`New letter from ${letter.from}: ${letter.subject}`);
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };
    
    socket.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      showConnectionStatus("Disconnected", "red");
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(connectWebSocket, 3000 * reconnectAttempts);
      }
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      showConnectionStatus("Error", "yellow");
    };
  } catch (err) {
    console.error("Failed to create WebSocket connection:", err);
  }
}

// Show connection status
function showConnectionStatus(status, color) {
  let statusElement = document.getElementById("connection-status");
  if (!statusElement) {
    statusElement = document.createElement("div");
    statusElement.id = "connection-status";
    statusElement.className = "fixed bottom-4 right-4 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300";
    document.body.appendChild(statusElement);
  }
  
  statusElement.textContent = `Live updates: ${status}`;
  statusElement.className = `fixed bottom-4 right-4 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
    color === 'green' ? 'bg-green-600 text-white' :
    color === 'red' ? 'bg-red-600 text-white' :
    'bg-yellow-600 text-white'
  }`;
  
  if (color === 'green') {
    setTimeout(() => statusElement.remove(), 3000);
  }
}

// Show notification for new letters
function showNotification(message) {
  const notification = document.createElement("div");
  notification.className = "fixed top-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm transition-all duration-300 transform translate-x-full";
  notification.innerHTML = `
    <div class="flex items-center">
      <span class="mr-2">💌</span>
      <span class="text-sm">${message}</span>
      <button class="ml-3 text-blue-200 hover:text-white" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100);
  setTimeout(() => { 
    notification.style.transform = 'translateX(full)'; 
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Refresh button functionality
function addRefreshButton() {
  const header = document.querySelector('header');
  if (header && !document.getElementById('refresh-btn')) {
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'refresh-btn';
    refreshBtn.className = 'bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg font-semibold text-sm ml-2';
    refreshBtn.innerHTML = '🔄 Refresh';
    refreshBtn.onclick = () => {
      refreshBtn.innerHTML = '⏳ Loading...';
      loadLetters().finally(() => { refreshBtn.innerHTML = '🔄 Refresh'; });
    };
    const adminLink = header.querySelector('a');
    if (adminLink) { header.insertBefore(refreshBtn, adminLink); }
    else { header.appendChild(refreshBtn); }
  }
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  loadLetters();
  connectWebSocket();
  addRefreshButton();

  const style = document.createElement('style');
  style.textContent = `
    .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  `;
  document.head.appendChild(style);
});

// Page visibility handling
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && (!socket || socket.readyState !== WebSocket.OPEN)) {
    connectWebSocket();
  }
});
