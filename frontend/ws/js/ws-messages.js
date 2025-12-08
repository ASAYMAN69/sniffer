import { activeConnectionId } from './ws-sessions.js';

export const chatMessages = document.getElementById('chatMessages');
export const chatHeader = document.getElementById('chatHeader');
const wsConversationEmptyState = document.getElementById('wsConversationEmptyState'); // New reference

export function showEmptyConversationState() {
    wsConversationEmptyState.style.display = 'flex';
    chatMessages.style.display = 'none';
    chatHeader.textContent = 'Select a request';
}

export async function fetchAndRenderWsMessages(connectionId, connectionUrl) {
    if (!connectionId) {
        showEmptyConversationState();
        return;
    }

    wsConversationEmptyState.style.display = 'none'; // Hide "Click a session" empty state
    chatMessages.style.display = 'flex'; // Show chat messages container

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

export function renderWsMessages(messages, connectionUrl) {
    chatHeader.textContent = `Conversation for: ${connectionUrl}`;
    chatMessages.innerHTML = '';

    if (messages.length === 0) {
        chatMessages.innerHTML = `<div id="noMessagesYet" class="message info">No messages for this session yet.</div>`;
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

export function addWsMessageToChat(message) {
    if (message.connectionId === activeConnectionId) {
        // Hide "Click a session" empty state if it's visible
        wsConversationEmptyState.style.display = 'none';
        chatMessages.style.display = 'flex';

        // Hide "No messages for this session yet." if it exists
        const noMessagesYetEl = document.getElementById('noMessagesYet');
        if (noMessagesYetEl) {
            noMessagesYetEl.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.direction === 'client_to_server' ? 'client' : 'server'}`;

        const contentEl = document.createElement('div');
        contentEl.className = 'content';
        try {
            const parsedContent = JSON.parse(message.content);
            contentEl.innerHTML = `<pre>${JSON.stringify(parsedContent, null, 2)}</pre>`;
        } catch (e) {
            contentEl.innerHTML = `<pre>${message.content}</pre>`;
        }

        const timestampEl = document.createElement('div');
        timestampEl.className = 'timestamp';
        timestampEl.textContent = new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        messageEl.appendChild(contentEl);
        messageEl.appendChild(timestampEl);
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}
