/* ========================================
   HAIRGATOR - 메뉴 시스템 (Firebase 연동)
   ======================================== */

class MenuSystem {
    constructor() {
        this.categories = {
            male: ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'],
            female: ['A Length', 'B Length', 'C Length', 'D Length', 'E Length', 'F Length', 'G Length', 'H Length']
        };
        this.subCategories = ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone'];
        this.availableSubcategories = new Map(); // 실제 데이터가 있는 서브카테고리
    }
    
    // 성별에 따른 메뉴 로드
    loadMenuForGender(gender) {
        const categories = this.categories[gender];
        const mainTabsContainer = document.getElementById('mainTabs');
        
        if (!mainTabsContainer || !categories) return;
        
        // 기존 탭들 제거
        mainTabsContainer.innerHTML = '';
        
        // 새 탭들 생성
        categories.forEach((category, index) => {
            const tab = document.createElement('button');
            tab.className = 'main-tab';
            tab.textContent = category;
            tab.dataset.category = category;
            tab.addEventListener('click', () => this.selectMainTab(category, index, gender));
            
            mainTabsContainer.appendChild(tab);
        });
        
        // 첫 번째 탭 자동 선택
        if (categories.length > 0) {
            const firstTab = mainTabsContainer.querySelector('.main-tab');
            if (firstTab) {
                firstTab.classList.add('active');
                this.selectMainTab(categories[0], 0, gender);
            }
        }
        
        // 카테고리 개수 업데이트
        this.updateCategoryIndicator(categories.length);
    }
    
    // 카테고리 표시기 업데이트
    updateCategoryIndicator(count) {
        const indicator = document.querySelector('.active-count');
        if (indicator) {
            indicator.textContent = `${count}개 카테고리`;
        }
    }
    
    // 메인 탭 선택
    async selectMainTab(category, index, gender) {
        // 탭 활성화 상태 변경
        document.querySelectorAll('.main-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === index);
        });
        
