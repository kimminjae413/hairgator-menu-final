// ========== HAIRGATOR 메뉴 시스템 - 헤어체험 연동 최종 버전 ==========
/* eslint-disable no-unused-vars */
// deductLookbookCreditFromMenu: 레거시 호환성을 위해 유지

// ⭐ 모달 슬라이딩용 전역 변수
let currentCategoryStyles = [];  // 현재 카테고리의 모든 스타일
let currentStyleIndex = 0;       // 현재 표시 중인 스타일 인덱스

// ⭐ 스타일 로딩 요청 버전 관리 (빠른 탭 전환 시 race condition 방지)
let styleLoadRequestVersion = 0;

// ⭐ 서브탭 로딩 요청 버전 관리 (빠른 탭 전환 시 race condition 방지)
let subTabLoadRequestVersion = 0;

// ⭐ 대분류 탭 선택 debounce (빠른 클릭 시 마지막 클릭만 처리)
let mainTabDebounceTimer = null;
let isMainTabLoading = false;

// ⭐ Android 소프트 키보드 대응 - 동적 뷰포트 높이 설정
(function() {
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', function() {
        setTimeout(setViewportHeight, 100);
    });
})();

// ⭐ Skeleton 로딩 애니메이션 CSS 주입 (스타일 카드 이미지 로딩 중 표시)
(function() {
    if (document.getElementById('skeleton-animation-style')) return;
    const style = document.createElement('style');
    style.id = 'skeleton-animation-style';
    style.textContent = `
        @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
    `;
    document.head.appendChild(style);
})();

// ⭐ Pull-to-Refresh 비활성화 (웹뷰용) - 스크롤 가능 영역 제외
(function() {
    let lastY = 0;
    document.addEventListener('touchstart', function(e) {
        lastY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        const currentY = e.touches[0].clientY;

        // 버튼/인터랙티브 요소는 항상 허용 (성별 선택 등)
        const interactiveEl = e.target.closest('button, a, input, select, .gender-btn, .gender-selection');
        if (interactiveEl) {
            return;  // 클릭 허용
        }

        // ⭐ 명시적 스크롤 컨테이너 체크 (우선 처리)
        const scrollableContainer = e.target.closest('.styles-container, .menu-items-container, .style-modal-content, .page-content');
        if (scrollableContainer) {
            // 스크롤 컨테이너 내부 - 맨 위에서 더 위로 당기는 경우만 막기
            const isAtTop = scrollableContainer.scrollTop <= 0;
            const isPullingDown = currentY > lastY;
            if (isAtTop && isPullingDown) {
                e.preventDefault();
            }
            lastY = currentY;
            return;
        }

        // 그 외 영역 - 가로 스크롤 체크
        let el = e.target;
        while (el && el !== document.body) {
            const style = window.getComputedStyle(el);
            const overflowX = style.overflowX;

            // 가로 스크롤 가능한 영역 (대분류 탭 등)
            if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) {
                return;  // 기본 동작 허용
            }
            el = el.parentElement;
        }

        // 페이지 최상단에서 아래로 당길 때만 막기
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop <= 0 && currentY > lastY) {
            e.preventDefault();
        }
        lastY = currentY;
    }, { passive: false });
})();

// ⭐ 안드로이드용 모멘텀 스크롤 (iOS처럼 부드럽게)
(function() {
    // 모멘텀 스크롤 설정
    const FRICTION = 0.95;      // 마찰 계수 (1에 가까울수록 오래 미끄러짐)
    const MIN_VELOCITY = 0.5;   // 최소 속도 (이하면 정지)
    const VELOCITY_SCALE = 0.8; // 속도 배율

    let activeScrollers = new WeakMap();

    function initMomentumScroll(container) {
        if (activeScrollers.has(container)) return;

        let state = {
            isTracking: false,
            startX: 0,
            startScrollLeft: 0,
            lastX: 0,
            lastTime: 0,
            velocity: 0,
            animationId: null
        };

        activeScrollers.set(container, state);

        container.addEventListener('touchstart', function(e) {
            if (state.animationId) {
                cancelAnimationFrame(state.animationId);
                state.animationId = null;
            }

            state.isTracking = true;
            state.startX = e.touches[0].clientX;
            state.startScrollLeft = container.scrollLeft;
            state.lastX = state.startX;
            state.lastTime = Date.now();
            state.velocity = 0;
        }, { passive: true });

        container.addEventListener('touchmove', function(e) {
            if (!state.isTracking) return;

            const currentX = e.touches[0].clientX;
            const currentTime = Date.now();
            const deltaTime = currentTime - state.lastTime;

            if (deltaTime > 0) {
                // 속도 계산 (픽셀/ms)
                state.velocity = (state.lastX - currentX) / deltaTime * VELOCITY_SCALE;
            }

            state.lastX = currentX;
            state.lastTime = currentTime;
        }, { passive: true });

        container.addEventListener('touchend', function(_e) {
            if (!state.isTracking) return;
            state.isTracking = false;

            // 속도가 충분하면 모멘텀 애니메이션 시작
            if (Math.abs(state.velocity) > MIN_VELOCITY) {
                animateMomentum(container, state);
            }
        }, { passive: true });
    }

    function animateMomentum(container, state) {
        state.velocity *= FRICTION;

        if (Math.abs(state.velocity) < MIN_VELOCITY) {
            state.animationId = null;
            return;
        }

        container.scrollLeft += state.velocity * 16; // 약 60fps 기준

        state.animationId = requestAnimationFrame(function() {
            animateMomentum(container, state);
        });
    }

    // 페이지 로드 후 탭 컨테이너에 적용
    function applyToContainers() {
        document.querySelectorAll('.main-tabs, .category-tabs').forEach(function(container) {
            initMomentumScroll(container);
        });
    }

    // DOM 준비되면 적용
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyToContainers);
    } else {
        applyToContainers();
    }

    // 동적으로 생성되는 탭도 처리
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && (node.classList.contains('main-tabs') || node.classList.contains('category-tabs'))) {
                        initMomentumScroll(node);
                    }
                    node.querySelectorAll && node.querySelectorAll('.main-tabs, .category-tabs').forEach(initMomentumScroll);
                }
            });
        });
    });

    // document.body가 준비된 후 observe 시작
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('✅ 안드로이드 모멘텀 스크롤 활성화');
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            observer.observe(document.body, { childList: true, subtree: true });
            console.log('✅ 안드로이드 모멘텀 스크롤 활성화 (DOMContentLoaded)');
        });
    }
})();

