# Firestore 스키마 설계

## 컬렉션: `hairStyles`

문서 ID: `{styleId}` (예: FAL0001, FBL1001)

### 문서 구조

```javascript
{
  // 기본 정보
  styleId: "FAL0001",
  series: "FAL",

  // 기장 정보
  length: {
    code: "A",           // A~H
    ko: "숏",
    en: "SHORT",
    order: 1             // 정렬용 (1=SHORT ~ 8=EXTRA_LONG)
  },

  // 형태 정보
  shape: {
    ko: "원랭스",
    en: "ONE_LENGTH"
  } | null,

  // 질감
  texture: {
    ko: "위빙",
    en: "WEAVING"
  } | null,

  // 앞머리
  bangs: {
    ko: "시스루뱅",
    en: "SEE_THROUGH"
  } | null,

  // 난이도
  difficulty: {
    ko: "보통",
    en: "MEDIUM"
  } | null,

  // 자막 (커트 기술 설명)
  caption: "가로섹션을 이용하여 진행한다...",

  // 파일 정보
  files: {
    result: "아트보드 – 28.png",
    diagrams: ["SR_FAL0001_01.png", "SR_FAL0001_02.png", ...],
    caption: "FAL0001(자막).txt"
  },

  // GCS 공개 URL
  gcsUrls: {
    result: "https://storage.googleapis.com/hairgator-styles/FAL/FAL0001/아트보드 – 28.png",
    diagrams: [
      "https://storage.googleapis.com/hairgator-styles/FAL/FAL0001/SR_FAL0001_01.png",
      ...
    ]
  },

  // Gemini 임베딩 (768차원 벡터)
  embedding: [0.123, -0.456, ...] | null,

  // 메타데이터
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 인덱스 설계

### 단일 필드 인덱스 (자동)
- `styleId` - 문서 ID로 사용
- `series` - 시리즈별 필터링
- `length.en` - 기장별 필터링
- `shape.en` - 형태별 필터링

### 복합 인덱스
```
컬렉션: hairStyles
필드:
  - length.order (오름차순)
  - shape.en (오름차순)
```

## 사용 예시

### 모든 스타일 조회
```javascript
const styles = await db.collection('hairStyles').get();
```

### 기장별 필터링
```javascript
const shortStyles = await db.collection('hairStyles')
  .where('length.en', '==', 'SHORT')
  .get();
```

### 시리즈별 조회
```javascript
const falStyles = await db.collection('hairStyles')
  .where('series', '==', 'FAL')
  .get();
```

### 유사 스타일 검색 (임베딩 기반)
클라이언트에서 코사인 유사도 계산 또는
Firebase Extensions의 Vector Search 사용
