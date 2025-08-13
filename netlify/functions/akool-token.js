// netlify/functions/akool-token.js
const https = require('https');

exports.handler = async (event, context) => {
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
    // 환경변수에서 API 키 가져오기
    const CLIENT_ID = process.env.AKOOL_CLIENT_ID || '+r5yrpKQ62HUoyUdYoBvDg==';
    const CLIENT_SECRET = process.env.AKOOL_CLIENT_SECRET || 'OzV4vUnCxCnhXt447x8oxQOcV3l0Jpqh';
    
    console.log('🔑 AKOOL 토큰 발급 시작...');
    console.log('📝 Client ID:', CLIENT_ID.substring(0, 10) + '...');

    // 올바른 요청 데이터 구성
    const requestData = JSON.stringify({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    });

    const options = {
      hostname: 'openapi.akool.com',
      port: 443,
      path: '/api/open/v3/getToken',
      method: 'POST',
      headers: {
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
      req.write(requestData);  // 이 부분이 중요!
      req.end();
    });

    console.log('📡 AKOOL API 응답:', response.statusCode, response.data?.code);

    if (response.statusCode === 200 && response.data.code === 1000) {
      console.log('✅ 토큰 발급 성공');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token: response.data.token,
          expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1년
          message: '토큰 발급 성공'
        })
      };
    } else {
      console.error('❌ 토큰 발급 실패:', response.data);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'AKOOL API 오류',
          message: response.data.message || '토큰 발급 실패',
          code: response.data.code
        })
      };
    }

  } catch (error) {
    console.error('❌ 토큰 발급 서버 오류:', error);
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
