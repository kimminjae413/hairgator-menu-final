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

## 🚨 현재 앱 버전 (2026-01-15 업데이트)

| 플랫폼 | 스토어 제출 | 최신 빌드 |
|--------|------------|----------|
| **Android** | v73 | v86 (스플래시 화면 추가) |
| **iOS** | v76 | v98 (v94 복원 - IAP 테스트 중) |

### 빌드 파일 경로
- **APK**: `D:\hairgator_dev\hairgator_flutter_app\build\app\outputs\flutter-apk\app-release.apk`
- **AAB**: `D:\hairgator_dev\hairgator_flutter_app\build\app\outputs\bundle\release\app-release.aab`

---

## 📋 버전 히스토리

| 버전 | 상태 | 내용 |
|------|------|------|
| v98 | 🔄 테스트 중 | v94 코드로 복원 (IAP 작동 확인 필요) |
| v94 | 작동 확인됨 | restored 구매 무시 추가 |
| v93 | 빌드됨 | StoreKit 2 JWS serverVerificationData 사용 |
| v86 | Android | 스플래시 화면 추가 (flutter_native_splash) |
| v85 | 빌드됨 | webview_flutter 4.13.0 업데이트 (iOS 18.2 클릭 수정) |
| v84 | 빌드됨 | Apple 로그인 accessToken 수정 |
| v78 | 스토어 제출됨 | iOS bfcache 스피너 무한표시 수정 (주기적 JS 주입) |
| v76 | 스토어 제출됨 | 디버그 버튼/콘솔 UI 제거 |
| v75 | iOS 제출됨 | login.html 리다이렉트 감지 |
| v74 | iOS 제출됨 | WebView 콘솔 로그 캡처 |
| v73 | Android 제출됨 | 네이티브 로그인 약관 동의 |
| v72 | iOS | iOS Keychain 세션 정리 |
| v62 | 레거시 | permission_handler + WebView 권한 |

### ⚠️ v77은 사용하지 않음!
- v77: Flutter에서 스크롤 문제 해결 시도 (VerticalDragGestureRecognizer 변경)
- **결과**: 불필요 - 스크롤 문제는 **웹 코드(menu.js)에서 해결됨**
- v77 스킵 → v78로 진행

### ⚠️ v95~v97 문제 발생!
- v95: `_handleIAPRequest` async로 변경 + 상품 로드 체크 추가
- v96: `TapGestureRecognizer` 추가
- v97: `EagerGestureRecognizer`로 변경
- **결과**: WebView 버튼 클릭이 아예 안 됨 (JS 실행 안 됨)
- **해결**: v94 코드로 복원 → v98

---

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
- Dart SDK 호환성 문제 → SDK 업그레이드로 해결 (다운그레이드 X)
- 현재: `kakao_flutter_sdk_user: ^1.10.0` + Dart SDK ^3.6.0 + Flutter 3.38.5

---

## 🔴 자주 헷갈리는 것들

### 🔥 Flutter WebView 스크롤 문제 (2026-01-08 해결) - 중요!

**증상:**
- 1번 탭 (스타일 메뉴): 스크롤 정상 ✅
- 2번/3번 탭 (Plan & Billing, My): 아래로 스크롤은 됨, **위로 스크롤 안됨** ❌
- 손가락 안 떼면 됨, 떼고 다시 올리면 안됨

**원인 (menu.js Pull-to-Refresh 차단 코드):**
```javascript
// ❌ 문제 코드 - window.scrollY는 항상 0!
const scrollTop = window.scrollY || document.documentElement.scrollTop;
if (scrollTop <= 0 && currentY > lastY) {
    e.preventDefault();  // 위로 스크롤 시 항상 막힘!
}
```
- `.page-content`는 `position: absolute`라서 `window.scrollY`가 항상 0
- 1번 탭은 이 코드를 안 거침 (`.menu-items-container`는 별도 체크)

