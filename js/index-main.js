// HAIRGATOR 메인 JavaScript

// ========== 전역 변수 ==========
let selectedGender = null;
let currentCategory = null;
let currentSubCategory = null;
let categoryData = {};
let currentStyle = null;

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 HAIRGATOR 초기화 시작...');
    
    // 디자이너 로그인 체크
    checkDesignerLogin();
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 디바이스 안내 표시
    showDeviceNotice();
});

// ========== 디바이스 안내 ==========
function showDeviceNotice() {
    const notice = document.getElementById('deviceNotice');
    if (notice) {
        notice.classList.add('show');
        setTimeout(() => {
            notice.classList.remove('show');
        }, 5000);
    }
}

// ========== 디자이너 로그인 체크 ==========
function checkDesignerLogin() {
    const designerInfo = localStorage.getItem('designerInfo');
    
    if (designerInfo) {
        // 이미 로그인되어 있으면 성별 선택 화면으로
        document.getElementById('designerLogin').style.display = 'none';
        document.getElementById('genderSelection').style.display = 'flex';
        
        // 햄버거 메뉴에 디자이너 이름 표시
        const designerData = JSON.parse(designerInfo);
        document.getElementById('menuDesignerName').textContent = `🎨 ${designerData.name} 디자이너`;
    } else {
        // 로그인 화면 표시
        document.getElementById('designerLogin').style.display = 'flex';
        document.getElementById('genderSelection').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'none';
    }
    
    // Firebase 연결 대기 (최대 5초)
    let firebaseCheckCount = 0;
    const firebaseCheckInterval = setInterval(() => {
        firebaseCheckCount++;
        
        if (window.firebaseConnected || firebaseCheckCount > 10) {
            clearInterval(firebaseCheckInterval);
            
            if (!window.firebaseConnected && firebaseCheckCount > 10) {
                console.warn('⚠️ Firebase 연결 시간 초과, 오프라인 모드로 전환');
                window.firebaseConnected = true;
                
                // 로그인 버튼 활성화
                const loginBtn = document.querySelector('.login-btn');
                if (loginBtn && loginBtn.disabled) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = '🔍 확인 후 로그인';
                    
                    const loginResult = document.getElementById('loginResult');
                    if (loginResult) {
                        loginResult.textContent = '';
                    }
                }
            }
        }
    }, 500);
}

// ========== 디자이너 로그인 처리 ==========
window.checkDesignerLogin = function() {
    const name = document.getElementById('designerName').value.trim();
    const phone = document.getElementById('designerPhone').value.trim();
    const pin = document.getElementById('designerPin').value.trim();
    
    if (!name || !phone || !pin) {
        showLoginResult('모든 정보를 입력해주세요.', 'error');
        return;
    }
    
    if (phone.length !== 4 || pin.length !== 4) {
        showLoginResult('휴대폰 끝자리와 비밀번호는 4자리로 입력해주세요.', 'error');
        return;
    }
    
    // Firebase 연결 확인
    if (!window.firebaseConnected) {
        showLoginResult('Firebase 연결이 필요합니다. 잠시 후 다시 시도해주세요.', 'error');
        return;
    }
    
    // 디자이너 정보 저장
    const designerInfo = {
        name: name,
        phone: phone,
        pin: pin,
        designerId: `${name}_${phone}_${pin}`
    };
    
    localStorage.setItem('designerInfo', JSON.stringify(designerInfo));
    
    // 성별 선택 화면으로 이동
    document.getElementById('designerLogin').style.display = 'none';
    document.getElementById('genderSelection').style.display = 'flex';
    
    // 햄버거 메뉴에 이름 표시
    document.getElementById('menuDesignerName').textContent = `🎨 ${name} 디자이너`;
    
    console.log('✅ 디자이너 로그인 성공:', designerInfo);
};

// ========== 로그인 결과 표시 ==========
function showLoginResult(message, type) {
    const resultDiv = document.getElementById('loginResult');
    resultDiv.textContent = message;
    resultDiv.className = `check-result ${type}`;
}

// ========== 성별 선택 ==========
window.selectGender = async function(gender) {
    selectedGender = gender;
    console.log('성별 선택:', gender);
    
    // body에 성별 속성 추가 (테마 적용용)
    document.body.setAttribute('data-gender', gender);
    
    // 화면 전환
    document.getElementById('genderSelection').style.display = 'none';
    document.getElementById('mainContainer').classList.add('active');
    
    // 새 고객 추가 버튼 표시
    document.getElementById('addCustomerBtn').classList.add('show');
    
    // 카테고리 데이터 로드
    await loadCategoryData();
};

