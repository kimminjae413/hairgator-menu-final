// netlify/functions/iap-verify.js
// iOS 인앱결제 영수증 검증 및 토큰 충전

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
    console.log('✅ Firebase Admin 초기화 완료 (iap-verify)');
  } catch (error) {
    console.error('⚠️ Firebase Admin 초기화 실패:', error.message);
  }
}

const db = admin.firestore();

// 상품별 토큰 수 (Flutter iap_service.dart와 동일)
const PRODUCT_TOKENS = {
  'hairgator_basic': 10000,
  'hairgator_pro': 18000,
  'hairgator_business': 25000,
  'hairgator_tokens_5000': 5000
};

// 상품별 가격 (KRW)
const PRODUCT_PRICES = {
  'hairgator_basic': 22000,
  'hairgator_pro': 38000,
  'hairgator_business': 50000,
  'hairgator_tokens_5000': 5000
};

// Apple 영수증 검증 URL
const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

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
    const { productId, receipt, platform, userId } = JSON.parse(event.body);

    console.log('🍎 iOS IAP 검증 요청:', { productId, platform, userId, hasReceipt: !!receipt });

    // 필수 파라미터 확인
    if (!productId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'productId is required' })
      };
    }

    // 상품 확인
    const tokens = PRODUCT_TOKENS[productId];
    if (!tokens) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid product ID' })
      };
    }

    // 영수증 검증 (Apple 서버)
    let verified = false;
    let appleResponse = null;

    if (receipt && receipt.length > 0) {
      // App Store 공유 비밀번호 (App Store Connect에서 생성)
      const appSharedSecret = process.env.APPLE_SHARED_SECRET || '';

      // 프로덕션 먼저 시도
      appleResponse = await verifyWithApple(receipt, appSharedSecret, APPLE_VERIFY_URL_PRODUCTION);

      // 샌드박스 응답(21007)이면 샌드박스로 재시도
      if (appleResponse && appleResponse.status === 21007) {
        console.log('🍎 샌드박스 영수증 감지 → 샌드박스 검증');
        appleResponse = await verifyWithApple(receipt, appSharedSecret, APPLE_VERIFY_URL_SANDBOX);
      }

      if (appleResponse && appleResponse.status === 0) {
        verified = true;
        console.log('✅ Apple 영수증 검증 성공');
      } else {
        console.warn('⚠️ Apple 영수증 검증 실패:', appleResponse?.status);
        // 개발 중에는 검증 실패해도 진행 (TODO: 프로덕션에서는 실패 처리)
        verified = true;
      }
    } else {
      // 영수증 없음 - 개발 모드에서는 허용
      console.warn('⚠️ 영수증 없음 - 개발 모드 허용');
      verified = true;
    }

    if (!verified) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Receipt verification failed' })
      };
    }

    // 트랜잭션 ID 추출 (중복 방지용)
    let transactionId = null;
    if (appleResponse?.receipt?.in_app?.length > 0) {
      // 최신 트랜잭션 찾기
      const latestTransaction = appleResponse.receipt.in_app
        .filter(item => item.product_id === productId)
        .sort((a, b) => parseInt(b.purchase_date_ms) - parseInt(a.purchase_date_ms))[0];

      transactionId = latestTransaction?.transaction_id;
    }

    // 트랜잭션 ID가 있으면 중복 체크
    if (transactionId) {
      const existingPayment = await db.collection('iap_transactions').doc(transactionId).get();
      if (existingPayment.exists) {
        console.log('🍎 이미 처리된 트랜잭션:', transactionId);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Already processed',
            tokens: tokens
          })
        };
      }
    }

    // userId가 있으면 토큰 충전
    if (userId) {
      const chargeResult = await chargeTokens(userId, tokens, productId);

      if (!chargeResult.success) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: chargeResult.error })
        };
      }

      // 트랜잭션 기록 (중복 방지)
      const transactionDoc = transactionId || `iap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.collection('iap_transactions').doc(transactionDoc).set({
        transactionId: transactionId,
        productId: productId,
        userId: userId,
        tokens: tokens,
        price: PRODUCT_PRICES[productId],
        platform: 'ios',
        status: 'completed',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 토큰 충전 로그
      await db.collection('credit_logs').add({
        userId: userId,
        action: 'iap_purchase',
        tokensAdded: tokens,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          productId: productId,
          transactionId: transactionId,
          platform: 'ios',
          previousTokens: chargeResult.previousTokens,
          newTokens: chargeResult.newTokens
        }
      });

      console.log('✅ iOS IAP 완료:', {
        userId,
        productId,
        tokens,
        newBalance: chargeResult.newTokens
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          tokens: tokens,
          newBalance: chargeResult.newTokens,
          plan: chargeResult.newPlan
        })
      };
    }

    // userId 없이 검증만 요청한 경우
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        verified: verified,
        tokens: tokens
      })
    };

  } catch (error) {
    console.error('🍎 IAP 검증 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'IAP verification failed',
        detail: error.message
      })
    };
  }
};

/**
 * Apple 서버에 영수증 검증 요청
 */
async function verifyWithApple(receipt, sharedSecret, url) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        'password': sharedSecret,
        'exclude-old-transactions': true
      })
    });

    if (!response.ok) {
      console.error('Apple API 오류:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Apple API 호출 실패:', error);
    return null;
  }
}

/**
 * Firestore에서 직접 토큰 충전 + 플랜 업그레이드
 */
async function chargeTokens(userId, tokens, productId) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    let currentTokens = 0;
    let currentPlan = 'free';

    if (userDoc.exists) {
      const userData = userDoc.data();
      currentTokens = userData.tokenBalance || 0;
      currentPlan = userData.plan || 'free';
    }

    // 플랜 결정
    let newPlan = currentPlan;
    let newTokens = tokens;

    // planKey 추출 (productId에서 'hairgator_' 제거)
    const planKey = productId.replace('hairgator_', '');

    if (planKey !== 'tokens_5000') {
      // 플랜 구매: 해당 플랜으로 설정, 토큰 리셋
      newPlan = planKey;
    } else {
      // 추가 토큰 구매: 기존 토큰에 추가
      newTokens = currentTokens + tokens;
    }

    // 플랜 만료일 계산 (30일)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Firestore 업데이트
    const updateData = {
      tokenBalance: newTokens,
      plan: newPlan,
      lastChargedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (planKey !== 'tokens_5000') {
      updateData.planExpiresAt = admin.firestore.Timestamp.fromDate(expiresAt);
      updateData.planStartedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    if (userDoc.exists) {
      await userRef.update(updateData);
    } else {
      await userRef.set({
        ...updateData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return {
      success: true,
      previousTokens: currentTokens,
      newTokens: newTokens,
      previousPlan: currentPlan,
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
