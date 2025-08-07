// ========== 메뉴 관련 전역 변수 ==========
let currentGender = null;
let currentCategory = null;
let currentSubcategory = 'None';
let currentTheme = localStorage.getItem('hairgator_theme') || 'dark';

// ========== 카테고리 구조 ==========
const CATEGORIES = {
    male: ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'],
    female: ['A Length', 'B Length', 'C Length', 'D Length', 'E Length', 'F Length', 'G Length', 'H Length']
};

const SUBCATEGORIES = ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone'];

// ========== 성별 선택 ==========
function selectGender(gender) {
    currentGender = gender;
    
    // 테마 클래스 적용
    document.body.className = gender + '-theme';
    
    // 화면 전환
    document.getElementById('genderScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'block';
    
    // 카테고리 로드
    loadCategories();
    
    console.log('✅ Gender selected:', gender);
}

// ========== 카테고리 로드 ==========
function loadCategories() {
    const categories = CATEGORIES[currentGender];
    const tabsContainer = document.getElementById('categoryTabs');
    
    // 탭 생성
    tabsContainer.innerHTML = '';
    
    categories.forEach((category, index) => {
        const tab = document.createElement('div');
        tab.className = 'category-tab';
        tab.textContent = category;
        tab.onclick = () => selectCategory(category);
        
        if (index === 0) {
            tab.classList.add('active');
        }
        
        tabsContainer.appendChild(tab);
    });
    
    // 첫 번째 카테고리 자동 선택
    if (categories.length > 0) {
        selectCategory(categories[0]);
    }
}

// ========== 카테고리 선택 ==========
function selectCategory(category) {
    currentCategory = category;
    
    // 탭 활성화
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent === category) {
            tab.classList.add('active');
        }
    });
    
    // 서브카테고리 로드
    loadSubcategories();
    
    console.log('✅ Category selected:', category);
}

// ========== 서브카테고리 로드 ==========
function loadSubcategories() {
    const tabsContainer = document.getElementById('subcategoryTabs');
    
    // 탭 생성
    tabsContainer.innerHTML = '';
    
    SUBCATEGORIES.forEach((subcategory, index) => {
        const tab = document.createElement('div');
        tab.className = 'subcategory-tab';
        tab.textContent = subcategory;
        tab.onclick = () => selectSubcategory(subcategory);
        
        if (index === 0) {
            tab.classList.add('active');
        }
        
        tabsContainer.appendChild(tab);
    });
    
    // 첫 번째 서브카테고리 자동 선택
    selectSubcategory(SUBCATEGORIES[0]);
}

// ========== 서브카테고리 선택 ==========
function selectSubcategory(subcategory) {
    currentSubcategory = subcategory;
    
    // 탭 활성화
    document.querySelectorAll('.subcategory-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent === subcategory) {
            tab.classList.add('active');
        }
    });
    
    // 스타일 로드
    loadStyles();
    
    console.log('✅ Subcategory selected:', subcategory);
}

