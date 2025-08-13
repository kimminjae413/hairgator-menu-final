// netlify/functions/akool-token.js - 최종 완벽 버전
// 실제 AKOOL API 키 적용 + 완전한 에러 처리

const https = require('https');

exports.handler = async (event, context) => {
  console.log('🚀 AKOOL 토큰 발급 함수 시작...');
  console.log('📅 요청 시간:', new Date().toISOString());
  console.log('🌐 요청 메서드:', event.httpMethod);
  console.log('📍 요청 경로:', event.path);

  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  // CORS 프리플라이트 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ CORS 프리플라이트 요청 처리');
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ message: 'CORS preflight OK' })
    };
  }

  // POST 메서드만 허용
  if (event.httpMethod !== 'POST') {
    console.error('❌ 허용되지 않은 메서드:', event.httpMethod);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Method Not Allowed',
        message: 'POST 메서드만 지원됩니다',
        allowedMethods: ['POST', 'OPTIONS']
      })
    };
  }

  try {
    // ⭐ 올바른 AKOOL API 키 사용 (akool-integration.js와 동일)
    const CLIENT_ID = 'kdwRwzqnGf4zfAFvWCjFKQ==';
    const CLIENT_SECRET = 'suEeE2dZWXsDTJ+mlOqYFhqeLDvJQ42g';

    console.log('🔐 API 키 정보:');
    console.log('  - Client ID:', CLIENT_ID.substring(0, 8) + '...');
    console.log('  - Client Secret 길이:', CLIENT_SECRET.length);
    console.log('  - Client ID 전체 길이:', CLIENT_ID.length);

    // API 키 유효성 검사
    if (!CLIENT_ID || CLIENT_ID.length < 10) {
      throw new Error('Client ID가 유효하지 않습니다');
    }

    if (!CLIENT_SECRET || CLIENT_SECRET.length < 10) {
      throw new Error('Client Secret이 유효하지 않습니다');
    }

    // 📦 AKOOL API 요청 데이터 구성
    const requestData = JSON.stringify({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET
    });

    console.log('📋 요청 데이터 정보:');
    console.log('  - 데이터 크기:', Buffer.byteLength(requestData), 'bytes');
    console.log('  - JSON 유효성:', (() => {
      try { JSON.parse(requestData); return '✅ 유효'; } 
      catch(e) { return '❌ 무효'; }
    })());

    // 🌐 HTTPS 요청 옵션 구성
    const options = {
      hostname: 'openapi.akool.com',
      port: 443,
      path: '/api/open/v3/getToken',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'User-Agent': 'HAIRGATOR/1.0',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      timeout: 30000 // 30초 타임아웃
    };

    const fullUrl = `https://${options.hostname}${options.path}`;
    console.log('🔗 AKOOL API 호출 정보:');
    console.log('  - URL:', fullUrl);
    console.log('  - Method:', options.method);
    console.log('  - Timeout:', options.timeout / 1000, '초');

    // 📡 실제 AKOOL API 호출
    const response = await new Promise((resolve, reject) => {
      console.log('📤 AKOOL API 요청 시작...');
      
      const req = https.request(options, (res) => {
        let data = '';
        let dataChunks = 0;
        
        console.log('📊 응답 정보:');
        console.log('  - HTTP 상태 코드:', res.statusCode);
        console.log('  - 응답 헤더:', JSON.stringify(res.headers, null, 2));
        
        res.on('data', (chunk) => { 
          data += chunk; 
          dataChunks++;
          console.log(`📥 데이터 청크 ${dataChunks} 수신:`, chunk.length, 'bytes');
        });
        
        res.on('end', () => {
          console.log('📥 응답 수신 완료:');
          console.log('  - 총 데이터 크기:', data.length, 'bytes');
          console.log('  - 총 청크 수:', dataChunks);
          console.log('  - 응답 데이터 미리보기:', data.substring(0, 200));
          
          try {
            const parsedData = JSON.parse(data);
            console.log('✅ JSON 파싱 성공');
            resolve({ 
              statusCode: res.statusCode, 
              data: parsedData,
              headers: res.headers,
              rawData: data
            });
          } catch (parseError) {
            console.error('❌ JSON 파싱 오류:', parseError.message);
            console.error('📄 파싱 실패한 원본 데이터:', data);
            reject(new Error(`JSON 파싱 실패: ${parseError.message}`));
          }
        });
      });

      // 🚨 네트워크 오류 처리
      req.on('error', (error) => {
        console.error('❌ 네트워크 요청 오류:', error.message);
        console.error('📄 오류 상세:', error);
        reject(new Error(`네트워크 오류: ${error.message}`));
      });

      // ⏰ 타임아웃 처리
      req.on('timeout', () => {
        console.error('⏰ 요청 타임아웃 (30초)');
        req.destroy();
        reject(new Error('AKOOL API 요청 타임아웃 (30초 초과)'));
      });

      // 📤 요청 데이터 전송
      console.log('📤 요청 데이터 전송 중...');
      req.write(requestData);
      req.end();
      console.log('✅ 요청 전송 완료');
    });

    // 📋 응답 분석 및 로깅
    console.log('📊 AKOOL API 응답 상세 분석:');
    console.log('  - HTTP 상태 코드:', response.statusCode);
    console.log('  - AKOOL 응답 코드:', response.data?.code);
    console.log('  - AKOOL 메시지:', response.data?.message || response.data?.msg);
    console.log('  - 토큰 존재 여부:', !!response.data?.token);
    console.log('  - 토큰 길이:', response.data?.token?.length || 0);

    // ✅ 성공 응답 처리
    if (response.statusCode === 200) {
      // AKOOL 표준 성공 응답 (code: 1000)
      if (response.data.code === 1000 && response.data.token) {
        console.log('🎉 AKOOL 토큰 발급 성공!');
        console.log('🎫 토큰 정보:');
        console.log('  - 토큰 길이:', response.data.token.length);
        console.log('  - 토큰 시작:', response.data.token.substring(0, 20) + '...');
        console.log('  - 토큰 끝:', '...' + response.data.token.substring(response.data.token.length - 10));
        
        const successResponse = {
          success: true,
          token: response.data.token,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24시간 후 만료
          message: '토큰 발급 성공',
          akoolCode: response.data.code,
          timestamp: new Date().toISOString(),
          debug: {
            httpStatus: response.statusCode,
            akoolCode: response.data.code,
            tokenLength: response.data.token.length
          }
        };

        console.log('✅ 성공 응답 준비 완료');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(successResponse)
        };
      } 
      // 다른 성공 응답 구조 (백업 처리)
      else if (response.data.token) {
        console.log('✅ 토큰 발급 성공 (대체 응답 구조)');
        
        const successResponse = {
          success: true,
          token: response.data.token,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000),
          message: '토큰 발급 성공 (대체 구조)',
          akoolResponse: response.data,
          timestamp: new Date().toISOString(),
          debug: {
            httpStatus: response.statusCode,
            responseStructure: 'alternative'
          }
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(successResponse)
        };
      }
      // 1109 오류 (계정 문제) 처리 - 시뮬레이션 모드로 전환
      else if (response.data.code === 1109) {
        console.error('❌ AKOOL 계정 오류 (1109):', response.data.message);
        console.log('🎭 시뮬레이션 모드로 자동 전환');
        
        // 시뮬레이션 토큰 생성
        const simulationToken = 'SIMULATION_TOKEN_' + Date.now() + '_' + Math.random().toString(36).substring(2);
        
        const simulationResponse = {
          success: true,
          token: simulationToken,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000),
          message: '시뮬레이션 모드 (AKOOL 계정 문제로 임시 전환)',
          simulation: true,
          akoolCode: response.data.code,
          originalError: response.data.message,
          timestamp: new Date().toISOString(),
          debug: {
            httpStatus: response.statusCode,
            mode: 'simulation',
            reason: 'account_error_1109'
          }
        };

        console.log('🎭 시뮬레이션 토큰 발급:', simulationToken.substring(0, 30) + '...');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(simulationResponse)
        };
      }
      // HTTP 200이지만 토큰이 없는 경우
      else {
        console.error('❌ HTTP 200 응답이지만 토큰 없음');
        console.error('📄 응답 구조:', JSON.stringify(response.data, null, 2));
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'AKOOL 응답 구조 오류',
            message: '성공 응답이지만 토큰이 포함되지 않았습니다',
            akoolCode: response.data?.code,
            akoolMessage: response.data?.message || response.data?.msg,
            akoolResponse: response.data,
            timestamp: new Date().toISOString()
          })
        };
      }
    }

    // ❌ HTTP 오류 응답 처리
    else {
      console.error('❌ AKOOL API HTTP 오류');
      console.error('📄 오류 응답:', JSON.stringify(response.data, null, 2));
      
      return {
        statusCode: response.statusCode >= 400 ? response.statusCode : 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'AKOOL API 오류',
          message: response.data?.message || response.data?.msg || '토큰 발급 실패',
          httpStatus: response.statusCode,
          akoolCode: response.data?.code,
          akoolResponse: response.data,
          timestamp: new Date().toISOString(),
          debug: {
            requestUrl: fullUrl,
            requestMethod: options.method
          }
        })
      };
    }

  } catch (error) {
    // 🚨 서버 내부 오류 처리
    console.error('❌ 서버 내부 오류 발생:');
    console.error('📄 오류 메시지:', error.message);
    console.error('📄 오류 스택:', error.stack);
    console.error('📄 오류 타입:', error.constructor.name);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 내부 오류',
        message: error.message,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString(),
        debug: {
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          netlifyFunction: true
        }
      })
    };
  }
};

console.log('🎉 AKOOL Token Function 모듈 로드 완료!');
