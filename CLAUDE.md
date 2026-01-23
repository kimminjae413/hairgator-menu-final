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

## 📋 버전 히스토리

| 버전 | 상태 | 내용 |
|------|------|------|
| v115 | 🔄 테스트 중 | iPad InAppWebView + JavaScript Channel 브릿지 완전 구현 |
| v114 | ✅ iPhone Pro/Biz 작동 | buyNonConsumable 수정 (Non-Renewing Subscription용) |
| v113 | ❌ 실패 | buyConsumable → buyNonConsumable 변경 시도 |
| v112 | 🔄 테스트 중 | v107 코드로 롤백 (iPhone 결제 복원 시도) |
| v111 | ❌ iPhone+iPad 안됨 | IAP 상세 로그 추가 (buyConsumable true인데 결제 팝업 안 뜸) |
| v110 | ❌ iPhone+iPad 안됨 | 단계별 스낵바 디버그 (1~6번 true까지 나오고 끝) |
| v109 | ❌ iPhone+iPad 안됨 | Alert 제거, 스낵바로 디버그 표시 |
| v108 | ❌ iPhone+iPad 안됨 | _runJavaScript 헬퍼 추가 (⚠️ iPhone 코드 건드려서 망가짐!) |
| v107 | ✅ iPhone 작동, ❌ iPad 안됨 | iPad 전용 flutter_inappwebview 적용 (JS Channel 부분 성공) |
| v106 | 실패 | Mobile User-Agent 강제 설정 (UA 바뀌었으나 콜백 안됨) |
| v105 | 실패 | Platform.isIOS 체크 제거 |
| v104 | 실패 | async 제거 + alert 디버그 |
| v103 | 실패 | 웹에 디버그 정보 전송 추가 |
| v102 | 실패 | _handleIAPRequest async + await |
| v100 | 빌드됨 | AI 기능 플랜 체크 로직 개선 + 무료 플랜 버튼 숨김 |
| v98 | 빌드됨 | v94 코드로 복원 |
| v94 | iPhone 작동 | restored 구매 무시 추가 |
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

### v108~v113 문제 정리 (2026-01-18 해결됨)

**v108~v111: iPhone+iPad 모두 결제 안됨**
- 원인: `_runJavaScript` 헬퍼 추가로 iPhone 코드 망가짐
- 해결: v112에서 v107 코드로 롤백

**v112~v113: Basic 플랜만 구매 안됨**
- 원인: `buyConsumable()` 사용 (Non-Renewing Subscription에 부적합)
- 해결: v114에서 `buyNonConsumable()` 로 수정

**v114: iPhone Pro/Business 정상, iPad 안됨**
- 원인: iPad WKWebView Desktop Mode에서 JavaScript Channel 콜백 안됨
- 해결: v115에서 iPad용 `flutter_inappwebview` 적용

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

### 🔴 iOS WebView 클릭 이벤트 capture:true 필수! (2026-01-16) - 절대 삭제 금지!

**증상:**
- iOS에서 결제 버튼, 플랜 선택 버튼 등 클릭해도 아무 반응 없음
- Android: 정상 ✅
- **iOS만 문제** ❌

**원인:**
- iOS WKWebView에서 이벤트 버블링이 제대로 작동하지 않는 경우 있음
- document 레벨에서 capture 단계 이벤트 리스너가 있어야 이벤트 전파가 정상화됨

**해결 (index.html - 절대 삭제 금지!):**
```javascript
// ⭐ iOS WebView 클릭 이벤트 전파 보장 (capture:true 필수!)
// 이 코드가 없으면 iOS에서 버튼 클릭이 안 됨
document.addEventListener('click', function(e) {
    // 클릭 이벤트 캡처 단계에서 잡아서 전파 보장
    // 실제 처리는 하지 않음 (버블링에서 처리됨)
}, true);  // ← capture:true 필수!
```

**위치:** `index.html` 상단 `<script>` 태그 내 (Flutter 앱 감지 코드 바로 아래)

**⚠️ 경고:**
- ❌ 이 코드 절대 삭제하지 말 것!
- ❌ 디버그 코드 정리할 때도 이 코드는 유지!
- ✅ 빈 함수처럼 보여도 반드시 필요함

**핵심 교훈:**
- capture:true 이벤트 리스너가 iOS WebView 이벤트 전파를 정상화시킴
- 함수 내용이 비어있어도 리스너 등록 자체가 중요함

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

