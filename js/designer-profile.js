// ========== HAIRGATOR 디자이너 프로필 관리 시스템 - 최종 완성 버전 ==========
// 네이버 예약 URL 자동 추출 + 매장 정보 관리 + 프로필 설정
// 프로모션 관리 기능을 위한 완전한 매장 정보 수집 시스템

console.log('🎨 HAIRGATOR 디자이너 프로필 시스템 로드 시작 - 최종 완성 버전');

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
                        '<label style="display: block; color: #fff; font-weight: bold; margin-bottom: 8px;">전화번호 (카카오톡 문의처용) *</label>' +
                        '<input type="tel" id="profile-phoneNumber" name="phoneNumber" placeholder="010-1234-5678" autocomplete="tel" style="width: 100%; padding: 12px 15px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 14px; transition: border-color 0.3s;" onfocus="this.style.borderColor=\'#FF1493\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.3)\'">' +
                        '<small style="color: #aaa; font-size: 12px; display: block; margin-top: 5px;">💡 고객이 카카오톡 프로모션 메시지를 받을 때 문의처로 표시됩니다</small>' +
                    '</div>' +
                    
                    '<div style="margin-bottom: 20px;">' +
                        '<label style="display: block; color: #fff; font-weight: bold; margin-bottom: 8px;">매장 주소</label>' +
                        '<input type="text" id="profile-businessAddress" name="businessAddress" placeholder="서울시 강남구..." autocomplete="street-address" style="width: 100%; padding: 12px 15px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 14px; transition: border-color 0.3s;" onfocus="this.style.borderColor=\'#FF1493\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.3)\'">' +
                    '</div>' +
                    
                    '<div style="margin-bottom: 20px;">' +
                        '<label style="display: block; color: #fff; font-weight: bold; margin-bottom: 8px;">영업시간</label>' +
                        '<input type="text" id="profile-businessHours" name="businessHours" placeholder="평일 10:00-20:00" style="width: 100%; padding: 12px 15px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 14px; transition: border-color 0.3s;" onfocus="this.style.borderColor=\'#FF1493\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.3)\'">' +
                    '</div>' +
                '</div>' +
                
                '<!-- 네이버 예약 섹션 -->' +
                '<div style="background: rgba(255, 255, 255, 0.05); border-radius: 15px; padding: 25px; margin-bottom: 20px;">' +
                    '<h4 style="color: #FF69B4; margin: 0 0 20px; font-size: 18px; display: flex; align-items: center; gap: 10px;">' +
                        '🔗 네이버 예약 URL (프로모션용)' +
                    '</h4>' +
                    
                    '<div style="margin-bottom: 15px;">' +
                        '<label for="profile-naverBookingUrl" style="display: block; color: #fff; font-weight: bold; margin-bottom: 8px;">네이버 예약 링크</label>' +
                        '<input type="url" id="profile-naverBookingUrl" name="naverBookingUrl" placeholder="https://naver.me/xxxxx" autocomplete="url" style="width: 100%; padding: 12px 15px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.3); border-radius: 10px; color: #fff; box-sizing: border-box; font-size: 14px; transition: border-color 0.3s;" onfocus="this.style.borderColor=\'#FF1493\'" onblur="this.style.borderColor=\'rgba(255,255,255,0.3)\'">' +
                    '</div>' +
                    
                    '<button type="button" onclick="autoExtractBusinessInfo()" style="background: linear-gradient(135deg, #4169E1, #1E90FF); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; transition: transform 0.2s; margin-bottom: 15px;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'translateY(0)\'" id="extractBtn">' +
                        '🔍 매장정보 자동추출' +
                    '</button>' +
                    
                    '<div id="extractionResult" style="display: none; padding: 15px; border-radius: 10px; margin-top: 15px;"></div>' +
                    
                    '<div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 10px; padding: 15px; margin-top: 15px;">' +
                        '<strong style="color: #ffc107;">💡 카카오톡 프로모션 시스템</strong><br>' +
                        '<span style="color: #fff; font-size: 14px;">네이버 예약 URL 자동추출로 다음 정보를 수집합니다:<br>' +
                        '• 매장명 → 프로모션 제목<br>' +
                        '• 주소 → 위치 안내<br>' +
                        '• 가격 → 할인 기준가<br>' +
                        '• 영업시간 → 방문 안내<br>' +
                        '• 예약링크 → "예약하기" 버튼<br>' +
                        '• 전화번호 → "문의하기" 연락처 (수동입력 필요)</span>' +
                    '</div>' +
                '</div>' +
                
                '<!-- 프로모션 설정 섹션 -->' +
                '<div style="background: rgba(255, 255, 255, 0.05); border-radius: 15px; padding: 25px; margin-bottom: 20px;">' +
                    '<h4 style="color: #FF69B4; margin: 0 0 20px; font-size: 18px;">⚙️ 프로모션 설정</h4>' +
                    
                    '<div style="display: flex; align-items: center; margin-bottom: 15px;">' +
                        '<input type="checkbox" id="profile-enableNotifications" name="enableNotifications" style="margin-right: 10px;">' +
                        '<label for="profile-enableNotifications" style="color: #fff; cursor: pointer;">카카오톡 알림 발송 허용</label>' +
                    '</div>' +
                    
                    '<div style="display: flex; align-items: center; margin-bottom: 15px;">' +
                        '<input type="checkbox" id="profile-enablePromotions" name="enablePromotions" style="margin-right: 10px;">' +
                        '<label for="profile-enablePromotions" style="color: #fff; cursor: pointer;">프로모션 관리 기능 사용</label>' +
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

