// ========== 프로모션 관리 시스템 ==========

// 현재 프로모션 데이터
let currentPromotions = [];
let selectedDate = new Date();

// 프로모션 관리 모달 표시
function showPromotionManagement() {
    if (!currentDesigner) {
        alert('로그인이 필요합니다.');
        return;
    }

    const modalHTML = `
        <div class="promotion-management-modal" id="promotionManagementModal">
            <div class="promotion-container">
                <div class="promotion-header">
                    <h3>🎯 프로모션 관리</h3>
                    <button class="promotion-close" onclick="closePromotionManagement()">×</button>
                </div>
                
                <div class="promotion-tabs">
                    <div class="promotion-tab active" onclick="switchPromotionTab('calendar')">📅 캘린더</div>
                    <div class="promotion-tab" onclick="switchPromotionTab('list')">📋 목록</div>
                    <div class="promotion-tab" onclick="switchPromotionTab('create')">➕ 생성</div>
                    <div class="promotion-tab" onclick="switchPromotionTab('analytics')">📊 분석</div>
                </div>
                
                <!-- 캘린더 탭 -->
                <div id="promotionCalendar" class="promotion-content active">
                    <div class="calendar-controls">
                        <button class="btn-primary" onclick="createNewPromotion()">+ 새 프로모션</button>
                        <div class="calendar-info">
                            <span id="selectedDateInfo">오늘</span>의 프로모션
                        </div>
                    </div>
                    
                    <div class="promotion-calendar" id="promotionCalendarView">
                        <div class="loading-promotion">
                            <div class="spinner"></div>
                            <p>캘린더를 불러오는 중...</p>
                        </div>
                    </div>
                    
                    <div class="date-promotions" id="datePromotions">
                        <!-- 선택된 날짜의 프로모션들 -->
                    </div>
                </div>
                
                <!-- 목록 탭 -->
                <div id="promotionList" class="promotion-content">
                    <div class="list-controls">
                        <div class="filter-buttons">
                            <button class="filter-btn active" onclick="filterPromotions('all')">전체</button>
                            <button class="filter-btn" onclick="filterPromotions('active')">진행중</button>
                            <button class="filter-btn" onclick="filterPromotions('scheduled')">예정</button>
                            <button class="filter-btn" onclick="filterPromotions('ended')">종료</button>
                        </div>
                    </div>
                    
                    <div class="promotions-list" id="promotionsListView">
                        <div class="loading-promotion">
                            <div class="spinner"></div>
                            <p>프로모션 목록을 불러오는 중...</p>
                        </div>
                    </div>
                </div>
                
                <!-- 생성 탭 -->
                <div id="promotionCreate" class="promotion-content">
                    <div class="promotion-form">
                        <h4>🎯 새 프로모션 만들기</h4>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">프로모션명</label>
                                <input type="text" id="promotionName" class="form-input" 
                                       placeholder="봄맞이 특별 할인">
                            </div>
                            <div class="form-group">
                                <label class="form-label">프로모션 타입</label>
                                <select id="promotionType" class="form-select">
                                    <option value="discount">할인 이벤트</option>
                                    <option value="package">패키지 상품</option>
                                    <option value="new_customer">신규 고객 혜택</option>
                                    <option value="loyalty">단골 고객 혜택</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">시작일</label>
                                <input type="date" id="promotionStartDate" class="form-input">
                            </div>
                            <div class="form-group">
                                <label class="form-label">종료일</label>
                                <input type="date" id="promotionEndDate" class="form-input">
                            </div>
                        </div>
                        
                        <div class="services-discount-section">
                            <h5>✂️ 서비스별 할인 설정</h5>
                            <div id="servicesDiscountList">
                                <div class="loading-services">
                                    <p>서비스 목록을 불러오는 중...</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">대상 고객</label>
                            <select id="targetCustomers" class="form-select">
                                <option value="all">모든 고객</option>
                                <option value="new">신규 고객</option>
                                <option value="returning">재방문 고객</option>
                                <option value="inactive">장기 미방문 고객 (6주 이상)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">프로모션 설명</label>
                            <textarea id="promotionDescription" class="form-textarea" 
                                      placeholder="이번 주 한정 특별 혜택입니다!"></textarea>
                        </div>
                        
                        <div class="promotion-actions">
                            <button class="btn-primary" onclick="savePromotion()">💾 저장</button>
                            <button class="btn-secondary" onclick="resetPromotionForm()">🔄 초기화</button>
                        </div>
                    </div>
                </div>
                
                <!-- 분석 탭 -->
                <div id="promotionAnalytics" class="promotion-content">
                    <div class="analytics-summary">
                        <h4>📊 프로모션 성과 분석</h4>
                        
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-number" id="totalPromotions">0</div>
                                <div class="stat-label">총 프로모션</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" id="activePromotions">0</div>
                                <div class="stat-label">진행 중</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" id="totalNotifications">0</div>
                                <div class="stat-label">알림 발송 건수</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" id="averageClickRate">0%</div>
                                <div class="stat-label">평균 클릭률</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="recent-promotions">
                        <h5>📋 최근 프로모션 성과</h5>
                        <div id="recentPromotionsAnalytics">
                            <!-- 동적으로 생성 -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 오늘 날짜로 초기화
    selectedDate = new Date();
    
    // 프로모션 데이터 로드
    loadPromotionData();
}

// 프로모션 탭 전환
function switchPromotionTab(tabName) {
    document.querySelectorAll('.promotion-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.promotion-content').forEach(content => {
        content.classList.remove('active');
    });
    
    event.target.classList.add('active');
    document.getElementById(`promotion${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
    
    // 탭별 초기화
    if (tabName === 'create') {
        loadDesignerServices();
        initializePromotionForm();
    } else if (tabName === 'analytics') {
        loadPromotionAnalytics();
    }
}

// 프로모션 데이터 로드
async function loadPromotionData() {
    if (!firebaseConnected || !currentDesigner) {
        showPromotionError('Firebase 연결 또는 로그인이 필요합니다');
        return;
    }

    try {
        console.log('🎯 프로모션 데이터 로드:', currentDesigner);
        
        const promotionsSnapshot = await db.collection('promotions')
            .where('designerId', '==', currentDesigner)
            .orderBy('createdAt', 'desc')
            .get();
        
        currentPromotions = [];
        promotionsSnapshot.forEach(doc => {
            currentPromotions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('📋 로드된 프로모션:', currentPromotions.length + '개');
        
        // 캘린더 렌더링
        renderPromotionCalendar();
        
        // 목록 렌더링
        renderPromotionsList();
        
        // 선택된 날짜의 프로모션 표시
        showDatePromotions(selectedDate);
        
    } catch (error) {
        console.error('❌ 프로모션 데이터 로드 오류:', error);
        showPromotionError('프로모션 데이터를 불러올 수 없습니다: ' + error.message);
    }
}

// 프로모션 캘린더 렌더링
function renderPromotionCalendar() {
    const calendarView = document.getElementById('promotionCalendarView');
    const now = new Date();
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    // 달력 헤더
    const monthNames = [
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월'
    ];
    
    let html = `
        <div class="calendar-header">
            <button class="calendar-nav" onclick="changeMonth(-1)">‹</button>
            <div class="calendar-title">${year}년 ${monthNames[month]}</div>
            <button class="calendar-nav" onclick="changeMonth(1)">›</button>
        </div>
        
        <div class="calendar-grid">
            <div class="calendar-day-header">일</div>
            <div class="calendar-day-header">월</div>
            <div class="calendar-day-header">화</div>
            <div class="calendar-day-header">수</div>
            <div class="calendar-day-header">목</div>
            <div class="calendar-day-header">금</div>
            <div class="calendar-day-header">토</div>
    `;
    
    // 달력 날짜 생성
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    for (let i = 0; i < 42; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = currentDate.toDateString() === now.toDateString();
        const isSelected = currentDate.toDateString() === selectedDate.toDateString();
        const hasPromotion = hasPromotionOnDate(currentDate);
        
        let classes = ['calendar-day'];
        if (!isCurrentMonth) classes.push('other-month');
        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');
        if (hasPromotion) classes.push('has-promotion');
        
        html += `
            <div class="${classes.join(' ')}" 
                 onclick="selectCalendarDate('${currentDate.toISOString()}')">
                ${currentDate.getDate()}
            </div>
        `;
    }
    
    html += '</div>';
    calendarView.innerHTML = html;
}

// 특정 날짜에 프로모션이 있는지 확인
function hasPromotionOnDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    
    return currentPromotions.some(promotion => {
        const startDate = new Date(promotion.startDate).toISOString().split('T')[0];
        const endDate = new Date(promotion.endDate).toISOString().split('T')[0];
        
        return dateStr >= startDate && dateStr <= endDate;
    });
}

// 월 변경
function changeMonth(direction) {
    selectedDate.setMonth(selectedDate.getMonth() + direction);
    renderPromotionCalendar();
    showDatePromotions(selectedDate);
}

// 캘린더 날짜 선택
function selectCalendarDate(dateString) {
    selectedDate = new Date(dateString);
    renderPromotionCalendar();
    showDatePromotions(selectedDate);
}

// 선택된 날짜의 프로모션 표시
function showDatePromotions(date) {
    const datePromotions = document.getElementById('datePromotions');
    const selectedDateInfo = document.getElementById('selectedDateInfo');
    
    const dateStr = date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });
    
    selectedDateInfo.textContent = dateStr;
    
    const datePromotionsList = getPromotionsForDate(date);
    
    if (datePromotionsList.length === 0) {
        datePromotions.innerHTML = `
            <div class="no-promotions">
                <p>📅 ${dateStr}에 진행 중인 프로모션이 없습니다</p>
                <button class="btn-primary btn-sm" onclick="createPromotionForDate('${date.toISOString()}')">
                    이 날짜에 프로모션 만들기
                </button>
            </div>
        `;
        return;
    }
    
    let html = `<div class="date-promotions-list">`;
    
    datePromotionsList.forEach(promotion => {
        const status = getPromotionStatus(promotion);
        const canSendNotification = status === 'active';
        
        html += `
            <div class="promotion-card">
                <div class="promotion-header">
                    <div class="promotion-title">${promotion.name}</div>
                    <div class="promotion-status ${status}">${getStatusText(status)}</div>
                </div>
                
                <div class="promotion-details">
                    <p><strong>기간:</strong> ${formatDate(promotion.startDate)} ~ ${formatDate(promotion.endDate)}</p>
                    <p><strong>대상:</strong> ${getTargetText(promotion.targetCustomers)}</p>
                    <p><strong>서비스:</strong> ${getServicesText(promotion.services)}</p>
                </div>
                
                <div class="promotion-actions">
                    ${canSendNotification ? `
                        <button class="btn-sm btn-success" onclick="sendPromotionNotification('${promotion.id}')">
                            📱 알림 발송
                        </button>
                    ` : ''}
                    <button class="btn-sm btn-primary" onclick="editPromotion('${promotion.id}')">수정</button>
                    <button class="btn-sm btn-danger" onclick="deletePromotion('${promotion.id}')">삭제</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    datePromotions.innerHTML = html;
}

// 특정 날짜의 프로모션 가져오기
function getPromotionsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    
    return currentPromotions.filter(promotion => {
        const startDate = new Date(promotion.startDate).toISOString().split('T')[0];
        const endDate = new Date(promotion.endDate).toISOString().split('T')[0];
        
        return dateStr >= startDate && dateStr <= endDate;
    });
}

// 프로모션 상태 가져오기
function getPromotionStatus(promotion) {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);
    
    if (now < startDate) return 'scheduled';
    if (now > endDate) return 'ended';
    return 'active';
}

// 상태 텍스트 가져오기
function getStatusText(status) {
    const statusTexts = {
        active: '진행중',
        scheduled: '예정',
        ended: '종료'
    };
    return statusTexts[status] || status;
}

// 대상 고객 텍스트 가져오기
function getTargetText(target) {
    const targetTexts = {
        all: '모든 고객',
        new: '신규 고객',
        returning: '재방문 고객',
        inactive: '장기 미방문 고객'
    };
    return targetTexts[target] || target;
}

// 서비스 텍스트 가져오기
function getServicesText(services) {
    if (!services || services.length === 0) return '없음';
    
    return services.map(service => 
        `${service.name} ${service.discountType === 'percentage' ? service.discountValue + '%' : formatPrice(service.discountValue)} 할인`
    ).join(', ');
}

// 프로모션 목록 렌더링
function renderPromotionsList(filter = 'all') {
    const listView = document.getElementById('promotionsListView');
    
    let filteredPromotions = currentPromotions;
    
    if (filter !== 'all') {
        filteredPromotions = currentPromotions.filter(promotion => {
            return getPromotionStatus(promotion) === filter;
        });
    }
    
    if (filteredPromotions.length === 0) {
        listView.innerHTML = `
            <div class="no-promotions">
                <p>📋 ${filter === 'all' ? '등록된' : getStatusText(filter)} 프로모션이 없습니다</p>
                <button class="btn-primary btn-sm" onclick="switchPromotionTab('create')">
                    새 프로모션 만들기
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    filteredPromotions.forEach(promotion => {
        const status = getPromotionStatus(promotion);
        const canSendNotification = status === 'active';
        
        html += `
            <div class="promotion-card">
                <div class="promotion-header">
                    <div class="promotion-title">${promotion.name}</div>
                    <div class="promotion-status ${status}">${getStatusText(status)}</div>
                </div>
                
                <div class="promotion-details">
                    <p><strong>기간:</strong> ${formatDate(promotion.startDate)} ~ ${formatDate(promotion.endDate)}</p>
                    <p><strong>대상:</strong> ${getTargetText(promotion.targetCustomers)}</p>
                    <p><strong>설명:</strong> ${promotion.description || '설명 없음'}</p>
                    
                    ${promotion.services && promotion.services.length > 0 ? `
                        <div class="services-list">
                            <strong>할인 서비스:</strong>
                            ${promotion.services.map(service => `
                                <span class="service-tag">
                                    ${service.name} 
                                    ${service.discountType === 'percentage' ? 
                                        service.discountValue + '%' : 
                                        formatPrice(service.discountValue)} 할인
                                </span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="promotion-actions">
                    ${canSendNotification ? `
                        <button class="btn-sm btn-success" onclick="sendPromotionNotification('${promotion.id}')">
                            📱 알림 발송
                        </button>
                    ` : ''}
                    <button class="btn-sm btn-primary" onclick="editPromotion('${promotion.id}')">수정</button>
                    <button class="btn-sm btn-warning" onclick="duplicatePromotion('${promotion.id}')">복사</button>
                    <button class="btn-sm btn-danger" onclick="deletePromotion('${promotion.id}')">삭제</button>
                </div>
            </div>
        `;
    });
    
    listView.innerHTML = html;
}

// 프로모션 필터링
function filterPromotions(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderPromotionsList(filter);
}

// 디자이너 서비스 로드
async function loadDesignerServices() {
    try {
        const designerDoc = await db.collection('designers').doc(currentDesigner).get();
        
        if (!designerDoc.exists) {
            showServicesError('디자이너 정보를 찾을 수 없습니다');
            return;
        }
        
        const designerData = designerDoc.data();
        const services = designerData.profile?.services || [];
        
        renderServicesDiscountList(services);
        
    } catch (error) {
        console.error('서비스 로드 오류:', error);
        showServicesError('서비스 정보를 불러올 수 없습니다');
    }
}

// 서비스 할인 목록 렌더링
function renderServicesDiscountList(services) {
    const container = document.getElementById('servicesDiscountList');
    
    if (!services || services.length === 0) {
        container.innerHTML = `
            <div class="no-services-discount">
                <p>⚠️ 등록된 서비스가 없습니다</p>
                <p>프로필에서 서비스를 먼저 등록해주세요</p>
                <button class="btn-sm btn-primary" onclick="openProfileServices()">
                    서비스 등록하러 가기
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    services.forEach((service, index) => {
        html += `
            <div class="service-discount-item">
                <div class="service-info">
                    <label class="service-checkbox">
                        <input type="checkbox" class="service-check" value="${index}">
                        <span class="service-name">${service.name}</span>
                        <span class="service-original-price">(${formatPrice(service.price)})</span>
                    </label>
                </div>
                
                <div class="discount-controls">
                    <select class="discount-type-select" data-service="${index}">
                        <option value="percentage">% 할인</option>
                        <option value="fixed">정액 할인</option>
                    </select>
                    
                    <input type="number" class="discount-value-input" 
                           data-service="${index}" placeholder="20" min="1">
                    
                    <span class="discount-result" data-service="${index}">
                        → <span class="final-price">계산 중</span>
                    </span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // 할인 계산 이벤트 추가
    container.querySelectorAll('.service-check, .discount-type-select, .discount-value-input')
        .forEach(element => {
            element.addEventListener('change', calculateDiscountPrice);
            element.addEventListener('input', calculateDiscountPrice);
        });
}

// 할인가 계산
function calculateDiscountPrice(event) {
    const serviceIndex = event.target.dataset.service || event.target.value;
    const serviceItem = event.target.closest('.service-discount-item');
    
    if (!serviceItem) return;
    
    const checkbox = serviceItem.querySelector('.service-check');
    const typeSelect = serviceItem.querySelector('.discount-type-select');
    const valueInput = serviceItem.querySelector('.discount-value-input');
    const resultSpan = serviceItem.querySelector('.final-price');
    
    if (!checkbox.checked) {
        resultSpan.textContent = '선택되지 않음';
        return;
    }
    
    const discountType = typeSelect.value;
    const discountValue = parseFloat(valueInput.value) || 0;
    
    if (discountValue <= 0) {
        resultSpan.textContent = '할인값 입력 필요';
        return;
    }
    
    // 원본 가격 가져오기 (서비스 목록에서)
    const originalPriceText = serviceItem.querySelector('.service-original-price').textContent;
    const originalPrice = parseInt(originalPriceText.replace(/[^0-9]/g, ''));
    
    let finalPrice = originalPrice;
    
    if (discountType === 'percentage') {
        if (discountValue >= 100) {
            resultSpan.textContent = '100% 미만으로 입력';
            return;
        }
        finalPrice = originalPrice * (1 - discountValue / 100);
    } else {
        finalPrice = originalPrice - discountValue;
    }
    
    if (finalPrice < 0) {
        resultSpan.textContent = '할인가가 음수입니다';
        return;
    }
    
    resultSpan.textContent = formatPrice(Math.round(finalPrice));
    resultSpan.style.color = '#4CAF50';
}

// 프로필 서비스로 이동
function openProfileServices() {
    closePromotionManagement();
    showDesignerProfile();
    // 프로필 모달이 열린 후 서비스 탭으로 전환
    setTimeout(() => {
        switchProfileTab('services');
    }, 100);
}

// 프로모션 폼 초기화
function initializePromotionForm() {
    // 시작일을 오늘로 설정
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('promotionStartDate').value = today;
    
    // 종료일을 1주일 후로 설정
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('promotionEndDate').value = nextWeek.toISOString().split('T')[0];
}

// 새 프로모션 생성
function createNewPromotion() {
    switchPromotionTab('create');
}

// 특정 날짜에 프로모션 생성
function createPromotionForDate(dateString) {
    switchPromotionTab('create');
    
    const date = new Date(dateString);
    const dateStr = date.toISOString().split('T')[0];
    
    document.getElementById('promotionStartDate').value = dateStr;
    
    // 종료일을 시작일로부터 7일 후로 설정
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 7);
    document.getElementById('promotionEndDate').value = endDate.toISOString().split('T')[0];
}

// 프로모션 저장
async function savePromotion() {
    if (!firebaseConnected || !currentDesigner) {
        alert('Firebase 연결 또는 로그인이 필요합니다');
        return;
    }
    
    try {
        // 폼 데이터 수집
        const promotionData = {
            designerId: currentDesigner,
            designerName: currentDesignerName,
            name: document.getElementById('promotionName').value.trim(),
            type: document.getElementById('promotionType').value,
            startDate: document.getElementById('promotionStartDate').value,
            endDate: document.getElementById('promotionEndDate').value,
            targetCustomers: document.getElementById('targetCustomers').value,
            description: document.getElementById('promotionDescription').value.trim(),
            services: getSelectedServices(),
            createdAt: new Date(),
            notificationsSent: 0,
            clickCount: 0,
            conversionCount: 0
        };
        
        // 유효성 검사
        if (!promotionData.name || !promotionData.startDate || !promotionData.endDate) {
            alert('프로모션명, 시작일, 종료일을 입력해주세요');
            return;
        }
        
        if (new Date(promotionData.startDate) >= new Date(promotionData.endDate)) {
            alert('종료일은 시작일보다 늦어야 합니다');
            return;
        }
        
        if (promotionData.services.length === 0) {
            alert('최소 하나의 서비스를 선택해주세요');
            return;
        }
        
        console.log('💾 프로모션 저장:', promotionData);
        
        // Firebase에 저장
        const docRef = await db.collection('promotions').add(promotionData);
        
        console.log('✅ 프로모션 저장 완료:', docRef.id);
        alert('✅ 프로모션이 성공적으로 저장되었습니다!');
        
        // 데이터 새로고침
        await loadPromotionData();
        
        // 캘린더 탭으로 전환
        switchPromotionTab('calendar');
        
        // 폼 초기화
        resetPromotionForm();
        
    } catch (error) {
        console.error('❌ 프로모션 저장 오류:', error);
        alert('프로모션 저장에 실패했습니다: ' + error.message);
    }
}

// 선택된 서비스 가져오기
function getSelectedServices() {
    const selectedServices = [];
    const checkboxes = document.querySelectorAll('.service-check:checked');
    
    checkboxes.forEach(checkbox => {
        const serviceIndex = parseInt(checkbox.value);
        const serviceItem = checkbox.closest('.service-discount-item');
        
        const serviceName = serviceItem.querySelector('.service-name').textContent;
        const discountType = serviceItem.querySelector('.discount-type-select').value;
        const discountValue = parseFloat(serviceItem.querySelector('.discount-value-input').value) || 0;
        
        if (discountValue > 0) {
            selectedServices.push({
                name: serviceName,
                discountType: discountType,
                discountValue: discountValue
            });
        }
    });
    
    return selectedServices;
}

// 프로모션 폼 리셋
function resetPromotionForm() {
    document.getElementById('promotionName').value = '';
    document.getElementById('promotionType').value = 'discount';
    document.getElementById('targetCustomers').value = 'all';
    document.getElementById('promotionDescription').value = '';
    
    initializePromotionForm();
    
    // 체크박스 및 할인 설정 초기화
    document.querySelectorAll('.service-check').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    document.querySelectorAll('.discount-value-input').forEach(input => {
        input.value = '';
    });
    
    document.querySelectorAll('.final-price').forEach(span => {
        span.textContent = '선택되지 않음';
        span.style.color = '';
    });
}

// 프로모션 알림 발송
async function sendPromotionNotification(promotionId) {
    if (typeof sendKakaoNotification === 'function') {
        await sendKakaoNotification(promotionId);
    } else {
        alert('알림 시스템을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
}

// 프로모션 수정
function editPromotion(promotionId) {
    // TODO: 프로모션 수정 기능 구현
    alert('프로모션 수정 기능은 곧 추가될 예정입니다.');
}

// 프로모션 복사
function duplicatePromotion(promotionId) {
    // TODO: 프로모션 복사 기능 구현
    alert('프로모션 복사 기능은 곧 추가될 예정입니다.');
}

// 프로모션 삭제
async function deletePromotion(promotionId) {
    if (!confirm('이 프로모션을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await db.collection('promotions').doc(promotionId).delete();
        alert('✅ 프로모션이 삭제되었습니다');
        
        // 데이터 새로고침
        await loadPromotionData();
        
    } catch (error) {
        console.error('프로모션 삭제 오류:', error);
        alert('프로모션 삭제에 실패했습니다: ' + error.message);
    }
}

// 프로모션 분석 로드
function loadPromotionAnalytics() {
    // 통계 계산
    const total = currentPromotions.length;
    const active = currentPromotions.filter(p => getPromotionStatus(p) === 'active').length;
    const totalNotifications = currentPromotions.reduce((sum, p) => sum + (p.notificationsSent || 0), 0);
    const totalClicks = currentPromotions.reduce((sum, p) => sum + (p.clickCount || 0), 0);
    const averageClickRate = totalNotifications > 0 ? Math.round((totalClicks / totalNotifications) * 100) : 0;
    
    // 통계 업데이트
    document.getElementById('totalPromotions').textContent = total;
    document.getElementById('activePromotions').textContent = active;
    document.getElementById('totalNotifications').textContent = totalNotifications;
    document.getElementById('averageClickRate').textContent = averageClickRate + '%';
    
    // 최근 프로모션 성과 표시
    renderRecentPromotionsAnalytics();
}

// 최근 프로모션 분석 렌더링
function renderRecentPromotionsAnalytics() {
    const container = document.getElementById('recentPromotionsAnalytics');
    const recentPromotions = currentPromotions.slice(0, 5);
    
    if (recentPromotions.length === 0) {
        container.innerHTML = `
            <div class="no-analytics">
                <p>📊 분석할 프로모션이 없습니다</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    recentPromotions.forEach(promotion => {
        const status = getPromotionStatus(promotion);
        const clickRate = promotion.notificationsSent > 0 ? 
            Math.round((promotion.clickCount || 0) / promotion.notificationsSent * 100) : 0;
        
        html += `
            <div class="analytics-item">
                <div class="analytics-info">
                    <div class="analytics-name">${promotion.name}</div>
                    <div class="analytics-period">${formatDate(promotion.startDate)} ~ ${formatDate(promotion.endDate)}</div>
                </div>
                
                <div class="analytics-metrics">
                    <div class="metric">
                        <span class="metric-value">${promotion.notificationsSent || 0}</span>
                        <span class="metric-label">발송</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">${promotion.clickCount || 0}</span>
                        <span class="metric-label">클릭</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">${clickRate}%</span>
                        <span class="metric-label">클릭률</span>
                    </div>
                </div>
                
                <div class="analytics-status ${status}">${getStatusText(status)}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 프로모션 오류 표시
function showPromotionError(message) {
    console.error('프로모션 오류:', message);
}

// 서비스 오류 표시
function showServicesError(message) {
    const container = document.getElementById('servicesDiscountList');
    container.innerHTML = `
        <div class="services-error">
            <p>⚠️ ${message}</p>
        </div>
    `;
}

// 가격 포맷팅 (공통 함수)
function formatPrice(price) {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
}

// 날짜 포맷팅 (공통 함수)
function formatDate(dateValue) {
    if (!dateValue) return '날짜 없음';
    
    const date = new Date(dateValue);
    return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
    });
}

// 프로모션 관리 모달 닫기
function closePromotionManagement() {
    const modal = document.getElementById('promotionManagementModal');
    if (modal) {
        modal.remove();
    }
}

console.log('✅ promotion-manager.js 로드 완료');
