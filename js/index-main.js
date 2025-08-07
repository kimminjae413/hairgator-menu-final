// ========== HAIRGATOR 메인 로직 (여성 A~H Length 버전) ==========
console.log('🚀 HAIRGATOR 메인 로직 시작 - 여성 A~H Length 적용');

// ========== 전역 변수 ==========
let currentDesigner = null;
let currentDesignerName = null;
let currentGender = null;
let currentCategory = null;
let currentCustomer = null;
let currentStyleCode = null;
let currentStyleName = null;
let currentStyleImage = null;
let hierarchyStructure = {};

// Excel 기반 완전 구조 - 여성은 A~H Length로 수정
const PERFECT_STRUCTURE = {
    male: {
        'SIDE FRINGE': ['Fore Head', 'Eye Brow'],
        'SIDE PART': ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone'],
        'FRINGE UP': ['None', 'Fore Head'],
        'PUSHED BACK': ['None'],
        'BUZZ': ['None'],
        'CROP': ['None'],
        'MOHICAN': ['None']
    },
    female: {
        'A Length': ['None'],  // 가슴 아래
        'B Length': ['None'],  // 가슴선
        'C Length': ['None'],  // 어깨 아래 10cm
        'D Length': ['None'],  // 어깨선
        'E Length': ['None'],  // 어깨 위 5cm
        'F Length': ['None'],  // 턱선
        'G Length': ['None'],  // 턱 위 5cm
        'H Length': ['None']   // 귀 정도
    }
};

// ========== 세션 관리 ==========
function checkExistingSession() {
    const savedDesigner = sessionStorage.getItem('currentDesigner');
    const savedDesignerName = sessionStorage.getItem('designerName');
    
    if (savedDesigner && savedDesignerName) {
        console.log('🔄 기존 세션 복원:', savedDesigner, savedDesignerName);
        currentDesigner = savedDesigner;
        currentDesignerName = savedDesignerName;
        
        document.getElementById('designerLogin').style.display = 'none';
        document.getElementById('genderSelection').classList.add('show');
        document.getElementById('addCustomerBtn').classList.add('show');
        
        document.getElementById('menuDesignerName').textContent = `🎨 ${savedDesignerName}`;
        
        return true;
    }
    
    return false;
}

