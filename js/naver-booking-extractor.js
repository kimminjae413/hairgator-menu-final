// ========== 네이버 예약 자동 정보 추출 시스템 ==========

// 네이버 예약 API 설정 (제한적 - CORS 문제로 실제 크롤링은 어려움)
const NAVER_CONFIG = {
    // 네이버 비즈니스 API (실제로는 승인이 필요)
    CLIENT_ID: 'hairgator_client_id',
    CLIENT_SECRET: 'hairgator_client_secret',
    // 네이버 플레이스 API 기본 URL
    PLACE_API_URL: 'https://openapi.naver.com/v1/search/local.json',
    // 프록시 서버 URL (CORS 우회용 - 실제 서비스에서는 백엔드 필요)
    PROXY_URL: 'https://api.allorigins.win/get?url='
};

// 매장 정보 추출 상태
let extractionInProgress = false;

// 네이버 예약 URL에서 정보 추출 (메인 함수)
async function extractNaverBookingInfo(naverUrl) {
    if (!naverUrl || !naverUrl.includes('booking.naver.com')) {
        throw new Error('올바른 네이버 예약 URL이 아닙니다');
    }

    console.log('🔍 네이버 예약 정보 추출 시작:', naverUrl);
    
    extractionInProgress = true;
    showExtractionProgress();
    
    try {
        // 1단계: URL 유효성 검사 및 매장 ID 추출
        const storeId = extractStoreIdFromUrl(naverUrl);
        console.log('🏪 매장 ID 추출:', storeId);
        
        // 2단계: 네이버 플레이스 정보 조회 시도
        let storeInfo = null;
        try {
            storeInfo = await fetchNaverPlaceInfo(storeId, naverUrl);
            console.log('✅ 네이버 플레이스 정보 조회 성공:', storeInfo);
        } catch (error) {
            console.log('⚠️ 네이버 플레이스 API 조회 실패:', error.message);
            // API 실패 시 URL 파싱으로 대체
            storeInfo = await parseUrlForBasicInfo(naverUrl);
        }
        
        // 3단계: 추가 정보 보완 (공개 데이터)
        const enrichedInfo = await enrichStoreInfo(storeInfo, naverUrl);
        console.log('🎯 정보 보완 완료:', enrichedInfo);
        
        updateExtractionProgress(100, '추출 완료!');
        
        return enrichedInfo;
        
    } catch (error) {
        console.error('❌ 네이버 예약 정보 추출 실패:', error);
        updateExtractionProgress(0, '추출 실패: ' + error.message);
        throw error;
    } finally {
        extractionInProgress = false;
        setTimeout(hideExtractionProgress, 2000);
    }
}

// URL에서 매장 ID 추출
function extractStoreIdFromUrl(url) {
    try {
        // 네이버 예약 URL 패턴 분석
        // 예: https://booking.naver.com/booking/1/store/8776
        const match = url.match(/store\/(\d+)/);
        
        if (match && match[1]) {
            return match[1];
        }
        
        // 다른 패턴들도 시도
        const patterns = [
            /\/(\d+)$/,           // 끝에 오는 숫자
            /id=(\d+)/,           // id 파라미터
            /storeId=(\d+)/       // storeId 파라미터
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        throw new Error('URL에서 매장 ID를 찾을 수 없습니다');
        
    } catch (error) {
        throw new Error('URL 파싱 실패: ' + error.message);
    }
}

// 네이버 플레이스 정보 조회 (제한적)
async function fetchNaverPlaceInfo(storeId, originalUrl) {
    try {
        console.log('🌐 네이버 플레이스 API 조회 시도...');
        updateExtractionProgress(20, '네이버 API 조회 중...');
        
        // 실제 환경에서는 백엔드 서버를 통해 API 호출해야 함
        // 현재는 CORS 제한으로 직접 호출 불가능
        
        // 시뮬레이션: 실제로는 네이버 API 호출
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // CORS 우회 시도 (제한적)
        const proxyUrl = `${NAVER_CONFIG.PROXY_URL}${encodeURIComponent(originalUrl)}`;
        
        try {
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('네트워크 응답 오류');
            }
            
            const data = await response.json();
            
            // HTML 파싱하여 기본 정보 추출
            const extractedInfo = parseHtmlContent(data.contents);
            
            updateExtractionProgress(60, '정보 파싱 중...');
            return extractedInfo;
            
        } catch (fetchError) {
            console.log('🚫 CORS 우회 실패:', fetchError.message);
            throw new Error('네이버 서버 접근 제한 (CORS 정책)');
        }
        
    } catch (error) {
        throw new Error('네이버 플레이스 정보 조회 실패: ' + error.message);
    }
}

