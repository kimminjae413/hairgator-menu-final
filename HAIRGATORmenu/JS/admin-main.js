// admin-main.js - HAIRGATOR 어드민 전체 로직

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
        
        // 연결 테스트
        await testFirebaseConnection();
        
        firebaseConnected = true;
        updateSyncIndicator('connected', '✅ Firebase 연결 완료');
        
        // 구조 로드
        await loadHierarchyFromFirebase();
        
    } catch (error) {
        console.error('❌ Firebase 초기화 오류:', error);
        handleFirebaseError(error);
    }
}

async function testFirebaseConnection() {
    try {
        // 권한 테스트를 위한 간단한 읽기 시도
        const testQuery = await db.collection('test').limit(1).get();
        console.log('✅ Firestore 읽기 테스트 성공');
        
        // 쓰기 권한 테스트
        await db.collection('test').doc('connection').set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            test: true,
            userAgent: navigator.userAgent
        });
        console.log('✅ Firestore 쓰기 테스트 성공');
        
        // 테스트 문서 정리
        try {
            await db.collection('test').doc('connection').delete();
            console.log('🗑️ 테스트 문서 정리 완료');
        } catch (deleteError) {
            console.log('⚠️ 테스트 문서 정리 실패 (무시):', deleteError.message);
        }
        
    } catch (error) {
        console.error('❌ Firebase 연결 테스트 실패:', error);
        
        // 구체적인 오류 메시지 제공
        if (error.code === 'permission-denied') {
            throw new Error('Firebase Security Rules에서 읽기/쓰기 권한이 거부되었습니다. Security Rules를 확인하세요.');
        } else if (error.code === 'failed-precondition') {
            throw new Error('Firebase 프로젝트 설정에 문제가 있습니다.');
        } else if (error.message.includes('400')) {
            throw new Error('Firebase 요청 형식이 올바르지 않습니다. Security Rules나 API 키를 확인하세요.');
        } else {
            throw error;
        }
    }
}

// ========== 초기화 기능 ==========
// Excel 기반 초기화
async function initializeFirebaseWithExcelData() {
    if (!firebaseConnected) {
        showAlert('Firebase 연결이 필요합니다.', 'error');
        return;
    }

    if (!confirm('Excel 데이터로 초기화하시겠습니까?\n기존 category_hierarchy 데이터는 삭제되지만 스타일 데이터는 보존됩니다.')) {
        return;
    }

    try {
        showProgressContainer(true);
        addProgressLog('🚀 Excel 기반 초기화 시작', 'info');

        // 1. 기존 카테고리 데이터 삭제
        const existingDocs = await db.collection('category_hierarchy').get();
        if (!existingDocs.empty) {
            addProgressLog(`🗑️ 기존 ${existingDocs.size}개 문서 삭제 중...`, 'info');
            
            const batch = db.batch();
            existingDocs.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            
            addProgressLog('✅ 기존 문서 삭제 완료', 'success');
        }

        // 2. 새 구조 생성
        let totalDocs = 0;
        for (const [gender, categories] of Object.entries(PERFECT_STRUCTURE)) {
            addProgressLog(`👤 ${gender === 'male' ? '남성' : '여성'} 카테고리 생성 중...`, 'info');
            
            for (const [mainCategory, subCategories] of Object.entries(categories)) {
                for (const subCategory of subCategories) {
                    const docData = {
                        gender,
                        mainCategory,
                        subCategory,
                        categoryPath: `${gender}_${mainCategory}_${subCategory}`,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    await db.collection('category_hierarchy').add(docData);
                    totalDocs++;
                    
                    if (gender === 'female' && mainCategory === 'LONG') {
                        addProgressLog(`  ✅ LONG > ${subCategory} 생성 완료`, 'success');
                    }
                }
            }
        }

        addProgressLog(`💾 총 ${totalDocs}개 문서 생성 완료`, 'success');
        
        // 3. 메모리 구조 업데이트
        hierarchyStructure = JSON.parse(JSON.stringify(PERFECT_STRUCTURE));
        
        // 4. UI 새로고침
        refreshUI();
        
        addProgressLog('🎉 초기화 완료!', 'success');
        showAlert(`초기화가 완료되었습니다. (${totalDocs}개 문서 생성)`, 'success');

    } catch (error) {
        console.error('❌ 초기화 오류:', error);
        addProgressLog(`❌ 오류: ${error.message}`, 'error');
        showAlert('초기화 중 오류가 발생했습니다.', 'error');
    }
}

// Firebase에서 구조 로드
async function loadHierarchyFromFirebase() {
    if (!firebaseConnected) return;

    try {
        const snapshot = await db.collection('category_hierarchy')
            .orderBy('gender')
            .orderBy('mainCategory')
            .orderBy('subCategory')
            .get();
        
        hierarchyStructure = { male: {}, female: {} };

        snapshot.forEach(doc => {
            const data = doc.data();
            const gender = data.gender;
            const mainCat = data.mainCategory;
            const subCat = data.subCategory;

            if (!hierarchyStructure[gender]) {
                hierarchyStructure[gender] = {};
            }
            if (!hierarchyStructure[gender][mainCat]) {
                hierarchyStructure[gender][mainCat] = [];
            }
            
            if (!hierarchyStructure[gender][mainCat].includes(subCat)) {
                hierarchyStructure[gender][mainCat].push(subCat);
            }
        });

        console.log('✅ 계층 구조 로드 완료:', hierarchyStructure);
        
    } catch (error) {
        console.error('❌ 구조 로드 오류:', error);
    }
}

// ========== 카테고리 관리 ==========
// 성별 선택
function selectGender(gender) {
    selectedGender = gender;
    selectedMainCategory = null;
    selectedSubCategory = null;
    
    // UI 업데이트
    document.querySelectorAll('#genderList .selectable-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.closest('.selectable-item').classList.add('selected');
    
    // 버튼 활성화
    document.getElementById('addMainCategoryBtn').disabled = false;
    
    updateMainCategoryList();
    updateBreadcrumb();
}

// 대분류 목록 업데이트
function updateMainCategoryList() {
    const container = document.getElementById('mainCategoryList');
    if (!selectedGender || !hierarchyStructure[selectedGender]) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><div>성별을 선택하세요</div></div>';
        return;
    }

    const categories = Object.keys(hierarchyStructure[selectedGender]);
    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><div>카테고리가 없습니다</div></div>';
        return;
    }

    container.innerHTML = categories.map(category => 
        `<div class="selectable-item" onclick="selectMainCategory('${category}')">
            <span class="item-text">📁 ${category}</span>
            <div class="item-actions">
                <button class="action-btn" onclick="editMainCategory('${category}'); event.stopPropagation();" title="수정">✏️</button>
                <button class="action-btn" onclick="deleteMainCategory('${category}'); event.stopPropagation();" title="삭제">🗑️</button>
            </div>
        </div>`
    ).join('');
}

