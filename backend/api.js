const express = require('express');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const { listStmt, getStmt, clearStmt, db, insertStmt, listWsConnectionsStmt, listWsMessagesStmt } = require('./database');
const { TARGET_HOST, TARGET_PORT } = require('./config');
const fetch = require('node-fetch'); // For making API calls to Gemini
const crypto = require('crypto'); // Import crypto module

function tryJSON(obj) {
    try { return JSON.stringify(obj); } catch (e) { return '{}'; }
}

function genId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return crypto.createHash('sha1').update(String(Math.random()) + Date.now()).digest('hex');
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const inspectorWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
    const pathname = req.url;
    if (pathname === '/ws/inspector') {
        inspectorWss.handleUpgrade(req, socket, head, (ws) => {
            inspectorWss.emit('connection', ws, req);
        });
    } else {
        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    }
});

app.use(express.json({ limit: '5mb' }));

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/requests', (req, res) => {
    // Default limit to 2000 (maximum allowed) if not specified, effectively showing "all" up to the cap.
    const limit = Math.min(parseInt(req.query.limit || '2000') || 2000, 2000);
    const rows = listStmt.all(limit);
    res.json(rows);
});

app.get('/api/search', (req, res) => {
    const { query, method, status, limit } = req.query;
    let whereClauses = [];
    let params = {};

    if (query) {
        whereClauses.push('(url LIKE @query OR req_body LIKE @query OR res_body LIKE @query OR req_headers LIKE @query OR res_headers LIKE @query)');
        params.query = `%${query}%`;
    }
    if (method) {
        whereClauses.push('method = @method');
        params.method = method;
    }
    if (status) {
        whereClauses.push('res_status = @status');
        params.status = parseInt(status);
    }

    let sql = `
        SELECT id, startedAt, endedAt, durationMs, method, url, res_status
        FROM requests
    `;

    if (whereClauses.length > 0) {
        sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    sql += ` ORDER BY startedAt DESC LIMIT @limit`;
    params.limit = Math.min(parseInt(limit || '200') || 200, 2000);

    try {
        const searchStmt = db.prepare(sql);
        const rows = searchStmt.all(params);
        res.json(rows);
    } catch (err) {
        console.error('Search API error:', err);
        res.status(500).json({ ok: false, error: String(err) });
    }
});

app.get('/api/websocket/sessions', (req, res) => {
    try {
        const rows = listWsConnectionsStmt.all();
        res.json(rows);
    } catch (err) {
        console.error('List WS connections API error:', err);
        res.status(500).json({ ok: false, error: String(err) });
    }
});

app.get('/api/websocket/sessions/:id/messages', (req, res) => {
    try {
        const rows = listWsMessagesStmt.all(req.params.id);
        res.json(rows);
    } catch (err) {
        console.error('List WS messages API error:', err);
        res.status(500).json({ ok: false, error: String(err) });
    }
});


app.get('/api/requests/:id', (req, res) => {
    const id = req.params.id;
    const row = getStmt.get(id);
    if (!row) return res.status(404).send({ error: 'not found' });
    res.json({
        id: row.id,
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        durationMs: row.durationMs,
        method: row.method,
        url: row.url,
        req_headers: row.req_headers,
        req_body: row.req_body ? row.req_body.toString('base64') : null,
        req_truncated: row.req_truncated,
        req_size: row.req_size,
        req_content_type: row.req_content_type,
        res_status: row.res_status,
        res_headers: row.res_headers,
        res_body: row.res_body ? row.res_body.toString('base64') : null,
        res_truncated: row.res_truncated,
        res_size: row.res_size,
        res_content_type: row.res_content_type,
    });
});

app.post('/api/clear', (req, res) => {
    try {
        clearStmt.run();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: String(err) });
    }
});

function isBinaryContentType(contentType) {
    if (!contentType) return false;
    const lowerCaseContentType = contentType.toLowerCase();
    // Common binary types
    if (lowerCaseContentType.startsWith('image/') ||
        lowerCaseContentType.startsWith('audio/') ||
        lowerCaseContentType.startsWith('video/') ||
        lowerCaseContentType.includes('application/octet-stream') ||
        lowerCaseContentType.includes('application/zip') ||
        lowerCaseContentType.includes('application/pdf') ||
        lowerCaseContentType.includes('application/vnd.') || // Vendor-specific binary
        lowerCaseContentType.includes('font/')) {
        return true;
    }
    // Heuristic: if it's not explicitly text-based, assume binary for safety
    if (!lowerCaseContentType.includes('text/') &&
        !lowerCaseContentType.includes('application/json') &&
        !lowerCaseContentType.includes('application/xml') &&
        !lowerCaseContentType.includes('application/x-www-form-urlencoded')) {
        return true;
    }
    return false;
}