**해결 (menu.js 수정):**
```javascript
// ✅ 명시적 스크롤 컨테이너 체크 추가
const scrollableContainer = e.target.closest(
    '.styles-container, .menu-items-container, .style-modal-content, .page-content'
);
if (scrollableContainer) {
    // scrollableContainer.scrollTop 사용! (window.scrollY 아님!)
    const isAtTop = scrollableContainer.scrollTop <= 0;
    if (isAtTop && isPullingDown) {
        e.preventDefault();
    }
    return;
}
```

**같이 수정해야 하는 파일:**
- `dynamic-layout.js` line 49: `.page-content` 추가 필요

**핵심 교훈:**
- ❌ `window.scrollY` 사용하면 `position: absolute/fixed` 컨테이너에서 항상 0
- ✅ 스크롤 컨테이너의 `.scrollTop` 직접 사용해야 함
- ❌ Flutter 쪽 수정 불필요 - 웹에서 해결!

---

### iOS bfcache 스피너 무한표시 문제 (2026-01-09 수정) - 중요!

**증상:**
- 앱 첫 실행: 스피너 정상 작동 (표시 후 사라짐) ✅
- 다른 페이지(AI 얼굴변환, 스타일매치, 챗봇 등) 갔다가 **뒤로가기** → 핑크 스피너 무한 표시 ❌
- 웹 브라우저: 문제 없음 ✅
- Android 앱: 문제 없음 ✅
- **iOS 앱만 문제** ❌

**원인:**
- iOS WKWebView의 bfcache가 페이지의 **렌더링 상태**를 캐시
- 뒤로가기 시 `onPageFinished` 콜백 호출 안됨
- 웹의 JavaScript `pageshow` 이벤트는 호출되지만 DOM 조작이 렌더링에 반영 안됨

**해결 (v78 - Flutter 쪽):**
```dart
// home_screen.dart
// iOS 전용: 주기적 스피너 숨김 타이머 (500ms마다)
if (Platform.isIOS) {
  _spinnerHideTimer = Timer.periodic(const Duration(milliseconds: 500), (timer) {
    if (_webViewReady && !_isLoading) {
      _injectSpinnerHiderSilent();  // JS 주입하여 스피너 강제 숨김
    }
  });
}
```

**웹 쪽 보조 처리 (index.html):**
```javascript
window.addEventListener('pageshow', function(event) {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
});
```

**핵심 교훈:**
- ❌ 웹 JavaScript만으로는 iOS WKWebView bfcache 문제 해결 불가
- ✅ Flutter에서 주기적으로 JS 주입해야 확실히 해결됨
- ❌ reload() 사용하면 해결되지만 성별 선택 화면으로 돌아가서 UX 나쁨

---

### iOS 18.2 WebView 클릭 안됨 문제 (2026-01-12 수정) - 중요!

**증상:**
- 네이티브 로그인(Apple/카카오) 후 WebView 버튼 클릭 안됨
- 결제 버튼, 로그아웃 버튼 등 반응 없음
- Android: 정상 ✅
- **iOS 18.2+만 문제** ❌

