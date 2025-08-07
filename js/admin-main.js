// ========== HAIRGATOR 어드민 최종 완성 버전 ==========
// 🚀 모든 기능이 통합된 중복 없는 완전한 최종 버전
console.log('🚀 HAIRGATOR 어드민 최종 완성 버전 시작');

// ========== 전역 변수 ==========
let db = null;
let storage = null;
let firebaseConnected = false;
let selectedGender = null;
let selectedMainCategory = null;
let selectedSubCategory = null;
let hierarchyStructure = {};
let currentModalType = '';
let editingItem = null;

// Excel 기반 완전 구조 (LONG 포함)
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
        'LONG': ['A Length', 'B Length'],
        'SEMI LONG': ['C Length'],
        'MEDIUM': ['D Length', 'E Length'],
        'BOB': ['F Length', 'G Length'],
        'SHORT': ['H Length']
    }
};

// ========== Firebase 초기화 및 연결 ==========
async function initializeFirebase() {
    try {
        updateSyncIndicator('disconnected', '🔄 Firebase 연결 중...');
        
        let app;
        if (firebase.apps.length === 0) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }
        
        db = firebase.firestore();
        storage = firebase.storage();
        
        // 연결 테스트
        await testFirebaseConnection();
        
        firebaseConnected = true;
        updateSyncIndicator('connected', '✅ Firebase 연결 완료');
        
        // 구조 로드
        await loadHierarchyFromFirebase();
        
        addProgressLog('Firebase 초기화 완료', 'success');
        
    } catch (error) {
        console.error('❌ Firebase 초기화 오류:', error);
        handleFirebaseError(error);
    }
}

async function testFirebaseConnection() {
    try {
        const testQuery = await db.collection('test').limit(1).get();
        console.log('✅ Firestore 읽기 테스트 성공');
        
        await db.collection('test').doc('connection').set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            test: true,
            userAgent: navigator.userAgent
        });
        console.log('✅ Firestore 쓰기 테스트 성공');
        
        try {
            await db.collection('test').doc('connection').delete();
            console.log('🗑️ 테스트 문서 정리 완료');
        } catch (deleteError) {
            console.log('⚠️ 테스트 문서 정리 실패 (무시):', deleteError.message);
        }
        
    } catch (error) {
        console.error('❌ Firebase 연결 테스트 실패:', error);
        
        if (error.code === 'permission-denied') {
            throw new Error('Firebase Security Rules에서 읽기/쓰기 권한이 거부되었습니다.');
        } else if (error.code === 'failed-precondition') {
            throw new Error('Firebase 프로젝트 설정에 문제가 있습니다.');
        } else if (error.message.includes('400')) {
            throw new Error('Firebase 요청 형식이 올바르지 않습니다.');
        } else {
            throw error;
        }
    }
}

function handleFirebaseError(error) {
    console.error('🚨 Firebase 오류 처리:', error);
    let errorMessage = `Firebase 연결 실패: ${error.message}`;
    updateSyncIndicator('disconnected', '❌ ' + errorMessage);
    addProgressLog(errorMessage, 'error');
}

// ========== 계층구조 로드 ==========
async function loadHierarchyFromFirebase() {
    if (!firebaseConnected) {
        console.log('❌ Firebase 연결 없음');
        return;
    }
    
    try {
        console.log('📊 계층구조 로드 시작...');
        addProgressLog('계층구조 데이터 로드 중...', 'info');
        
        const snapshot = await db.collection('category_hierarchy').get();
        
        if (snapshot.empty) {
            console.log('⚠️ category_hierarchy가 비어있습니다');
            hierarchyStructure = {};
            addProgressLog('category_hierarchy가 비어있습니다', 'warning');
            return;
        }
        
        // 구조 초기화
        hierarchyStructure = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const gender = data.gender;
            const mainCategory = data.mainCategory;
            const subCategory = data.subCategory;
            
            if (!hierarchyStructure[gender]) {
                hierarchyStructure[gender] = {};
            }
            
            if (!hierarchyStructure[gender][mainCategory]) {
                hierarchyStructure[gender][mainCategory] = [];
            }
            
            if (!hierarchyStructure[gender][mainCategory].includes(subCategory)) {
                hierarchyStructure[gender][mainCategory].push(subCategory);
            }
        });
        
        console.log('✅ 계층구조 로드 완료:', hierarchyStructure);
        addProgressLog(`계층구조 로드 완료: ${snapshot.size}개 문서`, 'success');
        
        // 현재 선택된 성별이 있으면 UI 업데이트
        if (selectedGender) {
            updateMainCategoryList();
        }
        
    } catch (error) {
        console.error('❌ 계층구조 로드 실패:', error);
        addProgressLog(`계층구조 로드 실패: ${error.message}`, 'error');
    }
}

