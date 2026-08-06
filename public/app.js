(async function () {
  const listEl = document.getElementById("list");
  const countEl = document.getElementById("count");
  const healthEl = document.getElementById("health");
  const statDay = document.getElementById("stat-day");
  const statNight = document.getElementById("stat-night");
  const statPinned = document.getElementById("stat-pinned");

  async function loadHealth() {
    try {
      const r = await fetch("/api/health");
      const j = await r.json();
      healthEl.textContent = j.ok ? "live" : "down";
      healthEl.classList.toggle("ok", !!j.ok);
    } catch {
      healthEl.textContent = "down";
    }
  }

  function updateStats(notes) {
    statDay.textContent = String(notes.filter((n) => n.shift === "day").length);
    statNight.textContent = String(notes.filter((n) => n.shift === "night").length);
    statPinned.textContent = String(notes.filter((n) => n.pinned).length);
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  }

  function render(notes) {
    updateStats(notes);
    countEl.textContent = `${notes.length} showing`;
    listEl.innerHTML = notes.map((n) => `
      <li class="card ${n.pinned ? "pinned" : ""}" data-shift="${n.shift}" data-id="${n.id}">
        <div class="card-top">
          <div class="author">${escapeHtml(n.author)}</div>
          <span class="shift-tag ${n.shift}">${escapeHtml(n.shift)}</span>
        </div>
        <div class="body">${escapeHtml(n.body)}</div>
        <div class="meta-row">
          ${n.pinned ? '<span class="badge">pinned</span>' : ""}
          <span class="time">${escapeHtml(formatTime(n.createdAt))}</span>
          <!-- Track Alpha: pin / unpin control -->
        </div>
      </li>
    `).join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  async function loadNotes() {
    const r = await fetch("/api/notes");
    const j = await r.json();
    render(j.notes || []);
  }

  await loadHealth();
  await loadNotes();
  // Track Charlie: wire tabs into #shift-tabs
  // Track Bravo: wire create form into #create-slot
  // Track Alpha: pin/unpin buttons + PATCH
})();