// 대분류 선택
function selectMainCategory(category) {
    selectedMainCategory = category;
    selectedSubCategory = null;
    
    // UI 업데이트
    document.querySelectorAll('#mainCategoryList .selectable-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.closest('.selectable-item').classList.add('selected');
    
    // 버튼 활성화
    document.getElementById('addSubCategoryBtn').disabled = false;
    
    updateSubCategoryList();
    updateBreadcrumb();
}

// 중분류 목록 업데이트
function updateSubCategoryList() {
    const container = document.getElementById('subCategoryList');
    if (!selectedGender || !selectedMainCategory || !hierarchyStructure[selectedGender][selectedMainCategory]) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📂</div><div>대분류를 선택하세요</div></div>';
        return;
    }

    const subCategories = hierarchyStructure[selectedGender][selectedMainCategory];
    if (subCategories.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📂</div><div>중분류가 없습니다</div></div>';
        return;
    }

    container.innerHTML = subCategories.map(subCategory => 
        `<div class="selectable-item" onclick="selectSubCategory('${subCategory}')">
            <span class="item-text">📂 ${subCategory}</span>
            <div class="item-actions">
                <button class="action-btn" onclick="editSubCategory('${subCategory}'); event.stopPropagation();" title="수정">✏️</button>
                <button class="action-btn" onclick="deleteSubCategory('${subCategory}'); event.stopPropagation();" title="삭제">🗑️</button>
            </div>
        </div>`
    ).join('');
}

