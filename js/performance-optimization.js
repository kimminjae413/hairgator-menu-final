// ========== HAIRGATOR 네이티브 수준 성능 최적화 시스템 ==========
// 1. 데이터 캐싱 및 프리로딩 시스템
// 2. 이미지 지연 로딩 및 압축
// 3. 가상 스크롤링
// 4. 터치 최적화

console.log('🚀 HAIRGATOR 성능 최적화 시스템 로딩...');

// ========== 1. 고급 캐싱 및 프리로딩 시스템 ==========
class HairGatorCache {
    constructor() {
        this.styleCache = new Map();
        this.imageCache = new Map();
        this.queryCache = new Map();
        this.preloadQueue = [];
        this.isPreloading = false;
        
        // IndexedDB 캐시 (오프라인 지원)
        this.initIndexedDB();
        
        // 메모리 관리
        this.maxCacheSize = 100; // 최대 캐시 아이템 수
        this.compressionQuality = 0.8;
    }
    
    async initIndexedDB() {
        try {
            this.idb = await new Promise((resolve, reject) => {
                const request = indexedDB.open('HairGatorCache', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('styles')) {
                        db.createObjectStore('styles', { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains('images')) {
                        db.createObjectStore('images', { keyPath: 'url' });
                    }
                };
            });
            console.log('✅ IndexedDB 캐시 초기화 완료');
        } catch (error) {
            console.warn('IndexedDB 초기화 실패, 메모리 캐시만 사용:', error);
        }
    }
    
    // 스타일 데이터 캐싱
    async cacheStyles(gender, category, subcategory, styles) {
        const key = `${gender}-${category}-${subcategory}`;
        const cacheData = {
            key,
            styles,
            timestamp: Date.now(),
            expiresAt: Date.now() + (10 * 60 * 1000) // 10분 캐시
        };
        
        // 메모리 캐시
        this.styleCache.set(key, cacheData);
        
        // IndexedDB 캐시
        if (this.idb) {
            try {
                const tx = this.idb.transaction(['styles'], 'readwrite');
                await tx.objectStore('styles').put({ id: key, ...cacheData });
            } catch (error) {
                console.warn('IndexedDB 저장 실패:', error);
            }
        }
        
        // 메모리 관리
        this.cleanupCache();
        
        // 이미지 프리로딩 스케줄링
        this.scheduleImagePreload(styles);
        
        console.log(`📦 캐시 저장: ${key} (${styles.length}개 스타일)`);
    }
    
    // 캐시된 스타일 가져오기
    async getCachedStyles(gender, category, subcategory) {
        const key = `${gender}-${category}-${subcategory}`;
        
        // 메모리 캐시 확인
        const memoryCache = this.styleCache.get(key);
        if (memoryCache && memoryCache.expiresAt > Date.now()) {
            console.log(`⚡ 메모리 캐시 히트: ${key}`);
            return memoryCache.styles;
        }
        
        // IndexedDB 캐시 확인
        if (this.idb) {
            try {
                const tx = this.idb.transaction(['styles'], 'readonly');
                const cached = await tx.objectStore('styles').get(key);
                if (cached && cached.expiresAt > Date.now()) {
                    console.log(`💾 IndexedDB 캐시 히트: ${key}`);
                    // 메모리 캐시에도 복원
                    this.styleCache.set(key, cached);
                    return cached.styles;
                }
            } catch (error) {
                console.warn('IndexedDB 읽기 실패:', error);
            }
        }
        
        return null;
    }
    
    // 이미지 프리로딩 스케줄링
    scheduleImagePreload(styles) {
        const urls = styles.map(style => style.imageUrl).filter(url => !this.imageCache.has(url));
        this.preloadQueue.push(...urls);
        
        if (!this.isPreloading) {
            this.startPreloadingImages();
        }
    }
    
    // 이미지 백그라운드 프리로딩
    async startPreloadingImages() {
        this.isPreloading = true;
        
        while (this.preloadQueue.length > 0) {
            const url = this.preloadQueue.shift();
            if (this.imageCache.has(url)) continue;
            
            try {
                await this.preloadImage(url);
                // 부드러운 프리로딩을 위한 딜레이
                await new Promise(resolve => setTimeout(resolve, 50));
            } catch (error) {
                console.warn('이미지 프리로딩 실패:', url, error);
            }
        }
        
        this.isPreloading = false;
    }
    
    // 개별 이미지 프리로딩
    preloadImage(url) {
        return new Promise((resolve, reject) => {
            if (this.imageCache.has(url)) {
                resolve(this.imageCache.get(url));
                return;
            }
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                // 압축된 버전 생성
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 적절한 크기로 리사이징
                const maxSize = 400;
                let { width, height } = img;
                
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const compressedUrl = canvas.toDataURL('image/jpeg', this.compressionQuality);
                this.imageCache.set(url, compressedUrl);
                
                console.log(`🖼️ 이미지 프리로드 완료: ${url.substring(url.lastIndexOf('/') + 1)}`);
                resolve(compressedUrl);
            };
            
            img.onerror = () => reject(new Error(`Failed to load ${url}`));
            img.src = url;
        });
    }
    
