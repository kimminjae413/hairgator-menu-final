const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { userId } = JSON.parse(event.body || '{}');
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId is required' })
      };
    }

    console.log('[Bullnabi Proxy] 사용자 정보 요청:', userId);

    const token = process.env.BULLNABI_TOKEN || 
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlcmljNzA4QG5hdmVyLmNvbSIsImxvZ2luVXNlckluZm8iOiJ7IFwiX2lkXCIgOiB7IFwiJG9pZFwiIDogXCI2NTgzYTNhYzJjZDFjYWM4YWUyZTgzYzFcIiB9LCBcImlkXCIgOiBcImVyaWM3MDhAbmF2ZXIuY29tXCIsIFwiZW1haWxcIiA6IFwiZXJpYzcwOEBuYXZlci5jb21cIiwgXCJuYW1lXCIgOiBcIuq5gOuvvOyerFwiLCBcIm5pY2tuYW1lXCIgOiBudWxsLCBcInN0YXR1c1wiIDogXCJhZG1pblwiLCBcIl9zZXJ2aWNlTmFtZVwiIDogXCJkcnlsaW5rXCIsIFwiX3NlcnZpY2VBcHBOYW1lXCIgOiBcIuuTnOudvOydtOunge2BrCDrlJTsnpHsnbTrhIjsmqlcIiwgXCJvc1R5cGVcIiA6IFwiaU9TXCIgfSIsImV4cCI6MTc1ODAxODIzNn0.ZXuCaGQEynAPQXhptlYkzne4cQr7CK_JhrX8jJovD2k';

    // URLSearchParams 사용 (form-data 의존성 제거)
    const params = new URLSearchParams();
    params.append('metaCode', '_users');
    params.append('collectionName', '_users');
    params.append('documentJson', JSON.stringify({
      pipeline: {
        "$match": {"_id": {"$eq": {"$oid": userId}}},
        "$project": {"remainCount": 1, "nickname": 1, "email": 1, "name": 1}
      }
    }));

    const response = await fetch('https://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('[Bullnabi Proxy] API 응답 상태:', response.status);

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const result = await response.json();
    console.log('[Bullnabi Proxy] API 응답 데이터:', result);

    let userData = null;
    
    if (result.body && result.body.length > 0) {
      userData = result.body[0];
    } else if (result.data && result.data.length > 0) {
      userData = result.data[0];
    } else {
      console.log('[Bullnabi Proxy] 사용자 데이터 없음, 기본값 사용');
      // 사용자를 찾지 못한 경우 기본값 반환
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          userInfo: {
            id: userId,
            name: '김민재',
            email: 'kimmin@bullnabi.com',
            remainCount: 42
          }
        })
      };
    }

    const userInfo = {
      id: userData._id?.$oid || userId,
      name: userData.name || userData.nickname || '김민재',
      email: userData.email || 'kimmin@bullnabi.com',
      remainCount: userData.remainCount || 42
    };

    console.log('[Bullnabi Proxy] 최종 사용자 정보:', userInfo);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userInfo: userInfo
      })
    };

  } catch (error) {
    console.error('[Bullnabi Proxy] 오류:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
