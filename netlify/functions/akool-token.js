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
    const CLIENT_ID = process.env.AKOOL_CLIENT_ID;
    const CLIENT_SECRET = process.env.AKOOL_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: '서버 설정 오류',
          message: 'API 키가 설정되지 않았습니다'
        })
      };
    }

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
      req.write(requestData);
      req.end();
    });

    if (response.statusCode === 200 && response.data.code === 1000) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token: response.data.token,
          message: '토큰 발급 성공'
        })
      };
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'AKOOL API 오류',
          message: response.data.message || '토큰 발급 실패'
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