// ========== 디자이너 로그인 ==========
async function checkDesignerLogin() {
    const name = document.getElementById('designerName').value.trim();
    const phone = document.getElementById('designerPhone').value.trim();
    const pin = document.getElementById('designerPin').value.trim();
    
    if (!name || phone.length !== 4 || pin.length !== 4) {
        showLoginResult('error', '모든 정보를 정확히 입력해주세요<br>전화번호 4자리, 비밀번호 4자리');
        return;
    }
    
    if (!firebaseConnected) {
        showLoginResult('error', 'Firebase 연결이 필요합니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    
    try {
        showLoginResult('info', '🔄 로그인 확인 중...');
        
        const designerId = `${name}_${phone}`;
        const designerDoc = await db.collection('designers').doc(designerId).get();
        
        if (designerDoc.exists) {
            const data = designerDoc.data();
            if (data.pin === pin) {
                startDesignerSession(designerId, name);
                showLoginResult('success', `🎉 ${name} 디자이너님 환영합니다!`);
            } else {
                showLoginResult('error', '❌ 비밀번호가 일치하지 않습니다');
            }
        } else {
            // 신규 디자이너 등록
            await db.collection('designers').doc(designerId).set({
                name: name,
                phone: phone,
                pin: pin,
                createdAt: new Date(),
                customerCount: 0
            });
            
            startDesignerSession(designerId, name);
            showLoginResult('success', `🎉 ${name} 디자이너님 신규 등록 완료!`);
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        showLoginResult('error', '로그인 처리 중 오류가 발생했습니다.');
    }
}

// 디자이너 세션 시작
function startDesignerSession(designerId, name) {
    currentDesigner = designerId;
    currentDesignerName = name;
    
    sessionStorage.setItem('currentDesigner', designerId);
    sessionStorage.setItem('designerName', name);
    
    setTimeout(() => {
        document.getElementById('designerLogin').style.display = 'none';
        document.getElementById('genderSelection').classList.add('show');
        document.getElementById('addCustomerBtn').classList.add('show');
        
        document.getElementById('menuDesignerName').textContent = `🎨 ${name}`;
    }, 2000);
}

// 결과 표시
function showLoginResult(type, message) {
    const resultDiv = document.getElementById('loginResult');
    const colors = {
        success: '#28a745',
        warning: '#ffc107', 
        error: '#dc3545',
        info: '#17a2b8'
    };
    
    resultDiv.innerHTML = `
        <div style="
            background: ${colors[type]}22; 
            border: 2px solid ${colors[type]}; 
            border-radius: 10px; 
            padding: 15px; 
            margin-top: 20px;
            text-align: center;
        ">
            ${message}
        </div>
    `;
}

// ========== 성별 선택 ==========
function selectGender(gender) {
    console.log('👤 성별 선택:', gender);
    currentGender = gender;
    
    document.getElementById('genderSelection').classList.remove('show');
    document.getElementById('mainContent').classList.add('show');
    
    // 성별에 따른 색상 테마 적용
    const mainContent = document.getElementById('mainContent');
    if (gender === 'male') {
        mainContent.className = 'main-content show male';
    } else {
        mainContent.className = 'main-content show female';
    }
    
    // 헤더 타이틀 업데이트
    document.getElementById('headerTitle').textContent = 
        gender === 'male' ? "Men's Hairstyle" : "Women's Hairstyle";
    
    // 계층구조 로드
    loadHierarchyFromFirebase(gender);
}

// ========== 계층구조 로드 ==========
async function loadHierarchyFromFirebase(gender) {
    console.log(`🔄 ${gender} 계층구조 로드 시작...`);
    
    if (!firebaseConnected) {
        console.log('❌ Firebase 연결 없음');
        showEmptyState('Firebase 연결이 필요합니다');
        return;
    }

    try {
        updateSyncStatus('loading', `🔄 ${gender} 데이터 로드 중...`);
        
        // PERFECT_STRUCTURE 사용 (Firebase 대신)
        // 실제로는 Firebase에서 로드해야 하지만, 여기서는 하드코딩된 구조 사용
        hierarchyStructure[gender] = PERFECT_STRUCTURE[gender];
        
        // 성별별 카테고리 순서
        const categoryOrder = {
            male: ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'],
            female: ['A Length', 'B Length', 'C Length', 'D Length', 'E Length', 'F Length', 'G Length', 'H Length']
        };
        
        const mainCategories = categoryOrder[gender];
        
        // UI 업데이트
        renderMainCategoryTabs(mainCategories);
        
        if (mainCategories.length > 0) {
            const firstCategory = mainCategories[0];
            currentCategory = firstCategory;
            await loadCategoryData(firstCategory);
        }
        
        updateSyncStatus('connected', `✅ ${gender} 데이터 로드 완료`);
        
    } catch (error) {
        console.error(`❌ ${gender} 계층구조 로드 실패:`, error);
        showAdminInitializationRequired(`계층구조 로드 실패: ${error.message}`);
        updateSyncStatus('disconnected', '❌ 데이터 로드 실패');
    }
}

// ========== 카테고리 데이터 로드 ==========
async function loadCategoryData(mainCategory) {
    console.log(`📂 카테고리 데이터 로드: ${mainCategory}`);
    
    const content = document.getElementById('content');
    
    // 여성 카테고리 설명
    const femaleDescriptions = {
        'A Length': '가슴 아래까지 내려오는 매우 긴 길이입니다. 여성스럽고 우아한 느낌을 연출합니다.',
        'B Length': '가슴선 정도의 긴 길이입니다. 다양한 스타일링이 가능합니다.',
        'C Length': '어깨 아래 10cm 정도의 세미롱 길이입니다. 관리가 편하면서도 여성스럽습니다.',
        'D Length': '어깨선 정도의 미디엄 길이입니다. 실용적이면서 스타일리시합니다.',
        'E Length': '어깨 위 5cm 정도의 짧은 미디엄 길이입니다. 활동적이고 경쾌한 느낌을 줍니다.',
        'F Length': '턱선 정도의 보브 길이입니다. 모던하고 세련된 이미지를 연출합니다.',
        'G Length': '턱 위 5cm 정도의 짧은 보브 길이입니다. 시크하고 도시적인 느낌을 줍니다.',
        'H Length': '귀 정도의 매우 짧은 길이입니다. 개성 있고 보이시한 스타일입니다.'
    };
    
    // 남성 카테고리 설명
    const maleDescriptions = {
        'SIDE FRINGE': '사이드 프린지는 한쪽으로 넘긴 앞머리가 특징인 스타일입니다.',
        'SIDE PART': '사이드 파트는 클래식한 느낌으로 다양한 이미지를 연출할 수 있습니다.',
        'FRINGE UP': '프린지 업은 앞머리를 위로 올린 깔끔한 스타일입니다.',
        'PUSHED BACK': '푸시드 백은 머리 전체를 뒤로 넘긴 세련된 스타일입니다.',
        'BUZZ': '버즈컷은 전체적으로 짧고 깔끔한 스타일이며, 간편하게 관리할 수 있습니다.',
        'CROP': '크롭은 짧고 텍스처가 있는 모던한 스타일입니다.',
        'MOHICAN': '모히칸은 옆머리를 짧게 하고 윗머리를 높이 세운, 개성 있는 스타일입니다.'
    };
    
    const description = currentGender === 'female' ? 
        femaleDescriptions[mainCategory] : 
        maleDescriptions[mainCategory];
    
    // 임시 UI (실제로는 Firebase에서 스타일 데이터 로드)
    content.innerHTML = `
        <div class="category-section active">
            <div class="category-description">${description || '다양한 헤어스타일을 확인해보세요.'}</div>
            
            <div class="length-tabs">
                ${currentGender === 'female' ? 
                    '<div class="length-guide-btn" onclick="showLengthGuide()" title="헤어 길이 가이드">?</div>' : 
                    ''}
            </div>
            
            <div class="empty-state">
                <div class="empty-state-icon">✂️</div>
                <div class="empty-state-title">${mainCategory}</div>
                <div class="empty-state-message">
                    스타일 데이터를 로드하려면<br>
                    어드민에서 초기화가 필요합니다.
                </div>
            </div>
        </div>
    `;
}

// ========== 대분류 탭 렌더링 ==========
function renderMainCategoryTabs(mainCategories) {
    const navTabs = document.getElementById('navTabs');
    navTabs.innerHTML = '';
    
    if (!mainCategories || mainCategories.length === 0) {
        navTabs.innerHTML = '<div style="color: #666; padding: 20px;">카테고리를 불러올 수 없습니다.</div>';
        return;
    }
    
    mainCategories.forEach((mainCategory, index) => {
        const tab = document.createElement('div');
        tab.className = index === 0 ? 'nav-tab active' : 'nav-tab';
        tab.dataset.category = mainCategory;
        tab.textContent = mainCategory;
        tab.onclick = () => switchCategory(mainCategory);
        navTabs.appendChild(tab);
    });
}

// ========== 카테고리 전환 ==========
function switchCategory(categoryId) {
    console.log('🔄 카테고리 전환:', categoryId);
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === categoryId) {
            tab.classList.add('active');
        }
    });
    
    currentCategory = categoryId;
    loadCategoryData(categoryId);
}

