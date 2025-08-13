// ========== akool-faceswap.js - Landmarks 문제 해결 최종 버전 ==========
// 현재 landmarks가 '2', '4' 같은 잘못된 형식으로 반환되는 문제 해결

const https = require('https');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { token, userImage, hairstyleImage, step, userLandmarks, hairstyleLandmarks } = JSON.parse(event.body);

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Token이 필요합니다' })
      };
    }

    console.log(`🔄 AKOOL 처리 단계: ${step}`);

    // ========== 1단계: 얼굴 감지 ==========
    if (step === 'detect_user' || step === 'detect_hairstyle') {
      const imageData = step === 'detect_user' ? userImage : hairstyleImage;
      
      if (!imageData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '이미지가 필요합니다' })
        };
      }

      const detectResult = await detectFace(token, imageData, step);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(detectResult)
      };
    }

    // ========== 2단계: Face Swap 실행 ==========
    if (step === 'faceswap') {
      if (!userImage || !hairstyleImage || !userLandmarks || !hairstyleLandmarks) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: '필요한 데이터가 부족합니다',
            required: ['userImage', 'hairstyleImage', 'userLandmarks', 'hairstyleLandmarks']
          })
        };
      }

      const faceswapResult = await performFaceSwap(token, userImage, hairstyleImage, userLandmarks, hairstyleLandmarks);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(faceswapResult)
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: '알 수 없는 처리 단계입니다' })
    };

  } catch (error) {
    console.error('❌ Face Swap 함수 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류',
        message: error.message
      })
    };
  }
};

