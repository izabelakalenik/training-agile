(async function () {
  const listEl = document.getElementById("list");
  const countEl = document.getElementById("count");
  const healthEl = document.getElementById("health");
  const statDay = document.getElementById("stat-day");
  const statNight = document.getElementById("stat-night");
  const statPinned = document.getElementById("stat-pinned");
  const createSlot = document.getElementById("create-slot");

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

  function mountCreateForm() {
    if (!createSlot) return;
    createSlot.innerHTML = `
      <h2>Leave a note</h2>
      <form id="create-form" class="create-form" novalidate>
        <label class="field">
          <span>Shift</span>
          <select id="note-shift" name="shift" required>
            <option value="day">Day</option>
            <option value="night">Night</option>
          </select>
        </label>
        <label class="field">
          <span>Author</span>
          <input id="note-author" name="author" type="text" maxlength="40" placeholder="e.g. ops-lead" required />
        </label>
        <label class="field">
          <span>Note</span>
          <textarea id="note-body" name="body" rows="4" maxlength="280" placeholder="What should the next crew know?" required></textarea>
        </label>
        <p id="create-error" class="form-error" role="status" aria-live="polite"></p>
        <button id="create-submit" type="submit">Add note</button>
      </form>
      <p class="muted small">Crews add notes without editing seed data.</p>
    `;

    const form = document.getElementById("create-form");
    const errorEl = document.getElementById("create-error");
    const bodyEl = document.getElementById("note-body");
    const submitBtn = document.getElementById("create-submit");

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!bodyEl || !errorEl || !submitBtn) return;

      const payload = {
        shift: String(form.shift.value || "").trim().toLowerCase(),
        author: String(form.author.value || "").trim(),
        body: String(form.body.value || "").trim(),
      };

      if (!payload.body) {
        errorEl.textContent = "Note body cannot be empty.";
        bodyEl.focus();
        return;
      }

      errorEl.textContent = "";
      submitBtn.disabled = true;
      try {
        const r = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          errorEl.textContent = j.error || "Could not create note.";
          return;
        }

        form.reset();
        form.shift.value = "day";
        await loadHealth();
        await loadNotes();
      } catch {
        errorEl.textContent = "Network error while creating note.";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  mountCreateForm();
  await loadHealth();
  await loadNotes();
  // Track Charlie: wire tabs into #shift-tabs
  // Track Alpha: pin/unpin buttons + PATCH
})();
