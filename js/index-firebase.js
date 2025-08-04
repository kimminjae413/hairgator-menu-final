// Firebase 설정 - 전역 변수로 선언
window.firebaseConfig = {
    apiKey: "AIzaSyBeTlHZwgx36hR-F35QPtGG2xvE5EY0XmY",
    authDomain: "hairgatormenu-4a43e.firebaseapp.com",
    projectId: "hairgatormenu-4a43e",
    storageBucket: "hairgatormenu-4a43e.firebasestorage.app",
    messagingSenderId: "800038006875",
    appId: "1:800038006875:web:2a4de70e3a306986e0cf7e"
};

// Firebase 초기화
console.log('🔥 Firebase 초기화 시작...');
let db = null;
let storage = null;
let firebaseConnected = false;

// Firebase SDK가 로드될 때까지 대기
function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// Firebase 초기화 함수
async function initializeFirebase() {
    try {
        // Firebase SDK 로드 대기
        await waitForFirebase();
        console.log('✅ Firebase SDK 로드 완료');
        
        // Firebase 앱 초기화
        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
            console.log('✅ Firebase 앱 초기화 완료');
        } else {
            console.log('✅ Firebase 앱 이미 초기화됨');
        }
        
        // Firestore 및 Storage 초기화
        db = firebase.firestore();
        storage = firebase.storage();
        
        // 오프라인 지원 활성화
        try {
            await db.enablePersistence();
            console.log('✅ Firebase 오프라인 지원 활성화');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.log('⚠️ 다중 탭에서 실행 중 - 오프라인 지원 비활성화');
            } else if (err.code === 'unimplemented') {
                console.log('⚠️ 브라우저가 오프라인 지원하지 않음');
            }
        }
        
        // 간단한 연결 테스트 (실제 존재하는 컬렉션으로)
        try {
            await db.collection('category_hierarchy').doc('test').get();
            console.log('✅ Firestore 연결 테스트 성공');
        } catch (error) {
            // 에러가 나도 괜찮음 (권한 문제일 수 있음)
            console.log('⚠️ Firestore 테스트:', error.code);
        }
        
        // 연결 상태 확인
        firebaseConnected = true;
        updateSyncStatus('connected', '✅ Firebase 연결됨');
        
        // 전역 변수로 설정 (다른 스크립트에서 사용 가능)
        window.db = db;
        window.storage = storage;
        window.firebaseConnected = true;
        
    } catch (error) {
        console.error('❌ Firebase 초기화 실패:', error);
        firebaseConnected = false;
        updateSyncStatus('disconnected', '❌ Firebase 초기화 실패: ' + error.message);
        
        // 실패해도 전역 변수는 설정
        window.firebaseConnected = false;
    }
}

// 동기화 상태 업데이트 함수
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

// DOM이 로드된 후 Firebase 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
    // DOM이 이미 로드된 경우
    initializeFirebase();
}

console.log('✅ index-firebase.js 로드 완료');
