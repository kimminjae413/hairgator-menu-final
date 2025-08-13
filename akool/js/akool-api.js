// akool/js/akool-api.js
// AKOOL Face Swap API 클라이언트 - 최종 완성 버전

class AkoolAPI {
  constructor() {
    this.token = null;
    this.tokenExpiration = null;
    this.baseURL = '/.netlify/functions';
    this.akoolBaseUrl = 'https://openapi.akool.com/api/open/v3';
    this.detectUrl = 'https://sg3.akool.com/detect';
  }

  // ===========================================
  // 1. 토큰 관리
  // ===========================================

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
        // 토큰 만료시간 설정 (24시간)
        this.tokenExpiration = Date.now() + (24 * 60 * 60 * 1000);
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

  // ===========================================
  // 2. 이미지 처리 및 업로드
  // ===========================================

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

      if (file instanceof File) {
        img.src = URL.createObjectURL(file);
      } else {
        img.src = file; // Base64 or URL
      }
    });
  }

  // Firebase Storage에 임시 이미지 업로드
  async uploadTempImage(imageData, filename = null) {
    try {
      if (!filename) {
        filename = `temp/faceswap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      }

      // Base64를 Blob으로 변환
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Firebase Storage에 업로드
      const storageRef = firebase.storage().ref();
      const fileRef = storageRef.child(filename);
      
      console.log('📤 Firebase에 이미지 업로드:', filename);
      const snapshot = await fileRef.put(blob);
      
      // 공개 URL 반환
      const downloadURL = await snapshot.ref.getDownloadURL();
      console.log('✅ 업로드 완료:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ 업로드 실패:', error);
      throw new Error('이미지 업로드 실패: ' + error.message);
    }
  }

  // ===========================================
  // 3. AKOOL API 직접 호출 (수정된 방식)
  // ===========================================

  // 얼굴 감지 - AKOOL detect API 직접 호출
  async detectFace(imageUrl, type = 'user') {
    try {
      const tokenResult = await this.getToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      console.log(`🔍 ${type === 'user' ? '사용자' : '헤어스타일'} 얼굴 감지 중...`);

      // AKOOL detect API 직접 호출
      const response = await fetch(this.detectUrl, {
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
      console.log('Face detection response:', data);

      if (data.code === 1000 && data.data && data.data.length > 0) {
        const faceData = data.data[0];
        console.log(`✅ ${type === 'user' ? '사용자' : '헤어스타일'} 얼굴 감지 성공`);
        
        return { 
          success: true, 
          cropUrl: faceData.crop_image_url,
          landmarks: faceData.landmarks_str,
          boundingBox: faceData.bounding_box
        };
      } else {
        console.error(`❌ ${type === 'user' ? '사용자' : '헤어스타일'} 얼굴 감지 실패:`, data);
        return { 
          success: false, 
          error: data.msg || '얼굴을 감지할 수 없습니다',
          message: '사진에서 명확한 얼굴을 찾을 수 없습니다. 정면을 보고 있는 선명한 사진을 사용해주세요.'
        };
      }

    } catch (error) {
      console.error('❌ 얼굴 감지 네트워크 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // Face Swap 요청 - AKOOL highquality API 직접 호출
  async createFaceSwap(userFaceData, styleFaceData) {
    try {
      const tokenResult = await this.getToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      console.log('🔄 Face Swap 요청 생성 중...');

      // AKOOL API 규격에 맞는 정확한 페이로드
      const payload = {
        sourceImage: [{ // 바꿀 대상 (사용자 얼굴)
          path: userFaceData.cropUrl,
          opts: userFaceData.landmarks
        }],
        targetImage: [{ // 원본 이미지 (헤어스타일)
          path: styleFaceData.cropUrl,
          opts: styleFaceData.landmarks
        }],
        face_enhance: 1
      };

      console.log('Face swap payload:', JSON.stringify(payload, null, 2));

      // AKOOL Face Swap API 직접 호출
      const response = await fetch(`${this.akoolBaseUrl}/faceswap/highquality/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Face swap creation response:', data);

      if (data.code === 1000 && data._id) {
        console.log('✅ Face Swap 작업 생성 성공');
        return {
          success: true,
          taskId: data._id,
          message: 'Face swap 작업이 생성되었습니다'
        };
      } else {
        console.error('❌ Face Swap 작업 생성 실패:', data);
        return { 
          success: false, 
          error: data.msg || 'Face Swap 작업 생성에 실패했습니다',
          code: data.code
        };
      }

    } catch (error) {
      console.error('❌ Face Swap 생성 네트워크 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // Face Swap 상태 확인 - AKOOL API 직접 호출
  async checkFaceSwapStatus(taskId) {
    try {
      const tokenResult = await this.getToken();
      if (!tokenResult.success) {
        return tokenResult;
      }

      const response = await fetch(`${this.akoolBaseUrl}/faceswap/highquality/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Status check response:', data);

      if (response.ok) {
        return {
          success: true,
          status: data.status,
          progress: data.progress || 0,
          resultUrl: data.result_url,
          isComplete: data.status === 'completed' || data.status === 'failed',
          message: data.message || this.getStatusMessage(data.status)
        };
      } else {
        return { 
          success: false, 
          error: data.msg || '상태 확인에 실패했습니다' 
        };
      }

    } catch (error) {
      console.error('❌ 상태 확인 네트워크 오류:', error);
      return { success: false, error: '네트워크 오류가 발생했습니다' };
    }
  }

  // 상태 메시지 변환
  getStatusMessage(status) {
    const statusMessages = {
      'pending': '대기 중...',
      'processing': '처리 중...',
      'completed': '완료됨',
      'failed': '실패함'
    };
    return statusMessages[status] || status;
  }

  // ===========================================
  // 4. 결과 대기 및 폴링
  // ===========================================

  // 결과 대기 - 폴링 방식으로 완료까지 대기
  async waitForResult(taskId, progressCallback, maxWaitTime = 180000) { // 3분 최대 대기
    const startTime = Date.now();
    const pollInterval = 3000; // 3초마다 확인
    let lastProgress = 0;

    return new Promise((resolve) => {
      const checkResult = async () => {
        const elapsed = Date.now() - startTime;

        if (elapsed > maxWaitTime) {
          console.log('⏰ 처리 시간 초과');
          resolve({ 
            success: false, 
            error: '처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' 
          });
          return;
        }

        const status = await this.checkFaceSwapStatus(taskId);

        if (!status.success) {
          resolve(status);
          return;
        }

        // 진행률 업데이트 (진행률이 변경된 경우에만)
        if (progressCallback && status.progress !== lastProgress) {
          lastProgress = status.progress;
          progressCallback(Math.max(status.progress, 45), status.message);
        }

        console.log(`📊 처리 상태: ${status.message} (${status.progress}%)`);

        if (status.isComplete) {
          if (status.status === 'completed' && status.resultUrl) {
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

  // ===========================================
  // 5. 메인 워크플로우
  // ===========================================

  // 완전한 Face Swap 워크플로우
  async processFaceSwap(userFile, hairstyleImageUrl, progressCallback) {
    try {
      if (progressCallback) progressCallback(0, '처리 시작...');

      // 1. 이미지 압축 및 준비
      if (progressCallback) progressCallback(5, '이미지 최적화 중...');
      
      let userImageData;
      if (userFile instanceof File) {
        userImageData = await this.compressImage(userFile);
      } else {
        userImageData = userFile; // 이미 Base64인 경우
      }
      
      if (!userImageData) {
        return { success: false, error: '이미지 처리에 실패했습니다' };
      }

      // 2. 이미지들을 Firebase Storage에 업로드
      if (progressCallback) progressCallback(10, '이미지 업로드 중...');
      
      const userImageUrl = await this.uploadTempImage(userImageData, `temp/user_${Date.now()}.jpg`);
      
      // 헤어스타일 이미지도 필요시 업로드 (Firebase URL이 아닌 경우)
      let styleImageUrl = hairstyleImageUrl;
      if (!hairstyleImageUrl.includes('firebasestorage.googleapis.com')) {
        // 외부 URL인 경우 Firebase로 복사
        const styleResponse = await fetch(hairstyleImageUrl);
        const styleBlob = await styleResponse.blob();
        const styleCanvas = document.createElement('canvas');
        const styleCtx = styleCanvas.getContext('2d');
        const styleImg = new Image();
        
        await new Promise((resolve) => {
          styleImg.onload = () => {
            styleCanvas.width = styleImg.width;
            styleCanvas.height = styleImg.height;
            styleCtx.drawImage(styleImg, 0, 0);
            resolve();
          };
          styleImg.src = URL.createObjectURL(styleBlob);
        });
        
        const styleBase64 = styleCanvas.toDataURL('image/jpeg', 0.9);
        styleImageUrl = await this.uploadTempImage(styleBase64, `temp/style_${Date.now()}.jpg`);
      }

      // 3. 사용자 얼굴 감지
      if (progressCallback) progressCallback(20, '사용자 얼굴 분석 중...');
      const userDetectResult = await this.detectFace(userImageUrl, 'user');
      if (!userDetectResult.success) {
        return { 
          success: false, 
          error: userDetectResult.error,
          message: userDetectResult.message || '사용자 얼굴을 인식할 수 없습니다'
        };
      }

      // 4. 헤어스타일 이미지 얼굴 감지
      if (progressCallback) progressCallback(30, '헤어스타일 분석 중...');
      const hairstyleDetectResult = await this.detectFace(styleImageUrl, 'hairstyle');
      if (!hairstyleDetectResult.success) {
        return { 
          success: false, 
          error: hairstyleDetectResult.error,
          message: hairstyleDetectResult.message || '헤어스타일 이미지를 분석할 수 없습니다'
        };
      }

      // 5. Face Swap 요청
      if (progressCallback) progressCallback(40, 'AI 처리 요청 중...');
      const faceswapResult = await this.createFaceSwap(userDetectResult, hairstyleDetectResult);

      if (!faceswapResult.success) {
        return { 
          success: false, 
          error: faceswapResult.error,
          message: faceswapResult.message || 'Face swap 요청에 실패했습니다'
        };
      }

      // 6. 결과 대기
      if (progressCallback) progressCallback(45, '처리 대기 중...');
      
      const finalResult = await this.waitForResult(faceswapResult.taskId, progressCallback);

      if (finalResult.success) {
        if (progressCallback) progressCallback(100, '완료!');
        
        // 임시 파일 정리 (백그라운드에서)
        this.cleanupTempFiles().catch(err => console.warn('정리 경고:', err));
        
        return {
          success: true,
          resultUrl: finalResult.resultUrl,
          message: finalResult.message || '🎉 헤어스타일 적용이 완료되었습니다!',
          method: 'akool'
        };
      } else {
        return finalResult;
      }

    } catch (error) {
      console.error('❌ Face Swap 워크플로우 오류:', error);
      
      // 폴백: Canvas 시뮬레이션
      console.log('📝 Canvas 시뮬레이션으로 폴백...');
      if (window.advancedCanvasSimulation) {
        const userImageData = userFile instanceof File ? 
          await this.compressImage(userFile) : userFile;
        return await window.advancedCanvasSimulation(userImageData, hairstyleImageUrl);
      }
      
      return { 
        success: false, 
        error: '처리 중 오류가 발생했습니다',
        message: error.message 
      };
    }
  }

  // ===========================================
  // 6. 유틸리티 함수들
  // ===========================================

  // 임시 파일 정리
  async cleanupTempFiles() {
    try {
      const storageRef = firebase.storage().ref();
      const tempRef = storageRef.child('temp');
      
      // 1시간 이전 파일들 삭제
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      const listResult = await tempRef.listAll();
      
      let deletedCount = 0;
      for (const item of listResult.items) {
        try {
          const metadata = await item.getMetadata();
          const createdTime = new Date(metadata.timeCreated).getTime();
          
          if (createdTime < oneHourAgo) {
            await item.delete();
            deletedCount++;
          }
        } catch (err) {
          console.warn('항목 삭제 실패:', item.name, err);
        }
      }
      
      if (deletedCount > 0) {
        console.log(`🧹 ${deletedCount}개 임시 파일 정리 완료`);
      }
    } catch (error) {
      console.warn('🧹 정리 경고:', error);
    }
  }

  // 사용자 크레딧 확인
  async getUserCredit() {
    try {
      const tokenResult = await this.getToken();
      if (!tokenResult.success) {
        return null;
      }

      const response = await fetch(`${this.akoolBaseUrl}/faceswap/quota/info`, {
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

  // API 상태 확인 (헬스체크)
  async healthCheck() {
    try {
      const tokenResult = await this.getToken();
      const credit = await this.getUserCredit();
      
      return {
        success: tokenResult.success,
        token: !!this.token,
        credit: credit,
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

// ===========================================
// 7. 전역 인스턴스 및 호환성 함수
// ===========================================

// 전역으로 사용할 수 있도록 내보내기
window.AkoolAPI = AkoolAPI;

// 전역 인스턴스 생성
window.akoolAPI = new AkoolAPI();

// 기존 함수와의 호환성을 위한 래퍼
window.performFaceSwap = async function(userImageData, styleImageData, progressCallback) {
  try {
    // userImageData가 File 객체인지 Base64인지 확인
    let userFile = userImageData;
    if (typeof userImageData === 'string' && userImageData.startsWith('data:image/')) {
      // Base64인 경우 Blob으로 변환
      const response = await fetch(userImageData);
      const blob = await response.blob();
      userFile = new File([blob], 'user_image.jpg', { type: 'image/jpeg' });
    }
    
    return await window.akoolAPI.processFaceSwap(userFile, styleImageData, progressCallback);
  } catch (error) {
    console.error('Face swap wrapper error:', error);
    
    // 최종 폴백
    if (window.advancedCanvasSimulation) {
      return await window.advancedCanvasSimulation(userImageData, styleImageData);
    }
    
    return {
      success: false,
      error: 'Face swap failed',
      message: error.message
    };
  }
};

// 페이지 로드시 헬스체크 및 정리
document.addEventListener('DOMContentLoaded', function() {
  // 5초 후 헬스체크 실행
  setTimeout(async () => {
    try {
      const health = await window.akoolAPI.healthCheck();
      console.log('🏥 AKOOL API 상태:', health);
      
      if (health.success) {
        console.log('✅ AKOOL API 준비 완료');
        if (health.credit !== null) {
          console.log(`💳 사용 가능 크레딧: ${health.credit}`);
        }
      } else {
        console.warn('⚠️ AKOOL API 문제 감지:', health.error);
      }
    } catch (error) {
      console.warn('⚠️ 헬스체크 실패:', error);
    }
    
    // 임시 파일 정리
    window.akoolAPI.cleanupTempFiles().catch(err => 
      console.warn('정리 경고:', err)
    );
  }, 5000);
});

console.log('🚀 AKOOL API 클라이언트 로드 완료');