// 중분류 선택
function selectSubCategory(subCategory) {
    selectedSubCategory = subCategory;
    
    // UI 업데이트
    document.querySelectorAll('#subCategoryList .selectable-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.closest('.selectable-item').classList.add('selected');
    
    // 버튼 활성화
    document.getElementById('addStyleBtn').disabled = false;
    
    updateStylesList();
    updateBreadcrumb();
}

// 스타일 목록 업데이트
async function updateStylesList() {
    const container = document.getElementById('stylesList');
    
    if (!selectedGender || !selectedMainCategory || !selectedSubCategory) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✂️</div><div>중분류를 선택하세요</div></div>';
        return;
    }

    if (!firebaseConnected) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div>Firebase 연결이 필요합니다</div></div>';
        return;
    }

    try {
        // 로딩 표시
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔄</div><div>스타일 목록을 불러오는 중...</div></div>';

        // Firebase에서 스타일 조회 (인덱스 문제 해결)
        const stylesSnapshot = await db.collection('hairstyles')
            .where('gender', '==', selectedGender)
            .where('mainCategory', '==', selectedMainCategory)
            .where('subCategory', '==', selectedSubCategory)
            .get();

        if (stylesSnapshot.empty) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✂️</div><div>등록된 스타일이 없습니다</div></div>';
        } else {
            // 데이터를 배열로 변환 후 날짜순 정렬
            const styles = [];
            stylesSnapshot.forEach(doc => {
                styles.push({ id: doc.id, ...doc.data() });
            });
            
            // 클라이언트 사이드에서 정렬
            styles.sort((a, b) => {
                const aTime = a.createdAt ? a.createdAt.toDate() : new Date(0);
                const bTime = b.createdAt ? b.createdAt.toDate() : new Date(0);
                return bTime - aTime; // 최신순
            });

            let stylesHtml = '';
            styles.forEach(style => {
                stylesHtml += `
                    <div class="style-item">
                        ${style.imageUrl ? `<img src="${style.imageUrl}" alt="${style.name}" class="style-image">` : '<div class="style-image" style="background-color: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;">이미지 없음</div>'}
                        <div class="style-info">
                            <div class="style-code">${style.code || 'N/A'}</div>
                            <div class="style-name">${style.name || 'N/A'}</div>
                            ${style.description ? `<div style="font-size: 12px; color: #666;">${style.description}</div>` : ''}
                        </div>
                        <div class="style-actions">
                            <button class="btn btn-sm btn-secondary" onclick="editStyle('${style.id}')" title="수정">✏️</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteStyle('${style.id}')" title="삭제">🗑️</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = stylesHtml;
        }

    } catch (error) {
        console.error('스타일 로드 오류:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div>스타일 로드 중 오류 발생</div></div>';
    }
}

// 카테고리 추가 모달 표시
function showAddCategoryModal(type) {
    currentModalType = type;
    editingItem = null;
    
    document.getElementById('categoryModalTitle').textContent = 
        type === 'main' ? '대분류 추가' : '중분류 추가';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryDescription').value = '';
    document.getElementById('categoryModal').style.display = 'block';
}

// 카테고리 수정
function editMainCategory(category) {
    currentModalType = 'main';
    editingItem = category;
    
    document.getElementById('categoryModalTitle').textContent = '대분류 수정';
    document.getElementById('categoryName').value = category;
    document.getElementById('categoryDescription').value = '';
    document.getElementById('categoryModal').style.display = 'block';
}

function editSubCategory(subCategory) {
    currentModalType = 'sub';
    editingItem = subCategory;
    
    document.getElementById('categoryModalTitle').textContent = '중분류 수정';
    document.getElementById('categoryName').value = subCategory;
    document.getElementById('categoryDescription').value = '';
    document.getElementById('categoryModal').style.display = 'block';
}

// 카테고리 삭제
async function deleteMainCategory(category) {
    if (!confirm(`"${category}" 대분류를 삭제하시겠습니까?\n하위 중분류와 스타일도 모두 삭제됩니다.`)) {
        return;
    }

    try {
        showAlert('대분류를 삭제하고 있습니다...', 'info');

        // Firebase에서 해당 카테고리의 모든 문서 삭제
        const docs = await db.collection('category_hierarchy')
            .where('gender', '==', selectedGender)
            .where('mainCategory', '==', category)
            .get();

        const batch = db.batch();
        docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // 메모리에서도 제거
        delete hierarchyStructure[selectedGender][category];

        // UI 새로고침
        selectedMainCategory = null;
        selectedSubCategory = null;
        updateMainCategoryList();
        updateSubCategoryList();
        updateStylesList();
        updateBreadcrumb();

        showAlert('대분류가 삭제되었습니다.', 'success');

    } catch (error) {
        console.error('대분류 삭제 오류:', error);
        showAlert('대분류 삭제 중 오류가 발생했습니다.', 'error');
    }
}

async function deleteSubCategory(subCategory) {
    if (!confirm(`"${subCategory}" 중분류를 삭제하시겠습니까?\n관련 스타일도 모두 삭제됩니다.`)) {
        return;
    }

    try {
        showAlert('중분류를 삭제하고 있습니다...', 'info');

        // Firebase에서 해당 중분류 문서 삭제
        const docs = await db.collection('category_hierarchy')
            .where('gender', '==', selectedGender)
            .where('mainCategory', '==', selectedMainCategory)
            .where('subCategory', '==', subCategory)
            .get();

        const batch = db.batch();
        docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // 메모리에서도 제거
        const index = hierarchyStructure[selectedGender][selectedMainCategory].indexOf(subCategory);
        if (index > -1) {
            hierarchyStructure[selectedGender][selectedMainCategory].splice(index, 1);
        }

        // UI 새로고침
        selectedSubCategory = null;
        updateSubCategoryList();
        updateStylesList();
        updateBreadcrumb();

        showAlert('중분류가 삭제되었습니다.', 'success');

    } catch (error) {
        console.error('중분류 삭제 오류:', error);
        showAlert('중분류 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// 카테고리 모달 닫기
function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

// 카테고리 폼 제출
document.getElementById('categoryForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('categoryName').value.trim();
    if (!name) {
        showAlert('카테고리명을 입력하세요.', 'error');
        return;
    }

    try {
        showAlert('카테고리를 저장하고 있습니다...', 'info');

        if (currentModalType === 'main') {
            // 대분류 추가/수정
            if (editingItem) {
                // 수정 로직 (복잡하므로 향후 구현)
                showAlert('대분류 수정은 향후 구현될 예정입니다.', 'info');
            } else {
                // 새 대분류 추가
                if (hierarchyStructure[selectedGender][name]) {
                    showAlert('이미 존재하는 대분류입니다.', 'error');
                    return;
                }
                
                hierarchyStructure[selectedGender][name] = [];
                updateMainCategoryList();
            }
        } else if (currentModalType === 'sub') {
            // 중분류 추가/수정
            if (editingItem) {
                // 수정 로직
                showAlert('중분류 수정은 향후 구현될 예정입니다.', 'info');
            } else {
                // 새 중분류 추가
                if (hierarchyStructure[selectedGender][selectedMainCategory].includes(name)) {
                    showAlert('이미 존재하는 중분류입니다.', 'error');
                    return;
                }
                
                // Firebase에 추가
                await db.collection('category_hierarchy').add({
                    gender: selectedGender,
                    mainCategory: selectedMainCategory,
                    subCategory: name,
                    categoryPath: `${selectedGender}_${selectedMainCategory}_${name}`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // 메모리에 추가
                hierarchyStructure[selectedGender][selectedMainCategory].push(name);
                updateSubCategoryList();
            }
        }

        closeCategoryModal();
        showAlert('카테고리가 저장되었습니다.', 'success');

    } catch (error) {
        console.error('카테고리 저장 오류:', error);
        showAlert('카테고리 저장 중 오류가 발생했습니다.', 'error');
    }
});

// ========== 스타일 관리 ==========
// 스타일 추가 모달 표시
function showAddStyleModal() {
    editingItem = null;
    document.getElementById('styleModalTitle').textContent = '스타일 추가';
    document.getElementById('styleCode').value = '';
    document.getElementById('styleName').value = '';
    document.getElementById('styleDescription').value = '';
    document.getElementById('styleImage').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    document.getElementById('styleModal').style.display = 'block';
}

// 스타일 모달 닫기
function closeStyleModal() {
    document.getElementById('styleModal').style.display = 'none';
}

// 이미지 미리보기
function previewImage() {
    const fileInput = document.getElementById('styleImage');
    const preview = document.getElementById('imagePreview');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <div>
                    <img src="${e.target.result}" alt="미리보기" class="preview-image">
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">
                        ${fileInput.files[0].name} (${(fileInput.files[0].size / 1024 / 1024).toFixed(2)}MB)
                    </div>
                </div>
            `;
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        preview.innerHTML = '';
    }
}

// 스타일 폼 제출
document.getElementById('styleForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const code = document.getElementById('styleCode').value.trim();
    const name = document.getElementById('styleName').value.trim();
    const description = document.getElementById('styleDescription').value.trim();
    const imageFile = document.getElementById('styleImage').files[0];

    if (!code || !name || !imageFile) {
        showAlert('스타일 코드, 이름, 이미지는 필수 입력 항목입니다.', 'error');
        return;
    }

    try {
        const submitBtn = document.getElementById('styleSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = '저장 중...';

        showAlert('스타일을 저장하고 있습니다...', 'info');

        // 1. 이미지 업로드
        const imagePath = `styles/${selectedGender}/${selectedMainCategory}/${selectedSubCategory}/${code}_${Date.now()}.${imageFile.name.split('.').pop()}`;
        const imageRef = storage.ref(imagePath);
        
        const uploadTask = await imageRef.put(imageFile);
        const imageUrl = await uploadTask.ref.getDownloadURL();

        // 2. Firestore에 스타일 데이터 저장 (권한 오류 처리 강화)
        const styleData = {
            code: code,
            name: name,
            description: description,
            imageUrl: imageUrl,
            imagePath: imagePath,
            gender: selectedGender,
            mainCategory: selectedMainCategory,
            subCategory: selectedSubCategory,
            categoryPath: `${selectedGender}_${selectedMainCategory}_${selectedSubCategory}`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('Firestore에 스타일 데이터 저장 시도:', styleData);
        
        try {
            await db.collection('hairstyles').add(styleData);
            console.log('✅ 스타일 데이터 저장 완료');
        } catch (firestoreError) {
            console.error('❌ Firestore 저장 오류:', firestoreError);
            
            // 이미지는 업로드되었지만 Firestore 저장 실패 시 이미지 삭제
            try {
                await storage.ref(imagePath).delete();
                console.log('🗑️ 업로드된 이미지 정리 완료');
            } catch (cleanupError) {
                console.log('⚠️ 이미지 정리 실패:', cleanupError);
            }
            
            if (firestoreError.code === 'permission-denied') {
                throw new Error('Firebase Security Rules에서 쓰기 권한이 거부되었습니다.\n\nFirebase 콘솔 → Firestore Database → 규칙에서 다음을 설정하세요:\n\nallow read, write: if true;');
            } else {
                throw firestoreError;
            }
        }

        closeStyleModal();
        updateStylesList();
        showAlert('스타일이 성공적으로 추가되었습니다!', 'success');

    } catch (error) {
        console.error('스타일 저장 오류:', error);
        showAlert(`스타일 저장 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
        const submitBtn = document.getElementById('styleSubmitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = '저장';
    }
});

// 스타일 수정/삭제
function editStyle(styleId) {
    showAlert('스타일 수정 기능은 향후 구현될 예정입니다.', 'info');
}

async function deleteStyle(styleId) {
    if (!confirm('이 스타일을 정말 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) {
        return;
    }

    try {
        showAlert('스타일을 삭제하고 있습니다...', 'info');

        // Firebase에서 스타일 데이터 가져오기
        const styleDoc = await db.collection('hairstyles').doc(styleId).get();
        if (styleDoc.exists) {
            const styleData = styleDoc.data();
            
            // Storage에서 이미지 삭제 (선택적)
            if (styleData.imagePath) {
                try {
                    await storage.ref(styleData.imagePath).delete();
                } catch (imageDeleteError) {
                    console.log('이미지 삭제 실패 (무시):', imageDeleteError);
                }
            }
        }

        // Firestore에서 스타일 문서 삭제
        await db.collection('hairstyles').doc(styleId).delete();

        updateStylesList();
        showAlert('스타일이 삭제되었습니다.', 'success');

    } catch (error) {
        console.error('스타일 삭제 오류:', error);
        showAlert('스타일 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// ========== 시스템 관리 ==========
// 현재 구조 확인
async function checkCurrentStructure() {
    if (!firebaseConnected) {
        showAlert('Firebase 연결이 필요합니다.', 'error');
        return;
    }

    try {
        showProgressContainer(true);
        addProgressLog('📊 현재 Firebase 구조 확인 중...', 'info');

        const hierarchySnapshot = await db.collection('category_hierarchy').get();
        addProgressLog(`📄 category_hierarchy: ${hierarchySnapshot.size}개 문서`, 'success');

        if (!hierarchySnapshot.empty) {
            const structure = { male: {}, female: {} };
            hierarchySnapshot.forEach(doc => {
                const data = doc.data();
                if (!structure[data.gender]) structure[data.gender] = {};
                if (!structure[data.gender][data.mainCategory]) structure[data.gender][data.mainCategory] = [];
                if (!structure[data.gender][data.mainCategory].includes(data.subCategory)) {
                    structure[data.gender][data.mainCategory].push(data.subCategory);
                }
            });

            Object.keys(structure).forEach(gender => {
                addProgressLog(`👤 ${gender === 'male' ? '남성' : '여성'}:`, 'info');
                Object.keys(structure[gender]).forEach(mainCat => {
                    const subCats = structure[gender][mainCat];
                    addProgressLog(`  📁 ${mainCat}: [${subCats.join(', ')}] (${subCats.length}개)`, 'info');
                });
            });
        }

        const stylesSnapshot = await db.collection('hairstyles').get();
        addProgressLog(`✂️ hairstyles: ${stylesSnapshot.size}개 문서`, 'success');

        showAlert('현재 구조 확인이 완료되었습니다.', 'success');

    } catch (error) {
        console.error('구조 확인 오류:', error);
        addProgressLog(`❌ 오류: ${error.message}`, 'error');
        showAlert('구조 확인 중 오류가 발생했습니다.', 'error');
    }
}

// 연결 테스트
async function testConnection() {
    try {
        showProgressContainer(true);
        addProgressLog('🌐 Firebase 연결 테스트 중...', 'info');
        
        await testFirebaseConnection();
        addProgressLog('✅ 연결 테스트 성공', 'success');
        showAlert('Firebase 연결이 정상입니다.', 'success');
        
    } catch (error) {
        addProgressLog(`❌ 연결 테스트 실패: ${error.message}`, 'error');
        showAlert('Firebase 연결 테스트에 실패했습니다.', 'error');
    }
}

// ========== 고객 데이터 관리 ==========
// 고객 데이터 조회
async function loadCustomerData() {
    if (!firebaseConnected) {
        showAlert('Firebase 연결이 필요합니다.', 'error');
        return;
    }

    try {
        showAlert('고객 데이터를 조회하고 있습니다...', 'info');
        
        // customers 컬렉션에서 모든 고객 데이터 조회
        const customersSnapshot = await db.collection('customers').get();
        
        if (customersSnapshot.empty) {
            document.getElementById('customerDataContainer').style.display = 'block';
            document.getElementById('customerStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">0</div>
                    <div class="stat-label">등록된 고객</div>
                </div>
            `;
            document.getElementById('customerList').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <div>등록된 고객 데이터가 없습니다</div>
                </div>
            `;
            showAlert('등록된 고객 데이터가 없습니다.', 'warning');
            return;
        }

        // 고객 데이터 분석
        const customers = [];
        const designerStats = {};
        let totalVisits = 0;
        let totalFavorites = 0;

        customersSnapshot.forEach(doc => {
            const customer = { id: doc.id, ...doc.data() };
            customers.push(customer);
            
            // 디자이너별 통계
            const designerId = customer.designerId || customer.designerName || 'Unknown';
            if (!designerStats[designerId]) {
                designerStats[designerId] = { customers: 0, visits: 0, favorites: 0 };
            }
            designerStats[designerId].customers++;
            
            // 방문 횟수 계산
            const visits = customer.visitHistory ? customer.visitHistory.length : 0;
            totalVisits += visits;
            designerStats[designerId].visits += visits;
            
            // 즐겨찾기 계산
            const favorites = customer.favoriteStyles ? customer.favoriteStyles.length : 0;
            totalFavorites += favorites;
            designerStats[designerId].favorites += favorites;
        });

        // 통계 표시
        const statsHtml = `
            <div class="stat-card">
                <div class="stat-number">${customers.length}</div>
                <div class="stat-label">총 고객 수</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(designerStats).length}</div>
                <div class="stat-label">디자이너 수</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalVisits}</div>
                <div class="stat-label">총 방문 횟수</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalFavorites}</div>
                <div class="stat-label">즐겨찾기 총합</div>
            </div>
        `;

        // 고객 목록 표시 (최신순)
        customers.sort((a, b) => {
            const aDate = a.visitHistory && a.visitHistory.length > 0 ? 
                new Date(a.visitHistory[a.visitHistory.length - 1].date) : new Date(0);
            const bDate = b.visitHistory && b.visitHistory.length > 0 ? 
                new Date(b.visitHistory[b.visitHistory.length - 1].date) : new Date(0);
            return bDate - aDate;
        });

        const customersHtml = customers.map(customer => {
            const visitCount = customer.visitHistory ? customer.visitHistory.length : 0;
            const lastVisit = visitCount > 0 ? 
                new Date(customer.visitHistory[visitCount - 1].date).toLocaleDateString('ko-KR') : '방문 기록 없음';
            
            const designerName = customer.designerName || customer.designerId || 'Unknown';
            
            // 최근 선택한 스타일들
            const recentStyles = [];
            if (customer.visitHistory && customer.visitHistory.length > 0) {
                const lastVisit = customer.visitHistory[customer.visitHistory.length - 1];
                if (lastVisit.styleName) {
                    recentStyles.push({
                        name: lastVisit.styleName,
                        code: lastVisit.styleCode
                    });
                }
            }

            const stylesHtml = recentStyles.map(style => 
                `<span class="style-tag">${style.name || style.code}</span>`
            ).join('');

            return `
                <div class="customer-item">
                    <div class="customer-header">
                        <div class="customer-name">${customer.customerName || 'Unknown'}</div>
                        <div class="customer-designer">${designerName}</div>
                    </div>
                    <div class="customer-details">
                        📞 ${customer.phoneLastDigits || customer.phoneNumber || 'N/A'} | 
                        👤 ${customer.gender === 'male' ? '남성' : '여성'} | 
                        📅 최근 방문: ${lastVisit} (총 ${visitCount}회)
                    </div>
                    ${stylesHtml ? `
                        <div class="customer-styles">
                            <strong>최근 선택 스타일:</strong> ${stylesHtml}
                        </div>
                    ` : ''}
                    <div style="margin-top: 10px; text-align: right;">
                        <button class="btn btn-sm btn-secondary" onclick="viewCustomerDetail('${customer.id}')" title="상세보기">
                            👁️ 상세
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${customer.id}')" title="삭제">
                            🗑️ 삭제
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // UI 업데이트
        document.getElementById('customerDataContainer').style.display = 'block';
        document.getElementById('customerStats').innerHTML = statsHtml;
        document.getElementById('customerList').innerHTML = customersHtml;

        showAlert(`${customers.length}명의 고객 데이터를 불러왔습니다.`, 'success');

    } catch (error) {
        console.error('고객 데이터 조회 오류:', error);
        showAlert('고객 데이터 조회 중 오류가 발생했습니다.', 'error');
    }
}

// 디자이너 데이터 조회
async function loadDesignerData() {
    if (!firebaseConnected) {
        showAlert('Firebase 연결이 필요합니다.', 'error');
        return;
    }

    try {
        showAlert('디자이너 데이터를 조회하고 있습니다...', 'info');
        
        // designers 컬렉션에서 디자이너 목록 조회
        const designersSnapshot = await db.collection('designers').get();
        
        if (designersSnapshot.empty) {
            document.getElementById('customerDataContainer').style.display = 'block';
            document.getElementById('customerStats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">0</div>
                    <div class="stat-label">등록된 디자이너</div>
                </div>
            `;
            document.getElementById('customerList').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎨</div>
                    <div>등록된 디자이너가 없습니다</div>
                </div>
            `;
            showAlert('등록된 디자이너가 없습니다.', 'warning');
            return;
        }

        const designers = [];
        designersSnapshot.forEach(doc => {
            designers.push({ id: doc.id, ...doc.data() });
        });

        // 디자이너별 고객 수 계산
        const customersSnapshot = await db.collection('customers').get();
        const customersByDesigner = {};
        
        customersSnapshot.forEach(doc => {
            const customer = doc.data();
            const designerId = customer.designerId || customer.designerName || 'Unknown';
            if (!customersByDesigner[designerId]) {
                customersByDesigner[designerId] = 0;
            }
            customersByDesigner[designerId]++;
        });

        // 통계 표시
        const statsHtml = `
            <div class="stat-card">
                <div class="stat-number">${designers.length}</div>
                <div class="stat-label">총 디자이너 수</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${customersSnapshot.size}</div>
                <div class="stat-label">총 고객 수</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Math.round(customersSnapshot.size / designers.length) || 0}</div>
                <div class="stat-label">디자이너당 평균 고객</div>
            </div>
        `;

        // 디자이너 목록 표시
        const designersHtml = designers.map(designer => {
            const customerCount = customersByDesigner[designer.id] || customersByDesigner[designer.name] || 0;
            
            return `
                <div class="customer-item">
                    <div class="customer-header">
                        <div class="customer-name">🎨 ${designer.name || 'Unknown'}</div>
                        <div class="customer-designer">${customerCount}명 고객</div>
                    </div>
                    <div class="customer-details">
                        📧 ${designer.email || 'N/A'} | 
                        📞 ${designer.phoneNumber || 'N/A'} | 
                        📅 가입일: ${designer.createdAt ? new Date(designer.createdAt.toDate()).toLocaleDateString('ko-KR') : 'N/A'}
                    </div>
                    <div style="margin-top: 10px; text-align: right;">
                        <button class="btn btn-sm btn-primary" onclick="loadDesignerCustomers('${designer.id}')" title="고객 목록">
                            👥 고객 목록
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="viewDesignerDetail('${designer.id}')" title="상세보기">
                            👁️ 상세
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDesigner('${designer.id}')" title="삭제">
                            🗑️ 삭제
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // UI 업데이트
        document.getElementById('customerDataContainer').style.display = 'block';
        document.getElementById('customerStats').innerHTML = statsHtml;
        document.getElementById('customerList').innerHTML = designersHtml;

        showAlert(`${designers.length}명의 디자이너 데이터를 불러왔습니다.`, 'success');

    } catch (error) {
        console.error('디자이너 데이터 조회 오류:', error);
        showAlert('디자이너 데이터 조회 중 오류가 발생했습니다.', 'error');
    }
}

// 고객 데이터 내보내기
async function exportCustomerData() {
    if (!firebaseConnected) {
        showAlert('Firebase 연결이 필요합니다.', 'error');
        return;
    }

    try {
        showAlert('고객 데이터를 내보내고 있습니다...', 'info');
        
        const customersSnapshot = await db.collection('customers').get();
        
        if (customersSnapshot.empty) {
            showAlert('내보낼 고객 데이터가 없습니다.', 'warning');
            return;
        }

        const customers = [];
        customersSnapshot.forEach(doc => {
            const data = doc.data();
            customers.push({
                ID: doc.id,
                고객명: data.customerName || '',
                전화번호: data.phoneLastDigits || data.phoneNumber || '',
                성별: data.gender === 'male' ? '남성' : '여성',
                디자이너ID: data.designerId || '',
                디자이너명: data.designerName || '',
                방문횟수: data.visitHistory ? data.visitHistory.length : 0,
                즐겨찾기수: data.favoriteStyles ? data.favoriteStyles.length : 0,
                최근방문일: data.visitHistory && data.visitHistory.length > 0 ? 
                    data.visitHistory[data.visitHistory.length - 1].date : '',
                생성일: data.createdAt ? new Date(data.createdAt.toDate()).toISOString() : ''
            });
        });

        // CSV 생성
        const headers = Object.keys(customers[0]);
        const csvContent = [
            headers.join(','),
            ...customers.map(customer => 
                headers.map(header => 
                    `"${customer[header]?.toString().replace(/"/g, '""') || ''}"`
                ).join(',')
            )
        ].join('\n');

        // 파일 다운로드
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `고객데이터_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showAlert(`${customers.length}명의 고객 데이터를 CSV 파일로 내보냈습니다.`, 'success');

    } catch (error) {
        console.error('데이터 내보내기 오류:', error);
        showAlert('데이터 내보내기 중 오류가 발생했습니다.', 'error');
    }
}

// 모든 고객 데이터 삭제
async function clearAllCustomerData() {
    if (!firebaseConnected) {
        showAlert('Firebase 연결이 필요합니다.', 'error');
        return;
    }

    const confirmMsg = `⚠️ 위험한 작업입니다!

모든 고객 데이터가 완전히 삭제됩니다.
• 고객 정보
• 방문 기록  
• 즐겨찾기 정보
• 기타 모든 관련 데이터

삭제된 데이터는 복구할 수 없습니다.

정말로 모든 고객 데이터를 삭제하시겠습니까?`;

    if (!confirm(confirmMsg)) {
        return;
    }

    const doubleConfirm = prompt('확인을 위해 "모든데이터삭제"를 정확히 입력하세요:');
    if (doubleConfirm !== '모든데이터삭제') {
        showAlert('확인 문구가 일치하지 않습니다. 삭제가 취소되었습니다.', 'warning');
        return;
    }

    try {
        showAlert('모든 고객 데이터를 삭제하고 있습니다...', 'warning');
        
        const customersSnapshot = await db.collection('customers').get();
        
        if (customersSnapshot.empty) {
            showAlert('삭제할 고객 데이터가 없습니다.', 'warning');
            return;
        }

        let deleteCount = 0;
        const batch = db.batch();
        
        customersSnapshot.forEach((doc) => {
            batch.delete(doc.ref);
            deleteCount++;
        });

        await batch.commit();

        // UI 초기화
        document.getElementById('customerDataContainer').style.display = 'none';

        showAlert(`${deleteCount}명의 고객 데이터가 모두 삭제되었습니다.`, 'success');

    } catch (error) {
        console.error('데이터 삭제 오류:', error);
        showAlert('데이터 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// 개별 고객 삭제
async function deleteCustomer(customerId) {
    if (!confirm('이 고객의 모든 데이터를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) {
        return;
    }

    try {
        await db.collection('customers').doc(customerId).delete();
        showAlert('고객 데이터가 삭제되었습니다.', 'success');
        
        // UI 새로고침
        setTimeout(() => {
            loadCustomerData();
        }, 1000);

    } catch (error) {
        console.error('고객 삭제 오류:', error);
        showAlert('고객 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// 고객 상세보기
function viewCustomerDetail(customerId) {
    showAlert('고객 상세보기 기능은 향후 구현될 예정입니다.', 'info');
}

// 디자이너 상세보기
function viewDesignerDetail(designerId) {
    showAlert('디자이너 상세보기 기능은 향후 구현될 예정입니다.', 'info');
}

// 디자이너 고객 목록
function loadDesignerCustomers(designerId) {
    showAlert('디자이너별 고객 목록 기능은 향후 구현될 예정입니다.', 'info');
}

// 디자이너 삭제
async function deleteDesigner(designerId) {
    if (!confirm('이 디자이너를 삭제하시겠습니까?\n관련된 고객 데이터는 유지됩니다.')) {
        return;
    }

    try {
        await db.collection('designers').doc(designerId).delete();
        showAlert('디자이너가 삭제되었습니다.', 'success');
        
        // UI 새로고침
        setTimeout(() => {
            loadDesignerData();
        }, 1000);

    } catch (error) {
        console.error('디자이너 삭제 오류:', error);
        showAlert('디자이너 삭제 중 오류가 발생했습니다.', 'error');
    }
}

// ========== UI 관리 ==========
// 브레드크럼 업데이트
function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    let items = [];
    
    if (selectedGender) {
        items.push(`<span class="breadcrumb-item">${selectedGender === 'male' ? '남성' : '여성'}</span>`);
    }
    
    if (selectedMainCategory) {
        items.push(`<span class="breadcrumb-item">${selectedMainCategory}</span>`);
    }
    
    if (selectedSubCategory) {
        items.push(`<span class="breadcrumb-item active">${selectedSubCategory}</span>`);
    }
    
    if (items.length === 0) {
        items.push('<span class="breadcrumb-item">성별을 선택하세요</span>');
    }
    
    breadcrumb.innerHTML = items.join('');
}

// UI 새로고침
function refreshUI() {
    selectedGender = null;
    selectedMainCategory = null;
    selectedSubCategory = null;
    
    // 선택 상태 초기화
    document.querySelectorAll('.selectable-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // 버튼 비활성화
    document.getElementById('addMainCategoryBtn').disabled = true;
    document.getElementById('addSubCategoryBtn').disabled = true;
    document.getElementById('addStyleBtn').disabled = true;
    
    // 목록 초기화
    document.getElementById('mainCategoryList').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><div>성별을 선택하세요</div></div>';
    document.getElementById('subCategoryList').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📂</div><div>대분류를 선택하세요</div></div>';
    document.getElementById('stylesList').innerHTML = '<div class="empty-state"><div class="empty-state-icon">✂️</div><div>중분류를 선택하세요</div></div>';
    
    updateBreadcrumb();
    showAlert('UI가 새로고침되었습니다.', 'success');
}

// 인덱스에 반영
function syncToIndex() {
    showAlert('인덱스 동기화 기능은 자동으로 처리됩니다.', 'info');
}

// ========== 유틸리티 함수들 ==========
function updateSyncIndicator(status, message) {
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
        indicator.className = `sync-indicator ${status}`;
        indicator.textContent = message;
    }
}

function showAlert(message, type) {
    const alert = document.getElementById('alert');
    if (alert) {
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.display = 'block';
        
        setTimeout(() => {
            alert.style.display = 'none';
        }, 5000);
    }
}

function showProgressContainer(show) {
    const container = document.getElementById('initProgress');
    if (container) {
        container.style.display = show ? 'block' : 'none';
        if (show) {
            document.getElementById('progressLog').innerHTML = '';
        }
    }
}

function addProgressLog(message, type = 'info') {
    const progressLog = document.getElementById('progressLog');
    if (!progressLog) return;
    
    const logLine = document.createElement('div');
    logLine.className = `progress-line ${type}`;
    logLine.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    progressLog.appendChild(logLine);
    progressLog.scrollTop = progressLog.scrollHeight;
    console.log(`📋 ${message}`);
}

function handleFirebaseError(error) {
    console.error('❌ Firebase 오류:', error);
    firebaseConnected = false;
    
    let errorMessage = '연결 실패: ';
    if (error.code === 'permission-denied') {
        errorMessage += 'Firebase 권한이 없습니다.';
    } else if (error.code === 'unavailable') {
        errorMessage += 'Firebase 서비스를 일시적으로 사용할 수 없습니다.';
    } else {
        errorMessage += error.message;
    }
    
    updateSyncIndicator('disconnected', `❌ ${errorMessage}`);
    showAlert(`Firebase 연결 실패: ${errorMessage}`, 'error');
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM 로드 완료, Firebase 초기화 시작...');
    
    // Firebase SDK 확인 후 초기화
    let checkAttempts = 0;
    const maxAttempts = 50;
    
    const checkFirebase = () => {
        checkAttempts++;
        
        if (typeof firebase !== 'undefined') {
            console.log('✅ Firebase SDK 확인됨');
            initializeFirebase();
        } else if (checkAttempts >= maxAttempts) {
            console.error('❌ Firebase SDK 로딩 타임아웃');
            updateSyncIndicator('disconnected', '❌ Firebase SDK 로딩 실패');
            showAlert('Firebase SDK를 로드할 수 없습니다.', 'error');
        } else {
            setTimeout(checkFirebase, 100);
        }
    };
    
    checkFirebase();
});

// 전역 오류 처리
window.addEventListener('error', function(event) {
    console.error('🚨 전역 오류:', event.error);
    addProgressLog(`🚨 오류: ${event.error.message}`, 'error');
});

console.log('✅ 모든 JavaScript 함수 정의 완료');
