const Database = require('better-sqlite3');
const { DATABASE_FILE } = require('./config');

const db = new Database(DATABASE_FILE);

// To apply schema changes, we drop the table and recreate it.
// This is a destructive operation and will result in data loss.
// For a production environment, a proper migration strategy should be used.
db.exec('DROP TABLE IF EXISTS requests');

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

module.exports = {
    db,
    insertStmt,
    listStmt,
    getStmt,
    clearStmt
};