// ========== HAIRGATOR 메뉴 시스템 - 헤어체험 연동 최종 버전 ==========

// ⭐ 모달 슬라이딩용 전역 변수
let currentCategoryStyles = [];  // 현재 카테고리의 모든 스타일
let currentStyleIndex = 0;       // 현재 표시 중인 스타일 인덱스

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

// ⭐ Pull-to-Refresh 비활성화 (웹뷰용) - 스크롤 가능 영역 제외
(function() {
    let lastY = 0;
    document.addEventListener('touchstart', function(e) {
        lastY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        const currentY = e.touches[0].clientY;

        // 스크롤 가능한 컨테이너 내부인지 확인
        let el = e.target;
        while (el && el !== document.body) {
            const style = window.getComputedStyle(el);
            const overflowY = style.overflowY;
            if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                // 스크롤 가능한 영역 내부면 기본 동작 허용
                return;
            }
            el = el.parentElement;
        }

        // 페이지 최상단에서 아래로 당길 때만 막기
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop <= 0 && currentY > lastY) {
            e.preventDefault();
        }
    }, { passive: false });
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

    // 캐시 우회: updatedAt 또는 현재 날짜를 캐시 버스터로 사용
    if (url && style.updatedAt) {
        const cacheBuster = style.updatedAt.seconds || style.updatedAt;
        url += (url.includes('?') ? '&' : '?') + 'v=' + cacheBuster;
    }

    return url;
}

// ========== 룩북 크레딧 차감 (menu.js에서 호출) ==========
function deductLookbookCreditFromMenu(creditCost) {
    try {
        // 불나비 브릿지를 통해 크레딧 차감 요청
        if (window.BullnabiBridge && typeof window.BullnabiBridge.requestCreditDeduction === 'function') {
            window.BullnabiBridge.requestCreditDeduction('lookbook', creditCost);
            console.log(`💳 룩북 크레딧 차감 요청 (BullnabiBridge): ${creditCost}`);
        } else {
            console.warn('⚠️ BullnabiBridge가 없습니다. 로컬 크레딧만 업데이트합니다.');
        }

        // 로컬 UI 업데이트 (불나비 사용자인 경우)
        const bullnabiUser = localStorage.getItem('bullnabi_user');
        if (bullnabiUser) {
            try {
                const user = JSON.parse(bullnabiUser);
                if (user.remainCount !== undefined) {
                    // 부동소수점 오류 방지: 소수점 첫째자리까지 반올림
                    user.remainCount = Math.round(Math.max(0, user.remainCount - creditCost) * 10) / 10;
                    localStorage.setItem('bullnabi_user', JSON.stringify(user));
                    console.log(`💳 로컬 크레딧 업데이트: ${user.remainCount}`);

                    // UI 실시간 업데이트
                    if (typeof updateUserInfo === 'function') {
                        updateUserInfo();
                    }

                    // currentDesigner 업데이트
                    if (window.currentDesigner) {
                        window.currentDesigner.tokens = user.remainCount;
                    }
                }
            } catch (e) {
                console.warn('로컬 크레딧 업데이트 실패:', e);
            }
        }
    } catch (error) {
        console.error('크레딧 차감 오류:', error);
    }
}

