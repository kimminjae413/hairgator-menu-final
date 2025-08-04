// ========== 인기 통계 기능 ==========

// 인기 통계 모달 표시
function showPopularityStats() {
    const modalHTML = `
        <div class="popularity-stats-modal" id="popularityStatsModal">
            <div class="stats-container">
                <button class="stats-close" onclick="closePopularityStats()">×</button>
                <h3>📊 인기 스타일 통계</h3>
                
                <div class="stats-tabs">
                    <div class="stats-tab active" onclick="switchStatsTab('overall')">🏆 전체 베스트</div>
                    <div class="stats-tab" onclick="switchStatsTab('male')">♂ 남성 카테고리별</div>
                    <div class="stats-tab" onclick="switchStatsTab('female')">♀ 여성 카테고리별</div>
                </div>
                
                <!-- 전체 베스트 -->
                <div id="statsOverall" class="stats-content active">
                    <div class="loading-stats">
                        <div class="spinner"></div>
                        <p>전체 디자이너 통계를 분석 중입니다...</p>
                    </div>
                </div>
                
                <!-- 남성 카테고리별 -->
                <div id="statsMale" class="stats-content">
                    <div class="loading-stats">
                        <div class="spinner"></div>
                        <p>남성 카테고리별 통계를 분석 중입니다...</p>
                    </div>
                </div>
                
                <!-- 여성 카테고리별 -->
                <div id="statsFemale" class="stats-content">
                    <div class="loading-stats">
                        <div class="spinner"></div>
                        <p>여성 카테고리별 통계를 분석 중입니다...</p>
                    </div>
                </div>
                
                <div class="stats-update-time">
                    실시간 데이터 · 모든 디자이너 통합 통계
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    closeHamburgerMenu();
    
    // 통계 데이터 로드
    loadPopularityStats();
}

// 통계 탭 전환
function switchStatsTab(tabName) {
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.stats-content').forEach(content => {
        content.classList.remove('active');
    });
    
    event.target.classList.add('active');
    document.getElementById(`stats${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
}

// 인기 통계 데이터 로드
async function loadPopularityStats() {
    if (!firebaseConnected) {
        console.log('❌ Firebase 연결 없음 - 통계 불가');
        showStatsError('Firebase 연결이 필요합니다');
        return;
    }

    try {
        console.log('📊 전체 디자이너 통계 분석 시작...');
        
        // 모든 고객 데이터 조회
        const customersSnapshot = await db.collection('customers').get();
        
        if (customersSnapshot.empty) {
            showStatsError('등록된 고객 데이터가 없습니다');
            return;
        }
        
        const allVisits = [];
        const allFavorites = [];
        let totalCustomers = 0;
        let totalDesigners = new Set();
        
        customersSnapshot.forEach(doc => {
            const customer = doc.data();
            totalCustomers++;
            
            if (customer.designerId) {
                totalDesigners.add(customer.designerId);
            }
            
            // 방문 기록에서 스타일 추출
            if (customer.visitHistory && customer.visitHistory.length > 0) {
                customer.visitHistory.forEach(visit => {
                    if (visit.styleCode && visit.styleName) {
                        allVisits.push({
                            code: visit.styleCode,
                            name: visit.styleName,
                            gender: visit.gender,
                            mainCategory: visit.mainCategory,
                            subCategory: visit.subCategory,
                            imageUrl: visit.imageUrl || '',
                            designerId: customer.designerId,
                            date: visit.date
                        });
                    }
                });
            }
            
            // 즐겨찾기에서 스타일 추출
            if (customer.favoriteStyles && customer.favoriteStyles.length > 0) {
                customer.favoriteStyles.forEach(fav => {
                    if (fav.code && fav.name) {
                        allFavorites.push({
                            code: fav.code,
                            name: fav.name,
                            designerId: customer.designerId
                        });
                    }
                });
            }
        });
        
        console.log(`📈 통계 분석 완료: ${totalCustomers}명 고객, ${totalDesigners.size}명 디자이너, ${allVisits.length}개 방문 기록`);
        
        // 통계 계산 및 렌더링
        renderOverallStats(allVisits, allFavorites, totalCustomers, totalDesigners.size);
        renderGenderStats('male', allVisits, allFavorites);
        renderGenderStats('female', allVisits, allFavorites);
        
    } catch (error) {
        console.error('❌ 통계 분석 오류:', error);
        showStatsError('통계 분석 중 오류가 발생했습니다: ' + error.message);
    }
}

// 전체 베스트 통계 렌더링
function renderOverallStats(allVisits, allFavorites, totalCustomers, totalDesigners) {
    const container = document.getElementById('statsOverall');
    
    // 스타일별 카운트 계산
    const styleCounts = {};
    
    allVisits.forEach(visit => {
        const key = `${visit.code}_${visit.name}`;
        if (!styleCounts[key]) {
            styleCounts[key] = {
                code: visit.code,
                name: visit.name,
                imageUrl: visit.imageUrl,
                count: 0,
                favoriteCount: 0,
                genders: new Set(),
                categories: new Set()
            };
        }
        styleCounts[key].count++;
        if (visit.gender) styleCounts[key].genders.add(visit.gender);
        if (visit.mainCategory) styleCounts[key].categories.add(visit.mainCategory);
    });
    
    // 즐겨찾기 카운트 추가
    allFavorites.forEach(fav => {
        const key = `${fav.code}_${fav.name}`;
        if (styleCounts[key]) {
            styleCounts[key].favoriteCount++;
        }
    });
    
    // 인기 순으로 정렬 (방문 기록 + 즐겨찾기 * 2)
    const topStyles = Object.values(styleCounts)
        .map(style => ({
            ...style,
            totalScore: style.count + (style.favoriteCount * 2)
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 10);
    
    let html = `
        <div class="stats-summary">
            <div class="stats-card">
                <div class="stats-card-number">${totalCustomers}</div>
                <div class="stats-card-label">총 고객 수</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-number">${totalDesigners}</div>
                <div class="stats-card-label">참여 디자이너</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-number">${allVisits.length}</div>
                <div class="stats-card-label">총 스타일 기록</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-number">${Object.keys(styleCounts).length}</div>
                <div class="stats-card-label">등록된 스타일</div>
            </div>
        </div>
        
        <div class="category-stats-section">
            <div class="category-stats-title">🏆 전체 베스트 TOP 10</div>
            <div class="top-styles-grid">
    `;
    
    if (topStyles.length === 0) {
        html += '<div class="no-data-stats">등록된 스타일이 없습니다</div>';
    } else {
        topStyles.forEach((style, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            const imageUrl = style.imageUrl || generatePlaceholderImage(style.name);
            
            html += `
                <div class="top-style-item">
                    <div class="style-rank ${rankClass}">${rank}</div>
                    <img class="style-image-stats" src="${imageUrl}" alt="${style.name}"
                         onerror="this.src='${generatePlaceholderImage(style.name)}'">
                    <div class="style-info-stats">
                        <div class="style-code-stats">${style.code}</div>
                        <div class="style-name-stats">${style.name}</div>
                        <div class="style-count-stats">
                            <span class="count-number">${style.count}</span>회 선택
                            ${style.favoriteCount > 0 ? `<span class="count-number">❤️ ${style.favoriteCount}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div></div>';
    container.innerHTML = html;
}

// 성별별 카테고리 통계 렌더링
function renderGenderStats(gender, allVisits, allFavorites) {
    const container = document.getElementById(`stats${gender.charAt(0).toUpperCase() + gender.slice(1)}`);
    
    // 해당 성별 데이터만 필터링
    const genderVisits = allVisits.filter(visit => visit.gender === gender);
    const genderFavorites = allFavorites.filter(fav => {
        // 즐겨찾기는 성별 정보가 없으므로 방문 기록에서 찾아서 매칭
        return genderVisits.some(visit => visit.code === fav.code);
    });
    
    if (genderVisits.length === 0) {
        container.innerHTML = `
            <div class="no-data-stats">
                ${gender === 'male' ? '남성' : '여성'} 스타일 데이터가 없습니다
            </div>
        `;
        return;
    }
    
    // 카테고리별 그룹화
    const categoryGroups = {};
    genderVisits.forEach(visit => {
        const category = visit.mainCategory || '기타';
        if (!categoryGroups[category]) {
            categoryGroups[category] = [];
        }
        categoryGroups[category].push(visit);
    });
    
    let html = `
        <div class="stats-summary">
            <div class="stats-card">
                <div class="stats-card-number">${genderVisits.length}</div>
                <div class="stats-card-label">${gender === 'male' ? '남성' : '여성'} 스타일 기록</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-number">${Object.keys(categoryGroups).length}</div>
                <div class="stats-card-label">활성 카테고리</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-number">${genderFavorites.length}</div>
                <div class="stats-card-label">즐겨찾기</div>
            </div>
        </div>
    `;
    
    // 카테고리별 인기 스타일
    const categoryOrder = {
        male: ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'],
        female: ['LONG', 'SEMI LONG', 'MEDIUM', 'BOB', 'SHORT']
    };
    
    const orderedCategories = categoryOrder[gender] || Object.keys(categoryGroups);
    
    orderedCategories.forEach(category => {
        if (!categoryGroups[category]) return;
        
        // 해당 카테고리의 스타일별 카운트
        const categoryStyleCounts = {};
        categoryGroups[category].forEach(visit => {
            const key = `${visit.code}_${visit.name}`;
            if (!categoryStyleCounts[key]) {
                categoryStyleCounts[key] = {
                    code: visit.code,
                    name: visit.name,
                    imageUrl: visit.imageUrl,
                    count: 0,
                    favoriteCount: 0
                };
            }
            categoryStyleCounts[key].count++;
        });
        
        // 즐겨찾기 카운트 추가
        genderFavorites.forEach(fav => {
            const key = `${fav.code}_${fav.name}`;
            if (categoryStyleCounts[key]) {
                categoryStyleCounts[key].favoriteCount++;
            }
        });
        
        const topCategoryStyles = Object.values(categoryStyleCounts)
            .map(style => ({
                ...style,
                totalScore: style.count + (style.favoriteCount * 2)
            }))
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 5);
        
        html += `
            <div class="category-stats-section">
                <div class="category-stats-title">
                    ${category} TOP 5 (${categoryGroups[category].length}회 기록)
                </div>
                <div class="top-styles-grid">
        `;
        
        if (topCategoryStyles.length === 0) {
            html += '<div class="no-data-stats">등록된 스타일이 없습니다</div>';
        } else {
            topCategoryStyles.forEach((style, index) => {
                const rank = index + 1;
                const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
                const imageUrl = style.imageUrl || generatePlaceholderImage(style.name);
                
                html += `
                    <div class="top-style-item">
                        <div class="style-rank ${rankClass}">${rank}</div>
                        <img class="style-image-stats" src="${imageUrl}" alt="${style.name}"
                             onerror="this.src='${generatePlaceholderImage(style.name)}'">
                        <div class="style-info-stats">
                            <div class="style-code-stats">${style.code}</div>
                            <div class="style-name-stats">${style.name}</div>
                            <div class="style-count-stats">
                                <span class="count-number">${style.count}</span>회 선택
                                ${style.favoriteCount > 0 ? `<span class="count-number">❤️ ${style.favoriteCount}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        
        html += '</div></div>';
    });
    
    container.innerHTML = html;
}

// 통계 오류 표시
function showStatsError(message) {
    ['statsOverall', 'statsMale', 'statsFemale'].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `
                <div class="no-data-stats">
                    <p>⚠️ ${message}</p>
                </div>
            `;
        }
    });
}

// 인기 통계 모달 닫기
function closePopularityStats() {
    const modal = document.getElementById('popularityStatsModal');
    if (modal) {
        modal.remove();
    }
}