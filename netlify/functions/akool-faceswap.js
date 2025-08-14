// netlify/functions/akool-faceswap.js - 진짜 최종 버전
// "알 수 없는 처리 단계입니다" 오류 완전 해결

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
    
    const { token, userImage, targetImage } = requestData;
    
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

    if (!userImage || !targetImage) {
      console.error('❌ 이미지가 없습니다');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: '사용자 이미지와 타겟 이미지가 필요합니다'
        })
      };
    }

    console.log('🔍 AKOOL Face Swap API 호출 시작...');

    // AKOOL Face Swap API 호출
    const faceSwapData = JSON.stringify({
      sourceImageUrl: userImage,
      targetImageUrl: targetImage,
      webhookUrl: `${process.env.URL}/.netlify/functions/akool-webhook`
    });

    const faceSwapOptions = {
      hostname: 'openapi.akool.com',
      port: 443,
      path: '/api/open/v3/faceswap/highquality',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(faceSwapData)
      }
    };

    const response = await httpsRequest(faceSwapOptions, faceSwapData);
    
    console.log('📡 AKOOL 응답:', response.statusCode, response.data);

    if (response.statusCode === 200 && response.data.code === 1000) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          jobId: response.data.data._id,
          message: 'Face Swap 작업이 시작되었습니다'
        })
      };
    } else {
      console.error('❌ AKOOL API 오류:', response.data);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'AKOOL API 오류',
          message: response.data.message || '알 수 없는 오류'
        })
      };
    }

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

// HTTPS 요청 헬퍼 함수
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
