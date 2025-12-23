// netlify/functions/token-api.js
//
// ⚠️ DEPRECATED (2025-12-23): 이 파일은 더 이상 사용되지 않습니다.
// 토큰 시스템이 Bullnabi API (_users.tokenBalance)로 마이그레이션되었습니다.
// 사용: bullnabi-proxy.js의 getTokenBalance, setTokenBalance, deductTokenBalance actions
//
// 이전: Firebase Firestore user_tokens 컬렉션 사용
// 현재: Bullnabi API http://drylink.ohmyapp.io/bnb/ 사용

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
    console.log('✅ Firebase Admin 초기화 완료 (token-api)');
  } catch (error) {
    console.error('⚠️ Firebase Admin 초기화 실패:', error.message);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// 토큰 비용 상수
const TOKEN_COSTS = {
  lookbook: 200,
  hairTry: 300,
  chatbot: 10
};

// 요금제별 토큰 (결제 시 사용)
const PLANS = {
  basic: { price: 22000, tokens: 10000 },
  standard: { price: 38000, tokens: 18000 },
  business: { price: 50000, tokens: 25000 },
  tokens_5000: { price: 5000, tokens: 5000 }
};

/**
 * 토큰 잔액 조회
 */
async function getTokenBalance(userId) {
  try {
    if (!db) {
      return { success: false, error: 'Firestore not initialized' };
    }

    const docRef = db.collection('user_tokens').doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      // 신규 사용자: 0 토큰
      return {
        success: true,
        tokenBalance: 0,
        isNewUser: true
      };
    }

    const data = doc.data();
    return {
      success: true,
      tokenBalance: data.tokenBalance || 0,
      updatedAt: data.updatedAt?.toDate?.() || null
    };
  } catch (error) {
    console.error('❌ 토큰 잔액 조회 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 토큰 차감
 */
async function deductTokens(userId, amount, action, metadata = {}) {
  try {
    if (!db) {
      return { success: false, error: 'Firestore not initialized' };
    }

    const docRef = db.collection('user_tokens').doc(userId);

    // 트랜잭션으로 안전하게 차감
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      let currentBalance = 0;
      if (doc.exists) {
        currentBalance = doc.data().tokenBalance || 0;
      }

      if (currentBalance < amount) {
        throw new Error('INSUFFICIENT_TOKENS');
      }

      const newBalance = currentBalance - amount;

      transaction.set(docRef, {
        tokenBalance: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        previousBalance: currentBalance,
        deducted: amount,
        newBalance: newBalance
      };
    });

    // 사용 로그 저장
    await db.collection('token_logs').add({
      userId: userId,
      action: action,
      tokensUsed: amount,
      previousBalance: result.previousBalance,
      newBalance: result.newBalance,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: metadata
    });

    console.log(`✅ 토큰 차감 완료: userId=${userId}, action=${action}, deducted=${amount}, newBalance=${result.newBalance}`);

    return {
      success: true,
      ...result
    };
  } catch (error) {
    if (error.message === 'INSUFFICIENT_TOKENS') {
      console.log(`⚠️ 토큰 부족: userId=${userId}, action=${action}, required=${amount}`);
      return { success: false, error: '토큰이 부족합니다', code: 'INSUFFICIENT_TOKENS' };
    }
    console.error('❌ 토큰 차감 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 토큰 충전 (결제 완료 후)
 */
async function addTokens(userId, amount, reason, metadata = {}) {
  try {
    if (!db) {
      return { success: false, error: 'Firestore not initialized' };
    }

    const docRef = db.collection('user_tokens').doc(userId);

    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      let currentBalance = 0;
      if (doc.exists) {
        currentBalance = doc.data().tokenBalance || 0;
      }

      const newBalance = currentBalance + amount;

      transaction.set(docRef, {
        tokenBalance: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      return {
        previousBalance: currentBalance,
        added: amount,
        newBalance: newBalance
      };
    });

    // 충전 로그 저장
    await db.collection('token_logs').add({
      userId: userId,
      action: 'charge',
      tokensAdded: amount,
      previousBalance: result.previousBalance,
      newBalance: result.newBalance,
      reason: reason,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: metadata
    });

    console.log(`✅ 토큰 충전 완료: userId=${userId}, added=${amount}, newBalance=${result.newBalance}`);

    return {
      success: true,
      ...result
    };
  } catch (error) {
    console.error('❌ 토큰 충전 실패:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 토큰 사용 가능 여부 확인
 */
async function canUseFeature(userId, feature) {
  const cost = TOKEN_COSTS[feature];
  if (!cost) {
    return { success: false, error: `Unknown feature: ${feature}` };
  }

  const balanceResult = await getTokenBalance(userId);
  if (!balanceResult.success) {
    return balanceResult;
  }

  const canUse = balanceResult.tokenBalance >= cost;
  return {
    success: true,
    canUse: canUse,
    currentBalance: balanceResult.tokenBalance,
    requiredTokens: cost,
    shortfall: canUse ? 0 : cost - balanceResult.tokenBalance
  };
}

// ========== 메인 핸들러 ==========

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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
    const { action, userId, feature, amount, reason, metadata } = JSON.parse(event.body);

    console.log('📝 Token API 요청:', { action, userId, feature, amount });

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'userId is required' })
      };
    }

    let result;

    switch (action) {
      case 'getBalance':
        result = await getTokenBalance(userId);
        break;

      case 'deduct':
        if (!feature && !amount) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'feature or amount is required' })
          };
        }
        const deductAmount = amount || TOKEN_COSTS[feature];
        if (!deductAmount) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: `Unknown feature: ${feature}` })
          };
        }
        result = await deductTokens(userId, deductAmount, feature || 'custom', metadata || {});
        break;

      case 'add':
        if (!amount) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'amount is required' })
          };
        }
        result = await addTokens(userId, amount, reason || 'manual', metadata || {});
        break;

      case 'canUse':
        if (!feature) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'feature is required' })
          };
        }
        result = await canUseFeature(userId, feature);
        break;

      case 'getCosts':
        result = { success: true, costs: TOKEN_COSTS, plans: PLANS };
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: `Unknown action: ${action}` })
        };
    }

    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Token API 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
