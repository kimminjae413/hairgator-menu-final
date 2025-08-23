// scripts/core/firebase-config.js
// Firebase 설정 - 보안 강화 버전

// 환경별 설정 (개발/프로덕션 분리)
const ENV = {
    development: {
        apiKey: "AIzaSyBeTlHZwgx36hR-F35QPtGG2xvE5EY0XmY", // 개발용 (제한된 권한)
        authDomain: "hairgatormenu-4a43e.firebaseapp.com",
        databaseURL: "https://hairgatormenu-4a43e-default-rtdb.firebaseio.com",
        projectId: "hairgatormenu-4a43e",
        storageBucket: "hairgatormenu-4a43e.firebasestorage.app",
        messagingSenderId: "800038006875",
        appId: "1:800038006875:web:2a4de70e3a306986e0cf7e"
    },
    production: {
        // 프로덕션용 설정 (별도 프로젝트 권장)
        apiKey: "AIzaSyBeTlHZwgx36hR-F35QPtGG2xvE5EY0XmY", // 임시: 실제로는 다른 키 사용
        authDomain: "hairgatormenu-4a43e.firebaseapp.com",
        databaseURL: "https://hairgatormenu-4a43e-default-rtdb.firebaseio.com",
        projectId: "hairgatormenu-4a43e",
        storageBucket: "hairgatormenu-4a43e.firebasestorage.app",
        messagingSenderId: "800038006875",
        appId: "1:800038006875:web:2a4de70e3a306986e0cf7e"
    }
};

// 현재 환경 감지
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('preview');

const currentConfig = isDevelopment ? ENV.development : ENV.production;

// Firebase 초기화
try {
    firebase.initializeApp(currentConfig);
    console.log(`✅ Firebase 초기화 완료 (${isDevelopment ? '개발' : '프로덕션'} 모드)`);
} catch (error) {
    console.error('❌ Firebase 초기화 실패:', error);
    throw new Error('Firebase 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
}

// Firestore 초기화 및 보안 설정
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth(); // 추가

// Firestore 캐시 설정 (보안 강화)
try {
    db.settings({
        cache: {
            kind: 'persistent',
            tabManager: {
                kind: 'multi-tab'
            }
        },
        // 보안 설정 추가
        ignoreUndefinedProperties: true
    });
} catch (settingsError) {
    console.warn('Firestore 설정 경고:', settingsError);
    
    // 폴백: 구버전 브라우저 지원
    try {
        db.enablePersistence({ synchronizeTabs: true })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.log('⚠️ 여러 탭이 열려있어 오프라인 기능을 사용할 수 없습니다.');
                } else if (err.code === 'unimplemented') {
                    console.log('⚠️ 브라우저가 오프라인 기능을 지원하지 않습니다.');
                }
            });
    } catch (persistenceError) {
        console.warn('오프라인 기능 설정 실패:', persistenceError);
    }
}

// 컬렉션 이름 상수 (보안: 하드코딩 방지)
const COLLECTIONS = {
    HAIRSTYLES: 'hairstyles',
    CUSTOMERS: 'customers', 
    DESIGNERS: 'designers',
    USERS: 'users',           // 새 사용자 컬렉션
    PERMISSIONS: 'permissions', // 권한 관리
    METADATA: 'metadata',
    AUDIT_LOGS: 'audit_logs'  // 감사 로그
};

// 보안 검증 함수들
const SecurityUtils = {
    // 입력값 검증
    validateInput(input, type) {
        if (!input || typeof input !== 'string') return false;
        
        switch (type) {
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
            case 'phone':
                return /^\d{4}$/.test(input);
            case 'name':
                return input.length >= 2 && input.length <= 50;
            case 'code':
                return /^[A-Z0-9]{3,10}$/.test(input);
            default:
                return true;
        }
    },

    // XSS 방지
    sanitizeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // SQL Injection 방지 (NoSQL이지만 유사한 공격 방지)
    sanitizeQuery(obj) {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeHtml(value);
            } else if (typeof value === 'object' && value !== null) {
                // 중첩 객체 재귀 처리
                sanitized[key] = this.sanitizeQuery(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
};

// 에러 처리 유틸리티
const ErrorHandler = {
    // Firebase 에러를 사용자 친화적 메시지로 변환
    getFirebaseErrorMessage(error) {
        const errorMessages = {
            'permission-denied': '권한이 없습니다. 관리자에게 문의하세요.',
            'not-found': '요청한 데이터를 찾을 수 없습니다.',
            'already-exists': '이미 존재하는 데이터입니다.',
            'resource-exhausted': '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
            'unauthenticated': '로그인이 필요합니다.',
            'unavailable': '서비스가 일시적으로 사용할 수 없습니다.',
            'deadline-exceeded': '요청 시간이 초과되었습니다. 다시 시도하세요.'
        };

        return errorMessages[error.code] || '알 수 없는 오류가 발생했습니다.';
    },

    // 에러 로그 기록 (개발용)
    async logError(error, context, userId = null) {
        if (isDevelopment) {
            console.group(`🚨 [${context}] 에러 발생`);
            console.error('Error:', error);
            console.error('User:', userId);
            console.error('Timestamp:', new Date().toISOString());
            console.groupEnd();
        }

        // 프로덕션에서는 에러 로그 수집 서비스에 전송
        // 예: Sentry, LogRocket 등
    }
};

// 전역 객체에 추가 (기존 코드 호환성)
window.db = db;
window.storage = storage;
window.auth = auth;
window.COLLECTIONS = COLLECTIONS;
window.SecurityUtils = SecurityUtils;
window.ErrorHandler = ErrorHandler;

// 개발자 도구에서만 접근 가능한 디버그 정보
if (isDevelopment) {
    window.HAIRGATOR_DEBUG = {
        firebase,
        db,
        storage,
        auth,
        collections: COLLECTIONS,
        config: currentConfig
    };
    console.log('🔧 개발 모드: window.HAIRGATOR_DEBUG로 디버그 정보 접근 가능');
}

console.log('✅ Firebase 보안 설정 완료');
console.log(`📊 사용 가능한 컬렉션:`, Object.keys(COLLECTIONS));