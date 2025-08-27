// Firebase 설정 - 도메인 수정됨!
const firebaseConfig = {
    apiKey: "AIzaSyBeTlHZwgx36hR-F35QPtGG2xvE5EY0XmY",
    authDomain: "hairgatormenu-4a43e.firebaseapp.com",
    databaseURL: "https://hairgatormenu-4a43e-default-rtdb.firebaseio.com",
    projectId: "hairgatormenu-4a43e",
    storageBucket: "hairgatormenu-4a43e.firebasestorage.app", // 👈 NEW 도메인!
    messagingSenderId: "800038006875",
    appId: "1:800038006875:web:2a4de70e3a306986e0cf7e"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Firestore 초기화 - 새로운 방식
const db = firebase.firestore();
const storage = firebase.storage();

// 새로운 캐시 설정 방식 (권장)
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
    // 구버전 방식 (경고는 나지만 작동함)
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.log('Multiple tabs open, persistence disabled');
            } else if (err.code === 'unimplemented') {
                console.log('Browser doesn\'t support offline persistence');
            }
        });
}

console.log('✅ Firebase initialized with NEW storage domain!');
