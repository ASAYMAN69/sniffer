import { fetchWsSessions, activeConnectionId } from './ws-sessions.js';
import { connectWsInspector } from './ws-inspector-client.js';
import { chatMessages, chatHeader, showEmptyConversationState } from './ws-messages.js';

// DOM elements for buttons
const clearBtn = document.getElementById('clearBtn');
const newReqBtn = document.getElementById('newReqBtn');
const statsToggleBtn = document.getElementById('statsToggleBtn');

// DOM elements for the warning modal
const warningModalOverlay = document.getElementById('warningModalOverlay');
const confirmClearBtn = document.getElementById('confirmClearBtn');
const cancelClearBtn = document.getElementById('cancelClearBtn');

// Disable or adapt buttons for real data
if (clearBtn) {
    clearBtn.addEventListener('click', () => {
        warningModalOverlay.classList.add('active'); // Show the warning modal
    });
}

if (confirmClearBtn) {
    confirmClearBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/websocket/clear', { method: 'POST' });
            if (response.ok) {
                // Clear UI
                fetchWsSessions(); // Re-fetch to show empty list
                activeConnectionId = null; // Clear active selection
                showEmptyConversationState(); // Show "Click a session" message
            } else {
                console.error('Failed to clear WebSocket data:', response.statusText);
                alert('Failed to clear WebSocket data.');
            }
        } catch (error) {
            console.error('Error clearing WebSocket data:', error);
            alert('Error clearing WebSocket data.');
        } finally {
            warningModalOverlay.classList.remove('active'); // Hide the warning modal
        }
    });
}

if (cancelClearBtn) {
    cancelClearBtn.addEventListener('click', () => {
        warningModalOverlay.classList.remove('active'); // Hide the warning modal
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
    connectWsInspector();
});