// ⭐ 스태거 애니메이션 keyframes 동적 추가
(function() {
    if (!document.getElementById('hairgator-card-animations')) {
        const style = document.createElement('style');
        style.id = 'hairgator-card-animations';
        style.textContent = `
            @keyframes cardFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
})();

/**
 * 스타일 데이터에서 썸네일 URL 반환
 * @param {object} style - 스타일 데이터 (thumbnailUrl, imageUrl 등 포함)
 * @returns {string} - 썸네일 URL (없으면 원본 imageUrl)
 */
function getThumbnailUrl(style) {
    let url = '';

    // thumbnailUrl이 있으면 우선 사용
    if (style.thumbnailUrl) {
        url = style.thumbnailUrl;
    } else {
        // 없으면 원본 imageUrl 반환
        url = style.imageUrl || (style.media && style.media.images && style.media.images[0]) || '';
    }

    // 캐시 버스터: 주 단위 타임스탬프 (CDN 캐시 활용)
    // 기존: 매번 새 timestamp → CDN 캐시 미적중
    // 변경: 주 단위 timestamp → CDN 캐시 적중률 향상
    if (url) {
        const weekTimestamp = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        url += (url.includes('?') ? '&' : '?') + 'v=' + weekTimestamp;
    }

    return url;
}

/**
 * 스타일 데이터에서 원본 이미지 URL 반환 (헤어체험/룩북/레시피용)
 * style-match/app.js와 동일한 폴백 로직 사용
 * @param {object} style - 스타일 데이터
 * @returns {string} - 원본 이미지 URL
 */
function getOriginalImageUrl(style) {
    return style.imageUrl || (style.media && style.media.images && style.media.images[0]) || style.thumbnailUrl || '';
}

// ========== 헤어게이터 토큰 차감 (Bullnabi API _users.tokenBalance) ==========

// 룩북 토큰 차감
async function deductLookbookTokens(metadata = {}) {
    try {
        if (!window.BullnabiBridge) {
            console.error('⚠️ BullnabiBridge가 없습니다');
            return { success: false, error: 'BullnabiBridge not found' };
        }

        const result = await window.BullnabiBridge.deductTokens(null, 'lookbook', metadata);
        console.log('💳 룩북 토큰 차감 결과:', result);
        return result;
    } catch (error) {
        console.error('❌ 룩북 토큰 차감 오류:', error);
        return { success: false, error: error.message };
    }
}

// 헤어체험 토큰 차감
async function deductHairTryTokens(metadata = {}) {
    try {
        if (!window.BullnabiBridge) {
            console.error('⚠️ BullnabiBridge가 없습니다');
            return { success: false, error: 'BullnabiBridge not found' };
        }

        const result = await window.BullnabiBridge.deductTokens(null, 'hairTry', metadata);
        console.log('💳 헤어체험 토큰 차감 결과:', result);
        return result;
    } catch (error) {
        console.error('❌ 헤어체험 토큰 차감 오류:', error);
        return { success: false, error: error.message };
    }
}


// 레거시 함수 (호환성 유지)
function deductLookbookCreditFromMenu(_creditCost) {
    console.log('⚠️ 레거시 함수 호출됨: deductLookbookCreditFromMenu - 새 토큰 시스템으로 대체됨');
    // 새 토큰 시스템으로 자동 전환
    deductLookbookTokens({ legacyCall: true });
}

// ========== 룩북 로딩 오버레이 ==========
function createLookbookLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'lookbook-loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 99999;
    `;

    // 로딩 텍스트 (다국어)
    const loadingText = t('lookbook.loading') || 'AI가 스타일을 분석하고 있습니다...';
    const subText = t('lookbook.loadingSubtext') || 'AI가 이 스타일에 어울리는 룩북 상세페이지를 생성하고 있습니다.';

    // 성별에 따른 테마 색상
    const isMale = window.currentGender === 'male';
    const barColor1 = isMale ? '#4A90E2' : '#E91E63';
    const barColor2 = isMale ? '#3A7BC8' : '#C2185B';

    overlay.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="logo-container" style="margin-bottom: 32px;">
                <img src="/로고.png" alt="HAIRGATOR" class="loading-logo" style="width: 100px; height: 100px; object-fit: contain;">
            </div>
            <h2 style="font-size: 12px; margin-bottom: 24px; font-weight: 500; color: #333; letter-spacing: 3px; text-transform: uppercase;">
                HAIRGATOR
            </h2>
            <p style="font-size: 14px; margin-bottom: 6px; color: #555; font-weight: 400;">
                ${loadingText}
            </p>
            <p style="font-size: 12px; color: #999;">
                ${subText}
            </p>
            <div class="loading-bar-container" style="margin-top: 28px; width: 180px; height: 2px; background: #eee; border-radius: 1px; overflow: hidden; margin-left: auto; margin-right: auto;">
                <div class="loading-bar"></div>
            </div>
        </div>
        <style>
            .loading-logo {
                animation: logoPulse 2s ease-in-out infinite;
            }
            @keyframes logoPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.08); opacity: 0.85; }
            }
            .loading-bar {
                width: 30%;
                height: 100%;
                background: linear-gradient(90deg, ${barColor1}, ${barColor2});
                border-radius: 1px;
                animation: loadingProgress 1.8s ease-in-out infinite;
            }
            @keyframes loadingProgress {
                0% { width: 0%; margin-left: 0%; }
                50% { width: 50%; margin-left: 25%; }
                100% { width: 0%; margin-left: 100%; }
            }
        </style>
    `;

    return overlay;
}

// 남성 카테고리 (설명 포함)
const MALE_CATEGORIES = [
    {
        id: 'side-fringe',
        name: 'SIDE FRINGE',
        shortName: 'SF',
        description: '앞머리를 앞으로 내려 자연스럽게 흐르는 스타일、 넓은 이마를 돌출 시킨 역삼각형 얼굴형 보완에 효과적이며、 부드럽고 감성적인 이미지를 연출'
    },
    {
        id: 'side-part',
        name: 'SIDE PART',
        shortName: 'SP',
        description: '가르마를 기준으로 나누는 스타일、 뒤로 넘기면 클래식、내리면 캐주얼、 다양한 얼굴형에 무난하고 활용도가 높음'
    },
    {
        id: 'fringe-up',
        name: 'FRINGE UP',
        shortName: 'FU',
        description: '윗머리는 앞으로 흐르고、 앞머리 끝만 위로 올린 스타일이며、 이마를 적당히 드러내 시원하고 세련된 인상、 활동적이며 깔끔한 스타일을 연출'
    },
    {
        id: 'pushed-back',
        name: 'PUSHED BACK',
        shortName: 'PB',
        description: '모발의 전체 흐름이 뒤쪽으로 자연스럽게 넘어가는 스타일、 이마를 드러내 단정＆클래식＆도희적 무드、 직장／포멀 룩과 잘 어울림'
    },
    {
        id: 'buzz',
        name: 'BUZZ',
        shortName: 'BZ',
        description: '남성 스타일 중 가장 짧은 커트 스타일、 두상 및 윤곽이 그대로 드러나 심플하고 군더더기 없는 이미지이며 관리가 매우 쉬움'
    },
    {
        id: 'crop',
        name: 'CROP',
        shortName: 'CR',
        description: '버즈보다 조금 더 긴 길이이며 앞머리가 이마 상단을 가볍게 덮는 형태、 텍스처＆볼륨 표현이 가능하며 트렌디하고 시크한 느낌'
    },
    {
        id: 'mohican',
        name: 'MOHICAN',
        shortName: 'MH',
        description: '톱（センター）부분을 위쪽으로 세워 강조하며 사이드가 상대적으로 짧아 코너 및 라인감이 또렷、 강한 개성 ＆ 에너지 ＆ 스트릿 무드 연출'
    }
];

// 여성 카테고리 (설명 포함)
const FEMALE_CATEGORIES = [
    {
        id: 'a-length',
        name: 'A LENGTH',
        shortName: 'A',
        description: 'A 길이는 가슴선 아래로 내려오는 롱헤어로, 원랭스·레이어드 롱·굵은 S컬이 잘 맞아 우아하고 드라마틱한 분위기를 냅니다.'
    },
    {
        id: 'b-length',
        name: 'B LENGTH',
        shortName: 'B',
        description: 'B 길이는 가슴 아래(A)와 쇄골 아래(C) 사이의 미디엄-롱으로, 레이어드 미디엄롱·바디펌이 어울려 부드럽고 실용적인 인상을 줍니다.'
    },
    {
        id: 'c-length',
        name: 'C LENGTH',
        shortName: 'C',
        description: 'C 길이는 쇄골 라인 아래의 세미 롱으로, 레이어드 C/S컬과 잘 맞아 단정하고 세련된 오피스 무드를 냅니다.'
    },
    {
        id: 'd-length',
        name: 'D LENGTH',
        shortName: 'D',
        description: 'D 길이는 어깨에 정확히 닿는 길이로, 숄더 C컬이 어울려 트렌디하고 깔끔한 느낌을 줍니다.'
    },
    {
        id: 'e-length',
        name: 'E LENGTH',
        shortName: 'E',
        description: 'E 길이는 어깨 바로 위의 단발로, 클래식 보브·A라인 보브·내/외 C컬이 잘 맞아 경쾌하고 모던한 인상을 만듭니다.'
    },
    {
        id: 'f-length',
        name: 'F LENGTH',
        shortName: 'F',
        description: 'F 길이는 턱선 바로 밑 보브 길이로, 프렌치 보브·일자 단발·텍스쳐 보브가 어울려 시크하고 도회적인 분위기를 연출합니다.'
    },
    {
        id: 'g-length',
        name: 'G LENGTH',
        shortName: 'G',
        description: 'G 길이는 턱선위 높이의 미니 보브로, 클래식 턱선 보브·미니 레이어 보브가 잘 맞아 깔끔하고 미니멀한 무드를 줍니다.'
    },
    {
        id: 'h-length',
        name: 'H LENGTH',
        shortName: 'H',
        description: 'H 길이는 귀선~베리숏구간의 숏헤어로, 활동적이고 개성 있는 스타일을 완성합니다.'
    }
];

// 중분류 (앞머리 길이)
const SUB_CATEGORIES = [
    { name: 'None', shortName: 'N' },
    { name: 'Fore Head', shortName: 'FH' },
    { name: 'Eye Brow', shortName: 'EB' },
    { name: 'Eye', shortName: 'E' },
    { name: 'Cheekbone', shortName: 'CB' }
];

// 중분류 이름 얻기 (호환성 유지)
function getSubCategoryName(subCat) {
    return typeof subCat === 'string' ? subCat : subCat.name;
}
function getSubCategoryShortName(subCat) {
    return typeof subCat === 'string' ? subCat : subCat.shortName;
}

// ========== 전역 변수 ==========
let currentGender = null;
let currentMainTab = null;
let currentSubTab = null;

// window 전역 객체 초기화
if (typeof window !== 'undefined') {
    window.currentGender = currentGender;
    window.currentMainTab = currentMainTab;
    window.currentSubTab = currentSubTab;
}

// 스마트 필터링 & NEW 시스템 캐시
let availableSubcategories = new Map();
let newItemsCache = new Map();
let categoryNewCounts = new Map();
const newItemsTimestamp = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7일 전

// ⭐ 스타일 데이터 캐시 (성능 최적화)
let stylesCache = new Map();
const MAX_CACHE_SIZE = 30; // ⭐ 캐시 크기 제한 (메모리 관리)

// ⭐ 캐시 크기 제한 함수
function limitCacheSize() {
    if (stylesCache.size > MAX_CACHE_SIZE) {
        // 가장 오래된 항목 삭제 (FIFO)
        const firstKey = stylesCache.keys().next().value;
        stylesCache.delete(firstKey);
        console.log(`캐시 정리: ${firstKey} 삭제 (현재 ${stylesCache.size}개)`);
    }
}

// ========== 스마트 필터링 & NEW 표시 시스템 ==========

// 사용 가능한 서브카테고리 & NEW 아이템 확인 (인덱스 불필요 버전)
async function checkSubcategoriesAndNew(gender, categoryName) {
    // Firebase 조회용 이름 변환
    const dbCategoryName = categoryName.includes('LENGTH')
        ? categoryName.replace('LENGTH', 'Length')
        : categoryName;

    const cacheKey = `${gender}-${dbCategoryName}`;

    if (availableSubcategories.has(cacheKey)) {
        showDebugTiming(`캐시: ${dbCategoryName} ✓`);
        return availableSubcategories.get(cacheKey);
    }

    try {
        const queryStart = performance.now();

        // ⭐ 최적화: 100개로 제한 (서브카테고리 확인에는 충분)
        const snapshot = await db.collection('hairstyles')
            .where('gender', '==', gender)
            .where('mainCategory', '==', dbCategoryName)
            .limit(100)
            .get();

        const queryTime = Math.round(performance.now() - queryStart);
        console.log(`🔍 Firestore: gender=${gender}, mainCategory="${dbCategoryName}" → ${snapshot.size}개 (${queryTime}ms)`);

        showDebugTiming(`쿼리: ${dbCategoryName} → ${snapshot.size}개, ${queryTime}ms`);

        const availableSubs = new Set();
        const newCounts = {};
        let totalNewInCategory = 0;
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        // ⭐ 간단한 처리 (100개 이하이므로 빠름)
        snapshot.forEach(doc => {
            const data = doc.data();
            availableSubs.add(data.subCategory);

            // NEW 체크 (100개 샘플에서)
            const createdAt = data.createdAt?.toDate?.() || new Date(0);
            if (createdAt.getTime() > sevenDaysAgo) {
                newCounts[data.subCategory] = (newCounts[data.subCategory] || 0) + 1;
                totalNewInCategory++;
            }
        });

        const result = {
            available: Array.from(availableSubs),
            newCounts: newCounts,
            totalNewCount: totalNewInCategory
        };

        // 캐시에 저장
        availableSubcategories.set(cacheKey, result);

        // 카테고리별 NEW 개수도 저장
        if (totalNewInCategory > 0) {
            categoryNewCounts.set(categoryName, totalNewInCategory);
        }

        console.log(`서브카테고리 확인 완료: ${categoryName}`, result);
        return result;

    } catch (error) {
        console.error('서브카테고리 확인 오류:', error);
        return {
            available: SUB_CATEGORIES.map(s => getSubCategoryName(s)),
            newCounts: {},
            totalNewCount: 0
        };
    }
}

// NEW 표시 빨간 점 생성
function createNewIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'new-indicator';
    return indicator;
}

// ========== 메뉴 로드 및 탭 관리 ==========

// 성별에 따른 메뉴 로드
async function loadMenuForGender(gender) {
    try {
        // 전역 변수 설정 (window와 동기화)
        currentGender = gender;
        window.currentGender = gender;

        const categories = gender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES;

        console.log(`태블릿 호환 ${gender} 메뉴 로드 시작 (${categories.length}개 카테고리)`);

        // Firebase 연결 확인
        if (typeof db === 'undefined' || !db) {
            console.warn('Firebase 미연결 - 3초 후 재시도');
            setTimeout(() => loadMenuForGender(gender), 3000);
            return;
        }

        // ⭐ 디버그: Firestore에서 실제 mainCategory 값 확인 (한 번만)
        if (!window._debugMainCategories) {
            window._debugMainCategories = true;
            try {
                const sample = await db.collection('hairstyles')
                    .where('gender', '==', gender)
                    .limit(20)
                    .get();
                const categories = new Set();
                sample.forEach(doc => categories.add(doc.data().mainCategory));
                console.log(`📊 Firestore ${gender} mainCategory 값들:`, Array.from(categories));
                showDebugTiming(`DB ${gender}: ${Array.from(categories).join(', ')}`);
            } catch (e) {
                console.error('mainCategory 확인 실패:', e);
            }
        }

        // DOM 준비 확인
        if (!document.getElementById('categoryTabs')) {
            console.warn('DOM 미준비 - 2초 후 재시도');
            setTimeout(() => loadMenuForGender(gender), 2000);
            return;
        }

        // body에 gender 클래스 추가
        document.body.classList.remove('gender-male', 'gender-female');
        document.body.classList.add(`gender-${gender}`);

        // ⭐ 캐시는 유지 (캐시 키에 성별 포함되어 있음: ${gender}-${category})
        // 성별 전환 시에도 이전 캐시 활용하여 성능 향상

        // 대분류 탭 생성 (NEW 표시 포함)
        await createMainTabsWithSmart(categories, gender);

        // 카테고리 설명 영역 확인/생성
        ensureCategoryDescriptionArea();

        // 첫 번째 카테고리 자동 선택
        if (categories.length > 0) {
            await selectMainTab(categories[0], 0);
        }

        console.log(`태블릿 호환 ${gender} 메뉴 로드 완료`);

    } catch (error) {
        console.error('태블릿 메뉴 로드 오류:', error);
        // 오류 발생시 5초 후 재시도
        setTimeout(() => loadMenuForGender(gender), 5000);
    }
}

// 대분류 탭 생성 (스마트 필터링 + NEW 표시)
// ⭐ 성능 최적화: 탭 UI 먼저 표시 → 첫 번째만 즉시 로드 → 나머지 백그라운드
async function createMainTabsWithSmart(categories, gender) {
    const mainTabsContainer = document.getElementById('categoryTabs');
    if (!mainTabsContainer) {
        console.error('categoryTabs 요소를 찾을 수 없습니다');
        return;
    }

    mainTabsContainer.innerHTML = '';

    // ⭐ 1단계: 탭 UI 먼저 생성 (NEW 표시 없이) - 즉시 표시
    const tabs = [];
    categories.forEach((category, index) => {
        const tab = document.createElement('button');
        tab.className = `category-tab main-tab ${gender}`;
        tab.id = `main-tab-${gender}-${index}`;

        const fullName = category.name;
        const shortName = category.shortName || fullName;
        tab.innerHTML = `<span class="tab-name-full">${fullName}</span><span class="tab-name-short">${shortName}</span>`;
        tab.onclick = () => selectMainTab(category, index);

        if (index === 0) {
            tab.classList.add('active');
            currentMainTab = category;
            window.currentMainTab = category;
            console.log(`기본 선택: ${category.name}`, category);
        }

        mainTabsContainer.appendChild(tab);
        tabs.push(tab);
    });

    console.log(`${categories.length}개 대분류 탭 UI 생성 완료 (NEW 표시 로딩 중...)`);

    // ⭐ 2단계: 첫 번째 카테고리만 즉시 로드 (사용자가 바로 볼 화면)
    try {
        const firstCategoryInfo = await checkSubcategoriesAndNew(gender, categories[0].name);
        if (firstCategoryInfo.totalNewCount > 0 && !tabs[0].querySelector('.new-indicator')) {
            tabs[0].appendChild(createNewIndicator());
            console.log(`NEW 표시 추가: ${categories[0].name} (${firstCategoryInfo.totalNewCount}개)`);
        }
    } catch (e) {
        console.warn('첫 번째 카테고리 로드 실패:', e);
    }

    // ⭐ 3단계: 나머지 카테고리 NEW 표시 백그라운드 로드
    setTimeout(async () => {
        for (let i = 1; i < categories.length; i++) {
            try {
                const info = await checkSubcategoriesAndNew(gender, categories[i].name);
                if (info.totalNewCount > 0 && tabs[i] && !tabs[i].querySelector('.new-indicator')) {
                    tabs[i].appendChild(createNewIndicator());
                    console.log(`NEW 표시 추가: ${categories[i].name} (${info.totalNewCount}개)`);
                }
            } catch (e) {
                console.warn(`카테고리 ${categories[i].name} NEW 체크 실패:`, e);
            }
        }
        console.log('모든 대분류 NEW 표시 로드 완료');
    }, 500); // 500ms 후 백그라운드 로드
}

// 카테고리 설명 영역 확인/생성
function ensureCategoryDescriptionArea() {
    let descriptionArea = document.getElementById('categoryDescription');
    if (!descriptionArea) {
        descriptionArea = document.createElement('div');
        descriptionArea.id = 'categoryDescription';
        descriptionArea.className = 'category-description';

        const descriptionText = document.createElement('div');
        descriptionText.className = 'category-description-text';
        descriptionArea.appendChild(descriptionText);

        // 카테고리 탭 다음에 설명 영역 삽입
        const categoryTabs = document.querySelector('.category-tabs') ||
            document.getElementById('categoryTabs')?.parentElement;
        if (categoryTabs) {
            const nextElement = categoryTabs.nextElementSibling;
            categoryTabs.parentNode.insertBefore(descriptionArea, nextElement);
            console.log('카테고리 설명 영역 생성됨');
        }
    }
}

// 대분류 탭 선택 (debounce 적용 - 빠른 클릭 시 마지막 클릭만 처리)
function selectMainTab(category, index) {
    // ⭐ 이전 이미지 요청 즉시 취소 (WKWebView 연결 풀 고갈 방지)
    cancelPendingImageLoads();

    // ⭐ 탭 UI는 즉시 업데이트 (사용자 피드백)
    currentMainTab = category;
    window.currentMainTab = category;

    document.querySelectorAll('.main-tab').forEach((tab, i) => {
        tab.classList.remove('active', 'male', 'female');
        if (i === index) {
            tab.classList.add('active', currentGender);
        }
    });

    // 카테고리 설명 업데이트
    updateCategoryDescription(category);

    // ⭐ 이전 debounce 타이머 취소
    if (mainTabDebounceTimer) {
        clearTimeout(mainTabDebounceTimer);
    }

    // ⭐ 150ms debounce - 빠른 클릭 시 마지막 클릭만 처리
    mainTabDebounceTimer = setTimeout(async () => {
        const startTime = performance.now();

        // ⭐ DOM/메모리 상태 진단 (누적 문제 확인)
        const imgCount = document.querySelectorAll('img').length;
        const observerCount = document.querySelectorAll('.lazy-image').length;
        console.log(`🔍 [${currentGender}] DOM상태: img=${imgCount}, lazy=${observerCount}, 캐시=${stylesCache.size}개`);

        console.log(`대분류 선택 (debounced): ${category.name}`);

        // 스마트 중분류 탭 표시
        const subTabStart = performance.now();
        await loadSmartSubTabs(category.name);
        const subTabTime = Math.round(performance.now() - subTabStart);

        // 스타일 로드
        const styleStart = performance.now();
        await loadStyles();
        const styleTime = Math.round(performance.now() - styleStart);

        const totalTime = Math.round(performance.now() - startTime);

        // ⭐ 디버그: 500ms 이상 걸리면 화면에 표시
        if (totalTime > 500) {
            showDebugTiming(`${category.name}: 탭=${subTabTime}ms, 스타일=${styleTime}ms, 총=${totalTime}ms`);
        }
        console.log(`⏱️ ${category.name}: subTab=${subTabTime}ms, styles=${styleTime}ms, total=${totalTime}ms`);
    }, 150);
}

// ⭐ 디버그 타이밍 표시 (비활성화됨)
function showDebugTiming(message) {
    // 디버그 모드에서만 활성화 (기본 비활성화)
    // console.log('[DEBUG]', message);
}

// 카테고리 설명 업데이트
function updateCategoryDescription(category) {
    const descriptionText = document.querySelector('.category-description-text');
    if (!descriptionText) {
        console.warn('카테고리 설명 영역을 찾을 수 없습니다');
        return;
    }

    if (category.description) {
        descriptionText.innerHTML = `
            <span class="category-name">${category.name}</span>
            ${translateDescription(category.name)}
        `;
        descriptionText.style.textAlign = 'left';
        descriptionText.classList.remove('empty');
        console.log(`카테고리 설명 업데이트: ${category.name}`);
    } else {
        descriptionText.textContent = t('ui.noStyles');
        descriptionText.style.textAlign = 'left';
        descriptionText.classList.add('empty');
    }
}

// 스마트 중분류 탭 로드 (필터링 + NEW 표시 + 비활성화)
async function loadSmartSubTabs(categoryName) {
    // ⭐ 요청 버전 증가 (빠른 탭 전환 시 이전 요청 무시)
    subTabLoadRequestVersion++;
    const thisRequestVersion = subTabLoadRequestVersion;

    const subTabsContainer = document.getElementById('subTabs');
    if (!subTabsContainer) {
        console.error('subTabs 요소를 찾을 수 없습니다');
        return;
    }

    subTabsContainer.innerHTML = '';

    // 해당 카테고리의 서브카테고리 정보 가져오기
    const subInfo = await checkSubcategoriesAndNew(currentGender, categoryName);

    // ⭐ 요청 버전 체크 - 이미 새로운 요청이 시작되었으면 무시
    if (thisRequestVersion !== subTabLoadRequestVersion) {
        console.log(`서브탭 로드 무시 (v${thisRequestVersion} → v${subTabLoadRequestVersion})`);
        return;
    }

    let firstAvailableIndex = -1;

    SUB_CATEGORIES.forEach((subCategoryObj, index) => {
        const subCategoryName = getSubCategoryName(subCategoryObj);
        const subCategoryShort = getSubCategoryShortName(subCategoryObj);

        const tab = document.createElement('button');
        tab.className = `sub-tab ${currentGender}`;

        // 모바일용 짧은 이름 + 데스크탑용 전체 이름
        tab.innerHTML = `<span class="tab-name-full">${subCategoryName}</span><span class="tab-name-short">${subCategoryShort}</span>`;

        // 사용 가능한 서브카테고리인지 확인
        const isAvailable = subInfo.available.includes(subCategoryName);

        if (!isAvailable) {
            // 스타일이 없는 서브카테고리 - 비활성화
            tab.classList.add('disabled');
            tab.style.opacity = '0.3';
            tab.style.cursor = 'not-allowed';
            tab.style.pointerEvents = 'none';
        } else {
            // 사용 가능한 서브카테고리
            tab.onclick = () => selectSubTab(subCategoryName, index);

            // 첫 번째 사용 가능한 서브카테고리를 활성화
            if (firstAvailableIndex === -1) {
                firstAvailableIndex = index;
                tab.classList.add('active');
                currentSubTab = subCategoryName;
                window.currentSubTab = subCategoryName; // window 동기화
            }

            // NEW 표시 추가
            const newCount = subInfo.newCounts[subCategoryName];
            if (newCount && newCount > 0) {
                tab.appendChild(createNewIndicator());
                console.log(`중분류 NEW 표시: ${subCategoryName} (${newCount}개)`);
            }
        }

        subTabsContainer.appendChild(tab);
    });

    console.log(`스마트 중분류 탭 로드 완료 (사용가능: ${subInfo.available.length}/${SUB_CATEGORIES.length}개, 신규: ${Object.keys(subInfo.newCounts).length}개)`);
}

// 중분류 탭 선택
function selectSubTab(subCategory, index) {
    currentSubTab = subCategory;
    window.currentSubTab = subCategory; // window 전역 변수 동기화

    console.log(`중분류 선택: ${subCategory}`);

    // 탭 활성화 상태 변경 (비활성화된 탭은 제외)
    document.querySelectorAll('.sub-tab').forEach((tab, i) => {
        if (!tab.classList.contains('disabled')) {
            tab.classList.remove('active', 'male', 'female');
            if (i === index) {
                tab.classList.add('active', currentGender);
            }
        }
    });

    // 스타일 로드
    loadStyles();
}

// ========== 스타일 로드 및 카드 생성 ==========

// ⭐ 이미지 요청 취소 함수 (WKWebView 연결 제한 문제 해결)
function cancelPendingImageLoads() {
    const allImages = document.querySelectorAll('#stylesGrid img');
    let cancelCount = 0;
    allImages.forEach(img => {
        if (img.src && !img.complete) {
            // 로딩 중인 이미지 요청 취소
            img.src = '';
            cancelCount++;
        }
    });
    if (cancelCount > 0) {
        console.log(`⛔ ${cancelCount}개 이미지 요청 취소됨`);
    }
}

// 스타일 로드 - Firebase Query 최종 안정화 + 성능 최적화
async function loadStyles() {
    // ⭐ 요청 버전 증가 (빠른 탭 전환 시 이전 요청 무시)
    styleLoadRequestVersion++;
    const thisRequestVersion = styleLoadRequestVersion;

    // window에서 전역 변수 가져오기
    if (!currentGender && window.currentGender) currentGender = window.currentGender;
    if (!currentMainTab && window.currentMainTab) currentMainTab = window.currentMainTab;
    if (!currentSubTab && window.currentSubTab) currentSubTab = window.currentSubTab;

    const stylesGrid = document.getElementById('stylesGrid');
    if (!stylesGrid) {
        console.error('stylesGrid 요소를 찾을 수 없습니다');
        return;
    }

    // 필수 변수 체크
    if (!currentGender) {
        console.error('currentGender가 설정되지 않았습니다');
        showErrorState(stylesGrid, 'Gender not selected');
        return;
    }

    if (!currentMainTab) {
        console.error('currentMainTab이 설정되지 않았습니다');
        showErrorState(stylesGrid, 'Category not selected');
        return;
    }

    if (!currentSubTab) {
        console.error('currentSubTab이 설정되지 않았습니다');
        showErrorState(stylesGrid, 'Subcategory not selected');
        return;
    }

    // Firebase Query를 위한 안전한 카테고리명 추출
    const mainCategoryName = currentMainTab.name || currentMainTab;
    // Firebase 조회용 이름 변환
    const dbMainCategoryName = mainCategoryName.includes('LENGTH')
        ? mainCategoryName.replace('LENGTH', 'Length')
        : mainCategoryName;
    const subCategoryName = currentSubTab;

    console.log(`스타일 검색 시작 (v${thisRequestVersion}):`, {
        gender: currentGender,
        mainCategory: dbMainCategoryName,
        subCategory: subCategoryName
    });

    // ⭐ 캐시 키 생성
    const cacheKey = `${currentGender}-${dbMainCategoryName}-${subCategoryName}`;

    // ⭐ 캐시에서 먼저 확인 (Firestore 쿼리 스킵)
    let styles = stylesCache.get(cacheKey);

    if (styles) {
        console.log(`스타일 캐시 히트 (v${thisRequestVersion}): ${cacheKey} (${styles.length}개)`);
        showDebugTiming(`스타일 캐시: ${subCategoryName} (${styles.length}개) ✓`);
    } else {
        // 로딩 상태 표시 (캐시 미스일 때만)
        showLoadingState(stylesGrid);

        try {
            // Firebase 연결 확인
            if (typeof db === 'undefined') {
                throw new Error('Firebase가 초기화되지 않았습니다');
            }

            // Firestore 쿼리 실행
            const querySnapshot = await db.collection('hairstyles')
                .where('gender', '==', currentGender)
                .where('mainCategory', '==', dbMainCategoryName)
                .where('subCategory', '==', subCategoryName)
                .get();

            // ⭐ 요청 버전 체크 - 이미 새로운 요청이 시작되었으면 무시
            if (thisRequestVersion !== styleLoadRequestVersion) {
                console.log(`스타일 로드 무시 (v${thisRequestVersion} → v${styleLoadRequestVersion})`);
                return;
            }

            if (querySnapshot.empty) {
                console.log(`스타일 없음: ${mainCategoryName} - ${subCategoryName}`);
                limitCacheSize();
                stylesCache.set(cacheKey, []); // 빈 결과도 캐시
                showEmptyState(stylesGrid);
                return;
            }

            // 스타일 데이터 추출
            styles = [];
            querySnapshot.forEach(doc => {
                styles.push({ ...doc.data(), id: doc.id });
            });

            // ⭐ 캐시에 저장 (크기 제한 적용)
            limitCacheSize();
            stylesCache.set(cacheKey, styles);
            console.log(`스타일 캐시 저장: ${cacheKey} (${styles.length}개, 총 ${stylesCache.size}개)`);

        } catch (error) {
            console.error('스타일 로드 오류:', error);
            showErrorState(stylesGrid, `로드 실패: ${error.message}`);
            return;
        }
    }

    // ⭐ 요청 버전 체크
    if (thisRequestVersion !== styleLoadRequestVersion) {
        console.log(`스타일 렌더링 무시 (v${thisRequestVersion} → v${styleLoadRequestVersion})`);
        return;
    }

    if (!styles || styles.length === 0) {
        showEmptyState(stylesGrid);
        return;
    }

    // 스타일 수 로그
    console.log(`스타일 로드 완료: ${currentGender} - ${styles.length}개`);

    // 스타일 카드 생성
    const cardCreateStart = performance.now();
    stylesGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    // ⭐ 전역 배열 초기화 (모달 슬라이딩용)
    currentCategoryStyles = styles;

    // ⭐ iPad 최적화: 모든 이미지를 지연 로드 (빠른 전환 시 요청 큐 방지)
    let styleCount = 0;
    styles.forEach((style, index) => {
        // 모든 이미지를 data-src로 (즉시 로드 안 함)
        const card = createStyleCard(style, styleCount, true);
        fragment.appendChild(card);
        styleCount++;
    });

    const cardCreateTime = Math.round(performance.now() - cardCreateStart);

    // ⭐ 최종 버전 체크 후 DOM 업데이트
    if (thisRequestVersion !== styleLoadRequestVersion) {
        console.log(`DOM 업데이트 무시 (v${thisRequestVersion} → v${styleLoadRequestVersion})`);
        return;
    }

    // ⭐ requestAnimationFrame으로 DOM 업데이트
    requestAnimationFrame(() => {
        // 버전 재확인
        if (thisRequestVersion !== styleLoadRequestVersion) {
            console.log(`rAF DOM 업데이트 무시 (v${thisRequestVersion} → v${styleLoadRequestVersion})`);
            return;
        }
        stylesGrid.appendChild(fragment);
        console.log(`${styleCount}개 스타일 카드 렌더링 완료 (v${thisRequestVersion})`);

        // ⭐ 이미지 순차 로드 (4개씩, 병목 방지)
        const allImages = stylesGrid.querySelectorAll('.lazy-image');
        const BATCH_SIZE = 4;
        const MAX_INSTANT = 16;
        let loaded = 0;
        const myVersion = thisRequestVersion; // 이 요청의 버전 저장

        function loadBatch() {
            // ⭐ 버전 바뀌면 즉시 중단 (이전 요청 취소)
            if (myVersion !== styleLoadRequestVersion) {
                console.log(`이미지 로드 중단 (v${myVersion} → v${styleLoadRequestVersion})`);
                return;
            }

            for (let i = 0; i < BATCH_SIZE && loaded < MAX_INSTANT && loaded < allImages.length; i++) {
                const img = allImages[loaded];
                const src = img.dataset.src;
                if (src && !img.src) img.src = src;
                loaded++;
            }
            if (loaded < MAX_INSTANT && loaded < allImages.length) {
                setTimeout(loadBatch, 30);
            } else {
                initLazyLoadingObserver(stylesGrid);
                console.log(`${loaded}개 즉시 로드 완료 (v${myVersion})`);
            }
        }
        loadBatch();
    });
}

// ⭐ 이미지 로딩 - 단순화 (data-src → src 직접 변환)
function initLazyLoading(container) {
    // ⭐ 뷰포트에 보이는 이미지만 바로 로드 (간단한 방식)
    const lazyImages = container.querySelectorAll('.lazy-image');

    lazyImages.forEach(img => {
        const src = img.dataset.src;
        if (src && !img.src) {
            // 바로 src 설정 (복잡한 큐 시스템 제거)
            img.src = src;
        }
    });

    console.log(`이미지 로딩 시작: ${lazyImages.length}개`);
}

// ⭐ 기존 Intersection Observer (사용 안함 - 백업용)
let lazyLoadObserver = null;
function initLazyLoadingObserver(container) {
    if (lazyLoadObserver) {
        lazyLoadObserver.disconnect();
    }

    lazyLoadObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                if (src && !img.src) {
                    img.src = src;
                    lazyLoadObserver.unobserve(img);
                }
            }
        });
    }, {
        root: container.closest('.styles-container') || null,
        rootMargin: '100px', // 100px 전에 미리 로드
        threshold: 0.01
    });

    // lazy-image 클래스를 가진 모든 이미지 관찰
    const lazyImages = container.querySelectorAll('.lazy-image');
    lazyImages.forEach(img => {
        if (img.dataset.src && !img.src) {
            lazyLoadObserver.observe(img);
        }
    });

    console.log(`Lazy loading 초기화: ${lazyImages.length}개 이미지`);
}

// 스타일 카드 생성 (NEW 표시 + 스태거 애니메이션 포함)
function createStyleCard(style, _index = 0, deferImage = false) {
    const card = document.createElement('div');
    card.className = 'style-card';

    // ⭐⭐⭐ High-End UI 스타일 적용 ⭐⭐⭐
    const isLightTheme = document.body.classList.contains('light-theme');
    card.style.cssText = `
        background: ${isLightTheme ? '#ffffff' : '#1a1a1a'} !important;
        border-radius: 20px !important;
        overflow: hidden !important;
        cursor: pointer !important;
        transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
        border: none !important;
        aspect-ratio: 3/4 !important;
        position: relative !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: ${isLightTheme ? '0 10px 40px rgba(0, 0, 0, 0.08)' : '0 8px 32px rgba(0, 0, 0, 0.3)'} !important;
    `;

    // NEW 표시 조건 확인 (7일 이내)
    let isNew = false;
    if (style.createdAt) {
        try {
            const createdDate = style.createdAt.toDate();
            const daysSinceCreated = (new Date() - createdDate) / (24 * 60 * 60 * 1000);
            isNew = daysSinceCreated < 7;

            // 디버깅 로그 (처음 3개만)
            if (Math.random() < 0.1) { // 10% 확률로 로그 출력
                console.log('NEW 체크:', {
                    code: style.code,
                    createdAt: createdDate.toLocaleString('ko-KR'),
                    daysSince: daysSinceCreated.toFixed(1),
                    isNew: isNew
                });
            }
        } catch (error) {
            console.warn('createdAt 변환 실패:', style.code, error);
        }
    } else {
        console.warn('createdAt 없음:', style.code);
    }

    // 썸네일 URL 가져오기 (저장된 thumbnailUrl 우선, 없으면 원본)
    const thumbnailUrl = getThumbnailUrl(style);

    // 디버깅: 썸네일 URL 확인 (처음 3개만)
    if (Math.random() < 0.05) {
        console.log('🖼️ 썸네일 URL 확인:', {
            code: style.code,
            thumbnailUrl: style.thumbnailUrl ? style.thumbnailUrl.substring(0, 80) + '...' : 'none',
            updatedAt: style.updatedAt ? (style.updatedAt.seconds || style.updatedAt) : 'none',
            finalUrl: thumbnailUrl.substring(0, 80) + '...'
        });
    }

    // ⭐ Skeleton 배경색 (이미지 로딩 중 표시)
    const skeletonBg = isLightTheme
        ? 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)'
        : 'linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%)';

    // ⭐ deferImage가 true면 data-src 사용 (나중에 스크롤 시 로드)
    const imgSrcAttr = deferImage ? `data-src="${thumbnailUrl || ''}"` : `src="${thumbnailUrl || ''}"`;
    const imgClass = deferImage ? 'style-image lazy-image' : 'style-image';

    card.innerHTML = `
        <div class="style-image-wrapper" style="width: 100% !important; height: 100% !important; position: relative !important; display: block !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; border-radius: 20px !important; background: ${skeletonBg}; background-size: 200% 100%; animation: skeleton-loading 1.5s infinite;">
            <img class="${imgClass}"
                 ${imgSrcAttr}
                 data-original="${getOriginalImageUrl(style)}"
                 alt="${style.name || 'Style'}"
                 loading="lazy"
                 decoding="async"
                 style="width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; border-radius: 20px !important; margin: 0 !important; padding: 0 !important; transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease !important; opacity: 0;"
                 onload="this.style.opacity='1'; this.parentElement.style.animation='none';"
                 onerror="this.style.opacity='1'; this.parentElement.style.animation='none'; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 400%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'">

            ${isNew ? '<div class="new-indicator" style="position: absolute !important; top: 8px !important; right: 8px !important; width: 8px !important; height: 8px !important; background: #ff4444 !important; border-radius: 50% !important; z-index: 10 !important; box-shadow: 0 0 0 2px rgba(0,0,0,0.8) !important;"></div>' : ''}
        </div>
    `;

    // 클릭 이벤트 - 스타일 상세 모달 열기
    card.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        // 시각적 피드백
        card.style.transform = 'scale(0.95)';
        setTimeout(() => {
            card.style.transform = '';
        }, 150);

        // 햅틱 피드백 (모바일)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        console.log('스타일 클릭:', {
            id: style.id,
            code: style.code || 'NO_CODE',
            name: style.name || 'NO_NAME',
            isNew: isNew
        });

        // 스타일 상세 모달 열기
        openStyleModal(style);
    });

    return card;
}

// ========== 스타일 상세 모달 (헤어체험 버튼 포함) ==========

// ========== 360° 뷰어 렌더링 ==========

/**
 * 360° 뷰어 렌더링 함수
 * @param {HTMLElement} container - 렌더링할 컨테이너
 * @param {Object} style - 스타일 데이터 (views360 필드 포함 가능)
 * @param {string} navIndicatorHTML - 스타일 네비게이션 인디케이터 HTML (예: "1 / 5")
 * @returns {boolean} - 360° 뷰어 렌더링 성공 여부
 */
function render360Viewer(container, style, navIndicatorHTML = '') {
    // views360 데이터 확인 (front, left, back, right 이미지 URL)
    const views360 = style.views360;

    if (!views360 || !views360.front) {
        console.log('⚠️ 360° 뷰 데이터 없음, 기본 이미지 표시');
        return false; // fallback to single image
    }

    console.log('🔄 360° 뷰어 렌더링 시작');

    // 이미지 URL 배열 (0°, 90°, 180°, 270°)
    const viewImages = [
        views360.front,   // 0° - 앞
        views360.right,   // 90° - 오른쪽
        views360.back,    // 180° - 뒤
        views360.left     // 270° - 왼쪽
    ];

    const viewLabels = ['앞', '오른쪽', '뒤', '왼쪽'];

    // 360° 뷰어 HTML
    container.innerHTML = `
        <div class="viewer-360" style="
            width: 100%;
            height: 100%;
            position: relative;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            cursor: grab;
            pointer-events: auto !important;
        ">
            <div class="viewer-360-images" style="
                position: relative;
                width: 100%;
                aspect-ratio: 1/1;
                max-height: 65vh;
                overflow: hidden;
                border-radius: 18px 18px 0 0;
                background: #0a0a0a;
                pointer-events: none;
            ">
                ${viewImages.map((url, i) => `
                    <img src="${url}"
                         alt="${viewLabels[i]}"
                         class="viewer-360-img"
                         data-index="${i}"
                         style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                            opacity: 0;
                            transition: none;
                            pointer-events: none;
                         "
                         onerror="this.style.background='#333';">
                `).join('')}
            </div>

            <!-- 각도 인디케이터 -->
            <div class="viewer-360-indicator" style="
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(0,0,0,0.7);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                padding: 10px 20px;
                border-radius: 25px;
                z-index: 10;
            ">
                <span class="viewer-360-angle" style="
                    font-size: 15px;
                    font-weight: 600;
                    color: #fff;
                    min-width: 35px;
                    text-align: center;
                ">0°</span>
                <div style="
                    display: flex;
                    gap: 6px;
                ">
                    ${viewLabels.map((label, i) => `
                        <span class="viewer-360-dot" data-index="${i}" style="
                            width: 8px;
                            height: 8px;
                            border-radius: 50%;
                            background: ${i === 0 ? '#fff' : 'rgba(255,255,255,0.3)'};
                            transition: all 0.15s ease;
                        "></span>
                    `).join('')}
                </div>
                <span class="viewer-360-label" style="
                    font-size: 12px;
                    color: rgba(255,255,255,0.7);
                    min-width: 45px;
                ">앞</span>
            </div>

            <!-- 360° 배지 (왼쪽 상단으로 이동 - 닫기 버튼과 겹침 방지) -->
            <div style="
                position: absolute;
                top: 15px;
                left: 15px;
                padding: 6px 12px;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                color: #fff;
                letter-spacing: 0.5px;
                z-index: 10;
                pointer-events: none;
            ">360°</div>

            <!-- 스타일 네비게이션 인디케이터 (스타일 간 이동용) -->
            ${navIndicatorHTML ? `
            <div class="style-nav-indicator" style="
                position: absolute;
                top: 15px;
                left: 15px;
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                color: white;
                padding: 6px 14px;
                border-radius: 15px;
                font-size: 13px;
                z-index: 10;
                pointer-events: none;
            ">${navIndicatorHTML.replace(/<[^>]*>/g, '').match(/\d+ \/ \d+/) || ''}</div>
            ` : ''}

            <!-- 드래그 힌트 (처음에만 표시) -->
            <div class="viewer-360-hint" style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(0,0,0,0.8);
                padding: 12px 20px;
                border-radius: 30px;
                color: #fff;
                font-size: 13px;
                z-index: 20;
                opacity: 1;
                transition: opacity 0.5s ease;
                pointer-events: none;
            ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                ← 드래그하여 회전 →
            </div>
        </div>
    `;

    // 360° 뷰어 로직 초기화
    init360ViewerLogic(container, viewImages, viewLabels);

    return true;
}

/**
 * 360° 뷰어 터치/드래그 로직 초기화
 */
function init360ViewerLogic(container, viewImages, viewLabels) {
    const viewer = container.querySelector('.viewer-360');
    const images = container.querySelectorAll('.viewer-360-img');
    const angleDisplay = container.querySelector('.viewer-360-angle');
    const labelDisplay = container.querySelector('.viewer-360-label');
    const dots = container.querySelectorAll('.viewer-360-dot');
    const hint = container.querySelector('.viewer-360-hint');

    // ⭐ 이벤트 타겟: container 자체에 등록 (모달 스크롤 우회)
    const eventTarget = container;

    let currentAngle = 0; // 0-360
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let isVerticalSwipe = false;
    let hintHidden = false;

    // 각도에 따라 이미지 블렌딩
    function updateView(angle) {
        // 0-360 범위로 정규화
        angle = ((angle % 360) + 360) % 360;
        currentAngle = angle;

        if (images.length === 0) return;

        // 모든 이미지 투명도 초기화
        images.forEach(img => img.style.opacity = 0);

        // 현재 각도가 어느 구간에 있는지 찾기
        let idx1, idx2, blend;

        if (angle >= 0 && angle < 90) {
            idx1 = 0; idx2 = 1;
            blend = angle / 90;
        } else if (angle >= 90 && angle < 180) {
            idx1 = 1; idx2 = 2;
            blend = (angle - 90) / 90;
        } else if (angle >= 180 && angle < 270) {
            idx1 = 2; idx2 = 3;
            blend = (angle - 180) / 90;
        } else {
            idx1 = 3; idx2 = 0;
            blend = (angle - 270) / 90;
        }

        // 코사인 보간으로 자연스러운 블렌딩
        const smoothBlend = (1 - Math.cos(blend * Math.PI)) / 2;

        images[idx1].style.opacity = 1 - smoothBlend;
        images[idx2].style.opacity = smoothBlend;


        // UI 업데이트
        const displayAngle = Math.round(angle);
        angleDisplay.textContent = displayAngle + '°';

        // 가장 가까운 뷰 라벨 표시
        const closestView = Math.round(angle / 90) % 4;
        labelDisplay.textContent = viewLabels[closestView];

        // 도트 업데이트
        dots.forEach((dot, i) => {
            dot.style.background = i === closestView ? '#fff' : 'rgba(255,255,255,0.3)';
            dot.style.transform = i === closestView ? 'scale(1.3)' : 'scale(1)';
        });
    }

    // 힌트 숨기기
    function hideHint() {
        if (!hintHidden && hint) {
            hint.style.opacity = '0';
            setTimeout(() => {
                if (hint) hint.style.display = 'none';
            }, 500);
            hintHidden = true;
        }
    }

    // 초기 뷰 설정
    updateView(0);

    // 3초 후 힌트 자동 숨김
    setTimeout(hideHint, 3000);

    // ⭐ 터치 이벤트 (태블릿) - eventTarget(container)에 등록
    eventTarget.addEventListener('touchstart', function(e) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isVerticalSwipe = false;
        hideHint();

        // 햅틱 피드백
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }, { passive: true });

    eventTarget.addEventListener('touchmove', function(e) {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        // 첫 번째 움직임에서 수직/수평 결정
        if (!isVerticalSwipe && Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 30) {
            // 수직 스와이프 감지됨 - 회전 중지
            isVerticalSwipe = true;
        }

        // 수직 스와이프 중이면 회전 안 함
        if (isVerticalSwipe) return;

        // 수평 드래그: 360° 회전
        const viewerWidth = viewer.offsetWidth || 400;
        const sensitivity = 360 / viewerWidth; // 전체 너비 = 360도

        const newAngle = currentAngle - deltaX * sensitivity;
        updateView(newAngle);
        startX = currentX;

        // 스크롤 방지 (수평 드래그 시에만)
        if (e.cancelable) e.preventDefault();
    }, { passive: false });

    eventTarget.addEventListener('touchend', function(e) {
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const deltaX = endX - startX;
        const deltaY = endY - startY;

        // 수직 스와이프로 스타일 간 이동 (상하 50px 이상)
        if (isVerticalSwipe && Math.abs(deltaY) > 50) {
            if (deltaY < 0) {
                // 위로 스와이프 → 다음 스타일
                if (window.navigateModalStyle) {
                    window.navigateModalStyle(1);
                    console.log('🔄 360° 뷰어: 위로 스와이프 → 다음 스타일');
                }
            } else {
                // 아래로 스와이프 → 이전 스타일
                if (window.navigateModalStyle) {
                    window.navigateModalStyle(-1);
                    console.log('🔄 360° 뷰어: 아래로 스와이프 → 이전 스타일');
                }
            }
        }

        isDragging = false;
        isVerticalSwipe = false;
    }, { passive: true });

    // ⭐ 마우스/포인터 이벤트 - eventTarget(container)에 등록
    eventTarget.addEventListener('pointerdown', function(e) {
        if (e.pointerType === 'touch') return; // 터치는 별도 처리

        isDragging = true;
        startX = e.clientX;
        eventTarget.style.cursor = 'grabbing';
        eventTarget.setPointerCapture(e.pointerId);
        hideHint();
    });

    eventTarget.addEventListener('pointermove', function(e) {
        if (!isDragging || e.pointerType === 'touch') return;

        const deltaX = e.clientX - startX;
        const viewerWidth = viewer.offsetWidth || 400;
        const sensitivity = 360 / viewerWidth;

        const newAngle = currentAngle - deltaX * sensitivity;
        updateView(newAngle);
        startX = e.clientX;
    });

    eventTarget.addEventListener('pointerup', function(e) {
        if (e.pointerType === 'touch') return;
        if (isDragging) {
            isDragging = false;
            eventTarget.style.cursor = 'grab';
        }
    });

    eventTarget.addEventListener('pointercancel', function() {
        isDragging = false;
        eventTarget.style.cursor = 'grab';
    });

    // 초기 커서 설정
    eventTarget.style.cursor = 'grab';
}

// 스타일 상세 모달 열기 (헤어체험 버튼 추가)
async function openStyleModal(style) {
    console.log('🔍 openStyleModal 호출됨:', style);

    const modal = document.getElementById('styleModal');
    if (!modal) {
        console.error('❌ styleModal 요소를 찾을 수 없습니다');
        alert(t('hairTry.modalError') || '모달을 열 수 없습니다');
        return;
    }

    console.log('✅ 모달 요소 찾음');

    // ⭐⭐⭐ currentCategoryStyles가 비어있거나 현재 스타일이 없으면 Firebase에서 로드
    const styleInList = currentCategoryStyles.find(s => s.id === style.id);
    if (currentCategoryStyles.length === 0 || !styleInList) {
        console.log('🔄 같은 카테고리 스타일 로드 중...');

        // 현재 스타일의 카테고리 정보로 같은 카테고리 스타일들 로드
        if (style.gender && style.mainCategory && style.subCategory && window.db) {
            try {
                const snapshot = await window.db.collection('hairstyles')
                    .where('gender', '==', style.gender)
                    .where('mainCategory', '==', style.mainCategory)
                    .where('subCategory', '==', style.subCategory)
                    .get();

                currentCategoryStyles = [];
                snapshot.forEach(doc => {
                    currentCategoryStyles.push({ ...doc.data(), id: doc.id });
                });
                console.log(`✅ 같은 카테고리 스타일 ${currentCategoryStyles.length}개 로드됨`);
            } catch (error) {
                console.warn('⚠️ 같은 카테고리 스타일 로드 실패:', error);
                // 실패해도 최소한 현재 스타일은 추가
                currentCategoryStyles = [style];
            }
        } else {
            // 카테고리 정보가 없으면 현재 스타일만 추가
            currentCategoryStyles = [style];
            console.log('⚠️ 카테고리 정보 없음, 단일 스타일로 설정');
        }
    }

    // ⭐ 현재 스타일의 인덱스 찾기 (슬라이딩용)
    currentStyleIndex = currentCategoryStyles.findIndex(s => s.id === style.id);
    if (currentStyleIndex === -1) currentStyleIndex = 0;
    console.log(`📍 현재 인덱스: ${currentStyleIndex + 1}/${currentCategoryStyles.length}`);

    // ⭐⭐⭐ Firestore에서 로드된 전체 데이터 사용 (views360 포함)
    const fullStyleData = currentCategoryStyles[currentStyleIndex] || style;
    console.log('📋 사용할 스타일 데이터:', fullStyleData.id, 'views360:', !!fullStyleData.views360);

    // 이미지 컨테이너에 직접 렌더링 (MediaViewer 의존성 제거)
    const container = document.getElementById('mediaViewerContainer');
    if (container) {
        console.log('✅ mediaViewerContainer 찾음');

        // 확대/축소 상태 저장
        let isZoomed = false;

        // ⭐ 페이지 인디케이터만 표시 (스타일이 2개 이상일 때만, 버튼 없이 스와이프만)
        const showIndicator = currentCategoryStyles.length > 1;
        const navIndicatorHTML = showIndicator ? `
            <div class="modal-nav-indicator" style="
                position: absolute; bottom: 15px; left: 50%; transform: translateX(-50%);
                background: rgba(0,0,0,0.6); color: white; padding: 6px 14px;
                border-radius: 15px; font-size: 13px; z-index: 10;
                pointer-events: none;
            ">${currentStyleIndex + 1} / ${currentCategoryStyles.length}</div>
        ` : '';

        // ⭐ 360° 뷰어 렌더링 시도 (views360 데이터가 있는 경우)
        const has360Viewer = render360Viewer(container, fullStyleData, navIndicatorHTML);

        if (!has360Viewer) {
            // 360° 데이터가 없으면 기존 단일 이미지 렌더링
            // 원본 이미지 URL (폴백 포함)
            const modalImageUrl = getOriginalImageUrl(fullStyleData);
            container.innerHTML = `
                <div class="media-viewer" style="width: 100%; background: transparent;">
                    <div class="main-display" style="position: relative; width: 100%; display: flex; align-items: center; justify-content: center; line-height: 0;">
                        ${navIndicatorHTML}
                        <img src="${modalImageUrl}"
                             alt="${fullStyleData.name || 'Style'}"
                             class="modal-zoom-image"
                             style="width: 100%; height: auto; object-fit: cover; max-height: 70vh; cursor: zoom-in; transition: max-height 0.3s ease, transform 0.3s ease, opacity 0.2s ease; display: block; border-radius: 18px 18px 0 0;"
                             onerror="this.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; this.alt='이미지 로드 실패';">
                        <div class="modal-ai-badge" style="
                            position: absolute; bottom: 15px; right: 15px;
                            padding: 5px 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                            font-size: 11px; font-weight: 600; letter-spacing: 1.5px;
                            color: #fff; background: rgba(0, 0, 0, 0.6);
                            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                            border: 1px solid rgba(255, 255, 255, 0.15);
                            border-radius: 6px; z-index: 10; pointer-events: none;
                        ">AI</div>
                    </div>
                </div>
            `;

            // 이미지 클릭 시 확대/축소
            const img = container.querySelector('.modal-zoom-image');
            if (img) {
                img.addEventListener('click', function (e) {
                    e.stopPropagation();
                    isZoomed = !isZoomed;

                    if (isZoomed) {
                        this.style.maxHeight = '90vh';
                        this.style.cursor = 'zoom-out';
                        this.style.transform = 'scale(1.05)';
                    } else {
                        this.style.maxHeight = '70vh';
                        this.style.cursor = 'zoom-in';
                        this.style.transform = 'scale(1)';
                    }

                    // 햅틱 피드백
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                });

                // ⭐⭐⭐ 이미지에 직접 스와이프 이벤트 등록 (매번 새로 등록)
                let imgTouchStartX = 0;
                let imgTouchStartY = 0;

                img.addEventListener('touchstart', function(e) {
                    imgTouchStartX = e.touches[0].clientX;
                    imgTouchStartY = e.touches[0].clientY;
                    console.log(`👆 이미지 터치 시작: X=${imgTouchStartX}`);
                }, { passive: true });

                img.addEventListener('touchend', function(e) {
                    const touchEndX = e.changedTouches[0].clientX;
                    const touchEndY = e.changedTouches[0].clientY;
                    const diffX = imgTouchStartX - touchEndX;
                    const diffY = imgTouchStartY - touchEndY;

                    console.log(`👆 이미지 터치 끝: diffX=${diffX}, diffY=${diffY}`);
                    console.log(`📊 스타일 수: ${currentCategoryStyles.length}, 인덱스: ${currentStyleIndex}`);

                    // 수평 스와이프가 수직보다 크고 threshold 초과시
                    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                        console.log(`✅ 스와이프 인식! 방향: ${diffX > 0 ? '다음(→)' : '이전(←)'}`);
                        if (diffX > 0) {
                            window.navigateModalStyle(1);  // 다음
                        } else {
                            window.navigateModalStyle(-1); // 이전
                        }
                    }
                }, { passive: true });

                console.log('✅ 이미지 스와이프 이벤트 등록됨');
            }

            console.log('✅ 단일 이미지 렌더링 완료');
        } else {
            console.log('✅ 360° 뷰어 렌더링 완료');
        }
    } else {
        console.error('❌ mediaViewerContainer를 찾을 수 없습니다');
    }

    // 모달 내용 설정 (코드/이름 등) - 숨겨진 상태
    const modalCode = document.getElementById('styleModalCode');
    const modalName = document.getElementById('styleModalName');
    const modalCategory = document.getElementById('styleModalCategory');
    const modalSubcategory = document.getElementById('styleModalSubcategory');
    const modalGender = document.getElementById('styleModalGender');

    if (modalCode) modalCode.textContent = style.code || 'NO CODE';
    if (modalName) modalName.textContent = style.name || '이름 없음';
    if (modalCategory) modalCategory.textContent = style.mainCategory || '-'; // 영어로 통일
    if (modalSubcategory) modalSubcategory.textContent = style.subCategory || '-'; // 영어로 통일
    if (modalGender) {
        modalGender.textContent = style.gender === 'male' ? t('gender.male') :
            style.gender === 'female' ? t('gender.female') : '-'; // ⭐ 번역 적용
    }

    // 모달 표시
    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.zIndex = '9999';
    document.body.style.overflow = 'hidden';

    // Lookbook 버튼 이벤트 연결 (index.html의 버튼)
    const btnLookbook = document.getElementById('btnOpenLookbook');
    if (btnLookbook) {
        // 다국어 버튼 텍스트 설정 (SVG 아이콘 유지)
        const lookbookText = t('lookbook.button') || 'Lookbook';
        const svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>`;
        btnLookbook.innerHTML = `${svgIcon}<span>${lookbookText}</span>`;

        btnLookbook.onclick = async function (e) {
            e.stopPropagation();

            const genderValue = currentGender || window.currentGender || 'female';
            console.log('📖 Lookbook 분석 시작:', style.name, '성별:', genderValue);

            // 로딩 오버레이 생성 및 표시
            const loadingOverlay = createLookbookLoadingOverlay();
            document.body.appendChild(loadingOverlay);

            try {
                // API 호출하여 분석 및 이미지 생성
                // 원본 이미지 URL 가져오기 (폴백 포함)
                const styleOriginalImage = getOriginalImageUrl(style);

                // ⭐ 서버 측 토큰 검증을 위해 userId 전달
                let userId = '';
                if (window.FirebaseBridge && typeof window.FirebaseBridge.getUserDocId === 'function') {
                    userId = await window.FirebaseBridge.getUserDocId() || '';
                }

                const response = await fetch('/.netlify/functions/lookbook-analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageUrl: styleOriginalImage,
                        language: window.currentLanguage || 'ko',
                        generateImages: true,
                        gender: genderValue,
                        category: style.mainCategory || '',
                        subcategory: style.subCategory || '',
                        styleName: style.name || '',
                        userId: userId
                    })
                });

                // ⭐ 서버 측 토큰 부족 응답 처리 (403)
                if (response.status === 403) {
                    const errorData = await response.json();
                    console.warn('❌ 룩북 토큰 부족:', errorData);
                    loadingOverlay.remove();
                    if (typeof showToast === 'function') {
                        showToast(errorData.message || '토큰이 부족합니다', 'warning');
                    }
                    window.location.href = '/#products';
                    return;
                }

                if (!response.ok) {
                    throw new Error(`API 오류: ${response.status}`);
                }

                const result = await response.json();
                console.log('📖 Lookbook 분석 완료:', result);

                // 결과를 sessionStorage에 저장
                sessionStorage.setItem('lookbookResult', JSON.stringify(result));
                sessionStorage.setItem('lookbookImage', styleOriginalImage);
                sessionStorage.setItem('lookbookTitle', style.name || 'Style');
                sessionStorage.setItem('lookbookGender', genderValue);
                sessionStorage.setItem('lookbookLanguage', window.currentLanguage || 'ko');

                // ⭐ 서버에서 토큰 차감 완료 (tokenDeducted 확인)
                if (result.tokenDeducted) {
                    console.log('💳 룩북 토큰 서버에서 차감 완료');
                }

                // 로딩 오버레이 제거
                loadingOverlay.remove();

                // lookbook.html로 이동 (preloaded 파라미터 추가)
                const lookbookUrl = `/lookbook.html?preloaded=true&title=${encodeURIComponent(style.name || 'Style')}`;
                window.location.href = lookbookUrl;

            } catch (error) {
                console.error('📖 Lookbook 분석 실패:', error);
                loadingOverlay.remove();

                const errorMsg = t('hairTry.analysisError') || '분석 중 오류가 발생했습니다. 다시 시도해주세요.';
                if (typeof showToast === 'function') {
                    showToast(errorMsg, 'error');
                } else {
                    alert(errorMsg);
                }
            }
        };
    }

    // 헤어체험 버튼 이벤트 연결 (index.html의 버튼)
    const btnHairTry = document.getElementById('btnHairTry');
    if (btnHairTry) {
        // 다국어 버튼 텍스트 설정 (SVG 아이콘 유지)
        const hairTryText = t('hairTry.button') || '헤어체험';
        const svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>`;
        btnHairTry.innerHTML = `${svgIcon}<span>${hairTryText}</span>`;

        btnHairTry.onclick = async function (e) {
            e.stopPropagation();
            console.log('💇 헤어체험 버튼 클릭:', style.name);

            // 헤어체험 모달 열기 (토큰 차감은 API 호출 후 내부에서 처리)
            // imageUrl 폴백: style-match/app.js와 동일한 로직
            openAIPhotoModal(style.id, style.name, getOriginalImageUrl(style));
        };
    }

    // 레시피 버튼 이벤트 연결
    const btnViewRecipe = document.getElementById('btnViewRecipe');
    if (btnViewRecipe) {
        // 다국어 버튼 텍스트 설정
        const recipeText = t('recipe.button') || '레시피';
        const svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>`;
        btnViewRecipe.innerHTML = `${svgIcon}<span>${recipeText}</span>`;

        btnViewRecipe.onclick = async function(e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('📋 레시피 버튼 클릭:', style.name, style.gender);

            // 성별에 따라 처리 분기
            if (style.gender === 'male') {
                // 남자: 바로 AI Studio로 이동
                navigateToRecipe(style, 'cut');
            } else {
                // 여자: 커트/펌 선택 모달 표시
                showRecipeTypeModal(style);
            }
        };
    }

    console.log('✅ 스타일 모달 열림:', {
        code: style.code,
        name: style.name,
        category: style.mainCategory,
        subcategory: style.subCategory,
        modalDisplay: modal.style.display,
        modalZIndex: modal.style.zIndex
    });
}


