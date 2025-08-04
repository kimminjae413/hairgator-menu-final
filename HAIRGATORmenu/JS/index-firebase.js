// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDNlEEGlG7hGqagcOZ0RUsAhkkxNxFymkU",
    authDomain: "hairgator-menu.firebaseapp.com",
    projectId: "hairgator-menu",
    storageBucket: "hairgator-menu.appspot.com",
    messagingSenderId: "505196979433",
    appId: "1:505196979433:web:98e3f8e7e4e7e4e7e4e7e4"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

// 연결 상태 확인
db.enablePersistence()
    .then(() => {
        console.log('✅ Firebase 오프라인 지원 활성화');
        updateSyncStatus('connected');
    })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('⚠️ 다중 탭에서 실행 중');
        } else if (err.code == 'unimplemented') {
            console.log('⚠️ 브라우저가 오프라인 지원하지 않음');
        }
    });

// 동기화 상태 업데이트
function updateSyncStatus(status) {
    const indicator = document.getElementById('syncStatus');
    if (indicator) {
        indicator.textContent = status === 'connected' ? 'Firebase 연결됨' : 'Firebase 연결 중...';
        indicator.className = 'sync-status ' + status;
        indicator.style.display = 'block';
        
        if (status === 'connected') {
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 3000);
        }
    }
}

console.log('🔥 Firebase 초기화 완료');
