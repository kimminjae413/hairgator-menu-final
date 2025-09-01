/* 🎨 HAIRGATOR - 테마 확장 시스템 CSS */

/* ========== 블루 테마 ========== */
body.blue-theme {
    background: #0d1421;
    color: #e3f2fd;
}

body.blue-theme .main-menu {
    background: #0d1421;
}

body.blue-theme .header {
    background: rgba(13, 20, 33, 0.95);
    border-bottom: 1px solid rgba(33, 150, 243, 0.3);
    backdrop-filter: blur(20px);
}

body.blue-theme .logo {
    color: #e3f2fd;
    text-shadow: 0 0 10px rgba(33, 150, 243, 0.5);
    animation: blueNeonGlow 3s ease-in-out infinite alternate;
}

body.blue-theme .back-btn,
body.blue-theme .theme-btn,
body.blue-theme .menu-btn {
    color: #e3f2fd;
}

body.blue-theme .menu-btn:hover {
    background: rgba(33, 150, 243, 0.2);
}

body.blue-theme .menu-btn span {
    background: #e3f2fd;
}

body.blue-theme .main-tabs,
body.blue-theme .sub-tabs {
    background: #162032;
    border-bottom-color: rgba(33, 150, 243, 0.3);
}

body.blue-theme .main-tab,
body.blue-theme .sub-tab {
    background: #1e2a42;
    color: #bbdefb;
    border-color: rgba(33, 150, 243, 0.3);
}

body.blue-theme .main-tab:hover,
body.blue-theme .sub-tab:hover {
    background: #253352;
    color: #e3f2fd;
}

body.blue-theme .main-tab.active {
    background: #2196f3;
    color: white;
    border-color: #2196f3;
    box-shadow: 0 0 15px rgba(33, 150, 243, 0.5);
}

body.blue-theme .styles-container {
    background: #0f1a26;
}

body.blue-theme .style-card {
    background: #253352;
    border-color: rgba(33, 150, 243, 0.3);
}

body.blue-theme .style-card:hover {
    border-color: #2196f3;
    box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
    transform: translateY(-2px);
}

body.blue-theme .style-name,
body.blue-theme .style-code {
    color: #e3f2fd;
}

body.blue-theme .sidebar {
    background: #162032;
    border-left: 1px solid rgba(33, 150, 243, 0.3);
}

body.blue-theme .sidebar-header h3,
body.blue-theme .sidebar-close,
body.blue-theme .theme-section h5,
body.blue-theme .menu-item {
    color: #e3f2fd;
}

body.blue-theme .sidebar-close:hover,
body.blue-theme .menu-item:hover {
    background: rgba(33, 150, 243, 0.2);
}

body.blue-theme .user-info {
    background: #1e2a42;
    border: 1px solid rgba(33, 150, 243, 0.3);
}

body.blue-theme .user-info h4 {
    color: #64b5f6;
}

@keyframes blueNeonGlow {
    from { text-shadow: 0 0 5px rgba(33, 150, 243, 0.5); }
    to { text-shadow: 0 0 20px rgba(33, 150, 243, 0.8), 0 0 30px rgba(33, 150, 243, 0.6); }
}

/* ========== 퍼플 테마 ========== */
body.purple-theme {
    background: #1a0d1a;
    color: #f3e5f5;
}

body.purple-theme .main-menu {
    background: #1a0d1a;
}

body.purple-theme .header {
    background: rgba(26, 13, 26, 0.95);
    border-bottom: 1px solid rgba(156, 39, 176, 0.3);
    backdrop-filter: blur(20px);
}

body.purple-theme .logo {
    color: #f3e5f5;
    text-shadow: 0 0 10px rgba(156, 39, 176, 0.5);
    animation: purpleGlow 4s ease-in-out infinite alternate;
}

body.purple-theme .back-btn,
body.purple-theme .theme-btn,
body.purple-theme .menu-btn {
    color: #f3e5f5;
}

body.purple-theme .menu-btn:hover {
    background: rgba(156, 39, 176, 0.2);
}

body.purple-theme .menu-btn span {
    background: #f3e5f5;
}

body.purple-theme .main-tabs,
body.purple-theme .sub-tabs {
    background: #2d1b2d;
    border-bottom-color: rgba(156, 39, 176, 0.3);
}

body.purple-theme .main-tab,
body.purple-theme .sub-tab {
    background: #3d2a3d;
    color: #ce93d8;
    border-color: rgba(156, 39, 176, 0.3);
}

body.purple-theme .main-tab:hover,
body.purple-theme .sub-tab:hover {
    background: #4a334a;
    color: #f3e5f5;
}

