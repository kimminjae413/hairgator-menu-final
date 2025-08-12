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
        body: JSON.stringify({ error: 'Token이 필요합니다' })
      };
    }

    // 얼굴 감지 단계
    if (step === 'detect_user' || step === 'detect_hairstyle') {
      const imageData = step === 'detect_user' ? userImage : hairstyleImage;
      
      if (!imageData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '이미지가 필요합니다' })
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
          body: JSON.stringify({ error: '필요한 데이터가 부족합니다' })
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
      body: JSON.stringify({ error: '알 수 없는 단계입니다' })
    };

  } catch (error) {
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

// 얼굴 감지 함수
async function detectFace(token, imageData) {
  try {
    const requestData = JSON.stringify({
      single_face: true,
      img: imageData
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

    if (response.statusCode === 200 && response.data.error_code === 0) {
      return {
        success: true,
        landmarks: response.data.landmarks_str?.[0] || null,
        message: '얼굴 감지 성공'
      };
    } else {
      return {
        success: false,
        error: '얼굴 감지 실패',
        message: '얼굴이 명확히 보이는 사진을 사용해주세요'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: '얼굴 감지 오류',
      message: error.message
    };
  }
}

// Face Swap 실행 함수
async function performFaceSwap(token, userImage, hairstyleImage, userLandmarks, hairstyleLandmarks) {
  try {
    const requestData = JSON.stringify({
      sourceImage: [{
        path: userImage,
        opts: userLandmarks
      }],
      targetImage: [{
        path: hairstyleImage,
        opts: hairstyleLandmarks
      }],
      face_enhance: 1,
      modifyImage: hairstyleImage
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

    if (response.statusCode === 200 && response.data.code === 1000) {
      return {
        success: true,
        jobId: response.data.data.job_id,
        resultId: response.data.data._id,
        url: response.data.data.url,
        message: 'Face Swap 시작됨'
      };
    } else {
      return {
        success: false,
        error: 'Face Swap 실패',
        message: response.data.message || '처리 중 오류가 발생했습니다'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Face Swap 오류',
      message: error.message
    };
  }
}
