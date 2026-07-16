const STORE_KEY = "ftc-companion-v3";
const ONBOARDING_KEY = "firstpick-onboarding-complete";
const navOrder = ["home", "schedule", "scout", "watchlist", "teams"];

const defaultFormFields = [
  { id: "drivetrain", label: "Drivetrain", type: "select", options: ["Tank", "Mecanum", "Omni"], default: "Mecanum" },
  { id: "auto", label: "Autonomous", type: "select", options: ["Reliable", "Inconsistent", "None"], default: "Reliable" },
  { id: "endgame", label: "Endgame", type: "select", options: ["Full", "Partial", "None"], default: "Partial" },
  { id: "reliability", label: "Reliability", type: "slider", min: 1, max: 10, default: 7 },
  { id: "notes", label: "Notes", type: "text", default: "" }
];

const seedData = {
  eventName: "Competition Scout",
  theme: "dark",
  syncCode: "FTC-28874-7KQ",
  formFields: defaultFormFields,
  teams: [
    { number: "11234", name: "Circuit Breakers" },
    { number: "8642", name: "Gear Shift" },
    { number: "14590", name: "Voltage" },
    { number: "3102", name: "RoboRise" },
    { number: "7289", name: "Titanium Sparks" },
    { number: "9015", name: "Auto Nomads" }
  ],
  schedule: [
    { id: uid(), match: 12, time: minutesFromNow(8), red: ["11234", "8642"], blue: ["14590", "3102"] },
    { id: uid(), match: 13, time: minutesFromNow(22), red: ["7289", "9015"], blue: ["11234", "14590"] },
    { id: uid(), match: 14, time: minutesFromNow(36), red: ["3102", "7289"], blue: ["8642", "9015"] }
  ],
  reports: [
    {
      id: uid(),
      teamNumber: "11234",
      fields: { drivetrain: "Mecanum", auto: "Reliable", endgame: "Partial", reliability: 8, notes: "Clean driving and fast reset after defense." },
      createdAt: new Date().toISOString()
    }
  ],
  watchlist: [
    { id: uid(), teamNumber: "14590", notes: "Watch scoring consistency under defense." }
  ],
  reminders: [
    { id: uid(), text: "Replace drive battery before Match 12", done: false },
    { id: uid(), text: "Ask pit crew about auto preload issue", done: false }
  ]
};

let state = loadState();
let formValues = {};
let toastTimer;
let isRemoteUpdate = false;
let syncConnected = false;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function uid() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.documentElement.dataset.theme = state.theme;
  $("#eventName").textContent = state.eventName;
  registerServiceWorker();
  bindNavigation();
  bindForms();
  bindActions();
  initFormValues();
  renderAll();
  updateCountdown();
  setInterval(updateCountdown, 1000);
  setInterval(checkMatchNotifications, 30000);
  await tryFirebaseReconnect();
  maybeOpenOnboarding();
});

function minutesFromNow(minutes) {
  const date = new Date(Date.now() + minutes * 60000);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY));
    const nextState = stored ? { ...seedData, ...stored } : seedData;
    if (nextState.eventName === "FTC Meet Scout") nextState.eventName = "Competition Scout";
    if (!nextState.formFields) nextState.formFields = defaultFormFields;
    nextState.reports.forEach((report) => {
      if (!report.fields) {
        report.fields = {};
        defaultFormFields.forEach((f) => {
          report.fields[f.id] = report[f.id] ?? f.default ?? "";
        });
      }
    });
    return nextState;
  } catch {
    return seedData;
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  if (syncConnected && !isRemoteUpdate) {
    fbSync.save({
      eventName: state.eventName,
      formFields: state.formFields,
      teams: state.teams,
      schedule: state.schedule,
      reports: state.reports,
      watchlist: state.watchlist,
      reminders: state.reminders
    });
  }
  updateSyncIndicator();
}

function initFormValues() {
  formValues = {};
  state.formFields.forEach((field) => {
    formValues[field.id] = field.default ?? "";
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function bindNavigation() {
  $$("[data-nav], [data-go]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.nav || button.dataset.go));
  });
}

function showView(viewName) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === viewName));
  $$(".dock-item").forEach((item) => item.classList.toggle("active", item.dataset.nav === viewName));
  document.documentElement.style.setProperty("--dock-index", navOrder.indexOf(viewName));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindForms() {
  $("#scoutForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const teamNumber = $("#teamNumberInput").value.trim();
    if (!teamNumber) return;

    if (!state.teams.some((team) => team.number === teamNumber)) {
      state.teams.push({ number: teamNumber, name: "Unnamed team" });
    }

    const fields = {};
    state.formFields.forEach((field) => {
      const value = formValues[field.id];
      fields[field.id] = field.type === "slider" ? Number(value) : value;
    });

    state.reports.unshift({
      id: uid(),
      teamNumber,
      fields,
      createdAt: new Date().toISOString()
    });

    saveState();
    initFormValues();
    renderAll();
    showToast(`Saved scout report for Team ${teamNumber}`);
    showView("teams");
  });

  $("#teamSearch").addEventListener("input", renderTeams);
}

