// admin-main.js - HAIRGATOR 어드민 전체 로직 (최소한 수정 버전)
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

// ========== Firebase 초기화 (기존 로직 유지) ==========
async function initializeFirebase() {
    try {
        updateSyncIndicator('disconnected', '🔄 Firebase 연결 중...');
        
        let app;
        if (firebase.apps.length === 0) {
            // firebase-config.js에서 로드된 firebaseConfig 사용
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

function handleFirebaseError(error) {
    console.error('🚨 Firebase 오류 처리:', error);
    let errorMessage = `Firebase 연결 실패: ${error.message}`;
    updateSyncIndicator('disconnected', '❌ ' + errorMessage);
    addProgressLog(errorMessage, 'error');
}

// ========== Excel 데이터 기반 초기화 (기존 로직 개선) ==========
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

// ========== 계층구조 로드 (기존 로직 유지) ==========
async function loadHierarchyFromFirebase() {
    if (!firebaseConnected) {
        console.log('❌ Firebase 연결 없음');
        return;
    }
    
    try {
        console.log('📊 계층구조 로드 시작...');
        
        const snapshot = await db.collection('category_hierarchy').get();
        
        if (snapshot.empty) {
            console.log('⚠️ category_hierarchy가 비어있습니다');
            hierarchyStructure = {};
            return;
        }
        
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
        
    } catch (error) {
        console.error('❌ 계층구조 로드 실패:', error);
    }
}

// ========== 현재 구조 확인 (기존 로직 개선) ==========
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

// ========== 연결 테스트 (기존 로직) ==========
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

// ========== UI 헬퍼 함수들 (기존 로직 유지) ==========
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

function selectGender(gender) {
    console.log('성별 선택:', gender);
    addProgressLog(`성별 선택: ${gender}`, 'info');
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
    location.reload();
}

function syncToIndex() {
    addProgressLog('인덱스 반영 기능은 준비 중입니다.', 'warning');
}

// ========== 전역 함수 등록 ==========
window.initializeFirebaseWithExcelData = initializeFirebaseWithExcelData;
window.checkCurrentStructure = checkCurrentStructure;
window.testConnection = testConnection;
window.loadCustomerData = loadCustomerData;
window.loadDesignerData = loadDesignerData;
window.exportCustomerData = exportCustomerData;
window.clearAllCustomerData = clearAllCustomerData;
window.selectGender = selectGender;
window.showAddCategoryModal = showAddCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.showAddStyleModal = showAddStyleModal;
window.closeStyleModal = closeStyleModal;
window.previewImage = previewImage;
window.refreshUI = refreshUI;
window.syncToIndex = syncToIndex;

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM 로드 완료, Firebase 초기화 시작...');
    
    // Firebase 초기화 직접 실행
    initializeFirebase();
});

// 전역 오류 처리
window.addEventListener('error', function(event) {
    console.error('🚨 전역 오류:', event.error);
    if (typeof addProgressLog === 'function') {
        addProgressLog(`🚨 오류: ${event.error.message}`, 'error');
    }
});

console.log('✅ 모든 JavaScript 함수 정의 완료');
// 어드민에서 데이터가 제대로 생성되었는지 확인하는 디버그 코드

// 1. 브라우저 콘솔에서 실행할 디버그 함수들
window.debugData = {
    // Firebase 연결 상태 확인
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
    
    // category_hierarchy 데이터 확인
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
            
            // 성별별로 분류
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
            
            // 남성 데이터 확인
            if (data.male) {
                console.log('👨 남성 데이터:');
                for (const [main, subs] of Object.entries(data.male)) {
                    console.log(`  📂 ${main}: [${subs.join(', ')}]`);
                }
            } else {
                console.error('❌ 남성 데이터가 없습니다!');
            }
            
            // 여성 데이터 확인
            if (data.female) {
                console.log('👩 여성 데이터:');
                for (const [main, subs] of Object.entries(data.female)) {
                    console.log(`  📂 ${main}: [${subs.join(', ')}]`);
                }
            } else {
                console.error('❌ 여성 데이터가 없습니다!');
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ 데이터 조회 실패:', error);
        }
    },
    
    // hairstyles 데이터 확인
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
            
            // 성별별 통계
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
    
    // 전체 진단
    fullDiagnosis: async function() {
        console.log('🏥 HAIRGATOR 전체 진단 시작...');
        console.log('=====================================');
        
        await this.checkConnection();
        console.log('-------------------------------------');
        
        const hierarchyData = await this.checkHierarchy();
        console.log('-------------------------------------');
        
        await this.checkStyles();
        console.log('=====================================');
        
        // 메인 페이지용 권장사항
        console.log('💡 메인 페이지 수정 권장사항:');
        
        if (hierarchyData && hierarchyData.male && Object.keys(hierarchyData.male).length > 0) {
            console.log('✅ 남성 데이터 존재 - 메인 페이지에서 로딩 로직 확인 필요');
            console.log('🔧 메인 페이지에서 loadHierarchyFromFirebase(\'male\') 함수 확인');
        }
        
        if (hierarchyData && hierarchyData.female && Object.keys(hierarchyData.female).length > 0) {
            console.log('✅ 여성 데이터 존재 - 메인 페이지에서 로딩 로직 확인 필요');
            console.log('🔧 메인 페이지에서 loadHierarchyFromFirebase(\'female\') 함수 확인');
        }
        
        console.log('=====================================');
    }
};

// 2. 자동 진단 실행 (어드민 페이지 로드 후 5초 후)
setTimeout(() => {
    console.log('🔍 자동 진단 시작...');
    window.debugData.fullDiagnosis();
}, 5000);

// 3. 강제 데이터 재생성 함수 (필요시 사용)
window.forceRecreateData = async function() {
    console.log('🔨 데이터 강제 재생성 시작...');
    
    if (!confirm('기존 category_hierarchy를 삭제하고 다시 생성하시겠습니까?')) {
        return;
    }
    
    try {
        // 1. 기존 데이터 삭제
        const batch = db.batch();
        const snapshot = await db.collection('category_hierarchy').get();
        
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        if (!snapshot.empty) {
            await batch.commit();
            console.log(`🗑️ ${snapshot.size}개 기존 문서 삭제`);
        }
        
        // 2. 새 데이터 생성
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
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        debugRecreate: true,
                        timestamp: new Date().toISOString()
                    });
                    createCount++;
                }
            }
        }
        
        await newBatch.commit();
        console.log(`✅ ${createCount}개 새 문서 생성 완료`);
        
        // 3. 검증
        setTimeout(async () => {
            console.log('🔍 생성 결과 검증...');
            await window.debugData.checkHierarchy();
        }, 2000);
        
    } catch (error) {
        console.error('❌ 강제 재생성 실패:', error);
    }
};

console.log('🛠️ 어드민 디버그 도구 로드 완료');
console.log('📋 사용 가능한 명령어:');
console.log('  debugData.checkConnection() - Firebase 연결 확인');
console.log('  debugData.checkHierarchy() - category_hierarchy 확인');
console.log('  debugData.checkStyles() - hairstyles 확인'); 
console.log('  debugData.fullDiagnosis() - 전체 진단');
console.log('  forceRecreateData() - 데이터 강제 재생성');
