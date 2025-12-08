import { showPacketDetails } from './packet-details.js';

// Live data
export let allRequests = []; // This will hold all requests, updated via API fetch and WebSockets
export let pinnedRequestId = null; // To store the ID of the currently pinned request

export function setPinnedRequestId(id) {
    pinnedRequestId = id;
}

let isPaused = false; // Flag to indicate if WebSocket updates are paused (by Ctrl key)

export function getIsPaused() {
    return isPaused;
}

export function setIsPaused(value) {
    isPaused = value;
}

export async function fetchInitialRequests() {
    try {
        const response = await fetch('/api/requests');
        const data = await response.json();
        allRequests = data.map(req => ({
            id: req.id,
            time: new Date(req.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            method: req.method,
            url: req.url,
            status: String(req.res_status),
            duration: `${req.durationMs}ms`,
            size: 'N/A', // Size needs to be fetched from detail or calculated. For now, N/A
            replayed: req.replayed === 1 // Include replayed status
        }));
        applyFilters(); // Apply filters to the newly fetched data
    } catch (error) {
        console.error('Error fetching initial requests:', error);
    }
}

// Function to apply filters and render the table
export function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const methodFilter = document.getElementById('methodFilter');
    const statusFilter = document.getElementById('statusFilter');

    let filteredRequests = [...allRequests]; // Start with a copy of all requests

    // Apply search filter
    if (searchInput && searchInput.value) {
        const searchTerm = searchInput.value.toLowerCase();
        filteredRequests = filteredRequests.filter(req =>
            req.url.toLowerCase().includes(searchTerm) ||
            req.method.toLowerCase().includes(searchTerm) ||
            req.status.toLowerCase().includes(searchTerm)
        );
    }

    // Apply method filter
    if (methodFilter && methodFilter.value) {
        filteredRequests = filteredRequests.filter(req => req.method === methodFilter.value);
    }

    // Apply status filter
    if (statusFilter && statusFilter.value) {
        const statusCodePrefix = statusFilter.value; // e.g., '2', '3', '4', '5'
        filteredRequests = filteredRequests.filter(req => req.status.startsWith(statusCodePrefix));
    }

    renderTable(filteredRequests);
}


function renderTable(requests) {
    const requestsTableBody = document.getElementById('requestsTable');
    const emptyState = document.getElementById('emptyState');
    const tableResponsive = document.querySelector('#requestsTableWrapper .table-responsive');

    requestsTableBody.innerHTML = ''; // Clear existing rows
    
    // Create a mutable copy of requests array
    let requestsToRender = [...requests];

    if (pinnedRequestId) {
        const pinnedRequest = requestsToRender.find(req => req.id === pinnedRequestId);
        if (pinnedRequest) {
            // Render pinned request first
            const tr = document.createElement('tr');
            tr.className = 'request-row pinned'; // Add 'pinned' class
            if (pinnedRequest.replayed) { // Add class for replayed requests
                tr.classList.add('replayed');
            }
            tr.innerHTML = `
                <td class="time-duration-combined-col">${pinnedRequest.time} - ${pinnedRequest.duration}</td>
                <td class="method-status-col"><span class="request-method ${pinnedRequest.method}">${pinnedRequest.method}</span><br><span class="status-code status-${pinnedRequest.status.startsWith('2') ? '2xx' : pinnedRequest.status.startsWith('3') ? '3xx' : pinnedRequest.status.startsWith('4') ? '4xx' : '5xx'}">${pinnedRequest.status}</span></td>
                <td class="url-col truncate">${pinnedRequest.url}</td>
            `;
            tr.addEventListener('click', (event) => {
                // Prevent default Ctrl+click behavior (opening in new tab)
                if (event.ctrlKey) {
                    event.preventDefault();
                }
                // If the pinned request is clicked, unpin it
                pinnedRequestId = null;
                applyFilters(); // Re-render to reflect unpinning
            });
            requestsTableBody.appendChild(tr);

            // Remove pinned request from the list of requests to render
            requestsToRender = requestsToRender.filter(req => req.id !== pinnedRequestId);
        } else {
            // Pinned request no longer exists in current data, unpin it
            pinnedRequestId = null;
        }
    }

    if (requestsToRender.length === 0 && !pinnedRequestId) { // Check both original requests and if anything is pinned
        emptyState.style.display = 'block';
        tableResponsive.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        tableResponsive.style.display = 'block';

        requestsToRender.forEach(request => {
            const tr = document.createElement('tr');
            tr.className = 'request-row'; // Regular rows
            if (request.replayed) { // Add class for replayed requests
                tr.classList.add('replayed');
            }
            tr.innerHTML = `
                <td class="time-duration-combined-col">${request.time} - ${request.duration}</td>
                <td class="method-status-col"><span class="request-method ${request.method}">${request.method}</span><br><span class="status-code status-${request.status.startsWith('2') ? '2xx' : request.status.startsWith('3') ? '3xx' : request.status.startsWith('4') ? '4xx' : '5xx'}">${request.status}</span></td>
                <td class="url-col truncate">${request.url}</td>
            `;
            
            tr.addEventListener('click', (event) => {
                // Prevent default Ctrl+click behavior (opening in new tab)
                if (event.ctrlKey) {
                    event.preventDefault();
                }
                // If a non-pinned request is clicked, pin it and unpin previous one
                pinnedRequestId = request.id;
                applyFilters(); // Re-render to reflect new pinning
                showPacketDetails(request.id); // Also show details for newly pinned request
            });
            
            requestsTableBody.appendChild(tr);
        });
    }
    
    // Always update request count. If pinned request is present, it's 1 + requestsToRender.length
    document.getElementById('requestCount').textContent = (pinnedRequestId ? 1 : 0) + requestsToRender.length;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Control') {
        setIsPaused(true);
        console.log('WebSocket updates paused (Ctrl key held)');
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Control') {
        setIsPaused(false);
        console.log('WebSocket updates resumed (Ctrl key released)');
    }
});

// Event Listeners for filters
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('methodFilter').addEventListener('change', applyFilters);
document.getElementById('statusFilter').addEventListener('change', applyFilters);
document.getElementById('resetFilters').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('methodFilter').value = '';
    document.getElementById('statusFilter').value = '';
    applyFilters();
});