function bindActions() {
  $("#settingsButton").addEventListener("click", openSettings);
  $("#syncButton").addEventListener("click", openSync);
  $("#upcomingButton").addEventListener("click", () => openMatchSheet(getUpcomingMatch()));
  $("#scoutNextButton").addEventListener("click", () => {
    const target = getScoutNext();
    $("#teamNumberInput").value = target.teamNumber;
    showView("scout");
  });
  $("#notifyButton").addEventListener("click", requestNotifications);
  $("#editScheduleButton").addEventListener("click", openScheduleEditor);
  $("#editTeamsButton").addEventListener("click", openTeamEditor);
  $("#addWatchButton").addEventListener("click", openWatchEditor);
  $("#addReminderButton").addEventListener("click", openReminderEditor);
  $("#sheetBackdrop").addEventListener("click", closeSheet);
}

function renderAll() {
  renderScoutForm();
  renderSegments();
  renderHome();
  renderSchedule();
  renderTeams();
  renderWatchlist();
  renderReminders();
  updateNotificationState();
}

function renderScoutForm() {
  const container = $("#dynamicFormFields");
  if (!container) return;
  container.innerHTML = state.formFields.map((field) => {
    const val = formValues[field.id] ?? field.default ?? "";
    if (field.type === "select") {
      return `
        <fieldset>
          <legend>${escapeHtml(field.label)}</legend>
          <div class="segmented" data-field-id="${field.id}" style="--field-count: ${(field.options || []).length}">
            ${(field.options || []).map((opt) => `
              <button type="button" data-value="${escapeHtml(opt)}" class="${val === opt ? "active" : ""}">${escapeHtml(opt)}</button>
            `).join("")}
          </div>
        </fieldset>
      `;
    }
    if (field.type === "slider") {
      const min = field.min ?? 1;
      const max = field.max ?? 10;
      return `
        <label class="range-row" for="field-${field.id}">
          <span>${escapeHtml(field.label)}</span>
          <strong id="val-${field.id}">${val}/${max}</strong>
        </label>
        <input id="field-${field.id}" type="range" min="${min}" max="${max}" value="${val}">
      `;
    }
    if (field.type === "text") {
      return `
        <label class="field-label" for="field-${field.id}">${escapeHtml(field.label)}</label>
        <textarea id="field-${field.id}" rows="5" placeholder="${escapeHtml(field.label)}">${escapeHtml(val)}</textarea>
      `;
    }
    return "";
  }).join("");

  state.formFields.forEach((field) => {
    if (field.type === "select") {
      const group = $(`[data-field-id="${field.id}"]`);
      if (group) {
        group.addEventListener("click", (event) => {
          const button = event.target.closest("button");
          if (!button) return;
          formValues[field.id] = button.dataset.value;
          renderSegments();
        });
      }
    }
    if (field.type === "slider") {
      const input = $(`#field-${field.id}`);
      const display = $(`#val-${field.id}`);
      if (input && display) {
        input.addEventListener("input", () => {
          formValues[field.id] = Number(input.value);
          display.textContent = `${input.value}/${field.max ?? 10}`;
        });
      }
    }
    if (field.type === "text") {
      const input = $(`#field-${field.id}`);
      if (input) {
        input.addEventListener("input", () => {
          formValues[field.id] = input.value;
        });
      }
    }
  });
}

function renderSegments() {
  $$(".segmented[data-field-id]").forEach((group) => {
    const id = group.dataset.fieldId;
    const buttons = $$("button", group);
    const count = buttons.length;
    group.style.setProperty("--field-count", count);
    const activeIndex = Math.max(0, buttons.findIndex((button) => button.dataset.value === formValues[id]));
    group.style.setProperty("--selected-index", activeIndex);
    $$("button", group).forEach((button) => {
      button.classList.toggle("active", button.dataset.value === formValues[id]);
      button.setAttribute("aria-pressed", button.dataset.value === formValues[id]);
    });
  });
}

function sortedSchedule() {
  return [...state.schedule].sort((a, b) => timeToDate(a.time) - timeToDate(b.time));
}

function timeToDate(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  if (date < new Date(Date.now() - 2 * 60000)) date.setDate(date.getDate() + 1);
  return date;
}

function getUpcomingMatch() {
  return sortedSchedule().find((match) => timeToDate(match.time) >= new Date()) || sortedSchedule()[0];
}

