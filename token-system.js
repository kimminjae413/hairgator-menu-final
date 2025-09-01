// HAIRGATOR 토큰 시스템 (마스터 가이드 준수)

// 토큰 비용 설정 (Firebase에서 로드하거나 기본값 사용)
const TOKEN_COSTS = {
    // 무료 기능 (0토큰)
    'MENU_VIEW': 0,
    'STYLE_DETAIL': 0,
    'BASIC_SEARCH': 0,
    'SHOP_INFO': 0,
    'PWA_INSTALL': 0,
    
    // 저비용 기능 (1-2토큰)
    'CUSTOMER_REGISTER': 1,
    'RESERVATION_CREATE': 1,
    'BASIC_ANALYTICS': 2,
    'PROFILE_MANAGE': 1,
    'FAVORITES': 1,
    
    // 중비용 기능 (3-5토큰)
    'ADVANCED_RECOMMEND': 3,
    'DATA_EXPORT': 3,
    'CUSTOM_REPORT': 4,
    
    // 고비용 기능 (5토큰 이상)
    'AI_FACE_ANALYSIS': 5,
    'BULK_OPERATIONS': 10,
    'ADVANCED_ANALYTICS': 8
};

// 토큰 시스템 클래스
class TokenSystem {
    constructor() {
        this.currentUser = null;
        this.tokenCosts = { ...TOKEN_COSTS };
        this.init();
    }

    // 초기화
    async init() {
        await this.loadTokenCosts();
        console.log('✅ 토큰 시스템 초기화 완료');
    }

    // Firebase에서 토큰 비용 로드
    async loadTokenCosts() {
        try {
            const doc = await db.collection('metadata').doc('token_costs').get();
            if (doc.exists) {
                const firebaseCosts = doc.data().costs || {};
                // Firebase 설정과 기본값 병합
                this.tokenCosts = { ...TOKEN_COSTS, ...firebaseCosts };
                console.log('Firebase 토큰 비용 로드 완료');
            }
        } catch (error) {
            console.warn('Firebase 토큰 비용 로드 실패, 기본값 사용:', error);
            this.tokenCosts = { ...TOKEN_COSTS };
        }
    }

    // 기능별 토큰 비용 조회
    getFeatureCost(featureKey) {
        const cost = this.tokenCosts[featureKey];
        if (typeof cost === 'object') {
            return cost.cost || 0;
        }
        return cost || 0;
    }

    // 토큰 잔액 확인
    async checkBalance() {
        if (!this.currentUser) return 0;
        
        try {
            const doc = await db.collection('designers').doc(this.currentUser.id).get();
            if (doc.exists) {
                return doc.data().tokens || 0;
            }
        } catch (error) {
            console.error('토큰 잔액 확인 실패:', error);
        }
        return 0;
    }

    // 충분한 토큰이 있는지 확인
    async hasEnoughTokens(cost) {
        const balance = await this.checkBalance();
        return balance >= cost;
    }

    // 토큰 소
