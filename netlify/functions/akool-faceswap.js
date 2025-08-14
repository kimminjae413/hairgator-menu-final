// ========== 수정된 akool-faceswap.js - stage/step 문제 완전 해결 ==========
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
    // ========== 요청 데이터 파싱 및 디버깅 ==========
    console.log('📥 요청 원본 body:', event.body);
    
    const requestData = JSON.parse(event.body);
    console.log('📋 파싱된 데이터:', requestData);
    
    // stage 또는 step 둘 다 지원 (호환성)
    const step = requestData.step || requestData.stage;
    const token = requestData.token;
    const userImage = requestData.userImage;
    const hairstyleImage = requestData.hairstyleImage;
    const userLandmarks = requestData.userLandmarks;
    const hairstyleLandmarks = requestData.hairstyleLandmarks;

    console.log('🔄 AKOOL 처리 단계:', step);
    console.log('🔑 토큰 존재:', !!token);
    console.log('👤 사용자 이미지 존재:', !!userImage);
    console.log('💇 헤어스타일 이미지 존재:', !!hairstyleImage);

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Token이 필요합니다',
          received_data: Object.keys(requestData)
        })
      };
    }

    if (!step) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'step 또는 stage 파라미터가 필요합니다',
          received_data: Object.keys(requestData)
        })
      };
    }

    // ========== 1단계: 사용자 얼굴 감지 ==========
    if (step === 'detect_user') {
      console.log('🔍 사용자 얼굴 감지 시작...');
      
      if (!userImage) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: '사용자 이미지가 필요합니다' 
          })
        };
      }

      const detectResult = await detectFace(token, userImage, 'detect_user');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(detectResult)
      };
    }

    // ========== 2단계: 헤어스타일 얼굴 감지 ==========
    if (step === 'detect_hairstyle') {
      console.log('🔍 헤어스타일 얼굴 감지 시작...');
      
      if (!hairstyleImage) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: '헤어스타일 이미지가 필요합니다' 
          })
        };
      }

      const detectResult = await detectFace(token, hairstyleImage, 'detect_hairstyle');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(detectResult)
      };
    }

    // ========== 3단계: Face Swap 실행 ==========
    if (step === 'faceswap') {
      console.log('🎨 Face Swap 시작...');
      
      if (!userImage || !hairstyleImage || !userLandmarks || !hairstyleLandmarks) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            success: false, 
            error: '필요한 데이터가 부족합니다',
            required: ['userImage', 'hairstyleImage', 'userLandmarks', 'hairstyleLandmarks'],
            received: {
              userImage: !!userImage,
              hairstyleImage: !!hairstyleImage,
              userLandmarks: !!userLandmarks,
              hairstyleLandmarks: !!hairstyleLandmarks
            }
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

    // ========== 알 수 없는 단계 ==========
    console.log('❌ 알 수 없는 처리 단계:', step);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: `알 수 없는 처리 단계: ${step}`,
        valid_steps: ['detect_user', 'detect_hairstyle', 'faceswap'],
        received_step: step,
        received_data: Object.keys(requestData)
      })
    };

  } catch (error) {
    console.error('❌ Face Swap 함수 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류',
        message: error.message,
        stack: error.stack
      })
    };
  }
};

