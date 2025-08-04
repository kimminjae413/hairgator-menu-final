// ========== 고객 관리 기능 ==========

// 고객 검색 모달 표시
function showCustomerSearch() {
    const modalHTML = `
        <div class="customer-search-modal" id="customerSearchModal">
            <div class="search-container">
                <h3>👤 고객 조회</h3>
                
                <div class="search-input">
                    <input type="text" id="customerSearchInput" 
                           placeholder="이름 또는 전화번호 끝자리로 검색">
                    <button onclick="searchCustomers()">🔍</button>
                </div>
                
                <div id="customerSearchResults"></div>
                
                <button class="close-search" onclick="closeCustomerSearch()">닫기</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    closeHamburgerMenu();
}

// 고객 검색 실행
async function searchCustomers() {
    const searchTerm = document.getElementById('customerSearchInput').value.trim();
    
    if (!searchTerm || !currentDesigner) {
        document.getElementById('customerSearchResults').innerHTML = 
            '<div class="no-results">검색어를 입력해주세요</div>';
        return;
    }
    
    try {
        const customersSnapshot = await db.collection('customers')
            .where('designerId', '==', currentDesigner)
            .get();
        
        const matchedCustomers = [];
        customersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.customerName.includes(searchTerm) || 
                data.phoneLastDigits.includes(searchTerm)) {
                matchedCustomers.push({id: doc.id, ...data});
            }
        });
        
        showSearchResults(matchedCustomers);
    } catch (error) {
        console.error('고객 검색 오류:', error);
        document.getElementById('customerSearchResults').innerHTML = 
            '<div class="no-results">검색 중 오류가 발생했습니다</div>';
    }
}

// 검색 결과 표시
function showSearchResults(customers) {
    const resultsDiv = document.getElementById('customerSearchResults');
    
    if (customers.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">검색 결과가 없습니다</div>';
        return;
    }
    
    const resultsHTML = customers.map(customer => `
        <div class="customer-result" onclick="showCustomerDetail('${customer.id}')">
            <div class="customer-info">
                <strong>${customer.customerName}</strong>
                <span class="phone">(${customer.phoneLastDigits})</span>
            </div>
            <div class="visit-count">${customer.visitHistory?.length || 0}회 방문</div>
        </div>
    `).join('');
    
    resultsDiv.innerHTML = resultsHTML;
}

// 고객 상세 정보 표시
async function showCustomerDetail(customerId) {
    try {
        const customerDoc = await db.collection('customers').doc(customerId).get();
        const customerData = customerDoc.data();
        
        const detailHTML = `
            <div class="customer-detail-modal" id="customerDetailModal">
                <div class="detail-container">
                    <div class="customer-header">
                        <h3>${customerData.customerName} (${customerData.phoneLastDigits})</h3>
                        <button onclick="closeCustomerDetail()">×</button>
                    </div>
                    
                    <div class="visit-history">
                        <h4>📅 방문 기록</h4>
                        ${renderVisitHistory(customerData.visitHistory || [])}
                    </div>
                    
                    <div class="favorite-styles">
                        <h4>❤️ 좋아하는 스타일</h4>
                        ${renderFavoriteStyles(customerData.favoriteStyles || [])}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', detailHTML);
    } catch (error) {
        console.error('고객 상세 조회 오류:', error);
        alert('고객 정보를 불러올 수 없습니다.');
    }
}

// 방문 기록 렌더링
function renderVisitHistory(visitHistory) {
    if (visitHistory.length === 0) {
        return '<div class="no-history">방문 기록이 없습니다</div>';
    }
    
    return visitHistory.map(visit => `
        <div class="visit-item">
            <div class="visit-date">${formatDate(visit.date)}</div>
            <div class="visit-styles">
                ${visit.selectedStyles ? visit.selectedStyles.map(style => `
                    <div class="style-item ${style.isLiked ? 'liked' : ''}">
                        <span class="style-code">${style.code}</span>
                        <span class="style-name">${style.name}</span>
                        ${style.isLiked ? '<span class="heart">❤️</span>' : ''}
                    </div>
                `).join('') : `
                    <div class="style-item">
                        <span class="style-code">${visit.styleCode || 'N/A'}</span>
                        <span class="style-name">${visit.styleName || 'N/A'}</span>
                    </div>
                `}
            </div>
            ${visit.notes ? `<div class="visit-notes">"${visit.notes}"</div>` : ''}
        </div>
    `).join('');
}

