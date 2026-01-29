# HAIRGATOR 챗봇 - Claude 작업 가이드

---

## ⚠️ AI 작업 규칙 (필독!)

### 🔴 불확실성 프로토콜

Claude가 다음 상황에서는 **반드시** "추측입니다" 또는 "확실하지 않습니다"라고 **먼저** 말해야 함:

| 상황 | 반드시 해야 할 말 |
|------|------------------|
| 외부 라이브러리/SDK 내부 동작 | "SDK 내부 동작은 추측입니다. 확인하려면..." |
| 직접 확인하지 않은 파일/코드 | "파일이 있는지 확인해보겠습니다" → ls/Read 실행 |
| API 동작 방식 (문서 미확인) | "문서를 확인하지 않은 추측입니다" |
| 에러 원인 분석 | "가능한 원인입니다. 확실히 하려면 테스트 필요" |

**금지 패턴:**
```
❌ "원인을 찾았습니다" (테스트 없이)
❌ "이 파일이 있습니다" (ls 없이)
❌ "이게 문제입니다" (검증 없이)
❌ "~하면 됩니다" (확신 없이)
```

**필수 패턴:**
```
✅ "추측입니다. 확인하려면..."
✅ "~일 가능성이 있습니다. 검증 방법은..."
✅ "확인해보겠습니다" → 실제 명령 실행 → 결과 공유
✅ "확실하지 않습니다. 테스트가 필요합니다"
```

---

### 🔴 변경 범위 제한 규칙

#### 디자인/스타일 변경 요청 시:
- ✅ CSS, 색상, 폰트, 레이아웃만 수정
- ❌ JavaScript 로직 수정 금지
- ❌ 기존 함수 동작 변경 금지
- ❌ "ついでに 이것도 개선했습니다" 금지

#### 버그 수정 요청 시:
- ✅ 해당 버그만 수정
- ❌ 주변 코드 리팩토링 금지
- ❌ "더 좋아 보여서" 변경 금지

#### 모든 변경 전 반드시:
1. **"이 파일들을 수정하려고 합니다: [목록]"** 먼저 알림
2. **로직 변경이 필요하면** 먼저 물어보기
3. **사용자 승인 후** 진행

#### 금지 행동:
```
❌ 요청하지 않은 파일 수정
❌ 요청하지 않은 리팩토링
❌ 요청하지 않은 "개선"
❌ 관련 없는 코드 정리
```

---

### 🔴 검증 필수 사항

| 주장하기 전 | 반드시 해야 할 것 |
|------------|------------------|
| "파일이 있다" | `ls` 또는 `Read` 실행 |
| "이 코드가 문제다" | 실제 코드 읽고 확인 |
| "테스트 통과한다" | 실제 테스트 실행 |
| "빌드 된다" | 실제 빌드 명령 실행 |
| "이 API가 호출된다" | 로그 또는 코드에서 확인 |

---

## 🚨 현재 앱 버전 (2026-01-18 업데이트)

| 플랫폼 | 스토어 제출 | 최신 빌드 |
|--------|------------|----------|
| **Android** | v73 | v86 (스플래시 화면 추가) |
| **iOS** | v76 | v115 (iPad InAppWebView 지원) |

### 빌드 파일 경로
- **APK**: `D:\hairgator_dev\hairgator_flutter_app\build\app\outputs\flutter-apk\app-release.apk`
- **AAB**: `D:\hairgator_dev\hairgator_flutter_app\build\app\outputs\bundle\release\app-release.aab`

---

## 📋 버전 히스토리 (최근 5개)

| 버전 | 상태 | 내용 |
|------|------|------|
| v115 | 🔄 테스트 중 | iPad InAppWebView + JavaScript Channel 브릿지 |
| v114 | ✅ iPhone 작동 | buyNonConsumable 수정 |
| v86 | Android | 스플래시 화면 추가 |
| v85 | 빌드됨 | webview_flutter 4.13.0 (iOS 18.2 클릭 수정) |
| v78 | 스토어 제출됨 | iOS bfcache 스피너 수정 |

---

## 🚫 절대 하면 안 되는 것

### 1. OhMyApp/불나비 언급 금지
- ✅ hairgator.kr: **Firebase Auth + Firestore 완전 독립 완료**
- ❌ OhMyApp 어드민, 불나비 앱: **안 씀**
- ❌ "PWA로 하면 어때요?" 제안 금지

