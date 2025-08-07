// ========== HAIRGATOR 최적화된 Firebase 연결 ========== 
console.log('🔥 Firebase 최적화된 초기화 시작...');

// Firebase 전역 변수
let db = null;
let storage = null;
let firebaseConnected = false;
let connectionMonitor = null;

// 연결 재시도 설정
const RECONNECT_DELAY = 5000; // 5초
const MAX_RECONNECT_ATTEMPTS = 3;
let reconnectAttempts = 0;

try {
    // Firebase 앱 초기화 (firebase-config.js의 firebaseConfig 사용)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase 앱 초기화 완료');
    } else {
        console.log('✅ Firebase 앱 이미 초기화됨');
    }
    
    // Firestore 및 Storage 초기화
    db = firebase.firestore();
    storage = firebase.storage();
    
    // Firestore 설정 최적화
    const settings = {
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
        ignoreUndefinedProperties: true
    };
    db.settings(settings);
    
    // 오프라인 지원 최적화
    enableOptimizedOfflineSupport();
    
    // 연결 상태 모니터링 최적화
    setupOptimizedConnectionMonitoring();
    
} catch (error) {
    console.error('❌ Firebase 초기화 실패:', error);
    firebaseConnected = false;
    updateSyncStatus('disconnected', '❌ Firebase 초기화 실패');
    
    // 재연결 시도
    setTimeout(retryFirebaseConnection, RECONNECT_DELAY);
}

// ========== 최적화된 오프라인 지원 ========== 
function enableOptimizedOfflineSupport() {
    db.enablePersistence({
        synchronizeTabs: true // 탭 간 동기화 활성화
    })
    .then(() => {
        console.log('✅ Firebase 오프라인 지원 활성화 (탭 동기화 포함)');
        firebaseConnected = true;
        reconnectAttempts = 0; // 성공 시 재연결 시도 횟수 리셋
        updateSyncStatus('connected', '✅ Firebase 연결됨');
    })
    .catch((err) => {
        console.log('⚠️ 오프라인 지원 설정 중 알림:', err.code);
        
        switch (err.code) {
            case 'failed-precondition':
                console.log('⚠️ 다중 탭에서 실행 중 - 온라인 모드로 동작');
                break;
            case 'unimplemented':
                console.log('⚠️ 브라우저가 오프라인 지원하지 않음 - 온라인 모드로 동작');
                break;
            default:
                console.log('⚠️ 기타 오프라인 지원 이슈 - 온라인 모드로 동작');
        }
        
        firebaseConnected = true;
        reconnectAttempts = 0;
        updateSyncStatus('connected', '✅ Firebase 연결됨 (온라인 모드)');
    });
}

// ========== 최적화된 연결 모니터링 ========== 
function setupOptimizedConnectionMonitoring() {
    // 기존 모니터 정리
    if (connectionMonitor) {
        connectionMonitor();
        connectionMonitor = null;
    }
    
    // 핵심 컬렉션만 모니터링 (test 컬렉션 제거)
    connectionMonitor = db.collection('hairstyles')
        .limit(1)
        .onSnapshot(
            () => {
                if (!firebaseConnected) {
                    console.log('✅ Firebase 연결 복구됨');
                    firebaseConnected = true;
                    reconnectAttempts = 0;
                    updateSyncStatus('connected', '✅ Firebase 연결됨');
                }
            },
            (error) => {
                console.error('❌ Firebase 연결 상태 확인 오류:', error);
                
                if (firebaseConnected) {
                    firebaseConnected = false;
                    updateSyncStatus('disconnected', '❌ Firebase 연결 끊김');
                    
                    // 재연결 시도
                    setTimeout(retryFirebaseConnection, RECONNECT_DELAY);
                }
            }
        );
}

