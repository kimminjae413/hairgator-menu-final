// akool/js/akool-api.js
// AKOOL API 통합 모듈 - 올바른 엔드포인트 사용 버전
(function(){
  'use strict';

  // ===== 상수 =====
  const AKOOL_TOKEN_URL = '/.netlify/functions/akool-token';
  const AKOOL_API = 'https://openapi.akool.com/api/open/v3';
  const AKOOL_DETECT = 'https://sg3.akool.com/detect'; // ✅ 공식 문서 확인된 엔드포인트
  const UPLOAD_TARGET_PREFIX = 'temp/hairgate/';
  const SWAP_DIRECTION = 'style_to_user';
  const MAX_WAIT_MS = 180_000; // 3분
  const POLL_BASE_MS = 2000;
  const POLL_MAX_MS = 8000;

  // ===== 유틸리티 =====
  const safeFetch = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45초로 증가
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
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
    }

    // ========== 1) 토큰 관리 ==========
    async getToken() {
      try {
        if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
          return { success: true, token: this.token };
        }

        console.log('🔑 AKOOL 토큰 요청 중...');
        const response = await safeFetch(AKOOL_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('토큰 요청 실패:', errorText);
          return { success: false, error: `토큰 요청 실패: ${response.status}` };
        }

        const data = await response.json();
        
        if (!data.success || !data.token) {
          console.error('토큰 응답 오류:', data);
          return { success: false, error: data.error || '토큰 획득 실패' };
        }

        this.token = data.token;
        this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
        
        console.log('✅ AKOOL 토큰 획득 성공');
        return { success: true, token: this.token };
        
      } catch (error) {
        console.error('토큰 요청 네트워크 오류:', error);
        return { success: false, error: error.message || '토큰 요청 중 오류 발생' };
      }
    }

    // ========== 2) 이미지 압축 및 최적화 ==========
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
          
          // 더 큰 해상도 허용 (얼굴 감지 정확도 향상)
          const maxSize = 1536; // 1.5K로 증가
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
          
          // 고품질 렌더링 설정
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, w, h);
          
          let q = quality;
          let output = canvas.toDataURL('image/jpeg', q);
          
          // 파일 크기 제한 (5MB로 증가)
          while (this._dataURLSize(output) > 5_000_000 && q > 0.3) {
            q -= 0.1;
            output = canvas.toDataURL('image/jpeg', q);
          }
          
          console.log(`📐 이미지 최적화: ${img.width}x${img.height} → ${w}x${h}, 품질: ${q.toFixed(1)}`);
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
      return url;
    }

    // ========== 4) 얼굴 감지 (개선된 버전) ==========
    async detectFace(imageUrl, kind = 'user') {
      try {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) return tokenResult;

        console.log(`🔍 ${kind} 얼굴 감지 시작:`, imageUrl);

        const response = await safeFetch(AKOOL_DETECT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            single_face: true, // 단일 얼굴만 감지
            image_url: imageUrl
          })
        });

        const data = await response.json();
        console.log(`🔍 ${kind} 얼굴 감지 응답:`, data);

        // ✅ 공식 문서 기준 성공 조건: error_code === 0
        if (data && data.error_code === 0) {
          let landmarks = null;
          let cropUrl = imageUrl; // 기본값으로 원본 URL 사용
          
          // landmarks_str 처리 (공식 문서: landmarks_str 배열에서 첫 번째 요소)
          if (Array.isArray(data.landmarks_str) && data.landmarks_str.length > 0) {
            landmarks = data.landmarks_str[0];
          } else if (data.landmarks_str && typeof data.landmarks_str === 'string') {
            landmarks = data.landmarks_str;
          }
          
          // ⚠️ 공식 문서에서는 crop_image_url 언급 없음, 원본 URL 사용
          cropUrl = imageUrl;
          
          console.log(`✅ ${kind} 얼굴 감지 성공 - landmarks: ${!!landmarks}, region: ${!!data.region}`);
          
          return {
            success: true,
            cropUrl: cropUrl,
            landmarks: landmarks || 'default_landmarks', // 기본값 제공
            boundingBox: data.region && data.region[0] ? data.region[0] : null
          };
        }

        // 공식 문서 기준 에러 분석
        console.error(`❌ ${kind} 얼굴 감지 실패:`, {
          error_code: data.error_code,
          error_msg: data.error_msg,
          has_landmarks: !!data.landmarks_str,
          has_region: !!data.region
        });

        let errorMessage = '얼굴을 정확히 감지할 수 없습니다.';
        let suggestions = [
          '정면을 바라보는 밝은 사진을 사용해주세요',
          '한 명만 나온 사진을 사용해주세요',
          '얼굴이 선명하게 보이는 사진을 선택해주세요'
        ];

        return {
          success: false,
          error: `${kind} 얼굴 감지 실패 (error_code: ${data.error_code})`,
          message: errorMessage,
          suggestions: suggestions,
          debug: {
            error_code: data.error_code,
            error_msg: data.error_msg,
            response: data
          }
        };

      } catch (error) {
        console.error(`${kind} 얼굴 감지 네트워크 오류:`, error);
        return {
          success: false,
          error: error.message || '감지 네트워크 오류',
          message: '네트워크 연결을 확인하고 다시 시도해주세요.'
        };
      }
    }

    // ========== 5) FaceSwap 페이로드 생성 ==========
    _buildSpecifyImagePayload(userDetect, styleDetect, modifyImageUrl) {
      const payload = {
        targetImage: [{ 
          path: userDetect.cropUrl, 
          opts: userDetect.landmarks 
        }],
        sourceImage: [{ 
          path: styleDetect.cropUrl, 
          opts: styleDetect.landmarks 
        }],
        face_enhance: 1, // 얼굴 향상 기능 활성화
        modifyImage: modifyImageUrl
      };

      console.log('📋 FaceSwap 페이로드:', payload);
      return payload;
    }

    // ========== 6) FaceSwap 생성 ==========
    async createFaceSwap(userDetect, styleDetect, modifyImageUrl) {
      try {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) return tokenResult;

        const payload = this._buildSpecifyImagePayload(userDetect, styleDetect, modifyImageUrl);
        
        // ✅ 올바른 API 엔드포인트 사용
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
        console.error('FaceSwap 생성 오류:', error);
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
        console.log('📊 상태 조회 응답:', data);

        if (!(data && data.code === 1000 && data.data && Array.isArray(data.data.result))) {
          return { success: false, error: data?.msg || '상태 조회 실패' };
        }

        const result = data.data.result[0] || {};
        const statusMap = { 1: 'pending', 2: 'processing', 3: 'completed', 4: 'failed' };
        const status = statusMap[result.faceswap_status] || 'processing';
        const resultUrl = result.url || null;

        return {
          success: true,
          status,
          progress: status === 'pending' ? 0 : (status === 'processing' ? 50 : 100),
          resultUrl,
          isComplete: status === 'completed' || status === 'failed',
          message: this.getStatusMessage(status)
        };

      } catch (error) {
        console.error('상태 조회 오류:', error);
        return {
          success: false,
          error: error.message || '상태