// ========== 토큰 차감 확인 다이얼로그 ==========
function showTokenConfirmDialog(type) {
    return new Promise((resolve) => {
        // type: 'lookbook' 또는 'hairTry'
        const title = t(`${type}.confirmTitle`) || '토큰 차감 안내';
        const message = t(`${type}.confirmMessage`) || '0.2토큰이 차감됩니다.\n계속하시겠습니까?';
        const confirmText = t(`${type}.confirmButton`) || '동의';
        const cancelText = t(`${type}.cancelButton`) || '취소';

        // 성별에 따른 테마 색상
        const isMale = window.currentGender === 'male';
        const primaryColor = isMale ? '#4A90E2' : '#E91E63';
        const primaryColorLight = isMale ? '#5BA0F2' : '#F43D7A';
        const primaryColorDark = isMale ? '#3A7BC8' : '#C2185B';

        // 기존 다이얼로그가 있으면 제거
        const existingDialog = document.getElementById('token-confirm-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // 다이얼로그 생성
        const overlay = document.createElement('div');
        overlay.id = 'token-confirm-dialog';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 100000;
            backdrop-filter: blur(3px);
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: linear-gradient(145deg, #1a1a1a, #2d2d2d);
            border-radius: 16px;
            padding: 28px 32px;
            max-width: 340px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px ${primaryColor}33;
            text-align: center;
            animation: dialogSlideIn 0.3s ease-out;
        `;

        dialog.innerHTML = `
            <style>
                @keyframes dialogSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            </style>
            <div style="margin-bottom: 16px;">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                </svg>
            </div>
            <h3 style="color: ${primaryColor}; font-size: 18px; font-weight: 600; margin-bottom: 12px;">${title}</h3>
            <p style="color: #e0e0e0; font-size: 14px; line-height: 1.6; margin-bottom: 24px; white-space: pre-line;">${message}</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="tokenConfirmCancel" style="
                    flex: 1;
                    padding: 12px 20px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: transparent;
                    color: #999;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                ">${cancelText}</button>
                <button id="tokenConfirmOk" style="
                    flex: 1;
                    padding: 12px 20px;
                    border: none;
                    background: linear-gradient(135deg, ${primaryColor}, ${primaryColorDark});
                    color: #ffffff;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                ">${confirmText}</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 버튼 이벤트
        const confirmBtn = document.getElementById('tokenConfirmOk');
        const cancelBtn = document.getElementById('tokenConfirmCancel');

        confirmBtn.onclick = () => {
            overlay.remove();
            resolve(true);
        };

        cancelBtn.onclick = () => {
            overlay.remove();
            resolve(false);
        };

        // 배경 클릭시 취소
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        };

        // 호버 효과
        confirmBtn.onmouseenter = () => {
            confirmBtn.style.transform = 'scale(1.02)';
            confirmBtn.style.boxShadow = '0 4px 15px rgba(212, 165, 116, 0.4)';
        };
        confirmBtn.onmouseleave = () => {
            confirmBtn.style.transform = 'scale(1)';
            confirmBtn.style.boxShadow = 'none';
        };
        cancelBtn.onmouseenter = () => {
            cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            cancelBtn.style.color = '#ccc';
        };
        cancelBtn.onmouseleave = () => {
            cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            cancelBtn.style.color = '#999';
        };
    });
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
        description: '앞머리를 앞으로 내려 자연스럽게 흐르는 스타일、 넓은 이마를 돌출 시킨 역삼각형 얼굴형 보완에 효과적이며、 부드럽고 감성적인 이미지를 연출'
    },
    {
        id: 'side-part',
        name: 'SIDE PART',
        description: '가르마를 기준으로 나누는 스타일、 뒤로 넘기면 클래식、내리면 캐주얼、 다양한 얼굴형에 무난하고 활용도가 높음'
    },
    {
        id: 'fringe-up',
        name: 'FRINGE UP',
        description: '윗머리는 앞으로 흐르고、 앞머리 끝만 위로 올린 스타일이며、 이마를 적당히 드러내 시원하고 세련된 인상、 활동적이며 깔끔한 스타일을 연출'
    },
    {
        id: 'pushed-back',
        name: 'PUSHED BACK',
        description: '모발의 전체 흐름이 뒤쪽으로 자연스럽게 넘어가는 스타일、 이마를 드러내 단정＆클래식＆도희적 무드、 직장／포멀 룩과 잘 어울림'
    },
    {
        id: 'buzz',
        name: 'BUZZ',
        description: '남성 스타일 중 가장 짧은 커트 스타일、 두상 및 윤곽이 그대로 드러나 심플하고 군더더기 없는 이미지이며 관리가 매우 쉬움'
    },
    {
        id: 'crop',
        name: 'CROP',
        description: '버즈보다 조금 더 긴 길이이며 앞머리가 이마 상단을 가볍게 덮는 형태、 텍스처＆볼륨 표현이 가능하며 트렌디하고 시크한 느낌'
    },
    {
        id: 'mohican',
        name: 'MOHICAN',
        description: '톱（センター）부분을 위쪽으로 세워 강조하며 사이드가 상대적으로 짧아 코너 및 라인감이 또렷、 강한 개성 ＆ 에너지 ＆ 스트릿 무드 연출'
    }
];