body.purple-theme .main-tab.active {
    background: #9c27b0;
    color: white;
    border-color: #9c27b0;
    box-shadow: 0 0 15px rgba(156, 39, 176, 0.5);
}

body.purple-theme .styles-container {
    background: #1f141f;
}

body.purple-theme .style-card {
    background: #3d2a3d;
    border-color: rgba(156, 39, 176, 0.3);
}

body.purple-theme .style-card:hover {
    border-color: #9c27b0;
    box-shadow: 0 0 20px rgba(156, 39, 176, 0.3);
    transform: translateY(-2px);
}

body.purple-theme .style-name,
body.purple-theme .style-code {
    color: #f3e5f5;
}

body.purple-theme .sidebar {
    background: #2d1b2d;
    border-left: 1px solid rgba(156, 39, 176, 0.3);
}

body.purple-theme .sidebar-header h3,
body.purple-theme .sidebar-close,
body.purple-theme .theme-section h5,
body.purple-theme .menu-item {
    color: #f3e5f5;
}

body.purple-theme .sidebar-close:hover,
body.purple-theme .menu-item:hover {
    background: rgba(156, 39, 176, 0.2);
}

body.purple-theme .user-info {
    background: #3d2a3d;
    border: 1px solid rgba(156, 39, 176, 0.3);
}

body.purple-theme .user-info h4 {
    color: #ce93d8;
}

@keyframes purpleGlow {
    from { text-shadow: 0 0 5px rgba(156, 39, 176, 0.5); }
    to { text-shadow: 0 0 25px rgba(156, 39, 176, 0.8), 0 0 35px rgba(156, 39, 176, 0.6); }
}

/* ========== 그린 테마 ========== */
body.green-theme {
    background: #0d1410;
    color: #e8f5e8;
}

body.green-theme .main-menu {
    background: #0d1410;
}

body.green-theme .header {
    background: rgba(13, 20, 16, 0.95);
    border-bottom: 1px solid rgba(76, 175, 80, 0.3);
    backdrop-filter: blur(20px);
}

body.green-theme .logo {
    color: #e8f5e8;
    text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
    animation: greenGlow 3.5s ease-in-out infinite alternate;
}

body.green-theme .back-btn,
body.green-theme .theme-btn,
body.green-theme .menu-btn {
    color: #e8f5e8;
}

body.green-theme .menu-btn:hover {
    background: rgba(76, 175, 80, 0.2);
}

body.green-theme .menu-btn span {
    background: #e8f5e8;
}

body.green-theme .main-tabs,
body.green-theme .sub-tabs {
    background: #1b2e1b;
    border-bottom-color: rgba(76, 175, 80, 0.3);
}

body.green-theme .main-tab,
body.green-theme .sub-tab {
    background: #2a3d2a;
    color: #c8e6c9;
    border-color: rgba(76, 175, 80, 0.3);
}

body.green-theme .main-tab:hover,
body.green-theme .sub-tab:hover {
    background: #344a34;
    color: #e8f5e8;
}

body.green-theme .main-tab.active {
    background: #4caf50;
    color: white;
    border-color: #4caf50;
    box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
}

body.green-theme .styles-container {
    background: #0f1a0f;
}

body.green-theme .style-card {
    background: #2a3d2a;
    border-color: rgba(76, 175, 80, 0.3);
}

body.green-theme .style-card:hover {
    border-color: #4caf50;
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
    transform: translateY(-2px);
}

body.green-theme .style-name,
body.green-theme .style-code {
    color: #e8f5e8;
}

body.green-theme .sidebar {
    background: #1b2e1b;
    border-left: 1px solid rgba(76, 175, 80, 0.3);
}

body.green-theme .sidebar-header h3,
body.green-theme .sidebar-close,
body.green-theme .theme-section h5,
body.green-theme .menu-item {
    color: #e8f5e8;
}

body.green-theme .sidebar-close:hover,
body.green-theme .menu-item:hover {
    background: rgba(76, 175, 80, 0.2);
}

body.green-theme .user-info {
    background: #2a3d2a;
    border: 1px solid rgba(76, 175, 80, 0.3);
}

body.green-theme .user-info h4 {
    color: #81c784;
}

@keyframes greenGlow {
    from { text-shadow: 0 0 5px rgba(76, 175, 80, 0.5); }
    to { text-shadow: 0 0 18px rgba(76, 175, 80, 0.8), 0 0 28px rgba(76, 175, 80, 0.6); }
}