// ========== 헤어체험 기능 ==========

// 헤어체험 사진 업로드 모달 열기
function openAIPhotoModal(styleId, styleName, styleImageUrl) {
    console.log('헤어체험하기 클릭:', {
        styleId: styleId,
        styleName: styleName,
        gender: window.currentGender,
        status: 'ACTIVE'
    });

    // 현재 선택된 스타일 정보 저장 (기존 변수명 유지)
    window.currentAIStyleImage = styleImageUrl;
    window.currentAIStyleName = styleName;

    // 기존 업로드 모달이 있으면 제거
    const existingModal = document.querySelector('.hair-upload-modal, .photo-upload-modal, .ai-photo-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // 헤어체험 업로드 모달 생성
    const modal = document.createElement('div');
    modal.className = 'hair-upload-modal';
    modal.innerHTML = `
        <div class="hair-upload-content">
            <div class="hair-upload-header">
                <h3>✨ ${t('hairTry.title') || '헤어체험'}</h3>
                <p>${t('hairTry.selectedStyle') || '선택한 스타일'}: <strong>${styleName}</strong></p>
                <button class="close-upload-btn" onclick="closePhotoUploadModal()">×</button>
            </div>

            <div class="hair-upload-body">
                <div class="style-preview">
                    <img src="${styleImageUrl}" alt="${styleName}" class="style-preview-image">
                    <p>${t('hairTry.styleToApply') || '적용할 스타일'}</p>
                </div>

                <div class="upload-arrow">→</div>

                <div class="customer-photo-section">
                    <!-- 2개 버튼 옵션 (태블릿 최적화) -->
                    <div class="photo-options">
                        <button class="photo-option-btn upload-btn" onclick="selectPhotoFromGallery()">
                            <span class="option-icon">📁</span>
                            <span>${t('hairTry.selectFromGallery') || '갤러리에서 선택'}</span>
                        </button>
                        <button class="photo-option-btn camera-btn" onclick="takePhotoWithCamera()">
                            <span class="option-icon">📷</span>
                            <span>${t('hairTry.takePhoto') || '카메라로 촬영'}</span>
                        </button>
                    </div>

                    <!-- 숨겨진 input들 -->
                    <input type="file" id="customerPhotoUpload" accept="image/*" style="display: none;">
                    <input type="file" id="customerPhotoCamera" accept="image/*" capture="environment" style="display: none;">

                    <!-- 미리보기 영역 -->
                    <div class="customer-preview" id="customerPreview" style="display: none;">
                        <img id="customerPreviewImage" alt="${t('hairTry.uploadPhoto') || '고객 사진'}">
                        <button class="change-photo-btn" onclick="changeCustomerPhoto()">${t('hairTry.changePhoto') || '사진 변경'}</button>
                    </div>
                </div>
            </div>

            <div class="hair-upload-actions">
                <button class="upload-action-btn cancel-btn" onclick="closePhotoUploadModal()">
                    ${t('hairTry.cancelButton') || '취소'}
                </button>
                <button class="upload-action-btn process-btn" id="processBtn" disabled onclick="processAIFaceSwap()">
                    <span class="ai-icon">✨</span>
                    <span>${t('hairTry.startButton') || '헤어체험 시작'}</span>
                </button>
            </div>
        </div>
        <div class="hair-upload-overlay" onclick="closePhotoUploadModal()"></div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // 모달 표시 애니메이션
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    // 파일 업로드 이벤트 설정
    setupHairUploadEvents();

    // 헤어체험 모달 스타일 추가
    addHairUploadModalStyles();

    // 📸 AI 스타일 매칭에서 저장된 사진 자동 불러오기 (sessionStorage 우선, localStorage 폴백)
    let savedPhoto = sessionStorage.getItem('styleMatchPhoto');
    let photoSource = 'sessionStorage';

    if (!savedPhoto) {
        savedPhoto = localStorage.getItem('styleMatchPhoto');
        photoSource = 'localStorage';
    }

    if (savedPhoto) {
        console.log(`📸 저장된 스타일 매칭 사진 발견 (${photoSource}) - 자동 적용`);

        // 전역 변수에 저장
        window.uploadedCustomerPhoto = savedPhoto;

        // 미리보기 표시
        setTimeout(() => {
            showCustomerPhotoPreview(savedPhoto);

            // 처리 버튼 활성화
            const processBtn = document.getElementById('processBtn');
            if (processBtn) {
                processBtn.disabled = false;
            }
        }, 100);

        // 사용 후 삭제 (일회성)
        sessionStorage.removeItem('styleMatchPhoto');
        localStorage.removeItem('styleMatchPhoto');
    }

    console.log('헤어체험 업로드 모달 표시 완료');
}

// 헤어체험 업로드 이벤트 설정 (수정된 버전)
function setupHairUploadEvents() {
    // 실제 존재하는 input 요소들 가져오기
    const galleryInput = document.getElementById('customerPhotoUpload');
    const cameraInput = document.getElementById('customerPhotoCamera');

    console.log('이벤트 설정:', {
        gallery: !!galleryInput,
        camera: !!cameraInput
    });

    // 갤러리 input 이벤트
    if (galleryInput) {
        galleryInput.addEventListener('change', (e) => {
            console.log('갤러리에서 파일 선택:', e.target.files.length);
            if (e.target.files.length > 0) {
                handleCustomerPhotoUpload(e.target.files[0]);
            }
        });
    }

    // 카메라 input 이벤트
    if (cameraInput) {
        cameraInput.addEventListener('change', (e) => {
            console.log('카메라로 사진 촬영:', e.target.files.length);
            if (e.target.files.length > 0) {
                handleCustomerPhotoUpload(e.target.files[0]);
            }
        });
    }

    // 드래그 앤 드롭 (customer-photo-section에 적용)
    const photoSection = document.querySelector('.customer-photo-section');
    if (photoSection) {
        photoSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            photoSection.classList.add('dragover');
        });

        photoSection.addEventListener('dragleave', () => {
            photoSection.classList.remove('dragover');
        });

        photoSection.addEventListener('drop', (e) => {
            e.preventDefault();
            photoSection.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleCustomerPhotoUpload(files[0]);
            }
        });
    }
}

// 갤러리에서 사진 선택
function selectPhotoFromGallery() {
    console.log('갤러리 버튼 클릭');
    const fileInput = document.getElementById('customerPhotoUpload');
    if (fileInput) {
        fileInput.click();
    } else {
        console.error('customerPhotoUpload 요소를 찾을 수 없음');
    }
}

// 카메라로 사진 촬영 (거울모드 지원)
function takePhotoWithCamera() {
    console.log('카메라 버튼 클릭 - 거울모드 카메라 열기');
    openMirrorCamera();
}

// 거울모드 카메라 모달 열기
function openMirrorCamera() {
    // 기존 카메라 모달 제거
    const existingModal = document.querySelector('.camera-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
        <div class="camera-modal-content">
            <div class="camera-header">
                <h3>📸 고객 사진 촬영</h3>
                <button class="camera-close-btn" onclick="closeCameraModal()">✕</button>
            </div>
            <div class="camera-body">
                <video id="cameraPreview" autoplay playsinline webkit-playsinline muted style="display:none;"></video>
                <canvas id="cameraCanvas"></canvas>
                <div class="camera-guide">
                    <!-- ✨ 최소 영역 가이드 -->
                    <div class="min-area-guide">
                        <div class="min-area-oval"></div>
                        <p class="min-area-text">얼굴이 이 원보다<br><strong>크게</strong> 나와야 해요</p>
                    </div>
                </div>
            </div>
            <div class="camera-controls">
                <button class="camera-switch-btn" onclick="switchCamera()" title="카메라 전환">
                    🔄
                </button>
                <button class="camera-capture-btn" onclick="capturePhoto()">
                    <span class="capture-icon"></span>
                </button>
                <div class="camera-spacer"></div>
            </div>
        </div>
    `;

    // 카메라 모달 스타일 추가
    addCameraModalStyles();

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // 카메라 시작 (전면 카메라 기본)
    setTimeout(() => {
        modal.classList.add('active');
        startCamera('user'); // 'user' = 전면 카메라
    }, 10);
}

// 현재 카메라 방향 저장
let currentFacingMode = 'user';
let currentStream = null;
let cameraAnimationId = null;

// 카메라 시작
async function startCamera(facingMode = 'user') {
    currentFacingMode = facingMode;
    const video = document.getElementById('cameraPreview');
    const canvas = document.getElementById('cameraCanvas');

    if (!video || !canvas) return;

    // 기존 스트림 및 애니메이션 정리
    if (cameraAnimationId) {
        cancelAnimationFrame(cameraAnimationId);
        cameraAnimationId = null;
    }
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 1280 }
            },
            audio: false
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;

        // 비디오 메타데이터 로드 후 캔버스 렌더링 시작
        video.onloadedmetadata = () => {
            video.play();

            // 캔버스 크기 설정
            const cameraBody = canvas.parentElement;
            canvas.width = cameraBody.clientWidth;
            canvas.height = cameraBody.clientHeight;

            const ctx = canvas.getContext('2d');
            const isMirror = (facingMode === 'user');

            // 실시간 비디오를 캔버스에 그리기
            function drawFrame() {
                if (!currentStream) return;

                const vw = video.videoWidth;
                const vh = video.videoHeight;
                const cw = canvas.width;
                const ch = canvas.height;

                // Cover 방식으로 계산
                const scale = Math.max(cw / vw, ch / vh);
                const sw = cw / scale;
                const sh = ch / scale;
                const sx = (vw - sw) / 2;
                const sy = (vh - sh) / 2;

                ctx.save();

                // 거울모드 적용
                if (isMirror) {
                    ctx.translate(cw, 0);
                    ctx.scale(-1, 1);
                }

                ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
                ctx.restore();

                cameraAnimationId = requestAnimationFrame(drawFrame);
            }

            drawFrame();
            console.log('📹 카메라 시작:', facingMode === 'user' ? '전면(거울모드)' : '후면');
        };

    } catch (error) {
        console.error('카메라 접근 오류:', error);
        showToast(t('hairTry.cameraError') || '카메라에 접근할 수 없습니다. 권한을 확인해주세요.', 'error');
        closeCameraModal();
    }
}

