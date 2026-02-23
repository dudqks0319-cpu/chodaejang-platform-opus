const form = document.getElementById("invitationForm");
const previewCard = document.getElementById("previewCard");
const shareUrlEl = document.getElementById("shareUrl");
const qrWrap = document.getElementById("qrWrap");
const qrCodeEl = document.getElementById("qrCode");
const mapLinksEl = document.getElementById("mapLinks");
const adminPageLinkEl = document.getElementById("adminPageLink");

const TEMPLATE_CLASS = {
  classic: "template-classic",
  minimal: "template-minimal",
  warm: "template-warm",
  neon: "template-neon",
  hanji: "template-hanji",
};

const DRAFT_STORAGE_KEY = "opus_invitation_draft_v1";

let uploadedImageData = "";
let lastShareUrl = "";

function toBase64Url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

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

function getDdayLabel(value) {
  if (!value) return "";

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayTarget = new Date(target);
  dayTarget.setHours(0, 0, 0, 0);

  const diff = Math.round((dayTarget - today) / (1000 * 60 * 60 * 24));

  if (diff === 0) return "🎉 오늘이 행사일입니다";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

function buildNoticeItems(data) {
  const items = [];

  if (data.parkingInfo) items.push(`주차/교통: ${data.parkingInfo}`);
  if (data.dressCode) items.push(`드레스코드: ${data.dressCode}`);
  if (data.bringItem) items.push(`준비물: ${data.bringItem}`);
  if (data.extraNotice) items.push(`추가 안내: ${data.extraNotice}`);

  return items;
}

function getFormData() {
  return {
    eventType: document.getElementById("eventType").value,
    template: document.getElementById("template").value,
    eventTitle: document.getElementById("eventTitle").value.trim(),
    hostName: document.getElementById("hostName").value.trim(),
    eventDate: document.getElementById("eventDate").value,
    durationMin: Number(document.getElementById("durationMin").value || 120),
    venueName: document.getElementById("venueName").value.trim(),
    address: document.getElementById("address").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    account: document.getElementById("account").value.trim(),
    character: document.getElementById("character").value,
    message: document.getElementById("message").value.trim(),
    parkingInfo: document.getElementById("parkingInfo").value.trim(),
    dressCode: document.getElementById("dressCode").value.trim(),
    bringItem: document.getElementById("bringItem").value.trim(),
    extraNotice: document.getElementById("extraNotice").value.trim(),
    showQr: document.getElementById("showQr").checked,
    showAccount: document.getElementById("showAccount").checked,
    backgroundImage: uploadedImageData,
  };
}

function applyFormData(parsed) {
  [
    "eventType",
    "template",
    "eventTitle",
    "hostName",
    "eventDate",
    "durationMin",
    "venueName",
    "address",
    "phone",
    "account",
    "character",
    "message",
    "parkingInfo",
    "dressCode",
    "bringItem",
    "extraNotice",
  ].forEach((key) => {
    if (parsed[key] !== undefined && document.getElementById(key)) {
      document.getElementById(key).value = parsed[key];
    }
  });

  if (typeof parsed.showQr === "boolean") {
    document.getElementById("showQr").checked = parsed.showQr;
  }
  if (typeof parsed.showAccount === "boolean") {
    document.getElementById("showAccount").checked = parsed.showAccount;
  }

  if (parsed.backgroundImage) {
    uploadedImageData = parsed.backgroundImage;
  }
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(getFormData()));
  } catch {
    // no-op
  }
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;

    applyFormData(parsed);
    return true;
  } catch {
    return false;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // no-op
  }
}

function getBasePath() {
  const { origin, pathname } = location;
  if (pathname.endsWith("index.html")) {
    return `${origin}${pathname.slice(0, -"index.html".length)}`;
  }

  return pathname.endsWith("/") ? `${origin}${pathname}` : `${origin}${pathname}/`;
}

