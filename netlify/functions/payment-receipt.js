// netlify/functions/payment-receipt.js
// 포트원 V2 영수증 URL 조회 API

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
    const { paymentId } = JSON.parse(event.body);

    console.log('🧾 영수증 조회 요청:', paymentId);

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

    // 포트원 V2 결제 정보 조회 API 호출
    const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `PortOne ${PORTONE_API_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🧾 포트원 조회 실패:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          success: false,
          error: '결제 정보를 조회할 수 없습니다.'
        })
      };
    }

    const paymentData = await response.json();
    console.log('🧾 결제 정보:', paymentData);

    // 영수증 URL 추출
    // 포트원 V2에서는 receiptUrl 필드에 영수증 URL이 있음
    let receiptUrl = null;

    // 결제 정보에서 영수증 URL 찾기
    if (paymentData.receiptUrl) {
      receiptUrl = paymentData.receiptUrl;
    } else if (paymentData.pgResponse?.receipt_url) {
      receiptUrl = paymentData.pgResponse.receipt_url;
    } else if (paymentData.method?.card?.receiptUrl) {
      receiptUrl = paymentData.method.card.receiptUrl;
    }

    // 나이스페이 영수증 URL 구성 (없는 경우)
    if (!receiptUrl && paymentData.pgTxId) {
      // 나이스페이 표준 영수증 URL 형식
      receiptUrl = `https://npg.nicepay.co.kr/issue/IssueLoader.do?TID=${paymentData.pgTxId}&type=0`;
    }

    if (receiptUrl) {
      console.log('🧾 영수증 URL:', receiptUrl);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          receiptUrl: receiptUrl,
          paymentId: paymentId
        })
      };
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: '영수증 URL을 찾을 수 없습니다.',
          paymentData: {
            status: paymentData.status,
            pgProvider: paymentData.pgProvider
          }
        })
      };
    }

  } catch (error) {
    console.error('🧾 영수증 조회 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || '영수증 조회 중 오류가 발생했습니다.'
      })
    };
  }
};
