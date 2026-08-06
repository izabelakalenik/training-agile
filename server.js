#!/usr/bin/env node
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3903;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");

let notes = [
  { id: 1, shift: "day", author: "ops-lead", body: "Batch window slips 20m — payments on watch.", pinned: false, resolved: false, createdAt: "2026-03-10T06:10:00Z" },
  { id: 2, shift: "day", author: "net", body: "Core switch reboot scheduled 22:00 — confirm change ticket.", pinned: true, resolved: false, createdAt: "2026-03-10T07:00:00Z" },
  { id: 3, shift: "night", author: "soc", body: "Noise on VPN auth — correlating with vendor push.", pinned: false, resolved: false, createdAt: "2026-03-10T01:40:00Z" },
];
let nextId = 4;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  const payload = Buffer.isBuffer(body) || typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(null);
      try { resolve(JSON.parse(raw)); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(PUBLIC, urlPath));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: "forbidden" });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, { error: "not found" });
  }
  const ext = path.extname(file);
  send(res, 200, fs.readFileSync(file), MIME[ext] || "application/octet-stream");
}

const server = http.createServer(async (req, res) => {
  const url = (req.url || "").split("?")[0];
  if (req.method === "OPTIONS") return send(res, 204, "");

  if (req.method === "GET" && url === "/api/health") {
    return send(res, 200, { ok: true, service: "shiftboard", notes: notes.length });
  }

  if (req.method === "GET" && url === "/api/notes") {
    return send(res, 200, { notes });
  }

  // Track Bravo: POST /api/notes
  if (req.method === "POST" && url === "/api/notes") {
    let payload;
    try {
      payload = await readBody(req);
    } catch {
      return send(res, 400, { error: "invalid JSON" });
    }

    const shift = String(payload?.shift || "").trim().toLowerCase();
    const author = String(payload?.author || "").trim();
    const body = String(payload?.body || "").trim();
    if (!body) {
      return send(res, 400, { error: "body is required" });
    }
    if (shift !== "day" && shift !== "night") {
      return send(res, 400, { error: "shift must be day or night" });
    }

    const note = {
      id: nextId++,
      shift,
      author: author || "crew",
      body,
      pinned: false,
      resolved: false,
      createdAt: new Date().toISOString(),
    };
    notes = [...notes, note];
    return send(res, 201, { note });
  }

  // Track Alpha: PATCH /api/notes/:id  { pinned?: boolean, resolved?: boolean }
  if (req.method === "PATCH" && url.startsWith("/api/notes/")) {
    const id = Number(url.slice("/api/notes/".length));
    if (!Number.isInteger(id) || id < 1) {
      return send(res, 400, { error: "invalid note id" });
    }

    let body;
    try {
      body = await readBody(req);
    } catch {
      return send(res, 400, { error: "invalid json body" });
    }

    if (!body || (typeof body.pinned !== "boolean" && typeof body.resolved !== "boolean")) {
      return send(res, 400, { error: "expected body with at least one of: pinned, resolved" });
    }

    const note = notes.find((n) => n.id === id);
    if (!note) {
      return send(res, 404, { error: "note not found" });
    }

    if (typeof body.pinned === "boolean") {
      note.pinned = body.pinned;
    }
    if (typeof body.resolved === "boolean") {
      note.resolved = body.resolved;
    }
    return send(res, 200, { note });
  }

  if (url.startsWith("/api/")) return send(res, 404, { error: "unknown api route" });
  return serveStatic(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`ShiftBoard → http://127.0.0.1:${PORT}/`);
});
