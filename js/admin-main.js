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

// (이하 모든 함수들은 동일하게 유지)

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM 로드 완료, Firebase 초기화 시작...');
    
    // Firebase 초기화 직접 실행
    initializeFirebase();
});

// 전역 오류 처리
window.addEventListener('error', function(event) {
    console.error('🚨 전역 오류:', event.error);
    addProgressLog(`🚨 오류: ${event.error.message}`, 'error');
});

console.log('✅ 모든 JavaScript 함수 정의 완료');