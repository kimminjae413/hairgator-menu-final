// netlify/functions/payment-verify.js
// 포트원 V2 결제 검증 및 토큰 충전 (Firestore 직접 접근)

const admin = require('firebase-admin');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Firebase Admin 초기화
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
  pro: { price: 38000, tokens: 18000 },
  business: { price: 50000, tokens: 25000 },
  tokens_5000: { price: 5000, tokens: 5000 }
};

// 포트원 API 설정
const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;

// 환경변수 체크 로그
console.log('🔑 환경변수 체크:', {
  hasPortoneSecret: !!PORTONE_API_SECRET,
  hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
  hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
  hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
});

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
    // 환경변수 체크
    if (!PORTONE_API_SECRET) {
      console.error('❌ PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '결제 시스템 설정 오류 (API_SECRET)' })
      };
    }

    const { paymentId, planKey, userId, userName, billingKey, cardInfo } = JSON.parse(event.body);

    console.log('💳 결제 검증 요청:', { paymentId, planKey, userId, userName, hasBillingKey: !!billingKey });

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

    // 4.5. 카드 정보 추출 (포트원 결제 응답에서)
    let extractedCardInfo = cardInfo;
    if (!extractedCardInfo && paymentData.method?.card) {
      const card = paymentData.method.card;
      extractedCardInfo = {
        last4: card.number?.slice(-4) || '',
        brand: card.brand || card.issuer || '',
        expiryMonth: '',
        expiryYear: ''
      };
      console.log('💳 카드 정보 추출:', extractedCardInfo);
    }

    // 5. Firestore에서 직접 토큰 충전 + 플랜 업그레이드 + 카드 저장
    const chargeResult = await chargeTokens(userId, plan.tokens, planKey, billingKey, extractedCardInfo);

    if (!chargeResult.success) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: chargeResult.error })
      };
    }

    // 6. 결제 내역 저장 (중복 방지용 + 취소 시 복원용 이전 상태 포함)
    await db.collection('payments').doc(paymentId).set({
      paymentId: paymentId,
      userId: userId,
      userName: userName || '',
      planKey: planKey,
      amount: plan.price,
      tokens: plan.tokens,
      status: 'completed',
      portoneStatus: paymentData.status,
      // 취소 시 복원용 이전 상태 저장
      previousState: {
        plan: chargeResult.previousPlan,
        tokens: chargeResult.previousTokens,
        planExpiresAt: chargeResult.previousPlanExpiresAt
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 7. 토큰 충전 로그 기록
    await db.collection('credit_logs').add({
      userId: userId,
      action: 'purchase',
      tokensAdded: plan.tokens,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        paymentId: paymentId,
        planKey: planKey,
        amount: plan.price,
        previousTokens: chargeResult.previousTokens,
        newTokens: chargeResult.newTokens,
        previousPlan: chargeResult.previousPlan,
        newPlan: chargeResult.newPlan
      }
    });

    console.log('✅ 결제 완료:', {
      paymentId,
      userId,
      tokens: plan.tokens,
      newBalance: chargeResult.newTokens,
      plan: chargeResult.newPlan
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        tokens: plan.tokens,
        newBalance: chargeResult.newTokens,
        plan: chargeResult.newPlan,
        planExpiresAt: chargeResult.planExpiresAt,
        message: `${plan.tokens.toLocaleString()} 토큰이 충전되었습니다. (30일간 유효)`
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
 * Firestore에서 직접 토큰 충전 + 플랜 업그레이드
 * userId는 이메일 기반 문서 ID (예: 708eric_hanmail_net)
 *
 * 변경사항 (2025-12-30):
 * - 토큰은 기존+신규가 아닌, 플랜 토큰으로 리셋 (ChatGPT/Claude 방식)
 * - planExpiresAt 추가 (결제일 + 30일)
 * - 만료 시 토큰 소멸, free로 다운그레이드
 */
async function chargeTokens(userId, tokens, planKey, billingKey = null, cardInfo = null) {
  try {
    // 1. 현재 사용자 데이터 조회
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    let currentTokens = 0;
    let currentPlan = 'free';
    let currentPlanExpiresAt = null;

    if (userDoc.exists) {
      const userData = userDoc.data();
      currentTokens = userData.tokenBalance || 0;
      currentPlan = userData.plan || 'free';
      // 이전 플랜 만료일 저장 (취소 시 복원용)
      currentPlanExpiresAt = userData.planExpiresAt?.toDate?.()?.toISOString() || null;
    } else {
      console.warn(`⚠️ 사용자 문서가 없습니다: ${userId}, 새로 생성합니다.`);
    }

    // 2. 플랜 결정
    let newPlan = currentPlan;
    let newTokens = tokens; // 토큰 리셋 (기존 토큰 무시, 새 플랜 토큰으로 설정)

    if (planKey !== 'tokens_5000') {
      // 플랜 구매: 해당 플랜으로 설정, 토큰 리셋
      newPlan = planKey;
    } else {
      // 추가 토큰 구매: 기존 토큰에 추가
      newTokens = currentTokens + tokens;
    }

    // 3. 플랜 만료일 계산 (결제일 + 30일)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일 후

    // 4. Firestore 업데이트
    const updateData = {
      tokenBalance: newTokens,
      plan: newPlan,
      lastChargedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // 플랜 구매 시 만료일 설정 (추가 토큰 구매는 만료일 연장 안함)
    if (planKey !== 'tokens_5000') {
      updateData.planExpiresAt = admin.firestore.Timestamp.fromDate(expiresAt);
      updateData.planStartedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    // 빌링키 저장 (카드 정보 저장)
    if (billingKey) {
      updateData.billingKey = billingKey;
      updateData.billingKeyCreatedAt = admin.firestore.FieldValue.serverTimestamp();
    }
    if (cardInfo) {
      updateData.savedCard = {
        last4: cardInfo.last4 || '',
        brand: cardInfo.brand || '',
        expiryMonth: cardInfo.expiryMonth || '',
        expiryYear: cardInfo.expiryYear || ''
      };
    }

    if (userDoc.exists) {
      await userRef.update(updateData);
    } else {
      // 사용자 문서가 없으면 새로 생성
      await userRef.set({
        ...updateData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log(`✅ 토큰 충전 완료: userId=${userId}, tokens=${newTokens}, plan=${newPlan}, expiresAt=${expiresAt.toISOString()}`);

    return {
      success: true,
      previousTokens: currentTokens,
      newTokens: newTokens,
      previousPlan: currentPlan,
      previousPlanExpiresAt: currentPlanExpiresAt,
      newPlan: newPlan,
      planExpiresAt: expiresAt.toISOString()
    };

  } catch (error) {
    console.error('토큰 충전 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