// 여성 카테고리 (설명 포함)
const FEMALE_CATEGORIES = [
    {
        id: 'a-length',
        name: 'A LENGTH',
        description: 'A 길이는 가슴선 아래로 내려오는 롱헤어로, 원랭스·레이어드 롱·굵은 S컬이 잘 맞아 우아하고 드라마틱한 분위기를 냅니다.'
    },
    {
        id: 'b-length',
        name: 'B LENGTH',
        description: 'B 길이는 가슴 아래(A)와 쇄골 아래(C) 사이의 미디엄-롱으로, 레이어드 미디엄롱·바디펌이 어울려 부드럽고 실용적인 인상을 줍니다.'
    },
    {
        id: 'c-length',
        name: 'C LENGTH',
        description: 'C 길이는 쇄골 라인 아래의 세미 롱으로, 레이어드 C/S컬과 잘 맞아 단정하고 세련된 오피스 무드를 냅니다.'
    },
    {
        id: 'd-length',
        name: 'D LENGTH',
        description: 'D 길이는 어깨에 정확히 닿는 길이로, 숄더 C컬이 어울려 트렌디하고 깔끔한 느낌을 줍니다.'
    },
    {
        id: 'e-length',
        name: 'E LENGTH',
        description: 'E 길이는 어깨 바로 위의 단발로, 클래식 보브·A라인 보브·내/외 C컬이 잘 맞아 경쾌하고 모던한 인상을 만듭니다.'
    },
    {
        id: 'f-length',
        name: 'F LENGTH',
        description: 'F 길이는 턱선 바로 밑 보브 길이로, 프렌치 보브·일자 단발·텍스쳐 보브가 어울려 시크하고 도회적인 분위기를 연출합니다.'
    },
    {
        id: 'g-length',
        name: 'G LENGTH',
        description: 'G 길이는 턱선위 높이의 미니 보브로, 클래식 턱선 보브·미니 레이어 보브가 잘 맞아 똘똘하고 미니멀한 무드를 줍니다.'
    },
    {
        id: 'h-length',
        name: 'H LENGTH',
        description: 'H 길이는 귀선~베리숏구간의 숏헤어로, 활동적이고 개성 있는 스타일을 완성합니다.'
    }
];

// 중분류 (앞머리 길이)
const SUB_CATEGORIES = [
    'None',
    'Fore Head',
    'Eye Brow',
    'Eye',
    'Cheekbone'
];

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

// ========== 스마트 필터링 & NEW 표시 시스템 ==========

