// scripts/utils/common.js
// 공통 유틸리티 함수들 - 중복 코드 제거

/**
 * 토스트 알림 표시
 * @param {string} message - 표시할 메시지
 * @param {string} type - 알림 타입 (info, success, warning, error)
 * @param {number} duration - 표시 시간 (ms, 기본 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.warn('Toast 요소를 찾을 수 없습니다:', message);
        return;
    }

    // 기존 클래스 제거
    toast.className = 'toast';
    
    // 메시지 설정
    toast.textContent = message;
    
    // 타입별 아이콘 추가
    const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
    };
    
    if (icons[type]) {
        toast.textContent = `${icons[type]} ${message}`;
    }
    
    // 클래스 적용
    toast.className = `toast show ${type}`;
    
    // 자동 숨김
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

/**
 * 로딩 오버레이 표시/숨김
 * @param {boolean} show - 표시 여부
 * @param {string} text - 로딩 텍스트 (선택사항)
 */
function showLoading(show, text = '로딩 중...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (!loadingOverlay) return;
    
    if (show) {
        if (loadingText) loadingText.textContent = text;
        loadingOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        loadingOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }
}

/**
 * 날짜 포맷팅
 * @param {Date|string} date - 포맷할 날짜
 * @param {string} format - 포맷 형식 ('date', 'time', 'datetime', 'relative')
 * @returns {string} 포맷된 날짜 문자열
 */
function formatDate(date, format = 'datetime') {
    if (!date) return '';
    
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '잘못된 날짜';
    
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    switch (format) {
        case 'date':
            return d.toLocaleDateString('ko-KR');
            
        case 'time':
            return d.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
        case 'datetime':
            return d.toLocaleDateString('ko-KR') + ' ' + 
                   d.toLocaleTimeString('ko-KR', { 
                       hour: '2-digit', 
                       minute: '2-digit' 
                   });
                   
        case 'relative':
            if (diffDays === 0) {
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                
                if (diffHours === 0) {
                    return diffMinutes <= 1 ? '방금 전' : `${diffMinutes}분 전`;
                } else {
                    return `${diffHours}시간 전`;
                }
            } else if (diffDays === 1) {
                return '어제';
            } else if (diffDays < 7) {
                return `${diffDays}일 전`;
            } else {
                return d.toLocaleDateString('ko-KR');
            }
            
        default:
            return d.toString();
    }
}

/**
 * 숫자 포맷팅 (천 단위 콤마)
 * @param {number} num - 포맷할 숫자
 * @returns {string} 포맷된 숫자 문자열
 */
function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('ko-KR');
}

/**
 * 파일 크기 포맷팅
 * @param {number} bytes - 바이트 크기
 * @returns {string} 포맷된 크기 문자열
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 디바운스 함수
 * @param {Function} func - 실행할 함수
 * @param {number} wait - 대기 시간 (ms)
 * @returns {Function} 디바운스된 함수
 */
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

/**
 * 쓰로틀 함수
 * @param {Function} func - 실행할 함수
 * @param {number} limit - 제한 시간 (ms)
 * @returns {Function} 쓰로틀된 함수
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * 이미지 크기 조정 및 압축
 * @param {File} file - 원본 이미지 파일
 * @param {Object} options - 옵션 {maxWidth, maxHeight, quality}
 * @returns {Promise<Blob>} 압축된 이미지 Blob
 */
function compressImage(file, options = {}) {
    return new Promise((resolve, reject) => {
        const {
            maxWidth = 800,
            maxHeight = 600,
            quality = 0.8
        } = options;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // 비율 유지하면서 크기 조정
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 이미지 그리기
            ctx.drawImage(img, 0, 0, width, height);
            
            // Blob으로 변환
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

/**
 * 랜덤 ID 생성
 * @param {number} length - ID 길이
 * @returns {string} 랜덤 ID
 */
function generateRandomId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * URL 파라미터 파싱
 * @param {string} url - 파싱할 URL (기본값: 현재 URL)
 * @returns {Object} 파라미터 객체
 */
function parseUrlParams(url = window.location.search) {
    const params = {};
    const urlParams = new URLSearchParams(url);
    
    for (const [key, value] of urlParams) {
        params[key] = value;
    }
    
    return params;
}

/**
 * 브라우저 감지
 * @returns {Object} 브라우저 정보
 */
function detectBrowser() {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /Mobi/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !isChrome;
    const isFirefox = /Firefox/.test(userAgent);
    
    return {
        isIOS,
        isAndroid,
        isMobile,
        isChrome,
        isSafari,
        isFirefox,
        userAgent
    };
}

/**
 * 클립보드에 텍스트 복사
 * @param {string} text - 복사할 텍스트
 * @returns {Promise<boolean>} 성공 여부
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // 폴백: 구버전 브라우저 지원
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const result = document.execCommand('copy');
            textArea.remove();
            return result;
        }
    } catch (error) {
        console.error('클립보드 복사 실패:', error);
        return false;
    }
}

/**
 * 로컬 스토리지 안전 사용
 * @param {string} key - 키
 * @param {any} value - 값 (설정시)
 * @returns {any} 값 (조회시)
 */
function safeLocalStorage(key, value = undefined) {
    try {
        if (value !== undefined) {
            // 설정
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } else {
            // 조회
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        }
    } catch (error) {
        console.warn('로컬 스토리지 오류:', error);
        return value !== undefined ? false : null;
    }
}

// 전역 객체에 유틸리티 함수들 등록
window.Utils = {
    showToast,
    showLoading,
    formatDate,
    formatNumber,
    formatFileSize,
    debounce,
    throttle,
    compressImage,
    generateRandomId,
    parseUrlParams,
    detectBrowser,
    copyToClipboard,
    safeLocalStorage
};

// 개별 함수들도 전역에 등록 (기존 코드 호환성)
window.showToast = showToast;
window.showLoading = showLoading;
window.formatDate = formatDate;

console.log('✅ 공통 유틸리티 로드 완료');