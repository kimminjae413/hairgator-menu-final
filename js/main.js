// HAIRGATOR Main Application - 최종 버전 (goBack display:none 추가)
document.addEventListener('DOMContentLoaded', function() {
    console.log('🦎 HAIRGATOR 메인 앱 시작...');
    
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
                        </div>
                    </div>

                    <!-- 메뉴 목록 -->
                    <nav class="sidebar-menu" style="padding: 10px 0;">

                        <!-- 테마 전환 -->
                        <div class="menu-item" id="themeToggleMenu" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span id="themeIcon" style="font-size: 20px;">🌙</span>
                                <span id="themeText" style="color: var(--text-primary, #333); font-size: 14px;">${t('ui.darkMode')}</span>
                            </div>
                        </div>

                        <!-- 퍼스널 컬러 진단 -->
                        <div class="menu-item" id="personalColorBtn" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">🌈</span>
                                <span style="color: var(--text-primary, #333); font-size: 14px;">${t('ui.personalColor')}</span>
                            </div>
                        </div>

                        <!-- 상호 설정 -->
                        <div class="menu-item" id="brandSettingBtn" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">✏️</span>
                                <span style="color: var(--text-primary, #333); font-size: 14px;">${t('ui.brandSetting') || '상호 설정'}</span>
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
            if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${bullnabiUser.name}`;
            const credit = parseFloat(bullnabiUser.remainCount) || 0;
            if (creditDisplay) creditDisplay.textContent = credit.toFixed(2);
        } else {
            const designerName = localStorage.getItem('designerName');
            if (designerName) {
                if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${designerName}`;
                if (creditDisplay) creditDisplay.textContent = '∞';
            } else {
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
            
            if (themeIcon) themeIcon.textContent = isLight ? '☀️' : '🌙';
            if (themeText) themeText.textContent = isLight ? t('ui.lightMode') : t('ui.darkMode');
        }, 100);
        
        console.log(`🎨 테마 로드: ${savedTheme}`);
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        
        const themeIcon = document.getElementById('themeIcon');
        const themeText = document.getElementById('themeText');
        
        if (themeIcon) themeIcon.textContent = isLight ? '☀️' : '🌙';
        if (themeText) themeText.textContent = isLight ? t('ui.lightMode') : t('ui.darkMode');
        
        localStorage.setItem('hairgator_theme', isLight ? 'light' : 'dark');
        console.log(`🎨 테마 변경: ${isLight ? 'light' : 'dark'}`);
        
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

        showToast('Language changed / 言語変更 / 语言已更改');
    }

    function updateAllTexts() {
        // 사이드바 텍스트 업데이트
        const themeText = document.getElementById('themeText');

        const isLight = document.body.classList.contains('light-theme');
        if (themeText) {
            themeText.textContent = isLight ? t('ui.lightMode') : t('ui.darkMode');
        }

        // 사이드바 재생성
        setupSidebar();
        updateLoginInfo();

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
    applyCustomBrand();
});

// ========== 상호 설정 기능 ==========

