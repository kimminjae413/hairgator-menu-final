// HAIRGATOR - 최종 성능 최적화 버전

// ========== 전역 변수 및 캐시 시스템 ==========
let currentGender = null;
let currentCategory = null; 
let currentSubcategory = 'None';
let menuData = {};
let el = {}; // 엘리먼트 캐시용

// 성능 최적화 캐시
let styleCache = new Map();
let lastLoadTime = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

// 이미지 프리로딩 시스템
const imagePreloader = {
    cache: new Map(),
    preloadQueue: [],
    maxConcurrent: 3,
    currentLoading: 0,

    preload(urls) {
        urls.forEach(url => {
            if (!this.cache.has(url) && !this.preloadQueue.includes(url)) {
                this.preloadQueue.push(url);
            }
        });
        this.processQueue();
    },

    processQueue() {
        while (this.currentLoading < this.maxConcurrent && this.preloadQueue.length > 0) {
            const url = this.preloadQueue.shift();
            this.loadImage(url);
        }
    },

    loadImage(url) {
        if (this.cache.has(url)) return;
        
        this.currentLoading++;
        const img = new Image();
        
        img.onload = () => {
            this.cache.set(url, img);
            this.currentLoading--;
            this.processQueue();
        };
        
        img.onerror = () => {
            this.currentLoading--;
            this.processQueue();
        };
        
        img.src = url;
    },

    getImage(url) {
        return this.cache.get(url);
    }
};

// 모달 관련 요소들 캐싱
let modalElements = null;
let modalImageCache = new Map();

// ========== 전역 함수들 ==========

// 성별 선택 - 전역 함수로 정의
function selectGender(gender) {
    console.log('📱 성별 선택 함수 실행:', gender);
    if (!gender) {
        console.error('❌ 성별이 전달되지 않음');
        return;
    }

    currentGender = gender;
    console.log('✅ 현재 성별 설정됨:', currentGender);

    // DOM 요소 확인
    if (!el.genderSelection || !el.menuContainer) {
        console.error('❌ 필수 DOM 요소를 찾을 수 없음');
        return;
    }

    el.genderSelection.style.display = 'none';
    el.menuContainer.classList.add('active');
    el.backBtn && (el.backBtn.style.display = 'flex');
    el.themeToggleBottom && (el.themeToggleBottom.style.display = 'none');

    console.log('📋 메뉴 데이터 로드 시작...');
    loadMenuData(gender);
    localStorage.setItem('hairgator_gender', gender);
}