// HTML 콘텐츠에서 매장 정보 파싱
function parseHtmlContent(htmlContent) {
    try {
        console.log('📄 HTML 콘텐츠 파싱 중...');
        
        // 가상 DOM 생성하여 파싱
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // 매장 정보 추출 시도
        const storeInfo = {
            storeName: extractTextContent(doc, [
                'h1.place_name',
                '.tit_store',
                '.store_name',
                'h1'
            ]),
            
            address: extractTextContent(doc, [
                '.txt_address',
                '.store_address', 
                '.address',
                '[data-address]'
            ]),
            
            phone: extractTextContent(doc, [
                '.txt_phone',
                '.store_phone',
                '.phone',
                '[data-phone]'
            ]),
            
            businessHours: extractTextContent(doc, [
                '.txt_time',
                '.business_hours',
                '.hours',
                '.time_info'
            ]),
            
            description: extractTextContent(doc, [
                '.store_desc',
                '.description',
                '.intro',
                '.store_intro'
            ])
        };
        
        console.log('✅ HTML 파싱 결과:', storeInfo);
        return storeInfo;
        
    } catch (error) {
        console.error('HTML 파싱 오류:', error);
        return null;
    }
}

// CSS 선택자로 텍스트 추출
function extractTextContent(doc, selectors) {
    for (const selector of selectors) {
        try {
            const element = doc.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        } catch (error) {
            continue;
        }
    }
    return null;
}

// URL에서 기본 정보 파싱 (백업 방법)
async function parseUrlForBasicInfo(url) {
    console.log('🔧 URL 기반 기본 정보 추출...');
    updateExtractionProgress(40, 'URL 분석 중...');
    
    // URL 구조 분석으로 추정 가능한 정보
    const urlInfo = {
        originalUrl: url,
        storeId: extractStoreIdFromUrl(url),
        platform: 'naver_booking',
        extractedAt: new Date()
    };
    
    // 추가 정보는 사용자 입력으로 보완
    return urlInfo;
}

// 매장 정보 보완 (공개 데이터 활용)
async function enrichStoreInfo(basicInfo, originalUrl) {
    console.log('🎯 매장 정보 보완 중...');
    updateExtractionProgress(80, '정보 보완 중...');
    
    // 기본 구조 설정
    const enrichedInfo = {
        // 기본 정보
        storeName: basicInfo?.storeName || '매장명 확인 필요',
        address: basicInfo?.address || '주소 확인 필요',
        phone: basicInfo?.phone || '전화번호 확인 필요',
        
        // 운영 정보
        businessHours: basicInfo?.businessHours || '영업시간 확인 필요',
        closedDays: basicInfo?.closedDays || '휴무일 확인 필요',
        
        // 예약 정보
        naverBookingUrl: originalUrl,
        storeId: basicInfo?.storeId,
        bookingAvailable: true,
        
        // 부가 정보
        description: basicInfo?.description || '',
        services: generateDefaultServices(), // 기본 서비스 목록
        priceRange: '상담 후 결정',
        
        // 메타 정보
        extractedAt: new Date(),
        lastUpdated: new Date(),
        autoExtracted: true,
        needsVerification: true // 수동 확인 필요 플래그
    };
    
    // 추가 정보 보완 로직
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return enrichedInfo;
}

// 기본 서비스 목록 생성
function generateDefaultServices() {
    return [
        { name: '커트', price: 0, description: '가격 확인 필요' },
        { name: '펌', price: 0, description: '가격 확인 필요' },
        { name: '염색', price: 0, description: '가격 확인 필요' },
        { name: '트리트먼트', price: 0, description: '가격 확인 필요' }
    ];
}

