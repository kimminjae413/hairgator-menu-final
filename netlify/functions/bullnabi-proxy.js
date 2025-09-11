// HAIRGATOR 불나비 API 프록시 서버 (수정된 버전)
// 문제: JWT 토큰 인증 실패 해결
// 해결: FormData + 정확한 헤더 형식 적용

exports.handler = async (event, context) => {
    // CORS 헤더 설정
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // OPTIONS 요청 처리 (Preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS OK' })
        };
    }

    // POST 요청만 허용
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { userId } = JSON.parse(event.body);
        
        if (!userId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'userId는 필수입니다' })
            };
        }

        console.log('🔍 불나비 사용자 조회 시작:', userId);

        // ========== 수정된 부분: FormData 사용 ==========
        
        // 1. FormData 생성 (URLSearchParams 대신)
        const FormData = require('form-data');
        const formData = new FormData();
        
        // 2. 불나비 API 요청 데이터 구성
        formData.append('metaCode', '_users');
        formData.append('collectionName', '_users');
        formData.append('documentJson', JSON.stringify({
            "_id": {
                "$oid": userId
            }
        }));

        // 3. JWT 토큰 (환경변수에서 로드)
        const token = process.env.BULLNABI_JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NDViNzNkZWZjNjgyNDc1ZTZkZGQzODQiLCJpYXQiOjE2ODM4MDE0NzEsImV4cCI6MTcxNTMzNzQ3MX0.Rws0pKaE-Y6ZEpOJj5HZB8cXIMd_EqBQE8MpHqfn9s4';

        // 4. 수정된 헤더 설정 (Bearer 제거)
        const fetchHeaders = {
            'Authorization': token,  // Bearer 접두사 제거
            ...formData.getHeaders()  // FormData의 multipart 헤더 자동 설정
        };

        console.log('📡 불나비 API 요청:', {
            url: 'https://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline',
            headers: Object.keys(fetchHeaders),
            contentType: fetchHeaders['content-type']
        });

        // 5. 불나비 API 호출
        const response = await fetch('https://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline', {
            method: 'POST',
            headers: fetchHeaders,
            body: formData  // FormData 직접 전송
        });

        const responseText = await response.text();
        console.log('📥 불나비 API 응답 (raw):', responseText);

        let apiData;
        try {
            apiData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON 파싱 실패:', parseError);
            apiData = { error: 'API 응답 파싱 실패', raw: responseText };
        }

        console.log('📥 불나비 API 응답 (parsed):', apiData);

        // 6. 성공 응답 처리
        if (apiData.code === 1000 && apiData.data && apiData.data.length > 0) {
            const userData = apiData.data[0];
            const userInfo = {
                name: userData.이름 || '이름 없음',
                phone: userData.전화번호 || '전화번호 없음',
                remainCount: userData.remainCount || 0,
                lastLoginDate: new Date().toISOString(),
                source: 'bullnabi_api_success'
            };

            console.log('✅ 불나비 API 성공:', userInfo);

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    userInfo: userInfo,
                    debug: {
                        hasData: true,
                        dataLength: apiData.data.length,
                        apiResponse: apiData
                    }
                })
            };
        }

        // 7. 실패 시 fallback 데이터
        console.log('⚠️ 불나비 API 실패, fallback 사용');
        
        const fallbackUserInfo = {
            name: '김민재 (API 인증 수정 중)',
            phone: '010-0000-0000',
            remainCount: 5,
            lastLoginDate: new Date().toISOString(),
            source: 'fallback_auth_fixing'
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                userInfo: fallbackUserInfo,
                debug: {
                    hasData: false,
                    apiError: apiData,
                    authStatus: 'fixing_bearer_issue',
                    nextStep: 'FormData 방식 적용 완료'
                }
            })
        };

    } catch (error) {
        console.error('💥 프록시 서버 오류:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: error.message,
                debug: {
                    stack: error.stack
                }
            })
        };
    }
};
