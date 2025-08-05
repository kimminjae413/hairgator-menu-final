// ========== 네이버 예약 자동 정보 추출 시스템 - 최종 완성 버전 ==========
// HAIRGATOR - 네이버 매장 정보 자동 추출 및 수동 입력 지원
// Netlify Functions + 스마트 수동 입력 하이브리드 시스템

console.log('🚀 HAIRGATOR 네이버 정보 추출 시스템 (최종 버전) 로드 시작');

// ========== 전역 변수 ==========
let extractionInProgress = false;
let fallbackData = {
    url: '',
    attempts: [],
    lastError: ''
};

// ========== URL 유효성 검사 (강화된 버전) ==========
function validateNaverUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL을 입력해주세요' };
    }
    
    const trimmedUrl = url.trim();
    
    // 네이버 관련 URL 패턴들 (모든 가능한 형태 지원)
    const naverPatterns = [
        // 단축 URL
        /^https?:\/\/naver\.me\/[a-zA-Z0-9]+$/,
        // 네이버 예약
        /^https?:\/\/booking\.naver\.com\/booking\/(\d+|[a-zA-Z0-9]+)/,
        /^https?:\/\/booking\.naver\.com\/store\/\d+/,
        // 네이버 지도
        /^https?:\/\/map\.naver\.com\/.*place\/\d+/,
        /^https?:\/\/map\.naver\.com\/p\/[a-zA-Z0-9]+/,
        // 네이버 스마트스토어
        /^https?:\/\/smartstore\.naver\.com\/[^\/]+/,
        // 네이버 스토어 (레스토랑)
        /^https?:\/\/store\.naver\.com\/restaurants\/detail/,
        // 모바일 네이버
        /^https?:\/\/m\.map\.naver\.com\/.*place\/\d+/,
        // 네이버 플레이스 (일반)
        /^https?:\/\/.*\.naver\.com.*place.*\d+/
    ];
    
    const isValid = naverPatterns.some(pattern => pattern.test(trimmedUrl));
    
    if (!isValid) {
        return { 
            valid: false, 
            error: '올바른 네이버 URL을 입력해주세요\n지원 형태: naver.me, booking.naver.com, map.naver.com, smartstore.naver.com' 
        };
    }
    
    return { valid: true, url: trimmedUrl };
}

// ========== Netlify Functions를 통한 자동 추출 ==========
async function extractNaverStoreInfo(naverUrl) {
    console.log('🚀 Netlify Functions를 통한 네이버 정보 추출 시작:', naverUrl);
    
    const startTime = Date.now();
    
    try {
        // Netlify Function 호출
        const response = await fetch('/.netlify/functions/extract-naver', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'HAIRGATOR/1.0'
            },
            body: JSON.stringify({ url: naverUrl }),
            timeout: 25000 // 25초 타임아웃
        });
        
        const result = await response.json();
        const processingTime = Date.now() - startTime;
        
        console.log(`⏱️ 처리 시간: ${processingTime}ms`);
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        if (result.success && result.data) {
            console.log('✅ 네이버 정보 추출 성공:', result.data);
            
            // 추출 통계 업데이트
            updateExtractionStats(true, processingTime);
            
            return {
                success: true,
                data: result.data,
                method: 'netlify_functions',
                processingTime: processingTime
            };
        } else {
            throw new Error(result.error || '정보 추출에 실패했습니다');
        }
        
    } catch (error) {
        console.error('❌ Netlify Functions 추출 실패:', error);
        
        // 추출 통계 업데이트
        updateExtractionStats(false, Date.now() - startTime, error.message);
        
        return {
            success: false,
            error: error.message,
            fallbackRequired: true,
            processingTime: Date.now() - startTime
        };
    }
}

// ========== 추출 통계 업데이트 ==========
function updateExtractionStats(success, processingTime, errorMessage = '') {
    const stats = JSON.parse(localStorage.getItem('naverExtractionStats') || '{}');
    
    stats.totalAttempts = (stats.totalAttempts || 0) + 1;
    stats.successCount = (stats.successCount || 0) + (success ? 1 : 0);
    stats.averageTime = stats.averageTime || 0;
    stats.lastAttempt = new Date().toISOString();
    
    // 평균 시간 계산
    stats.averageTime = ((stats.averageTime * (stats.totalAttempts - 1)) + processingTime) / stats.totalAttempts;
    
    if (!success) {
        stats.lastError = errorMessage;
        stats.errorCount = (stats.errorCount || 0) + 1;
    }
    
    localStorage.setItem('naverExtractionStats', JSON.stringify(stats));
}

