// HAIRGATOR Main Application - 최종 버전 (goBack display:none 추가)
/* eslint-disable no-unused-vars */
// HTML onclick 핸들러로 사용되는 함수들: goBack, showHistoryPanel, startNewChat, clearChat,
// selectImageAction, selectGender, selectService, selectCategory, triggerImageUpload,
// handleImageSelect, quickAction, searchStylesDemo, hideCanvas, saveResult, shareResult,
// fetchImageAsBase64, showInsufficientTokenModal, isGenderSelectionVisible, handleLogout

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

        // Flutter WebView에서 전달된 토큰으로 자동 로그인 시도
        handleFlutterAutoLogin().then(() => {
            checkAuthStatus();
        });

        setupSidebar();
        setupHashRouting(); // 해시 라우팅 설정
        setupFullscreenToggle(); // 풀스크린 토글 (스타일메뉴용)

        if (backBtn) {
            backBtn.style.display = 'none';
        }

        // URL 파라미터로 스타일 모달 열기 (style-match에서 이동 시)
        checkUrlForStyleModal();

        console.log('✅ HAIRGATOR 초기화 완료');
    }

    // ========== 풀스크린 토글 (Flutter 앱 전용) ==========
    let isFullscreenMode = false;

    function setupFullscreenToggle() {
        // Flutter 앱에서만 버튼 표시
        if (!window.FlutterChannel) {
            console.log('[Fullscreen] Flutter 앱 아님, 버튼 숨김');
            return;
        }

        // 전체화면 토글 버튼 생성
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.id = 'fullscreen-toggle-btn';
        fullscreenBtn.innerHTML = '⛶';
        fullscreenBtn.title = '전체화면 토글';
        fullscreenBtn.style.cssText = `
            position: fixed;
            bottom: 70px;
            left: 12px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            font-size: 18px;
            cursor: pointer;
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
            transition: all 0.2s ease;
        `;

        fullscreenBtn.addEventListener('click', function() {
            if (window.FlutterChannel) {
                isFullscreenMode = !isFullscreenMode;
                console.log('[Fullscreen] 탭바 토글 요청, 모드:', isFullscreenMode);
                window.FlutterChannel.postMessage('toggleFullscreen');

                // 버튼 위치 조정 (탭바 유무에 따라)
                fullscreenBtn.style.bottom = isFullscreenMode ? '12px' : '70px';
                fullscreenBtn.innerHTML = isFullscreenMode ? '⛶' : '⛶';
            }
        });

        document.body.appendChild(fullscreenBtn);

        // 스타일 메뉴 페이지에서만 버튼 표시
        function updateButtonVisibility() {
            const hash = window.location.hash.replace('#', '');
            const isStyleMenu = !hash || hash === 'stylemenu' || hash === '';
            fullscreenBtn.style.display = isStyleMenu ? 'flex' : 'none';
        }

        updateButtonVisibility();
        window.addEventListener('hashchange', updateButtonVisibility);

        console.log('📱 풀스크린 토글 버튼 설정 완료');
    }

    // Flutter WebView 자동 로그인 처리
    async function handleFlutterAutoLogin() {
        const urlParams = new URLSearchParams(window.location.search);
        const firebaseToken = urlParams.get('firebaseToken');

        if (!firebaseToken) {
            console.log('[Flutter] firebaseToken 파라미터 없음');
            return;
        }

        console.log('[Flutter] firebaseToken 감지, 자동 로그인 시도...');

        try {
            // Netlify Function으로 토큰 검증 및 Custom Token 발급
            const response = await fetch('/.netlify/functions/verify-firebase-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: firebaseToken })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[Flutter] 토큰 검증 실패:', data.error);
                // 실패 시 로그인 페이지로 리다이렉트
                window.location.href = '/login.html';
                return;
            }

            console.log('[Flutter] Custom Token 발급 성공, Firebase 로그인 중...');

            // Firebase 로그인
            if (window.auth && data.customToken) {
                await window.auth.signInWithCustomToken(data.customToken);
                console.log('[Flutter] Firebase 자동 로그인 성공!');

                // URL에서 토큰 파라미터 제거 (보안)
                const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, cleanUrl);
            }
        } catch (error) {
            console.error('[Flutter] 자동 로그인 에러:', error);
            // 에러 시 로그인 페이지로 리다이렉트
            window.location.href = '/login.html';
        }
    }

    // ========== 해시 라우팅 시스템 ==========
    function setupHashRouting() {
        // 초기 해시 확인
        handleHashChange();

        // 해시 변경 이벤트 리스너
        window.addEventListener('hashchange', handleHashChange);
    }

    function handleHashChange() {
        const hash = window.location.hash.replace('#', '');
        console.log('📍 해시 변경:', hash || '(메인)');

        // 모든 페이지/섹션 숨기기
        const productsPage = document.getElementById('productsPage');
        const mypagePage = document.getElementById('mypagePage');
        const genderSelection = document.getElementById('genderSelection');
        const menuContainer = document.getElementById('menuContainer');

        if (productsPage) productsPage.style.display = 'none';
        if (mypagePage) mypagePage.style.display = 'none';
        if (genderSelection) genderSelection.style.display = 'none';
        if (menuContainer) menuContainer.style.display = 'none';

        // 탭 변경 시 현재 언어로 텍스트 업데이트 (i18n.js)
        if (typeof window.updateAllTexts === 'function') {
            window.updateAllTexts();
        }
        // 사이드바 업데이트 (main.js)
        updateSidebarTexts();

        switch (hash) {
            case 'products':
                if (productsPage) {
                    productsPage.style.display = 'block';
                    updateProductsPagePlan(); // 현재 플랜 표시 업데이트
                    console.log('📦 상품 페이지 표시');
                }
                break;
            case 'mypage':
                if (mypagePage) {
                    mypagePage.style.display = 'block';
                    updateMypageInfo(); // 마이페이지 정보 업데이트
                    console.log('👤 마이페이지 표시');
                }
                break;
            case 'stylemenu':
                // 스타일 메뉴 (메인 화면)
                if (genderSelection) genderSelection.style.display = 'flex';
                if (menuContainer) menuContainer.style.display = 'block';
                console.log('💇 스타일 메뉴 표시');
                break;
            default:
                // 메인 페이지 (해시 없음) - stylemenu와 동일
                if (genderSelection) genderSelection.style.display = 'flex';
                if (menuContainer) menuContainer.style.display = 'block';
                console.log('🏠 메인 페이지');
                break;
        }
    }

    // 해시 네비게이션 함수 (전역으로 노출)
    window.navigateToHash = function(hash) {
        if (hash) {
            window.location.hash = hash;
        } else {
            // 해시 제거하고 메인으로
            history.pushState('', document.title, window.location.pathname + window.location.search);
            handleHashChange();
        }
    };

    // 마이페이지 정보 업데이트
    async function updateMypageInfo() {
        const nameEl = document.getElementById('mypageName');
        const emailEl = document.getElementById('mypageEmail');
        const avatarEl = document.getElementById('mypageAvatar');
        const planEl = document.getElementById('mypagePlan');
        const tokensEl = document.getElementById('mypageTokens');
        const themeIconEl = document.getElementById('mypageThemeIcon');
        const themeTextEl = document.getElementById('mypageThemeText');

        // 테마 상태 업데이트
        const isLightTheme = document.body.classList.contains('light-theme');
        if (themeIconEl) themeIconEl.textContent = isLightTheme ? '☀️' : '🌙';
        if (themeTextEl) themeTextEl.textContent = isLightTheme ? (t('ui.lightMode') || 'Light Mode') : (t('ui.darkMode') || 'Dark Mode');

        // Firebase Auth 사용자 정보
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const user = firebase.auth().currentUser;
            if (user) {
                // displayName 우선순위: Firestore > window.currentDesigner > Auth > 기본값
                let displayName = user.displayName;

                // Firestore에서 사용자 정보 가져오기 (이메일 기반 문서 ID 사용)
                let photoURL = user.photoURL;
                let userEmail = user.email;

                try {
                    // 이메일 기반 문서 ID 생성
                    const emailDocId = user.email ? user.email.toLowerCase().replace(/@/g, '_').replace(/\./g, '_') : null;

                    // window.currentDesigner가 있으면 그 ID 우선 사용
                    const docId = window.currentDesigner?.id || emailDocId;

                    if (docId) {
                        const userDoc = await firebase.firestore().collection('users').doc(docId).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            displayName = userData.verifiedName || userData.name || userData.displayName || displayName;
                            photoURL = userData.photoURL || photoURL;
                            userEmail = userData.email || userEmail;
                            console.log('📋 Firestore 사용자 정보:', { docId, name: userData.name, photoURL: userData.photoURL });
                        }
                    }
                } catch (e) {
                    console.log('Firestore 사용자 정보 조회 실패:', e);
                }

                // fallback: window.currentDesigner
                if (!displayName && window.currentDesigner) {
                    displayName = window.currentDesigner.verifiedName || window.currentDesigner.name || window.currentDesigner.displayName;
                }
                if (!photoURL && window.currentDesigner?.photoURL) {
                    photoURL = window.currentDesigner.photoURL;
                }

                if (nameEl) nameEl.textContent = displayName || userEmail?.split('@')[0] || '사용자';
                if (emailEl) emailEl.textContent = userEmail || '';
                if (avatarEl && photoURL) {
                    avatarEl.innerHTML = `<img src="${photoURL}" alt="프로필" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                }
            } else if (window.currentDesigner) {
                // Firebase Auth는 없지만 window.currentDesigner가 있는 경우
                const designer = window.currentDesigner;
                if (nameEl) nameEl.textContent = designer.verifiedName || designer.name || designer.displayName || designer.email?.split('@')[0] || '사용자';
                if (emailEl) emailEl.textContent = designer.email || '';
                if (avatarEl && designer.photoURL) {
                    avatarEl.innerHTML = `<img src="${designer.photoURL}" alt="프로필">`;
                }
            } else {
                if (nameEl) nameEl.textContent = '로그인 필요';
                if (emailEl) emailEl.textContent = '-';
            }
        }

        // 토큰/플랜 정보 (FirebaseBridge 사용)
        if (typeof window.FirebaseBridge !== 'undefined') {
            try {
                const tokenData = await window.FirebaseBridge.getTokenBalance();
                if (tokenData) {
                    if (tokensEl) tokensEl.textContent = (tokenData.tokenBalance || 0).toLocaleString();
                    if (planEl) {
                        const planNames = {
                            'free': t('payment.freePlan') || 'Free',
                            'basic': t('payment.basicPlan') || 'Basic',
                            'pro': t('payment.proPlan') || 'Pro',
                            'business': t('payment.businessPlan') || 'Business'
                        };
                        planEl.textContent = planNames[tokenData.plan] || planNames['free'];
                    }
                }

                // 플랜 만료일 표시
                const expirySection = document.getElementById('mypagePlanExpiry');
                const expiryDateEl = document.getElementById('mypageExpiryDate');
                const expiryBadgeEl = document.getElementById('mypageExpiryBadge');

                if (window.currentDesigner?.planExpiresAt && window.currentDesigner.plan !== 'free') {
                    const expiresAt = new Date(window.currentDesigner.planExpiresAt);
                    const now = new Date();
                    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

                    if (expirySection) expirySection.style.display = 'block';
                    if (expiryDateEl) {
                        expiryDateEl.textContent = expiresAt.toLocaleDateString('ko-KR', {
                            year: 'numeric', month: 'long', day: 'numeric'
                        });
                    }
                    if (expiryBadgeEl) {
                        if (daysRemaining <= 0) {
                            expiryBadgeEl.textContent = '만료됨';
                            expiryBadgeEl.style.background = '#ef4444';
                            expiryBadgeEl.style.color = '#fff';
                        } else if (daysRemaining <= 3) {
                            expiryBadgeEl.textContent = `${daysRemaining}일 남음`;
                            expiryBadgeEl.style.background = '#ef4444';
                            expiryBadgeEl.style.color = '#fff';
                        } else if (daysRemaining <= 7) {
                            expiryBadgeEl.textContent = `${daysRemaining}일 남음`;
                            expiryBadgeEl.style.background = '#f59e0b';
                            expiryBadgeEl.style.color = '#fff';
                        } else {
                            expiryBadgeEl.textContent = `${daysRemaining}일 남음`;
                            expiryBadgeEl.style.background = '#10b981';
                            expiryBadgeEl.style.color = '#fff';
                        }
                    }
                } else {
                    if (expirySection) expirySection.style.display = 'none';
                }

                // 저장된 카드 정보 업데이트
                updateSavedCardDisplay();

            } catch (e) {
                console.error('토큰 정보 로드 실패:', e);
            }
        }
    }

    // 저장된 카드 정보 표시 업데이트
    function updateSavedCardDisplay() {
        const cardBrandEl = document.getElementById('mypageCardBrand');
        const cardNumberEl = document.getElementById('mypageCardNumber');
        const deleteBtn = document.getElementById('mypageDeleteCardBtn');

        const savedCard = window.currentDesigner?.savedCard;

        if (savedCard && savedCard.last4) {
            const brandNames = {
                'visa': 'VISA',
                'mastercard': 'Mastercard',
                'amex': 'American Express',
                'jcb': 'JCB',
                'unionpay': 'UnionPay',
                'bc': 'BC카드',
                'samsung': '삼성카드',
                'hyundai': '현대카드',
                'shinhan': '신한카드',
                'lotte': '롯데카드',
                'kb': 'KB국민카드',
                'hana': '하나카드',
                'woori': '우리카드',
                'nh': 'NH농협카드'
            };

            if (cardBrandEl) cardBrandEl.textContent = brandNames[savedCard.brand?.toLowerCase()] || savedCard.brand || '카드';
            if (cardNumberEl) cardNumberEl.textContent = `**** **** **** ${savedCard.last4}`;
            if (deleteBtn) deleteBtn.style.display = 'block';
        } else {
            if (cardBrandEl) cardBrandEl.textContent = '카드 없음';
            if (cardNumberEl) cardNumberEl.textContent = '저장된 카드가 없습니다';
            if (deleteBtn) deleteBtn.style.display = 'none';
        }
    }

    // 저장된 카드 섹션 토글 - 전역 함수(파일 하단)가 savedCardsSection 사용
    // 중복 정의 제거됨 (2025-12-30)

    // 저장된 카드 삭제
    window.deleteSavedCard = async function() {
        if (!confirm('저장된 카드를 삭제하시겠습니까?')) return;

        try {
            const docId = await window.FirebaseBridge?.getUserDocId();
            if (!docId) {
                alert('로그인이 필요합니다.');
                return;
            }

            await firebase.firestore().collection('users').doc(docId).update({
                billingKey: firebase.firestore.FieldValue.delete(),
                savedCard: firebase.firestore.FieldValue.delete()
            });

            // 로컬 상태 업데이트
            if (window.currentDesigner) {
                delete window.currentDesigner.savedCard;
            }

            updateSavedCardDisplay();
            if (typeof showToast === 'function') {
                showToast('카드가 삭제되었습니다.', 'success');
            }
        } catch (e) {
            console.error('카드 삭제 실패:', e);
            alert('카드 삭제에 실패했습니다.');
        }
    };

    // 마이페이지 정보 업데이트 함수 전역 노출
    window.updateMypageInfo = updateMypageInfo;

    // 플랜 선택 및 결제 (전역 함수)
    window.selectPlanAndPay = async function(planType) {
        console.log('💳 플랜 선택:', planType);

        // 로그인 확인
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const user = firebase.auth().currentUser;
            if (!user) {
                alert('로그인이 필요합니다.');
                window.location.href = 'login.html';
                return;
            }
        }

        // 결제 처리 (payment.js 사용)
        // verifyAndPay: 본인인증 확인 후 결제 진행
        if (typeof window.verifyAndPay === 'function') {
            try {
                await window.verifyAndPay(planType);
            } catch (e) {
                console.error('결제 오류:', e);
                alert('결제 처리 중 오류가 발생했습니다.');
            }
        } else if (typeof window.showPaymentOptions === 'function') {
            // fallback: 본인인증 함수 없으면 기존 방식
            try {
                await window.showPaymentOptions(planType);
            } catch (e) {
                console.error('결제 오류:', e);
                alert('결제 처리 중 오류가 발생했습니다.');
            }
        } else if (typeof window.HAIRGATOR_PAYMENT !== 'undefined') {
            // fallback: 빌링키 기능 없으면 기존 방식
            try {
                await window.HAIRGATOR_PAYMENT.purchasePlan(planType);
            } catch (e) {
                console.error('결제 오류:', e);
                alert('결제 처리 중 오류가 발생했습니다.');
            }
        } else {
            alert('결제 시스템을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        }
    };

    // 언어 선택 모달 열기 (전역 함수)
    window.openLanguageSelector = function() {
        // 기존 언어 선택 기능이 있으면 호출
        if (typeof window.showLanguageModal === 'function') {
            window.showLanguageModal();
        } else {
            alert('언어 설정 기능 준비 중입니다.');
        }
    };

    // URL 파라미터 확인 후 스타일 모달/기능 열기
    async function checkUrlForStyleModal() {
        const params = new URLSearchParams(window.location.search);
        const styleId = params.get('openStyle') || params.get('styleId');
        const gender = params.get('gender');
        const category = params.get('category');
        const action = params.get('action'); // lookbook, hairtry, recipe

        if (!styleId) return;

        console.log('📂 URL에서 스타일 요청:', styleId, gender, action || 'modal');

        // URL 파라미터 제거 (히스토리 정리)
        window.history.replaceState({}, document.title, window.location.pathname);

        // 성별 선택 및 메뉴 로드 대기
        if (gender) {
            // 성별 선택
            const genderBtn = document.querySelector(`.gender-btn[data-gender="${gender}"]`);
            if (genderBtn) {
                genderBtn.click();
            }

            // 메뉴 로드 완료 대기
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Firestore에서 스타일 정보 가져오기
            try {
                if (window.db) {
                    let style = null;

                    // 1. document ID로 직접 조회 시도 (style-match에서 오는 ID)
                    try {
                        const doc = await window.db.collection('hairstyles').doc(styleId).get();
                        if (doc.exists) {
                            style = { ...doc.data(), id: doc.id };
                            console.log('✅ document ID로 스타일 로드:', style.name);
                        }
                    } catch (_e) {
                        console.log('📂 document ID 조회 실패, 필드 검색 시도...');
                    }

                    // 2. styleId 필드로 쿼리
                    if (!style) {
                        const snapshot = await window.db.collection('hairstyles')
                            .where('styleId', '==', styleId)
                            .limit(1)
                            .get();

                        if (!snapshot.empty) {
                            const doc = snapshot.docs[0];
                            style = { ...doc.data(), id: doc.id };
                            console.log('✅ styleId 필드로 스타일 로드:', style.name);
                        }
                    }

                    if (style) {
                        // action에 따라 기능 실행
                        if (action === 'lookbook' || action === 'hairtry') {
                            // 룩북/헤어체험 - AI 사진 모달 열기
                            if (window.HAIRGATOR_MENU && window.HAIRGATOR_MENU.openAIPhotoModal) {
                                console.log(`🎨 ${action} 실행:`, style.name);
                                window.HAIRGATOR_MENU.openAIPhotoModal(style.id, style.name, style.imageUrl || style.thumbnail);
                            }
                        } else if (action === 'recipe') {
                            // 레시피 - AI Studio로 이동
                            if (window.navigateToRecipe) {
                                console.log('📋 레시피 실행:', style.name);
                                window.navigateToRecipe(style, 'cut');
                            }
                        } else {
                            // 기본: 모달 열기
                            if (window.openStyleModal) {
                                window.openStyleModal(style);
                            }
                        }
                    } else {
                        console.warn('⚠️ 스타일 문서 없음:', styleId);
                    }
                }
            } catch (e) {
                console.error('스타일 로드 실패:', e);
            }
        }
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

                        <!-- 상호 설정 -->
                        <div class="menu-item" id="brandSettingBtn" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">✏️</span>
                                <span class="sidebar-menu-text" style="font-size: 14px;">${t('ui.brandSetting') || '상호 설정'}</span>
                            </div>
                        </div>

                        <!-- AI 스타일 매칭 -->
                        <div class="menu-item" id="styleMatchBtn" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">✨</span>
                                <div style="flex: 1;">
                                    <span class="sidebar-menu-text" style="font-size: 14px;">${t('styleMatch.menuTitle') || 'AI 스타일 매칭'}</span>
                                    <div style="font-size: 11px; color: var(--text-secondary, #888); margin-top: 2px;">${t('styleMatch.menuSubtitle') || '얼굴형 분석 기반 추천'}</div>
                                </div>
                            </div>
                        </div>

                        <!-- 퍼스널 이미지 분석 -->
                        <div class="menu-item" id="personalColorBtn" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">🌈</span>
                                <span class="sidebar-menu-text" style="font-size: 14px;">${t('ui.personalColor')}</span>
                            </div>
                        </div>

                        <!-- AI 얼굴변환 & 영상 -->
                        <div class="menu-item" id="aiTransformBtn" style="padding: 15px 20px; border-bottom: 1px solid rgba(128,128,128,0.1); cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-size: 20px;">🎬</span>
                                <div style="flex: 1;">
                                    <span class="sidebar-menu-text" style="font-size: 14px;">${t('aiTransform.menuTitle') || 'AI 얼굴변환 & 영상'}</span>
                                    <div style="font-size: 11px; color: var(--text-secondary, #888); margin-top: 2px;">${t('aiTransform.menuSubtitle') || '얼굴 합성 · 영상 생성'}</div>
                                </div>
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
        const styleMatchBtn = document.getElementById('styleMatchBtn');
        const personalColorBtn = document.getElementById('personalColorBtn');
        const aiTransformBtn = document.getElementById('aiTransformBtn');
        const brandSettingBtn = document.getElementById('brandSettingBtn');

        if (themeToggleMenu) {
            themeToggleMenu.addEventListener('click', toggleTheme);
        }

        // AI 스타일 매칭 (베이직 플랜 이상만 접근 가능)
        if (styleMatchBtn) {
            styleMatchBtn.addEventListener('click', function() {
                console.log('✨ AI 스타일 매칭 클릭');

                // 플랜 기반 체크 (여러 소스에서 확인)
                const ALLOWED_PLANS = ['basic', 'pro', 'business'];
                let userPlan = 'free';

                // 1. currentDesigner에서 확인
                if (window.currentDesigner?.plan) {
                    userPlan = window.currentDesigner.plan;
                }
                // 2. getBullnabiUser에서 확인
                else if (typeof window.getBullnabiUser === 'function') {
                    const bullnabiUser = window.getBullnabiUser();
                    if (bullnabiUser?.plan) userPlan = bullnabiUser.plan;
                }
                // 3. FirebaseBridge.cachedUserData에서 확인
                else if (window.FirebaseBridge?.cachedUserData?.plan) {
                    userPlan = window.FirebaseBridge.cachedUserData.plan;
                }
                // 4. localStorage에서 확인
                else {
                    try {
                        const stored = localStorage.getItem('firebase_user');
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            if (parsed?.plan) userPlan = parsed.plan;
                        }
                    } catch(_e) {}
                }

                const isAllowed = ALLOWED_PLANS.includes(userPlan);

                console.log('AI 스타일 매칭 접근 체크:', { userPlan, isAllowed });

                if (!isAllowed) {
                    // 업그레이드 모달 표시
                    if (typeof showUpgradeModal === 'function') {
                        showUpgradeModal('AI 스타일 매칭', '베이직 플랜 이상에서 사용 가능합니다.');
                    } else if (typeof showToast === 'function') {
                        showToast('베이직 플랜 이상에서 사용 가능합니다.', 'warning');
                    } else {
                        alert('베이직 플랜 이상에서 사용 가능합니다.');
                    }
                    return;
                }

                closeSidebar();
                window.location.href = '/style-match/';
            });

        }

        // 퍼스널 이미지 분석 (베이직 플랜 이상만 접근 가능)
        if (personalColorBtn) {
            personalColorBtn.addEventListener('click', function() {
                console.log('🎨 퍼스널 이미지 분석 클릭');

                // 플랜 기반 체크 (여러 소스에서 확인)
                const ALLOWED_PLANS = ['basic', 'pro', 'business'];
                let userPlan = 'free';

                // 1. currentDesigner에서 확인
                if (window.currentDesigner?.plan) {
                    userPlan = window.currentDesigner.plan;
                }
                // 2. getBullnabiUser에서 확인
                else if (typeof window.getBullnabiUser === 'function') {
                    const bullnabiUser = window.getBullnabiUser();
                    if (bullnabiUser?.plan) userPlan = bullnabiUser.plan;
                }
                // 3. FirebaseBridge.cachedUserData에서 확인
                else if (window.FirebaseBridge?.cachedUserData?.plan) {
                    userPlan = window.FirebaseBridge.cachedUserData.plan;
                }
                // 4. localStorage에서 확인
                else {
                    try {
                        const stored = localStorage.getItem('firebase_user');
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            if (parsed?.plan) userPlan = parsed.plan;
                        }
                    } catch(_e) {}
                }

                const isAllowed = ALLOWED_PLANS.includes(userPlan);

                console.log('퍼스널 이미지 분석 접근 체크:', { userPlan, isAllowed });

                if (!isAllowed) {
                    // 업그레이드 모달 표시
                    if (typeof showUpgradeModal === 'function') {
                        showUpgradeModal('퍼스널 이미지 분석', '베이직 플랜 이상에서 사용 가능합니다.');
                    } else if (typeof showToast === 'function') {
                        showToast('베이직 플랜 이상에서 사용 가능합니다.', 'warning');
                    } else {
                        alert('베이직 플랜 이상에서 사용 가능합니다.');
                    }
                    return;
                }

                closeSidebar();
                const gender = window.currentGender || 'female';
                window.location.href = `/personal-color/?gender=${gender}`;
            });
        }

        // AI 얼굴변환 & 영상
        if (aiTransformBtn) {
            aiTransformBtn.addEventListener('click', function() {
                console.log('🎬 AI 얼굴변환 & 영상 클릭');
                closeSidebar();
                window.location.href = '/ai-transform/';
            });
        }

        if (brandSettingBtn) {
            brandSettingBtn.addEventListener('click', function() {
                console.log('✏️ 상호 설정 클릭');
                showBrandSettingModal();
                closeSidebar();
            });
        }

        // 프리미엄 업그레이드 버튼
        const premiumUpgradeBtn = document.getElementById('premiumUpgradeBtn');
        if (premiumUpgradeBtn) {
            premiumUpgradeBtn.addEventListener('click', function() {
                console.log('⬆️ 플랜 업그레이드 클릭');
                closeSidebar();

                // 요금제 모달 열기
                if (typeof openPricingModal === 'function') {
                    openPricingModal();
                }
            });
        }

        // 플랜에 따라 유료 기능 버튼들 disabled 상태 적용 (한 번만 호출)
        if (typeof applyPlanBasedDisabledState === 'function') {
            applyPlanBasedDisabledState();
        }

        console.log('✅ 사이드바 메뉴 이벤트 리스너 설정 완료');
    }

    function updateLoginInfo() {
        const loginStatus = document.getElementById('loginStatus');
        const planBadge = document.getElementById('planBadge');
        const planIcon = document.getElementById('planIcon');
        const planText = document.getElementById('planText');
        const tokenInfo = document.getElementById('tokenInfo');

        // 플랜 설정 (이름, 아이콘, 그라데이션) - 다국어 지원
        const planConfig = {
            'free': {
                name: t('payment.freePlan') || '무료',
                icon: '🎁',
                gradient: 'linear-gradient(135deg, #78909c, #546e7a)',
                color: '#fff'
            },
            'basic': {
                name: t('payment.basicPlan') || '베이직',
                icon: '💎',
                gradient: 'linear-gradient(135deg, #4FC3F7, #0288D1)',
                color: '#fff'
            },
            'pro': {
                name: t('payment.proPlan') || '프로',
                icon: '🚀',
                gradient: 'linear-gradient(135deg, #BA68C8, #7B1FA2)',
                color: '#fff'
            },
            'business': {
                name: t('payment.businessPlan') || '비즈니스',
                icon: '👑',
                gradient: 'linear-gradient(135deg, #FFD54F, #FF8F00)',
                color: '#333'
            }
        };

        // 관리자 ID 목록 (이메일 기반: email.replace(/@/g, '_').replace(/\./g, '_'))
        const ADMIN_IDS = ['708eric_hanmail_net'];

        const bullnabiUser = window.getBullnabiUser && window.getBullnabiUser();
        if (bullnabiUser) {
            // 불나비/Firebase 로그인 성공
            loginInfoPending = false;
            if (loginInfoTimeout) {
                clearTimeout(loginInfoTimeout);
                loginInfoTimeout = null;
            }
            // 이름 표시: bullnabiUser.name (이미 window.currentDesigner?.name 폴백 포함)
            const displayName = bullnabiUser.name || window.currentDesigner?.name || '사용자';
            if (loginStatus) loginStatus.textContent = `${t('ui.loginStatus')}: ${displayName}`;

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
            // 사이드바 열릴 때마다 플랜 기반 버튼 상태 업데이트
            if (typeof applyPlanBasedDisabledState === 'function') {
                applyPlanBasedDisabledState();
            }
        }
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
    }

    // 전역으로 노출 (Flutter에서 호출 가능)
    window.closeSidebar = closeSidebar;

    // 해시 변경 시 사이드바 자동 닫기 (탭 전환 시)
    window.addEventListener('hashchange', function() {
        closeSidebar();
        console.log('[Sidebar] 해시 변경으로 사이드바 닫힘');
    });

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

        // UI 텍스트 업데이트 (i18n.js의 updateAllTexts - data-i18n 요소 업데이트)
        if (typeof window.updateAllTexts === 'function') {
            window.updateAllTexts(langCode);
        }
        // 사이드바/성별선택 업데이트 (main.js 전용)
        updateSidebarTexts();

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

        // ⭐ 사이드바 재생성 (동적 생성 텍스트 업데이트)
        setupSidebar();

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

    function updateSidebarTexts() {
        // 사이드바 텍스트 업데이트 (main.js 전용)
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
    window.updateSidebarTexts = updateSidebarTexts;
    // 주의: window.updateAllTexts는 i18n.js에서 정의됨 - 덮어쓰지 말 것!

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

    // Firebase에서 브랜드 로드 (앱용 - 로그인 대기 후 1회 시도)
    async function tryLoadBrandFromFirebase(attempt = 1) {
        const maxAttempts = 3;
        const delay = 1500;

        // 로그인 정보 확인
        const userInfo = getUserInfo();
        if (!userInfo || !userInfo.id) {
            // 로그인 정보 없으면 대기 후 재시도
            if (attempt < maxAttempts) {
                console.log(`🏷️ 로그인 대기 중... (${attempt}/${maxAttempts})`);
                setTimeout(() => tryLoadBrandFromFirebase(attempt + 1), delay);
            }
            return;
        }

        // 로그인 완료 → 1회만 시도
        console.log('🏷️ Firebase 브랜드 로드 시도');
        const firebaseBrand = await loadBrandFromFirebase();
        if (firebaseBrand) {
            console.log('🏷️ Firebase에서 브랜드 로드 성공!');
            applyCustomBrand();
        }
        // 브랜드 유무와 관계없이 프로필 이미지 적용
        applyProfileImage();
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
    // Firebase 사용자 우선 (window.currentDesigner)
    if (window.currentDesigner && window.currentDesigner.id) {
        return {
            name: window.currentDesigner.name || '사용자',
            phone: window.currentDesigner.phone || window.currentDesigner.id,
            id: window.currentDesigner.id,
            email: window.currentDesigner.email
        };
    }

    // 불나비 사용자
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

        // 이메일 기반 문서 ID 우선 사용
        const docId = userInfo.id || `${userInfo.name}_${userInfo.phone}`;
        await window.db.collection('brandSettings').doc(docId).set({
            ...brandSettings,
            designerName: userInfo.name,
            email: userInfo.email || '',
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

        // 1차: 이메일 기반 문서 ID로 조회
        const primaryDocId = userInfo.id || `${userInfo.name}_${userInfo.phone}`;
        console.log('🏷️ Firebase 브랜드 로드 시도:', primaryDocId);

        let doc = await window.db.collection('brandSettings').doc(primaryDocId).get();

        // 2차: 없으면 레거시 ID로 폴백 (기존 사용자 마이그레이션)
        if (!doc.exists && userInfo.id && userInfo.name && userInfo.phone) {
            const legacyDocId = `${userInfo.name}_${userInfo.phone}`;
            console.log('🏷️ 레거시 ID로 재시도:', legacyDocId);
            doc = await window.db.collection('brandSettings').doc(legacyDocId).get();

            // 레거시에서 찾으면 새 ID로 마이그레이션
            if (doc.exists) {
                const data = doc.data();
                console.log('🏷️ 레거시 브랜드 발견, 마이그레이션:', data.brandName);
                await window.db.collection('brandSettings').doc(primaryDocId).set({
                    ...data,
                    email: userInfo.email || '',
                    migratedFrom: legacyDocId,
                    migratedAt: Date.now()
                });
            }
        }

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

        // 이메일 기반 문서 ID 우선 사용
        const docId = userInfo.id || `${userInfo.name}_${userInfo.phone}`;
        await window.db.collection('userSettings').doc(docId).set({
            ...settings,
            designerName: userInfo.name,
            email: userInfo.email || '',
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

        // 1차: 이메일 기반 문서 ID로 조회
        const primaryDocId = userInfo.id || `${userInfo.name}_${userInfo.phone}`;
        console.log('⚙️ Firebase 사용자 설정 로드 시도:', primaryDocId);

        let doc = await window.db.collection('userSettings').doc(primaryDocId).get();

        // 2차: 없으면 레거시 ID로 폴백 (기존 사용자 마이그레이션)
        if (!doc.exists && userInfo.id && userInfo.name && userInfo.phone) {
            const legacyDocId = `${userInfo.name}_${userInfo.phone}`;
            console.log('⚙️ 레거시 ID로 재시도:', legacyDocId);
            doc = await window.db.collection('userSettings').doc(legacyDocId).get();

            // 레거시에서 찾으면 새 ID로 마이그레이션
            if (doc.exists) {
                const data = doc.data();
                console.log('⚙️ 레거시 설정 발견, 마이그레이션');
                await window.db.collection('userSettings').doc(primaryDocId).set({
                    ...data,
                    email: userInfo.email || '',
                    migratedFrom: legacyDocId,
                    migratedAt: Date.now()
                });
            }
        }

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
            // Firebase Auth 사용자: UID 기반 문서 ID
            const primaryDocId = userInfo.id || `${userInfo.name}_${userInfo.phone}`;
            const legacyDocId = `${userInfo.name}_${userInfo.phone}`;

            console.log('👤 프로필 모달 이미지 로드:', primaryDocId);

            // 1차: 새 문서 ID로 조회
            let doc = await window.db.collection('brandSettings').doc(primaryDocId).get();
            savedImage = doc.exists ? doc.data().profileImage : null;

            // 2차: 없으면 레거시 문서 ID로 조회
            if (!savedImage && primaryDocId !== legacyDocId) {
                console.log('👤 모달 레거시 문서 ID로 재시도:', legacyDocId);
                doc = await window.db.collection('brandSettings').doc(legacyDocId).get();
                savedImage = doc.exists ? doc.data().profileImage : null;
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

        // Firebase Auth 사용자: UID 기반 문서 ID (applyProfileImage와 동일)
        const docId = userInfo.id || `${userInfo.name}_${userInfo.phone}`;
        console.log('📷 프로필 이미지 저장:', docId);
        await window.db.collection('brandSettings').doc(docId).set({
            profileImage: imageData,
            updatedAt: Date.now()
        }, { merge: true });

        console.log('📷 Firebase 프로필 이미지 저장 완료');
    } catch (e) {
        console.error('📷 Firebase 프로필 저장 실패:', e);
    }
}

// 프로필 이미지 적용 (카카오/구글 photoURL 우선, Firebase brandSettings 폴백)
async function applyProfileImage() {
    const profileImage = document.getElementById('profileImage');
    if (!profileImage) return;

    // 기본값: 👤 아이콘
    profileImage.innerHTML = `<span id="profileInitial">👤</span>`;

    try {
        let imageUrl = null;

        // 1차: 카카오/구글 로그인 시 받은 photoURL 사용 (window.currentDesigner)
        if (window.currentDesigner?.photoURL) {
            // HTTP → HTTPS 변환 (Mixed Content 방지)
            imageUrl = window.currentDesigner.photoURL.replace(/^http:\/\//i, 'https://');
            console.log('👤 소셜 로그인 프로필 이미지 사용');
        }

        // 2차: localStorage 캐시에서 확인 (언어 변경 시 window.currentDesigner가 없을 수 있음)
        if (!imageUrl) {
            try {
                const cachedUser = JSON.parse(localStorage.getItem('firebase_user') || '{}');
                if (cachedUser.photoURL) {
                    imageUrl = cachedUser.photoURL.replace(/^http:\/\//i, 'https://');
                    console.log('👤 localStorage 캐시 프로필 이미지 사용');
                }
            } catch (_e) { /* ignore parse errors */ }
        }

        // 3차: Firebase brandSettings에서 커스텀 프로필 이미지 확인
        if (!imageUrl && window.db) {
            const userInfo = getUserInfo();
            if (userInfo?.id) {
                const doc = await window.db.collection('brandSettings').doc(userInfo.id).get();
                if (doc.exists && doc.data().profileImage) {
                    imageUrl = doc.data().profileImage;
                    console.log('👤 Firebase 커스텀 프로필 이미지 사용');
                }
            }
        }

        if (imageUrl) {
            profileImage.innerHTML = `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            console.log('👤 프로필 이미지 없음 (기본 아이콘 사용)');
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

// ========== 마이페이지 아코디언 (하나만 열리도록) ==========

/**
 * 마이페이지 모든 토글 섹션 닫기
 */
function closeAllMypageSections(exceptSectionId = null) {
    const sections = [
        { section: 'savedCardsSection', arrow: 'savedCardsArrow' },
        { section: 'mypageNoticeSection', arrow: 'noticeArrow' },
        { section: 'inquirySection', arrow: 'inquiryArrow' },
        { section: 'paymentHistorySection', arrow: 'paymentHistoryArrow' }
    ];

    sections.forEach(({ section, arrow }) => {
        if (section === exceptSectionId) return;

        const sectionEl = document.getElementById(section);
        const arrowEl = document.getElementById(arrow);

        if (sectionEl) {
            sectionEl.style.display = 'none';
        }
        if (arrowEl) {
            arrowEl.textContent = '→';
        }
    });
}

// ========== 마이페이지 저장된 카드 관리 ==========

/**
 * 저장된 카드 섹션 토글
 */
window.toggleSavedCardsSection = async function() {
    const section = document.getElementById('savedCardsSection');
    const arrow = document.getElementById('savedCardsArrow');

    if (!section) return;

    if (section.style.display === 'none') {
        // 다른 섹션 모두 닫기
        closeAllMypageSections('savedCardsSection');
        section.style.display = 'block';
        arrow.textContent = '↓';
        await loadSavedCardsForMypage();
    } else {
        section.style.display = 'none';
        arrow.textContent = '→';
    }
};

/**
 * 마이페이지용 저장된 카드 로드
 */
async function loadSavedCardsForMypage() {
    const listEl = document.getElementById('savedCardsList');
    if (!listEl) return;

    // userId 가져오기 (여러 소스에서 시도)
    let userId = window.HAIRGATOR_PAYMENT?.getUserId?.();

    if (!userId && window.FirebaseBridge) {
        userId = window.FirebaseBridge.getUserDocId();
    }

    if (!userId && window.currentDesigner?.email) {
        userId = window.currentDesigner.email.replace(/[@.]/g, '_');
    }

    if (!userId) {
        listEl.innerHTML = `<div class="no-cards-message">${t('ui.loginRequired') || '로그인이 필요합니다.'}</div>`;
        return;
    }

    try {
        // 저장된 카드 조회
        const cards = await window.getSavedCards(userId);
        const defaultBillingKey = await window.getDefaultCard(userId);

        if (cards.length === 0) {
            listEl.innerHTML = '<div class="no-cards-message">저장된 카드가 없습니다.</div>';
            return;
        }

        // 카드 목록 렌더링
        listEl.innerHTML = cards.map(card => {
            const isDefault = card.billingKey === defaultBillingKey;
            return `
                <div class="saved-card-item">
                    <div class="card-icon">💳</div>
                    <div class="card-info">
                        <span class="card-name">${card.displayName || card.cardBrand + ' ****' + card.lastFour}</span>
                        ${isDefault ? '<span class="default-badge">기본</span>' : ''}
                    </div>
                    <button class="delete-card-btn" onclick="deleteCardFromMypage('${card.billingKey}')">삭제</button>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('카드 로드 오류:', error);
        listEl.innerHTML = '<div class="no-cards-message">카드 정보를 불러올 수 없습니다.</div>';
    }
}

/**
 * 새 카드 등록
 */
window.registerNewCard = async function() {
    // userId 가져오기 (여러 소스에서 시도)
    let userId = window.HAIRGATOR_PAYMENT?.getUserId?.();

    if (!userId && window.FirebaseBridge) {
        userId = window.FirebaseBridge.getUserDocId();
    }

    if (!userId && window.currentDesigner?.email) {
        userId = window.currentDesigner.email.replace(/[@.]/g, '_');
    }

    if (!userId) {
        alert(t('ui.loginRequired') || '로그인이 필요합니다.');
        return;
    }

    const userEmail = window.currentDesigner?.email || '';
    const userName = window.currentDesigner?.name || window.currentDesigner?.displayName || '';

    try {
        const result = await window.issueBillingKey(userId, userEmail, userName);

        if (result.cancelled) {
            return;
        }

        if (result.success) {
            alert('카드가 등록되었습니다!');
            await loadSavedCardsForMypage();
        }
    } catch (error) {
        alert(error.message || '카드 등록에 실패했습니다.');
    }
};

/**
 * 마이페이지에서 카드 삭제
 */
window.deleteCardFromMypage = async function(billingKey) {
    if (!confirm('이 카드를 삭제하시겠습니까?')) {
        return;
    }

    const userId = window.HAIRGATOR_PAYMENT?.getUserId?.();
    if (!userId) return;

    try {
        await window.deleteSavedCard(billingKey, userId);
        alert('카드가 삭제되었습니다.');
        await loadSavedCardsForMypage();
    } catch (error) {
        alert(error.message || '카드 삭제에 실패했습니다.');
    }
};

// ========== 1:1 문의 기능 ==========

/**
 * 문의 섹션 토글
 */
window.toggleInquirySection = async function() {
    const section = document.getElementById('inquirySection');
    const arrow = document.getElementById('inquiryArrow');

    if (section.style.display === 'none') {
        // 다른 섹션 모두 닫기
        closeAllMypageSections('inquirySection');
        section.style.display = 'block';
        arrow.textContent = '↓';
        // 페이지네이션 초기화
        window.inquiryCurrentPage = 1;
        await loadInquiries();
    } else {
        section.style.display = 'none';
        arrow.textContent = '→';
    }
};

// ========== 결제 내역 섹션 ==========

/**
 * 결제 내역 섹션 토글
 */
window.togglePaymentHistorySection = async function() {
    const section = document.getElementById('paymentHistorySection');
    const arrow = document.getElementById('paymentHistoryArrow');

    if (!section) return;

    if (section.style.display === 'none' || !section.style.display) {
        // 다른 섹션 모두 닫기
        closeAllMypageSections('paymentHistorySection');
        section.style.display = 'block';
        if (arrow) arrow.textContent = '↓';
        await loadPaymentHistory();
    } else {
        section.style.display = 'none';
        if (arrow) arrow.textContent = '→';
    }
};

/**
 * 결제 내역 로드
 */
async function loadPaymentHistory() {
    const listEl = document.getElementById('paymentHistoryList');
    if (!listEl) return;

    // 사용자 ID 가져오기 (FirebaseBridge 또는 currentDesigner에서)
    let userId = null;

    // 1. FirebaseBridge에서 시도
    if (window.FirebaseBridge && typeof window.FirebaseBridge.getUserDocId === 'function') {
        userId = await window.FirebaseBridge.getUserDocId();
    }

    // 2. currentDesigner에서 시도
    if (!userId && window.currentDesigner && window.currentDesigner.email) {
        userId = window.currentDesigner.email.replace(/[@.]/g, '_');
    }

    // 3. Firebase Auth에서 직접 시도
    if (!userId) {
        const user = firebase.auth().currentUser;
        if (user && user.email) {
            userId = user.email.replace(/[@.]/g, '_');
        }
    }

    if (!userId) {
        listEl.innerHTML = `<div class="no-payment-message">${t('ui.loginRequired') || '로그인이 필요합니다.'}</div>`;
        return;
    }

    listEl.innerHTML = `<div class="loading-message">${t('ui.loading') || '로딩 중...'}</div>`;

    try {

        // Firestore에서 결제 내역 조회 (인덱스 없이 작동하도록 orderBy 제거 후 클라이언트 정렬)
        const snapshot = await firebase.firestore()
            .collection('payments')
            .where('userId', '==', userId)
            .limit(50)
            .get();

        if (snapshot.empty) {
            listEl.innerHTML = `<div class="no-payment-message">${t('ui.noPaymentHistory') || '결제 내역이 없습니다.'}</div>`;
            return;
        }

        // 요금제명 매핑
        const planNames = {
            basic: t('ui.planBasic') || '베이직',
            pro: t('ui.planPro') || '프로',
            business: t('ui.planBusiness') || '비즈니스',
            tokens_5000: t('ui.tokensAdditional') || '추가 토큰'
        };

        // 상태명 매핑
        const statusNames = {
            completed: t('ui.paymentCompleted') || '결제 완료',
            cancelled: t('ui.paymentCancelled') || '결제 취소',
            refunded: t('ui.paymentRefunded') || '환불 완료'
        };

        let html = '';

        // 클라이언트 측 정렬 (최신순)
        const docs = snapshot.docs.sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis?.() || 0;
            const bTime = b.data().createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        });

        docs.forEach(doc => {
            const data = doc.data();
            const paymentId = data.paymentId || doc.id;
            const planKey = data.planKey || 'unknown';
            const planName = planNames[planKey] || planKey;
            const amount = data.amount || 0;
            const tokens = data.tokens || 0;
            const status = data.status || 'completed';
            const statusName = statusNames[status] || status;
            const statusClass = `payment-status-${status}`;

            // 날짜 포맷
            let dateStr = '-';
            if (data.createdAt) {
                const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                dateStr = date.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }) + ' ' + date.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            // 취소/환불된 결제는 영수증 볼 수 없음
            const isCancelled = status === 'cancelled' || status === 'refunded';
            const receiptText = isCancelled
                ? (t('ui.receiptNotAvailable') || '취소된 결제')
                : (t('ui.viewReceipt') || '영수증 보기');
            const receiptClass = isCancelled ? 'payment-item-receipt disabled' : 'payment-item-receipt';
            const onClickAttr = isCancelled ? '' : `onclick="openPaymentReceipt('${paymentId}')"`;

            html += `
                <div class="payment-history-item" ${onClickAttr}>
                    <div class="payment-item-left">
                        <div class="payment-item-plan">${planName}</div>
                        <div class="payment-item-date">${dateStr}</div>
                        <span class="payment-status-badge ${statusClass}">${statusName}</span>
                    </div>
                    <div class="payment-item-right">
                        <div class="payment-item-amount">${amount.toLocaleString()}${t('ui.currencyWon') || '원'}</div>
                        <div class="payment-item-tokens">+${tokens.toLocaleString()} ${t('ui.tokens') || '토큰'}</div>
                        <span class="${receiptClass}">${receiptText}</span>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;

    } catch (error) {
        console.error('결제 내역 로드 실패:', error);
        listEl.innerHTML = `<div class="no-payment-message">${t('ui.loadError') || '로딩 중 오류가 발생했습니다.'}</div>`;
    }
}

/**
 * 포트원 영수증 열기
 */
window.openPaymentReceipt = function(paymentId) {
    const receiptUrl = `https://service.portone.io/receipt/${paymentId}`;
    window.open(receiptUrl, '_blank');
};

// 문의 페이지네이션 설정
const INQUIRY_PAGE_SIZE = 10;
window.inquiryCurrentPage = 1;
window.inquiryAllDocs = [];

/**
 * 문의 목록 로드 (페이지네이션 지원)
 */
async function loadInquiries() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const listEl = document.getElementById('inquiryList');
    listEl.innerHTML = '<div class="loading-text" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">로딩 중...</div>';

    try {
        // 전체 문의 조회 (캐시가 없거나 새로고침 시)
        if (window.inquiryCurrentPage === 1 || window.inquiryAllDocs.length === 0) {
            const snapshot = await firebase.firestore()
                .collection('inquiries')
                .where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .limit(100)  // 최대 100개까지 조회
                .get();

            window.inquiryAllDocs = snapshot.docs;
        }

        if (window.inquiryAllDocs.length === 0) {
            listEl.innerHTML = '<div class="no-inquiry-message">문의 내역이 없습니다.</div>';
            return;
        }

        // 페이지네이션 계산
        const totalPages = Math.ceil(window.inquiryAllDocs.length / INQUIRY_PAGE_SIZE);
        const startIdx = (window.inquiryCurrentPage - 1) * INQUIRY_PAGE_SIZE;
        const endIdx = startIdx + INQUIRY_PAGE_SIZE;
        const pageDocs = window.inquiryAllDocs.slice(startIdx, endIdx);

        let hasNewReply = false;
        let html = '';

        pageDocs.forEach(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date();
            const dateStr = createdAt.toLocaleDateString('ko-KR');

            // 상태 결정
            let statusClass = 'pending';
            let statusText = '답변 대기';

            if (data.status === 'answered') {
                if (!data.userRead) {
                    statusClass = 'new-reply';
                    statusText = '새 답변';
                    hasNewReply = true;
                } else {
                    statusClass = 'answered';
                    statusText = '답변 완료';
                }
            }

            html += `
                <div class="inquiry-item" onclick="openInquiryDetail('${doc.id}')">
                    <div class="inquiry-item-left">
                        <div class="inquiry-subject">${escapeHtml(data.subject)}</div>
                        <div class="inquiry-date">${dateStr}</div>
                    </div>
                    <span class="inquiry-status ${statusClass}">${statusText}</span>
                </div>
            `;
        });

        // 페이지네이션 컨트롤 추가
        if (totalPages > 1) {
            html += renderPaginationControls('inquiry', window.inquiryCurrentPage, totalPages);
        }

        listEl.innerHTML = html;

        // NEW 뱃지 업데이트
        const badge = document.getElementById('inquiryNewBadge');
        if (badge) {
            badge.style.display = hasNewReply ? 'inline' : 'none';
        }

    } catch (error) {
        console.error('문의 목록 로드 실패:', error);
        listEl.innerHTML = '<div class="no-inquiry-message">로드 실패</div>';
    }
}

/**
 * 문의 페이지 변경
 */
window.changeInquiryPage = function(page) {
    window.inquiryCurrentPage = page;
    loadInquiries();
    // 스크롤 위치 조정
    const section = document.getElementById('inquirySection');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/**
 * 페이지네이션 컨트롤 렌더링
 */
function renderPaginationControls(type, currentPage, totalPages) {
    let html = `<div class="pagination-controls">`;

    // 이전 버튼
    if (currentPage > 1) {
        html += `<button class="page-btn" onclick="change${type.charAt(0).toUpperCase() + type.slice(1)}Page(${currentPage - 1})">◀</button>`;
    } else {
        html += `<button class="page-btn disabled" disabled>◀</button>`;
    }

    // 페이지 번호 (최대 5개 표시)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `<button class="page-btn active">${i}</button>`;
        } else {
            html += `<button class="page-btn" onclick="change${type.charAt(0).toUpperCase() + type.slice(1)}Page(${i})">${i}</button>`;
        }
    }

    // 다음 버튼
    if (currentPage < totalPages) {
        html += `<button class="page-btn" onclick="change${type.charAt(0).toUpperCase() + type.slice(1)}Page(${currentPage + 1})">▶</button>`;
    } else {
        html += `<button class="page-btn disabled" disabled>▶</button>`;
    }

    html += `</div>`;
    return html;
}

/**
 * 새 문의 모달 열기
 */
window.openNewInquiryModal = function() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert(t('ui.loginRequired') || '로그인이 필요합니다.');
        return;
    }
    document.getElementById('inquirySubject').value = '';
    document.getElementById('inquiryMessage').value = '';
    // 이미지 초기화
    clearInquiryImage();
    document.getElementById('newInquiryModal').style.display = 'flex';
};