    // 캐시 정리
    cleanupCache() {
        if (this.styleCache.size > this.maxCacheSize) {
            const entries = Array.from(this.styleCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            // 오래된 캐시 삭제
            const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
            toDelete.forEach(([key]) => {
                this.styleCache.delete(key);
                console.log(`🗑️ 캐시 정리: ${key}`);
            });
        }
    }
    
    // 캐시된 이미지 가져오기
    getCachedImage(url) {
        return this.imageCache.get(url) || url;
    }
}

// ========== 2. 가상 스크롤링 시스템 ==========
class VirtualScroller {
    constructor(container, itemHeight = 120, buffer = 5) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.buffer = buffer;
        this.items = [];
        this.visibleItems = new Map();
        this.scrollTop = 0;
        this.containerHeight = 0;
        
        this.setupVirtualScrolling();
    }
    
    setupVirtualScrolling() {
        // 컨테이너 설정
        this.container.style.overflowY = 'auto';
        this.container.style.position = 'relative';
        
        // 스크롤 이벤트 (디바운스 적용)
        let scrollTimeout;
        this.container.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.handleScroll();
            }, 16); // 60fps
        }, { passive: true });
        
        // 리사이즈 관찰
        this.resizeObserver = new ResizeObserver(() => {
            this.updateContainerHeight();
            this.render();
        });
        this.resizeObserver.observe(this.container);
    }
    
    setItems(items) {
        this.items = items;
        this.totalHeight = items.length * this.itemHeight;
        
        // 스크롤 영역 크기 설정
        if (!this.scrollContainer) {
            this.scrollContainer = document.createElement('div');
            this.scrollContainer.style.position = 'absolute';
            this.scrollContainer.style.top = '0';
            this.scrollContainer.style.left = '0';
            this.scrollContainer.style.right = '0';
            this.scrollContainer.style.pointerEvents = 'none';
            this.container.appendChild(this.scrollContainer);
        }
        
        this.scrollContainer.style.height = `${this.totalHeight}px`;
        this.render();
    }
    
    updateContainerHeight() {
        this.containerHeight = this.container.clientHeight;
    }
    
    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.render();
    }
    
    render() {
        if (!this.items.length) return;
        
        this.updateContainerHeight();
        
        // 보이는 영역 계산
        const startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.buffer);
        const endIndex = Math.min(this.items.length - 1, 
            Math.floor((this.scrollTop + this.containerHeight) / this.itemHeight) + this.buffer);
        
        // 보이지 않는 아이템 제거
        for (const [index, element] of this.visibleItems.entries()) {
            if (index < startIndex || index > endIndex) {
                element.remove();
                this.visibleItems.delete(index);
            }
        }
        
        // 보이는 아이템 렌더링
        for (let i = startIndex; i <= endIndex; i++) {
            if (!this.visibleItems.has(i)) {
                const element = this.createItemElement(this.items[i], i);
                element.style.position = 'absolute';
                element.style.top = `${i * this.itemHeight}px`;
                element.style.left = '0';
                element.style.right = '0';
                element.style.height = `${this.itemHeight}px`;
                
                this.container.appendChild(element);
                this.visibleItems.set(i, element);
            }
        }
    }
    
    createItemElement(item, index) {
        const element = document.createElement('div');
        element.className = 'menu-item virtual-item';
        element.dataset.index = index;
        
        // 이미지 지연 로딩
        const cachedImageUrl = window.hairGatorCache.getCachedImage(item.imageUrl);
        
        element.innerHTML = `
            <div class="item-image-container">
                <img class="item-image lazy-image" 
                     data-src="${item.imageUrl}" 
                     src="${cachedImageUrl}"
                     alt="${item.name}"
                     loading="lazy">
                <div class="item-overlay">
                    <div class="item-code">${item.code}</div>
                </div>
            </div>
            <div class="item-info">
                <div class="item-name">${item.name}</div>
            </div>
        `;
        
        // 터치 최적화 이벤트
        this.addTouchOptimizedEvents(element, item);
        
        return element;
    }
    
    // 터치 최적화 이벤트
    addTouchOptimizedEvents(element, item) {
        let touchStart = null;
        let touchMoved = false;
        
        // 터치 시작
        element.addEventListener('touchstart', (e) => {
            touchStart = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
                time: Date.now()
            };
            touchMoved = false;
            
            // 즉시 피드백
            element.style.transform = 'scale(0.95)';
            element.style.opacity = '0.8';
        }, { passive: true });
        
        // 터치 이동
        element.addEventListener('touchmove', (e) => {
            if (touchStart) {
                const deltaX = Math.abs(e.touches[0].clientX - touchStart.x);
                const deltaY = Math.abs(e.touches[0].clientY - touchStart.y);
                
                if (deltaX > 10 || deltaY > 10) {
                    touchMoved = true;
                    // 터치가 이동하면 피드백 제거
                    element.style.transform = '';
                    element.style.opacity = '';
                }
            }
        }, { passive: true });
        
        // 터치 종료
        element.addEventListener('touchend', (e) => {
            element.style.transform = '';
            element.style.opacity = '';
            
            if (touchStart && !touchMoved) {
                const touchTime = Date.now() - touchStart.time;
                if (touchTime < 500) { // 0.5초 미만의 빠른 탭
                    e.preventDefault();
                    this.handleItemClick(item);
                }
            }
            
            touchStart = null;
            touchMoved = false;
        });
        
        // 마우스 이벤트 (데스크톱)
        element.addEventListener('click', (e) => {
            if (!touchStart) { // 터치 이벤트가 아닌 경우만
                this.handleItemClick(item);
            }
        });
    }
    
    handleItemClick(item) {
        // 즉시 모달 표시 (스켈레톤 UI 포함)
        window.showStyleDetailOptimized(item);
    }
}

