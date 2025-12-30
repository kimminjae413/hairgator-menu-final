// netlify/functions/billing-key-save.js
// 빌링키 저장 - 클라이언트에서 발급받은 billingKey를 검증 후 Firestore에 저장

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

    console.log('💳 빌링키 저장 요청:', { billingKey: billingKey.substring(0, 20) + '...', userId });

    // 1. 포트원 API로 빌링키 정보 조회
    const billingKeyResponse = await fetch(`${PORTONE_API_URL}/billing-keys/${encodeURIComponent(billingKey)}`, {
      method: 'GET',
      headers: {
        'Authorization': `PortOne ${apiSecret}`,
        'Content-Type': 'application/json'
      }
    });

    if (!billingKeyResponse.ok) {
      const errorData = await billingKeyResponse.json();
      console.error('빌링키 조회 실패:', errorData);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '유효하지 않은 빌링키입니다.', details: errorData })
      };
    }

    const billingKeyInfo = await billingKeyResponse.json();
    console.log('빌링키 정보:', JSON.stringify(billingKeyInfo, null, 2));

    // 2. 카드 정보 추출
    const method = billingKeyInfo.methods?.[0] || billingKeyInfo.method || {};
    const card = method.card || {};

    const cardInfo = {
      billingKey: billingKey,
      cardNumber: card.number || card.cardNumber || '****',  // 마스킹된 번호
      cardBrand: card.brand || card.cardBrand || card.issuer?.name || 'CARD',
      cardType: card.type || card.cardType || 'CREDIT',
      expiryYear: card.expiryYear || '',
      expiryMonth: card.expiryMonth || '',
      ownerType: card.ownerType || 'PERSONAL',
      issuedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'ACTIVE'
    };

    // 마지막 4자리 추출
    const lastFour = cardInfo.cardNumber.replace(/[^0-9]/g, '').slice(-4) || '****';
    cardInfo.lastFour = lastFour;
    cardInfo.displayName = `${cardInfo.cardBrand} ****${lastFour}`;

    console.log('저장할 카드 정보:', cardInfo);

    // 3. Firestore에 저장 (users/{userId}/billing_keys/{billingKey})
    const userRef = db.collection('users').doc(userId);
    const billingKeyRef = userRef.collection('billing_keys').doc(billingKey);

    await billingKeyRef.set(cardInfo);

    // 4. 사용자의 기본 카드로 설정 + savedCard 필드 업데이트
    const existingCards = await userRef.collection('billing_keys').where('status', '==', 'ACTIVE').get();

    // savedCard 필드를 사용자 문서에 직접 저장 (마이페이지 표시용)
    await userRef.set({
      billingKey: billingKey,
      billingKeyCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      savedCard: {
        last4: cardInfo.lastFour,
        brand: cardInfo.cardBrand,
        expiryMonth: cardInfo.expiryMonth || '',
        expiryYear: cardInfo.expiryYear || ''
      },
      defaultBillingKey: existingCards.size === 0 ? billingKey : undefined  // 첫 카드면 기본으로 설정
    }, { merge: true });

    console.log('✅ 빌링키 저장 완료:', userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '카드가 저장되었습니다.',
        card: {
          displayName: cardInfo.displayName,
          lastFour: cardInfo.lastFour,
          cardBrand: cardInfo.cardBrand
        }
      })
    };

  } catch (error) {
    console.error('빌링키 저장 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '카드 저장 중 오류가 발생했습니다.' })
    };
  }
};
