# HAIRGATOR 챗봇 - Claude 작업 가이드

## 핵심 아키텍처 (절대 잊지 말 것!)

### RAG 시스템
- **Gemini File Search API** 사용
- Store ID: `fileSearchStores/hairgator-theory-final-2025-kkb6n1ftfbf2`
- **53개 문서**, 524MB (영구 저장됨)
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

## 다국어 지원 (5개국어)
- 지원 언어: 한국어(ko), 영어(en), 일본어(ja), 중국어(zh), 베트남어(vi)
- `detectLanguage()` 함수: 사용자 입력 언어 자동 감지 (fallback용)
- **클라이언트 language 파라미터 우선**: ai-studio.js에서 `localStorage.getItem('hairgator_language')` 값을 서버로 전송 → 서버에서 우선 사용 (ko→korean 매핑)
- `buildGeminiSystemPrompt()`: 각 언어별 전체 시스템 프롬프트 존재
- 인사말/보안 응답 메시지: 5개국어 전체 지원
- 인사말 키워드: 안녕, hello, こんにちは, 你好, xin chào 등

### 다국어 수정 시 필수 작업 순서
1. **js/i18n.js** - 번역 키 추가 (5개국어 모두 동일한 키 추가 필수)
   - 구조: `HAIRGATOR_I18N.{lang}.personalColor.personalAnalysis.{키}`
   - 언어별 위치: ko(~600라인), en(~1200라인), ja(~1800라인), zh(~2400라인), vi(~3000라인)
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
   - 한 언어만 추가하면 안됨 - 반드시 5개국어 모두 추가

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

## 최근 작업 이력
- 2025-12-26: AI 스타일 매칭 + 이미지 타입 시스템 추가

  ### AI 스타일 매칭 (얼굴 랜드마크 기반 헤어스타일 추천)
  - **위치**: 사이드바 "퍼스널컬러" 위에 "AI 스타일 매칭" 메뉴 추가
  - **폴더**: `style-match/` (index.html, app.js, styles.css)
  - **기술**:
    - MediaPipe Face Mesh (468 랜드마크 포인트)
    - 클라이언트 실행 (API 비용 0원)
  - **분석 항목**:
    - 상안부/중안부/하안부 비율 (헤어라인-미간-코끝-턱끝)
    - 광대/턱 비율 (얼굴형 판별: 계란형, 사각형, 하트형, 긴얼굴 등)
    - **눈 사이 거리 비율** (이미지 타입 결정용)
  - **추천 로직**:
    - 성별별 대분류 카테고리별 TOP 3 추천
    - 여자: A~H LENGTH (8개 카테고리)
    - 남자: SF/SP/FU/PB/BZ/CR/MH (7개 카테고리)
    - 스코어링: 추천 조건 +30점, 회피 조건 -50점, **이미지 타입 무드 매칭 ±15점**
  - **핵심 기능**: **왜 추천하는지 이유 상세 설명**
    - 랜드마크간 거리/비율 수치 표시
    - 어떤 단점을 보완하는지 설명
  - **디자인**: 클리니컬 뷰티 (Playfair Display 폰트, 골드/민트 액센트)
  - **5개국어 지원**: ko, en, ja, zh, vi
  - **i18n 키**: `styleMatch.*` (menuTitle, uploadTitle, faceMetrics, faceType, imageType, eyeDistance 등)

  ### 이미지 타입 분석 시스템 (웜계/뉴트럴/쿨계)
  - **눈 사이 거리 비율 기반** 자동 분류:
    - `eyeDistanceRatio >= 1.1` → **웜계(Warm)**: 또렷하고 시원한 인상, 직선적 라인
    - `eyeDistanceRatio <= 0.9` → **쿨계(Cool)**: 부드럽고 집중된 인상, 곡선 라인
    - 그 외 → **뉴트럴계(Neutral)**: 균형 잡힌 인상
  - **서브타입 (하드/소프트)**: 광대/턱 비율로 결정
    - `cheekJawRatio < 1.15` → Hard (선명한 대비)
    - `cheekJawRatio > 1.25` → Soft (부드러운 그라데이션)
  - **스타일 무드 매칭**:
    - 웜계: 슬릭, 시크, 투블럭, 언더컷, 샤기 등 부스트
    - 쿨계: 웨이브, 컬, C컬, S컬, 레이어 등 부스트
    - 뉴트럴: 내추럴, 클래식 등 부스트
  - **함수**:
    - `determineImageType(ratios)`: 이미지 타입 분류
    - `getImageTypeStyleKeywords(type, subType)`: 키워드 매칭
  - **UI**: 분석 결과에 이미지 타입 배지 표시 (색상별 구분)

  ### 제거된 기능
  - **디자이너 처방 (Side 누르기/살리기/가리기)**: 이미지 타입으로 대체
  - **메인 페이지 style-match iframe**: 카메라 자동 시작 버그 수정

  ### 스타일 모달 연동 (추천 스타일 클릭 시)
  - **문제**: style-match는 별도 페이지라 `parent.openStyleModal` 없음
  - **해결**: URL 파라미터로 메인 페이지 리다이렉트
    - `openStyleDetail()`: styleId, gender, category를 URL 파라미터로 전달
    - `checkUrlForStyleModal()`: main.js에서 URL 읽고 모달 열기
  - **Firestore 컬렉션 차이**:
    - style-match: `styles` 컬렉션 (Netlify 함수 통해 로드)
    - menu.js: `hairstyles` 컬렉션
    - 해결: `styles`에서 먼저 검색, 없으면 `hairstyles` 폴백

  ### 버그 수정
  - **얼굴 감지 안됨**: `isCameraMode = true` 누락 → `startCamera()`에 추가
  - **카메라 정지 안됨**: video element ID 오타 수정 (`cameraPreview` → `cameraVideo`)
  - **성별 선택 오버레이 애니메이션**: CSS transition → JS inline style로 변경
  - **카테고리 대소문자 불일치**: 코드 'A LENGTH' vs 데이터 'A Length' → `toLowerCase()` 비교

  ### UX 개선
  - **STEP 1/STEP 2 분리**: 성별 선택(STEP 1) → 카메라/업로드(STEP 2)
  - **성별 미선택 오버레이**: "👆 먼저 성별을 선택하세요" 메시지
  - **촬영 버튼 위치**: 카메라 안 → 카메라 밖으로 이동 (텍스트 가림 방지)

