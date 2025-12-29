// netlify/functions/identity-verify.js
// 본인인증 결과 검증 및 Firestore에 사용자 정보 저장

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
    const { identityVerificationId, userId } = JSON.parse(event.body);

    if (!identityVerificationId || !userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'identityVerificationId와 userId가 필요합니다.' })
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

    console.log('🔐 본인인증 검증 요청:', { identityVerificationId, userId });

    // 1. 포트원 API로 본인인증 결과 조회
    const verifyResponse = await fetch(
      `${PORTONE_API_URL}/identity-verifications/${encodeURIComponent(identityVerificationId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `PortOne ${apiSecret}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      console.error('본인인증 조회 실패:', errorData);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '본인인증 정보를 조회할 수 없습니다.', details: errorData })
      };
    }

    const verifyResult = await verifyResponse.json();
    console.log('본인인증 결과:', JSON.stringify(verifyResult, null, 2));

    // 2. 인증 상태 확인
    const status = verifyResult.status;
    if (status !== 'VERIFIED') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '본인인증이 완료되지 않았습니다.', status: status })
      };
    }

    // 3. 인증된 정보 추출
    const verifiedCustomer = verifyResult.verifiedCustomer || {};
    const verifiedName = verifiedCustomer.name || '';
    const verifiedPhone = verifiedCustomer.phoneNumber || '';
    const verifiedBirthDate = verifiedCustomer.birthDate || '';
    const verifiedGender = verifiedCustomer.gender || '';
    const ci = verifiedCustomer.ci || '';  // 연계정보 (CI)
    const di = verifiedCustomer.di || '';  // 중복가입확인정보 (DI)

    if (!verifiedName || !verifiedPhone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '인증된 이름 또는 전화번호가 없습니다.' })
      };
    }

    // 전화번호 포맷팅 (01012345678 → 010-1234-5678)
    const formattedPhone = formatPhoneNumber(verifiedPhone);

    console.log('인증된 정보:', { name: verifiedName, phone: formattedPhone });

    // 4. Firestore에 사용자 정보 업데이트
    const userRef = db.collection('users').doc(userId);

    await userRef.set({
      // 본인인증 정보
      identityVerified: true,
      identityVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      identityVerificationId: identityVerificationId,
      verifiedName: verifiedName,
      verifiedPhone: formattedPhone,
      verifiedBirthDate: verifiedBirthDate,
      verifiedGender: verifiedGender,
      // CI/DI는 보안상 저장하지 않거나 암호화 필요
      // ci: ci,
      // di: di,

      // displayName도 업데이트 (기존에 없으면)
      name: admin.firestore.FieldValue.serverTimestamp() ? verifiedName : undefined,
      phone: formattedPhone
    }, { merge: true });

    // name 필드 별도 업데이트 (조건부)
    const userDoc = await userRef.get();
    if (!userDoc.exists || !userDoc.data().name) {
      await userRef.update({
        name: verifiedName
      });
    }

    console.log('✅ 본인인증 정보 저장 완료:', userId);

    // 5. 본인인증 로그 기록
    await db.collection('identity_logs').add({
      userId: userId,
      identityVerificationId: identityVerificationId,
      verifiedName: verifiedName,
      verifiedPhone: formattedPhone,
      status: 'verified',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: '본인인증이 완료되었습니다.',
        name: verifiedName,
        phone: formattedPhone
      })
    };

  } catch (error) {
    console.error('본인인증 검증 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || '본인인증 검증 중 오류가 발생했습니다.' })
    };
  }
};

/**
 * 전화번호 포맷팅
 * @param {string} phone - 원본 전화번호 (01012345678)
 * @returns {string} 포맷된 전화번호 (010-1234-5678)
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';

  // 숫자만 추출
  const numbers = phone.replace(/[^0-9]/g, '');

  // 010-XXXX-XXXX 형식
  if (numbers.length === 11 && numbers.startsWith('010')) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  }

  // 02-XXXX-XXXX 형식 (서울)
  if (numbers.length === 10 && numbers.startsWith('02')) {
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }

  // 기타 지역번호
  if (numbers.length === 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  }

  return phone;
}
