// params56-schema.js
// HAIRGATOR 56개 파라미터 Structured Output 스키마
// Gemini API용 JSON Schema 정의

/**
 * 56개 파라미터 JSON Schema
 * Gemini Structured Output에서 사용
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
          "L0",  // 0°
          "L1",  // 22.5°
          "L2",  // 45°
          "L3",  // 67.5°
          "L4",  // 90°
          "L5",  // 112.5°
          "L6",  // 135°
          "L7",  // 157.5°
          "L8"   // 180°
        ]
      },
      minItems: 1,
      maxItems: 9,
      description: "리프팅 각도 범위 (배열로 반환)"
    },
    
    direction_primary: {
      type: "string",
      enum: [
        "D0",  // 정면
        "D1",  // 전방 22.5°
        "D2",  // 전방 45°
        "D3",  // 전방 67.5°
        "D4",  // 정후방 90°
        "D5",  // 후방 67.5°
        "D6",  // 후방 45°
        "D7",  // 후방 22.5°
        "D8"   // 정후방 180°
      ],
      description: "주요 커팅 방향"
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
    "volume_zone"
  ]
};

// CommonJS export (Node.js)
module.exports = {
  PARAMS_56_SCHEMA
};
