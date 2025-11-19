// params56-schema.js
// HAIRGATOR 56개 파라미터 Structured Output 스키마
// Gemini API용 JSON Schema 정의
// ✅ FINAL VERSION - 얼굴형 추천 필드 추가

/**
 * 56개 파라미터 + 얼굴형 추천 JSON Schema
 * Gemini Structured Output에서 사용
 * 
 * 🎯 얼굴형 분류 (프로젝트 3_face_design.pdf 기준):
 * - Oval (계란형) : 이상적 비율, 부드러운 턱선 → 대부분의 스타일 잘 어울림
 * - Round (둥근형) : 부드러운 곡선, 폭과 길이 비슷 → 사이드 볼륨, 레이어
 * - Square (사각형) : 각진 턱선, 강한 인상 → 부드러운 웨이브, 사이드뱅
 * - Heart (하트형) : 넓은 이마, 뾰족한 턱 → 턱선 커버, 사이드 볼륨
 * - Long (긴 얼굴형) : 세로가 가로보다 긴 비율 → 중간 볼륨, 사이드뱅
 * - Diamond (다이아몬드형) : 넓은 광대, 좁은 이마와 턱 → 광대 커버
 */
const PARAMS_56_SCHEMA = {
  type: "object",
  properties: {
    // ===== 기본 정보 =====
    cut_category: {
      type: "string",
      enum: ["Women's Cut", "Men's Cut"],
      description: "성별 카테고리"
    },
    
    // ===== 길이 (Length) - 8개 =====
    length_category: {
      type: "string",
      enum: [
        "A Length",  // 65cm - 가슴 아래
        "B Length",  // 50cm - 가슴 중간
        "C Length",  // 40cm - 쇄골 밑선
        "D Length",  // 35cm - 어깨선 (어깨에 닿음)
        "E Length",  // 30cm - 어깨 위 (공간 있음)
        "F Length",  // 25cm - 턱선 밑
        "G Length",  // 20cm - 턱선
        "H Length"   // 15cm - 귀 중간
      ],
      description: "전체 길이 카테고리 (신체 랜드마크 기준)"
    },
    
    estimated_hair_length_cm: {
      type: "string",
      description: "추정 헤어 길이 (cm 단위, 예: '35')"
    },
    
    front_length: {
      type: "string",
      enum: ["Very Short", "Short", "Medium", "Long", "Very Long"],
      description: "앞머리 길이"
    },
    
    back_length: {
      type: "string",
      enum: ["Very Short", "Short", "Medium", "Long", "Very Long"],
      description: "뒷머리 길이"
    },
    
    side_length: {
      type: "string",
      enum: ["Very Short", "Short", "Medium", "Long", "Very Long"],
      description: "옆머리 길이"
    },
    
    // ===== 구조 (Structure) - 10개 =====
    cut_form: {
      type: "string",
      enum: [
        "O (One Length)",    // 원렝스 - 모든 머리카락 같은 길이
        "G (Graduation)",    // 그래쥬에이션 - 외곽 짧고 내부 김
        "L (Layer)"          // 레이어 - 층을 두어 자름
      ],
      description: "커트 형태 - 반드시 괄호 포함 형식"
    },
    
    structure_layer: {
      type: "string",
      enum: [
        "No Layer",
        "Low Layer",
        "Mid Layer", 
        "High Layer",
        "Full Layer",
        "Square Layer",
        "Round Layer",
        "Graduated Layer"
      ],
      description: "레이어 구조"
    },
    
    graduation_type: {
      type: "string",
      enum: ["None", "Light", "Medium", "Heavy"],
      description: "그래쥬에이션 정도"
    },
    
    weight_distribution: {
      type: "string",
      enum: ["Top Heavy", "Balanced", "Bottom Heavy"],
      description: "무게 분포"
    },
    
    layer_type: {
      type: "string",
      enum: ["No Layer", "Low Layer", "Mid Layer", "High Layer", "Full Layer"],
      description: "레이어 타입"
    },
    
    // ===== 형태 (Shape) - 10개 =====
    silhouette: {
      type: "string",
      enum: ["Triangular", "Square", "Round"],
      description: "실루엣 형태 (9개 매트릭스)"
    },
    
    outline_shape: {
      type: "string",
      enum: ["Straight", "Curved", "Angular", "Irregular"],
      description: "아웃라인 형태"
    },
    
    volume_zone: {
      type: "string",
      enum: ["Low", "Medium", "High"],
      description: "볼륨 영역 (하단/중간/상단)"
    },
    
    volume_distribution: {
      type: "string",
      enum: ["Top", "Middle", "Bottom", "Even"],
      description: "볼륨 분포"
    },
    
    line_quality: {
      type: "string",
      enum: ["Sharp", "Soft", "Blended", "Disconnected"],
      description: "라인 품질"
    },
    
    // ===== 앞머리 (Fringe) - 5개 =====
    fringe_type: {
      type: "string",
      enum: [
        "Full Bang",
        "See-through Bang",
        "Side Bang",
        "Center Part",
        "No Fringe"
      ],
      description: "앞머리 타입"
    },
    
    fringe_length: {
      type: "string",
      enum: [
        "Forehead",
        "Eyebrow",
        "Eye",
        "Cheekbone",
        "Lip",
        "Chin",
        "None"
      ],
      description: "앞머리 길이"
    },
    
    fringe_texture: {
      type: "string",
      enum: ["Blunt", "Textured", "Wispy", "Choppy"],
      description: "앞머리 질감"
    },
    
    // ===== 텍스처 (Texture) - 12개 =====
    surface_texture: {
      type: "string",
      enum: ["Smooth", "Textured", "Choppy", "Soft"],
      description: "표면 질감"
    },
    
    internal_texture: {
      type: "string",
      enum: ["Blunt", "Point Cut", "Slide Cut", "Razor Cut"],
      description: "내부 질감"
    },
    
    hair_density: {
      type: "string",
      enum: ["Thin", "Medium", "Thick"],
      description: "모발 밀도"
    },
    
    hair_texture: {
      type: "string",
      enum: ["Straight", "Wavy", "Curly", "Coily"],
      description: "모발 질감 (자연 상태)"
    },
    
    movement: {
      type: "string",
      enum: ["Static", "Slight", "Moderate", "High"],
      description: "움직임 정도"
    },
    
    texture_technique: {
      type: "string",
      enum: ["None", "Point Cut", "Slide Cut", "Razor", "Texturizing"],
      description: "텍스처 기법"
    },
    
    // ===== 기술 (Technique) - 16개 =====
    section_primary: {
      type: "string",
      enum: [
        "Horizontal",
        "Vertical",
        "Diagonal-Forward",
        "Diagonal-Backward"
      ],
      description: "주요 섹션 방향"
    },
    
    lifting_range: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "L0",  // 0° - 자연 낙하
          "L1",  // 22.5° - 약간 들어올림
          "L2",  // 45° - 중간 들어올림
          "L3",  // 67.5° - 중강 들어올림
          "L4",  // 90° - 수직
          "L5",  // 112.5° - 역방향 시작
          "L6",  // 135° - 역방향
          "L7",  // 157.5° - 강한 역방향
          "L8"   // 180° - 완전 역방향
        ]
      },
      minItems: 1,
      maxItems: 9,
      description: "리프팅 각도 범위 (22.5도 단위, 배열로 반환)"
    },
    
    direction_primary: {
      type: "string",
      enum: [
        "D0",  // 0° - 정면
        "D1",  // 22.5° - 전방
        "D2",  // 45° - 전방
        "D3",  // 67.5° - 전방
        "D4",  // 90° - 측면
        "D5",  // 112.5° - 후방
        "D6",  // 135° - 후방
        "D7",  // 157.5° - 후방
        "D8"   // 180° - 정후방
      ],
      description: "주요 커팅 방향 (22.5도 단위)"
    },
    
    cutting_method: {
      type: "string",
      enum: [
        "Blunt Cut",
        "Point Cut",
        "Slide Cut",
        "Stroke Cut",
        "Razor Cut"
      ],
      description: "커팅 기법"
    },
    
    styling_method: {
      type: "string",
      enum: ["Blow Dry", "Natural Dry", "Iron", "Curl", "Wave"],
      description: "스타일링 방법"
    },
    
    design_emphasis: {
      type: "string",
      enum: ["Volume", "Length", "Texture", "Shape", "Movement"],
      description: "디자인 강조점"
    },
    
    // ===== 무게와 연결 =====
    weight_flow: {
      type: "string",
      enum: ["Balanced", "Forward Weighted", "Backward Weighted"],
      description: "무게 흐름"
    },
    
    connection_type: {
      type: "string",
      enum: ["Connected", "Disconnected", "Semi-Connected"],
      description: "연결 타입"
    },
    
    // ===== 여성 전용 카테고리 (조건부) =====
    womens_cut_category: {
      type: "string",
      enum: [
        "Long Straight",
        "Long Wave", 
        "Long Curl",
        "Medium Straight",
        "Medium Wave",
        "Medium Curl",
        "Short Bob",
        "Short Pixie",
        "Shoulder Length"
      ],
      description: "여성 커트 카테고리 (Women's Cut일 때만)"
    },
    
    // ===== 남성 전용 카테고리 (조건부) =====
    mens_cut_category: {
      type: "string",
      enum: [
        "Side Fringe",
        "Side Part",
        "Fringe Up",
        "Pushed Back",
        "Buzz",
        "Crop",
        "Mohican"
      ],
      description: "남성 커트 카테고리 (Men's Cut일 때만)"
    },
    
    // ===== ⭐ 얼굴형 추천 (FACE SHAPE MATCH) - 신규 추가! ⭐ =====
    face_shape_match: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "Oval",      // 계란형 - 이상적 비율, 대부분 스타일 잘 어울림
          "Round",     // 둥근형 - 사이드 볼륨, 레이어로 갸름하게
          "Square",    // 사각형 - 부드러운 웨이브, 사이드뱅으로 각 완화
          "Heart",     // 하트형 - 턱선 커버, 사이드 볼륨
          "Long",      // 긴 얼굴형 - 중간 볼륨, 사이드뱅으로 비율 조정
          "Diamond"    // 다이아몬드형 - 광대 커버, 부드러운 라인
        ]
      },
      minItems: 1,
      maxItems: 3,
      description: `이 헤어스타일이 어울리는 얼굴형 (1~3개 선택)
      
분석 기준:
- Oval: 거의 모든 스타일 가능, 균형잡힌 헤어
- Round: 사이드 볼륨 있는 레이어, 세로 라인 강조
- Square: 부드러운 웨이브, 사이드뱅, 각진 라인 완화
- Heart: 턱선 커버하는 길이, 사이드 볼륨
- Long: 가로 볼륨 (Middle zone), 사이드뱅으로 시선 분산
- Diamond: 광대 커버, 부드러운 곡선 라인

선택 로직:
1. 레이어 스타일 → Oval, Round, Long 추천
2. 사이드뱅 → Square, Long, Heart 추천
3. 중간 볼륨 → Round, Long, Diamond 추천
4. 부드러운 웨이브 → Square, Heart 추천
5. 긴 길이 (A~D) → Oval, Long 추천
6. 짧은 길이 (E~H) → Oval, Heart, Diamond 추천`
    }
  },
  
  // ===== 필수 필드 =====
  required: [
    "cut_category",
    "length_category",
    "cut_form",
    "lifting_range",
    "section_primary",
    "fringe_type",
    "volume_zone",
    "face_shape_match"  // ⭐ 얼굴형 추천 필수!
  ]
};

// CommonJS export (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PARAMS_56_SCHEMA
  };
}

// ES6 export (브라우저)
if (typeof window !== 'undefined') {
  window.PARAMS_56_SCHEMA = PARAMS_56_SCHEMA;
}