        // 서브 카테고리 로드
        await this.loadSubCategories(category, gender);
    }
    
    // 서브 카테고리 로드
    async loadSubCategories(mainCategory, gender) {
        const subTabsContainer = document.getElementById('subTabs');
        if (!subTabsContainer) return;
        
        // 로딩 상태 표시
        subTabsContainer.innerHTML = '<div class="loading-tabs">서브카테고리 로딩 중...</div>';
        
        try {
            // Firebase에서 해당 메인 카테고리의 실제 데이터 확인
            const availableSubs = await this.getAvailableSubcategories(gender, mainCategory);
            
            // 서브탭들 제거
            subTabsContainer.innerHTML = '';
            
            // 서브 카테고리 탭들 생성
            this.subCategories.forEach((subCategory, index) => {
                const tab = document.createElement('button');
                tab.className = 'sub-tab';
                tab.textContent = subCategory;
                tab.dataset.subcategory = subCategory;
                
                // 실제 데이터가 있는지 확인
                const hasData = availableSubs.includes(subCategory);
                
                if (hasData) {
                    tab.addEventListener('click', () => this.selectSubTab(subCategory, index, gender, mainCategory));
                } else {
                    tab.classList.add('disabled');
                    tab.title = '해당 카테고리에 스타일이 없습니다';
                }
                
                // NEW 표시 (7일 이내 등록된 스타일이 있는 경우)
                if (hasData && await this.hasNewStyles(gender, mainCategory, subCategory)) {
                    tab.classList.add('new');
                }
                
                subTabsContainer.appendChild(tab);
            });
            
            // 첫 번째 활성화된 서브탭 자동 선택
            const firstActiveTab = subTabsContainer.querySelector('.sub-tab:not(.disabled)');
            if (firstActiveTab) {
                const subCategory = firstActiveTab.dataset.subcategory;
                const index = Array.from(subTabsContainer.children).indexOf(firstActiveTab);
                firstActiveTab.classList.add('active');
                this.selectSubTab(subCategory, index, gender, mainCategory);
            }
            
        } catch (error) {
            console.error('서브카테고리 로드 실패:', error);
            subTabsContainer.innerHTML = '<div class="error-tabs">로드 실패</div>';
        }
    }
    
    // 실제 데이터가 있는 서브카테고리 조회
    async getAvailableSubcategories(gender, mainCategory) {
        try {
            const snapshot = await db.collection('hairstyles')
                .where('gender', '==', gender)
                .where('mainCategory', '==', mainCategory)
                .get();
            
            const availableSubs = new Set();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.subCategory) {
                    availableSubs.add(data.subCategory);
                }
            });
            
            return Array.from(availableSubs);
            
        } catch (error) {
            console.error('서브카테고리 조회 실패:', error);
            return [];
        }
    }
    
    // 새로운 스타일이 있는지 확인 (7일 이내)
    async hasNewStyles(gender, mainCategory, subCategory) {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const snapshot = await db.collection('hairstyles')
                .where('gender', '==', gender)
                .where('mainCategory', '==', mainCategory)
                .where('subCategory', '==', subCategory)
                .where('createdAt', '>=', sevenDaysAgo)
                .limit(1)
                .get();
            
            return !snapshot.empty;
            
        } catch (error) {
            console.error('새 스타일 확인 실패:', error);
            return false;
        }
    }
    
    // 서브 탭 선택
    selectSubTab(subCategory, index, gender, mainCategory) {
        // 서브탭 활성화 상태 변경
        document.querySelectorAll('.sub-tab').forEach((tab, i) => {
            tab.classList.toggle('active', i === index);
        });
        
        // 스타일 로드
        this.loadStyles(gender, mainCategory, subCategory);
    }
    
    // 스타일 로드
    async loadStyles(gender, mainCategory, subCategory) {
        const stylesGrid = document.getElementById('stylesGrid');
        if (!stylesGrid) return;
        
        // 로딩 상태 표시
        stylesGrid.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>스타일 로딩 중...</p>
            </div>
        `;
        
        try {
            // Firebase 쿼리
            const query = db.collection('hairstyles')
                .where('gender', '==', gender)
                .where('mainCategory', '==', mainCategory)
                .where('subCategory', '==', subCategory)
                .orderBy('createdAt', 'desc');
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                stylesGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🎨</div>
                        <h3>스타일이 없습니다</h3>
                        <p>이 카테고리에는 아직 등록된 스타일이 없어요</p>
                    </div>
                `;
                return;
            }
            
            // 스타일 데이터 수집
            const styles = [];
            snapshot.forEach(doc => {
                styles.push({ id: doc.id, ...doc.data() });
            });
            
            // 스타일 그리드 렌더링
            this.renderStylesGrid(styles);
            
            // app 인스턴스에 데이터 저장 (검색 등에서 사용)
            if (typeof app !== 'undefined') {
                app.stylesData = styles;
                app.filteredStyles = [...styles];
            }
            
        } catch (error) {
            console.error('스타일 로드 실패:', error);
            stylesGrid.innerHTML = `
                <div class="error-container">
                    <p>스타일을 불러오는데 실패했습니다.</p>
                    <button class="btn" onclick="menuSystem.loadStyles('${gender}', '${mainCategory}', '${subCategory}')">다시 시도</button>
                </div>
            `;
        }
    }
    
    // 스타일 그리드 렌더링
    renderStylesGrid(styles) {
        const stylesGrid = document.getElementById('stylesGrid');
        if (!stylesGrid) return;
        
        const gridHTML = styles.map(style => `
            <div class="style-card" onclick="menuSystem.viewStyleDetail('${style.id}', ${JSON.stringify(style).replace(/"/g, '&quot;')})">
                <div class="style-image">
                    ${style.imageUrl ? 
                        `<img src="${style.imageUrl}" alt="${style.name}" loading="lazy" 
                             onerror="this.parentElement.innerHTML='<div class=&quot;no-image-placeholder&quot;><i data-lucide=&quot;image&quot;></i></div>'">` : 
                        `<div class="no-image-placeholder">
                            <i data-lucide="image"></i>
                        </div>`
                    }
                </div>
                <div class="style-overlay">
                    <div class="style-info">
                        <div class="style-name">${style.name}</div>
                        <div class="style-category">${style.code || 'NO CODE'}</div>
                    </div>
                </div>
                ${this.isNewStyle(style.createdAt) ? '<div class="style-new-badge"></div>' : ''}
            </div>
        `).join('');
        
        stylesGrid.innerHTML = gridHTML;
        
        // 아이콘 재초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    // 새로운 스타일인지 확인
    isNewStyle(createdAt) {
        if (!createdAt) return false;
        
        const now = new Date();
        const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        const diffDays = (now - created) / (1000 * 60 * 60 * 24);
        
        return diffDays <= 7; // 7일 이내면 NEW 표시
    }
    
    // 스타일 상세보기
    viewStyleDetail(styleId, styleData) {
        console.log('스타일 상세보기:', styleId, styleData);
        
        // 토큰 시스템과 연동하여 상세보기 기능 구현
        executeWithTokens('STYLE_DETAIL_VIEW', async () => {
            this.showStyleDetailModal(styleData);
        });
    }
    
    // 스타일 상세보기 모달
    showStyleDetailModal(style) {
        const modal = document.createElement('div');
        modal.className = 'style-detail-modal';
        modal.innerHTML = `
            <div class="style-detail-content">
                <div class="style-detail-header">
                    <h3>${style.name}</h3>
                    <button class="style-detail-close" onclick="this.closest('.style-detail-modal').remove()">×</button>
                </div>
                <div class="style-detail-body">
                    <div class="style-image-large">
                        ${style.imageUrl ? 
                            `<img src="${style.imageUrl}" alt="${style.name}">` :
                            `<div class="no-image-large">이미지가 없습니다</div>`
                        }
                    </div>
                    <div class="style-details">
                        <div class="detail-item">
                            <label>코드:</label>
                            <span>${style.code || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <label>카테고리:</label>
                            <span>${style.mainCategory} > ${style.subCategory}</span>
                        </div>
                        <div class="detail-item">
                            <label>등록일:</label>
                            <span>${style.createdAt ? new Date(style.createdAt.toDate()).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div class="detail-actions">
                            <button class="btn btn-primary" onclick="menuSystem.recommendStyle('${style.id}')">
                                <i data-lucide="heart"></i>
                                추천하기
                            </button>
                            <button class="btn btn-secondary" onclick="menuSystem.shareStyle('${style.id}')">
                                <i data-lucide="share-2"></i>
                                공유하기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 스타일 추가
        if (!document.getElementById('style-detail-modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'style-detail-modal-styles';
            styles.textContent = `
                .style-detail-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    backdrop-filter: blur(8px);
                }
                
                .style-detail-content {
                    background: var(--bg-card);
                    border: 1px solid var(--accent-primary);
                    border-radius: var(--border-radius-xl);
                    padding: 2rem;
                    max-width: 600px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: var(--shadow-xl);
                }
                
                .style-detail-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .style-detail-header h3 {
                    color: var(--text-primary);
                    font-size: 1.5rem;
                    margin: 0;
                }
                
                .style-detail-close {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    font-size: 2rem;
                    cursor: pointer;
                    line-height: 1;
                }
                
                .style-image-large {
                    width: 100%;
                    height: 400px;
                    border-radius: var(--border-radius);
                    overflow: hidden;
                    margin-bottom: 1.5rem;
                    background: var(--bg-secondary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .style-image-large img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .no-image-large {
                    color: var(--text-muted);
                    font-size: 1.2rem;
                }
                
                .detail-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.8rem 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                
                .detail-item label {
                    color: var(--text-secondary);
                    font-weight: 600;
                }
                
                .detail-item span {
                    color: var(--text-primary);
                }
                
                .detail-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .detail-actions .btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.8rem 1rem;
                    border: none;
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    font-weight: 600;
                    transition: all var(--transition);
                }
                
                .btn-primary {
                    background: var(--accent-primary);
                    color: var(--text-inverse);
                }
                
                .btn-secondary {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .btn:hover {
                    transform: translateY(-2px);
                }
                
                @media (max-width: 768px) {
                    .style-detail-content {
                        margin: 1rem;
                        padding: 1.5rem;
                    }
                    
                    .style-image-large {
                        height: 300px;
                    }
                    
                    .detail-actions {
                        flex-direction: column;
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(modal);
        
        // 아이콘 초기화
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // ESC 키로 닫기
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // 배경 클릭으로 닫기
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // 스타일 추천
    async recommendStyle(styleId) {
        await executeWithTokens('STYLE_RECOMMEND', async () => {
            // 추천 로직 구현
            console.log('스타일 추천:', styleId);
            
            if (typeof app !== 'undefined') {
                app.showToast('스타일을 추천했습니다!', 'success');
            }
            
            // Firebase에 추천 기록 저장
            try {
                await db.collection('recommendations').add({
                    styleId: styleId,
                    userId: authSystem.getCurrentUser()?.id,
                    createdAt: new Date()
                });
            } catch (error) {
                console.error('추천 저장 실패:', error);
            }
        });
    }
    
    // 스타일 공유
    shareStyle(styleId) {
        // Web Share API 사용
        if (navigator.share) {
            navigator.share({
                title: 'HAIRGATOR 스타일',
                text: '이 헤어스타일을 확인해보세요!',
                url: `${window.location.origin}/?style=${styleId}`
            }).catch(console.error);
        } else {
            // 폴백: URL 복사
            const url = `${window.location.origin}/?style=${styleId}`;
            navigator.clipboard.writeText(url).then(() => {
                if (typeof app !== 'undefined') {
                    app.showToast('링크가 복사되었습니다!', 'success');
                }
            }).catch(() => {
                alert(`스타일 링크: ${url}`);
            });
        }
    }
    
    // 검색 기능
    async searchStyles(query) {
        if (!query.trim()) return [];
        
        try {
            // Firebase에서 스타일 검색 (name 기준)
            const snapshot = await db.collection('hairstyles')
                .where('name', '>=', query)
                .where('name', '<=', query + '\uf8ff')
                .limit(20)
                .get();
            
            const results = [];
            snapshot.forEach(doc => {
                results.push({ id: doc.id, ...doc.data() });
            });
            
            return results;
            
        } catch (error) {
            console.error('검색 실패:', error);
            return [];
        }
    }
    
    // 카테고리별 통계
    async getCategoryStats(gender) {
        try {
            const stats = {};
            const categories = this.categories[gender];
            
            for (const category of categories) {
                const snapshot = await db.collection('hairstyles')
                    .where('gender', '==', gender)
                    .where('mainCategory', '==', category)
                    .get();
                
                stats[category] = snapshot.size;
            }
            
            return stats;
            
        } catch (error) {
            console.error('카테고리 통계 조회 실패:', error);
            return {};
        }
    }
    
    // 인기 스타일 조회
    async getPopularStyles(limit = 10) {
        try {
            const snapshot = await db.collection('hairstyles')
                .orderBy('likes', 'desc')
                .orderBy('views', 'desc')
                .limit(limit)
                .get();
            
            const popular = [];
            snapshot.forEach(doc => {
                popular.push({ id: doc.id, ...doc.data() });
            });
            
            return popular;
            
        } catch (error) {
            console.error('인기 스타일 조회 실패:', error);
            return [];
        }
    }
}

// 전역 메뉴 시스템 인스턴스
const menuSystem = new MenuSystem();

// 전역 함수들
window.menuSystem = menuSystem;
window.loadMenuForGender = (gender) => menuSystem.loadMenuForGender(gender);
window.searchStyles = (query) => menuSystem.searchStyles(query);

console.log('🎨 메뉴 시스템 로드 완료');