// 카메라 전환 (전면 ↔ 후면)
function switchCamera() {
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera(newFacingMode);
}

// 사진 촬영
function capturePhoto() {
    const canvas = document.getElementById('cameraCanvas');
    if (!canvas || !currentStream) return;

    // 캔버스에서 직접 이미지 추출 (이미 거울모드 적용됨)
    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    // 카메라 정리 및 모달 닫기
    closeCameraModal();

    // 업로드 처리
    window.uploadedCustomerPhoto = imageData;
    showCustomerPhotoPreview(imageData);

    // 처리 버튼 활성화
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.disabled = false;
    }

    console.log('📸 사진 촬영 완료');
    showToast(t('hairTry.photoTaken') || '사진이 촬영되었습니다', 'success');
}

// 카메라 모달 닫기
function closeCameraModal() {
    // 애니메이션 프레임 정리
    if (cameraAnimationId) {
        cancelAnimationFrame(cameraAnimationId);
        cameraAnimationId = null;
    }

    // 스트림 정리
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }

    const modal = document.querySelector('.camera-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// 카메라 모달 스타일
function addCameraModalStyles() {
    if (document.getElementById('camera-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'camera-modal-styles';
    style.textContent = `
        .camera-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        .camera-modal.active {
            opacity: 1;
            visibility: visible;
        }
        .camera-modal-content {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #000;
        }
        .camera-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            background: rgba(0, 0, 0, 0.8);
        }
        .camera-header h3 {
            color: #fff;
            font-size: 18px;
            margin: 0;
        }
        .camera-close-btn {
            background: none;
            border: none;
            color: #fff;
            font-size: 24px;
            cursor: pointer;
            padding: 5px 10px;
        }
        .camera-body {
            flex: 1;
            position: relative;
            overflow: hidden;
            background: #000;
        }
        #cameraCanvas {
            width: 100%;
            height: 100%;
            display: block;
        }
        .camera-guide {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            background: transparent;
        }
        /* ✨ 최소 영역 가이드 */
        .min-area-guide {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }
        .min-area-oval {
            width: 120px;
            height: 160px;
            border: 3px dashed rgba(255, 107, 107, 0.7);
            border-radius: 50%;
            animation: min-area-pulse 2s ease-in-out infinite;
            position: relative;
        }
        .min-area-oval::after {
            content: '↑';
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 20px;
            color: rgba(255, 107, 107, 0.8);
            animation: arrow-bounce 1s ease-in-out infinite;
        }
        @keyframes min-area-pulse {
            0%, 100% {
                opacity: 0.8;
                border-color: rgba(255, 107, 107, 0.7);
            }
            50% {
                opacity: 0.5;
                border-color: rgba(255, 20, 147, 0.5);
            }
        }
        @keyframes arrow-bounce {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-5px); }
        }
        .min-area-text {
            color: #fff;
            font-size: 14px;
            text-align: center;
            line-height: 1.4;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
            background: rgba(0, 0, 0, 0.6);
            padding: 10px 16px;
            border-radius: 12px;
        }
        .min-area-text strong {
            color: #FF6B6B;
            font-size: 16px;
        }
        .camera-guide p {
            color: #fff;
            font-size: 16px;
            font-weight: 600;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
            background: rgba(0, 0, 0, 0.6);
            padding: 8px 16px;
            border-radius: 20px;
        }
        .camera-controls {
            display: flex;
            justify-content: space-around;
            align-items: center;
            padding: 30px 20px;
            background: rgba(0, 0, 0, 0.8);
        }
        .camera-switch-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            font-size: 24px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .camera-switch-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        .camera-capture-btn {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #fff;
            border: 4px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
            position: relative;
            transition: all 0.2s;
        }
        .camera-capture-btn:hover {
            transform: scale(1.05);
        }
        .camera-capture-btn:active {
            transform: scale(0.95);
        }
        .capture-icon {
            display: block;
            width: 60px;
            height: 60px;
            background: #ff4081;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        }
        .camera-spacer {
            width: 50px;
        }
        /* 태블릿/데스크탑 세로 모드 */
        @media (min-width: 768px) {
            .camera-modal-content {
                max-width: 500px;
                max-height: 90vh;
                border-radius: 20px;
                overflow: hidden;
            }
            .min-area-oval {
                width: 100px;
                height: 130px;
            }
        }

        /* 태블릿 가로모드 (landscape) */
        @media (min-width: 768px) and (orientation: landscape) {
            .camera-modal-content {
                flex-direction: row;
                max-width: 90vw;
                max-height: 85vh;
            }
            .camera-header {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                z-index: 20;
                background: rgba(0, 0, 0, 0.6);
            }
            .camera-body {
                flex: 1;
                height: 100%;
            }
            .camera-controls {
                flex-direction: column;
                width: 120px;
                height: 100%;
                padding: 80px 20px 30px;
                justify-content: center;
            }
            .min-area-oval {
                width: 90px;
                height: 120px;
            }
        }

        /* 모바일 가로모드 */
        @media (max-width: 767px) and (orientation: landscape) {
            .camera-modal-content {
                flex-direction: row;
            }
            .camera-header {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                z-index: 20;
                background: rgba(0, 0, 0, 0.6);
                padding: 10px 15px;
            }
            .camera-header h3 {
                font-size: 14px;
            }
            .camera-body {
                flex: 1;
                height: 100%;
            }
            .camera-controls {
                flex-direction: column;
                width: 100px;
                height: 100%;
                padding: 60px 15px 20px;
                justify-content: center;
            }
            .min-area-oval {
                width: 80px;
                height: 100px;
            }
            .camera-capture-btn {
                width: 60px;
                height: 60px;
            }
            .capture-icon {
                width: 45px;
                height: 45px;
            }
            .camera-switch-btn {
                width: 40px;
                height: 40px;
                font-size: 18px;
            }
            .camera-guide p {
                font-size: 12px;
                padding: 5px 10px;
            }
        }
    `;
    document.head.appendChild(style);
}

// 고객 사진 업로드 처리
function handleCustomerPhotoUpload(file) {
    // 파일 형식 검증
    if (!file.type.startsWith('image/')) {
        showToast(t('hairTry.imageOnly') || '이미지 파일만 업로드 가능합니다', 'error');
        return;
    }

    // 파일 크기 검증 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
        showToast(t('hairTry.fileSizeLimit') || '파일 크기는 10MB 이하로 제한됩니다', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const imageUrl = e.target.result;

        // 전역 변수에 저장 (기존 변수명 유지)
        window.uploadedCustomerPhoto = imageUrl;

        // 미리보기 표시
        showCustomerPhotoPreview(imageUrl);

        // 처리 버튼 활성화
        const processBtn = document.getElementById('processBtn');
        if (processBtn) {
            processBtn.disabled = false;
        }

        console.log('고객 사진 업로드 완료');
    };

    reader.onerror = function () {
        showToast(t('hairTry.readError') || '이미지 읽기 중 오류가 발생했습니다', 'error');
    };

    reader.readAsDataURL(file);
}

// 고객 사진 미리보기 표시
function showCustomerPhotoPreview(imageUrl) {
    // 버튼 영역 숨기기
    const photoOptions = document.querySelector('.photo-options');
    const previewArea = document.getElementById('customerPreview');
    const previewImage = document.getElementById('customerPreviewImage');

    if (photoOptions && previewArea && previewImage) {
        photoOptions.style.display = 'none';
        previewArea.style.display = 'block';
        previewImage.src = imageUrl;
    }
}

// 고객 사진 변경
function changeCustomerPhoto() {
    const photoOptions = document.querySelector('.photo-options');
    const previewArea = document.getElementById('customerPreview');
    const processBtn = document.getElementById('processBtn');

    if (photoOptions && previewArea) {
        photoOptions.style.display = 'flex';
        previewArea.style.display = 'none';
    }

    if (processBtn) {
        processBtn.disabled = true;
    }

    window.uploadedCustomerPhoto = null;
}

// 헤어체험 모달 닫기
function closePhotoUploadModal() {
    const modal = document.querySelector('.hair-upload-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// 헤어체험 AI 처리 - API 호출
async function processAIFaceSwap() {
    const customerPhoto = window.uploadedCustomerPhoto;
    const styleImageUrl = window.currentAIStyleImage;
    const styleName = window.currentAIStyleName;

    if (!customerPhoto) {
        showToast(t('hairTry.error') || '사진을 먼저 업로드해주세요', 'error');
        return;
    }

    if (!styleImageUrl) {
        showToast(t('hairTry.error') || '스타일 이미지가 없습니다', 'error');
        return;
    }

    console.log('💇 헤어체험 AI 처리 시작:', styleName);

    // 처리 버튼 비활성화
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.innerHTML = `<span class="ai-icon">⏳</span><span>${t('hairTry.processing') || '처리 중...'}</span>`;
    }

    // 로딩 오버레이 표시
    const loadingOverlay = createHairTryLoadingOverlay();
    document.body.appendChild(loadingOverlay);

    let tempStoragePath = null; // 임시 파일 경로 저장

    // ⭐ 서버 측 토큰 검증을 위해 userId 획득
    let userId = '';
    if (window.FirebaseBridge && typeof window.FirebaseBridge.getUserDocId === 'function') {
        userId = await window.FirebaseBridge.getUserDocId() || '';
    }

    try {
        // 1. 고객 사진을 Firebase Storage에 임시 업로드하여 URL 획득
        console.log('📤 고객 사진 임시 업로드 중...');
        const uploadResult = await uploadCustomerPhotoToStorage(customerPhoto);
        const customerPhotoUrl = uploadResult.url;
        tempStoragePath = uploadResult.path; // 삭제용 경로 저장
        console.log('✅ 고객 사진 URL:', customerPhotoUrl);

        const gender = window.currentGender || 'male';

        // 2. Task 생성 (action: 'start') - userId 전달
        console.log('🚀 헤어체험 Task 생성 중...');
        const startResponse = await fetch('/.netlify/functions/hair-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'start',
                customerPhotoUrl: customerPhotoUrl,
                styleImageUrl: styleImageUrl,
                gender: gender,
                userId: userId
            })
        });

        // ⭐ 서버 측 토큰 부족 응답 처리 (403)
        if (startResponse.status === 403) {
            const errorData = await startResponse.json();
            loadingOverlay.remove();
            // 버튼 복구
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.innerHTML = `<span class="ai-icon">✨</span><span>${t('hairTry.button') || '헤어체험 시작'}</span>`;
            }
            if (typeof showToast === 'function') {
                showToast(errorData.message || '토큰이 부족합니다', 'warning');
            }
            window.location.href = '/#products';
            return;
        }

        if (!startResponse.ok) {
            const errorData = await startResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `API 오류: ${startResponse.status}`);
        }

        const startResult = await startResponse.json();
        console.log('📝 Task 생성됨:', startResult.taskId);

        if (!startResult.success || !startResult.taskId) {
            throw new Error('Task 생성 실패');
        }

        // 3. 폴링으로 결과 대기 (action: 'status') - userId 전달
        const result = await pollHairChangeStatus(startResult.taskId, gender, loadingOverlay, userId);

        // 4. 임시 파일 삭제 (결과 받은 후 즉시)
        if (tempStoragePath) {
            deleteTemporaryFile(tempStoragePath);
        }

        // 로딩 오버레이 제거
        loadingOverlay.remove();

        // 업로드 모달 닫기
        closePhotoUploadModal();

        // 결과 모달 표시 (window.uploadedCustomerPhoto 사용)
        showHairTryResult(result.resultImageUrl, styleName);

        // ⭐ 토큰 차감은 서버에서 처리됨 (hair-change.js 'status' action에서 성공 시 차감)
        console.log('✅ 헤어체험 완료 - 토큰 차감은 서버에서 처리됨');

    } catch (error) {
        // 에러 발생 시에도 임시 파일 삭제 시도
        if (tempStoragePath) {
            deleteTemporaryFile(tempStoragePath);
        }
        console.error('💇 헤어체험 API 오류:', error);
        loadingOverlay.remove();

        // 버튼 복구
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = `<span class="ai-icon">✨</span><span>${t('hairTry.button') || '헤어체험 시작'}</span>`;
        }

        showToast(t('hairTry.error') || '처리 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
}

