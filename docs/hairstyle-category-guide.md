# HAIRGATOR 헤어스타일 카테고리 가이드

이 문서는 HAIRGATOR 서비스의 헤어스타일 분류 체계를 설명합니다.
AI 시스템이나 새로운 개발자가 카테고리 구조를 이해할 수 있도록 작성되었습니다.

---

## 1. 카테고리 구조 개요

```
성별 (Gender)
  └── 대분류 (Main Category) - 헤어 길이 또는 스타일 유형
        └── 중분류 (Sub Category) - 앞머리 길이
              └── 개별 스타일 (Style)
```

---

## 2. 여성 스타일 (Female)

### 2.1 대분류: 길이 기준 (A~H Length)

헤어 길이를 신체 부위 기준으로 A부터 H까지 8단계로 분류합니다.
**A가 가장 길고, H가 가장 짧습니다.**

| 코드 | 이름 | 길이 기준 | 설명 | 스타일 ID 접두사 |
|------|------|-----------|------|------------------|
| **A** | A LENGTH | 가슴선 아래 ~ 허리 | 가장 긴 롱헤어. 원랭스, 레이어드 롱, 굵은 S컬이 어울림. 우아하고 드라마틱한 분위기 | FAL (커트), FALP (펌) |
| **B** | B LENGTH | 가슴 중간 | 미디엄-롱. 레이어드 미디엄롱, 바디펌 어울림. 부드럽고 실용적 | FBL, FBLP |
| **C** | C LENGTH | 쇄골 라인 아래 ~ 겨드랑이 | 세미 롱. 레이어드 C/S컬 어울림. 단정하고 세련된 오피스 무드 | FCL, FCLP |
| **D** | D LENGTH | 어깨선 정확히 닿는 길이 | 숄더 길이. 숄더 C컬 어울림. 트렌디하고 깔끔함 | FDL, FDLP |
| **E** | E LENGTH | 어깨 바로 위 | 단발. 클래식 보브, A라인 보브, 내/외 C컬 어울림. 경쾌하고 모던함 | FEL, FELP |
| **F** | F LENGTH | 턱선 바로 아래 | 보브 길이. 프렌치 보브, 일자 단발, 텍스쳐 보브 어울림. 시크하고 도회적 | FFL, FFLP |
| **G** | G LENGTH | 턱선 위 | 미니 보브. 클래식 턱선 보브, 미니 레이어 보브 어울림. 깔끔하고 미니멀함 | FGL, FGLP |
| **H** | H LENGTH | 귀선 ~ 베리숏 | 숏헤어. 픽시컷, 베리숏 등. 활동적이고 개성 있음 | FHL, FHLP |

#### 길이 시각화

```
A ─────────────────────────── 허리/가슴 하단 (가장 김)
B ─────────────────────── 가슴 중간
C ───────────────────── 쇄골 아래/겨드랑이
D ─────────────────── 어깨선
E ───────────────── 어깨 위
F ─────────────── 턱선 아래
G ───────────── 턱선 위
H ─────────── 귀선/베리숏 (가장 짧음)
```

### 2.2 스타일 ID 규칙 (여성)

```
F + [길이코드] + L + [번호 4자리]     → 커트 스타일
F + [길이코드] + LP + [번호 4자리]    → 펌 스타일

예시:
- FAL0001: A Length 커트 스타일 1번
- FALP0001: A Length 펌 스타일 1번
- FBL2003: B Length 커트 스타일 2003번
- FBLP2003: B Length 펌 스타일 2003번
```

---

## 3. 남성 스타일 (Male)

### 3.1 대분류: 스타일 유형 기준

남성은 길이가 아닌 **스타일/형태** 기준으로 7가지로 분류합니다.

| 코드 | 이름 | 설명 | 스타일 ID 접두사 |
|------|------|------|------------------|
| **SF** | SIDE FRINGE | 앞머리를 앞으로 내려 자연스럽게 흐르는 스타일. 넓은 이마/역삼각형 얼굴형 보완에 효과적. 부드럽고 감성적인 이미지 | SF |
| **SP** | SIDE PART | 가르마를 기준으로 나누는 스타일. 뒤로 넘기면 클래식, 내리면 캐주얼. 다양한 얼굴형에 무난하고 활용도 높음 | SP |
| **FU** | FRINGE UP | 윗머리는 앞으로 흐르고 앞머리 끝만 위로 올린 스타일. 이마를 적당히 드러내 시원하고 세련된 인상. 활동적이며 깔끔함 | FU |
| **PB** | PUSHED BACK | 모발 전체 흐름이 뒤쪽으로 자연스럽게 넘어가는 스타일. 이마를 드러내 단정, 클래식, 도회적 무드. 포멀 룩에 어울림 | PB |
| **BZ** | BUZZ | 가장 짧은 커트 스타일. 두상/윤곽이 그대로 드러남. 심플하고 군더더기 없는 이미지. 관리 매우 쉬움 | BZ |
| **CR** | CROP | 버즈보다 조금 더 긴 길이. 앞머리가 이마 상단을 가볍게 덮는 형태. 텍스처/볼륨 표현 가능. 트렌디하고 시크함 | CR |
| **MH** | MOHICAN | 탑(센터) 부분을 위쪽으로 세워 강조. 사이드가 상대적으로 짧아 코너 및 라인감이 또렷. 강한 개성, 에너지, 스트릿 무드 | MH |

### 3.2 스타일 ID 규칙 (남성)

