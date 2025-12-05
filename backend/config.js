const path = require('path');
const os = require('os');
const fs = require('fs');

const PROXY_PORT = parseInt(process.env.PROXY_PORT) || 9999;
const TARGET_HOST = process.env.TARGET_HOST || 'localhost';
const TARGET_PORT = parseInt(process.env.TARGET_PORT) || 3000;
const INSPECT_PORT = parseInt(process.env.INSPECT_PORT) || 4040;

const MAX_BODY_BYTES = parseInt(process.env.MAX_BODY_BYTES) || 5 * 1024 * 1024; // 5 MB per body
const DB_DIR_NAME = '.sniffer';
const DB_FILE_NAME = 'database.sqlite';

function dbPath() {
  const home = os.homedir();
  if (!home) throw new Error('Cannot determine home directory');
  const dir = path.join(home, DB_DIR_NAME);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, DB_FILE_NAME);
}

const DATABASE_FILE = dbPath();

function binDirPath() {
  const home = os.homedir();
  if (!home) throw new Error('Cannot determine home directory');
  const dir = path.join(home, DB_DIR_NAME, 'bin'); // .sniffer/bin/
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const DB_BIN_DIR = binDirPath();

// Helper to map MIME type to a common file extension
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


module.exports = {
    PROXY_PORT,
    TARGET_HOST,
    TARGET_PORT,
    INSPECT_PORT,
    MAX_BODY_BYTES,
    DATABASE_FILE,
    DB_BIN_DIR, // Export new constant
    mimeToExtension // Export new helper
};
