// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBeTlHZwgx36hR-F35QPtGG2xvE5EY0XmY",
    authDomain: "hairgatormenu-4a43e.firebaseapp.com",
    databaseURL: "https://hairgatormenu-4a43e-default-rtdb.firebaseio.com",
    projectId: "hairgatormenu-4a43e",
    storageBucket: "hairgatormenu-4a43e.firebasestorage.app",
    messagingSenderId: "800038006875",
    appId: "1:800038006875:web:2a4de70e3a306986e0cf7e"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// ✅ 단일 캐시 설정 (최신 방식 우선)
try {
    // 최신 방식 시도
    db.settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        ignoreUndefinedProperties: true
    });
    console.log('✅ Firebase initialized with modern cache settings');
} catch (error) {
    console.log('⚠️ Modern cache failed, trying legacy method');
    
    // 구버전 방식 폴백
    db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('✅ Firebase persistence enabled (legacy)');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.log('⚠️ Multiple tabs open, persistence disabled');
            } else if (err.code === 'unimplemented') {
                console.log('⚠️ Browser doesn\'t support offline persistence');
            }
            console.log('✅ Firebase initialized without persistence');
        });
}

// 🚀 CloudFront 문제와 관련된 Storage 설정 최적화
storage.setMaxUploadRetryTime(30000); // 30초
storage.setMaxOperationRetryTime(60000); // 60초

console.log('✅ Firebase 전체 초기화 완료');
