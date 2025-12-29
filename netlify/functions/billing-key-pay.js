// netlify/functions/billing-key-pay.js
// 빌링키로 결제 - 저장된 카드로 즉시 결제

const admin = require('firebase-admin');

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();
const PORTONE_API_URL = 'https://api.portone.io';

// 요금제 정보
const PLANS = {
  basic: { name: '베이직', price: 22000, tokens: 10000 },
  pro: { name: '프로', price: 38000, tokens: 18000 },
  business: { name: '비즈니스', price: 50000, tokens: 25000 },
  tokens_5000: { name: '추가 토큰 5,000', price: 5000, tokens: 5000 }
};

exports.handler = async (event) => {
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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { billingKey, planKey, userId, userName } = JSON.parse(event.body);

    if (!billingKey || !planKey || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'billingKey, planKey, userId가 필요합니다.' })
      };
    }

    const plan = PLANS[planKey];
    if (!plan) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '유효하지 않은 요금제입니다.' })
      };
    }

    const apiSecret = process.env.PORTONE_API_SECRET;
    if (!apiSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '결제 서비스가 설정되지 않았습니다.' })
      };
    }

    // 고유 결제 ID 생성
    const paymentId = `HG_BK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('💳 빌링키 결제 요청:', { paymentId, planKey, userId, amount: plan.price });

    // 1. 포트원 빌링키 결제 API 호출
    const paymentResponse = await fetch(`${PORTONE_API_URL}/payments/${encodeURIComponent(paymentId)}/billing-key`, {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${apiSecret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        billingKey: billingKey,
        orderName: `HAIRGATOR ${plan.name}`,
        amount: {
          total: plan.price
        },
        currency: 'KRW',
        customer: {
          id: userId,
          name: userName || undefined
        }
      })
    });

    const paymentResult = await paymentResponse.json();
    console.log('포트원 결제 응답:', JSON.stringify(paymentResult, null, 2));

    if (!paymentResponse.ok) {
      console.error('빌링키 결제 실패:', paymentResult);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: paymentResult.message || '결제에 실패했습니다.',
          details: paymentResult
        })
      };
    }

    // 결제 상태 확인
    const paymentStatus = paymentResult.payment?.status || paymentResult.status;
    if (paymentStatus !== 'PAID' && paymentStatus !== 'VIRTUAL_ACCOUNT_ISSUED') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: '결제가 완료되지 않았습니다.',
          status: paymentStatus
        })
      };
    }

    // 2. Firestore에 결제 내역 저장
    await db.collection('payments').doc(paymentId).set({
      paymentId: paymentId,
      billingKey: billingKey,
      userId: userId,
      userName: userName || '',
      planKey: planKey,
      amount: plan.price,
      tokens: plan.tokens,
      status: 'completed',
      paymentType: 'billing_key',
      portoneResponse: paymentResult,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. 사용자 토큰 충전
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const currentTokens = userDoc.exists ? (userDoc.data().tokenBalance || 0) : 0;
    const newBalance = currentTokens + plan.tokens;

    await userRef.set({
      tokenBalance: newBalance,
      plan: planKey,
      lastPaymentAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // 4. 토큰 로그 기록
    await db.collection('token_logs').add({
      userId: userId,
      action: 'billing_key_payment',
      tokensAdded: plan.tokens,
      previousBalance: currentTokens,
      newBalance: newBalance,
      paymentId: paymentId,
      planKey: planKey,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ 빌링키 결제 완료:', { paymentId, tokens: plan.tokens, newBalance });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '결제가 완료되었습니다.',
        paymentId: paymentId,
        tokens: plan.tokens,
        newBalance: newBalance,
        plan: planKey
      })
    };

  } catch (error) {
    console.error('빌링키 결제 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '결제 처리 중 오류가 발생했습니다.' })
    };
  }
};