app.get('/api/ai-inspect/:id', async (req, res) => {
    const id = req.params.id;
    const GEMINI_API_KEY = process.env.GEMINI_API;

    console.log('AI Inspect - Request ID:', id);
    console.log('AI Inspect - GEMINI_API_KEY (first 5 chars):', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 5) : 'N/A');


    if (!GEMINI_API_KEY) {
        console.error('AI Inspect Error: GEMINI_API environment variable not set.');
        return res.status(500).json({ error: 'GEMINI_API environment variable not set.' });
    }

    try {
        const row = getStmt.get(id);
        if (!row) return res.status(404).send({ error: 'Packet not found' });

        let reqBodyContent = 'N/A';
        if (row.req_body) {
            if (row.req_truncated || isBinaryContentType(row.req_content_type)) {
                reqBodyContent = `[Binary or Truncated Request Body: Size ${row.req_size} bytes, Type: ${row.req_content_type || 'unknown'}]`;
            } else {
                try {
                    reqBodyContent = row.req_body.toString('utf8');
                } catch (e) {
                    console.warn(`Could not decode request body to UTF-8 for packet ${id}: ${e.message}`);
                    reqBodyContent = `[Undecodable Request Body: Size ${row.req_size} bytes, Type: ${row.req_content_type || 'unknown'}]`;
                }
            }
        }

        let resBodyContent = 'N/A';
        if (row.res_body) {
            if (row.res_truncated || isBinaryContentType(row.res_content_type)) {
                resBodyContent = `[Binary or Truncated Response Body: Size ${row.res_size} bytes, Type: ${row.res_content_type || 'unknown'}]`;
            } else {
                try {
                    resBodyContent = row.res_body.toString('utf8');
                } catch (e) {
                    console.warn(`Could not decode response body to UTF-8 for packet ${id}: ${e.message}`);
                    resBodyContent = `[Undecodable Response Body: Size ${row.res_size} bytes, Type: ${row.res_content_type || 'unknown'}]`;
                }
            }
        }

        const requestData = {
            id: row.id,
            startedAt: row.startedAt,
            endedAt: row.endedAt,
            durationMs: row.durationMs,
            method: row.method,
            url: row.url,
            req_headers: JSON.parse(row.req_headers || '{}'),
            req_body: reqBodyContent,
            res_status: row.res_status,
            res_headers: JSON.parse(row.res_headers || '{}'),
            res_body: resBodyContent,
        };

        const prompt = `Your task is to analyze the provided HTTP network packet and generate a JSON response.
The JSON response MUST adhere to the following structure and contain ONLY the JSON object, with no additional text, preamble, or formatting outside of the JSON itself:

\`\`\`json
{
  "security": "string",
  "performance": "string",
  "insights": "string",
  "recommendations": "string"
}
\`\`\`

Each string value in the JSON should contain your analysis for that category based on the packet data. Provide a concise summary and actionable recommendations.

Here is the HTTP network packet data:

Request Method: ${requestData.method}
Request URL: ${requestData.url}
Request Headers: ${JSON.stringify(requestData.req_headers, null, 2)}
Request Body: ${requestData.req_body}

Response Status: ${requestData.res_status}
Response Headers: ${JSON.stringify(requestData.res_headers, null, 2)}
Response Body: ${requestData.res_body}

Focus your analysis for each section:
1.  **Security:** Any potential vulnerabilities (e.g., exposed sensitive info, weak headers, suspicious patterns).
2.  **Performance:** Latency issues, large payloads, inefficient caching headers.
3.  **General Insights:** What does this packet tell us about the application's behavior or common patterns?
4.  **Recommendations:** Actionable steps to improve security or performance.

Remember: Your entire output MUST be a valid JSON object matching the specified schema, and nothing else. Do not include markdown fences, comments, or any extra text.`;

        console.log('AI Inspect - Prompt sent to Gemini:', prompt);

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY,
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        console.log('AI Inspect - Gemini API Response Status:', geminiResponse.status, geminiResponse.statusText);
        const geminiData = await geminiResponse.json();
        console.log('AI Inspect - Gemini API Response Data:', JSON.stringify(geminiData, null, 2));

        let analysis;
        try {
            const aiRawText = geminiData.candidates && geminiData.candidates[0] && geminiData.candidates[0].content && geminiData.candidates[0].content.parts && geminiData.candidates[0].content.parts[0] ? geminiData.candidates[0].content.parts[0].text : null;
            
            if (aiRawText) {
                let trimmedAiText = aiRawText.trim();
                // Remove markdown code block if present
                if (trimmedAiText.startsWith('```json')) {
                    trimmedAiText = trimmedAiText.substring('```json'.length);
                }
                if (trimmedAiText.endsWith('```')) {
                    trimmedAiText = trimmedAiText.substring(0, trimmedAiText.length - '```'.length);
                }
                trimmedAiText = trimmedAiText.trim(); // Trim again after removing markers
                analysis = JSON.parse(trimmedAiText);
            } else {
                analysis = {
                    security: 'No AI analysis available.',
                    performance: 'No AI analysis available.',
                    insights: 'No AI analysis available.',
                    recommendations: 'No AI analysis available.'
                };
            }
        } catch (parseError) {
            console.error('AI Inspect - Error parsing Gemini response as JSON:', parseError);
            console.error('AI Inspect - Raw AI text that failed to parse:', geminiData.candidates && geminiData.candidates[0] && geminiData.candidates[0].content && geminiData.candidates[0].content.parts && geminiData.candidates[0].content.parts[0] ? geminiData.candidates[0].content.parts[0].text : 'N/A');
            analysis = {
                security: 'Error: AI did not return valid JSON. Please try again.',
                performance: 'Error: AI did not return valid JSON. Please try again.',
                insights: 'Error: AI did not return valid JSON. Please try again.',
                recommendations: 'Error: AI did not return valid JSON. Please try again.'
            };
        }

        res.json({ analysis });

    } catch (error) {
        console.error('AI Inspection API error:', error);
        res.status(500).json({ ok: false, error: String(error) });
    }
});

