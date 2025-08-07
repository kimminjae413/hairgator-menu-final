// ========== HAIRGATOR 네이버 예약 추출 시스템 (현재 비활성화) ========== 
console.log('🔗 네이버 예약 추출 시스템 (현재 비활성화 - 나중에 활성화 가능)');

// ========== 설정 ========== 
const EXTRACTION_ENABLED = false; // 🔒 기능 비활성화 플래그 (true로 변경하면 다시 활성화)
let extractionInProgress = false;

// ========== 비활성화 상태 알림 ========== 
function showExtractionDisabledMessage() {
    const notice = document.getElementById('deviceNotice');
    if (notice) {
        notice.innerHTML = '🔗 네이버 자동 추출 기능은 현재 준비 중입니다';
        notice.className = 'device-notice show';
        setTimeout(() => {
            notice.classList.remove('show');
        }, 3000);
    } else {
        alert('🔗 네이버 자동 추출 기능은 현재 준비 중입니다');
    }
}

// ========== 메인 추출 함수 (비활성화됨) ========== 
async function enhancedExtractStoreInfo() {
    console.log('🚫 네이버 추출 기능 호출됨 (현재 비활성화)');
    
    if (!EXTRACTION_ENABLED) {
        showExtractionDisabledMessage();
        return;
    }
    
    // 📝 실제 추출 코드는 여기에 있었지만 현재 비활성화됨
    // 나중에 EXTRACTION_ENABLED를 true로 변경하면 아래 코드가 실행됩니다
    
    /*
    // === 원본 추출 로직 (비활성화됨) ===
    
    if (extractionInProgress) {
        console.log('⏳ 이미 추출 진행 중...');
        return;
    }

    extractionInProgress = true;
    showExtractionProgress('🔍 네이버에서 매장 정보를 자동으로 가져오는 중...');

    try {
        const naverUrl = getNaverUrlFromForm();
        if (!naverUrl) {
            const userUrl = prompt('🔗 네이버 예약 URL을 입력해주세요:\n\n예시: https://naver.me/xxxxx');
            if (!userUrl || !userUrl.trim()) {
                showQuickAlert('⚠️ 네이버 예약 URL이 필요합니다');
                return;
            }
            return await processUrlExtraction(userUrl.trim());
        }
        return await processUrlExtraction(naverUrl);
    } catch (error) {
        console.error('네이버 추출 오류:', error);
        showQuickAlert('❌ 추출 중 오류가 발생했습니다');
    } finally {
        extractionInProgress = false;
        hideExtractionProgress();
    }
    */
}

// ========== Netlify Functions 호출 (비활성화됨) ========== 
async function extractNaverStoreInfo(naverUrl) {
    console.log('🚫 Netlify Functions 호출 시도 (현재 비활성화)');
    
    if (!EXTRACTION_ENABLED) {
        return {
            success: false,
            error: '기능이 비활성화되어 있습니다'
        };
    }
    
    /*
    // === 원본 Netlify Functions 호출 로직 (비활성화됨) ===
    
    try {
        console.log('🚀 Netlify Functions를 통한 네이버 정보 추출:', naverUrl);
        
        const requestData = {
            url: naverUrl,
            fetchURL: naverUrl,
            naverUrl: naverUrl,
            link: naverUrl,
            storeUrl: naverUrl
        };
        
        const response = await fetch('/.netlify/functions/extract-naver', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
        
    } catch (error) {
        console.error('❌ Netlify Functions 오류:', error);
        return {
            success: false,
            error: error.message
        };
    }
    */
    
    return {
        success: false,
        error: '기능이 비활성화되어 있습니다'
    };
}

// ========== UI 관련 함수들 (비활성화 메시지용) ========== 

function showQuickAlert(message) {
    const alertHTML = `
        <div class="quick-alert" id="quickAlert" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #FF1493;
            z-index: 10000;
            text-align: center;
            max-width: 300px;
        ">
            <div class="alert-content">${message}</div>
        </div>
    `;
    
    const existing = document.getElementById('quickAlert');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', alertHTML);
    
    setTimeout(() => {
        const alert = document.getElementById('quickAlert');
        if (alert) alert.remove();
    }, 3000);
}

function getNaverUrlFromForm() {
    const possibleIds = [
        'naverBookingUrl',
        'naverUrl', 
        'storeUrl',
        'bookingUrl',
        'url',
        'website',
        'link'
    ];
    
    for (const id of possibleIds) {
        const field = document.getElementById(id);
        if (field && field.value && field.value.trim().includes('naver')) {
            return field.value.trim();
        }
    }
    
    return null;
}