/**
 * 헤어체험 상태 폴링
 * @param {string} taskId - vModel Task ID
 * @param {string} gender - 성별
 * @param {HTMLElement} loadingOverlay - 로딩 오버레이 요소
 * @param {string} userId - 사용자 ID (서버 측 토큰 차감용)
 * @returns {Object} - 완료된 결과
 */
async function pollHairChangeStatus(taskId, gender, loadingOverlay, userId = '') {
    const maxAttempts = 30;  // 최대 30회 (60초)
    const pollInterval = 2000;  // 2초마다

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        console.log(`🔄 상태 확인 중... (${attempt + 1}/${maxAttempts})`);

        // 로딩 메시지 업데이트
        const progressText = loadingOverlay.querySelector('.loading-progress');
        if (progressText) {
            const progressMsg = (t('hairTry.processingProgress') || 'AI 처리 중... ({n}/{total})').replace('{n}', attempt + 1).replace('{total}', maxAttempts);
            progressText.textContent = progressMsg;
        }

        const response = await fetch('/.netlify/functions/hair-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'status',
                taskId: taskId,
                gender: gender,
                userId: userId
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `상태 확인 오류: ${response.status}`);
        }

        const result = await response.json();
        console.log('📊 상태:', result.status);

        // 완료됨
        if (result.status === 'completed') {
            if (!result.resultImageUrl) {
                throw new Error('결과 이미지가 없습니다');
            }
            console.log('✅ 헤어체험 완료!', result.enhanced ? '(Gemini 후처리 적용)' : '(원본)');
            return result;
        }

        // 실패
        if (result.status === 'failed' || result.status === 'unknown') {
            throw new Error(result.message || '헤어체험 처리 실패');
        }

        // 아직 처리 중 - 다음 폴링까지 대기
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('처리 시간 초과. 다시 시도해주세요.');
}