### iOS 인앱결제 (IAP) 문제들 (2026-01-18 업데이트) - 중요!

**현재 상태: v115 테스트 중**

#### 1. StoreKit 2 JWS 형식 문제 (해결됨)
- **증상**: Apple 영수증 검증 실패 (에러 코드 21002)
- **원인**: iOS 15+에서 영수증이 JWS 형식(eyJ...로 시작)으로 변경됨
- **해결**: `iap-verify.js`에서 JWS 형식 감지 및 디코딩 추가

#### 2. 중복 결제 처리 문제 (해결됨)
- **증상**: 같은 구매가 여러 번 처리되어 토큰 중복 충전
- **원인**: `PurchaseStatus.restored`도 새 구매처럼 처리됨
- **해결**: `iap_service.dart`에서 restored는 무시

#### 3. JWS transactionId 추출 (해결됨)
- **증상**: 같은 트랜잭션이 중복 처리됨
- **원인**: JWS에서 transactionId 추출 안 함 → 랜덤 ID 생성
- **해결**: `iap-verify.js`에서 JWS 트랜잭션 ID 추출

#### 4. ⭐ buyConsumable vs buyNonConsumable (2026-01-18 해결!)

**증상:**
- Basic 플랜: 구매 불가 ❌ (이미 구매한 상품이라고 뜸)
- Pro, Business 플랜: 정상 구매 ✅

**원인:**
- App Store Connect에서 **Non-Renewing Subscription** 타입으로 상품 생성
- `buyConsumable()` 사용하면 Apple이 이미 구매한 상품으로 인식
- Non-Renewing Subscription은 `buyNonConsumable()` 사용해야 함!

**해결 (v114 - iap_service.dart):**
```dart
// ❌ 잘못된 코드
final success = await _iap.buyConsumable(
  purchaseParam: purchaseParam,
  autoConsume: true,
);

// ✅ 올바른 코드 - Non-Renewing Subscription은 buyNonConsumable!
final success = await _iap.buyNonConsumable(
  purchaseParam: purchaseParam,
);
```

**핵심 교훈:**
- ❌ `buyConsumable()`: 소모품 (게임 아이템 등 무한 재구매 가능)
- ✅ `buyNonConsumable()`: 비소모품 + Non-Renewing Subscription
- App Store Connect 상품 타입과 Flutter 구매 메서드 일치시켜야 함!

#### 5. ⭐ iPad JavaScript Channel 문제 (v115에서 해결!)

**증상:**
- **iPhone**: 결제 버튼 정상 작동 ✅
- **iPad**: 결제 버튼 클릭해도 Flutter 콜백 실행 안됨 ❌
- 웹에서 `IAPChannel.postMessage()` 호출은 성공하지만 Flutter가 응답 없음

**원인:**
- iPad는 WKWebView에서 자동으로 Desktop Mode 전환
- `webview_flutter`의 JavaScript Channel이 iPad Desktop Mode에서 콜백 안 됨
- `flutter_inappwebview`는 JavaScript Handler 방식으로 콜백 정상 작동

**해결 (v115 - home_screen.dart):**
```dart
// 1. iPad 감지 (600dp 이상)
if (Platform.isIOS) {
  final shortestSide = MediaQuery.of(context).size.shortestSide;
  _isIPad = shortestSide >= 600;
}

// 2. iPad는 InAppWebView, 그 외는 webview_flutter
if (_isIPad)
  _buildIPadWebView()  // flutter_inappwebview
else
  WebViewWidget(...)   // 기존 webview_flutter (iPhone/Android)

// 3. InAppWebView JavaScript Handler 브릿지 주입
await controller.evaluateJavascript(source: '''
  window.IAPChannel = {
    postMessage: function(msg) {
      window.flutter_inappwebview.callHandler('IAPChannel', msg);
    }
  };
''');
```

**⚠️ 주의: iPhone/Android 코드 건드리지 말 것!**
- iPhone: `webview_flutter` 정상 작동 중
- Android: `webview_flutter` 정상 작동 중
- iPad만 `flutter_inappwebview` 사용

---

### 🔴 TestFlight 중요 정보 (2026-01-18) - 반드시 숙지!

**TestFlight는 App Store Connect 샌드박스 계정을 사용하지 않는다!**

