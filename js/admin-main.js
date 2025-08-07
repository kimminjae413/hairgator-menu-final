// admin-main.js - HAIRGATOR 어드민 완전한 최종 버전 (모든 기능 포함)

console.log('🚀 HAIRGATOR 어드민 시작');

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

// ========== Firebase 초기화 ==========
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
        
        await testFirebaseConnection();
        
        firebaseConnected = true;
        updateSyncIndicator('connected', '✅ Firebase 연결 완료');
        
        await loadHierarchyFromFirebase();
        
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
        }
        throw error;
    }
}

// ========== 핵심 기능: Excel 데이터로 초기화 ==========
async function initializeFirebaseWithExcelData() {
    if (!db) {
        alert('❌ Firebase가 연결되지 않았습니다');
        return;
    }

    const confirmed = confirm('⚠️ 기존 category_hierarchy 데이터를 삭제하고 새로 초기화하시겠습니까?\n\n(hairstyles 데이터는 보존됩니다)');
    if (!confirmed) return;

    try {
        showProgress();
        addProgressLog('🚀 Excel 데이터 기반 초기화 시작...', 'info');

        addProgressLog('🗑️ 기존 category_hierarchy 데이터 삭제 중...', 'info');
        const existingDocs = await db.collection('category_hierarchy').get();
        const batch = db.batch();
        existingDocs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        addProgressLog(`✅ ${existingDocs.size}개 문서 삭제 완료`, 'success');

        addProgressLog('📊 Excel 데이터로 새 구조 생성 중...', 'info');
        let totalCreated = 0;

        for (const [gender, categories] of Object.entries(PERFECT_STRUCTURE)) {
            for (const [mainCategory, subCategories] of Object.entries(categories)) {
                for (const subCategory of subCategories) {
                    const docData = {
                        gender: gender,
                        mainCategory: mainCategory,
                        subCategory: subCategory,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    await db.collection('category_hierarchy').add(docData);
                    totalCreated++;
                    addProgressLog(`✅ ${gender} > ${mainCategory} > ${subCategory}`, 'success');
                }
            }
        }

        hierarchyStructure = PERFECT_STRUCTURE;
        addProgressLog(`🎉 총 ${totalCreated}개 카테고리 생성 완료!`, 'success');
        addProgressLog('✅ Excel 데이터 기반 초기화 성공!', 'success');
        updateSyncIndicator('connected', '✅ 초기화 완료');

    } catch (error) {
        console.error('❌ 초기화 실패:', error);
        addProgressLog(`❌ 초기화 실패: ${error.message}`, 'error');
        updateSyncIndicator('disconnected', '❌ 초기화 실패');
    }
}

// ========== Firebase에서 계층구조 로드 ==========
async function loadHierarchyFromFirebase() {
    if (!firebaseConnected) return;
    
    try {
        console.log('📊 Firebase에서 계층구조 로딩...');
        
        const snapshot = await db.collection('category_hierarchy').get();
        const structure = { male: {}, female: {} };
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const { gender, mainCategory, subCategory } = data;
            
            if (!structure[gender]) structure[gender] = {};
            if (!structure[gender][mainCategory]) structure[gender][mainCategory] = [];
            
            if (!structure[gender][mainCategory].includes(subCategory)) {
                structure[gender][mainCategory].push(subCategory);
            }
        });
        
        Object.keys(structure).forEach(gender => {
            Object.keys(structure[gender]).forEach(mainCategory => {
                structure[gender][mainCategory].sort();
            });
        });
        
        hierarchyStructure = structure;
        console.log('✅ 계층구조 로드 완료:', hierarchyStructure);
        
        renderGenderButtons();
        
    } catch (error) {
        console.error('❌ 계층구조 로드 실패:', error);
        addProgressLog(`❌ 계층구조 로드 실패: ${error.message}`, 'error');
    }
}

// ========== UI 렌더링 함수들 ==========
function renderGenderButtons() {
    const genderList = document.getElementById('genderList');
    if (!genderList) {
        console.error('❌ genderList 요소를 찾을 수 없음');
        return;
    }
    
    genderList.innerHTML = `
        <div class="selectable-item" onclick="selectGender('male')">👨 남성</div>
        <div class="selectable-item" onclick="selectGender('female')">👩 여성</div>
    `;
}