// ========== Firebase 재연결 시도 ========== 
function retryFirebaseConnection() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('❌ Firebase 재연결 최대 시도 횟수 초과');
        updateSyncStatus('disconnected', '❌ Firebase 연결 실패 - 새로고침 필요');
        return;
    }
    
    reconnectAttempts++;
    console.log(`🔄 Firebase 재연결 시도 ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
    
    updateSyncStatus('updating', `🔄 재연결 시도 중... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    // 연결 테스트
    testFirebaseConnection()
        .then(() => {
            console.log('✅ Firebase 재연결 성공');
            firebaseConnected = true;
            reconnectAttempts = 0;
            updateSyncStatus('connected', '✅ Firebase 재연결됨');
            
            // 연결 모니터링 재시작
            setupOptimizedConnectionMonitoring();
        })
        .catch((error) => {
            console.error('❌ Firebase 재연결 실패:', error);
            
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                setTimeout(retryFirebaseConnection, RECONNECT_DELAY * reconnectAttempts);
            } else {
                updateSyncStatus('disconnected', '❌ Firebase 연결 불가 - 새로고침하세요');
            }
        });
}

// Firebase 연결 테스트
async function testFirebaseConnection() {
    try {
        // 가벼운 쿼리로 연결 테스트
        const testQuery = await db.collection('hairstyles').limit(1).get();
        return Promise.resolve();
    } catch (error) {
        return Promise.reject(error);
    }
}

// ========== 최적화된 동기화 상태 표시 ========== 
function updateSyncStatus(status, message) {
    const syncStatus = document.getElementById('syncStatus');
    if (!syncStatus) return;
    
    // 기존 클래스 제거
    syncStatus.className = 'sync-status';
    
    // 새 상태 적용
    syncStatus.classList.add(status);
    syncStatus.textContent = message;
    
    // 상태별 표시 시간 최적화
    switch (status) {
        case 'connected':
            syncStatus.style.opacity = '1';
            // 3초 후 페이드아웃
            setTimeout(() => {
                if (syncStatus.classList.contains('connected')) {
                    syncStatus.style.opacity = '0';
                }
            }, 3000);
            break;
            
        case 'disconnected':
            syncStatus.style.opacity = '1';
            // 계속 표시 (사용자 액션 필요)
            break;
            
        case 'updating':
            syncStatus.style.opacity = '1';
            // 재연결 시도 중에는 계속 표시
            break;
            
        default:
            syncStatus.style.opacity = '1';
    }
}

// ========== 데이터베이스 쿼리 최적화 함수들 ========== 