// New /api/replay route
app.post('/api/replay', async (req, res) => {
    const { originalId, method, url, headers, body } = req.body;

    try {
        let requestToReplay;

        if (originalId) {
            const originalRequest = getStmt.get(originalId);
            if (!originalRequest) {
                return res.status(404).json({ error: 'Original request not found.' });
            }
            // Use original request details as base
            requestToReplay = {
                method: originalRequest.method,
                url: originalRequest.url,
                headers: JSON.parse(originalRequest.req_headers || '{}'),
                body: originalRequest.req_body ? originalRequest.req_body.toString('utf8') : null,
            };
        } else {
            // Default values for a new request if no originalId is provided
            requestToReplay = {
                method: 'GET',
                url: 'http://localhost:3000', // Default target
                headers: {},
                body: null,
            };
        }

        // Apply modifications from request body
        requestToReplay.method = method || requestToReplay.method;
        requestToReplay.url = url || requestToReplay.url;
        // Merge headers, new headers will override old ones
        requestToReplay.headers = { ...requestToReplay.headers, ...headers };
        // If body is explicitly provided as null/undefined, override existing body
        requestToReplay.body = body !== undefined ? body : requestToReplay.body;

        // Ensure headers are strings for node-fetch
        for (const key in requestToReplay.headers) {
            requestToReplay.headers[key] = String(requestToReplay.headers[key]);
        }
        // Remove host header to let node-fetch set it correctly
        delete requestToReplay.headers['host'];
        delete requestToReplay.headers['Host'];
        
        // Remove content-length header to let node-fetch set it correctly based on new body
        delete requestToReplay.headers['content-length'];
        delete requestToReplay.headers['Content-Length'];

        const replayOptions = {
            method: requestToReplay.method,
            headers: requestToReplay.headers,
        };

        if (requestToReplay.body) {
            replayOptions.body = requestToReplay.body;
        }

        let targetUrl = requestToReplay.url;
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = `http://${TARGET_HOST}:${TARGET_PORT}${targetUrl}`;
        }

        const replayResponse = await fetch(targetUrl, replayOptions);

        // Capture response details for logging
        const resHeaders = {};
        replayResponse.headers.forEach((value, name) => {
            resHeaders[name] = value;
        });

        // Read response body as buffer
        const resBuffer = await replayResponse.buffer();

        // Simulate proxy logging for the replayed request
        const newReqId = crypto.randomUUID(); // Generate a new ID for the replayed request
        const startedAt = Date.now();
        
        // Determine request and response content types
        const reqContentType = requestToReplay.headers['content-type'] || '';
        const resContentType = resHeaders['content-type'] || '';

        const record = {
            id: newReqId,
            startedAt,
            endedAt: Date.now(),
            durationMs: Date.now() - startedAt,
            method: requestToReplay.method,
            url: requestToReplay.url,
            req_headers: tryJSON(requestToReplay.headers),
            req_body: requestToReplay.body ? Buffer.from(requestToReplay.body) : null,
            req_truncated: 0, // Assume not truncated for replayed requests
            req_size: requestToReplay.body ? Buffer.from(requestToReplay.body).length : 0,
            req_content_type: reqContentType,
            res_status: replayResponse.status,
            res_headers: tryJSON(resHeaders),
            res_body: resBuffer,
            res_truncated: 0,
            res_size: resBuffer.length,
            res_content_type: resContentType,
            replayed: 1, // Mark as replayed
        };

        insertStmt.run(record);

        // Send a WebSocket message to notify frontend of new replayed request
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                                    client.send(JSON.stringify({
                                        id: record.id,
                                        startedAt: record.startedAt,
                                        durationMs: record.durationMs,
                                        method: record.method,
                                        url: record.url,
                                        status: String(record.res_status), // Convert to string
                                        replayed: record.replayed // Send replayed status
                                    }));            }
        });

        res.json({ ok: true, newRequestId: record.id });

    } catch (error) {
        console.error('Replay API error:', error);
        res.status(500).json({ ok: false, error: String(error) });
    }
});

module.exports = { server, wss, inspectorWss };