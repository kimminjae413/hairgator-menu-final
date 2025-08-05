// ========== HAIRGATOR 디자이너 프로필 관리 시스템 - 콘솔 테스트 기반 완전 수정 버전 ==========
// 네이버 예약 URL 자동 추출 + 매장 정보 관리 + 프로필 설정

console.log('🎨 HAIRGATOR 디자이너 프로필 시스템 로드 시작');

// ========== 전역 변수 ==========
var profileEditMode = false;
var profileData = {};

// ========== 디자이너 프로필 모달 표시 함수 ==========
function showDesignerProfile() {
    console.log('👤 디자이너 프로필 모달 표시');
    
    // 기존 모달 제거
    var existing = document.getElementById('profileModal');
    if (existing) {
        existing.remove();
    }
    
    // 프로필 모달 HTML 생성
    var modalHTML = '' +
        '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;" id="profileModal" onclick="closeProfileModalFromOverlay(event)">' +
            '<div style="background: linear-gradient(135deg, #1a1a1a, #2a2a2a); border: 2px solid #FF1493; border-radius: 20px; max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);" onclick="event.stopPropagation()">' +
                
                '<!-- 헤더 -->' +
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid rgba(255, 20, 147, 0.3); padding-bottom: 20px;">' +
                    '<h3 style="color: #FF1493; margin: 0; font-size: 24px; font-weight: bold;">👤 내 프로필 관리</h3>' +
                    '<button onclick="closeProfileModal()" style="background: none; border: none; color: #999; font-size: 28px; cursor: pointer; padding: 5px; transition: color 0.2s;" onmouseover="this.style.color=\'#FF1493\'" onmouseout="this.style.color=\'#999\'">×</button>' +
                '</div>' +
                
                '<!-- 기본 정보 섹션 -->' +
                '<div style="background: rgba(255, 255, 255, 0.05); border-radius: 15px; padding: 25px; margin-bottom: 20px;">' +
                    '<h4 style="color: #FF69B4; margin: 0 0 20px; font-size: 18px; display: flex; align-items: center; gap: 10px;">' +
                        '👤 기본 정보' +
                    '</h4>' +
                    
                    '<div style="margin-bottom: 20px;">' +
                        '<label style="display: block; color: #fff; font-weight: bold; margin-bottom: 8px;">디자이너 이름 *</label>' +
                        '<input type="text" id="profile-designerName" name="designerName" placeholder="홍길동" autocomplete="name" style="width: 100%; padding: 12px 15px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 14px; transition: border-color 0.3s;" onfocus="this.style.borderColor=\'#FF1493\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.3)\'">' +
                    '</div>' +
                    
                    '<div style="margin-bottom: 20px;">' +
                        '<label style="display: block; color: #fff; font-weight: bold; margin-bottom: 8px;">매장명</label>' +
                        '<input type="text" id="profile-businessName" name="businessName" placeholder="헤어살롱 이름" autocomplete="organization" style="width: 100%; padding: 12px 15px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 14px; transition: border-color 0.3s;" onfocus="this.style.borderColor=\'#FF1493\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.3)\'">' +
                    '</div>' +
                    
                    '<div style="margin-bottom: 20px;">' +
                        '<label style="display: block; color: #fff; font-weight: bold; margin-bottom: 8px;">전화번호</label>' +
                        '<input type="tel" id="profile-phoneNumber" name="phoneNumber" placeholder="010-1234-5678" autocomplete="tel" style="width: 100%; padding: 12px 15px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 14px; transition: border-color 0.3s;" onfocus="this.style.borderColor=\'#FF1493\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.3)\'">' +
                    '</div>' +
                    
                    '<div style="margin-bottom: 20px;">' +
                        '<label style="display: block; color: #fff; font-weight: bold; margin-bottom: 8px;">매장 주소</label>' +
                        '<input type="text" id="profile-businessAddress" name="businessAddress" placeholder="서울시 강남구..." autocomplete="street-address" style="width: 100%; padding: 12px 15px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 14px; transition: border-color 0.3s;" onfocus="this.style.borderColor=\'#FF1493\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.3)\'">' +
                    '</div>' +
                '</div>' +
                
                '<!-- 네이버 예약 섹션 -->' +
                '<div style="background: rgba(255, 255, 255, 0.05); border-radius: 15px; padding: 25px; margin-bottom: 20px;">' +
                    '<h4 style="color: #FF69B4; margin: 0 0 20px; font-size: 18px; display: flex; align-items: center; gap: 10px;">' +
                        '🔗 네이버 예약 URL' +
                    '</h4>' +
                    
                    '<div style="margin-bottom: 15px;">' +
                        '<label for="profile-naverBookingUrl" style="display: block; color: #fff; font-weight: bold; margin-bottom: 8px;">네이버 예약 링크</label>' +
                        '<input type="url" id="profile-naverBookingUrl" name="naverBookingUrl" placeholder="https://naver.me/xxxxx" autocomplete="url" style="width: 100%; padding: 12px 15px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 14px; transition: border-color 0.3s;" onfocus="this.style.borderColor=\'#FF1493\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.3)\'">' +
                    '</div>' +
                    
                    '<button type="button" onclick="autoExtractBusinessInfo()" style="background: linear-gradient(135deg, #4169E1, #1E90FF); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; transition: transform 0.2s;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'" id="extractBtn">' +
                        '🔍 매장정보 자동추출' +
                    '</button>' +
                    
                    '<div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 10px; padding: 15px; margin-top: 15px;">' +
                        '<strong style="color: #ffc107;">💡 사용법</strong><br>' +
                        '<span style="color: #fff; font-size: 14px;">네이버 예약 URL을 입력하고 \'매장정보 자동추출\' 버튼을 클릭하면 매장명, 주소, 전화번호 등이 자동으로 입력됩니다.</span>' +
                    '</div>' +
                '</div>' +
                
                '<!-- 설정 섹션 -->' +
                '<div style="background: rgba(255, 255, 255, 0.05); border-radius: 15px; padding: 25px; margin-bottom: 20px;">' +
                    '<h4 style="color: #FF69B4; margin: 0 0 20px; font-size: 18px;">⚙️ 설정</h4>' +
                    
                    '<div style="display: flex; align-items: center; margin-bottom: 15px;">' +
                        '<input type="checkbox" id="profile-enableNotifications" name="enableNotifications" style="margin-right: 10px;">' +
                        '<label for="profile-enableNotifications" style="color: #fff; cursor: pointer;">알림 받기</label>' +
                    '</div>' +
                    
                    '<div style="display: flex; align-items: center; margin-bottom: 15px;">' +
                        '<input type="checkbox" id="profile-enablePromotions" name="enablePromotions" style="margin-right: 10px;">' +
                        '<label for="profile-enablePromotions" style="color: #fff; cursor: pointer;">프로모션 관리 사용</label>' +
                    '</div>' +
                '</div>' +
                
                '<!-- 버튼 그룹 -->' +
                '<div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">' +
                    '<button type="button" onclick="saveProfile()" style="background: linear-gradient(135deg, #FF1493, #FF69B4); color: white; border: none; padding: 15px 30px; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 16px; margin-right: 15px; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(255, 20, 147, 0.3);" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'">' +
                        '💾 저장' +
                    '</button>' +
                    '<button type="button" onclick="closeProfileModal()" style="background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.3); padding: 15px 30px; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 16px; transition: all 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.2)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.1)\'">' +
                        '취소' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 기존 프로필 데이터 로드
    loadProfileData();
}

