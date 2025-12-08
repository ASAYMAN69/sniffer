import { addWsSessionToTable, updateWsSessionInTable, activeConnectionId } from './ws-sessions.js';
import { addWsMessageToChat, fetchAndRenderWsMessages } from './ws-messages.js';

let inspectorWs;
let reconnectInspectorInterval;

export function connectWsInspector() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/inspector`;

    inspectorWs = new WebSocket(wsUrl);

    inspectorWs.onopen = () => {
        console.log('WS Inspector WebSocket connected');
        if (reconnectInspectorInterval) {
            clearInterval(reconnectInspectorInterval);
            reconnectInspectorInterval = null;
        }
    };

    inspectorWs.onmessage = (event) => {
        const receivedData = JSON.parse(event.data);
        console.log('Received WS Inspector WebSocket message:', receivedData);

        if (receivedData.type === 'ws_session_new') {
            addWsSessionToTable(receivedData);
        } else if (receivedData.type === 'ws_session_update') {
            updateWsSessionInTable(receivedData);
            if (receivedData.id === activeConnectionId) {
                // If the active session is updated, refresh its messages
                fetchAndRenderWsMessages(receivedData.id, receivedData.url); // Re-fetch to show status change
            }
        } else if (receivedData.type === 'ws_message') {
            addWsMessageToChat(receivedData);
        }
    };

    inspectorWs.onclose = (event) => {
        console.log('WS Inspector WebSocket disconnected:', event.reason);
        if (!reconnectInspectorInterval) {
            reconnectInspectorInterval = setInterval(() => {
                console.log('Attempting to reconnect WS Inspector WebSocket...');
                connectWsInspector();
            }, 5000);
        }
    };

    inspectorWs.onerror = (error) => {
        console.error('WS Inspector WebSocket error:', error);
        inspectorWs.close();
    };
}