- 2025-12-24: OhMyApp 플랜 상품 로직 설정 + 플랜 시스템 + 무료 플랜 자동 초기화 + 결제 모달 수정

  ### OhMyApp 플랜 상품 로직 설정
  - **옵션 설정 > 상품 분류**:
    - "보고서" 옵션 삭제
    - "플랜" (`plan`) 옵션 추가
  - **기존 로직 수정 - "[주문] 결제 후 횟수권 증가"**:
    - 조건 추가: `productCategory == "content"`
    - AI횟수권만 `remainCount` 증가하도록 제한
  - **새 로직 생성 - "[주문] 결제 후 토큰 충전 (플랜)"**:
    - If When: `ticketCount`
    - Where: `ticketCount`
    - Condition: `productCategory == "plan"`
    - Then: `_users.tokenBalance += tokenCount`
  - **상품 등록 완료**:
    - 베이직 (10,000 토큰) - 22,000원
    - 프로 (18,000 토큰) - 38,000원
    - 비즈니스 (25,000 토큰) - 50,000원
  - **테스트 결과**: 결제 플로우 정상 작동 (본인 카드 필요)

  ### 무료 플랜 자동 200 토큰 초기화
  - **문제**: 신규/기존 유저 중 플랜 결제 안 한 사람은 자동으로 무료 플랜 200 토큰 필요
  - **수정 위치**: `bullnabi-proxy.js` `handleGetTokenBalance()`
  - **로직**: `tokenBalance`가 undefined/null이면 200으로 자동 초기화
  - **주의**: `handleGetUserData()`에서 `tokenBalance || 0` → `tokenBalance` (undefined 유지해야 초기화 조건 작동)

  ### 결제 모달 수정
  - **selectPlan()**: 결제 대신 "상품 탭에서 결제해 주세요" 토스트 표시
  - **i18n 키 수정**: HTML `pricing.*` → `payment.*` (33개 수정)
  - **번역 추가**: `payAtProductTab`, `freePlanRestricted` 7개국어

  ### Netlify 배포 URL 확인
  - **정확한 URL**: `lovely-lebkuchen-4017ca.netlify.app`
  - `hairgator.netlify.app`은 예전/다른 프로젝트

  ### 불나비 _users.plan 필드 추가
  - **bullnabi-proxy.js**:
    - `handleGetPlan()`: 플랜 조회
    - `handleSetPlan()`: 플랜 설정 (관리자용)
  - **bullnabi-bridge.js**:
    - `getPlan()`: 플랜 조회
    - `setPlan()`: 플랜 설정
    - `isPaidUser()`: 유료 사용자 여부 확인
    - `getTokenBalance()`에서 plan도 함께 조회
  - **admin.html**:
    - `setTokenBalance()`에서 플랜도 함께 설정
    - 플랜 선택 UI 연동 완료

  ### 플랜 종류
  | 플랜 | 토큰 | 기능 접근 |
  |------|------|----------|
  | free | 200 | 챗봇, 스타일메뉴, 퍼스널분석 |
  | basic | 10,000 | 모든 기능 |
  | pro | 18,000 | 모든 기능 |
  | business | 25,000 | 모든 기능 |

  ### 토큰 표시 정책
  - **관리자**: 플랜 + 토큰 잔액 표시
  - **일반 유저**: 플랜만 표시 (토큰 숨김)

  ### 토큰 충전 이벤트 플로우 버그 수정 (저녁)
  - **문제**: 플랜 상품 결제 시 tokenBalance가 충전되지 않음
  - **원인**: 이벤트 플로우 조건이 `productCategory == "plan"` (영문)으로 설정되어 있었으나, 실제 상품 분류는 `"플랜"` (한글)
  - **해결**: OhMyApp 로직 설정에서 조건을 `"plan"` → `"플랜"`으로 수정
  - **위치**: 로직 설정 > "[주문] 결제 후 토큰 충전 (플랜)"
  - **참고**: 기존 결제 건은 수동 충전 필요, 새 결제부터 자동 적용

  ### 요금제 안내 UI 수정
  - **index.html**: "AI얼굴변환&영상변환" 상품의 "이 상품은 상품 탭에서만 결제가 가능합니다" 메시지 제거