// ========== 3. 최적화된 Firebase 쿼리 시스템 ==========
class OptimizedFirebaseLoader {
    constructor() {
        this.queryCache = new Map();
        this.batchSize = 20;
        this.maxRetries = 3;
    }
    
    async loadStylesOptimized(gender, category, subcategory) {
        const cacheKey = `${gender}-${category}-${subcategory}`;
        
        // 캐시 확인
        const cached = await window.hairGatorCache.getCachedStyles(gender, category, subcategory);
        if (cached) {
            return cached;
        }
        
        // 낙관적 업데이트 (스켈레톤 표시)
        this.showSkeletonUI();
        
        try {
            // Firebase 쿼리 최적화
            const query = db.collection('hairstyles')
                .where('gender', '==', gender)
                .where('mainCategory', '==', category)
                .where('subCategory', '==', subcategory)
                .limit(50) // 초기 로드 제한
                .orderBy('createdAt', 'desc'); // 최신 순 정렬
            
            const startTime = performance.now();
            const snapshot = await query.get();
            const loadTime = performance.now() - startTime;
            
            console.log(`📊 Firebase 쿼리 완료: ${loadTime.toFixed(2)}ms`);
            
            const styles = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                styles.push({
                    docId: doc.id,
                    ...data
                });
            });
            
