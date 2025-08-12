// netlify/functions/akool-status.js
const https = require('https');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { token, resultId } = event.queryStringParameters || {};

    if (!token || !resultId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Token과 resultId가 필요합니다' 
        })
      };
    }

    const options = {
      hostname: 'openapi.akool.com',
      port: 443,
      path: `/api/open/v3/faceswap/result/listbyids?_ids=${resultId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
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
      req.end();
    });

    if (response.statusCode === 200 && response.data.code === 1000) {
      const result = response.data.data.result[0];
      
      if (!result) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: '결과를 찾을 수 없습니다'
          })
        };
      }

      const status = result.faceswap_status;
      let statusText, isComplete, progress;

      switch (status) {
        case 1:
          statusText = '대기 중';
          isComplete = false;
          progress = 20;
          break;
        case 2:
          statusText = '처리 중';
          isComplete = false;
          progress = 65;
          break;
        case 3:
          statusText = '완료';
          isComplete = true;
          progress = 100;
          break;
        case 4:
          statusText = '실패';
          isComplete = true;
          progress = 0;
          break;
        default:
          statusText = '알 수 없음';
          isComplete = false;
          progress = 0;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: status,
          statusText: statusText,
          isComplete: isComplete,
          progress: progress,
          resultUrl: result.url || null,
          message: status === 4 ? '처리 중 오류가 발생했습니다' : statusText
        })
      };

    } else {
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
