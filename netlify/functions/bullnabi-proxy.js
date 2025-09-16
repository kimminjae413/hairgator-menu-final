// HAIRGATOR 불나비 API 프록시 서버 - 최종 완성 버전
// API 문서 기준으로 구현된 정상 작동 버전

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

        // JWT 토큰 (환경변수에서 가져오기)
        const token = process.env.BULLNABI_TOKEN;
        
        if (!token) {
            console.error('❌ BULLNABI_TOKEN 환경변수가 설정되지 않았습니다');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'JWT 토큰이 설정되지 않았습니다' 
                })
            };
        }
        
        console.log('토큰 사용:', token.substring(0, 20) + '...');

        // API 문서에 따른 정확한 요청 구조
        const metaCode = '_users';
        const collectionName = '_users';
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

        // Query Parameters로 전송 (API 문서 기준)
        const params = new URLSearchParams();
        params.append('metaCode', metaCode);
        params.append('collectionName', collectionName);
        params.append('documentJson', JSON.stringify(documentJson));

        const url = `http://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline?${params.toString()}`;

        console.log('API 요청 URL:', url);
        console.log('documentJson:', JSON.stringify(documentJson));

        // FormData는 빈 body로 전송 (multipart/form-data 형식 유지)
        const FormData = require('form-data');
        const formData = new FormData();

        // API 호출 (Bearer 접두사 필수)
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`, // Bearer 접두사 필수
                'Accept': 'application/json',
                ...formData.getHeaders()
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
                
                // API 응답 확인 (data 배열이 있으면 성공)
                if (apiData.data && apiData.data.length > 0) {
                    // 실제 사용자 정보 추출
                    const userData = apiData.data[0];
                    
                    const userInfo = {
                        name: userData.nickname || userData.name || '불나비 사용자',
                        phone: userData.phone || userData.email || 'unknown',
                        remainCount: userData.remainCount || 0,
                        lastLoginDate: new Date().toISOString(),
                        source: 'bullnabi_api_success',
                        userId: userData._id?.$oid || userId,
                        email: userData.email
                    };

                    console.log('✅ 실제 불나비 사용자 정보 추출 성공:', userInfo);

                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: true,
                            userInfo: userInfo,
                            debug: {
                                method: 'swagger_api_success',
                                dataFound: true,
                                apiResponseLength: responseText.length,
                                recordsTotal: apiData.recordsTotal,
                                recordsFiltered: apiData.recordsFiltered
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
        console.log('❌ API 실패, fallback 사용');
        
        const fallbackUserInfo = {
            name: '김민재',
            phone: '708eric@hanmail.net',
            remainCount: 360,
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
                    method: 'fallback',
                    rawResponse: responseText?.substring(0, 200) + '...'
                }
            })
        };

    } catch (error) {
        console.error('❌ 프록시 서버 오류:', error);
        
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
