// ========== HAIRGATOR 성능 최적화 시스템 - CORS 문제 해결 버전 ==========
// 네이티브 앱 수준의 성능과 사용자 경험을 제공합니다

console.log('🚀 성능 최적화 시스템 초기화...');

// ========== 1. 고급 캐싱 시스템 ==========
class HairGatorPerformanceCache {
    constructor() {
        this.memoryCache = new Map();
        this.imageCache = new Map();
        this.prefetchQueue = new Set();
        this.maxCacheSize = 50;
        this.maxImageCacheSize = 100;
        
        this.initIndexedDB();
    }
    
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('HairGatorCache', 1);
            
            request.onerror = () => {
                console.warn('IndexedDB 초기화 실패, 메모리 캐시만 사용');
                resolve();
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB 캐시 초기화 완료');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('styles')) {
                    const styleStore = db.createObjectStore('styles', { keyPath: 'cacheKey' });
                    styleStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('images')) {
                    const imageStore = db.createObjectStore('images', { keyPath: 'url' });
                    imageStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }
    
    generateCacheKey(gender, category, subcategory) {
        return `${gender}-${category}-${subcategory}`;
    }
    
    async setStyles(cacheKey, styles) {
        // 메모리 캐시
        this.memoryCache.set(cacheKey, {
            data: styles,
            timestamp: Date.now()
        });
        
        // IndexedDB 캐시
        if (this.db) {
            try {
                const transaction = this.db.transaction(['styles'], 'readwrite');
                const store = transaction.objectStore('styles');
                await store.put({
                    cacheKey,
                    data: styles,
                    timestamp: Date.now()
                });
            } catch (error) {
                console.warn('IndexedDB 저장 실패:', error);
            }
        }
        
        console.log(`📦 캐시 저장: ${cacheKey} (${styles.length}개 스타일)`);
        
        // 캐시 크기 제한
        this.limitCacheSize();
    }
    
    async getStyles(cacheKey) {
        // 메모리 캐시 확인
        if (this.memoryCache.has(cacheKey)) {
            const cached = this.memoryCache.get(cacheKey);
            const age = Date.now() - cached.timestamp;
            
            if (age < 10 * 60 * 1000) { // 10분간 유효
                console.log(`💨 메모리 캐시 히트: ${cacheKey}`);
                return cached.data;
            }
        }
        
        // IndexedDB 캐시 확인
        if (this.db) {
            try {
                const transaction = this.db.transaction(['styles'], 'readonly');
                const store = transaction.objectStore('styles');
                const request = store.get(cacheKey);
                
                return new Promise((resolve) => {
                    request.onsuccess = () => {
                        const result = request.result;
                        if (result) {
                            const age = Date.now() - result.timestamp;
                            if (age < 30 * 60 * 1000) { // 30분간 유효
                                console.log(`🗄️ IndexedDB 캐시 히트: ${cacheKey}`);
                                // 메모리 캐시에도 복원
                                this.memoryCache.set(cacheKey, {
                                    data: result.data,
                                    timestamp: result.timestamp
                                });
                                resolve(result.data);
                                return;
                            }
                        }
                        resolve(null);
                    };
                    
                    request.onerror = () => resolve(null);
                });
            } catch (error) {
                console.warn('IndexedDB 읽기 실패:', error);
            }
        }
        
        return null;
    }
    
    limitCacheSize() {
        if (this.memoryCache.size > this.maxCacheSize) {
            const oldestKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(oldestKey);
        }
    }
    
