// netlify/functions/payment-verify.js
// 포트원 V2 결제 검증 및 크레딧 충전

const admin = require('firebase-admin');

// Firebase Admin 초기화
if (!admin.apps.length) {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (serviceAccountBase64) {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

const db = admin.firestore();

// 요금제 정보
const PLANS = {
  basic: { price: 22000, credits: 10000 },
  standard: { price: 38000, credits: 18000 },
  business: { price: 50000, credits: 25000 },
  credits_5000: { price: 5000, credits: 5000 }
};

// 포트원 API 설정
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
    const { paymentId, planKey, userId } = JSON.parse(event.body);

    console.log('💳 결제 검증 요청:', { paymentId, planKey, userId });

    // 필수 파라미터 확인
    if (!paymentId || !planKey || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '필수 파라미터가 누락되었습니다.' })
      };
    }

    // 요금제 확인
    const plan = PLANS[planKey];
    if (!plan) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '유효하지 않은 요금제입니다.' })
      };
    }

    // 1. 포트원 API로 결제 검증
    const paymentData = await verifyPaymentWithPortone(paymentId);

    if (!paymentData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '결제 정보를 조회할 수 없습니다.' })
      };
    }

    console.log('💳 포트원 결제 정보:', paymentData);

    // 2. 결제 상태 확인
    if (paymentData.status !== 'PAID') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: '결제가 완료되지 않았습니다.',
          status: paymentData.status
        })
      };
    }

    // 3. 금액 검증
    if (paymentData.amount.total !== plan.price) {
      console.error('💳 금액 불일치:', {
        expected: plan.price,
        actual: paymentData.amount.total
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '결제 금액이 일치하지 않습니다.' })
      };
    }

    // 4. 중복 처리 방지 - 이미 처리된 결제인지 확인
    const existingPayment = await db.collection('payments').doc(paymentId).get();
    if (existingPayment.exists) {
      console.log('💳 이미 처리된 결제:', paymentId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '이미 처리된 결제입니다.',
          credits: plan.credits
        })
      };
    }

    // 5. 불나비 DB에서 현재 크레딧 조회 및 충전
    const chargeResult = await chargeCredits(userId, plan.credits);

    if (!chargeResult.success) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: chargeResult.error })
      };
    }

    // 6. 결제 내역 저장 (중복 방지용)
    await db.collection('payments').doc(paymentId).set({
      paymentId: paymentId,
      userId: userId,
      planKey: planKey,
      amount: plan.price,
      credits: plan.credits,
      status: 'completed',
      portoneStatus: paymentData.status,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 7. 크레딧 사용 로그 기록
    await db.collection('credit_logs').add({
      userId: userId,
      action: 'purchase',
      creditsUsed: -plan.credits, // 마이너스 = 충전
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        paymentId: paymentId,
        planKey: planKey,
        amount: plan.price,
        previousCredits: chargeResult.previousCredits,
        newCredits: chargeResult.newCredits
      }
    });

    console.log('✅ 결제 완료:', {
      paymentId,
      userId,
      credits: plan.credits,
      newBalance: chargeResult.newCredits
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        credits: plan.credits,
        newBalance: chargeResult.newCredits,
        message: `${plan.credits.toLocaleString()} 크레딧이 충전되었습니다.`
      })
    };

  } catch (error) {
    console.error('💳 결제 검증 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '결제 처리 중 오류가 발생했습니다.',
        detail: error.message
      })
    };
  }
};

/**
 * 포트원 API로 결제 검증
 */
async function verifyPaymentWithPortone(paymentId) {
  try {
    const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `PortOne ${PORTONE_API_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('포트원 API 오류:', response.status, errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('포트원 API 호출 실패:', error);
    return null;
  }
}

/**
 * 불나비 DB에 크레딧 충전
 */
async function chargeCredits(userId, credits) {
  try {
    // 불나비 API를 통해 크레딧 충전
    const bullnabiApiUrl = process.env.BULLNABI_API_URL || 'https://bullnabi.com';

    // 현재 크레딧 조회
    const currentResponse = await fetch(`${bullnabiApiUrl}/api/collections/_users/records?filter=(id='${userId}')`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!currentResponse.ok) {
      throw new Error('사용자 정보 조회 실패');
    }

    const userData = await currentResponse.json();
    if (!userData.data || userData.data.length === 0) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const currentCredits = userData.data[0].remainCount || 0;
    const newCredits = currentCredits + credits;

    // 크레딧 업데이트
    const updateResponse = await fetch(`${bullnabiApiUrl}/api/collections/_users/records/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        remainCount: newCredits
      })
    });

    if (!updateResponse.ok) {
      throw new Error('크레딧 업데이트 실패');
    }

    return {
      success: true,
      previousCredits: currentCredits,
      newCredits: newCredits
    };

  } catch (error) {
    console.error('크레딧 충전 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
