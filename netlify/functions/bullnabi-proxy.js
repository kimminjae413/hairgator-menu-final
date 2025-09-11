// netlify/functions/bullnabi-proxy.js
// Netlify Functions를 통한 불나비 API 프록시

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 요청 파라미터 파싱
    const { userId } = JSON.parse(event.body);
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId is required' })
      };
    }

    console.log('🔍 불나비 API 호출 시작:', userId);

    // 불나비 API 토큰
    const token = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlcmljNzA4QG5hdmVyLmNvbSIsImxvZ2luVXNlckluZm8iOiJ7IFwiX2lkXCIgOiB7IFwiJG9pZFwiIDogXCI2NTgzYTNhYzJjZDFjYWM4YWUyZTgzYzFcIiB9LCBcImlkXCIgOiBcImVyaWM3MDhAbmF2ZXIuY29tXCIsIFwiZW1haWxcIiA6IFwiZXJpYzcwOEBuYXZlci5jb21cIiwgXCJuYW1lXCIgOiBcIuq5gOuvvOyerFwiLCBcIm5pY2tuYW1lXCIgOiBudWxsLCBcInN0YXR1c1wiIDogXCJhZG1pblwiLCBcIl9zZXJ2aWNlTmFtZVwiIDogXCJkcnlsaW5rXCIsIFwiX3NlcnZpY2VBcHBOYW1lXCIgOiBcIuuTnOudvOydtOunge2BrCDrlJTsnpHsnbTrhIjsmqlcIiwgXCJvc1R5cGVcIiA6IFwiaU9TXCIgfSIsImV4cCI6MTc1ODAxODIzNn0.ZXuCaGQEynAPQXhptlYkzne4cQr7CK_JhrX8jJovD2k';

    // 불나비 API 호출
    const response = await fetch('https://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metaCode: "_users",
        collectionName: "_users",
        documentJson: {
          pipeline: {
            "$match": {"_id": {"$eq": {"$oid": userId}}},
            "$project": {"remainCount": 1, "nickname": 1, "email": 1, "name": 1}
          }
        }
      })
    });

    console.log('📡 불나비 API 응답 상태:', response.status);

    if (!response.ok) {
      throw new Error(`불나비 API 오류: ${response.status}`);
    }

    const result = await response.json();
    console.log('📋 불나비 API 응답 데이터:', result);

    // 응답 데이터 구조 확인 및 변환
    let userData = null;
    
    if (result.body && result.body.length > 0) {
      userData = result.body[0];
    } else if (result.data && result.data.length > 0) {
      userData = result.data[0];
    } else {
      console.error('❌ 사용자 데이터를 찾을 수 없음:', result);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'User not found',
          userId: userId,
          rawResponse: result
        })
      };
    }

    // HAIRGATOR용 사용자 정보 변환
    const userInfo = {
      id: userData._id?.$oid || userId,
      name: userData.name || userData.nickname || '사용자',
      email: userData.email || 'user@bullnabi.com',
      remainCount: userData.remainCount || 0
    };

    console.log('✅ 변환된 사용자 정보:', userInfo);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userInfo: userInfo,
        rawData: userData
      })
    };

  } catch (error) {
    console.error('❌ 프록시 서버 오류:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};// netlify/functions/bullnabi-proxy.js
// Netlify Functions를 통한 불나비 API 프록시

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 요청 파라미터 파싱
    const { userId } = JSON.parse(event.body);
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId is required' })
      };
    }

    console.log('불나비 API 호출 시작:', userId);

    // 불나비 API 호출
    const token = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlcmljNzA4QG5hdmVyLmNvbSIsImxvZ2luVXNlckluZm8iOiJ7IFwiX2lkXCIgOiB7IFwiJG9pZFwiIDogXCI2NTgzYTNhYzJjZDFjYWM4YWUyZTgzYzFcIiB9LCBcImlkXCIgOiBcImVyaWM3MDhAbmF2ZXIuY29tXCIsIFwiZW1haWxcIiA6IFwiZXJpYzcwOEBuYXZlci5jb21cIiwgXCJuYW1lXCIgOiBcIuq5gOuvvOyerFwiLCBcIm5pY2tuYW1lXCIgOiBudWxsLCBcInN0YXR1c1wiIDogXCJhZG1pblwiLCBcIl9zZXJ2aWNlTmFtZVwiIDogXCJkcnlsaW5rXCIsIFwiX3NlcnZpY2VBcHBOYW1lXCIgOiBcIuuTnOudvOydtOunge2BrCDrlJTsnpHsn