function getScoutNext() {
  const reportCounts = state.teams.reduce((acc, team) => ({ ...acc, [team.number]: reportsFor(team.number).length }), {});
  const futureTeams = sortedSchedule().flatMap((match) => [...match.red, ...match.blue]);
  const teamNumber = futureTeams.sort((a, b) => (reportCounts[a] || 0) - (reportCounts[b] || 0))[0] || state.teams[0]?.number || "";
  const reason = reportCounts[teamNumber] ? "they need a fresher report" : "they do not have a report yet";
  return { teamNumber, reason };
}

function renderHome() {
  const upcoming = getUpcomingMatch();
  if (upcoming) {
    $("#upcomingTitle").textContent = `Match ${upcoming.match}`;
    $("#upcomingSubtitle").textContent = `Red ${upcoming.red.join(", ")} vs Blue ${upcoming.blue.join(", ")}`;
  }
  const scoutNext = getScoutNext();
  $("#scoutNextText").textContent = scoutNext.teamNumber ? `Team ${scoutNext.teamNumber}, ${scoutNext.reason}` : "Add teams to begin";
  $("#nextMatches").innerHTML = sortedSchedule().slice(0, 3).map(matchCard).join("") || emptyState("No matches yet");
  bindMatchButtons($("#nextMatches"));
}

function renderSchedule() {
  $("#scheduleList").innerHTML = sortedSchedule().map(matchCard).join("") || emptyState("Input schedule cards to begin");
  bindMatchButtons($("#scheduleList"));
}

function matchCard(match) {
  return `
    <article class="match-card" role="button" tabindex="0" data-match="${match.id}">
      <div class="match-top">
        <div>
          <strong>Match ${match.match}</strong>
          <small>${match.red.length + match.blue.length} teams assigned</small>
        </div>
        <span class="time-badge">${formatTime(match.time)}</span>
      </div>
      <div class="alliances">
        <div class="alliance red"><span>Red</span>${match.red.map((team) => `<button type="button" data-team="${team}">${teamName(team)}</button>`).join("")}</div>
        <div class="alliance blue"><span>Blue</span>${match.blue.map((team) => `<button type="button" data-team="${team}">${teamName(team)}</button>`).join("")}</div>
      </div>
    </article>
  `;
}

function bindMatchButtons(root) {
  $$("[data-match]", root).forEach((button) => {
    button.addEventListener("click", (event) => {
      const teamButton = event.target.closest("[data-team]");
      if (teamButton) {
        event.stopPropagation();
        openTeamSheet(teamButton.dataset.team);
        return;
      }
      openMatchSheet(state.schedule.find((match) => match.id === button.dataset.match));
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        button.click();
      }
    });
  });
}

function teamName(number) {
  const team = state.teams.find((item) => item.number === number);
  return team ? `${number} ${team.name}` : number;
}

