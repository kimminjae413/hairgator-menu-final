// 모바일 접속 시 태블릿 권장 안내 시스템

// 모바일 디바이스 감지
function isMobileDevice() {
    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // 768px 미만이고 터치 디바이스면 모바일로 판단
    return width < 768 && isTouchDevice;
}

// 오늘 하루 보지 않기 체크
function shouldShowTabletRecommendation() {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('hairgator-tablet-notice-date');
    
    return lastShown !== today;
}

// 오늘 하루 보지 않기 설정
function setTabletRecommendationHidden() {
    const today = new Date().toDateString();
    localStorage.setItem('hairgator-tablet-notice-date', today);
}

// 태블릿 권장 모달 표시
function showTabletRecommendationModal() {
    // 이미 모달이 있으면 중복 생성 방지
    if (document.getElementById('tabletRecommendationModal')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'tabletRecommendationModal';
    modal.className = 'tablet-recommendation-modal';
    modal.innerHTML = `
        <div class="tablet-modal-overlay"></div>
        <div class="tablet-modal-content">
            <div class="tablet-modal-header">
                <div class="device-comparison">
                    <div class="device-icon mobile-icon">📱</div>
                    <div class="arrow">→</div>
                    <div class="device-icon tablet-icon">📱</div>
                </div>
                <h3>더 나은 서비스 이용을 위한 안내</h3>
                <p class="modal-subtitle">헤어게이터 메뉴판은 태블릿 환경에 최적화된 서비스입니다</p>
            </div>
            
            <div class="tablet-modal-body">
                <div class="screen-comparison">
                    <div class="mobile-screen">
                        <div class="screen-label">모바일 화면</div>
                        <div class="mobile-preview">
                            <div class="mobile-ui">
                                <div class="mobile-header">HAIRGATOR</div>
                                <div class="mobile-tabs">
                                    <div class="mobile-tab small">A</div>
                                    <div class="mobile-tab small">B</div>
                                    <div class="mobile-tab small active">C</div>
                                </div>
                                <div class="mobile-grid">
                                    <div class="mobile-item"></div>
                                    <div class="mobile-item"></div>
                                </div>
                            </div>
                            <div class="warning-text">화면이 작아 불편할 수 있습니다</div>
                        </div>
                    </div>
                    
                    <div class="vs-divider">VS</div>
                    
                    <div class="tablet-screen">
                        <div class="screen-label recommended">태블릿 화면 (권장)</div>
                        <div class="tablet-preview">
                            <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAFoAMgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAr//2Q==" alt="태블릿 화면" class="tablet-screenshot">
                            <div class="benefit-text">깔끔하고 넓은 화면으로 상담이 용이합니다</div>
                        </div>
                    </div>
                </div>
                
                <div class="benefits-section">
                    <h4>태블릿 사용 시 장점</h4>
                    <div class="benefits-grid">
                        <div class="benefit-item">
                            <span class="benefit-icon">👁️</span>
                            <span>큰 화면으로 스타일 세부사항 확인 가능</span>
                        </div>
                        <div class="benefit-item">
                            <span class="benefit-icon">✋</span>
                            <span>터치로 편리한 카테고리 선택</span>
                        </div>
                        <div class="benefit-item">
                            <span class="benefit-icon">💬</span>
                            <span>고객과의 상담 시 화면 공유 용이</span>
                        </div>
                        <div class="benefit-item">
                            <span class="benefit-icon">⚡</span>
                            <span>빠르고 직관적인 스타일 탐색</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tablet-modal-footer">
                <label class="dont-show-today">
                    <input type="checkbox" id="dontShowToday">
                    <span>오늘 하루 보지 않기</span>
                </label>
                <button class="continue-mobile-btn" onclick="continueWithMobile()">
                    모바일로 계속 사용하기
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // 모달 표시 애니메이션
    setTimeout(() => {
        modal.classList.add('active');
    }, 100);
    
    // 모달 스타일 추가
    addTabletRecommendationStyles();
    
    console.log('태블릿 권장 모달 표시');
}

// 모바일로 계속 사용하기
function continueWithMobile() {
    const dontShowCheckbox = document.getElementById('dontShowToday');
    const modal = document.getElementById('tabletRecommendationModal');
    
    // "오늘 하루 보지 않기" 체크되었으면 localStorage에 저장
    if (dontShowCheckbox && dontShowCheckbox.checked) {
        setTabletRecommendationHidden();
        console.log('오늘 하루 태블릿 권장 모달 숨김 설정');
    }
    
    // 모달 닫기
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
    
    // 햅틱 피드백
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }
    
    console.log('모바일로 계속 사용 선택');
}

// 모달 스타일 추가
function addTabletRecommendationStyles() {
    // 이미 스타일이 있으면 중복 방지
    if (document.getElementById('tablet-recommendation-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'tablet-recommendation-styles';
    style.textContent = `
        .tablet-recommendation-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .tablet-recommendation-modal.active {
            opacity: 1;
            visibility: visible;
        }
        
        .tablet-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(5px);
        }
        
        .tablet-modal-content {
            position: relative;
            background: #1a1a1a;
            border-radius: 20px;
            max-width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            border: 1px solid #333;
            color: white;
        }
        
        .tablet-modal-header {
            text-align: center;
            padding: 30px 30px 20px 30px;
            border-bottom: 1px solid #333;
        }
        
        .device-comparison {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .device-icon {
            font-size: 32px;
            padding: 10px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
        }
        
        .tablet-icon {
            background: linear-gradient(135deg, #E91E63, #c2185b);
        }
        
        .arrow {
            font-size: 24px;
            color: #E91E63;
            animation: bounce 2s infinite;
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateX(0); }
            40% { transform: translateX(5px); }
            60% { transform: translateX(3px); }
        }
        
        .tablet-modal-header h3 {
            margin: 0 0 10px 0;
            font-size: 22px;
            color: white;
        }
        
        .modal-subtitle {
            margin: 0;
            color: #ccc;
            font-size: 14px;
        }
        
        .tablet-modal-body {
            padding: 30px;
        }
        
        .screen-comparison {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .mobile-screen, .tablet-screen {
            flex: 1;
            text-align: center;
        }
        
        .screen-label {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #999;
        }
        
        .screen-label.recommended {
            color: #E91E63;
        }
        
        .mobile-preview {
            border: 2px solid #666;
            border-radius: 15px;
            padding: 15px;
            background: #222;
        }
        
        .mobile-ui {
            margin-bottom: 10px;
        }
        
        .mobile-header {
            font-size: 12px;
            font-weight: bold;
            padding: 8px;
            background: #333;
            border-radius: 5px;
            margin-bottom: 8px;
        }
        
        .mobile-tabs {
            display: flex;
            gap: 5px;
            justify-content: center;
            margin-bottom: 8px;
        }
        
        .mobile-tab {
            padding: 4px 8px;
            background: #444;
            border-radius: 3px;
            font-size: 10px;
        }
        
        .mobile-tab.active {
            background: #E91E63;
        }
        
        .mobile-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
        }
        
        .mobile-item {
            height: 40px;
            background: #555;
            border-radius: 5px;
        }
        
        .warning-text {
            font-size: 11px;
            color: #ff9800;
            margin-top: 10px;
        }
        
        .vs-divider {
            font-size: 16px;
            font-weight: bold;
            color: #E91E63;
            align-self: center;
        }
        
        .tablet-preview {
            border: 2px solid #E91E63;
            border-radius: 15px;
            padding: 10px;
            background: linear-gradient(135deg, rgba(233, 30, 99, 0.1), rgba(194, 24, 91, 0.1));
        }
        
        .tablet-screenshot {
            width: 100%;
            max-width: 200px;
            height: 120px;
            object-fit: cover;
            border-radius: 10px;
            margin-bottom: 10px;
        }
        
        .benefit-text {
            font-size: 12px;
            color: #4caf50;
            font-weight: 500;
        }
        
        .benefits-section {
            text-align: center;
        }
        
        .benefits-section h4 {
            margin: 0 0 20px 0;
            color: white;
            font-size: 18px;
        }
        
        .benefits-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .benefit-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            font-size: 13px;
        }
        
        .benefit-icon {
            font-size: 18px;
        }
        
        .tablet-modal-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 30px;
            border-top: 1px solid #333;
        }
        
        .dont-show-today {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 14px;
            color: #ccc;
        }
        
        .dont-show-today input[type="checkbox"] {
            width: 16px;
            height: 16px;
            accent-color: #E91E63;
        }
        
        .continue-mobile-btn {
            background: linear-gradient(135deg, #E91E63, #c2185b);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .continue-mobile-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(233, 30, 99, 0.4);
        }
        
        /* 모바일 최적화 */
        @media (max-width: 480px) {
            .tablet-modal-content {
                margin: 20px;
                max-width: calc(100vw - 40px);
            }
            
            .tablet-modal-header {
                padding: 20px;
            }
            
            .tablet-modal-body {
                padding: 20px;
            }
            
            .screen-comparison {
                flex-direction: column;
                gap: 15px;
            }
            
            .vs-divider {
                transform: rotate(90deg);
            }
            
            .benefits-grid {
                grid-template-columns: 1fr;
            }
            
            .tablet-modal-footer {
                flex-direction: column;
                gap: 15px;
                align-items: stretch;
            }
            
            .continue-mobile-btn {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

// 성별 선택 화면에서 모달 체크
function checkAndShowTabletRecommendation() {
    // 성별 선택 화면이 표시되었는지 확인
    const genderSelection = document.getElementById('genderSelection');
    if (!genderSelection || genderSelection.style.display === 'none') {
        return;
    }
    
    // 모바일 디바이스이고 오늘 아직 보여주지 않았으면 모달 표시
    if (isMobileDevice() && shouldShowTabletRecommendation()) {
        setTimeout(() => {
            showTabletRecommendationModal();
        }, 1000); // 1초 후 표시 (자연스러운 타이밍)
    }
}

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('태블릿 권장 시스템 초기화');
    
    // 성별 선택 화면이 있으면 바로 체크
    checkAndShowTabletRecommendation();
    
    // MutationObserver로 성별 선택 화면 표시 감지
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const target = mutation.target;
                if (target.id === 'genderSelection' && target.style.display !== 'none') {
                    checkAndShowTabletRecommendation();
                }
            }
        });
    });
    
    const genderSelection = document.getElementById('genderSelection');
    if (genderSelection) {
        observer.observe(genderSelection, {
            attributes: true,
            attributeFilter: ['style']
        });
    }
});

// 전역 함수로 노출
window.continueWithMobile = continueWithMobile;

console.log('✅ 태블릿 권장 안내 시스템 로드 완료');
