# HAIRGATOR 챗봇 - Claude 작업 가이드

## 🚨 재시작 후 해야 할 일 (2026-01-07)

### iOS TestFlight 테스트 진행 중 (v41)

**현재 상태:**
- v41 빌드 GitHub 푸시 완료 (커밋: `088d0ff`)
- Codemagic 빌드 시작 필요

**v41에서 수정한 것 (카카오 앱투앱 로그인 핵심 수정):**
- `KakaoSdk.init()`을 **runApp() 전에** 호출 (이전: initState()에서 호출 → 잘못됨)
- 카카오 문서에 따르면 SDK 초기화는 반드시 runApp() 전에 해야 함
- 이전 방식은 `isKakaoTalkInstalled()`가 항상 false 반환 → 웹 로그인으로 폴백

**v40 테스트 결과:**
- 카카오 로그인: 앱투앱 안 되고 웹 로그인만 표시
- 원인: KakaoSdk.init()이 runApp() 후에 호출됨

**테스트할 것:**
1. 카카오 앱투앱 로그인 - v41에서 SDK 초기화 순서 수정됨
2. Google 로그인 - 이전 빌드에서 정상 동작 확인 필요

**이전 버전 히스토리:**
- v28~v32: 회색/흰 화면 (Firebase.initializeApp() 블로킹 문제)
- v33: 화면 정상, 카카오 SDK 초기화 누락
- v34~v35: Google plist 설정
- v36~v40: 카카오 앱투앱 안 됨 (SDK 초기화 순서 문제)
- v41: **KakaoSdk.init()을 runApp() 전에 호출** ← **현재**

**핵심 수정 내용 (main.dart):**
```dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  KakaoSdk.init(nativeAppKey: '...');  // runApp() 전에 필수!
  runApp(const HairgatorApp());
}
```
- Firebase는 여전히 initState()에서 async 초기화 (iOS 회색화면 방지)

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