// ========== 실제 네이버 정보 자동 추출 함수 (최종 완성 버전) ==========
function autoExtractBusinessInfo() {
    console.log('🤖 네이버 예약 정보 자동 추출 시작 - 프로모션용 완전한 정보 수집');
    
    var naverUrlField = document.getElementById('profile-naverBookingUrl');
    var naverUrl = naverUrlField ? naverUrlField.value.trim() : '';
    
    if (!naverUrl) {
        showExtractionResult('warning', '⚠️ 네이버 예약 URL을 먼저 입력해주세요');
        return;
    }
    
    if (!naverUrl.includes('naver')) {
        showExtractionResult('error', '⚠️ 올바른 네이버 URL을 입력해주세요 (naver.me 또는 booking.naver.com)');
        return;
    }
    
    // 로딩 표시
    var extractBtn = document.getElementById('extractBtn');
    var originalText = extractBtn ? extractBtn.textContent : '';
    if (extractBtn) {
        extractBtn.disabled = true;
        extractBtn.textContent = '🔄 추출 중...';
    }
    
    showExtractionResult('info', '🔍 Netlify Functions을 통해 네이버에서 프로모션용 매장 정보를 가져오는 중입니다...');
    
    // 실제 Netlify Functions 호출
    fetch('/.netlify/functions/extract-naver', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: naverUrl,
            fetchURL: naverUrl,
            naverUrl: naverUrl
        })
    })
    .then(function(response) {
        console.log('📡 Netlify Functions 응답 상태:', response.status);
        return response.json();
    })
    .then(function(result) {
        console.log('✅ 추출 결과:', result);
        
        if (result.success && result.data) {
            // 성공적으로 정보를 가져온 경우
            var data = result.data;
            var populatedFields = 0;
            var extractedInfo = [];
            
            // 폼 필드에 자동 입력 (정확한 ID 사용)
            if (data.name || data.storeName) {
                var nameField = document.getElementById('profile-businessName');
                if (nameField) {
                    nameField.value = data.name || data.storeName;
                    populatedFields++;
                    extractedInfo.push('🏪 매장명: ' + (data.name || data.storeName));
                    console.log('✅ 매장명 자동 입력 완료:', data.name || data.storeName);
                }
            }
            
            if (data.address) {
                var addressField = document.getElementById('profile-businessAddress');
                if (addressField) {
                    addressField.value = data.address;
                    populatedFields++;
                    extractedInfo.push('📍 주소: ' + data.address);
                    console.log('✅ 주소 자동 입력 완료:', data.address);
                }
            }
            
            if (data.phone) {
                var phoneField = document.getElementById('profile-phoneNumber');
                if (phoneField) {
                    phoneField.value = data.phone;
                    populatedFields++;
                    extractedInfo.push('📞 전화번호: ' + data.phone);
                    console.log('✅ 전화번호 자동 입력 완료:', data.phone);
                }
            }
            
            if (data.hours || data.businessHours) {
                var hoursField = document.getElementById('profile-businessHours');
                if (hoursField) {
                    hoursField.value = data.hours || data.businessHours;
                    populatedFields++;
                    extractedInfo.push('🕐 영업시간: ' + (data.hours || data.businessHours));
                    console.log('✅ 영업시간 자동 입력 완료:', data.hours || data.businessHours);
                }
            }
            
            // 추가 프로모션용 정보 수집
            var promotionInfo = [];
            if (data.category) promotionInfo.push('🏷️ 카테고리: ' + data.category);
            if (data.price) promotionInfo.push('💰 가격: ' + data.price);
            if (data.description) promotionInfo.push('📝 설명: ' + data.description);
            
            // 성공 결과 표시
            var resultMessage = 
                '✅ 매장 정보를 성공적으로 가져왔습니다!<br>' +
                '📊 <strong>' + populatedFields + '개 필드가 자동으로 채워졌습니다.</strong><br>' +
                '<br>' +
                '<div style="background: rgba(40, 167, 69, 0.1); border: 1px solid rgba(40, 167, 69, 0.3); border-radius: 8px; padding: 15px; margin: 10px 0;">' +
                    '<strong>📋 자동 입력된 정보:</strong><br>' +
                    extractedInfo.join('<br>') +
                '</div>';
            
            if (promotionInfo.length > 0) {
                resultMessage += 
                    '<div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 8px; padding: 15px; margin: 10px 0;">' +
                        '<strong>🎯 프로모션용 추가 정보:</strong><br>' +
                        promotionInfo.join('<br>') +
                    '</div>';
            }
            
            resultMessage += 
                '<div style="background: rgba(0, 123, 255, 0.1); border: 1px solid rgba(0, 123, 255, 0.3); border-radius: 8px; padding: 15px; margin: 10px 0;">' +
                    '<strong>🔗 예약 연결:</strong><br>' +
                    '네이버 예약 URL: <a href="' + naverUrl + '" target="_blank" style="color: #87CEEB;">' + naverUrl + '</a><br>' +
                    '이 링크가 카카오톡 프로모션 메시지의 "예약하기" 버튼으로 사용됩니다.' +
                '</div>';
            
            showExtractionResult('success', resultMessage);
            
        } else {
            // 추출 실패한 경우
            console.log('⚠️ 정보 추출 실패');
            var errorMsg = result.error || '정보를 추출할 수 없습니다';
            showManualInputGuidance(naverUrl, errorMsg);
        }
        
    })
    .catch(function(error) {
        console.error('❌ 정보 추출 오류:', error);
        showManualInputGuidance(naverUrl, error.message);
    })
    .finally(function() {
        // 로딩 상태 해제
        if (extractBtn) {
            extractBtn.disabled = false;
            extractBtn.textContent = originalText;
        }
    });
}