// ========== 카테고리 데이터 로드 ==========
async function loadCategoryData() {
    if (!window.db) {
        console.error('❌ Firestore가 초기화되지 않았습니다.');
        showEmptyState();
        return;
    }
    
    try {
        console.log('📂 카테고리 데이터 로드 중...');
        
        // category_hierarchy에서 데이터 로드
        const categoryRef = db.collection('category_hierarchy').doc(selectedGender);
        const doc = await categoryRef.get();
        
        if (doc.exists) {
            categoryData = doc.data();
            console.log('✅ 카테고리 데이터 로드 완료:', categoryData);
            displayCategories();
        } else {
            console.log('⚠️ 카테고리 데이터가 없습니다.');
            showEmptyState();
        }
    } catch (error) {
        console.error('❌ 카테고리 로드 오류:', error);
        showEmptyState();
    }
}

// ========== 카테고리 표시 ==========
function displayCategories() {
    const navTabs = document.getElementById('navTabs');
    const content = document.getElementById('content');
    
    navTabs.innerHTML = '';
    content.innerHTML = '';
    
    if (!categoryData.categories || Object.keys(categoryData.categories).length === 0) {
        showEmptyState();
        return;
    }
    
    let firstCategory = null;
    
    // 카테고리별 탭과 콘텐츠 생성
    Object.entries(categoryData.categories).forEach(([categoryKey, category], index) => {
        if (index === 0) firstCategory = categoryKey;
        
        // 탭 생성
        const tab = document.createElement('button');
        tab.className = 'nav-tab';
        tab.textContent = category.name;
        tab.onclick = () => selectCategory(categoryKey);
        navTabs.appendChild(tab);
        
        // 콘텐츠 섹션 생성
        const section = document.createElement('div');
        section.className = 'category-section';
        section.id = `category-${categoryKey}`;
        
        // 카테고리 설명
        if (category.description) {
            section.innerHTML = `<div class="category-description">${category.description}</div>`;
        }
        
        // 하위 카테고리별 스타일 표시
        if (category.subcategories) {
            Object.entries(category.subcategories).forEach(([subKey, subCategory]) => {
                const subSection = createSubCategorySection(categoryKey, subKey, subCategory);
                section.appendChild(subSection);
            });
        }
        
        content.appendChild(section);
    });
    
    // 첫 번째 카테고리 선택
    if (firstCategory) {
        selectCategory(firstCategory);
    }
}

// ========== 하위 카테고리 섹션 생성 ==========
function createSubCategorySection(categoryKey, subKey, subCategory) {
    const container = document.createElement('div');
    container.className = 'subcategory-container';
    
    // 제목
    const title = document.createElement('h3');
    title.textContent = subCategory.name;
    container.appendChild(title);
    
    // 설명
    if (subCategory.description) {
        const desc = document.createElement('p');
        desc.className = 'section-description';
        desc.textContent = subCategory.description;
        container.appendChild(desc);
    }
    
    // 스타일 그리드
    const grid = document.createElement('div');
    grid.className = 'hairstyle-grid';
    
    // 스타일 로드
    loadStyles(categoryKey, subKey, grid);
    
    container.appendChild(grid);
    return container;
}

