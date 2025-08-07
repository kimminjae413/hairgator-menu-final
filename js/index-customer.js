// ========== HAIRGATOR 최적화된 고객 관리 기능 ========== 
console.log('👤 고객 관리 시스템 최적화 로드 시작...');

// ========== 전역 변수 ========== 
let newCustomerData = {
    name: '',
    phone: '',
    gender: '',
    category: '',
    style: null
};

// 검색 성능 최적화를 위한 캐시
let customerSearchCache = new Map();
let lastSearchTerm = '';

// ========== 고객 검색 기능 ========== 
function showCustomerSearch() {
    const modalHTML = `
        <div class="customer-search-modal" id="customerSearchModal">
            <div class="search-container">
                <h3>👤 고객 조회</h3>
                
                <div class="search-input">
                    <input type="text" id="customerSearchInput" 
                           placeholder="이름 또는 전화번호로 검색 (예: 010-1234-5678)"
                           autocomplete="off">
                    <button onclick="searchCustomers()">🔍</button>
                </div>
                
                <div id="customerSearchResults"></div>
                
                <button class="close-search" onclick="closeCustomerSearch()">닫기</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 검색 입력 시 실시간 검색
    const searchInput = document.getElementById('customerSearchInput');
    searchInput.addEventListener('input', debounce(searchCustomers, 300));
    searchInput.focus();
    
    closeHamburgerMenu();
}

// 최적화된 고객 검색 실행
async function searchCustomers() {
    const searchTerm = document.getElementById('customerSearchInput').value.trim();
    const resultsDiv = document.getElementById('customerSearchResults');
    
    if (!searchTerm || !currentDesigner) {
        resultsDiv.innerHTML = '<div class="no-results">검색어를 입력해주세요</div>';
        return;
    }
    
    // 같은 검색어면 캐시 사용
    if (searchTerm === lastSearchTerm && customerSearchCache.has(searchTerm)) {
        showSearchResults(customerSearchCache.get(searchTerm));
        return;
    }
    
    resultsDiv.innerHTML = '<div class="loading">🔍 검색 중...</div>';
    
    try {
        // Firebase 쿼리 최적화 - 인덱스 순서 맞춤
        const customersSnapshot = await db.collection('customers')
            .where('designerId', '==', currentDesigner)
            .orderBy('createdAt', 'desc')
            .limit(50) // 최대 50개 결과로 제한
            .get();
        
        const matchedCustomers = [];
        const searchLower = searchTerm.toLowerCase();
        
        customersSnapshot.forEach(doc => {
            const data = doc.data();
            // 대소문자 구분 없이 검색
            const nameMatch = data.customerName.toLowerCase().includes(searchLower);
            const phoneMatch = data.phoneNumber.includes(searchTerm) ||
                             data.phoneNumber.replace(/-/g, '').includes(searchTerm.replace(/-/g, ''));
            
            if (nameMatch || phoneMatch) {
                matchedCustomers.push({
                    id: doc.id, 
                    ...data,
                    visitCount: data.visitHistory?.length || 0
                });
            }
        });
        
        // 방문 횟수 순으로 정렬
        matchedCustomers.sort((a, b) => b.visitCount - a.visitCount);
        
        // 캐시에 저장
        customerSearchCache.set(searchTerm, matchedCustomers);
        lastSearchTerm = searchTerm;
        
        showSearchResults(matchedCustomers);
        
    } catch (error) {
        console.error('고객 검색 오류:', error);
        resultsDiv.innerHTML = '<div class="no-results">❌ 검색 중 오류가 발생했습니다</div>';
    }
}

// 검색 결과 표시 (최적화)
function showSearchResults(customers) {
    const resultsDiv = document.getElementById('customerSearchResults');
    
    if (customers.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">🔍 검색 결과가 없습니다</div>';
        return;
    }
    
    const resultsHTML = customers.map(customer => `
        <div class="customer-result" onclick="showCustomerDetail('${customer.id}')">
            <div class="customer-info">
                <strong>${customer.customerName}</strong>
                <span class="phone">${formatPhoneDisplay(customer.phoneNumber)}</span>
            </div>
            <div class="customer-stats">
                <span class="visit-count">${customer.visitCount}회 방문</span>
                <span class="last-visit">${formatLastVisit(customer.visitHistory)}</span>
            </div>
        </div>
    `).join('');
    
    resultsDiv.innerHTML = resultsHTML;
}

// ========== 고객 상세 정보 ========== 
async function showCustomerDetail(customerId) {
    try {
        // 로딩 표시
        const loadingModal = `
            <div class="customer-detail-modal" id="customerDetailModal">
                <div class="detail-container">
                    <div class="loading">👤 고객 정보 로딩 중...</div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingModal);
        
        const customerDoc = await db.collection('customers').doc(customerId).get();
        
        if (!customerDoc.exists) {
            alert('고객 정보를 찾을 수 없습니다');
            closeCustomerDetail();
            return;
        }
        
        const customerData = customerDoc.data();
        
        const detailHTML = `
            <div class="customer-detail-modal" id="customerDetailModal">
                <div class="detail-container">
                    <div class="customer-header">
                        <h3>👤 ${customerData.customerName}</h3>
                        <div class="customer-phone">${formatPhoneDisplay(customerData.phoneNumber)}</div>
                        <button onclick="closeCustomerDetail()" class="close-detail-btn">×</button>
                    </div>
                    
                    <div class="customer-summary">
                        <div class="summary-item">
                            <span class="label">총 방문</span>
                            <span class="value">${customerData.visitHistory?.length || 0}회</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">첫 방문</span>
                            <span class="value">${formatDate(customerData.createdAt)}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">좋아하는 스타일</span>
                            <span class="value">${customerData.favoriteStyles?.length || 0}개</span>
                        </div>
                    </div>
                    
                    <div class="visit-history">
                        <h4>📅 방문 기록</h4>
                        ${renderOptimizedVisitHistory(customerData.visitHistory || [])}
                    </div>
                    
                    <div class="favorite-styles">
                        <h4>❤️ 좋아하는 스타일</h4>
                        ${renderOptimizedFavoriteStyles(customerData.favoriteStyles || [])}
                    </div>
                </div>
            </div>
        `;
        
        // 기존 모달 제거 후 새로운 모달 삽입
        closeCustomerDetail();
        document.body.insertAdjacentHTML('beforeend', detailHTML);
        
    } catch (error) {
        console.error('고객 상세 조회 오류:', error);
        alert('고객 정보를 불러올 수 없습니다.');
        closeCustomerDetail();
    }
}

