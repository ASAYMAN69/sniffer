import { fetchWsSessions } from './ws-sessions.js';
import { connectWsInspector } from './ws-inspector-client.js';

// DOM elements for buttons
const clearBtn = document.getElementById('clearBtn');
const newReqBtn = document.getElementById('newReqBtn');
const statsToggleBtn = document.getElementById('statsToggleBtn');

// Disable or adapt buttons for real data
if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all WebSocket sessions and messages?')) {
            try {
                const response = await fetch('/api/websocket/clear', { method: 'POST' });
                if (response.ok) {
                    // Clear UI
                    fetchWsSessions(); // Re-fetch to show empty list
                    chatMessages.innerHTML = ''; // Clear chat messages
                    chatHeader.textContent = 'Select a request';
                } else {
                    console.error('Failed to clear WebSocket data:', response.statusText);
                    alert('Failed to clear WebSocket data.');
                }
            } catch (error) {
                console.error('Error clearing WebSocket data:', error);
                alert('Error clearing WebSocket data.');
            }
        }
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
