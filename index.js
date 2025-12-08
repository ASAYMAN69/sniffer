require('dotenv').config();
const createProxyServer = require('./backend/proxy');
const { server, wss, inspectorWss } = require('./backend/api');
const { PROXY_PORT, INSPECT_PORT, TARGET_HOST, TARGET_PORT, DATABASE_FILE } = require('./backend/config');

const proxyServer = createProxyServer(wss, inspectorWss);

proxyServer.listen(PROXY_PORT, (err) => {
    if (err) {
        console.error(`Failed to start proxy server on port ${PROXY_PORT}:`, err);
        return;
    }
    console.log(`Proxy listening on http://localhost:${PROXY_PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`);
    console.log(`SQLite DB at: ${DATABASE_FILE}`);
});

server.listen(INSPECT_PORT, () => {
    console.log(`Inspector UI available at http://localhost:${INSPECT_PORT}/`);
});
