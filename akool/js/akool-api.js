// akool/js/akool-api.js
// AKOOL API 통합 모듈 - 최종 완성 버전
(function(){
  'use strict';

  // ===== 상수 =====
  const AKOOL_TOKEN_URL = '/.netlify/functions/akool-token';
  const AKOOL_API = 'https://openapi.akool.com/api/open/v3';
  const AKOOL_DETECT = 'https://sg3.akool.com/detect'; // ✅ 공식 엔드포인트
  const UPLOAD_TARGET_PREFIX = 'temp/hairgate/';
  const MAX_WAIT_MS = 180_000; // 3분
  const POLL_BASE_MS = 2000;
  const POLL_MAX_MS = 8000;

  // ===== 유틸리티 =====
  const safeFetch = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    
    try {
      console.log(`🌐 요청 시작: ${url}`);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      console.log(`📡 응답 수신: ${url} - 상태: ${response.status}`);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`❌ 요청 실패: ${url}`, error);
      if (error.name === 'AbortError') {
        throw new Error('요청 시간 초과 (45초)');
      }
      throw error;
    }
  };

  // ===== AKOOL API 클래스 =====
  class AkoolAPI {
    constructor() {
      this.token = null;
      this.tokenExpiry = null;
      this.tempFiles = new Set();
      this.isInitialized = false;
      
      console.log('🏗️ AKOOL API 클래스 생성됨');
    }

    // ========== 1) 토큰 관리 (강화된 디버깅) ==========
    async getToken() {
      try {
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
          console.log('✅ 기존 토큰 사용 가능');
          return { success: true, token: this.token };
        }

        console.log('🔑 AKOOL 토큰 요청 시작...');
        console.log('📍 토큰 URL:', AKOOL_TOKEN_URL);
        
        // Netlify Functions 엔드포인트 확인
        try {
          const testResponse = await fetch('/.netlify/functions/');
          console.log('📋 Netlify Functions 상태:', testResponse.status);
        } catch (testError) {
          console.warn('⚠️ Netlify Functions 테스트 실패:', testError.message);
        }
        
        const response = await safeFetch(AKOOL_TOKEN_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({})
        });

        console.log(`📊 토큰 응답 상태: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ 토큰 요청 실패 상세:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: errorText
          });
          
          // 404 에러인 경우 더 구체적인 안내
          if (response.status === 404) {
            throw new Error('Netlify Functions가 배포되지 않았습니다. 관리자에게 문의하세요.');
          }
          
          throw new Error(`토큰 요청 실패: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('📦 토큰 응답 데이터:', {
          success: data.success,
          hasToken: !!data.token,
          tokenLength: data.token ? data.token.length : 0
        });
        
        if (!data.success || !data.token) {
          console.error('❌ 토큰 응답 오류:', data);
          throw new Error(data.error || '토큰 획득 실패');
        }

        this.token = data.token;
        this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
        this.isInitialized = true;
        
        console.log('✅ AKOOL 토큰 획득 성공!');
        return { success: true, token: this.token };
        
      } catch (error) {
        console.error('💥 토큰 요청 전체 오류:', error);
        this.isInitialized = false;
        return { success: false, error: error.message || '토큰 요청 중 오류 발생' };
      }
    }

    // ========== 2) 이미지 압축 ==========
    _dataURLSize(dataUrl) {
      return Math.round((dataUrl.length * 3) / 4);
    }

    async compressDataURL(src, maxWidth = 1024, maxHeight = 1024, quality = 0.9) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          let { width: w, height: h } = img;
          
          // 해상도 조정
          const maxSize = 1536;
          if (w > maxSize || h > maxSize) {
            if (w > h) {
              h = (h * maxSize) / w;
              w = maxSize;
            } else {
              w = (w * maxSize) / h;
              h = maxSize;
            }
          }
          
          canvas.width = w;
          canvas.height = h;
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
          
          let q = quality;
          let output = canvas.toDataURL('image/jpeg', q);
          
          while (this._dataURLSize(output) > 5_000_000 && q > 0.3) {
            q -= 0.1;
            output = canvas.toDataURL('image/jpeg', q);
          }
          
          console.log(`📐 이미지 최적화 완료: ${img.width}x${img.height} → ${w}x${h}, 품질: ${q.toFixed(1)}`);
          resolve(output);
        };
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = src;
      });
    }

    // ========== 3) Firebase 업로드 ==========
    async uploadTemp(imageData, filename) {
      const name = filename || `${UPLOAD_TARGET_PREFIX}faceswap_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const blob = await (await fetch(imageData)).blob();
      const storageRef = firebase.storage().ref();
      const fileRef = storageRef.child(name);
      const snapshot = await fileRef.put(blob);
      const url = await snapshot.ref.getDownloadURL();
      
      this.tempFiles.add(name);
      console.log(`📤 Firebase 업로드 완료: ${name}`);
      return url;
    }

    // ========== 4) 얼굴 감지 ==========
    async detectFace(imageUrl, kind = 'user') {
      try {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) {
          console.error(`❌ ${kind} 얼굴 감지: 토큰 오류`, tokenResult.error);
          return tokenResult;
        }

        console.log(`🔍 ${kind} 얼굴 감지 시작:`, imageUrl);

        const requestBody = {
          single_face: true,
          image_url: imageUrl
        };
        
        console.log(`📋 ${kind} 감지 요청:`, requestBody);

        const response = await safeFetch(AKOOL_DETECT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log(`🔍 ${kind} 얼굴 감지 전체 응답:`, data);

        if (data && data.error_code === 0) {
          let landmarks = null;
          let cropUrl = imageUrl;
          
          if (Array.isArray(data.landmarks_str) && data.landmarks_str.length > 0) {
            landmarks = data.landmarks_str[0];
          } else if (data.landmarks_str && typeof data.landmarks_str === 'string') {
            landmarks = data.landmarks_str;
          }
          
          console.log(`✅ ${kind} 얼굴 감지 성공!`, {
            landmarks: !!landmarks,
            region: !!data.region,
            landmarksData: landmarks
          });
          
          return {
            success: true,
            cropUrl: cropUrl,
            landmarks: landmarks || 'default_landmarks',
            boundingBox: data.region && data.region[0] ? data.region[0] : null
          };
        }

        // 실패 처리
        console.error(`❌ ${kind} 얼굴 감지 실패:`, {
          error_code: data.error_code,
          error_msg: data.error_msg,
          full_response: data
        });

        let errorMessage = '얼굴을 정확히 감지할 수 없습니다.';
        const suggestions = [
          '정면을 바라보는 밝은 사진을 사용해주세요',
          '한 명만 나온 사진을 사용해주세요',
          '얼굴이 선명하게 보이는 사진을 선택해주세요'
        ];

        return {
          success: false,
          error: `${kind} 얼굴 감지 실패 (error_code: ${data.error_code})`,
          message: errorMessage,
          suggestions: suggestions,
          debug: data
        };

      } catch (error) {
        console.error(`💥 ${kind} 얼굴 감지 네트워크 오류:`, error);
        return {
          success: false,
          error: error.message || '감지 네트워크 오류',
          message: '네트워크 연결을 확인하고 다시 시도해주세요.'
        };
      }
    }

    // ========== 5) FaceSwap 페이로드 구성 (수정 버전) ==========
    _buildSpecifyImagePayload(userDetect, styleDetect, modifyImageUrl) {
      // 🎯 목표: 헤어스타일 사진(A)에 유저 얼굴(B)을 넣기
      const payload = {
        targetImage: [{ 
          path: styleDetect.cropUrl,     // 바뀔 얼굴: 헤어스타일 모델 얼굴(A)
          opts: styleDetect.landmarks 
        }],
        sourceImage: [{ 
          path: userDetect.cropUrl,      // 새로 들어갈 얼굴: 유저 얼굴(B)
          opts: userDetect.landmarks 
        }],
        face_enhance: 1,
        modifyImage: modifyImageUrl       // 베이스: 헤어스타일 사진(A)
      };

      console.log('📋 수정된 FaceSwap 페이로드:', payload);
      console.log('🎯 목표: 헤어스타일 사진(A)에 유저 얼굴(B) 넣기');
      console.log('👤 유저 cropUrl:', userDetect.cropUrl);
      console.log('💇 헤어스타일 cropUrl:', styleDetect.cropUrl);
      console.log('🖼️ modifyImage (베이스):', modifyImageUrl);
      
      return payload;
    }

    // ========== 6) FaceSwap 작업 생성 ==========
    async createFaceSwap(userDetect, styleDetect, modifyImageUrl) {
      try {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) return tokenResult;

        const payload = this._buildSpecifyImagePayload(userDetect, styleDetect, modifyImageUrl);
        
        const response = await safeFetch(`${AKOOL_API}/faceswap/highquality/specifyimage`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('🚀 FaceSwap 생성 응답:', data);

        if (data && data.code === 1000 && data.data && (data.data._id || data.data.job_id)) {
          return {
            success: true,
            taskId: data.data._id || data.data.job_id,
            resultUrl: data.data.url || null,
            message: '작업 생성 완료'
          };
        }

        return {
          success: false,
          error: data?.msg || 'Face Swap 작업 생성 실패',
          code: data?.code,
          details: data
        };

      } catch (error) {
        console.error('💥 FaceSwap 생성 오류:', error);
        return {
          success: false,
          error: error.message || 'Face Swap 생성 네트워크 오류'
        };
      }
    }

    // ========== 7) 상태 조회 ==========
    async checkFaceSwapStatus(taskId) {
      try {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) return tokenResult;

        const url = `${AKOOL_API}/faceswap/result/listbyids?_ids=${encodeURIComponent(taskId)}`;
        const response = await safeFetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        console.log('📊 FaceSwap 상태 조회 응답:', data);

        if (!(data && data.code === 1000 && data.data && Array.isArray(data.data.result))) {
          return { success: false, error: data?.msg || '상태 조회 실패' };
        }

        const row = data.data.result[0] || {};
        const statusMap = { 1: 'pending', 2: 'processing', 3: 'completed', 4: 'failed' };
        const status = statusMap[row.faceswap_status] || 'processing';
        const resultUrl = row.url || null;

        // ✅ 핵심 수정: resultUrl이 있으면 무조건 완료로 판정
        let isComplete = false;
        let finalStatus = status;
        let finalProgress = 0;

        if (resultUrl && resultUrl.trim() !== '') {
          // URL이 있으면 완료
          finalStatus = 'completed';
          isComplete = true;
          finalProgress = 100;
          console.log('🎉 결과 URL 발견! 완료 처리:', resultUrl);
        } else if (status === 'completed' || status === 'failed') {
          // 명시적 완료/실패
          isComplete = true;
          finalProgress = 100;
        } else if (status === 'processing') {
          finalProgress = 50;
        } else {
          finalProgress = 0;
        }

        console.log('🔍 최종 판정:', {
          원본_faceswap_status: row.faceswap_status,
          매핑된_status: status,
          최종_status: finalStatus,
          resultUrl: resultUrl,
          isComplete: isComplete,
          progress: finalProgress
        });

        return {
          success: true,
          status: finalStatus,
          progress: finalProgress,
          resultUrl,
          isComplete,
          message: this.getStatusMessage(finalStatus)
        };
      } catch (error) {
        console.error('💥 상태 조회 오류:', error);
        return {
          success: false,
          error: error.message || '상태 확인 네트워크 오류'
        };
      }
    }

    // ========== 8) 상태 메시지 ==========
    getStatusMessage(status) {
      const messages = { 
        pending: '대기 중...', 
        processing: '처리 중...', 
        completed: '완료됨', 
        failed: '실패함' 
      };
      return messages[status] || (status || '진행 중...');
    }

    // ========== 9) 결과 대기(폴링) ==========
    async waitForResult(taskId, onProgress, maxWait = MAX_WAIT_MS) {
      const started = Date.now();
      let delay = POLL_BASE_MS;
      let last = 0;
      
      return new Promise((resolve) => {
        const tick = async () => {
          if (Date.now() - started > maxWait) {
            return resolve({ 
              success: false, 
              error: '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' 
            });
          }
          
          const status = await this.checkFaceSwapStatus(taskId);
          if (!status.success) return resolve(status);

          if (onProgress) {
            const progress = Math.max(last, status.progress || 0);
            last = progress;
            onProgress(Math.min(95, progress), status.message);
          }
          
          if (status.isComplete) {
            if (status.status === 'completed' && status.resultUrl) {
              return resolve({ 
                success: true, 
                resultUrl: status.resultUrl, 
                message: '완료' 
              });
            }
            return resolve({ 
              success: false, 
              error: '처리 중 오류가 발생했습니다', 
              message: status.message || '실패' 
            });
          }
          
          delay = Math.min(POLL_MAX_MS, Math.round(delay * 1.2));
          setTimeout(tick, delay);
        };
        
        setTimeout(tick, delay);
      });
    }

    // ========== 10) 임시 파일 정리 ==========
    async cleanupTempFiles() {
      try {
        const storageRef = firebase.storage().ref();
        const tempRef = storageRef.child('temp');
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const list = await tempRef.listAll();
        
        for (const item of list.items) {
          try {
            const meta = await item.getMetadata();
            const created = new Date(meta.timeCreated).getTime();
            if (created < oneHourAgo) { 
              await item.delete(); 
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    // ========== 메인 워크플로우 (수정 완료 버전) ==========
    async processFaceSwap(userFileOrDataURL, hairstyleImageUrl, onProgress) {
      try {
        console.log('🎬 Face Swap 처리 시작');
        onProgress && onProgress(0, '처리 시작...');

        // (a) 사용자 이미지 준비
        onProgress && onProgress(5, '이미지 최적화 중...');
        let userDataUrl;
        if (userFileOrDataURL instanceof File) {
          userDataUrl = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = async (e) => {
              try { 
                resolve(await this.compressDataURL(e.target.result, 1024, 1024, 0.9)); 
              }
              catch(err) { 
                reject(err); 
              }
            };
            fr.onerror = () => reject(new Error('이미지 읽기 실패'));
            fr.readAsDataURL(userFileOrDataURL);
          });
        } else {
          userDataUrl = userFileOrDataURL;
          if (this._dataURLSize(userDataUrl) > 5_000_000) {
            userDataUrl = await this.compressDataURL(userDataUrl, 1024, 1024, 0.9);
          }
        }

        // (b) 업로드
        onProgress && onProgress(10, '이미지 업로드 중...');
        const userImageUrl = await this.uploadTemp(userDataUrl, `${UPLOAD_TARGET_PREFIX}user_${Date.now()}.jpg`);

        // 스타일 원본을 Firebase로 복사(외부 URL이면)
        let styleImageUrl = hairstyleImageUrl;
        if (!/firebasestorage\.googleapis\.com/.test(hairstyleImageUrl || '')) {
          try {
            const blob = await (await safeFetch(hairstyleImageUrl)).blob();
            const asDataUrl = await new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.width; 
                c.height = img.height;
                c.getContext('2d').drawImage(img, 0, 0);
                resolve(c.toDataURL('image/jpeg', 0.9));
              };
              img.onerror = () => reject(new Error('스타일 이미지 로드 실패'));
              img.src = URL.createObjectURL(blob);
            });
            styleImageUrl = await this.uploadTemp(asDataUrl, `${UPLOAD_TARGET_PREFIX}style_${Date.now()}.jpg`);
          } catch(e) {
            console.warn('스타일 이미지 복사 실패, 원본 URL 사용:', e.message);
          }
        }

        // (c) Detect 2회
        onProgress && onProgress(20, '사용자 얼굴 분석 중...');
        const userDetect = await this.detectFace(userImageUrl, 'user');
        if (!userDetect.success) return { success: false, error: userDetect.error, message: userDetect.message };

        onProgress && onProgress(35, '헤어스타일 분석 중...');
        const styleDetect = await this.detectFace(styleImageUrl, 'hairstyle');
        if (!styleDetect.success) return { success: false, error: styleDetect.error, message: styleDetect.message };

        // 🔍 중요한 디버깅 로그 추가
        console.log('🔍 Face Swap 전 데이터 검증:');
        console.log('👤 사용자 detect:', {
          success: userDetect.success,
          cropUrl: userDetect.cropUrl,
          hasLandmarks: !!userDetect.landmarks,
          landmarksType: typeof userDetect.landmarks
        });
        console.log('💇 스타일 detect:', {
          success: styleDetect.success,
          cropUrl: styleDetect.cropUrl,
          hasLandmarks: !!styleDetect.landmarks,
          landmarksType: typeof styleDetect.landmarks
        });

        // (d) Create - 🎯 핵심: 헤어스타일 이미지를 베이스로 사용
        onProgress && onProgress(45, 'AI 처리 요청 중...');
        const create = await this.createFaceSwap(userDetect, styleDetect, styleImageUrl);
        if (!create.success) return create;

        // (e) Poll
        onProgress && onProgress(55, '처리 대기 중...');
        const final = await this.waitForResult(create.taskId, onProgress, MAX_WAIT_MS);
        if (!final.success) return final;

        onProgress && onProgress(100, '완료!');

        // (선택) 결과 백업
        try {
          const blob = await (await safeFetch(final.resultUrl)).blob();
          const asDataUrl = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const c = document.createElement('canvas');
              c.width = img.width; 
              c.height = img.height;
              c.getContext('2d').drawImage(img, 0, 0);
              resolve(c.toDataURL('image/jpeg', 0.95));
            };
            img.onerror = () => reject(new Error('결과 이미지 로드 실패'));
            img.src = URL.createObjectURL(blob);
          });
          const backupUrl = await this.uploadTemp(asDataUrl, `${UPLOAD_TARGET_PREFIX}result_${Date.now()}.jpg`);
          
          this.cleanupTempFiles().catch(() => {});
          return { success: true, resultUrl: backupUrl, message: final.message || '완료', method: 'akool' };
        } catch(e) {
          console.warn('결과 백업 실패, 원본 URL 유지:', e.message);
        }

        this.cleanupTempFiles().catch(() => {});
        return { success: true, resultUrl: final.resultUrl, message: final.message || '완료', method: 'akool' };
      } catch(error) {
        console.error('💥 Face Swap 처리 오류:', error);
        return { success: false, error: error.message || 'Face Swap 처리 중 오류 발생' };
      }
    }

    // ========== 헬스체크 ==========
    async healthCheck() {
      try {
        console.log('🏥 AKOOL API 헬스체크 시작');
        
        const tokenResult = await this.getToken();
        
        return {
          success: !!tokenResult.success,
          token: !!this.token,
          isInitialized: this.isInitialized,
          tokenExpiry: this.tokenExpiry,
          timestamp: new Date().toISOString(),
          error: tokenResult.error || null
        };
        
      } catch (error) {
        console.error('💥 헬스체크 오류:', error);
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // ===== 전역 등록 =====
  console.log('🔧 AKOOL API 전역 등록 중...');
  
  window.AkoolAPI = AkoolAPI;
  window.akoolAPI = new AkoolAPI();
  
  console.log('✅ window.akoolAPI 등록 완료');

  // ===== 초기화 확인 =====
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM 로드 완료 - AKOOL API 상태 확인');
    
    setTimeout(async () => {
      try {
        if (window.akoolAPI && typeof window.akoolAPI.healthCheck === 'function') {
          const healthStatus = await window.akoolAPI.healthCheck();
          console.log('🏥 AKOOL API 헬스체크 결과:', healthStatus);
        } else {
          console.error('❌ window.akoolAPI가 제대로 초기화되지 않음');
        }
      } catch (error) {
        console.error('💥 헬스체크 실행 오류:', error);
      }
    }, 1000);
  });

})();

// 즉시 확인
console.log('🔍 스크립트 로드 즉시 확인:', {
  hasWindow: typeof window !== 'undefined',
  hasAkoolAPI: typeof window.akoolAPI !== 'undefined',
  hasProcessFaceSwap: typeof window.akoolAPI?.processFaceSwap === 'function'
});

// ========== CloudFront 문제 진짜 해결 시스템 ==========
window.fixAkoolCloudFront = async function() {
    console.log('🔧 AKOOL CloudFront 문제 진짜 해결 시작');
    
    // 기존 processFaceSwap 함수 백업
    const originalProcessFaceSwap = window.akoolAPI.processFaceSwap;
    
    // 수정된 processFaceSwap 함수로 교체
    window.akoolAPI.processFaceSwap = async function(userFile, styleUrl, onProgress) {
        console.log('🎨 수정된 Face Swap 시작 (프록시 포함)');
        
        // 원래 API 호출
        const result = await originalProcessFaceSwap.call(this, userFile, styleUrl, onProgress);
        
        if (result && result.success && result.resultUrl) {
            console.log('⚡ AKOOL 성공! CloudFront URL 즉시 캐시 시도:', result.resultUrl);
            
            // 방법 1: 서버 프록시를 통한 즉시 다운로드
            try {
                const proxyUrl = `/.netlify/functions/akool-proxy?url=${encodeURIComponent(result.resultUrl)}`;
                console.log('🌐 서버 프록시 시도:', proxyUrl);
                
                const proxyResponse = await fetch(proxyUrl);
                
                if (proxyResponse.ok) {
                    const blob = await proxyResponse.blob();
                    const backupUrl = URL.createObjectURL(blob);
                    
                    console.log('✅ 서버 프록시를 통한 결과 저장 성공!');
                    result.resultUrl = backupUrl;
                    result.cached = true;
                    result.method = 'proxy';
                    
                    return result;
                }
            } catch (error) {
                console.log('⚠️ 서버 프록시 실패:', error.message);
            }
            
            // 방법 2: 즉시 fetch 시도 (타이밍이 중요)
            try {
                console.log('⚡ CloudFront 즉시 fetch 시도...');
                
                const immediateResponse = await fetch(result.resultUrl, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache'
                });
                
                if (immediateResponse.ok) {
                    const blob = await immediateResponse.blob();
                    const immediateUrl = URL.createObjectURL(blob);
                    
                    console.log('✅ CloudFront 즉시 fetch 성공!');
                    result.resultUrl = immediateUrl;
                    result.cached = true;
                    result.method = 'immediate';
                    
                    return result;
                }
            } catch (error) {
                console.log('⚠️ 즉시 fetch 실패:', error.message);
            }
            
            console.log('⚠️ 모든 방법 실패, 기존 URL 유지 (Canvas 시뮬레이션으로 전환될 예정)');
        }
        
        return result;
    };
    
    console.log('✅ AKOOL Face Swap 함수 수정 완료');
};

// 즉시 실행
if (window.akoolAPI) {
    fixAkoolCloudFront();
} else {
    // AKOOL API가 아직 로드되지 않은 경우 잠시 후 실행
    setTimeout(() => {
        if (window.akoolAPI) {
            fixAkoolCloudFront();
        }
    }, 1000);
}

console.log('🚀 CloudFront 해결 시스템 로드됨');
