// akool/js/akool-api.js
// AKOOL Face Swap API 클라이언트

class AkoolAPI {
  constructor() {
    this.token = null;
    this.baseURL = '/.netlify/functions';
  }

  // 토큰 발급
  async getToken() {
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
        console.log('✅ 토큰 발급 성공');
        return { success: true, token: this.token };
      } else {
        console.error('❌ 토큰 발급 실패:', data.message);
        return { success: false, error: data.message };
      }

    } catch (error) {
      console.error('❌ 토큰 발급 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // 이미지 압축
  compressImage(file, maxSize = 1024 * 1024) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const maxWidth = 1024;
        const maxHeight = 1024;
        
        let { width, height } = img;

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

        let quality = 0.9;
        let result = canvas.toDataURL('image/jpeg', quality);

        while (result.length > maxSize && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }

        console.log(`🖼️ 이미지 압축 완료: ${Math.round(result.length / 1024)}KB (품질: ${Math.round(quality * 100)}%)`);
        resolve(result);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // 얼굴 감지
  async detectFace(imageData, type = 'user') {
    try {
      if (!this.token) {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) {
          return tokenResult;
        }
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
        console.error(`❌ ${type === 'user' ? '사용자' : '헤어스타일'} 얼굴 감지 실패:`, data.message);
        return { success: false, error: data.message || '얼굴을 감지할 수 없습니다' };
      }

    } catch (error) {
      console.error('❌ 얼굴 감지 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // Face Swap 실행
  async performFaceSwap(userImage, hairstyleImage, userLandmarks, hairstyleLandmarks) {
    try {
      if (!this.token) {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) {
          return tokenResult;
        }
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
          url: data.url
        };
      } else {
        console.error('❌ Face Swap 실패:', data.message);
        return { success: false, error: data.message || 'Face Swap에 실패했습니다' };
      }

    } catch (error) {
      console.error('❌ Face Swap 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // 결과 상태 확인
  async checkStatus(resultId) {
    try {
      if (!this.token) {
        const tokenResult = await this.getToken();
        if (!tokenResult.success) {
          return tokenResult;
        }
      }

      const response = await fetch(`${this.baseURL}/akool-status?token=${encodeURIComponent(this.token)}&resultId=${encodeURIComponent(resultId)}`, {
        method: 'GET'
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          status: data.status,
          statusText: data.statusText,
          isComplete: data.isComplete,
          progress: data.progress,
          resultUrl: data.resultUrl
        };
      } else {
        console.error('❌ 상태 확인 실패:', data.message);
        return { success: false, error: data.message || '상태 확인에 실패했습니다' };
      }

    } catch (error) {
      console.error('❌ 상태 확인 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // 결과 대기
  async waitForResult(resultId, maxWaitTime = 120000) {
    const startTime = Date.now();
    const pollInterval = 3000;

    return new Promise((resolve) => {
      const checkResult = async () => {
        const elapsed = Date.now() - startTime;

        if (elapsed > maxWaitTime) {
          console.log('⏰ 처리 시간 초과');
          resolve({ success: false, error: '처리 시간이 초과되었습니다' });
          return;
        }

        const status = await this.checkStatus(resultId);

        if (!status.success) {
          resolve(status);
          return;
        }

        console.log(`📊 처리 상태: ${status.statusText} (${status.progress}%)`);

        if (status.isComplete) {
          if (status.status === 3 && status.resultUrl) {
            console.log('🎉 Face Swap 완료!');
            resolve({
              success: true,
              resultUrl: status.resultUrl,
              message: '처리가 완료되었습니다'
            });
          } else {
            console.log('💥 Face Swap 실패');
            resolve({
              success: false,
              error: '처리 중 오류가 발생했습니다'
            });
          }
        } else {
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

      if (progressCallback) progressCallback(10, '이미지 압축 중...');
      const userImageData = await this.compressImage(userFile);

      if (progressCallback) progressCallback(20, '얼굴 분석 중...');
      const userDetectResult = await this.detectFace(userImageData, 'user');
      if (!userDetectResult.success) {
        return { success: false, error: userDetectResult.error };
      }

      if (progressCallback) progressCallback(35, '헤어스타일 분석 중...');
      const hairstyleDetectResult = await this.detectFace(hairstyleImageUrl, 'hairstyle');
      if (!hairstyleDetectResult.success) {
        return { success: false, error: hairstyleDetectResult.error };
      }

      if (progressCallback) progressCallback(50, 'AI 처리 중...');
      const faceswapResult = await this.performFaceSwap(
        userImageData,
        hairstyleImageUrl,
        userDetectResult.landmarks,
        hairstyleDetectResult.landmarks
      );

      if (!faceswapResult.success) {
        return { success: false, error: faceswapResult.error };
      }

      if (progressCallback) progressCallback(65, '최종 처리 중...');
      
      const finalResult = await this.waitForResult(faceswapResult.resultId);

      if (finalResult.success) {
        if (progressCallback) progressCallback(100, '완료!');
        return {
          success: true,
          resultUrl: finalResult.resultUrl,
          message: '처리가 완료되었습니다!'
        };
      } else {
        return finalResult;
      }

    } catch (error) {
      console.error('❌ Face Swap 워크플로우 오류:', error);
      return { success: false, error: '처리 중 오류가 발생했습니다' };
    }
  }
}

// 전역으로 사용할 수 있도록 내보내기
window.AkoolAPI = AkoolAPI;
