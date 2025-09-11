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

    console.log('[Bullnabi Proxy] 실제 API 호출 시작:', userId);

    // 환경변수 또는 기본 토큰
    const token = process.env.BULLNABI_TOKEN || 
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlcmljNzA4QG5hdmVyLmNvbSIsImxvZ2luVXNlckluZm8iOiJ7IFwiX2lkXCIgOiB7IFwiJG9pZFwiIDogXCI2NTgzYTNhYzJjZDFjYWM4YWUyZTgzYzFcIiB9LCBcImlkXCIgOiBcImVyaWM3MDhAbmF2ZXIuY29tXCIsIFwiZW1haWxcIiA6IFwiZXJpYzcwOEBuYXZlci5jb21cIiwgXCJuYW1lXCIgOiBcIuq5gOuvvOyerFwiLCBcIm5pY2tuYW1lXCIgOiBudWxsLCBcInN0YXR1c1wiIDogXCJhZG1pblwiLCBcIl9zZXJ2aWNlTmFtZVwiIDogXCJkcnlsaW5rXCIsIFwiX3NlcnZpY2VBcHBOYW1lXCIgOiBcIuuTnOudvOydtOunge2BrCDrlJTsnpHsnbTrhIjsmqlcIiwgXCJvc1R5cGVcIiA6IFwiaU9TXCIgfSIsImV4cCI6MTc1ODAxODIzNn0.ZXuCaGQEynAPQXhptlYkzne4cQr7CK_JhrX8jJovD2k';

    // URLSearchParams로 요청 데이터 구성
    const params = new URLSearchParams();
    params.append('metaCode', '_users');
    params.append('collectionName', '_users');
    params.append('documentJson', JSON.stringify({
      pipeline: {
        "$match": {"_id": {"$eq": {"$oid": userId}}},
        "$project": {"remainCount": 1, "nickname": 1, "email": 1, "name": 1}
      }
    }));

    console.log('[Bullnabi Proxy] 요청 데이터:', {
      metaCode: '_users',
      collectionName: '_users',
      userId: userId
    });

    // fetch 호출 (Node.js 18+는 네이티브 fetch 지원)
    const response = await fetch('https://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('[Bullnabi Proxy] API 응답 상태:', response.status);
    console.log('[Bullnabi Proxy] API 응답 헤더:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('[Bullnabi Proxy] API 응답 실패:', response.status, response.statusText);
      
      // API 실패 시 fallback 데이터 반환
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          userInfo: {
            id: userId,
            name: '김민재 (API 실패)',
            email: 'fallback@example.com',
            remainCount: 0
          },
          note: 'API 호출 실패로 기본값 사용'
        })
      };
    }

    const result = await response.json();
    console.log('[Bullnabi Proxy] API 응답 데이터:', JSON.stringify(result, null, 2));

    // 응답 데이터 구조 분석
    let userData = null;
    
    if (result.body && Array.isArray(result.body) && result.body.length > 0) {
      userData = result.body[0];
      console.log('[Bullnabi Proxy] result.body에서 데이터 발견');
    } else if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      userData = result.data[0];
      console.log('[Bullnabi Proxy] result.data에서 데이터 발견');
    } else if (result.recordsTotal > 0 && result.data) {
      userData = result.data[0];
      console.log('[Bullnabi Proxy] recordsTotal 기반 데이터 발견');
    } else {
      console.log('[Bullnabi Proxy] 사용자 데이터 없음. 전체 응답:', result);
      
      // 사용자 데이터 없을 때 상세 정보와 함께 fallback
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          userInfo: {
            id: userId,
            name: '김민재 (데이터 없음)',
            email: 'nodata@example.com',
            remainCount: 0
          },
          debug: {
            hasBody: !!result.body,
            hasData: !!result.data,
            bodyLength: result.body ? result.body.length : 0,
            dataLength: result.data ? result.data.length : 0,
            recordsTotal: result.recordsTotal,
            apiResponse: result
          }
        })
      };
    }

    // 실제 데이터에서 사용자 정보 추출
    const userInfo = {
      id: userData._id?.$oid || userData.id || userId,
      name: userData.name || userData.nickname || '이름없음',
      email: userData.email || 'email@example.com',
      remainCount: userData.remainCount || 0
    };

    console.log('[Bullnabi Proxy] 최종 사용자 정보:', userInfo);

    // 실제 데이터가 비어있는지 확인
    if (!userInfo.name || userInfo.name === '이름없음') {
      console.warn('[Bullnabi Proxy] 사용자 이름 없음, 원본 데이터:', userData);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userInfo: userInfo,
        source: 'real_api'
      })
    };

  } catch (error) {
    console.error('[Bullnabi Proxy] 오류 발생:', error);
    console.error('[Bullnabi Proxy] 오류 스택:', error.stack);

    // 오류 발생 시에도 기본 사용자 정보 반환 (서비스 중단 방지)
    const { userId } = JSON.parse(event.body || '{}');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userInfo: {
          id: userId || '687ae7d51f31a788ab417e2d',
          name: '김민재 (오류)',
          email: 'error@example.com',
          remainCount: 0
        },
        error: error.message,
        source: 'error_fallback'
      })
    };
  }
};
