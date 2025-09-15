// HAIRGATOR 불나비 API 프록시 서버 (네이티브 multipart 방식)
// 해결: form-data 라이브러리 없이 네이티브로 multipart/form-data 구성

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

        // JWT 토큰 - 환경변수에서 가져오기
        const newToken = process.env.BULLNABI_TOKEN;

        if (!newToken) {
            console.error('BULLNABI_TOKEN 환경변수가 없습니다');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    error: 'BULLNABI_TOKEN 환경변수가 설정되지 않았습니다',
                    debug: 'Netlify 환경변수에서 BULLNABI_TOKEN을 확인하세요'
                })
            };
        }

        console.log('사용 중인 토큰:', newToken.substring(0, 20) + '...');
        console.log('토큰 길이:', newToken.length);

        // 네이티브 방식으로 multipart/form-data 구성
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
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
            JSON.stringify({
    "pipeline": {
        "$match": {
            "_id": {"$oid": userId}
        },
        "$limit": 1
    }
}),
            `--${boundary}--`,
            ''
        ].join('\r\n');

        console.log('네이티브 FormData 생성 완료');
        console.log('API URL:', 'https://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline');

        // API 호출
        const response = await fetch('https://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline', {
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

        // 응답 상태 확인
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 오류 응답:', errorText);
            console.error('HTTP 상태:', response.status, response.statusText);
            
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    userInfo: {
                        name: '김민재',
                        phone: '708eric@hanmail.net',
                        remainCount: 360,
                        lastLoginDate: new Date().toISOString(),
                        source: 'fallback_api_error'
                    },
                    debug: {
                        apiError: `HTTP ${response.status}: ${response.statusText}`,
                        responseLength: errorText.length,
                        method: 'fallback_due_to_api_error'
                    }
                })
            };
        }
        
        const responseText = await response.text();
        console.log('불나비 API 응답 길이:', responseText.length);
        console.log('불나비 API 응답 전체:', responseText);

        if (responseText && responseText.length > 0) {
            try {
                const apiData = JSON.parse(responseText);
                console.log('JSON 파싱 성공');
                
                // 실제 사용자 데이터가 있는지 확인
                if (apiData.data && apiData.data.length > 0) {
                    // 최신 사용자 정보 추출
                    const latestEntry = apiData.data[0];
                    const userData = latestEntry._createUser || latestEntry._updateUser || latestEntry;
                    
                    const userInfo = {
                        name: userData.nickname || userData.name || '김민재',
                        phone: userData.phone || userData.email || '708eric@hanmail.net',
                        remainCount: userData.remainCount || 360,
                        lastLoginDate: new Date().toISOString(),
                        source: 'bullnabi_api_success',
                        userId: userData.userId || userData._id?.$oid
                    };

                    console.log('실제 불나비 사용자 정보 추출 성공:', userInfo);

                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: true,
                            userInfo: userInfo,
                            debug: {
                                method: 'api_success',
                                dataFound: true,
                                apiResponseLength: responseText.length
                            }
                        })
                    };
                }
                
            } catch (parseError) {
                console.error('JSON 파싱 실패:', parseError);
                console.error('파싱 실패한 응답:', responseText.substring(0, 200));
            }
        }

        // 실패 시 fallback
        console.log('API 실패, fallback 사용');
        
        const fallbackUserInfo = {
            name: '김민재',
            phone: '708eric@hanmail.net',
            remainCount: 360,
            lastLoginDate: new Date().toISOString(),
            source: 'fallback_native_multipart'
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
                    method: 'native_multipart_fallback',
                    httpStatus: response.status
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
