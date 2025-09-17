// HAIRGATOR 불나비 API 프록시 서버 - 동적 토큰 지원 최종 버전
// 기존 구조 유지 + 동적 토큰 우선 사용

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
        // 🆕 변경: userId와 userToken 받기
        const requestBody = JSON.parse(event.body);
        const { userId, userToken } = requestBody;
        
        console.log('📝 요청 정보:');
        console.log('- userId:', userId);
        console.log('- userToken 있음:', !!userToken);
        console.log('- userToken 길이:', userToken?.length || 0);
        
        if (!userId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'userId는 필수입니다' })
            };
        }

        // 🆕 토큰 우선순위: 동적 토큰 > 환경변수 토큰
        let token;
        let tokenSource;
        
        if (userToken && userToken.trim()) {
            // 1순위: 클라이언트에서 전달받은 동적 토큰
            token = userToken.trim();
            tokenSource = 'dynamic_user_token';
            console.log('✅ 동적 토큰 사용:', token.substring(0, 20) + '...');
        } else {
            // 2순위: 환경변수 고정 토큰 (백업용)
            token = process.env.BULLNABI_TOKEN;
            tokenSource = 'environment_variable';
            console.log('🔄 환경변수 토큰 사용 (백업):', token ? token.substring(0, 20) + '...' : 'null');
        }
        
        if (!token) {
            console.error('❌ 사용 가능한 토큰이 없습니다');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    success: false, 
                    error: '토큰이 없습니다. 로그인이 필요합니다.',
                    tokenSource: 'none'
                })
            };
        }

        // API 문서에 따른 정확한 요청 구조 (기존과 동일)
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

        // Query Parameters로 전송 (기존과 동일)
        const params = new URLSearchParams();
        params.append('metaCode', metaCode);
        params.append('collectionName', collectionName);
        params.append('documentJson', JSON.stringify(documentJson));

        const url = `http://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline?${params.toString()}`;

        console.log('🌐 API 요청 정보:');
        console.log('- URL:', url);
        console.log('- 토큰 소스:', tokenSource);
        console.log('- documentJson:', JSON.stringify(documentJson));

        // FormData는 빈 body로 전송 (기존과 동일)
        const FormData = require('form-data');
        const formData = new FormData();

        // API 호출 (Bearer 접두사 필수)
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`, // 동적 또는 고정 토큰 사용
                'Accept': 'application/json',
                ...formData.getHeaders()
            },
            body: formData
        });

        console.log('📡 불나비 API 응답:');
        console.log('- 상태 코드:', response.status);
        console.log('- 응답 헤더:', JSON.stringify([...response.headers.entries()]));
        
        const responseText = await response.text();
        console.log('- 응답 길이:', responseText.length);
        console.log('- 응답 내용:', responseText);

        if (responseText && responseText.length > 0) {
            try {
                const apiData = JSON.parse(responseText);
                console.log('✅ JSON 파싱 성공');
                
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
                                method: 'api_success_with_' + tokenSource,
                                tokenSource: tokenSource,
                                dataFound: true,
                                apiResponseLength: responseText.length,
                                recordsTotal: apiData.recordsTotal,
                                recordsFiltered: apiData.recordsFiltered,
                                usedDynamicToken: tokenSource === 'dynamic_user_token'
                            }
                        })
                    };
                } else {
                    // API 응답은 있지만 데이터가 없거나 오류인 경우
                    console.log('⚠️ API 응답 오류 또는 데이터 없음:', apiData);
                    
                    // 🆕 토큰 오류 감지 로직 추가
                    if (apiData.code === -110 || apiData.message?.includes('토큰')) {
                        console.log('🔑 토큰 문제 감지:', apiData.message);
                        
                        return {
                            statusCode: 401,
                            headers: corsHeaders,
                            body: JSON.stringify({
                                success: false,
                                error: 'TOKEN_ERROR',
                                message: '토큰이 유효하지 않습니다. 다시 로그인해주세요.',
                                tokenSource: tokenSource,
                                apiResponse: apiData,
                                debug: {
                                    tokenProblem: true,
                                    apiCode: apiData.code,
                                    apiMessage: apiData.message
                                }
                            })
                        };
                    }
                }
                
            } catch (parseError) {
                console.error('❌ JSON 파싱 실패:', parseError);
            }
        }

        // 실패 시 fallback (기존과 동일)
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
                    tokenSource: tokenSource,
                    rawResponse: responseText?.substring(0, 200) + '...',
                    usedDynamicToken: tokenSource === 'dynamic_user_token'
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