### 2. 컬렉션 통일 금지!
| 컬렉션 | 용도 | diagrams | textRecipe |
|--------|------|:--------:|:----------:|
| `hairstyles` | 메뉴판/목록 | ❌ 없음 | ❌ 없음 |
| `styles` | 레시피/도해도 | ✅ 있음 | ✅ 있음 |

- ❌ `hairstyles`에서 `diagrams` 필드 찾지 마 (없음!)
- ✅ 도해도/레시피는 반드시 `styles` 컬렉션에서 조회

### 3. kakao_flutter_sdk_user 다운그레이드 금지!
- **반드시 1.10.0 이상 사용** (1.9.x는 iPad 크래시 버그)
- 현재: `kakao_flutter_sdk_user: ^1.10.0` + Dart SDK ^3.6.0 + Flutter 3.38.5

---

## 🔴 자주 헷갈리는 것들

### 🔥 Flutter WebView 스크롤 문제 (해결됨)
- **원인**: `window.scrollY`는 `position: absolute` 컨테이너에서 항상 0
- **해결**: `scrollableContainer.scrollTop` 직접 사용 (menu.js)
- Flutter 쪽 수정 불필요 - 웹에서 해결!

### iOS bfcache 스피너 무한표시 (해결됨)
- **원인**: iOS WKWebView bfcache가 렌더링 상태 캐시
- **해결**: Flutter에서 주기적으로 JS 주입 (home_screen.dart, 500ms 타이머)

### iOS 18.2 WebView 클릭 안됨 (해결됨)
- **해결**: `webview_flutter: ^4.13.0` 업데이트

### 🔴 iOS WebView 클릭 이벤트 capture:true 필수! - 절대 삭제 금지!
```javascript
// index.html 상단 - 빈 함수처럼 보여도 필수!
document.addEventListener('click', function(e) {}, true);
```

### Apple 로그인 accessToken 필수 (v84)
```dart
// auth_service.dart - accessToken 추가!
final oauthCredential = OAuthProvider("apple.com").credential(
  idToken: identityToken,
  rawNonce: rawNonce,
  accessToken: appleCredential.authorizationCode,  // 필수!
);
```

### iOS 인앱결제 핵심
- `buyConsumable()`: 소모품 (무한 재구매)
- `buyNonConsumable()`: **Non-Renewing Subscription용** ← 이거 사용!
- iPad는 `flutter_inappwebview` 사용 (webview_flutter JS Channel 안됨)

### TestFlight 결제 테스트
- 일반 Apple ID로 테스트 (샌드박스 계정 불필요)
- 동일 상품 재구매: 새 Apple ID로 테스트
- 공개 링크: https://testflight.apple.com/join/q57ST6h3

### Flutter WebView 카카오 로그인 흐름
- Flutter Firebase와 WebView Firebase는 별개!
- `verify-firebase-token.js`에서 claims 복사 필수

### 파일 구분
- **main.js**: 사이드바 메뉴 HTML 동적 생성, 테마 전환
- **menu.js**: 메뉴 클릭 액션, 페이지 이동

### Firestore 컬렉션명
| 용도 | 컬렉션명 |
|------|---------|
| 헤어스타일 메뉴판 | `hairstyles` |
| 레시피/도해도 | `styles` |
| 사용자 | `users` |
| 토큰 로그 | `credit_logs` |

### 스타일 코드 → mainCategory 매핑
| 코드 | mainCategory |
|------|-------------|
| SF | SIDE FRINGE |
| SP | SIDE PART |
| FU | FRINGE UP |
| PB | PUSHED BACK |
| BZ | BUZZ |
| CP | CROP |
| MC | MOHICAN |

### RAG 업로드 (Gemini File Search)
- **Store ID**: `fileSearchStores/hairgator-theory-final-2025-kkb6n1ftfbf2`
- rag_data 폴더에 파일 추가 시 반드시 업로드 스크립트 실행!

### style-match vs 메인 서비스
- **메인 서비스**: `index.html` + `menu.js`
- **style-match**: `/style-match/index.html` + `app.js`
- vModel API는 HTTP URL만 받음 (base64 안 됨)

---

## 계정 정보