- 2025-12-23: 토큰 시스템 불나비 API로 전환

  ### Firestore → 불나비 _users.tokenBalance 마이그레이션
  - **bullnabi-proxy.js 수정**:
    - `handleGetTokenBalance()`: tokenBalance 조회
    - `handleSetTokenBalance()`: tokenBalance 설정 (관리자용)
    - `handleDeductTokenBalance()`: tokenBalance 차감
    - `handleGetUserData()`에 tokenBalance 필드 추가
  - **bullnabi-bridge.js 수정**:
    - `getTokenBalance()`: Firestore → 불나비 API
    - `canUseFeature()`: Firestore → 불나비 API
    - `deductTokens()`: Firestore → 불나비 API
    - `deductTokensDynamic()`: Firestore → 불나비 API
  - **admin.html 수정**:
    - `queryTokenBalance()`: Firestore → 불나비 API
    - `chargeTokens()`: Firestore → 불나비 API
    - 결제 취소 토큰 차감: Firestore → 불나비 API
  - **auth.js 수정**:
    - 로그인 시 토큰 잔액 조회: Firestore → 불나비 API
  - **payment-verify.js 수정**:
    - `chargeTokens()`: Firestore → 불나비 API (결제 검증 후 토큰 충전)
    - `refreshBullnabiToken()`, `getBullnabiUserData()` 함수 추가
  - **lookbook.html 수정**:
    - 토큰 차감: token-api → bullnabi-proxy
  - **DEPRECATED 파일**:
    - `netlify/functions/token-api.js`: 더 이상 사용 안 함
  - **정지환 개발자 요청 반영**: 불나비 _users 컬렉션에 tokenBalance 필드 사용

  ### 기타 수정
  - ai-studio 공유 버튼 제거
  - 라이트 모드 헤더 버튼 색상 수정
  - hair-change.js 12월 19일 상태로 복구 (node-fetch 제거)
  - bullnabi-bridge.js `planName is not defined` 에러 수정

  ### 마이그레이션 배경
  - **정지환 개발자(불나비)**: "불나비API를 통해 유저정보(_users)에 tokenBalance 데이터를 넘겨주면 조회할 때도 보일거예요"
  - 기존: Firestore `user_tokens` 컬렉션에 별도 저장
  - 변경: 불나비 MongoDB `_users.tokenBalance` 필드에 저장
  - 장점: 불나비 앱에서도 토큰 잔액 확인 가능

- 2025-12-22 (저녁): 토큰 시스템 완성 + 크레딧 차감 구현

  ### 프로필 이미지 버그 수정
  - **문제**: userId 변경 시 이전 사용자 프로필 이미지가 표시됨
  - **원인**: localStorage에 프로필 이미지 캐싱 → 사용자별 분리 안 됨
  - **해결**:
    - `auth.js`: 사용자 변경 감지 시 localStorage 초기화 (프로필, 브랜드 설정)
    - `main.js`: `applyProfileImage()` Firebase `brandSettings`에서 직접 로드
    - `ai-studio.js`: `loadUserPhoto()` Firebase에서 직접 로드

  ### 챗봇 토큰 차감 구현 (가변 비용)
  - **서버 수정** (`chatbot-api.js`):
    - Gemini 응답에서 `usageMetadata` 추출
    - SSE로 `token_usage` 이벤트 전송 (totalTokens, promptTokens, completionTokens)
  - **클라이언트 수정** (`ai-studio.js`):
    - `callAPIStreaming()`에서 token_usage 파싱
    - `sendMessage()`에서 토큰 사용량 기반 크레딧 차감
  - **비용 구조**:
    - ~500 토큰: 3 크레딧
    - 501~1500 토큰: 10 크레딧
    - 1501~3000 토큰: 20 크레딧
    - 3000+ 토큰: 30 크레딧
  - **인사말/캐시 응답**: token=0이면 크레딧 차감 스킵

  ### 레시피/이미지 질문 크레딧 차감
  - `sendImageForRecipe()`: 30 크레딧 차감
  - `sendQuestionWithImage()`: 20 크레딧 차감
  - `deductTokensDynamic()` 함수 사용 (bullnabi-bridge.js)

  ### ai-studio.html 수정
  - **문제**: `window.BullnabiBridge` undefined → 크레딧 차감 안 됨
  - **원인**: ai-studio.html에 `bullnabi-bridge.js` 스크립트 누락
  - **해결**: `<script src="js/bullnabi-bridge.js"></script>` 추가

  ### 어드민 토큰 직접 설정 기능
  - `setTokenBalance()` 함수 추가 (admin.html)
  - 기존 잔액과 관계없이 지정한 값으로 직접 설정
  - 로그 기록: action='set_balance', previousBalance, newBalance, difference
  - UI: 사용자 ID, 목표 토큰 수, 메모 입력

  ### bullnabi-bridge.js 개선
  - `deductTokensDynamic(userId, amount, feature, metadata)` 함수 추가
  - 가변 금액 차감 지원 (기존 `deductTokens`는 고정 금액)
  - `token_logs` 컬렉션에 상세 로그 기록

