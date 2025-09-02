// HAIRGATOR 권한 시스템 (3-Tier Level System)

class PermissionManager {
    constructor() {
        this.currentUser = null;
        this.userPermissions = new Set();
        this.permissionLevels = {
            0: 'PUBLIC',    // 공통 기능 - 로그인 불필요
            1: 'STANDARD',  // 기본 기능 - 로그인한 모든 사용자
            2: 'PREMIUM'    // 프리미엄 기능 - 관리자 개별 승인
        };
        
        this.features = new Map();
        this.initializeFeatures();
    }
    
    // 기능별 권한 레벨 정의
    initializeFeatures() {
        // Level 0 - 공통 기능 (로그인 불필요)
        this.features.set('MENU_VIEW', { level: 0, name: '기본 메뉴 조회' });
        this.features.set('STYLE_DETAIL', { level: 0, name: '스타일 상세 보기' });
        this.features.set('BASIC_SEARCH', { level: 0, name: '기본 검색' });
        this.features.set('SHOP_INFO', { level: 0, name: '샵 정보 보기' });
        this.features.set('PWA_INSTALL', { level: 0, name: 'PWA 설치' });
        
        // Level 1 - 기본 기능 (로그인 후 자동 부여)
        this.features.set('CUSTOMER_BASIC', { level: 1, name: '고객 기본 관리' });
        this.features.set('RESERVATION', { level: 1, name: '예약 관리' });
        this.features.set('STYLE_RECOMMEND_BASIC', { level: 1, name: '기본 스타일 추천' });
        this.features.set('BASIC_ANALYTICS', { level: 1, name: '기본 분석' });
        this.features.set('BASIC_REPORT', { level: 1, name: '기본 리포트' });
        this.features.set('PROFILE_MANAGE', { level: 1, name: '프로필 관리' });
        this.features.set('FAVORITES', { level: 1, name: '즐겨찾기' });
        this.features.set('BASIC_MEMO', { level: 1, name: '기본 메모' });
        
        // Level 2 - 프리미엄 기능 (관리자 개별 승인)
        this.features.set('AI_FACE_ANALYSIS', { level: 2, name: 'AI 얼굴 분석' });
        this.features.set('ADVANCED_RECOMMEND', { level: 2, name: '고급 스타일 추천' });
        this.features.set('ADVANCED_ANALYTICS', { level: 2, name: '고급 분석' });
        this.features.set('DATA_EXPORT', { level: 2, name: '데이터 내보내기' });
        this.features.set('BULK_OPERATIONS', { level: 2, name: '대량 작업' });
        this.features.set('CUSTOM_BRANDING', { level: 2, name: '커스텀 브랜딩' });
        this.features.set('API_ACCESS', { level: 2, name: 'API 접근' });
        this.features.set('ADVANCED_REPORTS', { level: 2, name: '고급 리포트' });
        this.features.set('AUTOMATION', { level: 2, name: '자동화 기능' });
        this.features.set('BACKUP_RESTORE', { level: 2, name: '백업/복원' });
    }
    
    // 사용자 로그인 처리
    async loginUser(designerName, phone, password) {
        try {
            // Firebase에서 사용자 정보 조회
            const userDoc = await db.collection('designers')
                .where('name', '==', designerName)
                .where('phone', '==', phone)
                .where('password', '==', password)
                .get();
            
            if (userDoc.empty) {
                throw new Error('로그인 정보가 올바르지 않습니다');
            }
            
            const userData = userDoc.docs[0].data();
            this.currentUser = {
                id: userDoc.docs[0].id,
                name: userData.name,
                phone: userData.phone,
                isAdmin: userData.isAdmin || false,
                permissions: userData.permissions || [],
                tokens: userData.tokens || 0,
                loginTime: new Date()
            };
            
            // 권한 설정
            this.updatePermissions();
            
            // 로컬 스토리지에 저장
            localStorage.setItem('hairgator_user', JSON.stringify(this.currentUser));
            
            console.log('✅ 로그인 성공:', this.currentUser.name);
            return this.currentUser;
            
        } catch (error) {
            console.error('❌ 로그인 실패:', error);
            throw error;
        }
    }
    
    // 권한 업데이트
    updatePermissions() {
        this.userPermissions.clear();
        
        if (!this.currentUser) {
            // 로그인하지 않은 경우 Level 0만 허용
            this.features.forEach((feature, key) => {
                if (feature.level === 0) {
                    this.userPermissions.add(key);
                }
            });
            return;
        }
        
        // Level 0 - 모든 사용자
        // Level 1 - 로그인한 사용자
        this.features.forEach((feature, key) => {
            if (feature.level <= 1) {
                this.userPermissions.add(key);
            }
        });
        
        // Level 2 - 개별 승인된 기능
        if (this.currentUser.permissions) {
            this.currentUser.permissions.forEach(permission => {
                if (this.features.has(permission)) {
                    this.userPermissions.add(permission);
                }
            });
        }
        
        console.log('권한 업데이트 완료:', Array.from(this.userPermissions));
    }
    
