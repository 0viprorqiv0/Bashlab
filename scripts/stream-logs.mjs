#!/usr/bin/env node
// ==============================================================================
// BashLab — Simple Python-style HTTP Request & Server Log Streamer
// Định dạng log đơn giản, trực quan theo chuẩn HTTP server (như python -m http.server)
// ==============================================================================
import fs from 'node:fs';

const args = process.argv.slice(2);
let backendLog = '';
let frontendLog = '';
let initialTailLines = 10;

for (const arg of args) {
  if (arg.startsWith('--backend=')) backendLog = arg.split('=')[1];
  else if (arg.startsWith('--frontend=')) frontendLog = arg.split('=')[1];
  else if (arg.startsWith('--tail=')) initialTailLines = parseInt(arg.split('=')[1], 10) || 10;
}

if (!backendLog || !frontendLog) {
  console.error('Usage: node stream-logs.mjs --backend=<path> --frontend=<path> [--tail=N]');
  process.exit(1);
}

function getTimeStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatSimpleLog(source, rawLine) {
  // Loại bỏ các mã màu ANSI nếu có
  const clean = rawLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
  if (!clean) return null;

  // Bỏ qua các thông báo rác từ npm
  if (clean.startsWith('npm notice') || clean.startsWith('npm warn')) return null;

  // Bỏ qua các dòng biên dịch module của Next.js để tránh ngập màn hình
  if (clean.startsWith('○ Compiling') || clean.startsWith('✓ Compiled') || clean.startsWith('▲ Next.js')) {
    return null;
  }

  const time = getTimeStr();

  // Nhận diện HTTP request: METHOD URL STATUS [time]
  // Ví dụ backend:  "GET    /api/sessions                  401 2.1ms"
  // Ví dụ frontend: "GET /login 200 in 23ms"
  const httpMatch = clean.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^\s]+)\s+(\d{3})(?:\s+(?:in\s+)?([0-9.]+ms))?/i);
  if (httpMatch) {
    const method = httpMatch[1].toUpperCase();
    const url = httpMatch[2];
    const status = httpMatch[3];
    const duration = httpMatch[4] ? ` - ${httpMatch[4]}` : '';
    return `[${time}] [${source}] "${method} ${url}" ${status}${duration}`;
  }

  // Các log khởi động quan trọng
  if (clean.includes('listening on') || clean.includes('Ready in') || clean.includes('Local:')) {
    return `[${time}] [${source}] ${clean}`;
  }

  // Các lỗi thực tế nếu có
  if (clean.includes('Error') || clean.includes('error') || clean.includes('failed')) {
    return `[${time}] [${source}] [ERROR] ${clean}`;
  }

  // Mặc định in ngắn gọn
  return `[${time}] [${source}] ${clean}`;
}

class LogWatcher {
  constructor(name, filePath) {
    this.name = name;
    this.filePath = filePath;
    this.offset = 0;
    this.remainder = '';
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.filePath)) {
        const stat = fs.statSync(this.filePath);
        const bufferSize = Math.min(stat.size, 8192);
        const startPos = Math.max(0, stat.size - bufferSize);
        const fd = fs.openSync(this.filePath, 'r');
        const buf = Buffer.alloc(bufferSize);
        fs.readSync(fd, buf, 0, bufferSize, startPos);
        fs.closeSync(fd);

        const initialLines = buf.toString('utf8').split('\n');
        const slice = initialLines.slice(-initialTailLines - 1);
        for (const line of slice) {
          const formatted = formatSimpleLog(this.name, line);
          if (formatted) console.log(formatted);
        }
        this.offset = stat.size;
      }
    } catch {
      this.offset = 0;
    }
  }

  poll() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const stat = fs.statSync(this.filePath);
      if (stat.size < this.offset) {
        this.offset = 0;
      }
      if (stat.size > this.offset) {
        const length = stat.size - this.offset;
        const buf = Buffer.alloc(length);
        const fd = fs.openSync(this.filePath, 'r');
        fs.readSync(fd, buf, 0, length, this.offset);
        fs.closeSync(fd);
        this.offset = stat.size;

        const content = this.remainder + buf.toString('utf8');
        const lines = content.split('\n');
        this.remainder = lines.pop() || '';

        for (const line of lines) {
          const formatted = formatSimpleLog(this.name, line);
          if (formatted) console.log(formatted);
        }
      }
    } catch {
      // Bỏ qua lỗi khóa file tức thời
    }
  }
}

console.log(`[${getTimeStr()}] [SYSTEM] Server log stream active. Format: [TIME] [SOURCE] "METHOD URL" STATUS`);

const watchers = [
  new LogWatcher('API', backendLog),
  new LogWatcher('WEB', frontendLog),
];

const interval = setInterval(() => {
  for (const w of watchers) w.poll();
}, 100);

process.on('SIGINT', () => {
  clearInterval(interval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  clearInterval(interval);
  process.exit(0);
});
