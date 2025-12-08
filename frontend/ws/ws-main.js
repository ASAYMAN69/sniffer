import { fetchWsSessions } from './ws-sessions.js';
import { connectWsInspector } from './ws-inspector-client.js';

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
    connectWsInspector();
});
