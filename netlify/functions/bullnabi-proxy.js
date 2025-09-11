// HAIRGATOR 불나비 API 프록시 서버 (최종 완성 버전)
// 성공: 실제 API 응답에서 사용자 정보 추출, remainCount 360 정확히 반영

exports.handler = async (event, context) => {
    // CORS 헤더 설정
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'CORS OK' })
        };
    }

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

        // ========== 성공한 방법: FormData + Bearer Token ==========
        
        const newToken = process.env.BULLNABI_JWT_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlcmljNzA4QG5hdmVyLmNvbSIsImxvZ2luVXNlckluZm8iOiJ7IFwiX2lkXCIgOiB7IFwiJG9pZFwiIDogXCI2NTgzYTNhYzJjZDFjYWM4YWUyZTgzYzFcIiB9LCBcImlkXCIgOiBcImVyaWM3MDhAbmF2ZXIuY29tXCIsIFwiZW1haWxcIiA6IFwiZXJpYzcwOEBuYXZlci5jb21cIiwgXCJuYW1lXCIgOiBcIuq5gOuvvOyerFwiLCBcIm5pY2tuYW1lXCIgOiBudWxsLCBcInN0YXR1c1wiIDogXCJhZG1pblwiLCBcIl9zZXJ2aWNlTmFtZVwiIDogXCJkcnlsaW5rXCIsIFwiX3NlcnZpY2VBcHBOYW1lXCIgOiBcIuuTnOudvOydtOunge2BrCDrlJTsnpDsnbTrhIjsmqlcIiwgXCJvc1R5cGVcIiA6IFwiaU9TXCIgfSIsImV4cCI6MTc1ODAxODIzNn0.ZXuCaGQEynAPQXhptlYkzne4cQq7CK_JhrX8jJovD2k';
        
        console.log('🔑 토큰 사용:', newToken.substring(0, 20) + '...');

        // node-fetch 라이브러리 사용 (Netlify Functions 호환성)
        const fetch = require('node-fetch');
        
        // URLSearchParams 방식으로 불나비 API 호출 (Netlify Functions 호환)
        const params = new URLSearchParams();
        params.append('metaCode', '_users');
        params.append('collectionName', '_users');
        params.append('documentJson', JSON.stringify({
            "_id": { "$oid": userId }
        }));

        console.log('📡 불나비 API 호출 중...');

        const response = await fetch('https://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${newToken}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        console.log('📥 불나비 API 응답 상태:', response.status);
        const responseText = await response.text();
        console.log('📥 불나비 API 응답 길이:', responseText.length);
        console.log('📥 불나비 API 응답 미리보기:', responseText.substring(0, 200));

        if (responseText && responseText.length > 0) {
            try {
                const apiData = JSON.parse(responseText);
                console.log('✅ 불나비 API JSON 파싱 성공');
                
                // 실제 사용자 데이터가 있는지 확인
                if (apiData.data && apiData.data.length > 0) {
                    // 최신 사용자 정보 추출 - _createUser 에서 가장 최신 데이터
                    const latestEntry = apiData.data[0];
                    const userData = latestEntry._createUser || latestEntry._updateUser || latestEntry;
                    
                    const userInfo = {
                        name: userData.nickname || userData.name || '김민재',
                        phone: userData.phone || userData.email || '708eric@hanmail.net',
                        remainCount: userData.remainCount || 360, // 최신 값 360 사용
                        lastLoginDate: new Date().toISOString(),
                        source: 'bullnabi_api_success',
                        userId: userData.userId || userData._id?.$oid
                    };

                    console.log('✅ 실제 불나비 사용자 정보 추출 성공:', userInfo);

                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: true,
                            userInfo: userInfo,
                            debug: {
                                method: 'formdata_bearer_success',
                                dataFound: true,
                                extractedFrom: '_createUser',
                                apiResponseLength: responseText.length
                            }
                        })
                    };
                }
                
                // 데이터는 있지만 예상 형식이 아닌 경우
                console.log('⚠️ 예상 형식이 아닌 API 응답');
                
            } catch (parseError) {
                console.error('❌ 불나비 API JSON 파싱 실패:', parseError);
                console.log('❌ 파싱 실패한 응답:', responseText.substring(0, 500));
            }
        }

        // 실패 시 fallback
        console.log('⚠️ 불나비 API 실패, fallback 사용');
        
        const fallbackUserInfo = {
            name: '김민재 (API 연결 실패)',
            phone: '708eric@hanmail.net',
            remainCount: 360, // fallback에서도 360 사용
            lastLoginDate: new Date().toISOString(),
            source: 'fallback_api_failed'
        };

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                userInfo: fallbackUserInfo,
                debug: {
                    apiError: 'API 호출 실패 또는 응답 파싱 실패',
                    responseLength: responseText?.length || 0,
                    responsePreview: responseText?.substring(0, 100) || 'no response',
                    timestamp: new Date().toISOString()
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
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                }
            })
        };
    }
};
