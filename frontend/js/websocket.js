import { allRequests, applyFilters, getIsPaused } from './requests.js';
import { updateStatCards, renderStatsCharts } from './stats.js';

// WebSocket Status Indicator functions
const wsStatusIndicator = document.getElementById('wsStatusIndicator');
const statsModalOverlay = document.getElementById('statsModalOverlay');

// Get reference to the Reconnect button
const wsReconnectBtn = document.getElementById('wsReconnectBtn');

// Add click listener to the Reconnect button
if (wsReconnectBtn) {
    wsReconnectBtn.addEventListener('click', () => {
        console.log('Manual reconnect initiated.');
        // Hide the button immediately on manual attempt
        wsReconnectBtn.style.display = 'none';
        connectWebSocket(); // Attempt to reconnect
    });
}

function updateWsStatus(isConnected) {
    if (wsStatusIndicator) {
        if (isConnected) {
            wsStatusIndicator.classList.remove('disconnected');
            wsStatusIndicator.classList.add('connected');
            wsStatusIndicator.title = 'Connected to WebSocket';
            // Hide reconnect button when connected
            if (wsReconnectBtn) wsReconnectBtn.style.display = 'none';
        } else {
            wsStatusIndicator.classList.remove('connected');
            wsStatusIndicator.classList.add('disconnected');
            wsStatusIndicator.title = 'Disconnected from WebSocket';
            // Show reconnect button when disconnected
            if (wsReconnectBtn) wsReconnectBtn.style.display = 'inline-flex'; // Use inline-flex to match btn styling
        }
    }
}

let ws;
let reconnectInterval;

export function connectWebSocket() {
    // Determine WebSocket URL dynamically
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`; // Assuming WebSocket is served from the same host and port

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        updateWsStatus(true);
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };

    ws.onmessage = (event) => {
        if (getIsPaused()) return; // Skip update if paused
        const receivedData = JSON.parse(event.data);
        console.log('Received WebSocket message:', receivedData);

        const newRequestData = {}; // Start with an empty, truly mutable object
        Object.assign(newRequestData, receivedData); // Copy properties from receivedData

        // Now add/overwrite properties
        Object.defineProperty(newRequestData, 'time', {
            value: new Date(receivedData.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            writable: true,
            configurable: true,
            enumerable: true
        });
        Object.defineProperty(newRequestData, 'duration', {
            value: `${receivedData.durationMs}ms`,
            writable: true,
            configurable: true,
            enumerable: true
        });

        // Add new request to the beginning of the array
        allRequests.unshift(newRequestData);
        // Only keep the latest 1000 requests to prevent performance issues
        if (allRequests.length > 1000) {
            allRequests.length = 1000; // Truncate the array to first 1000 elements
        }
        
        applyFilters(); // Re-render the table with the new data
        updateStatCards(); // Update the stat cards with new data

        if (statsModalOverlay && statsModalOverlay.classList.contains('active')) {
            renderStatsCharts(); // Re-render charts if the modal is open
        }
    };

    ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.reason);
        updateWsStatus(false);
        // Attempt to reconnect after a delay
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                console.log('Attempting to reconnect WebSocket...');
                connectWebSocket();
            }, 5000); // Try every 5 seconds
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close(); // Close to trigger onclose and reconnection attempt
    };
}

export function connectInspectorWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/inspector`;

    const inspectorWs = new WebSocket(wsUrl);

    inspectorWs.onopen = () => {
        console.log('Inspector WebSocket connected');
    };

    inspectorWs.onmessage = (event) => {
        if (getIsPaused()) return; // Skip update if paused
        const receivedData = JSON.parse(event.data);
        console.log('Received Inspector WebSocket message:', receivedData);

        if (receivedData.type === 'ws_message') {
            const newRequestData = {
                id: receivedData.timestamp, // Use timestamp for a unique enough ID for the row
                method: 'WS',
                url: `[${receivedData.connectionId}] ${receivedData.direction}`,
                status: '',
                time: new Date(receivedData.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                duration: '',
                replayed: 0,
                isWs: true,
                ...receivedData
            };

            allRequests.unshift(newRequestData);
            if (allRequests.length > 1000) {
                allRequests.length = 1000;
            }
            
            applyFilters();
            updateStatCards();
        }
    };

    inspectorWs.onclose = (event) => {
        console.log('Inspector WebSocket disconnected:', event.reason);
        setTimeout(connectInspectorWebSocket, 5000); // Try to reconnect every 5 seconds
    };

    inspectorWs.onerror = (error) => {
        console.error('Inspector WebSocket error:', error);
        inspectorWs.close();
    };
}