            // 캐시 저장
            await window.hairGatorCache.cacheStyles(gender, category, subcategory, styles);
            
            return styles;
            
        } catch (error) {
            console.error('Firebase 로드 실패:', error);
            throw error;
        }
    }
    
    showSkeletonUI() {
        const menuGrid = document.getElementById('menuGrid');
        if (menuGrid) {
            menuGrid.innerHTML = this.generateSkeletonHTML();
        }
    }
    
    generateSkeletonHTML() {
        const skeletonItems = Array(8).fill(0).map((_, i) => `
            <div class="menu-item skeleton-item">
                <div class="skeleton-image"></div>
                <div class="skeleton-text skeleton-text-title"></div>
                <div class="skeleton-text skeleton-text-subtitle"></div>
            </div>
        `).join('');
        
        return skeletonItems;
    }
}

// ========== 4. 최적화된 모달 시스템 ==========
window.showStyleDetailOptimized = function(styleData) {
    // 즉시 모달 표시 (로딩 상태)
    const existingModal = document.getElementById('styleModal');
    if (existingModal) {
        existingModal.classList.add('active');
        
        // 즉시 기본 정보 표시
        document.getElementById('modalCode').textContent = styleData.code || '';
        document.getElementById('modalName').textContent = styleData.name || '';
        
        // 이미지 지연 로딩
        const modalImage = document.getElementById('modalImage');
        const cachedImageUrl = window.hairGatorCache.getCachedImage(styleData.imageUrl);
        
        if (cachedImageUrl !== styleData.imageUrl) {
            // 캐시된 이미지 즉시 표시
            modalImage.src = cachedImageUrl;
        } else {
            // 스켈레톤 표시 후 로딩
            modalImage.style.opacity = '0.5';
            modalImage.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+';
            
            // 실제 이미지 로딩
            const img = new Image();
            img.onload = () => {
                modalImage.src = styleData.imageUrl;
                modalImage.style.opacity = '1';
            };
            img.src = styleData.imageUrl;
        }
        
        // AI 버튼 추가
        setTimeout(() => {
            if (!document.querySelector('#akoolAIBtn')) {
                window.addAIButtonToHairgator();
            }
        }, 100);
    }
};

