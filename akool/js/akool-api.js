// akool/js/akool-api.js
// AKOOL Face Swap API 클라이언트 - 최종 운영본
// - 문서 스펙 준수: specifyimage / result/listbyids / detect
// - 토큰은 반드시 서버 함수('/.netlify/functions/akool-token')로 발급 (프런트에 키/시크릿 금지)

(function(){
  const API_TIMEOUT_MS = 25000;
  const MAX_WAIT_MS    = 180000;
  const POLL_BASE_MS   = 2500;
  const POLL_MAX_MS    = 7000;
  const UPLOAD_TARGET_PREFIX = 'temp/';

  // ▼ 결과 방향이 반대로 나오면 'style_to_user' <-> 'user_to_style' 바꿔주세요
  //   - 'style_to_user': 스타일 얼굴을 유저 사진에 적용(스타일 → 유저)
  //   - 'user_to_style': 유저 얼굴을 스타일 사진에 적용(유저 → 스타일) ← 문서 target/source 의미상 기본
  const SWAP_DIRECTION = 'user_to_style';

  const NETLIFY_BASE  = '/.netlify/functions';
  const AKOOL_API     = 'https://openapi.akool.com/api/open/v3';
  const AKOOL_DETECT  = 'https://sg3.akool.com/detect';

  function withTimeout(promise, ms = API_TIMEOUT_MS){
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(()=>rej(new Error('요청 시간 초과')), ms))
    ]);
  }
  async function safeFetch(url, opt){ return withTimeout(fetch(url, opt)); }

  class AkoolAPI {
    constructor(){
      this.token = null;
      this.tokenExp = 0;
    }

    // ========== 1) 토큰 (서버 함수로 발급) ==========
    async getToken(){
      const now = Date.now();
      // 최근 발급된 토큰 재사용 (5분)
      if (!this.token){
        const t = localStorage.getItem('akool_token');
        const ts = Number(localStorage.getItem('akool_token_issued'));
        if (t && ts && now - ts < 5*60*1000){
          this.token = t; this.tokenExp = ts + 5*60*1000;
          return { success:true, token:this.token, reused:true };
        }
      }
      if (this.token && now < this.tokenExp - 60*1000) {
        return { success:true, token:this.token, reused:true };
      }
      try{
        const res = await safeFetch(`${NETLIFY_BASE}/akool-token`,{
          method:'POST', headers:{'Content-Type':'application/json'}
        });
        const data = await res.json();
        if (data.success && data.token){
          this.token = data.token;
          this.tokenExp = Date.now() + 5*60*1000; // 보수적으로 5분
          localStorage.setItem('akool_token', this.token);
          localStorage.setItem('akool_token_issued', String(Date.now()));
          return { success:true, token:this.token };
        }
        return { success:false, error:data?.error || '토큰 발급 실패' };
      }catch(e){
        return { success:false, error:e.message || '토큰 네트워크 오류' };
      }
    }

    // ========== 2) 이미지 압축 ==========
    _dataURLSize(dataUrl){
      const i = dataUrl.indexOf('base64,'); if (i === -1) return 0;
      const b64 = dataUrl.slice(i+7);
      return Math.floor((b64.length * 3)/4);
    }
    async compressDataURL(src, maxW=1024, maxH=1024, quality=0.9){
      return new Promise((resolve, reject)=>{
        const img = new Image();
        img.onload = ()=>{
          const r = Math.min(maxW/img.width, maxH/img.height, 1);
          const w = Math.round(img.width*r), h = Math.round(img.height*r);
          const c = document.createElement('canvas');
          c.width=w; c.height=h;
          c.getContext('2d').drawImage(img,0,0,w,h);
          let q = quality, out = c.toDataURL('image/jpeg', q);
          while(this._dataURLSize(out) > 3_500_000 && q > 0.3){
            q -= 0.1; out = c.toDataURL('image/jpeg', q);
          }
          resolve(out);
        };
        img.onerror = ()=>reject(new Error('이미지 로드 실패'));
        img.src = src;
      });
    }

    // ========== 3) 업로드(Firebase) ==========
    async uploadTemp(imageData, filename){
      const name = filename || `${UPLOAD_TARGET_PREFIX}faceswap_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const blob = await (await fetch(imageData)).blob();
      const storageRef = firebase.storage().ref();
      const fileRef = storageRef.child(name);
      const snap = await fileRef.put(blob);
      return await snap.ref.getDownloadURL();
    }

    // ========== 4) Detect (문서 기준) ==========
    async detectFace(imageUrl, kind='user'){
      try{
        const tk = await this.getToken();
        if (!tk.success) return tk;

        const res = await safeFetch(AKOOL_DETECT, {
          method:'POST',
          headers:{ 'Authorization':`Bearer ${this.token}`, 'Content-Type':'application/json' },
          body: JSON.stringify({ single_face:true, image_url:imageUrl })
        });
        const data = await res.json();

        // 문서: 성공시 error_code === 0, landmarks_str 배열 제공
        if (data && data.error_code === 0 && Array.isArray(data.landmarks_str) && data.landmarks_str.length){
          const landmarks = Array.isArray(data.landmarks_str) ? data.landmarks_str[0] : data.landmarks_str;
          return {
            success:true,
            // detect 응답에 crop URL이 없을 수 있으므로 일단 원본 URL 사용 (서버가 내부적으로 처리)
            cropUrl: data.crop_image_url || imageUrl,
            landmarks,
            boundingBox: data.region && data.region[0] ? data.region[0] : null
          };
        }
        return { success:false, error:data?.error_msg || `${kind} 얼굴 감지 실패`, message:'정면/밝은 환경의 사진을 사용해주세요.' };
      }catch(e){
        return { success:false, error:e.message || '감지 네트워크 오류' };
      }
    }

    // ========== 5) Specify Image Payload ==========
    _buildSpecifyImagePayload(userDetect, styleDetect, modifyImageUrl){
      // 문서 기준:
      //  - targetImage: 원본(바꿀 대상) 얼굴들
      //  - sourceImage: 교체에 사용할 얼굴들
      const user_to_style = {
        targetImage: [{ path: styleDetect.cropUrl, opts: styleDetect.landmarks }],
        sourceImage: [{ path: userDetect.cropUrl,  opts: userDetect.landmarks  }],
        face_enhance: 0,
        modifyImage: modifyImageUrl
      };
      const style_to_user = {
        targetImage: [{ path: userDetect.cropUrl,  opts: userDetect.landmarks  }],
        sourceImage: [{ path: styleDetect.cropUrl, opts: styleDetect.landmarks }],
        face_enhance: 0,
        modifyImage: modifyImageUrl
      };
      return (SWAP_DIRECTION === 'style_to_user') ? style_to_user : user_to_style;
    }

    // ========== 6) Faceswap 생성 (specifyimage) ==========
    async createFaceSwap(userDetect, styleDetect, modifyImageUrl){
      try{
        const tk = await this.getToken();
        if (!tk.success) return tk;

        const payload = this._buildSpecifyImagePayload(userDetect, styleDetect, modifyImageUrl);
        const res = await safeFetch(`${AKOOL_API}/faceswap/highquality/specifyimage`, {
          method:'POST',
          headers:{ 'Authorization':`Bearer ${this.token}`, 'Content-Type':'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        // 문서: code===1000, data = {_id, url, job_id}
        if (data && data.code === 1000 && data.data && (data.data._id || data.data.job_id)){
          return {
            success:true,
            taskId: data.data._id || data.data.job_id,
            resultUrl: data.data.url || null,
            message:'작업 생성'
          };
        }
        return { success:false, error:data?.msg || 'Face Swap 작업 생성 실패', code:data?.code };
      }catch(e){
        return { success:false, error:e.message || 'Face Swap 생성 네트워크 오류' };
      }
    }

    // ========== 7) 상태 조회 (result/listbyids) ==========
    async checkFaceSwapStatus(taskId){
      try{
        const tk = await this.getToken();
        if (!tk.success) return tk;

        const url = `${AKOOL_API}/faceswap/result/listbyids?_ids=${encodeURIComponent(taskId)}`;
        const res = await safeFetch(url, {
          method:'GET',
          headers:{ 'Authorization':`Bearer ${this.token}`, 'Content-Type':'application/json' }
        });
        const data = await res.json();

        if (!(data && data.code === 1000 && data.data && Array.isArray(data.data.result))){
          return { success:false, error:data?.msg || '상태 조회 실패' };
        }
        const row = data.data.result[0] || {};
        const statusMap = { 1:'pending', 2:'processing', 3:'completed', 4:'failed' };
        const status = statusMap[row.faceswap_status] || 'processing';
        const resultUrl = row.url || null;

        return {
          success:true,
          status,
          progress: (status === 'pending') ? 0 : (status === 'processing' ? 50 : 100),
          resultUrl,
          isComplete: status === 'completed' || status === 'failed',
          message: this.getStatusMessage(status)
        };
      }catch(e){
        return { success:false, error:e.message || '상태 확인 네트워크 오류' };
      }
    }

    getStatusMessage(s){
      const m = { pending:'대기 중...', processing:'처리 중...', completed:'완료됨', failed:'실패함' };
      return m[s] || (s || '진행 중...');
    }

    // ========== 8) 결과 대기(폴링) ==========
    async waitForResult(taskId, onProgress, maxWait=MAX_WAIT_MS){
      const started = Date.now();
      let delay = POLL_BASE_MS;
      let last = 0;
      return new Promise((resolve)=>{
        const tick = async () => {
          if (Date.now() - started > maxWait){
            return resolve({ success:false, error:'처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' });
          }
          const st = await this.checkFaceSwapStatus(taskId);
          if (!st.success) return resolve(st);

          if (onProgress){
            const p = Math.max(last, st.progress || 0);
            last = p;
            onProgress(Math.min(95, p), st.message);
          }
          if (st.isComplete){
            if (st.status === 'completed' && st.resultUrl){
              return resolve({ success:true, resultUrl:st.resultUrl, message:'완료' });
            }
            return resolve({ success:false, error:'처리 중 오류가 발생했습니다', message: st.message || '실패' });
          }
          delay = Math.min(POLL_MAX_MS, Math.round(delay * 1.2));
          setTimeout(tick, delay);
        };
        setTimeout(tick, delay);
      });
    }

    // ========== 9) 메인 워크플로우 ==========
    async processFaceSwap(userFileOrDataURL, hairstyleImageUrl, onProgress){
      try{
        onProgress && onProgress(0, '처리 시작...');

        // (a) 사용자 이미지 준비
        onProgress && onProgress(5, '이미지 최적화 중...');
        let userDataUrl;
        if (userFileOrDataURL instanceof File){
          userDataUrl = await new Promise((resolve, reject)=>{
            const fr = new FileReader();
            fr.onload = async (e)=> {
              try{ resolve(await this.compressDataURL(e.target.result, 1024, 1024, 0.9)); }
              catch(err){ reject(err); }
            };
            fr.onerror = ()=>reject(new Error('이미지 읽기 실패'));
            fr.readAsDataURL(userFileOrDataURL);
          });
        } else {
          userDataUrl = userFileOrDataURL;
          if (this._dataURLSize(userDataUrl) > 3_500_000){
            userDataUrl = await this.compressDataURL(userDataUrl, 1024, 1024, 0.9);
          }
        }

        // (b) 업로드
        onProgress && onProgress(10, '이미지 업로드 중...');
        const userImageUrl  = await this.uploadTemp(userDataUrl, `${UPLOAD_TARGET_PREFIX}user_${Date.now()}.jpg`);

        // 스타일 원본을 Firebase로 복사(외부 URL이면)
        let styleImageUrl = hairstyleImageUrl;
        if (!/firebasestorage\.googleapis\.com/.test(hairstyleImageUrl || '')){
          try{
            const blob = await (await safeFetch(hairstyleImageUrl)).blob();
            const asDataUrl = await new Promise((resolve, reject)=>{
              const img = new Image();
              img.onload = ()=>{
                const c = document.createElement('canvas');
                c.width = img.width; c.height = img.height;
                c.getContext('2d').drawImage(img,0,0);
                resolve(c.toDataURL('image/jpeg', 0.9));
              };
              img.onerror = ()=>reject(new Error('스타일 이미지 로드 실패'));
              img.src = URL.createObjectURL(blob);
            });
            styleImageUrl = await this.uploadTemp(asDataUrl, `${UPLOAD_TARGET_PREFIX}style_${Date.now()}.jpg`);
          }catch(e){
            console.warn('스타일 이미지 복사 실패, 원본 URL 사용:', e.message);
          }
        }

        // (c) Detect 2회
        onProgress && onProgress(20, '사용자 얼굴 분석 중...');
        const userDetect  = await this.detectFace(userImageUrl, 'user');
        if (!userDetect.success) return { success:false, error:userDetect.error, message:userDetect.message };

        onProgress && onProgress(35, '헤어스타일 분석 중...');
        const styleDetect = await this.detectFace(styleImageUrl, 'hairstyle');
        if (!styleDetect.success) return { success:false, error:styleDetect.error, message:styleDetect.message };

        // (d) Create (modifyImage = 스타일 원본 전체 이미지)
        onProgress && onProgress(45, 'AI 처리 요청 중...');
        const create = await this.createFaceSwap(userDetect, styleDetect, styleImageUrl);
        if (!create.success) return create;

        // (e) Poll
        onProgress && onProgress(55, '처리 대기 중...');
        const final = await this.waitForResult(create.taskId, onProgress, MAX_WAIT_MS);
        if (!final.success) return final;

        onProgress && onProgress(100, '완료!');

        // (선택) 결과 7일 만료 대비, 파이어베이스로 즉시 백업
        try{
          const blob = await (await safeFetch(final.resultUrl)).blob();
          const asDataUrl = await new Promise((resolve, reject)=>{
            const img = new Image();
            img.onload = ()=>{
              const c = document.createElement('canvas');
              c.width = img.width; c.height = img.height;
              c.getContext('2d').drawImage(img,0,0);
              resolve(c.toDataURL('image/jpeg', 0.95));
            };
            img.onerror = ()=>reject(new Error('결과 이미지 로드 실패'));
            img.src = URL.createObjectURL(blob);
          });
          const backupUrl = await this.uploadTemp(asDataUrl, `${UPLOAD_TARGET_PREFIX}result_${Date.now()}.jpg`);
          // 베스트-effort 정리
          this.cleanupTempFiles().catch(()=>{});
          return { success:true, resultUrl: backupUrl, message: final.message || '완료', method:'akool' };
        }catch(e){
          console.warn('결과 백업 실패, 원본 URL 유지:', e.message);
        }

        this.cleanupTempFiles().catch(()=>{});
        return { success:true, resultUrl: final.resultUrl, message: final.message || '완료', method:'akool' };
      }catch(e){
        return { success:false, error:e.message || '처리 중 오류', message:e.message || '오류' };
      }
    }

    // ========== 10) 유틸 ==========
    async cleanupTempFiles(){
      try{
        const storageRef = firebase.storage().ref();
        const tempRef = storageRef.child('temp');
        const oneHourAgo = Date.now() - 60*60*1000;
        const list = await tempRef.listAll();
        for (const item of list.items){
          try{
            const meta = await item.getMetadata();
            const created = new Date(meta.timeCreated).getTime();
            if (created < oneHourAgo){ await item.delete(); }
          }catch(_){}
        }
      }catch(_){}
    }

    async getUserCredit(){
      try{
        const tk = await this.getToken();
        if (!tk.success) return null;
        const res = await safeFetch(`${AKOOL_API}/faceswap/quota/info`,{
          headers:{ 'Authorization':`Bearer ${this.token}`, 'Content-Type':'application/json' }
        });
        const data = await res.json();
        if (data.code === 1000) return data.data?.credit ?? null;
        return null;
      }catch{ return null; }
    }

    async healthCheck(){
      try{
        const tk = await this.getToken();
        const credit = await this.getUserCredit();
        return { success:!!tk.success, token:!!this.token, credit, timestamp:new Date().toISOString() };
      }catch(e){
        return { success:false, error:e.message, timestamp:new Date().toISOString() };
      }
    }
  }

  // ===== 전역 =====
  window.AkoolAPI = AkoolAPI;
  window.akoolAPI = new AkoolAPI();

  // 레거시 호환
  window.performFaceSwap = async function(userImageData, styleImageData, onProgress){
    try{
      let fileOrData = userImageData;
      if (typeof userImageData === 'string' && userImageData.startsWith('data:image/')){
        const blob = await (await fetch(userImageData)).blob();
        fileOrData = new File([blob], 'user_image.jpg', { type:'image/jpeg' });
      }
      return await window.akoolAPI.processFaceSwap(fileOrData, styleImageData, onProgress);
    }catch(e){
      return { success:false, error:'Face swap failed', message:e.message };
    }
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(async ()=>{
      try{ console.log('🏥 AKOOL API 상태:', await window.akoolAPI.healthCheck()); }catch(_){}
      window.akoolAPI.cleanupTempFiles().catch(()=>{});
    }, 5000);
  });
})();
