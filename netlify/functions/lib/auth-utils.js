// netlify/functions/lib/auth-utils.js
// 서버 측 인증 및 토큰 관리 유틸리티

const admin = require('firebase-admin');

// Firebase Admin 초기화 (싱글톤)
function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return admin.apps[0];
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.error('Firebase 환경변수 누락');
        return null;
    }

    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\n/g, '\n')
        }),
        storageBucket: `${projectId}.firebasestorage.app`
    });
}

// 토큰 비용 상수
const TOKEN_COSTS = {
    lookbook: 200,
    hairTry: 350,
    chatbot: 10,
    faceSwap: 300,
    video5sec: 500,
    video8sec: 800,
    imageTransform: 200
};

// 사용자 인증 및 토큰 잔액 확인
async function validateUserAndTokens(userId, feature) {
    try {
        if (!userId) {
            return { success: false, canUse: false, error: '로그인이 필요합니다', errorCode: 'AUTH_REQUIRED' };
        }

        const cost = TOKEN_COSTS[feature];
        if (!cost) {
            return { success: false, canUse: false, error: '알 수 없는 기능: ' + feature, errorCode: 'UNKNOWN_FEATURE' };
        }

        const app = initializeFirebaseAdmin();
        if (!app) {
            return { success: false, canUse: false, error: '서버 설정 오류', errorCode: 'SERVER_ERROR' };
        }

        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return { success: false, canUse: false, error: '사용자를 찾을 수 없습니다', errorCode: 'USER_NOT_FOUND' };
        }

        const userData = userDoc.data();
        const currentBalance = userData.tokenBalance || 0;
        const canUse = currentBalance >= cost;

        return {
            success: true,
            canUse: canUse,
            currentBalance: currentBalance,
            requiredTokens: cost,
            shortfall: canUse ? 0 : cost - currentBalance,
            userData: userData,
            userRef: userDoc.ref
        };
    } catch (error) {
        console.error('인증/토큰 검증 실패:', error);
        return { success: false, canUse: false, error: error.message, errorCode: 'VALIDATION_ERROR' };
    }
}

// 토큰 차감
async function deductTokens(userId, feature, metadata = {}) {
    try {
        const cost = TOKEN_COSTS[feature];
        if (!cost) return { success: false, error: '알 수 없는 기능: ' + feature };

        const app = initializeFirebaseAdmin();
        if (!app) return { success: false, error: '서버 설정 오류' };

        const db = admin.firestore();
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) return { success: false, error: '사용자를 찾을 수 없습니다' };

        const currentBalance = userDoc.data().tokenBalance || 0;
        if (currentBalance < cost) {
            return { success: false, error: '토큰이 부족합니다', currentBalance: currentBalance, required: cost };
        }

        const newBalance = currentBalance - cost;
        await userRef.update({ tokenBalance: newBalance });

        await db.collection('credit_logs').add({
            userId: userId,
            action: 'deduct',
            feature: feature,
            amount: -cost,
            previousBalance: currentBalance,
            newBalance: newBalance,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            metadata: metadata,
            source: 'server'
        });

        console.log('토큰 차감: ' + userId + ' | ' + feature + ' | ' + currentBalance + ' -> ' + newBalance);
        return { success: true, previousBalance: currentBalance, newBalance: newBalance, deducted: cost };
    } catch (error) {
        console.error('토큰 차감 실패:', error);
        return { success: false, error: error.message };
    }
}

// 토큰 복원 (API 실패 시)
async function refundTokens(userId, feature, reason = 'API 호출 실패') {
    try {
        const cost = TOKEN_COSTS[feature];
        if (!cost) return { success: false, error: '알 수 없는 기능: ' + feature };

        const app = initializeFirebaseAdmin();
        if (!app) return { success: false, error: '서버 설정 오류' };

        const db = admin.firestore();
        const userRef = db.collection('users').doc(userId);

        await userRef.update({ tokenBalance: admin.firestore.FieldValue.increment(cost) });

        await db.collection('credit_logs').add({
            userId: userId,
            action: 'refund',
            feature: feature,
            amount: cost,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            reason: reason,
            source: 'server'
        });

        const updatedDoc = await userRef.get();
        const newBalance = updatedDoc.data().tokenBalance || 0;

        console.log('토큰 복원: ' + userId + ' | ' + feature + ' | +' + cost + ' (' + reason + ')');
        return { success: true, newBalance: newBalance, restored: cost };
    } catch (error) {
        console.error('토큰 복원 실패:', error);
        return { success: false, error: error.message };
    }
}

// 표준 에러 응답
function errorResponse(statusCode, error, extra = {}) {
    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ success: false, error, ...extra })
    };
}

module.exports = {
    initializeFirebaseAdmin,
    TOKEN_COSTS,
    validateUserAndTokens,
    deductTokens,
    refundTokens,
    errorResponse
};