// ========== 스타일 로드 ==========
async function loadStyles(categoryKey, subKey, container) {
    if (!window.db) return;
    
    try {
        // hairstyles 컬렉션에서 스타일 로드
        const stylesRef = db.collection('hairstyles')
            .where('gender', '==', selectedGender)
            .where('mainCategory', '==', categoryKey)
            .where('subCategory', '==', subKey);
        
        const snapshot = await stylesRef.get();
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state">스타일이 없습니다.</div>';
            return;
        }
        
        snapshot.forEach(doc => {
            const style = doc.data();
            const card = createStyleCard(style);
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('❌ 스타일 로드 오류:', error);
        container.innerHTML = '<div class="empty-state">스타일을 불러올 수 없습니다.</div>';
    }
}

// ========== 스타일 카드 생성 ==========
function createStyleCard(style) {
    const card = document.createElement('div');
    card.className = 'hairstyle-card';
    card.onclick = () => showStyleDetail(style);
    
    card.innerHTML = `
        <img src="${style.imageUrl || 'placeholder.jpg'}" alt="${style.name}" class="hairstyle-image">
        <div class="hairstyle-info">
            <div class="hairstyle-code">${style.code}</div>
            <div class="hairstyle-name">${style.name}</div>
        </div>
    `;
    
    return card;
}

// ========== 카테고리 선택 ==========
function selectCategory(categoryKey) {
    currentCategory = categoryKey;
    
    // 탭 활성화
    document.querySelectorAll('.nav-tab').forEach((tab, index) => {
        const categories = Object.keys(categoryData.categories);
        if (categories[index] === categoryKey) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 섹션 표시
    document.querySelectorAll('.category-section').forEach(section => {
        if (section.id === `category-${categoryKey}`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
}

// ========== 스타일 상세 보기 ==========
function showStyleDetail(style) {
    currentStyle = style;
    
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCode = document.getElementById('modalCode');
    const modalName = document.getElementById('modalName');
    const likeBtn = document.getElementById('likeBtn');
    
    modalImage.src = style.imageUrl || 'placeholder.jpg';
    modalCode.textContent = style.code;
    modalName.textContent = style.name;
    
    // 좋아요 상태 확인
    checkLikeStatus(style.code);
    
    modal.style.display = 'block';
}

// ========== 좋아요 상태 확인 ==========
async function checkLikeStatus(styleCode) {
    const likeBtn = document.getElementById('likeBtn');
    const designerInfo = JSON.parse(localStorage.getItem('designerInfo'));
    
    // localStorage에서 좋아요 상태 확인
    const likedStyles = JSON.parse(localStorage.getItem(`likedStyles_${designerInfo.designerId}`) || '[]');
    
    if (likedStyles.includes(styleCode)) {
        likeBtn.classList.add('liked');
        currentStyle.liked = true;
    } else {
        likeBtn.classList.remove('liked');
        currentStyle.liked = false;
    }
}

// ========== 좋아요 토글 ==========
window.toggleStyleLike = function() {
    const likeBtn = document.getElementById('likeBtn');
    const designerInfo = JSON.parse(localStorage.getItem('designerInfo'));
    
    // localStorage에서 좋아요 목록 가져오기
    let likedStyles = JSON.parse(localStorage.getItem(`likedStyles_${designerInfo.designerId}`) || '[]');
    
    if (likeBtn.classList.contains('liked')) {
        // 좋아요 취소
        likeBtn.classList.remove('liked');
        likedStyles = likedStyles.filter(code => code !== currentStyle.code);
        currentStyle.liked = false;
    } else {
        // 좋아요 추가
        likeBtn.classList.add('liked');
        likedStyles.push(currentStyle.code);
        currentStyle.liked = true;
    }
    
    // localStorage에 저장
    localStorage.setItem(`likedStyles_${designerInfo.designerId}`, JSON.stringify(likedStyles));
    
    // Firebase에도 저장 (가능한 경우)
    if (window.db) {
        saveLikeToFirebase(currentStyle.code, currentStyle.liked);
    }
};

// ========== Firebase에 좋아요 저장 ==========
async function saveLikeToFirebase(styleCode, liked) {
    try {
        const designerInfo = JSON.parse(localStorage.getItem('designerInfo'));
        const likeRef = db.collection('style_likes').doc(`${designerInfo.designerId}_${styleCode}`);
        
        if (liked) {
            await likeRef.set({
                designerId: designerInfo.designerId,
                styleCode: styleCode,
                likedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await likeRef.delete();
        }
    } catch (error) {
        console.error('좋아요 저장 오류:', error);
    }
}

// ========== 햄버거 메뉴 ==========
window.toggleHamburgerMenu = function() {
    const overlay = document.getElementById('hamburgerOverlay');
    overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
};

window.closeHamburgerMenu = function() {
    document.getElementById('hamburgerOverlay').style.display = 'none';
};

// ========== 로그아웃 ==========
window.logoutDesigner = function() {
    if (confirm('정말 로그아웃 하시겠습니까?')) {
        localStorage.removeItem('designerInfo');
        location.reload();
    }
};

// ========== 앱 닫기 ==========
window.closeApp = function() {
    if (confirm('앱을 종료하시겠습니까?')) {
        // PWA인 경우
        if (window.matchMedia('(display-mode: standalone)').matches) {
            window.close();
        } else {
            // 브라우저인 경우
            alert('브라우저 탭을 닫아주세요.');
        }
    }
};

// ========== 성별 선택으로 돌아가기 ==========
window.backToGenderSelection = function() {
    // body의 성별 속성 제거
    document.body.removeAttribute('data-gender');
    
    document.getElementById('mainContainer').classList.remove('active');
    document.getElementById('genderSelection').style.display = 'flex';
    document.getElementById('addCustomerBtn').classList.remove('show');
    
    // 데이터 초기화
    selectedGender = null;
    currentCategory = null;
    categoryData = {};
};

// ========== AI 얼굴 분석 ==========
window.openAIFaceAnalysis = function() {
    closeHamburgerMenu();
    alert('AI 얼굴 분석 기능은 준비 중입니다.');
};

// ========== 모달 닫기 ==========
window.closeModal = function() {
    document.getElementById('imageModal').style.display = 'none';
};

// ========== 이벤트 리스너 설정 ==========
function setupEventListeners() {
    // 모달 외부 클릭 시 닫기
    const modal = document.getElementById('imageModal');
    const closeBtn = document.querySelector('.modal .close');
    
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }
    
    window.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };
    
    // 엔터키로 로그인
    const inputs = document.querySelectorAll('#designerLogin input');
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkDesignerLogin();
            }
        });
    });
}

// ========== 빈 상태 표시 ==========
function showEmptyState() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📂</div>
            <div class="empty-state-title">카테고리가 없습니다</div>
            <div class="empty-state-message">
                관리자 페이지에서 카테고리를 추가해주세요.
            </div>
        </div>
    `;
}

console.log('✅ index-main.js 로드 완료');
