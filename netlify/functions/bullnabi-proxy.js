// netlify/functions/bullnabi-proxy.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
  
  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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
    // 단순한 userId 요청인지 확인 (HAIRGATOR 자동 로그인용)
    const requestBody = JSON.parse(event.body);
    
    // HAIRGATOR 자동 로그인 요청 처리
    if (requestBody.userId && !requestBody.action) {
      return await handleUserInfoRequest(requestBody.userId, headers);
    }
    
    // 기존 복잡한 요청 처리
    const { action, metaCode, collectionName, documentJson, token } = requestBody;
    
    // API URL 구성
    let apiUrl = 'https://drylink.ohmyapp.io/bnb';
    
    // 액션별 엔드포인트 설정
    switch (action) {
      case 'aggregate':
        apiUrl += '/aggregateForTableWithDocTimeline';
        break;
      case 'create':
        apiUrl += '/create';
        break;
      case 'update':
        apiUrl += '/update';
        break;
      case 'delete':
        apiUrl += '/delete';
        break;
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            code: "0",
            message: "Invalid action",
            error: `Unknown action: ${action}` 
          })
        };
    }
    
    console.log('[Bullnabi Proxy] Request:', {
      url: apiUrl,
      action: action,
      metaCode: metaCode,
      collection: collectionName,
      hasToken: !!token
    });
    
    // FormData 생성 (올바른 multipart/form-data)
    const FormData = require('form-data');
    const formData = new FormData();
    
    // metaCode 기본값: _users
    formData.append('metaCode', metaCode || '_users');
    formData.append('collectionName', collectionName);
    
    // documentJson 처리
    if (typeof documentJson === 'string') {
      formData.append('documentJson', documentJson);
    } else {
      formData.append('documentJson', JSON.stringify(documentJson));
    }
    
    // 토큰 설정 (환경변수 우선)
    const defaultToken = process.env.BULLNABI_TOKEN || 
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlcmljNzA4QG5hdmVyLmNvbSIsImxvZ2luVXNlckluZm8iOiJ7IFwiX2lkXCIgOiB7IFwiJG9pZFwiIDogXCI2NTgzYTNhYzJjZDFjYWM4YWUyZTgzYzFcIiB9LCBcImlkXCIgOiBcImVyaWM3MDhAbmF2ZXIuY29tXCIsIFwiZW1haWxcIiA6IFwiZXJpYzcwOEBuYXZlci5jb21cIiwgXCJuYW1lXCIgOiBcIuq5gOuvvOyerFwiLCBcIm5pY2tuYW1lXCIgOiBudWxsLCBcInN0YXR1c1wiIDogXCJhZG1pblwiLCBcIl9zZXJ2aWNlTmFtZVwiIDogXCJkcnlsaW5rXCIsIFwiX3NlcnZpY2VBcHBOYW1lXCIgOiBcIuuTnOudvOydtOunge2BrCDrlJTsnpHsnbTrhIjsmqlcIiwgXCJvc1R5cGVcIiA6IFwiaU9TXCIgfSIsImV4cCI6MTc1ODAxODIzNn0.ZXuCaGQEynAPQXhptlYkzne4cQr7CK_JhrX8jJovD2k';
    
    // 헤더 설정
    const fetchHeaders = {
      'Authorization': `Bearer ${token || defaultToken}`,
      ...formData.getHeaders()  // FormData가 자동으로 Content-Type 설정
    };
    
    // API 요청
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: formData
    });
    
    const responseText = await response.text();
    
    console.log('[Bullnabi Proxy] Response:', {
      status: response.status,
      length: responseText.length,
      preview: responseText.substring(0, 200)
    });
    
    // 응답 처리
    let jsonData;
    
    if (!responseText || responseText.length === 0) {
      console.warn('[Bullnabi Proxy] Empty response received');
      jsonData = {
        code: "0",
        message: "Empty response from server",
        data: []
      };
    } else {
      try {
        jsonData = JSON.parse(responseText);
        
        if (jsonData.code === "1" || jsonData.data || jsonData.recordsTotal) {
          console.log('[Bullnabi Proxy] Success:', {
            code: jsonData.code,
            recordsTotal: jsonData.recordsTotal,
            dataLength: jsonData.data ? jsonData.data.length : 0
          });
        }
      } catch (e) {
        console.error('[Bullnabi Proxy] JSON parse error:', e.message);
        
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          jsonData = {
            code: "0",
            message: "Server returned HTML instead of JSON",
            error: "Invalid response format"
          };
        } else {
          jsonData = {
            code: "0",
            message: "Response parsing failed",
            rawData: responseText.substring(0, 500)
          };
        }
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(jsonData)
    };
    
  } catch (error) {
    console.error('[Bullnabi Proxy] Fatal error:', error);
    
    if (error.message.includes('fetch')) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          code: "-1",
          message: "Service unavailable",
          error: "Cannot connect to Bullnabi server"
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        code: "-1",
        message: error.message,
        error: error.toString()
      })
    };
  }
};

// HAIRGATOR 자동 로그인용 사용자 정보 요청 처리
async function handleUserInfoRequest(userId, headers) {
  try {
    console.log('[Bullnabi Proxy] HAIRGATOR 사용자 정보 요청:', userId);
    
    // 임시: 하드코딩된 성공 응답
    const userInfo = {
      id: userId,
      name: '김민재',
      email: 'kimmin@bullnabi.com',
      remainCount: 42
    };
    
    console.log('[Bullnabi Proxy] 하드코딩된 사용자 정보 반환:', userInfo);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userInfo: userInfo
      })
    };
    
  } catch (error) {
    console.error('[Bullnabi Proxy] 사용자 정보 요청 실패:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}
    
    const userInfo = {
      id: userData._id?.$oid || userId,
      name: userData.name || userData.nickname || '사용자',
      email: userData.email || 'user@bullnabi.com',
      remainCount: userData.remainCount || 0
    };
    
    console.log('[Bullnabi Proxy] 변환된 사용자 정보:', userInfo);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userInfo: userInfo
      })
    };
    
  } catch (error) {
    console.error('[Bullnabi Proxy] 사용자 정보 요청 실패:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}
