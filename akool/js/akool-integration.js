// ========== HAIRGATOR 최종 AKOOL Integration (운영용, 시뮬 OFF) ==========
// ✅ 실제 AKOOL API + 갤러리/카메라 + Netlify Functions 연동
// ⚠️ 보안: clientId / clientSecret은 프런트에 두지 말 것(서버 함수에서만 사용)
//    현재 토큰은 /.netlify/functions/akool-token 에서 발급받음.

/*
 * 이 파일은 '운영용 단일 진입점'입니다.
 * - 버튼 자동 주입 금지: index.html에서 버튼 1개만 만들고 바인딩하세요.
 * - 레거시(시뮬) 스크립트가 버튼을 재주입/재바인딩해도 즉시 제거하도록 방어 코드를 포함합니다.
 * - openAkoolFaceSwapModal(data) 만 공개 API로 사용하면 됩니다.
 */

console.log('🎨 AKOOL Face Swap 운영 최종 버전 로딩...');

const SIMULATION_FALLBACK = false;         // 운영: 시뮬레이션 금지
const API_TIMEOUT_MS = 25000;              // 페치 타임아웃(25s)
const NETLIFY_FN = {
  token: '/.netlify/functions/akool-token',
  faceswap: '/.netlify/functions/akool-faceswap',
  status: '/.netlify/functions/akool-status'
};

// 전역 상태
window.akoolConfig = window.akoolConfig || {
  token: null,
  token_issued_at: 0,
  userImageData: null,          // dataURL
  isInitialized: false,
  lastResult: null
};

let currentStyleImage = null;   // 스타일 이미지 URL
let currentStyleName  = null;
let currentStyleCode  = null;
let faceSwapInProgress = false;

// =============== 레거시 차단/청소 ===============
(function installLegacyGuards() {
  try {
    // 1) 레거시 자동 주입 함수 무력화 (읽기전용, 항상 false 반환)
    if (!Object.getOwnPropertyDescriptor(window, 'addAIButtonToHairgator')) {
      Object.defineProperty(window, 'addAIButtonToHairgator', {
        configurable: false,
        writable: false,
        value: function () { console.info('ℹ️ 레거시 addAIButtonToHairgator 호출 차단'); return false; }
      });
    }

    // 2) 페이지에 이미 주입되어 있을 수 있는 레거시 버튼/노드 제거
    const KILL_SELECTORS = ['#akoolSimBtn', '.akool-sim-btn', '[data-sim-akool]', '#hairgator-ai-sim'];
    const killLegacy = () => KILL_SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(n => n.remove()));
    killLegacy();

    // 3) 동적 재주입도 즉시 제거
    const mo = new MutationObserver(() => killLegacy());
    mo.observe(document.documentElement, { childList: true, subtree: true });

    // 4) 중복 주입 락
    window.__HAIRGATOR_AI_BTN_LOCK__ = true;
  } catch (e) {
    console.warn('레거시 차단 실패(무시 가능):', e);
  }
})();

// ================= 공통 유틸 =================
function withTimeout(promise, ms = API_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('요청 시간 초과')), ms))
  ]);
}

async function safeFetch(url, options) {
  const res = await withTimeout(fetch(url, options));
  return res;
}

function dataURLSize(dataUrl) {
  const head = 'base64,';
  const i = dataUrl.indexOf(head);
  if (i === -1) return 0;
  const b64 = dataUrl.slice(i + head.length);
  return Math.floor((b64.length * 3) / 4); // bytes
}

async function compressDataURL(srcDataUrl, maxW = 1024, maxH = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const ratio = Math.min(maxW / width, maxH / height, 1);
      const cw = Math.round(width * ratio);
      const ch = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);
      try { resolve(canvas.toDataURL('image/jpeg', quality)); }
      catch (err) { reject(err); }
    };
    img.onerror = reject;
    img.src = srcDataUrl;
  });
}

// ================= 초기화 =================
if (!window.akoolSystemInitialized) {
  window.akoolSystemInitialized = true;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAkoolSystem);
  } else {
    initializeAkoolSystem();
  }
}