// 메뉴 데이터 로드 - 전역 함수
function loadMenuData(gender) {
    showLoading(true);
    
    // 메뉴 데이터 구조
    const MENU_DATA = {
        male: {
            categories: [
                {id: 'side-fringe', name: 'SIDE FRINGE', description: '사이드 프린지는 클래식함과 모던함의 대명사로 스타일링이 따라 원하는 이미지를 자유롭게 표현할 수 있습니다. 가르마를 기준으로 단순히 넘어가는 스타일을 넘어 개인의 특성과 트렌드에 맞춰 고급 테이퍼링을 표현하는 것이 매우 중요합니다.'},
                {id: 'side-part', name: 'SIDE PART', description: '사이드 파트는 정갈하고 단정한 스타일로 비즈니스맨들에게 인기가 많습니다.'},
                {id: 'fringe-up', name: 'FRINGE UP', description: '프린지 업은 앞머리를 올려 이마를 드러내는 시원한 스타일입니다.'},
                {id: 'pushed-back', name: 'PUSHED BACK', description: '푸시백은 머리를 뒤로 넘긴 댄디한 스타일입니다.'},
                {id: 'buzz', name: 'BUZZ', description: '버즈컷은 짧고 깔끔한 스타일로 관리가 편합니다.'},
                {id: 'crop', name: 'CROP', description: '크롭 스타일은 짧으면서도 스타일리시한 느낌을 줍니다.'},
                {id: 'mohican', name: 'MOHICAN', description: '모히칸 스타일은 개성 있고 강한 인상을 줍니다.'}
            ],
            subcategories: ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone']
        },
        female: {
            categories: [
                {id: 'a-length', name: 'A Length', description: 'A 길이는 가슴선 아래로 내려오는 롱헤어로, 원랭스·레이어드 롱·굵은 S컬이 잘 맞아 우아하고 드라마틱한 분위기를 냅니다.'},
                {id: 'b-length', name: 'B Length', description: 'B 길이는 가슴 아래(A)와 쇄골 아래(C) 사이의 미디엄-롱으로, 레이어드 미디엄롱·바디펌이 어울려 부드럽고 실용적인 인상을 줍니다.'},
                {id: 'c-length', name: 'C Length', description: 'C 길이는 쇄골 라인 아래의 세미 롱으로, 레이어드 C/S컬·에어리펌과 잘 맞아 단정하고 세련된 오피스 무드를 냅니다.'},
                {id: 'd-length', name: 'D Length', description: 'D 길이는 어깨에 정확히 닿는 길이로, LOB·숄더 C컬·빌드펌이 어울려 트렌디하고 깔끔한 느낌을 줍니다.'},
                {id: 'e-length', name: 'E Length', description: 'E 길이는 어깨 바로 위의 단발로, 클래식 보브·A라인 보브·내/외 C컬이 잘 맞아 경쾌하고 모던한 인상을 만듭니다.'},
                {id: 'f-length', name: 'F Length', description: 'F 길이는 턱선 바로 밑 보브 길이로, 프렌치 보브·일자 단발·텍스처 보브가 어울려 시크하고 도회적인 분위기를 연출합니다.'},
                {id: 'g-length', name: 'G Length', description: 'G 길이는 턱선과 같은 높이의 미니 보브로, 클래식 턱선 보브·미니 레이어 보브가 잘 맞아 또렷하고 미니멀한 무드를 줍니다.'},
                {id: 'h-length', name: 'H Length', description: 'H 길이는 귀선~베리숏 구간의 숏헤어로, 픽시·샤그 숏·허쉬 숏 등이 어울려 활동적이고 개성 있는 스타일을 완성합니다.'}
            ],
            subcategories: ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone']
        }
    };
    
    menuData = MENU_DATA[gender];
    renderCategories(gender);
    if (menuData.categories.length > 0) selectCategory(menuData.categories[0], gender);
    setTimeout(() => showLoading(false), 300);
}

// 테마 토글 - 전역 함수
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    el.themeStatus && (el.themeStatus.textContent = isLight ? 'OFF' : 'ON');
    localStorage.setItem('hairgator_theme', isLight ? 'light' : 'dark');
}

// 카테고리 렌더링 - 전역 함수 (수정됨!)
function renderCategories(gender) {
    el.categoryTabs.innerHTML = '';
    if (gender === 'female') {
        const helpTab = document.createElement('button');
        helpTab.className = 'category-tab help-tab';
        helpTab.innerHTML = '?';
        // ✅ 여기가 수정된 부분!
        helpTab.addEventListener('click', () => {
            if (window.openHelpModal) {
                openHelpModal();
            } else {
                console.error('openHelpModal 함수를 찾을 수 없습니다');
            }
        });
        el.categoryTabs.appendChild(helpTab);
    }
    menuData.categories.forEach((cat, idx) => {
        const tab = document.createElement('button');
        tab.className = 'category-tab';
        tab.textContent = cat.name;
        tab.dataset.categoryId = cat.id;
        if (idx === 0) tab.classList.add('active', gender);
        tab.addEventListener('click', () => selectCategory(cat, gender));
        el.categoryTabs.appendChild(tab);
    });
}

