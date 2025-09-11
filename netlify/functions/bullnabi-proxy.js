const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { userId } = JSON.parse(event.body);
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId is required' })
      };
    }

    // 환경변수에서 토큰 가져오기
    const token = process.env.BULLNABI_TOKEN;
    
    if (!token) {
      console.error('BULLNABI_TOKEN 환경변수가 설정되지 않음');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    console.log('불나비 API 호출:', userId);

    const response = await fetch('https://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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

    console.log('API 응답 상태:', response.status);

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const result = await response.json();
    console.log('API 응답:', result);

    let userData = null;
    
    if (result.body && result.body.length > 0) {
      userData = result.body[0];
    } else if (result.data && result.data.length > 0) {
      userData = result.data[0];
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'User not found',
          userId: userId
        })
      };
    }

    const userInfo = {
      id: userData._id?.$oid || userId,
      name: userData.name || userData.nickname || '사용자',
      email: userData.email || 'user@bullnabi.com',
      remainCount: userData.remainCount || 0
    };

    console.log('변환된 사용자 정보:', userInfo);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userInfo: userInfo
      })
    };

  } catch (error) {
    console.error('프록시 오류:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { userId } = JSON.parse(event.body);
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId is required' })
      };
    }

    console.log('불나비 API 호출:', userId);

    const token = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlcmljNzA4QG5hdmVyLmNvbSIsImxvZ2luVXNlckluZm8iOiJ7IFwiX2lkXCIgOiB7IFwiJG9pZFwiIDogXCI2NTgzYTNhYzJjZDFjYWM4YWUyZTgzYzFcIiB9LCBcImlkXCIgOiBcImVyaWM3MDhAbmF2ZXIuY29tXCIsIFwiZW1haWxcIiA6IFwiZXJpYzcwOEBuYXZlci5jb21cIiwgXCJuYW1lXCIgOiBcIuq5gOuvvOyerFwiLCBcIm5pY2tuYW1lXCIgOiBudWxsLCBcInN0YXR1c1wiIDogXCJhZG1pblwiLCBcIl9zZXJ2aWNlTmFtZVwiIDogXCJkcnlsaW5rXCIsIFwiX3NlcnZpY2VBcHBOYW1lXCIgOiBcIuuTnOudvOydtOunge2BrCDrlJTsnpHsnbTrhIjsmqlcIiwgXCJvc1R5cGVcIiA6IFwiaU9TXCIgfSIsImV4cCI6MTc1ODAxODIzNn0.ZXuCaGQEynAPQXhptlYkzne4cQr7CK_JhrX8jJovD2k';

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

    console.log('API 응답 상태:', response.status);

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const result = await response.json();
    console.log('API 응답:', result);

    let userData = null;
    
    if (result.body && result.body.length > 0) {
      userData = result.body[0];
    } else if (result.data && result.data.length > 0) {
      userData = result.data[0];
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'User not found',
          userId: userId
        })
      };
    }

    const userInfo = {
      id: userData._id?.$oid || userId,
      name: userData.name || userData.nickname || '사용자',
      email: userData.email || 'user@bullnabi.com',
      remainCount: userData.remainCount || 0
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userInfo: userInfo
      })
    };

  } catch (error) {
    console.error('프록시 오류:', error);

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
