# HAIRGATOR 챗봇 - Claude 작업 가이드

## 🚨 재시작 후 해야 할 일 (2025-12-30)

### 1. 결제 시스템 원격 테스트
- Chrome DevTools MCP 추가됨 (`claude mcp add chrome-devtools`)
- Chrome 디버그 모드 실행 필요:
  ```
  "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="D:\chrome-debug" https://app.hairgator.kr
  ```
- **app.hairgator.kr** 접속 → 로그인 → 결제 테스트 (URL 변경됨!)
- 테스트 카드: `4242424242424242` (유효기간/CVC 아무거나)
- **스냅샷 저장 위치: D드라이브** (C드라이브 용량 없음)
- **스냅샷은 그때그때 삭제** (저장해두지 말 것)

### 2. admin.html 라이트 테마 전환 ✅ 완료
- 라이트 테마로 변경됨

### 3. 서브도메인 마이그레이션 ✅ 완료 (2025-12-30)
- hairgator.kr → 홈페이지
- app.hairgator.kr → 앱 서비스
- 카카오 로그인 Redirect URI 추가 완료
- 네이버 서치어드바이저 등록 완료

---

## ⚠️ 절대 다시 묻지 말 것 (2025-12-28 확정)

### OhMyApp/불나비/MongoDB 완전 독립 완료

**배경:**
- OhMyApp = 불나비 = MongoDB = 같은 서비스 (앱 빌더 플랫폼)
- 이용료 내면서 써왔으나 **비협조적이라 탈출함**
- MongoDB 덤프 받아서 나옴

**현재 상태:**
- ✅ hairgator.kr 웹사이트: **완전 독립 완료** (Firebase Auth + Firestore)
- ❌ OhMyApp 어드민 (drylink.ohmyapp.io): **안 씀**
- ❌ 불나비 앱 (앱스토어): **버림** (OhMyApp 서버 연결되어 있어서 탭 4개 나오는 문제 있음)
- 🔨 새 앱스토어 앱: **Flutter WebView로 새로 만들어야 함** (hairgator.kr 감싸는 방식)

**절대 하지 말 것:**
- "OhMyApp 어드민에서 설정하세요" 같은 말 하지 마
- "불나비 앱 탭 설정" 얘기 꺼내지 마
- "PWA로 하면 어때요?" 제안하지 마
- 이 주제로 다시 질문하지 마

**핵심 답변:** 기존 불나비 앱은 OhMyApp 서버 주소가 앱 안에 하드코딩되어 있어서, 백엔드만 Firebase로 바꿔도 앱이 계속 OhMyApp 서버로 요청 보냄. **기존 앱 재활용 불가능. 새 앱 만들어야 함.**

**목표:** OhMyApp 어드민처럼 hairgator 어드민에서 탭 설정 변경하면 앱에 반영되게 하기
- 새 앱(Flutter)이 **Firestore app_config/tabs**에서 탭 설정 로드
- admin.html에서 탭 설정 변경 → Firestore 업데이트 → 앱에 반영
- 이미 admin.html에 "앱 메뉴 관리" 기능 추가됨 (MongoDB 데이터 가져오기 버튼 포함)

**앱스토어 앱 만들 때:** Flutter 앱이 Firestore에서 탭 설정 읽어서 하단 네비게이션 구성하도록 개발.

---

## 🚫 절대 하면 안 되는 것 (2026-01-05 추가)

### 컬렉션 통일 금지!

**hairstyles ≠ styles 컬렉션은 용도가 완전히 다르다!**

| 컬렉션 | 용도 | diagrams | textRecipe | 문서ID |
|--------|------|:--------:|:----------:|--------|
| `hairstyles` | 메뉴판/목록 | ❌ 없음 | ❌ 없음 | 랜덤 (`13JrTDK...`) |
| `styles` | 레시피/도해도 | ✅ 있음 | ✅ 있음 | 구조화 (`SP0001`) |

**절대 하지 말 것:**
- ❌ `styles` → `hairstyles`로 통일하면 **레시피/도해도 못 가져옴**
- ❌ `hairstyles`에서 `diagrams` 필드 찾으려고 하지 마 (없음!)
- ❌ `hairstyles`에서 `textRecipe` 필드 찾으려고 하지 마 (없음!)

**올바른 데이터 흐름:**
```
1. Vision 매칭 → hairstyles 컬렉션 (스타일 목록)
2. styleCode 추출 (SF, SP, BZ 등)
3. 도해도/레시피 → styles 컬렉션 (styles/SP0001)
```

**styles 컬렉션 현황 (2026-01-05 확인, 총 209개):**
- **여자 커트 70개**: FAL~FHL 시리즈
- **남자 커트 69개**: SF(14), SP(25), FU(7), PB(9), BZ(5), CP(4), MC(5)
- **여자 펌 70개**: FALP(7), FBLP(13), FCLP(6), FDLP(8), FELP(9), FFLP(9), FGLP(9), FHLP(9)
- 모든 문서에 `diagrams`, `textRecipe` 필드 존재

**펌 조회 시 주의:**
- ❌ `hairstyles` 컬렉션에는 펌 스타일 없음!
- ✅ 펌은 반드시 `styles` 컬렉션에서 조회 (`type === 'perm'`)

---

## 🔴 자주 헷갈리는 것들 (Claude 필독!)

### 1. main.js vs menu.js 구분
- **main.js**: 사이드바 메뉴 HTML 동적 생성, 테마 전환, 초기화
- **menu.js**: 메뉴 클릭 액션, 페이지 이동, 토큰 체크
- ⚠️ 사이드바 메뉴 순서/구조 변경 → **main.js** 수정
- ⚠️ 메뉴 클릭 시 동작 변경 → **menu.js** 수정

### 2. 삭제된 파일 (더 이상 없음!)
| 삭제된 파일 | 대체된 파일 |
|------------|------------|
| `js/bullnabi-bridge.js` | `js/firebase-bridge.js` |
| `netlify/functions/bullnabi-proxy.js` | Firestore 직접 접근 |
| `netlify/functions/token-api.js` | `firebase-bridge.js` |
| `js/dynamic-token-service.js` | 삭제됨 (미사용) |

### 3. Firestore 컬렉션명 (정확히!)
| 용도 | 올바른 컬렉션명 | 잘못된 예시 |
|------|----------------|------------|
| 헤어스타일 메뉴판 | `hairstyles` | ~~men_styles~~ |
| 레시피/도해도 | `styles` | - |
| 사용자 | `users` | ~~_users~~ |
| 불나비 마이그레이션 | `bullnabi_users` | - |
| 토큰 로그 | `credit_logs` | - |

### 3-1. hairstyles vs styles 컬렉션 차이 ⚠️ 중요!

**`hairstyles` 컬렉션** (메뉴판용):
- 문서ID: 랜덤 문자열 (예: `13JrTDK2ueypVpvnCPdm`)
- 필드: `gender`, `mainCategory`, `subCategory`, `name`, `imageUrl`, `thumbnailUrl`
- **diagrams 필드 없음!**
- 남자 카테고리: `mainCategory: "SIDE FRINGE"` (코드 아닌 전체 이름)

**`styles` 컬렉션** (레시피/도해도용):
- 문서ID: 구조화된 스타일ID (예: `SF1001`, `FAL0001`)
- 필드: `styleId`, `series`, `gender`, `type`, `diagrams`, `diagramCount`, `textRecipe`
- **diagrams 배열 있음!**
- Firebase Storage 경로: `men_styles/{styleId}/diagrams/` 또는 `styles/{styleId}/diagrams/`

**스타일 코드 → mainCategory 매핑:**
| 코드 | mainCategory |
|------|-------------|
| SF | SIDE FRINGE |
| SP | SIDE PART |
| FU | FRINGE UP |
| PB | PUSHED BACK |
| BZ | BUZZ |
| CP | CROP |
| MC | MOHICAN |

### 4. Firestore 필드값 (대소문자 주의!)
**남자 카테고리 (category):**
- ✅ `SIDE FRINGE`, `SIDE PART`, `FRINGE UP`, `PUSHED BACK`, `BUZZ`, `CROP`, `MOHICAN`
- ❌ ~~Side Fade, Full Up, Push Back~~

**중분류 (subCategory):**
- ✅ `None`, `Fore Head`, `Eye Brow`, `Eye`, `Cheekbone`
- ❌ ~~N, FH, EB, E, CB~~ (축약형 아님!)

### 5. CSS 누락 주의
- 새 모달 만들 때 `.modal-overlay` CSS 있는지 확인
- `display: none` → `display: flex` 전환 시 position/z-index 필요

### 6. 함수 호출 타이밍
- `applyPlanBasedDisabledState()`: setupSidebarMenuListeners() **끝에서 한 번만** 호출
- 여러 번 호출하면 타이밍 문제로 일부 버튼에 적용 안 됨

### 7. 브라우저 캐시
- JS 수정 후 반영 안 되면 → **Ctrl+Shift+R** (하드 리프레시)
- Netlify 배포 후 1-2분 대기 필요

