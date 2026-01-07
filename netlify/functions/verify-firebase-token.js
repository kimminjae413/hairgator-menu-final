// Firebase ID Token 검증 및 Custom Token 발급
// Flutter 앱에서 WebView로 자동 로그인할 때 사용

const admin = require('firebase-admin');

// Firebase Admin 초기화 (싱글톤)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

exports.handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Preflight 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { idToken } = JSON.parse(event.body || '{}');

    if (!idToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'idToken is required' }),
      };
    }

    console.log('[verify-firebase-token] ID Token 검증 시작...');

    // Firebase ID Token 검증
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const kakaoId = decodedToken.kakaoId;
    const displayName = decodedToken.displayName;
    const photoURL = decodedToken.photoURL;
    const provider = decodedToken.provider;

    console.log(`[verify-firebase-token] 검증 성공: uid=${uid}, email=${email}, kakaoId=${kakaoId}`);

    // Custom Token 발급 - 원본 claims 유지!
    const additionalClaims = {};
    if (email) additionalClaims.email = email;
    if (kakaoId) additionalClaims.kakaoId = kakaoId;
    if (displayName) additionalClaims.displayName = displayName;
    if (photoURL) additionalClaims.photoURL = photoURL;
    if (provider) additionalClaims.provider = provider;

    const customToken = await admin.auth().createCustomToken(uid, additionalClaims);

    console.log('[verify-firebase-token] Custom Token 발급 완료 (claims 포함):', Object.keys(additionalClaims));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customToken,
        uid,
        email,
      }),
    };
  } catch (error) {
    console.error('[verify-firebase-token] 에러:', error);

    // 토큰 만료 등의 에러 처리
    if (error.code === 'auth/id-token-expired') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token expired', code: error.code }),
      };
    }

    if (error.code === 'auth/invalid-id-token') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token', code: error.code }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