| 환경 | 계정 타입 | 결제 환경 |
|------|----------|----------|
| TestFlight | **일반 Apple ID** | 샌드박스 (자동) |
| Xcode 직접 빌드 | 샌드박스 계정 필요 | 샌드박스 |
| App Store 출시 | 일반 Apple ID | 실제 결제 |

**TestFlight 결제 테스트 방법:**
1. TestFlight에서 앱 설치
2. **일반 Apple ID로 로그인한 상태에서** 결제 테스트
3. 자동으로 샌드박스 환경에서 결제됨 (실제 청구 X)
4. 영수증에 `environment: "Sandbox"` 표시됨

**Non-Consumable/Non-Renewing Subscription 재구매 문제:**
- 같은 Apple ID로 동일 상품 재구매 불가 (이미 구매했다고 뜸)
- **해결**: 새 Apple ID로 테스트 (예: eric708+test2@naver.com)

**공개 TestFlight 링크:**
- https://testflight.apple.com/join/q57ST6h3
- 이메일 초대 없이 누구나 테스트 가능

**테스터 추가 (App Store Connect):**
- App Store Connect → 앱 → TestFlight → 외부 테스팅 → 테스터 추가
- 이메일 초대 또는 공개 링크 사용

---

### 디버그 배너 제거 위치 (2026-01-18)

**빨간색 디버그 배너가 표시되는 경우 제거할 위치:**

1. **index.html** (~line 139-175):
   - `showDebugBanner()` 함수 전체 삭제
   - `handlePlanBtnEvent()` 내 `showDebugBanner()` 호출 삭제

2. **js/main.js** (`selectPlanAndPay` 함수):
   - `var banner = ...` 변수 삭제
   - `banner.xxx = ...` 관련 코드 삭제

3. **js/payment.js** (`requestIOSInAppPurchase` 함수):
   - `var banner = ...` 변수 삭제
   - `banner.xxx = ...` 관련 코드 삭제

**⚠️ 삭제하면 안 되는 코드 (index.html):**
```javascript
// ⭐ iOS WebView 클릭 이벤트 전파 보장 (capture:true 필수!)
document.addEventListener('click', function(e) {
    // 빈 함수처럼 보여도 필수!
}, true);
```

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

### 🔴 RAG 파일 추가 시 반드시 업로드 실행! (2026-01-23 추가)

**rag_data 폴더에 새 파일 추가 시 반드시 RAG Store에 업로드해야 함!**

| 파일 | 업로드 스크립트 |
|------|----------------|
| hair_basic_science.txt | `python scripts/upload-hair-science-to-rag.py` |
| hair_diagram_glossary.txt | `python scripts/upload-glossary-to-rag.py` |
| perm_index_ko.txt, perm_index_en.txt | `python scripts/extract-perm-index-to-rag.py` |
| facial_landmark_algorithm.txt | `python scripts/upload-facial-algorithm-to-rag.py` |
| color_theory_for_rag.txt | `python scripts/upload-color-theory-to-rag.py` |

**실행 방법:**
```bash
cd C:\Users\김민재\Desktop\Hairgator_chatbot
# GEMINI_API_KEY는 .env 파일에서 자동 로드됨
python scripts/upload-hair-science-to-rag.py
```

**⚠️ 주의:**
- 스크립트 만들고 실행 안 하면 RAG 검색에서 해당 내용 못 찾음
- 업로드 후 Store 문서 수 확인 (현재 68개)
- "염색의 원리" 같은 질문에 "찾을 수 없다"고 나오면 RAG 업로드 누락 의심

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

---

## 2026-01-19 작업 내용

### 어드민 1:1 문의 삭제 기능 추가 ✅

- `admin.html`에 삭제 버튼 및 `deleteInquiry()` 함수 추가
- 삭제 전 확인 창 표시
- 커밋: `8dc5e02`

### 공지사항 삭제 기능 - 이미 있음 확인 ✅

- `admin.html` line 7692에 삭제 버튼 이미 존재
- `deleteNotice()` 함수 이미 구현됨

### iOS 인앱결제 환불 정책 확인 ✅

| 상황 | Apple 처리 |
|------|-----------|
| 7일 이내 환불 요청 | 승인 가능 |
| 29일 쓰고 환불 요청 | **거부** |
| 반복 악용 | 계정 제재 |

**결론:** iOS 인앱결제 환불은 Apple이 알아서 처리. 우리가 할 일 없음.

### 마케팅 이메일 발송 대상 문제 분석

**문제:** 어드민 마케팅 이메일에서 6821명 중 2명만 발송 가능으로 표시

