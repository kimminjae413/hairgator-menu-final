// netlify/functions/payment-verify.js
// 포트원 V2 결제 검증 및 토큰 충전 (Firebase user_tokens 사용)

const admin = require('firebase-admin');

// Firebase Admin 초기화 (bullnabi-proxy.js와 동일한 방식)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('✅ Firebase Admin 초기화 완료 (payment-verify)');
  } catch (error) {
    console.error('⚠️ Firebase Admin 초기화 실패:', error.message);
  }
}

const db = admin.firestore();

// 요금제 정보 (credits → tokens로 변경)
const PLANS = {
  basic: { price: 22000, tokens: 10000 },
  standard: { price: 38000, tokens: 18000 },
  business: { price: 50000, tokens: 25000 },
  tokens_5000: { price: 5000, tokens: 5000 }
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
    if (!plan || !plan.tokens) {
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
          tokens: plan.tokens
        })
      };
    }

    // 5. Firestore user_tokens에 토큰 충전
    const chargeResult = await chargeTokens(userId, plan.tokens);

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
      tokens: plan.tokens,
      status: 'completed',
      portoneStatus: paymentData.status,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 7. 토큰 충전 로그 기록
    await db.collection('token_logs').add({
      userId: userId,
      action: 'purchase',
      tokensAdded: plan.tokens,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        paymentId: paymentId,
        planKey: planKey,
        amount: plan.price,
        previousTokens: chargeResult.previousTokens,
        newTokens: chargeResult.newTokens
      }
    });

    console.log('✅ 결제 완료:', {
      paymentId,
      userId,
      tokens: plan.tokens,
      newBalance: chargeResult.newTokens
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tokens: plan.tokens,
        newBalance: chargeResult.newTokens,
        message: `${plan.tokens.toLocaleString()} 토큰이 충전되었습니다.`
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
 * Firestore user_tokens에 토큰 충전
 */
async function chargeTokens(userId, tokens) {
  try {
    const docRef = db.collection('user_tokens').doc(userId);

    // 트랜잭션으로 안전하게 충전
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      let currentTokens = 0;
      if (doc.exists) {
        currentTokens = doc.data().tokenBalance || 0;
      }

      const newTokens = currentTokens + tokens;

      transaction.set(docRef, {
        tokenBalance: newTokens,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        previousTokens: currentTokens,
        newTokens: newTokens
      };
    });

    console.log(`✅ 토큰 충전 완료: userId=${userId}, added=${tokens}, newBalance=${result.newTokens}`);

    return {
      success: true,
      previousTokens: result.previousTokens,
      newTokens: result.newTokens
    };

  } catch (error) {
    console.error('토큰 충전 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
