



const wsSessionsTableBody = document.getElementById('wsSessionsTableBody');
const chatMessages = document.getElementById('chatMessages');
const chatHeader = document.getElementById('chatHeader');
let activeConnectionId = null;

async function fetchWsSessions() {
    try {
        const response = await fetch('/api/websocket/sessions');
        const sessions = await response.json();
        renderWsSessions(sessions);
    } catch (error) {
        console.error('Error fetching WebSocket sessions:', error);
    }
}

function renderWsSessions(sessions) {
    wsSessionsTableBody.innerHTML = ''; // Clear existing rows
    if (sessions.length === 0) {
        wsSessionsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No WebSocket sessions recorded.</td></tr>';
        return;
    }

    sessions.forEach(session => {
        const tr = document.createElement('tr');
        tr.className = 'request-row';
        tr.dataset.connectionId = session.id;

        tr.innerHTML = `
            <td>${session.id}</td>
            <td class="url-col truncate">${session.url}</td>
            <td><span class="status-badge status-${session.status}">${session.status}</span></td>
            <td>${new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
        `;

        tr.addEventListener('click', () => {
            if (activeConnectionId) {
                const oldActive = wsSessionsTableBody.querySelector(`[data-connection-id="${activeConnectionId}"]`);
                if(oldActive) oldActive.classList.remove('active');
            }
            activeConnectionId = session.id;
            tr.classList.add('active');
            fetchAndRenderWsMessages(session.id, session.url); // New function to implement
        });

        wsSessionsTableBody.appendChild(tr);
    });
}


async function fetchAndRenderWsMessages(connectionId, connectionUrl) {
    try {
        const response = await fetch(`/api/websocket/sessions/${connectionId}/messages`);
        const messages = await response.json();
        renderWsMessages(messages, connectionUrl);
    } catch (error) {
        console.error('Error fetching WebSocket messages:', error);
        chatHeader.textContent = `Error loading messages for ${connectionUrl}`;
        chatMessages.innerHTML = `<div class="message error">Error loading messages.</div>`;
    }
}

function renderWsMessages(messages, connectionUrl) {
    chatHeader.textContent = `Conversation for: ${connectionUrl}`;
    chatMessages.innerHTML = '';

    if (messages.length === 0) {
        chatMessages.innerHTML = `<div class="message info">No messages for this session yet.</div>`;
        return;
    }

    messages.forEach(msg => {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${msg.direction === 'client_to_server' ? 'client' : 'server'}`;

        const contentEl = document.createElement('div');
        contentEl.className = 'content';
        try {
            // Try to pretty print JSON if possible
            const parsedContent = JSON.parse(msg.content);
            contentEl.innerHTML = `<pre>${JSON.stringify(parsedContent, null, 2)}</pre>`;
        } catch (e) {
            // Otherwise, display as plain text
            contentEl.innerHTML = `<pre>${msg.content}</pre>`;
        }

        const timestampEl = document.createElement('div');
        timestampEl.className = 'timestamp';
        timestampEl.textContent = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        messageEl.appendChild(contentEl);
        messageEl.appendChild(timestampEl);
        chatMessages.appendChild(messageEl);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// DOM elements for buttons
const clearBtn = document.getElementById('clearBtn');
const newReqBtn = document.getElementById('newReqBtn');
const statsToggleBtn = document.getElementById('statsToggleBtn');

// Disable or adapt buttons for real data
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        alert('Clearing all WebSocket sessions is not yet implemented.');
    });
}

if (newReqBtn) {
    newReqBtn.addEventListener('click', () => {
        alert('Creating new WebSocket requests is not applicable here.');
    });
}

if (statsToggleBtn) {
    statsToggleBtn.addEventListener('click', () => {
        alert('Statistics for WebSocket data is not available on this page.');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    fetchWsSessions();
});