// ========== 프로필 데이터 로드 ==========
function loadProfileData() {
    console.log('📋 기존 프로필 데이터 로드');
    
    try {
        var savedProfile = localStorage.getItem('hairgator_profile');
        if (savedProfile) {
            var profileData = JSON.parse(savedProfile);
            
            var nameField = document.getElementById('profile-designerName');
            var businessField = document.getElementById('profile-businessName');
            var phoneField = document.getElementById('profile-phoneNumber');
            var addressField = document.getElementById('profile-businessAddress');
            var naverField = document.getElementById('profile-naverBookingUrl');
            var notificationField = document.getElementById('profile-enableNotifications');
            var promotionField = document.getElementById('profile-enablePromotions');
            
            if (nameField && profileData.designerName) nameField.value = profileData.designerName;
            if (businessField && profileData.businessName) businessField.value = profileData.businessName;
            if (phoneField && profileData.phoneNumber) phoneField.value = profileData.phoneNumber;
            if (addressField && profileData.businessAddress) addressField.value = profileData.businessAddress;
            if (naverField && profileData.naverBookingUrl) naverField.value = profileData.naverBookingUrl;
            if (notificationField && profileData.enableNotifications) notificationField.checked = profileData.enableNotifications;
            if (promotionField && profileData.enablePromotions) promotionField.checked = profileData.enablePromotions;
            
            console.log('✅ 기존 프로필 로드 완료');
        }
        
        // 현재 디자이너 정보가 있으면 자동 입력
        if (typeof currentDesignerName !== 'undefined' && currentDesignerName) {
            var nameField = document.getElementById('profile-designerName');
            if (nameField && !nameField.value) {
                nameField.value = currentDesignerName;
            }
        }
        
    } catch (error) {
        console.log('⚠️ 기존 프로필 로드 실패:', error);
    }
}

