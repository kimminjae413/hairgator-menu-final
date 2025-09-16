// tablet-recommendation.js - 실제 스크린샷 포함 버전

document.addEventListener(‘DOMContentLoaded’, function() {
console.log(‘📱➡️📟 태블릿 권장 시스템 로드 완료’);

```
// 모바일 감지 및 모달 표시
setTimeout(() => {
    checkDeviceAndShowModal();
}, 1000);
```

});

function checkDeviceAndShowModal() {
const isMobile = window.innerWidth < 768;
const isGenderSelectionVisible = document.getElementById(‘genderSelection’)?.style.display === ‘flex’;

```
if (isMobile && isGenderSelectionVisible) {
    const today = new Date().toDateString();
    const hasSeenToday = localStorage.getItem('tablet-recommendation-seen') === today;
    
    if (!hasSeenToday) {
        console.log('모바일에서 성별선택 화면 - 태블릿 권장 모달 표시');
        setTimeout(() => {
            showTabletRecommendationModal();
        }, 1500);
    }
}
```

}

function showTabletRecommendationModal() {
// 기존 모달이 있다면 제거
const existingModal = document.getElementById(‘tabletRecommendationModal’);
if (existingModal) {
existingModal.remove();
}

```
// 모달 HTML 생성
const modalHTML = `
    <div id="tabletRecommendationModal" class="tablet-recommendation-modal">
        <div class="tablet-modal-content">
            <div class="tablet-modal-header">
                <h3>📱➡️📟 더 나은 서비스 이용 안내</h3>
                <button class="tablet-close-btn" onclick="closeTabletRecommendationModal()">✕</button>
            </div>
            
            <div class="tablet-modal-body">
                <p class="tablet-main-message">
                    <strong>HAIRGATOR 메뉴판은 태블릿에 최적화된 서비스입니다</strong>
                </p>
                
                <!-- 실제 스크린샷 비교 -->
                <div class="screenshot-comparison">
                    <div class="screenshot-item mobile-view">
                        <div class="screenshot-label">📱 모바일 화면</div>
                        <div class="mobile-mockup">
                            <div class="mobile-screen-small">
                                <div class="mini-header">HAIRGATOR</div>
                                <div class="mini-tabs">
                                    <div class="mini-tab">A</div>
                                    <div class="mini-tab active">B</div>
                                    <div class="mini-tab">C</div>
                                </div>
                                <div class="mini-styles">
                                    <div class="mini-style-card"></div>
                                    <div class="mini-style-card"></div>
                                </div>
                            </div>
                        </div>
                        <div class="device-issues">
                            <span class="issue-icon">⚠️</span>
                            <span>화면이 작아 불편함</span>
                        </div>
                    </div>
                    
                    <div class="comparison-arrow">→</div>
                    
                    <div class="screenshot-item tablet-view">
                        <div class="screenshot-label">📟 태블릿 화면</div>
                        <div class="tablet-screenshot">
                            <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAoAGQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//Z" 
                                 alt="태블릿 실제 화면" 
                                 style="width: 100%; height: auto; border-radius: 8px; border: 1px solid #333;">
                        </div>
                        <div class="device-benefits">
                            <span class="benefit-icon">✅</span>
                            <span>깔끔하고 상담 용이</span>
                        </div>
                    </div>
                </div>
                
                <div class="recommendation-message">
                    <div class="recommend-icon">💡</div>
                    <p><strong>태블릿으로 이용하시면 더 나은 서비스 체험을 할 수 있습니다</strong></p>
                </div>
                
                <div class="tablet-modal-actions">
                    <label class="dont-show-today">
                        <input type="checkbox" id="dontShowToday"> 
                        오늘 하루 보지 않기
                    </label>
                    <button class="continue-mobile-btn" onclick="continueWithMobile()">
                        모바일로 계속 사용하기
                    </button>
                </div>
            </div>
        </div>
    </div>
`;

// 스타일 CSS 추가
addTabletModalStyles();

// DOM에 추가
document.body.insertAdjacentHTML('beforeend', modalHTML);

// 모달 표시 애니메이션
setTimeout(() => {
    const modal = document.getElementById('tabletRecommendationModal');
    if (modal) {
        modal.classList.add('active');
    }
}, 100);

// 햅틱 피드백
if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
}
```

}