function formatTime(time) {
  const date = timeToDate(time);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function renderTeams() {
  const search = $("#teamSearch").value.trim().toLowerCase();
  const teams = state.teams
    .filter((team) => `${team.number} ${team.name}`.toLowerCase().includes(search))
    .sort((a, b) => Number(a.number) - Number(b.number));

  $("#teamList").innerHTML = teams.map(teamCard).join("") || emptyState("No teams match that search");
  $$("[data-team-card]").forEach((card) => card.addEventListener("click", () => openTeamSheet(card.dataset.teamCard)));
}

function teamCard(team) {
  const reports = reportsFor(team.number);
  const sliderFields = state.formFields.filter((f) => f.type === "slider");
  const average = reports.length && sliderFields.length
    ? Math.round(reports.reduce((sum, r) => {
        const vals = sliderFields.map((f) => Number(r.fields?.[f.id]) || 0);
        return sum + vals.reduce((a, b) => a + b, 0) / vals.length;
      }, 0) / reports.length)
    : null;
  const first = reports[0];
  const chips = first && first.fields
    ? state.formFields.filter((f) => f.type !== "text").slice(0, 3).map((f) => {
        const v = first.fields[f.id];
        return v ? `<span class="chip">${escapeHtml(v)}</span>` : "";
      }).join("")
    : "";
  return `
    <button class="team-card" type="button" data-team-card="${team.number}">
      <div class="team-top">
        <div>
          <strong>${team.number} ${team.name}</strong>
          <small>${reports.length} scout ${reports.length === 1 ? "report" : "reports"}</small>
        </div>
        ${average ? `<span class="time-badge">${average}/10</span>` : "<span class=\"time-badge\">New</span>"}
      </div>
      <div class="chip-row">
        ${chips || "<span class=\"chip\">No scout data</span>"}
      </div>
    </button>
  `;
}

function reportsFor(teamNumber) {
  return state.reports.filter((report) => report.teamNumber === teamNumber);
}

function renderWatchlist() {
  $("#watchList").innerHTML = state.watchlist.map((item) => {
    const nextMatch = sortedSchedule().find((match) => [...match.red, ...match.blue].includes(item.teamNumber));
    return `
      <button class="team-card" type="button" data-watch="${item.id}">
        <div class="team-top">
          <div>
            <strong>${teamName(item.teamNumber)}</strong>
            <small>${nextMatch ? `Plays Match ${nextMatch.match} at ${formatTime(nextMatch.time)}` : "No match time entered"}</small>
          </div>
          <span class="time-badge">${reportsFor(item.teamNumber).length} reports</span>
        </div>
        <p>${item.notes || "No notes yet"}</p>
      </button>
    `;
  }).join("") || emptyState("Add teams you want alerts for");
  $$("[data-watch]").forEach((card) => card.addEventListener("click", () => openWatchEditor(card.dataset.watch)));
}

function renderReminders() {
  $("#reminderList").innerHTML = state.reminders.map((reminder) => `
    <button class="reminder-card" type="button" data-reminder="${reminder.id}">
      <div class="team-top">
        <strong>${reminder.done ? "Done" : "Open"}</strong>
        <span class="time-badge">${reminder.done ? "Cleared" : "Task"}</span>
      </div>
      <small>${reminder.text}</small>
    </button>
  `).join("") || emptyState("No team reminders");
  $$("[data-reminder]").forEach((card) => {
    card.addEventListener("click", () => {
      const reminder = state.reminders.find((item) => item.id === card.dataset.reminder);
      reminder.done = !reminder.done;
      saveState();
      renderReminders();
    });
  });
}

function updateCountdown() {
  const upcoming = getUpcomingMatch();
  if (!upcoming) {
    $("#countdown").textContent = "--:--";
    return;
  }
  const diff = Math.max(0, timeToDate(upcoming.time) - new Date());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  $("#countdown").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("Notifications are not available in this browser");
    return;
  }
  Notification.requestPermission().then((permission) => {
    updateNotificationState();
    showToast(permission === "granted" ? "Match notifications enabled" : "Notifications were not enabled");
  });
}

function updateNotificationState() {
  const status = "Notification" in window ? Notification.permission : "unavailable";
  $("#notificationState").textContent = status === "granted" ? "Enabled for this device" : "Enable notifications";
}

function checkMatchNotifications() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const upcoming = getUpcomingMatch();
  if (!upcoming) return;
  const diff = timeToDate(upcoming.time) - new Date();
  const key = `notified-${upcoming.id}`;
  if (diff > 0 && diff < 5 * 60000 && !sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(`Match ${upcoming.match} starts soon`, {
        body: `Red ${upcoming.red.join(", ")} vs Blue ${upcoming.blue.join(", ")}`,
        icon: "assets/icon.svg",
        badge: "assets/icon.svg"
      });
    });
  }
}

function openMatchSheet(match) {
  if (!match) return;
  openSheet(`
    <h2>Match ${match.match}</h2>
    <p class="field-label">${formatTime(match.time)} start</p>
    <div class="alliances">
      <div class="alliance red"><span>Red alliance</span>${match.red.map((team) => `<button type="button" data-sheet-team="${team}">${teamName(team)}</button>`).join("")}</div>
      <div class="alliance blue"><span>Blue alliance</span>${match.blue.map((team) => `<button type="button" data-sheet-team="${team}">${teamName(team)}</button>`).join("")}</div>
    </div>
    <div class="sheet-actions">
      <button class="secondary-button" type="button" data-close>Close</button>
      <button class="submit-button" type="button" data-scout-match>Scout a team</button>
    </div>
  `);
  $$("[data-sheet-team]").forEach((button) => button.addEventListener("click", () => openTeamSheet(button.dataset.sheetTeam)));
  $("[data-scout-match]").addEventListener("click", () => {
    $("#teamNumberInput").value = [...match.red, ...match.blue][0] || "";
    closeSheet();
    showView("scout");
  });
}

function renderReportChips(report) {
  const chips = [];
  state.formFields.forEach((f) => {
    const v = report.fields?.[f.id];
    if (v == null || v === "") return;
    if (f.type === "text") return;
    chips.push(`<span class="chip">${escapeHtml(f.label)}: ${escapeHtml(String(v))}</span>`);
  });
  return chips.join("");
}

function renderReportNotes(report) {
  const textFields = state.formFields.filter((f) => f.type === "text");
  const parts = textFields.map((f) => {
    const v = report.fields?.[f.id];
    return v ? `<p><strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(v)}</p>` : "";
  }).filter(Boolean);
  return parts.join("") || "<p>No notes</p>";
}