**원인:**
- iOS 18.2에서 Flutter WebView의 gesture recognizer가 네이티브 위젯 상호작용 후 캐시된 상태 유지
- 공식 버그: [flutter/flutter#158961](https://github.com/flutter/flutter/issues/158961)

**해결 (v85):**
```yaml
# pubspec.yaml - webview_flutter 4.13.0+로 업데이트
webview_flutter: ^4.13.0  # iOS 18.2 클릭 수정 포함
```

**핵심 교훈:**
- ❌ 웹 JS에서 ontouchend 추가해도 해결 안됨
- ✅ webview_flutter 최신 버전으로 업데이트 필요 (Flutter 엔진 레벨 수정)
- ✅ Flutter 3.27.1+ 에 엔진 수정 포함됨 (PR #56804)

---

### Apple 로그인 "Invalid OAuth response" 에러 (2026-01-12 수정)

**증상:**
- Apple 로그인 시도 → "Invalid OAuth response from apple.com" 에러
- Apple Developer, Firebase Console 설정 다 정상인데 안됨

**원인:**
- Firebase flutter_auth 5.2.0+에서 Apple OAuth에 `accessToken` 파라미터 필수
- 공식 이슈: [firebase/flutterfire#13242](https://github.com/firebase/flutterfire/issues/13242)

**해결 (v84 - auth_service.dart):**
```dart
// ❌ 잘못된 코드
final oauthCredential = OAuthProvider("apple.com").credential(
  idToken: identityToken,
  rawNonce: rawNonce,
);

// ✅ 올바른 코드 - accessToken 추가!
final oauthCredential = OAuthProvider("apple.com").credential(
  idToken: identityToken,
  rawNonce: rawNonce,
  accessToken: appleCredential.authorizationCode,  // 필수!
);
```

**핵심 교훈:**
- ❌ Firebase Console 설정만으로는 해결 안됨
- ✅ Dart 코드에서 `accessToken` 파라미터에 `authorizationCode` 전달 필수

---

### iOS 인앱결제 (IAP) 문제들 (2026-01-15 작업 중) - 중요!

**현재 상태: v98 테스트 중**

#### 1. StoreKit 2 JWS 형식 문제 (해결됨)
- **증상**: Apple 영수증 검증 실패 (에러 코드 21002)
- **원인**: iOS 15+에서 영수증이 JWS 형식(eyJ...로 시작)으로 변경됨
- **해결**: `iap-verify.js`에서 JWS 형식 감지 및 디코딩 추가
```javascript
// JWS 형식 감지
const isJWS = receipt.startsWith('eyJ');
if (isJWS) {
  const jwsResult = verifyStoreKit2JWS(receipt);
  // ...
}
```

#### 2. 중복 결제 처리 문제 (해결됨)
- **증상**: 같은 구매가 여러 번 처리되어 토큰 중복 충전
- **원인**: `PurchaseStatus.restored`도 새 구매처럼 처리됨
- **해결**: `iap_service.dart`에서 restored는 무시
```dart
case PurchaseStatus.restored:
  // 소모성 상품은 복원 안 함
  print('[IAP] Ignoring restore: ${purchase.productID}');
  _completePurchase(purchase);
  break;
```

#### 3. JWS transactionId 추출 (해결됨)
- **증상**: 같은 트랜잭션이 중복 처리됨
- **원인**: JWS에서 transactionId 추출 안 함 → 랜덤 ID 생성
- **해결**: `iap-verify.js`에서 JWS 트랜잭션 ID 추출
```javascript
if (appleResponse?.jwsTransaction?.transactionId) {
  transactionId = appleResponse.jwsTransaction.transactionId;
}
```

#### 4. WebView 버튼 클릭 안됨 (미해결 - 조사 중)
- **증상**: Billing 탭에서 "선택하기" 버튼 클릭해도 아무 반응 없음
- **발생 시점**: v95 이후
- **시도한 것들**:
  - v95: `_handleIAPRequest` async 변경 → 문제 발생
  - v96: `TapGestureRecognizer` 추가 → 해결 안됨
  - v97: `EagerGestureRecognizer` 변경 → 해결 안됨
- **현재 조치**: v94 코드로 복원 (v98)
- **다음 단계**: v98 빌드 후 테스트 필요

**⚠️ gestureRecognizers 주의:**
- 기존 작동 설정: `VerticalDragGestureRecognizer` + `HorizontalDragGestureRecognizer`
- `TapGestureRecognizer`, `EagerGestureRecognizer` 추가하면 오히려 클릭 안됨!

---

### Flutter WebView 카카오 로그인 흐름 (2026-01-07 디버깅)

**⚠️ 핵심: Flutter Firebase와 WebView Firebase는 별개!**

```
Flutter 앱                    서버                         WebView
    │                          │                              │
    ├─ 카카오 로그인 ─────────────►│                              │
    │                          │                              │
    │  ◄─── customToken ──────┤ kakao-token.js               │
    │       (claims 포함)      │ - email, kakaoId 등          │
    │                          │ - Firestore 문서 업데이트     │
    │                          │                              │
    ├─ signInWithCustomToken ──►│                              │
    │                          │                              │
    ├─ getIdToken() ───────────►│                              │
    │                          │                              │
    ├─────── ?firebaseToken=xxx ─────────────────────────────►│
    │                          │                              │
    │                          │  ◄──── verify-firebase-token │
    │                          │        (claims 복사 필수!)   │
    │                          │                              │
    │                          │        customToken ─────────►│
    │                          │        (claims 포함!)        │
    │                          │                              │
    │                          │              signInWithCustomToken
    │                          │              auth.js 실행
```

**❌ 이전 버그:** `verify-firebase-token.js`에서 claims 없이 토큰 생성
```javascript
// ❌ 잘못된 코드
const customToken = await admin.auth().createCustomToken(uid);

// ✅ 올바른 코드 - claims 복사!
const customToken = await admin.auth().createCustomToken(uid, {
    email: decodedToken.email,
    kakaoId: decodedToken.kakaoId,
    // ...
});
```

**사이드바 프로필 사진 안 나오는 문제:**
- 원인: `user.email`이 카카오 로그인 시 null → Firestore 문서 ID 생성 실패
- 해결: token claims에서 email 가져와서 docId 생성 (main.js `updateMypageInfo`)

**Firestore 문서 중복 생성 문제:**
- `708eric_hanmail_net` (이메일 기반, 올바른 문서)
- `kakao_4556280939` (UID 기반, 중복)
- 원인: kakao-token.js에서 기존 문서 검색 실패
- 해결: 이메일 우선 검색 + `kakao_` 문서 제외

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
```python
# ✅ 올바른 방법
client.file_search_stores.upload_to_file_search_store(
    file=file_path,
    file_search_store_name=STORE_NAME
)
```
**Store ID**: `fileSearchStores/hairgator-theory-final-2025-kkb6n1ftfbf2`

### style-match vs 메인 서비스
- **메인 서비스**: `index.html` + `menu.js` (스타일 이미 로드됨)
- **style-match**: `/style-match/index.html` + `app.js` (스타일 API 별도 로드)
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
- **Shorebird**: Disabled
- **빌드 인자**: 없음 (flavor 사용 안 함)

---

## Flutter 프로젝트 경로 (D드라이브)
- **프로젝트**: `D:\hairgator_dev\hairgator_flutter_app\`
- **Flutter SDK**: `D:\hairgator_dev\flutter\`
- **Android SDK**: `D:\hairgator_dev\Android\Sdk\`

---

## 핵심 아키텍처

### RAG 시스템
- **Gemini File Search API**, 57개 문서, 524MB
- 이론 PDF, 펌/커트 레시피 자막, 용어사전, 카테고리 가이드

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

### 토큰 차감 방식
- GPT/Claude 스타일: 사전 체크 없이 백단 차감
- 실패 시 `/#products` 이동 (업그레이드 유도)

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

## 2026-01-06 iOS 회색/흰 화면 해결 ✅

### 문제
- v28~v32: 회색/흰 화면 (앱 시작 안 됨)
- v32 디버그 UI도 표시 안 됨 → Dart 코드 실행 전 멈춤

### 원인
- `main()`에서 `await Firebase.initializeApp()` 호출 시 iOS에서 블로킹
- UI 렌더링 전에 초기화하면 앱이 회색 화면에서 멈춤

### 해결 (v33)
```dart
void main() {
  runApp(const HairgatorApp());  // 먼저 앱 실행
}

class _HairgatorAppState extends State<HairgatorApp> {
  @override
  void initState() {
    super.initState();
    _initializeApp();  // UI 띄운 후 비동기 초기화
  }

  Future<void> _initializeApp() async {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  }
}
```

### 핵심 교훈
- ❌ `main()`에서 `await` 사용 시 iOS에서 UI 렌더링 전 블로킹 가능
- ✅ `runApp()` 먼저 실행 → `initState()`에서 비동기 초기화
- ✅ `DefaultFirebaseOptions.currentPlatform` 반드시 사용

### 현재 상태
- **v33**: 로그인 화면 정상 표시 ✅
- **다음 할 일**: 카카오/구글/이메일 로그인 테스트, WebView 홈 화면 테스트

---

## 2026-01-12 iOS 결제/로그아웃 버튼 안됨 해결 ✅

### 문제 1: 결제 버튼 클릭해도 아무 반응 없음

**증상:**
- Apple 로그인 후 "선택하기" 버튼 눌러도 아무 반응 없음
- Android: 정상 ✅
- iOS: 안됨 ❌

**원인:**
- `main.js`의 `selectPlanAndPay` 함수가 `payment.js`의 함수를 **덮어쓰고** 있었음
- `payment.js`: iOS 체크 있음 ✅ → `isIOSFlutterApp()` 체크 후 `IAPChannel` 호출
- `main.js`: iOS 체크 없음 ❌ → 무조건 외부결제(PortOne) 호출

**해결 (main.js 수정):**
```javascript
window.selectPlanAndPay = async function(planType) {
    // ⭐ iOS Flutter 앱이면 인앱결제 사용
    if (typeof window.isIOSFlutterApp === 'function' && window.isIOSFlutterApp()) {
        console.log('[IAP] iOS Flutter 앱 감지 → 인앱결제 진행');
        if (typeof window.requestIOSInAppPurchase === 'function') {
            window.requestIOSInAppPurchase(planType);
            return;
        }
    }
    // 기존 외부결제 로직...
};
```

### 문제 2: 로그아웃 버튼 눌러도 아무 반응 없음

**증상:**
- 웹 브라우저: "로그아웃 하시겠습니까?" 확인창 뜸 ✅
- iOS 앱: 아무 반응 없음 ❌

**원인:**
- `index.html` 안에 **또 다른 `logout()` 함수**가 있었음 (line ~3492)
- 이 함수가 `auth.js`의 `logout()`을 덮어씀
- `confirm()` 다이얼로그가 iOS WKWebView에서 제대로 안 뜸

**해결 (index.html 수정):**
```javascript
async function logout() {
    // Flutter 앱인 경우 바로 네이티브 로그인으로 이동
    if (window.FlutterChannel) {
        console.log('📱 [logout] Flutter 앱 → 네이티브 로그인으로 이동');
        window.FlutterChannel.postMessage('logout');
        return;
    }
    // 웹 브라우저인 경우 확인 후 로그아웃
    if (confirm('로그아웃 하시겠습니까?')) {
        // ...
    }
}
```

### 문제 3: 인앱결제 상품 없음

**증상:**
- 결제 버튼 클릭 시 "상품을 찾을 수 없습니다: hairgator_basic" 에러

**원인:**
- App Store Connect에서 인앱 구매 상품 미생성
- 유료 앱 계약 미완료 (세금 양식 대기 중)

**해결 (내일 작업):**
1. App Store Connect → 비즈니스 → 유료 앱 계약 완료
2. 세금 양식 제출 (W-8BEN-E 등)
3. 인앱 구매 상품 생성:
   - `hairgator_basic` - ₩22,000
   - `hairgator_pro` - ₩38,000
   - `hairgator_business` - ₩50,000

### 추가 수정사항

**ontouchend 핸들러 추가:**
- iOS에서 onclick이 안 먹을 때를 대비해 모든 버튼에 `ontouchend` 추가
- 결제 버튼, 로그아웃 버튼, 마이페이지 메뉴 등

**iOS Flutter 앱 감지 로직 추가 (index.html):**
```javascript
function checkIOSFlutterApp() {
    if (typeof window.IAPChannel !== 'undefined') {
        document.documentElement.classList.add('ios-flutter-app');
    }
}
```

**iOS에서 외부결제 UI 숨김 (main.css):**
```css
html.ios-flutter-app .ios-hide-payment {
    display: none !important;
}
```

### 핵심 교훈
- ❌ 같은 함수명이 여러 파일에 있으면 나중에 로드된 게 덮어씀
- ❌ `confirm()` 다이얼로그는 iOS WKWebView에서 문제 발생 가능
- ✅ Flutter 앱 체크는 **가장 먼저** 해야 함 (다른 로직 실행 전에)
- ✅ iOS 인앱결제는 App Store Connect 계약/상품 등록 필수

---

## 2026-01-13 Android 구글 로그인 + 스플래시 화면 ✅

### Android 구글 로그인 실패 해결

**증상:**
- "Google 로그인에 실패했습니다" 에러

**원인 및 해결:**
1. **SHA-1 지문 미등록**: Firebase Console에 SHA-1 인증서 지문 등록
   - 지문: `EC:F0:E4:72:49:06:DB:83:D9:CB:86:E2:14:AA:B7:F7:05:80:FB:79`
   - Firebase Console → 프로젝트 설정 → Android 앱 → SHA 인증서 지문 추가

2. **패키지명 불일치**: build.gradle과 google-services.json 패키지명 다름
   - google-services.json: `kr.hairgator.hairgator`
   - build.gradle: `com.hairgator` (잘못됨)
   - **⚠️ Play Store에 `com.hairgator`로 출시됨** → build.gradle 유지, Firebase에 `com.hairgator` 앱 추가

3. **MainActivity.kt 패키지 경로**: 패키지명 변경 시 MainActivity.kt도 이동 필요
   ```
   android/app/src/main/kotlin/com/hairgator/MainActivity.kt
   ```
   ```kotlin
   package com.hairgator
   import io.flutter.embedding.android.FlutterActivity
   class MainActivity: FlutterActivity()
   ```

**핵심 교훈:**
- ❌ Play Store 출시 후 패키지명(applicationId) 변경하면 새 앱으로 인식됨
- ✅ Firebase에 올바른 패키지명으로 Android 앱 추가
- ✅ MainActivity.kt 파일 경로와 package 선언이 build.gradle의 namespace와 일치해야 함

---

### 플랜 다운그레이드 예약 기능 추가

**기능:**
- 유료 플랜 사용자가 무료 플랜으로 전환 예약 가능
- 만료일까지 현재 플랜 유지 후 자동 전환
- "X일 후 무료 플랜으로 전환됩니다" 안내 표시
- 예약 취소 가능

**Firestore 필드:**
```javascript
{
  plan: 'basic',           // 현재 플랜
  planExpiresAt: timestamp, // 만료일
  pendingPlan: 'free',     // 예약된 다음 플랜
  pendingPlanSetAt: timestamp // 예약 설정 시간
}
```

**수정 파일:**
- `index.html`: 다운그레이드 버튼 + 예약 안내 UI + CSS
- `js/main.js`: `requestDowngrade()`, `cancelPendingDowngrade()` 함수
- `js/firebase-bridge.js`: `setPendingPlan()`, `getTokenBalance()`에 pendingPlan 추가
- `netlify/functions/check-plan-expiration.js`: pendingPlan 적용 로직

---

### 스플래시 화면 추가 (v86)

**패키지:** `flutter_native_splash: ^2.4.0`

**설정 (pubspec.yaml):**
```yaml
flutter_native_splash:
  color: "#FFFFFF"
  image: assets/splash_logo.png
  android_12:
    color: "#FFFFFF"
    image: assets/splash_logo.png
  ios: true
  android: true
```

**로고 파일:**
- 원본: `C:\Users\김민재\Desktop\로고.png`
- 복사: `D:\hairgator_dev\hairgator_flutter_app\assets\splash_logo.png`

**생성 명령:**
```bash
dart run flutter_native_splash:create
```

**결과:**
- Android: `res/drawable-*/splash.png` 생성
- iOS: `LaunchImage` 업데이트
- 흰색 배경 + 중앙 HAIRGATOR 로고
