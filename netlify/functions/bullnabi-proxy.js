// HAIRGATOR 불나비 API 프록시 서버 - 토큰 자동 갱신 시스템 완성 버전
// refreshToken, getUserToken, getUserData action 지원

// ========== 🔄 토큰 자동 갱신 시스템 ==========

/**
 * 이메일 로그인으로 새 토큰 발급
 */
async function handleRefreshToken() {
    try {
        const loginId = process.env.BULLNABI_LOGIN_ID;
        const loginPw = process.env.BULLNABI_LOGIN_PW;
        
        if (!loginId || !loginPw) {
            console.error('❌ 로그인 환경변수 없음');
            return { success: false, error: 'Missing login credentials' };
        }
        
        console.log('🔑 토큰 자동 갱신 시작...');
        console.log('- loginId:', loginId);
        
        // documentJson 객체 생성
        const documentJson = {
            loginId: loginId,
            loginPw: loginPw,
            isShortToken: true
        };
        
        // URL-encoded 형식으로 변환
        const formBody = `documentJson=${encodeURIComponent(JSON.stringify(documentJson))}`;
        
        const response = await fetch('https://drylink.ohmyapp.io/bnb/user/token/loginByEmail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formBody
        });
        
        console.log('📡 로그인 API 응답:', response.status);
        
        if (!response.ok) {
            throw new Error(`Login failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📋 로그인 응답 데이터:', JSON.stringify(data).substring(0, 200));
        
        // 응답에서 토큰 추출 (불나비 API 응답 구조)
        const newToken = data.data?.token || data.token || data.data;
        
        if (newToken && typeof newToken === 'string') {
            // 런타임 환경변수 업데이트
            process.env.BULLNABI_TOKEN = newToken;
            console.log('✅ 토큰 자동 갱신 성공:', newToken.substring(0, 20) + '...');
            
            return {
                success: true,
                token: newToken,
                refreshedAt: new Date().toISOString()
            };
        }
        
        console.error('❌ 응답에 토큰 없음:', data);
        return { success: false, error: 'No token in response', responseData: data };
        
    } catch (error) {
        console.error('❌ 토큰 갱신 실패:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 토큰 만료 여부 체크 (더미 쿼리)
 */
async function isTokenExpired(token) {
    try {
        console.log('🔍 토큰 만료 체크 시작...');
        
        const testQuery = {
            "pipeline": {
                "$match": { "_id": { "$oid": "000000000000000000000000" } },
                "$limit": 1
            }
        };
        
        const params = new URLSearchParams();
        params.append('metaCode', '_users');
        params.append('collectionName', '_users');
        params.append('documentJson', JSON.stringify(testQuery));
        
        const FormData = require('form-data');
        const formData = new FormData();
        
        const response = await fetch(
            `http://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline?${params.toString()}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    ...formData.getHeaders()
                },
                body: formData
            }
        );
        
        const data = await response.json();
        
        // code === -110이면 토큰 만료
        if (data.code === -110 || data.code === '-110') {
            console.log('🕐 토큰 만료 감지 (code: -110)');
            return true;
        }
        
        console.log('✅ 토큰 유효함');
        return false;
        
    } catch (error) {
        console.error('⚠️ 토큰 체크 실패:', error);
        return true; // 에러 시 만료로 간주
    }
}

/**
 * 사용자별 토큰 발급 (실제로는 관리자 토큰 반환)
 */