// 최적화된 방문 기록 렌더링
function renderOptimizedVisitHistory(visitHistory) {
    if (visitHistory.length === 0) {
        return `
            <div class="no-history">
                <div class="empty-icon">📝</div>
                <div class="empty-text">방문 기록이 없습니다</div>
            </div>
        `;
    }
    
    // 최근 10개 방문만 표시 (성능 최적화)
    const recentVisits = visitHistory
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    
    return recentVisits.map((visit, index) => `
        <div class="visit-item ${index === 0 ? 'latest' : ''}">
            <div class="visit-date">${formatDate(visit.date)}</div>
            <div class="visit-details">
                <div class="visit-gender-category">
                    <span class="gender ${visit.gender}">${visit.gender === 'male' ? '👨' : '👩'}</span>
                    <span class="category">${visit.mainCategory}</span>
                    ${visit.subCategory ? `<span class="subcategory">${visit.subCategory}</span>` : ''}
                </div>
                <div class="visit-style">
                    <span class="style-code">${visit.styleCode || 'N/A'}</span>
                    <span class="style-name">${visit.styleName || 'N/A'}</span>
                </div>
            </div>
            ${visit.notes ? `<div class="visit-notes">"${visit.notes}"</div>` : ''}
        </div>
    `).join('');
}