- 2025-12-22: 결제 연동 + 남자 레시피 수정 + 레시피 번호 통일

  ### 포트원 V2 결제 연동 (테스트 모드)
  - **프론트엔드**: `js/payment.js` 생성
    - `HAIRGATOR_PAYMENT` 객체: requestPayment, purchasePlan, getUserId
    - 요금제: basic(22,000원), pro(38,000원), business(50,000원), credits_5000(5,000원)
    - windowType: `{ pc: 'POPUP', mobile: 'REDIRECTION' }`
  - **서버**: `netlify/functions/payment-verify.js` 생성
    - 포트원 API로 결제 검증 → 불나비 DB 크레딧 충전
    - Firestore `payments` 컬렉션에 결제 내역 저장 (중복 방지)
    - `credit_logs` 컬렉션에 충전 로그 기록
  - **CSP 설정**: netlify.toml에 포트원/나이스페이 도메인 추가
    - `https://cdn.portone.io`, `*.portone.io`, `*.iamport.co`, `*.nicepay.co.kr`
  - **테스트 모드 제한**:
    - `PAYMENT_ALLOWED_USER_IDS = ['691ceee09d868b5736d22007']`
    - 허용 유저만 결제 버튼 표시, 다른 유저는 숨김
  - **미해결**: NICEPAY 도메인 등록 필요 (나이스페이 가맹점 관리자에서 설정)
  - **환경변수 필요**: `PORTONE_API_SECRET` (Netlify Dashboard에서 설정)

  ### 남자 레시피 textRecipe 수정
  - **문제**: 남자 스타일 `textRecipe` 필드가 41자밖에 없어서 레시피가 잘림
  - **원인**: `men_styles` 컬렉션에 자막 파일 전체 내용이 저장 안 됨
  - **해결**:
    1. `chatbot-api.js`에 폴백 로직 추가 (textRecipe < 100자면 captionUrl에서 fetch)
    2. `scripts/update-men-textrecipe.py` 스크립트로 69개 남자 스타일 textRecipe 업데이트
    3. `styles` 컬렉션과 `men_styles` 컬렉션 모두 업데이트
  - **결과**: FU0010 등 모든 남자 스타일 레시피 정상 표시

  ### 레시피 번호 매기기 통일
  - **변경 전**: External 1,2,3... → Internal 1,2,3... (리셋)
  - **변경 후**: External 1,2,3,4,5,6 → Internal 7,8,9... (이어서)
  - **수정 위치**: `chatbot-api.js` `formatRecipeSentences()` 함수
  - **로직**: `[External]` 헤더에서만 sectionNum 리셋, `[Internal]`은 리셋 안 함

- 2025-12-22 (오전): 펌 인덱스 RAG 업로드 + 베타 기능 접근 제한

  ### 펌 인덱스 텍스트 RAG 업로드
  - **Gemini Vision으로 46개 펌 인덱스 이미지에서 의미 해석 텍스트 추출**
  - 단순 OCR이 아닌 다이어그램/표/화살표의 의미까지 해석
  - 추출 내용: 복구펌 레시피, 연화법(일반/역연화), 환원/산화 시스템, 로드/와인딩 기법 등
  - 스크립트: `scripts/extract-perm-index-to-rag.py`
  - RAG Store 문서 수: 46개 → 51개

  ### 베타 기능 접근 제한 (4개 기능)
  - **제한 기능**: 룩북, 헤어체험, 퍼스널 이미지 분석, 챗봇
  - **허용 ID**: 691ceee09d868b5736d22007, 6536474789a3ad49553b46d7
  - 비허용 사용자: 버튼 클릭 시 "아직 오픈 전입니다." 메시지 표시
  - 구현 위치: main.js(ALLOWED_USER_IDS, isAllowedUser), menu.js, ai-studio.js

  ### OpenAI/GPT 레거시 코드 정리
  - **chatbot-api.js**:
    - OPENAI_KEY 체크 제거 (핸들러에서)
    - `analyzeImage()` 파라미터 openaiKey → geminiKey 변경
    - `generateMaleCustomRecipe()` OpenAI → Gemini 2.5 Flash로 변환
    - DEPRECATED 주석 추가: generateProfessionalResponse, generateRecipe, generateProfessionalResponseStream
  - **lib/male-recipe.js, lib/female-recipe.js**: 전체 파일 DEPRECATED 처리 (미사용)
  - **결과**: 모든 AI 기능이 Gemini로만 동작, OPENAI_API_KEY 환경변수 삭제 가능

