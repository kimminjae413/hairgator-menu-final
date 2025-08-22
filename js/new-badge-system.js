// ========== NEW 뱃지 시스템 (4일간 표시) ==========
// Firebase createdAt 기준으로 자동 판단

(function() {
    'use strict';
    
    // ========== 전역 변수 ==========
    const NEW_DISPLAY_DAYS = 4; // 4일간 NEW 표시
    let isInitialized = false;
    
    // ========== NEW 뱃지 CSS 스타일 추가 ==========
    function addNewBadgeStyles() {
        if (document.getElementById('newBadgeStyles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'newBadgeStyles';
        style.innerHTML = `
            /* ========== NEW 뱃지 스타일 (미니멀 빨간 점) ========== */
            .new-badge {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 8px;
                height: 8px;
                background: #ff4444;
                border: 2px solid #fff;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(255, 68, 68, 0.4);
                animation: newPulse 2s ease-in-out infinite;
                z-index: 10;
            }
            
            /* 카테고리 탭용 NEW 뱃지 (작은 버전) */
            .new-badge-tab {
                position: absolute;
                top: 6px;
                right: 6px;
                width: 6px;
                height: 6px;
                background: #ff4444;
                border: 1px solid #fff;
                border-radius: 50%;
                box-shadow: 0 1px 4px rgba(255, 68, 68, 0.4);
                animation: newPulse 2s ease-in-out infinite;
                z-index: 10;
            }
            
            /* 펄스 애니메이션 */
            @keyframes newPulse {
                0%, 100% { 
                    opacity: 1; 
                    transform: scale(1); 
                }
                50% { 
                    opacity: 0.7; 
                    transform: scale(1.1); 
                }
            }
            
            /* 라이트 테마용 (검은 테두리) */
            body.light-theme .new-badge,
            body.light-theme .new-badge-tab {
                border-color: #000;
            }
            
            /* 스타일 카드에 relative 포지션 추가 */
            .style-card {
                position: relative;
            }
            
            /* 카테고리 탭에 relative 포지션 추가 */
            .category-tab {
                position: relative;
            }
        `;
        
        document.head.appendChild(style);
        console.log('✅ NEW 뱃지 스타일 추가됨');
    }
    
    // ========== 날짜 비교 함수 ==========
    function isWithinNewPeriod(createdAt) {
        if (!createdAt) return false;
        
        const now = new Date();
        const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        const diffTime = now - created;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        
        return diffDays <= NEW_DISPLAY_DAYS;
    }
    
    // ========== 스타일 카드에 NEW 뱃지 추가 ==========
    function addNewBadgeToStyleCard(styleElement, styleData) {
        if (!styleElement || !styleData.createdAt) return;
        
        // 이미 뱃지가 있으면 제거
        const existingBadge = styleElement.querySelector('.new-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // 4일 이내인지 확인
        if (isWithinNewPeriod(styleData.createdAt)) {
            const badge = document.createElement('div');
            badge.className = 'new-badge';
            badge.title = 'NEW! 새로 추가된 스타일';
            styleElement.appendChild(badge);
        }
    }
    
    // ========== 카테고리 탭에 NEW 뱃지 추가 ==========
    function addNewBadgeToCategoryTab(tabElement, categoryName, gender) {
        if (!tabElement || !categoryName || !gender) return;
        
        // 이미 뱃지가 있으면 제거
        const existingBadge = tabElement.querySelector('.new-badge-tab');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // 해당 카테고리에 새로운 스타일이 있는지 확인
        checkNewStylesInCategory(categoryName, gender).then(hasNewStyles => {
            if (hasNewStyles) {
                const badge = document.createElement('div');
                badge.className = 'new-badge-tab';
                badge.title = '새로운 스타일이 있습니다!';
                tabElement.appendChild(badge);
            }
        });
    }
    
    // ========== 카테고리 내 새 스타일 확인 ==========
    async function checkNewStylesInCategory(categoryName, gender) {
        try {
            if (typeof db === 'undefined') {
                console.warn('Firebase 연결 안됨 - NEW 뱃지 스킵');
                return false;
            }
            
            const fourDaysAgo = new Date();
            fourDaysAgo.setDate(fourDaysAgo.getDate() - NEW_DISPLAY_DAYS);
            
            const snapshot = await db.collection('hairstyles')
                .where('gender', '==', gender)
                .where('mainCategory', '==', categoryName)
                .where('createdAt', '>=', fourDaysAgo)
                .limit(1)
                .get();
            
            return !snapshot.empty;
            
        } catch (error) {
            console.error('카테고리 NEW 스타일 확인 오류:', error);
            return false;
        }
    }
    
    // ========== 기존 스타일 로드 함수 감시 및 확장 ==========
    function enhanceStyleLoading() {
        // 기존 loadStyles 함수를 확장
        const originalFetch = window.fetch;
        
        // 스타일 카드 생성 감시
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // 스타일 카드 확인
                        const styleCards = node.querySelectorAll ? 
                            node.querySelectorAll('.menu-item, .style-card') : 
                            (node.classList && (node.classList.contains('menu-item') || node.classList.contains('style-card')) ? [node] : []);
                        
                        styleCards.forEach(card => {
                            // 카드에서 스타일 정보 추출
                            const codeElement = card.querySelector('.style-code, [style*="font-size: 11px"]');
                            const nameElement = card.querySelector('.style-name, [style*="font-size: 13px"]');
                            
                            if (codeElement) {
                                const styleCode = codeElement.textContent.trim();
                                if (styleCode && styleCode !== 'NO CODE') {
                                    // Firebase에서 해당 스타일 데이터 가져와서 NEW 뱃지 확인
                                    checkAndAddNewBadgeByCode(card, styleCode);
                                }
                            }
                        });
                        
                        // 카테고리 탭 확인
                        const categoryTabs = node.querySelectorAll ? 
                            node.querySelectorAll('.category-tab:not(.help-tab)') : 
                            (node.classList && node.classList.contains('category-tab') && !node.classList.contains('help-tab') ? [node] : []);
                        
                        categoryTabs.forEach(tab => {
                            const categoryName = tab.textContent.trim();
                            const gender = getCurrentGender();
                            
                            if (categoryName && gender) {
                                addNewBadgeToCategoryTab(tab, categoryName, gender);
                            }
                        });
                    }
                });
            });
        });
        
        // DOM 변화 감시 시작
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('✅ 스타일 로딩 감시 시작');
    }
    
    // ========== 스타일 코드로 NEW 뱃지 확인 ==========
    async function checkAndAddNewBadgeByCode(styleElement, styleCode) {
        try {
            if (typeof db === 'undefined') return;
            
            const snapshot = await db.collection('hairstyles')
                .where('code', '==', styleCode)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const styleData = snapshot.docs[0].data();
                addNewBadgeToStyleCard(styleElement, styleData);
            }
            
        } catch (error) {
            console.error('스타일 코드 NEW 뱃지 확인 오류:', error);
        }
    }
    
    // ========== 현재 선택된 성별 가져오기 ==========
    function getCurrentGender() {
        // body 클래스에서 성별 확인
        if (document.body.classList.contains('gender-male')) {
            return 'male';
        } else if (document.body.classList.contains('gender-female')) {
            return 'female';
        }
        
        // 로컬스토리지에서 확인
        return localStorage.getItem('hairgator_gender') || null;
    }
    
    // ========== 초기화 ==========
    function initNewBadgeSystem() {
        if (isInitialized) return;
        
        console.log('🔴 NEW 뱃지 시스템 초기화 시작');
        
        // CSS 스타일 추가
        addNewBadgeStyles();
        
        // 스타일 로딩 감시
        enhanceStyleLoading();
        
        isInitialized = true;
        console.log('✅ NEW 뱃지 시스템 초기화 완료 (4일간 표시)');
    }
    
    // ========== 전역 함수 등록 ==========
    window.addNewBadgeToStyleCard = addNewBadgeToStyleCard;
    window.checkNewStylesInCategory = checkNewStylesInCategory;
    
    // ========== 초기화 실행 ==========
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNewBadgeSystem);
    } else {
        setTimeout(initNewBadgeSystem, 100);
    }
    
    window.addEventListener('load', () => {
        setTimeout(initNewBadgeSystem, 200);
    });
    
    console.log('🔴 NEW 뱃지 시스템 로드됨 (4일 자동 제거)');
    
})();