// ========== 프로필 폼에 자동 입력 ==========
function populateProfileForm(storeData) {
    console.log('📝 프로필 폼에 정보 자동 입력:', storeData);
    
    const inputMappings = [
        { id: 'storeName', value: storeData.storeName, label: '매장명' },
        { id: 'storeAddress', value: storeData.address, label: '주소' },
        { id: 'storePhone', value: storeData.phone, label: '전화번호' },
        { id: 'businessHours', value: storeData.businessHours, label: '영업시간' },
        { id: 'storeCategory', value: storeData.category, label: '카테고리' }
    ];
    
    let filledCount = 0;
    
    inputMappings.forEach(mapping => {
        const input = document.getElementById(mapping.id);
        if (input && mapping.value) {
            input.value = mapping.value;
            input.style.borderColor = '#4CAF50';
            input.style.backgroundColor = '#f0fff0';
            input.style.transition = 'all 0.3s ease';
            filledCount++;
            
            // 입력 완료 애니메이션
            setTimeout(() => {
                input.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    input.style.transform = 'scale(1)';
                }, 200);
            }, 100);
        }
    });
    
    // 서비스 정보 자동 추가
    if (storeData.services && storeData.services.length > 0) {
        populateServices(storeData.services);
        filledCount += storeData.services.length;
    }
    
    // 성공 메시지 표시
    showSuccessNotification(
        `✅ ${filledCount}개 항목이 자동으로 입력되었습니다!`,
        storeData.extractionMethod || 'auto'
    );
    
    // 사업장 정보 탭으로 자동 전환 (부드러운 전환)
    setTimeout(() => {
        const businessTab = document.querySelector('[data-tab="business"]');
        if (businessTab) {
            businessTab.click();
            businessTab.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
            businessTab.style.color = 'white';
            
            setTimeout(() => {
                businessTab.style.background = '';
                businessTab.style.color = '';
            }, 2000);
        }
    }, 500);
    
    // 입력 완료 이벤트 발생
    window.dispatchEvent(new CustomEvent('naverDataPopulated', { 
        detail: { storeData, filledCount } 
    }));
}