- 2025-12-19: 다국어 버그 수정 + 기술 용어 노출 방지 + 모바일 UI 개선

  ### 고객 화면 기술 용어 노출 방지
  - **chatbot-api.js**: "Gemini" 에러 메시지 14개 → "AI 서비스"로 변경
  - **hair-change.js**: "vModel" 에러 메시지 → "헤어체험 결과"로 변경
  - **console.log는 유지**: 디버깅용이므로 그대로 둠

  ### 챗봇 퀵 버튼 다국어 수정
  - **문제**: 중국어 설정 후 퀵 버튼 클릭 → 한국어로 질문 전송됨
  - **원인**: onclick에 한국어 질문 하드코딩
  - **해결**: 번역된 텍스트를 onclick에도 적용
  - **파일**: ai-studio.js `resetChatMessages()` 함수

  ### 브랜드 설정 폰트 미리보기 다국어
  - **문제**: "가나" 텍스트 하드코딩
  - **해결**: `t('ui.fontPreview')` 사용
  - **7개국어 추가**:
    - ko: `Aa 가나`, ja: `Aa あア`, zh: `Aa 字体`
    - en/vi/id/es: `Aa Bb`

  ### 모바일 카테고리 탭 축약
  - **문제**: 긴 카테고리명이 모바일에서 넘침
  - **해결**: 480px 이하에서 축약명 표시
  - **여자**: A LENGTH → A, B LENGTH → B, ...
  - **남자**: SIDE PART → SP, TWO BLOCK → 2B, CROP → CR, ...
  - **중분류**: Fore Head → FH, Eye Brow → EB, ...
  - **CSS**: `.tab-name-full` / `.tab-name-short` + 미디어쿼리

  ### 카테고리 설명 한줄 스크롤
  - **변경**: 설명 텍스트 `white-space: nowrap` + 가로 스크롤
  - **CSS**: `.category-description-text` overflow-x: auto

  ### 헤어체험 결과 저장 (태블릿 지원)
  - **문제**: 태블릿에서 저장 버튼 안됨 (Canvas CORS 제한)
  - **해결**: 오버레이 모달로 이미지 표시 → 길게 눌러 저장 안내
  - **함수**: `showSaveImageOverlay()`, `closeSaveImageOverlay()`
  - **i18n**: `hairTry.saveGuide` 7개국어 추가

  ### 커트 레시피 섹션별 번호 매기기
  - **External**: 문장마다 1, 2, 3...
  - **Internal**: 번호 리셋 후 1, 2, 3...
  - **CSS**: `.step-num` 원형 번호 스타일

  ### RAG 헤어케어 제품 가이드 추가 (이전 세션)
  - **문서**: `hair_care_products_guide.txt` - 트리트먼트/린스/컨디셔너 차이 가이드
  - **내용**: 카티온 계면활성제 작용 원리, 손상별 제품 선택, FAQ 6개
  - **업로드 스크립트**: `scripts/upload-hair-care-guide.py`
  - **Store**: fileSearchStores/hairgator-theory-final-2025-kkb6n1ftfbf2 (46개 문서)

  ### 히스토리 이미지 Firebase Storage 저장 (이전 세션)
  - **문제**: blob URL은 세션 종료 시 만료 → 히스토리에서 이미지가 엑박으로 표시
  - **해결**: 이미지 업로드 시 Firebase Storage에 영구 저장 (7일 보관)
  - **함수**: `uploadImageToStorage()` (ai-studio.js)
  - **경로**: `temp_uploads/{userId}/{timestamp}_{random}.{ext}`
  - **정리**: `cleanup-old-images.js` Netlify 스케줄 함수 (@daily)

- 2025-12-18: 헤어체험 504 타임아웃 해결 + AI 레시피 서술형 포맷

  ### 헤어체험 비동기 폴링 방식으로 변경
  - **문제**: Netlify 함수 10초 타임아웃 → vModel 20초 폴링 + Gemini 후처리 시간 초과
  - **해결**: action 파라미터 기반 비동기 처리
    - `action: 'start'` → vModel Task 생성 후 taskId 반환 (빠름)
    - `action: 'status'` → 상태 확인, 완료 시 Gemini 후처리 실행
  - **클라이언트 폴링**: `pollHairChangeStatus()` 함수
    - 2초 간격, 최대 30회 (60초)
    - `.loading-progress` 요소로 진행 상태 표시
  - **파일 위치**: hair-change.js, menu.js

  ### AI 레시피 서술형 포맷 변경 (이전 세션)
  - **커트 레시피**: External/Internal 섹션 분리, 서술형 단계별 안내
  - **펌 레시피**: A존/B존/C존 섹션 분리, 서술형 단계별 안내
  - **CSS 그라데이션 박스**:
    - `.recipe-section.external` (파란색)
    - `.recipe-section.internal` (보라색)
    - `.recipe-section.zone-a/b/c` (녹색/노랑/보라)

  ### Veo 3.1 Image-to-Video 지원 (admin.html)
  - Veo 2.0 → 3.1 업그레이드
  - `input_image` 파라미터로 첫 프레임 이미지 지정 가능
  - admin.html에 첫 프레임 이미지 선택 UI 추가