// 사용 가능한 서브카테고리 & NEW 아이템 확인 (인덱스 불필요 버전)
async function checkSubcategoriesAndNew(gender, categoryName) {
    // Firebase 조회용 이름 변환
    const dbCategoryName = categoryName.includes('LENGTH')
        ? categoryName.replace('LENGTH', 'Length')
        : categoryName;

    const cacheKey = `${gender}-${dbCategoryName}`;

    if (availableSubcategories.has(cacheKey)) {
        return availableSubcategories.get(cacheKey);
    }

    try {
        // 복합 인덱스 없이 작동하도록 수정
        const snapshot = await db.collection('hairstyles')
            .where('gender', '==', gender)
            .where('mainCategory', '==', dbCategoryName)
            .get();

        const availableSubs = new Set();
        const newCounts = {};
        let totalNewInCategory = 0;
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        snapshot.forEach(doc => {
            const data = doc.data();
            availableSubs.add(data.subCategory);

            // 클라이언트에서 7일 이내 확인 (Firebase 쿼리 대신)
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
            available: SUB_CATEGORIES,
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

        // DOM 준비 확인
        if (!document.getElementById('categoryTabs')) {
            console.warn('DOM 미준비 - 2초 후 재시도');
            setTimeout(() => loadMenuForGender(gender), 2000);
            return;
        }

        // body에 gender 클래스 추가
        document.body.classList.remove('gender-male', 'gender-female');
        document.body.classList.add(`gender-${gender}`);

        // 캐시 초기화
        availableSubcategories.clear();
        categoryNewCounts.clear();

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
async function createMainTabsWithSmart(categories, gender) {
    const mainTabsContainer = document.getElementById('categoryTabs');
    if (!mainTabsContainer) {
        console.error('categoryTabs 요소를 찾을 수 없습니다');
        return;
    }

    mainTabsContainer.innerHTML = '';

    // 모든 카테고리의 서브카테고리 정보를 병렬로 확인
    const categoryPromises = categories.map(category =>
        checkSubcategoriesAndNew(gender, category.name)
    );
    const categoryInfos = await Promise.all(categoryPromises);

    categories.forEach((category, index) => {
        const tab = document.createElement('button');
        tab.className = `category-tab main-tab ${gender}`;
        tab.textContent = category.name; // 영어로 통일
        tab.onclick = () => selectMainTab(category, index);

        const categoryInfo = categoryInfos[index];

        // 첫 번째 탭 기본 선택
        if (index === 0) {
            tab.classList.add('active');
            currentMainTab = category;
            window.currentMainTab = category; // window 동기화
            console.log(`기본 선택: ${category.name}`, category);
        }

        // NEW 표시 추가 (카테고리에 신규 아이템이 있으면)
        if (categoryInfo.totalNewCount > 0) {
            tab.appendChild(createNewIndicator());
            console.log(`NEW 표시 추가: ${category.name} (${categoryInfo.totalNewCount}개)`);
        }

        mainTabsContainer.appendChild(tab);

        console.log(`카테고리 생성: ${category.name} (신규: ${categoryInfo.totalNewCount}개)`);
    });

    console.log(`${categories.length}개 대분류 탭 생성 완료`);
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

// 대분류 탭 선택
async function selectMainTab(category, index) {
    currentMainTab = category;
    window.currentMainTab = category; // window 전역 변수 동기화

    console.log(`대분류 선택: ${category.name}`, category);

    // 탭 활성화 상태 변경
    document.querySelectorAll('.main-tab').forEach((tab, i) => {
        tab.classList.remove('active', 'male', 'female');
        if (i === index) {
            tab.classList.add('active', currentGender);
        }
    });

    // 카테고리 설명 업데이트
    updateCategoryDescription(category);

    // 스마트 중분류 탭 표시
    await loadSmartSubTabs(category.name);

    // 스타일 로드
    loadStyles();
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
    const subTabsContainer = document.getElementById('subTabs');
    if (!subTabsContainer) {
        console.error('subTabs 요소를 찾을 수 없습니다');
        return;
    }

    subTabsContainer.innerHTML = '';

    // 해당 카테고리의 서브카테고리 정보 가져오기
    const subInfo = await checkSubcategoriesAndNew(currentGender, categoryName);

    let firstAvailableIndex = -1;

    SUB_CATEGORIES.forEach((subCategory, index) => {
        const tab = document.createElement('button');
        tab.className = `sub-tab ${currentGender}`;
        tab.textContent = subCategory; // 영어로 통일

        // 사용 가능한 서브카테고리인지 확인
        const isAvailable = subInfo.available.includes(subCategory);

        if (!isAvailable) {
            // 스타일이 없는 서브카테고리 - 비활성화
            tab.classList.add('disabled');
            tab.style.opacity = '0.3';
            tab.style.cursor = 'not-allowed';
            tab.style.pointerEvents = 'none';
        } else {
            // 사용 가능한 서브카테고리
            tab.onclick = () => selectSubTab(subCategory, index);

            // 첫 번째 사용 가능한 서브카테고리를 활성화
            if (firstAvailableIndex === -1) {
                firstAvailableIndex = index;
                tab.classList.add('active');
                currentSubTab = subCategory;
                window.currentSubTab = subCategory; // window 동기화
            }

            // NEW 표시 추가
            const newCount = subInfo.newCounts[subCategory];
            if (newCount && newCount > 0) {
                tab.appendChild(createNewIndicator());
                console.log(`중분류 NEW 표시: ${subCategory} (${newCount}개)`);
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

// 스타일 로드 - Firebase Query 최종 안정화
async function loadStyles() {
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

    console.log(`스타일 검색 시작:`, {
        gender: currentGender,
        mainCategory: dbMainCategoryName,
        subCategory: subCategoryName
    });

    // 로딩 상태 표시
    showLoadingState(stylesGrid);

    try {
        // Firebase 연결 확인
        if (typeof db === 'undefined') {
            throw new Error('Firebase가 초기화되지 않았습니다');
        }

        // 서버에서 최신 데이터 강제 로드 (캐시 우회)
        const querySnapshot = await db.collection('hairstyles')
            .where('gender', '==', currentGender)
            .where('mainCategory', '==', dbMainCategoryName)
            .where('subCategory', '==', subCategoryName)
            .get({ source: 'server' })
            .catch(() => {
                // 서버 연결 실패 시 캐시에서 로드
                console.log('서버 연결 실패, 캐시에서 로드');
                return db.collection('hairstyles')
                    .where('gender', '==', currentGender)
                    .where('mainCategory', '==', dbMainCategoryName)
                    .where('subCategory', '==', subCategoryName)
                    .get();
            });

        if (querySnapshot.empty) {
            console.log(`스타일 없음: ${mainCategoryName} - ${subCategoryName}`);
            showEmptyState(stylesGrid);
            return;
        }

        // 스타일 카드 생성 (스태거 애니메이션 포함)
        stylesGrid.innerHTML = '';
        const fragment = document.createDocumentFragment();

        // ⭐ 전역 배열 초기화 (모달 슬라이딩용)
        currentCategoryStyles = [];

        let styleCount = 0;
        querySnapshot.forEach(doc => {
            const style = { ...doc.data(), id: doc.id };
            currentCategoryStyles.push(style);  // ⭐ 전역 배열에 저장
            const card = createStyleCard(style, styleCount);
            fragment.appendChild(card);
            styleCount++;
        });

        stylesGrid.appendChild(fragment);

        console.log(`${styleCount}개 스타일 로드 완료: ${mainCategoryName} - ${subCategoryName} (슬라이딩용 저장)`);

    } catch (error) {
        console.error('스타일 로드 오류:', error);
        showErrorState(stylesGrid, `로드 실패: ${error.message}`);
    }
}

// 스타일 카드 생성 (NEW 표시 + 스태거 애니메이션 포함)
function createStyleCard(style, index = 0) {
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

    card.innerHTML = `
        <div class="style-image-wrapper" style="width: 100% !important; height: 100% !important; position: relative !important; display: block !important; padding: 0 !important; margin: 0 !important; overflow: hidden !important; border-radius: 20px !important;">
            <img class="style-image"
                 src="${thumbnailUrl || ''}"
                 data-original="${style.imageUrl || ''}"
                 alt="${style.name || 'Style'}"
                 loading="lazy"
                 style="width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; border-radius: 20px !important; margin: 0 !important; padding: 0 !important; transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 300 400%22%3E%3Crect fill=%22%23333%22 width=%22300%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2220%22%3ENo Image%3C/text%3E%3C/svg%3E'">

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

// 스타일 상세 모달 열기 (헤어체험 버튼 추가)
async function openStyleModal(style) {
    console.log('🔍 openStyleModal 호출됨:', style);

    const modal = document.getElementById('styleModal');
    if (!modal) {
        console.error('❌ styleModal 요소를 찾을 수 없습니다');
        alert('모달을 열 수 없습니다');
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
                const snapshot = await window.db.collection('styles')
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

        container.innerHTML = `
            <div class="media-viewer" style="width: 100%; background: transparent;">
                <div class="main-display" style="position: relative; width: 100%; display: flex; align-items: center; justify-content: center; line-height: 0;">
                    ${navIndicatorHTML}
                    <img src="${style.imageUrl || ''}"
                         alt="${style.name || 'Style'}"
                         class="modal-zoom-image"
                         style="width: 100%; height: auto; object-fit: cover; max-height: 70vh; cursor: zoom-in; transition: max-height 0.3s ease, transform 0.3s ease, opacity 0.2s ease; display: block; border-radius: 18px 18px 0 0;"
                         onerror="this.style.background='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; this.alt='이미지 로드 실패';">
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

        console.log('✅ 이미지 렌더링 완료');
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
        const LOOKBOOK_CREDIT_COST = 0.2; // 룩북 사용 비용

        // 크레딧 확인 함수
        const getUserCredits = () => {
            try {
                const bullnabiUser = localStorage.getItem('bullnabi_user');
                if (bullnabiUser) {
                    const user = JSON.parse(bullnabiUser);
                    return user.remainCount || 0;
                }
            } catch (e) {
                console.warn('크레딧 확인 실패:', e);
            }
            return 0;
        };

        // 크레딧 부족 여부 확인
        const hasEnoughCredits = () => {
            const credits = getUserCredits();
            return credits >= LOOKBOOK_CREDIT_COST;
        };

        // 다국어 버튼 텍스트 설정 (SVG 아이콘 유지)
        const lookbookText = t('lookbook.button') || 'Lookbook';
        const svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>`;
        btnLookbook.innerHTML = `${svgIcon}<span>${lookbookText}</span>`;

        // 크레딧 상태에 따라 버튼 스타일 업데이트
        const updateButtonState = () => {
            if (!hasEnoughCredits()) {
                btnLookbook.style.opacity = '0.5';
                btnLookbook.style.cursor = 'not-allowed';
                btnLookbook.title = t('lookbook.noCredits') || '크레딧이 부족합니다';
            } else {
                btnLookbook.style.opacity = '1';
                btnLookbook.style.cursor = 'pointer';
                btnLookbook.title = '';
            }
        };

        // 초기 상태 설정
        updateButtonState();

        btnLookbook.onclick = async function (e) {
            e.stopPropagation();

            // 크레딧 체크
            if (!hasEnoughCredits()) {
                const currentCredits = getUserCredits();
                const message = t('lookbook.insufficientCredits') ||
                    `크레딧이 부족합니다. (현재: ${currentCredits}, 필요: ${LOOKBOOK_CREDIT_COST})`;

                // 토스트 메시지 또는 알림
                if (typeof showToast === 'function') {
                    showToast(message, 'error');
                } else {
                    alert(message);
                }
                console.warn('💳 크레딧 부족:', { current: currentCredits, required: LOOKBOOK_CREDIT_COST });
                return;
            }

            // 토큰 차감 확인 다이얼로그 표시
            const confirmed = await showTokenConfirmDialog('lookbook');
            if (!confirmed) {
                console.log('📖 Lookbook 사용자가 취소함');
                return;
            }

            const genderValue = currentGender || window.currentGender || 'female';
            console.log('📖 Lookbook 분석 시작:', style.name, '성별:', genderValue);

            // 로딩 오버레이 생성 및 표시
            const loadingOverlay = createLookbookLoadingOverlay();
            document.body.appendChild(loadingOverlay);

            try {
                // API 호출하여 분석 및 이미지 생성
                const response = await fetch('/.netlify/functions/lookbook-analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageUrl: style.imageUrl,
                        language: window.currentLanguage || 'ko',
                        generateImages: true,
                        gender: genderValue,
                        category: style.mainCategory || '',
                        subcategory: style.subCategory || '',
                        styleName: style.name || ''
                    })
                });

                if (!response.ok) {
                    throw new Error(`API 오류: ${response.status}`);
                }

                const result = await response.json();
                console.log('📖 Lookbook 분석 완료:', result);

                // 결과를 sessionStorage에 저장
                sessionStorage.setItem('lookbookResult', JSON.stringify(result));
                sessionStorage.setItem('lookbookImage', style.imageUrl || '');
                sessionStorage.setItem('lookbookTitle', style.name || 'Style');
                sessionStorage.setItem('lookbookGender', genderValue);
                sessionStorage.setItem('lookbookLanguage', window.currentLanguage || 'ko');

                // 크레딧 차감 (API 성공 시에만)
                deductLookbookCreditFromMenu(LOOKBOOK_CREDIT_COST);

                // 로딩 오버레이 제거
                loadingOverlay.remove();

                // lookbook.html로 이동 (preloaded 파라미터 추가)
                const lookbookUrl = `/lookbook.html?preloaded=true&title=${encodeURIComponent(style.name || 'Style')}`;
                window.location.href = lookbookUrl;

            } catch (error) {
                console.error('📖 Lookbook 분석 실패:', error);
                loadingOverlay.remove();

                if (typeof showToast === 'function') {
                    showToast('분석 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
                } else {
                    alert('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
                }
            }
        };
    }

    // 헤어체험 버튼 이벤트 연결 (index.html의 버튼)
    const btnHairTry = document.getElementById('btnHairTry');
    if (btnHairTry) {
        const HAIR_TRY_CREDIT_COST = 0.2; // 헤어체험 사용 비용 (룩북과 동일)

        // 크레딧 확인 함수
        const getUserCredits = () => {
            try {
                const bullnabiUser = localStorage.getItem('bullnabi_user');
                if (bullnabiUser) {
                    const user = JSON.parse(bullnabiUser);
                    return user.remainCount || 0;
                }
            } catch (e) {
                console.warn('크레딧 확인 실패:', e);
            }
            return 0;
        };

        // 크레딧 부족 여부 확인
        const hasEnoughCredits = () => {
            const credits = getUserCredits();
            return credits >= HAIR_TRY_CREDIT_COST;
        };

        // 다국어 버튼 텍스트 설정 (SVG 아이콘 유지)
        const hairTryText = t('hairTry.button') || '헤어체험';
        const svgIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>`;
        btnHairTry.innerHTML = `${svgIcon}<span>${hairTryText}</span>`;

        // 크레딧 상태에 따라 버튼 스타일 업데이트
        const updateHairTryButtonState = () => {
            if (!hasEnoughCredits()) {
                btnHairTry.style.opacity = '0.5';
                btnHairTry.style.cursor = 'not-allowed';
                btnHairTry.title = t('hairTry.noCredits') || '크레딧이 부족합니다';
            } else {
                btnHairTry.style.opacity = '1';
                btnHairTry.style.cursor = 'pointer';
                btnHairTry.title = '';
            }
        };

        // 초기 상태 설정
        updateHairTryButtonState();

        btnHairTry.onclick = async function (e) {
            e.stopPropagation();

            // 크레딧 체크
            if (!hasEnoughCredits()) {
                const currentCredits = getUserCredits();
                const message = t('hairTry.insufficientCredits') ||
                    `크레딧이 부족합니다. (현재: ${currentCredits}, 필요: ${HAIR_TRY_CREDIT_COST})`;

                if (typeof showToast === 'function') {
                    showToast(message, 'error');
                } else {
                    alert(message);
                }
                console.warn('💳 크레딧 부족:', { current: currentCredits, required: HAIR_TRY_CREDIT_COST });
                return;
            }

            // 토큰 차감 확인 다이얼로그 표시
            const confirmed = await showTokenConfirmDialog('hairTry');
            if (!confirmed) {
                console.log('💇 헤어체험 사용자가 취소함');
                return;
            }

            console.log('💇 헤어체험 버튼 클릭:', style.name);

            // 헤어체험 모달 열기
            openAIPhotoModal(style.id, style.name, style.imageUrl);
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
                    <div class="face-guide-circle"></div>
                    <p>얼굴을 원 안에 맞춰주세요</p>
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
        showToast('카메라에 접근할 수 없습니다. 권한을 확인해주세요.', 'error');
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
    showToast('사진이 촬영되었습니다', 'success');
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
        .face-guide-circle {
            width: 250px;
            height: 320px;
            border: 4px dashed #fff;
            border-radius: 50%;
            margin-bottom: 15px;
            background: transparent;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
            -webkit-box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
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
            .face-guide-circle {
                width: 200px;
                height: 260px;
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
            .face-guide-circle {
                width: 180px;
                height: 230px;
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
            .face-guide-circle {
                width: 120px;
                height: 160px;
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
        showToast('이미지 파일만 업로드 가능합니다', 'error');
        return;
    }

    // 파일 크기 검증 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
        showToast('파일 크기는 10MB 이하로 제한됩니다', 'error');
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
        showToast('이미지 읽기 중 오류가 발생했습니다', 'error');
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

    try {
        // 1. 고객 사진을 Firebase Storage에 임시 업로드하여 URL 획득
        console.log('📤 고객 사진 임시 업로드 중...');
        const uploadResult = await uploadCustomerPhotoToStorage(customerPhoto);
        const customerPhotoUrl = uploadResult.url;
        tempStoragePath = uploadResult.path; // 삭제용 경로 저장
        console.log('✅ 고객 사진 URL:', customerPhotoUrl);

        const gender = window.currentGender || 'male';

        // 2. Task 생성 (action: 'start')
        console.log('🚀 헤어체험 Task 생성 중...');
        const startResponse = await fetch('/.netlify/functions/hair-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'start',
                customerPhotoUrl: customerPhotoUrl,
                styleImageUrl: styleImageUrl,
                gender: gender
            })
        });

        if (!startResponse.ok) {
            const errorData = await startResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `API 오류: ${startResponse.status}`);
        }

        const startResult = await startResponse.json();
        console.log('📝 Task 생성됨:', startResult.taskId);

        if (!startResult.success || !startResult.taskId) {
            throw new Error('Task 생성 실패');
        }

        // 3. 폴링으로 결과 대기 (action: 'status')
        const result = await pollHairChangeStatus(startResult.taskId, gender, loadingOverlay);

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

        // 크레딧 차감
        const HAIR_TRY_CREDIT_COST = 0.2;
        deductLookbookCreditFromMenu(HAIR_TRY_CREDIT_COST);

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
 * @returns {Object} - 완료된 결과
 */
async function pollHairChangeStatus(taskId, gender, loadingOverlay) {
    const maxAttempts = 30;  // 최대 30회 (60초)
    const pollInterval = 2000;  // 2초마다

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        console.log(`🔄 상태 확인 중... (${attempt + 1}/${maxAttempts})`);

        // 로딩 메시지 업데이트
        const progressText = loadingOverlay.querySelector('.loading-progress');
        if (progressText) {
            progressText.textContent = `AI 처리 중... (${attempt + 1}/${maxAttempts})`;
        }

        const response = await fetch('/.netlify/functions/hair-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'status',
                taskId: taskId,
                gender: gender
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
                <button class="result-action-btn save-btn" onclick="saveHairTryResult('${resultImageUrl}')">
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
    try {
        // 결과 모달에서 AFTER 이미지 요소 찾기
        const afterImg = document.querySelector('.hair-try-result-modal .comparison-after .comparison-image');

        if (afterImg && afterImg.complete) {
            // Canvas를 사용해 이미지 저장 (CORS 우회)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = afterImg.naturalWidth || afterImg.width;
            canvas.height = afterImg.naturalHeight || afterImg.height;

            ctx.drawImage(afterImg, 0, 0);

            // Canvas를 Blob으로 변환
            canvas.toBlob((blob) => {
                if (blob) {
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `hair-try-result-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                    showToast(t('hairTry.saved') || '이미지가 저장되었습니다', 'success');
                } else {
                    // Canvas 방식 실패 시 새 탭에서 열기
                    window.open(imageUrl, '_blank');
                    showToast(t('hairTry.saveManual') || '새 탭에서 이미지를 길게 눌러 저장하세요', 'info');
                }
            }, 'image/png');
        } else {
            // 이미지 요소를 못 찾으면 새 탭에서 열기
            window.open(imageUrl, '_blank');
            showToast(t('hairTry.saveManual') || '새 탭에서 이미지를 길게 눌러 저장하세요', 'info');
        }
    } catch (error) {
        console.error('이미지 저장 오류:', error);
        // 오류 발생 시 새 탭에서 열기 (fallback)
        window.open(imageUrl, '_blank');
        showToast(t('hairTry.saveManual') || '새 탭에서 이미지를 길게 눌러 저장하세요', 'info');
    }
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

    if (img) {
        // 페이드 아웃
        img.style.opacity = '0.3';

        setTimeout(() => {
            // 새 이미지로 교체
            img.src = newStyle.imageUrl || '';
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
            openAIPhotoModal(newStyle.id, newStyle.name, newStyle.imageUrl);
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

// HTML에서 직접 호출되는 전역 함수 추가
window.selectGender = function (gender) {
    console.log(`성별 선택: ${gender}`);

    // 현재 성별 전역 변수 설정
    currentGender = gender;
    window.currentGender = gender;

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

// ========== 기존 console.log 유지 ==========
console.log('HAIRGATOR 스마트 메뉴 시스템 초기화 완료 - 헤어체험 연동 최종 버전');
console.log('디버깅: window.debugHAIRGATOR() 실행 가능');
console.log('🔙 뒤로가기: window.goBack() 함수 등록 완료');
