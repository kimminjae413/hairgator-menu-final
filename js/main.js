// HAIRGATOR Main Application - 최종 버전 (goBack display:none 추가)

// ========== 허용된 사용자 ID 관리 (베타 테스트용) ==========
const ALLOWED_USER_IDS = [
    '691ceee09d868b5736d22007',
    '6536474789a3ad49553b46d7'
];

// 현재 사용자가 허용된 사용자인지 체크
window.isAllowedUser = function() {
    console.log('🔐 isAllowedUser() 체크 시작...');
    console.log('   허용된 ID 목록:', ALLOWED_USER_IDS);

    // URL에서 userId 확인
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    console.log('   URL userId:', urlUserId);
    if (urlUserId && ALLOWED_USER_IDS.includes(urlUserId)) {
        console.log('   ✅ URL userId로 허용됨');
        return true;
    }

    // bullnabi 사용자 확인
    try {
        const bullnabiUser = JSON.parse(localStorage.getItem('bullnabi_user') || '{}');
        console.log('   bullnabi_user:', { userId: bullnabiUser.userId, _id: bullnabiUser._id });
        if (bullnabiUser.userId && ALLOWED_USER_IDS.includes(bullnabiUser.userId)) {
            console.log('   ✅ bullnabi userId로 허용됨');
            return true;
        }
        // _id 필드도 확인 (MongoDB ObjectId)
        if (bullnabiUser._id && ALLOWED_USER_IDS.includes(bullnabiUser._id)) {
            console.log('   ✅ bullnabi _id로 허용됨');
            return true;
        }
    } catch (e) {
        console.log('   bullnabi_user 파싱 오류:', e);
    }

    // userInfo 확인
    try {
        const userInfo = JSON.parse(localStorage.getItem('hairgator_user_info') || '{}');
        console.log('   hairgator_user_info:', { docId: userInfo.docId });
        if (userInfo.docId && ALLOWED_USER_IDS.includes(userInfo.docId)) {
            console.log('   ✅ userInfo docId로 허용됨');
            return true;
        }
    } catch (e) {
        console.log('   hairgator_user_info 파싱 오류:', e);
    }

    console.log('   ❌ 허용되지 않은 사용자');
    return false;
};

