// Firebase 설정 및 초기화 (최적화 버전)
const firebaseConfig = {
    apiKey: "AIzaSyBeTlHZwgx36hR-F35QPtGG2xvE5EY0XmY",
    authDomain: "hairgatormenu-4a43e.firebaseapp.com",
    databaseURL: "https://hairgatormenu-4a43e-default-rtdb.firebaseio.com",
    projectId: "hairgatormenu-4a43e",
    storageBucket: "hairgatormenu-4a43e.firebasestorage.app",
    messagingSenderId: "800038006875",
    appId: "1:800038006875:web:2a4de70e3a306986e0cf7e"
};

// Firebase 초기화 (중복 방지)
if (!window.firebaseInitialized) {
    try {
        firebase.initializeApp(firebaseConfig);
        
        // Firestore 초기화
        const db = firebase.firestore();
        const storage = firebase.storage();
        
        // 새로운 캐시 설정 방식
        db.settings({
            cache: {
                kind: 'persistent',
                tabManager: {
                    kind: 'multi-tab'
                }
            }
        });
        
        // 구버전 브라우저를 위한 폴백
        if (!db.settings.cache) {
            db.enablePersistence({ synchronizeTabs: true })
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.log('Multiple tabs open, persistence disabled');
                    } else if (err.code === 'unimplemented') {
                        console.log('Browser doesn\'t support offline persistence');
                    }
                });
        }
        
        // 전역 변수로 설정
        window.db = db;
        window.storage = storage;
        window.firebaseInitialized = true;
        
        console.log('✅ Firebase initialized successfully');
        
        // Firebase 연결 상태 이벤트
        window.dispatchEvent(new CustomEvent('firebaseReady'));
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        window.firebaseError = error;
    }
} else {
    console.log('🔄 Firebase already initialized');
}