// 카테고리 선택 - 전역 함수
function selectCategory(category, gender) {
    currentCategory = category;
    document.querySelectorAll('.category-tab').forEach(tab => {
        if (tab.classList.contains('help-tab')) return;
        tab.classList.remove('active', 'male', 'female');
        if (tab.dataset.categoryId === category.id) tab.classList.add('active', gender);
    });
    el.categoryDescription.textContent = category.description;
    renderSubcategories(gender);
    loadStylesOptimized(category.id, currentSubcategory, gender);
}

// 중분류 렌더링 - 전역 함수
function renderSubcategories(gender) {
    el.subcategoryTabs.innerHTML = '';
    menuData.subcategories.forEach((sub, idx) => {
        const tab = document.createElement('button');
        tab.className = 'subcategory-tab';
        tab.textContent = sub;
        tab.dataset.subcategory = sub;
        if (idx === 0) {
            tab.classList.add('active', gender);
            currentSubcategory = sub;
        }
        tab.addEventListener('click', () => selectSubcategory(sub, gender));
        el.subcategoryTabs.appendChild(tab);
    });
}

// 중분류 선택 - 전역 함수
function selectSubcategory(subcategory, gender) {
    currentSubcategory = subcategory;
    document.querySelectorAll('.subcategory-tab').forEach(tab => {
        tab.classList.remove('active', 'male', 'female');
        if (tab.dataset.subcategory === subcategory) tab.classList.add('active', gender);
    });
    loadStylesOptimized(currentCategory.id, subcategory, gender);
}

// ========== 최적화된 스타일 로딩 시스템 ==========

// 최적화된 스타일 로딩 함수
async function loadStylesOptimized(categoryId, subcategory, gender) {
    const cacheKey = `${gender}-${categoryId}-${subcategory}`;
    const now = Date.now();
    
    // 캐시 확인 (5분 이내)
    if (styleCache.has(cacheKey)) {
        const { data, timestamp } = styleCache.get(cacheKey);
        if (now - timestamp < CACHE_DURATION) {
            console.log('📦 캐시에서 로드:', cacheKey);
            renderStylesOptimized(data);
            return;
        }
    }

    // 최적화된 로딩 표시
    showOptimizedLoading();
    
    try {
        if (!window.db) {
            el.menuGrid.innerHTML = '<div style="color:#999;text-align:center;padding:40px">Firebase 연결 중...</div>';
            return;
        }
        
        // 카테고리 이름 변환
        const categoryName = currentCategory.name;
        
        // Firebase 쿼리 최적화 - 인덱스 활용
        const query = window.db.collection('hairstyles')
            .where('gender', '==', gender)
            .where('mainCategory', '==', categoryName)
            .where('subCategory', '==', subcategory)
            .orderBy('createdAt', 'desc') // 최신순 정렬
            .limit(50); // 초기 로드 제한
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            showEmptyState(categoryName, subcategory);
            return;
        }
        
        // 데이터 추출 및 캐시 저장
        const styles = [];
        const imageUrls = [];
        
        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            styles.push(data);
            if (data.imageUrl) {
                imageUrls.push(data.imageUrl);
            }
        });
        
        // 캐시에 저장
        styleCache.set(cacheKey, { data: styles, timestamp: now });
        
        // 이미지 백그라운드 프리로딩
        setTimeout(() => imagePreloader.preload(imageUrls), 100);
        
        // 즉시 렌더링
        renderStylesOptimized(styles);
        
    } catch (error) {
        console.error('스타일 로드 오류:', error);
        showErrorState(error.message);
    }
}

// 최적화된 렌더링
function renderStylesOptimized(styles) {
    // DocumentFragment 사용으로 DOM 조작 최적화
    const fragment = document.createDocumentFragment();
    
    styles.forEach((data, index) => {
        const item = createStyleCardOptimized(data, index);
        fragment.appendChild(item);
    });
    
    // 한 번에 DOM에 추가
    el.menuGrid.innerHTML = '';
    el.menuGrid.appendChild(fragment);
    
    // 스크롤 위치 초기화
    if (el.menuGrid.parentElement) {
        el.menuGrid.parentElement.scrollTop = 0;
    }
}

