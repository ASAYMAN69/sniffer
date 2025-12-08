const Database = require('better-sqlite3');
const { DATABASE_FILE } = require('./config');

const db = new Database(DATABASE_FILE);

// To apply schema changes, we drop the table and recreate it.
// This is a destructive operation and will result in data loss.
// For a production environment, a proper migration strategy should be used.
db.exec('DROP TABLE IF EXISTS requests');
db.exec('DROP TABLE IF EXISTS websocket_messages');
db.exec('DROP TABLE IF EXISTS websocket_connections');

db.exec(`
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  startedAt INTEGER,
  endedAt INTEGER,
  durationMs INTEGER,
  method TEXT,
  url TEXT,
  req_headers TEXT,
  req_body BLOB,
  req_truncated INTEGER,
  req_size INTEGER,
  req_content_type TEXT,
  res_status INTEGER,
  res_headers TEXT,
  res_body BLOB,
  res_truncated INTEGER,
  res_size INTEGER,
  res_content_type TEXT,
  replayed INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_startedAt ON requests(startedAt DESC);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS websocket_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT,
  status TEXT,
  start_time DATETIME,
  end_time DATETIME
);
CREATE INDEX IF NOT EXISTS idx_ws_connection_start_time ON websocket_connections(start_time DESC);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS websocket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER,
  direction TEXT,
  content TEXT,
  timestamp DATETIME,
  FOREIGN KEY(connection_id) REFERENCES websocket_connections(id)
);
CREATE INDEX IF NOT EXISTS idx_ws_message_timestamp ON websocket_messages(timestamp DESC);
`);

const insertStmt = db.prepare(`
INSERT INTO requests (
  id, startedAt, endedAt, durationMs,
  method, url,
  req_headers, req_body, req_truncated, req_size, req_content_type,
  res_status, res_headers, res_body, res_truncated, res_size, res_content_type,
  replayed
) VALUES (
  @id, @startedAt, @endedAt, @durationMs,
  @method, @url,
  @req_headers, @req_body, @req_truncated, @req_size, @req_content_type,
  @res_status, @res_headers, @res_body, @res_truncated, @res_size, @res_content_type,
  @replayed
)
`);

const listStmt = db.prepare(`
SELECT id, startedAt, endedAt, durationMs, method, url, res_status, replayed
FROM requests
ORDER BY startedAt DESC
LIMIT ?
`);

const getStmt = db.prepare(`SELECT * FROM requests WHERE id = ?`);
const clearStmt = db.prepare(`DELETE FROM requests`);

const insertWsConnectionStmt = db.prepare(`
INSERT INTO websocket_connections (url, status, start_time)
VALUES (?, ?, ?)
`);

const updateWsConnectionStmt = db.prepare(`
UPDATE websocket_connections
SET status = ?, end_time = ?
WHERE id = ?
`);

const insertWsMessageStmt = db.prepare(`
INSERT INTO websocket_messages (connection_id, direction, content, timestamp)
VALUES (?, ?, ?, ?)
`);

const listWsConnectionsStmt = db.prepare(`
SELECT * FROM websocket_connections
ORDER BY start_time DESC
`);

const listWsMessagesStmt = db.prepare(`
SELECT * FROM websocket_messages
WHERE connection_id = ?
ORDER BY timestamp ASC
`);

const clearWsConnectionsStmt = db.prepare(`DELETE FROM websocket_connections`);
const clearWsMessagesStmt = db.prepare(`DELETE FROM websocket_messages`);

module.exports = {
    db,
    insertStmt,
    listStmt,
    getStmt,
    clearStmt,
    insertWsConnectionStmt,
    updateWsConnectionStmt,
    insertWsMessageStmt,
    listWsConnectionsStmt,
    listWsMessagesStmt,
    clearWsConnectionsStmt,
    clearWsMessagesStmt
};