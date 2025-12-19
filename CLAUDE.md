# HAIRGATOR 챗봇 - Claude 작업 가이드

## 핵심 아키텍처 (절대 잊지 말 것!)

### RAG 시스템
- **Gemini File Search API** 사용
- Store ID: `fileSearchStores/hairgator-theory-final-2025-kkb6n1ftfbf2`
- **46개 문서**, 524MB (영구 저장됨)
- 업로드된 자료:
  - 이론 PDF 38개
  - 펌 레시피 자막 4개
  - 커트 레시피 자막 1개(138개 병합)
  - **헤어 용어 사전(hair_diagram_glossary.txt)**: 도해도 기호, 두상 포인트, 커트 테크닉, 펌/염색 용어
  - **기초학 개론(hair_basic_science.txt)**: 모발학, 케미컬, 두피학, 색채학, 소독학
  - **헤어케어 제품 가이드(hair_care_products_guide.txt)**: 트리트먼트/린스/컨디셔너 차이, 카티온 계면활성제 작용, FAQ (2025-12-19 추가)

### Firestore
- 컬렉션: `theory_indexes` - 키워드 매칭 + 이미지 URL 저장 (커트 164개 + 펌 46개 = 210개)
- 컬렉션: `styles` - 레시피 도해도 이미지
- 컬렉션: `recipe_samples` - 벡터 검색용 레시피

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

## 최근 작업 이력
- 2025-12-19: RAG 헤어케어 제품 가이드 추가 + 히스토리 이미지 영구 저장

  ### RAG 헤어케어 제품 가이드 추가
  - **문서**: `hair_care_products_guide.txt` - 트리트먼트/린스/컨디셔너 차이 가이드
  - **내용**: 카티온 계면활성제 작용 원리, 손상별 제품 선택, FAQ 6개
  - **업로드 스크립트**: `scripts/upload-hair-care-guide.py`
  - **Store**: fileSearchStores/hairgator-theory-final-2025-kkb6n1ftfbf2 (46개 문서)

  ### 히스토리 이미지 Firebase Storage 저장
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

### GPT 사용 현황
- **현재 거의 미사용** (레거시 코드만 남아있음)
- 메인 플로우 전부 Gemini로 처리

## 요금제 설계 (2025-12-18 확정)

### 기능별 API 비용 (1회당)

| 기능 | 사용 기술 | 원가 |
|------|----------|------|
| 스타일메뉴 | Firebase Storage (정적) | **0원** |
| AI퍼스널분석 | MediaPipe (클라이언트) | **0원** |
| 드레이프모드 | MediaPipe (클라이언트) | **0원** |
| 챗봇 | Gemini 2.5 Flash RAG | **~7.5원** |
| 룩북 | 2.0 Flash Vision + 이미지 3장 | **~160원** |
| 헤어체험 | vModel + Gemini 3 Pro Image | **~235원** |

### API 가격 참고 (2025년 12월 기준)

| 모델 | 입력 (1M 토큰) | 출력 (1M 토큰) |
|------|---------------|----------------|
| Gemini 2.0 Flash | $0.10 | $0.40 |
| Gemini 2.5 Flash | $0.30 | $2.50 |
| Gemini 2.5 Flash Image | - | $0.039/장 |
| Gemini 3 Pro Image | - | $0.134/장 |
| vModel Hair Swap | ~$0.04/회 | - |

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
| 챗봇 | 10 |
| 룩북 | 200 |
| 헤어체험 | 300 |

**요금제별 크레딧 배분:**

| 요금제 | 월 크레딧 | 최악 원가 | 확정 이익 | 마진 | 챗봇 |
|--------|----------|----------|----------|------|------|
| 무료 | 300 | 235원 | -235원 | - | ❌ 비활성화 |
| 22,000원 | 10,000 | 7,800원 | **14,200원** | 65% | ✅ |
| 38,000원 | 16,000 | 12,500원 | **25,500원** | 67% | ✅ |
| 50,000원 | 22,000 | 17,200원 | **32,800원** | 66% | ✅ |

**추가 크레딧 구매:**
- 크레딧 소진 시 "추가 크레딧 구매" 팝업
- 5,000 크레딧 = 5,000원

### 개선 필요 사항
1. **무료 → 유료 전환 퍼널**: 무료에서 챗봇 완전 차단보다 하루 3회 정도 열어주고 유료 유도 검토
2. **상위 요금제 메리트**: 보너스 크레딧이나 독점 기능 추가 검토
