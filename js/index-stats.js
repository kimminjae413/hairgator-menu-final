// ========== HAIRGATOR 최적화된 인기 통계 시스템 ========== 
console.log('📊 통계 시스템 최적화 로드 시작...');

// ========== 통계 캐시 시스템 ========== 
let statsCache = {
    data: null,
    timestamp: null,
    ttl: 5 * 60 * 1000 // 5분 TTL
};

let isStatsLoading = false;

// ========== 인기 통계 모달 표시 ========== 
function showPopularityStats() {
    const modalHTML = `
        <div class="popularity-stats-modal" id="popularityStatsModal">
            <div class="stats-container">
                <div class="stats-header">
                    <h3>📊 인기 스타일 통계</h3>
                    <button class="stats-close" onclick="closePopularityStats()">×</button>
                </div>
                
                <div class="stats-tabs">
                    <div class="stats-tab active" onclick="switchStatsTab('overall')" data-tab="overall">
                        🏆 전체 베스트
                    </div>
                    <div class="stats-tab" onclick="switchStatsTab('male')" data-tab="male">
                        👨 남성 인기
                    </div>
                    <div class="stats-tab" onclick="switchStatsTab('female')" data-tab="female">
                        👩 여성 인기
                    </div>
                    <div class="stats-tab" onclick="switchStatsTab('trends')" data-tab="trends">
                        📈 트렌드
                    </div>
                </div>
                
                <!-- 전체 베스트 -->
                <div id="statsOverall" class="stats-content active">
                    <div class="loading-stats">
                        <div class="spinner"></div>
                        <p>전체 디자이너 통계를 분석 중입니다...</p>
                    </div>
                </div>
                
                <!-- 남성 인기 -->
                <div id="statsMale" class="stats-content">
                    <div class="loading-stats">
                        <div class="spinner"></div>
                        <p>남성 인기 스타일을 분석 중입니다...</p>
                    </div>
                </div>
                
                <!-- 여성 인기 -->
                <div id="statsFemale" class="stats-content">
                    <div class="loading-stats">
                        <div class="spinner"></div>
                        <p>여성 인기 스타일을 분석 중입니다...</p>
                    </div>
                </div>
                
                <!-- 트렌드 분석 -->
                <div id="statsTrends" class="stats-content">
                    <div class="loading-stats">
                        <div class="spinner"></div>
                        <p>최신 트렌드를 분석 중입니다...</p>
                    </div>
                </div>
                
                <div class="stats-footer">
                    <div class="stats-update-time" id="statsUpdateTime">
                        실시간 데이터 · 모든 디자이너 통합 통계
                    </div>
                    <button class="refresh-stats-btn" onclick="refreshStats()" id="refreshStatsBtn">
                        🔄 새로고침
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    closeHamburgerMenu();
    
    // 통계 데이터 로드
    loadPopularityStats();
}

// ========== 통계 탭 전환 ========== 
function switchStatsTab(tabName) {
    // 탭 활성화
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.stats-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`stats${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    
    if (activeTab && activeContent) {
        activeTab.classList.add('active');
        activeContent.classList.add('active');
    }
}

// ========== 최적화된 통계 데이터 로드 ========== 
async function loadPopularityStats(forceRefresh = false) {
    if (isStatsLoading) return;
    
    // 캐시 확인
    if (!forceRefresh && isStatsCacheValid()) {
        console.log('📊 캐시된 통계 데이터 사용');
        renderAllStats(statsCache.data);
        updateStatsTime();
        return;
    }
    
    if (!firebaseConnected) {
        console.log('❌ Firebase 연결 없음 - 통계 불가');
        showStatsError('Firebase 연결이 필요합니다');
        return;
    }

    isStatsLoading = true;
    updateLoadingState(true);
    
    try {
        console.log('📊 통계 분석 시작...');
        
        // 병렬 쿼리로 성능 최적화
        const [customersSnapshot, stylesSnapshot] = await Promise.all([
            db.collection('customers').get(),
            db.collection('hairstyles').orderBy('views', 'desc').limit(100).get()
        ]);
        
        if (customersSnapshot.empty) {
            showStatsError('등록된 고객 데이터가 없습니다');
            return;
        }
        
        const statsData = await processStatsData(customersSnapshot, stylesSnapshot);
        
        // 캐시에 저장
        statsCache = {
            data: statsData,
            timestamp: Date.now(),
            ttl: 5 * 60 * 1000
        };
        
        console.log(`📈 통계 분석 완료: ${statsData.summary.totalCustomers}명 고객, ${statsData.summary.totalDesigners}명 디자이너`);
        
        renderAllStats(statsData);
        updateStatsTime();
        
    } catch (error) {
        console.error('❌ 통계 분석 오류:', error);
        showStatsError('통계 분석 중 오류가 발생했습니다');
    } finally {
        isStatsLoading = false;
        updateLoadingState(false);
    }
}

// ========== 통계 데이터 처리 최적화 ========== 
async function processStatsData(customersSnapshot, stylesSnapshot) {
    const allVisits = [];
    const allFavorites = [];
    const designerStats = new Map();
    let totalCustomers = 0;
    const totalDesigners = new Set();
    
    // 고객 데이터 처리
    customersSnapshot.forEach(doc => {
        const customer = doc.data();
        totalCustomers++;
        
        if (customer.designerId) {
            totalDesigners.add(customer.designerId);
            
            // 디자이너별 통계
            if (!designerStats.has(customer.designerId)) {
                designerStats.set(customer.designerId, {
                    customerCount: 0,
                    totalVisits: 0,
                    favoriteCount: 0
                });
            }
            const designerStat = designerStats.get(customer.designerId);
            designerStat.customerCount++;
        }
        
        // 방문 기록 처리 (최적화)
        if (customer.visitHistory?.length > 0) {
            customer.visitHistory.forEach(visit => {
                if (visit.styleCode && visit.styleName) {
                    const visitData = {
                        code: visit.styleCode,
                        name: visit.styleName,
                        gender: visit.gender,
                        mainCategory: visit.mainCategory,
                        subCategory: visit.subCategory,
                        imageUrl: visit.imageUrl || '',
                        designerId: customer.designerId,
                        date: visit.date?.toDate ? visit.date.toDate() : new Date(visit.date)
                    };
                    allVisits.push(visitData);
                    
                    if (customer.designerId) {
                        designerStats.get(customer.designerId).totalVisits++;
                    }
                }
            });
        }
        
        // 즐겨찾기 처리
        if (customer.favoriteStyles?.length > 0) {
            customer.favoriteStyles.forEach(fav => {
                if (fav.code && fav.name) {
                    allFavorites.push({
                        code: fav.code,
                        name: fav.name,
                        designerId: customer.designerId
                    });
                    
                    if (customer.designerId) {
                        designerStats.get(customer.designerId).favoriteCount++;
                    }
                }
            });
        }
    });
    
    // 스타일별 조회수 데이터 추가
    const styleViews = new Map();
    stylesSnapshot.forEach(doc => {
        const style = doc.data();
        styleViews.set(style.code, style.views || 0);
    });
    
    return {
        visits: allVisits,
        favorites: allFavorites,
        styleViews: styleViews,
        summary: {
            totalCustomers,
            totalDesigners: totalDesigners.size,
            totalVisits: allVisits.length,
            totalStyles: styleViews.size
        },
        designerStats: designerStats
    };
}

// ========== 모든 통계 렌더링 ========== 
function renderAllStats(statsData) {
    renderOverallStats(statsData);
    renderGenderStats('male', statsData);
    renderGenderStats('female', statsData);
    renderTrendStats(statsData);
}

// ========== 전체 베스트 통계 렌더링 (최적화) ========== 
function renderOverallStats(statsData) {
    const container = document.getElementById('statsOverall');
    
    // 스타일별 종합 점수 계산
    const styleScores = calculateStyleScores(statsData.visits, statsData.favorites, statsData.styleViews);
    
    // 상위 15개 선택
    const topStyles = Object.values(styleScores)
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 15);
    
    let html = `
        <div class="stats-summary">
            <div class="stats-card primary">
                <div class="stats-card-icon">👥</div>
                <div class="stats-card-number">${statsData.summary.totalCustomers}</div>
                <div class="stats-card-label">총 고객 수</div>
            </div>
            <div class="stats-card secondary">
                <div class="stats-card-icon">✂️</div>
                <div class="stats-card-number">${statsData.summary.totalDesigners}</div>
                <div class="stats-card-label">참여 디자이너</div>
            </div>
            <div class="stats-card accent">
                <div class="stats-card-icon">📊</div>
                <div class="stats-card-number">${statsData.summary.totalVisits}</div>
                <div class="stats-card-label">총 스타일 기록</div>
            </div>
            <div class="stats-card success">
                <div class="stats-card-icon">🎨</div>
                <div class="stats-card-number">${statsData.summary.totalStyles}</div>
                <div class="stats-card-label">등록된 스타일</div>
            </div>
        </div>
        
        <div class="category-stats-section">
            <div class="category-stats-title">
                🏆 전체 베스트 TOP 15
                <span class="stats-subtitle">모든 디자이너 통합 · 종합 점수 기준</span>
            </div>
            <div class="top-styles-grid">
    `;
    
    if (topStyles.length === 0) {
        html += '<div class="no-data-stats">등록된 스타일이 없습니다</div>';
    } else {
        topStyles.forEach((style, index) => {
            const rank = index + 1;
            const rankClass = getRankClass(rank);
            const imageUrl = style.imageUrl || generatePlaceholderImage(style.name);
            
            html += `
                <div class="top-style-item ${rankClass}">
                    <div class="style-rank">${getRankDisplay(rank)}</div>
                    <img class="style-image-stats" src="${imageUrl}" alt="${style.name}"
                         onerror="this.src='${generatePlaceholderImage(style.name)}'">
                    <div class="style-info-stats">
                        <div class="style-code-stats">${style.code}</div>
                        <div class="style-name-stats">${style.name}</div>
                        <div class="style-metrics">
                            <span class="metric-item">👀 ${style.views}</span>
                            <span class="metric-item">📊 ${style.visits}회</span>
                            ${style.favorites > 0 ? `<span class="metric-item">❤️ ${style.favorites}</span>` : ''}
                        </div>
                        <div class="style-score">점수: ${Math.round(style.totalScore)}</div>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div></div>';
    container.innerHTML = html;
}

// ========== 성별 통계 렌더링 (최적화) ========== 
function renderGenderStats(gender, statsData) {
    const container = document.getElementById(`stats${gender.charAt(0).toUpperCase() + gender.slice(1)}`);
    
    // 해당 성별 데이터 필터링
    const genderVisits = statsData.visits.filter(visit => visit.gender === gender);
    const genderFavorites = statsData.favorites.filter(fav => 
        genderVisits.some(visit => visit.code === fav.code)
    );
    
    if (genderVisits.length === 0) {
        container.innerHTML = `
            <div class="no-data-stats">
                <div class="empty-icon">${gender === 'male' ? '👨' : '👩'}</div>
                <div class="empty-text">${gender === 'male' ? '남성' : '여성'} 스타일 데이터가 없습니다</div>
            </div>
        `;
        return;
    }
    
    // 성별별 스타일 점수 계산
    const genderStyleScores = calculateStyleScores(genderVisits, genderFavorites, statsData.styleViews);
    const topGenderStyles = Object.values(genderStyleScores)
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 12);
    
    // 카테고리별 그룹화
    const categoryGroups = groupByCategory(genderVisits, gender);
    
    let html = `
        <div class="stats-summary">
            <div class="stats-card">
                <div class="stats-card-icon">${gender === 'male' ? '👨' : '👩'}</div>
                <div class="stats-card-number">${genderVisits.length}</div>
                <div class="stats-card-label">${gender === 'male' ? '남성' : '여성'} 스타일 기록</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-icon">📂</div>
                <div class="stats-card-number">${Object.keys(categoryGroups).length}</div>
                <div class="stats-card-label">활성 카테고리</div>
            </div>
            <div class="stats-card">
                <div class="stats-card-icon">❤️</div>
                <div class="stats-card-number">${genderFavorites.length}</div>
                <div class="stats-card-label">즐겨찾기</div>
            </div>
        </div>
        
        <!-- 전체 TOP 스타일 -->
        <div class="category-stats-section">
            <div class="category-stats-title">
                🏆 ${gender === 'male' ? '남성' : '여성'} 전체 TOP 12
            </div>
            <div class="top-styles-grid compact">
    `;
    
    topGenderStyles.forEach((style, index) => {
        const rank = index + 1;
        const rankClass = getRankClass(rank);
        const imageUrl = style.imageUrl || generatePlaceholderImage(style.name);
        
        html += `
            <div class="top-style-item compact ${rankClass}">
                <div class="style-rank">${rank}</div>
                <img class="style-image-stats" src="${imageUrl}" alt="${style.name}"
                     onerror="this.src='${generatePlaceholderImage(style.name)}'">
                <div class="style-info-stats">
                    <div class="style-code-stats">${style.code}</div>
                    <div class="style-name-stats">${style.name}</div>
                    <div class="style-metrics compact">
                        <span class="metric-item">📊 ${style.visits}</span>
                        ${style.favorites > 0 ? `<span class="metric-item">❤️ ${style.favorites}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `</div></div>`;
    
    // 카테고리별 TOP 3
    const categoryOrder = getCategoryOrder(gender);
    categoryOrder.forEach(category => {
        if (!categoryGroups[category] || categoryGroups[category].length < 3) return;
        
        const categoryStyleScores = calculateStyleScores(
            categoryGroups[category], 
            genderFavorites.filter(fav => 
                categoryGroups[category].some(visit => visit.code === fav.code)
            ), 
            statsData.styleViews
        );
        
        const topCategoryStyles = Object.values(categoryStyleScores)
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 3);
        
        html += `
            <div class="category-stats-section">
                <div class="category-stats-title">
                    ${category} TOP 3 
                    <span class="category-count">(${categoryGroups[category].length}회 기록)</span>
                </div>
                <div class="top-styles-grid mini">
        `;
        
        topCategoryStyles.forEach((style, index) => {
            const rank = index + 1;
            const imageUrl = style.imageUrl || generatePlaceholderImage(style.name);
            
            html += `
                <div class="top-style-item mini">
                    <div class="style-rank">${rank}</div>
                    <img class="style-image-stats" src="${imageUrl}" alt="${style.name}"
                         onerror="this.src='${generatePlaceholderImage(style.name)}'">
                    <div class="style-info-stats">
                        <div class="style-code-stats">${style.code}</div>
                        <div class="style-name-stats">${style.name}</div>
                        <div class="style-count-mini">${style.visits}회</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    container.innerHTML = html;
}

// ========== 트렌드 분석 렌더링 ========== 
function renderTrendStats(statsData) {
    const container = document.getElementById('statsTrends');
    
    // 최근 30일 데이터 분석
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentVisits = statsData.visits.filter(visit => 
        visit.date && visit.date >= thirtyDaysAgo
    );
    
    // 급상승 스타일 분석
    const trendingStyles = analyzeTrendingStyles(recentVisits, statsData.visits);
    
    // 성별 트렌드
    const genderTrends = {
        male: recentVisits.filter(v => v.gender === 'male').length,
        female: recentVisits.filter(v => v.gender === 'female').length
    };
    
    let html = `
        <div class="stats-summary">
            <div class="stats-card trend">
                <div class="stats-card-icon">🔥</div>
                <div class="stats-card-number">${recentVisits.length}</div>
                <div class="stats-card-label">최근 30일 기록</div>
            </div>
            <div class="stats-card trend">
                <div class="stats-card-icon">📈</div>
                <div class="stats-card-number">${trendingStyles.length}</div>
                <div class="stats-card-label">급상승 스타일</div>
            </div>
            <div class="stats-card trend">
                <div class="stats-card-icon">👨</div>
                <div class="stats-card-number">${genderTrends.male}</div>
                <div class="stats-card-label">남성 트렌드</div>
            </div>
            <div class="stats-card trend">
                <div class="stats-card-icon">👩</div>
                <div class="stats-card-number">${genderTrends.female}</div>
                <div class="stats-card-label">여성 트렌드</div>
            </div>
        </div>
    `;
    
    if (trendingStyles.length > 0) {
        html += `
            <div class="category-stats-section">
                <div class="category-stats-title">
                    🔥 급상승 스타일 (최근 30일)
                    <span class="stats-subtitle">기존 대비 상승률 기준</span>
                </div>
                <div class="top-styles-grid trending">
        `;
        
        trendingStyles.slice(0, 8).forEach((style, index) => {
            const imageUrl = style.imageUrl || generatePlaceholderImage(style.name);
            
            html += `
                <div class="trending-style-item">
                    <div class="trend-indicator">🔥</div>
                    <img class="style-image-stats" src="${imageUrl}" alt="${style.name}"
                         onerror="this.src='${generatePlaceholderImage(style.name)}'">
                    <div class="style-info-stats">
                        <div class="style-code-stats">${style.code}</div>
                        <div class="style-name-stats">${style.name}</div>
                        <div class="trend-stats">
                            <span class="trend-growth">+${Math.round(style.growthRate)}%</span>
                            <span class="trend-recent">${style.recentCount}회 (30일)</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
    } else {
        html += `
            <div class="no-data-stats">
                <div class="empty-icon">📈</div>
                <div class="empty-text">트렌드 분석을 위한 데이터가 부족합니다</div>
                <div class="empty-subtitle">더 많은 스타일 기록이 누적되면 트렌드 분석이 가능합니다</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ========== 유틸리티 함수들 ========== 

// 스타일별 종합 점수 계산
function calculateStyleScores(visits, favorites, styleViews) {
    const styleScores = {};
    
    // 방문 기록 점수
    visits.forEach(visit => {
        const key = `${visit.code}_${visit.name}`;
        if (!styleScores[key]) {
            styleScores[key] = {
                code: visit.code,
                name: visit.name,
                imageUrl: visit.imageUrl,
                visits: 0,
                favorites: 0,
                views: styleViews.get(visit.code) || 0,
                genders: new Set(),
                categories: new Set()
            };
        }
        styleScores[key].visits++;
        if (visit.gender) styleScores[key].genders.add(visit.gender);
        if (visit.mainCategory) styleScores[key].categories.add(visit.mainCategory);
    });
    
    // 즐겨찾기 점수
    favorites.forEach(fav => {
        const key = `${fav.code}_${fav.name}`;
        if (styleScores[key]) {
            styleScores[key].favorites++;
        }
    });
    
    // 총 점수 계산 (방문 1점 + 즐겨찾기 3점 + 조회수 0.1점)
    Object.values(styleScores).forEach(style => {
        style.totalScore = style.visits + (style.favorites * 3) + (style.views * 0.1);
    });
    
    return styleScores;
}

// 카테고리별 그룹화
function groupByCategory(visits, gender) {
    const groups = {};
    visits.forEach(visit => {
        const category = visit.mainCategory || '기타';
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(visit);
    });
    return groups;
}

// 급상승 스타일 분석
function analyzeTrendingStyles(recentVisits, allVisits) {
    const recentCounts = {};
    const totalCounts = {};
    
    // 최근 30일 카운트
    recentVisits.forEach(visit => {
        const key = `${visit.code}_${visit.name}`;
        recentCounts[key] = (recentCounts[key] || 0) + 1;
    });
    
    // 전체 카운트
    allVisits.forEach(visit => {
        const key = `${visit.code}_${visit.name}`;
        totalCounts[key] = (totalCounts[key] || 0) + 1;
    });
    
    const trending = [];
    Object.keys(recentCounts).forEach(key => {
        const recentCount = recentCounts[key];
        const totalCount = totalCounts[key];
        const pastCount = totalCount - recentCount;
        
        if (pastCount > 0 && recentCount >= 2) { // 최소 조건
            const growthRate = ((recentCount / pastCount) - 1) * 100;
            
            if (growthRate > 50) { // 50% 이상 상승
                const [code, name] = key.split('_');
                const sampleVisit = allVisits.find(v => v.code === code);
                
                trending.push({
                    code,
                    name,
                    imageUrl: sampleVisit?.imageUrl || '',
                    recentCount,
                    growthRate,
                    totalCount
                });
            }
        }
    });
    
    return trending.sort((a, b) => b.growthRate - a.growthRate);
}

// 랭킹 클래스 반환
function getRankClass(rank) {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    if (rank <= 5) return 'top5';
    return '';
}

// 랭킹 표시 반환
function getRankDisplay(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
}

// 카테고리 순서 반환
function getCategoryOrder(gender) {
    const categoryOrder = {
        male: ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'],
        female: ['LONG', 'SEMI LONG', 'MEDIUM', 'BOB', 'SHORT']
    };
    return categoryOrder[gender] || [];
}

// 캐시 유효성 확인
function isStatsCacheValid() {
    return statsCache.data && 
           statsCache.timestamp && 
           (Date.now() - statsCache.timestamp) < statsCache.ttl;
}

// 통계 새로고침
function refreshStats() {
    console.log('🔄 통계 강제 새로고침');
    loadPopularityStats(true);
}

// 로딩 상태 업데이트
function updateLoadingState(isLoading) {
    const refreshBtn = document.getElementById('refreshStatsBtn');
    if (refreshBtn) {
        refreshBtn.disabled = isLoading;
        refreshBtn.textContent = isLoading ? '⏳ 로딩 중...' : '🔄 새로고침';
    }
}

// 통계 업데이트 시간 표시
function updateStatsTime() {
    const timeElement = document.getElementById('statsUpdateTime');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = `마지막 업데이트: ${now.toLocaleTimeString('ko-KR')} · 실시간 데이터`;
    }
}

// 통계 오류 표시
function showStatsError(message) {
    ['statsOverall', 'statsMale', 'statsFemale', 'statsTrends'].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = `
                <div class="no-data-stats error">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">${message}</div>
                    <button onclick="refreshStats()" class="retry-btn">다시 시도</button>
                </div>
            `;
        }
    });
}

// 통계 모달 닫기
function closePopularityStats() {
    const modal = document.getElementById('popularityStatsModal');
    if (modal) {
        modal.remove();
    }
}

// ========== 전역 함수 등록 ========== 
window.showPopularityStats = showPopularityStats;
window.switchStatsTab = switchStatsTab;
window.refreshStats = refreshStats;
window.closePopularityStats = closePopularityStats;

console.log('✅ 최적화된 통계 시스템 로드 완료');