// 최적화된 스타일 카드 생성
function createStyleCardOptimized(data, index) {
    const item = document.createElement('div');
    item.className = `menu-item ${currentGender}`;
    
    // 레이지 로딩과 최적화된 이미지 처리
    const imageUrl = data.imageUrl || '';
    const preloadedImg = imagePreloader.getImage(imageUrl);
    
    item.innerHTML = `
        <div class="image-container" style="position: relative; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); overflow: hidden; border-radius: 10px;">
            ${imageUrl ? `
                <img 
                    src="${imageUrl}" 
                    alt="${data.name || 'Style'}" 
                    class="menu-item-image"
                    style="width: 100%; height: 100%; object-fit: cover; transition: opacity 0.3s; opacity: ${preloadedImg ? '1' : '0'};"
                    ${!preloadedImg ? 'loading="lazy"' : ''}
                    onerror="this.style.display='none';"
                    onload="this.style.opacity='1';"
                >
            ` : `
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); font-size: 14px;">
                    No Image
                </div>
            `}
        </div>
    `;
    
    // 터치 최적화된 이벤트 리스너
    let touchStartTime = 0;
    
    item.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
        item.style.transform = 'scale(0.98)';
    }, { passive: true });
    
    item.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - touchStartTime;
        item.style.transform = '';
        
        // 200ms 이내의 빠른 터치만 클릭으로 인식
        if (touchDuration < 200) {
            e.preventDefault();
            showStyleDetailOptimized(data.code, data.name, currentGender, data.imageUrl, data.id);
        }
    }, { passive: false });
    
    // 마우스 이벤트 (데스크톱)
    item.addEventListener('click', (e) => {
        if (e.detail === 0) return; // 터치에서 발생한 클릭 무시
        showStyleDetailOptimized(data.code, data.name, currentGender, data.imageUrl, data.id);
    });
    
    return item;
}

// ========== 최적화된 모달 시스템 ==========

// 모달 요소 초기화 (한 번만 실행)
function initModalElements() {
    if (modalElements) return modalElements;
    
    modalElements = {
        modal: el.styleModal,
        modalImage: el.modalImage,
        modalCode: el.modalCode,
        modalName: el.modalName,
        btnRegister: el.btnRegister,
        btnLike: el.btnLike,
        modalClose: el.modalClose
    };
    
    return modalElements;
}

// 최적화된 스타일 상세 모달 표시
function showStyleDetailOptimized(code, name, gender, imageSrc, docId) {
    const elements = initModalElements();
    if (!elements.modal) return;
    
    // 즉시 모달 표시 (이미지 로딩과 별개)
    elements.modal.classList.add('active');
    
    // 기본 정보 즉시 설정
    elements.modalCode.textContent = code || 'NO CODE';
    elements.modalName.textContent = name || '이름 없음';
    
    // 성별에 따른 버튼 스타일
    if (gender === 'female') {
        elements.btnRegister.classList.add('female');
    } else {
        elements.btnRegister.classList.remove('female');
    }
    
    // 좋아요 버튼 초기화
    elements.btnLike.classList.remove('active');
    const heart = elements.btnLike.querySelector('span:first-child');
    if (heart) heart.textContent = '♡';
    
    // 이미지 최적화 로딩
    if (imageSrc) {
        loadModalImage(imageSrc, elements.modalImage);
    } else {
        setNoImageState(elements.modalImage);
    }
    
    // 이벤트 리스너 최적화 설정
    setupModalEvents(elements, code, name, gender, docId);
    
    // 바디 스크롤 방지
    document.body.style.overflow = 'hidden';
}

