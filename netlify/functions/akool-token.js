// netlify/functions/akool-token.js - 완전 개선 버전
const https = require('https');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // CORS 프리플라이트 처리
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers, 
      body: '' 
    };
  }

  // POST 메서드만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed',
        message: 'POST 메서드만 지원됩니다' 
      })
    };
  }

  try {
    console.log('🚀 AKOOL 토큰 발급 함수 시작');
    console.log('📅 요청 시간:', new Date().toISOString());
    
    // 🔑 환경변수 확인 (강화된 체크)
    const CLIENT_ID = process.env.AKOOL_CLIENT_ID;
    const CLIENT_SECRET = process.env.AKOOL_CLIENT_SECRET;
    
    console.log('🔍 환경변수 체크:');
    console.log('  - AKOOL_CLIENT_ID 존재:', !!CLIENT_ID);
    console.log('  - AKOOL_CLIENT_SECRET 존재:', !!CLIENT_SECRET);
    
    // 환경변수가 없으면 즉시 에러
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error('❌ 환경변수 누락!');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Configuration Error',
          message: 'AKOOL API 키가 설정되지 않았습니다. Netlify 환경변수를 확인하세요.',
          debug: {
            hasClientId: !!CLIENT_ID,
            hasClientSecret: !!CLIENT_SECRET,
            timestamp: new Date().toISOString()
          }
        })
      };
    }

    // 🔐 API 키 로깅 (보안을 위해 일부만)
    console.log('📝 사용할 Client ID:', CLIENT_ID.substring(0, 8) + '...');
    console.log('📝 사용할 Secret 길이:', CLIENT_SECRET.length);

    // 📦 요청 데이터 구성
    const requestData = JSON.stringify({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    });

    console.log('📋 요청 데이터 크기:', Buffer.byteLength(requestData), 'bytes');

    // 🌐 HTTPS 요청 옵션
    const options = {
      hostname: 'openapi.akool.com',
      port: 443,
      path: '/api/open/v3/getToken',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'User-Agent': 'HAIRGATOR/1.0'
      },
      timeout: 30000 // 30초 타임아웃
    };

    console.log('🔗 AKOOL API 호출 시작:', `https://${options.hostname}${options.path}`);

    // 📡 AKOOL API 호출
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        console.log('📊 응답 상태 코드:', res.statusCode);
        console.log('📊 응답 헤더:', JSON.stringify(res.headers, null, 2));
        
        res.on('data', (chunk) => { 
          data += chunk; 
          console.log('📥 데이터 수신 중...', chunk.length, 'bytes');
        });
        
        res.on('end', () => {
          console.log('📥 전체 응답 데이터:', data);
          
          try {
            const parsedData = JSON.parse(data);
            resolve({ 
              statusCode: res.statusCode, 
              data: parsedData,
              headers: res.headers 
            });
          } catch (parseError) {
            console.error('❌ JSON 파싱 오류:', parseError.message);
            console.error('📄 원본 응답:', data);
            reject(new Error(`JSON 파싱 실패: ${parseError.message}`));
          }
        });
      });

      // 🚨 에러 처리
      req.on('error', (error) => {
        console.error('❌ 요청 오류:', error);
        reject(error);
      });

      req.on('timeout', () => {
        console.error('⏰ 요청 타임아웃');
        req.destroy();
        reject(new Error('AKOOL API 요청 타임아웃 (30초)'));
      });

      // 📤 요청 데이터 전송
      console.log('📤 요청 데이터 전송 중...');
      req.write(requestData);
      req.end();
    });

    // 📋 응답 분석
    console.log('📊 AKOOL API 응답 분석:');
    console.log('  - HTTP 상태:', response.statusCode);
    console.log('  - 응답 코드:', response.data?.code);
    console.log('  - 응답 메시지:', response.data?.message);
    console.log('  - 토큰 존재:', !!response.data?.token);

    // ✅ 성공 처리 (다양한 성공 케이스 고려)
    if (response.statusCode === 200) {
      // 응답 구조 확인
      if (response.data.code === 1000 && response.data.token) {
        console.log('✅ 토큰 발급 성공!');
        console.log('🎫 토큰 길이:', response.data.token.length);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            token: response.data.token,
            expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1년 후
            message: '토큰 발급 성공',
            akoolCode: response.data.code,
            timestamp: new Date().toISOString()
          })
        };
      } 
      // 다른 응답 구조 대응
      else if (response.data.token) {
        console.log('✅ 토큰 발급 성공 (다른 구조)');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            token: response.data.token,
            expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
            message: '토큰 발급 성공 (대체 구조)',
            akoolResponse: response.data,
            timestamp: new Date().toISOString()
          })
        };
      }
      // 성공했지만 토큰이 없는 경우
      else {
        console.error('❌ 성공 응답이지만 토큰 없음');
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'AKOOL 응답 구조 오류',
            message: '토큰이 응답에 포함되지 않았습니다',
            akoolResponse: response.data,
            timestamp: new Date().toISOString()
          })
        };
      }
    }

    // ❌ 실패 처리
    console.error('❌ AKOOL API 호출 실패');
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'AKOOL API 오류',
        message: response.data?.message || '토큰 발급 실패',
        code: response.data?.code,
        httpStatus: response.statusCode,
        akoolResponse: response.data,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ 서버 오류 발생:', error);
    console.error('📄 오류 스택:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류',
        message: error.message,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString(),
        debug: {
          nodeVersion: process.version,
          platform: process.platform
        }
      })
    };
  }
};