### 8. 경로 문제 (Windows)
- 한글 경로 (`김민재`) 있으면 일부 도구 오류
- Flutter/Gradle은 **D드라이브** 사용 (`D:\hairgator_dev\`)

### 9. RAG 업로드 (Gemini File Search) ⚠️ 중요!
**잘못된 방법 (파일만 업로드, Store에 추가 안 됨):**
```python
# ❌ 이렇게 하면 Files API에만 올라가고 RAG Store에는 안 들어감!
client.files.upload(file=file_path)
```

**올바른 방법 (Store에 직접 업로드):**
```python
# ✅ 방법 1: 직접 업로드
client.file_search_stores.upload_to_file_search_store(
    file=file_path,
    file_search_store_name=STORE_NAME
)

# ✅ 방법 2: 업로드 후 import
uploaded = client.files.upload(file=file_path)
client.file_search_stores.import_file(
    file_search_store_name=STORE_NAME,
    file_name=uploaded.name
)
```

**Store ID**: `fileSearchStores/hairgator-theory-final-2025-kkb6n1ftfbf2`
**참고 스크립트**: `scripts/upload-*-to-rag.py`

### 10. style-match 페이지 vs 메인 서비스 (menu.js) ⚠️ 중요!

**style-match는 독립 페이지!** (iframe 아님, 전체 페이지 이동)
- 메인 서비스: `index.html` + `menu.js` (allStyles 이미 로드됨)
- style-match: `/style-match/index.html` + `app.js` (스타일을 API로 별도 로드)

**기능 복사 시 주의사항:**
| 항목 | 메인 서비스 (menu.js) | style-match (app.js) |
|------|----------------------|---------------------|
| 스타일 데이터 | 페이지 로드 시 이미 있음 | API로 별도 로드 필요 |
| Firebase Storage | `storage` 전역 변수 | SDK 별도 초기화 필요 |
| 헤어체험 사진 | 바로 사용 가능 | sessionStorage로 전달 |

**헤어체험 구현 시 필수 확인:**
1. **vModel API는 HTTP URL만 받음** - base64 `data:image/...` 안 됨
2. **클라이언트에서 Firebase Storage 업로드 먼저** → URL 획득 → API 호출
3. **API 응답 필드명**: `resultImageUrl` (resultImage 아님!)
4. **스타일 로드 타이밍**: `generateRecommendations()` 호출 전 스타일 로드 완료 대기 필요

**메인 서비스에서 복사할 함수들:**
```javascript
// menu.js에서 그대로 가져올 것
uploadCustomerPhotoToStorage(base64Data)  // Firebase Storage 업로드
deleteTemporaryFile(filePath)              // 임시 파일 삭제
pollHairChangeStatus(taskId, gender)       // 상태 폴링
```

**절대 하지 말 것:**
- ❌ 메인 서비스 코드 안 보고 직접 구현
- ❌ API 응답 필드명 추측
- ❌ 서버 측에서 해결하려고 시도 (클라이언트 업로드가 정답)

### 11. kakao_flutter_sdk_user 버전 ⚠️ 절대 다운그레이드 금지!

**반드시 1.10.0 이상 사용!** (1.9.x는 iPad 크래시 버그 있음)

| 버전 | 상태 | 비고 |
|------|------|------|
| **1.10.0+** | ✅ 사용 | iPad 크래시 수정됨 |
| 1.9.7+3 | ❌ 금지 | iPad에서 앱 시작 시 크래시 |
| 1.9.x | ❌ 금지 | SwiftKakaoFlutterSdkPlugin.register 크래시 |

**Dart SDK 호환성 문제 시:**
- ❌ kakao SDK 다운그레이드 (iPad 크래시 발생)
- ✅ Dart/Flutter SDK 업그레이드 (올바른 해결책)

**현재 요구사항:**
- `kakao_flutter_sdk_user: ^1.10.0` → Dart SDK ^3.6.0 필요
- Flutter 3.38.5 이상 권장

---

## Google Play Console 계정 (앱 출시용)
- **이메일**: drylink.info@gmail.com
- **비밀번호**: alswo1206!@
- **URL**: https://play.google.com/console

---

## 앱스토어 배포 정보 (2025-12-29)

### 공통 정보
- **앱 이름**: HAIRGATOR (헤어게이터)
- **Bundle ID / Package Name**: `com.hairgator`
- **GitHub 저장소**: https://github.com/kimminjae413/hairgator-flutter-app

### Android (Google Play)
- **패키지명**: `com.hairgator`
- **상태**: 심사 제출 완료 (2025-12-29)
- **키스토어**: `upload-keystore.jks`
  - storePassword: `hairgator2025`
  - keyPassword: `hairgator2025`
  - keyAlias: `upload`
- **google-services.json**: Firebase 프로젝트 `hairgatormenu-4a43e` 연결
- **개인정보처리방침**: https://hairgator.kr/privacy-policy.html
- **계정삭제**: https://hairgator.kr/delete-account.html

### iOS (App Store) - Codemagic CI/CD 사용
- **Bundle ID**: `com.hairgator`
- **App ID**: 6751260003
- **빌드 서비스**: Codemagic (https://codemagic.io)
  - 무료 플랜 (월 500분 빌드)
  - macOS M2 인스턴스 사용
- **App Store Connect API Key**:
  - Key Name: `Codemagic`
  - Key ID: `2VF386FHLB`
  - .p8 파일: Codemagic에 업로드됨
- **Apple Developer Account**:
  - 계정: Min Jae Kim / AIW
  - 만료일: 2026년 3월
- **상태**: ✅ 심사 제출 완료 (2025-12-29, 빌드 3)
- **TestFlight 테스트 정보**: https://appstoreconnect.apple.com/apps/6751260003/testflight/test-info

### App Store 심사용 테스트 계정
- **이메일**: `appstore-review@hairgator.kr`
- **비밀번호**: `Review2025!`
- **토큰**: 50,000
- **플랜**: Business
- **Firestore 문서**: `users/appstore-review_hairgator_kr`

### Codemagic 설정
- **Workflow**: Default Workflow
- **플랫폼**: Android + iOS 둘 다 체크
- **iOS Code Signing**: Automatic
- **Provisioning Profile**: App Store (배포용)
- **App Store Connect Publishing**: 활성화 (TestFlight 자동 업로드)

---

## Flutter 앱 빌드 (2025-12-29 D드라이브 이전)

### 현재 상태 (2025-12-29 빌드 완료)
- ✅ **App Bundle 빌드 성공**: `D:\hairgator_dev\...\app-release.aab` (24.9MB) - Play Store 제출용
- ✅ **APK 빌드 성공**: `D:\hairgator_dev\...\app-release.apk` (24.2MB) - 테스트용
- ✅ **서명 키 생성 완료**: `upload-keystore.jks` (비밀번호: hairgator2025)
- ✅ **D드라이브 이전 완료**: C드라이브 18GB+ 확보
- ⏳ **Play Store 심사 제출 대기**

### 키스토어 정보 (중요! 백업 필수!)
- **파일**: `D:\hairgator_dev\hairgator_flutter_app\android\app\upload-keystore.jks`
- **storePassword**: hairgator2025
- **keyPassword**: hairgator2025
- **keyAlias**: upload
- **유효기간**: 10,000일 (~27년)
- ⚠️ **이 파일 분실하면 앱 업데이트 불가!** 반드시 클라우드에 백업

### 디스크 공간 정리 기록 (2025-12-29)
- Flutter/Android SDK D드라이브 이전: **12.5GB 확보**
- 현재 C드라이브 여유 공간: ~18GB

### 프로젝트 경로 (2025-12-29 D드라이브로 이전 완료)
- **Flutter 프로젝트**: `D:\hairgator_dev\hairgator_flutter_app\`
- **Flutter SDK**: `D:\hairgator_dev\flutter\`
- **Android SDK**: `D:\hairgator_dev\Android\Sdk\`
- **Gradle 캐시**: `D:\hairgator_dev\gradle_home\`
- **Pub 캐시**: `D:\hairgator_dev\pub_cache\` (한글 경로 문제 해결용)

### 빌드 명령어 (D드라이브 경로)
```bash
export GRADLE_USER_HOME="D:/hairgator_dev/gradle_home"
export PUB_CACHE="D:/hairgator_dev/pub_cache"
export JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"
export JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8"
cd /d/hairgator_dev/hairgator_flutter_app
D:/hairgator_dev/flutter/bin/flutter.bat build apk --release
```

### 버전 정보 (호환성 문제 해결됨)
- Flutter: 3.24.5
- Gradle: 8.5 (`gradle-wrapper.properties`)
- Android Gradle Plugin: 8.3.0 (`settings.gradle`)
- Kotlin: 1.9.22
- Java: 17 (targetCompatibility)
- NDK: 25.1.8937393
- compileSdk: 34

### 주요 파일 구조
```
C:\hairgator_flutter_app\
├── lib\
│   ├── main.dart              # 앱 진입점
│   ├── models\
│   │   └── tab_config.dart    # 탭 설정 모델
│   ├── screens\
│   │   └── home_screen.dart   # WebView + 하단 탭
│   └── services\
│       └── firestore_service.dart  # Firestore 탭 설정 로드
├── android\
│   ├── app\build.gradle       # NDK, Java 버전 설정
│   ├── settings.gradle        # AGP, Kotlin 버전 설정
│   └── gradle\wrapper\gradle-wrapper.properties  # Gradle 버전
└── pubspec.yaml               # 의존성 (webview_flutter, firebase_core, cloud_firestore)
```

### 다음 단계
1. **Firebase 설정**: Firebase Console에서 Android 앱 등록 → `google-services.json` 다운로드 → `android/app/` 폴더에 배치
2. **테스트**: APK 파일을 핸드폰에 설치하여 테스트
3. **서명 키 생성**: 릴리스용 keystore 생성
4. **App Bundle 빌드**: `flutter build appbundle --release`
5. **Play Store 심사 제출**

### 트러블슈팅 기록 (다시 겪지 않도록)
- **한글 경로 문제**: 사용자명(김민재)에 한글 → Flutter SDK, 프로젝트, Gradle 캐시 모두 C:\ 루트로 이동
- **Developer Mode 필수**: Windows 설정 → 시스템 → 개발자용 → 개발자 모드 켜기
- **Java 21 호환성**: AGP 8.3.0 이상 + Gradle 8.5 이상 필요
- **디스크 공간**: 최소 2-3GB 필요 (빌드 시 캐시 생성)

---

## 핵심 아키텍처 (절대 잊지 말 것!)

### RAG 시스템
- **Gemini File Search API** 사용
- Store ID: `fileSearchStores/hairgator-theory-final-2025-kkb6n1ftfbf2`
- **57개 문서**, 524MB (영구 저장됨)
- 업로드된 자료:
  - 이론 PDF 38개
  - 펌 레시피 자막 4개
  - 커트 레시피 자막 1개(138개 병합)
  - **헤어 용어 사전(hair_diagram_glossary.txt)**: 도해도 기호, 두상 포인트, 커트 테크닉, 펌/염색 용어
  - **기초학 개론(hair_basic_science.txt)**: 모발학, 케미컬, 두피학, 색채학, 소독학
  - **헤어케어 제품 가이드(hair_care_products_guide.txt)**: 트리트먼트/린스/컨디셔너 차이, 카티온 계면활성제 작용, FAQ (2025-12-19 추가)
  - **펌 인덱스 텍스트(perm_index_ko.txt)**: 46개 펌 인덱스 이미지에서 Gemini Vision으로 추출 (2025-12-22 추가)
    - 다이어그램/표/화살표 의미까지 해석한 상세 텍스트
    - 복구펌, 연화법, 환원/산화 시스템, 로드/와인딩 기법 등 펌 이론 전반
  - **헤어스타일 카테고리 가이드(hairstyle-category-guide.md)**: 대분류/중분류 체계 정리 (2025-12-26 추가)
    - 여자: A~H Length (신체 부위 기준), 남자: SF/SP/FU/PB/BZ/CR/MH (스타일 기준)
    - 중분류: N/FH/EB/E/CB (앞머리 길이)
  - **얼굴형 분석 알고리즘(facial_landmark_algorithm.txt)**: MediaPipe/Dlib 기반 헤어 추천 v1.0 (2025-12-26 추가)
    - 수직/가로 비율 계산, 얼굴형별 추천/회피 카테고리 매칭 테이블
    - 스코어링 시스템 (+50/-50 가감 로직)
  - **헤어스타일 추천 원리(hairstyle_recommendation_principles.txt)**: AI 추천 엔진 로직 총정리 (2025-12-31 추가)
    - 얼굴형 분석 임계값: 긴 얼굴(0.36), 짧은 얼굴(0.28), 사각턱(1.15)
    - 카테고리별 점수 테이블 (여자 A~H Length, 남자 SF/SP/FU/PB/BZ/CR/MH)
    - 점수 구간별 멘트 생성 원리 (80+/41-79/0-40)
  - **연화 테스트 이론(softening_test_theory.txt)**: 펌 연화 판정 이론 (2026-01-01 추가)
    - 모발 4대 결합: 펩타이드, 다이설파이드(-S-S-), 수소, 이온(염) 결합
    - 환원 화학: 티오글리콜산, 시스테아민, pH/온도/시간 상호작용
    - 연화 테스트 3종류: 당겨보기, 접어보기, 밀기/문지르기
    - 모발 상태별 연화 전략: 건강모, 손상모, 탈색모

### Firestore
- 컬렉션: `theory_indexes` - 키워드 매칭 + 이미지 URL 저장 (커트 164개 + 펌 46개 = 210개)
- 컬렉션: `styles` - 레시피 도해도 이미지
- 컬렉션: `recipe_samples` - 벡터 검색용 레시피
- 컬렉션: `credit_logs` - 크레딧 사용 로그 (2025-12-22 추가)

### theory_indexes 구조 (헷갈리기 쉬움!)
```javascript
// 올바른 구조 (커트/펌 인덱스 공통)
{
  term: "Zone",
  category: "perm" | "기초 이론" | "커팅 시스템" | ...,
  images: {
    ko: "https://storage.googleapis.com/.../ko/Zone_kor.png",
    en: "https://storage.googleapis.com/.../en/Zone.png",
    ja: "...",
    zh: "...",
    vi: "..."
  },
  keywords: ["zone", "존", ...]
}
```
- **images 객체**: 언어별 이미지 URL을 하나의 객체에 저장
- **잘못된 구조**: `imageUrl` + `lang` 별도 필드로 언어별 문서 분리 → 병합 필요

### 주요 파일
- `netlify/functions/chatbot-api.js` - 메인 API (354KB, 매우 큼)
- `netlify/functions/lib/schemas.js` - 2WAY CUT 스키마

### 펌 레시피 시스템 (2025-12-16 추가)

#### 현재 상태
- **70개 여자 펌 레시피** Firestore `styles` 컬렉션에 저장 완료 (2025-12-16 추가분 11개 반영)
- **커트-펌 매칭**: FAL0001 ↔ FALP0001 (P 추가로 매칭)
- **모든 커트-펌 매칭 완료**: 69개 커트에 모두 매칭되는 펌 레시피 존재

#### 시리즈별 현황
| 시리즈 | 펌 개수 | 커트 개수 | 비고 |
|--------|---------|-----------|------|
| FALP | 7개 | FAL 6개 | 완료 (+1 추가) |
| FBLP | 14개 | FBL 11개 | 완료 (+3 추가) |
| FCLP | 6개 | FCL 11개 | 완료 |
| FDLP | 8개 | FDL 11개 | 완료 (+2 추가) |
| FELP | 9개 | FEL 11개 | 완료 (+1 추가) |
| FFLP | 9개 | FFL 10개 | 완료 (+1 추가) |
| FGLP | 10개 | FGL 10개 | 완료 (+3 추가) |
| FHLP | 9개 | FHL 9개 | 완료 |

#### Firestore 펌 레시피 구조
```javascript
{
  styleId: "FALP0001",
  series: "FALP",
  seriesName: "A Length Perm",
  gender: "female",
  type: "perm",  // ⭐ 펌/커트 구분 (필수!)
  matchingCutStyle: "FAL0001",  // ⭐ 매칭되는 커트 스타일
  diagrams: [{step: 1, url: "..."}, ...],
  diagramCount: 100,
  textRecipe: "연화 후 사이드 부분은...",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 도해도 파일명 패턴 (2가지 지원)
1. `{styleId}_001.png` 형식: FALP0001_001.png (FALP 시리즈)
2. `001.png` 형식: 순수 숫자 3자리 (FELP, FCLP 등)

#### 업로드 스크립트
- **경로**: `scripts/upload-perm-recipes.py`
- **원본 폴더**: `C:\Users\김민재\Desktop\2. 헤어게이터_이론-20251105T045428Z-1-001\women_perm_recipe\`
- **자막 추출**: `scripts/extract-perm-captions.py` (Gemini Vision API)

#### 서버 처리 흐름 (chatbot-api.js)
1. 클라이언트에서 `service: 'perm'` 파라미터 전송
2. 시리즈 코드 변환: `F${lengthCode}L` → `F${lengthCode}LP` (예: FEL → FELP)
3. Firestore 조회 시 `type === 'perm'` 필터 적용
4. `formatPermRecipe()` 함수로 텍스트 전처리:
   - "상세설명 텍스트" OCR 아티팩트 제거
   - Zone별 섹션 헤더 자동 생성
   - 천체축/다이렉션/프레스 키워드 강조

#### 주의사항
- `getFirestoreStyles()` 함수에서 `type` 필드 반드시 포함해야 펌 필터링 가능
- 도해도 없는 펌 레시피도 textRecipe(자막)는 모두 있음
- 남자 펌 레시피는 아직 미지원

#### 원본 데이터 오류 (수정 필요)
- **FBLP2001 폴더**: 도해도 파일이 `FBLP2003_xxx.png`로 잘못 명명됨 → `FBLP2001_xxx.png`로 수정 후 재업로드 필요

#### 도해도 파일명 패턴 (3가지 지원)
1. `{styleId}_001.png` - FALP0001_001.png
2. `{styleId}_001 – 1.png` - FBLP0001_001 – 1.png (공백+대시+공백+숫자 접미사)
3. `001.png` - 순수 숫자 3자리 (FELP, FCLP 등)

## 금지 사항

### 시스템 프롬프트에서
- 스타일/포뮬러 코드 금지: `FAL0001`, `H1SQ_DB1_V6`
- 섹션 조합 코드 금지: `DBS NO.2`, `VS NO.6`
- 시스템명 금지: `CHRISKI`, `2WAY CUT 시스템`

### 허용 사항
- 기술 용어 허용: `D0~D8`, `L0~L8`, `Zone`, `Section`

### 마크다운 서식
- 채팅 응답: `**`, `###`, `-` 리스트 금지, 일반 텍스트만
- 레시피 상세가이드: 마크다운 포맷 허용 (의도적)

## 이미지 매칭 로직
- `detectTheoryImageForQuery()` 함수
- 2글자 이하 키워드 무시
- 제외 키워드: `가로`, `세로`, `수평`, `수직`, `대각`, `방향`, `각도` 등

## 배포
- GitHub: `kimminjae413/hairgator-menu-final`
- Netlify: 자동 배포 (push하면 1-2분 후 적용)

## 다국어 지원 (7개국어)
- 지원 언어: 한국어(ko), 영어(en), 일본어(ja), 중국어(zh), 베트남어(vi), 인도네시아어(id), 스페인어(es)
- `detectLanguage()` 함수: 사용자 입력 언어 자동 감지 (fallback용)
- **클라이언트 language 파라미터 우선**: ai-studio.js에서 `localStorage.getItem('hairgator_language')` 값을 서버로 전송 → 서버에서 우선 사용 (ko→korean 매핑)
- `buildGeminiSystemPrompt()`: 각 언어별 전체 시스템 프롬프트 존재
- 인사말/보안 응답 메시지: 7개국어 전체 지원
- 인사말 키워드: 안녕, hello, こんにちは, 你好, xin chào, halo, hola 등

### 다국어 수정 시 필수 작업 순서
1. **js/i18n.js** - 번역 키 추가 (7개국어 모두 동일한 키 추가 필수)
   - 구조: `HAIRGATOR_I18N.{lang}.personalColor.personalAnalysis.{키}`
   - 언어별 위치: ko(~600라인), en(~1200라인), ja(~1800라인), zh(~2400라인), vi(~3000라인), id(~3600라인), es(~4200라인)
2. **HTML 파일** - `data-i18n` 또는 `data-i18n-html` 속성 추가
   - 텍스트: `data-i18n="personalColor.personalAnalysis.키"`
   - HTML 포함: `data-i18n-html="personalColor.personalAnalysis.키"`
3. **app.js (동적 생성 텍스트)** - `t()` 함수 사용
   - 예: `t('personalColor.personalAnalysis.labelHeight') || 'Height'`
   - fallback 값 필수 지정
4. **문법 검사 필수**: `node -c js/i18n.js && node -c personal-color/app.js`
5. **주의사항**:
   - 템플릿 리터럴(`${...}`)을 일반 문자열('')안에 넣지 말 것
   - i18n.js에서 섹션 추가 시 앞 섹션 끝에 콤마(,) 확인
   - 한 언어만 추가하면 안됨 - 반드시 7개국어 모두 추가

## scripts 폴더 (로컬 전용, .gitignore됨)
- `upload-all-to-file-search.py`: Gemini File Search Store에 PDF 업로드
- `upload-color-theory.py`: 컬러 이론 이미지 분석 후 Firestore 저장
- `extract-personal-analysis-text.py`: 퍼스널 분석 이미지 텍스트 추출
- `upload-personal-analysis-image.py`: Firebase Storage에 이미지 업로드
- `merge-cut-captions.py`: 커트 자막 138개 병합 (여자 69 + 남자 69)
- `upload-cut-captions-to-rag.py`: 병합된 커트 자막을 RAG Store에 업로드
- `upload-perm-indexes.py`: 펌 인덱스 이미지 Firebase Storage 업로드 + Firestore 저장
- `fix-perm-index-merge.py`: 펌 인덱스 언어별 문서를 하나로 병합
- `format-perm-recipes.py`: 펌 레시피 자막 텍스트 Zone별 문단 정리 → Firestore 업데이트
- `upload-perm-thumbnails.py`: 펌 도해도 300px 썸네일 변환 후 Firebase Storage 덮어쓰기
- `extract-perm-captions-additional.py`: 추가분 11개 펌 레시피 자막 추출 (Gemini Vision)
- `upload-perm-recipes-additional.py`: 추가분 펌 레시피 Firebase Storage + Firestore 업로드
- `upload-perm-thumbnails-additional.py`: 추가분 펌 도해도 썸네일 변환
- `upload-hair-care-guide.py`: 헤어케어 제품 가이드 RAG 업로드 (트리트먼트/린스/컨디셔너)

## 크리스마스 효과 (간소화됨 - 2025-12-14)

### 현재 상태: 눈내리기만 유지
- 다크모드에서만 눈내리기 효과 표시
- 라이트모드에서는 효과 없음
- **제거된 효과들**: 트리, 선물, 메리크리스마스 텍스트, 발자국, 눈사람, 버튼 눈쌓임

### 핵심 함수
- `createSnowflakes()`: 눈내리기 효과 (main.js)
- `snowflakeInterval`: 전역 변수로 인터벌 관리

### 조건
- `isGenderSelectionVisible()`: 성별 선택 화면에서만 표시
- `document.body.classList.contains('light-theme')`: 다크모드 체크

## OhMyApp (불나비 앱 관리자) 사용법

### 접속 정보
- **URL**: https://drylink.ohmyapp.io/
- **주요 메뉴**: 운영 모드, 메뉴 설정, 앱 설정, 로직 설정, 옵션 설정, 환경 설정

### 로직 설정 (eventflowSettings)
결제 완료 후 DB 업데이트 등 자동화 로직을 설정하는 곳

**로직 구조:**
```
If When: [이벤트명] (예: ticketCount - 결제 완료 이벤트)
Where: [데이터 소스] (예: ticketCount)
Condition: [조건] (예: productCategory == "plan")
Then: [동작] (예: 기존 데이터를 수정)
  - 컬렉션 명: _users
  - 검색 조건: _id = userDoc._id
  - 수정하려는 양: tokenBalance += tokenCount
```

**MUI Autocomplete 입력 팁:**
- 커스텀 값 입력 시 텍스트박스에 직접 타이핑 후 Enter
- "choose" 또는 "Entry" 옵션이 나타나면 클릭하여 선택
- 값이 안 들어가면 한 글자씩 타이핑 후 50ms 대기

### 옵션 설정 (codeSettings)
드롭다운 선택지 등 코드 옵션을 관리하는 곳

**상품 분류 (productCategory) 옵션:**
- `content`: 컨텐츠 생성권 (AI횟수권) → remainCount 증가
- `plan`: 플랜 (헤어게이터 토큰) → tokenBalance 증가

### 제품 내역 (AI, 상권 탭)
앱 내 판매 상품을 등록/관리하는 곳

**상품 등록 시 필수 필드:**
- 상품 분류: content 또는 plan 선택
- 횟수: 토큰 수량 (예: 10000, 18000, 25000)
- 상품 가격: 원화 금액
- 상품 안내: 상품 설명

### 현재 설정된 로직

**[주문] 결제 후 횟수권 증가** (기존)
- 조건: `productCategory == "content"`
- 동작: `_users.remainCount += contentCount`

**[주문] 결제 후 토큰 충전 (플랜)** (2025-12-24 추가)
- 조건: `productCategory == "plan"`
- 동작: `_users.tokenBalance += tokenCount`

## 불나비 → 헤어게이터 완전 독립 마이그레이션 (2025-12-28 완료)

### 배경
- **드라이링크 앱** (일반인용) → registerType = "user"
- **드라이링크 포 디자이너 앱** (헤어디자이너용) → registerType = "designer" → **헤어게이터로 변경**
- 불나비 앱 종속에서 완전히 독립된 웹앱으로 전환

### 불나비 DB 현황 (MongoDB 덤프: C:\Users\김민재\Desktop\bullnabi)
- 총 사용자: 7,505명
- 디자이너 (registerType=designer): 3,000명+ → `bullnabi_users` 컬렉션에 마이그레이션 완료
- 헤어게이터 실사용자 (tokenBalance/plan 있음): 12명
- 소셜 로그인: 카카오 80%, 구글 12%, 애플 8%

### 마이그레이션 작업 완료 목록
1. ✅ Firebase Auth 로그인 (카카오/구글/이메일)
2. ✅ 이메일 기반 사용자 통합 (`users` 컬렉션)
3. ✅ `bullnabi_users` 컬렉션에 디자이너 3000명+ 마이그레이션
4. ✅ bullnabi-proxy.js → Firestore 직접 접근으로 전환
5. ✅ 결제 시스템 독립 (포트원 + Firestore 직접 연동)
6. ⏳ 마이페이지 완성

### 삭제된 레거시 파일
- `js/bullnabi-bridge.js` (1,348줄) → `js/firebase-bridge.js`로 대체
- `js/dynamic-token-service.js` → 미사용, 삭제
- `netlify/functions/bullnabi-proxy.js` (1,498줄) → Firestore 직접 접근으로 대체
- `netlify/functions/token-api.js` (334줄) → DEPRECATED, 삭제

### 호환성 유지 레이어
- `window.BullnabiBridge` → `window.FirebaseBridge` 별칭 제공
- `window.getBullnabiUser()` → Firebase 사용자 정보를 불나비 형식으로 반환
- localStorage `firebase_user` → 사용자 정보 캐싱

### Firestore 컬렉션 구조

#### `users` 컬렉션 (이메일 기반 문서 ID)
```javascript
{
  // 문서 ID: "708eric_hanmail_net" (이메일 sanitize)
  email: "708eric@hanmail.net",
  name: "김민재",
  phone: "01052592709",
  displayName: "김민재",
  photoURL: "https://...",

  // 인증 정보
  linkedProviders: {
    kakao: { uid: "kakao_4556280939", kakaoId: 4556280939, linkedAt: Timestamp },
    google: { uid: "firebase_uid", linkedAt: Timestamp }
  },
  primaryProvider: "kakao",

  // 헤어게이터 데이터
  tokenBalance: 8020,
  plan: "basic",  // free, basic, pro, business

  // 설정
  language: "ko",
  isMarketing: true,
  servicePush: true,

  // 메타
  createdAt: Timestamp,
  lastLoginAt: Timestamp,
  migratedFromBullnabi: true,
  bullnabiUserId: "691ceee09d868b5736d22007"
}
```

#### `bullnabi_users` 컬렉션 (마이그레이션용, 읽기 전용)
- 불나비에서 마이그레이션한 디자이너 원본 데이터
- 로그인 시 이메일 매칭으로 `users`로 복사

## 최근 작업 이력
- 2026-01-05: 남자 스타일 도해도 표시 안됨 버그 수정

  ### 문제
  - 남자 스타일 분석 시 "도해도가 없습니다" 표시
  - API 로그: `🎯 SF 스타일: 전체 0개, 대표이미지 0개`

  ### 원인 (⚠️ 컬렉션 구조 혼동)
  - `hairstyles` 컬렉션: 메뉴판용, **diagrams 필드 없음**, styleId가 랜덤 문자열
  - `styles` 컬렉션: 레시피/도해도용, **diagrams 있음**, styleId가 구조화된 코드
  - API가 `hairstyles`에서 diagrams를 찾으려 함 → 당연히 없음

  ### 해결책
  1. Firebase Storage `men_styles/` 폴더 → Firestore `styles` 컬렉션에 69개 남자 도해도 동기화
  2. API에서 `styles` 컬렉션에서 도해도 조회하도록 수정
  3. 스타일 코드 → mainCategory 매핑 추가 (SF → SIDE FRINGE 등)
  4. resultImage fallback: imageUrl, thumbnailUrl 순차 확인

  ### 수정된 파일
  - `netlify/functions/chatbot-api.js`: analyzeAndMatchMaleRecipe, regenerateMaleRecipeWithStyle
  - `scripts/sync-male-diagrams.js`: Storage → Firestore 동기화 스크립트

  ### 교훈
  - 컬렉션 구조 확인 철저히 할 것
  - `hairstyles`에는 diagrams 없음 (메뉴판 전용)
  - `styles`에 diagrams 있음 (레시피/도해도 전용)

- 2026-01-05: 플랜 만료 이메일 알림 시스템 구현

  ### 구현 내용
  - **SendGrid 연동**: `@sendgrid/mail` 패키지 추가
  - **이메일 발송 함수**: `sendExpirationEmail()` - 만료 7일/3일/1일 전 + 만료 시
  - **HTML 이메일 템플릿**: 반응형 디자인, 긴급도별 색상 구분
  - **통계 추가**: `emailsSent`, `emailsFailed` 카운트

  ### 이메일 유형
  | 시점 | 제목 | 색상 |
  |------|------|------|
  | 7일 전 | 플랜 갱신 안내 | 보라색 (기본) |
  | 3일 전 | 플랜 만료 예정 | 주황색 |
  | 1일 전 | ⚠️ 플랜이 내일 만료됩니다! | 빨간색 |
  | 만료 | 플랜이 만료되었습니다 | 빨간색 |

  ### 환경변수 ✅ 설정 완료
  - `SENDGRID_API_KEY`: Netlify에 추가됨
  - `SENDGRID_FROM_EMAIL`: `noreply@hairgator.kr`
  - 가비아 DNS 도메인 인증 완료

  ### 수정된 파일
  - `package.json`: @sendgrid/mail 의존성 추가
  - `netlify/functions/check-plan-expiration.js`: 이메일 발송 코드 활성화
  - `CLAUDE.md`: SendGrid 설정 가이드 추가

- 2026-01-05: iOS App Store 거부 해결 - iPad 크래시 수정

  ### 거부 사유
  - **문제**: iPad Air (M3, iPadOS 26.2)에서 앱 시작 시 크래시
  - **에러**: EXC_BAD_ACCESS (SIGSEGV) at swift_getObjectType
  - **크래시 위치**: `SwiftKakaoFlutterSdkPlugin.register(with:)` → Dart 코드 실행 전 네이티브 레벨 크래시

  ### 근본 원인 (⚠️ 중요!)
  - **kakao_flutter_sdk_user 1.9.7+3**에 iPad 크래시 버그 있음
  - **1.10.0**에서 수정됨 (pubspec.yaml 주석에 "iPad 크래시 수정"이라고 적혀있었음)
  - **2026-01-04에 1.10.0 → 1.9.7+3 다운그레이드**한 것이 원인
    - 당시 이유: Dart SDK 3.5.4와 호환성 문제
    - **실수**: 1.10.0이 iPad 크래시 수정 버전인지 확인하지 않고 다운그레이드

  ### 해결책
  - **Dart SDK 업그레이드**: ^3.5.4 → ^3.6.0
  - **Flutter SDK 업그레이드**: 3.24.5 → 3.38.5
  - **kakao_flutter_sdk_user**: 1.10.0 정상 설치 가능
  - **버전**: 1.0.0+12

  ### 교훈 (다시는 반복하지 말 것!)
  - ❌ SDK 다운그레이드 시 해당 버전의 버그 히스토리 확인 필수
  - ❌ pubspec.yaml 주석("iPad 크래시 수정")을 무시하지 말 것
  - ✅ 호환성 문제는 SDK 버전 올려서 해결 (다운그레이드 X)

  ### 수정된 파일
  - `pubspec.yaml`: sdk ^3.6.0, version 1.0.0+12
  - `lib/main.dart`: Kakao SDK 초기화 try-catch 추가
  - `pubspec.lock`: 의존성 업데이트

  ### 커밋
  - `5f8be0e`: fix: iPad 크래시 수정 - Dart SDK 3.6.0 + kakao_flutter_sdk_user 1.10.0

- 2026-01-04: Google Play 데이터 보안 거부 해결 + 키스토어 재설정

  ### Google Play 거부 사유
  - **문제**: 데이터 보안 양식에 "위치 정보 수집 안 함" 선언했으나, 앱에서 위치 권한 감지됨
  - **원인**: Firebase SDK가 자동으로 위치 권한 추가
  - **해결**: AndroidManifest.xml에 위치 권한 명시적 제거
    ```xml
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" tools:node="remove" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" tools:node="remove" />
    ```

  ### Flutter 빌드 문제 해결
  - **kakao SDK 다운그레이드**: `^1.10.0` → `^1.9.7+3` (Dart SDK 3.5.4 호환)
  - **minSdk 변경**: 21 → 23 (Firebase Auth 요구사항)
  - **빌드 성공**: `app-release.aab` (25.1MB), 버전 1.0.0+11

  ### 키스토어 문제 (⚠️ 중요)
  - **현상**: 새 AAB 업로드 시 "잘못된 키로 서명됨" 에러
  - **원인**: 원본 키스토어 분실 (현재 키와 SHA1 불일치)
  - **현재 키**: `EC:F0:E4:72:49:06:DB:83:D9:CB:86:E2:14:AA:B7:F7:05:80:FB:79`
  - **Google 요구 키**: `F9:47:09:51:86:90:D3:67:1F:0B:28:42:FE:14:42:79:F9:96:83:3D`
  - **조치**: Google Play Console에서 "업로드 키 재설정 요청" 제출 완료
  - **대기 중**: Google 승인 (1~3 영업일 예상)
  - **승인 후**: 현재 `upload-keystore.jks`로 서명한 AAB 업로드 가능

  ### 수정된 파일
  - `android/app/src/main/AndroidManifest.xml`: 위치 권한 제거
  - `android/app/build.gradle`: minSdk 21 → 23
  - `pubspec.yaml`: kakao_flutter_sdk_user 1.10.0 → 1.9.7+3, version 1.0.0+11

- 2026-01-03: ESLint 경고 정리

  ### ESLint 경고 202개 → 0개 수정
  - **미사용 catch 변수**: `catch (e)` → `catch (_e)` 변환 (29개)
  - **미사용 함수 인자**: `_` 접두사 추가 (32개, 예: `lang` → `_lang`)
  - **HTML onclick 핸들러**: 파일별 `eslint-disable no-unused-vars` 주석 추가
  - **이모지 regex**: `u` 플래그 + `eslint-disable-next-line` 추가

  ### 수정된 파일 (26개)
  - `js/`: ai-studio.js, auth.js, dynamic-layout.js, firebase-bridge.js, firebase-config.js, i18n.js, main.js, menu.js, password-recovery.js, payment.js, personal-color.js, tablet-touch-handler.js
  - `netlify/functions/`: chatbot-api.js, cleanup-old-images.js, identity-verify.js, kakao-callback.js, kakao-token.js, lookbook-analyze.js
  - `netlify/functions/lib/`: embedding.js, female-recipe.js, male-recipe.js, schemas.js, utils.js, vision-analyzer.js
  - `personal-color/app.js`, `style-match/app.js`

- 2026-01-02: 토큰 시스템 + 스타일매칭 헤어체험 + Google Play 심사

  ### 스타일매칭 페이지 헤어체험 인라인 실행
  - **이전**: 체험하기 클릭 → 메인 페이지로 이동
  - **현재**: 스타일매칭 페이지에서 바로 API 호출 → 결과 모달 표시
  - **파일**: `style-match/app.js` (goToHairTry 함수 전면 수정)
  - **추가 기능**: 로딩 오버레이, 결과 비교 모달, 다운로드 버튼

  ### Google Play 심사 재제출
  - **문제**: `https://hairgator.kr/privacy-policy.html` 404 에러
  - **원인**: 서브도메인 분리 후 파일이 app.hairgator.kr에만 있었음
  - **해결**: hairgatorHP 레포에 privacy-policy.html, delete-account.html 복사
  - **결과**: 두 URL 모두 정상 작동
    - `https://hairgator.kr/privacy-policy.html`
    - `https://app.hairgator.kr/privacy-policy.html`

  ### Google Play 데이터 보안 설정 가이드
  | 카테고리 | 선택 | 이유 |
  |---------|------|------|
  | 위치 | ❌ | 위치 정보 안 씀 |
  | 개인 정보 | ✅ | 이메일, 이름, 프로필사진 |
  | 사진 및 동영상 | ✅ | 헤어체험, 스타일매칭 |
  | 앱 활동 | ✅ | 토큰 사용 로그 |
  | 기기 또는 기타 ID | ✅ | Firebase 사용자 ID |
  - **계정 생성 방법**: 사용자 이름/비밀번호 + OAuth (카카오/구글)
  - **계정 삭제 URL**: `https://hairgator.kr/delete-account.html`

  ### 토큰 시스템 변경 (중요!)
  - **이전 방식**: 사전 토큰 체크 + 확인 다이얼로그 + 토큰 부족 모달
  - **현재 방식**: GPT/Claude 스타일 - 사전 체크 없이 백단에서 차감, 실패 시에만 업그레이드 유도

  ### 핵심 원칙
  - ❌ 토큰 잔액 미리 보여주지 않음
  - ❌ 사전 토큰 체크 없음
  - ❌ 확인 다이얼로그 없음
  - ✅ API 호출 후 백단에서 토큰 차감
  - ✅ 차감 실패 시에만 `/#products` 페이지로 이동 (업그레이드 유도)

  ### 수정된 파일
  | 파일 | 제거된 코드 |
  |------|------------|
  | `js/menu.js` | HAIRGATOR_TOKEN_COSTS, canUseHairgatorFeature, showTokenConfirmDialog, 버튼 opacity 업데이트 |
  | `js/ai-studio.js` | sendMessage() 내 토큰 사전 체크 |
  | `lookbook.html` | analyzeWithAI() 내 토큰 사전 체크 |
  | `style-match/app.js` | TOKEN_COSTS, getTokenBalance, showInsufficientTokenModal |

  ### 토큰 차감 흐름
  1. 사용자가 기능 클릭 (룩북/헤어체험/챗봇)
  2. 바로 API 호출 실행 (사전 체크 없음)
  3. API 성공 후 `deductTokens()` 호출
  4. 차감 성공 → 정상 진행
  5. 차감 실패 (토큰 부족) → `window.location.href = '/#products'`

- 2025-12-31: UI 개선

  ### 사이드바 메뉴 순서 변경
  - **변경 전**: 테마 전환 → AI 스타일 매칭 → 퍼스널 → AI 얼굴변환 → 상호 설정 → 플랜
  - **변경 후**: 테마 전환 → **상호 설정** → AI 스타일 매칭 → 퍼스널 → AI 얼굴변환 → 플랜
  - **파일**: `js/main.js` (동적 생성되는 사이드바 HTML)

  ### 무료 플랜 유료 기능 비활성화
  - **적용 대상**: AI 스타일 매칭, 퍼스널 이미지 분석
  - **시각적 효과**: `opacity: 0.4`, `filter: grayscale(0.5)`
  - **클릭 시**: 업그레이드 모달 표시
  - **함수**: `applyPlanBasedDisabledState()` (index.html)
  - **호출 시점**: `setupSidebarMenuListeners()` 끝에서 한 번만 호출

  ### 마이페이지 테마 전환 메뉴 삭제
  - 사이드바에 이미 테마 전환 있으므로 중복 제거
  - `index.html`에서 `mypageThemeIcon`, `mypageThemeText` 관련 코드 삭제

- 2025-12-30: 버그 수정 (로그인 + 결제 수단 관리)
  - **login.html 카카오 로그인 에러 수정**: `showTermsModal` 함수가 한 줄로 압축되어 `//주석`이 나머지 코드 무효화 → iOS 심사 실패 원인
  - **마이페이지 카드 등록 버튼 수정**: `toggleSavedCardsSection` 함수 중복 정의로 잘못된 섹션 열림 → "+ 카드 등록" 버튼 정상 표시
  - **admin 사용자 상세 카드 브랜드 한글화**: `getCardBrandName()` 함수 추가 (visa→VISA, shinhan→신한카드 등)

- 2025-12-30: 서브도메인 마이그레이션 + 네이버 서치어드바이저 등록

  ### 서브도메인 구조 변경
  - **hairgator.kr** → 홈페이지 (hairgatorHP 레포)
  - **app.hairgator.kr** → 앱 서비스 (Hairgator_chatbot 레포)
  - **변경 이유**: hairgator.kr은 브랜드 대표 URL로, 앱은 서브도메인으로 분리

  ### DNS/Netlify 설정
  - **가비아 DNS**: app.hairgator.kr CNAME → lovely-lebkuchen-4017ca.netlify.app
  - **Netlify**: app.hairgator.kr 도메인 추가 (lovely-lebkuchen 사이트)
  - **hairgator.kr**: hairgatorHP Netlify 사이트로 연결

  ### Firestore 탭 URL 업데이트 (app_config/tabs)
  - tab1: `https://app.hairgator.kr/#stylemenu` (Style Menu)
  - tab2: `https://app.hairgator.kr/#products` (상품)
  - tab3: `https://app.hairgator.kr/#mypage` (My)
  - tab4: 비활성화
  - 스크립트: `scripts/update-app-tab-url.py`

  ### 카카오 로그인 Redirect URI 추가
  - **KOE006 에러 해결**: 로그인 리다이렉트 URI 미등록
  - **설정 위치**: 카카오 개발자 > 앱 > 플랫폼 키 > REST API 키 > 로그인 리다이렉트 URI
  - **추가한 URI**: `https://app.hairgator.kr/.netlify/functions/kakao-callback`

  ### 네이버 서치어드바이저 등록
  - **사이트 등록**: hairgator.kr
  - **소유권 확인**: HTML 파일 업로드 방식
  - **sitemap/rss URL 업데이트**: hairgatorhp.netlify.app → hairgator.kr
  - **제출 완료**: sitemap.xml, rss.xml

  ### admin.html 기본 탭 URL 수정
  - tab1~4 기본값을 app.hairgator.kr 서브도메인으로 변경
  - 스타일 상세 링크도 app.hairgator.kr로 변경

  ### 주요 URL 정리
  | URL | 용도 |
  |-----|------|
  | `https://hairgator.kr` | 홈페이지 (브랜드 랜딩) |
  | `https://app.hairgator.kr` | 앱 서비스 (메인 기능) |
  | `https://app.hairgator.kr/admin.html` | 관리자 페이지 |
  | `https://app.hairgator.kr/#stylemenu` | 스타일 메뉴 |
  | `https://app.hairgator.kr/#products` | 상품/결제 |
  | `https://app.hairgator.kr/#mypage` | 마이페이지 |

- 2025-12-29: 마이페이지/상품페이지 UI 개선 + admin 통계 필터

  ### 마이페이지 이름 표시 버그 수정
  - **문제**: 로그인 후 마이페이지에서 "사용자"로 표시됨
  - **원인**: Firebase Auth 완료 전에 마이페이지 렌더링
  - **해결**: auth.js에서 로그인 완료 후 `window.updateMypageInfo()` 호출
  - **수정 파일**: js/auth.js, js/main.js

  ### 상품 페이지(#products) UI 전면 개편
  - **5개 요금제 카드**: 무료, 베이직, 프로, 비즈니스, AI얼굴변환&영상변환
  - **가로 스크롤 레이아웃**: `.pricing-cards-horizontal`
  - **현재 플랜 동적 표시**: `updateProductsPagePlan()` 함수 추가
    - `data-plan` 속성으로 카드 식별
    - `FirebaseBridge.getTokenBalance()`로 현재 플랜 조회
    - 현재 플랜 카드는 "현재 플랜" 버튼 비활성화
  - **실제 결제 연동**: `selectPlanAndPay()` 함수 유지

  ### admin.html 사용 통계 기간 필터 추가
  - **기간 필터 버튼**: 일/주/월/년 선택
    - 일: 오늘 00:00 ~ 현재
    - 주: 7일 전 ~ 현재
    - 월: 이번 달 1일 ~ 현재
    - 년: 올해 1월 1일 ~ 현재
  - **신규 가입자 수 카드**: `users.createdAt` 기준 필터
  - **접속자 수 카드**: `users.lastLoginAt` 기준 필터
  - **함수**: `changeStatsPeriod()`, `getStartDateForPeriod()`, `loadUsageStats()` 수정
  - **CSS**: `.period-filter-group`, `.period-btn`, `.stat-card-highlight`

  ### 커밋
  - `c16a95e`: feat: admin 사용 통계에 신규 가입자/접속자 + 기간 필터 추가

- 2025-12-29: admin.html 헤어스타일 관리 + 통계 Firebase 연동

  ### 헤어스타일 관리 Firebase 연결 수정
  - **컬렉션 변경**: `men_styles`/`styles` → `hairstyles` (메인 메뉴판과 동일)
  - **카테고리명 수정**: 대문자 → Title Case (`A LENGTH` → `A Length`, `SIDE FADE` → `Side Fade`)
  - **gender 필터 추가**: `.where('gender', '==', gender)` 쿼리 추가
  - **openStyleDetail 함수 수정**: gender 파라미터 추가하여 새 창에서 스타일 상세 열기

  ### 사용 통계에 헤어스타일 통계 추가
  - **스타일 수 카드**: 전체/남성/여성 스타일 수 표시
  - **성별 비율 도넛 차트**: Chart.js 사용 (남성 파란색, 여성 핑크색)
  - **남성 카테고리별 바 차트**: SF, SP, FU, PB, BZ, CR, MH (축약형 라벨)
  - **여성 카테고리별 바 차트**: A~H Length
  - **loadHairstyleStats() 함수**: hairstyles 컬렉션에서 통계 집계
  - **자동 로드**: loadUsageStats() 호출 시 함께 로드

  ### 남자 카테고리명 수정 (중요!)
  - **잘못된 값**: Side Fade, Full Up, Push Back, Mushroom/Home
  - **올바른 값 (Firestore 실제값)**: SIDE FRINGE, SIDE PART, FRINGE UP, PUSHED BACK, BUZZ, CROP, MOHICAN

  ### 중분류(subCategory) 값 수정 (중요!)
  - **잘못된 값**: 'N', 'FH', 'EB', 'E', 'CB' (축약형)
  - **올바른 값 (Firestore 실제값)**: 'None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone'

  ### 커밋
  - `feda316`: fix: admin.html 헤어스타일 관리 Firebase 연동 + 통계 차트
  - `8eff504`: fix: admin.html 남자 카테고리명 Firestore 실제 값으로 수정
  - `74d5cf2`: fix: admin.html 중분류 값 Firestore 실제 값으로 수정

- 2025-12-28: 불나비 완전 독립 마이그레이션 **완료**

  ### 삭제된 파일 (총 3,680줄 제거)
  - `js/bullnabi-bridge.js` (1,348줄)
  - `js/dynamic-token-service.js`
  - `netlify/functions/bullnabi-proxy.js` (1,498줄)
  - `netlify/functions/token-api.js` (334줄)

  ### 수정된 파일
  - `lookbook.html`: bullnabi-proxy → FirebaseBridge.deductTokens()
  - `login.html`: bullnabi-proxy → Firestore bullnabi_users 직접 조회
  - `netlify/functions/kakao-callback.js`: bullnabi-proxy → Firestore 직접 조회
  - `netlify/functions/payment-verify.js`: Bullnabi API → Firestore 직접 토큰 충전
  - `js/ai-studio.js`, `js/payment.js`, `payment-complete.html`: localStorage 정리
  - `index.html`, `dist/index.html`: 레거시 스크립트 참조 제거

  ### 결과
  - 불나비 API 호출 **완전 제거** (`drylink.ohmyapp.io` 호출 없음)
  - 모든 토큰/사용자 데이터를 Firestore에서 직접 관리
  - Firebase Auth + Firestore 기반 독립 시스템 완성

- 2025-12-27 (저녁): 불나비 → Firebase Auth 독립 마이그레이션 ✅ 완료

  ### 배경
  - 헤어게이터 서비스를 불나비 앱 종속에서 완전 독립 웹앱으로 전환
  - MongoDB 의존성 제거, Firebase Auth + Firestore 기반으로 재구축
  - 도메인: `hairgator.kr` (가비아에서 구매)

  ### 인증 시스템 변경
  - **Firebase Auth** 도입: Google, 이메일/비밀번호, 카카오 (Custom Token)
  - **신규 파일**:
    - `login.html`: 로그인 페이지 (Google/카카오/이메일 선택)
    - `js/firebase-bridge.js`: Firestore 토큰 관리 (bullnabi-bridge.js 대체)
    - `netlify/functions/kakao-callback.js`: 카카오 OAuth 핸들러
  - **수정 파일**:
    - `js/auth.js`: 불나비 → Firebase Auth 전면 교체
    - `js/firebase-config.js`: Auth 초기화 추가, Storage SDK 선택적 초기화
    - HTML 4개 파일: bullnabi-bridge.js → firebase-bridge.js 참조 변경

  ### 카카오 로그인 연동 완료 ✅
  - **도메인 연결**: `hairgator.kr` → Netlify 연결 완료
  - **카카오 개발자 콘솔 설정 완료**:
    - 앱 ID: 1298589
    - 앱 이름: 헤어게이터
    - 웹 도메인: `hairgator.kr`
    - Redirect URI: `https://hairgator.kr/.netlify/functions/kakao-callback`
  - **OAuth 플로우 테스트 통과**:
    1. 카카오 OAuth 리다이렉트 정상
    2. 액세스 토큰 발급 성공
    3. Firebase Custom Token 생성 성공
    4. Firestore 사용자 저장 (`kakao_4665545967`)
    5. 신규 사용자 200 토큰 자동 지급
    6. 메인 페이지 자동 리다이렉트
  - **수정한 버그**:
    - `kakao-callback.js`: Firebase Admin 초기화를 핸들러 내부로 이동 (환경변수 누락 시 상세 로그 출력)
    - `firebase-config.js`: Storage SDK 선택적 초기화 (login.html에서 Storage SDK 없어도 에러 안남)

  ### Firestore 사용자 스키마 (`users` 컬렉션)
  ```javascript
  {
    uid: "firebase_uid 또는 kakao_12345",
    email: "user@example.com",
    displayName: "홍길동",
    photoURL: "https://...",
    provider: "google" | "kakao" | "email",
    tokenBalance: 200,  // 신규 가입 시 200 토큰 지급
    plan: "free",
    createdAt: Timestamp,
    lastLoginAt: Timestamp
  }
  ```

  ### 호환성 유지
  - `window.BullnabiBridge` 별칭 유지 (기존 코드 호환)
  - `getBullnabiUser()` 함수 유지 (Firebase 형식으로 변환)
  - `window.currentDesigner` 구조 유지

  ### Netlify 환경변수 (필수) - 2025-12-29 업데이트

  **현재 설정됨 ✅:**
  | 변수명 | 값 | 용도 |
  |--------|-----|------|
  | `FIREBASE_PROJECT_ID` | `hairgatormenu-4a43e` | Firebase 프로젝트 |
  | `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-fbsvi@hairgatormenu-4a43e.iam.gserviceaccount.com` | Firebase Admin |
  | `FIREBASE_PRIVATE_KEY` | (비공개) | Firebase Admin 인증 |
  | `GEMINI_API_KEY` | (비공개) | Gemini AI - 챗봇/RAG |
  | `GEMINI_API_KEY_ADMIN` | (비공개) | Gemini AI - 어드민용 |
  | `SENDGRID_API_KEY` | `SG.k2pN2lx1TrW0Tt...` | 플랜 만료 이메일 알림 |
  | `SENDGRID_FROM_EMAIL` | `noreply@hairgator.kr` | 이메일 발신자 주소 |

  **추가 필요:**
  | 변수명 | 값 | 용도 |
  |--------|-----|------|
  | `KAKAO_REST_API_KEY` | `e085ad4b34b316bdd26d67bf620b2ec9` | 카카오 로그인 |
  | `VMODEL_API_KEY` | `Zqo2gbuOlkQW1hO7LezeOPboIutgLi6pjwXmB0NBRMQh1jAJ-au4f1H0OMcfvWAvwPR-xcKdCfMwsSIyueVu0A==` | 헤어체험 AI 합성 |
  | `PORTONE_API_SECRET` | `JEf3Ux7c+ixp74j1j4VxbMX12ww+zZYTUBx4GMCS6WHm/aNiVJbyHhUmTj7psIMI5u2nRE40meIkoh8ln6KS5w==` | 결제 검증 |

  **API 키 확인 위치:**
  - **KAKAO_REST_API_KEY**: https://developers.kakao.com → 앱 설정 → 앱 키 (앱 ID: 1298589)
  - **VMODEL_API_KEY**: https://www.vmodel.ai → Dashboard → API Keys
  - **PORTONE_API_SECRET**: https://admin.portone.io → 결제연동 → API 키 → V2 API Secret (이름: hairgator_pay)
  - **SENDGRID_API_KEY**: https://app.sendgrid.com → Settings → API Keys → Create API Key

  ### SendGrid 설정 ✅ 완료 (2026-01-05)
  - **계정**: drylink.info@gmail.com
  - **API 키**: `hairgator-email` (Full Access)
  - **발신자**: `noreply@hairgator.kr`
  - **도메인 인증**: hairgator.kr (가비아 DNS 레코드 4개 추가 완료)
    - CNAME: em2682 → u58582226.wl227.sendgrid.net.
    - CNAME: s1._domainkey → s1.domainkey.u58582226.wl227.sendgrid.net.
    - CNAME: s2._domainkey → s2.domainkey.u58582226.wl227.sendgrid.net.
    - TXT: _dmarc → v=DMARC1; p=none;

  ### ⚠️ TODO: 불나비 사용자 일괄 마이그레이션 (1주일 내 실행 필요!)

  **배경**: 불나비 API가 1주일 후 종료됨. 그 전에 기존 디자이너 데이터를 모두 Firestore로 복사해야 함.

  **스크립트 위치**: `scripts/migrate-bullnabi-users.js`

  **실행 방법**:
  ```bash
  cd C:\Users\김민재\Desktop\Hairgator_chatbot
  node scripts/migrate-bullnabi-users.js
  ```

  **필요 환경변수** (.env 파일에 설정):
  - `BULLNABI_LOGIN_ID`: 불나비 관리자 이메일
  - `BULLNABI_LOGIN_PW`: 불나비 관리자 비밀번호
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

  **스크립트 동작**:
  1. 불나비 API에서 `registerType == "디자이너"` 전체 조회
  2. Firestore `bullnabi_users` 컬렉션에 저장 (email 기준)
  3. 나중에 로그인 시 이메일 매칭으로 `users` 컬렉션으로 이동

  **마이그레이션 플로우** (이미 구현됨):
  - `kakao-callback.js`: 카카오 로그인 시 불나비 이메일 매칭 → tokenBalance/plan 마이그레이션
  - `login.html`: Google/이메일 로그인 시 동일하게 마이그레이션
  - `migratedFromBullnabi: true` 플래그로 중복 방지

### 이전 작업 요약 (12월 14일~26일) - 상세 기록 정리됨
- AI 스타일 매칭 (얼굴 랜드마크 기반 헤어 추천) 개발
- 이미지 타입 분석 시스템 (웜계/뉴트럴/쿨계)
- OhMyApp 플랜 상품 로직 + 토큰 시스템 불나비 API 전환
- 포트원 V2 결제 연동 (테스트 모드)
- 펌 인덱스 RAG 업로드, 다국어 버그 수정
- 헤어체험 504 타임아웃 해결, 룩북 매거진 스타일
- 커트↔펌 양방향 연결, Vision 매칭 활성화
- RAG 커트/펌 자막 통합, 7개국어 지원 완료

## 핵심 함수 위치 (chatbot-api.js)
- `generateGeminiFileSearchResponse()`: 라인 ~2834 (비스트리밍 RAG 응답)
- `generateGeminiFileSearchResponseStream()`: 라인 ~2962 (스트리밍 RAG 응답)
- `buildGeminiSystemPrompt()`: 라인 ~2500 (7개국어 시스템 프롬프트)
- `detectLanguage()`: 라인 ~2277 (언어 감지)
- `detectTheoryImageForQuery()`: 라인 ~3404 (이미지 매칭, 다중 반환)
- `calculateTechniqueMatchScore()`: 라인 ~6423 (캡션 기반 기법 매칭 점수)
- `selectBestStyleByVision()`: 라인 ~6543 (여자 Vision 비교)
- `selectBestMaleStyleByVision()`: 라인 ~7334 (남자 Vision 비교)

## AI 모델 사용 현황 및 비용

### 현재 사용중인 모델
| 기능 | 모델 | 용도 |
|------|------|------|
| 텍스트 Q&A + RAG | **Gemini 2.5 Flash** | 이론 질문 답변 |
| 이미지 분석/비교 | **Gemini 2.0 Flash (Vision)** | 스타일 매칭, 파라미터 추출 |
| 스트리밍 응답 | **Gemini 2.5 Flash** | 실시간 답변 |
| 임베딩 생성 | **Gemini 2.5 Flash** | 벡터 검색 |

### Gemini API 가격 (100만 토큰당, 2025년 기준)
| 모델 | 입력 | 출력 |
|------|------|------|
| **Gemini 2.0 Flash** | $0.10 | $0.40 |
| **Gemini 2.5 Flash** | $0.30 | **$2.50** ← 출력 비쌈! |
| Gemini 2.5 Pro | $1.25 | $10.00 |

### 예상 비용 (1인당/월)
- **일반 유저** (하루 5-10회): ~$0.15~0.50/월
- **하드 유저** (하루 30-50회): ~$1.5~5/월

### 할당량 (Rate Limits)
- **유료 티어 사용중** → 할당량 걱정 없음
- 무료 티어: RPM 10, RPD 250 (서비스 운영 불가)
- 유료 티어: RPM 60~1000+, RPD 무제한

### 비용 최적화 옵션
- RAG를 **2.0 Flash로 변경**하면 출력 비용 **6배 절감** 가능
- RAG는 문서 기반 답변이라 2.0으로 바꿔도 품질 차이 거의 없음
- temperature 0.2, topP 0.8로 설정되어 있어 창의성 억제됨

### GPT/OpenAI 사용 현황 (2025-12-22 정리 완료)
- **현재 완전 미사용** - 모든 AI 기능이 Gemini로 처리됨
- 레거시 코드 DEPRECATED 처리 완료:
  - `chatbot-api.js`: generateProfessionalResponse, generateRecipe, generateProfessionalResponseStream
  - `lib/male-recipe.js`, `lib/female-recipe.js`: 전체 파일 DEPRECATED
- OPENAI_API_KEY 환경변수 제거 가능 (더 이상 사용 안 함)
- `generateMaleCustomRecipe()` 함수 Gemini로 전환 완료

## 요금제 설계 (2025-12-18 확정)

### 기능별 API 비용 (1회당)

| 기능 | 사용 기술 | 원가 |
|------|----------|------|
| 스타일메뉴 | Firebase Storage (정적) | **0원** |
| AI퍼스널분석 | MediaPipe (클라이언트) | **0원** |
| 드레이프모드 | MediaPipe (클라이언트) | **0원** |
| 챗봇 | Gemini 2.5 Flash RAG | **~7.5원** |
| 룩북 | 2.0 Flash Vision + 이미지 3장 | **~160원** |
| 헤어체험 | vModel + Gemini 3 Pro Image | **~278원** |

### API 가격 참고 (2025년 12월 기준)

| 모델 | 입력 (1M 토큰) | 출력 (1M 토큰) |
|------|---------------|----------------|
| Gemini 2.0 Flash | $0.10 | $0.40 |
| Gemini 2.5 Flash | $0.30 | $2.50 |
| Gemini 2.5 Flash Image | - | $0.039/장 |
| Gemini 3 Pro Image | - | $0.134/장 |
| vModel Hair Swap | ~$0.08/회 | - |

### 크레딧 기반 요금제 (사용량 비공개 방식)

**운영 원칙:**
- 사용자에게 남은 크레딧 **안 보여줌** (GPT/Claude 방식)
- 환불/이월 클레임 방지
- 초과 사용 시 추가 결제 유도

**기능별 크레딧 소모:**

| 기능 | 크레딧/회 |
|------|----------|
| 스타일메뉴 | 0 (무제한) |
| AI퍼스널분석 | 0 (무제한) |
| 드레이프모드 | 0 (무제한) |
| 챗봇 | 3~30 (토큰 구간별) |
| 룩북 | 200 |
| 헤어체험 | 350 |

**챗봇 크레딧 구간:**
| 토큰 수 | 크레딧 | 예시 |
|---------|--------|------|
| ~500 | 3 | 인사, 간단 질문 |
| 501~1500 | 10 | 일반 질문 |
| 1501~3000 | 20 | 상세 설명 |
| 3000+ | 30 | 레시피, 복잡한 분석 |

**요금제별 크레딧 배분:**

| 요금제 | 월 크레딧 | 원당 크레딧 | 최악 원가 | 확정 이익 | 마진 |
|--------|----------|------------|----------|----------|------|
| 무료 | 200 | - | 157원 | -157원 | - |
| 22,000원 | 10,000 | 0.45 | 7,800원 | **14,200원** | 65% |
| 38,000원 | **18,000** | **0.47** | 14,100원 | **23,900원** | 63% |
| 50,000원 | **25,000** | **0.50** | 19,600원 | **30,400원** | 61% |

**상위 요금제 메리트:** 원당 크레딧이 증가하여 업그레이드 유인 제공

**요금제별 기능 접근 권한:**

| 기능 | 무료 | 22,000원 | 38,000원 | 50,000원 |
|------|------|----------|----------|----------|
| 스타일메뉴판 | ✅ 무제한 | ✅ 무제한 | ✅ 무제한 | ✅ 무제한 |
| 챗봇 | ✅ 크레딧 | ✅ 크레딧 | ✅ 크레딧 | ✅ 크레딧 |
| 퍼스널이미지분석 | ❌ 잠금 | ✅ 무제한 | ✅ 무제한 | ✅ 무제한 |
| 룩북 | ❌ 잠금 | ✅ 크레딧 | ✅ 크레딧 | ✅ 크레딧 |
| 헤어체험 | ❌ 잠금 | ✅ 크레딧 | ✅ 크레딧 | ✅ 크레딧 |

**크레딧 소진 시:**
- 다음 요금제로 업그레이드 유도 팝업

## 결제 시스템 (2025-12-22 논의)

### 포트원 V2 연동 정보
- storeId: store-69fa8bc3-f410-433a-a8f2-f5d922f94dcb
- channelKey: channel-key-da1e7007-39b9-4afa-8c40-0f158d323af1
- PG: nice_v2 (나이스 V2 신모듈)
- MID: IMPdryi1m
- 결제 모듈: 신모듈, 결제창, 일반결제, API, 수기/정기결제

### 결제 방식 결정
- Hairgator는 불나비 앱 내 웹뷰로만 접근 가능 (독립 웹 접근 없음)
- 결제는 불나비 앱에서 처리 (포트원 웹뷰 결제 불필요)
- 불나비 콘텐츠 생성권에 헤어게이터 전용 상품 추가 예정
- 헤어게이터 크레딧은 기존 콘텐츠 생성권과 분리 관리

### 불나비 기존 상품 구조 (콘텐츠 생성권)
- 베이직 3회: 8,000원
- 스탠다드 6회: 15,000원
- 어드밴스드 12회: 25,000원
- 프로 20회: 38,000원
- 비즈니스 50회: 80,000원

### 현재 토큰 시스템 구조 (2026-01-02 업데이트)
- **Firestore `users` 컬렉션**의 `tokenBalance` 필드에 토큰 저장
- **firebase-bridge.js** API:
  - `getTokenBalance()`: 토큰 잔액 + 플랜 조회 (마이페이지에서만 사용)
  - `deductTokens(docId, feature, metadata)`: 고정 비용 차감 (lookbook, hairTry)
  - `deductTokensDynamic(docId, amount, feature, metadata)`: 가변 비용 차감 (chatbot)
- **토큰 비용** (firebase-bridge.js TOKEN_COSTS):
  - 룩북: 200 토큰
  - 헤어체험: 350 토큰
  - 챗봇: 3~30 토큰 (토큰 사용량 구간별)
- **GPT/Claude 스타일**: 사전 체크 없이 백단에서 차감, 실패 시 `/#products` 이동

### 토큰 사용 로그
- Firestore `credit_logs` 컬렉션에 사용 기록 저장
- 구조:
  ```javascript
  {
    userId: "불나비_사용자_ID",
    action: "lookbook" | "hairTry" | "chatbot",
    creditsUsed: 200,
    timestamp: Firestore.Timestamp,
    createdAt: "2025-12-23T10:00:00.000Z",
    metadata: {
      userName: "김민재",
      previousBalance: 1000,
      newBalance: 800,
      type: "tokenBalance"
    }
  }
  ```
- 비동기 저장: 로그 실패해도 토큰 차감은 성공 처리

### TODO
- 불나비 앱에서 userInfo에 tokenBalance 필드 전달 확인
- 불나비 앱에 헤어게이터 전용 상품 추가
