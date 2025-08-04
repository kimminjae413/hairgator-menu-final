// HAIRGATOR 고객 관리 시스템

// ========== 전화번호 유효성 검사 함수 ==========
function validatePhoneNumber(phone) {
    // 한국 휴대폰 번호 형식: 010-1234-5678
    const phoneRegex = /^01[0-9]-[0-9]{3,4}-[0-9]{4}$/;
    return phoneRegex.test(phone);
}

// ========== 전화번호 포맷팅 함수 ==========
function formatPhoneNumber(input) {
    // 숫자만 추출
    const numbers = input.value.replace(/[^\d]/g, '');
    
    // 포맷팅
    let formatted = '';
    if (numbers.length <= 3) {
        formatted = numbers;
    } else if (numbers.length <= 7) {
        formatted = numbers.substr(0, 3) + '-' + numbers.substr(3);
    } else if (numbers.length <= 11) {
        formatted = numbers.substr(0, 3) + '-' + numbers.substr(3, 4) + '-' + numbers.substr(7);
    } else {
        formatted = numbers.substr(0, 3) + '-' + numbers.substr(3, 4) + '-' + numbers.substr(7, 4);
    }
    
    input.value = formatted;
}

// ========== 고객 검색 모달 표시 ==========
function showCustomerSearch() {
    closeHamburgerMenu();
    
    const modal = document.createElement('div');
    modal.className = 'customer-search-modal';
    modal.innerHTML = `
        <div class="search-container">
            <h3>🔍 고객 조회</h3>
            <div class="search-input">
                <input type="text" id="searchInput" placeholder="이름 또는 전화번호로 검색">
                <button onclick="searchCustomers()">검색</button>
            </div>
            <div id="searchResults"></div>
            <button class="close-search" onclick="closeCustomerSearch()">닫기</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 엔터키로 검색
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchCustomers();
        }
    });
}

// ========== 고객 검색 ==========
async function searchCustomers() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!searchTerm) {
        alert('검색어를 입력해주세요.');
        return;
    }
    
    try {
        const designerInfo = JSON.parse(localStorage.getItem('designerInfo'));
        const customersRef = db.collection('customers')
            .where('designerId', '==', designerInfo.designerId);
        
        const snapshot = await customersRef.get();
        let results = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const customer = { id: doc.id, ...data };
            
            // 이름 또는 전화번호 전체로 검색
            if (customer.name.toLowerCase().includes(searchTerm) || 
                customer.phone.includes(searchTerm)) {
                results.push(customer);
            }
        });
        
        displaySearchResults(results);
    } catch (error) {
        console.error('고객 검색 오류:', error);
        alert('검색 중 오류가 발생했습니다.');
    }
}

// ========== 검색 결과 표시 ==========
function displaySearchResults(results) {
    const resultsDiv = document.getElementById('searchResults');
    
    if (results.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
        return;
    }
    
    resultsDiv.innerHTML = results.map(customer => `
        <div class="customer-result" onclick="showCustomerDetail('${customer.id}')">
            <div class="customer-info">
                <strong>${customer.name}</strong>
                <span class="phone">${customer.phone}</span>
            </div>
            <div class="visit-count">${customer.visitHistory?.length || 0}회 방문</div>
        </div>
    `).join('');
}

// ========== 고객 상세 정보 표시 ==========
async function showCustomerDetail(customerId) {
    try {
        const doc = await db.collection('customers').doc(customerId).get();
        if (!doc.exists) {
            alert('고객 정보를 찾을 수 없습니다.');
            return;
        }
        
        const customer = { id: doc.id, ...doc.data() };
        
        const modal = document.createElement('div');
        modal.className = 'customer-detail-modal';
        modal.innerHTML = `
            <div class="detail-container">
                <div class="customer-header">
                    <h3>${customer.name} 고객님</h3>
                    <button onclick="closeCustomerDetail()">×</button>
                </div>
                <div class="customer-details">
                    <p>📱 ${customer.phone}</p>
                    <p>📅 총 ${customer.visitHistory?.length || 0}회 방문</p>
                </div>
                <div class="visit-history">
                    <h4>방문 기록</h4>
                    ${customer.visitHistory && customer.visitHistory.length > 0 ? 
                        customer.visitHistory.map(visit => `
                            <div class="visit-item">
                                <div class="visit-date">${new Date(visit.date).toLocaleDateString('ko-KR')}</div>
                                ${visit.styles.map(style => `
                                    <div class="style-item ${style.liked ? 'liked' : ''}">
                                        <span class="style-code">${style.styleCode}</span>
                                        <span class="style-name">${style.styleName}</span>
                                        ${style.liked ? '<span class="heart">❤️</span>' : ''}
                                    </div>
                                `).join('')}
                                ${visit.notes ? `<div class="visit-notes">메모: ${visit.notes}</div>` : ''}
                            </div>
                        `).join('') : 
                        '<div class="no-history">방문 기록이 없습니다.</div>'
                    }
                </div>
                <div class="favorite-styles">
                    <h4>관심 스타일</h4>
                    ${customer.favoriteStyles && customer.favoriteStyles.length > 0 ?
                        customer.favoriteStyles.map(style => `
                            <div class="style-item liked">
                                <span class="style-code">${style.styleCode}</span>
                                <span class="style-name">${style.styleName}</span>
                                <span class="heart">❤️</span>
                            </div>
                        `).join('') :
                        '<div class="no-history">관심 스타일이 없습니다.</div>'
                    }
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('고객 상세 정보 조회 오류:', error);
        alert('고객 정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// ========== 새 고객 추가 모달 ==========
function showNewCustomerModal() {
    const modal = document.createElement('div');
    modal.className = 'new-customer-modal';
    modal.innerHTML = `
        <div class="new-customer-container">
            <h3>👤 새 고객 등록</h3>
            <form onsubmit="saveNewCustomer(event); return false;">
                <div class="customer-input-group">
                    <label>👤 이름</label>
                    <input type="text" id="newCustomerName" placeholder="김민수" required>
                </div>
                <div class="customer-input-group">
                    <label>📱 전화번호</label>
                    <input type="tel" id="newCustomerPhone" placeholder="010-1234-5678" required>
                    <small>* 하이픈(-) 포함하여 입력해주세요</small>
                </div>
                <div class="customer-buttons">
                    <button type="submit" class="save-customer-btn">저장</button>
                    <button type="button" class="cancel-customer-btn" onclick="closeNewCustomerModal()">취소</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 전화번호 자동 포맷팅
    document.getElementById('newCustomerPhone').addEventListener('input', function() {
        formatPhoneNumber(this);
    });
}

// ========== 새 고객 저장 ==========
async function saveNewCustomer(event) {
    event.preventDefault();
    
    const name = document.getElementById('newCustomerName').value.trim();
    const phone = document.getElementById('newCustomerPhone').value.trim();
    
    if (!name || !phone) {
        alert('이름과 전화번호를 모두 입력해주세요.');
        return;
    }
    
    // 전화번호 유효성 검사
    if (!validatePhoneNumber(phone)) {
        alert('올바른 전화번호 형식이 아닙니다.\n예: 010-1234-5678');
        return;
    }
    
    try {
        const designerInfo = JSON.parse(localStorage.getItem('designerInfo'));
        
        // 중복 확인
        const existing = await db.collection('customers')
            .where('phone', '==', phone)
            .where('designerId', '==', designerInfo.designerId)
            .get();
        
        if (!existing.empty) {
            alert('이미 등록된 고객입니다.');
            return;
        }
        
        // 새 고객 저장
        await db.collection('customers').add({
            name: name,
            phone: phone,
            designerId: designerInfo.designerId,
            designerName: designerInfo.name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            visitHistory: [],
            favoriteStyles: []
        });
        
        alert('고객이 등록되었습니다.');
        closeNewCustomerModal();
        
    } catch (error) {
        console.error('고객 저장 오류:', error);
        alert('고객 저장 중 오류가 발생했습니다.');
    }
}

// ========== 고객 등록 모달 (스타일 선택 시) ==========
function showCustomerRegisterModal() {
    const modal = document.createElement('div');
    modal.className = 'customer-register-modal';
    modal.innerHTML = `
        <div class="register-container">
            <h3>👤 고객 등록</h3>
            <div class="selected-style-info">
                <h4>선택한 스타일</h4>
                <p>코드: ${window.currentStyle.code}</p>
                <p>이름: ${window.currentStyle.name}</p>
            </div>
            <form onsubmit="registerCustomerWithStyle(event); return false;">
                <div class="customer-input-group">
                    <label>👤 이름</label>
                    <input type="text" id="registerCustomerName" placeholder="김민수" required>
                </div>
                <div class="customer-input-group">
                    <label>📱 전화번호</label>
                    <input type="tel" id="registerCustomerPhone" placeholder="010-1234-5678" required>
                    <small>* 하이픈(-) 포함하여 입력해주세요</small>
                </div>
                <div class="customer-input-group">
                    <label>📝 메모</label>
                    <textarea id="registerCustomerNotes" placeholder="고객 특이사항 등"></textarea>
                </div>
                <div class="customer-buttons">
                    <button type="submit" class="save-customer-btn">등록</button>
                    <button type="button" class="cancel-customer-btn" onclick="closeCustomerRegisterModal()">취소</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 전화번호 자동 포맷팅
    document.getElementById('registerCustomerPhone').addEventListener('input', function() {
        formatPhoneNumber(this);
    });
}

// ========== 스타일과 함께 고객 등록 ==========
async function registerCustomerWithStyle(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerCustomerName').value.trim();
    const phone = document.getElementById('registerCustomerPhone').value.trim();
    const notes = document.getElementById('registerCustomerNotes').value.trim();
    
    if (!name || !phone) {
        alert('이름과 전화번호를 모두 입력해주세요.');
        return;
    }
    
    // 전화번호 유효성 검사
    if (!validatePhoneNumber(phone)) {
        alert('올바른 전화번호 형식이 아닙니다.\n예: 010-1234-5678');
        return;
    }
    
    try {
        const designerInfo = JSON.parse(localStorage.getItem('designerInfo'));
        
        // 기존 고객 확인
        const customerQuery = await db.collection('customers')
            .where('phone', '==', phone)
            .where('designerId', '==', designerInfo.designerId)
            .get();
        
        let customerId;
        
        if (customerQuery.empty) {
            // 새 고객 생성
            const newCustomer = await db.collection('customers').add({
                name: name,
                phone: phone,
                designerId: designerInfo.designerId,
                designerName: designerInfo.name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                visitHistory: [],
                favoriteStyles: []
            });
            customerId = newCustomer.id;
        } else {
            // 기존 고객
            customerId = customerQuery.docs[0].id;
        }
        
        // 방문 기록 추가
        const visitRecord = {
            date: new Date().toISOString(),
            styles: [{
                styleCode: window.currentStyle.code,
                styleName: window.currentStyle.name,
                liked: window.currentStyle.liked || false
            }],
            notes: notes
        };
        
        await db.collection('customers').doc(customerId).update({
            visitHistory: firebase.firestore.FieldValue.arrayUnion(visitRecord)
        });
        
        // 좋아요한 스타일이면 관심 스타일에도 추가
        if (window.currentStyle.liked) {
            await db.collection('customers').doc(customerId).update({
                favoriteStyles: firebase.firestore.FieldValue.arrayUnion({
                    styleCode: window.currentStyle.code,
                    styleName: window.currentStyle.name,
                    addedAt: new Date().toISOString()
                })
            });
        }
        
        alert('고객 등록이 완료되었습니다.');
        closeCustomerRegisterModal();
        closeModal();
        
    } catch (error) {
        console.error('고객 등록 오류:', error);
        alert('고객 등록 중 오류가 발생했습니다.');
    }
}

// ========== 모달 닫기 함수들 ==========
function closeCustomerSearch() {
    const modal = document.querySelector('.customer-search-modal');
    if (modal) modal.remove();
}

function closeCustomerDetail() {
    const modal = document.querySelector('.customer-detail-modal');
    if (modal) modal.remove();
}

function closeNewCustomerModal() {
    const modal = document.querySelector('.new-customer-modal');
    if (modal) modal.remove();
}

function closeCustomerRegisterModal() {
    const modal = document.querySelector('.customer-register-modal');
    if (modal) modal.remove();
}

// ========== 고객 데이터 내보내기 ==========
async function exportCustomerData() {
    try {
        const designerInfo = JSON.parse(localStorage.getItem('designerInfo'));
        const customersRef = db.collection('customers')
            .where('designerId', '==', designerInfo.designerId);
        
        const snapshot = await customersRef.get();
        const customers = [];
        
        snapshot.forEach(doc => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        
        // CSV 형식으로 변환
        let csv = '이름,전화번호,총방문횟수,마지막방문일,관심스타일\n';
        
        customers.forEach(customer => {
            const visitCount = customer.visitHistory?.length || 0;
            const lastVisit = customer.visitHistory && customer.visitHistory.length > 0 ?
                new Date(customer.visitHistory[customer.visitHistory.length - 1].date).toLocaleDateString('ko-KR') : '-';
            const favoriteStyles = customer.favoriteStyles?.map(s => s.styleName).join(', ') || '-';
            
            csv += `"${customer.name}","${customer.phone}",${visitCount},"${lastVisit}","${favoriteStyles}"\n`;
        });
        
        // 파일 다운로드
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `고객데이터_${designerInfo.name}_${new Date().toLocaleDateString('ko-KR')}.csv`;
        link.click();
        
    } catch (error) {
        console.error('데이터 내보내기 오류:', error);
        alert('데이터 내보내기 중 오류가 발생했습니다.');
    }
}

console.log('✅ index-customer.js 로드 완료');

// ========== 전역 함수 등록 ==========
window.searchCustomers = searchCustomers;
window.showCustomerDetail = showCustomerDetail;
window.saveNewCustomer = saveNewCustomer;
window.registerCustomerWithStyle = registerCustomerWithStyle;
window.closeCustomerSearch = closeCustomerSearch;
window.closeCustomerDetail = closeCustomerDetail;
window.closeNewCustomerModal = closeNewCustomerModal;
window.closeCustomerRegisterModal = closeCustomerRegisterModal;
window.formatPhoneNumber = formatPhoneNumber;

console.log('✅ index-customer.js 전역 함수 등록 완료');