function openTeamSheet(teamNumber) {
  const team = state.teams.find((item) => item.number === teamNumber) || { number: teamNumber, name: "Unnamed team" };
  const reports = reportsFor(teamNumber);
  openSheet(`
    <h2>${team.number} ${team.name}</h2>
    <p class="field-label">${reports.length} shared scout ${reports.length === 1 ? "report" : "reports"}</p>
    <div class="sheet-grid">
      ${reports.map((report) => `
        <article class="editor-card">
          <div class="chip-row">${renderReportChips(report)}</div>
          ${renderReportNotes(report)}
        </article>
      `).join("") || emptyState("No scout reports yet")}
    </div>
    <div class="sheet-actions">
      <button class="secondary-button" type="button" data-close>Close</button>
      <button class="submit-button" type="button" data-scout-team="${team.number}">Scout</button>
    </div>
  `);
  $("[data-scout-team]").addEventListener("click", (event) => {
    $("#teamNumberInput").value = event.currentTarget.dataset.scoutTeam;
    closeSheet();
    showView("scout");
  });
}

function openSettings() {
  openSheet(`
    <h2>Settings</h2>
    <div class="sheet-grid">
      <label class="field-label" for="eventNameInput">Event name</label>
      <input id="eventNameInput" value="${escapeHtml(state.eventName)}">
      <fieldset>
        <legend>Theme</legend>
        <div class="segmented" id="themeSegment">
          <button type="button" data-theme-choice="dark" class="${state.theme === "dark" ? "active" : ""}">Dark</button>
          <button type="button" data-theme-choice="light" class="${state.theme === "light" ? "active" : ""}">Light</button>
          <button type="button" data-theme-choice="dark">Auto</button>
        </div>
      </fieldset>
    </div>
    <hr class="settings-divider">
    <button class="danger-button" type="button" id="clearAllData" style="width:100%;">Clear all data</button>
    <button class="secondary-button" type="button" id="customizeFormButton" style="width:100%;margin-top:0.5rem;">Customize form</button>
    <div class="sheet-actions">
      <button class="secondary-button" type="button" data-close>Cancel</button>
      <button class="submit-button" type="button" id="saveSettings">Save</button>
    </div>
  `);
  $$("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      state.theme = button.dataset.themeChoice;
      $$("[data-theme-choice]").forEach((item) => item.classList.toggle("active", item === button));
      document.documentElement.dataset.theme = state.theme;
    });
  });
  $("#saveSettings").addEventListener("click", () => {
    state.eventName = $("#eventNameInput").value.trim() || "Competition Scout";
    $("#eventName").textContent = state.eventName;
    saveState();
    closeSheet();
    showToast("Settings saved");
  });
  $("#clearAllData").addEventListener("click", () => {
    closeSheet();
    openClearDataConfirm();
  });
  $("#customizeFormButton").addEventListener("click", () => {
    closeSheet();
    openFormEditor();
  });
}

function openClearDataConfirm() {
  openSheet(`
    <h2>Clear all data?</h2>
    <div class="sheet-grid">
      <p style="text-align:center;color:var(--muted);">This will delete all teams, matches, reports, watchlist items, and reminders. This data will also be deleted from all connected apps.</p>
    </div>
    <div class="sheet-actions">
      <button class="secondary-button" type="button" data-close>Cancel</button>
      <button class="danger-button" type="button" id="confirmClearData">Delete everything</button>
    </div>
  `);
  $("#confirmClearData").addEventListener("click", () => {
    state.teams = [];
    state.schedule = [];
    state.reports = [];
    state.watchlist = [];
    state.reminders = [];
    saveState();
    renderAll();
    closeSheet();
    showToast("All data cleared");
  });
}

function maybeOpenOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY)) return;
  window.setTimeout(openOnboarding, 450);
}

function openOnboarding() {
  openSheet(`
    <div class="onboarding-hero">
      <span class="app-mark" aria-hidden="true">FP</span>
      <div>
        <span class="eyebrow">Welcome to FirstPick</span>
        <h2>Install it like a real app</h2>
      </div>
    </div>
    <p class="field-label">FirstPick works best from your home screen during competitions, with quick access to scouting, schedules, and reminders.</p>
    <div class="install-steps">
      <article>
        <strong>iPhone Safari</strong>
        <span>Tap Share, then Add to Home Screen.</span>
      </article>
      <article>
        <strong>Chrome or Android</strong>
        <span>Open the browser menu, then choose Install app or Add to Home screen.</span>
      </article>
      <article>
        <strong>After installing</strong>
        <span>Open FirstPick from your home screen before matches start.</span>
      </article>
    </div>
    <div class="sheet-actions">
      <button class="secondary-button" type="button" id="remindInstallLater">Later</button>
      <button class="submit-button" type="button" id="finishOnboarding">Got it</button>
    </div>
  `);
  $("#finishOnboarding").addEventListener("click", completeOnboarding);
  $("#remindInstallLater").addEventListener("click", closeSheet);
}

function completeOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, "1");
  closeSheet();
  showToast("FirstPick is ready");
}

function openSync() {
  if (syncConnected) {
    openSheet(`
      <h2>Sync connected</h2>
      <p class="field-label">Devices with this code share all scouting data in real time.</p>
      <div class="qr-panel">${fbSync.getCode()}</div>
      <div class="sheet-grid">
        <p style="text-align:center;color:var(--success);font-weight:800;">Live</p>
      </div>
      <div class="sheet-actions">
        <button class="secondary-button" type="button" data-close>Close</button>
        <button class="danger-button" type="button" id="disconnectSync">Disconnect</button>
      </div>
    `);
    $("#disconnectSync").addEventListener("click", () => {
      fbSync.disconnect();
      syncConnected = false;
      showToast("Sync disconnected");
      closeSheet();
      updateSyncIndicator();
    });
    return;
  }

  openSheet(`
    <h2>Sync with Firebase</h2>
    <p class="field-label">Create a new sync session or join an existing one to share data across devices in real time.</p>
    <div class="sheet-actions" style="grid-template-columns:1fr;">
      <button class="submit-button" type="button" id="createSession">Create new session</button>
    </div>
    <div class="sheet-grid">
      <input id="joinCodeInput" placeholder="Enter session code (e.g. FTC-12345-ABC)" autocomplete="off">
    </div>
    <div class="sheet-actions">
      <button class="secondary-button" type="button" data-close>Cancel</button>
      <button class="submit-button" type="button" id="joinSession">Join session</button>
    </div>
  `);
  $("#createSession").addEventListener("click", createSyncSession);
  $("#joinSession").addEventListener("click", () => {
    const code = $("#joinCodeInput").value.trim().toUpperCase();
    if (code) joinSyncSession(code);
    else showToast("Enter a session code first");
  });
  $("#joinCodeInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = e.target.value.trim().toUpperCase();
      if (code) joinSyncSession(code);
    }
  });
}

function openScheduleEditor() {
  openSheet(`
    <h2>Input schedule</h2>
    <div class="sheet-grid" id="scheduleEditor"></div>
    <button class="secondary-button" type="button" id="addMatchButton">Add match card</button>
    <div class="sheet-actions">
      <button class="secondary-button" type="button" data-close>Cancel</button>
      <button class="submit-button" type="button" id="saveSchedule">Save</button>
    </div>
  `);
  renderScheduleEditor();
  $("#addMatchButton").addEventListener("click", () => {
    state.schedule.push({ id: uid(), match: state.schedule.length + 1, time: minutesFromNow(45), red: ["", ""], blue: ["", ""] });
    renderScheduleEditor();
  });
  $("#saveSchedule").addEventListener("click", () => {
    state.schedule = $$(".editor-card", $("#scheduleEditor")).map((card) => ({
      id: card.dataset.id,
      match: Number($("[data-field='match']", card).value) || 1,
      time: $("[data-field='time']", card).value || "12:00",
      red: [$("[data-field='red1']", card).value.trim(), $("[data-field='red2']", card).value.trim()].filter(Boolean),
      blue: [$("[data-field='blue1']", card).value.trim(), $("[data-field='blue2']", card).value.trim()].filter(Boolean)
    }));
    saveState();
    renderAll();
    closeSheet();
    showToast("Schedule updated");
  });
}

function renderScheduleEditor() {
  $("#scheduleEditor").innerHTML = state.schedule.map((match) => `
    <div class="editor-card" data-id="${match.id}">
      <strong class="editor-title">Match card</strong>
      <div class="editor-grid">
        <label class="editor-field">
          <span>Match number</span>
          <input data-field="match" inputmode="numeric" value="${match.match}" aria-label="Match number">
        </label>
        <label class="editor-field">
          <span>Start time</span>
          <input data-field="time" type="time" value="${match.time}" aria-label="Match time">
        </label>
        <label class="editor-field alliance-field red-field">
          <span>Red alliance 1</span>
          <input data-field="red1" inputmode="numeric" value="${match.red[0] || ""}" placeholder="Team #">
        </label>
        <label class="editor-field alliance-field red-field">
          <span>Red alliance 2</span>
          <input data-field="red2" inputmode="numeric" value="${match.red[1] || ""}" placeholder="Team #">
        </label>
        <label class="editor-field alliance-field blue-field">
          <span>Blue alliance 1</span>
          <input data-field="blue1" inputmode="numeric" value="${match.blue[0] || ""}" placeholder="Team #">
        </label>
        <label class="editor-field alliance-field blue-field">
          <span>Blue alliance 2</span>
          <input data-field="blue2" inputmode="numeric" value="${match.blue[1] || ""}" placeholder="Team #">
        </label>
      </div>
    </div>
  `).join("");
}