// 매장 정보 검증 (사용자 확인용)
function validateExtractedInfo(extractedInfo) {
    console.log('✅ 추출된 정보 검증...');
    
    const validation = {
        storeName: {
            valid: extractedInfo.storeName && extractedInfo.storeName !== '매장명 확인 필요',
            confidence: extractedInfo.storeName?.length > 2 ? 'high' : 'low'
        },
        
        address: {
            valid: extractedInfo.address && extractedInfo.address !== '주소 확인 필요',
            confidence: extractedInfo.address?.includes('시') || extractedInfo.address?.includes('구') ? 'high' : 'low'
        },
        
        phone: {
            valid: extractedInfo.phone && /^[\d\-\s\(\)]+$/.test(extractedInfo.phone),
            confidence: extractedInfo.phone?.length >= 10 ? 'high' : 'low'
        },
        
        businessHours: {
            valid: extractedInfo.businessHours && extractedInfo.businessHours !== '영업시간 확인 필요',
            confidence: extractedInfo.businessHours?.includes(':') ? 'high' : 'low'
        }
    };
    
    const overallConfidence = Object.values(validation)
        .filter(v => v.valid)
        .length / Object.keys(validation).length;
    
    return {
        ...validation,
        overallConfidence,
        needsManualReview: overallConfidence < 0.7
    };
}

