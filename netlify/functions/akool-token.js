// netlify/functions/akool-token.js
// AKOOL API 토큰 발급 서버 함수

exports.handler = async (event, context) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    // 환경변수에서 AKOOL 인증 정보 가져오기
    const clientId = process.env.AKOOL_CLIENT_ID;
    const clientSecret = process.env.AKOOL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('AKOOL 환경변수 누락');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'AKOOL 인증 정보가 설정되지 않았습니다' 
        })
      };
    }

    // AKOOL 토큰 발급 API 호출
    const tokenResponse = await fetch('https://openapi.akool.com/api/open/v3/getToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId: clientId,
        clientSecret: clientSecret
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('AKOOL 토큰 발급 실패:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'AKOOL 토큰 발급 실패',
          details: errorText
        })
      };
    }

    const tokenData = await tokenResponse.json();

    // 성공적으로 토큰 발급받은 경우
    if (tokenData.code === 1000 && tokenData.data && tokenData.data.token) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token: tokenData.data.token,
          expiresIn: tokenData.data.expires_in || 3600,
          timestamp: new Date().toISOString()
        })
      };
    }

    // AKOOL에서 오류 응답한 경우
    console.error('AKOOL 토큰 응답 오류:', tokenData);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: tokenData.msg || 'AKOOL 토큰 발급 실패',
        code: tokenData.code
      })
    };

  } catch (error) {
    console.error('토큰 발급 함수 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 내부 오류',
        message: error.message
      })
    };
  }
};