// ========== 폼 데이터 채우기 (수동 입력 가이드) ========== 
function populateFormWithData(data) {
    console.log('📝 폼 데이터 채우기:', data);
    
    const fieldMappings = {
        'profile-businessName': data.storeName || data.name,
        'businessName': data.storeName || data.name,
        'profile-businessAddress': data.address,
        'businessAddress': data.address,
        'profile-phoneNumber': data.phone,
        'phoneNumber': data.phone,
        'profile-businessHours': data.hours || data.businessHours,
        'businessHours': data.hours || data.businessHours
    };
    
    let filledCount = 0;
    
    for (const [fieldId, value] of Object.entries(fieldMappings)) {
        if (value) {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = value;
                filledCount++;
                console.log(`✅ ${fieldId} 필드 채움:`, value);
            }
        }
    }
    
    return filledCount > 0;
}

// ========== 수동 입력 안내 모달 ========== 
function showManualInputGuidance(naverUrl, errorMessage) {
    const modalHTML = `
        <div class="manual-input-modal" id="manualInputModal" style="
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
        ">
            <div class="manual-input-container" style="
                background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
                border: 2px solid #FF1493;
                border-radius: 20px;
                max-width: 500px;
                width: 100%;
                padding: 30px;
                color: white;
            ">
                <h3 style="color: #FF1493; margin-bottom: 20px; text-align: center;">
                    🔗 수동 입력 안내
                </h3>
                
                <div style="background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                    <strong>🔗 네이버 URL:</strong><br>
                    <a href="${naverUrl}" target="_blank" style="color: #87CEEB; word-break: break-all;">${naverUrl}</a><br><br>
                    <strong>⚠️ 상태:</strong> 자동 추출 기능이 현재 준비 중입니다
                </div>
                
                <div style="background: rgba(0, 123, 255, 0.1); border: 1px solid rgba(0, 123, 255, 0.3); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                    <strong>💡 수동 입력 방법:</strong><br>
                    1. 위 네이버 링크를 클릭하여 새 탭에서 열어주세요<br>
                    2. 네이버 페이지에서 매장 정보를 확인하세요<br>
                    3. 매장명, 주소, 전화번호, 영업시간을 직접 입력해주세요<br><br>
                    <strong>✨ 참고:</strong> 수동 입력해도 모든 기능이 정상 작동합니다!
                </div>
                
                <div style="text-align: center;">
                    <button onclick="window.open('${naverUrl}', '_blank')" style="
                        background: #4169E1;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        margin-right: 10px;
                        font-weight: bold;
                    ">
                        🔗 네이버 페이지 열기
                    </button>
                    <button onclick="closeManualInputModal()" style="
                        background: rgba(255,255,255,0.1);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.3);
                        padding: 12px 24px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                    ">
                        확인
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeManualInputModal() {
    const modal = document.getElementById('manualInputModal');
    if (modal) {
        modal.remove();
    }
}

// ========== 활성화 가이드 함수 (개발자용) ========== 
function enableExtractionFeature() {
    console.log(`
        🔧 네이버 추출 기능 활성화 방법:
        
        1. 이 파일의 상단에서 EXTRACTION_ENABLED를 true로 변경
        2. 원본 코드 주석을 해제
        3. Netlify Functions가 배포되어 있는지 확인
        
        현재 상태: ${EXTRACTION_ENABLED ? '활성화됨' : '비활성화됨'}
        
        Netlify Functions 경로: /.netlify/functions/extract-naver
    `);
}

// ========== 전역 함수 등록 ========== 
window.extractStoreInfo = enhancedExtractStoreInfo;
window.enhancedExtractStoreInfo = enhancedExtractStoreInfo;
window.extractNaverStoreInfo = extractNaverStoreInfo;
window.populateFormWithData = populateFormWithData;
window.showManualInputGuidance = showManualInputGuidance;
window.closeManualInputModal = closeManualInputModal;

// 개발자용 함수
window.enableExtractionFeature = enableExtractionFeature;

// ========== 초기화 ========== 
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 네이버 추출 시스템 (비활성화 상태) 초기화 완료');
    
    // 개발 모드에서 활성화 가이드 표시
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🛠️ 개발 모드: window.enableExtractionFeature() 로 활성화 가이드 확인');
    }
});

console.log(`
✅ 네이버 예약 추출 시스템 로드 완료 (현재 비활성화)

🔧 나중에 활성화하려면:
   1. EXTRACTION_ENABLED = true 로 변경
   2. 주석 처리된 코드들을 해제
   3. Netlify Functions: /.netlify/functions/extract-naver 확인

💡 현재는 수동 입력 가이드만 제공됩니다
`);
