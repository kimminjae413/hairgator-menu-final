// params56-schema.js
// HAIRGATOR 56개 파라미터 + 42개 포뮬러 Structured Output 스키마
// GPT-4o Function Calling용 JSON Schema 정의
// ✅ ULTIMATE VERSION - 42개 포뮬러 자동 매칭 포함!

/**
 * 🎯 2WAY CUT 시스템 전체 구조
 * 
 * 1. 56개 파라미터: 헤어스타일 분석
 * 2. 42개 포뮬러: 섹션별 커팅 기법 (크리스기 원장 독점)
 * 3. 9개 매트릭스: 형태 분류 (Triangular/Square/Round x Low/Medium/High)
 * 4. 얼굴형 추천: 6가지 얼굴형별 추천
 */

const PARAMS_56_PLUS_FORMULA_SCHEMA = {
  type: "object",
  properties: {
    // ===== 기본 정보 =====
    cut_category: {
      type: "string",
      enum: ["Women's Cut", "Men's Cut"],
      description: "Gender category"
    },
    
    // ===== 길이 (Length) - 8개 =====
    length_category: {
      type: "string",
      enum: [
        "A Length",  // 65cm - Below chest
        "B Length",  // 50cm - Mid chest
        "C Length",  // 40cm - Collarbone
        "D Length",  // 35cm - Shoulder line
        "E Length",  // 30cm - Above shoulder
        "F Length",  // 25cm - Below chin
        "G Length",  // 20cm - Jaw line
        "H Length"   // 15cm - Ear level
      ],
      description: "Overall length category based on body landmarks"
    },
    
    estimated_hair_length_cm: {
      type: "string",
      description: "Estimated hair length in cm (e.g., '35')"
    },
    
    front_length: {
      type: "string",
      enum: ["Very Short", "Short", "Medium", "Long", "Very Long"],
      description: "Front hair length"
    },
    
    back_length: {
      type: "string",
      enum: ["Very Short", "Short", "Medium", "Long", "Very Long"],
      description: "Back hair length"
    },
    
    side_length: {
      type: "string",
      enum: ["Very Short", "Short", "Medium", "Long", "Very Long"],
      description: "Side hair length"
    },
    
    // ===== 구조 (Structure) - 10개 =====
    cut_form: {
      type: "string",
      enum: [
        "O (One Length)",
        "G (Graduation)",
        "L (Layer)"
      ],
      description: "Cut form - must include parentheses"
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
      description: "Layer structure"
    },
    
    graduation_type: {
      type: "string",
      enum: ["None", "Light", "Medium", "Heavy"],
      description: "Graduation level"
    },
    
    weight_distribution: {
      type: "string",
      enum: ["Top Heavy", "Balanced", "Bottom Heavy"],
      description: "Weight distribution"
    },
    
    layer_type: {
      type: "string",
      enum: ["No Layer", "Low Layer", "Mid Layer", "High Layer", "Full Layer"],
      description: "Layer type"
    },
    
    // ===== 형태 (Shape) - 10개 =====
    silhouette: {
      type: "string",
      enum: ["Triangular", "Square", "Round"],
      description: "Overall silhouette shape (9-Matrix system)"
    },
    
    outline_shape: {
      type: "string",
      enum: ["Straight", "Curved", "Angular", "Irregular"],
      description: "Outline shape"
    },
    
    volume_zone: {
      type: "string",
      enum: ["Low", "Medium", "High"],
      description: "Volume zone (bottom/middle/top) - determines 9-Matrix classification"
    },
    
    volume_distribution: {
      type: "string",
      enum: ["Top", "Middle", "Bottom", "Even"],
      description: "Volume distribution"
    },
    
    line_quality: {
      type: "string",
      enum: ["Sharp", "Soft", "Blended", "Disconnected"],
      description: "Line quality"
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
      description: "Fringe type"
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
      description: "Fringe length"
    },
    
    fringe_texture: {
      type: "string",
      enum: ["Blunt", "Textured", "Wispy", "Choppy"],
      description: "Fringe texture"
    },
    
    // ===== 텍스처 (Texture) - 12개 =====
    surface_texture: {
      type: "string",
      enum: ["Smooth", "Textured", "Choppy", "Soft"],
      description: "Surface texture"
    },
    
    internal_texture: {
      type: "string",
      enum: ["Blunt", "Point Cut", "Slide Cut", "Razor Cut"],
      description: "Internal texture"
    },
    
    hair_density: {
      type: "string",
      enum: ["Thin", "Medium", "Thick"],
      description: "Hair density"
    },
    
    hair_texture: {
      type: "string",
      enum: ["Straight", "Wavy", "Curly", "Coily"],
      description: "Natural hair texture"
    },
    
    movement: {
      type: "string",
      enum: ["Static", "Slight", "Moderate", "High"],
      description: "Movement level"
    },
    
    texture_technique: {
      type: "string",
      enum: ["None", "Point Cut", "Slide Cut", "Razor", "Texturizing"],
      description: "Texturizing technique"
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
      description: "Primary sectioning direction"
    },
    
    lifting_range: {
      type: "array",
      items: {
        type: "string",
        enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"]
      },
      minItems: 1,
      maxItems: 9,
      description: "Lifting angle range in 22.5° increments (array format)"
    },
    
    direction_primary: {
      type: "string",
      enum: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"],
      description: "Primary cutting direction in 22.5° increments"
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
      description: "Cutting method"
    },
    
    styling_method: {
      type: "string",
      enum: ["Blow Dry", "Natural Dry", "Iron", "Curl", "Wave"],
      description: "Styling method"
    },
    
    design_emphasis: {
      type: "string",
      enum: ["Volume", "Length", "Texture", "Shape", "Movement"],
      description: "Design emphasis"
    },
    
    weight_flow: {
      type: "string",
      enum: ["Balanced", "Forward Weighted", "Backward Weighted"],
      description: "Weight flow"
    },
    
    connection_type: {
      type: "string",
      enum: ["Connected", "Disconnected", "Semi-Connected"],
      description: "Connection type"
    },
    
    // ===== 여성/남성 카테고리 =====
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
      description: "Women's cut category (if Women's Cut)"
    },
    
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
      description: "Men's cut category (if Men's Cut)"
    },
    
    // ===== 🔥🔥🔥 42개 포뮬러 자동 매칭 (신규!) 🔥🔥🔥 =====
    formula_42_codes: {
      type: "array",
      items: {
        type: "string",
        enum: [
          // 가로섹션 (Horizontal Section) - 2개
          "HS NO.1",  // 상단 가로섹션 기본
          "HS NO.2",  // 상단 가로섹션 응용
          
          // 후대각섹션 (Diagonal Backward Section) - 9개
          "DBS NO.1",  // 후방 대각선 기본 (낮은 각도)
          "DBS NO.2",  // 후방 대각선 (중간 각도)
          "DBS NO.3",  // 후방 대각선 (높은 각도) - 가장 흔함
          "DBS NO.4",  // 후방 대각선 + 레이어
          "DBS NO.5",  // 후방 대각선 + 그래쥬에이션
          "DBS NO.6",  // 후방 대각선 + 높은 볼륨
          "DBS NO.7",  // 후방 대각선 + 연결
          "DBS NO.8",  // 후방 대각선 응용
          "DBS NO.9",  // 후방 대각선 고급
          
          // 전대각섹션 (Diagonal Forward Section) - 6개
          "DFS NO.1",  // 전방 대각선 기본
          "DFS NO.2",  // 전방 대각선 + 앞머리
          "DFS NO.3",  // 전방 대각선 + 사이드
          "DFS NO.4",  // 전방 대각선 + 레이어
          "DFS NO.5",  // 전방 대각선 응용
          "DFS NO.6",  // 전방 대각선 고급
          
          // 세로섹션 (Vertical Section) - 12개
          "VS NO.1",   // 세로섹션 기본 (중앙)
          "VS NO.2",   // 세로섹션 + 낮은 레이어
          "VS NO.3",   // 세로섹션 + 중간 레이어
          "VS NO.4",   // 세로섹션 + 높은 레이어
          "VS NO.5",   // 세로섹션 + 전체 레이어
          "VS NO.6",   // 세로섹션 + 높은 볼륨 - 흔함
          "VS NO.7",   // 세로섹션 + 사각 레이어
          "VS NO.8",   // 세로섹션 + 라운드 레이어
          "VS NO.9",   // 세로섹션 + 연결
          "VS NO.10",  // 세로섹션 응용
          "VS NO.11",  // 세로섹션 고급
          "VS NO.12",  // 세로섹션 마스터
          
          // 업스템 (UP STEM) - 9개
          "UP STEM NO.1",  // 정수리 기본
          "UP STEM NO.2",  // 정수리 + 낮은 각도
          "UP STEM NO.3",  // 정수리 + 중간 각도
          "UP STEM NO.4",  // 정수리 + 높은 각도
          "UP STEM NO.5",  // 정수리 + 최고 볼륨
          "UP STEM NO.6",  // 정수리 + 레이어 조합
          "UP STEM NO.7",  // 정수리 응용
          "UP STEM NO.8",  // 정수리 고급
          "UP STEM NO.9",  // 정수리 마스터
          
          // 네이프존 (NAPE ZONE) - 4개
          "NAPE ZONE NO.1",  // 목덜미 기본
          "NAPE ZONE NO.2",  // 목덜미 + 짧은 길이
          "NAPE ZONE NO.3",  // 목덜미 + 그래쥬에이션
          "NAPE ZONE NO.4"   // 목덜미 응용
        ]
      },
      minItems: 1,
      maxItems: 5,
      description: `42 Formula Codes automatically matched based on hairstyle analysis.

🎯 MATCHING LOGIC:

**Section Primary determines base formula:**
- Horizontal → HS (Horizontal Section)
- Diagonal-Backward → DBS (most common for bobs)
- Diagonal-Forward → DFS (fringe area)
- Vertical → VS (layered styles)

**Volume Zone refines the selection:**
- Low Volume (0-44°) → NO.1, NO.2 (lower numbers)
- Medium Volume (45-89°) → NO.3, NO.4, NO.5
- High Volume (90°+) → NO.6, NO.7, NO.8, NO.9

**Additional formulas:**
- UP STEM: If High Volume + Top emphasis
- NAPE ZONE: If Short length (G/H) + Back area

**Example combinations:**
1. D Length + Diagonal-Backward + Medium Volume → ["DBS NO.3"]
2. E Length + Layer + High Volume → ["VS NO.6", "UP STEM NO.4"]
3. H Length + Short Bob + Low Volume → ["DBS NO.1", "NAPE ZONE NO.2"]

Select 1-5 most relevant formulas!`
    },
    
    // ===== 9개 매트릭스 코드 =====
    matrix_code: {
      type: "string",
      enum: [
        "TL",  // Triangular + Low Volume
        "TM",  // Triangular + Medium Volume
        "TH",  // Triangular + High Volume
        "SL",  // Square + Low Volume
        "SM",  // Square + Medium Volume
        "SH",  // Square + High Volume
        "RL",  // Round + Low Volume
        "RM",  // Round + Medium Volume
        "RH"   // Round + High Volume
      ],
      description: `9-Matrix Code: Silhouette (T/S/R) + Volume Zone (L/M/H)
      
Automatically calculated from:
- silhouette: Triangular / Square / Round
- volume_zone: Low / Medium / High

Example: Triangular + Medium = "TM"`
    },
    
    // ===== 얼굴형 추천 =====
    face_shape_match: {
      type: "array",
      items: {
        type: "string",
        enum: ["Oval", "Round", "Square", "Heart", "Long", "Diamond"]
      },
      minItems: 1,
      maxItems: 3,
      description: `Suitable face shapes for this hairstyle (1-3 selections)

🎯 MATCHING CRITERIA:

**Oval (계란형):** Almost all styles work
- Select if: Balanced style, no extreme features

**Round (둥근형):** Needs vertical lines, side volume
- Select if: Layer + Side volume + Medium/High volume

**Square (사각형):** Needs soft waves, side bangs
- Select if: Soft texture + Side bang + Curved outline

**Heart (하트형):** Needs jaw coverage, side volume
- Select if: F/E Length + Side volume + Jaw area coverage

**Long (긴 얼굴형):** Needs horizontal volume, side bangs
- Select if: Middle volume + Side bang + Horizontal emphasis

**Diamond (다이아몬드형):** Needs cheekbone coverage
- Select if: Side coverage + Soft curves + Medium length`
    },
    
    // ===== 펌/컬 (옵션) =====
    curl_pattern: {
      type: ["string", "null"],
      enum: ["C-Curl", "CS-Curl", "S-Curl", "SS-Curl", null],
      description: "Curl pattern (null if none)"
    },
    
    curl_strength: {
      type: ["string", "null"],
      enum: ["Soft", "Medium", "Strong", null],
      description: "Curl strength (null if none)"
    },
    
    perm_type: {
      type: ["string", "null"],
      enum: ["Wave Perm", "Digital Perm", "Heat Perm", "Iron Perm", null],
      description: "Perm type (null if none)"
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
    "formula_42_codes",  // ⭐ 42개 포뮬러 필수!
    "matrix_code",       // ⭐ 9개 매트릭스 필수!
    "face_shape_match"
  ],
  
  additionalProperties: false
};

// CommonJS export (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PARAMS_56_PLUS_FORMULA_SCHEMA
  };
}

// ES6 export (브라우저)
if (typeof window !== 'undefined') {
  window.PARAMS_56_PLUS_FORMULA_SCHEMA = PARAMS_56_PLUS_FORMULA_SCHEMA;
}
