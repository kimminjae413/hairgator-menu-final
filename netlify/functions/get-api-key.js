// ========== 네틀리파이 함수: Gemini API 키 제공 ==========

exports.handler = async (event, context) => {
    try {
        // CORS 헤더 설정
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Content-Type': 'application/json'
        };

        // OPTIONS 요청 처리 (CORS preflight)
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }

        // GET 요청만 허용
        if (event.httpMethod !== 'GET') {
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }

        // 환경변수에서 API 키 가져오기
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            console.error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

        // 보안을 위해 API 키의 일부만 마스킹하여 로그
        const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
        console.log(`API 키 제공: ${maskedKey}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                apiKey: apiKey,
                timestamp: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('API 키 제공 함수 오류:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error'
            })
        };
    }
};

// ========== 함수 설정 ==========
// 이 파일은 netlify/functions/ 폴더에 저장되어야 합니다.
// 
// 사용법:
// 1. 네틀리파이 대시보드에서 환경변수 GEMINI_API_KEY 설정
// 2. 클라이언트에서 /.netlify/functions/get-api-key로 요청
// 3. 응답으로 받은 apiKey를 사용하여 Gemini API 호출
//
// 보안 고려사항:
// - 실제 운영에서는 추가적인 인증/권한 확인 필요
// - Rate limiting 구현 권장
// - API 키 사용량 모니터링 필요