// 고객 사진을 Firebase Storage에 임시 업로드
async function uploadCustomerPhotoToStorage(base64Data) {
    // Firebase Storage 참조 확인
    if (typeof storage === 'undefined') {
        throw new Error('Firebase Storage가 초기화되지 않았습니다');
    }

    // base64 데이터에서 Blob 생성
    let base64Content = base64Data;
    let mimeType = 'image/jpeg';

    if (base64Data.includes(',')) {
        const parts = base64Data.split(',');
        const mimeMatch = parts[0].match(/data:([^;]+);/);
        if (mimeMatch) {
            mimeType = mimeMatch[1];
        }
        base64Content = parts[1];
    }

    // base64를 Blob으로 변환
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // 고유한 파일명 생성 (임시 폴더에 저장)
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = mimeType.split('/')[1] || 'jpg';
    const filePath = `hair-try-temp/${timestamp}_${randomId}.${extension}`;

    // Firebase Storage에 업로드
    const storageRef = storage.ref().child(filePath);
    const uploadTask = await storageRef.put(blob);
    const downloadUrl = await uploadTask.ref.getDownloadURL();

    console.log('📤 임시 업로드 완료:', filePath);
    return { url: downloadUrl, path: filePath };
}

// 임시 파일 삭제 (비동기, 실패해도 무시)
function deleteTemporaryFile(filePath) {
    if (!filePath || typeof storage === 'undefined') return;

    try {
        const fileRef = storage.ref().child(filePath);
        fileRef.delete().then(() => {
            console.log('🗑️ 임시 파일 삭제 완료:', filePath);
        }).catch((err) => {
            console.warn('🗑️ 임시 파일 삭제 실패 (무시됨):', err.message);
        });
    } catch (e) {
        console.warn('🗑️ 임시 파일 삭제 중 오류:', e);
    }
}

// 헤어체험 로딩 오버레이 생성 (룩북 스타일과 통일)
function createHairTryLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'hair-try-loading-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 99999;
    `;

    const loadingText = t('hairTry.processing') || 'AI가 헤어스타일을 적용하고 있습니다...';
    const subText = t('hairTry.processingSubtext') || '최상의 결과를 위해 잠시만 기다려주세요';

    // 성별에 따른 테마 색상 (룩북과 동일)
    const isMale = window.currentGender === 'male';
    const barColor1 = isMale ? '#4A90E2' : '#E91E63';
    const barColor2 = isMale ? '#3A7BC8' : '#C2185B';

    overlay.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="logo-container" style="margin-bottom: 32px;">
                <img src="/로고.png" alt="HAIRGATOR" class="loading-logo" style="width: 100px; height: 100px; object-fit: contain;">
            </div>
            <h2 style="font-size: 12px; margin-bottom: 24px; font-weight: 500; color: #333; letter-spacing: 3px; text-transform: uppercase;">
                HAIRGATOR
            </h2>
            <p class="loading-progress" style="font-size: 14px; margin-bottom: 6px; color: #555; font-weight: 400;">
                ${loadingText}
            </p>
            <p style="font-size: 12px; color: #999;">
                ${subText}
            </p>
            <div class="loading-bar-container" style="margin-top: 28px; width: 180px; height: 2px; background: #eee; border-radius: 1px; overflow: hidden; margin-left: auto; margin-right: auto;">
                <div class="loading-bar"></div>
            </div>
        </div>
        <style>
            .loading-logo {
                animation: logoPulse 2s ease-in-out infinite;
            }
            @keyframes logoPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.08); opacity: 0.85; }
            }
            .loading-bar {
                width: 30%;
                height: 100%;
                background: linear-gradient(90deg, ${barColor1}, ${barColor2});
                border-radius: 1px;
                animation: loadingProgress 1.8s ease-in-out infinite;
            }
            @keyframes loadingProgress {
                0% { width: 0%; margin-left: 0%; }
                50% { width: 50%; margin-left: 25%; }
                100% { width: 0%; margin-left: 100%; }
            }
        </style>
    `;

    return overlay;
}

// 헤어체험 결과 모달 표시 (전/후 비교)
function showHairTryResult(resultImageUrl, styleName) {
    // 기존 결과 모달 제거
    const existingModal = document.querySelector('.hair-try-result-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const disclaimerText = t('hairTry.disclaimer') || '가상 결과입니다. 헤어 느낌을 미리 파악해보는 정도의 의미로만 사용해 주세요. 실제와 다를 수 있습니다.';
    const beforeText = t('hairTry.before') || 'BEFORE';
    const afterText = t('hairTry.after') || 'AFTER';
    const styleText = t('hairTry.style') || 'STYLE';

    // 원본 사진 가져오기
    const originalPhoto = window.uploadedCustomerPhoto || '';
    // 체험하는 스타일 이미지
    const styleImage = window.currentAIStyleImage || '';

    const modal = document.createElement('div');
    modal.className = 'hair-try-result-modal';
    modal.innerHTML = `
        <div class="hair-try-result-content">
            <div class="hair-try-result-header">
                <h3>✨ ${t('hairTry.result') || '체험 결과'}</h3>
                <p>${styleName}</p>
                <button class="close-result-btn" onclick="closeHairTryResult()">×</button>
            </div>

            <div class="hair-try-result-body">
                <!-- 전/후 비교 컨테이너 -->
                <div class="hair-try-comparison">
                    <div class="comparison-left-stack">
                        <!-- 스타일 이미지 (위) -->
                        ${styleImage ? `
                        <div class="comparison-style">
                            <span class="comparison-label">${styleText}</span>
                            <img src="${styleImage}" alt="Style" class="comparison-image">
                        </div>
                        ` : ''}
                        <!-- BEFORE 이미지 (아래) -->
                        <div class="comparison-before">
                            <span class="comparison-label">${beforeText}</span>
                            <img src="${originalPhoto}" alt="Before" class="comparison-image">
                        </div>
                    </div>
                    <div class="comparison-divider">
                        <span class="divider-arrow">→</span>
                    </div>
                    <div class="comparison-after">
                        <span class="comparison-label">${afterText}</span>
                        <img src="${resultImageUrl}" alt="After" class="comparison-image" crossorigin="anonymous">
                    </div>
                </div>

                <div class="hair-try-disclaimer">
                    <span class="disclaimer-icon">ℹ️</span>
                    <span>${disclaimerText}</span>
                </div>
            </div>

            <div class="hair-try-result-actions">
                <button class="result-action-btn retry-btn" onclick="retryHairTry()">
                    <span>🔄</span>
                    <span>${t('hairTry.retry') || '다시 시도'}</span>
                </button>
                <button class="result-action-btn save-btn" id="saveHairTryBtn">
                    <span>💾</span>
                    <span>${t('hairTry.save') || '저장하기'}</span>
                </button>
            </div>
        </div>
        <div class="hair-try-result-overlay" onclick="closeHairTryResult()"></div>
    `;

    // 스타일 추가
    addHairTryResultStyles();

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // 저장 버튼 이벤트 리스너 추가
    const saveBtn = document.getElementById('saveHairTryBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveHairTryResult(resultImageUrl);
        });
    }

    // 애니메이션
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    console.log('💇 헤어체험 결과 표시 완료 (전/후 비교)');
}

