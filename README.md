\# HAIRGATOR - 헤어스타일 메뉴판 시스템



\## 📱 프로젝트 소개

HAIRGATOR는 미용실에서 사용하는 디지털 헤어스타일 메뉴판 시스템입니다.

태블릿과 모바일에 최적화되어 있으며, 고객 관리 기능을 포함하고 있습니다.



\## 🎨 주요 기능

\- \*\*헤어스타일 카탈로그\*\*: 성별/카테고리별 스타일 열람

\- \*\*고객 관리\*\*: 방문 기록, 선호 스타일 저장

\- \*\*디자이너 로그인\*\*: 개인별 고객 데이터 관리

\- \*\*인기 통계\*\*: 전체 디자이너 통합 스타일 통계

\- \*\*어드민 패널\*\*: 스타일 등록/수정/삭제



\## 🛠️ 기술 스택

\- \*\*Frontend\*\*: HTML5, CSS3, Vanilla JavaScript

\- \*\*Backend\*\*: Firebase Firestore

\- \*\*Storage\*\*: Firebase Storage

\- \*\*Hosting\*\*: Netlify



\## 📁 프로젝트 구조

```

hairgator/

├── index.html          # 메인 페이지

├── admin.html          # 어드민 페이지

├── css/

│   ├── index-styles.css

│   └── admin-styles.css

├── js/

│   ├── index-firebase.js    # Firebase 연결

│   ├── index-customer.js    # 고객 관리

│   ├── index-stats.js       # 통계 기능

│   ├── index-main.js        # 메인 로직

│   └── admin-main.js        # 어드민 로직

└── README.md

```



\## 🚀 설치 및 실행



\### 1. 로컬 실행

```bash

\# 프로젝트 클론

git clone https://github.com/your-username/hairgator.git



\# 디렉토리 이동

cd hairgator



\# 로컬 서버 실행 (Python 3)

python -m http.server 8000



\# 또는 Live Server (VS Code Extension) 사용

```



\### 2. Firebase 설정

1\. Firebase Console에서 프로젝트 생성

2\. Firestore Database 활성화

3\. Storage 활성화

4\. Firebase 설정 정보를 `js/index-firebase.js`에 업데이트



\### 3. Netlify 배포

```bash

\# Netlify CLI 설치 (선택사항)

npm install -g netlify-cli



\# 배포

netlify deploy --prod

```



\## 📱 접속 URL

\- \*\*메인\*\*: https://lovely-lebkuchen-4017ca.netlify.app

\- \*\*어드민\*\*: https://lovely-lebkuchen-4017ca.netlify.app/admin.html



\## 🔐 보안 주의사항

\- Firebase API 키는 공개 저장소에 올라가도 되지만, Security Rules 설정 필수

\- 디자이너 비밀번호는 클라이언트 사이드에서 처리되므로 주의



\## 📝 라이선스

Private Project - All Rights Reserved



\## 👥 기여자

\- 개발자: \[Your Name]



\## 📞 문의

\- Email: your-email@example.com