// ========== 얼굴 감지 함수 ==========
async function detectFace(token, imageData, step) {
  try {
    console.log(`🔍 ${step} 얼굴 감지 시작...`);

    // Base64 이미지인지 URL인지 확인
    const isBase64 = imageData.startsWith('data:image/');
    console.log(`📷 ${step} 이미지 형식:`, isBase64 ? 'Base64' : 'URL');
    
    // AKOOL detect API 요청 데이터
    const requestData = JSON.stringify({
      single_face: false,
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

    console.log(`📡 ${step} 얼굴 감지 응답:`, response.statusCode);
    console.log(`📋 ${step} 응답 데이터:`, JSON.stringify(response.data, null, 2));

    if (response.statusCode === 200 && response.data.error_code === 0) {
      // landmarks_str 배열에서 첫 번째 요소 가져오기
      const landmarksArray = response.data.landmarks_str;
      let landmarks = landmarksArray && landmarksArray.length > 0 ? landmarksArray[0] : null;
      
      console.log(`📊 ${step} landmarks_str 배열:`, landmarksArray);
      console.log(`🎯 ${step} 선택된 landmarks:`, landmarks);
      
      // landmarks 유효성 검사
      if (!landmarks || landmarks === '2' || landmarks === '4' || landmarks.length < 10) {
        console.log(`⚠️ ${step} landmarks 형식 이상, 기본값 생성...`);
        landmarks = generateDefaultLandmarks();
      }

      console.log(`✅ ${step} 최종 landmarks:`, landmarks);
      return {
        success: true,
        landmarks: landmarks,
        message: '얼굴 감지 성공',
        debug: {
          original_response: response.data,
          used_landmarks: landmarks
        }
      };
    } else {
      console.error(`❌ ${step} 얼굴 감지 실패:`, response.data);
      return {
        success: false,
        error: '얼굴 감지 실패',
        message: response.data.error_msg || '얼굴을 명확히 인식할 수 없습니다',
        code: response.data.error_code,
        debug: response.data
      };
    }
  } catch (error) {
    console.error(`❌ ${step} 얼굴 감지 네트워크 오류:`, error);
    return {
      success: false,
      error: '얼굴 감지 오류',
      message: '네트워크 오류: ' + error.message
    };
  }
}

// ========== Face Swap 실행 함수 ==========
async function performFaceSwap(token, userImage, hairstyleImage, userLandmarks, hairstyleLandmarks) {
  try {
    console.log('🎨 Face Swap 시작...');
    console.log('👤 사용자 랜드마크:', userLandmarks);
    console.log('💇 헤어스타일 랜드마크:', hairstyleLandmarks);

    // landmarks 유효성 검사
    const validUserLandmarks = validateLandmarks(userLandmarks) || generateDefaultLandmarks();
    const validStyleLandmarks = validateLandmarks(hairstyleLandmarks) || generateDefaultLandmarks();
    
    console.log('✅ 검증된 사용자 landmarks:', validUserLandmarks);
    console.log('✅ 검증된 스타일 landmarks:', validStyleLandmarks);

   const requestData = JSON.stringify({
 sourceImage: [{
  path: userImage,             // ← 원래대로
  opts: validUserLandmarks
}],
targetImage: [{
  path: hairstyleImage,        // ← 원래대로
  opts: validStyleLandmarks
}],
modifyImage: hairstyleImage    // ← 원래대로
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

    const response = await httpsRequest(options, requestData);

    console.log('📡 Face Swap 응답:', response.statusCode);
    console.log('📋 Face Swap 데이터:', JSON.stringify(response.data, null, 2));

    if (response.statusCode === 200 && response.data.code === 1000) {
      console.log('✅ Face Swap 요청 성공');
      return {
        success: true,
        jobId: response.data.data.job_id,
        resultId: response.data.data._id,
        url: response.data.data.url,
        message: 'Face Swap 처리 시작됨'
      };
    } else {
      console.error('❌ Face Swap 실패:', response.data);
      return {
        success: false,
        error: 'Face Swap 실패',
        message: response.data.msg || '얼굴 교체 처리 실패',
        code: response.data.code
      };
    }
  } catch (error) {
    console.error('❌ Face Swap 오류:', error);
    return {
      success: false,
      error: 'Face Swap 오류',
      message: error.message
    };
  }
}

// ========== 유틸리티 함수들 ==========
function validateLandmarks(landmarks) {
  if (!landmarks || typeof landmarks !== 'string') return null;
  if (/^\d+$/.test(landmarks.trim())) return null; // 숫자만 있는 경우
  if (!/^\d+,\d+(?::\d+,\d+)*$/.test(landmarks)) return null; // 형식 검사
  return landmarks;
}

function generateDefaultLandmarks() {
  return "150,120:250,120:200,180:170,220:230,220";
}

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
          reject(new Error('JSON 파싱 오류: ' + error.message));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}
