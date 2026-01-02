// 배치 스타일 AI 분석 업데이트용 Netlify Function
// Firebase Admin SDK 사용

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

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { doc_id, ai_analysis } = JSON.parse(event.body);

    if (!doc_id || !ai_analysis) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'doc_id and ai_analysis required' })
      };
    }

    console.log(`📝 스타일 AI 분석 업데이트: ${doc_id}`);

    // Firestore 업데이트
    await db.collection('hairstyles').doc(doc_id).update({
      aiAnalysis: ai_analysis,
      aiAnalysisUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ 업데이트 완료: ${doc_id}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, doc_id })
    };

  } catch (error) {
    console.error('❌ 업데이트 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