    // ========== CORS 안전한 이미지 프리로딩 ==========
    async preloadImage(imageUrl) {
        if (this.imageCache.has(imageUrl)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve) => {
            const img = new Image();
            
            // CORS 설정 추가
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.imageCache.set(imageUrl, {
                    loaded: true,
                    timestamp: Date.now()
                });
                console.log(`🖼️ 이미지 프리로드 완료: ${imageUrl.split('/').pop()}`);
                resolve();
            };
            
            img.onerror = () => {
                console.warn(`⚠️ 이미지 프리로드 실패 (무시): ${imageUrl.split('/').pop()}`);
                // 오류가 발생해도 프로세스를 중단하지 않음
                resolve();
            };
            
            // Firebase Storage URL에 대한 특별 처리
            if (imageUrl.includes('firebasestorage.googleapis.com')) {
                // Firebase Storage는 기본적으로 CORS가 허용되어 있지만
                // 브라우저 캐시나 CDN 문제로 실패할 수 있음
                img.src = imageUrl;
            } else {
                img.src = imageUrl;
            }
        });
    }
    
    // 백그라운드에서 이미지 프리로딩 (CORS 안전)
    async startPreloadingImages(styles) {
        if (!styles || styles.length === 0) return;
        
        console.log(`🔄 백그라운드 이미지 프리로딩 시작: ${styles.length}개`);
        
        // 이미지 프리로딩을 백그라운드에서 실행
        const preloadPromises = styles.map(style => {
            if (style.imageUrl && !this.imageCache.has(style.imageUrl)) {
                return this.preloadImage(style.imageUrl).catch(() => {
                    // 개별 이미지 실패는 무시
                });
            }
            return Promise.resolve();
        });
        
        // 모든 프로미스를 기다리지 않고 백그라운드에서 실행
        Promise.allSettled(preloadPromises).then((results) => {
            const successful = results.filter(r => r.status === 'fulfilled').length;
            console.log(`✅ 이미지 프리로딩 완료: ${successful}/${styles.length}개 성공`);
        });
    }
    
    // 이미지 캐시 정리
    scheduleImagePreload(styles) {
        // 즉시 첫 번째 배치 프리로드
        const firstBatch = styles.slice(0, 6);
        this.startPreloadingImages(firstBatch);
        
        // 나머지는 1초 후에 프리로드
        setTimeout(() => {
            const secondBatch = styles.slice(6);
            this.startPreloadingImages(secondBatch);
        }, 1000);
    }
    
    clearImageCache() {
        // 1시간 이상 된 이미지 캐시 정리
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        
        for (const [url, data] of this.imageCache.entries()) {
            if (data.timestamp < oneHourAgo) {
                this.imageCache.delete(url);
            }
        }
        
        // 캐시 크기 제한
        if (this.imageCache.size > this.maxImageCacheSize) {
            const entries = Array.from(this.imageCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toDelete = entries.slice(0, entries.length - this.maxImageCacheSize);
            toDelete.forEach(([url]) => this.imageCache.delete(url));
        }
    }
}

// ========== 2. 가상 스크롤링 시스템 ==========
class VirtualScrollManager {
    constructor() {
        this.itemHeight = 280; // 메뉴 아이템 높이
        this.containerHeight = window.innerHeight;
        this.visibleItems = Math.ceil(this.containerHeight / this.itemHeight) + 2;
        this.scrollTop = 0;
        this.totalItems = 0;
        this.renderBuffer = new Map();
    }
    
    calculateVisibleRange() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleItems, this.totalItems);
        
        return {
            start: Math.max(0, startIndex - 1),
            end: Math.min(endIndex + 1, this.totalItems)
        };
    }
    
    updateVirtualScroll(scrollTop, totalItems) {
        this.scrollTop = scrollTop;
        this.totalItems = totalItems;
        
        return this.calculateVisibleRange();
    }
}

// ========== 3. Firebase 최적화 쿼리 시스템 ==========
class OptimizedFirebaseQuery {
    constructor() {
        this.queryCache = new Map();
        this.pendingQueries = new Map();
    }
    
    async loadStylesOptimized(gender, category, subcategory, pageSize = 20) {
        const cacheKey = `${gender}-${category}-${subcategory}`;
        
        // 중복 쿼리 방지
        if (this.pendingQueries.has(cacheKey)) {
            return this.pendingQueries.get(cacheKey);
        }
        
        const queryPromise = this.executeQuery(gender, category, subcategory, pageSize);
        this.pendingQueries.set(cacheKey, queryPromise);
        
        try {
            const result = await queryPromise;
            return result;
        } finally {
            this.pendingQueries.delete(cacheKey);
        }
    }
    
    async executeQuery(gender, category, subcategory, pageSize) {
        const startTime = performance.now();
        
        try {
            // Firebase 쿼리 실행 (CORS 문제 없음)
            const snapshot = await db.collection('hairstyles')
                .where('gender', '==', gender)
                .where('mainCategory', '==', category)
                .where('subCategory', '==', subcategory)
                .orderBy('createdAt', 'desc')
                .limit(pageSize)
                .get();
            
            const styles = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                styles.push({
                    id: doc.id,
                    ...data
                });
            });
            