```
[스타일코드] + [번호 4자리]

예시:
- SF0001: Side Fringe 스타일 1번
- SP1002: Side Part 스타일 1002번
- FU0003: Fringe Up 스타일 3번
- CR0005: Crop 스타일 5번
```

---

## 4. 중분류: 앞머리 길이 (Sub Category)

모든 스타일(남녀 공통)은 **앞머리 길이**에 따라 5가지로 세분화됩니다.

| 코드 | 이름 | 설명 |
|------|------|------|
| **N** | None | 앞머리 없음 (이마 완전 노출) |
| **FH** | Fore Head | 이마 중간 길이 앞머리 |
| **EB** | Eye Brow | 눈썹 라인 앞머리 |
| **E** | Eye | 눈 높이 앞머리 |
| **CB** | Cheekbone | 광대뼈 높이 앞머리 (긴 앞머리/사이드뱅) |

#### 앞머리 길이 시각화

```
이마 상단 ──┐
           │  FH (Fore Head)
           ├── ─ ─ ─ ─ ─ 눈썹
           │  EB (Eye Brow)
           ├── ─ ─ ─ ─ ─ 눈
           │  E (Eye)
           ├── ─ ─ ─ ─ ─ 광대뼈
           │  CB (Cheekbone)
           └── ─ ─ ─ ─ ─ 턱선

N = 앞머리 없음 (위 모든 범위가 노출)
```

---

## 5. Firestore 데이터 구조

### 5.1 컬렉션: `hairstyles`

```javascript
{
  styleId: "FAL0001",           // 고유 ID
  name: "Elegant Long Layer",   // 스타일 이름
  gender: "female",             // "male" 또는 "female"
  mainCategory: "A LENGTH",     // 대분류 (표시용 전체 이름)
  subCategory: "Eye Brow",      // 중분류 (앞머리 길이)
  type: "cut",                  // "cut" 또는 "perm"
  series: "FAL",                // 시리즈 코드
  resultImage: "https://...",   // 결과 이미지 URL
  diagrams: [...],              // 도해도 이미지 배열
  textRecipe: "...",            // 텍스트 레시피
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 5.2 컬렉션: `styles` (펌 레시피 전용)

```javascript
{
  styleId: "FALP0001",
  series: "FALP",
  seriesName: "A Length Perm",
  gender: "female",
  type: "perm",
  matchingCutStyle: "FAL0001",  // 매칭되는 커트 스타일
  diagrams: [...],
  textRecipe: "...",
  createdAt: Timestamp
}
```

---

## 6. 커트-펌 매칭 규칙

여성 스타일에서 커트와 펌은 다음 규칙으로 매칭됩니다:

```
커트 ID: F[길이]L[번호]
펌 ID:   F[길이]LP[번호]

예시:
FAL0001 ↔ FALP0001
FBL2003 ↔ FBLP2003
FCL1001 ↔ FCLP1001
```

- 커트 시리즈: FAL, FBL, FCL, FDL, FEL, FFL, FGL, FHL
- 펌 시리즈: FALP, FBLP, FCLP, FDLP, FELP, FFLP, FGLP, FHLP

---

## 7. 어드민 업로드 시 필수 입력값

| 필드 | 설명 | 예시 값 |
|------|------|---------|
| gender | 성별 | "male" 또는 "female" |
| mainCategory | 대분류 (전체 이름) | "A LENGTH", "SIDE PART" 등 |
| subCategory | 중분류 (앞머리 길이) | "None", "Fore Head", "Eye Brow", "Eye", "Cheekbone" |
| type | 커트/펌 구분 | "cut" 또는 "perm" |
| styleId | 고유 ID | 자동 생성 또는 수동 입력 |

---

## 8. 요약 테이블

### 여성 대분류 (길이 기준)

| 약어 | 전체 이름 | 기준 위치 | 시리즈 |
|------|----------|----------|--------|
| A | A LENGTH | 허리/가슴 하단 | FAL/FALP |
| B | B LENGTH | 가슴 중간 | FBL/FBLP |
| C | C LENGTH | 쇄골 아래 | FCL/FCLP |
| D | D LENGTH | 어깨선 | FDL/FDLP |
| E | E LENGTH | 어깨 위 | FEL/FELP |
| F | F LENGTH | 턱선 아래 | FFL/FFLP |
| G | G LENGTH | 턱선 위 | FGL/FGLP |
| H | H LENGTH | 귀선/베리숏 | FHL/FHLP |

### 남성 대분류 (스타일 기준)

| 약어 | 전체 이름 | 특징 |
|------|----------|------|
| SF | SIDE FRINGE | 앞머리 내림, 부드러운 이미지 |
| SP | SIDE PART | 가르마, 활용도 높음 |
| FU | FRINGE UP | 앞머리 끝 올림, 활동적 |
| PB | PUSHED BACK | 뒤로 넘김, 클래식/포멀 |
| BZ | BUZZ | 극단발, 심플 |
| CR | CROP | 버즈+α, 트렌디 |
| MH | MOHICAN | 센터 강조, 개성적 |

### 중분류 (앞머리 길이 - 남녀 공통)

| 약어 | 전체 이름 | 위치 |
|------|----------|------|
| N | None | 앞머리 없음 |
| FH | Fore Head | 이마 중간 |
| EB | Eye Brow | 눈썹 라인 |
| E | Eye | 눈 높이 |
| CB | Cheekbone | 광대뼈 높이 |

---

*마지막 업데이트: 2025-12-26*
