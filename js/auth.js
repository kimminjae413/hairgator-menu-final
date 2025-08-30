/* ========================================
   HAIRGATOR - 인증 시스템
   ======================================== */

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.sessionTimeout = 24 * 60 * 60 * 1000; // 24시간
    }
    
    // 로그인 처리
    async login(name, phone, password) {
        try {
            // Firebase에서 디자이너 정보 확인
            const designerQuery = await db.collection('designers')
                .where('name', '==', name)
                .where('phone', '==', phone)
                .where('password', '==', password)
                .limit(1)
                .get();
            
            if (!designerQuery.empty) {
                const designerDoc = designerQuery.docs[0];
                const userData = designerDoc.data();
                
                // 사용자 정보 설정
                this.currentUser = {
                    id: designerDoc.id,
                    ...userData,
                    loginTime: Date.now()
                };
                
                // 로컬 스토리지에 저장
                this.saveUserSession();
                
                return this.currentUser;
            } else {
                throw new Error('로그인 정보가 올바르지 않습니다');
            }
            
        } catch (error) {
            console.error('로그인 오류:', error);
            throw error;
        }
    }
    
    // 세션 저장
    saveUserSession() {
        if (this.currentUser) {
            localStorage.setItem('hairgator_user', JSON.stringify(this.currentUser));
        }
    }
    
    // 세션 로드
    loadUserSession() {
        const savedUser = localStorage.getItem('hairgator_user');
        
        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                const now = Date.now();
                
                // 세션 만료 확인
                if (now - userData.loginTime < this.sessionTimeout) {
                    this.currentUser = userData;
                    return userData;
                }
            } catch (error) {
                console.error('세션 로드 오류:', error);
            }
        }
        
        // 세션이 없거나 만료됨
        this.logout(false);
        return null;
    }
    
    // 로그아웃
    logout(showMessage = true) {
        this.currentUser = null;
        localStorage.removeItem('hairgator_user');
        localStorage.removeItem('selectedGender');
        
        if (showMessage && typeof app !== 'undefined') {
            app.showToast('로그아웃되었습니다', 'info');
        }
    }
    
    // 인증 상태 확인
    isAuthenticated() {
        return this.currentUser !== null;
    }
    
    // 현재 사용자 정보
    getCurrentUser() {
        return this.currentUser;
    }
    
    // 토큰 차감 (기존 어드민 시스템과 연동)
    async consumeTokens(amount, reason) {
        if (!this.currentUser) {
            throw new Error('로그인이 필요합니다');
        }
        
        if (this.currentUser.tokens < amount) {
            throw new Error('토큰이 부족합니다');
        }
        
        try {
            // Firebase에서 토큰 차감
            await db.collection('designers').doc(this.currentUser.id).update({
                tokens: firebase.firestore.FieldValue.increment(-amount),
                tokenHistory: firebase.firestore.FieldValue.arrayUnion({
                    amount: -amount,
                    reason: reason,
                    timestamp: new Date()
                })
            });
            
            // 로컬 정보 업데이트
            this.currentUser.tokens -= amount;
            this.saveUserSession();
            
            console.log(`토큰 차감: ${amount}개 (${reason})`);
            return true;
            
        } catch (error) {
            console.error('토큰 차감 실패:', error);
            throw error;
        }
    }
    
    // 토큰 충전
    async chargeTokens(amount, reason) {
        if (!this.currentUser) {
            throw new Error('로그인이 필요합니다');
        }
        
        try {
            // Firebase에서 토큰 충전
            await db.collection('designers').doc(this.currentUser.id).update({
                tokens: firebase.firestore.FieldValue.increment(amount),
                tokenHistory: firebase.firestore.FieldValue.arrayUnion({
                    amount: amount,
                    reason: reason,
                    timestamp: new Date()
                })
            });
            
            // 로컬 정보 업데이트
            this.currentUser.tokens += amount;
            this.saveUserSession();
            
            console.log(`토큰 충전: ${amount}개 (${reason})`);
            return true;
            
        } catch (error) {
            console.error('토큰 충전 실패:', error);
            throw error;
        }
    }
}

// 전역 인증 시스템 인스턴스
const authSystem = new AuthSystem();

// 전역 함수들
window.authSystem = authSystem;
window.login = (name, phone, password) => authSystem.login(name, phone, password);
window.logout = () => authSystem.logout();
window.getCurrentUser = () => authSystem.getCurrentUser();
window.isAuthenticated = () => authSystem.isAuthenticated();

console.log('✅ 인증 시스템 로드 완료');
