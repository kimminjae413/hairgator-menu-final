# HAIRGATOR 챗봇 - Claude 작업 가이드

## 핵심 아키텍처 (절대 잊지 말 것!)

### RAG 시스템
- **Gemini File Search API** 사용
- Store ID: `fileSearchStores/hairgator-theory-final-2025-kkb6n1ftfbf2`
- 38개 문서, 548MB (영구 저장됨)
- 업로드된 자료: 커트/펌/컬러/퍼스널 이론 PDF 전체

### Firestore
- 컬렉션: `theory_indexes` - 키워드 매칭 + 이미지 URL 저장
- 컬렉션: `styles` - 레시피 도해도 이미지
- 컬렉션: `recipe_samples` - 벡터 검색용 레시피

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
- `detectLanguage()` 함수: 사용자 입력 언어 자동 감지
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

## 최근 작업 이력
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
- `detectTheoryImageForQuery()`: 라인 ~3230 (이미지 매칭)