// ========== 길이 가이드 (여성 전용) ==========
function showLengthGuide() {
    alert(`📏 여성 헤어 길이 가이드\n\n` +
          `A Length: 가슴 아래 (매우 긴 길이)\n` +
          `B Length: 가슴선 (긴 길이)\n` +
          `C Length: 어깨 아래 10cm (세미롱)\n` +
          `D Length: 어깨선 (미디엄)\n` +
          `E Length: 어깨 위 5cm (짧은 미디엄)\n` +
          `F Length: 턱선 (보브)\n` +
          `G Length: 턱 위 5cm (짧은 보브)\n` +
          `H Length: 귀 정도 (매우 짧은 길이)`);
}

// ========== 유틸리티 함수 ==========
function showEmptyState(message) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-title">데이터가 없습니다</div>
            <div class="empty-state-message">${message}</div>
        </div>
    `;
}

function showAdminInitializationRequired(message) {
    const navTabs = document.getElementById('navTabs');
    const content = document.getElementById('content');
    
    navTabs.innerHTML = `
        <div style="color: #FF69B4; padding: 15px 25px; text-align: center; width: 100%;">
            ⚠️ 어드민 초기화 필요
        </div>
    `;
    
    content.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔧</div>
            <div class="empty-state-title">어드민 초기화가 필요합니다</div>
            <div class="empty-state-message">
                ${message}<br><br>
                <strong>해결 방법:</strong><br>
                1. 어드민 페이지로 이동<br>
                2. "🚀 정리된 데이터로 초기화" 버튼 클릭<br>
                3. 이 페이지 새로고침
            </div>
        </div>
    `;
}

function updateSyncStatus(status, message) {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.textContent = message;
        syncStatus.className = 'sync-status ' + status;
        
        if (status === 'connected') {
            setTimeout(() => {
                syncStatus.style.opacity = '0';
            }, 3000);
        } else {
            syncStatus.style.opacity = '1';
        }
    }
}

// ========== 메뉴 토글 ==========
function toggleMenu() {
    const slideMenu = document.getElementById('slideMenu');
    const overlay = document.getElementById('overlay');
    
    if (slideMenu.classList.contains('show')) {
        slideMenu.classList.remove('show');
        overlay.classList.remove('show');
    } else {
        slideMenu.classList.add('show');
        overlay.classList.add('show');
    }
}

// ========== 성별 변경 ==========
function changeGender() {
    document.getElementById('mainContent').classList.remove('show');
    document.getElementById('genderSelection').classList.add('show');
    currentGender = null;
    currentCategory = null;
}

// ========== 로그아웃 ==========
function logout() {
    if (confirm('정말 로그아웃하시겠습니까?')) {
        sessionStorage.clear();
        location.reload();
    }
}

// ========== DOMContentLoaded ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 HAIRGATOR 초기화 시작');
    
    // 세션 체크
    if (!checkExistingSession()) {
        console.log('🔐 새로운 세션 - 로그인 필요');
    }
    
    console.log('✅ HAIRGATOR 초기화 완료');
});

console.log('✅ index-main.js 로드 완료 - 여성 A~H Length 적용');