function getActiveDataParam() {
  const queryData = new URLSearchParams(location.search).get("data");
  if (queryData) return queryData;

  if (lastShareUrl) {
    try {
      const url = new URL(lastShareUrl);
      const fromShare = url.searchParams.get("data");
      if (fromShare) return fromShare;
    } catch {
      // no-op
    }
  }

  return toBase64Url(JSON.stringify(getFormData()));
}

function getInvitationId() {
  return `inv-${hashString(getActiveDataParam())}`;
}

function applyTemplate(templateKey) {
  Object.values(TEMPLATE_CLASS).forEach((klass) => previewCard.classList.remove(klass));
  previewCard.classList.add(TEMPLATE_CLASS[templateKey] || TEMPLATE_CLASS.classic);
}

function updateMapLinks(address) {
  if (!address) {
    mapLinksEl.textContent = "주소를 입력하면 네이버/카카오/구글 지도 링크가 생성됩니다.";
    return;
  }

  const encoded = encodeURIComponent(address);
  const naver = `https://map.naver.com/v5/search/${encoded}`;
  const kakao = `https://map.kakao.com/?q=${encoded}`;
  const google = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  mapLinksEl.innerHTML = `
    <a href="${naver}" target="_blank" rel="noopener noreferrer">네이버 지도</a>
    <a href="${kakao}" target="_blank" rel="noopener noreferrer">카카오맵</a>
    <a href="${google}" target="_blank" rel="noopener noreferrer">구글 지도</a>
  `;
}