// 최적화된 즐겨찾는 스타일 렌더링
function renderOptimizedFavoriteStyles(favoriteStyles) {
    if (favoriteStyles.length === 0) {
        return `
            <div class="no-history">
                <div class="empty-icon">❤️</div>
                <div class="empty-text">좋아하는 스타일이 없습니다</div>
            </div>
        `;
    }
    
    return favoriteStyles.map(style => `
        <div class="favorite-style-item">
            <div class="style-code">${style.code}</div>
            <div class="style-name">${style.name}</div>
            <div class="style-heart">❤️</div>
        </div>
    `).join('');
}

// ========== 새 고객 등록 (단계별) ========== 
function showNewCustomerModal() {
    const modalHTML = `
        <div class="new-customer-modal" id="newCustomerModal">
            <div class="new-customer-container">
                <div class="modal-header">
                    <h3>✨ 새 고객 등록</h3>
                    <button onclick="closeNewCustomerModal()" class="close-btn">×</button>
                </div>
                
                <!-- 단계 표시기 -->
                <div class="step-progress">
                    <div class="step active" data-step="1">
                        <div class="step-number">1</div>
                        <div class="step-label">기본정보</div>
                    </div>
                    <div class="step" data-step="2">
                        <div class="step-number">2</div>
                        <div class="step-label">완료</div>
                    </div>
                </div>
                
                <!-- 단계 1: 기본 정보만 -->
                <div id="customerStep1" class="customer-step active">
                    <div class="step-content">
                        <div class="customer-input-group">
                            <label>👤 고객 이름</label>
                            <input type="text" id="newCustomerName" placeholder="홍길동" autocomplete="name">
                        </div>
                        
                        <div class="customer-input-group">
                            <label>📱 전화번호</label>
                            <input type="tel" id="newCustomerPhone" placeholder="010-1234-5678" 
                                   maxlength="13" autocomplete="tel">
                            <small>하이픈(-)을 포함하여 입력해주세요</small>
                        </div>
                        
                        <div class="info-notice">
                            💡 <strong>간편 등록</strong><br>
                            기본 정보만 입력하시면 됩니다.<br>
                            스타일 선택은 나중에 헤어스타일을 보여주실 때 하세요!
                        </div>
                    </div>
                    
                    <div class="customer-buttons">
                        <button class="cancel-customer-btn" onclick="closeNewCustomerModal()">취소</button>
                        <button class="save-customer-btn" onclick="saveSimpleCustomer()">💾 등록 완료</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 전화번호 자동 포맷팅
    const phoneInput = document.getElementById('newCustomerPhone');
    phoneInput.addEventListener('input', formatPhoneNumberInput);
    
    // 첫 번째 입력 필드에 포커스
    document.getElementById('newCustomerName').focus();
}

// 간단한 고객 등록 (기본 정보만)
async function saveSimpleCustomer() {
    const name = document.getElementById('newCustomerName').value.trim();
    const phone = document.getElementById('newCustomerPhone').value.trim();
    
    if (!name || !validatePhoneNumber(phone)) {
        showErrorMessage('이름과 전화번호를 정확히 입력해주세요');
        return;
    }
    
    if (!firebaseConnected) {
        showErrorMessage('Firebase 연결이 필요합니다. 새로고침 후 다시 시도해주세요');
        return;
    }
    
    // 중복 확인용 ID
    const customerId = generateCustomerId(currentDesigner, name, phone);
    
    try {
        showLoadingInModal('💾 고객 등록 중...');
        
        // 중복 고객 확인
        const existingCustomer = await db.collection('customers').doc(customerId).get();
        
        if (existingCustomer.exists) {
            showErrorMessage('이미 등록된 고객입니다');
            return;
        }
        
        // 새 고객 등록
        await db.collection('customers').doc(customerId).set({
            designerId: currentDesigner,
            designerName: currentDesignerName,
            customerName: name,
            phoneNumber: phone,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            visitHistory: [],
            favoriteStyles: [],
            totalVisits: 0
        });
        
        console.log('✅ 간단 고객 등록 완료:', name);
        
        // 디자이너 고객 수 증가 (배치 처리)
        incrementDesignerCustomerCount();
        
        showSuccessMessage(`✅ ${name}님이 등록되었습니다!`);
        closeNewCustomerModal();
        
        // 검색 캐시 초기화
        customerSearchCache.clear();
        
    } catch (error) {
        console.error('❌ 간단 고객 등록 오류:', error);
        showErrorMessage(getFirebaseErrorMessage(error));
    }
}

// ========== 스타일과 함께 고객 등록 (기존 기능) ========== 
function showCustomerRegisterModal() {
    if (!selectedStyleCode || !selectedStyleName) {
        showErrorMessage('스타일을 먼저 선택해주세요');
        return;
    }

    const modalHTML = `
        <div class="customer-register-modal" id="customerRegisterModal">
            <div class="register-container">
                <div class="modal-header">
                    <h3>👤 고객 등록</h3>
                    <button onclick="closeCustomerRegisterModal()" class="close-btn">×</button>
                </div>
                
                <div class="selected-style-info">
                    <h4>✂️ 선택된 스타일</h4>
                    <div class="style-details">
                        <div class="detail-item">
                            <span class="label">성별:</span>
                            <span class="value">${currentGender === 'male' ? '👨 남성' : '👩 여성'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">카테고리:</span>
                            <span class="value">${currentCategory}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">스타일:</span>
                            <span class="value">${selectedStyleCode} - ${selectedStyleName}</span>
                        </div>
                    </div>
                </div>
                
                <div class="customer-input-group">
                    <label>👤 고객 이름</label>
                    <input type="text" id="registerCustomerName" placeholder="홍길동" autocomplete="name">
                </div>
                
                <div class="customer-input-group">
                    <label>📱 전화번호</label>
                    <input type="tel" id="registerCustomerPhone" placeholder="010-1234-5678" 
                           maxlength="13" autocomplete="tel">
                    <small>하이픈(-)을 포함하여 입력해주세요</small>
                </div>
                
                <div class="customer-buttons">
                    <button class="cancel-customer-btn" onclick="closeCustomerRegisterModal()">취소</button>
                    <button class="save-customer-btn" onclick="registerCustomerWithStyle()">💾 등록</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 전화번호 자동 포맷팅
    const phoneInput = document.getElementById('registerCustomerPhone');
    phoneInput.addEventListener('input', formatPhoneNumberInput);
    
    // 이미지 모달 숨기기
    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
        imageModal.style.display = 'none';
    }
    
    // 첫 번째 입력 필드에 포커스
    document.getElementById('registerCustomerName').focus();
}