// ========== 5. 초기화 및 CSS 최적화 ==========
window.initPerformanceOptimization = function() {
    console.log('🚀 성능 최적화 시스템 초기화...');
    
    // 글로벌 캐시 인스턴스
    window.hairGatorCache = new HairGatorCache();
    window.optimizedFirebaseLoader = new OptimizedFirebaseLoader();
    
    // CSS 최적화 스타일 추가
    const optimizedStyles = document.createElement('style');
    optimizedStyles.textContent = `
        /* 스켈레톤 UI */
        .skeleton-item {
            border: 1px solid #333;
            border-radius: 10px;
            padding: 10px;
            background: #1a1a1a;
            overflow: hidden;
            position: relative;
        }
        
        .skeleton-image {
            width: 100%;
            height: 100px;
            background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        
        .skeleton-text {
            height: 14px;
            background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
            margin-bottom: 8px;
        }
        
        .skeleton-text-title {
            width: 80%;
        }
        
        .skeleton-text-subtitle {
            width: 60%;
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        
        /* 가상 스크롤링 최적화 */
        .virtual-item {
            will-change: transform;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
        }
        
        /* 터치 최적화 */
        .menu-item {
            touch-action: manipulation;
            user-select: none;
            -webkit-user-select: none;
            transition: transform 0.1s ease-out, opacity 0.1s ease-out;
        }
        
        /* 이미지 최적화 */
        .item-image, .modal-image {
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            will-change: transform;
        }
        
        /* 스크롤 최적화 */
        .menu-grid {
            overflow-scrolling: touch;
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
        }
        
        /* GPU 가속 */
        .menu-item, .style-modal, .modal-content {
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
        }
    `;
    
    document.head.appendChild(optimizedStyles);
    
    // 기존 loadStyles 함수 최적화 버전으로 교체
    window.originalLoadStyles = window.loadStyles; // 백업
    window.loadStyles = async function(categoryId, subcategory, gender) {
        try {
            const categoryName = currentCategory?.name || categoryId;
            console.log('🔄 최적화된 스타일 로딩:', { gender, categoryName, subcategory });
            
            const styles = await window.optimizedFirebaseLoader.loadStylesOptimized(
                gender, categoryName, subcategory
            );
            
            // 가상 스크롤링 적용
            const menuGrid = document.getElementById('menuGrid');
            if (menuGrid && styles.length > 20) {
                // 많은 아이템의 경우 가상 스크롤링 사용
                if (!window.virtualScroller) {
                    window.virtualScroller = new VirtualScroller(menuGrid, 120, 3);
                }
                window.virtualScroller.setItems(styles);
            } else {
                // 적은 아이템의 경우 일반 렌더링
                this.renderStylesDirectly(styles, menuGrid);
            }
            
        } catch (error) {
            console.error('최적화된 스타일 로딩 실패:', error);
            // 폴백: 원본 함수 사용
            if (window.originalLoadStyles) {
                window.originalLoadStyles(categoryId, subcategory, gender);
            }
        }
    };
    
    // 직접 렌더링 함수
    window.renderStylesDirectly = function(styles, container) {
        container.innerHTML = '';
        
        if (styles.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #666; padding: 40px;">
                    이 카테고리에는 아직 스타일이 없습니다.
                </div>
            `;
            return;
        }
        
        styles.forEach(style => {
            const styleElement = document.createElement('div');
            styleElement.className = 'menu-item';
            
            const cachedImageUrl = window.hairGatorCache.getCachedImage(style.imageUrl);
            
            styleElement.innerHTML = `
                <div class="item-image-container">
                    <img src="${cachedImageUrl}" alt="${style.name}" class="item-image" loading="lazy">
                    <div class="item-overlay">
                        <div class="item-code">${style.code}</div>
                    </div>
                </div>
                <div class="item-info">
                    <div class="item-name">${style.name}</div>
                </div>
            `;
            
            // 최적화된 클릭 이벤트
            styleElement.addEventListener('click', () => {
                window.showStyleDetailOptimized(style);
            });
            
            container.appendChild(styleElement);
        });
    };
    
    console.log('✅ 성능 최적화 시스템 초기화 완료!');
};

// ========== 6. 자동 초기화 ==========
document.addEventListener('DOMContentLoaded', () => {
    // 약간의 지연을 두고 초기화 (다른 스크립트들이 로드된 후)
    setTimeout(() => {
        window.initPerformanceOptimization();
    }, 100);
});

console.log(`
🚀 HAIRGATOR 네이티브 수준 성능 최적화 시스템!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 주요 최적화 기능:
✅ 고급 캐싱 시스템 (메모리 + IndexedDB)
✅ 이미지 프리로딩 및 압축
✅ 가상 스크롤링 (대량 데이터 처리)
✅ 터치 최적화 (빠른 반응성)
✅ 스켈레톤 UI (즉시 피드백)
✅ GPU 가속 활용
✅ 최적화된 Firebase 쿼리

🎯 성능 목표:
- 초기 로딩: < 500ms
- 스크롤 성능: 60fps
- 터치 반응: < 100ms
- 이미지 표시: < 200ms

🚀 네이티브 앱 수준의 성능을 제공합니다!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