function openTeamEditor() {
  openSheet(`
    <h2>Update teams</h2>
    <div class="sheet-grid" id="teamEditor"></div>
    <button class="secondary-button" type="button" id="addTeamButton">Add team</button>
    <div class="sheet-actions">
      <button class="secondary-button" type="button" data-close>Cancel</button>
      <button class="submit-button" type="button" id="saveTeams">Save</button>
    </div>
  `);
  renderTeamEditor();
  $("#addTeamButton").addEventListener("click", () => {
    state.teams.push({ number: "", name: "" });
    renderTeamEditor();
  });
  $("#saveTeams").addEventListener("click", () => {
    state.teams = $$(".editor-card", $("#teamEditor")).map((card) => ({
      number: $("[data-field='number']", card).value.trim(),
      name: $("[data-field='name']", card).value.trim() || "Unnamed team"
    })).filter((team) => team.number);
    saveState();
    renderAll();
    closeSheet();
    showToast("Team list updated");
  });
}

function renderTeamEditor() {
  $("#teamEditor").innerHTML = state.teams.map((team) => `
    <div class="editor-card">
      <div class="editor-grid">
        <input data-field="number" inputmode="numeric" value="${escapeHtml(team.number)}" placeholder="Team number">
        <input data-field="name" value="${escapeHtml(team.name)}" placeholder="Team name">
      </div>
    </div>
  `).join("");
}

function openWatchEditor(id) {
  const item = state.watchlist.find((watch) => watch.id === id) || { id: uid(), teamNumber: "", notes: "" };
  openSheet(`
    <h2>${id ? "Edit watch" : "Add watch"}</h2>
    <div class="sheet-grid">
      <input id="watchTeamInput" inputmode="numeric" value="${escapeHtml(item.teamNumber)}" placeholder="Team number">
      <textarea id="watchNotesInput" rows="4" placeholder="Notes">${escapeHtml(item.notes)}</textarea>
    </div>
    <div class="sheet-actions">
      <button class="danger-button" type="button" id="deleteWatch">${id ? "Remove" : "Cancel"}</button>
      <button class="submit-button" type="button" id="saveWatch">Save</button>
    </div>
  `);
  $("#deleteWatch").addEventListener("click", () => {
    state.watchlist = state.watchlist.filter((watch) => watch.id !== id);
    saveState();
    renderWatchlist();
    closeSheet();
  });
  $("#saveWatch").addEventListener("click", () => {
    item.teamNumber = $("#watchTeamInput").value.trim();
    item.notes = $("#watchNotesInput").value.trim();
    if (!item.teamNumber) return;
    if (!id) state.watchlist.push(item);
    saveState();
    renderWatchlist();
    closeSheet();
    showToast("Watchlist updated");
  });
}

function openReminderEditor() {
  openSheet(`
    <h2>Add reminder</h2>
    <div class="sheet-grid">
      <input id="reminderInput" placeholder="Replace battery before Match 14">
    </div>
    <div class="sheet-actions">
      <button class="secondary-button" type="button" data-close>Cancel</button>
      <button class="submit-button" type="button" id="saveReminder">Save</button>
    </div>
  `);
  $("#saveReminder").addEventListener("click", () => {
    const text = $("#reminderInput").value.trim();
    if (!text) return;
    state.reminders.unshift({ id: uid(), text, done: false });
    saveState();
    renderReminders();
    closeSheet();
  });
}

function openFormEditor() {
  openSheet(`
    <h2>Customize form</h2>
    <p class="field-label">Add, remove, or reorder scout form fields.</p>
    <div class="sheet-grid" id="formEditor"></div>
    <button class="secondary-button" type="button" id="addFormFieldButton">Add field</button>
    <div class="sheet-actions">
      <button class="secondary-button" type="button" data-close>Cancel</button>
      <button class="submit-button" type="button" id="saveFormFields">Save</button>
    </div>
  `);
  renderFormEditor();
  $("#addFormFieldButton").addEventListener("click", () => {
    state.formFields.push({ id: "field-" + Date.now(), label: "", type: "select", options: ["Option A", "Option B", "Option C"], default: "Option A" });
    renderFormEditor();
  });
  $("#saveFormFields").addEventListener("click", () => {
    const cards = $$(".editor-card", $("#formEditor"));
    state.formFields = cards.map((card) => {
      const id = card.dataset.fieldId;
      const label = $("[data-ff='label']", card).value.trim();
      const type = $("[data-ff='type']", card).value;
      const options = type === "select" ? $("[data-ff='options']", card).value.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const def = type === "select" ? (options[0] || "") : type === "slider" ? 7 : "";
      return { id, label: label || "Untitled", type, options, default: def, min: 1, max: 10 };
    });
    initFormValues();
    saveState();
    renderAll();
    closeSheet();
    showToast("Form updated");
  });
}

