# HAIRGATOR 챗봇 - Claude 작업 가이드

## 핵심 아키텍처 (절대 잊지 말 것!)

### RAG 시스템
- **Gemini File Search API** 사용
- Store ID: `fileSearchStores/hairgator-theory-final-2025-kkb6n1ftfbf2`
- **43개 문서**, 524MB (영구 저장됨)
- 업로드된 자료: 이론 PDF 38개 + 펌 레시피 자막 4개 + 커트 레시피 자막 1개(138개 병합)

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

## 최근 작업 이력
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