// 헤어체험 결과 모달 닫기
function closeHairTryResult() {
    const modal = document.querySelector('.hair-try-result-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// 헤어체험 다시 시도
function retryHairTry() {
    closeHairTryResult();
    // 현재 스타일로 다시 업로드 모달 열기
    if (window.currentAIStyleImage && window.currentAIStyleName) {
        openAIPhotoModal(null, window.currentAIStyleName, window.currentAIStyleImage);
    }
}

// 헤어체험 결과 저장
async function saveHairTryResult(imageUrl) {
    console.log('saveHairTryResult 호출됨:', imageUrl);

    if (!imageUrl) {
        console.error('이미지 URL이 없습니다');
        showToast(t('hairTry.cannotSave') || '이미지를 저장할 수 없습니다', 'error');
        return;
    }

    // Flutter WebView에서는 DownloadChannel 사용
    if (window.DownloadChannel) {
        console.log('[HairTry] Flutter 채널로 이미지 저장 요청:', imageUrl);
        window.DownloadChannel.postMessage(imageUrl);
        return;
    }

    // 모바일 체크
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        // 모바일 브라우저: 오버레이로 길게 눌러 저장 안내
        showSaveImageOverlay(imageUrl);
    } else {
        // 데스크톱: 직접 다운로드 시도
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `hairtry_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);

            showToast(t('hairTry.saved') || '이미지가 저장되었습니다', 'success');
        } catch (error) {
            console.error('다운로드 실패:', error);
            // 실패 시 오버레이로 폴백
            showSaveImageOverlay(imageUrl);
        }
    }
}

// 이미지 저장 오버레이 (길게 눌러서 저장)
function showSaveImageOverlay(imageUrl) {
    // 기존 오버레이 제거
    const existing = document.querySelector('.save-image-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'save-image-overlay';
    overlay.innerHTML = `
        <div class="save-image-container">
            <div class="save-image-header">
                <span class="save-icon">💾</span>
                <span>${t('hairTry.saveGuide') || '이미지를 길게 눌러 저장하세요'}</span>
            </div>
            <img src="${imageUrl}" alt="Result" class="save-target-image" crossorigin="anonymous">
            <div class="save-image-actions">
                <button class="save-close-btn" onclick="closeSaveImageOverlay()">
                    ${t('ui.close') || '닫기'}
                </button>
            </div>
        </div>
    `;

    // 스타일 추가
    addSaveImageStyles();

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // 오버레이 클릭으로 닫기
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeSaveImageOverlay();
        }
    });

    // 토스트 메시지
    showToast(t('hairTry.saveGuide') || '이미지를 길게 눌러 저장하세요', 'info');
}

// 저장 오버레이 닫기
function closeSaveImageOverlay() {
    const overlay = document.querySelector('.save-image-overlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
    }
}

// 저장 오버레이 스타일
function addSaveImageStyles() {
    if (document.getElementById('save-image-styles')) return;

    const style = document.createElement('style');
    style.id = 'save-image-styles';
    style.textContent = `
        .save-image-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }
        .save-image-container {
            background: #fff;
            border-radius: 16px;
            padding: 20px;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
        }
        .save-image-header {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }
        .save-icon {
            font-size: 24px;
        }
        .save-target-image {
            max-width: 100%;
            max-height: 60vh;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .save-image-actions {
            display: flex;
            gap: 12px;
        }
        .save-close-btn {
            padding: 12px 32px;
            border: none;
            border-radius: 25px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #fff;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
}

// 헤어체험 결과 모달 스타일 (성별 기반 테마 색상)
function addHairTryResultStyles() {
    // 기존 스타일 제거 후 재생성 (성별 변경 대응)
    const existingStyle = document.getElementById('hair-try-result-styles');
    if (existingStyle) existingStyle.remove();

    // 성별에 따른 테마 색상
    const isMale = window.currentGender === 'male';
    const primaryColor = isMale ? '#4A90E2' : '#E91E63';
    const primaryDark = isMale ? '#3A7BC8' : '#C2185B';
    const primaryRgb = isMale ? '74, 144, 226' : '233, 30, 99';

    const style = document.createElement('style');
    style.id = 'hair-try-result-styles';
    style.textContent = `
        .hair-try-result-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .hair-try-result-modal.active {
            opacity: 1;
            visibility: visible;
        }

        .hair-try-result-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: -1;
        }

        .hair-try-result-content {
            position: relative;
            background: #ffffff;
            border-radius: 20px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            border: 1px solid #eee;
        }

        .hair-try-result-header {
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid #eee;
            position: relative;
        }

        .hair-try-result-header h3 {
            margin: 0 0 5px 0;
            color: #333;
            font-size: 20px;
        }

        .hair-try-result-header p {
            margin: 0;
            color: #888;
            font-size: 14px;
        }

        .close-result-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            color: #888;
            font-size: 24px;
            cursor: pointer;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .close-result-btn:hover {
            color: #333;
        }

        .hair-try-result-body {
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 15px;
        }

        /* 전/후 비교 컨테이너 */
        .hair-try-comparison {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            width: 100%;
        }

        .comparison-left-stack {
            display: flex;
            flex-direction: column;
            gap: 10px;
            flex: 0 0 auto;
            max-width: 140px;
        }

        .comparison-style {
            position: relative;
        }

        .comparison-before {
            position: relative;
        }

        .comparison-after {
            position: relative;
            flex: 1;
            max-width: 380px;
        }

        .comparison-label {
            position: absolute;
            top: 8px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 1px;
            z-index: 2;
        }

        .comparison-style .comparison-label {
            background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
        }

        .comparison-before .comparison-label {
            background: rgba(100, 100, 100, 0.8);
        }

        .comparison-after .comparison-label {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryDark} 100%);
        }

        .comparison-image {
            width: 100%;
            height: auto;
            object-fit: cover;
            border-radius: 10px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .comparison-style .comparison-image {
            max-height: 20vh;
        }

        .comparison-before .comparison-image {
            max-height: 20vh;
            opacity: 0.85;
        }

        .comparison-after .comparison-image {
            max-height: 55vh;
        }

        .comparison-divider {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .divider-arrow {
            font-size: 24px;
            color: ${primaryColor};
            animation: pulseArrow 1.5s ease-in-out infinite;
        }

        @keyframes pulseArrow {
            0%, 100% { opacity: 0.5; transform: translateX(0); }
            50% { opacity: 1; transform: translateX(5px); }
        }

        .hair-try-disclaimer {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            background: #FFF3CD;
            border: 1px solid #FFD93D;
            border-radius: 10px;
            padding: 12px 15px;
            max-width: 100%;
        }

        .hair-try-disclaimer .disclaimer-icon {
            flex-shrink: 0;
            font-size: 16px;
        }

        .hair-try-disclaimer span:last-child {
            font-size: 12px;
            color: #664D03;
            line-height: 1.5;
        }

        .result-image {
            max-width: 100%;
            max-height: 60vh;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .hair-try-result-actions {
            display: flex;
            gap: 15px;
            padding: 20px;
            border-top: 1px solid #eee;
            justify-content: center;
        }

        .result-action-btn {
            padding: 14px 28px;
            border: none;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }

        .retry-btn {
            background: #666;
            color: white;
        }

        .retry-btn:hover {
            background: #888;
            transform: translateY(-2px);
        }

        .save-btn {
            background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryDark} 100%);
            color: white;
        }

        .save-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(${primaryRgb}, 0.4);
        }

        @media (max-width: 767px) {
            .hair-try-result-content {
                max-width: 95vw;
                margin: 10px;
            }

            /* 모바일: 전/후 비교 세로 배치 */
            .hair-try-comparison {
                flex-direction: column;
                gap: 10px;
            }

            .comparison-before {
                max-width: 50%;
                width: 50%;
                margin: 0 auto;
            }

            .comparison-after {
                max-width: 100%;
                width: 100%;
            }

            .comparison-before .comparison-image {
                max-height: 22vh;
            }

            .comparison-after .comparison-image {
                max-height: 45vh;
            }

            .comparison-divider {
                padding: 5px 0;
            }

            .divider-arrow {
                font-size: 20px;
                transform: rotate(90deg);
            }

            @keyframes pulseArrow {
                0%, 100% { opacity: 0.5; transform: rotate(90deg) translateX(0); }
                50% { opacity: 1; transform: rotate(90deg) translateX(5px); }
            }

            .hair-try-result-actions {
                flex-direction: column;
            }

            .result-action-btn {
                width: 100%;
                justify-content: center;
            }
        }
    `;
    document.head.appendChild(style);
}

// 헤어체험 업로드 모달 스타일 추가
function addHairUploadModalStyles() {
    // 이미 스타일이 추가되었는지 확인
    if (document.getElementById('hair-upload-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'hair-upload-modal-styles';
    style.textContent = `
        /* 헤어체험 업로드 모달 스타일 */
        .hair-upload-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .hair-upload-modal.active {
            opacity: 1;
            visibility: visible;
        }
        
        .hair-upload-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: -1;
        }
        
        .hair-upload-content {
            position: relative;
            background: var(--primary-dark);
            border-radius: 15px;
            max-width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-color);
            min-width: 500px;
        }
        
        .hair-upload-header {
            display: flex;
            flex-direction: column;
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
            position: relative;
        }
        
        .hair-upload-header h3 {
            margin: 0 0 10px 0;
            color: var(--text-primary);
            font-size: 18px;
        }
        
        .hair-upload-header p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 14px;
        }
        
        .close-upload-btn {
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 24px;
            cursor: pointer;
            padding: 5px;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .hair-upload-body {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 20px;
        }
        
        .style-preview {
            text-align: center;
            flex-shrink: 0;
        }
        
        .style-preview-image {
            width: 120px;
            height: 160px;
            object-fit: cover;
            border-radius: 10px;
            border: 2px solid var(--border-color);
        }
        
        .style-preview p {
            margin: 10px 0 0 0;
            color: var(--text-secondary);
            font-size: 12px;
        }
        
        .upload-arrow {
            font-size: 24px;
            color: var(--text-secondary);
            flex-shrink: 0;
        }
        
        .customer-photo-section {
            flex: 1;
        }

        /* 태블릿 최적화 사진 선택 버튼 */
        .photo-options {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
        }

        .photo-option-btn {
            flex: 1;
            padding: 20px;
            border: 2px solid var(--border-color);
            background: transparent;
            border-radius: 15px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            color: var(--text-primary);
            font-size: 14px;
            font-weight: 500;
            min-height: 100px;
        }

        .photo-option-btn:hover {
            border-color: var(--female-color);
            background: rgba(233, 30, 99, 0.05);
            transform: translateY(-2px);
        }

        .photo-option-btn .option-icon {
            font-size: 28px;
        }

        /* 드래그오버 상태 스타일 */
        .customer-photo-section.dragover {
            border: 2px dashed var(--female-color);
            background: rgba(233, 30, 99, 0.05);
            border-radius: 10px;
            padding: 10px;
            transition: all 0.3s ease;
        }

        .customer-photo-section.dragover .photo-options {
            transform: scale(1.02);
        }
        
        .customer-preview {
            text-align: center;
        }
        
        .customer-preview img {
            width: 150px;
            height: 200px;
            object-fit: cover;
            border-radius: 10px;
            border: 2px solid var(--border-color);
            margin-bottom: 15px;
        }
        
        .change-photo-btn {
            background: var(--text-secondary);
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 15px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .change-photo-btn:hover {
            background: var(--female-color);
        }
        
        .hair-upload-actions {
            display: flex;
            gap: 10px;
            padding: 20px;
            border-top: 1px solid var(--border-color);
            justify-content: flex-end;
        }
        
        .upload-action-btn {
            padding: 12px 20px;
            border: none;
            border-radius: 25px;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .cancel-btn {
            background: var(--text-secondary);
            color: white;
        }
        
        .cancel-btn:hover {
            background: #666;
        }
        
        .process-btn {
            background: linear-gradient(135deg, var(--female-color), #c2185b);
            color: white;
        }
        
        .process-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
        }
        
        .process-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        /* 모바일 반응형 */
        @media (max-width: 767px) {
            .hair-upload-modal {
                align-items: flex-start;
                padding: 10px;
            }

            .hair-upload-content {
                max-width: 100%;
                max-height: calc(100vh - 20px);
                margin: 0;
                min-width: auto;
                width: 100%;
                border-radius: 12px;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }

            .hair-upload-header {
                padding: 15px;
                position: sticky;
                top: 0;
                background: var(--primary-dark);
                z-index: 10;
            }

            .hair-upload-header h3 {
                font-size: 16px;
            }

            .hair-upload-header p {
                font-size: 13px;
            }

            .hair-upload-body {
                flex-direction: column;
                gap: 15px;
                padding: 15px;
            }

            .style-preview-image {
                width: 100px;
                height: 130px;
            }

            .upload-arrow {
                transform: rotate(90deg);
                font-size: 20px;
            }

            .photo-options {
                flex-direction: column;
                gap: 10px;
            }

            .photo-option-btn {
                padding: 15px;
                min-height: 70px;
                flex-direction: row;
                justify-content: center;
            }

            .photo-option-btn .option-icon {
                font-size: 24px;
            }

            .customer-preview img {
                width: 120px;
                height: 160px;
            }

            .hair-upload-actions {
                flex-direction: column;
                padding: 15px;
                gap: 10px;
                position: sticky;
                bottom: 0;
                background: var(--primary-dark);
                border-top: 1px solid var(--border-color);
            }

            .upload-action-btn {
                width: 100%;
                justify-content: center;
                padding: 14px 20px;
            }

            .process-btn {
                order: -1;
            }
        }

        /* 아주 작은 모바일 */
        @media (max-width: 400px) {
            .hair-upload-header h3 {
                font-size: 15px;
            }

            .style-preview-image {
                width: 80px;
                height: 105px;
            }

            .photo-option-btn {
                padding: 12px;
                min-height: 60px;
                font-size: 13px;
            }

            .photo-option-btn .option-icon {
                font-size: 20px;
            }
        }
    `;
    document.head.appendChild(style);
}

// ========== 상태 표시 함수들 ==========

// 로딩 상태 표시
function showLoadingState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <div class="empty-title">로딩중...</div>
        </div>
    `;
}

// 빈 상태 표시
function showEmptyState(container) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📭</div>
            <div class="empty-title">스타일 없음</div>
            <div class="empty-message">해당 카테고리에 등록된 스타일이 없습니다</div>
        </div>
    `;
}

// 오류 상태 표시
function showErrorState(container, message) {
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">오류 발생</div>
            <div class="empty-message">${message}</div>
            <button onclick="location.reload()" style="margin-top: 15px; padding: 8px 16px; background: var(--female-color); color: white; border: none; border-radius: 5px; cursor: pointer;">새로고침</button>
        </div>
    `;
}

// 토스트 메시지 표시
function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 모달 닫기 함수들
function closeStyleModal() {
    console.log('🔍 closeStyleModal 호출됨');

    const modal = document.getElementById('styleModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        modal.style.zIndex = '';
        document.body.style.overflow = '';

        console.log('✅ 스타일 모달 닫힘');
    } else {
        console.error('❌ styleModal 요소를 찾을 수 없습니다');
    }
}

// ⭐ 모달 내 스타일 네비게이션 (좌우 슬라이딩)
function navigateModalStyle(direction) {
    if (currentCategoryStyles.length <= 1) return;

    // 새 인덱스 계산 (순환)
    currentStyleIndex += direction;
    if (currentStyleIndex < 0) {
        currentStyleIndex = currentCategoryStyles.length - 1;
    } else if (currentStyleIndex >= currentCategoryStyles.length) {
        currentStyleIndex = 0;
    }

    const newStyle = currentCategoryStyles[currentStyleIndex];
    console.log(`🔄 슬라이딩: ${currentStyleIndex + 1}/${currentCategoryStyles.length} - ${newStyle.name || newStyle.id}`);

    // 햅틱 피드백
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    // 이미지 페이드 효과로 전환
    const container = document.getElementById('mediaViewerContainer');
    const img = container?.querySelector('.modal-zoom-image');
    const indicator = container?.querySelector('.modal-nav-indicator');

    // 원본 이미지 URL (폴백 포함)
    const newStyleImageUrl = getOriginalImageUrl(newStyle);

    if (img) {
        // 페이드 아웃
        img.style.opacity = '0.3';

        setTimeout(() => {
            // 새 이미지로 교체
            img.src = newStyleImageUrl;
            img.alt = newStyle.name || 'Style';

            // 페이드 인
            img.style.opacity = '1';

            // 인디케이터 업데이트
            if (indicator) {
                indicator.textContent = `${currentStyleIndex + 1} / ${currentCategoryStyles.length}`;
            }
        }, 150);
    }

    // 모달 하단 정보도 업데이트
    const modalCode = document.getElementById('styleModalCode');
    const modalName = document.getElementById('styleModalName');
    const modalCategory = document.getElementById('styleModalCategory');
    const modalSubcategory = document.getElementById('styleModalSubcategory');

    if (modalCode) modalCode.textContent = newStyle.code || 'NO CODE';
    if (modalName) modalName.textContent = newStyle.name || '이름 없음';
    if (modalCategory) modalCategory.textContent = newStyle.mainCategory || '-';
    if (modalSubcategory) modalSubcategory.textContent = newStyle.subCategory || '-';

    // Lookbook 버튼 데이터도 업데이트
    const btnLookbook = document.getElementById('btnOpenLookbook');
    if (btnLookbook) {
        btnLookbook.onclick = function() {
            openAIPhotoModal(newStyle.id, newStyle.name, newStyleImageUrl);
        };
    }
}

// ========== 전체화면 모드 감지 ==========

/**
 * 전체화면 모드 감지 (네이티브 앱에서 전체화면일 때 레이아웃 조정)
 * - display-mode: fullscreen/standalone 미디어 쿼리
 * - 또는 네이티브 앱에서 window.isFullscreen 변수 전달
 */
function detectFullscreenMode() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isNativeFullscreen = window.isFullscreen === true || window.webkit?.messageHandlers?.fullscreen;

    // iOS WebView 감지 (네이티브 앱 내에서 실행 중인지)
    const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) ||
                         (window.webkit && window.webkit.messageHandlers);

    // 태블릿 가로모드 감지
    const isTabletLandscape = window.innerWidth >= 768 && window.innerWidth > window.innerHeight;

    if (isStandalone || isFullscreen || isNativeFullscreen || (isIOSWebView && isTabletLandscape)) {
        document.body.classList.add('fullscreen-mode');
        console.log('📱 전체화면 모드 감지됨 - 레이아웃 조정 적용');

        // 전체화면 감지 시 Firebase에서 브랜드 설정 로드
        setTimeout(async () => {
            if (typeof window.loadBrandFromFirebase === 'function') {
                const firebaseBrand = await window.loadBrandFromFirebase();
                if (firebaseBrand) {
                    if (typeof applyCustomBrand === 'function') applyCustomBrand();
                    if (typeof applyProfileImage === 'function') applyProfileImage();
                    console.log('📱 전체화면 감지 - 브랜드 설정 로드 완료');
                }
            }
        }, 1000);
    }

    // 전체화면 상태 변경 감지
    window.matchMedia('(display-mode: fullscreen)').addEventListener('change', (e) => {
        if (e.matches) {
            document.body.classList.add('fullscreen-mode');
        } else {
            document.body.classList.remove('fullscreen-mode');
        }
    });

    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
        if (e.matches) {
            document.body.classList.add('fullscreen-mode');
        } else {
            document.body.classList.remove('fullscreen-mode');
        }
    });

    // 화면 회전/리사이즈 시 재감지
    window.addEventListener('resize', () => {
        const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent) ||
                             (window.webkit && window.webkit.messageHandlers);
        const isTabletLandscape = window.innerWidth >= 768 && window.innerWidth > window.innerHeight;

        if (isIOSWebView && isTabletLandscape) {
            document.body.classList.add('fullscreen-mode');
        }
    });
}

// 네이티브 앱에서 호출 가능한 전체화면 모드 설정 함수
window.setFullscreenMode = function(isFullscreen) {
    if (isFullscreen) {
        document.body.classList.add('fullscreen-mode');
        console.log('📱 전체화면 모드 활성화 (네이티브 호출)');

        // 전체화면 전환 시 Firebase에서 브랜드 설정 다시 로드
        setTimeout(async () => {
            if (typeof loadBrandFromFirebase === 'function') {
                const firebaseBrand = await loadBrandFromFirebase();
                if (firebaseBrand) {
                    if (typeof applyCustomBrand === 'function') applyCustomBrand();
                    if (typeof applyProfileImage === 'function') applyProfileImage();
                    console.log('📱 전체화면 모드 - 브랜드 설정 재적용 완료');
                }
            }
        }, 500);
    } else {
        document.body.classList.remove('fullscreen-mode');
        console.log('📱 전체화면 모드 비활성화 (네이티브 호출)');
    }
};

// ⭐ 전역 진단 함수: 이미지 URL 샘플 비교
window.compareImageUrls = async function() {
    console.log('🔍 남녀 이미지 URL 패턴 비교...');

    for (const gender of ['male', 'female']) {
        const snapshot = await db.collection('hairstyles')
            .where('gender', '==', gender)
            .limit(5)
            .get();

        console.log(`📷 ${gender} 이미지 URL 샘플:`);
        snapshot.forEach(doc => {
            const data = doc.data();
            const url = data.thumbnailUrl || data.imageUrl || 'NO URL';
            console.log(`   ${data.mainCategory}/${data.subCategory}: ${url.substring(0, 100)}...`);
        });
    }
};

// ⭐ 전역 진단 함수: 남녀 Firestore 데이터 비교
window.compareGenderData = async function() {
    console.log('🔍 남녀 Firestore 데이터 비교 시작...');

    const results = { male: {}, female: {} };

    for (const gender of ['male', 'female']) {
        const snapshot = await db.collection('hairstyles')
            .where('gender', '==', gender)
            .get();

        let total = 0;
        let withThumb = 0;
        let withThumbsPath = 0;
        let firebaseHost = 0;
        let rnbsoftHost = 0;
        let otherHost = 0;
        let avgDocSize = 0;
        const mainCats = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            total++;
            avgDocSize += JSON.stringify(data).length;

            // mainCategory별 카운트
            const mc = data.mainCategory || 'unknown';
            mainCats[mc] = (mainCats[mc] || 0) + 1;

            // thumbnailUrl 분석
            const url = data.thumbnailUrl || data.imageUrl || '';
            if (data.thumbnailUrl) {
                withThumb++;
                if (data.thumbnailUrl.includes('/thumbs/')) withThumbsPath++;
            }
            if (url.includes('firebasestorage')) firebaseHost++;
            else if (url.includes('rnbsoft')) rnbsoftHost++;
            else if (url) otherHost++;
        });

        results[gender] = {
            총문서수: total,
            thumbnailUrl있음: withThumb,
            thumbnailUrl비율: Math.round((withThumb/total)*100) + '%',
            thumbs경로사용: withThumbsPath,
            Firebase호스팅: firebaseHost,
            RNBsoft호스팅: rnbsoftHost,
            기타호스팅: otherHost,
            평균문서크기: Math.round(avgDocSize/total) + 'bytes',
            mainCategory별: mainCats
        };
    }

    console.log('📊 남자 데이터:', results.male);
    console.log('📊 여자 데이터:', results.female);

    // ⭐ 카테고리별 상세 출력
    console.log('📂 남자 mainCategory별:');
    Object.entries(results.male.mainCategory별).forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}개`);
    });

    console.log('📂 여자 mainCategory별:');
    Object.entries(results.female.mainCategory별).forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}개`);
    });

    console.log('🔴 차이점:', {
        문서수차이: results.male.총문서수 - results.female.총문서수,
        thumb비율차이: results.male.thumbnailUrl있음 - results.female.thumbnailUrl있음
    });

    return results;
};

// ========== 이벤트 리스너 ==========

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function () {
    console.log('HAIRGATOR 메뉴 시스템 로드 완료 - 헤어체험 연동 최종 버전');

    // 전체화면 모드 감지 (네이티브 앱)
    detectFullscreenMode();

    // 엑스 버튼 클릭/터치 이벤트 (네이티브 앱 대응)
    const closeBtn = document.getElementById('styleModalClose');
    if (closeBtn) {
        // 클릭 이벤트
        closeBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 엑스 버튼 클릭됨');
            closeStyleModal();
        });

        // ⭐ 터치 이벤트도 추가 (태블릿 대응)
        closeBtn.addEventListener('touchend', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 엑스 버튼 터치됨');
            closeStyleModal();
        });

        console.log('✅ 엑스 버튼 이벤트 리스너 등록 완료 (click + touchend)');
    } else {
        console.warn('⚠️ styleModalClose 버튼을 찾을 수 없습니다');
    }

    // 모달 바깥 클릭 시 닫기
    document.addEventListener('click', function (e) {
        const styleModal = document.getElementById('styleModal');
        if (styleModal && e.target === styleModal) {
            console.log('🔘 모달 배경 클릭됨');
            closeStyleModal();
        }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const styleModal = document.getElementById('styleModal');
            if (styleModal && styleModal.classList.contains('active')) {
                console.log('⌨️ ESC 키 눌림');
                closeStyleModal();
            }
        }
    });
});

// ========== 전역 함수 노출 ==========
window.HAIRGATOR_MENU = {
    loadMenuForGender,
    selectMainTab,
    selectSubTab,
    loadStyles,
    createStyleCard,
    openStyleModal,
    closeStyleModal,
    openAIPhotoModal: openAIPhotoModal,
    closeAIPhotoModal: closePhotoUploadModal,
    updateCategoryDescription,
    showToast,
    checkSubcategoriesAndNew,
    navigateModalStyle,  // ⭐ 모달 스와이프용 추가
    // 전역 변수 getter 추가
    getCurrentGender: () => currentGender,
    getCurrentMainTab: () => currentMainTab,
    getCurrentSubTab: () => currentSubTab,
    // 모달 슬라이딩용 getter/setter
    getCategoryStyles: () => currentCategoryStyles,
    getStyleIndex: () => currentStyleIndex,
    // 카테고리 데이터 getter 추가 (tablet-touch-handler.js에서 사용)
    getCategories: (gender) => gender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES,
    getMaleCategories: () => MALE_CATEGORIES,
    getFemaleCategories: () => FEMALE_CATEGORIES
};

// ⭐ 전역 함수로도 노출 (스와이프 이벤트에서 직접 호출용)
window.navigateModalStyle = navigateModalStyle;

// ⭐ style-match iframe에서 호출용
window.openStyleModal = openStyleModal;

// HTML에서 직접 호출되는 전역 함수 추가
window.selectGender = function (gender) {
    console.log(`성별 선택: ${gender}`);

    // 현재 성별 전역 변수 설정
    currentGender = gender;
    window.currentGender = gender;

    // ⭐ sessionStorage에도 저장 (AI Studio 뒤로가기 시 복원용)
    sessionStorage.setItem('hairgatorGender', gender);

    // 크리스마스 효과 제거 (다크모드 + 라이트모드 모두)
    document.querySelectorAll('.snowflake, .snow-pile, .christmas-tree, .christmas-gifts, .snowball-fight-container, .rudolph-decoration, .merry-christmas-light, .footprints-container').forEach(el => el.remove());

    // 성별 선택 화면 완전히 숨기기
    const genderSelection = document.getElementById('genderSelection');
    const menuContainer = document.getElementById('menuContainer');
    const backBtn = document.getElementById('backBtn');

    if (genderSelection) {
        genderSelection.style.display = 'none';
        genderSelection.classList.remove('active');
        genderSelection.style.zIndex = '-1';
        genderSelection.style.visibility = 'hidden';
    }

    if (menuContainer) {
        menuContainer.style.display = 'block';
        menuContainer.classList.add('active');
        menuContainer.style.zIndex = '1000';
        menuContainer.style.visibility = 'visible';
    }

    if (backBtn) {
        backBtn.style.display = 'flex';
    }

    // 스마트 메뉴 시스템 로드
    loadMenuForGender(gender);
};

// 헤어체험 관련 전역 함수 노출
window.changeCustomerPhoto = changeCustomerPhoto;
window.closePhotoUploadModal = closePhotoUploadModal;
window.selectPhotoFromGallery = selectPhotoFromGallery;
window.takePhotoWithCamera = takePhotoWithCamera;
window.processAIFaceSwap = processAIFaceSwap;
window.closeHairTryResult = closeHairTryResult;
window.retryHairTry = retryHairTry;
window.closeCameraModal = closeCameraModal;
window.switchCamera = switchCamera;
window.capturePhoto = capturePhoto;
window.saveHairTryResult = saveHairTryResult;
window.closeSaveImageOverlay = closeSaveImageOverlay;

// 디버깅용 전역 함수
window.debugHAIRGATOR = function () {
    const tabs = document.querySelectorAll('.category-tab, .main-tab');
    console.log(`발견된 탭: ${tabs.length}개`);

    tabs.forEach((tab, index) => {
        const rect = tab.getBoundingClientRect();
        const events = [];
        const hasNewIndicator = !!tab.querySelector('.new-indicator');

        if (tab.onclick) events.push('onclick');
        if (tab.addEventListener) {
            events.push('addEventListener');
        }

        console.log(`탭 ${index}: "${tab.textContent}"
        - 크기: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}
        - 위치: ${rect.left.toFixed(1)}, ${rect.top.toFixed(1)}
        - 이벤트: ${events.join(', ')}
        - NEW 표시: ${hasNewIndicator ? '🔴' : '⚪'}
        - 클래스: ${tab.className}`);
    });

    console.log('전역 변수 상태:', {
        currentGender,
        currentMainTab: currentMainTab?.name,
        currentSubTab,
        windowGender: window.currentGender,
        windowMainTab: window.currentMainTab?.name,
        windowSubTab: window.currentSubTab,
        categoryNewCounts: Object.fromEntries(categoryNewCounts)
    });
};

console.log('HAIRGATOR 스마트 메뉴 시스템 초기화 완료 - 헤어체험 연동 최종 버전');
console.log('디버깅: window.debugHAIRGATOR() 실행 가능');

// ========== 뒤로가기 함수 (menu.js 끝부분에 추가) ==========

/**
 * 뒤로가기 버튼 핸들러
 * 메뉴 화면에서 성별 선택 화면으로 돌아가기
 */
window.goBack = function () {
    console.log('🔙 뒤로가기 버튼 클릭');

    // 메뉴 컨테이너 숨기기
    const menuContainer = document.getElementById('menuContainer');
    if (menuContainer) {
        menuContainer.style.display = 'none';
        menuContainer.classList.remove('active');
        console.log('✅ 메뉴 컨테이너 숨김');
    }

    // 성별 선택 화면 다시 표시
    const genderSelection = document.getElementById('genderSelection');
    if (genderSelection) {
        genderSelection.classList.remove('active');
        genderSelection.style.display = 'flex';
        genderSelection.style.position = 'relative';
        genderSelection.style.zIndex = '1';
        genderSelection.style.opacity = '1';
        genderSelection.style.visibility = 'visible';
        console.log('✅ 성별 선택 화면 표시');
    }

    // 뒤로가기 버튼 숨기기
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.style.display = 'none';
        console.log('✅ 뒤로가기 버튼 숨김');
    }

    // 성별 초기화
    currentGender = null;
    window.currentGender = null;
    console.log('✅ 성별 초기화 완료');

    // 크리스마스 효과 다시 생성 (눈내리기만)
    setTimeout(() => {
        if (typeof window.createSnowflakes === 'function') window.createSnowflakes();
    }, 300);
};

// ========== 레시피 보기 기능 ==========

// 카테고리 → 시리즈 매핑
const CATEGORY_TO_SERIES = {
    // 남자 스타일
    'SIDE FRINGE': 'SF',
    'SIDE PART': 'SP',
    'FRINGE UP': 'FU',
    'PUSHED BACK': 'PB',
    'BUZZ': 'BZ',
    'CROP': 'CP',
    'MOHICAN': 'MC',
    'TWO BLOCK': 'TB',
    // 여자 스타일 (첫 글자 추출)
    'A LENGTH': { code: 'A', cutSeries: 'FAL', permSeries: 'FALP' },
    'B LENGTH': { code: 'B', cutSeries: 'FBL', permSeries: 'FBLP' },
    'C LENGTH': { code: 'C', cutSeries: 'FCL', permSeries: 'FCLP' },
    'D LENGTH': { code: 'D', cutSeries: 'FDL', permSeries: 'FDLP' },
    'E LENGTH': { code: 'E', cutSeries: 'FEL', permSeries: 'FELP' },
    'F LENGTH': { code: 'F', cutSeries: 'FFL', permSeries: 'FFLP' },
    'G LENGTH': { code: 'G', cutSeries: 'FGL', permSeries: 'FGLP' },
    'H LENGTH': { code: 'H', cutSeries: 'FHL', permSeries: 'FHLP' }
};

// AI Studio로 레시피 페이지 이동
function navigateToRecipe(style, service = 'cut') {
    const gender = style.gender || 'female';
    const mainCategory = style.mainCategory || '';

    let categoryCode = '';
    let series = '';

    if (gender === 'male') {
        // 남자: mainCategory에서 시리즈 코드 추출
        series = CATEGORY_TO_SERIES[mainCategory] || mainCategory.substring(0, 2).toUpperCase();
        categoryCode = series;
    } else {
        // 여자: mainCategory에서 기장 코드 추출
        const mapping = CATEGORY_TO_SERIES[mainCategory];
        if (mapping && typeof mapping === 'object') {
            categoryCode = mapping.code;
            series = service === 'perm' ? mapping.permSeries : mapping.cutSeries;
        } else {
            // fallback: 첫 글자 추출
            categoryCode = mainCategory.charAt(0).toUpperCase();
            series = service === 'perm' ? `F${categoryCode}LP` : `F${categoryCode}L`;
        }
    }

    // URL 파라미터 구성
    const recipeImageUrl = getOriginalImageUrl(style);
    const params = new URLSearchParams({
        autoRecipe: 'true',
        imageUrl: recipeImageUrl,
        gender: gender,
        service: service,
        category: categoryCode,
        series: series,
        styleName: style.name || '',
        styleId: style.styleId || style.id || ''
    });

    console.log('📋 레시피 페이지 이동:', {
        gender,
        service,
        categoryCode,
        series,
        imageUrl: recipeImageUrl
    });

    // 스타일 모달 닫기
    closeStyleModal();

    // ⭐ sessionStorage에 성별 저장 (뒤로가기 시 복원용)
    sessionStorage.setItem('hairgatorGender', gender);

    // AI Studio 페이지로 이동
    window.location.href = `/ai-studio.html?${params.toString()}`;
}

// 여자 스타일용 커트/펌 선택 모달
function showRecipeTypeModal(style) {
    // 기존 모달이 있으면 제거
    const existingModal = document.querySelector('.recipe-type-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'recipe-type-modal';

    // 성별 기반 테마 색상
    const primaryColor = '#E91E63';
    const primaryDark = '#C2185B';

    // 원본 이미지 URL (폴백 포함)
    const stylePreviewImage = getOriginalImageUrl(style);

    modal.innerHTML = `
        <div class="recipe-type-overlay" onclick="closeRecipeTypeModal()"></div>
        <div class="recipe-type-content">
            <div class="recipe-type-header">
                <h3>📋 ${t('recipe.selectType') || '레시피 유형 선택'}</h3>
                <p>${style.name}</p>
                <button class="recipe-type-close" onclick="closeRecipeTypeModal()">×</button>
            </div>
            <div class="recipe-type-preview">
                <img src="${stylePreviewImage}" alt="${style.name}" />
            </div>
            <div class="recipe-type-buttons">
                <button class="recipe-type-btn cut-btn" onclick="selectRecipeType('${style.id}', 'cut')">
                    <span class="recipe-type-icon">✂️</span>
                    <span class="recipe-type-label">${t('recipe.cutRecipe') || '커트 레시피'}</span>
                </button>
                <button class="recipe-type-btn perm-btn" onclick="selectRecipeType('${style.id}', 'perm')">
                    <span class="recipe-type-icon">🌀</span>
                    <span class="recipe-type-label">${t('recipe.permRecipe') || '펌 레시피'}</span>
                </button>
            </div>
        </div>
    `;

    // 스타일 추가
    addRecipeTypeModalStyles();

    // 모달에 스타일 데이터 저장
    modal.dataset.style = JSON.stringify(style);

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // 애니메이션
    setTimeout(() => modal.classList.add('active'), 10);
}

// 레시피 유형 선택 처리
function selectRecipeType(styleId, service) {
    const modal = document.querySelector('.recipe-type-modal');
    if (!modal) return;

    try {
        const style = JSON.parse(modal.dataset.style);
        closeRecipeTypeModal();
        navigateToRecipe(style, service);
    } catch (e) {
        console.error('레시피 유형 선택 오류:', e);
        closeRecipeTypeModal();
    }
}

// 레시피 유형 모달 닫기
function closeRecipeTypeModal() {
    const modal = document.querySelector('.recipe-type-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// 레시피 유형 모달 스타일
function addRecipeTypeModalStyles() {
    if (document.getElementById('recipe-type-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'recipe-type-modal-styles';
    style.textContent = `
        .recipe-type-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }

        .recipe-type-modal.active {
            opacity: 1;
            visibility: visible;
        }

        .recipe-type-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: -1;
        }

        .recipe-type-content {
            background: #1a1a1a;
            border-radius: 20px;
            padding: 24px;
            max-width: 380px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            transform: translateY(20px);
            transition: transform 0.3s ease;
        }

        .recipe-type-modal.active .recipe-type-content {
            transform: translateY(0);
        }

        .recipe-type-header {
            text-align: center;
            margin-bottom: 16px;
            position: relative;
        }

        .recipe-type-header h3 {
            color: #fff;
            font-size: 18px;
            margin: 0 0 8px 0;
        }

        .recipe-type-header p {
            color: #aaa;
            font-size: 14px;
            margin: 0;
        }

        .recipe-type-close {
            position: absolute;
            top: -5px;
            right: -5px;
            width: 32px;
            height: 32px;
            border: none;
            background: rgba(255,255,255,0.1);
            color: #fff;
            font-size: 20px;
            border-radius: 50%;
            cursor: pointer;
            transition: background 0.2s;
        }

        .recipe-type-close:hover {
            background: rgba(255,255,255,0.2);
        }

        .recipe-type-preview {
            margin-bottom: 20px;
            text-align: center;
        }

        .recipe-type-preview img {
            width: 120px;
            height: 120px;
            object-fit: cover;
            border-radius: 12px;
            border: 2px solid rgba(255,255,255,0.1);
        }

        .recipe-type-buttons {
            display: flex;
            gap: 12px;
        }

        .recipe-type-btn {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 20px 16px;
            border: none;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            color: #fff;
            font-weight: 600;
        }

        .recipe-type-btn.cut-btn {
            background: linear-gradient(135deg, #FF9800 0%, #F57C00 50%, #E65100 100%);
            box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
        }

        .recipe-type-btn.perm-btn {
            background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 50%, #6A1B9A 100%);
            box-shadow: 0 4px 15px rgba(156, 39, 176, 0.4);
        }

        .recipe-type-btn:hover {
            transform: translateY(-2px);
        }

        .recipe-type-btn:active {
            transform: translateY(0);
        }

        .recipe-type-icon {
            font-size: 32px;
        }

        .recipe-type-label {
            font-size: 14px;
        }

        @media (max-width: 480px) {
            .recipe-type-content {
                padding: 20px;
            }

            .recipe-type-btn {
                padding: 16px 12px;
            }

            .recipe-type-icon {
                font-size: 28px;
            }

            .recipe-type-label {
                font-size: 13px;
            }
        }
    `;
    document.head.appendChild(style);
}

// 전역 함수 등록
window.selectRecipeType = selectRecipeType;
window.closeRecipeTypeModal = closeRecipeTypeModal;
window.navigateToRecipe = navigateToRecipe;

// ========== 기존 console.log 유지 ==========
console.log('HAIRGATOR 스마트 메뉴 시스템 초기화 완료 - 헤어체험 연동 최종 버전');
console.log('디버깅: window.debugHAIRGATOR() 실행 가능');
console.log('🔙 뒤로가기: window.goBack() 함수 등록 완료');