function renderFormEditor() {
  $("#formEditor").innerHTML = state.formFields.map((field) => `
    <div class="editor-card" data-field-id="${field.id}">
      <div class="editor-grid">
        <label class="editor-field">
          <span>Label</span>
          <input data-ff="label" value="${escapeHtml(field.label)}" placeholder="Field label">
        </label>
        <label class="editor-field">
          <span>Type</span>
          <select data-ff="type" class="field-type-select">
            <option value="select" ${field.type === "select" ? "selected" : ""}>Multiple choice</option>
            <option value="slider" ${field.type === "slider" ? "selected" : ""}>Slider</option>
            <option value="text" ${field.type === "text" ? "selected" : ""}>Text box</option>
          </select>
        </label>
        <label class="editor-field field-options" style="${field.type !== "select" ? "display:none" : ""}">
          <span>Options (comma-separated)</span>
          <input data-ff="options" value="${escapeHtml((field.options || []).join(", "))}" placeholder="Tank, Mecanum, Omni">
        </label>
      </div>
      <button class="danger-button" type="button" data-remove-field="${field.id}" style="width:100%;margin-top:0.5rem;">Delete field</button>
    </div>
  `).join("");

  $$("[data-ff='type']").forEach((sel) => {
    sel.addEventListener("change", () => {
      const card = sel.closest(".editor-card");
      const optsField = $(".field-options", card);
      optsField.style.display = sel.value === "select" ? "" : "none";
    });
  });

  $$("[data-remove-field]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.formFields = state.formFields.filter((f) => f.id !== btn.dataset.removeField);
      renderFormEditor();
    });
  });
}

function updateSyncIndicator() {
  const btn = $("#syncButton");
  if (!btn) return;
  btn.style.color = syncConnected ? "var(--success)" : "";
  btn.title = syncConnected ? `Synced: ${fbSync.getCode()}` : "Sync (not connected)";
}

async function tryFirebaseReconnect() {
  try {
    const data = await fbSync.tryReconnect();
    if (data) {
      Object.assign(state, data);
      if (!state.formFields) state.formFields = defaultFormFields;
      syncConnected = true;
      fbSync.onRemoteChange = handleRemoteUpdate;
      saveState();
      renderAll();
      showToast("Sync reconnected");
    }
  } catch {
    syncConnected = false;
  }
  updateSyncIndicator();
}

async function createSyncSession() {
  try {
    const code = await fbSync.create({
      eventName: state.eventName,
      formFields: state.formFields,
      teams: state.teams,
      schedule: state.schedule,
      reports: state.reports,
      watchlist: state.watchlist,
      reminders: state.reminders
    });
    syncConnected = true;
    fbSync.onRemoteChange = handleRemoteUpdate;
    closeSheet();
    showToast(`Session created: ${code}`);
    updateSyncIndicator();
  } catch (err) {
    showToast("Failed to create session: " + err.message);
  }
}

async function joinSyncSession(code) {
  try {
    const data = await fbSync.join(code);
    if (!data) {
      showToast("Session not found");
      return;
    }
    Object.assign(state, data);
    if (!state.formFields) state.formFields = defaultFormFields;
    syncConnected = true;
    fbSync.onRemoteChange = handleRemoteUpdate;
    saveState();
    renderAll();
    closeSheet();
    showToast(`Joined session: ${code}`);
    updateSyncIndicator();
  } catch (err) {
    showToast("Failed to join: " + err.message);
  }
}

function handleRemoteUpdate(data) {
  if (!data) return;
  isRemoteUpdate = true;
  const prevEventName = state.eventName;
  const prevFormFields = state.formFields;
  Object.assign(state, data);
  if (!state.formFields) state.formFields = defaultFormFields;
  if (state.eventName !== prevEventName) {
    $("#eventName").textContent = state.eventName;
  }
  if (state.formFields !== prevFormFields) {
    initFormValues();
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  renderAll();
  isRemoteUpdate = false;
}

function openSheet(html) {
  const sheet = $("#detailSheet");
  sheet.innerHTML = html;
  sheet.hidden = false;
  $("#sheetBackdrop").hidden = false;
  $$("[data-close]", sheet).forEach((button) => button.addEventListener("click", closeSheet));
}

function closeSheet() {
  $("#detailSheet").hidden = true;
  $("#sheetBackdrop").hidden = true;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function emptyState(message) {
  return `<div class="empty-state">${message}</div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