// 스타일과 함께 고객 등록 (최적화)
async function registerCustomerWithStyle() {
    const name = document.getElementById('registerCustomerName').value.trim();
    const phone = document.getElementById('registerCustomerPhone').value.trim();
    
    if (!name || !validatePhoneNumber(phone)) {
        showErrorMessage('이름과 전화번호를 정확히 입력해주세요');
        return;
    }
    
    if (!firebaseConnected) {
        showErrorMessage('Firebase 연결이 필요합니다');
        return;
    }
    
    const customerId = generateCustomerId(currentDesigner, name, phone);
    
    try {
        showLoadingInModal('💾 고객 등록 중...');
        
        const visitData = {
            date: firebase.firestore.FieldValue.serverTimestamp(),
            gender: currentGender,
            mainCategory: currentCategory,
            subCategory: getCurrentSubCategory(),
            styleCode: selectedStyleCode,
            styleName: selectedStyleName,
            imageUrl: getSelectedStyleImage() || '',
            designerName: currentDesignerName
        };

        const existingCustomer = await db.collection('customers').doc(customerId).get();
        
        if (existingCustomer.exists) {
            // 기존 고객 - 방문 기록 추가
            await db.collection('customers').doc(customerId).update({
                visitHistory: firebase.firestore.FieldValue.arrayUnion(visitData),
                totalVisits: firebase.firestore.FieldValue.increment(1)
            });
            
            showSuccessMessage(`✅ ${name}님의 방문 기록이 추가되었습니다!`);
        } else {
            // 신규 고객 - 새로 등록
            await db.collection('customers').doc(customerId).set({
                designerId: currentDesigner,
                designerName: currentDesignerName,
                customerName: name,
                phoneNumber: phone,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                visitHistory: [visitData],
                favoriteStyles: [],
                totalVisits: 1
            });
            
            // 디자이너 고객 수 증가
            incrementDesignerCustomerCount();
            
            showSuccessMessage(`✅ ${name}님이 신규 등록되었습니다!`);
        }
        
        closeCustomerRegisterModal();
        
        // 검색 캐시 초기화
        customerSearchCache.clear();
        
    } catch (error) {
        console.error('❌ 고객 등록 오류:', error);
        showErrorMessage(getFirebaseErrorMessage(error));
    }
}

