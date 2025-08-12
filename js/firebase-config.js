// Firebase 설정 - 최적화된 버전
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Firestore 및 Storage 초기화
const db = firebase.firestore();
const storage = firebase.storage();

// 캐시 설정 간소화 (경고 제거)
db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
        console.log('✅ Firebase persistence enabled');
    })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('⚠️ Multiple tabs open, persistence disabled');
        } else if (err.code === 'unimplemented') {
            console.log('⚠️ Browser doesn\'t support offline persistence');
        } else {
            console.log('⚠️ Persistence failed:', err.code);
        }
    });

console.log('✅ Firebase initialized successfully');