// 허용되지 않은 사용자에게 메시지 표시
window.showNotOpenYetMessage = function() {
    if (typeof showToast === 'function') {
        showToast('아직 오픈 전입니다.', 'info');
    } else {
        alert('아직 오픈 전입니다.');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('🦎 HAIRGATOR 메인 앱 시작...');

    // 로그인 정보 대기 상태 추적 (모든 함수보다 먼저 선언)
    let loginInfoPending = true;
    let loginInfoTimeout = null;

    // Elements
    const backBtn = document.getElementById('backBtn');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const genderSelection = document.getElementById('genderSelection');
    const menuContainer = document.getElementById('menuContainer');

    // Initialize
    init();

    function init() {
        console.log('🦎 HAIRGATOR 초기화 시작...');
        setupEventListeners();
        loadTheme();
        checkAuthStatus();
        setupSidebar();
        
        if (backBtn) {
            backBtn.style.display = 'none';
        }
        
        console.log('✅ HAIRGATOR 초기화 완료');
    }

    // 사이드바 메뉴 구조 복원
    function setupSidebar() {
        if (sidebar) {
            const content = sidebar.querySelector('.sidebar-content');
            if (content) {
                content.innerHTML = `
                    <!-- 프로필 정보 -->
                    <div class="profile-info" style="padding: 20px; border-bottom: 1px solid rgba(128,128,128,0.2);">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <!-- 프로필 사진 -->
                            <div id="profileImageContainer" style="position: relative; cursor: pointer;" onclick="showProfileImageModal()">
                                <div id="profileImage" style="
                                    width: 60px;
                                    height: 60px;
                                    border-radius: 50%;
                                    background: linear-gradient(135deg, #4A90E2, #357ABD);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 24px;
                                    color: #fff;
                                    overflow: hidden;
                                ">
                                    <span id="profileInitial">👤</span>
                                </div>
                                <div style="
                                    position: absolute;
                                    bottom: 0;
                                    right: 0;
                                    width: 20px;
                                    height: 20px;
                                    background: rgba(0,0,0,0.6);
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 10px;
                                ">📷</div>
                            </div>
                            <!-- 이름 & 플랜 -->
                            <div style="flex: 1;">
                                <div class="login-status" id="loginStatus" style="color: var(--text-primary, #333); font-size: 14px; font-weight: 600; margin-bottom: 8px;">
                                    ${t('ui.loading')}
                                </div>
                                <div id="planDisplayArea">
                                    <div id="planBadge" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; background: linear-gradient(135deg, #e0e0e0, #bdbdbd); color: #666;">
                                        <span id="planIcon" style="font-size: 10px;">⭐</span>
                                        <span id="planText">-</span>
                                    </div>
                                    <span id="tokenInfo" style="display: none; margin-left: 6px; font-size: 10px; color: var(--text-secondary, #888);"></span>
                                </div>
                            </div>
                            <!-- 언어 선택 버튼 -->
                            <div id="languageSelectorBtn" onclick="showLanguageModal()" style="
                                cursor: pointer;
                                padding: 8px;
                                border-radius: 8px;
                                background: rgba(128,128,128,0.1);
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                gap: 2px;
                                transition: background 0.2s ease;
                            ">
                                <span id="currentLanguageFlag" style="font-size: 24px;">${getLanguageFlag(window.currentLanguage || 'ko')}</span>
                                <span style="font-size: 10px; color: var(--text-secondary, #aaa);">Language</span>
                            </div>
                        </div>
                    </div>

                    <!-- 메뉴 목록 -->
                    <nav class="sidebar-menu" style="padding: 10px 0;">

                        <!-- 테마 전환 -->
                        <div class="menu-item" id="themeToggleMenu" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span id="themeIcon" style="font-size: 20px;">🌙</span>
                                <span id="themeText" class="sidebar-menu-text" style="font-size: 14px;">${t('ui.darkMode')}</span>
                            </div>
                        </div>

                        <!-- 퍼스널 이미지 분석 -->
                        <div class="menu-item" id="personalColorBtn" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">🌈</span>
                                <span class="sidebar-menu-text" style="font-size: 14px;">${t('ui.personalColor')}</span>
                            </div>
                        </div>

                        <!-- 상호 설정 -->
                        <div class="menu-item" id="brandSettingBtn" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">✏️</span>
                                <span class="sidebar-menu-text" style="font-size: 14px;">${t('ui.brandSetting') || '상호 설정'}</span>
                            </div>
                        </div>

                        <!-- 로그아웃 -->
                        <div class="menu-item" id="logoutBtn" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">🚪</span>
                                <span style="color: #ff4444; font-size: 14px;">${t('ui.logout')}</span>
                            </div>
                        </div>

                        <!-- 구분선 -->
                        <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(128,128,128,0.3), transparent); margin: 15px 20px;"></div>

                        <!-- 플랜 업그레이드 -->
                        <div class="menu-item premium-upgrade-btn" id="premiumUpgradeBtn" style="padding: 15px 20px; cursor: pointer; background: linear-gradient(135deg, rgba(233, 30, 99, 0.1), rgba(74, 144, 226, 0.1)); border-radius: 12px; margin: 10px 15px; border: 1px solid rgba(233, 30, 99, 0.2);">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">⬆️</span>
                                <div style="flex: 1;">
                                    <div class="sidebar-menu-text" style="font-size: 14px; font-weight: 600;">${t('payment.upgrade') || '플랜 업그레이드'}</div>
                                    <div style="font-size: 11px; color: var(--text-secondary, #888); margin-top: 2px;">${t('payment.unlockAll') || '모든 기능 잠금 해제'}</div>
                                </div>
                                <span style="font-size: 14px; animation: sparkle 2s ease-in-out infinite;">✨</span>
                            </div>
                        </div>

                    </nav>
                `;

                const style = document.createElement('style');
                style.textContent = `
                    .menu-item:hover {
                        background: rgba(128, 128, 128, 0.1) !important;
                        transition: background 0.3s ease;
                    }

                    .sidebar-menu {
                        max-height: calc(100vh - 200px);
                        overflow-y: auto;
                    }

                    /* 사이드바 메뉴 텍스트 색상 - 다크모드 */
                    .sidebar-menu-text {
                        color: #ffffff;
                    }

                    /* 사이드바 메뉴 텍스트 색상 - 라이트모드 */
                    body.light-theme .sidebar-menu-text {
                        color: #333333;
                    }

                    body.light-theme .sidebar {
                        background: #f5f5f5;
                    }

                    body.light-theme .sidebar-header {
                        background: #f5f5f5;
                        border-bottom: 1px solid rgba(0,0,0,0.1);
                    }

                    body.light-theme .sidebar-header h3,
                    body.light-theme .sidebar-close {
                        color: #333;
                    }

                    /* 프리미엄 업그레이드 버튼 */
                    .premium-upgrade-btn:hover {
                        background: linear-gradient(135deg, rgba(233, 30, 99, 0.2), rgba(74, 144, 226, 0.2)) !important;
                        border-color: rgba(233, 30, 99, 0.4) !important;
                    }

                    @keyframes sparkle {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.6; transform: scale(1.2); }
                    }
                `;
                document.head.appendChild(style);

                console.log('✅ 사이드바 메뉴 복원 완료');

                // ⭐ 사이드바 메뉴 이벤트 리스너 재설정
                setupSidebarMenuListeners();

                updateLoginInfo();
            }
        }
    }

    // ⭐ 사이드바 메뉴 이벤트 리스너 설정 (재사용 가능)
    function setupSidebarMenuListeners() {
        const themeToggleMenu = document.getElementById('themeToggleMenu');
        const personalColorBtn = document.getElementById('personalColorBtn');
        const brandSettingBtn = document.getElementById('brandSettingBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (themeToggleMenu) {
            themeToggleMenu.addEventListener('click', toggleTheme);
        }

        if (personalColorBtn) {
            personalColorBtn.addEventListener('click', async function() {
                console.log('🎨 퍼스널 이미지 분석 클릭');

                // 허용된 사용자 체크 (베타 테스트 기간)
                if (!window.isAllowedUser()) {
                    window.showNotOpenYetMessage();
                    return;
                }

                // 무료 플랜 사용자는 이용 불가
                if (window.BullnabiBridge) {
                    const result = await window.BullnabiBridge.getTokenBalance();
                    if (result.success && result.plan === 'free') {
                        if (typeof showToast === 'function') {
                            showToast(t('payment.freePlanRestricted') || '유료 플랜 구독 시 이용 가능합니다.', 'warning');
                        } else {
                            alert('유료 플랜 구독 시 이용 가능합니다.');
                        }
                        return;
                    }
                }

                const gender = window.currentGender || 'female';
                window.location.href = `/personal-color/?gender=${gender}`;
            });
        }

        if (brandSettingBtn) {
            brandSettingBtn.addEventListener('click', function() {
                console.log('✏️ 상호 설정 클릭');
                showBrandSettingModal();
                closeSidebar();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        // 프리미엄 업그레이드 버튼
        const premiumUpgradeBtn = document.getElementById('premiumUpgradeBtn');
        if (premiumUpgradeBtn) {
            premiumUpgradeBtn.addEventListener('click', function() {
                console.log('⬆️ 플랜 업그레이드 클릭');
                closeSidebar();

                // 허용된 사용자만 요금제 모달 표시
                const PAYMENT_ALLOWED_USER_ID = '691ceee09d868b5736d22007';
                const bullnabiUser = window.getBullnabiUser && window.getBullnabiUser();
                const currentUserId = bullnabiUser?.userId || bullnabiUser?.id;

                if (currentUserId === PAYMENT_ALLOWED_USER_ID) {
                    // openPricingModal 함수 호출 (index.html에 정의됨)
                    if (typeof openPricingModal === 'function') {
                        openPricingModal();
                    } else {
                        console.warn('openPricingModal 함수를 찾을 수 없음');
                    }
                } else {
                    // 다른 사용자는 오픈 전 메시지 표시
                    if (typeof showToast === 'function') {
                        showToast('결제 기능은 곧 오픈 예정입니다.', 'info');
                    } else {
                        alert('결제 기능은 곧 오픈 예정입니다.');
                    }
                }
            });
        }

        console.log('✅ 사이드바 메뉴 이벤트 리스너 설정 완료');
    }

    function updateLoginInfo() {
        const loginStatus = document.getElementById('loginStatus');
        const planBadge = document.getElementById('planBadge');
        const planIcon = document.getElementById('planIcon');
        const planText = document.getElementById('planText');
        const tokenInfo = document.getElementById('tokenInfo');

        // 플랜 설정 (이름, 아이콘, 그라데이션)
        const planConfig = {
            'free': {
                name: '무료',
                icon: '🎁',
                gradient: 'linear-gradient(135deg, #78909c, #546e7a)',
                color: '#fff'
            },
            'basic': {
                name: '베이직',
                icon: '💎',
                gradient: 'linear-gradient(135deg, #4FC3F7, #0288D1)',
                color: '#fff'
            },
            'standard': {
                name: '프로',
                icon: '🚀',
                gradient: 'linear-gradient(135deg, #BA68C8, #7B1FA2)',
                color: '#fff'
            },
            'business': {
                name: '비즈니스',
                icon: '👑',
                gradient: 'linear-gradient(135deg, #FFD54F, #FF8F00)',
                color: '#333'
            }
        };

        // 관리자 ID 목록
        const ADMIN_IDS = ['691ceee09d868b5736d22007'];

        const bullnabiUser = window.getBullnabiUser && window.getBullnabiUser();
        if (bullnabiUser) {
            // 불나비 로그인 성공
            loginInfoPending = false;
            if (loginInfoTimeout) {
                clearTimeout(loginInfoTimeout);
                loginInfoTimeout = null;
            }
            if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${bullnabiUser.name}`;

            // 플랜 & 토큰 표시
            const tokenBalance = bullnabiUser.tokenBalance ?? window.currentDesigner?.tokenBalance ?? 0;
            const plan = bullnabiUser.plan || window.currentDesigner?.plan || 'free';
            const userId = bullnabiUser.userId || bullnabiUser.id || bullnabiUser._id;
            const isAdmin = ADMIN_IDS.includes(userId);
            const config = planConfig[plan] || planConfig['free'];

            // 배지 스타일 적용
            if (planBadge) {
                planBadge.style.background = config.gradient;
                planBadge.style.color = config.color;
                planBadge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            }
            if (planIcon) planIcon.textContent = config.icon;
            if (planText) planText.textContent = config.name;

            // 관리자만 토큰 정보 표시
            if (tokenInfo) {
                if (isAdmin) {
                    tokenInfo.style.display = 'inline';
                    tokenInfo.innerHTML = `💰 ${tokenBalance.toLocaleString()}`;
                } else {
                    tokenInfo.style.display = 'none';
                }
            }
        } else {
            const designerName = localStorage.getItem('designerName');
            if (designerName) {
                // localStorage에서 로그인 정보 있음
                loginInfoPending = false;
                if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${designerName}`;
                if (planText) planText.textContent = '-';
            } else if (loginInfoPending) {
                // 아직 로그인 정보 대기 중 - 로딩 표시
                if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ...`;
                if (planText) planText.textContent = '...';

                // 2초 후에도 로그인 정보 없으면 게스트로 표시
                if (!loginInfoTimeout) {
                    loginInfoTimeout = setTimeout(() => {
                        loginInfoPending = false;
                        const currentUser = window.getBullnabiUser && window.getBullnabiUser();
                        const currentDesignerName = localStorage.getItem('designerName');
                        if (!currentUser && !currentDesignerName) {
                            if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${t('ui.guest')}`;
                            if (planText) planText.textContent = '-';
                        }
                    }, 2000);
                }
            } else {
                // 대기 완료 후 게스트로 확정
                if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${t('ui.guest')}`;
                if (planText) planText.textContent = '-';
            }
        }
    }

    function setupEventListeners() {
        if (backBtn) {
            backBtn.addEventListener('click', handleBack);
        }

        if (menuBtn) {
            menuBtn.addEventListener('click', openSidebar);
        }

        if (sidebarClose) {
            sidebarClose.addEventListener('click', closeSidebar);
        }

        // ⭐ 헤더의 언어 선택 버튼
        const languageBtnHeader = document.getElementById('languageBtnHeader');
        if (languageBtnHeader) {
            languageBtnHeader.addEventListener('click', showLanguageModal);
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (typeof window.HAIRGATOR_MENU?.closeStyleModal === 'function') {
                    window.HAIRGATOR_MENU.closeStyleModal();
                }
                if (sidebar && sidebar.classList.contains('active')) {
                    closeSidebar();
                }
            }
        });

        document.addEventListener('click', function(e) {
            if (sidebar && sidebar.classList.contains('active')) {
                if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                    closeSidebar();
                }
            }
        });

        console.log('✅ 이벤트 리스너 설정 완료');
    }

    function handleBack() {
        if (menuContainer && menuContainer.classList.contains('active')) {
            menuContainer.classList.remove('active');
            if (genderSelection) genderSelection.style.display = 'flex';
            if (backBtn) backBtn.style.display = 'flex';
            
            if (window.currentGender) window.currentGender = null;
            if (window.currentMainTab) window.currentMainTab = null;
            if (window.currentSubTab) window.currentSubTab = null;
            
            console.log('🔙 메뉴 → 성별 선택');
        }
    }

    function openSidebar() {
        if (sidebar) {
            sidebar.classList.add('active');
            updateLoginInfo();
        }
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
        const isLight = savedTheme === 'light';
        
        if (isLight) {
            document.body.classList.add('light-theme');
        }
        
        setTimeout(() => {
            const themeIcon = document.getElementById('themeIcon');
            const themeText = document.getElementById('themeText');

            // 현재 라이트면 → 다크로 전환 버튼 표시, 현재 다크면 → 라이트로 전환 버튼 표시
            if (themeIcon) themeIcon.textContent = isLight ? '🌙' : '☀️';
            if (themeText) themeText.textContent = isLight ? t('ui.switchToDark') : t('ui.switchToLight');
        }, 100);
        
        console.log(`🎨 테마 로드: ${savedTheme}`);
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        const theme = isLight ? 'light' : 'dark';

        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');

        // 현재 라이트면 → 다크로 전환 버튼 표시, 현재 다크면 → 라이트로 전환 버튼 표시
        if (themeIcon) themeIcon.textContent = isLight ? '🌙' : '☀️';
        if (themeText) themeText.textContent = isLight ? t('ui.switchToDark') : t('ui.switchToLight');

        localStorage.setItem('hairgator_theme', theme);
        console.log(`🎨 테마 변경: ${theme}`);

        // Firebase에 테마 저장
        if (typeof saveThemeToFirebase === 'function') {
            saveThemeToFirebase(theme);
        }

        // 테마에 맞는 브랜드 색상 적용
        if (typeof applyCustomBrand === 'function') {
            applyCustomBrand();
        }

        closeSidebar();
    }

    function checkAuthStatus() {
        const designerInfo = document.getElementById('designerInfo');
        if (window.auth && window.auth.currentUser) {
            if (designerInfo) designerInfo.style.display = 'block';
            const designerNameEl = document.getElementById('designerName');
            if (designerNameEl) {
                designerNameEl.textContent = window.auth.currentUser.displayName || window.auth.currentUser.email;
            }
            console.log('✅ 사용자 인증 확인 완료');
        }
    }

    async function handleLogout() {
        if (confirm(t('ui.logoutConfirm') || '로그아웃 하시겠습니까?')) {
            try {
                localStorage.removeItem('bullnabi_user');
                localStorage.removeItem('bullnabi_login_time');
                localStorage.removeItem('designerName');
                localStorage.removeItem('designerPhone');
                localStorage.removeItem('designerPassword');
                localStorage.removeItem('loginTime');
                sessionStorage.clear();

                console.log('✅ 로그아웃 완료');
                location.reload();
            } catch (error) {
                console.error('❌ 로그아웃 오류:', error);
                showToast(t('ui.logoutFailed') || '로그아웃 실패: ' + error.message);
            }
        }
    }

    // ⭐⭐⭐ 언어 선택 함수 ⭐⭐⭐
    let isOnboardingMode = false;
    function showLanguageModal(isOnboarding = false) {
        isOnboardingMode = isOnboarding;
        const languages = [
            { code: 'ko', name: '한국어', flag: '🇰🇷' },
            { code: 'en', name: 'English', flag: '🇺🇸' },
            { code: 'ja', name: '日本語', flag: '🇯🇵' },
            { code: 'zh', name: '中文', flag: '🇨🇳' },
            { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
            { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
            { code: 'es', name: 'Español', flag: '🇪🇸' }
        ];

        const currentLang = loadLanguage();

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--bg-primary, #1a1a1a);
            border-radius: 15px;
            padding: 20px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        `;

        content.innerHTML = `
            <h3 style="color: var(--text-primary, #fff); margin-bottom: 15px; font-size: 18px;">🌍 언어 선택 / Select Language</h3>
            <div id="languageOptions"></div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        const optionsContainer = content.querySelector('#languageOptions');

        languages.forEach(lang => {
            const option = document.createElement('div');
            option.style.cssText = `
                padding: 15px;
                margin: 5px 0;
                background: ${currentLang === lang.code ? '#4A90E2' : 'rgba(255, 255, 255, 0.05)'};
                border-radius: 10px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.2s;
            `;

            option.innerHTML = `
                <span style="font-size: 24px;">${lang.flag}</span>
                <span style="color: #fff; font-size: 16px;">${lang.name}</span>
                ${currentLang === lang.code ? '<span style="margin-left: auto; color: #fff;">✓</span>' : ''}
            `;

            option.addEventListener('mouseenter', () => {
                if (currentLang !== lang.code) {
                    option.style.background = 'rgba(255, 255, 255, 0.1)';
                }
            });

            option.addEventListener('mouseleave', () => {
                if (currentLang !== lang.code) {
                    option.style.background = 'rgba(255, 255, 255, 0.05)';
                }
            });

            option.addEventListener('click', () => {
                changeLanguage(lang.code);
                modal.remove();
                closeSidebar();
            });

            optionsContainer.appendChild(option);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal && !isOnboardingMode) {
                modal.remove();
            }
        });
    }

    function changeLanguage(langCode) {
        console.log(`🌍 언어 변경: ${langCode}`);
        setLanguage(langCode);

        // UI 텍스트 업데이트
        updateAllTexts();

        // 국기 업데이트
        if (typeof updateLanguageFlag === 'function') {
            updateLanguageFlag();
        }

        // Firebase에 언어 저장
        if (typeof saveLanguageToFirebase === 'function') {
            saveLanguageToFirebase(langCode);
        }

        // 메뉴 리로드 (현재 성별이 있으면)
        if (window.currentGender && typeof window.HAIRGATOR_MENU?.loadMenuForGender === 'function') {
            window.HAIRGATOR_MENU.loadMenuForGender(window.currentGender);
        }

        // ⭐ 챗봇 언어도 동기화
        if (window.hairgatorChatbot) {
            window.hairgatorChatbot.currentLanguage = langCode;
            if (window.hairgatorChatbot.core) {
                window.hairgatorChatbot.core.currentLanguage = langCode;
            }
            console.log(`✅ 챗봇 언어 동기화: ${langCode}`);
        }

        const langName = window.LANGUAGE_OPTIONS?.find(l => l.id === langCode)?.name || langCode;
        const langFlag = typeof getLanguageFlag === 'function' ? getLanguageFlag(langCode) : '';
        showToast(`${langName} ${langFlag}`);

        // Firebase에도 언어 저장 (userId 기반)
        if (typeof saveLanguageToFirebaseByUserId === 'function') {
            saveLanguageToFirebaseByUserId(langCode);
        }

        // 온보딩 모드에서 언어 선택 완료 시 콜백 호출
        if (isOnboardingMode && typeof window.onLanguageSelected === 'function') {
            isOnboardingMode = false;
            window.onLanguageSelected();
        }
    }

    function updateAllTexts() {
        // 사이드바 텍스트 업데이트
        const themeText = document.getElementById('themeText');

        const isLight = document.body.classList.contains('light-theme');
        if (themeText) {
            // 현재 라이트면 → 다크로 전환 버튼 표시, 현재 다크면 → 라이트로 전환 버튼 표시
            themeText.textContent = isLight ? t('ui.switchToDark') : t('ui.switchToLight');
        }

        // 사이드바 재생성
        setupSidebar();
        updateLoginInfo();

        // 프로필 사진 다시 적용
        if (typeof applyProfileImage === 'function') {
            applyProfileImage();
        }

        // 성별 선택 화면 재번역
        const maleLabelElements = document.querySelectorAll('.gender-btn.male .gender-label');
        const femaleLabelElements = document.querySelectorAll('.gender-btn.female .gender-label');

        maleLabelElements.forEach(el => {
            if (el) el.textContent = t('gender.male');
        });

        femaleLabelElements.forEach(el => {
            if (el) el.textContent = t('gender.female');
        });
    }

    function showToast(message) {
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: toastSlideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'toastSlideOut 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }

    // ⭐ 전역에 노출
    window.showLanguageModal = showLanguageModal;
    window.setupSidebar = setupSidebar;
    window.toggleTheme = toggleTheme;
    window.updateLoginInfo = updateLoginInfo;

    // ⭐⭐⭐ 최종 수정된 goBack 함수 (불나비 자동 로그인 전용) ⭐⭐⭐
    window.goBack = function() {
        console.log('🔙 goBack() 호출');

        const menuContainer = document.getElementById('menuContainer');
        const genderSelection = document.getElementById('genderSelection');
        // const loginScreen = document.getElementById('loginScreen'); // 로그인 화면 비활성화
        const backBtn = document.getElementById('backBtn');

        // 메뉴 → 성별 선택
        if (menuContainer && menuContainer.classList.contains('active')) {
            console.log('🔙 Step 1: 메뉴 숨김');

            // 메뉴 완전히 숨기기
            menuContainer.classList.remove('active');
            menuContainer.style.display = 'none';  // ⭐ 핵심!

            // 성별 선택 보이기
            if (genderSelection) {
                genderSelection.style.display = 'flex';
                genderSelection.style.visibility = 'visible';
                genderSelection.style.opacity = '1';
                console.log('✅ 성별 선택 표시됨');
            }

            // 버튼 유지
            if (backBtn) {
                backBtn.style.display = 'flex';
            }

            // 전역 변수 리셋
            if (window.currentGender) window.currentGender = null;
            if (window.currentMainTab) window.currentMainTab = null;
            if (window.currentSubTab) window.currentSubTab = null;

            // 크리스마스 효과 다시 생성 (눈내리기만)
            setTimeout(() => {
                if (typeof window.createSnowflakes === 'function') window.createSnowflakes();
            }, 300);

            console.log('✅ 메뉴 → 성별 완료');
            return;
        }

        /* ========== 성별 선택 → 로그인 (백업용 - 불나비 자동 로그인 사용으로 비활성화) ==========
        if (genderSelection && genderSelection.style.display === 'flex') {
            console.log('🔙 Step 2: 성별 숨김');

            genderSelection.style.display = 'none';

            if (loginScreen) {
                loginScreen.style.display = 'flex';
                console.log('✅ 로그인 화면 표시됨');
            }

            if (backBtn) {
                backBtn.style.display = 'none';
            }

            console.log('✅ 성별 → 로그인 완료');
            return;
        }
        ========== 성별 선택 → 로그인 종료 ========== */

        // 성별 선택 화면에서 뒤로가기: 앱 종료 (불나비에서 처리)
        if (genderSelection && genderSelection.style.display === 'flex') {
            console.log('🔙 성별 선택에서 뒤로가기 - 앱 종료 시도');

            // 뒤로가기 버튼 숨김
            if (backBtn) {
                backBtn.style.display = 'none';
            }

            // 불나비 앱이면 앱 종료 메시지 전송
            if (window.BullnabiBridge && window.BullnabiBridge.isInNativeApp()) {
                window.BullnabiBridge.sendToNative({ type: 'CLOSE_APP' });
            }

            return;
        }

        console.warn('⚠️ 알 수 없는 상태');
    };

    setTimeout(() => {
        if (typeof window.HAIRGATOR_MENU === 'undefined') {
            console.error('❌ menu.js가 로드되지 않았습니다');
            showToast('⚠️ 메뉴 시스템 로드 실패. 페이지를 새로고침해주세요.');
        } else {
            console.log('✅ menu.js 연동 확인');
        }
        
        if (typeof window.goBack === 'undefined') {
            console.error('❌ goBack() 함수가 없습니다');
        } else {
            console.log('✅ goBack() 함수 확인');
        }
    }, 1000);

    // ⭐ 전역 함수로 노출 (챗봇과 동기화를 위해)
    window.showToast = showToast;
    window.changeLanguage = changeLanguage;
    window.updateAllTexts = updateAllTexts;

    console.log('🚀 HAIRGATOR 메인 애플리케이션 준비 완료');
});

window.addEventListener('load', function() {
    console.log('🦎 HAIRGATOR 앱 완전 로드 완료');
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastSlideIn {
            from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        
        @keyframes toastSlideOut {
            from { transform: translateX(-50%) translateY(0); opacity: 1; }
            to { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        }
        
        .toast-message {
            white-space: pre-line;
        }
    `;
    document.head.appendChild(style);

    // 저장된 상호명 적용
    const savedBrandOnLoad = localStorage.getItem('hairgator_brand_name');
    console.log('🏷️ 페이지 로드 시 저장된 브랜드 (localStorage):', savedBrandOnLoad);

    // localStorage에 있으면 먼저 적용
    applyCustomBrand();

    // Firebase에서 브랜드 로드 (앱용 - 여러 번 시도)
    async function tryLoadBrandFromFirebase(attempt = 1) {
        const maxAttempts = 5;
        const delay = attempt * 1000; // 1초, 2초, 3초, 4초, 5초

        console.log(`🏷️ Firebase 브랜드 로드 시도 ${attempt}/${maxAttempts}`);

        const firebaseBrand = await loadBrandFromFirebase();
        if (firebaseBrand) {
            console.log('🏷️ Firebase에서 브랜드 로드 성공!');
            applyCustomBrand();
            applyProfileImage();
        } else if (attempt < maxAttempts) {
            // 로그인 정보가 아직 없으면 다시 시도
            setTimeout(() => tryLoadBrandFromFirebase(attempt + 1), delay);
        }
    }

    // 1초 후 첫 시도
    setTimeout(() => tryLoadBrandFromFirebase(1), 1000);
});

// ========== 상호 설정 기능 ==========

// 폰트 옵션 - i18n 키 사용
const FONT_OPTIONS = [
    { id: 'default', i18nKey: 'fontDefault', fontFamily: "'Pretendard', -apple-system, sans-serif" },
    { id: 'noto-sans', i18nKey: 'fontNotoSans', fontFamily: "'Noto Sans KR', sans-serif" },
    { id: 'nanum-gothic', i18nKey: 'fontNanumGothic', fontFamily: "'Nanum Gothic', sans-serif" },
    { id: 'spoqa', i18nKey: 'fontSpoqa', fontFamily: "'Spoqa Han Sans Neo', sans-serif" },
    { id: 'montserrat', i18nKey: 'fontMontserrat', fontFamily: "'Montserrat', sans-serif" },
    { id: 'playfair', i18nKey: 'fontPlayfair', fontFamily: "'Playfair Display', serif" },
    { id: 'dancing', i18nKey: 'fontDancing', fontFamily: "'Dancing Script', cursive" },
    { id: 'bebas', i18nKey: 'fontBebas', fontFamily: "'Bebas Neue', sans-serif" }
];

// 색상 옵션
const COLOR_OPTIONS = [
    { id: 'white', name: '화이트', color: '#FFFFFF' },
    { id: 'black', name: '블랙', color: '#000000' },
    { id: 'gold', name: '골드', color: '#D4AF37' },
    { id: 'silver', name: '실버', color: '#C0C0C0' },
    { id: 'pink', name: '핑크', color: '#E91E63' },
    { id: 'blue', name: '블루', color: '#4A90E2' },
    { id: 'red', name: '레드', color: '#E53935' },
    { id: 'green', name: '그린', color: '#43A047' }
];

function showBrandSettingModal() {
    // 기존 모달 제거
    const existingModal = document.getElementById('brand-setting-modal');
    if (existingModal) existingModal.remove();

    // 저장된 설정 불러오기
    const savedBrand = localStorage.getItem('hairgator_brand_name') || '';
    const savedFont = localStorage.getItem('hairgator_brand_font') || 'default';
    const savedColorLight = localStorage.getItem('hairgator_brand_color_light') || 'black';
    const savedColorDark = localStorage.getItem('hairgator_brand_color_dark') || 'white';

    // 현재 테마 확인
    const isLightMode = document.body.classList.contains('light-theme');

    const modal = document.createElement('div');
    modal.id = 'brand-setting-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(3px);
    `;

    const fontPreviewText = t('ui.fontPreview') || 'Aa 가나';
    const fontOptionsHtml = FONT_OPTIONS.map(font => `
        <label class="font-option ${savedFont === font.id ? 'selected' : ''}" data-font-id="${font.id}">
            <input type="radio" name="brandFont" value="${font.id}" ${savedFont === font.id ? 'checked' : ''} style="display: none;">
            <span class="font-preview" style="font-family: ${font.fontFamily}; color: #fff;">${fontPreviewText}</span>
            <span class="font-name">${t('ui.' + font.i18nKey) || font.id}</span>
        </label>
    `).join('');

    const colorOptionsLightHtml = COLOR_OPTIONS.map(color => `
        <label class="color-option-light ${savedColorLight === color.id ? 'selected' : ''}" data-color-id="${color.id}">
            <input type="radio" name="brandColorLight" value="${color.id}" ${savedColorLight === color.id ? 'checked' : ''} style="display: none;">
            <span class="color-circle" style="background: ${color.color}; ${color.id === 'white' ? 'border: 1px solid #666;' : ''}"></span>
        </label>
    `).join('');

    const colorOptionsDarkHtml = COLOR_OPTIONS.map(color => `
        <label class="color-option-dark ${savedColorDark === color.id ? 'selected' : ''}" data-color-id="${color.id}">
            <input type="radio" name="brandColorDark" value="${color.id}" ${savedColorDark === color.id ? 'checked' : ''} style="display: none;">
            <span class="color-circle" style="background: ${color.color}; ${color.id === 'white' ? 'border: 1px solid #666;' : ''}"></span>
        </label>
    `).join('');

    modal.innerHTML = `
        <div style="
            background: #1a1a1a;
            border-radius: 16px;
            padding: 24px;
            width: 90%;
            max-width: 420px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: #fff; font-size: 18px; margin: 0;">✏️ ${t('ui.brandSetting')}</h3>
                <button id="closeBrandModal" style="
                    background: none;
                    border: none;
                    color: #fff;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                ">×</button>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; color: #aaa; font-size: 12px; margin-bottom: 8px;">
                    ${t('ui.brandNameLabel')}
                </label>
                <input type="text" id="brandNameInput" value="${savedBrand}" placeholder="${t('ui.brandNamePlaceholder')}" maxlength="20" style="
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    background: rgba(255,255,255,0.05);
                    color: #fff;
                    font-size: 16px;
                    box-sizing: border-box;
                ">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; color: #aaa; font-size: 12px; margin-bottom: 12px;">
                    ${t('ui.fontSelect')}
                </label>
                <div id="fontOptions" style="
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                ">
                    ${fontOptionsHtml}
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; color: #aaa; font-size: 12px; margin-bottom: 12px;">
                    ${t('ui.fontColorLight')}
                </label>
                <div id="colorOptionsLight" style="
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    justify-content: center;
                ">
                    ${colorOptionsLightHtml}
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; color: #aaa; font-size: 12px; margin-bottom: 12px;">
                    ${t('ui.fontColorDark')}
                </label>
                <div id="colorOptionsDark" style="
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    justify-content: center;
                ">
                    ${colorOptionsDarkHtml}
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; color: #aaa; font-size: 12px; margin-bottom: 8px;">
                    ${t('ui.preview')}
                </label>
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1; padding: 16px; background: #ffffff; border-radius: 8px;">
                        <div style="font-size: 10px; color: #666; margin-bottom: 6px; text-align: center;">${t('ui.previewLight')}</div>
                        <div id="brandPreviewLight" style="
                            font-size: 20px;
                            font-weight: bold;
                            color: ${COLOR_OPTIONS.find(c => c.id === savedColorLight)?.color || '#000000'};
                            text-align: center;
                            font-family: ${FONT_OPTIONS.find(f => f.id === savedFont)?.fontFamily || 'inherit'};
                        ">${savedBrand || 'HAIRGATOR'}</div>
                    </div>
                    <div style="flex: 1; padding: 16px; background: #1a1a1a; border-radius: 8px;">
                        <div style="font-size: 10px; color: #888; margin-bottom: 6px; text-align: center;">${t('ui.previewDark')}</div>
                        <div id="brandPreviewDark" style="
                            font-size: 20px;
                            font-weight: bold;
                            color: ${COLOR_OPTIONS.find(c => c.id === savedColorDark)?.color || '#FFFFFF'};
                            text-align: center;
                            font-family: ${FONT_OPTIONS.find(f => f.id === savedFont)?.fontFamily || 'inherit'};
                        ">${savedBrand || 'HAIRGATOR'}</div>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 10px;">
                <button id="resetBrandBtn" style="
                    flex: 1;
                    padding: 12px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: transparent;
                    color: var(--text-secondary, #aaa);
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                ">${t('ui.reset')}</button>
                <button id="saveBrandBtn" style="
                    flex: 2;
                    padding: 12px;
                    border: none;
                    background: linear-gradient(135deg, #E91E63, #C2185B);
                    color: #fff;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                ">${t('ui.save')}</button>
            </div>
        </div>

        <style>
            .font-option {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 8px;
                border: 2px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .font-option:hover {
                border-color: rgba(255,255,255,0.3);
            }
            .font-option.selected {
                border-color: #E91E63;
                background: rgba(233, 30, 99, 0.1);
            }
            .font-preview {
                font-size: 18px;
                color: var(--text-primary, #fff);
                margin-bottom: 4px;
            }
            .font-name {
                font-size: 10px;
                color: var(--text-secondary, #aaa);
            }
            .color-option-light, .color-option-dark {
                cursor: pointer;
                transition: all 0.2s;
            }
            .color-option-light .color-circle, .color-option-dark .color-circle {
                display: block;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                transition: all 0.2s;
            }
            .color-option-light:hover .color-circle, .color-option-dark:hover .color-circle {
                transform: scale(1.1);
            }
            .color-option-light.selected .color-circle, .color-option-dark.selected .color-circle {
                box-shadow: 0 0 0 3px #E91E63;
                transform: scale(1.1);
            }
        </style>
    `;

    document.body.appendChild(modal);

    // 이벤트 리스너
    const closeBtn = document.getElementById('closeBrandModal');
    const saveBtn = document.getElementById('saveBrandBtn');
    const resetBtn = document.getElementById('resetBrandBtn');
    const brandInput = document.getElementById('brandNameInput');
    const fontOptions = document.querySelectorAll('.font-option');
    const colorOptionsLight = document.querySelectorAll('.color-option-light');
    const colorOptionsDark = document.querySelectorAll('.color-option-dark');
    const previewLight = document.getElementById('brandPreviewLight');
    const previewDark = document.getElementById('brandPreviewDark');

    // 닫기
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    // 입력 시 미리보기 업데이트
    brandInput.oninput = () => {
        const text = brandInput.value || 'HAIRGATOR';
        previewLight.textContent = text;
        previewDark.textContent = text;
    };

    // 폰트 선택
    fontOptions.forEach(option => {
        option.onclick = () => {
            fontOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            option.querySelector('input').checked = true;
            const fontId = option.dataset.fontId;
            const font = FONT_OPTIONS.find(f => f.id === fontId);
            if (font) {
                previewLight.style.fontFamily = font.fontFamily;
                previewDark.style.fontFamily = font.fontFamily;
            }
        };
    });

    // 라이트 모드 색상 선택
    colorOptionsLight.forEach(option => {
        option.onclick = () => {
            colorOptionsLight.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            option.querySelector('input').checked = true;
            const colorId = option.dataset.colorId;
            const color = COLOR_OPTIONS.find(c => c.id === colorId);
            if (color) {
                previewLight.style.color = color.color;
            }
        };
    });

    // 다크 모드 색상 선택
    colorOptionsDark.forEach(option => {
        option.onclick = () => {
            colorOptionsDark.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            option.querySelector('input').checked = true;
            const colorId = option.dataset.colorId;
            const color = COLOR_OPTIONS.find(c => c.id === colorId);
            if (color) {
                previewDark.style.color = color.color;
            }
        };
    });

    // 초기화
    resetBtn.onclick = () => {
        brandInput.value = '';
        previewLight.textContent = 'HAIRGATOR';
        previewDark.textContent = 'HAIRGATOR';
        previewLight.style.fontFamily = FONT_OPTIONS[0].fontFamily;
        previewDark.style.fontFamily = FONT_OPTIONS[0].fontFamily;
        previewLight.style.color = '#000000';
        previewDark.style.color = '#FFFFFF';
        fontOptions.forEach(o => o.classList.remove('selected'));
        fontOptions[0].classList.add('selected');
        fontOptions[0].querySelector('input').checked = true;
        // 라이트 모드 - black 선택
        colorOptionsLight.forEach(o => o.classList.remove('selected'));
        const blackOptionLight = Array.from(colorOptionsLight).find(o => o.dataset.colorId === 'black');
        if (blackOptionLight) {
            blackOptionLight.classList.add('selected');
            blackOptionLight.querySelector('input').checked = true;
        }
        // 다크 모드 - white 선택
        colorOptionsDark.forEach(o => o.classList.remove('selected'));
        const whiteOptionDark = Array.from(colorOptionsDark).find(o => o.dataset.colorId === 'white');
        if (whiteOptionDark) {
            whiteOptionDark.classList.add('selected');
            whiteOptionDark.querySelector('input').checked = true;
        }
    };

    // 저장
    saveBtn.onclick = async () => {
        const brandName = brandInput.value.trim();
        const selectedFont = document.querySelector('input[name="brandFont"]:checked')?.value || 'default';
        const selectedColorLight = document.querySelector('input[name="brandColorLight"]:checked')?.value || 'black';
        const selectedColorDark = document.querySelector('input[name="brandColorDark"]:checked')?.value || 'white';

        console.log('💾 상호 저장 시도:', { brandName, selectedFont, selectedColorLight, selectedColorDark });

        try {
            // localStorage에도 저장 (웹용)
            localStorage.setItem('hairgator_brand_name', brandName);
            localStorage.setItem('hairgator_brand_font', selectedFont);
            localStorage.setItem('hairgator_brand_color_light', selectedColorLight);
            localStorage.setItem('hairgator_brand_color_dark', selectedColorDark);

            // Firebase에 저장 (앱용)
            await saveBrandToFirebase({
                brandName,
                brandFont: selectedFont,
                brandColorLight: selectedColorLight,
                brandColorDark: selectedColorDark
            });

            applyCustomBrand();
            modal.remove();

            if (window.showToast) {
                window.showToast(t('ui.brandSaved'));
            }
        } catch (e) {
            console.error('💾 저장 실패:', e);
            alert(t('ui.saveFailed') + ': ' + e.message);
        }
    };
}

// 사용자 정보 가져오기 (불나비 또는 localStorage)
function getUserInfo() {
    // 불나비 사용자 우선
    const bullnabiUser = window.getBullnabiUser && window.getBullnabiUser();
    if (bullnabiUser && bullnabiUser.name && bullnabiUser.phone) {
        return { name: bullnabiUser.name, phone: bullnabiUser.phone };
    }

    // localStorage에서 가져오기
    const designerName = localStorage.getItem('designerName');
    const designerPhone = localStorage.getItem('designerPhone');
    if (designerName && designerPhone) {
        return { name: designerName, phone: designerPhone };
    }

    return null;
}

// Firebase에 브랜드 설정 저장
async function saveBrandToFirebase(brandSettings) {
    try {
        const userInfo = getUserInfo();

        if (!window.db || !userInfo) {
            console.log('💾 Firebase 저장 스킵 (로그인 정보 없음)');
            return;
        }

        const docId = `${userInfo.name}_${userInfo.phone}`;
        await window.db.collection('brandSettings').doc(docId).set({
            ...brandSettings,
            designerName: userInfo.name,
            designerPhone: userInfo.phone,
            updatedAt: Date.now()
        }, { merge: true });

        console.log('💾 Firebase 저장 완료:', docId);
    } catch (e) {
        console.error('💾 Firebase 저장 실패:', e);
    }
}

// Firebase에서 브랜드 설정 로드
async function loadBrandFromFirebase() {
    try {
        const userInfo = getUserInfo();

        if (!window.db || !userInfo) {
            console.log('🏷️ Firebase 로드 스킵 (로그인 정보 없음)');
            return null;
        }

        const docId = `${userInfo.name}_${userInfo.phone}`;
        console.log('🏷️ Firebase 브랜드 로드 시도:', docId);

        const doc = await window.db.collection('brandSettings').doc(docId).get();

        if (doc.exists) {
            const data = doc.data();
            console.log('🏷️ Firebase에서 브랜드 로드 성공:', data.brandName);

            // localStorage에도 동기화 (브랜드 설정만, 프로필 이미지는 Firebase 직접 조회)
            if (data.brandName !== undefined) localStorage.setItem('hairgator_brand_name', data.brandName);
            if (data.brandFont) localStorage.setItem('hairgator_brand_font', data.brandFont);
            if (data.brandColorLight) localStorage.setItem('hairgator_brand_color_light', data.brandColorLight);
            if (data.brandColorDark) localStorage.setItem('hairgator_brand_color_dark', data.brandColorDark);
            // 프로필 이미지는 localStorage에 저장하지 않음 (Firebase에서 직접 조회)

            return data;
        }
        console.log('🏷️ Firebase에 저장된 브랜드 없음');
        return null;
    } catch (e) {
        console.error('🏷️ Firebase 로드 실패:', e);
        return null;
    }
}

// 전역 함수로 노출
window.loadBrandFromFirebase = loadBrandFromFirebase;

// ========== 사용자 설정 (테마, 언어) Firebase 저장/로드 ==========

// Firebase에 사용자 설정 저장
async function saveUserSettingsToFirebase(settings) {
    try {
        const userInfo = getUserInfo();

        if (!window.db || !userInfo) {
            console.log('⚙️ Firebase 설정 저장 스킵 (로그인 정보 없음)');
            return;
        }

        const docId = `${userInfo.name}_${userInfo.phone}`;
        await window.db.collection('userSettings').doc(docId).set({
            ...settings,
            designerName: userInfo.name,
            designerPhone: userInfo.phone,
            updatedAt: Date.now()
        }, { merge: true });

        console.log('⚙️ Firebase 사용자 설정 저장 완료:', docId, settings);
    } catch (e) {
        console.error('⚙️ Firebase 사용자 설정 저장 실패:', e);
    }
}

// Firebase에서 사용자 설정 로드
async function loadUserSettingsFromFirebase() {
    try {
        const userInfo = getUserInfo();

        if (!window.db || !userInfo) {
            console.log('⚙️ Firebase 설정 로드 스킵 (로그인 정보 없음)');
            return null;
        }

        const docId = `${userInfo.name}_${userInfo.phone}`;
        console.log('⚙️ Firebase 사용자 설정 로드 시도:', docId);

        const doc = await window.db.collection('userSettings').doc(docId).get();

        if (doc.exists) {
            const data = doc.data();
            console.log('⚙️ Firebase에서 사용자 설정 로드 성공:', data);

            // 테마 적용
            if (data.theme) {
                localStorage.setItem('hairgator_theme', data.theme);
                const currentIsLight = document.body.classList.contains('light-theme');
                const targetIsLight = data.theme === 'light';

                // 테마가 다른 경우에만 변경
                if (currentIsLight !== targetIsLight) {
                    if (targetIsLight) {
                        document.body.classList.add('light-theme');
                    } else {
                        document.body.classList.remove('light-theme');
                    }

                    // ⭐ 크리스마스 효과 업데이트 (테마 변경 시) - 눈내리기만
                    document.querySelectorAll('.snowflake').forEach(el => el.remove());

                    setTimeout(() => {
                        if (typeof createSnowflakes === 'function') createSnowflakes();
                    }, 300);
                }

                // 테마 아이콘/텍스트 업데이트 (현재 테마의 반대 모드로 전환 버튼 표시)
                const themeIcon = document.getElementById('themeIcon');
                const themeText = document.getElementById('themeText');
                if (themeIcon) themeIcon.textContent = targetIsLight ? '🌙' : '☀️';
                if (themeText) themeText.textContent = targetIsLight ? t('ui.switchToDark') : t('ui.switchToLight');
            }

            // 언어 적용
            if (data.language) {
                localStorage.setItem('hairgator_language', data.language);
                if (typeof setLanguage === 'function') {
                    setLanguage(data.language);
                }
                window.currentLanguage = data.language;

                // 사이드바 다시 그리기 (언어 적용)
                setTimeout(() => {
                    if (typeof setupSidebar === 'function') {
                        setupSidebar();
                    }
                    if (typeof updateLanguageFlag === 'function') {
                        updateLanguageFlag();
                    }
                    if (typeof applyProfileImage === 'function') {
                        applyProfileImage();
                    }
                }, 100);
            }

            return data;
        }
        console.log('⚙️ Firebase에 저장된 사용자 설정 없음');
        return null;
    } catch (e) {
        console.error('⚙️ Firebase 사용자 설정 로드 실패:', e);
        return null;
    }
}

// 테마 변경 시 Firebase에 저장
function saveThemeToFirebase(theme) {
    saveUserSettingsToFirebase({ theme: theme });
}

// 언어 변경 시 Firebase에 저장
function saveLanguageToFirebase(language) {
    saveUserSettingsToFirebase({ language: language });
}

// 저작권 동의 시 Firebase에 저장 (userId 기반)
async function saveTermsAgreedToFirebase() {
    try {
        if (!window.db) {
            console.error('❌ Firebase DB 없음');
            return false;
        }

        // userId 가져오기 (URL > bullnabi > localStorage)
        const userId = getTermsUserId();
        if (!userId) {
            console.error('❌ userId 없음, 저장 실패');
            return false;
        }

        await window.db.collection('userTermsAgreed').doc(userId).set({
            termsAgreed: true,
            termsAgreedDate: new Date().toISOString(),
            updatedAt: Date.now()
        }, { merge: true });

        console.log('✅ Firebase 저작권 동의 저장 완료:', userId);
        return true;
    } catch (e) {
        console.error('❌ Firebase 저작권 동의 저장 실패:', e);
        return false;
    }
}

// userId 가져오기 (URL > bullnabi > localStorage)
function getTermsUserId() {
    // 1순위: URL 파라미터 (앱에서 전달)
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    if (urlUserId) {
        console.log('🔑 userId from URL:', urlUserId);
        return urlUserId;
    }

    // 2순위: bullnabi 사용자
    const bullnabiUser = window.getBullnabiUser && window.getBullnabiUser();
    if (bullnabiUser && bullnabiUser.userId) {
        console.log('🔑 userId from bullnabi:', bullnabiUser.userId);
        return bullnabiUser.userId;
    }

    // 3순위: userInfo (designerName_phone)
    const userInfo = getUserInfo();
    if (userInfo) {
        const docId = `${userInfo.name}_${userInfo.phone}`;
        console.log('🔑 userId from userInfo:', docId);
        return docId;
    }

    return null;
}

// 언어 설정 Firebase에 저장 (userId 기반)
async function saveLanguageToFirebaseByUserId(lang) {
    try {
        if (!window.db) return false;
        const userId = getTermsUserId();
        if (!userId) return false;

        await window.db.collection('userTermsAgreed').doc(userId).set({
            language: lang,
            updatedAt: Date.now()
        }, { merge: true });

        console.log('✅ Firebase 언어 저장:', userId, lang);
        return true;
    } catch (e) {
        console.error('❌ Firebase 언어 저장 실패:', e);
        return false;
    }
}

// Firebase에서 언어 확인 (userId 기반)
async function checkLanguageFromFirebase() {
    try {
        if (!window.db) return null;
        const userId = getTermsUserId();
        if (!userId) return null;

        const doc = await window.db.collection('userTermsAgreed').doc(userId).get();
        if (doc.exists && doc.data().language) {
            console.log('✅ Firebase에서 언어 확인:', doc.data().language);
            return doc.data().language;
        }
        return null;
    } catch (e) {
        console.error('❌ Firebase 언어 확인 실패:', e);
        return null;
    }
}

window.saveLanguageToFirebaseByUserId = saveLanguageToFirebaseByUserId;
window.checkLanguageFromFirebase = checkLanguageFromFirebase;

// Firebase에서 저작권 동의 여부 확인
async function checkTermsAgreedFromFirebase() {
    try {
        if (!window.db) {
            console.log('⚠️ Firebase DB 없음, 대기 중...');
            return false;
        }

        const userId = getTermsUserId();
        if (!userId) {
            console.log('⚠️ userId 없음, 확인 불가');
            return false;
        }

        console.log('🔍 Firebase에서 동의 확인:', userId);
        const doc = await window.db.collection('userTermsAgreed').doc(userId).get();

        if (doc.exists && doc.data().termsAgreed) {
            console.log('✅ Firebase에서 저작권 동의 확인됨');
            return true;
        }

        console.log('❌ Firebase에 동의 기록 없음');
        return false;
    } catch (e) {
        console.error('❌ Firebase 저작권 동의 확인 실패:', e);
        return false;
    }
}

// 전역 함수로 노출
window.saveUserSettingsToFirebase = saveUserSettingsToFirebase;
window.loadUserSettingsFromFirebase = loadUserSettingsFromFirebase;
window.saveThemeToFirebase = saveThemeToFirebase;
window.saveLanguageToFirebase = saveLanguageToFirebase;
window.saveTermsAgreedToFirebase = saveTermsAgreedToFirebase;
window.checkTermsAgreedFromFirebase = checkTermsAgreedFromFirebase;

// 저장된 상호명 적용
function applyCustomBrand() {
    const brandName = localStorage.getItem('hairgator_brand_name');
    const brandFont = localStorage.getItem('hairgator_brand_font') || 'default';
    const brandColorLight = localStorage.getItem('hairgator_brand_color_light') || 'black';
    const brandColorDark = localStorage.getItem('hairgator_brand_color_dark') || 'white';

    // 현재 테마 확인
    const isLightMode = document.body.classList.contains('light-theme');
    const currentColorId = isLightMode ? brandColorLight : brandColorDark;

    console.log('🏷️ applyCustomBrand 호출:', { brandName, brandFont, brandColorLight, brandColorDark, isLightMode, currentColorId });

    // 모든 .logo 요소 찾기 (h1.logo, .logo 등)
    const logoElements = document.querySelectorAll('.logo, h1.logo');
    console.log('🏷️ 찾은 로고 요소 개수:', logoElements.length);

    logoElements.forEach((logoElement, index) => {
        console.log(`🏷️ 로고[${index}] 업데이트:`, logoElement.tagName, logoElement.className);

        // 자식 요소 제거 후 텍스트만 설정
        logoElement.innerHTML = '';
        logoElement.textContent = brandName || 'HAIRGATOR';

        const font = FONT_OPTIONS.find(f => f.id === brandFont);
        if (font) {
            logoElement.style.setProperty('font-family', font.fontFamily, 'important');
        }

        const color = COLOR_OPTIONS.find(c => c.id === currentColorId);
        if (color) {
            logoElement.style.setProperty('color', color.color, 'important');
            // CSS 그라데이션 효과 덮어쓰기
            logoElement.style.setProperty('-webkit-text-fill-color', color.color, 'important');
            logoElement.style.setProperty('background', 'none', 'important');
            logoElement.style.setProperty('-webkit-background-clip', 'unset', 'important');
            logoElement.style.setProperty('background-clip', 'unset', 'important');
        }
    });
}

// 전역 함수로 노출
window.showBrandSettingModal = showBrandSettingModal;
window.applyCustomBrand = applyCustomBrand;

// ========== 프로필 이미지 기능 ==========

async function showProfileImageModal() {
    const existingModal = document.getElementById('profile-image-modal');
    if (existingModal) existingModal.remove();

    // Firebase에서 현재 사용자의 프로필 이미지 로드
    let savedImage = null;
    try {
        const userInfo = getUserInfo();
        if (window.db && userInfo) {
            const docId = `${userInfo.name}_${userInfo.phone}`;
            const doc = await window.db.collection('brandSettings').doc(docId).get();
            if (doc.exists && doc.data().profileImage) {
                savedImage = doc.data().profileImage;
            }
        }
    } catch (e) {
        console.warn('프로필 이미지 로드 실패:', e);
    }

    const modal = document.createElement('div');
    modal.id = 'profile-image-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(3px);
    `;

    modal.innerHTML = `
        <div style="
            background: var(--bg-primary, #1a1a1a);
            border-radius: 16px;
            padding: 24px;
            width: 90%;
            max-width: 360px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            text-align: center;
        ">
            <h3 style="color: var(--text-primary, #fff); font-size: 18px; margin-bottom: 20px;">${t('ui.profilePhoto')}</h3>

            <div id="previewContainer" style="
                width: 120px;
                height: 120px;
                border-radius: 50%;
                margin: 0 auto 16px;
                overflow: hidden;
                background: linear-gradient(135deg, #4A90E2, #357ABD);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                ${savedImage
                    ? `<img src="${savedImage}" style="width: 100%; height: 100%; object-fit: cover;">`
                    : `<span style="font-size: 48px; color: #fff;">👤</span>`}
            </div>

            <div style="
                background: rgba(74, 144, 226, 0.1);
                border: 1px solid rgba(74, 144, 226, 0.3);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 20px;
            ">
                <p style="color: var(--text-secondary, #aaa); font-size: 12px; line-height: 1.5; margin: 0;">
                    ${t('ui.profilePhotoHint')}<br>
                    <span style="color: #4A90E2;">${t('ui.profilePhotoHint2')}</span>${t('ui.profilePhotoHint3')}
                </p>
            </div>

            <input type="file" id="profileFileInput" accept="image/*" style="display: none;">

            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button onclick="document.getElementById('profileFileInput').click()" style="
                    padding: 12px;
                    border: none;
                    background: linear-gradient(135deg, #4A90E2, #357ABD);
                    color: #fff;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                ">${t('ui.selectPhoto')}</button>
                ${savedImage ? `
                <button id="removeProfileBtn" style="
                    padding: 12px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: transparent;
                    color: #ff4444;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                ">${t('ui.deletePhoto')}</button>
                ` : ''}
                <button id="closeProfileModal" style="
                    padding: 12px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: transparent;
                    color: var(--text-secondary, #aaa);
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                ">${t('ui.close')}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 이벤트
    document.getElementById('closeProfileModal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    const removeBtn = document.getElementById('removeProfileBtn');
    if (removeBtn) {
        removeBtn.onclick = async () => {
            await saveProfileImageToFirebase(''); // Firebase에서 삭제
            await applyProfileImage();
            modal.remove();
            if (window.showToast) window.showToast(t('ui.profileDeleted'));
        };
    }

    document.getElementById('profileFileInput').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // 이미지 리사이즈 (고화질 500x500)
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const size = 500; // 대기 화면에서 사용할 크기에 맞춤
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');

                    // 이미지 스무딩 고화질 설정
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';

                    // 중앙 크롭
                    const minDim = Math.min(img.width, img.height);
                    const sx = (img.width - minDim) / 2;
                    const sy = (img.height - minDim) / 2;

                    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
                    const resizedImage = canvas.toDataURL('image/jpeg', 0.92); // 화질 향상

                    await saveProfileImageToFirebase(resizedImage); // Firebase에 저장
                    await applyProfileImage();
                    modal.remove();
                    if (window.showToast) window.showToast(t('ui.profileSaved'));
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
}

// Firebase에 프로필 이미지 저장
async function saveProfileImageToFirebase(imageData) {
    try {
        const userInfo = getUserInfo();
        if (!window.db || !userInfo) {
            console.log('📷 Firebase 프로필 저장 스킵 (로그인 정보 없음)');
            return;
        }

        const docId = `${userInfo.name}_${userInfo.phone}`;
        await window.db.collection('brandSettings').doc(docId).set({
            profileImage: imageData,
            updatedAt: Date.now()
        }, { merge: true });

        console.log('📷 Firebase 프로필 이미지 저장 완료');
    } catch (e) {
        console.error('📷 Firebase 프로필 저장 실패:', e);
    }
}

// 프로필 이미지 적용 (Firebase 우선, localStorage 캐시 사용 안 함)
async function applyProfileImage() {
    const profileImage = document.getElementById('profileImage');
    if (!profileImage) return;

    // 기본값: 👤 아이콘
    profileImage.innerHTML = `<span id="profileInitial">👤</span>`;

    try {
        // Firebase에서 현재 사용자의 프로필 이미지 로드
        const userInfo = getUserInfo();
        if (!window.db || !userInfo) return;

        const docId = `${userInfo.name}_${userInfo.phone}`;
        const doc = await window.db.collection('brandSettings').doc(docId).get();

        if (doc.exists && doc.data().profileImage) {
            const imageUrl = doc.data().profileImage;
            profileImage.innerHTML = `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">`;
            console.log('👤 Firebase에서 프로필 이미지 로드:', docId);
        }
    } catch (e) {
        console.warn('프로필 이미지 로드 실패:', e);
    }
}

// 전역 함수 노출
window.showProfileImageModal = showProfileImageModal;
window.applyProfileImage = applyProfileImage;

// ========== 언어 선택 기능 (국기 표시용) ==========

const LANGUAGE_OPTIONS = [
    { id: 'ko', name: '한국어', flag: '🇰🇷' },
    { id: 'en', name: 'English', flag: '🇺🇸' },
    { id: 'ja', name: '日本語', flag: '🇯🇵' },
    { id: 'zh', name: '中文', flag: '🇨🇳' },
    { id: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { id: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { id: 'es', name: 'Español', flag: '🇪🇸' }
];

// 언어 코드로 국기 이모지 반환
function getLanguageFlag(langCode) {
    const lang = LANGUAGE_OPTIONS.find(l => l.id === langCode);
    return lang ? lang.flag : '🇰🇷';
}

// 페이지 로드 시 저장된 언어의 국기 표시
function updateLanguageFlag() {
    const currentLang = window.currentLanguage || localStorage.getItem('hairgator_language') || 'ko';
    const flagElement = document.getElementById('currentLanguageFlag');
    if (flagElement) {
        flagElement.textContent = getLanguageFlag(currentLang);
    }
}

// 전역 함수 노출
window.getLanguageFlag = getLanguageFlag;
window.updateLanguageFlag = updateLanguageFlag;
window.LANGUAGE_OPTIONS = LANGUAGE_OPTIONS;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        applyProfileImage();
        updateLanguageFlag();
    }, 1000);
});

// ========== 크리스마스 눈 내리는 효과 (비활성화됨 - 2025-12-17) ==========
let snowflakeInterval = null;

function isGenderSelectionVisible() {
    const genderSelection = document.getElementById('genderSelection');
    if (!genderSelection) return false;
    const style = window.getComputedStyle(genderSelection);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

// 눈내리기 효과 비활성화 - 기존 눈송이만 제거
function createSnowflakes() {
    // 기존 눈송이 모두 제거
    document.querySelectorAll('.snowflake').forEach(s => s.remove());
    if (snowflakeInterval) {
        clearInterval(snowflakeInterval);
        snowflakeInterval = null;
    }
    // 더 이상 눈송이를 생성하지 않음
}

// 전역 노출 (menu.js에서 접근 가능하게)
window.createSnowflakes = createSnowflakes;


// ========== 제거된 크리스마스 효과들 (비활성화됨) ==========
// createSnowPiles, createChristmasTree, createSnowballFight,
// addRudolphDecoration, createMerryChristmasText, createFootprints 제거됨

// 레거시 호환성을 위한 빈 함수들 (호출 시 요소 제거만 수행)
function cleanupChristmasElements() {
    document.querySelectorAll('.snow-pile, .christmas-tree, .christmas-gifts, .snowball-fight-container, .rudolph-decoration, .merry-christmas-light, .footprints-container').forEach(el => el.remove());
}

// 레거시 호환성을 위한 전역 함수들 (빈 함수)
window.createSnowPiles = cleanupChristmasElements;
window.createChristmasTree = cleanupChristmasElements;
window.createSnowballFight = cleanupChristmasElements;
window.addRudolphDecoration = cleanupChristmasElements;
window.createMerryChristmasText = cleanupChristmasElements;
window.createFootprints = cleanupChristmasElements;


// 크리스마스 효과 시작 (눈내리기 - 다크/라이트 모드 모두 지원)
document.addEventListener('DOMContentLoaded', () => {
    // 이전 캐시에서 생성된 크리스마스 효과 요소들 제거
    cleanupChristmasElements();

    setTimeout(createSnowflakes, 500);

    // 테마 변경 시 눈 효과 재시작
    setTimeout(() => {
        const originalToggleTheme = window.toggleTheme;
        if (typeof originalToggleTheme === 'function') {
            window.toggleTheme = function() {
                originalToggleTheme();

                // 기존 눈 제거
                document.querySelectorAll('.snowflake').forEach(el => el.remove());
                if (typeof snowflakeInterval !== 'undefined' && snowflakeInterval) {
                    clearInterval(snowflakeInterval);
                    snowflakeInterval = null;
                }

                // 눈 다시 생성
                setTimeout(() => {
                    document.querySelectorAll('.snowflake').forEach(el => el.remove());
                    createSnowflakes();
                }, 300);
            };
            console.log('✅ toggleTheme 래핑 완료 (눈 효과)');
        }
    }, 100);
});