// 즐겨찾는 스타일 렌더링
function renderFavoriteStyles(favoriteStyles) {
    if (favoriteStyles.length === 0) {
        return '<div class="no-history">좋아하는 스타일이 없습니다</div>';
    }
    
    return favoriteStyles.map(style => `
        <div class="style-item liked">
            <span class="style-code">${style.code}</span>
            <span class="style-name">${style.name}</span>
            <span class="heart">❤️</span>
        </div>
    `).join('');
}

// 날짜 포맷팅
function formatDate(dateValue) {
    if (!dateValue) return '날짜 정보 없음';
    
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

// 고객 검색 모달 닫기
function closeCustomerSearch() {
    const modal = document.getElementById('customerSearchModal');
    if (modal) {
        modal.remove();
    }
}

// 고객 상세 모달 닫기
function closeCustomerDetail() {
    const modal = document.getElementById('customerDetailModal');
    if (modal) {
        modal.remove();
    }
}

// 새 고객 모달 표시 (단계별)
function showNewCustomerModal() {
    const modalHTML = `
        <div class="new-customer-modal" id="newCustomerModal">
            <div class="new-customer-container">
                <h3>✨ 새 고객 등록</h3>
                
                <!-- 단계 1: 기본 정보 -->
                <div id="customerStep1" class="customer-step active">
                    <div class="step-indicator">
                        <span class="step-number active">1</span>
                        <span class="step-text">기본 정보</span>
                    </div>
                    
                    <div class="customer-input-group">
                        <label>👤 고객 이름</label>
                        <input type="text" id="newCustomerName" placeholder="홍길동">
                    </div>
                    
                    <div class="customer-input-group">
                        <label>📱 연락처 끝 4자리</label>
                        <input type="number" id="newCustomerPhone" placeholder="5678" maxlength="4">
                    </div>
                    
                    <div class="customer-buttons">
                        <button class="save-customer-btn" onclick="goToCustomerStep2()">다음 단계 →</button>
                        <button class="cancel-customer-btn" onclick="closeNewCustomerModal()">취소</button>
                    </div>
                </div>
                
                <!-- 단계 2: 성별 선택 -->
                <div id="customerStep2" class="customer-step">
                    <div class="step-indicator">
                        <span class="step-number active">2</span>
                        <span class="step-text">성별 선택</span>
                    </div>
                    
                    <div class="gender-selection-mini">
                        <div class="gender-card-mini male" onclick="selectCustomerGender('male')">
                            <div class="gender-icon-mini">♂</div>
                            <div class="gender-title-mini">남성</div>
                        </div>
                        <div class="gender-card-mini female" onclick="selectCustomerGender('female')">
                            <div class="gender-icon-mini">♀</div>
                            <div class="gender-title-mini">여성</div>
                        </div>
                    </div>
                    
                    <div class="customer-buttons">
                        <button class="cancel-customer-btn" onclick="goToCustomerStep1()">← 이전</button>
                        <button class="save-customer-btn" id="genderNextBtn" onclick="goToCustomerStep3()" disabled>다음 단계 →</button>
                    </div>
                </div>
                
                <!-- 단계 3: 카테고리 선택 -->
                <div id="customerStep3" class="customer-step">
                    <div class="step-indicator">
                        <span class="step-number active">3</span>
                        <span class="step-text">카테고리 선택</span>
                    </div>
                    
                    <div id="categorySelection" class="category-selection-mini">
                        <!-- 동적으로 생성 -->
                    </div>
                    
                    <div class="customer-buttons">
                        <button class="cancel-customer-btn" onclick="goToCustomerStep2()">← 이전</button>
                        <button class="save-customer-btn" id="categoryNextBtn" onclick="goToCustomerStep4()" disabled>다음 단계 →</button>
                    </div>
                </div>
                
                <!-- 단계 4: 스타일 선택 -->
                <div id="customerStep4" class="customer-step">
                    <div class="step-indicator">
                        <span class="step-number active">4</span>
                        <span class="step-text">스타일 선택</span>
                    </div>
                    
                    <div id="styleSelection" class="style-selection-mini">
                        <!-- 동적으로 생성 -->
                    </div>
                    
                    <div class="customer-buttons">
                        <button class="cancel-customer-btn" onclick="goToCustomerStep3()">← 이전</button>
                        <button class="save-customer-btn" id="saveCompleteBtn" onclick="saveNewCustomerComplete()" disabled>💾 완료</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 새 고객 데이터 초기화
let newCustomerData = {
    name: '',
    phone: '',
    gender: '',
    category: '',
    style: null
};

// 단계 2로 이동
function goToCustomerStep2() {
    const name = document.getElementById('newCustomerName').value.trim();
    const phone = document.getElementById('newCustomerPhone').value.trim();
    
    if (!name || phone.length !== 4) {
        alert('이름과 전화번호 끝 4자리를 정확히 입력해주세요');
        return;
    }
    
    newCustomerData.name = name;
    newCustomerData.phone = phone;
    
    document.getElementById('customerStep1').classList.remove('active');
    document.getElementById('customerStep2').classList.add('active');
}

// 단계 1로 돌아가기
function goToCustomerStep1() {
    document.getElementById('customerStep2').classList.remove('active');
    document.getElementById('customerStep1').classList.add('active');
}

// 고객 성별 선택
function selectCustomerGender(gender) {
    newCustomerData.gender = gender;
    
    document.querySelectorAll('.gender-card-mini').forEach(card => {
        card.classList.remove('selected');
    });
    
    document.querySelector(`.gender-card-mini.${gender}`).classList.add('selected');
    document.getElementById('genderNextBtn').disabled = false;
}

// 단계 3로 이동 (카테고리 선택)
function goToCustomerStep3() {
    if (!newCustomerData.gender) {
        alert('성별을 선택해주세요');
        return;
    }
    
    document.getElementById('customerStep2').classList.remove('active');
    document.getElementById('customerStep3').classList.add('active');
    
    loadCustomerCategories();
}

// 단계 2로 돌아가기
function goToCustomerStep2() {
    document.getElementById('customerStep3').classList.remove('active');
    document.getElementById('customerStep2').classList.add('active');
}

// 고객 등록용 카테고리 로드
function loadCustomerCategories() {
    const categorySelection = document.getElementById('categorySelection');
    const categories = Object.keys(hierarchyStructure[newCustomerData.gender] || {});
    
    if (categories.length === 0) {
        categorySelection.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">카테고리를 불러올 수 없습니다</div>';
        return;
    }
    
    const categoryOrder = {
        male: ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'],
        female: ['LONG', 'SEMI LONG', 'MEDIUM', 'BOB', 'SHORT']
    };
    
    const orderedCategories = categoryOrder[newCustomerData.gender] || categories;
    
    let html = '';
    orderedCategories.forEach(category => {
        if (categories.includes(category)) {
            html += `
                <div class="category-card-mini" onclick="selectCustomerCategory('${category}')">
                    ${category}
                </div>
            `;
        }
    });
    
    categorySelection.innerHTML = html;
}

// 고객 카테고리 선택
function selectCustomerCategory(category) {
    newCustomerData.category = category;
    
    document.querySelectorAll('.category-card-mini').forEach(card => {
        card.classList.remove('selected');
    });
    
    event.target.classList.add('selected');
    document.getElementById('categoryNextBtn').disabled = false;
}

// 단계 4로 이동 (스타일 선택)
async function goToCustomerStep4() {
    if (!newCustomerData.category) {
        alert('카테고리를 선택해주세요');
        return;
    }
    
    document.getElementById('customerStep3').classList.remove('active');
    document.getElementById('customerStep4').classList.add('active');
    
    await loadCustomerStyles();
}

// 단계 3로 돌아가기
function goToCustomerStep3() {
    document.getElementById('customerStep4').classList.remove('active');
    document.getElementById('customerStep3').classList.add('active');
}

// 고객 등록용 스타일 로드
async function loadCustomerStyles() {
    const styleSelection = document.getElementById('styleSelection');
    styleSelection.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="spinner"></div></div>';
    
    try {
        const allStylesSnapshot = await db.collection('hairstyles').get();
        const styles = [];
        
        allStylesSnapshot.forEach(doc => {
            const style = doc.data();
            if (style.gender === newCustomerData.gender && 
                style.mainCategory === newCustomerData.category) {
                styles.push({
                    ...style,
                    id: doc.id
                });
            }
        });
        
        if (styles.length === 0) {
            styleSelection.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">등록된 스타일이 없습니다</div>';
            return;
        }
        
        let html = '';
        styles.forEach(style => {
            const imageUrl = style.imageUrl || generatePlaceholderImage(style.name);
            html += `
                <div class="style-card-mini" onclick="selectCustomerStyle('${style.code}', '${style.name}', '${style.imageUrl || ''}')">
                    <img class="style-image-mini" src="${imageUrl}" alt="${style.name}"
                         onerror="this.src='${generatePlaceholderImage(style.name)}'">
                    <div class="style-info-mini">
                        <div class="style-code-mini">${style.code}</div>
                        <div class="style-name-mini">${style.name}</div>
                    </div>
                </div>
            `;
        });
        
        styleSelection.innerHTML = html;
        
    } catch (error) {
        console.error('스타일 로드 오류:', error);
        styleSelection.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">스타일을 불러올 수 없습니다</div>';
    }
}

// 고객 스타일 선택
function selectCustomerStyle(code, name, imageUrl) {
    newCustomerData.style = {
        code: code,
        name: name,
        imageUrl: imageUrl
    };
    
    document.querySelectorAll('.style-card-mini').forEach(card => {
        card.classList.remove('selected');
    });
    
    event.target.closest('.style-card-mini').classList.add('selected');
    document.getElementById('saveCompleteBtn').disabled = false;
}

// 새 고객 완전 저장
async function saveNewCustomerComplete() {
    if (!newCustomerData.name || !newCustomerData.phone || !newCustomerData.gender || 
        !newCustomerData.category || !newCustomerData.style) {
        alert('모든 정보를 선택해주세요');
        return;
    }
    
    if (!firebaseConnected) {
        alert('Firebase 연결이 필요합니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    const customerId = `${currentDesigner}_${newCustomerData.name}_${newCustomerData.phone}`;
    
    try {
        console.log('🔄 완전한 고객 등록 시작:', newCustomerData);
        
        const existingCustomer = await db.collection('customers').doc(customerId).get();
        
        if (existingCustomer.exists) {
            alert('이미 등록된 고객입니다');
            return;
        }
        
        const visitData = {
            date: new Date(),
            gender: newCustomerData.gender,
            mainCategory: newCustomerData.category,
            subCategory: '', // 중분류는 나중에 선택 가능
            styleCode: newCustomerData.style.code,
            styleName: newCustomerData.style.name,
            imageUrl: newCustomerData.style.imageUrl,
            designerName: currentDesignerName
        };
        
        await db.collection('customers').doc(customerId).set({
            designerId: currentDesigner,
            designerName: currentDesignerName,
            customerName: newCustomerData.name,
            phoneLastDigits: newCustomerData.phone,
            createdAt: new Date(),
            visitHistory: [visitData],
            favoriteStyles: [{
                code: newCustomerData.style.code,
                name: newCustomerData.style.name
            }]
        });
        
        console.log('✅ 완전한 고객 등록 완료');
        alert(`✅ ${newCustomerData.name}(${newCustomerData.phone}) 고객이 스타일과 함께 등록되었습니다!`);
        closeNewCustomerModal();
        
        // 디자이너 고객 수 증가
        try {
            await db.collection('designers').doc(currentDesigner).update({
                customerCount: firebase.firestore.FieldValue.increment(1)
            });
        } catch (updateError) {
            console.log('⚠️ 디자이너 고객 수 업데이트 실패 (무시)', updateError);
        }
        
        // 새 고객 데이터 초기화
        newCustomerData = {
            name: '',
            phone: '',
            gender: '',
            category: '',
            style: null
        };
        
    } catch (error) {
        console.error('❌ 완전한 고객 등록 오류:', error);
        
        let errorMessage = '고객 등록에 실패했습니다.';
        
        if (error.code === 'permission-denied') {
            errorMessage = 'Firebase 권한 오류입니다. 관리자에게 문의하세요.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Firebase 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.code === 'network-request-failed') {
            errorMessage = '네트워크 연결을 확인하고 다시 시도해주세요.';
        } else {
            errorMessage = `등록 실패: ${error.message || '알 수 없는 오류'}`;
        }
        
        alert(errorMessage);
    }
}

// 새 고객 모달 닫기
function closeNewCustomerModal() {
    const modal = document.getElementById('newCustomerModal');
    if (modal) {
        modal.remove();
    }
    
    // 데이터 초기화
    newCustomerData = {
        name: '',
        phone: '',
        gender: '',
        category: '',
        style: null
    };
}

// 고객 등록 모달 표시 (스타일 선택 후)
function showCustomerRegisterModal() {
    if (!currentStyleCode || !currentStyleName) {
        alert('스타일을 먼저 선택해주세요');
        return;
    }

    const modalHTML = `
        <div class="customer-register-modal" id="customerRegisterModal">
            <div class="register-container">
                <h3>👤 고객 등록</h3>
                
                <div class="selected-style-info">
                    <h4>선택된 스타일</h4>
                    <p><strong>성별:</strong> ${currentGender === 'male' ? '남성' : '여성'}</p>
                    <p><strong>대분류:</strong> ${currentCategory}</p>
                    <p><strong>스타일 코드:</strong> ${currentStyleCode}</p>
                    <p><strong>스타일명:</strong> ${currentStyleName}</p>
                </div>
                
                <div class="customer-input-group">
                    <label>👤 고객 이름</label>
                    <input type="text" id="registerCustomerName" placeholder="홍길동">
                </div>
                
                <div class="customer-input-group">
                    <label>📱 연락처 끝 4자리</label>
                    <input type="number" id="registerCustomerPhone" placeholder="5678" maxlength="4">
                </div>
                
                <div class="customer-buttons">
                    <button class="save-customer-btn" onclick="registerCustomerWithStyle()">💾 등록</button>
                    <button class="cancel-customer-btn" onclick="closeCustomerRegisterModal()">취소</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    document.getElementById('imageModal').style.display = 'none';
}

// 스타일과 함께 고객 등록
async function registerCustomerWithStyle() {
    const name = document.getElementById('registerCustomerName').value.trim();
    const phone = document.getElementById('registerCustomerPhone').value.trim();
    
    if (!name || phone.length !== 4) {
        alert('이름과 전화번호 끝 4자리를 정확히 입력해주세요');
        return;
    }
    
    if (!firebaseConnected) {
        alert('Firebase 연결이 필요합니다. 페이지를 새로고침해주세요.');
        return;
    }
    
    const customerId = `${currentDesigner}_${name}_${phone}`;
    
    try {
        console.log('🔄 고객 등록 시작:', customerId);
        
        const visitData = {
            date: new Date(),
            gender: currentGender,
            mainCategory: currentCategory,
            subCategory: getCurrentSubCategory(),
            styleCode: currentStyleCode,
            styleName: currentStyleName,
            imageUrl: currentStyleImage || '',
            designerName: currentDesignerName
        };

        console.log('📄 방문 데이터:', visitData);

        const existingCustomer = await db.collection('customers').doc(customerId).get();
        
        if (existingCustomer.exists) {
            console.log('✅ 기존 고객 - 방문 기록 추가');
            await db.collection('customers').doc(customerId).update({
                visitHistory: firebase.firestore.FieldValue.arrayUnion(visitData)
            });
            
            alert(`✅ ${name}(${phone}) 고객의 방문 기록이 추가되었습니다!`);
        } else {
            console.log('🆕 신규 고객 - 새로 등록');
            await db.collection('customers').doc(customerId).set({
                designerId: currentDesigner,
                designerName: currentDesignerName,
                customerName: name,
                phoneLastDigits: phone,
                createdAt: new Date(),
                visitHistory: [visitData],
                favoriteStyles: []
            });
            
            // 디자이너 고객 수 증가
            try {
                await db.collection('designers').doc(currentDesigner).update({
                    customerCount: firebase.firestore.FieldValue.increment(1)
                });
            } catch (updateError) {
                console.log('⚠️ 디자이너 고객 수 업데이트 실패 (무시)', updateError);
            }
            
            alert(`✅ ${name}(${phone}) 신규 고객이 등록되었습니다!`);
        }
        
        console.log('✅ 고객 등록 완료');
        closeCustomerRegisterModal();
        
    } catch (error) {
        console.error('❌ 고객 등록 오류:', error);
        
        let errorMessage = '고객 등록에 실패했습니다.';
        
        if (error.code === 'permission-denied') {
            errorMessage = 'Firebase 권한 오류입니다. 관리자에게 문의하세요.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Firebase 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.code === 'network-request-failed') {
            errorMessage = '네트워크 연결을 확인하고 다시 시도해주세요.';
        } else {
            errorMessage = `등록 실패: ${error.message || '알 수 없는 오류'}`;
        }
        
        alert(errorMessage);
    }
}

// 현재 중분류 가져오기
function getCurrentSubCategory() {
    const activeTab = document.querySelector('.length-tab.active');
    return activeTab ? activeTab.dataset.length : '';
}

// 고객 등록 모달 닫기
function closeCustomerRegisterModal() {
    const modal = document.getElementById('customerRegisterModal');
    if (modal) {
        modal.remove();
    }
}

// 스타일 좋아요 토글
async function toggleStyleLike() {
    if (!currentCustomer || !currentStyleCode) {
        showQuickCustomerSelectModal();
        return;
    }
    
    try {
        const today = new Date();
        const visitData = {
            date: today,
            selectedStyles: [{
                code: currentStyleCode,
                name: currentStyleName,
                isLiked: true,
                timestamp: today
            }]
        };
        
        await db.collection('customers').doc(currentCustomer.id).update({
            visitHistory: firebase.firestore.FieldValue.arrayUnion(visitData),
            favoriteStyles: firebase.firestore.FieldValue.arrayUnion({
                code: currentStyleCode,
                name: currentStyleName
            })
        });
        
        const likeBtn = document.getElementById('likeBtn');
        likeBtn.classList.add('liked');
        likeBtn.textContent = '💖 좋아요 완료!';
        
        alert('❤️ 스타일이 저장되었습니다!');
        
    } catch (error) {
        console.error('좋아요 저장 오류:', error);
        alert('저장에 실패했습니다');
    }
}

// 빠른 고객 선택 모달
function showQuickCustomerSelectModal() {
    const modalHTML = `
        <div class="customer-search-modal" id="quickCustomerModal">
            <div class="search-container">
                <h3>👤 고객 선택</h3>
                <p style="color: #ccc; margin-bottom: 20px;">좋아요를 저장하려면 먼저 고객을 선택해주세요.</p>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button onclick="showCustomerSearch(); closeQuickCustomerModal();" 
                            style="flex: 1; padding: 12px; background: linear-gradient(135deg, #4169E1, #1E90FF); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 14px;">
                        🔍 기존 고객
                    </button>
                    <button onclick="showNewCustomerModal(); closeQuickCustomerModal();" 
                            style="flex: 1; padding: 12px; background: linear-gradient(135deg, #FF1493, #FF69B4); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 14px;">
                        ➕ 새 고객
                    </button>
                </div>
                
                <button class="close-search" onclick="closeQuickCustomerModal()">취소</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeQuickCustomerModal() {
    const modal = document.getElementById('quickCustomerModal');
    if (modal) {
        modal.remove();
    }
}