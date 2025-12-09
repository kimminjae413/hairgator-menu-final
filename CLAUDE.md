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

## 최근 작업 이력
- 2024-12: File Search Store에 38개 문서 import 완료
- maxOutputTokens: 8000으로 증가
- 마크다운 금지 규칙 강화
- 이미지 매칭 로직 개선 (일반 키워드 제외)