/**
 * 새 문의 모달 닫기
 */
window.closeNewInquiryModal = function() {
    document.getElementById('newInquiryModal').style.display = 'none';
    clearInquiryImage();
};

/**
 * 문의 이미지 미리보기
 */
window.previewInquiryImage = function(input) {
    const preview = document.getElementById('inquiryImagePreview');
    const previewImg = document.getElementById('inquiryImagePreviewImg');

    if (input.files && input.files[0]) {
        const file = input.files[0];

        // 파일 크기 체크 (5MB 제한)
        if (file.size > 5 * 1024 * 1024) {
            alert(t('ui.fileTooLarge') || '파일 크기는 5MB 이하여야 합니다.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
};

/**
 * 문의 이미지 제거
 */
window.clearInquiryImage = function() {
    const input = document.getElementById('inquiryImage');
    const preview = document.getElementById('inquiryImagePreview');
    const previewImg = document.getElementById('inquiryImagePreviewImg');

    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
    if (previewImg) previewImg.src = '';
};

/**
 * 문의 이미지 Firebase Storage 업로드
 */
async function uploadInquiryImage(file, userId) {
    const storageRef = firebase.storage().ref();
    const fileName = `inquiries/${userId}/${Date.now()}_${file.name}`;
    const fileRef = storageRef.child(fileName);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
}

/**
 * 문의 제출
 */
window.submitInquiry = async function() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert(t('ui.loginRequired') || '로그인이 필요합니다.');
        return;
    }

    const subject = document.getElementById('inquirySubject').value.trim();
    const message = document.getElementById('inquiryMessage').value.trim();
    const imageInput = document.getElementById('inquiryImage');

    if (!subject) {
        alert(t('ui.enterSubject') || '제목을 입력해주세요.');
        return;
    }
    if (!message) {
        alert(t('ui.enterMessage') || '내용을 입력해주세요.');
        return;
    }

    try {
        // 제출 버튼 비활성화 (중복 제출 방지)
        const submitBtn = document.querySelector('.inquiry-modal-footer .btn-submit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = t('ui.submitting') || '제출 중...';
        }

        // 이미지 업로드 (있는 경우)
        let imageUrl = null;
        if (imageInput && imageInput.files && imageInput.files[0]) {
            imageUrl = await uploadInquiryImage(imageInput.files[0], user.uid);
        }

        // 사용자 정보 가져오기 (이메일 기반 문서 ID 우선)
        const emailDocId = user.email ? user.email.toLowerCase().replace(/@/g, '_').replace(/\./g, '_') : null;
        const docId = window.currentDesigner?.id || emailDocId || user.uid;
        const userDoc = await firebase.firestore().collection('users').doc(docId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        const inquiryData = {
            userId: user.uid,
            userEmail: user.email || '',
            userName: userData.verifiedName || userData.name || userData.displayName || user.displayName || '',
            userPhone: userData.verifiedPhone || userData.phone || '',
            subject: subject,
            message: message,
            status: 'pending',  // pending, answered, closed
            adminRead: false,   // 관리자가 읽었는지
            userRead: true,     // 사용자가 읽었는지 (답변 후)
            replies: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 이미지 URL 추가 (있는 경우)
        if (imageUrl) {
            inquiryData.imageUrl = imageUrl;
        }

        await firebase.firestore().collection('inquiries').add(inquiryData);

        alert(t('ui.inquirySubmitted') || '문의가 접수되었습니다.');
        closeNewInquiryModal();
        await loadInquiries();

    } catch (error) {
        console.error('문의 제출 실패:', error);
        alert(t('ui.inquirySubmitFailed') || '문의 제출에 실패했습니다.');
    } finally {
        // 버튼 복원
        const submitBtn = document.querySelector('.inquiry-modal-footer .btn-submit');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = t('ui.submitInquiry') || '문의 보내기';
        }
    }
};

/**
 * 문의 상세 보기
 */
window.openInquiryDetail = async function(inquiryId) {
    try {
        const doc = await firebase.firestore().collection('inquiries').doc(inquiryId).get();
        if (!doc.exists) {
            alert('문의를 찾을 수 없습니다.');
            return;
        }

        const data = doc.data();

        // userRead를 true로 업데이트 (새 답변 읽음 처리)
        if (!data.userRead) {
            await firebase.firestore().collection('inquiries').doc(inquiryId).update({
                userRead: true
            });
            // NEW 뱃지 업데이트
            await loadInquiries();
        }

        // 메시지 HTML 구성
        const createdAt = data.createdAt?.toDate?.() || new Date();

        // 이미지 HTML (있는 경우)
        const imageHtml = data.imageUrl
            ? `<div class="inquiry-image" style="margin-top: 8px;"><img src="${data.imageUrl}" alt="첨부 이미지" style="max-width: 100%; border-radius: 8px; cursor: pointer;" onclick="window.open('${data.imageUrl}', '_blank')"></div>`
            : '';

        let messagesHtml = `
            <div class="inquiry-message user">
                <div class="message-content">${escapeHtml(data.message)}</div>
                ${imageHtml}
                <div class="message-time">${createdAt.toLocaleString('ko-KR')}</div>
            </div>
        `;

        // 답변들 표시
        if (data.replies && data.replies.length > 0) {
            data.replies.forEach(reply => {
                const replyTime = reply.createdAt?.toDate?.() || new Date();
                const isAdmin = reply.from === 'admin';
                messagesHtml += `
                    <div class="inquiry-message ${isAdmin ? 'admin' : 'user'}">
                        <div class="message-content">${escapeHtml(reply.message)}</div>
                        <div class="message-time">${isAdmin ? '관리자 · ' : ''}${replyTime.toLocaleString('ko-KR')}</div>
                    </div>
                `;
            });
        }

        document.getElementById('inquiryDetailTitle').textContent = data.subject;
        document.getElementById('inquiryDetailContent').innerHTML = `
            <div class="inquiry-messages">${messagesHtml}</div>
        `;

        document.getElementById('inquiryDetailModal').style.display = 'flex';

    } catch (error) {
        console.error('문의 상세 로드 실패:', error);
        alert('문의를 불러오는데 실패했습니다.');
    }
};

/**
 * 문의 상세 모달 닫기
 */
window.closeInquiryDetailModal = function() {
    document.getElementById('inquiryDetailModal').style.display = 'none';
};

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 새 답변 알림 체크 (마이페이지 진입 시)
 */
async function checkNewInquiryReplies() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
        const snapshot = await firebase.firestore()
            .collection('inquiries')
            .where('userId', '==', user.uid)
            .where('status', '==', 'answered')
            .where('userRead', '==', false)
            .limit(1)
            .get();

        const badge = document.getElementById('inquiryNewBadge');
        if (badge) {
            badge.style.display = snapshot.empty ? 'none' : 'inline';
        }
    } catch (error) {
        console.error('새 답변 체크 실패:', error);
    }
}

