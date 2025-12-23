// netlify/functions/payment-cancel.js
// 포트원 V2 결제 취소 API

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;

exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리
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
    const { paymentId, reason } = JSON.parse(event.body);

    console.log('💳 결제 취소 요청:', { paymentId, reason });

    if (!paymentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '결제 ID가 필요합니다.' })
      };
    }

    if (!PORTONE_API_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '포트원 API 설정이 되어있지 않습니다.' })
      };
    }

    // 포트원 V2 결제 취소 API 호출
    const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${PORTONE_API_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason || '관리자 취소'
      })
    });

    const result = await response.json();

    console.log('💳 포트원 취소 응답:', result);

    if (!response.ok) {
      // 포트원 API 에러
      const errorMessage = result.message || result.error || '결제 취소 실패';
      console.error('💳 포트원 취소 실패:', errorMessage);

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: errorMessage,
          portoneError: result
        })
      };
    }

    // 성공
    console.log('✅ 결제 취소 성공:', paymentId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '결제가 취소되었습니다.',
        cancellation: result.cancellation || result
      })
    };

  } catch (error) {
    console.error('💳 결제 취소 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '결제 취소 처리 중 오류가 발생했습니다.'
      })
    };
  }
};
