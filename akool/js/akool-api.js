// akool/js/akool-api.js
// AKOOL Face Swap API 클라이언트 - 실제 API 연동 버전

class AkoolAPI {
  constructor() {
    this.token = null;
    this.tokenExpiration = null;
    this.baseURL = '/.netlify/functions';
  }

  // 토큰 발급 및 갱신
  async getToken() {
    // 토큰이 유효한지 확인 (만료 1분 전에 갱신)
    if (this.token && this.tokenExpiration && Date.now() < this.tokenExpiration - 60000) {
      return { success: true, token: this.token };
    }

    try {
      console.log('🔑 AKOOL 토큰 발급 중...');

      const response = await fetch(`${this.baseURL}/akool-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.token) {
        this.token = data.token;
        this.tokenExpiration = data.expiresAt;
        console.log('✅ 토큰 발급 성공');
        return { success: true, token: this.token };
      } else {
        console.error('❌ 토큰 발급 실패:', data);
        return { success: false, error: data.message || '토큰 발급에 실패했습니다' };
      }

    } catch (error) {
      console.error('❌ 토큰 발급 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // 이미지 압축 및 최적화
  compressImage(file, maxSize = 1024 * 1024) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 최대 크기 제한
        const maxWidth = 1024;
        const maxHeight = 1024;
        
        let { width, height } = img;

        // 비율 유지하면서 크기 조정
        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // 품질 조정으로 파일 크기 최적화
        let quality = 0.9;
        let result = canvas.toDataURL('image/jpeg', quality);

        while (result.length > maxSize && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        console.log(`🖼️ 이미지 압축 완료: ${Math.round(result.length / 1024)}KB (품질: ${Math.round(quality * 100)}%)`);
        resolve(result);
      };

      img.onerror = () => {
        console.error('❌ 이미지 로딩 실패');
        resolve(null);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // 얼굴 감지 - AKOOL detect API 사용
  async detectFace(imageData, type = 'user') {
    try {
      const tokenResult = await this.getToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      console.log(`🔍 ${type === 'user' ? '사용자' : '헤어스타일'} 얼굴 감지 중...`);

      const response = await fetch(`${this.baseURL}/akool-faceswap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: this.token,
          [type === 'user' ? 'userImage' : 'hairstyleImage']: imageData,
          step: type === 'user' ? 'detect_user' : 'detect_hairstyle'
        })
      });

      const data = await response.json();

      if (data.success && data.landmarks) {
        console.log(`✅ ${type === 'user' ? '사용자' : '헤어스타일'} 얼굴 감지 성공`);
        return { success: true, landmarks: data.landmarks };
      } else {
        console.error(`❌ ${type === 'user' ? '사용자' : '헤어스타일'} 얼굴 감지 실패:`, data);
        return { 
          success: false, 
          error: data.error || '얼굴을 감지할 수 없습니다',
          message: data.message || '사진에서 명확한 얼굴을 찾을 수 없습니다'
        };
      }

    } catch (error) {
      console.error('❌ 얼굴 감지 네트워크 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // Face Swap 실행 - AKOOL highquality API 사용
  async performFaceSwap(userImage, hairstyleImage, userLandmarks, hairstyleLandmarks) {
    try {
      const tokenResult = await this.getToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      console.log('🔄 Face Swap 시작...');

      const response = await fetch(`${this.baseURL}/akool-faceswap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: this.token,
          userImage: userImage,
          hairstyleImage: hairstyleImage,
          userLandmarks: userLandmarks,
          hairstyleLandmarks: hairstyleLandmarks,
          step: 'faceswap'
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Face Swap 요청 성공');
        return {
          success: true,
          jobId: data.jobId,
          resultId: data.resultId,
          url: data.url,
          message: data.message
        };
      } else {
        console.error('❌ Face Swap 실패:', data);
        return { 
          success: false, 
          error: data.error || 'Face Swap에 실패했습니다',
          message: data.message
        };
      }

    } catch (error) {
      console.error('❌ Face Swap 네트워크 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // 결과 상태 확인 - AKOOL listbyids API 사용
  async checkStatus(resultId) {
    try {
      const tokenResult = await this.getToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      const response = await fetch(
        `${this.baseURL}/akool-status?token=${encodeURIComponent(this.token)}&resultId=${encodeURIComponent(resultId)}`,
        { method: 'GET' }
      );

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          status: data.status,
          statusText: data.statusText,
          isComplete: data.isComplete,
          progress: data.progress,
          resultUrl: data.resultUrl,
          message: data.message
        };
      } else {
        console.error('❌ 상태 확인 실패:', data);
        return { success: false, error: data.error || '상태 확인에 실패했습니다' };
      }

    } catch (error) {
      console.error('❌ 상태 확인 네트워크 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // 결과 대기 - 폴링 방식으로 완료까지 대기
  async waitForResult(resultId, progressCallback, maxWaitTime = 180000) { // 3분 최대 대기
    const startTime = Date.now();
    const pollInterval = 5000; // 5초마다 확인
    let lastProgress = 0;

    return new Promise((resolve) => {
      const checkResult = async () => {
        const elapsed = Date.now() - startTime;

        if (elapsed > maxWaitTime) {
          console.log('⏰ 처리 시간 초과');
          resolve({ success: false, error: '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' });
          return;
        }

        const status = await this.checkStatus(resultId);

        if (!status.success) {
          resolve(status);
          return;
        }

        // 진행률 업데이트 (진행률이 변경된 경우에만)
        if (progressCallback && status.progress !== lastProgress) {
          lastProgress = status.progress;
          progressCallback(status.progress, status.statusText);
        }

        console.log(`📊 처리 상태: ${status.statusText} (${status.progress}%)`);

        if (status.isComplete) {
          if (status.status === 3 && status.resultUrl) {
            console.log('🎉 Face Swap 완료!');
            resolve({
              success: true,
              resultUrl: status.resultUrl,
              message: '✨ 헤어스타일 적용이 완료되었습니다!'
            });
          } else {
            console.log('💥 Face Swap 실패');
            resolve({
              success: false,
              error: '처리 중 오류가 발생했습니다',
              message: status.message || '이미지 처리에 실패했습니다'
            });
          }
        } else {
          // 계속 상태 확인
          setTimeout(checkResult, pollInterval);
        }
      };

      checkResult();
    });
  }

  // 완전한 Face Swap 워크플로우
  async processFaceSwap(userFile, hairstyleImageUrl, progressCallback) {
    try {
      if (progressCallback) progressCallback(0, '처리 시작...');

      // 1. 이미지 압축
      if (progressCallback) progressCallback(5, '이미지 최적화 중...');
      const userImageData = await this.compressImage(userFile);
      
      if (!userImageData) {
        return { success: false, error: '이미지 처리에 실패했습니다' };
      }

      // 2. 사용자 얼굴 감지
      if (progressCallback) progressCallback(15, '사용자 얼굴 분석 중...');
      const userDetectResult = await this.detectFace(userImageData, 'user');
      if (!userDetectResult.success) {
        return { 
          success: false, 
          error: userDetectResult.error,
          message: userDetectResult.message || '사용자 얼굴을 인식할 수 없습니다'
        };
      }

      // 3. 헤어스타일 이미지 얼굴 감지
      if (progressCallback) progressCallback(25, '헤어스타일 분석 중...');
      const hairstyleDetectResult = await this.detectFace(hairstyleImageUrl, 'hairstyle');
      if (!hairstyleDetectResult.success) {
        return { 
          success: false, 
          error: hairstyleDetectResult.error,
          message: hairstyleDetectResult.message || '헤어스타일 이미지를 분석할 수 없습니다'
        };
      }

      // 4. Face Swap 요청
      if (progressCallback) progressCallback(35, 'AI 처리 요청 중...');
      const faceswapResult = await this.performFaceSwap(
        userImageData,
        hairstyleImageUrl,
        userDetectResult.landmarks,
        hairstyleDetectResult.landmarks
      );

      if (!faceswapResult.success) {
        return { 
          success: false, 
          error: faceswapResult.error,
          message: faceswapResult.message || 'Face swap 요청에 실패했습니다'
        };
      }

      // 5. 결과 대기
      if (progressCallback) progressCallback(40, '처리 대기 중...');
      
      const finalResult = await this.waitForResult(faceswapResult.resultId, progressCallback);

      if (finalResult.success) {
        if (progressCallback) progressCallback(100, '완료!');
        return {
          success: true,
          resultUrl: finalResult.resultUrl,
          message: finalResult.message || '🎉 헤어스타일 적용이 완료되었습니다!'
        };
      } else {
        return finalResult;
      }

    } catch (error) {
      console.error('❌ Face Swap 워크플로우 오류:', error);
      return { 
        success: false, 
        error: '처리 중 오류가 발생했습니다',
        message: error.message 
      };
    }
  }

  // 사용자 크레딧 확인
  async getUserCredit() {
    try {
      const tokenResult = await this.getToken();
      if (!tokenResult.success) {
        return null;
      }

      // 직접 AKOOL API 호출 (Netlify Function 우회)
      const response = await fetch('https://openapi.akool.com/api/open/v3/faceswap/quota/info', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.code === 1000) {
        return data.data.credit;
      } else {
        console.error('크레딧 확인 실패:', data.msg);
        return null;
      }
    } catch (error) {
      console.error('크레딧 확인 오류:', error);
      return null;
    }
  }
}

// 전역으로 사용할 수 있도록 내보내기
window.AkoolAPI = AkoolAPI;
