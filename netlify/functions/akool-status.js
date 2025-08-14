// netlify/functions/akool-status.js - 진짜 최종 버전

const https = require('https');

exports.handler = async (event, context) => {
  console.log('📊 AKOOL 상태 확인 함수 시작...');
  
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
    console.log('📥 상태 확인 데이터:', Object.keys(requestData));
    
    const { token, jobId } = requestData;
    
    if (!token || !jobId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Token과 jobId가 필요합니다'
        })
      };
    }

    console.log('🔍 AKOOL 상태 확인:', jobId);

    const options = {
      hostname: 'openapi.akool.com',
      port: 443,
      path: `/api/open/v3/faceswap/result/listbyids?_ids=${encodeURIComponent(jobId)}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await httpsRequest(options);
    
    console.log('📡 상태 API 응답:', response.statusCode, response.data);

    if (response.statusCode === 200 && response.data.code === 1000) {
      const result = response.data.data?.result?.[0];
      
      if (!result) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            status: 'processing',
            message: '처리 중입니다...'
          })
        };
      }

      // AKOOL 상태 매핑
      let status;
      let resultUrl = null;
      
      switch (result.status) {
        case 1: 
          status = 'processing';
          break;
        case 2:
          status = 'completed';
          resultUrl = result.resultUrl;
          break;
        case 3:
          status = 'failed';
          break;
        default:
          status = 'processing';
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: status,
          resultUrl: resultUrl,
          message: status === 'completed' ? 'AI 처리 완료!' : 
                   status === 'failed' ? 'AI 처리 실패' : '처리 중...'
        })
      };

    } else {
      console.error('❌ 상태 API 오류:', response.data);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'AKOOL API 오류',
          message: response.data.message || '상태 확인 실패'
        })
      };
    }

  } catch (error) {
    console.error('❌ 상태 확인 함수 오류:', error);
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
function httpsRequest(options) {
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
    req.end();
  });
}