// ========== 프로필 저장 ==========
function saveProfile() {
    console.log('💾 프로필 저장 시작');
    
    var designerName = document.getElementById('profile-designerName').value.trim();
    var businessName = document.getElementById('profile-businessName').value.trim();
    var phoneNumber = document.getElementById('profile-phoneNumber').value.trim();
    var businessAddress = document.getElementById('profile-businessAddress').value.trim();
    var naverUrl = document.getElementById('profile-naverBookingUrl').value.trim();
    var enableNotifications = document.getElementById('profile-enableNotifications').checked;
    var enablePromotions = document.getElementById('profile-enablePromotions').checked;
    
    if (!designerName) {
        alert('⚠️ 디자이너 이름은 필수 입력 항목입니다');
        document.getElementById('profile-designerName').focus();
        return;
    }
    
    var profileData = {
        designerName: designerName,
        businessName: businessName,
        phoneNumber: phoneNumber,
        businessAddress: businessAddress,
        naverBookingUrl: naverUrl,
        enableNotifications: enableNotifications,
        enablePromotions: enablePromotions,
        updatedAt: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('hairgator_profile', JSON.stringify(profileData));
        
        // Firebase에 저장 (currentDesigner 있는 경우)
        if (typeof currentDesigner !== 'undefined' && currentDesigner && typeof db !== 'undefined') {
            saveProfileToFirebase(profileData);
        }
        
        alert('✅ 프로필이 성공적으로 저장되었습니다!');
        closeProfileModal();
        
        // 프로모션 권한 업데이트
        if (typeof updatePromotionMenuUI === 'function') {
            updatePromotionMenuUI();
        }
        if (typeof window.onProfileSaved === 'function') {
            window.onProfileSaved();
        }
        
        console.log('✅ 프로필 저장 완료:', profileData);
        
    } catch (error) {
        console.error('❌ 프로필 저장 오류:', error);
        alert('❌ 프로필 저장에 실패했습니다: ' + error.message);
    }
}

// ========== Firebase에 프로필 저장 ==========
function saveProfileToFirebase(profileData) {
    if (typeof db === 'undefined' || typeof firebase === 'undefined') {
        console.log('⚠️ Firebase가 로드되지 않음');
        return;
    }
    
    try {
        db.collection('designer_profiles').doc(currentDesigner).set({
            designerName: profileData.designerName,
            businessName: profileData.businessName,
            phoneNumber: profileData.phoneNumber,
            businessAddress: profileData.businessAddress,
            naverBookingUrl: profileData.naverBookingUrl,
            enableNotifications: profileData.enableNotifications,
            enablePromotions: profileData.enablePromotions,
            designerId: currentDesigner,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function() {
            console.log('✅ Firebase에 프로필 저장 완료');
        }).catch(function(error) {
            console.error('⚠️ Firebase 프로필 저장 실패:', error);
        });
    } catch (error) {
        console.error('⚠️ Firebase 프로필 저장 실패:', error);
    }
}

// ========== 네이버 정보 자동 추출 ==========
function autoExtractBusinessInfo() {
    var naverUrl = document.getElementById('profile-naverBookingUrl').value.trim();
    
    if (!naverUrl) {
        alert('⚠️ 네이버 예약 URL을 먼저 입력해주세요');
        return;
    }
    
    if (!naverUrl.includes('naver.me') && !naverUrl.includes('booking.naver.com')) {
        alert('⚠️ 올바른 네이버 예약 URL을 입력해주세요');
        return;
    }
    
    var extractBtn = document.getElementById('extractBtn');
    extractBtn.innerHTML = '🔍 추출 중...';
    extractBtn.disabled = true;
    
    // 실제 추출 로직은 추후 구현
    setTimeout(function() {
        alert('⚠️ 네이버 자동 추출 기능은 현재 개발 중입니다. 수동으로 정보를 입력해주세요.');
        
        extractBtn.innerHTML = '🔍 매장정보 자동추출';
        extractBtn.disabled = false;
        
        // 네이버 페이지를 새 탭에서 열어서 수동 입력 가이드
        if (confirm('네이버 예약 페이지를 새 탭에서 열어서 정보를 확인하시겠습니까?')) {
            window.open(naverUrl, '_blank');
        }
    }, 1000);
}

// ========== 프로필 모달 닫기 ==========
function closeProfileModal() {
    var modal = document.getElementById('profileModal');
    if (modal) {
        modal.remove();
    }
}

// ========== 오버레이 클릭으로 모달 닫기 ==========
function closeProfileModalFromOverlay(event) {
    if (event.target.id === 'profileModal') {
        closeProfileModal();
    }
}

// ========== 프로필 정보 가져오기 (다른 모듈에서 사용) ==========
function getProfileData() {
    try {
        var savedProfile = localStorage.getItem('hairgator_profile');
        if (savedProfile) {
            return JSON.parse(savedProfile);
        }
    } catch (error) {
        console.error('프로필 데이터 로드 오류:', error);
    }
    return {};
}

// ========== 전역 함수 등록 ==========
window.showDesignerProfile = showDesignerProfile;
window.showMyProfile = showDesignerProfile; // 호환성을 위한 별칭
window.closeProfileModal = closeProfileModal;
window.autoExtractBusinessInfo = autoExtractBusinessInfo;
window.saveProfile = saveProfile;
window.getProfileData = getProfileData;

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 디자이너 프로필 시스템 초기화');
});

console.log('✅ HAIRGATOR 디자이너 프로필 시스템 로드 완료 (구문 오류 수정 버전)');
