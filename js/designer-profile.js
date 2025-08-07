// ========== HAIRGATOR 최적화된 디자이너 프로필 관리 시스템 ========== 
console.log('👤 디자이너 프로필 시스템 최적화 로드 시작');

// ========== 전역 변수 ========== 
let profileData = {};
let isProfileSaving = false;

// ========== 디자이너 프로필 모달 표시 ========== 
function showDesignerProfile() {
    console.log('👤 디자이너 프로필 모달 표시');
    
    // 기존 모달 제거
    const existing = document.getElementById('profileModal');
    if (existing) {
        existing.remove();
    }
    
    const modalHTML = `
        <div class="designer-profile-modal" id="profileModal">
            <div class="profile-container">
                <div class="profile-header">
                    <h3>👤 내 프로필</h3>
                    <button onclick="closeProfileModal()" class="profile-close-btn">×</button>
                </div>
                
                <form id="profileForm" onsubmit="saveProfile(event)">
                    <!-- 기본 정보 섹션 -->
                    <div class="profile-section">
                        <h4>✂️ 기본 정보</h4>
                        
                        <div class="profile-field">
                            <label for="profile-designerName">디자이너 이름 *</label>
                            <input type="text" id="profile-designerName" name="designerName" 
                                   placeholder="홍길동" autocomplete="name" required>
                        </div>
                        
                        <div class="profile-field">
                            <label for="profile-businessName">매장명</label>
                            <input type="text" id="profile-businessName" name="businessName" 
                                   placeholder="헤어살롱 이름" autocomplete="organization">
                        </div>
                        
                        <div class="profile-field">
                            <label for="profile-phoneNumber">전화번호</label>
                            <input type="tel" id="profile-phoneNumber" name="phoneNumber" 
                                   placeholder="010-1234-5678" autocomplete="tel">
                            <small>고객 문의 연락처로 사용됩니다</small>
                        </div>
                        
                        <div class="profile-field">
                            <label for="profile-businessAddress">매장 주소</label>
                            <input type="text" id="profile-businessAddress" name="businessAddress" 
                                   placeholder="서울시 강남구..." autocomplete="street-address">
                        </div>
                        
                        <div class="profile-field">
                            <label for="profile-businessHours">영업시간</label>
                            <input type="text" id="profile-businessHours" name="businessHours" 
                                   placeholder="평일 10:00-20:00, 일요일 휴무">
                        </div>
                    </div>
                    
                    <!-- 네이버 예약 섹션 (숨김 처리) -->
                    <div class="profile-section hidden" id="naverBookingSection">
                        <h4>🔗 네이버 예약 (나중에 활성화 예정)</h4>
                        
                        <div class="profile-field">
                            <label for="profile-naverBookingUrl">네이버 예약 링크</label>
                            <input type="url" id="profile-naverBookingUrl" name="naverBookingUrl" 
                                   placeholder="https://naver.me/xxxxx" autocomplete="url" disabled>
                            <small>현재 준비 중인 기능입니다</small>
                        </div>
                    </div>
                    
                    <!-- 개인 설정 섹션 -->
                    <div class="profile-section">
                        <h4>⚙️ 개인 설정</h4>
                        
                        <div class="profile-checkbox-group">
                            <label class="profile-checkbox">
                                <input type="checkbox" id="profile-enableStats" name="enableStats" checked>
                                <span class="checkmark"></span>
                                <div class="checkbox-text">
                                    <strong>통계 기능 사용</strong>
                                    <small>인기 스타일 분석 및 고객 통계 활용</small>
                                </div>
                            </label>
                            
                            <label class="profile-checkbox">
                                <input type="checkbox" id="profile-enableCustomerManagement" name="enableCustomerManagement" checked>
                                <span class="checkmark"></span>
                                <div class="checkbox-text">
                                    <strong>고객 관리 기능 사용</strong>
                                    <small>고객 방문 기록 및 선호 스타일 저장</small>
                                </div>
                            </label>
                            
                            <label class="profile-checkbox">
                                <input type="checkbox" id="profile-autoTheme" name="autoTheme">
                                <span class="checkmark"></span>
                                <div class="checkbox-text">
                                    <strong>자동 테마 전환</strong>
                                    <small>시간대별 자동 다크/라이트 모드</small>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- 버튼 그룹 -->
                    <div class="profile-buttons">
                        <button type="submit" class="profile-save-btn" id="profileSaveBtn">
                            💾 저장
                        </button>
                        <button type="button" onclick="closeProfileModal()" class="profile-cancel-btn">
                            취소
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 모달 이벤트 리스너 설정
    setupProfileModalEvents();
    
    // 기존 프로필 데이터 로드
    loadProfileData();
    
    // 첫 번째 필드에 포커스
    setTimeout(() => {
        document.getElementById('profile-designerName').focus();
    }, 100);
}

// ========== 모달 이벤트 리스너 설정 ========== 
function setupProfileModalEvents() {
    // 전화번호 자동 포맷팅
    const phoneInput = document.getElementById('profile-phoneNumber');
    phoneInput.addEventListener('input', formatPhoneNumberInput);
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', handleProfileModalKeydown);
    
    // 오버레이 클릭으로 모달 닫기
    const modal = document.getElementById('profileModal');
    modal.addEventListener('click', handleProfileModalOverlayClick);
}

// 전화번호 포맷팅
function formatPhoneNumberInput(event) {
    let value = event.target.value.replace(/[^0-9]/g, '');
    
    if (value.length <= 11) {
        if (value.length > 3 && value.length <= 7) {
            value = value.substring(0, 3) + '-' + value.substring(3);
        } else if (value.length > 7) {
            value = value.substring(0, 3) + '-' + value.substring(3, 7) + '-' + value.substring(7);
        }
    }
    
    event.target.value = value;
}

// ESC 키 핸들러
function handleProfileModalKeydown(event) {
    if (event.key === 'Escape' && document.getElementById('profileModal')) {
        closeProfileModal();
    }
}

// 오버레이 클릭 핸들러
function handleProfileModalOverlayClick(event) {
    if (event.target.classList.contains('designer-profile-modal')) {
        closeProfileModal();
    }
}

// ========== 프로필 데이터 로드 ========== 
function loadProfileData() {
    console.log('📋 기존 프로필 데이터 로드');
    
    try {
        const savedProfile = localStorage.getItem('hairgator_profile');
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            populateFormWithProfile(profile);
            console.log('✅ 기존 프로필 로드 완료');
        }
        
        // 현재 디자이너 정보 자동 입력
        if (typeof currentDesignerName !== 'undefined' && currentDesignerName) {
            const nameField = document.getElementById('profile-designerName');
            if (nameField && !nameField.value) {
                nameField.value = currentDesignerName;
            }
        }
        
    } catch (error) {
        console.log('⚠️ 기존 프로필 로드 실패:', error);
        showProfileError('저장된 프로필을 불러올 수 없습니다');
    }
}

// 폼에 프로필 데이터 채우기
function populateFormWithProfile(profile) {
    const fields = [
        'designerName',
        'businessName', 
        'phoneNumber',
        'businessAddress',
        'businessHours'
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(`profile-${field}`);
        if (element && profile[field]) {
            element.value = profile[field];
        }
    });
    
    // 체크박스 필드들
    const checkboxFields = [
        'enableStats',
        'enableCustomerManagement',
        'autoTheme'
    ];
    
    checkboxFields.forEach(field => {
        const element = document.getElementById(`profile-${field}`);
        if (element && typeof profile[field] === 'boolean') {
            element.checked = profile[field];
        }
    });
}

// ========== 프로필 저장 ========== 
async function saveProfile(event) {
    if (event) event.preventDefault();
    
    if (isProfileSaving) return;
    
    console.log('💾 프로필 저장 시작');
    
    const formData = getFormData();
    
    // 필수 필드 검증
    if (!formData.designerName.trim()) {
        showProfileError('디자이너 이름은 필수 입력 항목입니다');
        document.getElementById('profile-designerName').focus();
        return;
    }
    
    // 전화번호 형식 검증 (입력된 경우)
    if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
        showProfileError('올바른 전화번호 형식을 입력해주세요 (010-1234-5678)');
        document.getElementById('profile-phoneNumber').focus();
        return;
    }
    
    isProfileSaving = true;
    updateSaveButtonState(true);
    
    try {
        const profileData = {
            ...formData,
            updatedAt: new Date().toISOString(),
            version: '2.0' // 최적화 버전 표시
        };
        
        // 로컬스토리지에 저장
        localStorage.setItem('hairgator_profile', JSON.stringify(profileData));
        
        // Firebase에 저장 (가능한 경우)
        if (shouldSaveToFirebase()) {
            await saveProfileToFirebase(profileData);
        }
        
        showProfileSuccess('프로필이 성공적으로 저장되었습니다!');
        
        // 전역 프로필 데이터 업데이트
        window.profileData = profileData;
        
        // 다른 모듈에 프로필 업데이트 알림
        notifyProfileUpdate(profileData);
        
        setTimeout(() => {
            closeProfileModal();
        }, 1500);
        
        console.log('✅ 프로필 저장 완료:', profileData);
        
    } catch (error) {
        console.error('❌ 프로필 저장 오류:', error);
        showProfileError('프로필 저장에 실패했습니다: ' + error.message);
    } finally {
        isProfileSaving = false;
        updateSaveButtonState(false);
    }
}

// 폼 데이터 수집
function getFormData() {
    return {
        designerName: document.getElementById('profile-designerName').value.trim(),
        businessName: document.getElementById('profile-businessName').value.trim(),
        phoneNumber: document.getElementById('profile-phoneNumber').value.trim(),
        businessAddress: document.getElementById('profile-businessAddress').value.trim(),
        businessHours: document.getElementById('profile-businessHours').value.trim(),
        enableStats: document.getElementById('profile-enableStats').checked,
        enableCustomerManagement: document.getElementById('profile-enableCustomerManagement').checked,
        autoTheme: document.getElementById('profile-autoTheme').checked
    };
}

// Firebase 저장 여부 판단
function shouldSaveToFirebase() {
    return typeof currentDesigner !== 'undefined' && 
           currentDesigner && 
           typeof db !== 'undefined' &&
           window.firebaseConnected;
}

// Firebase에 프로필 저장
async function saveProfileToFirebase(profileData) {
    try {
        await db.collection('designer_profiles').doc(currentDesigner).set({
            designerId: currentDesigner,
            designerName: profileData.designerName,
            businessName: profileData.businessName,
            phoneNumber: profileData.phoneNumber,
            businessAddress: profileData.businessAddress,
            businessHours: profileData.businessHours,
            enableStats: profileData.enableStats,
            enableCustomerManagement: profileData.enableCustomerManagement,
            autoTheme: profileData.autoTheme,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            version: profileData.version
        }, { merge: true });
        
        console.log('✅ Firebase에 프로필 저장 완료');
    } catch (error) {
        console.error('⚠️ Firebase 프로필 저장 실패:', error);
        // Firebase 저장 실패는 사용자에게 알리지 않음 (로컬 저장은 성공했으므로)
    }
}

// 다른 모듈에 프로필 업데이트 알림
function notifyProfileUpdate(profileData) {
    // 테마 설정 적용
    if (profileData.autoTheme && typeof applyAutoTheme === 'function') {
        applyAutoTheme();
    }
    
    // 고객 관리 모듈 업데이트
    if (typeof window.onProfileUpdated === 'function') {
        window.onProfileUpdated(profileData);
    }
    
    // 통계 모듈 업데이트  
    if (typeof window.onStatsSettingChanged === 'function') {
        window.onStatsSettingChanged(profileData.enableStats);
    }
    
    // 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: profileData
    }));
}

// ========== UI 상태 관리 ========== 

// 저장 버튼 상태 업데이트
function updateSaveButtonState(isSaving) {
    const saveBtn = document.getElementById('profileSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = isSaving;
        saveBtn.textContent = isSaving ? '⏳ 저장 중...' : '💾 저장';
    }
}

// 프로필 에러 메시지 표시
function showProfileError(message) {
    const notice = document.getElementById('deviceNotice');
    if (notice) {
        notice.innerHTML = `❌ ${message}`;
        notice.className = 'device-notice show error';
        
        setTimeout(() => {
            notice.classList.remove('show', 'error');
        }, 5000);
    } else {
        alert(`❌ ${message}`);
    }
}

// 프로필 성공 메시지 표시
function showProfileSuccess(message) {
    const notice = document.getElementById('deviceNotice');
    if (notice) {
        notice.innerHTML = `✅ ${message}`;
        notice.className = 'device-notice show success';
        
        setTimeout(() => {
            notice.classList.remove('show', 'success');
        }, 3000);
    }
}

// ========== 모달 닫기 ========== 
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        // 이벤트 리스너 정리
        document.removeEventListener('keydown', handleProfileModalKeydown);
        
        // 페이드아웃 애니메이션
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// ========== 유틸리티 함수들 ========== 

// 전화번호 유효성 검사
function validatePhoneNumber(phone) {
    const phoneRegex = /^010-[0-9]{4}-[0-9]{4}$/;
    return phoneRegex.test(phone);
}

// 자동 테마 적용 (시간대별)
function applyAutoTheme() {
    const hour = new Date().getHours();
    let targetTheme;
    
    if (hour >= 6 && hour < 18) {
        targetTheme = 'light'; // 오전 6시 ~ 오후 6시: 라이트 테마
    } else {
        targetTheme = 'dark'; // 오후 6시 ~ 오전 6시: 다크 테마
    }
    
    if (typeof applyTheme === 'function') {
        applyTheme(targetTheme);
        console.log(`🎨 자동 테마 적용: ${targetTheme} (현재 시간: ${hour}시)`);
    }
}

// ========== 외부 접근용 함수들 ========== 

// 프로필 데이터 가져오기
function getProfileData() {
    try {
        const savedProfile = localStorage.getItem('hairgator_profile');
        return savedProfile ? JSON.parse(savedProfile) : {};
    } catch (error) {
        console.error('프로필 데이터 로드 오류:', error);
        return {};
    }
}

// 프로필 완성도 확인
function isProfileComplete() {
    const profile = getProfileData();
    return !!(profile.designerName && profile.businessName && profile.phoneNumber);
}

// 특정 기능 활성화 여부 확인
function isFeatureEnabled(featureName) {
    const profile = getProfileData();
    switch (featureName) {
        case 'stats':
            return profile.enableStats !== false; // 기본값 true
        case 'customerManagement':
            return profile.enableCustomerManagement !== false; // 기본값 true
        case 'autoTheme':
            return profile.autoTheme === true; // 기본값 false
        default:
            return false;
    }
}

// ========== CSS 스타일 동적 추가 ========== 
function addProfileModalStyles() {
    if (document.getElementById('profileModalStyles')) return;
    
    const styles = `
        <style id="profileModalStyles">
        .designer-profile-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            opacity: 1;
            transition: opacity 0.3s ease;
        }
        
        .profile-container {
            background: linear-gradient(135deg, var(--bg-color), rgba(42, 42, 42, 0.95));
            border: 2px solid var(--female-primary);
            border-radius: 20px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            padding: 0;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
        }
        
        .profile-header {
            padding: 25px 30px 20px;
            border-bottom: 2px solid rgba(255, 20, 147, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .profile-header h3 {
            color: var(--female-primary);
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        
        .profile-close-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 28px;
            cursor: pointer;
            padding: 5px;
            transition: color 0.2s;
        }
        
        .profile-close-btn:hover {
            color: var(--female-primary);
        }
        
        .profile-section {
            padding: 25px 30px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .profile-section:last-of-type {
            border-bottom: none;
        }
        
        .profile-section h4 {
            color: var(--female-secondary);
            margin: 0 0 20px;
            font-size: 18px;
            font-weight: 600;
        }
        
        .profile-section.hidden {
            display: none;
        }
        
        .profile-field {
            margin-bottom: 20px;
        }
        
        .profile-field label {
            display: block;
            color: var(--text-color);
            font-weight: 500;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .profile-field input {
            width: 100%;
            padding: 12px 15px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            color: var(--text-color);
            box-sizing: border-box;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        .profile-field input:focus {
            outline: none;
            border-color: var(--female-primary);
        }
        
        .profile-field input:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .profile-field small {
            display: block;
            color: var(--text-muted);
            font-size: 12px;
            margin-top: 5px;
        }
        
        .profile-checkbox-group {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .profile-checkbox {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            cursor: pointer;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            transition: background-color 0.2s;
        }
        
        .profile-checkbox:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .profile-checkbox input[type="checkbox"] {
            display: none;
        }
        
        .checkmark {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-radius: 4px;
            position: relative;
            flex-shrink: 0;
            transition: all 0.2s;
            margin-top: 2px;
        }
        
        .profile-checkbox input[type="checkbox"]:checked + .checkmark {
            background: var(--female-primary);
            border-color: var(--female-primary);
        }
        
        .profile-checkbox input[type="checkbox"]:checked + .checkmark::after {
            content: '✓';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
        }
        
        .checkbox-text {
            flex: 1;
        }
        
        .checkbox-text strong {
            display: block;
            color: var(--text-color);
            margin-bottom: 4px;
            font-size: 14px;
        }
        
        .checkbox-text small {
            color: var(--text-muted);
            font-size: 12px;
            line-height: 1.4;
        }
        
        .profile-buttons {
            padding: 25px 30px;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .profile-save-btn {
            background: linear-gradient(135deg, var(--female-primary), var(--female-secondary));
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            margin-right: 15px;
            transition: transform 0.2s;
            box-shadow: 0 4px 15px rgba(255, 20, 147, 0.3);
        }
        
        .profile-save-btn:hover:not(:disabled) {
            transform: translateY(-2px);
        }
        
        .profile-save-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }
        
        .profile-cancel-btn {
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-color);
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 15px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
            font-size: 16px;
            transition: all 0.2s;
        }
        
        .profile-cancel-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        @media (max-width: 600px) {
            .profile-container {
                margin: 10px;
                max-height: 90vh;
            }
            
            .profile-header,
            .profile-section,
            .profile-buttons {
                padding-left: 20px;
                padding-right: 20px;
            }
            
            .profile-buttons {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .profile-save-btn {
                margin-right: 0;
            }
        }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}

// ========== 초기화 ========== 
document.addEventListener('DOMContentLoaded', function() {
    addProfileModalStyles();
    
    // 자동 테마 기능이 활성화되어 있으면 적용
    const profile = getProfileData();
    if (profile.autoTheme) {
        applyAutoTheme();
        
        // 1시간마다 테마 확인
        setInterval(applyAutoTheme, 60 * 60 * 1000);
    }
    
    console.log('✅ 디자이너 프로필 시스템 초기화 완료');
});

// ========== 전역 함수 등록 ========== 
window.showDesignerProfile = showDesignerProfile;
window.closeProfileModal = closeProfileModal;
window.saveProfile = saveProfile;
window.getProfileData = getProfileData;
window.isProfileComplete = isProfileComplete;
window.isFeatureEnabled = isFeatureEnabled;

console.log('✅ 최적화된 디자이너 프로필 시스템 로드 완료');