- 2025-12-17: 룩북 매거진 스타일 + 헤어체험 전/후 비교 UI

  ### 룩북 에디토리얼 매거진 스타일 적용
  - **디자인 컨셉**: 고급 패션 매거진 느낌의 미니멀 디자인
  - **폰트 변경**: Cormorant Garamond (제목) + Libre Franklin (본문)
  - **레이아웃**: max-width 880px 중앙 정렬, 좌우 흰색 여백
  - **장식 효과**: 프레임 보더, 노이즈 텍스처 배경
  - **네비게이션**: backdrop-filter blur 효과
  - **태그 스타일**: pill 버튼 → 점(·) 구분 텍스트로 변경
  - **파일 위치**: lookbook.html 전체 재설계

  ### 헤어체험 전/후 비교 UI
  - **기능**: 원본 사진과 결과 사진을 나란히 비교
  - **데스크톱**: 좌우 배치 (BEFORE → AFTER)
  - **모바일**: 세로 배치, 화살표 90도 회전
  - **애니메이션**: 화살표 pulse 효과 (1.5초 주기)
  - **i18n 키 추가**: `hairTry.before`, `hairTry.after` (7개국어)
  - **함수 위치**: menu.js `showHairTryResult()`, `addHairTryResultStyles()`

  ### Veo API 영상 생성 (비활성화)
  - **이슈**: 1:1 비율 미지원, 504 타임아웃, referenceImages 미지원
  - **수정**: 2단계 폴링 방식으로 변경, Veo 2.0으로 다운그레이드
  - **결론**: text-to-video만 지원되어 헤어 메뉴판 이미지 활용 불가 → 사용 안 함
  - **대안**: Runway ML, Pika Labs, Kling AI (image-to-video 지원)

- 2025-12-16: 커트↔펌 양방향 연결 + Vision 매칭 활성화

  ### 커트↔펌 레시피 양방향 연결 버튼
  - **커트 레시피 → 펌 레시피 연결**: "🌀 이 스타일 펌 레시피 보기" 버튼
  - **펌 레시피 → 커트 레시피 연결**: "✂️ 이 스타일 커트 레시피 보기" 버튼
  - **스타일ID 변환**: FAL0001 ↔ FALP0001 (L 뒤에 P 추가/제거)
  - **버튼 위치**: 레시피 캔버스 맨 아래 (AI 생성 맞춤 레시피 다음)
  - **5개국어 지원**: viewPermRecipe, viewCutRecipe, permRecipeHint, cutRecipeHint 번역 키 추가
  - **API 엔드포인트**: `get_perm_recipe_by_style`, `get_cut_recipe_by_style`
  - **함수 위치**: ai-studio.js의 `showMatchingPermRecipe()`, `showMatchingCutRecipe()`, `showPermRecipeFromCut()`, `showCutRecipeFromPerm()`

  ### Vision 매칭 활성화 (resultImage 필드 추가)
  - **문제**: Firestore `styles` 컬렉션에 `resultImage` 필드가 없어서 Vision 매칭이 안 됨
  - **해결**: 140개 스타일 모두에 `resultImage` 필드 추가
    - Storage에서 `styles/{styleId}/result.png` 또는 `styles/{series}/{styleId}/result.png` URL 수집
    - 커트 70개: 각자 자체 result.png 사용
    - 펌 70개: 매칭되는 커트의 result.png 사용 (FALP0001 → FAL0001/result.png)
  - **코드 위치**: chatbot-api.js의 `seriesStylesWithImage.filter(s => s.resultImage)`

  ### 펌 레시피 섹션 헤더 자동 분리 개선
  - **기존**: Zone(A존, B존, C존, 사이드)만 감지
  - **개선**: 사이드, 백 사이드, 센터 백, 네이프, 프린지, 크라운, 탑 등 부위별 자동 감지
  - **함수 위치**: chatbot-api.js `formatPermRecipe()` 라인 ~7308
  - **표시 형식**: `**[📍 센터 백 (Center Back)]**`

  ### 추가분 펌 레시피 11개 업로드 완료 (이전 작업)

  ### 추가분 펌 레시피 업로드
  - **추가된 스타일 11개**: FALP4001, FBLP2001, FBLP2002, FBLP3001, FDLP1003, FDLP3001, FELP2004, FFLP2003, FGLP1001, FGLP1005, FGLP2004
  - **자막 추출**: Gemini Vision API로 11개 스타일 자막(caption.txt) 추출
  - **Firebase Storage 업로드**: 700개 도해도 이미지 업로드
  - **Firestore 저장**: `styles` 컬렉션에 11개 펌 레시피 문서 저장
  - **썸네일 변환**: 700개 도해도 300px 썸네일로 변환 완료
  - **최종 결과**: 61개 → 70개 펌 레시피 (새로 9개 추가, 2개 업데이트)
  - **커트-펌 매칭**: 모든 69개 커트에 대응하는 펌 레시피 완비

  ### 펌 레시피 자막 텍스트 정리
  - **format-perm-recipes.py** 스크립트로 펌 레시피 자막 Zone별 포맷팅
  - Zone 구분: 네이프, 센터 백, 백 사이드, 사이드, 프린지, 프론트 톱
  - 파라미터 추출: 천체축 각도, 다이렉션(D0~D8), 로드/셋팅롤, 베이스 유형, 와인딩/프레스
  - CSS 스타일 추가: `.recipe-zone-header`, `.recipe-warning`, `.recipe-tip`

  ### Firestore 페이지네이션 버그 수정 (중요!)
  - **문제**: Firestore REST API 기본 100개 문서 제한 → FHLP 시리즈 누락
  - **원인**: 커트 69개 + 펌 61개 = 130개인데 100개만 로드됨
  - **해결**: `getFirestoreStyles()` 함수에 `pageSize=300` + `nextPageToken` 페이지네이션 추가
  - **위치**: chatbot-api.js 라인 ~3998-4064

  ### 레시피 줄바꿈 버그 수정
  - **문제**: `\s{2,}` 정규식이 줄바꿈(\n)까지 제거 → 레시피가 한 줄로 표시됨
  - **해결**: `/ {2,}/` (리터럴 스페이스만)으로 변경
  - **위치**: chatbot-api.js 라인 ~6684, ~7697

  ### 펌 도해도 썸네일 변환
  - **upload-perm-thumbnails.py** 스크립트로 고해상도 이미지 → 300px 썸네일 변환
  - **설정**: 너비 300px, JPEG 85% 품질
  - **결과**: 61개 + 11개 = 72개 스타일, 4810개 썸네일 완료
  - **목적**: 도해도 로딩 속도 개선 (한 스타일당 100개+ 이미지)

  ### 펌 레시피 재분석 기능 추가
  - **기장 + 펌타입 수정 UI**: 커트와 동일한 방식으로 재분석 지원
  - **펌 타입 분류** (styleId 번호대 기준):
    - 0번대: 매직 (프레스) - FALP0001, FBLP0001
    - 1번대: 셋팅롤 (C컬) - FCLP1001, FELP1001
    - 2번대: 로드 (S컬) - FBLP2003, FCLP2002
    - 3번대: 볼륨 웨이브 - FALP3001, FGLP3001
    - 4번대: 트위스트 - FBLP4002
  - **클라이언트**: `reanalyzePermWithStyle()` 함수 (ai-studio.js)
  - **서버**: `regeneratePermRecipeWithStyle()` 함수 (chatbot-api.js)
  - **action**: `regenerate_perm_recipe`