async function handleGetUserToken(userId) {
    try {
        console.log('🔑 사용자 토큰 요청:', userId);
        
        let adminToken = process.env.BULLNABI_TOKEN;
        let wasRefreshed = false;
        
        if (!adminToken) {
            console.log('⚠️ 초기 토큰 없음, 즉시 갱신 시도');
            const refreshResult = await handleRefreshToken();
            
            if (refreshResult.success) {
                adminToken = refreshResult.token;
                wasRefreshed = true;
            } else {
                return {
                    success: false,
                    error: '초기 토큰 발급 실패',
                    details: refreshResult.error
                };
            }
        } else {
            // 토큰 만료 체크
            const expired = await isTokenExpired(adminToken);
            
            if (expired) {
                console.log('🔄 토큰 만료됨, 자동 갱신 시도...');
                const refreshResult = await handleRefreshToken();
                
                if (refreshResult.success) {
                    adminToken = refreshResult.token;
                    wasRefreshed = true;
                } else {
                    return {
                        success: false,
                        error: '토큰 갱신 실패',
                        details: refreshResult.error
                    };
                }
            }
        }
        
        // 관리자 토큰을 "사용자 토큰"으로 반환
        return {
            success: true,
            token: adminToken,
            userId: userId,
            autoRefreshed: wasRefreshed,
            expiresIn: 50 * 60 * 1000, // 50분 (클라이언트 캐싱용)
            note: 'Using admin token as user token with auto-refresh'
        };
        
    } catch (error) {
        console.error('❌ 사용자 토큰 발급 실패:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 토큰으로 사용자 데이터 조회
 */
async function handleGetUserData(token, userId) {
    try {
        console.log('📊 사용자 데이터 조회:', userId);
        
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

        const params = new URLSearchParams();
        params.append('metaCode', metaCode);
        params.append('collectionName', collectionName);
        params.append('documentJson', JSON.stringify(documentJson));

        const url = `http://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline?${params.toString()}`;

        const FormData = require('form-data');
        const formData = new FormData();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                ...formData.getHeaders()
            },
            body: formData
        });

        const responseText = await response.text();
        const apiData = JSON.parse(responseText);
        
        // 토큰 만료 체크
        if (apiData.code === -110 || apiData.code === '-110') {
            return {
                success: false,
                needRefresh: true,
                error: 'Token expired',
                code: apiData.code
            };
        }
        
        if (apiData.data && apiData.data.length > 0) {
            const userData = apiData.data[0];
            
            return {
                success: true,
                data: [{
                    userId: userData._id?.$oid || userId,
                    nickname: userData.nickname || userData.name || '불나비 사용자',
                    name: userData.name || userData.nickname || '사용자',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    remainCount: userData.remainCount || 0,
                    _createTime: userData._createTime,
                    _updateTime: userData._updateTime
                }]
            };
        }
        
        return {
            success: false,
            error: 'No data found',
            apiResponse: apiData
        };
        
    } catch (error) {
        console.error('❌ 사용자 데이터 조회 실패:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ========== 메인 핸들러 ==========

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
        const requestBody = JSON.parse(event.body);
        const { action, userId, userToken, token, data } = requestBody;
        
        console.log('📝 요청 정보:');
        console.log('- action:', action);
        console.log('- userId:', userId);
        console.log('- userToken 있음:', !!userToken);
        console.log('- token 있음:', !!token);

        // ========== Action별 분기 처리 ==========

        // 1. 토큰 자동 갱신 요청
        if (action === 'refreshToken') {
            console.log('🔄 토큰 갱신 요청 처리');
            const result = await handleRefreshToken();
            return {
                statusCode: result.success ? 200 : 500,
                headers: corsHeaders,
                body: JSON.stringify(result)
            };
        }

        // 2. 사용자별 토큰 발급 요청
        if (action === 'getUserToken') {
            console.log('🔑 사용자 토큰 발급 요청 처리');
            
            if (!userId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ success: false, error: 'userId required' })
                };
            }
            
            const result = await handleGetUserToken(userId);
            return {
                statusCode: result.success ? 200 : 500,
                headers: corsHeaders,
                body: JSON.stringify(result)
            };
        }

        // 3. 토큰으로 사용자 데이터 조회
        if (action === 'getUserData') {
            console.log('📊 사용자 데이터 조회 요청 처리');
            
            if (!token || !userId) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ success: false, error: 'token and userId required' })
                };
            }
            
            const result = await handleGetUserData(token, userId);
            return {
                statusCode: result.success ? 200 : 500,
                headers: corsHeaders,
                body: JSON.stringify(result)
            };
        }

        // ========== 기존 방식 (action 없음) ==========
        // userId와 userToken으로 직접 조회
        
        console.log('📝 기존 방식 처리 (action 없음)');
        
        if (!userId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'userId는 필수입니다' })
            };
        }

        // 🆕 토큰 우선순위: 동적 토큰 > 환경변수 토큰
        let finalToken;
        let tokenSource;
        
        if (userToken && userToken.trim()) {
            // 1순위: 클라이언트에서 전달받은 동적 토큰
            finalToken = userToken.trim();
            tokenSource = 'dynamic_user_token';
            console.log('✅ 동적 토큰 사용:', finalToken.substring(0, 20) + '...');
        } else {
            // 2순위: 환경변수 고정 토큰 (백업용)
            finalToken = process.env.BULLNABI_TOKEN;
            tokenSource = 'environment_variable';
            console.log('🔄 환경변수 토큰 사용 (백업):', finalToken ? finalToken.substring(0, 20) + '...' : 'null');
        }
        
        if (!finalToken) {
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

        // Query Parameters로 전송
        const params = new URLSearchParams();
        params.append('metaCode', metaCode);
        params.append('collectionName', collectionName);
        params.append('documentJson', JSON.stringify(documentJson));

        const url = `http://drylink.ohmyapp.io/bnb/aggregateForTableWithDocTimeline?${params.toString()}`;

        console.log('🌐 API 요청 정보:');
        console.log('- URL:', url);
        console.log('- 토큰 소스:', tokenSource);
        console.log('- documentJson:', JSON.stringify(documentJson));

        // FormData는 빈 body로 전송
        const FormData = require('form-data');
        const formData = new FormData();

        // API 호출 (Bearer 접두사 필수)
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${finalToken}`,
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
                    if (apiData.code === -110 || apiData.code === '-110' || apiData.message?.includes('토큰')) {
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
