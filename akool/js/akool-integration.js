<script>
// ========== HAIRGATOR x AKOOL 운영 최종 통합 ==========
// - 버튼 자동주입 제거(중복 방지: index.html에서만 주입)
// - Netlify 함수 계약 통일(step/필드명)
// - 진행상태 폴링은 동일 함수(step:'status') 사용
// - 토큰 재사용 + 대용량 이미지 압축

console.log('🎨 AKOOL Face Swap 운영 최종 통합 로딩');

const NETLIFY = {
  token:  '/.netlify/functions/akool-token',
  swap:   '/.netlify/functions/akool-faceswap' // detect/status/faceswap 모두 여기에 step으로 호출
};

const API_TIMEOUT = 25000;

window.akoolConfig = window.akoolConfig || {
  token: null,
  token_issued_at: 0,
  userImageData: null,
  lastResult: null,
  isInitialized: false,
};

let faceSwapInProgress = false;
let currentStyleImage = null;
let currentStyleName  = null;
let currentStyleCode  = null;

// ---- 공통 ----
function withTimeout(p, ms = API_TIMEOUT){
  return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('요청 시간 초과')), ms))]);
}

async function safeFetch(url, opt){
  const res = await withTimeout(fetch(url, opt));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function dataURLSizeBytes(dataUrl){
  const i = dataUrl.indexOf('base64,');
  if (i < 0) return 0;
  const b64 = dataUrl.slice(i+7);
  return Math.floor((b64.length * 3) / 4);
}

async function compressDataURL(src, maxW=1024, maxH=1024, quality=0.82){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>{
      const ratio = Math.min(maxW/img.width, maxH/img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      try { resolve(c.toDataURL('image/jpeg', quality)); } catch(e){ reject(e); }
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ---- 초기화 + 외부 진입점 ----
if (!window.akoolSystemInitialized){
  window.akoolSystemInitialized = true;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAkool);
  } else { initAkool(); }
}

function initAkool(){
  if (window.akoolConfig.isInitialized) return;
  // 버튼 자동주입은 비활성: index.html이 주입함 (중복방지)
  window.addAIButtonToHairgator = function(){ return false; }; // ← 중요
  bindPublicAPIs();
  window.akoolConfig.isInitialized = true;
  console.log('✅ AKOOL 초기화 완료 (버튼 자동주입 비활성)');
}

function bindPublicAPIs(){
  // index.html이 호출하는 진입점
  window.openAkoolFaceSwapModal = function(data = {}){
    currentStyleImage = data.imageUrl || document.querySelector('#modalImage')?.src || currentStyleImage;
    currentStyleName  = data.styleName || document.querySelector('#modalName')?.textContent?.trim() || currentStyleName;
    currentStyleCode  = data.styleCode || document.querySelector('#modalCode')?.textContent?.trim() || currentStyleCode;

    if (!currentStyleImage || !currentStyleName){
      alert('❌ 헤어스타일 정보를 찾을 수 없습니다.');
      return;
    }
    // UI 생성
    return openPickerModal();
  };
}

// ---- 토큰 ----
async function getAkoolToken(){
  const now = Date.now();
  if (window.akoolConfig.token && now - window.akoolConfig.token_issued_at < 5*60*1000){
    return { success:true, token: window.akoolConfig.token, reused: true };
  }
  try {
    const data = await safeFetch(NETLIFY.token, { method:'POST', headers:{'Content-Type':'application/json'} });
    if (data.success && data.token){
      window.akoolConfig.token = data.token;
      window.akoolConfig.token_issued_at = Date.now();
      localStorage.setItem('akool_token', data.token);
      localStorage.setItem('akool_token_issued', String(window.akoolConfig.token_issued_at));
      return { success:true, token:data.token };
    }
    throw new Error(data.error || '토큰 발급 실패');
  } catch(e){
    console.error('토큰 오류:', e);
    return { success:false, error:e.message };
  }
}

// ---- UI (간단 업로드/카메라) ----
function openPickerModal(){
  const exist = document.getElementById('akoolModal');
  if (exist) exist.remove();

  const html = `
  <div id="akoolModal" style="position:fixed;inset:0;background:rgba(0,0,0,.9);display:flex;justify-content:center;align-items:center;z-index:999999;opacity:0;transition:opacity .2s">
    <div style="background:#fff;border-radius:18px;padding:24px;max-width:520px;width:92%;max-height:90vh;overflow:auto;position:relative">
      <button onclick="window.closeAkoolModal()" style="position:absolute;top:8px;right:8px;background:none;border:none;font-size:26px;cursor:pointer;color:#999">×</button>
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:40px">🤖</div>
        <h3 style="margin:6px 0 10px;font-size:20px;font-weight:800;color:#FF1493">AI 헤어스타일 체험</h3>
        <div style="border:2px solid #FF1493;border-radius:12px;padding:10px">
          <div style="color:#FF1493;font-weight:700">선택: ${currentStyleName}</div>
          <div style="color:#666;font-size:12px;margin-top:4px">코드: ${currentStyleCode || '-'}</div>
        </div>
      </div>

      <div id="pickSec">
        <div style="display:flex;gap:10px;margin-bottom:14px">
          <button id="btnPick" style="flex:1;background:linear-gradient(135deg,#4A90E2,#357ABD);color:#fff;border:none;border-radius:14px;padding:14px;font-weight:700;cursor:pointer">📁 갤러리</button>
          <button id="btnCam"  style="flex:1;background:linear-gradient(135deg,#FF6B6B,#EE5A24);color:#fff;border:none;border-radius:14px;padding:14px;font-weight:700;cursor:pointer">📷 카메라</button>
        </div>
        <input type="file" id="fileInput" accept="image/*" style="display:none">
        <div style="background:#f8f9fa;border-radius:10px;padding:10px;border-left:4px solid #FF1493;font-size:12px;color:#555">
          <b>가이드</b> 정면/밝은곳/얼굴 가림 금지/안경·모자 제거 권장
        </div>
      </div>

      <div id="camSec" style="display:none;text-align:center;margin-top:8px">
        <video id="camV" autoplay style="width:100%;max-width:320px;border-radius:12px;background:#000"></video>
        <canvas id="camC" style="display:none"></canvas>
        <div style="margin-top:10px">
          <button id="btnShot" style="background:linear-gradient(135deg,#FF1493,#FF69B4);color:#fff;border:none;border-radius:14px;padding:10px 18px;font-weight:700;cursor:pointer;margin-right:8px">📸 촬영</button>
          <button id="btnBack" style="background:#6c757d;color:#fff;border:none;border-radius:14px;padding:10px 18px;cursor:pointer">← 뒤로</button>
        </div>
      </div>

      <div id="prevSec" style="display:none;text-align:center;margin-top:10px">
        <img id="prevImg" style="max-width:100%;max-height:260px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.15)">
        <div style="margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button id="btnStart" style="background:linear-gradient(135deg,#FF1493,#FF69B4);color:#fff;border:none;border-radius:14px;padding:10px 18px;font-weight:700;cursor:pointer">🚀 AI 변환 시작</button>
          <button id="btnRe"    style="background:#6c757d;color:#fff;border:none;border-radius:14px;padding:10px 18px;cursor:pointer">다시 선택</button>
        </div>
      </div>

      <div id="procSec" style="display:none;text-align:center;margin-top:8px">
        <div style="font-size:38px;margin-bottom:6px">🎨</div>
        <div id="progText" style="font-weight:700;color:#FF1493">처리 시작...</div>
        <div id="progDet"  style="font-size:12px;color:#666;margin:6px 0 10px"></div>
        <div style="background:#eee;border-radius:10px;height:10px;overflow:hidden"><div id="progBar" style="background:linear-gradient(135deg,#FF1493,#FF69B4);height:100%;width:0%"></div></div>
      </div>

      <div id="resSec" style="display:none;text-align:center;margin-top:8px">
        <div style="font-size:38px;margin-bottom:6px">🎉</div>
        <h3 style="color:#FF1493;margin:6px 0 10px">완성!</h3>
        <img id="resImg" style="max-width:100%;max-height:300px;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,.2)">
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px">
          <button id="btnSave" style="background:linear-gradient(135deg,#4A90E2,#357ABD);color:#fff;border:none;border-radius:14px;padding:10px 16px;font-weight:700;cursor:pointer">💾 저장</button>
          <button id="btnShare"style="background:linear-gradient(135deg,#32CD32,#28A745);color:#fff;border:none;border-radius:14px;padding:10px 16px;font-weight:700;cursor:pointer">📤 공유</button>
          <button id="btnAgain"style="background:linear-gradient(135deg,#FF6B6B,#EE5A24);color:#fff;border:none;border-radius:14px;padding:10px 16px;font-weight:700;cursor:pointer">🔄 다시</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  setTimeout(()=>document.getElementById('akoolModal').style.opacity='1',10);

  // 이벤트
  const $ = (id)=>document.getElementById(id);
  $('#btnPick').onclick = ()=>$('#fileInput').click();
  $('#fileInput').onchange = onPickFile;
  $('#btnCam').onclick = openCam;
  $('#btnBack').onclick = backToPick;
  $('#btnShot').onclick = shotPhoto;
  $('#btnStart').onclick = startProcess;
  $('#btnRe').onclick = backToPick;
  $('#btnSave').onclick = downloadResult;
  $('#btnShare').onclick = shareResult;
  $('#btnAgain').onclick = backToPick;

  function onPickFile(e){
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return alert('이미지 파일만 선택하세요.');
    const reader = new FileReader();
    reader.onload = async (ev)=>{
      let dataUrl = ev.target.result;
      try { if (dataURLSizeBytes(dataUrl) > 3_500_000) dataUrl = await compressDataURL(dataUrl); } catch{}
      window.akoolConfig.userImageData = dataUrl;
      $('#pickSec').style.display='none'; $('#camSec').style.display='none';
      $('#prevSec').style.display='block';
      $('#prevImg').src = dataUrl;
    };
    reader.readAsDataURL(f);
  }

  async function openCam(){
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ width:{ideal:640}, height:{ideal:480}, facingMode:'user'} });
      $('#pickSec').style.display='none'; $('#camSec').style.display='block';
      $('#camV').srcObject = stream;
    }catch(e){ alert('카메라 권한을 확인해주세요.'); }
  }

  function shotPhoto(){
    const v = document.getElementById('camV');
    const c = document.getElementById('camC');
    const ctx = c.getContext('2d');
    c.width = v.videoWidth||640; c.height = v.videoHeight||480;
    ctx.drawImage(v,0,0);
    const dataUrl = c.toDataURL('image/jpeg',0.85);
    const s = v.srcObject; if (s){ s.getTracks().forEach(t=>t.stop()); v.srcObject=null; }
    window.akoolConfig.userImageData = dataUrl;
    $('#camSec').style.display='none'; $('#prevSec').style.display='block';
    $('#prevImg').src = dataUrl;
  }

  function backToPick(){
    const v = document.getElementById('camV'); const s = v?.srcObject; if (s){ s.getTracks().forEach(t=>t.stop()); v.srcObject=null; }
    $('#pickSec').style.display='block'; $('#camSec').style.display='none'; $('#prevSec').style.display='none';
    $('#procSec').style.display='none'; $('#resSec').style.display='none';
    window.akoolConfig.userImageData = null;
  }

  async function startProcess(){
    if (faceSwapInProgress) return alert('이미 처리 중입니다.');
    if (!window.akoolConfig.userImageData) return alert('사용자 이미지를 선택해주세요.');

    faceSwapInProgress = true;
    $('#prevSec').style.display='none';
    $('#procSec').style.display='block';

    const bar = $('#progBar'), txt=$('#progText'), det=$('#progDet');
    const setP = (p,t,d='')=>{ bar.style.width=p+'%'; txt.textContent=t; det.textContent=d; };

    try{
      setP(10,'토큰 발급 중...','AKOOL 인증');
      const t = await getAkoolToken(); if (!t.success) throw new Error('토큰 발급 실패'); const token = t.token;

      // (1) 사용자 얼굴 감지
      setP(35,'사용자 얼굴 분석 중...','얼굴 감지/특징점');
      const userData = await safeFetch(NETLIFY.swap,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ step:'detect_user', token, userImage: await ensureRemoteURL(window.akoolConfig.userImageData,'user') })
      });

      if (!userData.success) throw new Error(userData.error || '사용자 얼굴 감지 실패');

      // (2) 스타일 얼굴 감지
      setP(55,'헤어스타일 분석 중...','얼굴 감지/특징점');
      const styleData = await safeFetch(NETLIFY.swap,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ step:'detect_style', token, targetImage: await ensureRemoteURL(currentStyleImage,'style') })
      });

      if (!styleData.success) throw new Error(styleData.error || '스타일 얼굴 감지 실패');

      // (3) 스왑 생성
      setP(80,'AI Face Swap 처리 중...','작업 생성');
      const swap = await safeFetch(NETLIFY.swap,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          step:'faceswap',
          token,
          userFaceData:  userData.faceData,  // ← 서버가 기대하는 키와 형식
          styleFaceData: styleData.faceData
        })
      });
      if (!swap.success) throw new Error(swap.error || 'Face Swap 생성 실패');
      const jobId = swap.jobId;

      // (4) 상태 폴링(step:'status' / jobId)
      setP(90,'결과 대기 중...','상태 확인');
      const resultUrl = await waitResult(token, jobId, (p,msg)=>setP(p,msg));

      // 완료
      setP(100,'완료!','결과 이미지 생성');
      $('#procSec').style.display='none'; $('#resSec').style.display='block';
      $('#resImg').src = resultUrl;
      window.akoolConfig.lastResult = resultUrl;

    }catch(e){
      console.error('처리 오류:', e);
      alert(e.message || '처리에 실패했습니다. 네트워크 상태 확인 후 다시 시도해주세요.');
      backToPick();
    }finally{
      faceSwapInProgress = false;
    }
  }

  async function waitResult(token, jobId, onp){
    const started = Date.now();
    let p = 90;
    while(true){
      const data = await safeFetch(NETLIFY.swap,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ step:'status', token, jobId })
      });
      if (!data.success) throw new Error(data.message || '상태 확인 실패');

      // 서버쪽 status를 completed/failed 로 내려줌
      if (data.isComplete){
        if (data.status === 'completed' && data.resultUrl) return data.resultUrl;
        throw new Error(data.message || '처리 실패');
      }
      p = Math.min(98, p+1);
      onp && onp(p, data.message || '처리 중...');
      await new Promise(r=>setTimeout(r, 3000));
      if (Date.now()-started > 180000) throw new Error('처리 시간 초과');
    }
  }

  async function ensureRemoteURL(image, type){
    // dataURL → blob → 임시 업로드(필요 시). 여기서는 그대로 dataURL 전달해도
    // 네트lify 함수가 openapi로 바로 던지므로, 원본이 URL이면 그대로 사용.
    if (typeof image === 'string' && image.startsWith('data:image/')){
      // 그대로 사용 (서버가 imageUrl를 받아서 외부로 보낼 수 있도록 구성되어 있음)
      // 혹시 openapi가 외부 URL만 허용한다면, 여기서 Firebase 업로드 로직 연결 가능.
      return image;
    }
    return image; // 이미 URL인 경우
  }
}

window.downloadResult = function(){
  if (!window.akoolConfig.lastResult) return alert('저장할 결과가 없습니다.');
  const a = document.createElement('a');
  a.download = `hairgator_ai_result_${currentStyleCode || 'style'}_${Date.now()}.jpg`;
  a.href = window.akoolConfig.lastResult;
  a.click();
};

window.shareResult = function(){
  if (!window.akoolConfig.lastResult) return alert('공유할 결과가 없습니다.');
  if (navigator.share){
    fetch(window.akoolConfig.lastResult).then(r=>r.blob()).then(b=>{
      const f = new File([b], `hairgator_${currentStyleCode||'style'}.jpg`, {type:'image/jpeg'});
      return navigator.share({ title:`HAIRGATOR - ${currentStyleName||''}`, files:[f] });
    }).catch(()=>alert('공유 중 문제가 발생했습니다.'));
  }else{
    alert('이 브라우저는 공유 기능을 지원하지 않습니다. 이미지를 저장하여 공유해주세요.');
  }
};

window.closeAkoolModal = function(){
  const el = document.getElementById('akoolModal');
  if (!el) return;
  const v = document.getElementById('camV');
  const s = v?.srcObject; if (s){ s.getTracks().forEach(t=>t.stop()); v.srcObject=null; }
  el.style.opacity = '0';
  setTimeout(()=>{ el.remove(); faceSwapInProgress=false; window.akoolConfig.userImageData=null; }, 200);
};
</script>
