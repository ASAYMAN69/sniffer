// Theme toggle functionality
const darkModeToggle = document.getElementById('dark-mode-toggle-input');
const body = document.body;

// WebSocket Status Indicator functions
const wsStatusIndicator = document.getElementById('wsStatusIndicator');

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

// Check for saved theme preference or respect OS preference
const savedTheme = localStorage.getItem('theme');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

const applyTheme = (isDark) => {
    if (isDark) {
        body.classList.add('dark');
        body.classList.remove('light');
    } else {
        body.classList.add('light');
        body.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

// Set initial state
let initialIsDark = false;
if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
    initialIsDark = true;
}
darkModeToggle.checked = initialIsDark;
applyTheme(initialIsDark);

darkModeToggle.addEventListener('change', () => {
    applyTheme(darkModeToggle.checked);
});

// Modal functionality
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModal');
const statsModalOverlay = document.getElementById('statsModalOverlay');
const closeStatsModalBtn = document.getElementById('closeStatsModal');

closeModalBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});

closeStatsModalBtn.addEventListener('click', () => {
    statsModalOverlay.classList.remove('active');
});

statsModalOverlay.addEventListener('click', (e) => {
    if (e.target === statsModalOverlay) {
        statsModalOverlay.classList.remove('active');
    }
});

// Live data
let allRequests = []; // This will hold all requests, updated via API fetch and WebSockets
let pinnedRequestId = null; // To store the ID of the currently pinned request
let isPaused = false; // Flag to indicate if WebSocket updates are paused (by Ctrl key)

async function fetchInitialRequests() {
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

// Helper to render body content based on its type
function displayBodyContent(elementId, rawContent, fullContentType, isBeautifyChecked) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.innerHTML = ''; // Clear previous content

    if (rawContent === null || rawContent === undefined) {
        element.textContent = "No body content.";
        return;
    }

    const category = getContentTypeCategory(fullContentType);

    if (category === 'binary') {
        const p = document.createElement('p');
        p.className = 'detail-content binary-placeholder';
        p.textContent = `Binary content (${fullContentType || 'unknown type'}). Use 'Save' to download.`;
        element.appendChild(p);
        return;
    }

    // Display beautified JSON/text
    const formattedResult = formatBodyContent(rawContent, fullContentType, isBeautifyChecked);
    const pre = document.createElement('pre');
    pre.className = 'detail-content';
    pre.textContent = formattedResult.content;
    element.appendChild(pre);
}

async function showPacketDetails(requestId) {
    try {
        const response = await fetch(`/api/requests/${requestId}`);
        const data = await response.json();

        document.getElementById('packetInspectionMessage').style.display = 'none';
        document.getElementById('packetDetails').style.display = 'grid'; // Use grid for details

        document.getElementById('packetId').textContent = data.id;
        document.getElementById('packetStartedAt').textContent = new Date(data.startedAt).toLocaleString();
        document.getElementById('packetEndedAt').textContent = new Date(data.endedAt).toLocaleString();
        document.getElementById('packetDuration').textContent = `${data.durationMs} ms`;
        document.getElementById('packetReqSize').textContent = data.req_size ? `${(data.req_size / 1024).toFixed(2)} KB` : 'N/A';
        document.getElementById('packetResSize').textContent = data.res_size ? `${(data.res_size / 1024).toFixed(2)} KB` : 'N/A';

        // Set the response status line
        document.getElementById('packetResStatusLine').textContent = `HTTP/1.1 ${data.res_status} OK`;

        currentPacketRequestId = data.id; // Store the current packet's ID

        // Store base64-decoded body content for JSON types, null otherwise
        currentRawReqBody = data.req_body ? atob(data.req_body) : null;
        currentRawResBody = data.res_body ? atob(data.res_body) : null;

        currentRawReqHeaders = data.req_headers; // Store raw headers (already JSON string)
        currentRawResHeaders = data.res_headers; // Store raw headers (already JSON string)

        currentReqContentType = data.req_content_type || ''; // Store full content type
        currentResContentType = data.res_content_type || ''; // Store full content type

        // Initial display with beautification if toggle is on
        const isBeautifyChecked = jsonBeautifyToggle.checked;

        // Render Request Body
        displayBodyContent('packetReqBody', currentRawReqBody, currentReqContentType, isBeautifyChecked);
        // Render Response Body
        displayBodyContent('packetResBody', currentRawResBody, currentResContentType, isBeautifyChecked);
        
        document.getElementById('packetReqHeaders').textContent = formatHeadersContent(currentRawReqHeaders, isBeautifyChecked);
        document.getElementById('packetResHeaders').textContent = formatHeadersContent(currentRawResHeaders, isBeautifyChecked);

    } catch (error) {
        console.error('Error fetching packet details:', error);
        document.getElementById('packetInspectionMessage').style.display = 'block';
        document.getElementById('packetInspectionMessage').textContent = 'Error loading packet details.';
        document.getElementById('packetDetails').style.display = 'none';
    }
}

// JSON Beautifier functionality
const jsonBeautifyToggle = document.getElementById('jsonBeautifyToggle');
let currentRawReqBody = ''; // To store the original raw request body
let currentRawResBody = ''; // To store the original raw response body
let currentRawReqHeaders = ''; // To store the original raw request headers
let currentRawResHeaders = ''; // To store the original raw response headers
let currentReqContentType = ''; // To store the content type of the current request body
let currentResContentType = ''; // To store the content type of the current response body
let currentPacketRequestId = null; // To store the ID of the currently displayed packet for beautifier re-rendering