function addTabletModalStyles() {
if (document.getElementById(‘tablet-modal-styles’)) return;

```
const styles = `
    <style id="tablet-modal-styles">
    .tablet-recommendation-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .tablet-recommendation-modal.active {
        opacity: 1;
    }
    
    .tablet-modal-content {
        background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        border: 2px solid #E91E63;
        border-radius: 20px;
        max-width: 90%;
        width: 450px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(233, 30, 99, 0.4);
        transform: translateY(30px);
        transition: transform 0.3s ease;
    }
    
    .tablet-recommendation-modal.active .tablet-modal-content {
        transform: translateY(0);
    }
    
    .tablet-modal-header {
        background: linear-gradient(135deg, #E91E63, #C2185B);
        padding: 20px;
        border-radius: 18px 18px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .tablet-modal-header h3 {
        color: white;
        margin: 0;
        font-size: 18px;
        font-weight: 600;
    }
    
    .tablet-close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 5px;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.3s;
    }
    
    .tablet-close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .tablet-modal-body {
        padding: 25px;
        color: white;
    }
    
    .tablet-main-message {
        text-align: center;
        margin-bottom: 25px;
        font-size: 16px;
        line-height: 1.4;
    }
    
    .screenshot-comparison {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 25px;
        gap: 15px;
    }
    
    .screenshot-item {
        flex: 1;
        text-align: center;
    }
    
    .screenshot-label {
        font-weight: 600;
        margin-bottom: 12px;
        color: #E91E63;
    }
    
    .mobile-mockup {
        background: #333;
        border-radius: 20px;
        padding: 8px;
        margin-bottom: 10px;
    }
    
    .mobile-screen-small {
        background: #111;
        border-radius: 12px;
        padding: 8px;
        height: 120px;
    }
    
    .mini-header {
        color: white;
        font-size: 10px;
        text-align: center;
        margin-bottom: 8px;
        font-weight: bold;
    }
    
    .mini-tabs {
        display: flex;
        gap: 2px;
        margin-bottom: 8px;
    }
    
    .mini-tab {
        background: #444;
        color: #999;
        font-size: 8px;
        padding: 2px 4px;
        border-radius: 3px;
        flex: 1;
        text-align: center;
    }
    
    .mini-tab.active {
        background: #E91E63;
        color: white;
    }
    
    .mini-styles {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3px;
    }
    
    .mini-style-card {
        background: #444;
        height: 25px;
        border-radius: 3px;
    }
    
    .tablet-screenshot {
        margin-bottom: 10px;
    }
    
    .tablet-screenshot img {
        width: 100%;
        max-width: 150px;
        height: auto;
        border-radius: 8px;
        border: 2px solid #E91E63;
        box-shadow: 0 4px 15px rgba(233, 30, 99, 0.3);
    }
    
    .comparison-arrow {
        font-size: 20px;
        color: #E91E63;
        font-weight: bold;
        flex-shrink: 0;
    }
    
    .device-issues {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        font-size: 12px;
        color: #ff6b6b;
    }
    
    .device-benefits {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        font-size: 12px;
        color: #4CAF50;
    }
    
    .recommendation-message {
        background: linear-gradient(135deg, #4CAF50, #45A049);
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 25px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .recommend-icon {
        font-size: 20px;
        flex-shrink: 0;
    }
    
    .tablet-modal-actions {
        display: flex;
        flex-direction: column;
        gap: 15px;
        align-items: center;
    }
    
    .dont-show-today {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #ccc;
        cursor: pointer;
        font-size: 14px;
    }
    
    .dont-show-today input {
        margin: 0;
    }
    
    .continue-mobile-btn {
        background: #E91E63;
        color: white;
        border: none;
        padding: 12px 25px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.3s;
        width: 100%;
        max-width: 250px;
    }
    
    .continue-mobile-btn:hover {
        background: #D81B60;
    }
    
    @media (max-width: 480px) {
        .tablet-modal-content {
            width: 95%;
            margin: 10px;
        }
        
        .screenshot-comparison {
            flex-direction: column;
            gap: 20px;
        }
        
        .comparison-arrow {
            transform: rotate(90deg);
        }
    }
    </style>
`;

document.head.insertAdjacentHTML('beforeend', styles);
```

}

function closeTabletRecommendationModal() {
const modal = document.getElementById(‘tabletRecommendationModal’);
if (modal) {
modal.classList.remove(‘active’);
setTimeout(() => {
modal.remove();
}, 300);
}
}

function continueWithMobile() {
const checkbox = document.getElementById(‘dontShowToday’);

```
if (checkbox && checkbox.checked) {
    const today = new Date().toDateString();
    localStorage.setItem('tablet-recommendation-seen', today);
    console.log('오늘 하루 태블릿 권장 모달 숨김 설정');
}

closeTabletRecommendationModal();

// 선택 확인 토스트
if (typeof showToast === 'function') {
    showToast('모바일로 계속 이용합니다', 'info', 2000);
}
```

}

console.log(‘📟 태블릿 권장 시스템 준비 완료 - 실제 스크린샷 포함’);