// 최적화된 이미지 로딩
function loadModalImage(imageSrc, modalImage) {
    // 캐시된 이미지 확인
    if (modalImageCache.has(imageSrc)) {
        const cachedImg = modalImageCache.get(imageSrc);
        modalImage.src = cachedImg.src;
        modalImage.style.display = 'block';
        return;
    }
    
    // 로딩 상태 표시
    modalImage.style.display = 'none';
    modalImage.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    // 새 이미지 로딩
    const img = new Image();
    img.onload = function() {
        modalImageCache.set(imageSrc, img);
        modalImage.src = imageSrc;
        modalImage.style.display = 'block';
        modalImage.parentElement.style.background = '';
    };
    
    img.onerror = function() {
        setNoImageState(modalImage);
    };
    
    img.src = imageSrc;
}

// 이미지 없음 상태 설정
function setNoImageState(modalImage) {
    modalImage.style.display = 'none';
    modalImage.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    modalImage.parentElement.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.7); font-size: 18px;">
            이미지 없음
        </div>
    `;
}

// 최적화된 모달 이벤트 설정
function setupModalEvents(elements, code, name, gender, docId) {
    // 기존 이벤트 리스너 제거 (메모리 누수 방지)
    const newBtnRegister = elements.btnRegister.cloneNode(true);
    const newBtnLike = elements.btnLike.cloneNode(true);
    
    elements.btnRegister.parentNode.replaceChild(newBtnRegister, elements.btnRegister);
    elements.btnLike.parentNode.replaceChild(newBtnLike, elements.btnLike);
    
    // 고객 등록 버튼 - 최적화된 이벤트
    newBtnRegister.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // 버튼 비활성화 (중복 클릭 방지)
        this.disabled = true;
        this.textContent = '등록 중...';
        
        try {
            await handleCustomerRegistration(code, name, gender, docId);
        } finally {
            this.disabled = false;
            this.textContent = '고객등록';
        }
    }, { once: false });
    
    // 좋아요 버튼 - 최적화된 이벤트
    newBtnLike.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // 즉시 UI 업데이트 (반응성 향상)
        this.classList.toggle('active');
        const heart = this.querySelector('span:first-child');
        if (heart) {
            const isLiked = this.classList.contains('active');
            heart.textContent = isLiked ? '♥' : '♡';
        }
        
        // 백그라운드에서 Firebase 업데이트
        if (docId) {
            updateLikeInBackground(docId, this.classList.contains('active'));
        }
    }, { once: false });
    
    // 모달 요소 업데이트
    elements.btnRegister = newBtnRegister;
    elements.btnLike = newBtnLike;
}

// 백그라운드 좋아요 업데이트
async function updateLikeInBackground(docId, isLiked) {
    try {
        const docRef = window.db.collection('hairstyles').doc(docId);
        await docRef.update({
            likes: firebase.firestore.FieldValue.increment(isLiked ? 1 : -1)
        });
    } catch (error) {
        console.error('좋아요 업데이트 오류:', error);
        // 오류 시 UI 롤백하지 않음 (사용자 경험 우선)
    }
}

// 고객 등록 버튼
btnRegister.onclick = async function() {
    const customerName = prompt('고객 이름을 입력하세요:');
    if (!customerName || !customerName.trim()) {
        alert('이름을 입력해주세요');
        return;
    }
    
    const customerPhoneInput = prompt('전화번호를 입력하세요 (01012345678):');
    if (!customerPhoneInput || !customerPhoneInput.trim()) {
        alert('전화번호를 입력해주세요');
        return;
    }
    
    // 전화번호 포맷팅
    const phoneOnly = customerPhoneInput.replace(/[^0-9]/g, '');
    if (phoneOnly.length !== 11 || !phoneOnly.startsWith('010')) {
        alert('올바른 전화번호 형식이 아닙니다 (010으로 시작하는 11자리)');
        return;
    }
    
    const formattedPhone = phoneOnly.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    
    try {
        const customerData = {
            name: customerName.trim(),
            phone: formattedPhone,
            phoneRaw: phoneOnly,
            styleCode: code,
            styleName: name,
            styleId: docId,
            gender: gender,
            designer: localStorage.getItem('hairgator_designer_name') || 'Unknown',
            registeredAt: new Date(),
            lastVisit: new Date()
        };
        
        await db.collection('customers').add(customerData);
        
        alert(`고객 등록 완료!\n이름: ${customerName}\n전화번호: ${formattedPhone}`);
        closeModal();
    } catch (error) {
        console.error('Customer registration error:', error);
        alert(`등록 실패: ${error.message}\n\n다시 시도하시겠습니까?`);
        // 재시도 옵션
        if (confirm('다시 시도하시겠습니까?')) {
            btnRegister.onclick();
        }
    }
};

// ========== 유틸리티 함수들 ==========

// 최적화된 로딩 표시
function showOptimizedLoading() {
    el.menuGrid.innerHTML = `
        <div class="loading-optimized" style="grid-column: 1/-1; display: flex; justify-content: center; align-items: center; padding: 20px;">
            <div style="width: 30px; height: 30px; border: 3px solid #333; border-top: 3px solid #FF1493; border-radius: 50%; animation: fastSpin 0.8s linear infinite;"></div>
        </div>
        <style>
            @keyframes fastSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
}

