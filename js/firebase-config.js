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

// Firestore 초기화
const db = firebase.firestore();
const storage = firebase.storage();

// 전역 변수로 설정
window.db = db;
window.storage = storage;

// 캐시 설정
try {
    db.settings({
        cache: {
            kind: 'persistent',
            tabManager: {
                kind: 'multi-tab'
            }
        }
    });
} catch (error) {
    console.warn('Cache settings failed, using fallback');
    db.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.log('Multiple tabs open, persistence disabled');
            } else if (err.code === 'unimplemented') {
                console.log('Browser does not support offline persistence');
            }
        });
}

console.log('Firebase 초기화 완료 - 프로젝트:', firebase.app().options.projectId);

// 연결 테스트
db.collection('hairstyles').limit(1).get()
    .then(() => console.log('Firestore 연결 성공'))
    .catch(error => console.error('Firestore 연결 실패:', error));