    // 권한 확인
    hasPermission(featureKey) {
        return this.userPermissions.has(featureKey);
    }
    
    // 기능 실행 전 권한 체크
    async checkFeatureAccess(featureKey) {
        const feature = this.features.get(featureKey);
        
        if (!feature) {
            console.error(`알 수 없는 기능: ${featureKey}`);
            return false;
        }
        
        if (!this.hasPermission(featureKey)) {
            this.showPermissionDenied(feature);
            return false;
        }
        
        return true;
    }
    
    // 권한 거부 메시지 표시
    showPermissionDenied(feature) {
        const message = `
            <div class="permission-modal">
                <div class="permission-content">
                    <h3>🔒 권한이 필요합니다</h3>
                    <p><strong>${feature.name}</strong> 기능을 사용하려면 권한이 필요합니다.</p>
                    
                    ${feature.level === 1 ? 
                        '<p>로그인 후 이용하실 수 있습니다.</p>' : 
                        '<p>관리자의 승인이 필요한 프리미엄 기능입니다.</p>'
                    }
                    
                    <div class="permission-actions">
                        ${feature.level === 1 ? 
                            '<button class="btn btn-primary" onclick="showLoginModal()">로그인하기</button>' :
                            '<button class="btn btn-secondary" onclick="requestPermission(\'' + featureKey + '\')">권한 신청하기</button>'
                        }
                        <button class="btn btn-outline" onclick="closePermissionModal()">닫기</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', message);
    }
    
    // 프리미엄 권한 신청
    async requestPermission(featureKey) {
        if (!this.currentUser) {
            alert('로그인이 필요합니다');
            return;
        }
        
        const feature = this.features.get(featureKey);
        const reason = prompt(`${feature.name} 기능이 필요한 이유를 간단히 설명해주세요:`);
        
        if (!reason || reason.trim() === '') {
            return;
        }
        
        try {
            // Firebase에 권한 신청 저장
            await db.collection('permission_requests').add({
                userId: this.currentUser.id,
                userName: this.currentUser.name,
                featureKey: featureKey,
                featureName: feature.name,
                reason: reason.trim(),
                status: 'pending',
                requestDate: new Date(),
                updatedAt: new Date()
            });
            
            alert('권한 신청이 완료되었습니다. 관리자 검토 후 연락드리겠습니다.');
            this.closePermissionModal();
            
        } catch (error) {
            console.error('권한 신청 실패:', error);
            alert('권한 신청 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }
    
    // 권한 모달 닫기
    closePermissionModal() {
        const modal = document.querySelector('.permission-modal');
        if (modal) {
            modal.remove();
        }
    }
    
    // 사용자 정보 로드 (페이지 새로고침 시)
    loadUserFromStorage() {
        const savedUser = localStorage.getItem('hairgator_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updatePermissions();
            return true;
        }
        return false;
    }
    
    // 로그아웃
    logout() {
        this.currentUser = null;
        this.userPermissions.clear();
        localStorage.removeItem('hairgator_user');
        localStorage.removeItem('hairgator_gender');
        this.updatePermissions();
        location.reload();
    }
    
    // 관리자 기능: 사용자에게 권한 부여
    async grantPermission(userId, featureKey) {
        if (!this.currentUser?.isAdmin) {
            console.error('관리자 권한이 필요합니다');
            return false;
        }
        
        try {
            const userDoc = db.collection('designers').doc(userId);
            await userDoc.update({
                permissions: firebase.firestore.FieldValue.arrayUnion(featureKey),
                updatedAt: new Date()
            });
            
            console.log(`권한 부여 완료: ${userId} -> ${featureKey}`);
            return true;
            
        } catch (error) {
            console.error('권한 부여 실패:', error);
            return false;
        }
    }
    
    // 관리자 기능: 사용자 권한 제거
    async revokePermission(userId, featureKey) {
        if (!this.currentUser?.isAdmin) {
            console.error('관리자 권한이 필요합니다');
            return false;
        }
        
        try {
            const userDoc = db.collection('designers').doc(userId);
            await userDoc.update({
                permissions: firebase.firestore.FieldValue.arrayRemove(featureKey),
                updatedAt: new Date()
            });
            
            console.log(`권한 제거 완료: ${userId} -> ${featureKey}`);
            return true;
            
        } catch (error) {
            console.error('권한 제거 실패:', error);
            return false;
        }
    }
    
    // UI에서 권한에 따른 요소 표시/숨김
    updateUIPermissions() {
        // Level 1 기능 버튼들
        const standardFeatures = document.querySelectorAll('[data-permission-level="1"]');
        standardFeatures.forEach(element => {
            if (this.currentUser) {
                element.style.display = 'block';
                element.classList.remove('permission-disabled');
            } else {
                element.style.display = 'none';
            }
        });
        
        // Level 2 기능 버튼들
        const premiumFeatures = document.querySelectorAll('[data-permission-level="2"]');
        premiumFeatures.forEach(element => {
            const featureKey = element.getAttribute('data-feature-key');
            if (this.hasPermission(featureKey)) {
                element.style.display = 'block';
                element.classList.remove('permission-disabled');
            } else {
                element.style.display = 'none';
            }
        });
        
        // 특정 기능별 권한 체크
        this.features.forEach((feature, key) => {
            const elements = document.querySelectorAll(`[data-feature="${key}"]`);
            elements.forEach(element => {
                if (this.hasPermission(key)) {
                    element.classList.remove('permission-disabled');
                    element.removeAttribute('disabled');
                } else {
                    element.classList.add('permission-disabled');
                    element.setAttribute('disabled', 'true');
                }
            });
        });
    }
    
    // 기능 사용 시 권한 체크 래퍼
    async executeWithPermission(featureKey, callback) {
        if (await this.checkFeatureAccess(featureKey)) {
            return await callback();
        }
        return null;
    }
    
    // 토큰 차감 (프리미엄 기능용)
    async deductTokens(amount, reason) {
        if (!this.currentUser) {
            throw new Error('로그인이 필요합니다');
        }
        
        if (this.currentUser.tokens < amount) {
            throw new Error('토큰이 부족합니다');
        }
        
        try {
            // Firebase에서 토큰 차감
            const userDoc = db.collection('designers').doc(this.currentUser.id);
            await userDoc.update({
                tokens: firebase.firestore.FieldValue.increment(-amount),
                tokenHistory: firebase.firestore.FieldValue.arrayUnion({
                    amount: -amount,
                    reason: reason,
                    timestamp: new Date()
                })
            });
            
            // 로컬 사용자 정보 업데이트
            this.currentUser.tokens -= amount;
            localStorage.setItem('hairgator_user', JSON.stringify(this.currentUser));
            
            console.log(`토큰 차감: ${amount}개 (${reason})`);
            return true;
            
        } catch (error) {
            console.error('토큰 차감 실패:', error);
            throw error;
        }
    }
}

// 전역 권한 관리자 인스턴스
const permissionManager = new PermissionManager();

// 권한 체크 헬퍼 함수들
window.hasPermission = (featureKey) => permissionManager.hasPermission(featureKey);
window.checkPermission = (featureKey) => permissionManager.checkFeatureAccess(featureKey);
window.executeWithPermission = (featureKey, callback) => permissionManager.executeWithPermission(featureKey, callback);
window.requestPermission = (featureKey) => permissionManager.requestPermission(featureKey);
window.closePermissionModal = () => permissionManager.closePermissionModal();

// CSS for permission system
const permissionStyles = `
<style>
.permission-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
}

.permission-content {
    background: #111;
    border: 2px solid var(--female-color);
    border-radius: 15px;
    padding: 30px;
    max-width: 400px;
    width: 90%;
    text-align: center;
    animation: slideUp 0.3s ease;
}

.permission-content h3 {
    color: var(--female-color);
    margin-bottom: 15px;
    font-size: 20px;
}

.permission-content p {
    color: var(--text-secondary);
    margin-bottom: 10px;
    line-height: 1.5;
}

.permission-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    justify-content: center;
    flex-wrap: wrap;
}

.permission-disabled {
    opacity: 0.5;
    pointer-events: none;
    cursor: not-allowed !important;
}

.btn {
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s ease;
}

.btn-primary {
    background: var(--female-color);
    color: white;
}

.btn-secondary {
    background: var(--male-color);
    color: white;
}

.btn-outline {
    background: transparent;
    color: white;
    border: 1px solid #666;
}

.btn:hover {
    transform: translateY(-2px);
    filter: brightness(110%);
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}
</style>
`;

// 스타일 추가
document.head.insertAdjacentHTML('beforeend', permissionStyles);

console.log('🔐 HAIRGATOR 권한 시스템 초기화 완료');