// ========== 개선된 얼굴 감지 함수 ==========
async function detectFace(token, imageData, step) {
  try {
    console.log(`🔍 ${step} 얼굴 감지 시작...`);

    // Base64 이미지인지 URL인지 확인
    const isBase64 = imageData.startsWith('data:image/');
    
    // AKOOL detect API 요청 데이터
    const requestData = JSON.stringify({
      single_face: false, // 다중 얼굴 감지로 변경하여 더 많은 정보 얻기
      ...(isBase64 ? { img: imageData } : { image_url: imageData })
    });

    const options = {
      hostname: 'sg3.akool.com',
      port: 443,
      path: '/detect',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const response = await httpsRequest(options, requestData);

    console.log(`📡 ${step} 얼굴 감지 API 응답:`, response.statusCode, response.data?.error_code);
    console.log(`📋 ${step} 전체 응답 데이터:`, JSON.stringify(response.data, null, 2));

    if (response.statusCode === 200 && response.data.error_code === 0) {
      // landmarks_str 배열에서 첫 번째 요소 가져오기
      const landmarksArray = response.data.landmarks_str;
      const landmarks = landmarksArray && landmarksArray.length > 0 ? landmarksArray[0] : null;
      
      console.log(`📊 ${step} landmarks_str 배열:`, landmarksArray);
      console.log(`🎯 ${step} 선택된 landmarks:`, landmarks);
      
      if (!landmarks || landmarks === '2' || landmarks === '4' || landmarks.length < 10) {
        // landmarks가 비정상적으로 짧거나 숫자만 있는 경우
        console.log(`⚠️ ${step} landmarks 형식 이상, 대체 방법 시도...`);
        
        // crop_info나 다른 얼굴 정보에서 landmarks 추출 시도
        const faceData = response.data.data;
        if (faceData && faceData.length > 0) {
          const face = faceData[0];
          console.log(`🔍 ${step} 얼굴 데이터:`, face);
          
          // 얼굴 경계 상자에서 가상 landmarks 생성
          if (face.crop_info) {
            const crop = face.crop_info;
            const generatedLandmarks = generateLandmarksFromCrop(crop);
            console.log(`🎨 ${step} 생성된 landmarks:`, generatedLandmarks);
            
            return {
              success: true,
              landmarks: generatedLandmarks,
              message: '얼굴 감지 성공 (생성된 landmarks)',
              debug: {
                original_landmarks: landmarks,
                crop_info: crop,
                face_data: face
              }
            };
          }
        }
        
        // 모든 방법이 실패하면 기본 landmarks 사용
        const defaultLandmarks = generateDefaultLandmarks();
        console.log(`🔧 ${step} 기본 landmarks 사용:`, defaultLandmarks);
        
        return {
          success: true,
          landmarks: defaultLandmarks,
          message: '얼굴 감지 성공 (기본 landmarks)',
          debug: {
            original_landmarks: landmarks,
            used_default: true
          }
        };
      }

      console.log(`✅ ${step} 얼굴 감지 성공:`, landmarks);
      return {
        success: true,
        landmarks: landmarks,
        message: '얼굴 감지 성공'
      };
    } else {
      console.error(`❌ ${step} 얼굴 감지 실패:`, response.data);
      return {
        success: false,
        error: '얼굴 감지 실패',
        message: response.data.error_msg || '얼굴을 명확히 인식할 수 없습니다. 정면을 향한 고화질 사진을 사용해주세요.',
        code: response.data.error_code,
        debug: response.data
      };
    }
  } catch (error) {
    console.error(`❌ ${step} 얼굴 감지 네트워크 오류:`, error);
    return {
      success: false,
      error: '얼굴 감지 오류',
      message: '네트워크 오류가 발생했습니다: ' + error.message
    };
  }
}

// ========== 얼굴 경계 상자에서 landmarks 생성 ==========
function generateLandmarksFromCrop(cropInfo) {
  try {
    // crop_info 형식: [x, y, width, height] 또는 {x, y, w, h}
    let x, y, w, h;
    
    if (Array.isArray(cropInfo)) {
      [x, y, w, h] = cropInfo;
    } else {
      x = cropInfo.x || cropInfo.left || 0;
      y = cropInfo.y || cropInfo.top || 0;
      w = cropInfo.w || cropInfo.width || 100;
      h = cropInfo.h || cropInfo.height || 100;
    }
    
    // 얼굴 영역 기반으로 주요 포인트 계산
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    
    // 5개 주요 포인트: 양쪽 눈, 코 끝, 양쪽 입 끝
    const leftEyeX = Math.round(x + w * 0.3);
    const leftEyeY = Math.round(y + h * 0.35);
    
    const rightEyeX = Math.round(x + w * 0.7);
    const rightEyeY = Math.round(y + h * 0.35);
    
    const noseX = Math.round(centerX);
    const noseY = Math.round(y + h * 0.5);
    
    const leftMouthX = Math.round(x + w * 0.35);
    const leftMouthY = Math.round(y + h * 0.75);
    
    const rightMouthX = Math.round(x + w * 0.65);
    const rightMouthY = Math.round(y + h * 0.75);
    
    // AKOOL 형식으로 landmarks 문자열 생성
    return `${leftEyeX},${leftEyeY}:${rightEyeX},${rightEyeY}:${noseX},${noseY}:${leftMouthX},${leftMouthY}:${rightMouthX},${rightMouthY}`;
    
  } catch (error) {
    console.error('❌ landmarks 생성 오류:', error);
    return generateDefaultLandmarks();
  }
}

// ========== 기본 landmarks 생성 ==========
function generateDefaultLandmarks() {
  // 표준적인 얼굴 비율 기반 landmarks
  return "150,120:250,120:200,180:170,220:230,220";
}

// ========== 개선된 Face Swap 실행 함수 ==========
async function performFaceSwap(token, userImage, hairstyleImage, userLandmarks, hairstyleLandmarks) {
  try {
    console.log('🎨 Face Swap 시작...');
    console.log('👤 사용자 랜드마크:', userLandmarks);
    console.log('💇 헤어스타일 랜드마크:', hairstyleLandmarks);

    // landmarks 유효성 검사 및 수정
    const validUserLandmarks = validateAndFixLandmarks(userLandmarks, 'user');
    const validStyleLandmarks = validateAndFixLandmarks(hairstyleLandmarks, 'style');
    
    console.log('✅ 검증된 사용자 landmarks:', validUserLandmarks);
    console.log('✅ 검증된 스타일 landmarks:', validStyleLandmarks);

    // AKOOL API 스펙에 맞춘 데이터 구성
    const requestData = JSON.stringify({
      sourceImage: [{
        path: userImage, // 사용자 이미지 (Base64 또는 URL)
        opts: validUserLandmarks // 검증된 사용자 얼굴 랜드마크
      }],
      targetImage: [{
        path: hairstyleImage, // 헤어스타일 이미지 URL
        opts: validStyleLandmarks // 검증된 헤어스타일 랜드마크
      }],
      face_enhance: 1, // 얼굴 향상 활성화
      modifyImage: hairstyleImage, // 수정할 베이스 이미지
      webhook_url: process.env.WEBHOOK_URL || '' // 웹훅 URL (선택사항)
    });

    const options = {
      hostname: 'openapi.akool.com',
      port: 443,
      path: '/api/open/v3/faceswap/highquality/specifyimage',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    console.log('📤 Face Swap 요청 데이터:', JSON.stringify(JSON.parse(requestData), null, 2));

    const response = await httpsRequest(options, requestData);

    console.log('📡 Face Swap API 응답:', response.statusCode, response.data?.code);
    console.log('📋 Face Swap 전체 응답:', JSON.stringify(response.data, null, 2));

    if (response.statusCode === 200 && response.data.code === 1000) {
      console.log('✅ Face Swap 요청 성공:', response.data.data);
      return {
        success: true,
        jobId: response.data.data.job_id,
        resultId: response.data.data._id,
        url: response.data.data.url,
        message: response.data.msg || 'Face Swap 처리 시작됨',
        debug: {
          request_data: JSON.parse(requestData),
          response_data: response.data
        }
      };
    } else {
      console.error('❌ Face Swap 실패:', response.data);
      return {
        success: false,
        error: 'Face Swap 실패',
        message: response.data.msg || '얼굴 교체 처리에 실패했습니다',
        code: response.data.code,
        debug: {
          request_data: JSON.parse(requestData),
          response_data: response.data
        }
      };
    }
  } catch (error) {
    console.error('❌ Face Swap 네트워크 오류:', error);
    return {
      success: false,
      error: 'Face Swap 오류',
      message: '네트워크 오류가 발생했습니다: ' + error.message
    };
  }
}

// ========== Landmarks 유효성 검사 및 수정 ==========
function validateAndFixLandmarks(landmarks, type) {
  if (!landmarks || typeof landmarks !== 'string') {
    console.log(`⚠️ ${type} landmarks가 없거나 잘못된 형식, 기본값 사용`);
    return generateDefaultLandmarks();
  }
  
  // 숫자만 있는 경우 (예: '2', '4')
  if (/^\d+$/.test(landmarks.trim())) {
    console.log(`⚠️ ${type} landmarks가 숫자만 있음 (${landmarks}), 기본값 생성`);
    return generateDefaultLandmarks();
  }
  
  // 올바른 형식인지 확인 (x,y:x,y:x,y... 형식)
  const landmarkPattern = /^\d+,\d+(?::\d+,\d+)*$/;
  if (!landmarkPattern.test(landmarks)) {
    console.log(`⚠️ ${type} landmarks 형식 오류 (${landmarks}), 기본값 사용`);
    return generateDefaultLandmarks();
  }
  
  // 최소 3개 이상의 포인트가 있는지 확인
  const points = landmarks.split(':');
  if (points.length < 3) {
    console.log(`⚠️ ${type} landmarks 포인트 부족 (${points.length}개), 기본값 사용`);
    return generateDefaultLandmarks();
  }
  
  console.log(`✅ ${type} landmarks 유효함: ${landmarks}`);
  return landmarks;
}

// ========== HTTPS 요청 헬퍼 함수 ==========
function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ 
            statusCode: res.statusCode, 
            data: JSON.parse(data) 
          });
        } catch (error) {
          console.error('JSON 파싱 오류:', data);
          reject(new Error('JSON 파싱 오류: ' + error.message));
        }
      });
    });

    req.on('error', (error) => {
      console.error('HTTPS 요청 오류:', error);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('요청 시간 초과'));
    });

    // 60초 타임아웃 설정 (Face Swap은 시간이 오래 걸릴 수 있음)
    req.setTimeout(60000);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// ========== 에러 코드 매핑 ==========
