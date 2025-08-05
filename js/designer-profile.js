// ========== 디자이너 프로필 관리 시스템 ==========

// 디자이너 프로필 모달 표시
function showDesignerProfile() {
    if (!currentDesigner) {
        alert('로그인이 필요합니다.');
        return;
    }

    const modalHTML = `
        <div class="designer-profile-modal" id="designerProfileModal">
            <div class="profile-container">
                <div class="profile-header">
                    <h3>👤 내 프로필 관리</h3>
                    <button class="profile-close" onclick="closeDesignerProfile()">×</button>
                </div>
                
                <div class="profile-tabs">
                    <div class="profile-tab active" onclick="switchProfileTab('basic')">📝 기본 정보</div>
                    <div class="profile-tab" onclick="switchProfileTab('booking')">🔗 네이버 예약</div>
                    <div class="profile-tab" onclick="switchProfileTab('salon')">🏢 사업장 정보</div>
                    <div class="profile-tab" onclick="switchProfileTab('services')">✂️ 서비스 가격</div>
                </div>
                
                <!-- 기본 정보 탭 -->
                <div id="profileBasic" class="profile-content active">
                    <div class="loading-profile">
                        <div class="spinner"></div>
                        <p>프로필 정보를 불러오는 중...</p>
                    </div>
                </div>
                
                <!-- 네이버 예약 탭 -->
                <div id="profileBooking" class="profile-content">
                    <div class="booking-url-section">
                        <div class="form-group">
                            <label class="form-label">🔗 네이버 예약 URL</label>
                            <input type="url" id="naverBookingUrl" class="form-input" 
                                   placeholder="https://naver.me/xU4BCGod">
                            <small style="color: #aaa; font-size: 12px;">
                                네이버 예약 단축 URL을 입력해주세요. 프로모션 메시지에 자동으로 포함됩니다.
                            </small>
                        </div>
                        
                        <div class="url-validation" id="urlValidation"></div>
                        
                        <div class="url-actions" id="urlActions" style="display: none;">
                            <button class="auto-fill-btn" onclick="autoExtractBusinessInfo()">
                                🤖 매장 정보 자동 가져오기
                            </button>
                            <button class="preview-btn" onclick="previewBookingUrl()">
                                👀 예약 페이지 미리보기
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 사업장 정보 탭 -->
                <div id="profileSalon" class="profile-content">
                    <div class="salon-info-form" id="salonInfoForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">🏢 매장명</label>
                                <input type="text" id="salonName" class="form-input" placeholder="헤어살롱 ABC">
                            </div>
                            <div class="form-group">
                                <label class="form-label">📱 매장 전화번호</label>
                                <input type="tel" id="salonPhone" class="form-input" placeholder="02-123-4567">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">📍 매장 주소</label>
                            <input type="text" id="salonAddress" class="form-input" 
                                   placeholder="서울시 강남구 테헤란로 123">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">🕐 영업 시작</label>
                                <input type="time" id="openTime" class="form-input" value="09:00">
                            </div>
                            <div class="form-group">
                                <label class="form-label">🕕 영업 종료</label>
                                <input type="time" id="closeTime" class="form-input" value="18:00">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">🚫 휴무일</label>
                            <div class="closed-days-selector">
                                <label class="day-checkbox">
                                    <input type="checkbox" value="sunday"> 일요일
                                </label>
                                <label class="day-checkbox">
                                    <input type="checkbox" value="monday"> 월요일
                                </label>
                                <label class="day-checkbox">
                                    <input type="checkbox" value="tuesday"> 화요일
                                </label>
                                <label class="day-checkbox">
                                    <input type="checkbox" value="wednesday"> 수요일
                                </label>
                                <label class="day-checkbox">
                                    <input type="checkbox" value="thursday"> 목요일
                                </label>
                                <label class="day-checkbox">
                                    <input type="checkbox" value="friday"> 금요일
                                </label>
                                <label class="day-checkbox">
                                    <input type="checkbox" value="saturday"> 토요일
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 서비스 가격 탭 -->
                <div id="profileServices" class="profile-content">
                    <div class="services-section">
                        <div class="services-header">
                            <h4>💰 서비스별 가격 설정</h4>
                            <button class="btn-sm btn-primary" onclick="addServicePrice()">+ 서비스 추가</button>
                        </div>
                        
                        <div class="services-list" id="servicesList">
                            <!-- 동적으로 생성 -->
                        </div>
                        
                        <div class="preset-services">
                            <h5>📋 빠른 추가</h5>
                            <div class="preset-buttons">
                                <button class="preset-btn" onclick="addPresetService('커트', 25000)">커트</button>
                                <button class="preset-btn" onclick="addPresetService('펌', 80000)">펌</button>
                                <button class="preset-btn" onclick="addPresetService('염색', 120000)">염색</button>
                                <button class="preset-btn" onclick="addPresetService('트리트먼트', 50000)">트리트먼트</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn-primary profile-save-btn" onclick="saveDesignerProfile()">
                        💾 저장
                    </button>
                    <button class="btn-secondary profile-cancel-btn" onclick="closeDesignerProfile()">
                        취소
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // URL 유효성 검사 이벤트 추가
    const urlInput = document.getElementById('naverBookingUrl');
    urlInput.addEventListener('input', validateNaverBookingUrl);
    
    // 프로필 데이터 로드
    loadDesignerProfile();
}

// 프로필 탭 전환
function switchProfileTab(tabName) {
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.profile-content').forEach(content => {
        content.classList.remove('active');
    });
    
    event.target.classList.add('active');
    document.getElementById(`profile${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
}

// 디자이너 프로필 데이터 로드
async function loadDesignerProfile() {
    if (!firebaseConnected || !currentDesigner) {
        showProfileError('Firebase 연결 또는 로그인이 필요합니다');
        return;
    }

    try {
        console.log('👤 디자이너 프로필 로드:', currentDesigner);
        
        const designerDoc = await db.collection('designers').doc(currentDesigner).get();
        
        if (!designerDoc.exists) {
            showProfileError('디자이너 정보를 찾을 수 없습니다');
            return;
        }
        
        const designerData = designerDoc.data();
        const profile = designerData.profile || {};
        
        console.log('📄 프로필 데이터:', profile);
        
        // 기본 정보 렌더링
        renderBasicProfile(designerData);
        
        // 네이버 예약 URL 설정
        if (profile.naverBookingUrl) {
            document.getElementById('naverBookingUrl').value = profile.naverBookingUrl;
            validateNaverBookingUrl({ target: { value: profile.naverBookingUrl } });
        }
        
        // 사업장 정보 설정
        if (profile.salonName) document.getElementById('salonName').value = profile.salonName;
        if (profile.salonPhone) document.getElementById('salonPhone').value = profile.salonPhone;
        if (profile.salonAddress) document.getElementById('salonAddress').value = profile.salonAddress;
        if (profile.openTime) document.getElementById('openTime').value = profile.openTime;
        if (profile.closeTime) document.getElementById('closeTime').value = profile.closeTime;
        
        // 휴무일 설정
        if (profile.closedDays && Array.isArray(profile.closedDays)) {
            profile.closedDays.forEach(day => {
                const checkbox = document.querySelector(`input[value="${day}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        // 서비스 가격 렌더링
        renderServicesList(profile.services || []);
        
    } catch (error) {
        console.error('❌ 프로필 로드 오류:', error);
        showProfileError('프로필 정보를 불러올 수 없습니다: ' + error.message);
    }
}

// 기본 정보 렌더링
function renderBasicProfile(designerData) {
    const basicContent = document.getElementById('profileBasic');
    
    const html = `
        <div class="basic-info-card">
            <div class="designer-avatar">
                <div class="avatar-circle">
                    ${designerData.name.charAt(0)}
                </div>
            </div>
            
            <div class="designer-details">
                <h4>${designerData.name} 디자이너</h4>
                <p><strong>가입일:</strong> ${formatDate(designerData.createdAt)}</p>
                <p><strong>마지막 로그인:</strong> ${formatDate(designerData.lastLogin)}</p>
                <p><strong>등록된 고객:</strong> ${designerData.customerCount || 0}명</p>
            </div>
            
            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-number">${designerData.customerCount || 0}</div>
                    <div class="stat-label">총 고객</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${getActivePromotions()}</div>
                    <div class="stat-label">진행 중 프로모션</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${getProfileCompletion(designerData.profile)}%</div>
                    <div class="stat-label">프로필 완성도</div>
                </div>
            </div>
        </div>
    `;
    
    basicContent.innerHTML = html;
}

// 프로필 완성도 계산
function getProfileCompletion(profile) {
    if (!profile) return 0;
    
    const fields = [
        'naverBookingUrl',
        'salonName', 
        'salonPhone',
        'salonAddress',
        'openTime',
        'closeTime',
        'services'
    ];
    
    let completed = 0;
    fields.forEach(field => {
        if (profile[field]) {
            if (field === 'services' && Array.isArray(profile[field]) && profile[field].length > 0) {
                completed++;
            } else if (field !== 'services' && profile[field]) {
                completed++;
            }
        }
    });
    
    return Math.round((completed / fields.length) * 100);
}

// 활성 프로모션 수 가져오기 (placeholder)
function getActivePromotions() {
    // TODO: 프로모션 시스템과 연동
    return 0;
}

// 네이버 예약 URL 유효성 검사
function validateNaverBookingUrl(event) {
    const url = event.target.value.trim();
    const validationDiv = document.getElementById('urlValidation');
    const actionsDiv = document.getElementById('urlActions');
    
    if (!url) {
        validationDiv.innerHTML = '';
        actionsDiv.style.display = 'none';
        return;
    }
    
    // 네이버 예약 URL 패턴 검사
    const naverBookingPatterns = [
        /^https:\/\/naver\.me\/[a-zA-Z0-9]+$/,
        /^https:\/\/booking\.naver\.com\/booking\/\d+/,
        /^https:\/\/m\.booking\.naver\.com\/booking\/\d+/
    ];
    
    const isValid = naverBookingPatterns.some(pattern => pattern.test(url));
    
    if (isValid) {
        validationDiv.innerHTML = `
            <div class="validation-success">
                ✅ 유효한 네이버 예약 URL입니다
                <div class="url-actions">
                    <button class="auto-fill-btn" onclick="autoExtractBusinessInfo()">
                        🤖 매장 정보 자동 가져오기
                    </button>
                    <button class="preview-btn" onclick="previewBookingUrl()">
                        👀 예약 페이지 미리보기
                    </button>
                </div>
            </div>
        `;
        actionsDiv.style.display = 'flex';
    } else {
        validationDiv.innerHTML = `
            <div class="validation-error">
                ❌ 올바른 네이버 예약 URL이 아닙니다<br>
                <small>지원 형식: https://naver.me/xxxxx 또는 https://booking.naver.com/booking/xxxxx</small>
            </div>
        `;
        actionsDiv.style.display = 'none';
    }
}

// 네이버 예약 페이지 자동 정보 추출
async function autoExtractBusinessInfo() {
    const url = document.getElementById('naverBookingUrl').value.trim();
    
    if (!url) {
        alert('먼저 네이버 예약 URL을 입력해주세요');
        return;
    }
    
    // 자동 추출 모달 표시
    const extractModalHTML = `
        <div class="auto-extract-modal" id="autoExtractModal">
            <div class="extract-content">
                <h3>🤖 네이버 예약 정보 자동 추출</h3>
                <div class="loading-spinner"></div>
                <p class="loading-text">매장 정보를 자동으로 가져오는 중</p>
                <small>잠시만 기다려주세요...</small>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', extractModalHTML);
    
    try {
        console.log('🤖 네이버 예약 정보 자동 추출 시작:', url);
        
        // CORS 우회를 위한 프록시 서버들
        const proxyUrls = [
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        
        let extractedInfo = null;
        
        for (const proxyUrl of proxyUrls) {
            try {
                console.log(`🔍 프록시 시도: ${proxyUrl}`);
                
                const response = await fetch(proxyUrl + encodeURIComponent(url));
                const data = await response.text();
                
                // HTML 파싱하여 정보 추출
                extractedInfo = parseBusinessInfo(data);
                
                if (extractedInfo) {
                    console.log('✅ 정보 추출 성공:', extractedInfo);
                    break;
                }
            } catch (proxyError) {
                console.log(`⚠️ 프록시 실패: ${proxyUrl}`, proxyError.message);
                continue;
            }
        }
        
        closeAutoExtractModal();
        
        if (extractedInfo) {
            showExtractedInfo(extractedInfo);
        } else {
            // 실패 시 시뮬레이션 데이터 제공
            showSimulatedExtraction();
        }
        
    } catch (error) {
        console.error('❌ 자동 추출 오류:', error);
        closeAutoExtractModal();
        showSimulatedExtraction();
    }
}

// HTML에서 비즈니스 정보 파싱
function parseBusinessInfo(html) {
    try {
        // 임시 DOM 생성
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // 다양한 선택자로 정보 추출 시도
        const selectors = {
            name: [
                'h1.place_name',
                '.business_name', 
                '.shop_name',
                '[data-testid="name"]',
                '.title'
            ],
            address: [
                '.address',
                '.location',
                '[data-testid="address"]',
                '.addr'
            ],
            phone: [
                '.phone',
                '.tel',
                '[data-testid="phone"]',
                '.contact'
            ]
        };
        
        const extractedInfo = {};
        
        Object.keys(selectors).forEach(key => {
            for (const selector of selectors[key]) {
                const element = doc.querySelector(selector);
                if (element && element.textContent.trim()) {
                    extractedInfo[key] = element.textContent.trim();
                    break;
                }
            }
        });
        
        return Object.keys(extractedInfo).length > 0 ? extractedInfo : null;
        
    } catch (error) {
        console.error('HTML 파싱 오류:', error);
        return null;
    }
}

// 시뮬레이션 추출 표시
function showSimulatedExtraction() {
    const simulatedInfo = {
        salonName: '헤어살롱 예시',
        salonAddress: '서울시 강남구 테헤란로 123',
        salonPhone: '02-1234-5678',
        openTime: '09:00',
        closeTime: '19:00',
        description: '최고의 서비스를 제공하는 프리미엄 헤어살롱'
    };
    
    const extractModalHTML = `
        <div class="auto-extract-modal" id="simulationModal">
            <div class="extract-content extraction-warning">
                <h3>⚠️ 자동 추출 제한</h3>
                <p>CORS 정책으로 인해 직접 추출이 제한됩니다.</p>
                <p>아래는 예시 정보입니다. 직접 수정해주세요:</p>
                
                <div class="extracted-info">
                    <div class="info-item">
                        <strong>매장명:</strong>
                        <span class="info-empty">직접 입력 필요</span>
                    </div>
                    <div class="info-item">
                        <strong>주소:</strong>
                        <span class="info-empty">직접 입력 필요</span>
                    </div>
                    <div class="info-item">
                        <strong>전화번호:</strong>
                        <span class="info-empty">직접 입력 필요</span>
                    </div>
                    <div class="info-item">
                        <strong>영업시간:</strong>
                        <span class="info-empty">직접 설정 필요</span>
                    </div>
                </div>
                
                <div class="extract-actions">
                    <button class="cancel-extract-btn" onclick="closeAutoExtractModal()">
                        확인
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', extractModalHTML);
}

// 추출된 정보 표시
function showExtractedInfo(info) {
    const extractModalHTML = `
        <div class="auto-extract-modal" id="extractedInfoModal">
            <div class="extract-content extraction-success">
                <h3>✅ 매장 정보 자동 추출 완료</h3>
                
                <div class="extracted-info">
                    <div class="info-item">
                        <strong>매장명:</strong>
                        <span class="info-highlight">${info.name || '정보 없음'}</span>
                    </div>
                    <div class="info-item">
                        <strong>주소:</strong>
                        <span>${info.address || '정보 없음'}</span>
                    </div>
                    <div class="info-item">
                        <strong>전화번호:</strong>
                        <span>${info.phone || '정보 없음'}</span>
                    </div>
                </div>
                
                <div class="extract-actions">
                    <button class="cancel-extract-btn" onclick="closeAutoExtractModal()">
                        취소
                    </button>
                    <button class="confirm-extract-btn" onclick="applyExtractedInfo('${JSON.stringify(info).replace(/'/g, "\\'")}')">
                        ✅ 자동 입력
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', extractModalHTML);
}

// 추출된 정보 적용
function applyExtractedInfo(infoJson) {
    try {
        const info = JSON.parse(infoJson);
        
        if (info.name) document.getElementById('salonName').value = info.name;
        if (info.address) document.getElementById('salonAddress').value = info.address;
        if (info.phone) document.getElementById('salonPhone').value = info.phone;
        
        closeAutoExtractModal();
        alert('✅ 매장 정보가 자동으로 입력되었습니다!');
        
        // 사업장 정보 탭으로 전환
        switchProfileTab('salon');
        
    } catch (error) {
        console.error('정보 적용 오류:', error);
        alert('정보 적용 중 오류가 발생했습니다.');
    }
}

// 자동 추출 모달 닫기
function closeAutoExtractModal() {
    const modals = ['autoExtractModal', 'extractedInfoModal', 'simulationModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    });
}

// 예약 페이지 미리보기
function previewBookingUrl() {
    const url = document.getElementById('naverBookingUrl').value.trim();
    
    if (!url) {
        alert('먼저 네이버 예약 URL을 입력해주세요');
        return;
    }
    
    window.open(url, '_blank');
}

// 서비스 가격 목록 렌더링
function renderServicesList(services) {
    const servicesList = document.getElementById('servicesList');
    
    if (!services || services.length === 0) {
        servicesList.innerHTML = `
            <div class="no-services">
                <p>등록된 서비스가 없습니다.</p>
                <p>아래 "빠른 추가" 버튼으로 서비스를 추가해보세요.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    services.forEach((service, index) => {
        html += `
            <div class="service-item">
                <div class="service-info">
                    <div class="service-name">${service.name}</div>
                    <div class="service-price">${formatPrice(service.price)}</div>
                </div>
                <div class="service-actions">
                    <button class="btn-sm btn-warning" onclick="editService(${index})">수정</button>
                    <button class="btn-sm btn-danger" onclick="removeService(${index})">삭제</button>
                </div>
            </div>
        `;
    });
    
    servicesList.innerHTML = html;
}

// 가격 포맷팅
function formatPrice(price) {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

// 서비스 추가
function addServicePrice() {
    const serviceHTML = `
        <div class="add-service-modal" id="addServiceModal">
            <div class="service-modal-content">
                <h4>✂️ 서비스 추가</h4>
                
                <div class="form-group">
                    <label class="form-label">서비스명</label>
                    <input type="text" id="newServiceName" class="form-input" placeholder="커트">
                </div>
                
                <div class="form-group">
                    <label class="form-label">가격 (원)</label>
                    <input type="number" id="newServicePrice" class="form-input" placeholder="25000">
                </div>
                
                <div class="service-modal-actions">
                    <button class="btn-secondary" onclick="closeServiceModal()">취소</button>
                    <button class="btn-primary" onclick="saveNewService()">추가</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', serviceHTML);
}

// 프리셋 서비스 추가
function addPresetService(name, price) {
    const currentServices = getCurrentServices();
    
    // 중복 체크
    if (currentServices.some(service => service.name === name)) {
        alert(`'${name}' 서비스가 이미 등록되어 있습니다.`);
        return;
    }
    
    currentServices.push({ name, price });
    renderServicesList(currentServices);
}

// 새 서비스 저장
function saveNewService() {
    const name = document.getElementById('newServiceName').value.trim();
    const price = parseInt(document.getElementById('newServicePrice').value);
    
    if (!name || !price || price < 0) {
        alert('서비스명과 가격을 올바르게 입력해주세요');
        return;
    }
    
    const currentServices = getCurrentServices();
    
    // 중복 체크
    if (currentServices.some(service => service.name === name)) {
        alert(`'${name}' 서비스가 이미 등록되어 있습니다.`);
        return;
    }
    
    currentServices.push({ name, price });
    renderServicesList(currentServices);
    closeServiceModal();
}

// 서비스 수정
function editService(index) {
    const currentServices = getCurrentServices();
    const service = currentServices[index];
    
    const serviceHTML = `
        <div class="add-service-modal" id="editServiceModal">
            <div class="service-modal-content">
                <h4>✂️ 서비스 수정</h4>
                
                <div class="form-group">
                    <label class="form-label">서비스명</label>
                    <input type="text" id="editServiceName" class="form-input" value="${service.name}">
                </div>
                
                <div class="form-group">
                    <label class="form-label">가격 (원)</label>
                    <input type="number" id="editServicePrice" class="form-input" value="${service.price}">
                </div>
                
                <div class="service-modal-actions">
                    <button class="btn-secondary" onclick="closeServiceModal()">취소</button>
                    <button class="btn-primary" onclick="updateService(${index})">수정</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', serviceHTML);
}

// 서비스 업데이트
function updateService(index) {
    const name = document.getElementById('editServiceName').value.trim();
    const price = parseInt(document.getElementById('editServicePrice').value);
    
    if (!name || !price || price < 0) {
        alert('서비스명과 가격을 올바르게 입력해주세요');
        return;
    }
    
    const currentServices = getCurrentServices();
    currentServices[index] = { name, price };
    renderServicesList(currentServices);
    closeServiceModal();
}

// 서비스 삭제
function removeService(index) {
    if (confirm('이 서비스를 삭제하시겠습니까?')) {
        const currentServices = getCurrentServices();
        currentServices.splice(index, 1);
        renderServicesList(currentServices);
    }
}

// 현재 서비스 목록 가져오기
function getCurrentServices() {
    const serviceItems = document.querySelectorAll('.service-item');
    const services = [];
    
    serviceItems.forEach(item => {
        const name = item.querySelector('.service-name').textContent;
        const priceText = item.querySelector('.service-price').textContent;
        const price = parseInt(priceText.replace(/[^0-9]/g, ''));
        
        services.push({ name, price });
    });
    
    return services;
}

// 서비스 모달 닫기
function closeServiceModal() {
    const modals = ['addServiceModal', 'editServiceModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    });
}

// 디자이너 프로필 저장
async function saveDesignerProfile() {
    if (!firebaseConnected || !currentDesigner) {
        alert('Firebase 연결 또는 로그인이 필요합니다');
        return;
    }
    
    try {
        console.log('💾 디자이너 프로필 저장 시작');
        
        // 폼 데이터 수집
        const profileData = {
            naverBookingUrl: document.getElementById('naverBookingUrl').value.trim(),
            salonName: document.getElementById('salonName').value.trim(),
            salonPhone: document.getElementById('salonPhone').value.trim(),
            salonAddress: document.getElementById('salonAddress').value.trim(),
            openTime: document.getElementById('openTime').value,
            closeTime: document.getElementById('closeTime').value,
            closedDays: getSelectedClosedDays(),
            services: getCurrentServices()
        };
        
        console.log('📄 저장할 프로필 데이터:', profileData);
        
        // Firebase에 저장
        await db.collection('designers').doc(currentDesigner).update({
            profile: profileData,
            updatedAt: new Date()
        });
        
        console.log('✅ 프로필 저장 완료');
        alert('✅ 프로필이 성공적으로 저장되었습니다!');
        closeDesignerProfile();
        
    } catch (error) {
        console.error('❌ 프로필 저장 오류:', error);
        alert('프로필 저장에 실패했습니다: ' + error.message);
    }
}

// 선택된 휴무일 가져오기
function getSelectedClosedDays() {
    const checkboxes = document.querySelectorAll('.day-checkbox input:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.value);
}

// 프로필 오류 표시
function showProfileError(message) {
    const basicContent = document.getElementById('profileBasic');
    basicContent.innerHTML = `
        <div class="profile-error">
            <div class="error-icon">⚠️</div>
            <div class="error-message">${message}</div>
        </div>
    `;
}

// 날짜 포맷팅
function formatDate(dateValue) {
    if (!dateValue) return '정보 없음';
    
    let date;
    if (dateValue.toDate) {
        date = dateValue.toDate();
    } else {
        date = new Date(dateValue);
    }
    
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// 디자이너 프로필 모달 닫기
function closeDesignerProfile() {
    const modal = document.getElementById('designerProfileModal');
    if (modal) {
        modal.remove();
    }
}

console.log('✅ designer-profile.js 로드 완료');