// 빈 상태 표시
function showEmptyState(categoryName, subcategory) {
    el.menuGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: #999;">
            <div style="font-size: 48px; margin-bottom: 15px; opacity: 0.7;">🔍</div>
            <div style="font-size: 18px; margin-bottom: 8px;">등록된 스타일 없음</div>
            <div style="font-size: 12px; opacity: 0.8;">${categoryName} - ${subcategory}</div>
        </div>
    `;
}

// 오류 상태 표시
function showErrorState(errorMessage) {
    el.menuGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: #ff6b6b;">
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <div style="font-size: 16px; margin-bottom: 8px;">로드 실패</div>
            <div style="font-size: 12px; opacity: 0.8;">${errorMessage}</div>
        </div>
    `;
}

// 최적화된 모달 닫기
function closeModalOptimized() {
    const elements = initModalElements();
    if (!elements.modal) return;
    
    elements.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // 메모리 정리
    setTimeout(() => {
        if (elements.modalImage) {
            elements.modalImage.src = '';
        }
    }, 300);
}

// 토스트 알림 시스템
function showToast(message, type = 'info') {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#FF1493'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(toast);
    
    // 애니메이션
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // 자동 제거
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// 로딩 표시 - 기존 호환성을 위해 유지
function showLoading(show) {
    el.loadingOverlay?.classList.toggle('active', show);
}

// 모달 닫기 - 기존 호환성을 위해 유지
function closeModal() {
    closeModalOptimized();
}

// 스타일 상세 보기 - 기존 호환성을 위해 유지  
function showStyleDetail(code, name, gender, imageSrc, docId) {
    showStyleDetailOptimized(code, name, gender, imageSrc, docId);
}

// ========== DOMContentLoaded 이벤트 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM 로드 완료, 앱 초기화 시작');
    
    if (!window.firebaseInitialized) {
        window.addEventListener('firebaseReady', initApp);
    } else {
        initApp();
    }
});

