// ========== 수정된 netlify/functions/akool-status.js ==========
// AKOOL Face Swap 결과 상태 확인 함수 (POST 방식 + taskId 지원)

const https = require('https');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',  // ✅ POST 방식으로 변경
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {  // ✅ POST만 허용
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('📋 AKOOL 상태 확인 함수 시작...');
    console.log('📥 요청 body:', event.body);

    // ✅ POST body에서 데이터 파싱
    const requestData = JSON.parse(event.body);
    const { token, taskId, resultId } = requestData;  // ✅ taskId와 resultId 둘 다 지원

    // taskId 또는 resultId 사용 (호환성)
    const finalId = taskId || resultId;

    if (!token || !finalId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Token과 taskId(또는 resultId)가 필요합니다',
          received: { token: !!token, taskId: !!taskId, resultId: !!resultId }
        })
      };
    }

    console.log('📊 상태 확인 시작:', finalId);

    const options = {
      hostname: 'openapi.akool.com',
      port: 443,
      path: `/api/open/v3/faceswap/result/listbyids?_ids=${encodeURIComponent(finalId)}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'HAIRGATOR/1.0'
      }
    };

    console.log('🔗 AKOOL 상태 확인 API:', `https://${options.hostname}${options.path}`);

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(data);
            resolve({ statusCode: res.statusCode, data: parsedData });
          } catch (error) {
            console.error('❌ JSON 파싱 오류:', error);
            resolve({ statusCode: res.statusCode, data: { error: 'JSON 파싱 실패', raw: data } });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('❌ HTTPS 요청 오류:', error);
        reject(error);
      });
      
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('요청 타임아웃'));
      });
      
      req.end();
    });

    console.log('📡 상태 API 응답:', {
      statusCode: response.statusCode,
      code: response.data?.code,
      dataExists: !!response.data?.data?.result?.[0]
    });

    if (response.statusCode === 200 && response.data.code === 1000) {
      const result = response.data.data?.result?.[0];
      
      if (!result) {
        console.warn('⚠️ 결과 데이터 없음:', response.data);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: '결과를 찾을 수 없습니다',
            message: '해당 ID의 처리 결과가 아직 생성되지 않았습니다',
            id: finalId
          })
        };
      }

      // ✅ AKOOL Face Swap 상태 매핑 (정확한 상태 코드)
      // 1: In Queue, 2: Processing, 3: Success, 4: Failed
      const status = result.faceswap_status;
      let statusText, isComplete, progress, resultUrl = null;

      switch (status) {
        case 1:
          statusText = '대기 중';
          isComplete = false;
          progress = 25;
          break;
        case 2:
          statusText = '처리 중';
          isComplete = false;
          progress = 70;
          break;
        case 3:
          statusText = '완료';
          isComplete = true;
          progress = 100;
          resultUrl = result.url;
          break;
        case 4:
          statusText = '실패';
          isComplete = true;
          progress = 0;
          break;
        default:
          statusText = `알 수 없는 상태 (${status})`;
          isComplete = false;
          progress = 0;
      }

      console.log(`📊 처리 상태: ${statusText} (${progress}%) - ${resultUrl ? '결과 URL 있음' : '결과 URL 없음'}`);

      // ✅ akool-integration.js에서 기대하는 형식으로 응답
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          status: status,           // ✅ status 필드 (숫자)
          statusText: statusText,
          isComplete: isComplete,
          progress: progress,
          url: resultUrl,          // ✅ url 필드 (akool-integration.js가 data.url로 접근)
          resultUrl: resultUrl,    // 호환성을 위한 추가 필드
          message: status === 4 ? '처리 중 오류가 발생했습니다' : statusText,
          id: finalId,
          processingTime: result.processing_time || null,
          rawData: result // 디버깅용 원본 데이터
        })
      };
    } else {
      console.error('❌ 상태 확인 실패:', {
        statusCode: response.statusCode,
        code: response.data?.code,
        message: response.data?.msg,
        error: response.data?.error
      });
      
      return {
        statusCode: response.statusCode || 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'AKOOL API 오류',
          message: response.data?.msg || response.data?.error || '상태 확인 실패',
          code: response.data?.code || 'UNKNOWN',
          id: finalId
        })
      };
    }

  } catch (error) {
    console.error('❌ 상태 확인 서버 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '서버 오류',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