// 추출 진행률 표시
function showExtractionProgress() {
    const progressHTML = `
        <div class="extraction-progress-modal" id="extractionProgressModal">
            <div class="extraction-progress-container">
                <h3>🔍 네이버 예약 정보 추출 중</h3>
                
                <div class="extraction-progress-bar">
                    <div class="extraction-progress-fill" id="extractionProgressFill"></div>
                </div>
                
                <div class="extraction-progress-text">
                    <span id="extractionProgressPercent">0</span>%
                </div>
                
                <div class="extraction-status" id="extractionStatus">
                    URL 분석 중...
                </div>
                
                <div class="extraction-info">
                    <p>🔒 <strong>개인정보 보호:</strong> 공개된 정보만 수집합니다</p>
                    <p>⚠️ <strong>주의:</strong> CORS 정책으로 일부 정보는 수동 입력이 필요할 수 있습니다</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', progressHTML);
}

// 추출 진행률 업데이트
function updateExtractionProgress(percent, status) {
    const fillElement = document.getElementById('extractionProgressFill');
    const percentElement = document.getElementById('extractionProgressPercent');
    const statusElement = document.getElementById('extractionStatus');
    
    if (fillElement) fillElement.style.width = percent + '%';
    if (percentElement) percentElement.textContent = percent;
    if (statusElement) statusElement.textContent = status;
}

// 추출 진행률 숨기기
function hideExtractionProgress() {
    const modal = document.getElementById('extractionProgressModal');
    if (modal) {
        modal.remove();
    }
}

// 수동 정보 입력 모달 표시
function showManualInfoInput(extractedInfo, validationResult) {
    const modalHTML = `
        <div class="manual-info-modal" id="manualInfoModal">
            <div class="manual-info-container">
                <h3>📝 매장 정보 확인 및 수정</h3>
                
                <div class="extraction-summary">
                    <div class="summary-card ${validationResult.overallConfidence >= 0.7 ? 'success' : 'warning'}">
                        <div class="summary-title">
                            자동 추출 완료도: ${Math.round(validationResult.overallConfidence * 100)}%
                        </div>
                        <div class="summary-desc">
                            ${validationResult.needsManualReview ? 
                                '일부 정보가 불완전합니다. 아래에서 확인하고 수정해주세요.' : 
                                '대부분의 정보가 성공적으로 추출되었습니다.'}
                        </div>
                    </div>
                </div>
                
                <form id="manualInfoForm">
                    <div class="form-section">
                        <h4>🏪 기본 정보</h4>
                        
                        <div class="form-group ${validationResult.storeName.valid ? 'valid' : 'invalid'}">
                            <label class="form-label">
                                매장명 *
                                <span class="confidence ${validationResult.storeName.confidence}">${validationResult.storeName.confidence}</span>
                            </label>
                            <input type="text" id="manualStoreName" class="form-input" 
                                   value="${extractedInfo.storeName || ''}" required>
                        </div>
                        
                        <div class="form-group ${validationResult.address.valid ? 'valid' : 'invalid'}">
                            <label class="form-label">
                                주소 *
                                <span class="confidence ${validationResult.address.confidence}">${validationResult.address.confidence}</span>
                            </label>
                            <input type="text" id="manualAddress" class="form-input" 
                                   value="${extractedInfo.address || ''}" required>
                        </div>
                        
                        <div class="form-group ${validationResult.phone.valid ? 'valid' : 'invalid'}">
                            <label class="form-label">
                                전화번호 *
                                <span class="confidence ${validationResult.phone.confidence}">${validationResult.phone.confidence}</span>
                            </label>
                            <input type="tel" id="manualPhone" class="form-input" 
                                   value="${extractedInfo.phone || ''}" required>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>⏰ 운영 정보</h4>
                        
                        <div class="form-group">
                            <label class="form-label">영업시간</label>
                            <textarea id="manualBusinessHours" class="form-textarea" rows="3"
                                      placeholder="예: 월-금 09:00-18:00, 토 09:00-17:00">${extractedInfo.businessHours || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">휴무일</label>
                            <input type="text" id="manualClosedDays" class="form-input" 
                                   value="${extractedInfo.closedDays || ''}" placeholder="예: 일요일, 공휴일">
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>💰 서비스 정보</h4>
                        
                        <div class="services-list" id="manualServicesList">
                            ${extractedInfo.services.map((service, index) => `
                                <div class="service-item">
                                    <input type="text" class="service-name" placeholder="서비스명" 
                                           value="${service.name}" data-index="${index}">
                                    <input type="number" class="service-price" placeholder="가격" 
                                           value="${service.price}" data-index="${index}">
                                    <button type="button" class="btn-sm btn-danger" onclick="removeService(${index})">삭제</button>
                                </div>
                            `).join('')}
                        </div>
                        
                        <button type="button" class="btn-sm btn-secondary" onclick="addService()">+ 서비스 추가</button>
                    </div>
                    
                    <div class="form-section">
                        <h4>📝 기타 정보</h4>
                        
                        <div class="form-group">
                            <label class="form-label">매장 소개</label>
                            <textarea id="manualDescription" class="form-textarea" rows="3"
                                      placeholder="매장 특징, 전문 분야 등">${extractedInfo.description || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="manual-actions">
                        <button type="button" class="btn-secondary" onclick="closeManualInfo()">취소</button>
                        <button type="submit" class="btn-primary">💾 정보 저장</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 폼 제출 이벤트 추가
    document.getElementById('manualInfoForm').addEventListener('submit', saveManualInfo);
}

// 서비스 추가
function addService() {
    const servicesList = document.getElementById('manualServicesList');
    const index = servicesList.children.length;
    
    const serviceHTML = `
        <div class="service-item">
            <input type="text" class="service-name" placeholder="서비스명" data-index="${index}">
            <input type="number" class="service-price" placeholder="가격" data-index="${index}">
            <button type="button" class="btn-sm btn-danger" onclick="removeService(${index})">삭제</button>
        </div>
    `;
    
    servicesList.insertAdjacentHTML('beforeend', serviceHTML);
}

// 서비스 제거
function removeService(index) {
    const serviceItem = document.querySelector(`.service-item:nth-child(${index + 1})`);
    if (serviceItem) {
        serviceItem.remove();
    }
}

// 수동 정보 저장
function saveManualInfo(event) {
    event.preventDefault();
    
    try {
        // 폼 데이터 수집
        const manualData = {
            storeName: document.getElementById('manualStoreName').value.trim(),
            address: document.getElementById('manualAddress').value.trim(),
            phone: document.getElementById('manualPhone').value.trim(),
            businessHours: document.getElementById('manualBusinessHours').value.trim(),
            closedDays: document.getElementById('manualClosedDays').value.trim(),
            description: document.getElementById('manualDescription').value.trim(),
            services: collectServiceData(),
            naverBookingUrl: window.tempExtractionData?.originalUrl || '',
            lastUpdated: new Date(),
            manuallyVerified: true
        };
        
        // 유효성 검사
        if (!manualData.storeName || !manualData.address || !manualData.phone) {
            alert('매장명, 주소, 전화번호는 필수 입력 항목입니다.');
            return;
        }
        
        console.log('💾 수동 입력 정보 저장:', manualData);
        
        // 저장 완료 콜백 호출
        if (window.manualInfoSaveCallback) {
            window.manualInfoSaveCallback(manualData);
        }
        
        alert('✅ 매장 정보가 성공적으로 저장되었습니다!');
        closeManualInfo();
        
    } catch (error) {
        console.error('수동 정보 저장 오류:', error);
        alert('정보 저장 중 오류가 발생했습니다: ' + error.message);
    }
}

// 서비스 데이터 수집
function collectServiceData() {
    const services = [];
    const serviceItems = document.querySelectorAll('.service-item');
    
    serviceItems.forEach(item => {
        const name = item.querySelector('.service-name').value.trim();
        const price = parseInt(item.querySelector('.service-price').value) || 0;
        
        if (name) {
            services.push({
                name: name,
                price: price,
                description: price > 0 ? `${price.toLocaleString()}원` : '가격 문의'
            });
        }
    });
    
    return services;
}

// URL 유효성 검사 (공통 함수)
function validateNaverBookingUrl(url) {
    if (!url) {
        return { valid: false, error: 'URL을 입력해주세요' };
    }
    
    // 네이버 관련 URL 패턴들 확인
    const naverPatterns = [
        'booking.naver.com',
        'naver.me',
        'smartstore.naver.com',
        'map.naver.com'
    ];
    
    const isNaverUrl = naverPatterns.some(pattern => url.includes(pattern));
    
    if (!isNaverUrl) {
        return { valid: false, error: '네이버 관련 URL이 아닙니다' };
    }
    
    try {
        new URL(url);
        return { valid: true };
    } catch (error) {
        return { valid: false, error: '올바른 URL 형식이 아닙니다' };
    }
}

// 추출 정보 미리보기
function previewExtractionResult(extractedInfo, validationResult) {
    return `
        <div class="extraction-preview">
            <h4>🔍 추출 결과 미리보기</h4>
            
            <div class="preview-grid">
                <div class="preview-item">
                    <span class="preview-label">매장명:</span>
                    <span class="preview-value ${validationResult.storeName.valid ? 'valid' : 'invalid'}">
                        ${extractedInfo.storeName || '정보 없음'}
                    </span>
                </div>
                
                <div class="preview-item">
                    <span class="preview-label">주소:</span>
                    <span class="preview-value ${validationResult.address.valid ? 'valid' : 'invalid'}">
                        ${extractedInfo.address || '정보 없음'}
                    </span>
                </div>
                
                <div class="preview-item">
                    <span class="preview-label">전화번호:</span>
                    <span class="preview-value ${validationResult.phone.valid ? 'valid' : 'invalid'}">
                        ${extractedInfo.phone || '정보 없음'}
                    </span>
                </div>
                
                <div class="preview-item">
                    <span class="preview-label">영업시간:</span>
                    <span class="preview-value ${validationResult.businessHours.valid ? 'valid' : 'invalid'}">
                        ${extractedInfo.businessHours || '정보 없음'}
                    </span>
                </div>
            </div>
            
            <div class="preview-confidence">
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${validationResult.overallConfidence * 100}%"></div>
                </div>
                <div class="confidence-text">
                    신뢰도: ${Math.round(validationResult.overallConfidence * 100)}%
                </div>
            </div>
        </div>
    `;
}

// 모달 닫기 함수들
function closeManualInfo() {
    const modal = document.getElementById('manualInfoModal');
    if (modal) {
        modal.remove();
    }
    
    // 임시 데이터 정리
    delete window.tempExtractionData;
    delete window.manualInfoSaveCallback;
}

// 추출 테스트 함수 (개발/디버깅용)
async function testNaverExtraction() {
    const testUrls = [
        'https://booking.naver.com/booking/1/store/8776',
        'https://booking.naver.com/booking/2/store/12345',
        'https://booking.naver.com/booking/3/store/67890'
    ];
    
    console.log('🧪 네이버 예약 추출 테스트 시작...');
    
    for (const url of testUrls) {
        try {
            console.log(`테스트 URL: ${url}`);
            const result = await extractNaverBookingInfo(url);
            console.log('테스트 결과:', result);
        } catch (error) {
            console.error(`테스트 실패 (${url}):`, error.message);
        }
    }
    
    console.log('🧪 테스트 완료');
}

// 네이버 지도 API를 통한 추가 정보 조회 (보완 기능)
async function fetchNaverMapInfo(storeName, address) {
    try {
        console.log('🗺️ 네이버 지도 API 추가 정보 조회...');
        
        // 실제로는 네이버 지도 API 키가 필요
        const query = encodeURIComponent(`${storeName} ${address}`);
        
        // 시뮬레이션: 실제 환경에서는 서버사이드에서 호출해야 함
        const mockMapInfo = {
            coordinates: {
                lat: 37.5665,
                lng: 126.9780
            },
            roadAddress: address,
            category: '미용실',
            rating: null,
            reviewCount: null
        };
        
        return mockMapInfo;
        
    } catch (error) {
        console.error('네이버 지도 정보 조회 실패:', error);
        return null;
    }
}

// 추출된 정보를 Firebase에 저장
async function saveExtractedInfoToFirebase(extractedInfo, designerId) {
    if (!firebaseConnected) {
        throw new Error('Firebase 연결이 필요합니다');
    }
    
    try {
        console.log('💾 추출된 정보 Firebase 저장...');
        
        const storeData = {
            ...extractedInfo,
            designerId: designerId,
            createdAt: new Date(),
            source: 'naver_booking_extractor'
        };
        
        const docRef = await db.collection('extracted_stores').add(storeData);
        console.log('✅ Firebase 저장 완료:', docRef.id);
        
        return docRef.id;
        
    } catch (error) {
        console.error('Firebase 저장 실패:', error);
        throw new Error('정보 저장에 실패했습니다: ' + error.message);
    }
}

// 추출 이력 관리
async function getExtractionHistory(designerId) {
    if (!firebaseConnected) {
        return [];
    }
    
    try {
        const historySnapshot = await db.collection('extracted_stores')
            .where('designerId', '==', designerId)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        const history = [];
        historySnapshot.forEach(doc => {
            history.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return history;
        
    } catch (error) {
        console.error('추출 이력 조회 실패:', error);
        return [];
    }
}

// URL 자동 감지 및 추출 제안
function autoDetectNaverBookingUrl(text) {
    const naverBookingRegex = /https?:\/\/booking\.naver\.com[^\s]*/g;
    const matches = text.match(naverBookingRegex);
    
    if (matches && matches.length > 0) {
        return {
            detected: true,
            urls: matches,
            suggestion: `네이버 예약 URL이 감지되었습니다. 자동으로 매장 정보를 추출하시겠습니까?`
        };
    }
    
    return { detected: false };
}

// 추출 실패 시 대안 제공
function provideExtractionAlternatives(error, originalUrl) {
    const alternatives = {
        corsError: {
            title: 'CORS 정책으로 인한 접근 제한',
            description: '브라우저 보안 정책으로 직접 접근이 제한됩니다.',
            solutions: [
                '수동으로 정보 입력',
                '네이버 예약 페이지에서 복사/붙여넣기',
                '스크린샷을 참고하여 입력'
            ]
        },
        
        networkError: {
            title: '네트워크 연결 오류',
            description: '네이버 서버에 일시적으로 접근할 수 없습니다.',
            solutions: [
                '잠시 후 다시 시도',
                '인터넷 연결 확인',
                '수동 정보 입력으로 진행'
            ]
        },
        
        parseError: {
            title: '페이지 구조 변경',
            description: '네이버 예약 페이지의 구조가 변경되어 자동 추출이 어렵습니다.',
            solutions: [
                '수동으로 정보 입력',
                '업데이트된 추출기 대기',
                '기본 정보만 우선 입력'
            ]
        }
    };
    
    // 오류 유형 판단
    let errorType = 'parseError';
    if (error.message.includes('CORS')) errorType = 'corsError';
    if (error.message.includes('network') || error.message.includes('fetch')) errorType = 'networkError';
    
    return alternatives[errorType];
}

// 정보 추출 성공률 통계
function calculateExtractionStats(results) {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    
    const fieldStats = {
        storeName: results.filter(r => r.storeName && r.storeName !== '매장명 확인 필요').length,
        address: results.filter(r => r.address && r.address !== '주소 확인 필요').length,
        phone: results.filter(r => r.phone && r.phone !== '전화번호 확인 필요').length,
        businessHours: results.filter(r => r.businessHours && r.businessHours !== '영업시간 확인 필요').length
    };
    
    return {
        total,
        successful,
        failed,
        successRate: total > 0 ? (successful / total * 100).toFixed(1) : 0,
        fieldSuccessRates: {
            storeName: total > 0 ? (fieldStats.storeName / total * 100).toFixed(1) : 0,
            address: total > 0 ? (fieldStats.address / total * 100).toFixed(1) : 0,
            phone: total > 0 ? (fieldStats.phone / total * 100).toFixed(1) : 0,
            businessHours: total > 0 ? (fieldStats.businessHours / total * 100).toFixed(1) : 0
        }
    };
}

// 브라우저 호환성 체크
function checkBrowserCompatibility() {
    const compatibility = {
        fetch: typeof fetch !== 'undefined',
        domParser: typeof DOMParser !== 'undefined',
        promises: typeof Promise !== 'undefined',
        es6: true
    };
    
    try {
        new URL('https://example.com');
        compatibility.url = true;
    } catch (error) {
        compatibility.url = false;
    }
    
    const isCompatible = Object.values(compatibility).every(Boolean);
    
    return {
        ...compatibility,
        isCompatible,
        warnings: isCompatible ? [] : [
            '일부 브라우저에서는 정보 추출 기능이 제한될 수 있습니다.',
            '최신 브라우저 사용을 권장합니다.'
        ]
    };
}

// 사용자 가이드 표시
function showExtractionGuide() {
    const guideHTML = `
        <div class="extraction-guide-modal" id="extractionGuideModal">
            <div class="extraction-guide-container">
                <h3>📖 네이버 예약 정보 추출 가이드</h3>
                
                <div class="guide-section">
                    <h4>1️⃣ URL 준비</h4>
                    <ul>
                        <li>네이버에서 매장을 검색합니다</li>
                        <li>"예약" 버튼을 클릭하여 예약 페이지로 이동</li>
                        <li>주소창의 URL을 복사합니다</li>
                        <li>URL이 "booking.naver.com"으로 시작하는지 확인</li>
                    </ul>
                </div>
                
                <div class="guide-section">
                    <h4>2️⃣ 자동 추출</h4>
                    <ul>
                        <li>복사한 URL을 입력 필드에 붙여넣기</li>
                        <li>"정보 추출" 버튼 클릭</li>
                        <li>추출 진행 상황 확인</li>
                        <li>결과 검토 및 수정</li>
                    </ul>
                </div>
                
                <div class="guide-section">
                    <h4>3️⃣ 수동 보완</h4>
                    <ul>
                        <li>자동 추출이 실패하거나 불완전한 경우</li>
                        <li>직접 정보를 입력하거나 수정</li>
                        <li>네이버 예약 페이지에서 복사/붙여넣기 활용</li>
                        <li>나중에 언제든 수정 가능</li>
                    </ul>
                </div>
                
                <div class="guide-section warning">
                    <h4>⚠️ 주의사항</h4>
                    <ul>
                        <li>일부 브라우저에서는 보안 정책으로 제한될 수 있음</li>
                        <li>추출된 정보는 반드시 확인 후 사용</li>
                        <li>개인정보는 수집하지 않으며 공개 정보만 활용</li>
                        <li>네이버 서비스 약관을 준수하여 사용</li>
                    </ul>
                </div>
                
                <div class="guide-actions">
                    <button class="btn-primary" onclick="closeExtractionGuide()">확인</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', guideHTML);
}

// 가이드 모달 닫기
function closeExtractionGuide() {
    const modal = document.getElementById('extractionGuideModal');
    if (modal) {
        modal.remove();
    }
}

console.log('✅ naver-booking-extractor.js 로드 완료');
