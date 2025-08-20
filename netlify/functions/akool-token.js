// netlify/functions/akool-token.js
// AKOOL API 토큰 발급 서버 함수 - 최종 완성본
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
    const clientId = process.env.AKOOL_API_KEY;
    const clientSecret = process.env.AKOOL_SECRET;

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

    console.log('🔑 AKOOL 토큰 발급 시도...');

    // ✅ 정확한 AKOOL 토큰 발급 API 호출
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
      console.error('AKOOL API 응답 오류:', errorText);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'AKOOL API 호출 실패',
          details: errorText
        })
      };
    }

    const tokenData = await tokenResponse.json();
    console.log('📥 AKOOL 응답:', { code: tokenData.code, hasToken: !!tokenData.token });

    // 성공적으로 토큰 발급받은 경우
    if (tokenData.code === 1000 && tokenData.token) {
      console.log('✅ 토큰 발급 성공');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token: tokenData.token,
          expiresIn: 31536000, // 1년 (API 문서 기준)
          timestamp: new Date().toISOString(),
          message: 'AKOOL 토큰 발급 성공'
        })
      };
    }

    // AKOOL에서 오류 응답한 경우
    console.error('AKOOL 토큰 발급 실패:', tokenData);
    
    let errorMessage = 'AKOOL 토큰 발급 실패';
    switch(tokenData.code) {
      case 1101:
        errorMessage = 'AKOOL 인증 정보가 유효하지 않습니다';
        break;
      case 1102:
        errorMessage = 'AKOOL 인증 정보가 비어있습니다';
        break;
      case 1200:
        errorMessage = 'AKOOL 계정이 차단되었습니다';
        break;
      default:
        errorMessage = tokenData.msg || 'AKOOL 토큰 발급 실패';
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        code: tokenData.code,
        details: tokenData
      })
    };

  } catch (error) {
    console.error('💥 토큰 발급 함수 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 내부 오류',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
