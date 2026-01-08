# HAIRGATOR 챗봇 - Claude 작업 가이드

## 🚨 현재 앱 버전 (2026-01-08 업데이트)

| 플랫폼 | 스토어 제출 | 최신 빌드 |
|--------|------------|----------|
| **Android** | v73 | v76 (테스트 완료) |
| **iOS** | v76 | v76 |

### 빌드 파일 경로
- **APK**: `D:\hairgator_dev\hairgator_flutter_app\build\app\outputs\flutter-apk\app-release.apk`
- **AAB**: `D:\hairgator_dev\hairgator_flutter_app\build\app\outputs\bundle\release\app-release.aab`

---

## 📋 버전 히스토리

| 버전 | 상태 | 내용 |
|------|------|------|
| v76 | ✅ **현재** | 디버그 버튼/콘솔 UI 제거 |
| v75 | iOS 제출됨 | login.html 리다이렉트 감지 |
| v74 | iOS 제출됨 | WebView 콘솔 로그 캡처 |
| v73 | Android 제출됨 | 네이티브 로그인 약관 동의 |
| v72 | iOS | iOS Keychain 세션 정리 |
| v62 | 레거시 | permission_handler + WebView 권한 |

### ⚠️ v77은 사용하지 않음!
- v77: Flutter에서 스크롤 문제 해결 시도 (VerticalDragGestureRecognizer 변경)
- **결과**: 불필요 - 스크롤 문제는 **웹 코드(menu.js)에서 해결됨**
- v76으로 유지!

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

### 로딩 오버레이 안 사라지는 문제 (2026-01-08)

**증상:** 스타일 매치에서 뒤로가기 → 메뉴판에 로딩 스피너 계속 표시

**원인:** bfcache (back-forward cache)에서 페이지 복원 시 이전 상태 유지

**해결 (index.html):**
```javascript
window.addEventListener('pageshow', function(event) {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
});
loadingOverlay.style.display = 'none'; // 초기화 시에도
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