// ========== 스타일 좋아요 기능 ========== 
async function toggleStyleLike() {
    if (!selectedStyleCode) {
        showErrorMessage('스타일을 먼저 선택해주세요');
        return;
    }
    
    // 빠른 고객 선택 모달 표시
    showQuickCustomerSelectModal();
}

function showQuickCustomerSelectModal() {
    const modalHTML = `
        <div class="customer-search-modal" id="quickCustomerModal">
            <div class="search-container">
                <h3>👤 고객 선택</h3>
                <p class="modal-description">좋아요를 저장할 고객을 선택해주세요</p>
                
                <div class="quick-actions">
                    <button onclick="showCustomerSearch(); closeQuickCustomerModal();" 
                            class="action-btn search-btn">
                        🔍 기존 고객 찾기
                    </button>
                    <button onclick="showNewCustomerModal(); closeQuickCustomerModal();" 
                            class="action-btn new-btn">
                        ➕ 새 고객 등록
                    </button>
                </div>
                
                <button class="close-search" onclick="closeQuickCustomerModal()">취소</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ========== 유틸리티 함수들 ========== 

// 전화번호 포맷팅 (개선)
function formatPhoneNumberInput(event) {
    let value = event.target.value.replace(/[^0-9]/g, '');
    
    if (value.length <= 11) {
        if (value.length > 3 && value.length <= 7) {
            value = value.substring(0, 3) + '-' + value.substring(3);
        } else if (value.length > 7) {
            value = value.substring(0, 3) + '-' + value.substring(3, 7) + '-' + value.substring(7);
        }
    } else {
        // 11자리 초과 시 잘라내기
        value = value.substring(0, 11);
        value = value.substring(0, 3) + '-' + value.substring(3, 7) + '-' + value.substring(7);
    }
    
    event.target.value = value;
}

// 전화번호 유효성 검사 (강화)
function validatePhoneNumber(phone) {
    const phoneRegex = /^010-[0-9]{4}-[0-9]{4}$/;
    return phoneRegex.test(phone);
}

// 전화번호 표시 포맷팅
function formatPhoneDisplay(phone) {
    if (!phone) return '';
    return phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '($1) $2-$3');
}

// 고객 ID 생성
function generateCustomerId(designer, name, phone) {
    return `${designer}_${name}_${phone.replace(/-/g, '')}`;
}

// 마지막 방문일 포맷팅
function formatLastVisit(visitHistory) {
    if (!visitHistory || visitHistory.length === 0) {
        return '방문기록 없음';
    }
    
    const lastVisit = visitHistory[visitHistory.length - 1];
    const date = lastVisit.date?.toDate ? lastVisit.date.toDate() : new Date(lastVisit.date);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}주 전`;
    return `${Math.ceil(diffDays / 30)}개월 전`;
}

// 날짜 포맷팅 (개선)
function formatDate(dateValue) {
    if (!dateValue) return '날짜 정보 없음';
    
    let date;
    if (dateValue.toDate) {
        date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
        date = dateValue;
    } else {
        date = new Date(dateValue);
    }
    
    if (isNaN(date.getTime())) return '잘못된 날짜';
    
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
    });
}