async function initializeAkoolSystem() {
  if (window.akoolConfig.isInitialized) return;
  try {
    // 혹시 남아있는 레거시 실험용 버튼 제거(2차 방어)
    ['#akoolSimBtn', '.akool-sim-btn', '[data-sim-akool]', '#hairgator-ai-sim']
      .forEach(sel => document.querySelectorAll(sel).forEach(n => n.remove()));

    setupAkoolFunctions();
    window.akoolConfig.isInitialized = true;
    console.log('✅ AKOOL 시스템 초기화 완료');
  } catch (e) {
    console.error('❌ AKOOL 초기화 실패:', e);
  }
}

// ================= AKOOL API 바인딩 =================
function setupAkoolFunctions() {
  // 🔑 토큰(재)발급: 필요 시에만 갱신
  window.getAkoolToken = async function getAkoolToken() {
    const now = Date.now();
    // 발급 후 5분 이내이면 캐시 사용(서버 만료에 맞춰 조정 가능)
    if (window.akoolConfig.token && now - window.akoolConfig.token_issued_at < 5 * 60 * 1000) {
      return { success: true, token: window.akoolConfig.token, reused: true };
    }

    try {
      const res = await safeFetch(NETLIFY_FN.token, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success && data.token) {
        window.akoolConfig.token = data.token;
        window.akoolConfig.token_issued_at = Date.now();
        localStorage.setItem('akool_token', data.token);
        localStorage.setItem('akool_token_issued', String(window.akoolConfig.token_issued_at));
        console.log('✅ 토큰 발급/갱신 성공');
        return data;
      }
      throw new Error(data.error || '토큰 발급 실패');
    } catch (e) {
      console.error('❌ 토큰 오류:', e);
      return { success: false, error: e.message };
    }
  };

  // 🎛️ 페이스스왑: detect_user → detect_style → faceswap
  window.akoolFaceSwap = async function akoolFaceSwap(userImageData, styleImageUrl) {
    console.log('🚀 AKOOL Face Swap 시작');

    // 대용량 이미지 압축(>3.5MB 면 축소)
    try {
      if (dataURLSize(userImageData) > 3_500_000) {
        userImageData = await compressDataURL(userImageData, 1024, 1024, 0.82);
        console.log('🗜️ 사용자 이미지 압축 적용');
      }
    } catch (e) { console.warn('이미지 압축 실패(무시):', e); }

    // 1) 사용자 얼굴 감지
    const t1 = await window.getAkoolToken();
    if (!t1.success) return { success: false, error: '토큰 발급 실패' };

    const userRes = await safeFetch(NETLIFY_FN.faceswap, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'detect_user', token: t1.token, userImageUrl: userImageData })
    }).then(r => r.json());

    if (!userRes.success) return { success: false, error: userRes.error || '사용자 얼굴 감지 실패' };

    // 2) 스타일 감지
    const t2 = await window.getAkoolToken();
    if (!t2.success) return { success: false, error: '토큰 발급 실패(2)' };

    const styleRes = await safeFetch(NETLIFY_FN.faceswap, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'detect_style', token: t2.token, styleImageUrl })
    }).then(r => r.json());

    if (!styleRes.success) return { success: false, error: styleRes.error || '스타일 감지 실패' };

    // 3) 스왑
    const t3 = await window.getAkoolToken();
    if (!t3.success) return { success: false, error: '토큰 발급 실패(3)' };

    const swapRes = await safeFetch(NETLIFY_FN.faceswap, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 'faceswap', token: t3.token, userData: userRes, styleData: styleRes })
    }).then(r => r.json());

    if (!swapRes.success) return { success: false, error: swapRes.error || 'Face Swap 실패' };

    console.log('🎉 AKOOL Face Swap 성공');
    return swapRes;
  };

  // 📊 상태 확인(필요 시)
  window.akoolStatus = async function akoolStatus(jobId) {
    try {
      const data = await safeFetch(NETLIFY_FN.status, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      }).then(r => r.json());
      return data;
    } catch (e) {
      return { success: false, error: e.message };
    }
  };
}

// ========== 공개 API: 인덱스가 호출하는 진입점 ==========
/** 인덱스와의 호환용: 항상 이 함수를 호출하면 됨 */
window.openAkoolFaceSwapModal = function openAkoolFaceSwapModal(data = {}) {
  // index에서 넘겨줄 수도 있고, 현재 모달에서 읽을 수도 있음
  currentStyleImage = data.imageUrl || document.querySelector('#modalImage')?.src || currentStyleImage;
  currentStyleName  = data.styleName || document.querySelector('#modalName')?.textContent?.trim() || currentStyleName;
  currentStyleCode  = data.styleCode || document.querySelector('#modalCode')?.textContent?.trim() || currentStyleCode;

  if (!currentStyleImage || !currentStyleName) {
    alert('❌ 헤어스타일 정보를 찾을 수 없습니다.');
    return;
  }
  return window.openAkoolModal(); // 아래 UI 열기
};

