// netlify/functions/payment-cancel.js
// 포트원 V2 결제 취소 API + 토큰/플랜 복원

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
    console.log('✅ Firebase Admin 초기화 완료 (payment-cancel)');
  } catch (error) {
    console.error('⚠️ Firebase Admin 초기화 실패:', error.message);
  }
}

const db = admin.firestore();
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
    const { paymentId, reason, userId, isAdmin } = JSON.parse(event.body);

    console.log('💳 결제 취소 요청:', { paymentId, reason, userId, isAdmin });

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

    // 🔒 1. 결제 정보 조회 및 권한 검증
    const paymentDoc = await db.collection('payments').doc(paymentId).get();

    if (!paymentDoc.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: '결제 정보를 찾을 수 없습니다.' })
      };
    }

    const paymentData = paymentDoc.data();

    // 이미 취소된 결제인지 확인
    if (paymentData.status === 'cancelled') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '이미 취소된 결제입니다.' })
      };
    }

    // 🔒 권한 검증: 본인 또는 관리자만 취소 가능
    const ADMIN_USER_IDS = ['708eric_hanmail_net'];
    const isAdminUser = isAdmin && ADMIN_USER_IDS.includes(userId);

    if (!isAdminUser && paymentData.userId !== userId) {
      console.error('❌ 권한 없음:', { requestUserId: userId, paymentUserId: paymentData.userId });
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: '이 결제를 취소할 권한이 없습니다.' })
      };
    }

    // 🔒 2. 포트원 V2 결제 취소 API 호출
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

    // 🔒 3. 토큰/플랜 복원
    const targetUserId = paymentData.userId;
    const previousState = paymentData.previousState || {};

    let restoredTokens = null;
    let restoredPlan = null;

    if (targetUserId && previousState) {
      try {
        const userRef = db.collection('users').doc(targetUserId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const currentUserData = userDoc.data();

          // 복원할 값 계산
          // 토큰: 현재 토큰에서 충전된 토큰을 차감 (음수가 되면 0)
          const chargedTokens = paymentData.tokens || 0;
          const currentTokens = currentUserData.tokenBalance || 0;
          restoredTokens = Math.max(0, currentTokens - chargedTokens);

          // 플랜: 이전 플랜으로 복원 (previousState가 있으면)
          restoredPlan = previousState.plan || currentUserData.plan;

          const updateData = {
            tokenBalance: restoredTokens,
            plan: restoredPlan,
            lastCancelledAt: admin.firestore.FieldValue.serverTimestamp()
          };

          // 이전 플랜 만료일 복원 (있으면)
          if (previousState.planExpiresAt) {
            updateData.planExpiresAt = new Date(previousState.planExpiresAt);
          } else if (restoredPlan === 'free') {
            // 무료 플랜으로 복원 시 만료일 제거
            updateData.planExpiresAt = null;
          }

          await userRef.update(updateData);

          console.log('✅ 토큰/플랜 복원 완료:', {
            userId: targetUserId,
            previousTokens: currentTokens,
            restoredTokens: restoredTokens,
            restoredPlan: restoredPlan
          });
        }
      } catch (restoreError) {
        console.error('⚠️ 토큰/플랜 복원 실패 (결제는 취소됨):', restoreError);
        // 결제 취소는 성공했으므로 계속 진행
      }
    }

    // 🔒 4. 결제 상태 업데이트
    await db.collection('payments').doc(paymentId).update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: userId || 'unknown',
      cancelReason: reason || '관리자 취소',
      restoredState: {
        tokens: restoredTokens,
        plan: restoredPlan
      }
    });

    // 🔒 5. 취소 로그 기록
    await db.collection('credit_logs').add({
      userId: targetUserId,
      action: 'payment_cancelled',
      tokensDeducted: paymentData.tokens || 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        paymentId: paymentId,
        planKey: paymentData.planKey,
        amount: paymentData.amount,
        reason: reason || '관리자 취소',
        cancelledBy: userId || 'unknown',
        previousTokens: paymentData.previousState?.tokens,
        restoredTokens: restoredTokens,
        restoredPlan: restoredPlan
      }
    });

    console.log('✅ 결제 취소 완료:', paymentId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '결제가 취소되었습니다.',
        cancellation: result.cancellation || result,
        restored: {
          tokens: restoredTokens,
          plan: restoredPlan
        }
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
