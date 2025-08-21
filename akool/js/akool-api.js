// akool/js/akool-api.js
// AKOOL API 통합 모듈 - SUCCESS 에러 수정 버전
(function(){
  'use strict';

  // ===== 상수 =====
  const AKOOL_TOKEN_URL = '/.netlify/functions/akool-token';
  const AKOOL_API = 'https://openapi.akool.com/api/open/v3';
  const AKOOL_DETECT = `${AKOOL_API}/faceswap/highquality/detectface`;
  const UPLOAD_TARGET_PREFIX = 'temp/hairgate/';
  const SWAP_DIRECTION = 'style_to_user';
  const MAX_WAIT_MS = 180_000; // 3분
  const POLL_BASE_MS = 2000;
  const POLL_MAX_MS = 8000;

  // ===== 유틸리티 =====
  const safeFetch = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
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
        throw new Error('요청 시간 초과 (30초)');
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
          if (w > maxWidth || h > maxHeight) {
            if (w > h) {
              h = (h * maxWidth) / w;
              w = maxWidth;
            } else {
              w = (w * maxHeight) / h;
              h = maxHeight;
            }
          }
          
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          
          let q = quality;
          let output = canvas.toDataURL('image/jpeg', q);
          
          while (this._dataURLSize(output) > 3_500_000 && q > 0.3) {
            q -= 0.1;
            output = canvas.toDataURL('image/jpeg', q);
          }
          
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

    // ========== 4) 얼굴 감지 ==========
    async detectFace(imageUrl, kind = 'user') {
      try {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) return tokenResult;

        const response = await safeFetch(AKOOL_DETECT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            single_face: true,
            image_url: imageUrl
          })
        });

        const data = await response.json();
        console.log(`🔍 ${kind} 얼굴 감지 응답:`, data);

        // ✅ 수정된 성공 조건 체크
        if (data && data.error_code === 0 && Array.isArray(data.landmarks_str) && data.landmarks_str.length > 0) {
          const landmarks = Array.isArray(data.landmarks_str) ? data.landmarks_str[0] : data.landmarks_str;
          return {
            success: true,
            cropUrl: data.crop_image_url || imageUrl,
            landmarks,
            boundingBox: data.region && data.region[0] ? data.region[0] : null
          };
        }

        // 실패 사유 분석
        let errorMessage = '정면/밝은 환경의 사진을 사용해주세요.';
        if (data.error_code !== 0) {
          switch (data.error_code) {
            case 1001:
              errorMessage = '얼굴이 감지되지 않았습니다. 정면 사진을 사용해주세요.';
              break;
            case 1002:
              errorMessage = '여러 얼굴이 감지되었습니다. 한 명만 나온 사진을 사용해주세요.';
              break;
            default:
              errorMessage = data.error_msg || errorMessage;
          }
        }

        return {
          success: false,
          error: data?.error_msg || `${kind} 얼굴 감지 실패`,
          message: errorMessage
        };

      } catch (error) {
        console.error(`${kind} 얼굴 감지 오류:`, error);
        return {
          success: false,
          error: error.message || '감지 네트워크 오류'
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
        face_enhance: 0,
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
          code: data?.code
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
          error: error.message || '상태 확인 네트워크 오류'
        };
      }
    }

    getStatusMessage(status) {
      const messages = {
        pending: '대기 중...',
        processing: '처리 중...',
        completed: '완료됨',
        failed: '실패함'
      };
      return messages[status] || (status || '진행 중...');
    }

    // ========== 8) 결과 대기 (폴링) ==========
    async waitForResult(taskId, onProgress, maxWait = MAX_WAIT_MS) {
      const startTime = Date.now();
      let delay = POLL_BASE_MS;
      let lastProgress = 0;

      return new Promise((resolve) => {
        const checkStatus = async () => {
          // 시간 초과 체크
          if (Date.now() - startTime > maxWait) {
            return resolve({
              success: false,
              error: '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
            });
          }

          const statusResult = await this.checkFaceSwapStatus(taskId);
          
          if (!statusResult.success) {
            return resolve(statusResult);
          }

          // 진행률 업데이트
          if (onProgress) {
            const progress = Math.max(lastProgress, statusResult.progress || 0);
            lastProgress = progress;
            onProgress(Math.min(95, progress), statusResult.message);
          }

          // 완료 체크
          if (statusResult.isComplete) {
            if (statusResult.status === 'completed' && statusResult.resultUrl) {
              return resolve({
                success: true,
                resultUrl: statusResult.resultUrl,
                message: '완료'
              });
            }
            return resolve({
              success: false,
              error: '처리 중 오류가 발생했습니다',
              message: statusResult.message || '실패'
            });
          }

          // 다음 폴링 지연시간 증가 (지수 백오프)
          delay = Math.min(POLL_MAX_MS, Math.round(delay * 1.2));
          setTimeout(checkStatus, delay);
        };

        // 첫 번째 상태 확인
        setTimeout(checkStatus, delay);
      });
    }

    // ========== 9) 메인 워크플로우 ==========
    async processFaceSwap(userFileOrDataURL, hairstyleImageUrl, onProgress) {
      try {
        onProgress && onProgress(0, '처리 시작...');

        // (a) 사용자 이미지 준비 및 압축
        onProgress && onProgress(5, '이미지 최적화 중...');
        let userDataUrl;

        if (userFileOrDataURL instanceof File) {
          userDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
              try {
                const compressed = await this.compressDataURL(event.target.result, 1024, 1024, 0.9);
                resolve(compressed);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = () => reject(new Error('이미지 읽기 실패'));
            reader.readAsDataURL(userFileOrDataURL);
          });
        } else {
          userDataUrl = userFileOrDataURL;
          if (this._dataURLSize(userDataUrl) > 3_500_000) {
            userDataUrl = await this.compressDataURL(userDataUrl, 1024, 1024, 0.9);
          }
        }

        // (b) 이미지 업로드
        onProgress && onProgress(10, '이미지 업로드 중...');
        const userImageUrl = await this.uploadTemp(userDataUrl, `${UPLOAD_TARGET_PREFIX}user_${Date.now()}.jpg`);

        // 스타일 이미지 Firebase로 복사 (외부 URL인 경우)
        let styleImageUrl = hairstyleImageUrl;
        if (!/firebasestorage\.googleapis\.com/.test(hairstyleImageUrl || '')) {
          try {
            const blob = await (await safeFetch(hairstyleImageUrl)).blob();
            const styleDataUrl = await new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
              };
              img.onerror = () => reject(new Error('스타일 이미지 로드 실패'));
              img.src = URL.createObjectURL(blob);
            });
            styleImageUrl = await this.uploadTemp(styleDataUrl, `${UPLOAD_TARGET_PREFIX}style_${Date.now()}.jpg`);
          } catch (error) {
            console.warn('스타일 이미지 복사 실패, 원본 URL 사용:', error.message);
          }
        }

        // (c) 얼굴 감지 - 사용자
        onProgress && onProgress(20, '사용자 얼굴 분석 중...');
        const userDetect = await this.detectFace(userImageUrl, 'user');
        if (!userDetect.success) {
          return {
            success: false,
            error: userDetect.error,
            message: userDetect.message
          };
        }

        // (d) 얼굴 감지 - 헤어스타일
        onProgress && onProgress(35, '헤어스타일 분석 중...');
        const styleDetect = await this.detectFace(styleImageUrl, 'hairstyle');
        if (!styleDetect.success) {
          return {
            success: false,
            error: styleDetect.error,
            message: styleDetect.message
          };
        }

        // (e) FaceSwap 작업 생성
        onProgress && onProgress(45, 'AI 처리 요청 중...');
        const createResult = await this.createFaceSwap(userDetect, styleDetect, styleImageUrl);
        if (!createResult.success) {
          return createResult;
        }

        // (f) 결과 대기
        onProgress && onProgress(55, '처리 대기 중...');
        const finalResult = await this.waitForResult(createResult.taskId, onProgress, MAX_WAIT_MS);
        
        if (!finalResult.success) {
          return finalResult;
        }

        onProgress && onProgress(100, '완료!');
        return {
          success: true,
          resultUrl: finalResult.resultUrl,
          message: '얼굴 바꾸기 완료'
        };

      } catch (error) {
        console.error('FaceSwap 처리 오류:', error);
        return {
          success: false,
          error: error.message || 'Face Swap 처리 중 오류 발생'
        };
      }
    }

    // ========== 10) 임시 파일 정리 ==========
    async cleanupTempFiles() {
      try {
        if (this.tempFiles.size === 0) return;
        
        const storageRef = firebase.storage().ref();
        const deletePromises = Array.from(this.tempFiles).map(async (filename) => {
          try {
            await storageRef.child(filename).delete();
            console.log(`🗑️ 임시 파일 삭제: ${filename}`);
          } catch (error) {
            console.warn(`임시 파일 삭제 실패: ${filename}`, error);
          }
        });
        
        await Promise.all(deletePromises);
        this.tempFiles.clear();
        
      } catch (error) {
        console.warn('임시 파일 정리 오류:', error);
      }
    }

    // ========== 11) 사용자 크레딧 조회 ==========
    async getUserCredit() {
      try {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) return null;

        const response = await safeFetch(`${AKOOL_API}/users/credit`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        return data && data.code === 1000 ? data.data?.credit : null;
        
      } catch (error) {
        console.warn('크레딧 조회 오류:', error);
        return null;
      }
    }

    // ========== 12) 헬스체크 ==========
    async healthCheck() {
      try {
        const tokenResult = await this.getToken();
        const credit = await this.getUserCredit();
        
        return {
          success: !!tokenResult.success,
          token: !!this.token,
          credit,
          timestamp: new Date().toISOString()
        };
        
      } catch (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // ===== 전역 등록 =====
  window.AkoolAPI = AkoolAPI;
  window.akoolAPI = new AkoolAPI();

  // 레거시 호환성 함수
  window.performFaceSwap = async function(userImageData, styleImageData, onProgress) {
    try {
      let fileOrData = userImageData;
      
      if (typeof userImageData === 'string' && userImageData.startsWith('data:image/')) {
        const blob = await (await fetch(userImageData)).blob();
        fileOrData = new File([blob], 'user_image.jpg', { type: 'image/jpeg' });
      }
      
      return await window.akoolAPI.processFaceSwap(fileOrData, styleImageData, onProgress);
      
    } catch (error) {
      console.error('레거시 FaceSwap 오류:', error);
      return {
        success: false,
        error: 'Face swap failed',
        message: error.message
      };
    }
  };

  // ===== 초기화 =====
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
      try {
        const healthStatus = await window.akoolAPI.healthCheck();
        console.log('🏥 AKOOL API 상태:', healthStatus);
      } catch (error) {
        console.warn('헬스체크 실패:', error);
      }
      
      // 5분마다 임시 파일 정리
      setInterval(() => {
        window.akoolAPI.cleanupTempFiles().catch(() => {});
      }, 300000);
      
    }, 2000);
  });

})();