function renderQr(text) {
  qrCodeEl.innerHTML = "";
  new QRCode(qrCodeEl, {
    text,
    width: 128,
    height: 128,
    colorDark: "#111827",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
}

function updateAdminLink() {
  if (!adminPageLinkEl) return;

  const data = getFormData();
  const params = new URLSearchParams({
    invite: getInvitationId(),
    title: data.eventTitle || "초대장",
  });

  adminPageLinkEl.href = `admin.html?${params.toString()}`;
}

function updatePreview() {
  const data = getFormData();

  applyTemplate(data.template);

  previewCard.style.backgroundImage = data.backgroundImage ? `url(${data.backgroundImage})` : "";

  document.getElementById("previewType").textContent = data.eventType || "행사";
  document.getElementById("previewTitle").textContent = data.eventTitle || "초대장 제목을 입력해 주세요";
  document.getElementById("previewHost").textContent = data.hostName ? `초대자: ${data.hostName}` : "초대자 정보";
  document.getElementById("previewDate").textContent = `일시: ${formatDate(data.eventDate)}`;

  const ddayEl = document.getElementById("previewDday");
  const ddayLabel = getDdayLabel(data.eventDate);
  ddayEl.textContent = ddayLabel;
  ddayEl.style.display = ddayLabel ? "inline-flex" : "none";

  document.getElementById("previewVenue").textContent = `장소: ${data.venueName || "장소 미정"}`;
  document.getElementById("previewAddress").textContent = `주소: ${data.address || "주소 미입력"}`;
  document.getElementById("previewPhone").textContent = `연락처: ${data.phone || "연락처 미입력"}`;
  document.getElementById("previewMessage").textContent = data.message || "소중한 날, 함께해 주세요.";
  document.getElementById("previewCharacter").textContent = data.character || "";

  const accountEl = document.getElementById("previewAccount");
  accountEl.textContent = data.showAccount && data.account ? `💳 축의/회비 계좌: ${data.account}` : "";

  updateMapLinks(data.address);

  const noticePreviewListEl = document.getElementById("noticePreviewList");
  const noticeItems = buildNoticeItems(data);
  noticePreviewListEl.innerHTML = noticeItems.length
    ? noticeItems.map((item) => `<li>${item}</li>`).join("")
    : "<li>주차/드레스코드/준비물/추가 안내를 입력하면 하객 페이지에 반영됩니다.</li>";

  qrWrap.style.display = data.showQr ? "block" : "none";
  if (data.showQr) {
    const qrTarget = lastShareUrl || generateShareUrl();
    renderQr(qrTarget);
  }

  updateAdminLink();
}

function hydrateFromUrl() {
  const query = new URLSearchParams(location.search);
  const encodedData = query.get("data");
  if (!encodedData) return false;

  try {
    const parsed = JSON.parse(fromBase64Url(encodedData));
    applyFormData(parsed);
    return true;
  } catch (error) {
    console.warn("공유 링크 데이터를 읽지 못했습니다.", error);
    return false;
  }
}

function generateShareUrl() {
  const data = getFormData();
  const encoded = toBase64Url(JSON.stringify(data));
  return `${getBasePath()}invite.html?data=${encoded}`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function composeShareMessage(url) {
  const data = getFormData();
  const dday = getDdayLabel(data.eventDate);

  return [
    `[${data.eventType}] ${data.eventTitle || "초대장"}`,
    dday ? `${dday}` : "",
    data.eventDate ? `일시: ${formatDate(data.eventDate)}` : "",
    data.venueName ? `장소: ${data.venueName}` : "",
    data.address ? `주소: ${data.address}` : "",
    data.parkingInfo ? `주차/교통: ${data.parkingInfo}` : "",
    url,
  ]
    .filter(Boolean)
    .join("\n");
}

async function shareToKakao() {
  const appKey = document.getElementById("kakaoAppKey").value.trim();
  const url = lastShareUrl || generateShareUrl();
  const data = getFormData();

  if (!window.Kakao || !appKey) {
    const copied = await copyText(composeShareMessage(url));
    alert(
      copied
        ? "카카오 키가 없어 공유 문구를 복사했습니다. 카카오톡에 붙여넣어 보내 주세요."
        : "카카오 공유 키가 없어서 자동 전송은 못 했어요. 링크를 수동 공유해 주세요."
    );
    return;
  }

  try {
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(appKey);
    }

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: data.eventTitle || "초대장이 도착했어요",
        description: data.message || `${data.eventType}에 초대합니다.`,
        imageUrl:
          data.backgroundImage ||
          "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80",
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
      buttons: [
        {
          title: "초대장 보기",
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
      ],
    });
  } catch (error) {
    console.error(error);
    alert("카카오 공유 중 오류가 발생했습니다. 키 설정과 도메인을 확인해 주세요.");
  }
}

document.getElementById("backgroundImage").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    uploadedImageData = "";
    updatePreview();
    saveDraft();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    uploadedImageData = String(reader.result || "");
    updatePreview();
    saveDraft();
  };
  reader.readAsDataURL(file);
});

form.addEventListener("input", () => {
  updatePreview();
  saveDraft();
});

document.getElementById("generateLinkBtn").addEventListener("click", async () => {
  lastShareUrl = generateShareUrl();
  shareUrlEl.innerHTML = `수신자용 링크: <a href="${lastShareUrl}" target="_blank" rel="noopener noreferrer">${lastShareUrl}</a>`;
  updatePreview();

  const copied = await copyText(lastShareUrl);
  if (copied) {
    alert("수신자용 초대장 링크를 복사했습니다.");
  }
});

document.getElementById("copyTextBtn").addEventListener("click", async () => {
  const url = lastShareUrl || generateShareUrl();
  const copied = await copyText(composeShareMessage(url));
  alert(copied ? "공유 문구를 복사했습니다." : "복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
});

document.getElementById("kakaoShareBtn").addEventListener("click", shareToKakao);

document.getElementById("draftResetBtn").addEventListener("click", () => {
  const ok = confirm("작성 중인 초안을 초기화할까요?\n(저장된 자동 초안도 함께 삭제됩니다)");
  if (!ok) return;

  form.reset();
  uploadedImageData = "";
  lastShareUrl = "";
  shareUrlEl.textContent = "";
  clearDraft();
  updatePreview();
});

const loadedFromLink = hydrateFromUrl();
if (!loadedFromLink) {
  restoreDraft();
}

updatePreview();
