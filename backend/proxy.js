const http = require('http');
const crypto = require('crypto');
const { insertStmt } = require('./database');
const { TARGET_HOST, TARGET_PORT, MAX_BODY_BYTES } = require('./config');
const { WebSocket, WebSocketServer } = require('ws');

function genId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return crypto.createHash('sha1').update(String(Math.random()) + Date.now()).digest('hex');
}

function readBodyWithCap(req, maxBytes) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        req.on('data', (chunk) => {
            total += chunk.length;
            if (total <= maxBytes) chunks.push(chunk);
        });
        req.on('end', () => {
            const buf = Buffer.concat(chunks);
            const truncated = total > maxBytes;
            resolve({ buf, truncated, total });
        });
        req.on('error', (err) => reject(err));
    });
}

function tryJSON(obj) {
    try { return JSON.stringify(obj); } catch (e) { return '{}'; }
}

function getContentType(headers) {
    if (!headers) return null; // Return null if no headers or content-type
    const contentTypeHeader = headers['content-type'] || headers['Content-Type']; // Case-insensitive access
    if (!contentTypeHeader) return null; // Return null if content-type header is missing

    // Return the full content type string, not a category
    return contentTypeHeader.toLowerCase(); // Store in lowercase for consistency
}

// Helper function to process and store body content
function processAndStoreBody(bodyBuf, fullContentType) {
    if (!bodyBuf || bodyBuf.length === 0) {
        return null;
    }
    // Store all body types as a BLOB
    return bodyBuf;
}


function createProxyServer(wss) {
    const server = http.createServer(async (clientReq, clientRes) => {
        const id = genId();
        const startedAt = Date.now();

        try {
            const { buf: reqBodyBuf, truncated: reqTruncated, total: reqTotal } =
                await readBodyWithCap(clientReq, MAX_BODY_BYTES);

            const options = {
                hostname: TARGET_HOST,
                port: TARGET_PORT,
                path: clientReq.url,
                method: clientReq.method,
                headers: Object.assign({}, clientReq.headers),
            };
            delete options.headers['accept-encoding'];
            options.headers.host = `${TARGET_HOST}:${TARGET_PORT}`;

            const upstream = http.request(options, async (upstreamRes) => {
                const { buf: resBodyBuf, truncated: resTruncated, total: resTotal } =
                    await readBodyWithCap(upstreamRes, MAX_BODY_BYTES);
                
                const endedAt = Date.now();
                const durationMs = endedAt - startedAt;

                clientRes.writeHead(upstreamRes.statusCode, upstreamRes.headers);
                clientRes.end(resBodyBuf);

                try {
                    const reqFullContentType = getContentType(clientReq.headers);
                    const resFullContentType = getContentType(upstreamRes.headers);

                    const reqBodyForDb = processAndStoreBody(reqBodyBuf, reqFullContentType);
                    const resBodyForDb = processAndStoreBody(resBodyBuf, resFullContentType);
                    
                    const record = {
                        id,
                        startedAt,
                        endedAt,
                        durationMs,
                        method: clientReq.method,
                        url: clientReq.url,
                        req_headers: tryJSON(clientReq.headers),
                        req_body: reqBodyForDb,
                        req_truncated: reqTruncated ? 1 : 0,
                        req_size: reqTotal,
                        req_content_type: reqFullContentType,
                        res_status: upstreamRes.statusCode,
                        res_headers: tryJSON(upstreamRes.headers),
                        res_body: resBodyForDb,
                        res_truncated: resTruncated ? 1 : 0,
                        res_size: resTotal,
                        res_content_type: resFullContentType,
                        replayed: 0, // Mark as original request
                    };
                    insertStmt.run(record);

                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                id,
                                startedAt,
                                durationMs,
                                method: clientReq.method,
                                url: clientReq.url,
                                status: String(upstreamRes.statusCode) // Convert to string
                            }));
                        }
                    });
                } catch (dbErr) {
                    console.error('DB insert error:', dbErr);
                }
            });

            upstream.on('error', async (err) => { // Added 'async' here
                clientRes.writeHead(502);
                clientRes.end('Bad Gateway: ' + err.message);
                try {
                    const endedAt = Date.now();
                    const reqFullContentType = getContentType(clientReq.headers);
                    const reqBodyForDb = processAndStoreBody(reqBodyBuf, reqFullContentType);

                    // For error responses, generate a simple text response body
                    const errorResBodyBuf = Buffer.from(('Bad Gateway: ' + err.message));
                    const errorResContentType = 'text/plain';
                    const resBodyForDb = processAndStoreBody(errorResBodyBuf, errorResContentType);

                    insertStmt.run({
                        id,
                        startedAt,
                        endedAt,
                        durationMs: endedAt - startedAt,
                        method: clientReq.method,
                        url: clientReq.url,
                        req_headers: tryJSON(clientReq.headers),
                        req_body: reqBodyForDb,
                        req_truncated: reqTruncated ? 1 : 0,
                        req_size: reqTotal,
                        req_content_type: reqFullContentType,
                        res_status: 502,
                        res_headers: '{}',
                        res_body: resBodyForDb,
                        res_truncated: 0,
                        res_size: errorResBodyBuf.length,
                        res_content_type: errorResContentType,
                        replayed: 0, // Mark as original request
                    });
                } catch (dbErr) {
                    console.error('DB insert on error failed:', dbErr);
                }
            });

            if (reqBodyBuf && reqBodyBuf.length) upstream.write(reqBodyBuf);
            upstream.end();
        } catch (err) {
            console.error('Proxy read error:', err);
            clientRes.writeHead(500);
            clientRes.end('Internal Server Error');
        }
    });

    const proxyWss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
        proxyWss.handleUpgrade(req, socket, head, (clientWs) => {
            const targetWsUrl = `ws://${TARGET_HOST}:${TARGET_PORT}${req.url}`;
            const targetWs = new WebSocket(targetWsUrl, {
                headers: req.headers
            });

            targetWs.on('open', () => {
                clientWs.on('message', (message, isBinary) => {
                    targetWs.send(message, { binary: isBinary });
                });

                targetWs.on('message', (message, isBinary) => {
                    clientWs.send(message, { binary: isBinary });
                });
            });

            clientWs.on('close', (code, reason) => {
                targetWs.close(code, reason.toString());
            });

            targetWs.on('close', (code, reason) => {
                clientWs.close(code, reason.toString());
            });

            clientWs.on('error', (error) => {
                console.error('Client WebSocket proxy error:', error);
                targetWs.close();
            });

            targetWs.on('error', (error) => {
                console.error('Target WebSocket proxy error:', error);
                clientWs.close();
            });
        });
    });

    return server;
}

module.exports = createProxyServer;