// 헤어스타일 데이터 가져오기 (최적화)
async function getHairstylesByCategory(gender, category, limit = 50) {
    if (!firebaseConnected) {
        throw new Error('Firebase가 연결되지 않았습니다');
    }
    
    try {
        updateSyncStatus('updating', '🔄 스타일 데이터 로드 중...');
        
        const snapshot = await db.collection('hairstyles')
            .where('gender', '==', gender)
            .where('category', '==', category)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get({ source: 'default' }); // 캐시 우선, 필요시 서버
            
        const styles = [];
        snapshot.forEach(doc => {
            styles.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateSyncStatus('connected', '✅ 데이터 로드 완료');
        return styles;
        
    } catch (error) {
        console.error('헤어스타일 데이터 로드 오류:', error);
        updateSyncStatus('disconnected', '❌ 데이터 로드 실패');
        throw error;
    }
}

// 고객 데이터 가져오기 (최적화)
async function getCustomersByDesigner(designerId, limit = 100) {
    if (!firebaseConnected) {
        throw new Error('Firebase가 연결되지 않았습니다');
    }
    
    try {
        const snapshot = await db.collection('customers')
            .where('designerId', '==', designerId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get({ source: 'default' });
            
        const customers = [];
        snapshot.forEach(doc => {
            customers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return customers;
        
    } catch (error) {
        console.error('고객 데이터 로드 오류:', error);
        throw error;
    }
}

// 인기 스타일 통계 가져오기 (최적화)
async function getPopularityStats(limit = 20) {
    if (!firebaseConnected) {
        throw new Error('Firebase가 연결되지 않았습니다');
    }
    
    try {
        updateSyncStatus('updating', '📊 통계 데이터 로드 중...');
        
        const snapshot = await db.collection('hairstyles')
            .orderBy('views', 'desc')
            .limit(limit)
            .get({ source: 'default' });
            
        const stats = [];
        snapshot.forEach(doc => {
            stats.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateSyncStatus('connected', '✅ 통계 로드 완료');
        return stats;
        
    } catch (error) {
        console.error('통계 데이터 로드 오류:', error);
        updateSyncStatus('disconnected', '❌ 통계 로드 실패');
        throw error;
    }
}

// ========== 데이터 저장 최적화 함수들 ========== 

// 고객 데이터 저장 (최적화)
async function saveCustomerData(customerData) {
    if (!firebaseConnected) {
        throw new Error('Firebase가 연결되지 않았습니다');
    }
    
    try {
        updateSyncStatus('updating', '💾 고객 데이터 저장 중...');
        
        const docRef = await db.collection('customers').add({
            ...customerData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        updateSyncStatus('connected', '✅ 고객 데이터 저장됨');
        return docRef.id;
        
    } catch (error) {
        console.error('고객 데이터 저장 오류:', error);
        updateSyncStatus('disconnected', '❌ 데이터 저장 실패');
        throw error;
    }
}

// 스타일 조회수 증가 (최적화 - 배치 처리)
async function incrementStyleViews(styleCode) {
    if (!firebaseConnected) {
        console.log('⚠️ 오프라인 상태 - 조회수 업데이트 대기');
        return;
    }
    
    try {
        const styleSnapshot = await db.collection('hairstyles')
            .where('code', '==', styleCode)
            .limit(1)
            .get();
            
        if (!styleSnapshot.empty) {
            const styleDoc = styleSnapshot.docs[0];
            
            // 배치 업데이트로 성능 최적화
            const batch = db.batch();
            batch.update(styleDoc.ref, {
                views: firebase.firestore.FieldValue.increment(1),
                lastViewedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await batch.commit();
        }
    } catch (error) {
        console.error('조회수 업데이트 오류:', error);
        // 조회수 업데이트 실패는 사용자 경험에 큰 영향을 주지 않으므로 조용히 처리
    }
}

// ========== 캐시 관리 최적화 ========== 

// 캐시 지우기
async function clearFirebaseCache() {
    try {
        if (db && firebaseConnected) {
            await db.clearPersistence();
            console.log('✅ Firebase 캐시 정리 완료');
            updateSyncStatus('updating', '🔄 캐시 정리 후 재연결 중...');
            
            // 재연결
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (error) {
        console.error('캐시 정리 오류:', error);
    }
}

// ========== 네트워크 상태 감지 ========== 
function setupNetworkMonitoring() {
    // 온라인/오프라인 상태 감지
    window.addEventListener('online', () => {
        console.log('🌐 네트워크 연결됨');
        if (!firebaseConnected) {
            updateSyncStatus('updating', '🔄 네트워크 복구 - 재연결 중...');
            setTimeout(retryFirebaseConnection, 1000);
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('📴 네트워크 연결 끊김');
        firebaseConnected = false;
        updateSyncStatus('disconnected', '📴 네트워크 연결 없음');
    });
}

// ========== 페이지 언로드 시 정리 ========== 
window.addEventListener('beforeunload', () => {
    // 연결 모니터 정리
    if (connectionMonitor) {
        connectionMonitor();
    }
    
    console.log('🧹 Firebase 연결 정리됨');
});

// ========== 전역 함수 등록 ========== 
window.db = db;
window.storage = storage;
window.getHairstylesByCategory = getHairstylesByCategory;
window.getCustomersByDesigner = getCustomersByDesigner;
window.getPopularityStats = getPopularityStats;
window.saveCustomerData = saveCustomerData;
window.incrementStyleViews = incrementStyleViews;
window.clearFirebaseCache = clearFirebaseCache;

// 네트워크 모니터링 시작
setupNetworkMonitoring();

console.log('✅ 최적화된 index-firebase.js 로드 완료');
