// Theme toggle functionality
const darkModeToggle = document.getElementById('dark-mode-toggle-input');
const body = document.body;

const applyTheme = (isDark) => {
    if (isDark) {
        body.classList.add('dark');
        body.classList.remove('light');
    } else {
        body.classList.add('light');
        body.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

const savedTheme = localStorage.getItem('theme');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
let initialIsDark = savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches);

if (darkModeToggle) {
    darkModeToggle.checked = initialIsDark;
    applyTheme(initialIsDark);
    darkModeToggle.addEventListener('change', () => {
        applyTheme(darkModeToggle.checked);
    });
}

// Mock Data
const mockConversations = {
    "req-1": {
        name: "Login Attempt",
        url: "/api/login", // Added URL for display
        time: "10:01:00 AM", // Added time for display
        conversation: [
            { from: "client", data: { type: "auth_request", username: "user1", password: "password123" }, timestamp: "10:01:01 AM" },
            { from: "server", data: { type: "auth_response", status: "success", token: "xyz-abc" }, timestamp: "10:01:02 AM" },
            { from: "client", data: { type: "get_profile", token: "xyz-abc" }, timestamp: "10:01:03 AM" },
            { from: "server", data: { type: "profile_data", user: { id: 1, name: "User One", email: "user1@example.com" } }, timestamp: "10:01:04 AM" },
            { from: "client", data: { type: "get_settings" }, timestamp: "10:01:05 AM" },
            { from: "server", data: { type: "settings_data", settings: { theme: "dark", notifications: true } }, timestamp: "10:01:06 AM" },
            { from: "client", data: { type: "update_settings", settings: { notifications: false } }, timestamp: "10:01:07 AM" },
            { from: "server", data: { type: "update_ack", status: "success" }, timestamp: "10:01:08 AM" },
            { from: "client", data: { type: "logout" }, timestamp: "10:01:09 AM" },
            { from: "server", data: { type: "logout_success" }, timestamp: "10:01:10 AM" },
        ]
    },
    "req-2": {
        name: "Data Fetch",
        url: "/data/products", // Added URL for display
        time: "10:02:00 AM", // Added time for display
        conversation: [
            { from: "client", data: { action: "fetch", resource: "products" }, timestamp: "10:02:01 AM" },
            { from: "server", data: { status: "pending", message: "Fetching product list..." }, timestamp: "10:02:02 AM" },
            { from: "server", data: { status: "success", products: [{ id: 101, name: "Laptop" }, { id: 102, name: "Mouse" }] }, timestamp: "10:02:03 AM" },
            { from: "client", data: { action: "fetch_details", productId: 101 }, timestamp: "10:02:04 AM" },
            { from: "server", data: { status: "success", product: { id: 101, name: "Laptop", price: 1200, stock: 50 } }, timestamp: "10:02:05 AM" },
            { from: "client", data: { action: "fetch_details", productId: 102 }, timestamp: "10:02:06 AM" },
            { from: "server", data: { status: "success", product: { id: 102, name: "Mouse", price: 25, stock: 200 } }, timestamp: "10:02:07 AM" },
            { from: "client", data: { action: "subscribe_updates", productId: 101 }, timestamp: "10:02:08 AM" },
            { from: "server", data: { status: "subscribed", message: "You are now subscribed to updates for Laptop" }, timestamp: "10:02:09 AM" },
            { from: "server", data: { type: "stock_update", productId: 101, new_stock: 49 }, timestamp: "10:02:15 AM" },
        ]
    },
    "req-3": {
        name: "Live Chat",
        url: "/chat/room123", // Added URL for display
        time: "10:03:00 AM", // Added time for display
        conversation: [
            { from: "client", data: { event: "join_room", room: "support" }, timestamp: "10:03:01 AM" },
            { from: "server", data: { event: "user_joined", user: "You" }, timestamp: "10:03:02 AM" },
            { from: "server", data: { event: "user_joined", user: "SupportAgent" }, timestamp: "10:03:03 AM" },
            { from: "client", data: { event: "message", text: "Hello, I have an issue with my order." }, timestamp: "10:03:05 AM" },
            { from: "server", data: { event: "message", from: "SupportAgent", text: "Hello! How can I help you today?" }, timestamp: "10:03:08 AM" },
            { from: "client", data: { event: "message", text: "My order #12345 has not arrived." }, timestamp: "10:03:12 AM" },
            { from: "server", data: { event: "typing", from: "SupportAgent" }, timestamp: "10:03:13 AM" },
            { from: "server", data: { event: "message", from: "SupportAgent", text: "Let me check that for you." }, timestamp: "10:03:15 AM" },
            { from: "client", data: { event: "leave_room", room: "support" }, timestamp: "10:04:00 AM" },
            { from: "server", data: { event: "user_left", user: "You" }, timestamp: "10:04:01 AM" },
        ]
    }
};

const requestTableBody = document.getElementById('requestTableBody'); // Changed ID
const chatMessages = document.getElementById('chatMessages');
const chatHeader = document.getElementById('chatHeader');
let activeRequestId = null;

function renderRequestList() {
    requestTableBody.innerHTML = ''; // Changed ID
    for (const requestId in mockConversations) {
        const request = mockConversations[requestId];
        
        const tr = document.createElement('tr');
        tr.className = 'request-row'; // Reusing existing table row styles
        tr.dataset.requestId = requestId;

        tr.innerHTML = `
            <td class="time-duration-combined-col">${request.time}</td>
            <td class="url-col truncate">${request.url}</td>
        `;

        tr.addEventListener('click', () => {
            if (activeRequestId) {
                const oldActive = requestTableBody.querySelector(`[data-request-id="${activeRequestId}"]`);
                if(oldActive) oldActive.classList.remove('active');
            }
            activeRequestId = requestId;
            tr.classList.add('active'); // Add active class to the tr
            renderConversation(requestId);
        });

        requestTableBody.appendChild(tr); // Changed ID
    }
}

function renderConversation(requestId) {
    const request = mockConversations[requestId];
    if (!request) return;

    chatHeader.textContent = request.name;
    chatMessages.innerHTML = '';

    request.conversation.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${msg.from}`;

        const contentEl = document.createElement('div');
        contentEl.className = 'content';
        contentEl.innerHTML = `<pre>${JSON.stringify(msg.data, null, 2)}</pre>`; // Render JSON in pre tags

        const timestampEl = document.createElement('div');
        timestampEl.className = 'timestamp';
        timestampEl.textContent = msg.timestamp;

        messageEl.appendChild(contentEl);
        messageEl.appendChild(timestampEl);
        chatMessages.appendChild(messageEl);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// DOM elements for new buttons
const clearBtn = document.getElementById('clearBtn');
const newReqBtn = document.getElementById('newReqBtn');
const statsToggleBtn = document.getElementById('statsToggleBtn');

// Dummy implementation for these buttons
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all mock requests?')) {
            for (const key in mockConversations) {
                delete mockConversations[key];
            }
            activeRequestId = null;
            renderRequestList();
            chatHeader.textContent = 'Select a request';
            chatMessages.innerHTML = '';
            alert('All mock requests cleared!');
        }
    });
}

if (newReqBtn) {
    newReqBtn.addEventListener('click', () => {
        const newId = `req-${Object.keys(mockConversations).length + 1}`;
        const newReqName = prompt('Enter name for new mock request:', `New Request ${Object.keys(mockConversations).length + 1}`);
        if (newReqName) {
            mockConversations[newId] = {
                name: newReqName,
                url: `/mock/path/${newId}`,
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                conversation: [
                    { from: "client", data: { message: "Hello, new mock request!" }, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
                    { from: "server", data: { message: "Welcome to the mock server!" }, timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) },
                ]
            };
            renderRequestList();
            // Re-render the chat window if a request is selected
            if (activeRequestId) {
                renderConversation(activeRequestId);
            }
            alert(`New mock request "${newReqName}" added.`);
        }
    });
}

if (statsToggleBtn) {
    statsToggleBtn.addEventListener('click', () => {
        alert('Statistics for mock WebSocket data is not available.');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderRequestList();
    // Select the first request by default
    const firstRequest = requestTableBody.querySelector('.request-row');
    if (firstRequest) {
        firstRequest.click();
    }
});