- 2025-12-15: 2026 살롱 트렌드 기반 고객 응대 코칭 프롬프트 추가
  - **5개국어 시스템 프롬프트에 융합**: 기존 프롬프트 유지 + 새 섹션 추가
  - **핵심 트렌드 5가지**:
    1. 초개인화: "유행 스타일"보다 "이 고객에게 맞는" 설계
    2. 근거 기반: "왜 좋은지" 과학적으로 설명해야 신뢰 획득
    3. 투명성: "알아서 해드릴게요"는 불신 초래, 과정을 보여줘야 함
    4. 루틴 경험: 일회성 시술이 아닌 장기 관리 플랜 제안
    5. 감정 호스피탈리티: 기술보다 고객 불안 해소가 재방문 결정
  - **고객 응대 질문 시 답변 구조**:
    1. (상황 분석) 고객이 진짜 원하는 게 뭔지 분석
    2. (진단 질문) 고객에게 먼저 물어볼 역질문 예시
    3. (설명 화법) 근거 기반으로 고객에게 설명하는 스크립트
    4. (루틴 안내) 시술 후 홈케어 + 재방문 주기 안내
    5. (피해야 할 말) 신뢰를 떨어뜨리는 표현
  - **기존 방식 유지 케이스**: 이론/기술 질문, 레시피 조회, 단순 정보 요청

- 2025-12-15: 메리 크리스마스 텍스트 완전 비활성화
  - `createMerryChristmasText()` 함수: 요소 제거만 수행하도록 변경
  - DOMContentLoaded에서 이전 캐시로 생성된 크리스마스 효과 요소들 일괄 제거

- 2025-12-14: 연관 질문 추천 기능 + 크리스마스 효과 간소화
  - **연관 질문 추천**: 답변 후 관련 질문 3개 제안 (5개국어 지원)
  - **type 필드 충돌 버그 수정**: spread 연산자로 덮어쓰기 문제 → `questionType`으로 분리
  - **크리스마스 효과 간소화**: 눈내리기만 유지, 트리/선물/텍스트/발자국/눈사람/버튼눈쌓임 제거