// ========== 서비스 정보 자동 추가 ==========
function populateServices(services) {
    console.log('🛠️ 서비스 정보 자동 추가:', services);
    
    const servicesContainer = document.getElementById('servicesContainer');
    if (!servicesContainer) {
        console.warn('⚠️ 서비스 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    // 기존 서비스 항목 확인
    const existingServices = servicesContainer.querySelectorAll('.service-item');
    const existingCount = existingServices.length;
    
    services.forEach((service, index) => {
        setTimeout(() => {
            addServiceToForm(service.name, service.price, index);
        }, (index + 1) * 200); // 순차적으로 추가 (애니메이션 효과)
    });
}

// ========== 개별 서비스 추가 ==========
function addServiceToForm(serviceName, price, animationDelay = 0) {
    const servicesContainer = document.getElementById('servicesContainer');
    if (!servicesContainer) return;
    
    const serviceDiv = document.createElement('div');
    serviceDiv.className = 'service-item auto-added';
    serviceDiv.style.opacity = '0';
    serviceDiv.style.transform = 'translateY(-10px)';
    serviceDiv.style.transition = 'all 0.3s ease';
    
    serviceDiv.innerHTML = `
        <div class="service-inputs">
            <input type="text" value="${serviceName}" placeholder="서비스명" 
                   class="auto-filled" style="border-color: #4CAF50; background-color: #f0fff0;">
            <input type="number" value="${price}" placeholder="가격" 
                   class="auto-filled" style="border-color: #4CAF50; background-color: #f0fff0;">
            <button type="button" onclick="removeService(this)" class="remove-service-btn">
                🗑️ 삭제
            </button>
        </div>
        <div class="service-badge">자동 추가됨</div>
    `;
    
    servicesContainer.appendChild(serviceDiv);
    
    // 애니메이션 효과
    setTimeout(() => {
        serviceDiv.style.opacity = '1';
        serviceDiv.style.transform = 'translateY(0)';
    }, 50);
}

// ========== 메인 추출 함수 (사용자 인터페이스) ==========
async function enhancedExtractStoreInfo() {
    if (extractionInProgress) {
        console.log('⚠️ 이미 추출이 진행 중입니다');
        return;
    }
    
    const urlInput = document.getElementById('naverUrl');
    if (!urlInput) {
        alert('❌ URL 입력 필드를 찾을 수 없습니다');
        return;
    }
    
    const naverUrl = urlInput.value.trim();
    
    // URL 유효성 검사
    const validation = validateNaverUrl(naverUrl);
    if (!validation.valid) {
        showErrorAlert(validation.error);
        urlInput.focus();
        return;
    }
    
    extractionInProgress = true;
    fallbackData.url = validation.url;
    
    // UI 상태 업데이트
    const extractBtn = document.querySelector('.naver-extract-btn');
    const originalText = extractBtn ? extractBtn.textContent : '';
    
    updateButtonState(extractBtn, 'loading');
    showExtractionProgress('🔍 네이버 페이지 분석 중...');
    
    try {
        // 1단계: Netlify Functions를 통한 자동 추출 시도
        showExtractionProgress('🚀 서버에서 정보 추출 중...');
        const result = await extractNaverStoreInfo(validation.url);
        
        if (result.success) {
            // 성공: 폼에 자동 입력
            showExtractionProgress('✅ 정보 추출 완료! 폼에 입력 중...');
            
            setTimeout(() => {
                populateProfileForm(result.data);
                urlInput.value = ''; // URL 입력창 클리어
                hideExtractionProgress();
            }, 500);
            
        } else {
            // 실패: 수동 입력 모달 표시
            showExtractionProgress('⚠️ 자동 추출 실패, 수동 입력 모드로 전환...');
            
            setTimeout(() => {
                hideExtractionProgress();
                showAdvancedManualInputModal(validation.url, result.error);
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ 전체 프로세스 오류:', error);
        hideExtractionProgress();
        showAdvancedManualInputModal(validation.url, error.message);
        
    } finally {
        extractionInProgress = false;
        updateButtonState(extractBtn, 'normal', originalText);
    }
}

// ========== 버튼 상태 관리 ==========
function updateButtonState(button, state, originalText = '') {
    if (!button) return;
    
    const states = {
        loading: {
            text: '🔄 정보 추출 중...',
            disabled: true,
            style: { background: '#666', cursor: 'not-allowed' }
        },
        normal: {
            text: originalText || '🔗 매장 정보 자동 가져오기',
            disabled: false,
            style: { background: '', cursor: 'pointer' }
        },
        success: {
            text: '✅ 추출 완료!',
            disabled: false,
            style: { background: '#4CAF50', cursor: 'pointer' }
        }
    };
    
    const config = states[state];
    if (config) {
        button.textContent = config.text;
        button.disabled = config.disabled;
        Object.assign(button.style, config.style);
    }
}

// ========== 추출 진행 상황 표시 ==========
function showExtractionProgress(message) {
    let progressDiv = document.getElementById('extractionProgress');
    
    if (!progressDiv) {
        progressDiv = document.createElement('div');
        progressDiv.id = 'extractionProgress';
        progressDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            z-index: 10000;
            text-align: center;
            font-size: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
        `;
        document.body.appendChild(progressDiv);
    }
    
    progressDiv.innerHTML = `
        <div class="progress-content">
            <div class="progress-spinner" style="
                width: 30px;
                height: 30px;
                border: 3px solid rgba(255, 255, 255, 0.3);
                border-top: 3px solid #4CAF50;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 15px;
            "></div>
            <div>${message}</div>
        </div>
    `;
}

function hideExtractionProgress() {
    const progressDiv = document.getElementById('extractionProgress');
    if (progressDiv) {
        progressDiv.style.opacity = '0';
        setTimeout(() => {
            if (progressDiv.parentNode) {
                progressDiv.remove();
            }
        }, 300);
    }
}

// ========== 고급 수동 입력 모달 ==========
function showAdvancedManualInputModal(naverUrl, errorMessage = '') {
    console.log('📝 고급 수동 입력 모달 표시:', naverUrl);
    
    const stats = JSON.parse(localStorage.getItem('naverExtractionStats') || '{}');
    const successRate = stats.totalAttempts ? 
        Math.round((stats.successCount / stats.totalAttempts) * 100) : 0;
    
    const modalHTML = `
        <div class="advanced-manual-modal" id="advancedManualModal">
            <div class="modal-backdrop" onclick="closeAdvancedManualModal()"></div>
            <div class="advanced-modal-content">
                <div class="modal-header">
                    <h3>🛠️ 스마트 매장 정보 입력</h3>
                    <button class="modal-close" onclick="closeAdvancedManualModal()">×</button>
                </div>
                
                <div class="extraction-status">
                    <div class="status-card error">
                        <div class="status-icon">⚠️</div>
                        <div class="status-content">
                            <h4>자동 추출 실패</h4>
                            <p>${errorMessage || '네이버 보안 정책으로 인해 자동 추출이 제한됩니다'}</p>
                        </div>
                    </div>
                    
                    <div class="stats-info">
                        <small>전체 성공률: ${successRate}% (${stats.successCount || 0}/${stats.totalAttempts || 0})</small>
                    </div>
                </div>
                
                <div class="input-methods">
                    <div class="method-tabs">
                        <div class="method-tab active" data-method="quick" onclick="switchInputMethod('quick')">
                            ⚡ 빠른 입력
                        </div>
                        <div class="method-tab" data-method="guided" onclick="switchInputMethod('guided')">
                            📋 단계별 가이드
                        </div>
                        <div class="method-tab" data-method="paste" onclick="switchInputMethod('paste')">
                            📄 텍스트 붙여넣기
                        </div>
                    </div>
                    
                    <!-- 빠른 입력 -->
                    <div class="method-content active" id="quickMethod">
                        <div class="quick-actions">
                            <button class="primary-action-btn" onclick="window.open('${naverUrl}', '_blank')">
                                🔗 네이버 페이지 열기
                            </button>
                            <button class="secondary-action-btn" onclick="enableSmartPasting()">
                                📋 스마트 붙여넣기 활성화
                            </button>
                        </div>
                        
                        <div class="input-tips">
                            <h4>💡 빠른 입력 팁:</h4>
                            <ul>
                                <li>네이버 페이지를 열고 정보를 복사하세요</li>
                                <li>아래 프로필 폼에 직접 붙여넣으면 자동 정리됩니다</li>
                                <li>전화번호는 하이픈(-) 포함해서 입력하세요</li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- 단계별 가이드 -->
                    <div class="method-content" id="guidedMethod">
                        <div class="guided-steps">
                            <div class="step-item">
                                <div class="step-number">1</div>
                                <div class="step-content">
                                    <h4>매장명 복사</h4>
                                    <p>네이버 페이지 상단의 큰 제목을 복사하세요</p>
                                </div>
                            </div>
                            
                            <div class="step-item">
                                <div class="step-number">2</div>
                                <div class="step-content">
                                    <h4>주소 정보</h4>
                                    <p>"위치" 또는 "주소" 섹션의 전체 주소를 복사하세요</p>
                                </div>
                            </div>
                            
                            <div class="step-item">
                                <div class="step-number">3</div>
                                <div class="step-content">
                                    <h4>연락처</h4>
                                    <p>"전화번호" 정보를 하이픈(-) 포함해서 복사하세요</p>
                                </div>
                            </div>
                            
                            <div class="step-item">
                                <div class="step-number">4</div>
                                <div class="step-content">
                                    <h4>영업시간</h4>
                                    <p>"영업시간" 또는 "운영시간" 정보를 복사하세요</p>
                                </div>
                            </div>
                        </div>
                        
                        <button class="primary-action-btn" onclick="window.open('${naverUrl}', '_blank')">
                            🔗 네이버 페이지 열어서 시작하기
                        </button>
                    </div>
                    
                    <!-- 텍스트 붙여넣기 -->
                    <div class="method-content" id="pasteMethod">
                        <div class="paste-area">
                            <textarea id="pasteTextarea" placeholder="네이버 페이지의 매장 정보를 전체 복사해서 여기에 붙여넣으세요...&#10;&#10;예시:&#10;매장명: 헤어갤러리&#10;주소: 서울시 강남구 테헤란로...&#10;전화: 02-1234-5678&#10;영업시간: 10:00 - 20:00" 
                                    style="width: 100%; height: 200px; padding: 15px; border: 2px dashed #ddd; border-radius: 10px; resize: vertical;"></textarea>
                        </div>
                        
                        <div class="paste-actions">
                            <button class="primary-action-btn" onclick="processPastedText()">
                                🔍 텍스트 분석 및 자동 입력
                            </button>
                            <button class="secondary-action-btn" onclick="clearPasteArea()">
                                🗑️ 지우기
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="close-btn" onclick="closeAdvancedManualModal()">
                        완료
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 모달 애니메이션
    setTimeout(() => {
        const modal = document.getElementById('advancedManualModal');
        if (modal) {
            modal.style.opacity = '1';
            modal.querySelector('.advanced-modal-content').style.transform = 'translate(-50%, -50%) scale(1)';
        }
    }, 10);
}

// ========== 입력 방법 전환 ==========
function switchInputMethod(method) {
    const tabs = document.querySelectorAll('.method-tab');
    const contents = document.querySelectorAll('.method-content');
    
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.method === method);
    });
    
    contents.forEach(content => {
        content.classList.toggle('active', content.id === method + 'Method');
    });
}

// ========== 스마트 붙여넣기 활성화 ==========
function enableSmartPasting() {
    const inputs = document.querySelectorAll('#storeName, #storeAddress, #storePhone, #businessHours');
    
    inputs.forEach(input => {
        // 기존 이벤트 리스너 제거
        input.removeEventListener('paste', handleSmartPaste);
        // 새 이벤트 리스너 추가
        input.addEventListener('paste', handleSmartPaste);
        
        // 시각적 표시
        input.style.borderColor = '#4CAF50';
        input.style.boxShadow = '0 0 5px rgba(76, 175, 80, 0.3)';
        input.placeholder = '여기에 붙여넣으세요 (자동 정리됨)';
    });
    
    showSuccessNotification('📋 스마트 붙여넣기가 활성화되었습니다!', 'smart_paste');
    closeAdvancedManualModal();
}

// ========== 스마트 붙여넣기 처리 ==========
function handleSmartPaste(event) {
    const pastedText = event.clipboardData.getData('text');
    const input = event.target;
    
    let cleanedText = pastedText.trim();
    
    // 입력 필드별 자동 정리
    if (input.id === 'storePhone') {
        // 전화번호 정리: 숫자와 하이픈만 남기기
        cleanedText = cleanedText.replace(/[^\d\-]/g, '');
        // 하이픈이 없으면 자동 추가
        if (!cleanedText.includes('-') && cleanedText.length >= 10) {
            cleanedText = cleanedText.replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3');
        }
    } else if (input.id === 'storeAddress') {
        // 주소 정리: 앞뒤 불필요한 텍스트 제거
        cleanedText = cleanedText.replace(/^(주소|위치):\s*/, '');
        cleanedText = cleanedText.replace(/\s+/g, ' ');
    } else if (input.id === 'businessHours') {
        // 영업시간 정리
        cleanedText = cleanedText.replace(/^(영업시간|운영시간):\s*/, '');
    }
    
    // 정리된 텍스트 설정
    event.preventDefault();
    input.value = cleanedText;
    
    // 시각적 피드백
    input.style.backgroundColor = '#f0fff0';
    input.style.borderColor = '#4CAF50';
    
    setTimeout(() => {
        input.style.backgroundColor = '';
        input.style.borderColor = '';
        input.style.boxShadow = '';
        input.placeholder = '';
    }, 2000);
}

// ========== 붙여넣기 텍스트 분석 ==========
function processPastedText() {
    const textarea = document.getElementById('pasteTextarea');
    if (!textarea || !textarea.value.trim()) {
        alert('분석할 텍스트를 입력해주세요');
        return;
    }
    
    const text = textarea.value.trim();
    const extractedInfo = parseTextForStoreInfo(text);
    
    if (Object.keys(extractedInfo).length === 0) {
        alert('매장 정보를 찾을 수 없습니다. 다른 방법을 시도해보세요.');
        return;
    }
    
    // 추출된 정보로 폼 채우기
    populateProfileForm(extractedInfo);
    closeAdvancedManualModal();
}

// ========== 텍스트에서 매장 정보 추출 ==========
function parseTextForStoreInfo(text) {
    const info = {};
    
    // 전화번호 패턴
    const phonePattern = /(\d{2,3}-\d{3,4}-\d{4})/;
    const phoneMatch = text.match(phonePattern);
    if (phoneMatch) info.phone = phoneMatch[1];
    
    // 주소 패턴 (시/구/동 포함)
    const addressPattern = /([가-힣]+시\s+[가-힣]+구\s+[가-힣\s\d-]+)/;
    const addressMatch = text.match(addressPattern);
    if (addressMatch) info.address = addressMatch[1];
    
    // 영업시간 패턴
    const hoursPattern = /(\d{1,2}:\d{2}\s*[-~]\s*\d{1,2}:\d{2})/;
    const hoursMatch = text.match(hoursPattern);
    if (hoursMatch) info.businessHours = hoursMatch[1];
    
    // 매장명 추출 (첫 번째 줄 또는 특정 패턴)
    const lines = text.split('\n');
    const firstLine = lines[0]?.trim();
    if (firstLine && firstLine.length > 0 && firstLine.length < 50) {
        info.storeName = firstLine;
    }
    
    return info;
}

// ========== 성공 알림 표시 (향상된 버전) ==========
function showSuccessNotification(message, type = 'success') {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.success-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const colors = {
        success: { bg: 'linear-gradient(135deg, #4CAF50, #45a049)', icon: '✅' },
        smart_paste: { bg: 'linear-gradient(135deg, #2196F3, #1976D2)', icon: '📋' },
        auto: { bg: 'linear-gradient(135deg, #FF9800, #F57C00)', icon: '🤖' }
    };
    
    const color = colors[type] || colors.success;
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color.bg};
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10001;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            font-size: 14px;
            line-height: 1.4;
        ">
            ${color.icon} ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 자동 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 4000);
}

// ========== 오류 알림 표시 ==========
function showErrorAlert(message) {
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #f44336, #d32f2f);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        font-size: 14px;
        line-height: 1.4;
    `;
    alert.innerHTML = `❌ ${message}`;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// ========== 모달 닫기 함수들 ==========
function closeAdvancedManualModal() {
    const modal = document.getElementById('advancedManualModal');
    if (modal) {
        modal.style.opacity = '0';
        modal.querySelector('.advanced-modal-content').style.transform = 'translate(-50%, -50%) scale(0.95)';
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }
}

function clearPasteArea() {
    const textarea = document.getElementById('pasteTextarea');
    if (textarea) {
        textarea.value = '';
        textarea.focus();
    }
}

// ========== 통계 조회 함수 (디버깅용) ==========
function getExtractionStats() {
    const stats = JSON.parse(localStorage.getItem('naverExtractionStats') || '{}');
    console.log('📊 네이버 추출 통계:', stats);
    return stats;
}

// ========== 애니메이션 CSS 추가 ==========
function addAnimationStyles() {
    const styles = `
        <style>
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .advanced-manual-modal {
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .advanced-modal-content {
            transform: translate(-50%, -50%) scale(0.95);
            transition: transform 0.3s ease;
        }
        
        .method-tab {
            transition: all 0.3s ease;
        }
        
        .method-tab:hover {
            background-color: rgba(255, 20, 147, 0.1);
        }
        
        .service-item.auto-added {
            border-left: 4px solid #4CAF50;
        }
        
        .auto-filled {
            animation: highlight 0.5s ease;
        }
        
        @keyframes highlight {
            0% { background-color: #ffffff; }
            50% { background-color: #f0fff0; }
            100% { background-color: #f0fff0; }
        }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 네이버 추출 시스템 초기화 중...');
    
    // 애니메이션 스타일 추가
    addAnimationStyles();
    
    // 전역 함수 등록
    window.enhancedExtractStoreInfo = enhancedExtractStoreInfo;
    window.closeAdvancedManualModal = closeAdvancedManualModal;
    window.switchInputMethod = switchInputMethod;
    window.enableSmartPasting = enableSmartPasting;
    window.processPastedText = processPastedText;
    window.clearPasteArea = clearPasteArea;
    window.getExtractionStats = getExtractionStats;
    
    console.log('✅ 네이버 예약 자동 정보 추출 시스템 (최종 버전) 로드 완료!');
});

// ========== 모듈 내보내기 (선택사항) ==========
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateNaverUrl,
        extractNaverStoreInfo,
        enhancedExtractStoreInfo,
        getExtractionStats
    };
}

console.log('🎉 HAIRGATOR 네이버 정보 추출 시스템 (최종 완성 버전) 준비 완료!');