// 폰트 옵션
const FONT_OPTIONS = [
    { id: 'default', name: '기본', fontFamily: "'Pretendard', -apple-system, sans-serif", nameEn: 'Default' },
    { id: 'noto-sans', name: '노토 산스', fontFamily: "'Noto Sans KR', sans-serif", nameEn: 'Noto Sans' },
    { id: 'nanum-gothic', name: '나눔 고딕', fontFamily: "'Nanum Gothic', sans-serif", nameEn: 'Nanum Gothic' },
    { id: 'spoqa', name: '스포카 한 산스', fontFamily: "'Spoqa Han Sans Neo', sans-serif", nameEn: 'Spoqa Han Sans' },
    { id: 'montserrat', name: 'Montserrat', fontFamily: "'Montserrat', sans-serif", nameEn: 'Montserrat' },
    { id: 'playfair', name: 'Playfair', fontFamily: "'Playfair Display', serif", nameEn: 'Playfair Display' },
    { id: 'dancing', name: 'Dancing Script', fontFamily: "'Dancing Script', cursive", nameEn: 'Dancing Script' },
    { id: 'bebas', name: 'Bebas Neue', fontFamily: "'Bebas Neue', sans-serif", nameEn: 'Bebas Neue' }
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
    const savedColor = localStorage.getItem('hairgator_brand_color') || 'white';

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
            <span class="font-preview" style="font-family: ${font.fontFamily};">Aa 가나</span>
            <span class="font-name">${font.name}</span>
        </label>
    `).join('');

    const colorOptionsHtml = COLOR_OPTIONS.map(color => `
        <label class="color-option ${savedColor === color.id ? 'selected' : ''}" data-color-id="${color.id}">
            <input type="radio" name="brandColor" value="${color.id}" ${savedColor === color.id ? 'checked' : ''} style="display: none;">
            <span class="color-circle" style="background: ${color.color}; ${color.id === 'white' ? 'border: 1px solid #666;' : ''}"></span>
        </label>
    `).join('');

    modal.innerHTML = `
        <div style="
            background: var(--bg-primary, #1a1a1a);
            border-radius: 16px;
            padding: 24px;
            width: 90%;
            max-width: 420px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="color: var(--text-primary, #fff); font-size: 18px; margin: 0;">✏️ 상호 설정</h3>
                <button id="closeBrandModal" style="
                    background: none;
                    border: none;
                    color: var(--text-primary, #fff);
                    font-size: 24px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                ">×</button>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; color: var(--text-secondary, #aaa); font-size: 12px; margin-bottom: 8px;">
                    상호명 (비워두면 HAIRGATOR 표시)
                </label>
                <input type="text" id="brandNameInput" value="${savedBrand}" placeholder="예: SALON BEAUTY" maxlength="20" style="
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    background: rgba(255,255,255,0.05);
                    color: var(--text-primary, #fff);
                    font-size: 16px;
                    box-sizing: border-box;
                ">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; color: var(--text-secondary, #aaa); font-size: 12px; margin-bottom: 12px;">
                    폰트 선택
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
                <label style="display: block; color: var(--text-secondary, #aaa); font-size: 12px; margin-bottom: 12px;">
                    폰트 색상
                </label>
                <div id="colorOptions" style="
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                    justify-content: center;
                ">
                    ${colorOptionsHtml}
                </div>
            </div>

            <div style="margin-bottom: 20px; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                <label style="display: block; color: var(--text-secondary, #aaa); font-size: 12px; margin-bottom: 8px;">
                    미리보기
                </label>
                <div id="brandPreview" style="
                    font-size: 24px;
                    font-weight: bold;
                    color: ${COLOR_OPTIONS.find(c => c.id === savedColor)?.color || '#FFFFFF'};
                    text-align: center;
                    padding: 10px;
                    font-family: ${FONT_OPTIONS.find(f => f.id === savedFont)?.fontFamily || 'inherit'};
                ">${savedBrand || 'HAIRGATOR'}</div>
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
                ">초기화</button>
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
                ">저장</button>
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
            .color-option {
                cursor: pointer;
                transition: all 0.2s;
            }
            .color-option .color-circle {
                display: block;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                transition: all 0.2s;
            }
            .color-option:hover .color-circle {
                transform: scale(1.1);
            }
            .color-option.selected .color-circle {
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
    const colorOptions = document.querySelectorAll('.color-option');
    const preview = document.getElementById('brandPreview');

    // 닫기
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    // 입력 시 미리보기 업데이트
    brandInput.oninput = () => {
        preview.textContent = brandInput.value || 'HAIRGATOR';
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
                preview.style.fontFamily = font.fontFamily;
            }
        };
    });

    // 색상 선택
    colorOptions.forEach(option => {
        option.onclick = () => {
            colorOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            option.querySelector('input').checked = true;
            const colorId = option.dataset.colorId;
            const color = COLOR_OPTIONS.find(c => c.id === colorId);
            if (color) {
                preview.style.color = color.color;
            }
        };
    });

    // 초기화
    resetBtn.onclick = () => {
        brandInput.value = '';
        preview.textContent = 'HAIRGATOR';
        preview.style.fontFamily = FONT_OPTIONS[0].fontFamily;
        preview.style.color = '#FFFFFF';
        fontOptions.forEach(o => o.classList.remove('selected'));
        fontOptions[0].classList.add('selected');
        fontOptions[0].querySelector('input').checked = true;
        colorOptions.forEach(o => o.classList.remove('selected'));
        colorOptions[0].classList.add('selected');
        colorOptions[0].querySelector('input').checked = true;
    };

    // 저장
    saveBtn.onclick = () => {
        const brandName = brandInput.value.trim();
        const selectedFont = document.querySelector('input[name="brandFont"]:checked')?.value || 'default';
        const selectedColor = document.querySelector('input[name="brandColor"]:checked')?.value || 'white';

        localStorage.setItem('hairgator_brand_name', brandName);
        localStorage.setItem('hairgator_brand_font', selectedFont);
        localStorage.setItem('hairgator_brand_color', selectedColor);

        applyCustomBrand();
        modal.remove();

        if (window.showToast) {
            window.showToast('상호 설정이 저장되었습니다.');
        }
    };
}

// 저장된 상호명 적용
function applyCustomBrand() {
    const brandName = localStorage.getItem('hairgator_brand_name');
    const brandFont = localStorage.getItem('hairgator_brand_font') || 'default';
    const brandColor = localStorage.getItem('hairgator_brand_color') || 'white';

    console.log('🏷️ applyCustomBrand 호출:', { brandName, brandFont, brandColor });

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
            logoElement.style.fontFamily = font.fontFamily;
        }

        const color = COLOR_OPTIONS.find(c => c.id === brandColor);
        if (color) {
            logoElement.style.color = color.color;
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
            <h3 style="color: var(--text-primary, #fff); font-size: 18px; margin-bottom: 20px;">📷 프로필 사진</h3>

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
                    💡 이 사진은 3분간 화면 조작이 없을 때<br>
                    <span style="color: #4A90E2;">대기 화면</span>으로 표시됩니다.
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
                ">사진 선택</button>
                ${savedImage ? `
                <button id="removeProfileBtn" style="
                    padding: 12px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: transparent;
                    color: #ff4444;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                ">사진 삭제</button>
                ` : ''}
                <button id="closeProfileModal" style="
                    padding: 12px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: transparent;
                    color: var(--text-secondary, #aaa);
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                ">닫기</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // 이벤트
    document.getElementById('closeProfileModal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    const removeBtn = document.getElementById('removeProfileBtn');
    if (removeBtn) {
        removeBtn.onclick = () => {
            localStorage.removeItem('hairgator_profile_image');
            applyProfileImage();
            modal.remove();
            if (window.showToast) window.showToast('프로필 사진이 삭제되었습니다.');
        };
    }

    document.getElementById('profileFileInput').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // 이미지 리사이즈 (200x200)
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const size = 200;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');

                    // 중앙 크롭
                    const minDim = Math.min(img.width, img.height);
                    const sx = (img.width - minDim) / 2;
                    const sy = (img.height - minDim) / 2;

                    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
                    const resizedImage = canvas.toDataURL('image/jpeg', 0.8);

                    localStorage.setItem('hairgator_profile_image', resizedImage);
                    applyProfileImage();
                    modal.remove();
                    if (window.showToast) window.showToast('프로필 사진이 저장되었습니다.');
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
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

// ========== 대기화면 (스크린세이버) 기능 ==========

let idleTimeout = null;
const IDLE_TIME = 3 * 60 * 1000; // 3분

function initIdleScreen() {
    resetIdleTimer();

    // 터치/마우스/키보드 이벤트 감지
    ['touchstart', 'mousedown', 'mousemove', 'keydown', 'scroll'].forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });
}

function resetIdleTimer() {
    if (idleTimeout) {
        clearTimeout(idleTimeout);
    }

    // 대기화면이 표시 중이면 닫기
    const idleScreen = document.getElementById('idle-screen');
    if (idleScreen) {
        idleScreen.remove();
    }

    // 새 타이머 시작
    idleTimeout = setTimeout(showIdleScreen, IDLE_TIME);
}

function showIdleScreen() {
    // 이미 대기화면이 있으면 무시
    if (document.getElementById('idle-screen')) return;

    const savedImage = localStorage.getItem('hairgator_profile_image');
    const brandName = localStorage.getItem('hairgator_brand_name') || 'HAIRGATOR';
    const brandFont = localStorage.getItem('hairgator_brand_font') || 'default';
    const brandColor = localStorage.getItem('hairgator_brand_color') || 'white';

    const font = FONT_OPTIONS.find(f => f.id === brandFont);
    const color = COLOR_OPTIONS.find(c => c.id === brandColor);

    const idleScreen = document.createElement('div');
    idleScreen.id = 'idle-screen';
    idleScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;

    idleScreen.innerHTML = `
        <style>
            @keyframes idlePulse {
                0%, 100% { transform: scale(1); opacity: 0.9; }
                50% { transform: scale(1.02); opacity: 1; }
            }
            @keyframes idleGlow {
                0%, 100% { box-shadow: 0 0 30px rgba(255,255,255,0.1); }
                50% { box-shadow: 0 0 60px rgba(255,255,255,0.2); }
            }
            @keyframes idleFade {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
        </style>

        ${savedImage ? `
            <div style="
                width: 200px;
                height: 200px;
                border-radius: 50%;
                overflow: hidden;
                margin-bottom: 40px;
                animation: idlePulse 4s ease-in-out infinite, idleGlow 4s ease-in-out infinite;
            ">
                <img src="${savedImage}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        ` : `
            <div style="
                width: 150px;
                height: 150px;
                margin-bottom: 40px;
                animation: idlePulse 4s ease-in-out infinite;
            ">
                <img src="/로고.png" style="width: 100%; height: 100%; object-fit: contain; filter: brightness(0.9);">
            </div>
        `}

        <h1 style="
            font-family: ${font?.fontFamily || 'inherit'};
            color: ${color?.color || '#fff'};
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 2px;
            animation: idleFade 4s ease-in-out infinite;
            text-align: center;
        ">${brandName}</h1>

        <p style="
            color: rgba(255,255,255,0.4);
            font-size: 14px;
            margin-top: 60px;
            animation: idleFade 3s ease-in-out infinite;
        ">화면을 터치하세요</p>
    `;

    document.body.appendChild(idleScreen);

    // 터치하면 대기화면 닫기
    idleScreen.onclick = () => {
        idleScreen.remove();
        resetIdleTimer();
    };
}

// 전역 함수 노출
window.showProfileImageModal = showProfileImageModal;
window.applyProfileImage = applyProfileImage;
window.showIdleScreen = showIdleScreen;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        applyProfileImage();
        initIdleScreen();
    }, 1000);
});