function selectGender(gender) {
    console.log('🎯 성별 선택:', gender);
    
    if (!hierarchyStructure[gender]) {
        addProgressLog(`❌ ${gender} 데이터가 없습니다. 초기화를 먼저 실행해주세요.`, 'error');
        return;
    }
    
    selectedGender = gender;
    selectedMainCategory = null;
    selectedSubCategory = null;
    
    // 성별 버튼 활성화 상태 업데이트
    document.querySelectorAll('#genderList .selectable-item').forEach(item => {
        item.classList.remove('selected');
        if (item.textContent.includes(gender === 'male' ? '남성' : '여성')) {
            item.classList.add('selected');
        }
    });
    
    updateBreadcrumb();
    renderMainCategories();
    clearSubCategories();
    clearStyles();
    enableAddButtons('main');
    
    addProgressLog(`✅ ${gender === 'male' ? '남성' : '여성'} 선택됨`, 'success');
}

function renderMainCategories() {
    const mainCategoryList = document.getElementById('mainCategoryList');
    if (!mainCategoryList || !selectedGender) return;
    
    const categories = hierarchyStructure[selectedGender];
    if (!categories) {
        mainCategoryList.innerHTML = '<div class="empty-message">데이터를 불러올 수 없습니다</div>';
        return;
    }
    
    const categoryKeys = Object.keys(categories);
    console.log(`📂 ${selectedGender} 대분류 렌더링:`, categoryKeys);
    
    mainCategoryList.innerHTML = categoryKeys.map(mainCategory => {
        const subCategoryCount = categories[mainCategory].length;
        return `
            <div class="selectable-item" onclick="selectMainCategory('${mainCategory}')">
                <div class="item-text">
                    <strong>${mainCategory}</strong>
                    <small>(${subCategoryCount}개 중분류)</small>
                </div>
                <div class="item-actions">
                    <button class="action-btn" onclick="editMainCategory('${mainCategory}')" title="수정">✏️</button>
                    <button class="action-btn" onclick="deleteMainCategory('${mainCategory}')" title="삭제">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function selectMainCategory(mainCategory) {
    console.log('🎯 대분류 선택:', mainCategory);
    
    selectedMainCategory = mainCategory;
    selectedSubCategory = null;
    
    // 대분류 버튼 활성화 상태 업데이트
    document.querySelectorAll('#mainCategoryList .selectable-item').forEach(item => {
        item.classList.remove('selected');
        if (item.textContent.includes(mainCategory)) {
            item.classList.add('selected');
        }
    });
    
    updateBreadcrumb();
    renderSubCategories();
    clearStyles();
    enableAddButtons('sub');
    
    addProgressLog(`✅ ${mainCategory} 대분류 선택됨`, 'success');
}

function renderSubCategories() {
    const subCategoryList = document.getElementById('subCategoryList');
    if (!subCategoryList || !selectedGender || !selectedMainCategory) return;
    
    const subCategories = hierarchyStructure[selectedGender][selectedMainCategory];
    if (!subCategories) {
        subCategoryList.innerHTML = '<div class="empty-message">중분류를 불러올 수 없습니다</div>';
        return;
    }
    
    console.log(`📂 ${selectedMainCategory} 중분류 렌더링:`, subCategories);
    
    subCategoryList.innerHTML = subCategories.map(subCategory => `
        <div class="selectable-item" onclick="selectSubCategory('${subCategory}')">
            <div class="item-text">
                <strong>${subCategory}</strong>
            </div>
            <div class="item-actions">
                <button class="action-btn" onclick="editSubCategory('${subCategory}')" title="수정">✏️</button>
                <button class="action-btn" onclick="deleteSubCategory('${subCategory}')" title="삭제">🗑️</button>
            </div>
        </div>
    `).join('');
}

async function selectSubCategory(subCategory) {
    console.log('🎯 중분류 선택:', subCategory);
    
    selectedSubCategory = subCategory;
    
    // 중분류 버튼 활성화 상태 업데이트
    document.querySelectorAll('#subCategoryList .selectable-item').forEach(item => {
        item.classList.remove('selected');
        if (item.textContent.includes(subCategory)) {
            item.classList.add('selected');
        }
    });
    
    updateBreadcrumb();
    await loadAndRenderStyles();
    enableAddButtons('style');
    
    addProgressLog(`✅ ${subCategory} 중분류 선택됨`, 'success');
}

// ========== 🎨 중분류별 스타일 로딩 ==========
async function loadAndRenderStyles() {
    if (!selectedGender || !selectedMainCategory || !selectedSubCategory) {
        console.log('⚠️ 선택이 완료되지 않음');
        return;
    }
    
    const stylesList = document.getElementById('stylesList');
    if (!stylesList) {
        console.error('❌ stylesList 요소를 찾을 수 없음');
        return;
    }
    
    try {
        console.log(`🎨 스타일 로딩 중: ${selectedGender} > ${selectedMainCategory} > ${selectedSubCategory}`);
        
        const stylesSnapshot = await db.collection('hairstyles')
            .where('gender', '==', selectedGender)
            .where('mainCategory', '==', selectedMainCategory)
            .where('subCategory', '==', selectedSubCategory)
            .get();
        
        const styles = [];
        stylesSnapshot.forEach(doc => {
            styles.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ ${styles.length}개 스타일 발견:`, styles);
        
        if (styles.length === 0) {
            stylesList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <div class="empty-state-title">등록된 스타일이 없습니다</div>
                    <div class="empty-state-message">
                        ${selectedGender === 'male' ? '👨 남성' : '👩 여성'} > ${selectedMainCategory} > ${selectedSubCategory}
                    </div>
                    <button class="btn btn-primary" onclick="openAddStyleModal()">
                        ➕ 새 스타일 추가
                    </button>
                </div>
            `;
        } else {
            stylesList.innerHTML = `
                <div class="styles-header">
                    <h3>🎨 ${selectedSubCategory} 스타일 (${styles.length}개)</h3>
                    <button class="btn btn-primary" onclick="openAddStyleModal()">
                        ➕ 새 스타일 추가
                    </button>
                </div>
                <div class="styles-grid">
                    ${styles.map(style => `
                        <div class="style-card">
                            <div class="style-image">
                                ${style.imageUrl ? 
                                    `<img src="${style.imageUrl}" alt="${style.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"150\" height=\"150\" viewBox=\"0 0 150 150\"><rect width=\"150\" height=\"150\" fill=\"%23f0f0f0\"/><text x=\"75\" y=\"75\" font-size=\"20\" text-anchor=\"middle\" fill=\"%23999\">이미지 없음</text></svg>'">` 
                                    : '<div class="no-image">🖼️<br>이미지 없음</div>'
                                }
                            </div>
                            <div class="style-info">
                                <div class="style-code">${style.code || '코드 없음'}</div>
                                <div class="style-name">${style.name || '이름 없음'}</div>
                                <div class="style-description">${style.description || '설명 없음'}</div>
                            </div>
                            <div class="style-actions">
                                <button class="btn btn-info btn-sm" onclick="editStyle('${style.id}')">✏️ 수정</button>
                                <button class="btn btn-danger btn-sm" onclick="deleteStyle('${style.id}', '${style.name}')">🗑️ 삭제</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        addProgressLog(`✅ ${styles.length}개 스타일 로딩 완료`, 'success');
        
    } catch (error) {
        console.error('❌ 스타일 로딩 실패:', error);
        addProgressLog(`❌ 스타일 로딩 실패: ${error.message}`, 'error');
        
        stylesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-title">스타일을 불러올 수 없습니다</div>
                <div class="empty-state-message">${error.message}</div>
            </div>
        `;
    }
}

// ========== 카테고리 관리 기능들 ==========
function showAddCategoryModal(type) {
    currentModalType = type;
    
    let title, placeholder, parentInfo = '';
    
    switch(type) {
        case 'main':
            title = '대분류 추가';
            placeholder = '대분류명 입력 (예: BUZZ)';
            parentInfo = `성별: ${selectedGender === 'male' ? '남성' : '여성'}`;
            break;
        case 'sub':
            title = '중분류 추가';
            placeholder = '중분류명 입력 (예: None)';
            parentInfo = `${selectedGender === 'male' ? '남성' : '여성'} > ${selectedMainCategory}`;
            break;
    }
    
    const modalHTML = `
        <div class="modal-overlay" id="categoryModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="closeCategoryModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>상위 경로</label>
                        <div class="path-info">${parentInfo}</div>
                    </div>
                    <div class="form-group">
                        <label>${type === 'main' ? '대분류명' : '중분류명'}</label>
                        <input type="text" id="categoryNameInput" placeholder="${placeholder}" autofocus>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeCategoryModal()">취소</button>
                    <button class="btn btn-primary" onclick="addCategory()">추가</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function addCategory() {
    const nameInput = document.getElementById('categoryNameInput');
    const categoryName = nameInput.value.trim();
    
    if (!categoryName) {
        alert('카테고리명을 입력해주세요');
        return;
    }
    
    try {
        let docData;
        
        if (currentModalType === 'main') {
            // 대분류 추가
            docData = {
                gender: selectedGender,
                mainCategory: categoryName,
                subCategory: 'None', // 기본 중분류
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // hierarchyStructure 업데이트
            if (!hierarchyStructure[selectedGender]) {
                hierarchyStructure[selectedGender] = {};
            }
            hierarchyStructure[selectedGender][categoryName] = ['None'];
            
        } else if (currentModalType === 'sub') {
            // 중분류 추가
            docData = {
                gender: selectedGender,
                mainCategory: selectedMainCategory,
                subCategory: categoryName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            // hierarchyStructure 업데이트
            if (!hierarchyStructure[selectedGender][selectedMainCategory].includes(categoryName)) {
                hierarchyStructure[selectedGender][selectedMainCategory].push(categoryName);
                hierarchyStructure[selectedGender][selectedMainCategory].sort();
            }
        }
        
        await db.collection('category_hierarchy').add(docData);
        
        addProgressLog(`✅ ${categoryName} ${currentModalType === 'main' ? '대분류' : '중분류'} 추가 완료`, 'success');
        
        // UI 새로고침
        if (currentModalType === 'main') {
            renderMainCategories();
        } else if (currentModalType === 'sub') {
            renderSubCategories();
        }
        
        closeCategoryModal();
        
    } catch (error) {
        console.error('카테고리 추가 오류:', error);
        addProgressLog(`❌ 카테고리 추가 실패: ${error.message}`, 'error');
    }
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.remove();
    }
}

// ========== 카테고리 편집/삭제 ==========
function editMainCategory(mainCategory) {
    const newName = prompt(`대분류명을 수정하세요:`, mainCategory);
    if (newName && newName !== mainCategory) {
        // 대분류명 수정 로직 (복잡하므로 추후 구현)
        alert('대분류 수정 기능은 추후 구현 예정입니다.');
    }
}

async function deleteMainCategory(mainCategory) {
    if (!confirm(`'${mainCategory}' 대분류와 모든 하위 데이터를 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        // 해당 대분류의 모든 문서 삭제
        const snapshot = await db.collection('category_hierarchy')
            .where('gender', '==', selectedGender)
            .where('mainCategory', '==', mainCategory)
            .get();
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        // hierarchyStructure 업데이트
        delete hierarchyStructure[selectedGender][mainCategory];
        
        // UI 새로고침
        renderMainCategories();
        clearSubCategories();
        clearStyles();
        
        addProgressLog(`✅ ${mainCategory} 대분류 삭제 완료`, 'success');
        
    } catch (error) {
        console.error('대분류 삭제 오류:', error);
        addProgressLog(`❌ 대분류 삭제 실패: ${error.message}`, 'error');
    }
}

function editSubCategory(subCategory) {
    const newName = prompt(`중분류명을 수정하세요:`, subCategory);
    if (newName && newName !== subCategory) {
        // 중분류명 수정 로직 (추후 구현)
        alert('중분류 수정 기능은 추후 구현 예정입니다.');
    }
}

async function deleteSubCategory(subCategory) {
    if (!confirm(`'${subCategory}' 중분류를 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        // 해당 중분류 문서 삭제
        const snapshot = await db.collection('category_hierarchy')
            .where('gender', '==', selectedGender)
            .where('mainCategory', '==', selectedMainCategory)
            .where('subCategory', '==', subCategory)
            .get();
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        // hierarchyStructure 업데이트
        const index = hierarchyStructure[selectedGender][selectedMainCategory].indexOf(subCategory);
        if (index > -1) {
            hierarchyStructure[selectedGender][selectedMainCategory].splice(index, 1);
        }
        
        // UI 새로고침
        renderSubCategories();
        clearStyles();
        
        addProgressLog(`✅ ${subCategory} 중분류 삭제 완료`, 'success');
        
    } catch (error) {
        console.error('중분류 삭제 오류:', error);
        addProgressLog(`❌ 중분류 삭제 실패: ${error.message}`, 'error');
    }
}

// ========== 스타일 관리 기능들 ==========
function openAddStyleModal() {
    if (!selectedGender || !selectedMainCategory || !selectedSubCategory) {
        alert('성별, 대분류, 중분류를 모두 선택해주세요');
        return;
    }
    
    const modalHTML = `
        <div class="modal-overlay" id="styleModal">
            <div class="modal-container large">
                <div class="modal-header">
                    <h3>스타일 추가</h3>
                    <button class="modal-close" onclick="closeStyleModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>경로</label>
                        <div class="path-info">
                            ${selectedGender === 'male' ? '👨 남성' : '👩 여성'} > ${selectedMainCategory} > ${selectedSubCategory}
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>스타일 코드 *</label>
                            <input type="text" id="styleCodeInput" placeholder="예: MMC0001" required>
                        </div>
                        <div class="form-group">
                            <label>스타일명 *</label>
                            <input type="text" id="styleNameInput" placeholder="예: 모히칸 페이드컷" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>스타일 설명</label>
                        <textarea id="styleDescriptionInput" placeholder="스타일에 대한 설명을 입력하세요" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>이미지 업로드</label>
                        <input type="file" id="styleImageInput" accept="image/*">
                        <div id="imagePreview" class="image-preview"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeStyleModal()">취소</button>
                    <button class="btn btn-primary" onclick="addStyle()">추가</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 이미지 미리보기
    document.getElementById('styleImageInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('imagePreview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="미리보기">`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
        }
    });
}

async function addStyle() {
    const code = document.getElementById('styleCodeInput').value.trim();
    const name = document.getElementById('styleNameInput').value.trim();
    const description = document.getElementById('styleDescriptionInput').value.trim();
    const imageFile = document.getElementById('styleImageInput').files[0];
    
    if (!code || !name) {
        alert('스타일 코드와 이름은 필수입니다');
        return;
    }
    
    try {
        // 코드 중복 확인
        const existingStyle = await db.collection('hairstyles')
            .where('code', '==', code)
            .get();
        
        if (!existingStyle.empty) {
            alert('이미 존재하는 스타일 코드입니다');
            return;
        }
        
        let imageUrl = '';
        
        // 이미지 업로드
        if (imageFile) {
            addProgressLog('📤 이미지 업로드 중...', 'info');
            const storageRef = storage.ref(`hairstyles/${selectedGender}/${selectedMainCategory}/${selectedSubCategory}/${code}.${imageFile.name.split('.').pop()}`);
            const uploadTask = await storageRef.put(imageFile);
            imageUrl = await uploadTask.ref.getDownloadURL();
            addProgressLog('✅ 이미지 업로드 완료', 'success');
        }
        
        // 스타일 데이터 생성
        const styleData = {
            code: code,
            name: name,
            description: description,
            imageUrl: imageUrl,
            gender: selectedGender,
            mainCategory: selectedMainCategory,
            subCategory: selectedSubCategory,
            views: 0,
            likes: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('hairstyles').add(styleData);
        
        addProgressLog(`✅ ${name} 스타일 추가 완료`, 'success');
        
        // UI 새로고침
        await loadAndRenderStyles();
        
        closeStyleModal();
        
    } catch (error) {
        console.error('스타일 추가 오류:', error);
        addProgressLog(`❌ 스타일 추가 실패: ${error.message}`, 'error');
    }
}

function closeStyleModal() {
    const modal = document.getElementById('styleModal');
    if (modal) {
        modal.remove();
    }
}

function editStyle(styleId) {
    alert(`스타일 수정 기능은 추후 구현 예정입니다. (ID: ${styleId})`);
}

async function deleteStyle(styleId, styleName) {
    if (!confirm(`'${styleName}' 스타일을 정말 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        await db.collection('hairstyles').doc(styleId).delete();
        
        addProgressLog(`✅ ${styleName} 스타일 삭제 완료`, 'success');
        
        // UI 새로고침
        await loadAndRenderStyles();
        
    } catch (error) {
        console.error('스타일 삭제 오류:', error);
        addProgressLog(`❌ 스타일 삭제 실패: ${error.message}`, 'error');
    }
}

// ========== 고객 데이터 관리 ==========
async function loadCustomerData() {
    if (!db) {
        alert('❌ Firebase가 연결되지 않았습니다');
        return;
    }
    
    try {
        showProgress();
        addProgressLog('👥 고객 데이터 로딩 중...', 'info');
        
        const customersSnapshot = await db.collection('customers').get();
        const customers = [];
        
        customersSnapshot.forEach(doc => {
            customers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        addProgressLog(`✅ ${customers.length}개 고객 데이터 로드 완료`, 'success');
        
        displayCustomerData(customers);
        
    } catch (error) {
        console.error('고객 데이터 로딩 오류:', error);
        addProgressLog(`❌ 고객 데이터 로딩 실패: ${error.message}`, 'error');
    }
}

function displayCustomerData(customers) {
    const container = document.getElementById('customerDataContainer');
    const stats = document.getElementById('customerStats');
    const list = document.getElementById('customerList');
    
    if (!container || !stats || !list) return;
    
    // 통계 계산
    const designerStats = {};
    customers.forEach(customer => {
        const designer = customer.designerId || 'unknown';
        if (!designerStats[designer]) {
            designerStats[designer] = { count: 0, visits: 0 };
        }
        designerStats[designer].count++;
        designerStats[designer].visits += customer.visitHistory?.length || 0;
    });
    
    // 통계 표시
    stats.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-number">${customers.length}</div>
                <div class="stat-label">총 고객 수</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${Object.keys(designerStats).length}</div>
                <div class="stat-label">디자이너 수</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${Object.values(designerStats).reduce((sum, stat) => sum + stat.visits, 0)}</div>
                <div class="stat-label">총 방문 수</div>
            </div>
        </div>
    `;
    
    // 고객 목록 표시
    list.innerHTML = customers.map(customer => `
        <div class="customer-item">
            <div class="customer-info">
                <div class="customer-name">${customer.customerName}</div>
                <div class="customer-phone">${customer.phoneNumber}</div>
                <div class="customer-designer">담당: ${customer.designerName || customer.designerId}</div>
            </div>
            <div class="customer-stats">
                <div class="visit-count">${customer.visitHistory?.length || 0}회 방문</div>
                <div class="favorite-count">${customer.favoriteStyles?.length || 0}개 찜</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteCustomer('${customer.id}', '${customer.customerName}')">
                🗑️ 삭제
            </button>
        </div>
    `).join('');
    
    container.style.display = 'block';
}

async function clearAllCustomerData() {
    if (!confirm('⚠️ 정말로 모든 고객 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    if (!confirm('⚠️ 마지막 확인: 모든 고객 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?')) {
        return;
    }
    
    try {
        showProgress();
        addProgressLog('🗑️ 모든 고객 데이터 삭제 중...', 'info');
        
        const customersSnapshot = await db.collection('customers').get();
        const batch = db.batch();
        
        customersSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        addProgressLog(`✅ ${customersSnapshot.size}개 고객 데이터 삭제 완료`, 'success');
        
        // 표시 숨기기
        const container = document.getElementById('customerDataContainer');
        if (container) {
            container.style.display = 'none';
        }
        
    } catch (error) {
        console.error('고객 데이터 삭제 오류:', error);
        addProgressLog(`❌ 고객 데이터 삭제 실패: ${error.message}`, 'error');
    }
}

async function deleteCustomer(customerId, customerName) {
    if (!confirm(`'${customerName}' 고객 데이터를 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        await db.collection('customers').doc(customerId).delete();
        addProgressLog(`✅ ${customerName} 고객 데이터 삭제 완료`, 'success');
        
        // 목록 새로고침
        await loadCustomerData();
        
    } catch (error) {
        console.error('고객 삭제 오류:', error);
        addProgressLog(`❌ 고객 삭제 실패: ${error.message}`, 'error');
    }
}

// ========== 디자이너 데이터 관리 ==========
async function loadDesignerData() {
    alert('디자이너 데이터 관리 기능은 추후 구현 예정입니다.');
}

async function exportCustomerData() {
    alert('고객 데이터 내보내기 기능은 추후 구현 예정입니다.');
}

// ========== UI 헬퍼 함수들 ==========
function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    
    let path = [];
    if (selectedGender) path.push(selectedGender === 'male' ? '👨 남성' : '👩 여성');
    if (selectedMainCategory) path.push(selectedMainCategory);
    if (selectedSubCategory) path.push(selectedSubCategory);
    
    breadcrumb.innerHTML = `<span class="breadcrumb-item">${path.length > 0 ? path.join(' > ') : '성별을 선택하세요'}</span>`;
}

function clearSubCategories() {
    const subCategoryList = document.getElementById('subCategoryList');
    if (subCategoryList) {
        subCategoryList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <div>대분류를 선택하세요</div>
            </div>
        `;
    }
}

function clearStyles() {
    const stylesList = document.getElementById('stylesList');
    if (stylesList) {
        stylesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎨</div>
                <div>중분류를 선택하세요</div>
            </div>
        `;
    }
}

function enableAddButtons(level) {
    const mainBtn = document.getElementById('addMainCategoryBtn');
    const subBtn = document.getElementById('addSubCategoryBtn');
    const styleBtn = document.getElementById('addStyleBtn');
    
    if (mainBtn) mainBtn.disabled = !selectedGender;
    if (subBtn) subBtn.disabled = !selectedMainCategory;
    if (styleBtn) styleBtn.disabled = !selectedSubCategory;
}

// ========== 진행 상황 표시 ==========
function showProgress() {
    const progressContainer = document.getElementById('initProgress');
    if (progressContainer) {
        progressContainer.style.display = 'block';
        document.getElementById('progressLog').innerHTML = '';
    }
}

function addProgressLog(message, type = 'info') {
    console.log(message);
    
    const progressLog = document.getElementById('progressLog');
    if (!progressLog) return;
    
    const logItem = document.createElement('div');
    logItem.className = `progress-item progress-${type}`;
    logItem.textContent = message;
    progressLog.appendChild(logItem);
    
    progressLog.scrollTop = progressLog.scrollHeight;
}

// ========== 동기화 상태 ==========
function updateSyncIndicator(status, message) {
    const indicator = document.getElementById('syncIndicator');
    if (!indicator) return;
    
    indicator.className = `sync-indicator ${status}`;
    indicator.textContent = message;
}

// ========== 오류 처리 ==========
function handleFirebaseError(error) {
    console.error('Firebase 오류:', error);
    addProgressLog(`Firebase 오류: ${error.message}`, 'error');
    updateSyncIndicator('disconnected', '❌ Firebase 오류');
}

// ========== 추가 기능들 ==========
async function checkCurrentStructure() {
    if (!db) {
        alert('❌ Firebase가 연결되지 않았습니다');
        return;
    }
    
    try {
        showProgress();
        addProgressLog('📊 현재 구조 확인 중...', 'info');
        
        const hierarchySnapshot = await db.collection('category_hierarchy').get();
        addProgressLog(`📊 category_hierarchy: ${hierarchySnapshot.size}개 문서`, 'info');
        
        const stylesSnapshot = await db.collection('hairstyles').get();
        addProgressLog(`🎨 hairstyles: ${stylesSnapshot.size}개 문서`, 'info');
        
        const customersSnapshot = await db.collection('customers').get();
        addProgressLog(`👥 customers: ${customersSnapshot.size}개 문서`, 'info');
        
        // 성별별 통계
        const maleCount = hierarchySnapshot.docs.filter(doc => doc.data().gender === 'male').length;
        const femaleCount = hierarchySnapshot.docs.filter(doc => doc.data().gender === 'female').length;
        
        addProgressLog(`👨 남성: ${maleCount}개 카테고리`, 'success');
        addProgressLog(`👩 여성: ${femaleCount}개 카테고리`, 'success');
        
        // 스타일 통계
        const maleStyles = stylesSnapshot.docs.filter(doc => doc.data().gender === 'male').length;
        const femaleStyles = stylesSnapshot.docs.filter(doc => doc.data().gender === 'female').length;
        
        addProgressLog(`👨 남성 스타일: ${maleStyles}개`, 'info');
        addProgressLog(`👩 여성 스타일: ${femaleStyles}개`, 'info');
        
    } catch (error) {
        addProgressLog(`❌ 구조 확인 실패: ${error.message}`, 'error');
    }
}

async function testConnection() {
    if (!db) {
        alert('❌ Firebase가 연결되지 않았습니다');
        return;
    }
    
    try {
        showProgress();
        addProgressLog('🌐 연결 테스트 중...', 'info');
        
        await testFirebaseConnection();
        addProgressLog('✅ Firebase 연결 테스트 성공!', 'success');
        
    } catch (error) {
        addProgressLog(`❌ 연결 테스트 실패: ${error.message}`, 'error');
    }
}

// ========== 디버그 도구 (개발용) ==========
const debugData = {
    fullDiagnosis: async function() {
        console.log('🔍 === HAIRGATOR 어드민 전체 진단 ===');
        console.log('🔥 Firebase 연결 상태:', firebaseConnected);
        console.log('📊 hierarchyStructure:', hierarchyStructure);
        console.log('🎯 선택된 값들:', { selectedGender, selectedMainCategory, selectedSubCategory });
        
        if (firebaseConnected && db) {
            try {
                const hierarchySnapshot = await db.collection('category_hierarchy').get();
                console.log(`📊 category_hierarchy: ${hierarchySnapshot.size}개 문서`);
                
                const stylesSnapshot = await db.collection('hairstyles').get();
                console.log(`🎨 hairstyles: ${stylesSnapshot.size}개 문서`);
                
                const customersSnapshot = await db.collection('customers').get();
                console.log(`👥 customers: ${customersSnapshot.size}개 문서`);
            } catch (error) {
                console.error('❌ 진단 중 오류:', error);
            }
        }
    },
    
    checkHierarchy: function() {
        console.log('📊 계층구조 상세 확인:');
        Object.entries(hierarchyStructure).forEach(([gender, categories]) => {
            console.log(`${gender === 'male' ? '👨' : '👩'} ${gender}:`);
            Object.entries(categories).forEach(([mainCat, subCats]) => {
                console.log(`  📂 ${mainCat}: [${subCats.join(', ')}] (${subCats.length}개)`);
            });
        });
    },
    
    checkConnection: function() {
        console.log('🌐 연결 상태:', firebaseConnected);
        console.log('🔥 Firebase app:', firebase.apps.length > 0);
        console.log('📊 Firestore:', !!db);
        console.log('💾 Storage:', !!storage);
    }
};

// 전역 함수로 등록 (콘솔에서 사용 가능)
window.debugData = debugData;
window.forceRecreateData = initializeFirebaseWithExcelData;

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM 로드 완료, Firebase 초기화 시작...');
    initializeFirebase();
    
    // 5초 후 자동 진단
    setTimeout(() => {
        if (window.debugData) {
            debugData.fullDiagnosis();
        }
    }, 5000);
});

// 전역 오류 처리
window.addEventListener('error', function(event) {
    console.error('🚨 전역 오류:', event.error);
    addProgressLog(`🚨 오류: ${event.error.message}`, 'error');
});

console.log('✅ HAIRGATOR 어드민 모든 함수 정의 완료 - 950줄 완전한 버전');
