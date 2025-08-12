// netlify/functions/akool-faceswap.js
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

    // 얼굴 감지 단계
    if (step === 'detect_user' || step === 'detect_hairstyle') {
      const imageData = step === 'detect_user' ? userImage : hairstyleImage;
      
      if (!imageData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: '이미지가 필요합니다' })
        };
      }

      const detectResult = await detectFace(token, imageData);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(detectResult)
      };
    }

    // Face Swap 실행 단계
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

// 얼굴 감지 함수 - AKOOL detect API 사용
async function detectFace(token, imageData) {
  try {
    console.log('🔍 얼굴 감지 시작...');

    // Base64 이미지인지 URL인지 확인
    const isBase64 = imageData.startsWith('data:image/');
    
    const requestData = JSON.stringify({
      single_face: true,
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

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
          } catch (error) {
            reject(new Error('JSON 파싱 오류: ' + error.message));
          }
        });
      });
      req.on('error', reject);
      req.write(requestData);
      req.end();
    });

    console.log('📡 얼굴 감지 API 응답:', response.statusCode, response.data?.error_code);

    if (response.statusCode === 200 && response.data.error_code === 0) {
      const landmarks = response.data.landmarks_str?.[0];
      
      if (!landmarks) {
        return {
          success: false,
          error: '얼굴을 감지할 수 없습니다',
          message: '사진에서 명확한 얼굴을 찾을 수 없습니다. 정면을 향한 얼굴이 잘 보이는 사진을 사용해주세요.'
        };
      }

      console.log('✅ 얼굴 감지 성공:', landmarks);
      return {
        success: true,
        landmarks: landmarks,
        message: '얼굴 감지 성공'
      };
    } else {
      console.error('❌ 얼굴 감지 실패:', response.data);
      return {
        success: false,
        error: '얼굴 감지 실패',
        message: response.data.error_msg || '얼굴을 명확히 인식할 수 없습니다. 정면을 향한 고화질 사진을 사용해주세요.',
        code: response.data.error_code
      };
    }
  } catch (error) {
    console.error('❌ 얼굴 감지 네트워크 오류:', error);
    return {
      success: false,
      error: '얼굴 감지 오류',
      message: '네트워크 오류가 발생했습니다: ' + error.message
    };
  }
}

// Face Swap 실행 함수 - AKOOL highquality API 사용
async function performFaceSwap(token, userImage, hairstyleImage, userLandmarks, hairstyleLandmarks) {
  try {
    console.log('🎨 Face Swap 시작...');
    console.log('👤 사용자 랜드마크:', userLandmarks);
    console.log('💇 헤어스타일 랜드마크:', hairstyleLandmarks);

    // AKOOL API 스펙에 맞춘 데이터 구성
    const requestData = JSON.stringify({
      sourceImage: [{
        path: userImage, // 사용자 이미지 (Base64 또는 URL)
        opts: userLandmarks // 사용자 얼굴 랜드마크
      }],
      targetImage: [{
        path: hairstyleImage, // 헤어스타일 이미지 URL
        opts: hairstyleLandmarks // 헤어스타일 랜드마크
      }],
      face_enhance: 1, // 얼굴 향상 활성화
      modifyImage: hairstyleImage // 수정할 베이스 이미지
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

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
          } catch (error) {
            reject(new Error('JSON 파싱 오류: ' + error.message));
          }
        });
      });
      req.on('error', reject);
      req.write(requestData);
      req.end();
    });

    console.log('📡 Face Swap API 응답:', response.statusCode, response.data?.code);

    if (response.statusCode === 200 && response.data.code === 1000) {
      console.log('✅ Face Swap 요청 성공:', response.data.data);
      return {
        success: true,
        jobId: response.data.data.job_id,
        resultId: response.data.data._id,
        url: response.data.data.url,
        message: response.data.msg || 'Face Swap 처리 시작됨'
      };
    } else {
      console.error('❌ Face Swap 실패:', response.data);
      return {
        success: false,
        error: 'Face Swap 실패',
        message: response.data.msg || '얼굴 교체 처리에 실패했습니다',
        code: response.data.code
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
