const RSVP_STORAGE_KEY = "opus_rsvp_entries_v1";

const query = new URLSearchParams(location.search);
const activeInviteId = query.get("invite") || "";
const inviteTitle = query.get("title") || "초대장";

const subtitleEl = document.getElementById("adminSubtitle");
const searchInputEl = document.getElementById("searchInput");
const attendFilterEl = document.getElementById("attendFilter");
const mealFilterEl = document.getElementById("mealFilter");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const clearInviteBtn = document.getElementById("clearInviteBtn");
const tableBodyEl = document.getElementById("rsvpTableBody");

const statTotalResponsesEl = document.getElementById("statTotalResponses");
const statAttendEl = document.getElementById("statAttend");
const statAbsentEl = document.getElementById("statAbsent");
const statGuestsEl = document.getElementById("statGuests");
const statMealGuestsEl = document.getElementById("statMealGuests");

if (activeInviteId) {
  subtitleEl.textContent = `대상 초대장: ${inviteTitle} (${activeInviteId})`;
} else {
  subtitleEl.textContent = "초대장 ID가 없어 전체 데이터 기준으로 표시합니다.";
  clearInviteBtn.textContent = "전체 데이터 삭제";
}

function getEntries() {
  try {
    const raw = localStorage.getItem(RSVP_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setEntries(entries) {
  localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(entries));
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function byInvite(entries) {
  if (!activeInviteId) return entries;
  return entries.filter((entry) => entry.invitationId === activeInviteId);
}

function byUiFilters(entries) {
  const keyword = searchInputEl.value.trim().toLowerCase();
  const attendFilter = attendFilterEl.value;
  const mealFilter = mealFilterEl.value;

  return entries.filter((entry) => {
    const attendOk = attendFilter === "all" ? true : entry.attending === attendFilter;
    const mealOk = mealFilter === "all" ? true : (entry.meal || "-") === mealFilter;

    if (!keyword) {
      return attendOk && mealOk;
    }

    const searchTarget = [entry.guestName, entry.guestPhone, entry.side, entry.meal, entry.note, entry.eventTitle]
      .join(" ")
      .toLowerCase();
    return attendOk && mealOk && searchTarget.includes(keyword);
  });
}

function renderStats(entries) {
  const attendEntries = entries.filter((entry) => entry.attending === "참석");
  const absentEntries = entries.filter((entry) => entry.attending === "불참");
  const totalGuests = attendEntries.reduce((sum, entry) => sum + Number(entry.guestCount || 0), 0);
  const mealGuests = attendEntries
    .filter((entry) => (entry.meal || "식사 예정") === "식사 예정")
    .reduce((sum, entry) => sum + Number(entry.guestCount || 0), 0);

  statTotalResponsesEl.textContent = String(entries.length);
  statAttendEl.textContent = String(attendEntries.length);
  statAbsentEl.textContent = String(absentEntries.length);
  statGuestsEl.textContent = String(totalGuests);
  statMealGuestsEl.textContent = String(mealGuests);
}

function renderTable(entries) {
  if (entries.length === 0) {
    tableBodyEl.innerHTML = `
      <tr>
        <td colspan="9" class="empty-row">조건에 맞는 응답이 없습니다.</td>
      </tr>
    `;
    return;
  }

  tableBodyEl.innerHTML = entries
    .map(
      (entry) => `
      <tr>
        <td>${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}</td>
        <td>${escapeHtml(entry.guestName || "-")}</td>
        <td>${escapeHtml(entry.guestPhone || "-")}</td>
        <td>${escapeHtml(entry.side || "-")}</td>
        <td>${escapeHtml(entry.attending || "-")}</td>
        <td>${escapeHtml(String(entry.guestCount ?? "-"))}</td>
        <td>${escapeHtml(entry.meal || "-")}</td>
        <td>${escapeHtml(entry.note || "-")}</td>
        <td><button class="delete-btn" data-id="${escapeHtml(entry.id)}">삭제</button></td>
      </tr>
    `
    )
    .join("");
}

function render() {
  const entries = getEntries();
  const inviteEntries = byInvite(entries).sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
  const filtered = byUiFilters(inviteEntries);

  renderStats(inviteEntries);
  renderTable(filtered);
}

function csvEscape(value) {
  const str = String(value ?? "");
  return `"${str.replaceAll('"', '""')}"`;
}

function buildCsv(entries) {
  const header = ["최종수정시각", "초대장ID", "이름", "연락처", "구분", "참석", "인원", "식사", "메모"];
  const rows = entries.map((entry) => [
    formatDate(entry.updatedAt || entry.createdAt),
    entry.invitationId || "",
    entry.guestName || "",
    entry.guestPhone || "",
    entry.side || "",
    entry.attending || "",
    entry.guestCount ?? "",
    entry.meal || "",
    entry.note || "",
  ]);

  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function downloadCsv() {
  const inviteEntries = byInvite(getEntries());
  if (inviteEntries.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const csv = `\uFEFF${buildCsv(inviteEntries)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `rsvp-${activeInviteId || "all"}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function clearCurrentData() {
  const entries = getEntries();

  if (entries.length === 0) {
    alert("삭제할 데이터가 없습니다.");
    return;
  }

  const nextEntries = activeInviteId
    ? entries.filter((entry) => entry.invitationId !== activeInviteId)
    : [];

  const willDelete = entries.length - nextEntries.length;
  if (willDelete <= 0) {
    alert("현재 초대장에 해당하는 데이터가 없습니다.");
    return;
  }

  const ok = confirm(`${willDelete}개의 RSVP 데이터를 삭제할까요?`);
  if (!ok) return;

  setEntries(nextEntries);
  render();
}

function deleteOne(entryId) {
  const entries = getEntries();
  const nextEntries = entries.filter((entry) => entry.id !== entryId);

  if (entries.length === nextEntries.length) return;

  setEntries(nextEntries);
  render();
}

searchInputEl.addEventListener("input", render);
attendFilterEl.addEventListener("change", render);
mealFilterEl.addEventListener("change", render);
downloadCsvBtn.addEventListener("click", downloadCsv);
clearInviteBtn.addEventListener("click", clearCurrentData);

tableBodyEl.addEventListener("click", (event) => {
  const button = event.target.closest("button.delete-btn");
  if (!button) return;

  const entryId = button.dataset.id;
  if (!entryId) return;

  const ok = confirm("이 RSVP 항목을 삭제할까요?");
  if (!ok) return;

  deleteOne(entryId);
});

render();
