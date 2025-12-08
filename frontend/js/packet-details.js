// JSON Beautifier functionality
const jsonBeautifyToggle = document.getElementById('jsonBeautifyToggle');
export let currentPacketRequestId = null; // To store the ID of the currently displayed packet for beautifier re-rendering
let currentRawReqBody = ''; // To store the original raw request body
let currentRawResBody = ''; // To store the original raw response body
let currentRawReqHeaders = ''; // To store the original raw request headers
let currentRawResHeaders = ''; // To store the original raw response headers
let currentReqContentType = ''; // To store the content type of the current request body
let currentResContentType = ''; // To store the content type of the current response body


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

export function showEmptyState() {
    document.getElementById('emptyStateContainer').style.display = 'flex';
    document.getElementById('packetDetails').style.display = 'none';
    document.getElementById('packetInspectionMessage').style.display = 'none';

    // Disable buttons
    const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
    const replayBtn = document.getElementById('replayBtn');
    aiAnalyzeBtn.classList.add('disabled');
    replayBtn.classList.add('disabled');
}

export async function showPacketDetails(requestId) {
    try {
        const response = await fetch(`/api/requests/${requestId}`);
        const data = await response.json();

        document.getElementById('emptyStateContainer').style.display = 'none';
        document.getElementById('packetInspectionMessage').style.display = 'none';
        document.getElementById('packetDetails').style.display = 'grid'; // Use grid for details

        // Enable buttons
        const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
        const replayBtn = document.getElementById('replayBtn');
        aiAnalyzeBtn.classList.remove('disabled');
        replayBtn.classList.remove('disabled');

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
        showEmptyState();
        document.getElementById('packetInspectionMessage').style.display = 'block';
        document.getElementById('packetInspectionMessage').textContent = 'Error loading packet details.';
        document.getElementById('packetDetails').style.display = 'none';
    }
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

function mimeToExtension(mimeType) {
    if (!mimeType) return 'bin'; // Default to generic binary

    const type = mimeType.toLowerCase();
    if (type.includes('json')) return 'json';
    if (type.includes('html')) return 'html';
    if (type.includes('css')) return 'css';
    if (type.includes('javascript')) return 'js';
    if (type.includes('image/jpeg')) return 'jpg';
    if (type.includes('image/png')) return 'png';
    if (type.includes('image/gif')) return 'gif';
    if (type.includes('image/svg+xml')) return 'svg';
    if (type.includes('application/pdf')) return 'pdf';
    if (type.includes('audio/mpeg')) return 'mp3';
    if (type.includes('audio/wav')) return 'wav';
    if (type.includes('video/mp4')) return 'mp4';
    if (type.includes('video/webm')) return 'webm';
    if (type.includes('text/plain')) return 'txt';
    if (type.includes('xml')) return 'xml';
    
    // Generic fallback if no specific match
    const parts = type.split('/');
    if (parts.length > 1) {
        // Use the subtype if it's not too generic (e.g., 'image' from 'image/jpeg')
        const subType = parts[1];
        if (subType !== 'octet-stream' && subType !== 'x-') return subType;
    }
    return 'bin'; // Fallback to generic binary
}

function downloadResponseBody(content, contentType) {
    const filename = `response_body.${mimeToExtension(contentType)}`;
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    export function showWsMessageDetails(request) {
        document.getElementById('emptyStateContainer').style.display = 'none';
        document.getElementById('packetInspectionMessage').style.display = 'none';
        document.getElementById('packetDetails').style.display = 'grid';
    
        // Hide HTTP-specific fields
        document.getElementById('packetResStatusLine').textContent = '';
        document.getElementById('packetReqHeaders').textContent = '';
        document.getElementById('packetResHeaders').textContent = '';
        document.getElementById('packetEndedAt').textContent = '';
        document.getElementById('packetDuration').textContent = '';
        document.getElementById('packetReqSize').textContent = '';
        document.getElementById('packetResSize').textContent = '';
    
        // Show WS-specific info
        document.getElementById('packetId').textContent = `WS Msg [${request.connectionId}]`;
        document.getElementById('packetStartedAt').textContent = new Date(request.timestamp).toLocaleString();
        
        const reqBodyElement = document.getElementById('packetReqBody');
        reqBodyElement.innerHTML = '';
        const pre = document.createElement('pre');
        pre.className = 'detail-content';
        pre.textContent = request.content;
        reqBodyElement.appendChild(pre);
    
        const resBodyElement = document.getElementById('packetResBody');
        resBodyElement.innerHTML = '<pre class="detail-content">N/A</pre>';
    }
    