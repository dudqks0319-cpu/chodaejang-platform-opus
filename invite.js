const RSVP_STORAGE_KEY = "opus_rsvp_entries_v1";

const TEMPLATE_CLASS = {
  classic: "template-classic",
  minimal: "template-minimal",
  warm: "template-warm",
  neon: "template-neon",
  hanji: "template-hanji",
};

function fromBase64Url(str) {
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return decodeURIComponent(escape(atob(normalized + pad)));
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function formatDate(value) {
  if (!value) return "일시 미정";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mapLinksHtml(address) {
  const encoded = encodeURIComponent(address);

  const naver = `https://map.naver.com/v5/search/${encoded}`;
  const kakao = `https://map.kakao.com/?q=${encoded}`;
  const google = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  return `
    <a href="${naver}" target="_blank" rel="noopener noreferrer">네이버 지도</a>
    <a href="${kakao}" target="_blank" rel="noopener noreferrer">카카오맵</a>
    <a href="${google}" target="_blank" rel="noopener noreferrer">구글 지도</a>
  `;
}

function getRsvpEntries() {
  try {
    const raw = localStorage.getItem(RSVP_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setRsvpEntries(entries) {
  localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(entries));
}

function renderQr(targetUrl) {
  const qrCodeEl = document.getElementById("inviteQrCode");
  qrCodeEl.innerHTML = "";

  new QRCode(qrCodeEl, {
    text: targetUrl,
    width: 128,
    height: 128,
    colorDark: "#111827",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
}

function applyTemplate(card, templateKey) {
  Object.values(TEMPLATE_CLASS).forEach((klass) => card.classList.remove(klass));
  card.classList.add(TEMPLATE_CLASS[templateKey] || TEMPLATE_CLASS.classic);
}

function syncRsvpCountState() {
  const attendEl = document.getElementById("rsvpAttend");
  const countEl = document.getElementById("rsvpGuestCount");
  const mealEl = document.getElementById("rsvpMeal");
  if (!attendEl || !countEl || !mealEl) return;

  if (attendEl.value === "불참") {
    countEl.value = "0";
    countEl.disabled = true;
    mealEl.value = "식사 안 함";
    mealEl.disabled = true;
  } else {
    countEl.disabled = false;
    mealEl.disabled = false;
    if (Number(countEl.value) <= 0) {
      countEl.value = "1";
    }
  }
}

function getParticipantKey(invitationId, guestName, guestPhone) {
  const normalizedPhone = String(guestPhone || "").replace(/\D/g, "");
  const normalizedName = String(guestName || "").trim().toLowerCase();

  return normalizedPhone
    ? `${invitationId}::phone::${normalizedPhone}`
    : `${invitationId}::name::${normalizedName}`;
}

function showMissingDataMessage() {
  document.getElementById("inviteHeaderTitle").textContent = "유효하지 않은 초대장 링크입니다";
  document.getElementById("inviteHeaderSub").textContent = "링크가 손상되었거나 만료되었습니다.";

  document.querySelectorAll(".invite-panel, #inviteCard").forEach((el) => {
    el.style.display = "none";
  });
}

function init() {
  const query = new URLSearchParams(location.search);
  const encodedData = query.get("data");

  if (!encodedData) {
    showMissingDataMessage();
    return;
  }

  let data;
  try {
    data = JSON.parse(fromBase64Url(encodedData));
  } catch {
    showMissingDataMessage();
    return;
  }

  const invitationId = `inv-${hashString(encodedData)}`;

  const card = document.getElementById("inviteCard");
  applyTemplate(card, data.template);

  if (data.backgroundImage) {
    card.style.backgroundImage = `url(${data.backgroundImage})`;
  }

  document.title = data.eventTitle ? `${data.eventTitle} | 모바일 초대장` : "모바일 초대장";

  document.getElementById("inviteHeaderTitle").textContent = data.eventTitle || "모바일 초대장";
  document.getElementById("inviteHeaderSub").textContent = data.message || "소중한 날, 함께해 주세요.";

  document.getElementById("inviteCharacter").textContent = data.character || "";
  document.getElementById("inviteType").textContent = data.eventType || "행사";
  document.getElementById("inviteTitle").textContent = data.eventTitle || "초대장";
  document.getElementById("inviteHost").textContent = data.hostName ? `초대자: ${data.hostName}` : "";
  document.getElementById("inviteDate").textContent = `일시: ${formatDate(data.eventDate)}`;
  document.getElementById("inviteVenue").textContent = `장소: ${data.venueName || "장소 미정"}`;
  document.getElementById("inviteAddress").textContent = `주소: ${data.address || "주소 미입력"}`;
  document.getElementById("invitePhone").textContent = `연락처: ${data.phone || "연락처 미입력"}`;
  document.getElementById("inviteMessage").textContent = data.message || "소중한 날, 함께해 주세요.";

  const accountEl = document.getElementById("inviteAccount");
  const copyAccountBtn = document.getElementById("copyAccountBtn");
  const showAccount = Boolean(data.showAccount && data.account);

  if (showAccount) {
    accountEl.textContent = `💳 축의/회비 계좌: ${data.account}`;
    copyAccountBtn.style.display = "inline-flex";
  } else {
    accountEl.style.display = "none";
    copyAccountBtn.style.display = "none";
  }

  copyAccountBtn.addEventListener("click", async () => {
    if (!data.account) return;

    try {
      await navigator.clipboard.writeText(data.account);
      copyAccountBtn.textContent = "계좌 복사 완료";
      setTimeout(() => {
        copyAccountBtn.textContent = "계좌 복사";
      }, 1200);
    } catch {
      alert("계좌 복사에 실패했습니다.");
    }
  });

  const addressLineEl = document.getElementById("inviteAddressLine");
  const mapLinksEl = document.getElementById("inviteMapLinks");
  if (data.address) {
    addressLineEl.textContent = `${data.venueName ? `${data.venueName} · ` : ""}${data.address}`;
    mapLinksEl.innerHTML = mapLinksHtml(data.address);
  } else {
    addressLineEl.textContent = "주소 정보가 없습니다.";
    mapLinksEl.textContent = "지도 링크를 표시할 수 없습니다.";
  }

  const qrWrap = document.getElementById("inviteQrWrap");
  if (data.showQr) {
    renderQr(location.href);
    qrWrap.style.display = "block";
  } else {
    qrWrap.style.display = "none";
  }

  const rsvpForm = document.getElementById("inviteRsvpForm");
  const rsvpStatusEl = document.getElementById("rsvpStatus");
  const attendEl = document.getElementById("rsvpAttend");

  rsvpForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(rsvpForm);
    const guestName = String(formData.get("guestName") || "").trim();

    if (!guestName) {
      rsvpStatusEl.textContent = "이름을 입력해 주세요.";
      return;
    }

    const guestPhone = String(formData.get("guestPhone") || "").trim();
    const attending = String(formData.get("attending") || "참석");
    const countValue = Number(formData.get("guestCount") || 0);
    const guestCount = attending === "참석" ? Math.max(countValue, 1) : 0;
    const meal = attending === "불참" ? "식사 안 함" : String(formData.get("meal") || "식사 예정");

    const nowIso = new Date().toISOString();

    const entry = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      invitationId,
      eventTitle: data.eventTitle || "초대장",
      guestName,
      guestPhone,
      attending,
      guestCount,
      meal,
      note: String(formData.get("note") || "").trim(),
      createdAt: nowIso,
      updatedAt: nowIso,
      source: "invite-page",
      participantKey: getParticipantKey(invitationId, guestName, guestPhone),
    };

    const entries = getRsvpEntries();
    const existingIndex = entries.findIndex((item) => {
      if (item.participantKey) {
        return item.participantKey === entry.participantKey;
      }
      return getParticipantKey(item.invitationId, item.guestName, item.guestPhone) === entry.participantKey;
    });

    const isUpdate = existingIndex >= 0;

    if (isUpdate) {
      const previous = entries[existingIndex];
      entries[existingIndex] = {
        ...previous,
        ...entry,
        id: previous.id,
        createdAt: previous.createdAt,
        updatedAt: nowIso,
      };
    } else {
      entries.unshift(entry);
    }

    setRsvpEntries(entries);

    rsvpForm.reset();
    attendEl.value = "참석";
    document.getElementById("rsvpGuestCount").value = "1";
    document.getElementById("rsvpMeal").value = "식사 예정";
    syncRsvpCountState();

    rsvpStatusEl.textContent = isUpdate
      ? `✅ ${guestName}님 RSVP가 업데이트되었습니다.`
      : `✅ ${guestName}님 RSVP가 저장되었습니다. 감사합니다!`;
  });

  attendEl.addEventListener("change", syncRsvpCountState);
  syncRsvpCountState();
}

init();
