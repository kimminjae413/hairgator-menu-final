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

// 오프라인 지원 활성화 - 수정된 버전
if (!window.firestorePersistenceEnabled) {
    window.firestorePersistenceEnabled = true;
    
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.log('Multiple tabs open - 오프라인 모드는 하나의 탭에서만 활성화됩니다');
            } else if (err.code === 'unimplemented') {
                console.log('Browser doesn\'t support offline');
            }
        });
}

console.log('✅ Firebase initialized');