// ========== 앱 초기화 (Firebase 준비 후 실행) ==========
function initApp() {
    console.log('🎯 Firebase 준비 완료, 앱 초기화');
    
    // 엘리먼트 캐싱
    el = {
        backBtn: document.getElementById('backBtn'),
        menuBtn: document.getElementById('menuBtn'),
        sidebar: document.getElementById('sidebar'),
        sidebarClose: document.getElementById('sidebarClose'),
        themeToggle: document.getElementById('themeToggle'),
        themeToggleBottom: document.getElementById('themeToggleBottom'),
        themeStatus: document.getElementById('themeStatus'),
        logoutBtn: document.getElementById('logoutBtn'),
        genderSelection: document.getElementById('genderSelection'),
        menuContainer: document.getElementById('menuContainer'),
        categoryTabs: document.getElementById('categoryTabs'),
        categoryDescription: document.getElementById('categoryDescription'),
        subcategoryTabs: document.getElementById('subcategoryTabs'),
        menuGrid: document.getElementById('menuGrid'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        styleModal: document.getElementById('styleModal'),
        modalClose: document.getElementById('modalClose'),
        modalImage: document.getElementById('modalImage'),
        modalCode: document.getElementById('modalCode'),
        modalName: document.getElementById('modalName'),
        btnRegister: document.getElementById('btnRegister'),
        btnLike: document.getElementById('btnLike')
    };

    setupEvents();
    loadTheme();
    checkAuth();
    el.backBtn && (el.backBtn.style.display = 'none');

    // 성별 버튼 이벤트 등록 (전역 함수 사용)
    setTimeout(() => {
        const genderBtns = document.querySelectorAll('.gender-btn');
        console.log('🎯 성별 버튼 이벤트 등록:', genderBtns.length, '개');
        genderBtns.forEach((btn, index) => {
            console.log(`버튼 ${index}:`, btn.dataset.gender);
            if (!btn.hasAttribute('data-event-added')) {
                btn.addEventListener('click', function() {
                    console.log('🚀 성별 버튼 클릭:', this.dataset.gender);
                    selectGender(this.dataset.gender); // 전역 함수 호출
                });
                btn.setAttribute('data-event-added', 'true');
            }
        });
    }, 100);
}

// ========== 이벤트 리스너 설정 ==========
function setupEvents() {
    // 네비게이션
    el.backBtn?.addEventListener('click', () => {
        if (el.menuContainer.classList.contains('active')) {
            el.menuContainer.classList.remove('active');
            el.genderSelection.style.display = 'flex';
            el.backBtn.style.display = 'none';
            el.themeToggleBottom && (el.themeToggleBottom.style.display = 'flex');
            currentGender = currentCategory = null;
        }
    });

    // 사이드바
    el.menuBtn?.addEventListener('click', () => el.sidebar.classList.add('active'));
    el.sidebarClose?.addEventListener('click', () => el.sidebar.classList.remove('active'));

    // 테마
    [el.themeToggle, el.themeToggleBottom].forEach(btn => {
        btn?.addEventListener('click', toggleTheme); // 전역 함수 호출
    });

    // 로그아웃
    el.logoutBtn?.addEventListener('click', async () => {
        if (confirm('로그아웃 하시겠습니까?')) {
            try {
                window.authManager && await window.authManager.signOut();
                location.reload();
            } catch (e) {
                console.error('Logout error:', e);
            }
        }
    });

    // 모달
    el.modalClose?.addEventListener('click', closeModal);
    el.styleModal?.addEventListener('click', e => {
        if (e.target === el.styleModal) closeModal();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && el.styleModal?.classList.contains('active')) closeModal();
    });

    // 외부 클릭
    document.addEventListener('click', e => {
        if (el.sidebar?.classList.contains('active') && !el.sidebar.contains(e.target) && !el.menuBtn.contains(e.target)) {
            el.sidebar.classList.remove('active');
        }
    });
}

// ========== 테마 로드 ==========
function loadTheme() {
    const savedTheme = localStorage.getItem('hairgator_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        el.themeStatus && (el.themeStatus.textContent = 'OFF');
    }
}

// ========== 인증 상태 체크 ==========
function checkAuth() {
    const info = document.getElementById('designerInfo');
    if (window.auth?.currentUser) {
        info && (info.style.display = 'block');
        const nameEl = document.getElementById('designerName');
        nameEl && (nameEl.textContent = window.auth.currentUser.displayName || window.auth.currentUser.email);
    }
}

// ========== 앱 로드 완료 ==========
window.addEventListener('load', () => console.log('✅ HAIRGATOR App Loaded'));