// ========== Excel 데이터 기반 초기화 ==========
async function initializeFirebaseWithExcelData() {
    if (!firebaseConnected) {
        addProgressLog('Firebase가 연결되지 않았습니다.', 'error');
        return;
    }
    
    if (!confirm('정말로 초기화하시겠습니까?\n기존 category_hierarchy 데이터가 모두 삭제됩니다.')) {
        return;
    }
    
    try {
        showProgress();
        addProgressLog('🚀 Excel 데이터 기반 초기화 시작');
        
        // 1. 기존 category_hierarchy 컬렉션 삭제
        addProgressLog('🗑️ 기존 category_hierarchy 데이터 삭제 중...');
        const batch = db.batch();
        const snapshot = await db.collection('category_hierarchy').get();
        
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        if (!snapshot.empty) {
            await batch.commit();
            addProgressLog(`🗑️ ${snapshot.size}개 기존 데이터 삭제 완료`);
        }
        
        // 2. 새 구조 생성
        addProgressLog('📊 새 카테고리 구조 생성 중...');
        const newBatch = db.batch();
        let createCount = 0;
        
        for (const [gender, categories] of Object.entries(PERFECT_STRUCTURE)) {
            for (const [mainCategory, subCategories] of Object.entries(categories)) {
                for (const subCategory of subCategories) {
                    const docRef = db.collection('category_hierarchy').doc();
                    newBatch.set(docRef, {
                        gender: gender,
                        mainCategory: mainCategory,
                        subCategory: subCategory,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    createCount++;
                }
            }
        }
        
        await newBatch.commit();
        addProgressLog(`✅ ${createCount}개 새 카테고리 구조 생성 완료`);
        
        // 3. 구조 다시 로드
        await loadHierarchyFromFirebase();
        
        addProgressLog('✅ 초기화 완료!', 'success');
        
    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        addProgressLog(`❌ 초기화 실패: ${error.message}`, 'error');
    }
}

// ========== UI 관리 함수들 ==========
function selectGender(gender) {
    console.log('👤 성별 선택됨:', gender);
    
    selectedGender = gender;
    selectedMainCategory = null;
    selectedSubCategory = null;
    
    // 성별 버튼 활성화 표시
    document.querySelectorAll('#genderList .selectable-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 클릭된 성별 버튼 활성화
    const genderButtons = document.querySelectorAll('#genderList .selectable-item');
    genderButtons.forEach(button => {
        if ((gender === 'male' && button.textContent.includes('남성')) ||
            (gender === 'female' && button.textContent.includes('여성'))) {
            button.classList.add('selected');
        }
    });
    
    // 브레드크럼 업데이트
    updateBreadcrumb();
    
    // 대분류 목록 업데이트
    updateMainCategoryList();
    
    // 중분류/스타일 목록 초기화
    clearSubCategoryList();
    clearStylesList();
    
    // 버튼 상태 업데이트
    document.getElementById('addMainCategoryBtn').disabled = false;
    document.getElementById('addSubCategoryBtn').disabled = true;
    document.getElementById('addStyleBtn').disabled = true;
    
    addProgressLog(`성별 선택: ${gender === 'male' ? '남성' : '여성'}`, 'info');
}

function updateMainCategoryList() {
    const container = document.getElementById('mainCategoryList');
    
    if (!selectedGender) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <div>성별을 선택하세요</div>
            </div>
        `;
        return;
    }
    
    if (!hierarchyStructure[selectedGender]) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <div>데이터를 불러오는 중...</div>
            </div>
        `;
        
        // 데이터가 없으면 다시 로드 시도
        loadHierarchyFromFirebase();
        return;
    }
    
    const mainCategories = Object.keys(hierarchyStructure[selectedGender]);
    
    if (mainCategories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <div>${selectedGender === 'male' ? '남성' : '여성'} 대분류가 없습니다</div>
            </div>
        `;
        return;
    }
    
    // 성별별 카테고리 순서 정렬
    const categoryOrder = {
        male: ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'],
        female: ['LONG', 'SEMI LONG', 'MEDIUM', 'BOB', 'SHORT']
    };
    
    const orderedCategories = categoryOrder[selectedGender] || mainCategories;
    const availableCategories = orderedCategories.filter(cat => mainCategories.includes(cat));
    
    console.log(`📂 ${selectedGender} 대분류 표시:`, availableCategories);
    
    container.innerHTML = availableCategories.map(category => {
        const subCount = hierarchyStructure[selectedGender][category]?.length || 0;
        return `
            <div class="selectable-item" onclick="selectMainCategory('${category}')">
                <span class="item-text">
                    ${category}
                    <small style="color: #666; display: block; font-size: 11px;">
                        ${subCount}개 중분류
                    </small>
                </span>
                <div class="item-actions">
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editMainCategory('${category}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteMainCategory('${category}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    
    addProgressLog(`${selectedGender === 'male' ? '남성' : '여성'} 대분류 ${availableCategories.length}개 표시 완료`, 'success');
}

function selectMainCategory(mainCategory) {
    console.log('📂 대분류 선택됨:', mainCategory);
    
    selectedMainCategory = mainCategory;
    selectedSubCategory = null;
    
    // 대분류 버튼 활성화 표시
    document.querySelectorAll('#mainCategoryList .selectable-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 클릭된 대분류 버튼 활성화
    event.target.closest('.selectable-item').classList.add('selected');
    
    // 브레드크럼 업데이트
    updateBreadcrumb();
    
    // 중분류 목록 업데이트
    updateSubCategoryList();
    
    // 스타일 목록 초기화
    clearStylesList();
    
    // 버튼 상태 업데이트
    document.getElementById('addSubCategoryBtn').disabled = false;
    document.getElementById('addStyleBtn').disabled = true;
    
    addProgressLog(`대분류 선택: ${mainCategory}`, 'info');
}

function updateSubCategoryList() {
    const container = document.getElementById('subCategoryList');
    
    if (!selectedGender || !selectedMainCategory) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <div>대분류를 선택하세요</div>
            </div>
        `;
        return;
    }
    
    if (!hierarchyStructure[selectedGender] || 
        !hierarchyStructure[selectedGender][selectedMainCategory]) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <div>중분류 데이터가 없습니다</div>
            </div>
        `;
        return;
    }
    
    const subCategories = hierarchyStructure[selectedGender][selectedMainCategory];
    
    if (subCategories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <div>${selectedMainCategory} 중분류가 없습니다</div>
            </div>
        `;
        return;
    }
    
    console.log(`📁 ${selectedMainCategory} 중분류 표시:`, subCategories);
    
    container.innerHTML = subCategories.map(category => `
        <div class="selectable-item" onclick="selectSubCategory('${category}')">
            <span class="item-text">${category}</span>
            <div class="item-actions">
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editSubCategory('${category}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteSubCategory('${category}')">🗑️</button>
            </div>
        </div>
    `).join('');
    
    addProgressLog(`${selectedMainCategory} 중분류 ${subCategories.length}개 표시 완료`, 'success');
}

function selectSubCategory(subCategory) {
    console.log('📁 중분류 선택됨:', subCategory);
    
    selectedSubCategory = subCategory;
    
    // 중분류 버튼 활성화 표시
    document.querySelectorAll('#subCategoryList .selectable-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 클릭된 중분류 버튼 활성화
    event.target.closest('.selectable-item').classList.add('selected');
    
    // 브레드크럼 업데이트
    updateBreadcrumb();
    
    // 스타일 목록 업데이트
    updateStylesList();
    
    // 버튼 상태 업데이트
    document.getElementById('addStyleBtn').disabled = false;
    
    addProgressLog(`중분류 선택: ${subCategory}`, 'info');
}

async function updateStylesList() {
    const container = document.getElementById('stylesList');
    
    if (!selectedGender || !selectedMainCategory || !selectedSubCategory) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">✂️</div>
                <div>중분류를 선택하세요</div>
            </div>
        `;
        return;
    }
    
    try {
        addProgressLog(`${selectedSubCategory} 스타일 조회 중...`, 'info');
        
        // 해당 카테고리의 스타일들 조회
        const stylesSnapshot = await db.collection('hairstyles')
            .where('gender', '==', selectedGender)
            .where('mainCategory', '==', selectedMainCategory)
            .where('subCategory', '==', selectedSubCategory)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (stylesSnapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✂️</div>
                    <div>${selectedSubCategory}에 등록된 스타일이 없습니다</div>
                </div>
            `;
            addProgressLog(`${selectedSubCategory} 스타일 없음`, 'warning');
            return;
        }
        
        const styles = [];
        stylesSnapshot.forEach(doc => {
            styles.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        container.innerHTML = styles.map(style => `
            <div class="style-item" onclick="selectStyle('${style.id}')">
                <div class="style-image">
                    <img src="${style.imageUrl}" alt="${style.name}" onerror="this.src='images/no-image.png'" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;">
                </div>
                <div class="style-info">
                    <div class="style-code">${style.code}</div>
                    <div class="style-name">${style.name}</div>
                    <div class="style-views">👀 ${style.views || 0}</div>
                </div>
                <div class="style-actions">
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); editStyle('${style.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); deleteStyle('${style.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
        
        addProgressLog(`${selectedSubCategory} 스타일 ${styles.length}개 표시 완료`, 'success');
        
    } catch (error) {
        console.error('❌ 스타일 목록 로드 실패:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div>스타일 목록 로드 실패</div>
                <div style="font-size: 12px; color: #666; margin-top: 10px;">${error.message}</div>
            </div>
        `;
        addProgressLog(`스타일 목록 로드 실패: ${error.message}`, 'error');
    }
}

function clearSubCategoryList() {
    document.getElementById('subCategoryList').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📂</div>
            <div>대분류를 선택하세요</div>
        </div>
    `;
}

function clearStylesList() {
    document.getElementById('stylesList').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">✂️</div>
            <div>중분류를 선택하세요</div>
        </div>
    `;
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    const parts = [];
    
    if (selectedGender) {
        parts.push(selectedGender === 'male' ? '👨 남성' : '👩 여성');
    }
    
    if (selectedMainCategory) {
        parts.push(selectedMainCategory);
    }
    
    if (selectedSubCategory) {
        parts.push(selectedSubCategory);
    }
    
    if (parts.length === 0) {
        parts.push('성별을 선택하세요');
    }
    
    breadcrumb.innerHTML = parts.map((part, index) => 
        `<span class="breadcrumb-item ${index === parts.length - 1 ? 'active' : ''}">${part}</span>`
    ).join(' > ');
}

// ========== 현재 구조 확인 ==========
async function checkCurrentStructure() {
    if (!firebaseConnected) {
        addProgressLog('Firebase가 연결되지 않았습니다.', 'error');
        return;
    }
    
    try {
        showProgress();
        addProgressLog('📊 현재 구조 확인 중...');
        
        // category_hierarchy 확인
        const hierarchySnapshot = await db.collection('category_hierarchy').get();
        addProgressLog(`📂 category_hierarchy: ${hierarchySnapshot.size}개 문서`);
        
        if (hierarchySnapshot.empty) {
            addProgressLog('⚠️ category_hierarchy가 비어있습니다. 초기화가 필요합니다.', 'warning');
        }
        
        // hairstyles 확인
        const stylesSnapshot = await db.collection('hairstyles').get();
        addProgressLog(`✂️ hairstyles: ${stylesSnapshot.size}개 문서`);
        
        addProgressLog('✅ 구조 확인 완료', 'success');
        
    } catch (error) {
        console.error('❌ 구조 확인 실패:', error);
        addProgressLog(`❌ 구조 확인 실패: ${error.message}`, 'error');
    }
}

// ========== 연결 테스트 ==========
async function testConnection() {
    try {
        showProgress();
        addProgressLog('🌐 연결 테스트 시작...');
        
        await testFirebaseConnection();
        
        addProgressLog('🌐 모든 연결 테스트 성공!', 'success');
        
    } catch (error) {
        console.error('❌ 연결 테스트 실패:', error);
        addProgressLog(`❌ 연결 테스트 실패: ${error.message}`, 'error');
    }
}

// ========== UI 헬퍼 함수들 ==========
function updateSyncIndicator(status, message) {
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
        indicator.className = `sync-indicator ${status}`;
        indicator.textContent = message;
    }
    console.log(`🔄 상태: ${status} - ${message}`);
}

function showProgress() {
    const container = document.getElementById('initProgress');
    if (container) {
        container.style.display = 'block';
        document.getElementById('progressLog').innerHTML = '';
    }
}

function addProgressLog(message, type = 'info') {
    const log = document.getElementById('progressLog');
    if (log) {
        const div = document.createElement('div');
        div.className = `progress-item ${type}`;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }
    console.log(`📝 진행: ${message}`);
}

// ========== 기본 기능들 (빈 함수로 오류 방지) ==========
function loadCustomerData() {
    addProgressLog('고객 데이터 조회 기능은 준비 중입니다.', 'warning');
}

function loadDesignerData() {
    addProgressLog('디자이너 목록 조회 기능은 준비 중입니다.', 'warning');
}

function exportCustomerData() {
    addProgressLog('고객 데이터 내보내기 기능은 준비 중입니다.', 'warning');
}

function clearAllCustomerData() {
    addProgressLog('고객 데이터 삭제 기능은 준비 중입니다.', 'warning');
}

function showAddCategoryModal(type) {
    addProgressLog(`${type} 카테고리 추가 기능은 준비 중입니다.`, 'warning');
}

function closeCategoryModal() {
    console.log('카테고리 모달 닫기');
}

function showAddStyleModal() {
    addProgressLog('스타일 추가 기능은 준비 중입니다.', 'warning');
}

function closeStyleModal() {
    console.log('스타일 모달 닫기');
}

function previewImage() {
    console.log('이미지 미리보기');
}

function refreshUI() {
    console.log('UI 새로고침');
    
    // 선택 상태 초기화
    selectedGender = null;
    selectedMainCategory = null;
    selectedSubCategory = null;
    
    // UI 초기화
    document.querySelectorAll('.selectable-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    clearSubCategoryList();
    clearStylesList();
    updateBreadcrumb();
    
    // 버튼 상태 초기화
    document.getElementById('addMainCategoryBtn').disabled = true;
    document.getElementById('addSubCategoryBtn').disabled = true;
    document.getElementById('addStyleBtn').disabled = true;
    
    // 대분류 목록 초기화
    document.getElementById('mainCategoryList').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📁</div>
            <div>성별을 선택하세요</div>
        </div>
    `;
    
    addProgressLog('UI 새로고침 완료', 'success');
}

function syncToIndex() {
    addProgressLog('인덱스 반영 기능은 준비 중입니다.', 'warning');
}

// ========== 빈 함수들 (오류 방지) ==========
function editMainCategory(category) {
    addProgressLog(`대분류 "${category}" 편집 기능은 준비 중입니다.`, 'warning');
}

function deleteMainCategory(category) {
    addProgressLog(`대분류 "${category}" 삭제 기능은 준비 중입니다.`, 'warning');
}

function editSubCategory(category) {
    addProgressLog(`중분류 "${category}" 편집 기능은 준비 중입니다.`, 'warning');
}

function deleteSubCategory(category) {
    addProgressLog(`중분류 "${category}" 삭제 기능은 준비 중입니다.`, 'warning');
}

function selectStyle(styleId) {
    console.log('스타일 선택됨:', styleId);
    addProgressLog(`스타일 선택: ${styleId}`, 'info');
}

function editStyle(styleId) {
    addProgressLog(`스타일 편집 기능은 준비 중입니다.`, 'warning');
}

function deleteStyle(styleId) {
    addProgressLog(`스타일 삭제 기능은 준비 중입니다.`, 'warning');
}

// ========== 디버그 함수들 (통합) ==========
window.debugData = {
    checkConnection: async function() {
        console.log('🔍 Firebase 연결 상태 확인...');
        console.log('firebaseConnected:', firebaseConnected);
        console.log('db 인스턴스:', db);
        
        if (!db) {
            console.error('❌ db 인스턴스가 없습니다');
            return;
        }
        
        try {
            const testDoc = await db.collection('test').doc('debug').set({
                timestamp: new Date(),
                test: true
            });
            console.log('✅ Firebase 쓰기 테스트 성공');
            
            await db.collection('test').doc('debug').delete();
            console.log('✅ Firebase 삭제 테스트 성공');
        } catch (error) {
            console.error('❌ Firebase 테스트 실패:', error);
        }
    },
    
    checkHierarchy: async function() {
        console.log('📊 category_hierarchy 데이터 확인...');
        
        if (!db) {
            console.error('❌ Firebase가 연결되지 않았습니다');
            return;
        }
        
        try {
            const snapshot = await db.collection('category_hierarchy').get();
            console.log(`📂 총 ${snapshot.size}개 문서 발견`);
            
            if (snapshot.empty) {
                console.error('❌ category_hierarchy가 비어있습니다!');
                return;
            }
            
            const data = {};
            snapshot.forEach(doc => {
                const docData = doc.data();
                console.log('📄 문서:', docData);
                
                if (!data[docData.gender]) {
                    data[docData.gender] = {};
                }
                if (!data[docData.gender][docData.mainCategory]) {
                    data[docData.gender][docData.mainCategory] = [];
                }
                if (!data[docData.gender][docData.mainCategory].includes(docData.subCategory)) {
                    data[docData.gender][docData.mainCategory].push(docData.subCategory);
                }
            });
            
            console.log('📊 정리된 데이터:', data);
            
            if (data.male) {
                console.log('👨 남성 데이터:');
                for (const [main, subs] of Object.entries(data.male)) {
                    console.log(`  📂 ${main}: [${subs.join(', ')}]`);
                }
            }
            
            if (data.female) {
                console.log('👩 여성 데이터:');
                for (const [main, subs] of Object.entries(data.female)) {
                    console.log(`  📂 ${main}: [${subs.join(', ')}]`);
                }
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ 데이터 조회 실패:', error);
        }
    },
    
    checkStyles: async function() {
        console.log('✂️ hairstyles 데이터 확인...');
        
        if (!db) {
            console.error('❌ Firebase가 연결되지 않았습니다');
            return;
        }
        
        try {
            const snapshot = await db.collection('hairstyles').get();
            console.log(`✂️ 총 ${snapshot.size}개 스타일 발견`);
            
            if (snapshot.empty) {
                console.log('⚠️ hairstyles가 비어있습니다');
                return;
            }
            
            const stats = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const key = `${data.gender}-${data.mainCategory}-${data.subCategory}`;
                if (!stats[key]) {
                    stats[key] = 0;
                }
                stats[key]++;
            });
            
            console.log('📊 스타일 통계:', stats);
            return stats;
            
        } catch (error) {
            console.error('❌ 스타일 조회 실패:', error);
        }
    },
    
    fullDiagnosis: async function() {
        console.log('🏥 HAIRGATOR 전체 진단 시작...');
        console.log('=====================================');
        
        await this.checkConnection();
        console.log('-------------------------------------');
        
        const hierarchyData = await this.checkHierarchy();
        console.log('-------------------------------------');
        
        await this.checkStyles();
        console.log('=====================================');
        
        console.log('💡 메인 페이지 수정 권장사항:');
        
        if (hierarchyData && hierarchyData.male && Object.keys(hierarchyData.male).length > 0) {
            console.log('✅ 남성 데이터 존재 - 메인 페이지에서 로딩 로직 확인 필요');
        }
        
        if (hierarchyData && hierarchyData.female && Object.keys(hierarchyData.female).length > 0) {
            console.log('✅ 여성 데이터 존재 - 메인 페이지에서 로딩 로직 확인 필요');
        }
        
        console.log('=====================================');
    }
};

// ========== 전역 함수 등록 ==========
window.initializeFirebaseWithExcelData = initializeFirebaseWithExcelData;
window.checkCurrentStructure = checkCurrentStructure;
window.testConnection = testConnection;
window.loadCustomerData = loadCustomerData;
window.loadDesignerData = loadDesignerData;
window.exportCustomerData = exportCustomerData;
window.clearAllCustomerData = clearAllCustomerData;
window.selectGender = selectGender;
window.selectMainCategory = selectMainCategory;
window.selectSubCategory = selectSubCategory;
window.showAddCategoryModal = showAddCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.showAddStyleModal = showAddStyleModal;
window.closeStyleModal = closeStyleModal;
window.previewImage = previewImage;
window.refreshUI = refreshUI;
window.syncToIndex = syncToIndex;
window.editMainCategory = editMainCategory;
window.deleteMainCategory = deleteMainCategory;
window.editSubCategory = editSubCategory;
window.deleteSubCategory = deleteSubCategory;
window.selectStyle = selectStyle;
window.editStyle = editStyle;
window.deleteStyle = deleteStyle;

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM 로드 완료, Firebase 초기화 시작...');
    
    // Firebase 초기화 직접 실행
    initializeFirebase();
    
    // 5초 후 자동 진단
    setTimeout(() => {
        console.log('🔍 자동 진단 시작...');
        window.debugData.fullDiagnosis();
    }, 5000);
});

// 전역 오류 처리
window.addEventListener('error', function(event) {
    console.error('🚨 전역 오류:', event.error);
    if (typeof addProgressLog === 'function') {
        addProgressLog(`🚨 오류: ${event.error.message}`, 'error');
    }
});

console.log('✅ HAIRGATOR 어드민 최종 완성 버전 로드 완료!');
console.log('📋 디버그 명령어: debugData.checkConnection(), debugData.fullDiagnosis()');