            const endTime = performance.now();
            console.log(`📊 Firebase 쿼리 완료: ${(endTime - startTime).toFixed(2)}ms`);
            
            return styles;
            
        } catch (error) {
            console.error('Firebase 로드 실패:', error);
            throw error;
        }
    }
}

// ========== 4. 터치 최적화 시스템 ==========
class TouchOptimizer {
    constructor() {
        this.touchStartTime = 0;
        this.touchStartPos = { x: 0, y: 0 };
        this.tapThreshold = 150; // ms
        this.moveThreshold = 10; // px
        
        this.initTouchOptimization();
    }
    
    initTouchOptimization() {
        // 터치 이벤트 최적화
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // 스크롤 최적화
        this.optimizeScrolling();
        
        console.log('✅ 터치 최적화 시스템 활성화');
    }
    
    handleTouchStart(event) {
        this.touchStartTime = performance.now();
        if (event.touches.length > 0) {
            this.touchStartPos = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        }
        
        // 즉시 시각적 피드백
        const target = event.target.closest('.menu-item, .subcategory-tab, .category-btn');
        if (target) {
            target.style.transform = 'scale(0.98)';
            target.style.opacity = '0.9';
            target.style.transition = 'all 0.1s ease';
        }
    }
    
    handleTouchMove(event) {
        // 스크롤 중에는 시각적 피드백 제거
        const target = event.target.closest('.menu-item, .subcategory-tab, .category-btn');
        if (target) {
            target.style.transform = '';
            target.style.opacity = '';
        }
    }
    
    handleTouchEnd(event) {
        const touchEndTime = performance.now();
        const touchDuration = touchEndTime - this.touchStartTime;
        
        // 시각적 피드백 복원
        const target = event.target.closest('.menu-item, .subcategory-tab, .category-btn');
        if (target) {
            target.style.transform = '';
            target.style.opacity = '';
        }
        
        // 빠른 탭 감지 및 최적화
        if (touchDuration < this.tapThreshold) {
            this.handleQuickTap(event);
        }
    }
    
    handleQuickTap(event) {
        // 빠른 탭에 대한 즉시 반응
        const target = event.target.closest('.menu-item');
        if (target) {
            // 애니메이션 없이 즉시 처리
            target.style.transform = 'scale(1.05)';
            setTimeout(() => {
                target.style.transform = '';
            }, 100);
        }
    }
    
    optimizeScrolling() {
        let ticking = false;
        
        function updateScrolling() {
            // 스크롤 최적화 로직
            ticking = false;
        }
        
        document.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScrolling);
                ticking = true;
            }
        }, { passive: true });
    }
}

// ========== 5. 전역 성능 최적화 관리자 ==========
class HairGatorPerformanceManager {
    constructor() {
        this.cache = new HairGatorPerformanceCache();
        this.virtualScroll = new VirtualScrollManager();
        this.firebaseQuery = new OptimizedFirebaseQuery();
        this.touchOptimizer = new TouchOptimizer();
        
        this.initPerformanceMonitoring();
        this.startCacheCleanup();
    }
    
    async loadStyles(gender, category, subcategory) {
        const cacheKey = this.cache.generateCacheKey(gender, category, subcategory);
        
        console.log('🔄 최적화된 스타일 로딩:', { gender, categoryName: category, subcategory });
        
        try {
            // 1. 캐시에서 먼저 확인
            const cachedStyles = await this.cache.getStyles(cacheKey);
            if (cachedStyles) {
                console.log('⚡ 캐시에서 즉시 로드');
                this.cache.scheduleImagePreload(cachedStyles);
                return cachedStyles;
            }
            
            // 2. Firebase에서 로드
            const styles = await this.firebaseQuery.loadStylesOptimized(gender, category, subcategory);
            
            // 3. 캐시에 저장
            await this.cache.setStyles(cacheKey, styles);
            
            // 4. 백그라운드 이미지 프리로딩 시작
            this.cache.scheduleImagePreload(styles);
            
            return styles;
            
        } catch (error) {
            console.error('최적화된 스타일 로딩 실패:', error);
            throw error;
        }
    }
    
