<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>HAIRGATOR - Professional Hair Style Menu</title>
    
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="#000000">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="HAIRGATOR">
    <meta name="format-detection" content="telephone=no">
    <meta name="mobile-web-app-capable" content="yes">
    <link rel="manifest" href="manifest.json">
    
    <!-- 아이콘 -->
    <link rel="apple-touch-icon" href="icons/icon-192.png">
    <link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
    
    <!-- 구글 폰트 -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Firebase -->
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js"></script>

    <!-- CSS 파일들 -->
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/theme-extension.css">
</head>
<body>
    <!-- 로딩 화면 -->
    <div id="loadingScreen" class="loading-screen">
        <div class="loading-content">
            <div class="loading-logo">H</div>
            <div class="loading-text">HAIRGATOR</div>
            <div class="loading-spinner"></div>
        </div>
    </div>

    <!-- 로그인 화면 -->
    <div id="loginScreen" class="login-screen active">
        <div class="login-container">
            <div class="login-header">
                <div class="login-logo">🦎</div>
                <h1>HAIRGATOR</h1>
                <p>디지털 헤어 스타일 메뉴</p>
            </div>
            
            <form id="loginForm" class="login-form">
                <div class="form-group">
                    <label>디자이너 이름</label>
                    <input type="text" id="designerName" placeholder="이름을 입력하세요" required>
                </div>
                
                <div class="form-group">
                    <label>휴대폰 번호</label>
                    <input type="tel" id="phoneNumber" placeholder="010-1234-5678" maxlength="13" required>
                </div>
                
                <div class="form-group">
                    <label>비밀번호 4자리</label>
                    <input type="password" id="password" placeholder="****" maxlength="4" pattern="[0-9]{4}" required>
                </div>
                
                <button type="submit" class="login-btn">로그인</button>
            </form>
            
            <div class="login-footer">
                <p>처음 사용하시나요? 관리자에게 문의하세요.</p>
            </div>
        </div>
    </div>

    <!-- 성별 선택 화면 -->
    <div id="genderSelection" class="gender-selection">
        <div class="gender-header">
            <h2>성별을 선택하세요</h2>
            <p id="designerNameDisplay" class="designer-info">Designer</p>
            <div class="token-display" style="display: none;">0 토큰</div>
        </div>
        
        <div class="gender-options">
            <button class="gender-btn male" data-gender="male" onclick="selectGender('male')">
                <span class="gender-icon">👨</span>
                <span class="gender-text">남성</span>
            </button>
            
            <button class="gender-btn female" data-gender="female" onclick="selectGender('female')">
                <span class="gender-icon">👩</span>
                <span class="gender-text">여성</span>
            </button>
        </div>
    </div>

    <!-- 메인 메뉴 화면 -->
    <div id="mainMenu" class="main-menu" style="display: none;">
        <!-- 헤더 -->
        <header class="header">
            <button id="backBtn" class="back-btn" style="display: none;">
                <span>←</span>
            </button>
            
            <div class="header-title">
                <div class="logo">HAIRGATOR</div>
                <div class="user-info">
                    <span id="designerNameDisplay2">Designer</span>
                    <div class="token-display" style="display: none;">0 토큰</div>
                </div>
            </div>
            
            <button id="menuBtn" class="menu-btn">
                <span>☰</span>
            </button>
        </header>

        <!-- 메뉴 컨테이너 -->
        <div id="menuContainer" class="menu-container">
            <!-- 카테고리 탭 -->
            <div id="categoryTabs" class="category-tabs">
