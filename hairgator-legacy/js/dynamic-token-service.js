// HAIRGATOR 동적 토큰 서비스 - 클라이언트 측
// 토큰 캐싱 (50분) + 자동 갱신 연동

(function() {
    'use strict';
    
    console.log('🔑 DynamicTokenService 초기화...');
    
    /**
     * 동적 토큰 서비스 클래스
     */
    class DynamicTokenService {
        
        /**
         * 캐시된 토큰 확인
         * @param {string} userId - 사용자 ID
         * @returns {string|null} 유효한 토큰 또는 null
         */
        static getCachedToken(userId) {
            try {
                const cacheKey = `user_token_${userId}`;
                const cached = localStorage.getItem(cacheKey);
                
                if (!cached) {
                    console.log('🔍 캐시된 토큰 없음:', userId);
                    return null;
                }

                const tokenData = JSON.parse(cached);
                
                // 만료 시간 체크 (50분)
                if (Date.now() > tokenData.expiresAt) {
                    localStorage.removeItem(cacheKey);
                    console.log('🕐 캐시된 토큰 만료됨:', userId);
                    return null;
                }

                console.log('✅ 캐시된 토큰 사용:', userId);
                return tokenData.token;

            } catch (error) {
                console.error('⚠️ 캐시 토큰 읽기 실패:', error);
                return null;
            }
        }

        /**
         * 서버에서 사용자 토큰 가져오기
         * @param {string} userId - 사용자 ID
         * @returns {Promise<Object>} { success, token, error }
         */
        static async getUserToken(userId) {
            try {
                console.log('🔑 서버에 사용자 토큰 요청:', userId);
                
                const response = await fetch('/.netlify/functions/bullnabi-proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'getUserToken',
                        userId: userId
                    })
                });

                if (!response.ok) {
                    throw new Error(`Token request failed: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.success && data.token) {
                    // 토큰을 로컬 스토리지에 캐시 (50분)
                    const tokenData = {
                        token: data.token,
                        expiresAt: Date.now() + (50 * 60 * 1000), // 50분 후 만료
                        userId: userId,
                        autoRefreshed: data.autoRefreshed || false,
                        cachedAt: new Date().toISOString()
                    };
                    
                    const cacheKey = `user_token_${userId}`;
                    localStorage.setItem(cacheKey, JSON.stringify(tokenData));
                    
                    if (data.autoRefreshed) {
                        console.log('✅ 자동 갱신된 토큰 획득 및 캐시 완료');
                    } else {
                        console.log('✅ 사용자 토큰 획득 및 캐시 완료');
                    }
                    
                    return {
                        success: true,
                        token: data.token,
                        autoRefreshed: data.autoRefreshed
                    };
                }

                return {
                    success: false,
                    error: data.error || 'Token not available'
                };

            } catch (error) {
                console.error('❌ 사용자 토큰 요청 실패:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * 토큰으로 사용자 데이터 조회
         * @param {string} token - 인증 토큰
         * @param {string} userId - 사용자 ID
         * @returns {Promise<Object>} 사용자 데이터
         */
        static async fetchUserDataWithToken(token, userId) {
            try {
                console.log('📊 토큰으로 사용자 데이터 조회');
                
                const response = await fetch('/.netlify/functions/bullnabi-proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'getUserData',
                        token: token,
                        userId: userId
                    })
                });

                if (!response.ok) {
                    throw new Error(`Data fetch failed: ${response.status}`);
                }

                const data = await response.json();
                
                // 토큰 갱신 필요 감지
                if (data.needRefresh) {
                    console.log('🔄 토큰 갱신 필요 감지, 캐시 클리어');
                    this.clearTokenCache(userId);
                    throw new Error('TOKEN_REFRESH_NEEDED');
                }
                
                return data;

            } catch (error) {
                console.error('❌ 데이터 조회 실패:', error);
                throw error;
            }
        }

        /**
         * 통합 함수: 토큰 획득 + 데이터 조회 (자동 재시도)
         * @param {string} userId - 사용자 ID
         * @returns {Promise<Object>} 사용자 정보
         */
        static async getUserCreditsWithDynamicToken(userId) {
            try {
                console.log('🚀 동적 토큰으로 사용자 정보 조회 시작:', userId);
                
                // 1. 캐시된 토큰 확인
                let token = this.getCachedToken(userId);
                
                // 2. 토큰이 없으면 새로 가져오기
                if (!token) {
                    console.log('🔄 캐시 없음, 서버에서 토큰 발급...');
                    const tokenResult = await this.getUserToken(userId);
                    
                    if (!tokenResult.success) {
                        throw new Error(tokenResult.error || 'Failed to get user token');
                    }
                    
                    token = tokenResult.token;
                }

                // 3. 토큰으로 데이터 조회
                const userData = await this.fetchUserDataWithToken(token, userId);
                
                if (userData.success && userData.data && userData.data.length > 0) {
                    const user = userData.data[0];
                    
                    console.log('✅ 동적 토큰으로 사용자 정보 조회 성공');
                    
                    return {
                        userId: user.userId || userId,
                        name: user.nickname || user.name || '불나비 사용자',
                        email: user.email || '',
                        phone: user.phone || '',
                        remainCount: user.remainCount || 0,
                        lastLoginDate: new Date().toISOString(),
                        source: 'dynamic_token_service'
                    };
                }
                
                throw new Error('No user data found');

            } catch (error) {
                console.error('❌ 동적 토큰 사용자 데이터 조회 실패:', error);
                
                // 토큰 갱신 필요 시 재시도
                if (error.message === 'TOKEN_REFRESH_NEEDED') {
                    console.log('🔄 토큰 갱신 후 재시도...');
                    
                    // 캐시 클리어
                    this.clearTokenCache(userId);
                    
                    // 1회 재시도
                    try {
                        const tokenResult = await this.getUserToken(userId);
                        if (tokenResult.success) {
                            const userData = await this.fetchUserDataWithToken(tokenResult.token, userId);
                            
                            if (userData.success && userData.data && userData.data.length > 0) {
                                const user = userData.data[0];
                                return {
                                    userId: user.userId || userId,
                                    name: user.nickname || user.name || '불나비 사용자',
                                    email: user.email || '',
                                    phone: user.phone || '',
                                    remainCount: user.remainCount || 0,
                                    lastLoginDate: new Date().toISOString(),
                                    source: 'dynamic_token_service_retry'
                                };
                            }
                        }
                    } catch (retryError) {
                        console.error('❌ 재시도 실패:', retryError);
                    }
                }
                
                throw error;
            }
        }

        /**
         * 토큰 강제 갱신
         * @param {string} userId - 사용자 ID
         * @returns {Promise<Object>} { success, token, error }
         */
        static async refreshUserToken(userId) {
            console.log('🔄 토큰 강제 갱신:', userId);
            
            // 캐시 클리어
            this.clearTokenCache(userId);
            
            // 새 토큰 요청
            return await this.getUserToken(userId);
        }

        /**
         * 특정 사용자 토큰 캐시 클리어
         * @param {string} userId - 사용자 ID
         */
        static clearTokenCache(userId) {
            const cacheKey = `user_token_${userId}`;
            localStorage.removeItem(cacheKey);
            console.log('🗑️ 토큰 캐시 클리어:', userId);
        }

        /**
         * 모든 토큰 캐시 클리어
         */
        static clearAllTokenCache() {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith('user_token_')) {
                    localStorage.removeItem(key);
                }
            });
            console.log('🗑️ 모든 토큰 캐시 클리어 완료');
        }

        /**
         * 서버에 토큰 자동 갱신 요청 (수동)
         * @returns {Promise<Object>} { success, token, error }
         */
        static async manualRefreshToken() {
            try {
                console.log('🔄 수동 토큰 갱신 요청...');
                
                const response = await fetch('/.netlify/functions/bullnabi-proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'refreshToken'
                    })
                });

                if (!response.ok) {
                    throw new Error(`Refresh failed: ${response.status}`);
                }

                const data = await response.json();
                
                if (data.success) {
                    console.log('✅ 수동 토큰 갱신 성공');
                    
                    // 모든 캐시 클리어 (새 토큰 적용)
                    this.clearAllTokenCache();
                }
                
                return data;

            } catch (error) {
                console.error('❌ 수동 토큰 갱신 실패:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * 서비스 상태 확인
         * @returns {Object} 서비스 정보
         */
        static getServiceStatus() {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('user_token_'));
            const cachedTokens = keys.map(key => {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    return {
                        userId: data.userId,
                        expiresAt: new Date(data.expiresAt).toISOString(),
                        autoRefreshed: data.autoRefreshed,
                        cachedAt: data.cachedAt
                    };
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);

            return {
                version: '1.0-DYNAMIC-TOKEN',
                tokenCacheSize: keys.length,
                cachedTokens: cachedTokens,
                features: [
                    '🔑 동적 사용자 토큰 발급',
                    '💾 토큰 로컬 캐싱 (50분)',
                    '🔄 서버 토큰 자동 갱신 연동',
                    '🔁 토큰 만료 시 자동 재시도',
                    '🗑️ 만료된 캐시 자동 정리',
                    '⚡ 빠른 응답 (캐시 우선)'
                ],
                endpoints: {
                    getUserToken: '/.netlify/functions/bullnabi-proxy (action: getUserToken)',
                    getUserData: '/.netlify/functions/bullnabi-proxy (action: getUserData)',
                    refreshToken: '/.netlify/functions/bullnabi-proxy (action: refreshToken)'
                }
            };
        }
    }
    
    // 전역 노출
    window.DynamicTokenService = DynamicTokenService;
    
    console.log('✅ DynamicTokenService 준비 완료');
    console.log('사용법: DynamicTokenService.getUserCreditsWithDynamicToken(userId)');
    
})();
