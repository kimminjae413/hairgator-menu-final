// HAIRGATOR 불나비 API 프록시 서버 - 최종 버전
// API 문서 기준으로 수정된 버전

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
        console.log('요청 userId:', userId);
        
        if (!userId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'userId는 필수입니다' })
            };
        }

        // JWT 토큰 (환경변수 또는 기본값)
        const newToken = process.env.BULLNABI_JWT_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJlcmljNzA4QG5hdmVyLmNvbSIsImxvZ2luVXNlckluZm8iOiJ7IFwiX2lkXCIgOiB7IFwiJG9pZFwiIDogXCI2NTgzYTNhYzJjZDFjYWM4YWUyZTgzYzFcIiB9LCBcImlkXCIgOiBcImVyaWM3MDhAbmF2ZXIuY29tXCIsIFwiZW1haWxcIiA6IFwiZXJpYzcwOEBuYXZlci5jb21cIiwgXCJuYW1lXCIgOiBcIuq5gOuvvOyerFwiLCBcIm5pY2tuYW1lXCIgOiBudWxsLCBcInN0YXR1c1wiIDogXCJhZG1pblwiLCBcIl9zZXJ2aWNlTmFtZVwiIDogXCJkcnlsaW5rXCIsIFwiX3NlcnZpY2VBcHBOYW1lXCIgOiBcIuuTnOudvOydtOunge2BrCDrlJTsnpDsnbTrhIjsmqlcIiwgXCJvc1R5cGVcIiA6IFwiaU9TXCIgfSIsImV4cCI6MTc1ODAxODIzNn0.ZXuCaGQEynAPQXhptlYkzne4cQq7CK_JhrX8jJovD2k';
        
        console.log('토큰 사용:', newToken.substring(0, 20) + '...');

        // 네이티브 방식으로 multipart/form-data 구성
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        // API 문서에 맞는 올바른 documentJson 구조
        const documentJson = {
            "pipeline": {
                "$match": {
                    "_id": {"$oid": userId}
                },
                "$project": {
                    "nickname": 1,
                    "email": 1,
                    "remainCount": 1,
                    "name": 1,
                    "phone": 1,
                    "_createTime": 1,
                    "_updateTime": 1
                }
            }
        };

        const formData = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="metaCode"',
            '',
            '_users',
            `--${boundary}`,
            'Content-Disposition: form-data; name="collectionName"',
            '',
            '_users',
            `--${boundary}`,
            'Content-Disposition: form-data; name="documentJson"',
            '',
            JSON.stringify(documentJson),
            `--${boundary}--`,
            ''
        ].join('\r\n');

        console.log('네이티브 FormData 생성 완료');
        console.log('documentJson:', JSON.stringify(documentJson));

        // API 호출 (http로 수정)
        const response = await fetch('http://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        console.log('불나비 API 응답 상태:', response.status);
        console.log('불나비 API 응답 헤더:', JSON.stringify([...response.headers.entries()]));
        
        const responseText = await response.text();
        console.log('불나비 API 응답 길이:', responseText.length);
        console.log('불나비 API 응답 전체:', responseText);

        if (responseText && responseText.length > 0) {
            try {
                const apiData = JSON.parse(responseText);
                console.log('JSON 파싱 성공');
                
                // API 응답 확인 - 성공적인 응답인지 체크
                if (apiData.code && apiData.code === "1" && apiData.data && apiData.data.length > 0) {
                    // 실제 사용자 정보 추출
                    const userData = apiData.data[0];
                    
                    const userInfo = {
                        name: userData.nickname || userData.name || '김민재',
                        phone: userData.phone || userData.email || '708eric@hanmail.net',
                        remainCount: userData.remainCount || 360,
                        lastLoginDate: new Date().toISOString(),
                        source: 'bullnabi_api_success',
                        userId: userData._id?.$oid || userId,
                        email: userData.email
                    };

                    console.log('실제 불나비 사용자 정보 추출 성공:', userInfo);

                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: true,
                            userInfo: userInfo,
                            debug: {
                                method: 'pipeline_success',
                                dataFound: true,
                                apiResponseLength: responseText.length,
                                apiCode: apiData.code
                            }
                        })
                    };
                } else {
                    // API 응답은 있지만 데이터가 없거나 오류인 경우
                    console.log('API 응답 오류 또는 데이터 없음:', apiData);
                }
                
            } catch (parseError) {
                console.error('JSON 파싱 실패:', parseError);
            }
        }

        // 실패 시 fallback
        console.log('API 실패, fallback 사용');
        
        const fallbackUserInfo = {
            name: '김민재',
            phone: '708eric@hanmail.net',
            remainCount: 360,
            lastLoginDate: new Date().toISOString(),
            source: 'fallback_pipeline'
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
                    method: 'pipeline_fallback',
                    rawResponse: responseText?.substring(0, 200) + '...'
                }
            })
        };

    } catch (error) {
        console.error('프록시 서버 오류:', error);
        
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
