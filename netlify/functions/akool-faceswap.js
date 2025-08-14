// netlify/functions/akool-faceswap.js - 완전 수정 버전
// AKOOL API 400 오류 완전 해결

const https = require('https');

exports.handler = async (event, context) => {
  console.log('🚀 AKOOL Face Swap 함수 시작...');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    const requestData = JSON.parse(event.body);
    console.log('📥 받은 데이터:', Object.keys(requestData));
    
    const { token, userImage, targetImage, step } = requestData;
    
    if (!token) {
      console.error('❌ 토큰이 없습니다');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Token이 필요합니다'
        })
      };
    }

    // ✅ 단계별 처리 - 얼굴 감지부터 시작
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

      // 1단계: 사용자 얼굴 감지
      const detectData = JSON.stringify({
        imageUrl: userImage
      });

      const detectOptions = {
        hostname: 'openapi.akool.com',
        port: 443,
        path: '/api/open/v3/faceenhancer/detection',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(detectData)
        }
      };

      const detectResponse = await httpsRequest(detectOptions, detectData);
      console.log('📡 얼굴 감지 응답:', detectResponse.statusCode, detectResponse.data);

      if (detectResponse.statusCode === 200 && detectResponse.data.code === 1000) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            faceData: detectResponse.data.data,
            message: '사용자 얼굴 감지 완료'
          })
        };
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: '얼굴을 감지할 수 없습니다',
            message: detectResponse.data.message || '명확한 얼굴이 포함된 사진을 사용해주세요'
          })
        };
      }
    }

    // ✅ 헤어스타일 얼굴 감지
    if (step === 'detect_style') {
      console.log('🔍 헤어스타일 얼굴 감지 시작...');
      
      if (!targetImage) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: '헤어스타일 이미지가 필요합니다'
          })
        };
      }

      const detectData = JSON.stringify({
        imageUrl: targetImage
      });

      const detectOptions = {
        hostname: 'openapi.akool.com',
        port: 443,
        path: '/api/open/v3/faceenhancer/detection',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(detectData)
        }
      };

      const detectResponse = await httpsRequest(detectOptions, detectData);
      console.log('📡 헤어스타일 얼굴 감지 응답:', detectResponse.statusCode, detectResponse.data);

      if (detectResponse.statusCode === 200 && detectResponse.data.code === 1000) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            faceData: detectResponse.data.data,
            message: '헤어스타일 얼굴 감지 완료'
          })
        };
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: '헤어스타일 이미지에서 얼굴을 감지할 수 없습니다',
            message: detectResponse.data.message || '얼굴이 명확한 헤어스타일 이미지가 필요합니다'
          })
        };
      }
    }

    // ✅ Face Swap 실행 - 올바른 API 형식 사용
    if (step === 'faceswap') {
      console.log('🎭 Face Swap 실행 시작...');
      
      const { userFaceData, styleFaceData } = requestData;
      
      if (!userFaceData || !styleFaceData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: '얼굴 감지 데이터가 필요합니다'
          })
        };
      }

      // ✅ AKOOL API 정확한 형식 - 배열 사용
      const faceSwapData = JSON.stringify({
        sourceImage: [{
          path: styleFaceData.crop_image_url,
          opts: styleFaceData.landmarks_str
        }],
        targetImage: [{
          path: userFaceData.crop_image_url,
          opts: userFaceData.landmarks_str
        }],
        face_enhance: 0
      });

      const faceSwapOptions = {
        hostname: 'openapi.akool.com',
        port: 443,
        path: '/api/open/v3/faceswap/highquality/create',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(faceSwapData)
        }
      };

      const response = await httpsRequest(faceSwapOptions, faceSwapData);
      console.log('📡 Face Swap 응답:', response.statusCode, response.data);

      if (response.statusCode === 200 && response.data.code === 1000) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            jobId: response.data._id,
            message: 'Face Swap 작업이 시작되었습니다'
          })
        };
      } else {
        console.error('❌ Face Swap API 오류:', response.data);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Face Swap API 오류',
            message: response.data.message || response.data.msg || '알 수 없는 오류'
          })
        };
      }
    }

    // ✅ Face Swap 상태 확인
    if (step === 'status') {
      console.log('📊 Face Swap 상태 확인...');
      
      const { jobId } = requestData;
      
      if (!jobId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Job ID가 필요합니다'
          })
        };
      }

      const statusOptions = {
        hostname: 'openapi.akool.com',
        port: 443,
        path: `/api/open/v3/faceswap/highquality/${jobId}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      const statusResponse = await httpsRequest(statusOptions);
      console.log('📡 상태 확인 응답:', statusResponse.statusCode, statusResponse.data);

      if (statusResponse.statusCode === 200 && statusResponse.data.code === 1000) {
        const jobData = statusResponse.data.data;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            status: jobData.status,
            progress: getProgressFromStatus(jobData.status),
            resultUrl: jobData.result_url,
            isComplete: ['completed', 'failed'].includes(jobData.status),
            message: getStatusMessage(jobData.status)
          })
        };
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: '상태 확인 실패',
            message: statusResponse.data.message || '상태를 확인할 수 없습니다'
          })
        };
      }
    }

    // 잘못된 단계
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: '잘못된 처리 단계입니다',
        validSteps: ['detect_user', 'detect_style', 'faceswap', 'status']
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
        message: error.message
      })
    };
  }
};

// ✅ HTTPS 요청 헬퍼 함수
function httpsRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (error) {
          reject(new Error('JSON 파싱 오류: ' + error.message));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ✅ 상태별 진행률 반환
function getProgressFromStatus(status) {
  switch (status) {
    case 'queued': return 50;
    case 'processing': return 75;
    case 'completed': return 100;
    case 'failed': return 0;
    default: return 60;
  }
}

// ✅ 상태별 메시지 반환
function getStatusMessage(status) {
  switch (status) {
    case 'queued': return '처리 대기 중...';
    case 'processing': return 'AI가 헤어스타일을 적용하고 있습니다...';
    case 'completed': return '헤어스타일 적용 완료!';
    case 'failed': return '처리 중 오류가 발생했습니다';
    default: return '처리 중...';
  }
}