// ========== 스타일 로드 ==========
async function loadStyles() {
    const grid = document.getElementById('stylesGrid');
    
    // 로딩 표시
    showLoading('스타일 로딩 중...');
    
    try {
        // Firebase에서 스타일 조회
        const query = db.collection('hairstyles')
            .where('gender', '==', currentGender)
            .where('mainCategory', '==', currentCategory)
            .where('subCategory', '==', currentSubcategory)
            .orderBy('createdAt', 'desc')
            .limit(100);
        
        const snapshot = await query.get();
        
        hideLoading();
        
        if (snapshot.empty) {
            // 빈 상태 표시
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;">✂️</div>
                    <div style="font-size: 20px; margin-bottom: 10px; color: var(--text-primary);">
                        스타일이 없습니다
                    </div>
                    <div style="font-size: 14px; color: var(--text-secondary);">
                        이 카테고리에 등록된 스타일이 없습니다
                    </div>
                </div>
            `;
            return;
        }
        
        // 스타일 카드 생성
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const imageUrl = data.imageUrl || generatePlaceholder(data.name);
            
            html += `
                <div class="style-card" onclick="openStyleModal('${doc.id}', '${data.code}', '${data.name}', '${imageUrl}')">
                    <img class="style-image" src="${imageUrl}" alt="${data.name}" onerror="this.src='${generatePlaceholder(data.name)}'">
                    <div class="style-info">
                        <div class="style-code">${data.code}</div>
                        <div class="style-name">${data.name}</div>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
        
    } catch (error) {
        console.error('Load styles error:', error);
        hideLoading();
        
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;">⚠️</div>
                <div style="font-size: 20px; margin-bottom: 10px; color: var(--text-primary);">
                    오류 발생
                </div>
                <div style="font-size: 14px; color: var(--text-secondary);">
                    스타일을 불러올 수 없습니다
                </div>
            </div>
        `;
    }
}

// ========== 플레이스홀더 이미지 생성 ==========
function generatePlaceholder(text) {
    const encoded = encodeURIComponent(text || '이미지 준비중');
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"%3E%3Crect width="300" height="400" fill="%23222"%3E%3C/rect%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23666" font-family="Arial" font-size="14"%3E${encoded}%3C/text%3E%3C/svg%3E`;
}

// ========== 스타일 모달 ==========
function openStyleModal(id, code, name, imageUrl) {
    const modal = document.getElementById('styleModal');
    
    document.getElementById('modalImage').src = imageUrl;
    document.getElementById('modalCode').textContent = code;
    document.getElementById('modalName').textContent = name;
    
    modal.classList.add('active');
    
    // 현재 스타일 정보 저장
    modal.dataset.styleId = id;
    modal.dataset.styleCode = code;
    modal.dataset.styleName = name;
}

function closeStyleModal() {
    document.getElementById('styleModal').classList.remove('active');
}

// ========== 고객 등록 ==========
async function addCustomer() {
    const modal = document.getElementById('styleModal');
    const styleId = modal.dataset.styleId;
    const styleCode = modal.dataset.styleCode;
    const styleName = modal.dataset.styleName;
    
    const customerName = prompt('고객 이름을 입력하세요:');
    if (!customerName) return;
    
    const customerPhone = prompt('고객 전화번호를 입력하세요:');
    if (!customerPhone) return;
    
    showLoading('고객 등록 중...');
    
    try {
        // 고객 등록
        await db.collection('customers').add({
            designerId: currentDesigner,
            designerName: currentDesignerName,
            customerName: customerName,
            customerPhone: customerPhone,
            gender: currentGender,
            styleHistory: [{
                styleId: styleId,
                styleCode: styleCode,
                styleName: styleName,
                category: currentCategory,
                subcategory: currentSubcategory,
                date: new Date()
            }],
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        hideLoading();
        alert('고객이 등록되었습니다!');
        closeStyleModal();
        
    } catch (error) {
        console.error('Add customer error:', error);
        hideLoading();
        alert('고객 등록 중 오류가 발생했습니다.');
    }
}

// ========== 메뉴 토글 ==========
function toggleMenu() {
    const menu = document.getElementById('slideMenu');
    const overlay = document.getElementById('menuOverlay');
    
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
}

// ========== 테마 전환 ==========
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('hairgator_theme', currentTheme);
    
    console.log('✅ Theme changed:', currentTheme);
}

// ========== 네비게이션 ==========
function goBack() {
    document.getElementById('mainScreen').style.display = 'none';
    document.getElementById('genderScreen').style.display = 'flex';
    currentGender = null;
    currentCategory = null;
    currentSubcategory = null;
}

function changeGender() {
    toggleMenu();
    goBack();
}

// ========== 기타 메뉴 기능 ==========
function openCustomerModal() {
    toggleMenu();
    alert('고객 관리 기능은 준비 중입니다.');
}

function openStatsModal() {
    toggleMenu();
    alert('통계 기능은 준비 중입니다.');
}