// 마이페이지 로드 시 새 답변 체크
document.addEventListener('DOMContentLoaded', () => {
    // 해시 변경 시 마이페이지면 체크
    window.addEventListener('hashchange', () => {
        if (window.location.hash === '#mypage') {
            setTimeout(checkNewInquiryReplies, 500);
        }
    });
});

// ========== 상품 페이지 현재 플랜 표시 ==========
async function updateProductsPagePlan() {
    try {
        // 현재 플랜 가져오기
        let currentPlan = 'free';
        
        if (typeof window.FirebaseBridge !== 'undefined') {
            const tokenData = await window.FirebaseBridge.getTokenBalance();
            if (tokenData && tokenData.plan) {
                currentPlan = tokenData.plan;
            }
        }
        
        console.log('📋 현재 플랜:', currentPlan);
        
        // 모든 카드 리셋
        const allCards = document.querySelectorAll('.plan-card[data-plan]');
        allCards.forEach(card => {
            const badge = card.querySelector('.plan-badge-current');
            const btn = card.querySelector('.plan-btn');
            const plan = card.getAttribute('data-plan');
            
            if (badge) badge.style.display = 'none';
            
            if (btn) {
                if (plan === currentPlan) {
                    // 현재 플랜 카드
                    if (badge) badge.style.display = 'block';
                    btn.className = 'plan-btn plan-btn-disabled';
                    btn.disabled = true;
                    btn.textContent = '현재 플랜';
                    btn.onclick = null;
                } else {
                    // 다른 플랜 카드
                    btn.className = 'plan-btn plan-btn-primary';
                    btn.disabled = false;
                    btn.textContent = '선택하기';
                    btn.onclick = () => selectPlanAndPay(plan);
                }
            }
        });
        
    } catch (e) {
        console.error('플랜 정보 로드 실패:', e);
    }
}

