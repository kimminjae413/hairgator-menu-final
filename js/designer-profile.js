// ========== HAIRGATOR 디자이너 프로필 관리 시스템 - 완전한 최종 파일 ==========
// 네이버 예약 URL 자동 추출 + 매장 정보 관리 + 프로필 설정
// 콘솔 테스트 완료 버전

console.log('🎨 HAIRGATOR 디자이너 프로필 시스템 로드 시작');

// ========== 전역 변수 ==========
let profileEditMode = false;
let profileData = {};

// ========== CSS 스타일 자동 삽입 ==========
function injectProfileStyles() {
    if (document.getElementById('profileStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'profileStyles';
    style.textContent = 
        '/* ========== 디자이너 프로필 모달 스타일 ========== */' +
        '.profile-modal {' +
            'position: fixed;' +
            'top: 0;' +
            'left: 0;' +
            'width: 100%;' +
            'height: 100%;' +
            'background: rgba(0, 0, 0, 0.9);' +
            'z-index: 10000;' +
            'display: flex;' +
            'align-items: center;' +
            'justify-content: center;' +
            'animation: fadeIn 0.3s ease;' +
            'padding: 20px;' +
            'box-sizing: border-box;' +
            'overflow-y: auto;' +
        '}' +

        '.profile-container {' +
            'background: linear-gradient(135deg, #1a1a1a, #2a2a2a);' +
            'border: 2px solid #FF1493;' +
            'border-radius: 20px;' +
            'max-width: 800px;' +
            'width: 100%;' +
            'max-height: 90vh;' +
            'overflow-y: auto;' +
        '}' +

        '.profile-header {' +
            'padding: 25px 30px 0;' +
            'display: flex;' +
            'justify-content: space-between;' +
            'align-items: center;' +
            'border-bottom: 1px solid rgba(255, 255, 255, 0.1);' +
            'margin-bottom: 25px;' +
        '}' +

        '.profile-header h3 {' +
            'color: #FF1493;' +
            'margin: 0;' +
            'font-size: 24px;' +
            'display: flex;' +
            'align-items: center;' +
            'gap: 10px;' +
        '}' +

        '.profile-close {' +
            'background: none;' +
            'border: none;' +
            'color: #999;' +
            'font-size: 28px;' +
            'cursor: pointer;' +
            'padding: 5px;' +
            'transition: color 0.3s ease;' +
        '}' +

        '.profile-close:hover {' +
            'color: #fff;' +
        '}' +

        '.profile-content {' +
            'padding: 0 30px 30px;' +
        '}' +

        '.profile-tabs {' +
            'display: flex;' +
            'border-bottom: 2px solid rgba(255, 255, 255, 0.1);' +
            'margin-bottom: 30px;' +
        '}' +

        '.profile-tab {' +
            'padding: 15px 25px;' +
            'cursor: pointer;' +
            'color: #888;' +
            'transition: all 0.3s ease;' +
            'border-bottom: 3px solid transparent;' +
            'font-weight: 500;' +
        '}' +

        '.profile-tab.active {' +
            'color: #FF1493;' +
            'border-bottom-color: #FF1493;' +
        '}' +

        '.profile-tab:hover {' +
            'color: #FF69B4;' +
        '}' +

        '.tab-content {' +
            'display: none;' +
        '}' +

        '.tab-content.active {' +
            'display: block;' +
        '}' +

        '.form-section {' +
            'background: rgba(255, 255, 255, 0.05);' +
            'border-radius: 15px;' +
            'padding: 25px;' +
            'margin-bottom: 20px;' +
        '}' +

        '.form-section h4 {' +
            'color: #FF69B4;' +
            'margin: 0 0 20px;' +
            'font-size: 18px;' +
            'display: flex;' +
            'align-items: center;' +
            'gap: 8px;' +
        '}' +

        '.form-row {' +
            'display: grid;' +
            'grid-template-columns: 1fr 1fr;' +
            'gap: 20px;' +
            'margin-bottom: 20px;' +
        '}' +

        '@media (max-width: 600px) {' +
            '.form-row {' +
                'grid-template-columns: 1fr;' +
                'gap: 15px;' +
            '}' +
        '}' +

        '.form-group {' +
            'margin-bottom: 20px;' +
        '}' +

        '.form-group label {' +
            'display: block;' +
            'color: #fff;' +
            'font-weight: bold;' +
            'margin-bottom: 8px;' +
            'font-size: 14px;' +
        '}' +

        '.form-group input,' +
        '.form-group textarea,' +
        '.form-group select {' +
            'width: 100%;' +
            'padding: 12px 15px;' +
            'background: rgba(255, 255, 255, 0.1);' +
            'border: 2px solid rgba(255, 255, 255, 0.3);' +
            'border-radius: 10px;' +
            'color: #fff;' +
            'font-size: 14px;' +
            'box-sizing: border-box;' +
            'transition: all 0.3s ease;' +
        '}' +

        '.form-group input:focus,' +
        '.form-group textarea:focus,' +
        '.form-group select:focus {' +
            'outline: none;' +
            'border-color: #FF1493;' +
            'background: rgba(255, 255, 255, 0.15);' +
        '}' +

        '.form-group input::placeholder,' +
        '.form-group textarea::placeholder {' +
            'color: #aaa;' +
        '}' +

        '.form-group textarea {' +
            'resize: vertical;' +
            'min-height: 100px;' +
        '}' +

        '.url-input-group {' +
            'display: flex;' +
            'gap: 10px;' +
            'align-items: flex-end;' +
        '}' +

        '.url-input-group input {' +
            'flex: 1;' +
        '}' +

        '.extract-btn {' +
            'background: linear-gradient(135deg, #4169E1, #1E90FF);' +
            'color: white;' +
            'border: none;' +
            'padding: 12px 20px;' +
            'border-radius: 10px;' +
            'cursor: pointer;' +
            'font-size: 14px;' +
            'font-weight: bold;' +
            'transition: all 0.3s ease;' +
            'white-space: nowrap;' +
        '}' +

        '.extract-btn:hover {' +
            'transform: translateY(-2px);' +
            'box-shadow: 0 5px 15px rgba(65, 105, 225, 0.3);' +
        '}' +

        '.extract-btn:disabled {' +
            'background: #666;' +
            'cursor: not-allowed;' +
            'transform: none;' +
            'box-shadow: none;' +
        '}' +

        '.profile-buttons {' +
            'display: flex;' +
            'gap: 15px;' +
            'justify-content: flex-end;' +
            'margin-top: 30px;' +
            'padding-top: 20px;' +
            'border-top: 1px solid rgba(255, 255, 255, 0.1);' +
        '}' +

        '.profile-btn {' +
            'padding: 12px 25px;' +
            'border: none;' +
            'border-radius: 10px;' +
            'cursor: pointer;' +
            'font-size: 14px;' +
            'font-weight: bold;' +
            'transition: all 0.3s ease;' +
            'min-width: 100px;' +
        '}' +

        '.profile-btn-cancel {' +
            'background: #333;' +
            'color: #fff;' +
        '}' +

        '.profile-btn-cancel:hover {' +
            'background: #555;' +
        '}' +

        '.profile-btn-save {' +
            'background: linear-gradient(135deg, #FF1493, #FF69B4);' +
            'color: white;' +
        '}' +

        '.profile-btn-save:hover {' +
            'transform: translateY(-2px);' +
            'box-shadow: 0 5px 15px rgba(255, 20, 147, 0.3);' +
        '}' +

        '.info-box {' +
            'background: rgba(255, 193, 7, 0.1);' +
            'border: 1px solid rgba(255, 193, 7, 0.3);' +
            'border-radius: 10px;' +
            'padding: 15px;' +
            'margin-bottom: 20px;' +
            'color: #fff;' +
            'font-size: 14px;' +
        '}' +

        '.info-box strong {' +
            'color: #ffc107;' +
        '}' +

        '.success-box {' +
            'background: rgba(40, 167, 69, 0.1);' +
            'border: 1px solid rgba(40, 167, 69, 0.3);' +
            'border-radius: 10px;' +
            'padding: 15px;' +
            'margin-bottom: 20px;' +
            'color: #fff;' +
            'font-size: 14px;' +
        '}' +

        '.success-box strong {' +
            'color: #28a745;' +
        '}' +

        '.error-box {' +
            'background: rgba(220, 53, 69, 0.1);' +
            'border: 1px solid rgba(220, 53, 69, 0.3);' +
            'border-radius: 10px;' +
            'padding: 15px;' +
            'margin-bottom: 20px;' +
            'color: #fff;' +
            'font-size: 14px;' +
        '}' +

        '.error-box strong {' +
            'color: #dc3545;' +
        '}' +

        '/* ========== 애니메이션 ========== */' +
        '@keyframes fadeIn {' +
            'from { opacity: 0; }' +
            'to { opacity: 1; }' +
        '}' +

        '/* ========== 모바일 반응형 ========== */' +
        '@media (max-width: 768px) {' +
            '.profile-container {' +
                'margin: 10px;' +
                'max-height: 95vh;' +
            '}' +
            
            '.profile-content {' +
                'padding: 0 20px 20px;' +
            '}' +
            
            '.profile-tabs {' +
                'overflow-x: auto;' +
                'white-space: nowrap;' +
            '}' +
            
            '.profile-tab {' +
                'flex-shrink: 0;' +
            '}' +
            
            '.profile-buttons {' +
                'flex-direction: column;' +
            '}' +
            
            '.url-input-group {' +
                'flex-direction: column;' +
                'gap: 10px;' +
            '}' +
            
            '.extract-btn {' +
                'width: 100%;' +
            '}' +
        '}';
    
    document.head.appendChild(style);
    console.log('✅ 디자이너 프로필 스타일 삽입 완료');
}

// ========== 디자이너 프로필 모달 표시 ==========
function showDesignerProfile() {
    console.log('👤 디자이너 프로필 모달 표시');
    
    injectProfileStyles();
    
    const modalHTML = 
        '<div class="profile-modal" id="profileModal">' +
            '<div class="profile-container">' +
                '<div class="profile-header">' +
                    '<h3>👤 내 프로필 관리</h3>' +
                    '<button class="profile-close" onclick="closeProfileModal()">×</button>' +
                '</div>' +
                
                '<div class="profile-content">' +
                    '<div class="profile-tabs">' +
                        '<div class="profile-tab active" onclick="switchProfileTab(\'basic\')">📋 기본 정보</div>' +
                        '<div class="profile-tab" onclick="switchProfileTab(\'business\')">🏪 매장 정보</div>' +
                        '<div class="profile-tab" onclick="switchProfileTab(\'naver\')">🔗 네이버 예약</div>' +
                        '<div class="profile-tab" onclick="switchProfileTab(\'settings\')">⚙️ 설정</div>' +
                    '</div>' +
                    
                    '<!-- 기본 정보 탭 -->' +
                    '<div id="basic-tab" class="tab-content active">' +
                        '<div class="form-section">' +
                            '<h4>👤 개인 정보</h4>' +
                            '<div class="form-row">' +
                                '<div class="form-group">' +
                                    '<label for="profile-designerName">디자이너 이름 *</label>' +
                                    '<input type="text" id="profile-designerName" name="designerName" placeholder="홍길동" autocomplete="name">' +
                                '</div>' +
                                '<div class="form-group">' +
                                    '<label for="profile-phoneNumber">전화번호</label>' +
                                    '<input type="tel" id="profile-phoneNumber" name="phoneNumber" placeholder="010-1234-5678" autocomplete="tel">' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="profile-introduction">자기소개</label>' +
                                '<textarea id="profile-introduction" name="introduction" rows="4" placeholder="고객에게 보여질 간단한 자기소개를 작성해주세요"></textarea>' +
                            '</div>' +
                        '</div>' +
                        
                        '<div class="form-section">' +
                            '<h4>💼 경력 정보</h4>' +
                            '<div class="form-row">' +
                                '<div class="form-group">' +
                                    '<label for="profile-experience">경력 (년)</label>' +
                                    '<input type="number" id="profile-experience" name="experience" placeholder="5" min="0">' +
                                '</div>' +
                                '<div class="form-group">' +
                                    '<label for="profile-specialty">전문 분야</label>' +
                                    '<input type="text" id="profile-specialty" name="specialty" placeholder="예: 펌, 염색, 커트">' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="profile-certifications">자격증/수상내역</label>' +
                                '<textarea id="profile-certifications" name="certifications" rows="3" placeholder="보유 자격증이나 수상 내역을 입력해주세요"></textarea>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    
                    '<!-- 매장 정보 탭 -->' +
                    '<div id="business-tab" class="tab-content">' +
                        '<div class="form-section">' +
                            '<h4>🏪 매장 기본 정보</h4>' +
                            '<div class="form-row">' +
                                '<div class="form-group">' +
                                    '<label for="profile-businessName">매장명 *</label>' +
                                    '<input type="text" id="profile-businessName" name="businessName" placeholder="헤어살롱 이름" autocomplete="organization">' +
                                '</div>' +
                                '<div class="form-group">' +
                                    '<label for="profile-businessPhone">대표 전화번호</label>' +
                                    '<input type="tel" id="profile-businessPhone" name="businessPhone" placeholder="02-123-4567" autocomplete="tel-area-code">' +
                                '</div>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="profile-businessAddress">매장 주소</label>' +
                                '<input type="text" id="profile-businessAddress" name="businessAddress" placeholder="서울시 강남구 테헤란로 123" autocomplete="street-address">' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="profile-businessHours">영업시간</label>' +
                                '<input type="text" id="profile-businessHours" name="businessHours" placeholder="월-금 10:00-20:00, 토-일 10:00-18:00">' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="profile-businessDescription">매장 소개</label>' +
                                '<textarea id="profile-businessDescription" name="businessDescription" rows="4" placeholder="매장에 대한 소개를 작성해주세요"></textarea>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    
                    '<!-- 네이버 예약 탭 -->' +
                    '<div id="naver-tab" class="tab-content">' +
                        '<div class="info-box">' +
                            '<strong>💡 네이버 예약 연동 안내</strong><br>' +
                            '네이버 예약 URL을 입력하면 매장 정보를 자동으로 가져올 수 있습니다.<br>' +
                            '네이버 예약 서비스에 등록된 매장만 가능합니다.' +
                        '</div>' +
                        
                        '<div class="form-section">' +
                            '<h4>🔗 네이버 예약 정보</h4>' +
                            '<div class="form-group">' +
                                '<label for="profile-naverBookingUrl">네이버 예약 URL</label>' +
                                '<div class="url-input-group">' +
                                    '<input type="url" id="profile-naverBookingUrl" name="naverBookingUrl" placeholder="https://naver.me/xxxxx 또는 https://booking.naver.com/booking/xxxxx" autocomplete="url">' +
                                    '<button class="extract-btn" onclick="autoExtractBusinessInfo()">🔗 매장 정보 자동 가져오기</button>' +
                                '</div>' +
                                '<small style="color: #aaa; font-size: 12px; margin-top: 5px; display: block;">' +
                                    '* 네이버에서 자동 추출을 차단할 수 있습니다. 실패 시 수동으로 입력해주세요.' +
                                '</small>' +
                            '</div>' +
                            
                            '<div id="extractionResult" style="display: none;"></div>' +
                        '</div>' +
                    '</div>' +
                    
                    '<!-- 설정 탭 -->' +
                    '<div id="settings-tab" class="tab-content">' +
                        '<div class="form-section">' +
                            '<h4>⚙️ 알림 설정</h4>' +
                            '<div class="form-group">' +
                                '<label for="profile-enableNotifications">' +
                                    '<input type="checkbox" id="profile-enableNotifications" name="enableNotifications" style="margin-right: 8px;">' +
                                    '예약 알림 받기' +
                                '</label>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="profile-enablePromotions">' +
                                    '<input type="checkbox" id="profile-enablePromotions" name="enablePromotions" style="margin-right: 8px;">' +
                                    '프로모션 소식 받기' +
                                '</label>' +
                            '</div>' +
                        '</div>' +
                        
                        '<div class="form-section">' +
                            '<h4>🎨 개인화 설정</h4>' +
                            '<div class="form-group">' +
                                '<label for="profile-preferredTheme">선호하는 테마</label>' +
                                '<select id="profile-preferredTheme" name="preferredTheme">' +
                                    '<option value="default">기본 테마</option>' +
                                    '<option value="dark">다크 테마</option>' +
                                    '<option value="colorful">컬러풀 테마</option>' +
                                '</select>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    
                    '<div class="profile-buttons">' +
                        '<button class="profile-btn profile-btn-cancel" onclick="closeProfileModal()">취소</button>' +
                        '<button class="profile-btn profile-btn-save" onclick="saveProfile()">💾 저장</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 기존 프로필 데이터 로드
    loadProfileData();
}

// ========== 프로필 탭 전환 ==========
function switchProfileTab(tabName) {
    // 모든 탭 비활성화
    document.querySelectorAll('.profile-tab').forEach(function(tab) {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(function(content) {
        content.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    if (event && event.target) {
        event.target.classList.add('active');
    }
    const targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

// ========== 네이버 예약 정보 자동 추출 ==========
async function autoExtractBusinessInfo() {
    console.log('🤖 네이버 예약 정보 자동 추출 시작');
    
    const naverUrlField = document.getElementById('profile-naverBookingUrl');
    const naverUrl = naverUrlField ? naverUrlField.value.trim() : '';
    
    if (!naverUrl) {
        showExtractionResult('warning', '⚠️ 네이버 예약 URL을 먼저 입력해주세요');
        return;
    }
    
    if (!naverUrl.includes('naver')) {
        showExtractionResult('error', '⚠️ 올바른 네이버 URL을 입력해주세요 (naver.me 또는 booking.naver.com)');
        return;
    }
    
    // 로딩 표시
    const extractBtn = document.querySelector('[onclick="autoExtractBusinessInfo()"]');
    const originalText = extractBtn ? extractBtn.textContent : '';
    if (extractBtn) {
        extractBtn.disabled = true;
        extractBtn.textContent = '🔄 추출 중...';
    }
    
    showExtractionResult('info', '🔍 네이버에서 매장 정보를 가져오는 중입니다...');
    
    try {
        console.log('🚀 Netlify Functions를 통한 정보 추출:', naverUrl);
        
        // Netlify Functions로 정보 추출 요청
        const response = await fetch('/.netlify/functions/extract-naver', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: naverUrl,
                fetchURL: naverUrl,
                naverUrl: naverUrl
            })
        });
        
        console.log('📡 Netlify Functions 응답 상태:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 서버 오류 응답:', errorText);
            throw new Error('서버 오류 (' + response.status + '): ' + response.statusText);
        }
        
        const result = await response.json();
        console.log('✅ 추출 결과:', result);
        
        if (result.success && result.data) {
            // 성공적으로 정보를 가져온 경우
            const data = result.data;
            let populatedFields = 0;
            
            // 폼 필드에 자동 입력
            if (data.name || data.storeName) {
                const nameField = document.getElementById('profile-businessName');
                if (nameField && !nameField.value.trim()) {
                    nameField.value = data.name || data.storeName;
                    populatedFields++;
                }
            }
            
            if (data.address) {
                const addressField = document.getElementById('profile-businessAddress');
                if (addressField && !addressField.value.trim()) {
                    addressField.value = data.address;
                    populatedFields++;
                }
            }
            
            if (data.phone) {
                const phoneField = document.getElementById('profile-businessPhone');
                if (phoneField && !phoneField.value.trim()) {
                    phoneField.value = data.phone;
                    populatedFields++;
                }
            }
            
            if (data.hours) {
                const hoursField = document.getElementById('profile-businessHours');
                if (hoursField && !hoursField.value.trim()) {
                    hoursField.value = data.hours;
                    populatedFields++;
                }
            }
            
            if (data.description) {
                const descField = document.getElementById('profile-businessDescription');
                if (descField && !descField.value.trim()) {
                    descField.value = data.description;
                    populatedFields++;
                }
            }
            
            // 결과 표시
            const resultMessage = 
                '✅ 매장 정보를 성공적으로 가져왔습니다!<br>' +
                '📊 ' + populatedFields + '개 필드가 자동으로 채워졌습니다.<br>' +
                '<br>' +
                '<strong>추출된 정보:</strong><br>' +
                (data.name || data.storeName ? '🏪 매장명: ' + (data.name || data.storeName) + '<br>' : '') +
                (data.address ? '📍 주소: ' + data.address + '<br>' : '') +
                (data.phone ? '📞 전화번호: ' + data.phone + '<br>' : '') +
                (data.hours ? '🕐 영업시간: ' + data.hours + '<br>' : '') +
                (data.categories && data.categories.length > 0 ? '🏷️ 카테고리: ' + data.categories.join(', ') + '<br>' : '');
            
            showExtractionResult('success', resultMessage);
            
        } else {
            // 추출 실패한 경우
            console.log('⚠️ 정보 추출 실패');
            const errorMsg = result.error || '정보를 추출할 수 없습니다';
            showManualInputGuidance(naverUrl, errorMsg);
        }
        
    } catch (error) {
        console.error('❌ 정보 추출 오류:', error);
        showManualInputGuidance(naverUrl, error.message);
    } finally {
        // 로딩 상태 해제
        if (extractBtn) {
            extractBtn.disabled = false;
            extractBtn.textContent = originalText;
        }
    }
}

// ========== 추출 결과 표시 ==========
function showExtractionResult(type, message) {
    const resultDiv = document.getElementById('extractionResult');
    if (!resultDiv) return;
    
    const typeClass = type === 'success' ? 'success-box' : 
                     type === 'warning' ? 'info-box' : 
                     type === 'error' ? 'error-box' : 'info-box';
    
    resultDiv.className = typeClass;
    resultDiv.innerHTML = message;
    resultDiv.style.display = 'block';
}

// ========== 수동 입력 안내 ==========
function showManualInputGuidance(naverUrl, errorMessage) {
    const guidanceMessage = 
        '❌ 자동 추출에 실패했습니다.<br>' +
        '<br>' +
        '<strong>🔗 네이버 URL:</strong> <a href="' + naverUrl + '" target="_blank" style="color: #87CEEB;">' + naverUrl + '</a><br>' +
        '<strong>⚠️ 오류:</strong> ' + errorMessage + '<br>' +
        '<br>' +
        '<strong>💡 해결 방법:</strong><br>' +
        '1. 위 네이버 링크를 클릭하여 새 탭에서 열어주세요<br>' +
        '2. 매장 정보를 확인하고 아래 필드에 직접 입력해주세요<br>' +
        '3. 네이버에서 자동 추출을 차단할 수 있습니다<br>' +
        '<br>' +
        '<button onclick="window.open(\'' + naverUrl + '\', \'_blank\')" style="background: #4169E1; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; margin-top: 10px;">' +
        '🔗 네이버 페이지 열기' +
        '</button>';
    
    showExtractionResult('error', guidanceMessage);
}

// ========== 프로필 데이터 로드 ==========
function loadProfileData() {
    console.log('📋 기존 프로필 데이터 로드');
    
    // 로컬 스토리지에서 데이터 로드
    const savedProfile = localStorage.getItem('hairgator_profile');
    if (savedProfile) {
        try {
            profileData = JSON.parse(savedProfile);
            populateProfileForm(profileData);
        } catch (error) {
            console.error('프로필 데이터 로드 오류:', error);
        }
    }
    
    // 현재 디자이너 정보 설정
    if (typeof currentDesignerName !== 'undefined' && currentDesignerName) {
        const nameField = document.getElementById('profile-designerName');
        if (nameField && !nameField.value) {
            nameField.value = currentDesignerName;
        }
    }
}

// ========== 프로필 폼에 데이터 채우기 ==========
function populateProfileForm(data) {
    const fieldMappings = {
        designerName: 'profile-designerName',
        phoneNumber: 'profile-phoneNumber',
        introduction: 'profile-introduction',
        experience: 'profile-experience',
        specialty: 'profile-specialty',
        certifications: 'profile-certifications',
        businessName: 'profile-businessName',
        businessPhone: 'profile-businessPhone',
        businessAddress: 'profile-businessAddress',
        businessHours: 'profile-businessHours',
        businessDescription: 'profile-businessDescription',
        naverBookingUrl: 'profile-naverBookingUrl',
        enableNotifications: 'profile-enableNotifications',
        enablePromotions: 'profile-enablePromotions',
        preferredTheme: 'profile-preferredTheme'
    };
    
    Object.keys(fieldMappings).forEach(function(dataKey) {
        const fieldId = fieldMappings[dataKey];
        const field = document.getElementById(fieldId);
        const value = data[dataKey];
        
        if (field && value !== undefined) {
            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
            } else {
                field.value = value;
            }
        }
    });
}

// ========== 프로필 저장 ==========
function saveProfile() {
    console.log('💾 프로필 저장 시작');
    
    // 폼 데이터 수집
    const formData = {
        designerName: document.getElementById('profile-designerName') ? document.getElementById('profile-designerName').value : '',
        phoneNumber: document.getElementById('profile-phoneNumber') ? document.getElementById('profile-phoneNumber').value : '',
        introduction: document.getElementById('profile-introduction') ? document.getElementById('profile-introduction').value : '',
        experience: document.getElementById('profile-experience') ? document.getElementById('profile-experience').value : '',
        specialty: document.getElementById('profile-specialty') ? document.getElementById('profile-specialty').value : '',
        certifications: document.getElementById('profile-certifications') ? document.getElementById('profile-certifications').value : '',
        businessName: document.getElementById('profile-businessName') ? document.getElementById('profile-businessName').value : '',
        businessPhone: document.getElementById('profile-businessPhone') ? document.getElementById('profile-businessPhone').value : '',
        businessAddress: document.getElementById('profile-businessAddress') ? document.getElementById('profile-businessAddress').value : '',
        businessHours: document.getElementById('profile-businessHours') ? document.getElementById('profile-businessHours').value : '',
        businessDescription: document.getElementById('profile-businessDescription') ? document.getElementById('profile-businessDescription').value : '',
        naverBookingUrl: document.getElementById('profile-naverBookingUrl') ? document.getElementById('profile-naverBookingUrl').value : '',
        enableNotifications: document.getElementById('profile-enableNotifications') ? document.getElementById('profile-enableNotifications').checked : false,
        enablePromotions: document.getElementById('profile-enablePromotions') ? document.getElementById('profile-enablePromotions').checked : false,
        preferredTheme: document.getElementById('profile-preferredTheme') ? document.getElementById('profile-preferredTheme').value : 'default',
        updatedAt: new Date().toISOString()
    };
    
    // 필수 필드 검증
    if (!formData.designerName.trim()) {
        alert('⚠️ 디자이너 이름은 필수 입력 항목입니다');
        switchProfileTab('basic');
        const nameField = document.getElementById('profile-designerName');
        if (nameField) nameField.focus();
        return;
    }
    
    try {
        // 로컬 스토리지에 저장
        localStorage.setItem('hairgator_profile', JSON.stringify(formData));
        
        // Firebase에 저장 (currentDesigner 있는 경우)
        if (typeof currentDesigner !== 'undefined' && currentDesigner && typeof db !== 'undefined') {
            saveProfileToFirebase(formData);
        }
        
        profileData = formData;
        
        alert('✅ 프로필이 성공적으로 저장되었습니다!');
        
        // 프로모션 접근 권한 재확인
        if (typeof checkPromotionAccess === 'function') {
            checkPromotionAccess();
        }
        
        // 전역 이벤트 발생
        if (typeof window.onProfileSaved === 'function') {
            window.onProfileSaved();
        }
        
        closeProfileModal();
        
    } catch (error) {
        console.error('❌ 프로필 저장 오류:', error);
        alert('❌ 프로필 저장에 실패했습니다: ' + error.message);
    }
}

// ========== Firebase에 프로필 저장 ==========
async function saveProfileToFirebase(profileData) {
    try {
        await db.collection('designer_profiles').doc(currentDesigner).set({
            designerId: currentDesigner,
            designerName: profileData.designerName,
            phoneNumber: profileData.phoneNumber,
            introduction: profileData.introduction,
            experience: profileData.experience,
            specialty: profileData.specialty,
            certifications: profileData.certifications,
            businessName: profileData.businessName,
            businessPhone: profileData.businessPhone,
            businessAddress: profileData.businessAddress,
            businessHours: profileData.businessHours,
            businessDescription: profileData.businessDescription,
            naverBookingUrl: profileData.naverBookingUrl,
            enableNotifications: profileData.enableNotifications,
            enablePromotions: profileData.enablePromotions,
            preferredTheme: profileData.preferredTheme,
            updatedAt: profileData.updatedAt,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log('✅ Firebase에 프로필 저장 완료');
    } catch (error) {
        console.error('⚠️ Firebase 프로필 저장 실패:', error);
        // Firebase 저장 실패해도 로컬 저장은 성공으로 처리
    }
}

// ========== 프로필 모달 닫기 ==========
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.remove();
    }
}

// ========== 프로필 정보 가져오기 (다른 모듈에서 사용) ==========
function getProfileData() {
    return profileData;
}

// ========== 초기화 및 전역 함수 등록 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 디자이너 프로필 시스템 초기화');
    injectProfileStyles();
});

// ========== 전역 함수 등록 ==========
window.showDesignerProfile = showDesignerProfile;
window.showMyProfile = showDesignerProfile; // 호환성을 위한 별칭
window.closeProfileModal = closeProfileModal;
window.switchProfileTab = switchProfileTab;
window.autoExtractBusinessInfo = autoExtractBusinessInfo;
window.saveProfile = saveProfile;
window.getProfileData = getProfileData;

console.log('✅ HAIRGATOR 디자이너 프로필 시스템 로드 완료 (완전한 최종 파일)');