- 2024-12-11: 커트/펌 레시피 RAG 완전 통합 + 펌 인덱스 이미지 추가

  ### RAG 커트 자막 추가 (헷갈렸던 부분!)
  - **여자 커트 69개 + 남자 커트 69개 = 138개** 자막을 **하나의 텍스트 파일**로 병합
  - 스크립트: `merge-cut-captions.py` → `upload-cut-captions-to-rag.py`
  - **API 파라미터 주의**: `import_file()`에서 `file_search_store_name=STORE_NAME` (name= 아님!)
  - RAG 문서 수: 42개 → 43개

  ### 스타일 코드 노출 금지
  - 시스템 프롬프트에 규칙 추가: FAL0001, FALP3003, SF1001 등 코드 노출 금지
  - 대신 자연어로 표현: "가슴 하단 길이의 S컬 펌", "사이드 프린지 남자 커트"

  ### 펌 인덱스 이미지 업로드 (헷갈렸던 부분!)
  - **Firebase Storage**: `perm_index/{lang}/` 경로에 6개 언어 이미지 업로드
  - **Firestore 구조 문제**: 처음에 언어별로 문서 분리됨 → `fix-perm-index-merge.py`로 병합
    - 잘못: `perm_ko_Zone`, `perm_en_Zone` 별도 문서
    - 올바름: `perm_Zone` 하나에 `images: {ko, en, ja, zh, vi, id}` 객체
  - **detectTheoryImageForQuery 수정**: `idx.type` → `idx.category || idx.type` 체크
    - 펌 인덱스는 `category: 'perm'` 사용, 기존 커트 인덱스는 `type` 필드 사용
  - 최종: 46개 펌 인덱스, 각각 6개 언어 지원 (ko, en, ja, zh, vi, id)

  ### 룩북 텍스트 가독성 개선
  - `.hero-description`에 반투명 검정 그라데이션 배경 추가
  - text-shadow 3중 강화, font-weight 500, z-index 15

- 2024-12-11 (이전): 언어 파라미터 및 펌 레시피 RAG 검색 수정
  - **클라이언트 language 파라미터 우선 사용**: payload.language(ko/en/ja/zh/vi) → 서버에서 korean/english 등으로 매핑
  - **펌 레시피 RAG 검색 규칙 추가**: 시스템 프롬프트에 File Search 결과 우선 사용 지시
    - 로드 크기(mm), 와인딩 각도(천체축 각도), 섹션 방향, 존(Zone) 정보 등 구체적 수치 제공
    - 검색 결과 없으면 솔직하게 답변, 일반적인 추측 금지
- 2024-12-10: Vision 스타일 매칭 개선 및 이론 이미지 다중 반환
  - **Caption 기반 기법 매칭**: diagrams 메타데이터 대신 textRecipe/caption 텍스트 분석으로 변경
    - C존 키워드 직접 검색: 'c존', 'c zone', '오버존', 'internal' 등
    - 섹션 타입: '파이섹션', '대각', '수평', '수직' 한국어 키워드 매칭
    - 각도 추출: 정규식으로 'XX도' 패턴 분석하여 복잡도 판단
  - **여자 스타일**: Vision 60% + 캡션 기법 40% 가중치
  - **남자 스타일**: Vision 70% + 캡션 기법 30% 가중치 (남자는 외형 비교가 더 중요)
  - **이론 이미지 다중 반환**: detectTheoryImageForQuery가 최대 3개 이미지 배열 반환
    - "존별로 설명해줘" → Zone, A Zone & V Zone 이미지 함께 표시
    - 중복 term 제거 로직 추가
  - **A존/B존/C존 키워드 예외**: 2글자 이하 키워드 스킵에서 중요 키워드 예외 처리
  - **External/Internal 역할 구분 규칙**: 5개국어 RAG 시스템 프롬프트에 추가
    - External: 길이 설정, 아웃라인 형태, 하드한 질감 (Under Zone / A,B Zone)
    - Internal: 볼륨 형성, 윤곽 조절, 소프트한 질감 (Over Zone / C Zone)
    - 동일 기법이라도 영역별 "목적"을 다르게 설명하도록 지시
  - **보안 응답 메시지 수정**: 5개국어 모두 적용
    - "핵심 영업 기밀" → "핵심 보안 사항" 변경
    - "정규 교육과정에서만 배울 수 있습니다" 문구 제거
- 2024-12-09: 5개국어 RAG 시스템 프롬프트 완전 지원 추가
  - buildGeminiSystemPrompt에 일본어/중국어/베트남어 프롬프트 추가
  - 인사말/보안 응답 메시지 5개국어 지원
- 2024-12: File Search Store에 38개 문서 import 완료
- maxOutputTokens: 8000으로 증가
- 마크다운 금지 규칙 강화
- 이미지 매칭 로직 개선 (일반 키워드 제외)

## 핵심 함수 위치 (chatbot-api.js)
- `generateGeminiFileSearchResponse()`: 라인 ~2834 (비스트리밍 RAG 응답)
- `generateGeminiFileSearchResponseStream()`: 라인 ~2962 (스트리밍 RAG 응답)
- `buildGeminiSystemPrompt()`: 라인 ~2500 (5개국어 시스템 프롬프트)
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

### 현재 토큰 시스템 구조 (2025-12-23 업데이트)
- **불나비 DB `_users.tokenBalance`** 필드에 헤어게이터 토큰 저장
- `remainCount`는 불나비 기존 크레딧 (분리됨)
- bullnabi-proxy.js API 엔드포인트:
  - `getTokenBalance`: 토큰 잔액 조회
  - `setTokenBalance`: 토큰 잔액 설정 (관리자용)
  - `deductTokenBalance`: 토큰 차감
- 토큰 비용:
  - 룩북: 200 토큰
  - 헤어체험: 350 토큰
  - 챗봇: 10 토큰

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
