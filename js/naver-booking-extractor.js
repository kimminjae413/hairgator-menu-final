// ========== 네이버 예약 자동 정보 추출 시스템 - 진짜 최종 완전 버전 ==========
// HAIRGATOR - 네이버 매장 정보 자동 추출 및 수동 입력 지원
// Netlify Functions + 스마트 수동 입력 하이브리드 시스템 (모든 기능 포함)

console.log('🚀 HAIRGATOR 네이버 정보 추출 시스템 (진짜 최종 완전 버전) 로드 시작');

// ========== 전역 변수 ==========
let extractionInProgress = false;
let fallbackData = {
    urls: [
        'https://api.allorigins.win/get?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://thingproxy.freeboard.io/fetch/'
    ],
    currentUrlIndex: 0
};

// ========== CSS 스타일 자동 삽입 ==========
function injectExtractorStyles() {
    if (document.getElementById('extractorStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'extractorStyles';
    style.textContent = `
        /* ========== 네이버 정보 추출 모달 스타일 ========== */
        .extraction-progress {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        }

        .progress-container {
            background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
            border: 2px solid #FF1493;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            max-width: 400px;
            width: 90%;
        }

        .progress-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 20, 147, 0.3);
            border-top: 4px solid #FF1493;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .progress-message {
            color: #fff;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .progress-submessage {
            color: #ccc;
            font-size: 14px;
        }

        /* ========== 스마트 수동 입력 모달 ========== */
        .smart-manual-modal {
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
            animation: fadeIn 0.3s ease;
            padding: 20px;
            box-sizing: border-box;
            overflow-y: auto;
        }

        .smart-modal-container {
            background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
            border: 2px solid #FF1493;
            border-radius: 20px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
        }

        .smart-modal-header {
            padding: 25px 30px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            margin-bottom: 25px;
        }

        .smart-modal-header h3 {
            color: #FF1493;
            margin: 0;
            font-size: 22px;
        }

        .smart-modal-close {
            background: none;
            border: none;
            color: #999;
            font-size: 28px;
            cursor: pointer;
            padding: 5px;
            transition: color 0.3s ease;
        }

        .smart-modal-close:hover {
            color: #fff;
        }

        .smart-modal-content {
            padding: 0 30px 30px;
        }

        .error-info {
            background: rgba(220, 53, 69, 0.1);
            border: 1px solid rgba(220, 53, 69, 0.3);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            color: #fff;
            font-size: 14px;
        }

        .error-info p {
            margin: 5px 0;
        }

        .error-info strong {
            color: #FF69B4;
        }

        .error-info a {
            color: #87CEEB;
            text-decoration: none;
        }

        .error-info a:hover {
            text-decoration: underline;
        }

        .instruction-box {
            background: rgba(255, 20, 147, 0.1);
            border: 1px solid rgba(255, 20, 147, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 25px;
        }

        .instruction-box h4 {
            color: #FF1493;
            margin: 0 0 15px;
            font-size: 16px;
        }

        .instruction-box ol {
            margin: 0;
            padding-left: 20px;
            color: #ccc;
        }

        .instruction-box li {
            margin-bottom: 8px;
            line-height: 1.4;
        }

        .smart-manual-form {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 25px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
                gap: 15px;
            }
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            color: #fff;
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px 15px;
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            color: #fff;
            font-size: 14px;
            box-sizing: border-box;
            transition: all 0.3s ease;
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #FF1493;
            background: rgba(255, 255, 255, 0.15);
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
            color: #aaa;
        }

        .smart-modal-buttons {
            display: flex;
            gap: 15px;
            justify-content: flex-end;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .smart-btn {
            padding: 12px 25px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
            min-width: 100px;
        }

        .smart-btn-cancel {
            background: #333;
            color: #fff;
        }

        .smart-btn-cancel:hover {
            background: #555;
        }

        .smart-btn-save {
            background: linear-gradient(135deg, #FF1493, #FF69B4);
            color: white;
        }

        .smart-btn-save:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 20, 147, 0.3);
        }

        /* ========== 빠른 알림 ========== */
        .quick-alert {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #FF1493, #FF69B4);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            z-index: 10001;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 10px 30px rgba(255, 20, 147, 0.3);
            animation: alertPop 0.3s ease;
            max-width: 90%;
        }

        @keyframes alertPop {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* ========== 추출 버튼 스타일 ========== */
        .extract-btn {
            background: linear-gradient(135deg, #4169E1, #1E90FF);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: all 0.3s ease;
            margin-left: 10px;
        }

        .extract-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(65, 105, 225, 0.3);
        }

        .extract-btn:disabled {
            background: #666;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
    `;
    
    document.head.appendChild(style);
    console.log('✅ 네이버 추출기 스타일 삽입 완료');
}

// ========== Netlify Functions를 통한 정보 추출 ==========
async function extractNaverStoreInfo(naverUrl) {
    console.log('🔗 Netlify Functions를 통한 네이버 정보 추출 시작:', naverUrl);
    
    try {
        // 요청 데이터 준비 (여러 키 형태로 전송)
        const requestData = {
            url: naverUrl,           // 주요 키
            fetchURL: naverUrl,      // 백업 키 (오류에서 요구한 키)
            naverUrl: naverUrl,      // 추가 키
            link: naverUrl,          // 예비 키
            storeUrl: naverUrl       // 폼 필드명
        };
        
        console.log('📤 요청 데이터:', requestData);
        
        const response = await fetch('/.netlify/functions/extract-naver', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        console.log('📡 Netlify Functions 응답 상태:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Netlify Functions 오류 응답:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(`Netlify Functions 오류: ${errorData.error || errorData.message || 'Unknown error'}`);
            } catch (e) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }

        const result = await response.json();
        console.log('✅ Netlify Functions 응답:', result);

        if (result.success && result.data) {
            console.log('🎉 정보 추출 성공!');
            return {
                success: true,
                data: result.data
            };
        } else {
            console.log('⚠️ 추출 실패 또는 데이터 없음');
            return {
                success: false,
                error: result.error || '정보를 추출할 수 없습니다'
            };
        }

    } catch (error) {
        console.error('❌ Netlify Functions 요청 실패:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ========== 백업 CORS 프록시를 통한 추출 (Netlify Functions 실패 시) ==========
async function extractWithCorsProxy(naverUrl) {
    console.log('🔄 CORS 프록시를 통한 백업 추출 시도');
    
    const proxyUrls = [
        'https://api.allorigins.win/get?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://thingproxy.freeboard.io/fetch/'
    ];
    
    for (let i = 0; i < proxyUrls.length; i++) {
        try {
            const proxyUrl = proxyUrls[i];
            console.log(`📡 프록시 ${i + 1} 시도: ${proxyUrl}`);
            
            let fullUrl;
            if (proxyUrl.includes('allorigins')) {
                fullUrl = `${proxyUrl}${encodeURIComponent(naverUrl)}`;
            } else {
                fullUrl = `${proxyUrl}${naverUrl}`;
            }
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/html, */*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 15000
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            let html;
            if (proxyUrl.includes('allorigins')) {
                const jsonData = await response.json();
                html = jsonData.contents;
            } else {
                html = await response.text();
            }
            
            console.log(`✅ 프록시 ${i + 1} 성공, HTML 길이:`, html.length);
            
            // HTML 파싱
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            return parseNaverStoreInfo(doc);
            
        } catch (error) {
            console.error(`❌ 프록시 ${i + 1} 실패:`, error.message);
            continue;
        }
    }
    
    throw new Error('모든 프록시 서비스 실패');
}

// ========== HTML 파싱을 통한 매장 정보 추출 ==========
function parseNaverStoreInfo(doc) {
    console.log('🔍 HTML에서 매장 정보 파싱 시작');
    
    const storeInfo = {
        storeName: '',
        address: '',
        phone: '',
        hours: '',
        description: '',
        categories: []
    };
    
    // 다양한 선택자로 정보 추출 시도
    const selectors = {
        storeName: [
            'h1.GHAhO',
            '.place_section_content h1',
            '.business_name',
            'h1',
            '.store-name',
            '[data-nclicks*="storename"]',
            '.shop_name',
            '.place_name'
        ],
        address: [
            '.LDgIH',
            '.place_section_content .address',
            '.address_info',
            '.store-address',
            '[data-nclicks*="address"]',
            '.location_detail',
            '.addr'
        ],
        phone: [
            '.xlx7Q',
            '.place_section_content .phone',
            '.phone_info',
            '.store-phone',
            '[data-nclicks*="phone"]',
            '.tel',
            '.contact_num'
        ],
        hours: [
            '.A_cdD',
            '.place_section_content .hours',
            '.hours_info',
            '.business-hours',
            '[data-nclicks*="hours"]',
            '.time_info',
            '.operating_time'
        ]
    };
    
    // 각 필드별로 추출 시도
    Object.keys(selectors).forEach(field => {
        for (const selector of selectors[field]) {
            const element = doc.querySelector(selector);
            if (element && element.textContent.trim()) {
                storeInfo[field] = element.textContent.trim();
                console.log(`✅ ${field}: ${storeInfo[field]}`);
                break;
            }
        }
    });
    
    // 카테고리 정보 추출
    const categorySelectors = [
        '.category_name',
        '.category_item', 
        '.business-category',
        '.category',
        '.biz_category'
    ];
    
    categorySelectors.forEach(selector => {
        const elements = doc.querySelectorAll(selector);
        elements.forEach(el => {
            const category = el.textContent.trim();
            if (category && !storeInfo.categories.includes(category)) {
                storeInfo.categories.push(category);
            }
        });
    });
    
    // 설명 정보 추출
    const descSelectors = [
        '.place_section_content .description',
        '.business_description',
        '.intro',
        '.summary'
    ];
    
    for (const selector of descSelectors) {
        const element = doc.querySelector(selector);
        if (element && element.textContent.trim()) {
            storeInfo.description = element.textContent.trim();
            break;
        }
    }
    
    console.log('🎉 파싱 완료:', storeInfo);
    
    // 성공 여부 판단 (최소한 매장명은 있어야 함)
    const isSuccess = storeInfo.storeName.length > 0;
    
    return {
        success: isSuccess,
        data: storeInfo
    };
}

// ========== URL 필드 자동 감지 및 추출 ==========
function getNaverUrlFromForm() {
    // 다양한 가능한 필드 ID들을 시도
    const possibleIds = [
        'storeUrl',           // 기본 예상 ID
        'naverUrl',           // 네이버 URL 필드
        'naverBookingUrl',    // 네이버 예약 URL
        'bookingUrl',         // 예약 URL
        'url',                // 일반 URL
        'website',            // 웹사이트
        'link',               // 링크
        'naverLink',          // 네이버 링크
        'reservationUrl'      // 예약 URL
    ];
    
    for (const id of possibleIds) {
        const field = document.getElementById(id);
        if (field && field.value && field.value.trim()) {
            console.log(`✅ URL 필드 발견: ${id} = ${field.value}`);
            return field.value.trim();
        }
    }
    
    // 필드를 찾지 못한 경우 모든 input 필드 검사
    const allInputs = document.querySelectorAll('input[type="text"], input[type="url"]');
    for (const input of allInputs) {
        const value = input.value.trim();
        if (value && (value.includes('naver.me') || value.includes('booking.naver.com'))) {
            console.log(`✅ 네이버 URL 자동 감지: ${input.id || input.name} = ${value}`);
            return value;
        }
    }
    
    console.log('❌ 네이버 URL 필드를 찾을 수 없음');
    return null;
}

// ========== 향상된 정보 추출 함수 ==========
async function enhancedExtractStoreInfo() {
    console.log('🎯 정보 추출 시작...');
    
    // 스타일 주입
    injectExtractorStyles();
    
    // URL 자동 감지
    const naverUrl = getNaverUrlFromForm();

    if (!naverUrl) {
        // 사용자에게 직접 URL 입력 요청
        const userUrl = prompt('🔗 네이버 예약 URL을 입력해주세요:\n\n예시: https://naver.me/xxxxx\n또는: https://booking.naver.com/booking/xxxxx');
        if (!userUrl || !userUrl.trim()) {
            showQuickAlert('⚠️ 네이버 예약 URL이 필요합니다');
            return;
        }
        
        // 입력받은 URL로 진행
        return await processUrlExtraction(userUrl.trim());
    }

    return await processUrlExtraction(naverUrl);
}

// ========== URL 처리 및 추출 ==========
async function processUrlExtraction(naverUrl) {
    // URL 형식 검증
    if (!naverUrl.includes('naver')) {
        showQuickAlert('⚠️ 올바른 네이버 URL을 입력해주세요');
        return;
    }

    if (extractionInProgress) {
        console.log('⏳ 이미 추출 진행 중...');
        return;
    }

    extractionInProgress = true;
    showExtractionProgress('🔍 네이버에서 매장 정보를 자동으로 가져오는 중...');

    try {
        console.log('🎯 URL 처리 시작:', naverUrl);

        // 1단계: Netlify Functions 시도
        updateExtractionProgress('🚀 서버에서 정보 추출 중...');
        const netlifyResult = await extractNaverStoreInfo(naverUrl);

        if (netlifyResult.success) {
            console.log('✅ Netlify Functions 성공!');
            hideExtractionProgress();
            
            // 추출된 정보를 폼에 자동 입력
            const success = populateFormWithData(netlifyResult.data);
            
            if (success) {
                showQuickAlert('✅ 매장 정보를 성공적으로 가져왔습니다!');
                
                // 성공한 URL을 해당 필드에 저장
                saveUrlToForm(naverUrl);
            } else {
                showQuickAlert('⚠️ 일부 정보만 가져올 수 있었습니다');
            }
            return;
        }

        console.log('⚠️ Netlify Functions 실패, CORS 프록시 시도...');
        
        // 2단계: CORS 프록시 백업 시도
        updateExtractionProgress('🔄 백업 서버를 통해 정보 추출 중...');
        
        try {
            const proxyResult = await extractWithCorsProxy(naverUrl);
            
            if (proxyResult.success) {
                console.log('✅ CORS 프록시 성공!');
                hideExtractionProgress();
                
                const success = populateFormWithData(proxyResult.data);
                
                if (success) {
                    showQuickAlert('✅ 백업 서버를 통해 매장 정보를 가져왔습니다!');
                    saveUrlToForm(naverUrl);
                } else {
                    showQuickAlert('⚠️ 일부 정보만 가져올 수 있었습니다');
                }
                return;
            }
        } catch (proxyError) {
            console.log('⚠️ CORS 프록시도 실패:', proxyError.message);
        }

        console.log('⚠️ 모든 자동 추출 실패, 수동 입력 모달 표시');
        
        // 3단계: 실패 시 스마트 수동 입력 모달 표시
        hideExtractionProgress();
        showSmartManualInputModal(naverUrl, netlifyResult.error);

    } catch (error) {
        console.error('❌ 전체 추출 프로세스 실패:', error);
        hideExtractionProgress();
        showSmartManualInputModal(naverUrl, error.message);
    } finally {
        extractionInProgress = false;
    }
}

// ========== 폼 데이터 채우기 (개선된 버전) ==========
function populateFormWithData(data) {
    console.log('📝 폼에 데이터 채우기:', data);
    
    let fieldsPopulated = 0;

    // 필드 매핑 (더 많은 가능성 추가)
    const fieldMappings = {
        storeName: [
            'designerName', 'salonName', 'businessName', 'storeName', 'shopName',
            'companyName', 'name', 'title', 'brandName'
        ],
        address: [
            'address', 'location', 'businessAddress', 'storeAddress', 'shopAddress',
            'fullAddress', 'addr', 'place'
        ],
        phone: [
            'phone', 'phoneNumber', 'contact', 'tel', 'telephone', 'contactNumber',
            'businessPhone', 'storePhone', 'mobile'
        ],
        hours: [
            'hours', 'businessHours', 'openingHours', 'workingHours', 'operatingHours',
            'schedule', 'time', 'availability'
        ],
        description: [
            'description', 'about', 'introduction', 'info', 'details', 'summary',
            'content', 'note', 'memo', 'comment'
        ]
    };

    // 각 데이터 필드에 대해 폼 필드 찾아서 채우기
    Object.keys(fieldMappings).forEach(dataKey => {
        const value = data[dataKey];
        if (value && value.trim()) {
            const targetFields = fieldMappings[dataKey];
            
            for (const fieldId of targetFields) {
                const field = document.getElementById(fieldId);
                if (field && (!field.value || field.value.trim() === '')) {
                    field.value = value.trim();
                    console.log(`✅ ${fieldId} = ${value}`);
                    fieldsPopulated++;
                    
                    // 입력 이벤트 트리거 (유효성 검사 등을 위해)
                    field.dispatchEvent(new Event('input', { bubbles: true }));
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }
    });

    // 카테고리 정보 처리
    if (data.categories && data.categories.length > 0) {
        const categoryFields = ['category', 'businessCategory', 'serviceType', 'type'];
        for (const fieldId of categoryFields) {
            const field = document.getElementById(fieldId);
            if (field && (!field.value || field.value.trim() === '')) {
                field.value = data.categories.join(', ');
                console.log(`✅ ${fieldId} = ${data.categories.join(', ')}`);
                fieldsPopulated++;
                
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                break;
            }
        }
    }

    console.log(`📊 총 ${fieldsPopulated}개 필드에 데이터 입력 완료`);
    return fieldsPopulated > 0;
}

// ========== URL을 폼에 저장 ==========
function saveUrlToForm(naverUrl) {
    const urlFields = [
        'storeUrl', 'naverUrl', 'naverBookingUrl', 'bookingUrl', 'url', 'website', 'link'
    ];
    
    for (const fieldId of urlFields) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = naverUrl;
            console.log(`✅ URL 저장: ${fieldId} = ${naverUrl}`);
            
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            break;
        }
    }
}

// ========== 스마트 수동 입력 모달 ==========
function showSmartManualInputModal(naverUrl, errorMessage) {
    console.log('🎨 스마트 수동 입력 모달 표시');

    const modalHTML = `
        <div class="smart-manual-modal" id="smartManualModal">
            <div class="smart-modal-container">
                <div class="smart-modal-header">
                    <h3>✋ 수동 입력이 필요합니다</h3>
                    <button class="smart-modal-close" onclick="closeSmartManualModal()">×</button>
                </div>
                
                <div class="smart-modal-content">
                    <div class="error-info">
                        <p><strong>📱 네이버 URL:</strong> <a href="${naverUrl}" target="_blank" rel="noopener">${naverUrl}</a></p>
                        <p><strong>❌ 실패 이유:</strong> ${errorMessage}</p>
                    </div>
                    
                    <div class="instruction-box">
                        <h4>📋 수동 입력 방법:</h4>
                        <ol>
                            <li>위의 네이버 링크를 클릭하여 새 탭에서 열기</li>
                            <li>매장 정보를 확인하고 아래 폼에 직접 입력</li>
                            <li>입력 완료 후 "저장" 버튼 클릭</li>
                        </ol>
                    </div>
                    
                    <form class="smart-manual-form" id="smartManualForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label>🏪 매장명 *</label>
                                <input type="text" id="manualStoreName" placeholder="매장 이름을 입력하세요" required>
                            </div>
                            <div class="form-group">
                                <label>📞 전화번호</label>
                                <input type="tel" id="manualPhone" placeholder="010-1234-5678">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>📍 주소</label>
                            <input type="text" id="manualAddress" placeholder="매장 주소를 입력하세요">
                        </div>
                        
                        <div class="form-group">
                            <label>🕐 영업시간</label>
                            <input type="text" id="manualHours" placeholder="예: 월-금 10:00-20:00, 토-일 10:00-18:00">
                        </div>
                        
                        <div class="form-group">
                            <label>🏷️ 카테고리</label>
                            <input type="text" id="manualCategory" placeholder="예: 헤어살롱, 미용실, 네일샵">
                        </div>
                        
                        <div class="form-group">
                            <label>📝 매장 소개</label>
                            <textarea id="manualDescription" rows="3" placeholder="매장에 대한 간단한 소개를 입력하세요"></textarea>
                        </div>
                        
                        <div class="smart-modal-buttons">
                            <button type="button" class="smart-btn smart-btn-cancel" onclick="closeSmartManualModal()">취소</button>
                            <button type="submit" class="smart-btn smart-btn-save">💾 저장</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 폼 제출 이벤트
    document.getElementById('smartManualForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveManualInput();
    });
}

// ========== 수동 입력 저장 ==========
function saveManualInput() {
    const manualData = {
        storeName: document.getElementById('manualStoreName').value.trim(),
        phone: document.getElementById('manualPhone').value.trim(),
        address: document.getElementById('manualAddress').value.trim(),
        hours: document.getElementById('manualHours').value.trim(),
        description: document.getElementById('manualDescription').value.trim(),
        categories: document.getElementById('manualCategory').value.trim() ? 
                   [document.getElementById('manualCategory').value.trim()] : []
    };

    // 필수 필드 검증
    if (!manualData.storeName) {
        showQuickAlert('⚠️ 매장명은 필수 입력 항목입니다');
        return;
    }

    console.log('💾 수동 입력 데이터 저장:', manualData);
    
    // 메인 폼에 데이터 채우기
    const success = populateFormWithData(manualData);
    
    closeSmartManualModal();
    
    if (success) {
        showQuickAlert('✅ 매장 정보가 성공적으로 입력되었습니다!');
    } else {
        showQuickAlert('⚠️ 일부 정보만 입력되었습니다. 필드명을 확인해주세요.');
    }
}

// ========== 모달 관리 ==========
function closeSmartManualModal() {
    const modal = document.getElementById('smartManualModal');
    if (modal) {
        modal.remove();
    }
}

// ========== 진행 상황 표시 ==========
function showExtractionProgress(message) {
    const progressHTML = `
        <div class="extraction-progress" id="extractionProgress">
            <div class="progress-container">
                <div class="progress-spinner"></div>
                <div class="progress-message">${message}</div>
                <div class="progress-submessage">잠시만 기다려주세요...</div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', progressHTML);
}

function updateExtractionProgress(message) {
    const progressMessage = document.querySelector('.progress-message');
    if (progressMessage) {
        progressMessage.textContent = message;
    }
}

function hideExtractionProgress() {
    const progress = document.getElementById('extractionProgress');
    if (progress) {
        progress.remove();
    }
}

// ========== 빠른 알림 ==========
function showQuickAlert(message) {
    const alertHTML = `
        <div class="quick-alert" id="quickAlert">
            <div class="alert-content">${message}</div>
        </div>
    `;
    
    // 기존 알림 제거
    const existing = document.getElementById('quickAlert');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', alertHTML);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        const alert = document.getElementById('quickAlert');
        if (alert) alert.remove();
    }, 3000);
}

// ========== 추출 버튼 자동 추가 기능 ==========
function addExtractButtonToUrlFields() {
    const urlFields = document.querySelectorAll('input[type="text"], input[type="url"]');
    
    urlFields.forEach(field => {
        // URL 필드로 추정되는 경우에만 버튼 추가
        const fieldId = field.id || field.name || '';
        const placeholder = field.placeholder || '';
        
        if (fieldId.toLowerCase().includes('url') || 
            fieldId.toLowerCase().includes('link') || 
            fieldId.toLowerCase().includes('naver') ||
            placeholder.toLowerCase().includes('url') ||
            placeholder.toLowerCase().includes('naver')) {
            
            // 이미 버튼이 있는지 확인
            if (field.nextElementSibling && field.nextElementSibling.classList.contains('extract-btn')) {
                return;
            }
            
            // 추출 버튼 생성
            const extractBtn = document.createElement('button');
            extractBtn.type = 'button';
            extractBtn.className = 'extract-btn';
            extractBtn.innerHTML = '🔗 자동 가져오기';
            extractBtn.onclick = enhancedExtractStoreInfo;
            
            // 버튼 삽입
            field.parentNode.insertBefore(extractBtn, field.nextSibling);
            
            console.log(`✅ 추출 버튼 추가: ${fieldId}`);
        }
    });
}

// ========== 초기화 및 전역 함수 등록 ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM 로드 완료, 네이버 추출기 초기화');
    
    // 스타일 주입
    injectExtractorStyles();
    
    // URL 필드에 자동으로 추출 버튼 추가
    setTimeout(addExtractButtonToUrlFields, 1000);
});

// ========== 전역 함수 등록 ==========
window.extractStoreInfo = enhancedExtractStoreInfo;  // ✅ HTML에서 호출되는 함수명
window.enhancedExtractStoreInfo = enhancedExtractStoreInfo;
window.closeSmartManualModal = closeSmartManualModal;

console.log('✅ 진짜 최종 완전 버전 네이버 정보 추출 시스템 로드 완료 (모든 기능 + 스타일 + 백업 시스템)');