// ========== 추출 결과 표시 ==========
function showExtractionResult(type, message) {
    var resultDiv = document.getElementById('extractionResult');
    if (!resultDiv) return;
    
    var bgColor = '';
    var borderColor = '';
    var textColor = '#fff';
    
    if (type === 'success') {
        bgColor = 'rgba(40, 167, 69, 0.1)';
        borderColor = 'rgba(40, 167, 69, 0.3)';
    } else if (type === 'warning' || type === 'info') {
        bgColor = 'rgba(255, 193, 7, 0.1)';
        borderColor = 'rgba(255, 193, 7, 0.3)';
    } else if (type === 'error') {
        bgColor = 'rgba(220, 53, 69, 0.1)';
        borderColor = 'rgba(220, 53, 69, 0.3)';
    }
    
    resultDiv.style.background = bgColor;
    resultDiv.style.border = '1px solid ' + borderColor;
    resultDiv.style.color = textColor;
    resultDiv.innerHTML = message;
    resultDiv.style.display = 'block';
}

// ========== 수동 입력 안내 ==========
function showManualInputGuidance(naverUrl, errorMessage) {
    var guidanceMessage = 
        '❌ 자동 추출에 실패했습니다.<br>' +
        '<br>' +
        '<div style="background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 8px; padding: 15px; margin: 10px 0;">' +
            '<strong>🔗 네이버 URL:</strong> <a href="' + naverUrl + '" target="_blank" style="color: #87CEEB;">' + naverUrl + '</a><br>' +
            '<strong>⚠️ 오류:</strong> ' + errorMessage +
        '</div>' +
        '<div style="background: rgba(0, 123, 255, 0.1); border: 1px solid rgba(0, 123, 255, 0.3); border-radius: 8px; padding: 15px; margin: 10px 0;">' +
            '<strong>💡 해결 방법:</strong><br>' +
            '1. 위 네이버 링크를 클릭하여 새 탭에서 열어주세요<br>' +
            '2. 매장 정보를 확인하고 아래 필드에 직접 입력해주세요<br>' +
            '3. 네이버에서 자동 추출을 차단할 수 있습니다<br>' +
            '4. 수동 입력 후에도 프로모션 기능은 정상 작동합니다' +
        '</div>' +
        '<button onclick="window.open(\'' + naverUrl + '\', \'_blank\')" style="background: #4169E1; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; margin-top: 10px;">' +
        '🔗 네이버 페이지 열기' +
        '</button>';
    
    showExtractionResult('error', guidanceMessage);
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
            var hoursField = document.getElementById('profile-businessHours');
            var naverField = document.getElementById('profile-naverBookingUrl');
            var notificationField = document.getElementById('profile-enableNotifications');
            var promotionField = document.getElementById('profile-enablePromotions');
            
            if (nameField && profileData.designerName) nameField.value = profileData.designerName;
            if (businessField && profileData.businessName) businessField.value = profileData.businessName;
            if (phoneField && profileData.phoneNumber) phoneField.value = profileData.phoneNumber;
            if (addressField && profileData.businessAddress) addressField.value = profileData.businessAddress;
            if (hoursField && profileData.businessHours) hoursField.value = profileData.businessHours;
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
    console.log('💾 프로필 저장 시작 - 프로모션용 완전한 정보 저장');
    
    var designerName = document.getElementById('profile-designerName').value.trim();
    var businessName = document.getElementById('profile-businessName').value.trim();
    var phoneNumber = document.getElementById('profile-phoneNumber').value.trim();
    var businessAddress = document.getElementById('profile-businessAddress').value.trim();
    var businessHours = document.getElementById('profile-businessHours').value.trim();
    var naverUrl = document.getElementById('profile-naverBookingUrl').value.trim();
    var enableNotifications = document.getElementById('profile-enableNotifications').checked;
    var enablePromotions = document.getElementById('profile-enablePromotions').checked;
    
    // 기본 필수 항목 검증
    if (!designerName) {
        alert('⚠️ 디자이너 이름은 필수 입력 항목입니다');
        document.getElementById('profile-designerName').focus();
        return;
    }
    
    // 프로모션 기능 사용 시 필수 항목 검증
    if (enablePromotions) {
        var missingFields = [];
        var focusField = null;
        
        if (!businessName) {
            missingFields.push('• 매장명 (프로모션 제목용)');
            if (!focusField) focusField = 'profile-businessName';
        }
        if (!phoneNumber) {
            missingFields.push('• 전화번호 (카카오톡 메시지 문의처용)');
            if (!focusField) focusField = 'profile-phoneNumber';
        }
        if (!naverUrl) {
            missingFields.push('• 네이버 예약 URL (예약하기 버튼용)');
            if (!focusField) focusField = 'profile-naverBookingUrl';
        }
        
        if (missingFields.length > 0) {
            alert('🎯 프로모션 기능을 사용하려면 다음 항목들이 필수입니다:\n\n' + 
                  missingFields.join('\n') + 
                  '\n\n💡 참고:\n' +
                  '- 전화번호는 고객이 카카오톡으로 문의할 때 연락처로 표시됩니다\n' +
                  '- 네이버에서 자동 추출되지 않은 경우 직접 입력해주세요');
            
            if (focusField) {
                document.getElementById(focusField).focus();
            }
            return;
        }
    } else {
        // 프로모션 기능을 사용하지 않는 경우 안내
        if (businessName || phoneNumber || naverUrl) {
            var shouldEnable = confirm('💡 매장 정보가 입력되어 있습니다.\n\n프로모션 관리 기능을 활성화하시겠습니까?\n\n✅ 활성화하면:\n- 카카오톡으로 고객에게 할인 메시지 발송 가능\n- 네이버 예약 연결로 즉시 예약 유도 가능\n- 고객 관리 및 재방문 유도 가능');
            
            if (shouldEnable) {
                document.getElementById('profile-enablePromotions').checked = true;
                enablePromotions = true;
                
                // 활성화 후 다시 필수 항목 검증
                var missingFields = [];
                if (!businessName) missingFields.push('매장명');
                if (!phoneNumber) missingFields.push('전화번호');
                if (!naverUrl) missingFields.push('네이버 예약 URL');
                
                if (missingFields.length > 0) {
                    alert('⚠️ 프로모션 기능 활성화를 위해 ' + missingFields.join(', ') + '을(를) 입력해주세요.');
                    return;
                }
            }
        }
    }
    
    var profileData = {
        designerName: designerName,
        businessName: businessName,
        phoneNumber: phoneNumber,
        businessAddress: businessAddress,
        businessHours: businessHours,
        naverBookingUrl: naverUrl,
        enableNotifications: enableNotifications,
        enablePromotions: enablePromotions,
        updatedAt: new Date().toISOString(),
        
        // 프로모션 관리용 메타데이터
        profileComplete: !!(businessName && phoneNumber && businessAddress && naverUrl),
        canUsePromotions: enablePromotions && !!(businessName && naverUrl)
    };
    
    try {
        localStorage.setItem('hairgator_profile', JSON.stringify(profileData));
        
        // Firebase에 저장 (currentDesigner 있는 경우)
        if (typeof currentDesigner !== 'undefined' && currentDesigner && typeof db !== 'undefined') {
            saveProfileToFirebase(profileData);
        }
        
        var completionMsg = '✅ 프로필이 성공적으로 저장되었습니다!';
        
        if (profileData.canUsePromotions) {
            completionMsg += '\n\n🎯 프로모션 관리 기능을 사용할 수 있습니다!';
        } else if (!profileData.profileComplete) {
            completionMsg += '\n\n⚠️ 프로모션 기능을 완전히 사용하려면 매장명, 전화번호, 주소, 네이버 예약 URL을 모두 입력해주세요.';
        }
        
        alert(completionMsg);
        closeProfileModal();
        
        // 프로모션 권한 업데이트
        if (typeof updatePromotionMenuUI === 'function') {
            updatePromotionMenuUI();
        }
        if (typeof window.onProfileSaved === 'function') {
            window.onProfileSaved();
        }
        
        console.log('✅ 프로필 저장 완료 (프로모션 지원):', profileData);
        
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
            businessHours: profileData.businessHours,
            naverBookingUrl: profileData.naverBookingUrl,
            enableNotifications: profileData.enableNotifications,
            enablePromotions: profileData.enablePromotions,
            profileComplete: profileData.profileComplete,
            canUsePromotions: profileData.canUsePromotions,
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

// ========== 프로모션 사용 가능 여부 확인 ==========
function canUsePromotions() {
    var profile = getProfileData();
    return profile.canUsePromotions || false;
}

// ========== 전역 함수 등록 (최종 완성) ==========
window.showDesignerProfile = showDesignerProfile;  // ← 핵심! 이 줄이 있어야 함
window.showMyProfile = showDesignerProfile; // 호환성을 위한 별칭
window.closeProfileModal = closeProfileModal;
window.autoExtractBusinessInfo = autoExtractBusinessInfo;
window.saveProfile = saveProfile;
window.getProfileData = getProfileData;
window.canUsePromotions = canUsePromotions;

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 디자이너 프로필 시스템 초기화 완료');
});

console.log('✅ HAIRGATOR 디자이너 프로필 시스템 로드 완료 - 프로모션 연동 최종 버전');