    // 스켈레톤 UI 표시
    showSkeletonUI(container) {
        const skeletonCount = 6;
        let skeletonHTML = '';
        
        for (let i = 0; i < skeletonCount; i++) {
            skeletonHTML += `
                <div class="skeleton-item">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-text"></div>
                </div>
            `;
        }
        
        container.innerHTML = `<div class="skeleton-grid">${skeletonHTML}</div>`;
    }
    
    // 성능 모니터링
    initPerformanceMonitoring() {
        // FPS 모니터링
        let lastFrame = performance.now();
        let frameCount = 0;
        
        function measureFPS() {
            frameCount++;
            const currentFrame = performance.now();
            
            if (currentFrame - lastFrame >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentFrame - lastFrame));
                if (fps < 30) {
                    console.warn(`⚠️ 낮은 FPS 감지: ${fps}fps`);
                }
                frameCount = 0;
                lastFrame = currentFrame;
            }
            
            requestAnimationFrame(measureFPS);
        }
        
        requestAnimationFrame(measureFPS);
    }
    
    // 캐시 정리 스케줄링
    startCacheCleanup() {
        // 5분마다 캐시 정리
        setInterval(() => {
            this.cache.clearImageCache();
            console.log('🧹 캐시 정리 완료');
        }, 5 * 60 * 1000);
    }
}

// ========== 6. 전역 초기화 ==========
const performanceManager = new HairGatorPerformanceManager();

// 기존 loadStyles 함수를 최적화된 버전으로 대체
window.loadStyles = async function(categoryId, subcategory, gender) {
    const menuGrid = document.getElementById('menuGrid');
    if (!menuGrid) return;
    
    try {
        // 스켈레톤 UI 표시
        performanceManager.showSkeletonUI(menuGrid);
        
        // 카테고리 이름 찾기
        const category = window.currentCategory?.name || 'SIDE FRINGE';
        
        console.log('🚀 성능 최적화된 로딩 사용');
        
        // 최적화된 로딩 시도
        try {
            const styles = await performanceManager.loadStyles(gender, category, subcategory);
            this.renderStyles(styles, menuGrid, gender);
            return;
        } catch (optimizedError) {
            console.log('최적화된 로딩 실패, 기본 로딩 사용:', optimizedError);
        }
        
        // 폴백: 기본 로딩 방식
        await this.loadStyles(categoryId, subcategory, gender);
        
    } catch (error) {
        console.error('스타일 로딩 완전 실패:', error);
        menuGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <div>로딩 중 오류가 발생했습니다</div>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #FF1493; color: white; border: none; border-radius: 5px;">
                    새로고침
                </button>
            </div>
        `;
    }
};

// 스타일 렌더링 함수
window.renderStyles = function(styles, container, gender) {
    if (!styles || styles.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 20px;">🔭</div>
                <div>등록된 스타일이 없습니다</div>
            </div>
        `;
        return;
    }
    
    console.log(`✅ ${styles.length}개 스타일 렌더링`);
    
    let html = '';
    styles.forEach(style => {
        html += `
            <div class="menu-item ${gender}" onclick="showStyleDetail('${style.id}', '${style.imageUrl}', '${gender}')">
                <img src="${style.imageUrl}" 
                     alt="Hair Style" 
                     loading="lazy"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\' viewBox=\\'0 0 200 200\\'%3E%3Crect width=\\'200\\' height=\\'200\\' fill=\\'%23333\\'/%3E%3Ctext x=\\'100\\' y=\\'100\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\'%3E이미지 없음%3C/text%3E%3C/svg%3E'">
                <div class="menu-item-overlay">
                    <div class="menu-item-content">
                        <h3>${style.name || 'Hair Style'}</h3>
                        <p>${style.description || ''}</p>
                        <div class="menu-item-actions">
                            <button class="btn-like ${style.likes > 0 ? 'active' : ''}" onclick="event.stopPropagation(); toggleLike('${style.id}')">
                                <span>${style.likes > 0 ? '♥' : '♡'}</span>
                                <span>${style.likes || 0}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // 이미지 페이드인 애니메이션
    const images = container.querySelectorAll('img');
    images.forEach((img, index) => {
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease';
        
        if (img.complete) {
            setTimeout(() => {
                img.style.opacity = '1';
            }, index * 50);
        } else {
            img.onload = () => {
                setTimeout(() => {
                    img.style.opacity = '1';
                }, index * 50);
            };
        }
    });
};

console.log('✅ 성능 최적화 시스템 초기화 완료!');