// 전역 함수로 노출
window.updateProductsPagePlan = updateProductsPagePlan;

// ========== 공지사항 시스템 ==========

// 공지사항 모달 열기
async function openNoticeModal() {
    const overlay = document.getElementById('noticeModalOverlay');
    if (overlay) {
        overlay.classList.add('show');
        await loadUserNotices();
    }
}

// 공지사항 모달 닫기
function closeNoticeModal(event) {
    // event가 있고 target이 overlay가 아니면 무시 (버블링 방지)
    if (event && event.target && !event.target.classList.contains('notice-modal-overlay')) {
        return;
    }
    const overlay = document.getElementById('noticeModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// 현재 언어 가져오기
function getNoticeLanguage() {
    return localStorage.getItem('hairgator_language') || window.currentLanguage || 'ko';
}

// 언어별 공지 필드 가져오기
function getLocalizedNotice(notice, lang) {
    const title = notice[`title_${lang}`] || notice.title_ko || notice.title || '';
    const content = notice[`content_${lang}`] || notice.content_ko || notice.content || '';
    return { title, content };
}

// 공지사항 목록 로드
async function loadUserNotices() {
    const body = document.getElementById('noticeModalBody');
    if (!body) return;

    body.innerHTML = '<div class="notice-loading">로딩 중...</div>';

    try {
        if (!firebase || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        // 단순 쿼리 (인덱스 불필요) + 클라이언트 필터/정렬
        const snapshot = await firebase.firestore()
            .collection('notices')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        // 클라이언트에서 isActive 필터 + isPinned 정렬
        const activeDocs = snapshot.docs
            .filter(doc => doc.data().isActive === true)
            .sort((a, b) => {
                const aData = a.data();
                const bData = b.data();
                if (aData.isPinned && !bData.isPinned) return -1;
                if (!aData.isPinned && bData.isPinned) return 1;
                return 0;
            })
            .slice(0, 20);

        if (activeDocs.length === 0) {
            body.innerHTML = `<div class="notice-empty">${t('ui.noticeEmpty') || 'No notices available.'}</div>`;
            return;
        }

        // 현재 언어
        const lang = getNoticeLanguage();

        // 읽은 공지 ID 목록 가져오기
        const readNotices = getReadNotices();

        let html = '<div class="notice-list">';
        activeDocs.forEach(doc => {
            const notice = doc.data();
            const noticeId = doc.id;
            const isRead = readNotices.includes(noticeId);
            const isNew = !isRead;

            // 언어별 제목/내용
            const localized = getLocalizedNotice(notice, lang);

            // 날짜 포맷
            let dateStr = '';
            if (notice.createdAt) {
                const date = notice.createdAt.toDate ? notice.createdAt.toDate() : new Date(notice.createdAt);
                dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
            }

            // 미리보기 텍스트 (100자 제한)
            const preview = localized.content.replace(/<[^>]*>/g, '').substring(0, 100);

            const hasImage = notice.imageUrl ? '<span class="notice-item-image">🖼️</span>' : '';

            html += `
                <div class="notice-item ${isNew ? 'new' : ''}" onclick="showNoticeDetail('${noticeId}')">
                    <div class="notice-item-header">
                        <span class="notice-item-title">
                            ${notice.isPinned ? '<span class="notice-item-pinned">📌</span>' : ''}
                            ${hasImage}
                            ${localized.title || '제목 없음'}
                        </span>
                        ${isNew ? '<span class="notice-item-new">NEW</span>' : ''}
                    </div>
                    <div class="notice-item-preview">${preview}${preview.length >= 100 ? '...' : ''}</div>
                    <div class="notice-item-date">${dateStr}</div>
                </div>
            `;
        });
        html += '</div>';

        body.innerHTML = html;

    } catch (error) {
        console.error('Notice load failed:', error);
        body.innerHTML = `<div class="notice-empty">${t('ui.noticeLoadFailed') || 'Failed to load notices.'}</div>`;
    }
}

// 공지사항 상세 보기
async function showNoticeDetail(noticeId) {
    const body = document.getElementById('noticeModalBody');
    if (!body) return;

    try {
        const doc = await firebase.firestore().collection('notices').doc(noticeId).get();
        if (!doc.exists) {
            alert(t('ui.noticeNotFound') || 'Notice not found.');
            return;
        }

        const notice = doc.data();

        // 읽음 처리
        markNoticeAsRead(noticeId);

        // 언어별 제목/내용
        const lang = getNoticeLanguage();
        const localized = getLocalizedNotice(notice, lang);

        // 날짜 포맷
        let dateStr = '';
        if (notice.createdAt) {
            const date = notice.createdAt.toDate ? notice.createdAt.toDate() : new Date(notice.createdAt);
            dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        }

        // 이미지 HTML
        const imageHtml = notice.imageUrl
            ? `<div class="notice-detail-image"><img src="${notice.imageUrl}" alt="Notice image" style="max-width: 100%; border-radius: 8px; margin-bottom: 16px;"></div>`
            : '';

        const backText = t('ui.backToList') || '← Back to list';
        const noTitleText = t('ui.noTitle') || 'No title';

        body.innerHTML = `
            <div class="notice-detail">
                <button class="notice-detail-back" onclick="loadUserNotices()">${backText}</button>
                <h2 class="notice-detail-title">${localized.title || noTitleText}</h2>
                <div class="notice-detail-date">${dateStr}</div>
                ${imageHtml}
                <div class="notice-detail-content">${localized.content || ''}</div>
            </div>
        `;

        // 뱃지 업데이트
        checkNewNotices();

    } catch (error) {
        console.error('Notice detail load failed:', error);
        alert(t('ui.noticeLoadFailed') || 'Failed to load notice.');
    }
}

// 새 공지사항 확인 및 뱃지 업데이트
async function checkNewNotices() {
    const badge = document.getElementById('noticeBadge');
    if (!badge) return;

    try {
        if (!firebase || !firebase.firestore) return;

        // 단순 쿼리 + 클라이언트 필터
        const snapshot = await firebase.firestore()
            .collection('notices')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        // 클라이언트에서 isActive 필터
        const activeDocs = snapshot.docs.filter(doc => doc.data().isActive === true);

        if (activeDocs.length === 0) {
            badge.style.display = 'none';
            return;
        }

        // 읽은 공지 ID 목록
        const readNotices = getReadNotices();

        // 읽지 않은 공지 개수 계산
        let unreadCount = 0;
        activeDocs.forEach(doc => {
            if (!readNotices.includes(doc.id)) {
                unreadCount++;
            }
        });

        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }

    } catch (error) {
        console.error('새 공지 확인 실패:', error);
        badge.style.display = 'none';
    }
}

// 읽은 공지 ID 목록 가져오기
function getReadNotices() {
    try {
        const stored = localStorage.getItem('hairgator_read_notices');
        return stored ? JSON.parse(stored) : [];
    } catch (_e) {
        return [];
    }
}

// 공지 읽음 표시
function markNoticeAsRead(noticeId) {
    try {
        const readNotices = getReadNotices();
        if (!readNotices.includes(noticeId)) {
            readNotices.push(noticeId);
            // 최대 100개까지만 저장 (오래된 것 삭제)
            if (readNotices.length > 100) {
                readNotices.splice(0, readNotices.length - 100);
            }
            localStorage.setItem('hairgator_read_notices', JSON.stringify(readNotices));
        }
    } catch (e) {
        console.error('읽음 표시 저장 실패:', e);
    }
}

// 마이페이지 공지사항 섹션 토글
function toggleNoticeSection() {
    const section = document.getElementById('mypageNoticeSection');
    const arrow = document.getElementById('noticeArrow');

    if (!section) return;

    if (section.style.display === 'none' || !section.style.display) {
        // 다른 섹션 모두 닫기
        closeAllMypageSections('mypageNoticeSection');
        section.style.display = 'block';
        if (arrow) arrow.textContent = '↓';
        // 페이지네이션 초기화
        window.noticeCurrentPage = 1;
        loadMypageNotices();
    } else {
        section.style.display = 'none';
        if (arrow) arrow.textContent = '→';
    }
}

// 공지사항 페이지네이션 설정
const NOTICE_PAGE_SIZE = 10;
window.noticeCurrentPage = 1;
window.noticeAllDocs = [];

// 마이페이지 공지사항 목록 로드 (페이지네이션 지원)
async function loadMypageNotices() {
    const listEl = document.getElementById('mypageNoticeList');
    if (!listEl) return;

    listEl.innerHTML = '<div class="notice-loading">로딩 중...</div>';

    try {
        if (!firebase || !firebase.firestore) {
            throw new Error('Firebase not initialized');
        }

        // 전체 공지 조회 (첫 페이지거나 캐시 없을 때)
        if (window.noticeCurrentPage === 1 || window.noticeAllDocs.length === 0) {
            const snapshot = await firebase.firestore()
                .collection('notices')
                .orderBy('createdAt', 'desc')
                .limit(100)  // 최대 100개까지 조회
                .get();

            // 클라이언트에서 isActive 필터 + isPinned 정렬
            window.noticeAllDocs = snapshot.docs
                .filter(doc => doc.data().isActive === true)
                .sort((a, b) => {
                    const aData = a.data();
                    const bData = b.data();
                    if (aData.isPinned && !bData.isPinned) return -1;
                    if (!aData.isPinned && bData.isPinned) return 1;
                    return 0;
                });
        }

        if (window.noticeAllDocs.length === 0) {
            listEl.innerHTML = `<div class="no-notice-message">${t('ui.noNotices') || 'No notices.'}</div>`;
            return;
        }

        // 페이지네이션 계산
        const totalPages = Math.ceil(window.noticeAllDocs.length / NOTICE_PAGE_SIZE);
        const startIdx = (window.noticeCurrentPage - 1) * NOTICE_PAGE_SIZE;
        const endIdx = startIdx + NOTICE_PAGE_SIZE;
        const pageDocs = window.noticeAllDocs.slice(startIdx, endIdx);

        // 현재 언어
        const lang = getNoticeLanguage();
        const readNotices = getReadNotices();
        const noTitleText = t('ui.noTitle') || 'No title';

        let html = '';
        pageDocs.forEach(doc => {
            const notice = doc.data();
            const noticeId = doc.id;
            const isRead = readNotices.includes(noticeId);
            const isNew = !isRead;

            // 언어별 제목
            const localized = getLocalizedNotice(notice, lang);

            let dateStr = '';
            if (notice.createdAt) {
                const date = notice.createdAt.toDate ? notice.createdAt.toDate() : new Date(notice.createdAt);
                dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
            }

            const hasImage = notice.imageUrl ? '🖼️ ' : '';

            html += `
                <div class="mypage-notice-item ${isNew ? 'new' : ''}" onclick="openNoticeFromMypage('${noticeId}')">
                    <div class="mypage-notice-title">
                        ${notice.isPinned ? '<span class="notice-pin">📌</span>' : ''}
                        ${hasImage}${localized.title || noTitleText}
                        ${isNew ? '<span class="notice-new-tag">NEW</span>' : ''}
                    </div>
                    <div class="mypage-notice-date">${dateStr}</div>
                </div>
            `;
        });

        // 페이지네이션 컨트롤 추가
        if (totalPages > 1) {
            html += renderPaginationControls('notice', window.noticeCurrentPage, totalPages);
        }

        listEl.innerHTML = html;

    } catch (error) {
        console.error('Mypage notice load failed:', error);
        listEl.innerHTML = `<div class="no-notice-message">${t('ui.noticeLoadFailed') || 'Failed to load notices.'}</div>`;
    }
}

/**
 * 공지사항 페이지 변경
 */
window.changeNoticePage = function(page) {
    window.noticeCurrentPage = page;
    loadMypageNotices();
    // 스크롤 위치 조정
    const section = document.getElementById('mypageNoticeSection');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// 종 버튼 클릭 시 마이페이지 공지사항으로 이동
function goToNotices() {
    // 마이페이지로 이동
    window.location.hash = 'mypage';

    // 공지사항 섹션 자동 열기
    setTimeout(() => {
        const section = document.getElementById('mypageNoticeSection');
        const arrow = document.getElementById('noticeArrow');
        if (section && section.style.display === 'none') {
            section.style.display = 'block';
            if (arrow) arrow.textContent = '↓';
            loadMypageNotices();
        }
    }, 300);
}

// 마이페이지에서 공지 클릭 시 상세 보기
function openNoticeFromMypage(noticeId) {
    showNoticeDetailInline(noticeId);
}

// 마이페이지 내 공지 상세 인라인 표시
async function showNoticeDetailInline(noticeId) {
    const listEl = document.getElementById('mypageNoticeList');
    if (!listEl) return;

    try {
        const doc = await firebase.firestore().collection('notices').doc(noticeId).get();
        if (!doc.exists) {
            alert(t('ui.noticeNotFound') || 'Notice not found.');
            return;
        }

        const notice = doc.data();

        // 읽음 처리
        markNoticeAsRead(noticeId);

        // 언어별 제목/내용
        const lang = getNoticeLanguage();
        const localized = getLocalizedNotice(notice, lang);

        // 날짜 포맷
        let dateStr = '';
        if (notice.createdAt) {
            const date = notice.createdAt.toDate ? notice.createdAt.toDate() : new Date(notice.createdAt);
            dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
        }

        // 이미지 HTML
        const imageHtml = notice.imageUrl
            ? `<img src="${notice.imageUrl}" alt="Notice image" style="max-width: 100%; border-radius: 8px; margin: 12px 0;">`
            : '';

        const backText = t('ui.backToList') || '← Back to list';
        const noTitleText = t('ui.noTitle') || 'No title';

        listEl.innerHTML = `
            <div class="notice-detail-inline">
                <button onclick="loadMypageNotices()" style="background: none; border: none; color: var(--primary-color, #E91E63); cursor: pointer; padding: 0 0 12px 0; font-size: 14px;">${backText}</button>
                <h3 style="margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary);">${localized.title || noTitleText}</h3>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">${dateStr}</div>
                ${imageHtml}
                <div style="font-size: 14px; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap;">${localized.content || ''}</div>
            </div>
        `;

        // 뱃지 업데이트
        checkNewNotices();
        updateMypageNoticeBadge();

    } catch (error) {
        console.error('Notice detail load failed:', error);
        alert(t('ui.noticeLoadFailed') || 'Failed to load notice.');
    }
}

// 마이페이지 새 공지 뱃지 업데이트
async function updateMypageNoticeBadge() {
    const badge = document.getElementById('mypageNoticeBadge');
    if (!badge) return;

    try {
        if (!firebase || !firebase.firestore) return;

        // 단순 쿼리 + 클라이언트 필터
        const snapshot = await firebase.firestore()
            .collection('notices')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        // 클라이언트에서 isActive 필터
        const activeDocs = snapshot.docs.filter(doc => doc.data().isActive === true);

        if (activeDocs.length === 0) {
            badge.style.display = 'none';
            return;
        }

        const readNotices = getReadNotices();
        let hasUnread = false;

        activeDocs.forEach(doc => {
            if (!readNotices.includes(doc.id)) {
                hasUnread = true;
            }
        });

        badge.style.display = hasUnread ? 'inline' : 'none';

    } catch (_error) {
        badge.style.display = 'none';
    }
}

// 전역 함수로 노출
window.openNoticeModal = openNoticeModal;
window.closeNoticeModal = closeNoticeModal;
window.loadUserNotices = loadUserNotices;
window.showNoticeDetail = showNoticeDetail;
window.checkNewNotices = checkNewNotices;
window.toggleNoticeSection = toggleNoticeSection;
window.loadMypageNotices = loadMypageNotices;
window.openNoticeFromMypage = openNoticeFromMypage;
window.updateMypageNoticeBadge = updateMypageNoticeBadge;
window.goToNotices = goToNotices;
window.showNoticeDetailInline = showNoticeDetailInline;

// 페이지 로드 시 새 공지 확인
document.addEventListener('DOMContentLoaded', () => {
    // Firebase 로드 대기 후 체크
    setTimeout(() => {
        checkNewNotices();
        updateMypageNoticeBadge();
    }, 2000);
});