// 현재 서브카테고리 가져오기
function getCurrentSubCategory() {
    const activeTab = document.querySelector('.length-tab.active');
    return activeTab ? activeTab.textContent.trim() : '';
}

// 선택된 스타일 이미지 가져오기
function getSelectedStyleImage() {
    const modalImage = document.getElementById('modalImage');
    return modalImage ? modalImage.src : '';
}

// 디자이너 고객 수 증가 (배치 처리)
async function incrementDesignerCustomerCount() {
    try {
        await db.collection('designers').doc(currentDesigner).update({
            customerCount: firebase.firestore.FieldValue.increment(1),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.log('⚠️ 디자이너 고객 수 업데이트 실패 (무시):', error);
    }
}

// Firebase 에러 메시지 변환
function getFirebaseErrorMessage(error) {
    switch (error.code) {
        case 'permission-denied':
            return 'Firebase 권한 오류입니다. 관리자에게 문의하세요.';
        case 'unavailable':
            return 'Firebase 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
        case 'network-request-failed':
            return '네트워크 연결을 확인하고 다시 시도해주세요.';
        default:
            return `등록 실패: ${error.message || '알 수 없는 오류'}`;
    }
}

// 모달 내 로딩 표시
function showLoadingInModal(message) {
    const modal = document.querySelector('.customer-step.active, .register-container');
    if (modal) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'modal-loading';
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;
        modal.appendChild(loadingDiv);
    }
}

// 성공 메시지 표시
function showSuccessMessage(message) {
    const notice = document.getElementById('deviceNotice');
    if (notice) {
        notice.innerHTML = message;
        notice.className = 'device-notice show success';
        
        setTimeout(() => {
            notice.classList.remove('show', 'success');
        }, 3000);
    }
}

// 에러 메시지 표시
function showErrorMessage(message) {
    const notice = document.getElementById('deviceNotice');
    if (notice) {
        notice.innerHTML = `❌ ${message}`;
        notice.className = 'device-notice show error';
        
        setTimeout(() => {
            notice.classList.remove('show', 'error');
        }, 5000);
    }
}

// 디바운스 함수 (검색 성능 최적화)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== 모달 닫기 함수들 ========== 
function closeCustomerSearch() {
    const modal = document.getElementById('customerSearchModal');
    if (modal) modal.remove();
}

function closeCustomerDetail() {
    const modal = document.getElementById('customerDetailModal');
    if (modal) modal.remove();
}

function closeNewCustomerModal() {
    const modal = document.getElementById('newCustomerModal');
    if (modal) modal.remove();
    
    // 데이터 초기화
    newCustomerData = {
        name: '',
        phone: '',
        gender: '',
        category: '',
        style: null
    };
}

function closeCustomerRegisterModal() {
    const modal = document.getElementById('customerRegisterModal');
    if (modal) modal.remove();
}

function closeQuickCustomerModal() {
    const modal = document.getElementById('quickCustomerModal');
    if (modal) modal.remove();
}

// ========== 전역 함수 등록 ========== 
window.showCustomerSearch = showCustomerSearch;
window.searchCustomers = searchCustomers;
window.showCustomerDetail = showCustomerDetail;
window.showNewCustomerModal = showNewCustomerModal;
window.showCustomerRegisterModal = showCustomerRegisterModal;
window.registerCustomerWithStyle = registerCustomerWithStyle;
window.toggleStyleLike = toggleStyleLike;
window.closeCustomerSearch = closeCustomerSearch;
window.closeCustomerDetail = closeCustomerDetail;
window.closeNewCustomerModal = closeNewCustomerModal;
window.closeCustomerRegisterModal = closeCustomerRegisterModal;
window.closeQuickCustomerModal = closeQuickCustomerModal;

console.log('✅ 최적화된 고객 관리 시스템 로드 완료');