**원인:**
- 마이그레이션 시 `isMarketing` 필드 누락
- 몽고DB 덤프에 `isMarketing`, `marketingAgreeDate` 필드 존재

**몽고DB 통계:**
| 항목 | 수 |
|------|---|
| 총 사용자 | 7,505명 |
| 마케팅 동의 (True) | 3,471명 |
| 마케팅 동의 + 이메일 | 3,366명 |

**해결 스크립트:** `scripts/update-marketing-consent.py` (미실행)
- 몽고DB `isMarketing: True` → Firestore `termsAgreement.marketing: true` 업데이트
- 실행 시 3,366명 발송 가능으로 변경됨

### 소개 영상 기획

- **타겟:** 미용사
- **채널:** 인스타그램 릴스 (9:16 세로, 45초)
- **스타일:** 태블릿 목업 + 자막 + BGM
- **스토리보드:** 대화에서 정리됨

### 프로모션 이미지

- **파일:** `C:\Users\김민재\Desktop\hairgator-promo.html`
- **내용:** 1:1 앱 다운로드 유도 이미지 (Play Store, App Store 검색 안내)
- 브라우저에서 열고 스크린샷으로 저장

---

## 2026-01-21 작업 내용

### iPad #products 페이지 클릭 안됨 문제 디버깅 🔄

**증상:**
- iPad 앱에서 #products 페이지(Plan & Billing 탭) 버튼 클릭 전혀 안됨
- 같은 앱에서 스타일 메뉴, 마이페이지 탭은 정상 작동 ✅
- 웹 브라우저에서는 모든 페이지 정상 작동 ✅
- **iPad 앱 #products 페이지만 문제** ❌

**시도한 해결책들:**

#### 1. 디버그 CSS 제거 (실패)
- 이전 디버깅 시 추가한 `position: fixed; z-index: 99999` 제거
- 결과: 클릭 안됨

#### 2. pointer-events 추가 (실패)
- `fixPageScroll()`에서 `pointer-events: auto !important` 추가
- `.page-container` 및 자식 요소에 `pointer-events: auto` CSS 추가
- 결과: 여전히 안됨

#### 3. ontouchend 핸들러 추가 (실패)
- #productsPage 버튼에 `ontouchend` 핸들러 추가 (mypage 버튼처럼)
- 결과: 아무 반응 없음

#### 4. 강제 리플로우 트리거 (실패)
- `void productsPage.offsetHeight` 추가하여 강제 리플로우
- 결과: 웹 변경만으로는 해결 안됨

#### 5. Flutter TapGestureRecognizer 추가 (테스트 중) 🔄
- `home_screen.dart` WebViewWidget gestureRecognizers에 추가:
```dart
Factory<TapGestureRecognizer>(
  () => TapGestureRecognizer(),
),
Factory<LongPressGestureRecognizer>(
  () => LongPressGestureRecognizer(),
),
```
- ⚠️ 주의: v96에서 TapGestureRecognizer가 문제 일으킨 적 있음
- 현재 상황은 다름 (v96은 전체 안됨, 현재는 #products만 안됨)

**수정된 파일:**

| 파일 | 변경 내용 |
|------|----------|
| `index.html` | 디버그 CSS 제거, pointer-events 추가, ontouchend 추가 |
| `js/main.js` | fixPageScroll()에 pointer-events, #products 강제 리플로우 |
| `js/payment.js` | 디버그 alert 제거 |
| `home_screen.dart` | TapGestureRecognizer, LongPressGestureRecognizer 추가 |

### Codemagic 자동 빌드 설정 ✅

- GitHub main 브랜치 push 시 자동으로 iOS 빌드 시작
- `codemagic.yaml` 파일 생성 완료
- TestFlight 자동 업로드 설정

```yaml
triggering:
  events:
    - push
  branch_patterns:
    - pattern: main
      include: true
```

### 내일 할 일

1. **TestFlight 업데이트 확인** - Codemagic 빌드 완료 후
2. **iPad #products 클릭 테스트** - TapGestureRecognizer 적용된 빌드
3. **결과에 따른 조치:**
   - 성공 시: 문제 해결 ✅
   - 실패 시 (v96처럼 전체 안됨): TapGestureRecognizer 제거하고 다른 방법 시도
   - 실패 시 (여전히 #products만 안됨): InAppWebView 쪽 추가 조사 필요
