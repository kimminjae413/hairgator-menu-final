// netlify/functions/payment-verify.js
// 포트원 V2 결제 검증 및 토큰 충전 (Bullnabi API 사용)

const admin = require('firebase-admin');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

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

    const { paymentId, planKey, userId, userName } = JSON.parse(event.body);

    console.log('💳 결제 검증 요청:', { paymentId, planKey, userId, userName });

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

    // 5. Bullnabi API로 토큰 충전 + 플랜 업그레이드
    const chargeResult = await chargeTokens(userId, plan.tokens, planKey);

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
      userName: userName || '', // 사용자 이름 저장
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
 * Bullnabi API를 통한 토큰 충전 + 플랜 업그레이드
 */
async function chargeTokens(userId, tokens, planKey) {
  try {
    // 1. 어드민 토큰 가져오기 (환경변수 또는 로그인)
    let adminToken = process.env.BULLNABI_TOKEN;
    if (!adminToken) {
      const loginResult = await refreshBullnabiToken();
      if (!loginResult.success) {
        throw new Error('Bullnabi 토큰 발급 실패');
      }
      adminToken = loginResult.token;
    }

    // 2. 현재 사용자 데이터 조회
    const userData = await getBullnabiUserData(adminToken, userId);
    let currentTokens = 0;
    let currentPlan = 'free';
    if (userData.success && userData.data?.[0]) {
      currentTokens = userData.data[0].tokenBalance || 0;
      currentPlan = userData.data[0].plan || 'free';
    }

    const newTokens = currentTokens + tokens;

    // 플랜 결정: 추가 토큰 구매(tokens_5000)가 아니면 해당 플랜으로 업그레이드
    // 플랜 우선순위: business > pro > basic > free
    const planPriority = { 'free': 0, 'basic': 1, 'pro': 2, 'business': 3, 'tokens_5000': -1 };
    let newPlan = currentPlan;

    if (planKey !== 'tokens_5000') {
      if ((planPriority[planKey] || 0) >= (planPriority[currentPlan] || 0)) {
        newPlan = planKey;
      }
    }

    // 3. Bullnabi API로 토큰 업데이트
    const updateData = {
      "_id": { "$oid": userId },
      "tokenBalance": newTokens,
      "plan": newPlan
    };

    const updateParams = new URLSearchParams();
    updateParams.append('metaCode', '_users');
    updateParams.append('collectionName', '_users');
    updateParams.append('documentJson', JSON.stringify(updateData));

    const FormData = require('form-data');
    const updateFormData = new FormData();

    const updateResponse = await fetch(
      `http://drylink.ohmyapp.io/bnb/update?${updateParams.toString()}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Accept': 'application/json',
          ...updateFormData.getHeaders()
        },
        body: updateFormData
      }
    );

    const updateResult = await updateResponse.json();

    if (updateResult.code === '1' || updateResult.code === 1 || updateResult.success) {
      console.log(`✅ 토큰 충전 완료: userId=${userId}, added=${tokens}, newBalance=${newTokens}, plan=${newPlan}`);

      return {
        success: true,
        previousTokens: currentTokens,
        newTokens: newTokens,
        previousPlan: currentPlan,
        newPlan: newPlan
      };
    }

    throw new Error('Bullnabi API 업데이트 실패');

  } catch (error) {
    console.error('토큰 충전 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Bullnabi 토큰 자동 갱신
 */
async function refreshBullnabiToken() {
  try {
    const loginId = process.env.BULLNABI_LOGIN_ID;
    const loginPw = process.env.BULLNABI_LOGIN_PW;

    if (!loginId || !loginPw) {
      return { success: false, error: 'Missing login credentials' };
    }

    const documentJson = {
      loginId: loginId,
      loginPw: loginPw,
      isShortToken: true
    };

    const params = new URLSearchParams();
    params.append('metaCode', '_users');
    params.append('documentJson', JSON.stringify(documentJson));

    const FormData = require('form-data');
    const formData = new FormData();

    const response = await fetch(
      `http://drylink.ohmyapp.io/bnb/emailLogin?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...formData.getHeaders()
        },
        body: formData
      }
    );

    const result = await response.json();

    if (result.code === '1' && result.token) {
      return { success: true, token: result.token };
    }

    return { success: false, error: 'Login failed' };

  } catch (error) {
    console.error('Bullnabi 토큰 갱신 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Bullnabi 사용자 데이터 조회
 */
async function getBullnabiUserData(adminToken, userId) {
  try {
    const documentJson = { "_id": { "$oid": userId } };
    const projectionJson = { "tokenBalance": 1, "plan": 1 };

    const params = new URLSearchParams();
    params.append('metaCode', '_users');
    params.append('collectionName', '_users');
    params.append('documentJson', JSON.stringify(documentJson));
    params.append('projectionJson', JSON.stringify(projectionJson));

    const FormData = require('form-data');
    const formData = new FormData();

    const response = await fetch(
      `http://drylink.ohmyapp.io/bnb/find?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Accept': 'application/json',
          ...formData.getHeaders()
        }
      }
    );

    const result = await response.json();

    if (result.code === '1' && result.documents) {
      return { success: true, data: result.documents };
    }

    return { success: false, error: 'User not found' };

  } catch (error) {
    console.error('Bullnabi 사용자 조회 오류:', error);
    return { success: false, error: error.message };
  }
}