### Google Play Console
- **이메일**: drylink.info@gmail.com
- **비밀번호**: alswo1206!@

### App Store 심사용 테스트 계정
- **이메일**: `appstore-review@hairgator.kr`
- **비밀번호**: `Review2025!`

---

## 앱스토어 배포

### 공통
- **Bundle ID**: `com.hairgator`
- **GitHub**: https://github.com/kimminjae413/hairgator-flutter-app

### Android 키스토어 (⚠️ 백업 필수!)
- **파일**: `D:\hairgator_dev\hairgator_flutter_app\android\app\upload-keystore.jks`
- **storePassword/keyPassword**: `hairgator2025`
- **keyAlias**: `upload`

### iOS (Codemagic)
- **App ID**: 6751260003
- **Flutter 버전**: 3.38.5

---

## Flutter 프로젝트 경로 (D드라이브)
- **프로젝트**: `D:\hairgator_dev\hairgator_flutter_app\`
- **Flutter SDK**: `D:\hairgator_dev\flutter\`
- **Android SDK**: `D:\hairgator_dev\Android\Sdk\`

---

## 핵심 아키텍처

### RAG 시스템
- **Gemini File Search API**, 57개 문서, 524MB

### Firestore 컬렉션
- `theory_indexes`: 키워드 매칭 + 이미지 URL (210개)
- `styles`: 레시피 도해도 (209개)
- `users`: 사용자 정보
- `credit_logs`: 토큰 사용 로그

### 핵심 함수 위치 (chatbot-api.js)
- `generateGeminiFileSearchResponse()`: ~2834줄
- `buildGeminiSystemPrompt()`: ~2500줄
- `detectTheoryImageForQuery()`: ~3404줄
- `selectBestStyleByVision()`: ~6543줄

---

## Netlify 환경변수

| 변수명 | 용도 |
|--------|------|
| `FIREBASE_PROJECT_ID` | hairgatormenu-4a43e |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin 인증 |
| `GEMINI_API_KEY` | Gemini AI |
| `KAKAO_REST_API_KEY` | 카카오 로그인 |
| `VMODEL_API_KEY` | 헤어체험 AI |
| `PORTONE_API_SECRET` | 결제 검증 |
| `SENDGRID_API_KEY` | 이메일 알림 |

---

## 토큰 시스템

### 토큰 비용
| 기능 | 토큰 |
|------|------|
| 룩북 | 200 |
| 헤어체험 | 350 |
| 챗봇 | 3~30 (사용량별) |

### 포트원 V2
- storeId: `store-69fa8bc3-f410-433a-a8f2-f5d922f94dcb`
- channelKey: `channel-key-da1e7007-39b9-4afa-8c40-0f158d323af1`

---

## 다국어 지원 (7개국어)
- ko, en, ja, zh, vi, id, es
- `js/i18n.js`에서 7개국어 모두 동일한 키 추가 필수

---

## 배포
- **GitHub**: `kimminjae413/hairgator-menu-final`
- **Netlify**: 자동 배포 (push 후 1-2분)

### 주요 URL
| URL | 용도 |
|-----|------|
| `https://hairgator.kr` | 홈페이지 |
| `https://app.hairgator.kr` | 앱 서비스 |
| `https://app.hairgator.kr/admin.html` | 관리자 |

---

## 해결된 주요 이슈 요약

| 이슈 | 해결 방법 |
|------|----------|
| iOS 회색/흰 화면 | `runApp()` 먼저 실행 → `initState()`에서 Firebase 초기화 |
| iOS 결제버튼 안됨 | `main.js`에서 iOS 체크 추가 + `isIOSFlutterApp()` |
| Android 구글 로그인 | Firebase Console에 SHA-1 지문 등록 + 패키지명 일치 |
| Apple 심사 리젝 | 개인정보처리방침에 MediaPipe 온디바이스 명시, vModel 즉시삭제 명시 |

---

## 퍼스널 컬러 분석 설정

### PC_CONFIG 핵심 값
- 샘플 수집: 25개, 최소 8개 필요
- 조명 품질: 0.45 미만 시 분류 차단
- 언더톤: LAB, RGB, Ratio, CIEDE2000 4가지 방법

### 정확도 벤치마크
- Deep Armocromia SOTA: 54.7%
- 현재 시스템: ~55-62% (일관성 100%)
