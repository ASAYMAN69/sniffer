import { fetchInitialRequests, applyFilters, pinnedRequestId, setPinnedRequestId, allRequests } from './requests.js';
import { connectWebSocket, connectInspectorWebSocket } from './websocket.js';
import { initModals } from './modals.js';
import { showEmptyState } from './packet-details.js';
import { updateStatCards } from './stats.js';

document.addEventListener('DOMContentLoaded', () => {
    fetchInitialRequests(); // Fetch initial requests on load
    applyFilters(); // Apply filters immediately to render table
    connectWebSocket(); // Establish WebSocket connection
    connectInspectorWebSocket(); // Establish Inspector WebSocket connection
    initModals(); // Initialize all modal-related event listeners
    showEmptyState(); // Show empty state on load
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (pinnedRequestId) { // Only unselect if a request is currently selected
            setPinnedRequestId(null);
            applyFilters(); // Re-render the table to unhighlight the row
            showEmptyState(); // Hide details and show the empty state message
        }
    }
});

const clearBtn = document.getElementById('clearBtn');
clearBtn.addEventListener('click', () => {
    const warningModalOverlay = document.getElementById('warningModalOverlay');
    warningModalOverlay.classList.add('active');
});

const confirmClearBtn = document.getElementById('confirmClearBtn');
confirmClearBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/clear', { method: 'POST' });
        if (response.ok) {
            allRequests.length = 0; // Clear the array
            applyFilters();
            showEmptyState();
            updateStatCards();
        } else {
            console.error('Failed to clear requests:', response.statusText);
        }
    } catch (error) {
        console.error('Error clearing requests:', error);
    } finally {
        const warningModalOverlay = document.getElementById('warningModalOverlay');
        warningModalOverlay.classList.remove('active');
    }
});

const cancelClearBtn = document.getElementById('cancelClearBtn');
cancelClearBtn.addEventListener('click', () => {
    const warningModalOverlay = document.getElementById('warningModalOverlay');
    warningModalOverlay.classList.remove('active');
});