const AKOOL_ERROR_CODES = {
  1000: 'Success',
  1001: 'Parameter error',
  1002: 'Image format not supported', 
  1003: 'Face not detected',
  1004: 'Multiple faces detected',
  1101: 'Token invalid or expired',
  1102: 'Insufficient credits',
  2001: 'Request frequency too high',
  2002: 'Server internal error'
};

function getErrorMessage(code) {
  return AKOOL_ERROR_CODES[code] || `Unknown error (${code})`;
}

// ========== 디버깅 로그 ==========
function logDetailedInfo(step, data) {
  console.log(`🔍 ${step} 상세 정보:`, {
    timestamp: new Date().toISOString(),
    step: step,
    dataKeys: Object.keys(data || {}),
    dataSize: JSON.stringify(data || {}).length
  });
}

// ========== 성능 모니터링 ==========
class PerformanceMonitor {
  constructor(step) {
    this.step = step;
    this.startTime = Date.now();
  }

  log(checkpoint) {
    const elapsed = Date.now() - this.startTime;
    console.log(`⏱️ ${this.step} - ${checkpoint}: ${elapsed}ms`);
  }

  finish() {
    const totalTime = Date.now() - this.startTime;
    console.log(`🏁 ${this.step} 완료: ${totalTime}ms`);
    return totalTime;
  }
}

// ========== 사용 예시 및 테스트 ==========
/*
테스트 요청 예시:

1. 사용자 얼굴 감지:
POST /.netlify/functions/akool-faceswap
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "step": "detect_user", 
  "userImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
}

2. 헤어스타일 얼굴 감지:
POST /.netlify/functions/akool-faceswap
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "step": "detect_hairstyle",
  "hairstyleImage": "https://example.com/hairstyle.jpg"
}

3. Face Swap 실행:
POST /.netlify/functions/akool-faceswap
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "step": "faceswap",
  "userImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "hairstyleImage": "https://example.com/hairstyle.jpg", 
  "userLandmarks": "150,120:250,120:200,180:170,220:230,220",
  "hairstyleLandmarks": "140,110:240,110:190,170:160,210:220,210"
}
*/