/* ========== 시즌 테마들 (나중에 활용) ========== */
body.autumn-theme {
    background: #2d1810;
    color: #f5e6d3;
}

body.winter-theme {
    background: #0d1a2d;
    color: #e8f4f8;
}

/* ========== 테마 선택기 스타일 ========== */
.theme-section {
    margin: 20px 0;
    padding: 15px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
}

.theme-section h5 {
    margin-bottom: 15px;
    font-size: 16px;
    font-weight: 600;
}

.theme-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 10px;
}

.theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px;
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.theme-option:hover {
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
}

.theme-option.active {
    border-color: var(--female-color, #e91e63);
    background: rgba(233, 30, 99, 0.1);
    box-shadow: 0 0 15px rgba(233, 30, 99, 0.3);
}

.theme-preview {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    position: relative;
    overflow: hidden;
}

.theme-preview.dark {
    background: linear-gradient(45deg, #000000, #333333);
}

.theme-preview.light {
    background: linear-gradient(45deg, #ffffff, #f5f5f5);
}

.theme-preview.blue {
    background: linear-gradient(45deg, #0d1421, #2196f3);
}

.theme-preview.purple {
    background: linear-gradient(45deg, #1a0d1a, #9c27b0);
}

.theme-preview.green {
    background: linear-gradient(45deg, #0d1410, #4caf50);
}

.theme-preview.autumn {
    background: linear-gradient(45deg, #2d1810, #ff8a50);
}

.theme-preview.winter {
    background: linear-gradient(45deg, #0d1a2d, #64b5f6);
}

.theme-icon {
    font-size: 18px;
    z-index: 1;
}

.theme-name {
    font-size: 12px;
    text-align: center;
    font-weight: 500;
    opacity: 0.9;
}

/* 테마 전환 애니메이션 */
.theme-option::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%);
    transform: translateX(-100%);
    transition: transform 0.5s ease;
}

.theme-option:hover::after {
    transform: translateX(100%);
}

/* ========== 테마 토스트 ========== */
.theme-toast {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 25px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.theme-toast.show {
    opacity: 1;
}

/* ========== 로딩 스피너 테마별 색상 ========== */
body.blue-theme .loading-spinner {
    border-top-color: #2196f3;
    filter: drop-shadow(0 0 5px rgba(33, 150, 243, 0.5));
}

body.purple-theme .loading-spinner {
    border-top-color: #9c27b0;
    filter: drop-shadow(0 0 5px rgba(156, 39, 176, 0.5));
}

body.green-theme .loading-spinner {
    border-top-color: #4caf50;
    filter: drop-shadow(0 0 5px rgba(76, 175, 80, 0.5));
}

/* ========== 테마 전환 애니메이션 ========== */
body {
    transition: background-color 0.5s ease, color 0.5s ease;
}

.header,
.main-tabs,
.sub-tabs,
.styles-container,
.sidebar,
.style-modal-content {
    transition: 
        background-color 0.5s ease,
        border-color 0.5s ease,
        box-shadow 0.5s ease;
}

.main-tab,
.sub-tab,
.style-card,
.theme-option,
.menu-btn {
    transition: 
        background-color 0.3s ease,
        border-color 0.3s ease,
        box-shadow 0.3s ease,
        transform 0.2s ease;
}

/* ========== 접근성 - 고대비 모드 지원 ========== */
@media (prefers-contrast: high) {
    .theme-option {
        border-width: 3px;
    }
    
    .theme-option.active {
        border-width: 4px;
    }
    
    body.blue-theme .style-card,
    body.purple-theme .style-card,
    body.green-theme .style-card {
        border-width: 2px;
    }
}

/* ========== 모션 감소 설정 ========== */
@media (prefers-reduced-motion: reduce) {
    body,
    .header,
    .main-tabs,
    .sub-tabs,
    .styles-container,
    .sidebar,
    .style-modal-content,
    .main-tab,
    .sub-tab,
    .style-card,
    .theme-option,
    .menu-btn,
    .theme-toast {
        transition: none;
    }
    
    body.blue-theme .logo,
    body.purple-theme .logo,
    body.green-theme .logo {
        animation: none;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }
    
    .theme-option::after {
        display: none;
    }
}

/* ========== 반응형 디자인 ========== */
@media (max-width: 768px) {
    .theme-options {
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
    }
    
    .theme-option {
        padding: 8px;
    }
    
    .theme-preview {
        width: 35px;
        height: 35px;
    }
    
    .theme-icon {
        font-size: 16px;
    }
    
    .theme-name {
        font-size: 11px;
    }
}
