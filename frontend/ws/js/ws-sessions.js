import { fetchAndRenderWsMessages, chatHeader, chatMessages } from './ws-messages.js';
export let activeConnectionId = null;

const wsSessionsTableBody = document.getElementById('wsSessionsTableBody');
const wsSessionsEmptyState = document.getElementById('wsSessionsEmptyState'); // New reference

export async function fetchWsSessions() {
    try {
        const response = await fetch('/api/websocket/sessions');
        const sessions = await response.json();
        renderWsSessions(sessions);
    } catch (error) {
        console.error('Error fetching WebSocket sessions:', error);
    }
}

export function renderWsSessions(sessions) {
    wsSessionsTableBody.innerHTML = ''; // Clear existing rows
    if (sessions.length === 0) {
        wsSessionsEmptyState.style.display = 'block'; // Show empty state
        wsSessionsTableBody.style.display = 'none'; // Hide table body
        return;
    }

    wsSessionsEmptyState.style.display = 'none'; // Hide empty state
    wsSessionsTableBody.style.display = 'table-row-group'; // Show table body

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
            fetchAndRenderWsMessages(session.id, session.url);
        });

        wsSessionsTableBody.appendChild(tr);
    });
}

export function addWsSessionToTable(newSession) {
    if (wsSessionsEmptyState.style.display === 'block') {
        wsSessionsEmptyState.style.display = 'none'; // Hide empty state
        wsSessionsTableBody.style.display = 'table-row-group'; // Show table body
        wsSessionsTableBody.innerHTML = ''; // Clear "No sessions recorded" row if present
    }

    const tr = document.createElement('tr');
    tr.className = 'request-row';
    tr.dataset.connectionId = newSession.id;

    tr.innerHTML = `
        <td>${newSession.id}</td>
        <td class="url-col truncate">${newSession.url}</td>
        <td><span class="status-badge status-${newSession.status}">${newSession.status}</span></td>
        <td>${new Date(newSession.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
    `;

    tr.addEventListener('click', () => {
        if (activeConnectionId) {
            const oldActive = wsSessionsTableBody.querySelector(`[data-connection-id="${activeConnectionId}"]`);
            if(oldActive) oldActive.classList.remove('active');
        }
        activeConnectionId = newSession.id;
        tr.classList.add('active');
        fetchAndRenderWsMessages(newSession.id, newSession.url);
    });

    wsSessionsTableBody.prepend(tr); // Add to the top
    // If it's the only session, select it
    if (wsSessionsTableBody.children.length === 1) {
            tr.click();
    }
}


export function updateWsSessionInTable(updatedSession) {
    const row = wsSessionsTableBody.querySelector(`[data-connection-id="${updatedSession.id}"]`);
    if (row) {
        row.querySelector('.status-badge').textContent = updatedSession.status;
        row.querySelector('.status-badge').className = `status-badge status-${updatedSession.status}`;
        // Optionally update end_time
        if (updatedSession.end_time) {
            // Update the time column if needed, or add a separate column for end time
        }
    }
}