// Load Beautifier preference on page load
const savedBeautifyPreference = localStorage.getItem('jsonBeautify');
if (savedBeautifyPreference !== null) {
    jsonBeautifyToggle.checked = (savedBeautifyPreference === 'true');
} else {
    // Default to true if no preference saved
    jsonBeautifyToggle.checked = true;
}

jsonBeautifyToggle.addEventListener('change', () => {
    console.log('jsonBeautifyToggle changed. Checked state:', jsonBeautifyToggle.checked);
    // Save Beautifier preference on change
    localStorage.setItem('jsonBeautify', jsonBeautifyToggle.checked);

    // Apply beautification to currently displayed packet details if any
    if (document.getElementById('packetDetails').style.display !== 'none' && currentPacketRequestId) {
        const isBeautifyChecked = jsonBeautifyToggle.checked;

        // Use displayBodyContent for bodies
        displayBodyContent('packetReqBody', currentRawReqBody, currentReqContentType, isBeautifyChecked);
        displayBodyContent('packetResBody', currentRawResBody, currentResContentType, isBeautifyChecked);

        // Headers still use textContent
        const formattedReqHeaders = formatHeadersContent(currentRawReqHeaders, isBeautifyChecked);
        const formattedResHeaders = formatHeadersContent(currentRawResHeaders, isBeautifyChecked);
        document.getElementById('packetReqHeaders').textContent = formattedReqHeaders;
        document.getElementById('packetResHeaders').textContent = formattedResHeaders;
        console.log('jsonBeautifyToggle: packetReqHeaders formatted length =', formattedReqHeaders.length);
        console.log('jsonBeautifyToggle: packetResHeaders formatted length =', formattedResHeaders.length);
    }
});

function getContentTypeCategory(contentTypeHeader) {
    // This function now primarily categorizes for text beautification or binary handling
    if (!contentTypeHeader) return 'other';
    const contentType = contentTypeHeader.toLowerCase();

    if (contentType.includes('json')) return 'json';
    if (contentType.includes('html')) return 'html';
    if (contentType.includes('css')) return 'css';
    if (contentType.includes('javascript')) return 'javascript';
    if (contentType.includes('xml')) return 'xml';
    if (contentType.includes('text')) return 'text'; // Catches text/plain, text/csv, etc.
    
    // Check for common binary types
    if (contentType.startsWith('image/') || contentType.startsWith('audio/') || contentType.startsWith('video/') || contentType.includes('application/octet-stream') || contentType.includes('font/') || contentType.includes('application/zip') || contentType.includes('application/pdf')) {
        return 'binary';
    }
    
    return 'other'; // Everything else is 'other'
}

function formatHeadersContent(rawContent, isBeautifyChecked) {
    console.log('formatHeadersContent: rawContent length =', rawContent ? rawContent.length : 0);
    console.log('formatHeadersContent: isBeautifyChecked =', isBeautifyChecked);
    if (!rawContent) return '';
    let content = rawContent;
    if (isBeautifyChecked) {
        try {
            // Assuming headers stored as JSON string
            const parsedJson = JSON.parse(rawContent);
            content = JSON.stringify(parsedJson, null, 2);
        } catch (e) {
            console.warn('formatHeadersContent: Error beautifying header content (not JSON or parsing failed):', e);
        }
    }
    console.log('formatHeadersContent: final content length =', content.length);
    return content;
}

function formatBodyContent(rawContent, contentType, isBeautifyChecked) {
    console.log('formatBodyContent: rawContent length =', rawContent ? rawContent.length : 0);
    console.log('formatBodyContent: contentType =', contentType);
    console.log('formatBodyContent: isBeautifyChecked =', isBeautifyChecked);
    if (!rawContent) return { content: '', isHtml: false };

    let content = rawContent;
    let isHtml = false;
    const category = getContentTypeCategory(contentType);
    console.log('formatBodyContent: category =', category);

    if (isBeautifyChecked) {
        try {
            switch (category) {
                case 'json':
                    content = JSON.stringify(JSON.parse(rawContent), null, 2);
                    break;
                case 'html':
                    content = html_beautify(rawContent, { indent_size: 2, space_in_empty_paren: true });
                    isHtml = true;
                    break;
                case 'css':
                    content = css_beautify(rawContent, { indent_size: 2, space_in_empty_paren: true });
                    isHtml = true;
                    break;
                case 'javascript':
                    content = js_beautify(rawContent, { indent_size: 2, space_in_empty_paren: true });
                    isHtml = true;
                    break;
                case 'xml':
                    content = html_beautify(rawContent, { indent_size: 2, space_in_empty_paren: true }); // Using html beautifier for XML
                    isHtml = true;
                    break;
                default:
                    // For 'text' or 'other', no beautification beyond basic whitespace
                    break;
            }
        } catch (e) {
            console.warn(`formatBodyContent: Error beautifying ${category} content:`, e);
            // Fallback to raw content if beautification fails
        }
    }
    console.log('formatBodyContent: final content length =', content.length);
    console.log('formatBodyContent: isHtml =', isHtml);
    return { content, isHtml };
}

const saveResBodyBtn = document.getElementById('saveResBodyBtn');
if (saveResBodyBtn) {
    saveResBodyBtn.addEventListener('click', () => {
        if (currentPacketRequestId && currentRawResBody !== null) {
            downloadResponseBody(currentRawResBody, currentResContentType);
        } else {
            alert('No response body to save.');
        }
    });
}