// ========== 갤러리/카메라 선택 모달 ==========
// (기존 openAkoolModal을 실제 진입점으로 유지)
window.openAkoolModal = function () {
  // 현재 모달에서 스타일 정보 보완
  const modal = document.getElementById('styleModal');
  if (modal) {
    const styleImage = modal.querySelector('img');
    const styleName = modal.querySelector('.modal-name')?.textContent?.trim();
    const styleCode = modal.querySelector('.modal-code')?.textContent?.trim();
    if (styleImage && styleName) {
      currentStyleImage = currentStyleImage || styleImage.src;
      currentStyleName  = currentStyleName  || styleName;
      currentStyleCode  = currentStyleCode  || styleCode;
    }
  }
  if (!currentStyleImage || !currentStyleName) {
    alert('❌ 헤어스타일 정보를 찾을 수 없습니다.');
    return;
  }

  const existing = document.getElementById('akoolModal');
  if (existing) existing.remove();

  const html = `
    <div id="akoolModal" style="position:fixed;inset:0;background:rgba(0,0,0,.9);display:flex;justify-content:center;align-items:center;z-index:999999;opacity:0;transition:opacity .3s">
      <div style="background:#fff;border-radius:20px;padding:28px;max-width:520px;width:92%;max-height:90vh;overflow:auto;position:relative;box-shadow:0 25px 80px rgba(0,0,0,.4)">
        <button onclick="window.closeAkoolModal()" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:26px;cursor:pointer;color:#999;width:40px;height:40px;border-radius:50%">×</button>
        <div style="text-align:center;margin-bottom:18px">
          <div style="font-size:46px;margin-bottom:6px">🤖</div>
          <h2 style="margin:0 0 6px 0;font-size:24px;font-weight:800;background:linear-gradient(135deg,#FF1493,#FF69B4);-webkit-background-clip:text;-webkit-text-fill-color:transparent">AI 헤어스타일 체험</h2>
          <div style="border:2px solid #FF1493;border-radius:14px;padding:10px">
            <div style="color:#FF1493;font-weight:700">선택한 스타일: ${currentStyleName}</div>
            <div style="color:#666;font-size:12px;margin-top:4px">코드: ${currentStyleCode || '-'} </div>
          </div>
        </div>

        <div id="photoSelectionSection">
          <h3 style="text-align:center;color:#333;margin:12px 0 16px;font-size:18px">📸 얼굴 사진을 선택해주세요</h3>
          <div style="display:flex;gap:10px;margin-bottom:16px">
            <button onclick="window.selectFromGallery()" style="flex:1;background:linear-gradient(135deg,#4A90E2,#357ABD);color:#fff;border:none;border-radius:16px;padding:16px;font-weight:700;cursor:pointer">📁 갤러리에서 선택</button>
            <button onclick="window.openCamera()" style="flex:1;background:linear-gradient(135deg,#FF6B6B,#EE5A24);color:#fff;border:none;border-radius:16px;padding:16px;font-weight:700;cursor:pointer">📷 카메라로 촬영</button>
          </div>
          <input type="file" id="galleryInput" accept="image/*" style="display:none" onchange="window.handleGallerySelection(event)">
          <div style="background:#f8f9fa;border-radius:12px;padding:12px;border-left:4px solid #FF1493;font-size:13px;color:#555">
            <b>촬영 가이드</b><br>정면/밝은곳/얼굴 가림 주의/안경·모자 제거 권장
          </div>
        </div>

        <div id="cameraSection" style="display:none;text-align:center;margin-top:10px">
          <video id="cameraVideo" autoplay style="width:100%;max-width:320px;border-radius:12px;background:#000"></video>
          <canvas id="cameraCanvas" style="display:none"></canvas>
          <div style="margin-top:10px">
            <button onclick="window.capturePhoto()" style="background:linear-gradient(135deg,#FF1493,#FF69B4);color:#fff;border:none;border-radius:16px;padding:12px 20px;font-weight:700;cursor:pointer;margin-right:8px">📸 촬영하기</button>
            <button onclick="window.backToSelection()" style="background:#6c757d;color:#fff;border:none;border-radius:16px;padding:12px 20px;cursor:pointer">← 뒤로가기</button>
          </div>
        </div>

        <div id="imagePreview" style="display:none;text-align:center;margin-top:12px">
          <img id="previewImage" style="max-width:100%;max-height:260px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.15)">
          <div style="margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <button onclick="window.startAkoolProcess()" style="background:linear-gradient(135deg,#FF1493,#FF69B4);color:#fff;border:none;border-radius:16px;padding:10px 18px;font-weight:700;cursor:pointer">🚀 AI 변환 시작</button>
            <button onclick="window.backToSelection()" style="background:#6c757d;color:#fff;border:none;border-radius:16px;padding:10px 18px;cursor:pointer">다시 선택</button>
          </div>
        </div>

        <div id="processingSection" style="display:none;text-align:center;margin-top:10px">
          <div style="font-size:42px;margin-bottom:8px">🎨</div>
          <div id="progressText" style="font-weight:700;color:#FF1493">처리 시작...</div>
          <div id="progressDetails" style="font-size:12px;color:#666;margin:6px 0 10px"></div>
          <div style="background:#eee;border-radius:10px;height:10px;overflow:hidden"><div id="progressBar" style="background:linear-gradient(135deg,#FF1493,#FF69B4);height:100%;width:0%"></div></div>
        </div>

        <div id="resultSection" style="display:none;text-align:center;margin-top:10px">
          <div style="font-size:42px;margin-bottom:8px">🎉</div>
          <h3 style="color:#FF1493;margin:6px 0 10px">완성되었습니다!</h3>
          <img id="resultImage" style="max-width:100%;max-height:300px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.2)">
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px">
            <button onclick="window.downloadResult()" style="background:linear-gradient(135deg,#4A90E2,#357ABD);color:#fff;border:none;border-radius:14px;padding:10px 16px;font-weight:700;cursor:pointer">💾 저장</button>
            <button onclick="window.shareResult()" style="background:linear-gradient(135deg,#32CD32,#28A745);color:#fff;border:none;border-radius:14px;padding:10px 16px;font-weight:700;cursor:pointer">📤 공유</button>
            <button onclick="window.backToSelection()" style="background:linear-gradient(135deg,#FF6B6B,#EE5A24);color:#fff;border:none;border-radius:14px;padding:10px 16px;font-weight:700;cursor:pointer">🔄 다시 시도</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  setTimeout(() => document.getElementById('akoolModal').style.opacity = '1', 10);
};

// ================== 갤러리/카메라 ==================
window.selectFromGallery = () => document.getElementById('galleryInput').click();

window.handleGallerySelection = function (e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('이미지 파일만 선택하세요.');

  const reader = new FileReader();
  reader.onload = async (ev) => {
    let dataUrl = ev.target.result;
    // 큰 파일은 즉시 압축
    try {
      if (dataURLSize(dataUrl) > 3_500_000) {
        dataUrl = await compressDataURL(dataUrl, 1024, 1024, 0.82);
      }
    } catch {}
    window.akoolConfig.userImageData = dataUrl;
    showImagePreview(dataUrl);
  };
  reader.readAsDataURL(file);
};

window.openCamera = async function () {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
    });
    document.getElementById('photoSelectionSection').style.display = 'none';
    document.getElementById('cameraSection').style.display = 'block';
    document.getElementById('cameraVideo').srcObject = stream;
  } catch (e) {
    console.error('카메라 실패:', e);
    alert('카메라 권한을 확인해주세요.');
  }
};

window.capturePhoto = function () {
  const video = document.getElementById('cameraVideo');
  const canvas = document.getElementById('cameraCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0);
  const imageData = canvas.toDataURL('image/jpeg', 0.85);

  const stream = video.srcObject;
  if (stream) { stream.getTracks().forEach(t => t.stop()); video.srcObject = null; }

  window.akoolConfig.userImageData = imageData;
  showImagePreview(imageData);
};

window.backToSelection = function () {
  const v = document.getElementById('cameraVideo');
  const s = v?.srcObject; if (s) { s.getTracks().forEach(t => t.stop()); v.srcObject = null; }
  document.getElementById('photoSelectionSection').style.display = 'block';
  document.getElementById('cameraSection').style.display = 'none';
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('processingSection').style.display = 'none';
  document.getElementById('resultSection').style.display = 'none';
  window.akoolConfig.userImageData = null;
};

// ================== 미리보기/처리 ==================
function showImagePreview(dataUrl) {
  document.getElementById('photoSelectionSection').style.display = 'none';
  document.getElementById('cameraSection').style.display = 'none';
  document.getElementById('imagePreview').style.display = 'block';
  document.getElementById('previewImage').src = dataUrl;
}

window.startAkoolProcess = async function () {
  if (faceSwapInProgress) return alert('이미 처리 중입니다.');
  if (!window.akoolConfig.userImageData) return alert('사용자 이미지를 선택해주세요.');

  faceSwapInProgress = true;
  document.getElementById('imagePreview').style.display = 'none';
  document.getElementById('processingSection').style.display = 'block';

  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressDetails = document.getElementById('progressDetails');

  const steps = [
    { p: 20, t: '토큰 발급 중...', d: 'AKOOL API 인증' },
    { p: 45, t: '사용자 얼굴 분석 중...', d: '얼굴 인식/특징점 추출' },
    { p: 70, t: '헤어스타일 분석 중...', d: '스타일 특징 추출' },
    { p: 90, t: 'AI Face Swap 처리 중...', d: 'AKOOL 알고리즘 실행' },
    { p: 100, t: '완료!', d: '결과 이미지 생성 완료' }
  ];

  try {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      progressBar.style.width = s.p + '%';
      progressText.textContent = s.t;
      progressDetails.textContent = s.d;

      if (i === steps.length - 1) {
        const result = await window.akoolFaceSwap(window.akoolConfig.userImageData, currentStyleImage);
        if (!result.success) throw new Error(result.error || 'Face Swap 실패');
        // 서버가 반환하는 결과 키에 맞춰 설정하세요(예: processedImage/url)
        const url = result.processedImage || result.url || currentStyleImage;
        window.akoolConfig.lastResult = url;
        showResult(url);
      }
      await new Promise(r => setTimeout(r, 400)); // UX용 진행감
    }
  } catch (e) {
    console.error('❌ 처리 오류:', e);
    if (SIMULATION_FALLBACK) {
      alert('네트워크 불안정으로 시뮬레이션 결과를 표시합니다.');
      window.akoolConfig.lastResult = currentStyleImage;
      showResult(currentStyleImage);
    } else {
      alert(e.message || '처리에 실패했습니다. 네트워크 상태 확인 후 다시 시도해주세요.');
      window.backToSelection();
    }
  } finally {
    faceSwapInProgress = false;
  }
};

function showResult(url) {
  document.getElementById('processingSection').style.display = 'none';
  document.getElementById('resultSection').style.display = 'block';
  document.getElementById('resultImage').src = url;
}

// ================== 저장/공유/닫기 ==================
window.downloadResult = function () {
  if (!window.akoolConfig.lastResult) return alert('저장할 결과가 없습니다.');
  const a = document.createElement('a');
  a.download = `hairgator_ai_result_${currentStyleCode || 'style'}_${Date.now()}.jpg`;
  a.href = window.akoolConfig.lastResult;
  a.click();
};

window.shareResult = function () {
  if (!window.akoolConfig.lastResult) return alert('공유할 결과가 없습니다.');
  if (navigator.share) {
    fetch(window.akoolConfig.lastResult)
      .then(r => r.blob())
      .then(b => {
        const f = new File([b], `hairgator_${currentStyleCode || 'style'}.jpg`, { type: 'image/jpeg' });
        return navigator.share({ title: `HAIRGATOR - ${currentStyleName || ''}`, files: [f] });
      })
      .catch(() => alert('공유 중 문제가 발생했습니다.'));
  } else {
    alert('이 브라우저는 공유 기능을 지원하지 않습니다. 이미지를 저장하여 공유해주세요.');
  }
};

window.closeAkoolModal = function () {
  const el = document.getElementById('akoolModal');
  if (!el) return;
  const v = document.getElementById('cameraVideo');
  const s = v?.srcObject; if (s) { s.getTracks().forEach(t => t.stop()); v.srcObject = null; }
  el.style.opacity = '0';
  setTimeout(() => { el.remove(); faceSwapInProgress = false; window.akoolConfig.userImageData = null; }, 300);
  console.log('❌ AKOOL 모달 닫기');
};

console.log('✅ AKOOL Integration 운영 최종 버전 로드 완료');
