// HAIRGATOR Main Application - 최종 버전 (goBack display:none 추가)
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
                            <!-- 이름 & 토큰 -->
                            <div style="flex: 1;">
                                <div class="login-status" id="loginStatus" style="color: #4A90E2; font-size: 14px; font-weight: 600; margin-bottom: 6px;">
                                    ${t('ui.loading')}
                                </div>
                                <div style="color: var(--text-secondary, #aaa); font-size: 12px;">
                                    ${t('ui.credit')}: <span id="creditDisplay" style="color: #4A90E2; font-weight: bold;">-</span>
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

                        <!-- 퍼스널 컬러 진단 -->
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
                        <div class="menu-item" id="logoutBtn" style="padding: 15px 20px; cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">🚪</span>
                                <span style="color: #ff4444; font-size: 14px;">${t('ui.logout')}</span>
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
            personalColorBtn.addEventListener('click', function() {
                console.log('🎨 퍼스널 컬러 진단 클릭');
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

        console.log('✅ 사이드바 메뉴 이벤트 리스너 설정 완료');
    }

    function updateLoginInfo() {
        const loginStatus = document.getElementById('loginStatus');
        const creditDisplay = document.getElementById('creditDisplay');

        const bullnabiUser = window.getBullnabiUser && window.getBullnabiUser();
        if (bullnabiUser) {
            // 불나비 로그인 성공
            loginInfoPending = false;
            if (loginInfoTimeout) {
                clearTimeout(loginInfoTimeout);
                loginInfoTimeout = null;
            }
            if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${bullnabiUser.name}`;
            const credit = parseFloat(bullnabiUser.remainCount) || 0;
            if (creditDisplay) creditDisplay.textContent = credit.toFixed(2);
        } else {
            const designerName = localStorage.getItem('designerName');
            if (designerName) {
                // localStorage에서 로그인 정보 있음
                loginInfoPending = false;
                if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${designerName}`;
                if (creditDisplay) creditDisplay.textContent = '∞';
            } else if (loginInfoPending) {
                // 아직 로그인 정보 대기 중 - 로딩 표시
                if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ...`;
                if (creditDisplay) creditDisplay.textContent = '-';

                // 2초 후에도 로그인 정보 없으면 게스트로 표시
                if (!loginInfoTimeout) {
                    loginInfoTimeout = setTimeout(() => {
                        loginInfoPending = false;
                        const currentUser = window.getBullnabiUser && window.getBullnabiUser();
                        const currentDesignerName = localStorage.getItem('designerName');
                        if (!currentUser && !currentDesignerName) {
                            if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${t('ui.guest')}`;
                            if (creditDisplay) creditDisplay.textContent = '0';
                        }
                    }, 2000);
                }
            } else {
                // 대기 완료 후 게스트로 확정
                if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${t('ui.guest')}`;
                if (creditDisplay) creditDisplay.textContent = '0';
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
    function showLanguageModal() {
        const languages = [
            { code: 'ko', name: '한국어', flag: '🇰🇷' },
            { code: 'en', name: 'English', flag: '🇺🇸' },
            { code: 'ja', name: '日本語', flag: '🇯🇵' },
            { code: 'zh', name: '中文', flag: '🇨🇳' },
            { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
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
            if (e.target === modal) {
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

            // 크리스마스 효과 다시 생성
            setTimeout(() => {
                // 다크모드용
                if (typeof window.createSnowflakes === 'function') window.createSnowflakes();
                if (typeof window.createSnowPiles === 'function') window.createSnowPiles();
                if (typeof window.createChristmasTree === 'function') window.createChristmasTree();
                // 라이트모드용
                if (typeof window.createSnowballFight === 'function') window.createSnowballFight();
                // if (typeof window.addRudolphDecoration === 'function') window.addRudolphDecoration(); // 루돌프 장식 제거
                if (typeof window.createMerryChristmasText === 'function') window.createMerryChristmasText();
                if (typeof window.createFootprints === 'function') window.createFootprints();
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

    const fontOptionsHtml = FONT_OPTIONS.map(font => `
        <label class="font-option ${savedFont === font.id ? 'selected' : ''}" data-font-id="${font.id}">
            <input type="radio" name="brandFont" value="${font.id}" ${savedFont === font.id ? 'checked' : ''} style="display: none;">
            <span class="font-preview" style="font-family: ${font.fontFamily}; color: #fff;">Aa 가나</span>
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

            // localStorage에도 동기화
            if (data.brandName !== undefined) localStorage.setItem('hairgator_brand_name', data.brandName);
            if (data.brandFont) localStorage.setItem('hairgator_brand_font', data.brandFont);
            if (data.brandColorLight) localStorage.setItem('hairgator_brand_color_light', data.brandColorLight);
            if (data.brandColorDark) localStorage.setItem('hairgator_brand_color_dark', data.brandColorDark);
            if (data.profileImage !== undefined) localStorage.setItem('hairgator_profile_image', data.profileImage);

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

                    // ⭐ 크리스마스 효과 업데이트 (테마 변경 시)
                    document.querySelectorAll('.snowflake, .snow-pile, .christmas-tree, .christmas-gifts, .snowball-fight-container, .rudolph-decoration, .merry-christmas-light, .footprints-container').forEach(el => el.remove());

                    setTimeout(() => {
                        if (targetIsLight) {
                            // 라이트모드 효과
                            if (typeof createSnowballFight === 'function') createSnowballFight(); // 눈사람+강아지
                            if (typeof createMerryChristmasText === 'function') createMerryChristmasText();
                            if (typeof createFootprints === 'function') createFootprints();
                        } else {
                            // 다크모드 효과
                            if (typeof createSnowflakes === 'function') createSnowflakes();
                            if (typeof createSnowPiles === 'function') createSnowPiles();
                            if (typeof createChristmasTree === 'function') createChristmasTree();
                        }
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

// 전역 함수로 노출
window.saveUserSettingsToFirebase = saveUserSettingsToFirebase;
window.loadUserSettingsFromFirebase = loadUserSettingsFromFirebase;
window.saveThemeToFirebase = saveThemeToFirebase;
window.saveLanguageToFirebase = saveLanguageToFirebase;

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

function showProfileImageModal() {
    const existingModal = document.getElementById('profile-image-modal');
    if (existingModal) existingModal.remove();

    const savedImage = localStorage.getItem('hairgator_profile_image');

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
            localStorage.removeItem('hairgator_profile_image');
            await saveProfileImageToFirebase(''); // Firebase에서도 삭제
            applyProfileImage();
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

                    localStorage.setItem('hairgator_profile_image', resizedImage);
                    await saveProfileImageToFirebase(resizedImage); // Firebase에도 저장
                    applyProfileImage();
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

// 프로필 이미지 적용
function applyProfileImage() {
    const savedImage = localStorage.getItem('hairgator_profile_image');
    const profileImage = document.getElementById('profileImage');
    const profileInitial = document.getElementById('profileInitial');

    if (profileImage) {
        if (savedImage) {
            profileImage.innerHTML = `<img src="${savedImage}" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            profileImage.innerHTML = `<span id="profileInitial">👤</span>`;
        }
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
    { id: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
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

// ========== 크리스마스 눈 내리는 효과 (성별 선택 화면 + 다크모드 전용) ==========
let snowflakeInterval = null;

function isGenderSelectionVisible() {
    const genderSelection = document.getElementById('genderSelection');
    if (!genderSelection) return false;
    const style = window.getComputedStyle(genderSelection);
    return style.display !== 'none' && style.visibility !== 'hidden';
}

function createSnowflakes() {
    // 라이트 테마거나 성별 선택 화면이 아니면 눈 제거
    if (document.body.classList.contains('light-theme') || !isGenderSelectionVisible()) {
        const existing = document.querySelectorAll('.snowflake');
        existing.forEach(s => s.remove());
        if (snowflakeInterval) {
            clearInterval(snowflakeInterval);
            snowflakeInterval = null;
        }
        return;
    }

    const snowContainer = document.body;
    const snowflakes = ['❄', '❅', '❆', '•', '∘'];

    function createSnowflake() {
        // 라이트 테마거나 성별 선택 화면이 아니면 생성 안함
        if (document.body.classList.contains('light-theme') || !isGenderSelectionVisible()) return;

        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];

        // 랜덤 시작 위치, 크기, 속도
        let posX = Math.random() * window.innerWidth;
        let posY = -20;
        const size = Math.random() * 10 + 8; // 8px ~ 18px
        const fallSpeed = Math.random() * 1.5 + 0.5; // 0.5 ~ 2 픽셀/프레임
        const opacity = Math.random() * 0.5 + 0.3;

        // 각 눈송이마다 다른 흔들림 설정
        const swayAmplitude = Math.random() * 80 + 30; // 30px ~ 110px 폭
        const swaySpeed = Math.random() * 0.02 + 0.01; // 흔들림 속도
        let swayOffset = Math.random() * Math.PI * 2; // 시작 위상 (랜덤)
        const windDrift = (Math.random() - 0.5) * 0.5; // -0.25 ~ 0.25 바람 효과

        snowflake.style.left = posX + 'px';
        snowflake.style.top = posY + 'px';
        snowflake.style.fontSize = size + 'px';
        snowflake.style.opacity = opacity;

        snowContainer.appendChild(snowflake);

        // requestAnimationFrame으로 부드러운 애니메이션
        let animationId;
        function animate() {
            if (document.body.classList.contains('light-theme') || posY > window.innerHeight + 20) {
                cancelAnimationFrame(animationId);
                if (snowflake.parentNode) snowflake.remove();
                return;
            }

            posY += fallSpeed;
            swayOffset += swaySpeed;

            // sin 곡선으로 자연스러운 좌우 흔들림 + 바람 드리프트
            const swayX = Math.sin(swayOffset) * swayAmplitude;
            const currentX = posX + swayX + (posY * windDrift);

            snowflake.style.top = posY + 'px';
            snowflake.style.left = currentX + 'px';
            snowflake.style.transform = `rotate(${posY * 0.5}deg)`;

            animationId = requestAnimationFrame(animate);
        }

        animationId = requestAnimationFrame(animate);
    }

    // 초기 눈송이 생성 (화면에 분산)
    for (let i = 0; i < 35; i++) {
        setTimeout(() => createSnowflake(), i * 150);
    }

    // 주기적으로 새 눈송이 생성 (더 자주)
    if (snowflakeInterval) clearInterval(snowflakeInterval);
    snowflakeInterval = setInterval(() => {
        if (!document.body.classList.contains('light-theme')) {
            createSnowflake();
        }
    }, 500);
}

// 버튼 위에 눈 쌓인 효과 생성
function createSnowPiles() {
    // 기존 눈더미 제거
    document.querySelectorAll('.snow-pile').forEach(el => el.remove());

    // 라이트 테마거나 성별 선택 화면이 아니면 생성 안함
    if (document.body.classList.contains('light-theme') || !isGenderSelectionVisible()) return;

    const buttons = document.querySelectorAll('.gender-btn');

    buttons.forEach((btn, index) => {
        const pile = document.createElement('div');
        pile.className = 'snow-pile';
        pile.style.cssText = `
            position: absolute;
            top: -8px;
            left: 0;
            right: 0;
            height: 20px;
            pointer-events: none;
            z-index: 10;
        `;

        // 각 버튼마다 다른 눈 더미 패턴
        const pileCount = index === 0 ? 5 : 6;

        for (let i = 0; i < pileCount; i++) {
            const snowBlob = document.createElement('div');

            // 랜덤 크기와 위치
            const width = 20 + Math.random() * 25;
            const height = 10 + Math.random() * 8;
            const left = (i * (100 / pileCount)) + Math.random() * 10 - 5;
            const bottom = Math.random() * 3;

            snowBlob.style.cssText = `
                position: absolute;
                bottom: ${bottom}px;
                left: ${left}%;
                width: ${width}px;
                height: ${height}px;
                background: #fff;
                border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            `;

            pile.appendChild(snowBlob);
        }

        btn.style.position = 'relative';
        btn.style.overflow = 'visible';
        btn.appendChild(pile);
    });
}

// 크리스마스 트리 생성 (고급 PNG 이미지)
function createChristmasTree() {
    // 기존 트리 및 선물 제거
    document.querySelectorAll('.christmas-tree, .christmas-gifts').forEach(el => el.remove());

    // 라이트 테마거나 성별 선택 화면이 아니면 생성 안함
    if (document.body.classList.contains('light-theme') || !isGenderSelectionVisible()) return;

    const tree = document.createElement('div');
    tree.className = 'christmas-tree';
    tree.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 15px;
        z-index: 9998;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.5s ease;
    `;

    const img = document.createElement('img');
    img.src = 'https://www.freeiconspng.com/uploads/christmas-tree-png-4.png';
    img.alt = 'Christmas Tree';
    img.style.cssText = `
        width: 280px;
        height: auto;
        filter: drop-shadow(0 0 20px rgba(255, 200, 100, 0.4))
                drop-shadow(0 0 40px rgba(255, 150, 50, 0.2));
        animation: treeShimmer 3s ease-in-out infinite;
    `;

    // 이미지 완전히 로드된 후 표시
    img.onload = function() {
        tree.style.opacity = '1';
    };

    tree.appendChild(img);
    document.body.appendChild(tree);

    // 선물상자들 추가
    createGiftBoxes();
}

// 선물상자 생성
function createGiftBoxes() {
    const gifts = document.createElement('div');
    gifts.className = 'christmas-gifts';
    gifts.style.cssText = `
        position: fixed;
        bottom: 15px;
        left: 180px;
        z-index: 9997;
        pointer-events: none;
        display: flex;
        gap: 8px;
        align-items: flex-end;
    `;

    // 선물상자 데이터 (색상, 크기, 리본색)
    const giftData = [
        { bg: '#e63946', ribbon: '#ffd700', size: 45, offsetY: 0 },
        { bg: '#2a9d8f', ribbon: '#ff6b6b', size: 35, offsetY: 5 },
        { bg: '#ffd700', ribbon: '#e63946', size: 40, offsetY: 2 },
    ];

    giftData.forEach((gift, i) => {
        const box = document.createElement('div');
        box.style.cssText = `
            width: ${gift.size}px;
            height: ${gift.size}px;
            background: ${gift.bg};
            border-radius: 4px;
            position: relative;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            margin-bottom: ${gift.offsetY}px;
        `;

        // 세로 리본
        const ribbonV = document.createElement('div');
        ribbonV.style.cssText = `
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 8px;
            height: 100%;
            background: ${gift.ribbon};
        `;

        // 가로 리본
        const ribbonH = document.createElement('div');
        ribbonH.style.cssText = `
            position: absolute;
            top: 50%;
            left: 0;
            transform: translateY(-50%);
            width: 100%;
            height: 8px;
            background: ${gift.ribbon};
        `;

        // 리본 매듭
        const bow = document.createElement('div');
        bow.style.cssText = `
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 16px;
        `;
        bow.textContent = '🎀';

        box.appendChild(ribbonV);
        box.appendChild(ribbonH);
        box.appendChild(bow);
        gifts.appendChild(box);
    });

    document.body.appendChild(gifts);
}

// 전역 노출 (menu.js에서 접근 가능하게)
window.createSnowflakes = createSnowflakes;
window.createSnowPiles = createSnowPiles;
window.createChristmasTree = createChristmasTree;

// ========== 화이트 모드 - 눈싸움 애니메이션 ==========
function createSnowballFight() {
    // 기존 요소 제거
    document.querySelectorAll('.snowball-fight-container').forEach(el => el.remove());

    // 라이트 모드 + 성별선택 화면에서만 표시
    if (!document.body.classList.contains('light-theme') || !isGenderSelectionVisible()) {
        return;
    }

    const container = document.createElement('div');
    container.className = 'snowball-fight-container';
    container.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        width: 500px;
        height: 250px;
        pointer-events: none;
        z-index: 9999;
    `;

    // 눈사람 (중앙)
    const snowman = document.createElement('div');
    snowman.className = 'snowman';
    snowman.innerHTML = `
        <svg width="120" height="180" viewBox="0 0 120 180">
            <defs>
                <linearGradient id="snowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FFFFFF"/>
                    <stop offset="100%" style="stop-color:#E8E8E8"/>
                </linearGradient>
                <filter id="snowShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="3" dy="4" stdDeviation="3" flood-opacity="0.15"/>
                </filter>
            </defs>

            <!-- 그림자 -->
            <ellipse cx="60" cy="175" rx="45" ry="8" fill="rgba(0,0,0,0.1)"/>

            <!-- 몸통 (아래 큰 눈덩이) -->
            <circle cx="60" cy="140" r="40" fill="url(#snowGrad)" filter="url(#snowShadow)"/>
            <!-- 몸통 하이라이트 -->
            <ellipse cx="45" cy="125" rx="15" ry="10" fill="#fff" opacity="0.6"/>

            <!-- 중간 눈덩이 -->
            <circle cx="60" cy="85" r="32" fill="url(#snowGrad)" filter="url(#snowShadow)"/>
            <!-- 중간 하이라이트 -->
            <ellipse cx="48" cy="72" rx="12" ry="8" fill="#fff" opacity="0.6"/>

            <!-- 단추 -->
            <circle cx="60" cy="80" r="4" fill="#2C3E50"/>
            <circle cx="60" cy="95" r="4" fill="#2C3E50"/>
            <circle cx="60" cy="110" r="4" fill="#2C3E50"/>

            <!-- 머리 -->
            <circle cx="60" cy="42" r="26" fill="url(#snowGrad)" filter="url(#snowShadow)"/>
            <!-- 머리 하이라이트 -->
            <ellipse cx="50" cy="32" rx="10" ry="7" fill="#fff" opacity="0.6"/>

            <!-- 모자 -->
            <rect x="35" y="8" width="50" height="8" rx="2" fill="#2C3E50"/>
            <rect x="42" y="-15" width="36" height="25" rx="3" fill="#2C3E50"/>
            <!-- 모자 리본 -->
            <rect x="42" y="5" width="36" height="6" fill="#E74C3C"/>

            <!-- 눈 -->
            <circle cx="50" cy="38" r="4" fill="#2C3E50"/>
            <circle cx="70" cy="38" r="4" fill="#2C3E50"/>
            <circle cx="51" cy="37" r="1.5" fill="#fff"/>
            <circle cx="71" cy="37" r="1.5" fill="#fff"/>

            <!-- 당근 코 -->
            <polygon points="60,45 60,50 78,48" fill="#E67E22"/>
            <polygon points="60,46 60,49 75,47.5" fill="#D35400"/>

            <!-- 입 (조약돌) -->
            <circle cx="50" cy="55" r="2" fill="#2C3E50"/>
            <circle cx="55" cy="57" r="2" fill="#2C3E50"/>
            <circle cx="60" cy="58" r="2" fill="#2C3E50"/>
            <circle cx="65" cy="57" r="2" fill="#2C3E50"/>
            <circle cx="70" cy="55" r="2" fill="#2C3E50"/>

            <!-- 목도리 -->
            <ellipse cx="60" cy="65" rx="28" ry="8" fill="#E74C3C"/>
            <path d="M 75 68 Q 80 90, 75 110" stroke="#E74C3C" stroke-width="10" fill="none" stroke-linecap="round"/>
            <path d="M 78 68 Q 85 85, 82 100" stroke="#C0392B" stroke-width="2" fill="none" opacity="0.3"/>

            <!-- 팔 (나뭇가지) -->
            <path d="M 20 85 L 35 80" stroke="#8B4513" stroke-width="4" stroke-linecap="round"/>
            <path d="M 25 82 L 20 75" stroke="#8B4513" stroke-width="3" stroke-linecap="round"/>
            <path d="M 28 81 L 25 72" stroke="#8B4513" stroke-width="2" stroke-linecap="round"/>

            <path d="M 100 85 L 85 80" stroke="#8B4513" stroke-width="4" stroke-linecap="round"/>
            <path d="M 95 82 L 100 75" stroke="#8B4513" stroke-width="3" stroke-linecap="round"/>
            <path d="M 92 81 L 95 72" stroke="#8B4513" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `;
    snowman.style.cssText = `
        position: absolute;
        left: -220px;
        bottom: -10px;
        z-index: 99;
    `;

    // 강아지 (눈사람 주변을 뛰어다님) - 입체감 있는 디자인
    const puppy = document.createElement('div');
    puppy.className = 'puppy';
    puppy.innerHTML = `
        <svg width="70" height="55" viewBox="0 0 70 55">
            <defs>
                <linearGradient id="puppyBody" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#C4956A"/>
                    <stop offset="50%" style="stop-color:#A67B5B"/>
                    <stop offset="100%" style="stop-color:#8B6914"/>
                </linearGradient>
                <linearGradient id="puppyHead" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#D4A574"/>
                    <stop offset="100%" style="stop-color:#B8956E"/>
                </linearGradient>
                <linearGradient id="puppyEar" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#A67B5B"/>
                    <stop offset="100%" style="stop-color:#8B6914"/>
                </linearGradient>
                <filter id="puppyShadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-opacity="0.25"/>
                </filter>
            </defs>

            <!-- 그림자 -->
            <ellipse cx="35" cy="52" rx="22" ry="4" fill="rgba(0,0,0,0.15)"/>

            <!-- 꼬리 (흔들리는) -->
            <path d="M 58 28 Q 68 18, 65 30 Q 62 38, 56 32" fill="url(#puppyEar)" filter="url(#puppyShadow)">
                <animateTransform attributeName="transform" type="rotate" values="-10 58 32; 15 58 32; -10 58 32" dur="0.4s" repeatCount="indefinite"/>
            </path>

            <!-- 뒷다리 (뒤쪽) -->
            <path d="M 48 38 Q 50 45, 48 50 Q 47 52, 45 52 L 43 52 Q 42 50, 44 48 Q 46 42, 46 38" fill="url(#puppyBody)" filter="url(#puppyShadow)"/>

            <!-- 몸통 -->
            <ellipse cx="38" cy="34" rx="20" ry="14" fill="url(#puppyBody)" filter="url(#puppyShadow)"/>
            <!-- 몸통 하이라이트 -->
            <ellipse cx="32" cy="28" rx="10" ry="6" fill="#D4A574" opacity="0.5"/>
            <!-- 배 -->
            <ellipse cx="35" cy="40" rx="12" ry="6" fill="#E8D4BC"/>

            <!-- 뒷다리 (앞쪽) -->
            <path d="M 52 36 Q 54 44, 52 50 Q 51 52, 49 52 L 47 52 Q 46 50, 48 46 Q 50 40, 50 36" fill="url(#puppyBody)" filter="url(#puppyShadow)"/>

            <!-- 앞다리 (뒤쪽) -->
            <path d="M 22 38 Q 20 46, 22 50 Q 22 52, 20 52 L 18 52 Q 17 50, 19 46 Q 21 40, 22 38" fill="url(#puppyBody)" filter="url(#puppyShadow)"/>

            <!-- 앞다리 (앞쪽) -->
            <path d="M 28 36 Q 26 44, 28 50 Q 28 52, 26 52 L 24 52 Q 23 50, 25 46 Q 27 40, 28 36" fill="url(#puppyBody)" filter="url(#puppyShadow)"/>

            <!-- 목 -->
            <ellipse cx="22" cy="30" rx="10" ry="12" fill="url(#puppyHead)" filter="url(#puppyShadow)"/>

            <!-- 머리 -->
            <ellipse cx="14" cy="22" rx="14" ry="13" fill="url(#puppyHead)" filter="url(#puppyShadow)"/>
            <!-- 머리 하이라이트 -->
            <ellipse cx="10" cy="16" rx="6" ry="4" fill="#E8D4BC" opacity="0.4"/>

            <!-- 귀 (뒤쪽) -->
            <ellipse cx="24" cy="12" rx="6" ry="10" fill="url(#puppyEar)" filter="url(#puppyShadow)"/>
            <!-- 귀 (앞쪽) -->
            <ellipse cx="6" cy="12" rx="6" ry="10" fill="url(#puppyEar)" filter="url(#puppyShadow)"/>
            <!-- 귀 안쪽 -->
            <ellipse cx="6" cy="14" rx="3" ry="5" fill="#D4A574" opacity="0.6"/>

            <!-- 얼굴 무늬 -->
            <ellipse cx="14" cy="26" rx="7" ry="6" fill="#F5E6D3"/>
            <!-- 이마 무늬 -->
            <ellipse cx="14" cy="18" rx="4" ry="3" fill="#E8D4BC" opacity="0.5"/>

            <!-- 눈 -->
            <ellipse cx="9" cy="20" rx="4" ry="4.5" fill="#fff" filter="url(#puppyShadow)"/>
            <ellipse cx="19" cy="20" rx="4" ry="4.5" fill="#fff" filter="url(#puppyShadow)"/>
            <!-- 눈동자 -->
            <circle cx="10" cy="21" r="2.5" fill="#2C1810"/>
            <circle cx="20" cy="21" r="2.5" fill="#2C1810"/>
            <!-- 눈 하이라이트 -->
            <circle cx="11" cy="19.5" r="1.2" fill="#fff"/>
            <circle cx="21" cy="19.5" r="1.2" fill="#fff"/>

            <!-- 눈썹 -->
            <ellipse cx="9" cy="16" rx="3" ry="1" fill="#A67B5B"/>
            <ellipse cx="19" cy="16" rx="3" ry="1" fill="#A67B5B"/>

            <!-- 코 -->
            <ellipse cx="14" cy="27" rx="4" ry="3" fill="#2C1810" filter="url(#puppyShadow)"/>
            <!-- 코 하이라이트 -->
            <ellipse cx="13" cy="26" rx="1.5" ry="1" fill="#4A3728"/>

            <!-- 입 -->
            <path d="M 10 30 Q 14 34, 18 30" stroke="#2C1810" stroke-width="1.5" fill="none"/>

            <!-- 혀 -->
            <ellipse cx="14" cy="33" rx="3" ry="4" fill="#FF8A9B"/>
            <ellipse cx="14" cy="32" rx="2" ry="2" fill="#FFB5B5" opacity="0.5"/>

            <!-- 목걸이 -->
            <path d="M 12 35 Q 22 38, 30 34" stroke="#E74C3C" stroke-width="4" fill="none" stroke-linecap="round"/>
            <!-- 목걸이 태그 -->
            <circle cx="20" cy="38" r="4" fill="#FFD700" filter="url(#puppyShadow)"/>
            <circle cx="20" cy="38" r="2" fill="#FFA500"/>
        </svg>
    `;
    puppy.style.cssText = `
        position: absolute;
        bottom: 0px;
        left: -40px;
        z-index: 100;
        animation: puppyRunLeft 4s ease-in-out infinite;
    `;

    container.appendChild(snowman);
    container.appendChild(puppy);
    document.body.appendChild(container);

    // 오른쪽 발자국 영역 생성
    createFootprints();
}

window.createSnowballFight = createSnowballFight;

// ========== 성별 버튼 루돌프 장식 ==========
function addRudolphDecoration() {
    // 기존 루돌프 장식 제거
    document.querySelectorAll('.rudolph-decoration').forEach(el => el.remove());

    // 라이트 모드 + 성별 선택 화면에서만 표시
    if (!document.body.classList.contains('light-theme') || !isGenderSelectionVisible()) return;

    const maleBtn = document.querySelector('.gender-btn.male');
    const femaleBtn = document.querySelector('.gender-btn.female');

    if (!maleBtn || !femaleBtn) return;

    // 루돌프 장식 추가 함수
    function addRudolph(btn) {
        btn.style.position = 'relative';
        btn.style.overflow = 'visible';

        const rudolph = document.createElement('div');
        rudolph.className = 'rudolph-decoration';
        rudolph.innerHTML = `
            <svg width="240" height="280" viewBox="0 0 240 280" style="position:absolute; top:-70px; left:50%; transform:translateX(-50%);">
                <defs>
                    <linearGradient id="antlerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#8B4513"/>
                        <stop offset="100%" style="stop-color:#5D3A1A"/>
                    </linearGradient>
                </defs>

                <!-- 왼쪽 뿔 (버튼 위로) - 작게 -->
                <g transform="translate(55, 25) scale(0.7)">
                    <path d="M 40 70 Q 35 45, 25 25 Q 18 12, 12 18 Q 6 24, 15 32 Q 22 40, 32 52"
                          stroke="url(#antlerGrad)" stroke-width="7" fill="none" stroke-linecap="round"/>
                    <path d="M 30 45 Q 18 35, 10 42 Q 2 50, 12 52"
                          stroke="url(#antlerGrad)" stroke-width="5" fill="none" stroke-linecap="round"/>
                    <path d="M 35 58 Q 22 52, 18 62 Q 14 72, 25 68"
                          stroke="url(#antlerGrad)" stroke-width="4" fill="none" stroke-linecap="round"/>
                </g>

                <!-- 오른쪽 뿔 (버튼 위로) - 작게 -->
                <g transform="translate(100, 25) scale(0.7)">
                    <path d="M 40 70 Q 45 45, 55 25 Q 62 12, 68 18 Q 74 24, 65 32 Q 58 40, 48 52"
                          stroke="url(#antlerGrad)" stroke-width="7" fill="none" stroke-linecap="round"/>
                    <path d="M 50 45 Q 62 35, 70 42 Q 78 50, 68 52"
                          stroke="url(#antlerGrad)" stroke-width="5" fill="none" stroke-linecap="round"/>
                    <path d="M 45 58 Q 58 52, 62 62 Q 66 72, 55 68"
                          stroke="url(#antlerGrad)" stroke-width="4" fill="none" stroke-linecap="round"/>
                </g>

                <!-- 왼쪽 귀 (버튼 왼쪽에 붙임) -->
                <ellipse cx="35" cy="110" rx="12" ry="18" fill="#8B6914" transform="rotate(-15, 35, 110)"/>
                <ellipse cx="37" cy="110" rx="7" ry="11" fill="#D4A574" transform="rotate(-15, 37, 110)"/>

                <!-- 오른쪽 귀 (버튼 오른쪽에 붙임) -->
                <ellipse cx="205" cy="110" rx="12" ry="18" fill="#8B6914" transform="rotate(15, 205, 110)"/>
                <ellipse cx="203" cy="110" rx="7" ry="11" fill="#D4A574" transform="rotate(15, 203, 110)"/>

                <!-- 눈 (왼쪽) - 버튼 상단 위로 -->
                <ellipse cx="85" cy="95" rx="14" ry="16" fill="#1a1a1a"/>
                <ellipse cx="82" cy="91" rx="5" ry="6" fill="#fff" opacity="0.8"/>

                <!-- 눈 (오른쪽) - 버튼 상단 위로 -->
                <ellipse cx="155" cy="95" rx="14" ry="16" fill="#1a1a1a"/>
                <ellipse cx="152" cy="91" rx="5" ry="6" fill="#fff" opacity="0.8"/>
            </svg>
        `;
        rudolph.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
            overflow: visible;
        `;

        btn.appendChild(rudolph);
    }

    addRudolph(maleBtn);
    addRudolph(femaleBtn);
}

window.addRudolphDecoration = addRudolphDecoration;

// ========== 라이트 모드 - 메리 크리스마스 텍스트 ==========
function createMerryChristmasText() {
    // 기존 텍스트 제거
    document.querySelectorAll('.merry-christmas-light').forEach(el => el.remove());

    // 라이트 모드 + 성별 선택 화면에서만 표시
    if (!document.body.classList.contains('light-theme') || !isGenderSelectionVisible()) {
        return;
    }

    const textContainer = document.createElement('div');
    textContainer.className = 'merry-christmas-light';
    textContainer.innerHTML = `
        <svg width="320" height="60" viewBox="0 0 320 60">
            <defs>
                <!-- 크리스마스 그라데이션 -->
                <linearGradient id="xmasGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:#c41e3a">
                        <animate attributeName="stop-color"
                            values="#c41e3a;#228B22;#c41e3a"
                            dur="3s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="50%" style="stop-color:#228B22">
                        <animate attributeName="stop-color"
                            values="#228B22;#c41e3a;#228B22"
                            dur="3s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="100%" style="stop-color:#c41e3a">
                        <animate attributeName="stop-color"
                            values="#c41e3a;#228B22;#c41e3a"
                            dur="3s" repeatCount="indefinite"/>
                    </stop>
                </linearGradient>
                <!-- 텍스트 그림자 -->
                <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="1" flood-color="#000" flood-opacity="0.2"/>
                </filter>
            </defs>

            <!-- 메인 텍스트 -->
            <text x="160" y="42"
                  text-anchor="middle"
                  font-family="'Great Vibes', 'Dancing Script', cursive"
                  font-size="38"
                  font-weight="bold"
                  fill="url(#xmasGradient)"
                  filter="url(#textShadow)">
                Merry Christmas
            </text>
        </svg>
    `;
    textContainer.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        pointer-events: none;
    `;

    document.body.appendChild(textContainer);
}

window.createMerryChristmasText = createMerryChristmasText;

// ========== 화이트 모드 - 눈밭 발자국 애니메이션 ==========
function createFootprints() {
    // 기존 발자국 영역 제거
    document.querySelectorAll('.footprints-container').forEach(el => el.remove());

    if (!document.body.classList.contains('light-theme') || !isGenderSelectionVisible()) {
        return;
    }

    // 화면 전체를 덮는 컨테이너
    const container = document.createElement('div');
    container.className = 'footprints-container';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 9990;
        overflow: hidden;
    `;

    document.body.appendChild(container);

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // 사람 발자국 SVG (신발 자국 - 운동화/부츠 형태) - 더 연한 회색
    function createHumanFootprint(isLeft) {
        return `
            <svg width="30" height="65" viewBox="0 0 22 50" style="transform: ${isLeft ? 'scaleX(-1)' : 'scaleX(1)'}">
                <!-- 신발 자국 외곽 그림자 -->
                <path d="M 3 8 Q 1 15, 2 25 Q 1 35, 4 45 Q 11 50, 18 45 Q 21 35, 20 25 Q 21 15, 19 8 Q 11 3, 3 8"
                      fill="rgba(180,195,210,0.2)"/>
                <!-- 신발 자국 메인 -->
                <path d="M 4 9 Q 2 15, 3 25 Q 2 35, 5 44 Q 11 48, 17 44 Q 20 35, 19 25 Q 20 15, 18 9 Q 11 5, 4 9"
                      fill="rgba(170,185,200,0.3)"/>
                <!-- 신발 밑창 패턴 - 가로줄 -->
                <line x1="5" y1="15" x2="17" y2="15" stroke="rgba(160,175,190,0.25)" stroke-width="2"/>
                <line x1="4" y1="22" x2="18" y2="22" stroke="rgba(160,175,190,0.25)" stroke-width="2"/>
                <line x1="4" y1="29" x2="18" y2="29" stroke="rgba(160,175,190,0.25)" stroke-width="2"/>
                <line x1="5" y1="36" x2="17" y2="36" stroke="rgba(160,175,190,0.25)" stroke-width="2"/>
                <!-- 발뒤꿈치 부분 -->
                <ellipse cx="11" cy="43" rx="5" ry="3" fill="rgba(160,175,190,0.2)"/>
            </svg>
        `;
    }

    // 강아지 발자국 SVG - 더 연한 회색
    function createDogFootprint() {
        return `
            <svg width="40" height="44" viewBox="0 0 26 28">
                <!-- 발바닥 외곽 그림자 -->
                <ellipse cx="13" cy="20" rx="9" ry="10" fill="rgba(180,195,210,0.2)"/>
                <!-- 발바닥 패드 -->
                <ellipse cx="13" cy="19" rx="7" ry="8" fill="rgba(170,185,200,0.3)"/>
                <!-- 발가락 패드들 -->
                <ellipse cx="5" cy="7" rx="4" ry="5" fill="rgba(170,185,200,0.3)"/>
                <ellipse cx="13" cy="4" rx="4" ry="5" fill="rgba(170,185,200,0.3)"/>
                <ellipse cx="21" cy="7" rx="4" ry="5" fill="rgba(170,185,200,0.3)"/>
            </svg>
        `;
    }

    // 랜덤 발자국 생성 (화면 전체에 흩어지게, 몰리지 않게)
    const footprints = [];

    // 버튼 영역 정의 (화면 중앙)
    const buttonAreaLeft = screenWidth * 0.35;
    const buttonAreaRight = screenWidth * 0.65;
    const buttonAreaTop = screenHeight * 0.28;
    const buttonAreaBottom = screenHeight * 0.62;

    // 버튼 영역 피하는 함수
    function isInButtonArea(x, y) {
        return x > buttonAreaLeft && x < buttonAreaRight &&
               y > buttonAreaTop && y < buttonAreaBottom;
    }

    // 사람 발자국 - 완전 랜덤 위치에 개별적으로 찍히게
    const humanFootprintCount = 15 + Math.floor(Math.random() * 8); // 15~22개
    let humanAdded = 0;
    let humanAttempts = 0;
    while (humanAdded < humanFootprintCount && humanAttempts < 100) {
        humanAttempts++;
        // 화면 전체에서 랜덤 위치
        const x = Math.random() * (screenWidth - 80) + 30;
        const y = Math.random() * (screenHeight - 100) + 20;

        // 버튼 영역이면 스킵
        if (isInButtonArea(x, y)) continue;

        // 완전 랜덤 방향
        const angle = Math.random() * 360;

        footprints.push({
            type: 'human',
            x: x,
            y: y,
            isLeft: Math.random() < 0.5,
            angle: angle,
            delay: humanAdded * 1500 + Math.random() * 800  // 1.5초 간격으로 더 천천히
        });
        humanAdded++;
    }

    // 강아지 발자국 - 완전 랜덤 위치에 개별적으로 찍히게
    const dogFootprintCount = 20 + Math.floor(Math.random() * 10); // 20~29개
    let dogAdded = 0;
    let dogAttempts = 0;
    while (dogAdded < dogFootprintCount && dogAttempts < 100) {
        dogAttempts++;
        // 화면 전체에서 랜덤 위치
        const x = Math.random() * (screenWidth - 60) + 20;
        const y = Math.random() * (screenHeight - 80) + 15;

        // 버튼 영역이면 스킵
        if (isInButtonArea(x, y)) continue;

        // 완전 랜덤 방향
        const angle = Math.random() * 360;

        footprints.push({
            type: 'dog',
            x: x,
            y: y,
            angle: angle,
            delay: 800 + dogAdded * 1200 + Math.random() * 600  // 1.2초 간격으로 더 천천히
        });
        dogAdded++;
    }

    // 발자국 DOM 생성 및 애니메이션
    footprints.forEach((fp) => {
        const footprint = document.createElement('div');
        footprint.className = 'footprint';

        if (fp.type === 'human') {
            footprint.innerHTML = createHumanFootprint(fp.isLeft);
            footprint.style.cssText = `
                position: absolute;
                left: ${fp.x}px;
                top: ${fp.y}px;
                opacity: 0;
                transform: rotate(${fp.angle + (fp.isLeft ? -10 : 10)}deg) scale(0.5);
                transition: opacity 0.6s ease-out, transform 0.6s ease-out;
            `;
        } else {
            footprint.innerHTML = createDogFootprint();
            footprint.style.cssText = `
                position: absolute;
                left: ${fp.x}px;
                top: ${fp.y}px;
                opacity: 0;
                transform: rotate(${fp.angle}deg) scale(0.5);
                transition: opacity 0.4s ease-out, transform 0.4s ease-out;
            `;
        }

        container.appendChild(footprint);

        // 발자국 나타나는 애니메이션 (눈밭에 쿡 찍히는 느낌)
        setTimeout(() => {
            if (!document.body.classList.contains('light-theme')) return;
            footprint.style.opacity = '1';
            footprint.style.transform = footprint.style.transform.replace('scale(0.5)', 'scale(1)');
        }, fp.delay);
    });

    // 발자국이 다 나타나면 천천히 사라지고 다시 시작
    const maxDelay = Math.max(...footprints.map(fp => fp.delay)) + 2000;

    setTimeout(() => {
        // 모든 발자국 페이드 아웃
        container.querySelectorAll('.footprint').forEach((fp, idx) => {
            setTimeout(() => {
                fp.style.opacity = '0';
            }, idx * 50);
        });

        // 다시 새로운 발자국 생성
        setTimeout(() => {
            if (document.body.classList.contains('light-theme') && isGenderSelectionVisible()) {
                createFootprints();
            }
        }, 2000);
    }, maxDelay);
}

window.createFootprints = createFootprints;

// 크리스마스 효과 시작
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(createSnowflakes, 500);      // 다크모드용
    setTimeout(createSnowPiles, 600);       // 다크모드용
    setTimeout(createChristmasTree, 700);   // 다크모드용
    setTimeout(createSnowballFight, 800);   // 라이트모드용 (눈사람+강아지)
    // setTimeout(addRudolphDecoration, 900);  // 루돌프 장식 제거
    setTimeout(createMerryChristmasText, 950); // 라이트모드용
    setTimeout(createFootprints, 1000);     // 라이트모드용

    // 테마 변경 시 크리스마스 효과 토글 (DOMContentLoaded 후에 래핑해야 window.toggleTheme이 존재함)
    setTimeout(() => {
        const originalToggleTheme = window.toggleTheme;
        if (typeof originalToggleTheme === 'function') {
            window.toggleTheme = function() {
                // 테마 전환
                originalToggleTheme();

                // 모든 크리스마스 효과 제거
                document.querySelectorAll('.snowflake, .snow-pile, .christmas-tree, .christmas-gifts, .snowball-fight-container, .rudolph-decoration, .merry-christmas-light, .footprints-container').forEach(el => el.remove());
                // 눈 생성 인터벌 중지
                if (typeof snowflakeInterval !== 'undefined' && snowflakeInterval) {
                    clearInterval(snowflakeInterval);
                    snowflakeInterval = null;
                }

                // 테마 전환 후 해당 테마에 맞는 효과만 생성
                setTimeout(() => {
                    // 다시 한번 제거 (안전하게)
                    document.querySelectorAll('.snowflake, .snow-pile, .christmas-tree, .christmas-gifts, .snowball-fight-container, .rudolph-decoration, .merry-christmas-light, .footprints-container').forEach(el => el.remove());

                    if (document.body.classList.contains('light-theme')) {
                        // 라이트모드 효과
                        createSnowballFight(); // 눈사람+강아지
                        // addRudolphDecoration(); // 루돌프 장식 제거
                        createMerryChristmasText();
                        createFootprints();
                    } else {
                        // 다크모드 효과
                        createSnowflakes();
                        createSnowPiles();
                        createChristmasTree();
                    }
                }, 300);
            };
            console.log('✅ toggleTheme 래핑 완료 (크리스마스 효과)');
        }
    }, 100); // 다른 DOMContentLoaded 콜백 실행 후에 래핑
});
