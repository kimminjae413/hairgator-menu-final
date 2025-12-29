// netlify/functions/billing-key-delete.js
// 빌링키 삭제 - 저장된 카드 삭제

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

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'DELETE') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { billingKey, userId } = JSON.parse(event.body);

    if (!billingKey || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'billingKey와 userId가 필요합니다.' })
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

    console.log('💳 빌링키 삭제 요청:', { billingKey: billingKey.substring(0, 20) + '...', userId });

    // 1. 포트원 API로 빌링키 삭제
    const deleteResponse = await fetch(`${PORTONE_API_URL}/billing-keys/${encodeURIComponent(billingKey)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `PortOne ${apiSecret}`,
        'Content-Type': 'application/json'
      }
    });

    // 포트원에서 이미 삭제된 경우도 성공으로 처리
    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const errorData = await deleteResponse.json();
      console.error('포트원 빌링키 삭제 실패:', errorData);
      // 포트원 삭제 실패해도 Firestore에서는 삭제 진행
    } else {
      console.log('포트원 빌링키 삭제 성공');
    }

    // 2. Firestore에서 빌링키 삭제 (또는 상태 변경)
    const userRef = db.collection('users').doc(userId);
    const billingKeyRef = userRef.collection('billing_keys').doc(billingKey);

    await billingKeyRef.update({
      status: 'DELETED',
      deletedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. 기본 카드였다면 다른 카드로 변경
    const userDoc = await userRef.get();
    if (userDoc.exists && userDoc.data().defaultBillingKey === billingKey) {
      // 다른 활성 카드 찾기
      const otherCards = await userRef.collection('billing_keys')
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();

      if (!otherCards.empty) {
        await userRef.update({
          defaultBillingKey: otherCards.docs[0].id
        });
      } else {
        await userRef.update({
          defaultBillingKey: admin.firestore.FieldValue.delete()
        });
      }
    }

    console.log('✅ 빌링키 삭제 완료:', userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '카드가 삭제되었습니다.'
      })
    };

  } catch (error) {
    console.error('빌링키 삭제 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '카드 삭제 중 오류가 발생했습니다.' })
    };
  }
};
