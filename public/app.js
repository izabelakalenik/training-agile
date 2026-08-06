(async function () {
  const listEl = document.getElementById("list");
  const countEl = document.getElementById("count");
  const healthEl = document.getElementById("health");
  const statDay = document.getElementById("stat-day");
  const statNight = document.getElementById("stat-night");
  const statPinned = document.getElementById("stat-pinned");
  const shiftTabsEl = document.getElementById("shift-tabs");
  let notesState = [];
  let activeShift = "all";

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

  function getVisibleNotes() {
    if (activeShift === "all") return notesState;
    return notesState.filter((n) => n.shift === activeShift);
  }

  function render() {
    const visibleNotes = getVisibleNotes();
    updateStats(notesState);
    countEl.textContent = `${visibleNotes.length} showing`;
    listEl.innerHTML = visibleNotes.map((n) => `
      <li class="card ${n.pinned ? "pinned" : ""}" data-shift="${n.shift}" data-id="${n.id}">
        <div class="card-top">
          <div class="author">${escapeHtml(n.author)}</div>
          <span class="shift-tag ${n.shift}">${escapeHtml(n.shift)}</span>
        </div>
        <div class="body">${escapeHtml(n.body)}</div>
        <div class="meta-row">
          <button class="pin-toggle ${n.pinned ? "is-pinned" : ""}" type="button" data-action="toggle-pin" data-id="${n.id}" aria-pressed="${n.pinned ? "true" : "false"}">
            ${n.pinned ? "pinned" : "📌"}
          </button>
          <span class="time">${escapeHtml(formatTime(n.createdAt))}</span>
          <!-- Track Alpha: pin / unpin control -->
        </div>
      </li>
    `).join("");
  }

  function renderShiftTabs() {
    if (!shiftTabsEl) return;
    shiftTabsEl.innerHTML = `
      <div class="shift-tabs-control" role="tablist" aria-label="Filter notes by shift">
        <button type="button" class="shift-tab ${activeShift === "all" ? "active" : ""}" data-shift="all" role="tab" aria-selected="${activeShift === "all" ? "true" : "false"}">All</button>
        <button type="button" class="shift-tab ${activeShift === "day" ? "active" : ""}" data-shift="day" role="tab" aria-selected="${activeShift === "day" ? "true" : "false"}">Day</button>
        <button type="button" class="shift-tab ${activeShift === "night" ? "active" : ""}" data-shift="night" role="tab" aria-selected="${activeShift === "night" ? "true" : "false"}">Night</button>
      </div>
    `;
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
    notesState = Array.isArray(j.notes) ? j.notes : [];
    render();
  }

  async function togglePin(id, shouldPin) {
    const r = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: shouldPin }),
    });
    if (!r.ok) throw new Error(`pin toggle failed: ${r.status}`);
    const j = await r.json();
    const updated = j.note;
    notesState = notesState.map((n) => (n.id === updated.id ? updated : n));
    render();
  }

  await loadHealth();
  renderShiftTabs();
  await loadNotes();

  shiftTabsEl?.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const tab = target.closest("button[data-shift]");
    if (!(tab instanceof HTMLButtonElement)) return;

    const nextShift = tab.dataset.shift;
    if (nextShift !== "all" && nextShift !== "day" && nextShift !== "night") return;
    if (nextShift === activeShift) return;

    activeShift = nextShift;
    renderShiftTabs();
    render();
  });

  listEl.addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const btn = target.closest("button[data-action='toggle-pin']");
    if (!(btn instanceof HTMLButtonElement)) return;

    const id = Number(btn.dataset.id);
    if (!Number.isInteger(id)) return;

    const note = notesState.find((n) => n.id === id);
    if (!note) return;

    const shouldPin = !note.pinned;
    const card = btn.closest(".card");

    btn.disabled = true;
    btn.classList.toggle("is-pinned", shouldPin);
    btn.textContent = shouldPin ? "pinned" : "📌";
    btn.setAttribute("aria-pressed", shouldPin ? "true" : "false");
    if (card instanceof HTMLElement) {
      card.classList.toggle("pinned", shouldPin);
    }

    try {
      await togglePin(id, shouldPin);
    } catch (err) {
      console.error(err);
      btn.classList.toggle("is-pinned", note.pinned);
      btn.textContent = note.pinned ? "pinned" : "📌";
      btn.setAttribute("aria-pressed", note.pinned ? "true" : "false");
      if (card instanceof HTMLElement) {
        card.classList.toggle("pinned", note.pinned);
      }
    } finally {
      btn.disabled = false;
    }
  });
  // Track Charlie: wire tabs into #shift-tabs
  // Track Bravo: wire create form into #create-slot
  // Track Alpha: pin/unpin buttons + PATCH
})();
