// lib/schemas.js
// 2WAY CUT SYSTEM: 상세 스키마 명세 (Detailed Schema Specification)
// 파라미터 스키마 정의 (여자/남자 공통 + 개별)
/* eslint-disable no-unused-vars */
// 일부 변수는 스키마 문서화 목적으로 선언됨

// ==================== 1. 공통 변수 정의 (Global Variables) ====================
// 모든 커트 모듈에서 공통적으로 호출되는 파라미터

const GLOBAL_VARIABLES = {
  // 섹션 타입
  Section_Type: {
    type: "string",
    enum: ["Horizontal", "Vertical", "Diagonal_Fwd", "Diagonal_Bkwd", "Pie", "Radial"],
    description: "가로, 세로, 전대각, 후대각, 파이, 방사선"
  },
  // 천체 각도 (Celestial Angle)
  Celestial_Angle: {
    type: "integer",
    enum: [0, 15, 45, 75, 90, 135],
    description: "0=One Length, 15=Low Grad, 45=Medium Grad, 75=High Grad, 90=Layer, 135=High Layer"
  },
  // 두상 자세
  Head_Position: {
    type: "string",
    enum: ["Upright", "Tilt_15", "Tilt_30"],
    description: "정자세, 15도 숙임, 30도 숙임"
  },
  // 분배 (빗질 방향)
  Distribution: {
    type: "string",
    enum: ["Natural", "Perpendicular", "Variable", "Directional"],
    description: "자연빗질, 수직분배, 변이분배(빗질 각도 비틀기), 방향성 분배"
  },
  // 가이드 라인 타입
  Guide_Line: {
    type: "string",
    enum: ["Fixed", "Traveling"],
    description: "고정(한곳으로 당김), 이동(가이드가 따라감)"
  },
  // 손가락 위치
  Finger_Position: {
    type: "string",
    enum: ["Parallel", "Non_Parallel"],
    description: "섹션과 평행, 섹션과 비평행"
  },
  // 방향 흐름
  Direction_Flow: {
    type: "string",
    enum: ["Out_to_In", "In_to_Out"],
    description: "바깥→안, 안→바깥"
  }
};

// ==================== 2. 두상 좌표 시스템 (Reference Points) ====================
// HairGator AI가 이미지 분석/도면 생성 시 매핑할 좌표

const REFERENCE_POINTS = {
  C_P: { name: "Center Point", description: "정중선 중심점" },
  T_P: { name: "Top Point", description: "정수리점" },
  G_P: { name: "Golden Point", description: "2WAY 볼륨 중심점 - 핵심 기준점" },
  B_P: { name: "Back Point", description: "후두부 돌출점" },
  N_P: { name: "Nape Point", description: "목덜미 중심점" },
  E_P: { name: "Ear Point", description: "귀 기준점" },
  F_S_P: { name: "Front Side Point", description: "앞 사이드 기준점" },
  S_P: { name: "Side Point", description: "사이드 중심점" },
  N_S_P: { name: "Neck Side Point", description: "목 옆점 - 오목함/볼륨 축소의 핵심 타겟" }
};

// 섹션 벡터 정의
const SECTIONING_VECTORS = {
  DFS_Vector: { from: "F_S_P", to: "N_P", description: "전대각 방향 벡터" },
  DBS_Vector: { from: "F_S_P", to: "B_P", description: "후대각 방향 벡터" },
  Pie_Vector: { center: "G_P", type: "radial_360", description: "G.P 중심 360도 방사형 벡터" }
};

// 무게감 영역 정의
const WEIGHT_ZONES = {
  Zone_A: { name: "Nape Zone", position: "Nape", description: "기초 무게감 (Foundation)" },
  Zone_B: { name: "Middle Zone", position: "Middle", description: "볼륨 형성 (Build-up)" },
  Zone_C: { name: "Top Zone", position: "Top", description: "표면 질감 및 율동감 (Movement)" }
};

// ==================== 3. 모듈별 로직 정의 ====================

// [Module A] 1WAY OUTLINE - 기초 라인 형성
const MODULE_A_OUTLINE = {
  // A-1. Square Outline
  Square: {
    steps: [
      { step: 1, name: "Initial", Head_Position: "Upright", Section: "Horizontal", Angle: 0, description: "기본 가이드" },
      { step: 2, name: "Nape", Head_Position: "Tilt_15", Angle: 0, Guide: "Fixed", description: "속머리 빠짐 방지" },
      { step: 3, name: "Middle", Head_Position: "Tilt_30", reference: "F_S_P", description: "F.S.P 기점부터 스퀘어 유지" },
      { step: 4, name: "Corner Check", Guide: "Round_Cross_Check", description: "양 끝 코너 제거" }
    ]
  },
  // A-2. CA (Celestial Axis) Variations
  CA_Variations: {
    CA_0: { Section: "Diagonal_Bkwd", Angle: 0, Guide: "Parallel", weight: "Maximum", description: "무게감 최대" },
    CA_45: { Section: "Diagonal_Bkwd", Angle: 45, Guide: "Fixed", weight: "Medium", description: "중간 무게감" },
    CA_75: { Section: "Diagonal_Bkwd", Angle: 75, Guide: "Fixed", weight: "Light", description: "가벼움" },
    CA_90: { Section: "Diagonal_Bkwd", Angle: 90, Guide: "Traveling", weight: "Minimum", description: "최대 가벼움/레이어" }
  },
  // Target Point 옵션
  Target_Points: ["E_P", "N_S_P"]
};

// [Module B] DIAGONAL FORWARD (전대각 프로파일) - 2Way Cut 핵심 엔진
const MODULE_B_DFS = {
  // DFS NO.1 - Low Graduation (15°)
  NO_1: {
    name: "Low Graduation",
    Section_Angle: 15,
    steps: [
      { step: 1, Section: "Horizontal", Angle: 0, description: "가이드 설정" },
      { step: 2, Section: "Diagonal_Fwd", Section_Angle: 15, description: "완만한 전대각으로 변경" },
      { step: 3, Distribution: "Variable", description: "변이 분배 - 빗질을 지면 수직에 가깝게 비틈" },
      { step: 4, Guide: "Traveling", description: "손가락 하나씩 이동, 변이 분배 유지" }
    ],
    result: { shape: "Concave", N_S_P: "오목하게 들어감", nape_line: "좁은 네이프 라인" }
  },
  // DFS NO.2 - Medium Graduation (45°)
  NO_2: {
    name: "Medium Graduation",
    Section_Angle: 45,
    steps: [
      { step: 1, Section: "Horizontal", Angle: 0, description: "NO.1과 동일하게 가이드 설정" },
      { step: 2, Section: "Diagonal_Fwd", Section_Angle: 45, description: "전대각 45도로 변경" },
      { step: 3, Distribution: ["Natural", "Perpendicular"], description: "자연→수직 혼합 분배" }
    ],
    result: { weight_line: "NO.1보다 위로 상승", shape: "이상적인 달걀형" }
  },
  // DFS NO.3 - High Graduation (75°)
  NO_3: {
    name: "High Graduation",
    Section_Angle: 75,
    steps: [
      { step: 1, Section: "Diagonal_Fwd", Section_Angle: 75, description: "가파른 전대각" },
      { step: 2, Distribution: ["Perpendicular", "Variable"], description: "수직→변이, 바깥쪽으로 많이 당겨 빗질" }
    ],
    result: { volume: "High", correction: "넓고 플랫한 두상 보정 효과 탁월" }
  },
  // 방향성 비교 (Comparison)
  Direction_Modes: {
    Out_to_In: {
      Direction_Flow: "Out_to_In",
      Distribution: "Variable",
      Shape: "Round",
      effect: { side: "Long 유지", nape: "타이트함 (Short)", forms: ["Form_A", "Form_B", "Form_C"] }
    },
    In_to_Out: {
      Direction_Flow: "In_to_Out",
      Distribution: "Perpendicular",
      effect: { side: "짧아짐", overall: "전체적으로 가벼움" }
    }
  },
  // 복합 알고리즘 (Combination)
  Combination: {
    description: "기장(Long/Med/Short)에 따라 NO.1, 2, 3을 섞어서 사용",
    algorithm: [
      { step: 1, technique: "DFS_NO_1", Distribution: "Perpendicular", purpose: "무게감 형성" },
      { step: 2, technique: "DFS_NO_2", Distribution: "Variable", purpose: "볼륨 이동" },
      { step: 3, technique: "DFS_NO_3", Section: "Pie", purpose: "상단부 연결" }
    ],
    progression: "Gradually - 점진적으로 각도를 들어올리며 진행"
  },
  // Over vs Under 길이 조절
  Length_Control: {
    Over_Direction: {
      Panel_Shift: "Backward",
      Cut_Line: ["Square", "A_Line"],
      result: "앞쪽이 길어짐 (Front Long)"
    },
    Under_Direction: {
      Finger_Shift: "Forward",
      result: "앞쪽이 짧아짐 (Round/Face-framing)"
    }
  }
};

// [Module C] DIAGONAL BACKWARD (후대각 프로파일) - 라운드/레이어
const MODULE_C_DBS = {
  // Round Graduation (NO.1 ~ NO.4)
  Round_Graduation: {
    NO_1: {
      name: "Basic Round Graduation",
      Section: "Diagonal_Bkwd",
      Angle: 75,
      Finger_Position: "Non_Parallel",
      description: "섹션과 비평행 - 상단을 더 짧게 자름"
    },
    NO_3: {
      name: "Disconnection",
      zones: {
        External: { Angle: 45, description: "무게감 존" },
        Internal: { Angle: 75, description: "가벼움 존" }
      },
      description: "두 구역의 각도를 다르게 입력하여 볼륨감 조절"
    },
    NO_4: {
      name: "High Elevation",
      zones: {
        Internal: { Angle: 135, description: "탑 부분 극대화된 볼륨" }
      }
    }
  },
  // Round Layer (NO.5 ~ NO.7)
  Round_Layer: {
    NO_5: {
      name: "Basic Round Layer",
      Angle_Sequence: [45, 90],
      description: "기본 라운드 레이어"
    },
    NO_6: {
      name: "Gradual Layer",
      Angle_Sequence: [45, 135, 112.5],
      description: "각도가 널뛰기하듯 변하며 층의 단차 형성",
      sequence_meaning: "Base(45°) → Top(135°) → Connect(112.5°)"
    },
    NO_7: {
      name: "Egg Shape Correction",
      focus: "N_S_P",
      technique: "Variable",
      Distribution: "Variable",
      description: "N.S.P의 튀어나온 볼륨을 깎아냄 (Slimming)"
    }
  }
};

// [Module D] VERTICAL (세로 섹션) - 율동감
const MODULE_D_VS = {
  NO_1: {
    name: "Heavy",
    Section: "Vertical",
    Line: "Square",
    Angle: 90,
    Guide: "Fixed",
    description: "고정 디자인 라인 - 층은 있지만 전체적인 실루엣은 무거움"
  },
  NO_2: {
    name: "Light",
    Section: "Vertical",
    Line: "Round",
    Angle: 90,
    Guide: "Traveling",
    description: "이동 디자인 라인 - 균일한 층, 가벼운 움직임"
  }
};

// ==================== 4. 여자 스타일 분석 파라미터 스키마 ====================
const FEMALE_PARAMS_SCHEMA = {
  type: "object",
  properties: {
    // === 기본 카테고리 ===
    cut_category: {
      type: "string",
      enum: ["Women's Cut"],
      description: "Gender category"
    },
    length_category: {
      type: "string",
      enum: ["A Length", "B Length", "C Length", "D Length", "E Length", "F Length", "G Length", "H Length"],
      description: "CRITICAL: A=below chest/waist, B=mid-chest(bra line), C=armpit, D=below shoulder ONLY, E=shoulder, F/G/H=short"
    },
    estimated_hair_length_cm: { type: "string", description: "Estimated hair length in cm" },
    front_length: { type: "string", enum: ["Very Short", "Short", "Medium", "Long", "Very Long"] },
    back_length: { type: "string", enum: ["Very Short", "Short", "Medium", "Long", "Very Long"] },
    side_length: { type: "string", enum: ["Very Short", "Short", "Medium", "Long", "Very Long"] },

    // === 컷 폼 & 구조 ===
    cut_form: { type: "string", enum: ["O (One Length)", "G (Graduation)", "L (Layer)"] },
    structure_layer: { type: "string", enum: ["No Layer", "Low Layer", "Mid Layer", "High Layer", "Full Layer", "Square Layer", "Round Layer", "Graduated Layer"] },
    graduation_type: { type: "string", enum: ["None", "Light", "Medium", "Heavy"] },
    graduation_angle: {
      type: "number",
      enum: [0, 15, 45, 75, 90],
      description: "Graduation angle: 0=One Length, 15=Low Grad, 45=Medium Grad, 75=High Grad, 90=Layer"
    },
    weight_distribution: { type: "string", enum: ["Top Heavy", "Balanced", "Bottom Heavy"] },
    layer_type: { type: "string", enum: ["No Layer", "Low Layer", "Mid Layer", "High Layer", "Full Layer"] },

    // === ⭐ 2WAY CUT 핵심 변수 (공통 변수) ===
    head_position: {
      type: "string",
      enum: ["Upright", "Tilt_15", "Tilt_30"],
      description: "두상 자세: 정자세, 15도 숙임, 30도 숙임"
    },
    distribution: {
      type: "string",
      enum: ["Natural", "Perpendicular", "Variable", "Directional"],
      description: "분배 방식: 자연빗질, 수직분배, 변이분배, 방향성 분배"
    },
    guide_line: {
      type: "string",
      enum: ["Fixed", "Traveling"],
      description: "가이드 라인: 고정(한곳으로 당김), 이동(가이드가 따라감)"
    },
    finger_position: {
      type: "string",
      enum: ["Parallel", "Non_Parallel"],
      description: "손가락 위치: 섹션과 평행, 섹션과 비평행"
    },
    direction_flow: {
      type: "string",
      enum: ["Out_to_In", "In_to_Out"],
      description: "방향 흐름: 바깥→안, 안→바깥"
    },

    // === ⭐ 3x3 매트릭스 관련 - 라인 형태 ===
    shape_of_line: {
      type: "string",
      enum: ["Triangular", "Square", "Round"],
      description: "Line shape for 3x3 matrix: Triangular(OG,GO,LO), Square(OL,GL,LG), Round(OGL,LGO,GOL)"
    },
    silhouette: {
      type: "string",
      enum: ["Graduation Silhouette", "Expanded Shape", "Combination"],
      description: "Overall silhouette type"
    },
    outline_shape: {
      type: "string",
      enum: ["Square", "Round", "Triangle"],
      description: "Outline shape: Square(사각), Round(둥근), Triangle(삼각)"
    },

    // === 볼륨 & 무게 ===
    volume_zone: { type: "string", enum: ["Low", "Medium", "High"] },
    volume_position: {
      type: "array",
      items: { type: "string", enum: ["Crown", "Top", "Side", "Back", "Nape", "Front", "Bang"] },
      description: "Volume position zones"
    },
    volume_distribution: { type: "string", enum: ["Top", "Middle", "Bottom", "Even"] },
    weight_line_position: { type: "string", enum: ["Nape", "Jaw", "Chin", "Shoulder", "Chest"] },
    weight_zone: {
      type: "string",
      enum: ["Zone_A", "Zone_B", "Zone_C"],
      description: "Zone_A=Nape(기초 무게감), Zone_B=Middle(볼륨 형성), Zone_C=Top(표면 질감/율동감)"
    },

    // === 라인 & 질감 ===
    line_quality: { type: "string", enum: ["Sharp", "Soft", "Blended", "Disconnected"] },
    fringe_type: { type: "string", enum: ["Full Bang", "See-through Bang", "Side Bang", "Center Part", "No Fringe"] },
    fringe_length: { type: "string", enum: ["Forehead", "Eyebrow", "Eye", "Cheekbone", "Lip", "Chin", "None"] },
    fringe_texture: { type: "string", enum: ["Blunt", "Textured", "Wispy", "Choppy"] },
    surface_texture: { type: "string", enum: ["Smooth", "Textured", "Choppy", "Soft"] },
    internal_texture: { type: "string", enum: ["Blunt", "Point Cut", "Slide Cut", "Razor Cut"] },

    // === 모발 특성 ===
    hair_density: { type: "string", enum: ["Thin", "Medium", "Thick"] },
    hair_texture: { type: "string", enum: ["Straight", "Wavy", "Curly", "Coily"] },
    movement: { type: "string", enum: ["Static", "Slight", "Moderate", "High"] },
    texture_technique: { type: "string", enum: ["None", "Point Cut", "Slide Cut", "Razor", "Texturizing"] },

    // === ⭐ 섹션 (Section) - 확장됨 ===
    section_type: {
      type: "string",
      enum: ["Horizontal", "Vertical", "Diagonal_Fwd", "Diagonal_Bkwd", "Pie", "Radial"],
      description: "섹션 타입: 가로, 세로, 전대각, 후대각, 파이, 방사선"
    },
    section_primary: {
      type: "string",
      enum: ["Horizontal", "Vertical", "Diagonal-Forward", "Diagonal-Backward", "Pie", "Radial", "Vertical+Horizontal", "Diagonal-Backward+Vertical"],
      description: "Primary section type"
    },
    section_angle: {
      type: "number",
      enum: [15, 45, 75],
      description: "섹션 각도: 15=Low, 45=Medium, 75=High (볼륨 위치 결정)"
    },
    section_by_zone: {
      type: "object",
      properties: {
        back: { type: "string" },
        side: { type: "string" },
        top: { type: "string" },
        fringe: { type: "string" }
      }
    },

    // === ⭐ 리프팅 & 각도 (Lifting & Angle) - 확장됨 ===
    lifting_range: {
      type: "array",
      items: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"] },
      minItems: 1, maxItems: 9,
      description: "Lifting codes: L0=0°, L1=22.5°, L2=45°, L3=67.5°, L4=90°, L5=112.5°, L6=135°, L7=157.5°, L8=180°"
    },
    lifting_degree: {
      type: "number",
      description: "Primary lifting angle in degrees (0, 15, 45, 75, 90, 135)"
    },
    celestial_angle: {
      type: "number",
      enum: [0, 15, 45, 75, 90, 135],
      description: "Celestial Angle: 0=One Length, 15=Low Grad, 45=Medium Grad, 75=High Grad, 90=Layer, 135=High Layer"
    },
    angle_sequence: {
      type: "array",
      items: { type: "number" },
      description: "각도 시퀀스 - 동적 각도 변화 (예: [45, 135, 112.5])"
    },

    // === 방향 & 기법 ===
    direction_primary: { type: "string", enum: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] },
    cutting_method: { type: "string", enum: ["Blunt Cut", "Point Cut", "Slide Cut", "Stroke Cut", "Razor Cut"] },
    styling_method: { type: "string", enum: ["Blow Dry", "Natural Dry", "Iron", "Curl", "Wave"] },
    design_emphasis: { type: "string", enum: ["Volume", "Length", "Texture", "Shape", "Movement"] },
    weight_flow: { type: "string", enum: ["Balanced", "Forward Weighted", "Backward Weighted"] },
    connection_type: { type: "string", enum: ["Connected", "Disconnected", "Semi-Connected"] },

    // === 스타일 카테고리 ===
    womens_cut_category: { type: "string", enum: ["Long Straight", "Long Wave", "Long Curl", "Medium Straight", "Medium Wave", "Medium Curl", "Short Bob", "Short Pixie", "Shoulder Length"] },
    face_shape_match: {
      type: "array",
      items: { type: "string", enum: ["Oval", "Round", "Square", "Heart", "Long", "Diamond"] },
      minItems: 1, maxItems: 3
    },

    // === 펌 관련 ===
    curl_pattern: { type: ["string", "null"], enum: ["C-Curl", "CS-Curl", "S-Curl", "SS-Curl", null] },
    curl_strength: { type: ["string", "null"], enum: ["Soft", "Medium", "Strong", null] },
    perm_type: { type: ["string", "null"], enum: ["Wave Perm", "Digital Perm", "Heat Perm", "Iron Perm", null] },

    // === ⭐ 두상 좌표 기준점 ===
    target_point: {
      type: "string",
      enum: ["C_P", "T_P", "G_P", "B_P", "N_P", "E_P", "F_S_P", "S_P", "N_S_P"],
      description: "기준점: C.P(센터), T.P(정수리), G.P(골든포인트), B.P(백), N.P(네이프), E.P(귀), F.S.P(앞사이드), S.P(사이드), N.S.P(목옆점)"
    },
    focus_points: {
      type: "array",
      items: { type: "string", enum: ["C_P", "T_P", "G_P", "B_P", "N_P", "E_P", "F_S_P", "S_P", "N_S_P"] },
      description: "커트 시 집중할 기준점들"
    }
  },
  required: [
    "cut_category", "length_category", "cut_form", "lifting_range",
    "section_primary", "fringe_type", "volume_zone", "shape_of_line",
    "outline_shape", "face_shape_match", "distribution", "guide_line"
  ]
};

// ==================== 5. 남자 파라미터 스키마 ====================
const MALE_PARAMS_SCHEMA = {
  type: "object",
  properties: {
    cut_category: {
      type: "string",
      enum: ["Men's Cut"],
      description: "Gender category"
    },
    style_category: {
      type: "string",
      enum: ["SF", "SP", "FU", "PB", "BZ", "CP", "MC"],
      description: "Men's style category: SF=Side Fringe, SP=Side Part, FU=Fringe Up, PB=Pushed Back, BZ=Buzz, CP=Crop, MC=Mohican"
    },
    style_name: {
      type: "string",
      enum: ["Side Fringe", "Side Part", "Fringe Up", "Pushed Back", "Buzz Cut", "Crop Cut", "Mohican"],
      description: "Full style name"
    },
    // 길이 정보
    top_length: { type: "string", enum: ["Very Short", "Short", "Medium", "Long"] },
    side_length: { type: "string", enum: ["Skin Fade", "Very Short", "Short", "Medium"] },
    back_length: { type: "string", enum: ["Skin Fade", "Very Short", "Short", "Medium"] },
    fringe_length: { type: "string", enum: ["None", "Short", "Medium", "Long"] },
    // 페이드/테이퍼
    fade_type: { type: "string", enum: ["None", "Low Fade", "Mid Fade", "High Fade", "Skin Fade", "Taper"] },
    fade_height: { type: "string", enum: ["None", "Low", "Mid", "High"] },
    // 텍스처
    texture: { type: "string", enum: ["Smooth", "Textured", "Messy", "Spiky"] },
    volume: { type: "string", enum: ["Flat", "Low", "Medium", "High"] },
    // ⭐ 2WAY CUT 공통 변수
    head_position: {
      type: "string",
      enum: ["Upright", "Tilt_15", "Tilt_30"],
      description: "두상 자세"
    },
    distribution: {
      type: "string",
      enum: ["Natural", "Perpendicular", "Variable", "Directional"],
      description: "분배 방식"
    },
    guide_line: {
      type: "string",
      enum: ["Fixed", "Traveling"],
      description: "가이드 라인 타입"
    },
    // 섹션 & 기법
    section_type: {
      type: "string",
      enum: ["Horizontal", "Vertical", "Diagonal_Fwd", "Diagonal_Bkwd", "Pie", "Radial"],
      description: "섹션 타입"
    },
    section_primary: { type: "string", enum: ["HS", "VS", "DBS", "DFS", "RS", "PS"] },
    lifting_range: {
      type: "array",
      items: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"] },
      minItems: 1, maxItems: 5
    },
    celestial_angle: {
      type: "number",
      enum: [0, 15, 45, 75, 90, 135],
      description: "Celestial Angle"
    },
    direction_primary: { type: "string", enum: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] },
    cutting_method: { type: "string", enum: ["Clipper", "Scissors", "Point Cut", "Texturizing", "Razor"] },
    clipper_guard: { type: ["string", "null"], enum: ["0", "0.5", "1", "1.5", "2", "3", "4", null] },
    // 스타일링
    styling_direction: { type: "string", enum: ["Forward", "Backward", "Side", "Up"] },
    product_type: { type: "string", enum: ["None", "Wax", "Pomade", "Clay", "Gel"] },
    // 얼굴형
    face_shape_match: {
      type: "array",
      items: { type: "string", enum: ["Oval", "Round", "Square", "Heart", "Long", "Diamond"] },
      minItems: 1, maxItems: 3
    }
  },
  required: ["cut_category", "style_category", "style_name", "lifting_range", "section_primary", "face_shape_match"]
};

// ==================== 6. 스타일 카테고리 정보 ====================
const MALE_STYLE_CATEGORIES = {
  SF: { name: "Side Fringe", description: "앞머리를 앞으로 내려 자연스럽게 흐르는 스타일" },
  SP: { name: "Side Part", description: "가르마를 기준으로 나누는 스타일" },
  FU: { name: "Fringe Up", description: "앞머리 끝만 위로 올린 스타일" },
  PB: { name: "Pushed Back", description: "모발 전체가 뒤쪽으로 넘어가는 스타일" },
  BZ: { name: "Buzz Cut", description: "가장 짧은 남자 커트" },
  CP: { name: "Crop Cut", description: "버즈보다 조금 더 긴 트렌디한 스타일" },
  MC: { name: "Mohican", description: "센터 부분을 위쪽으로 세워 강조하는 스타일" }
};

const FEMALE_LENGTH_CATEGORIES = {
  A: { name: "A Length", description: "가슴 아래 밑선 (Long)" },
  B: { name: "B Length", description: "가슴 상단~중간 (Long)" },
  C: { name: "C Length", description: "쇄골 밑선 (Medium-Long)" },
  D: { name: "D Length", description: "어깨선 (Medium)" },
  E: { name: "E Length", description: "어깨 위 2-3cm (Medium-Short)" },
  F: { name: "F Length", description: "턱뼈 아래 (Short)" },
  G: { name: "G Length", description: "턱선 (Short)" },
  H: { name: "H Length", description: "귀 높이 (Very Short)" }
};

// ==================== 7. 9개 매트릭스 (3x3) 정의 ====================
const MATRIX_9 = {
  // Triangular (삼각형) 라인
  OG: { name: "Outline → Graduation", lineType: "Triangular", description: "아래 무거운 라인 + 위 그래쥬에이션" },
  GO: { name: "Graduation → Outline", lineType: "Triangular", description: "아래 그래쥬 + 위 무거운 라인" },
  LO: { name: "Layer → Outline", lineType: "Triangular", description: "아래 무거운 라인 + 위 레이어" },
  // Square (사각형) 라인
  OL: { name: "Outline → Layer", lineType: "Square", description: "아래 무거운 라인 + 위 레이어" },
  GL: { name: "Graduation → Layer", lineType: "Square", description: "아래 그래쥬 + 위 레이어" },
  LG: { name: "Layer → Graduation", lineType: "Square", description: "아래 레이어 + 위 그래쥬" },
  // Round (둥근) 라인
  OGL: { name: "Outline → Graduation → Layer", lineType: "Round", description: "3단 구조: 무거운→중간→가벼운" },
  LGO: { name: "Layer → Graduation → Outline", lineType: "Round", description: "3단 구조: 가벼운→중간→무거운" },
  GOL: { name: "Graduation → Outline → Layer", lineType: "Round", description: "3단 구조: 중간→무거운→가벼운" }
};

// ==================== 8. 매트릭스 결정 함수들 ====================

/**
 * 9개 매트릭스 결정 함수
 * @param {Object} params - 분석된 파라미터
 * @returns {string} 매트릭스 코드 (OG, GO, LO, OL, GL, LG, OGL, LGO, GOL)
 */
function selectMatrix(params) {
  const shapeOfLine = params.shape_of_line || params.silhouette || 'Round';
  const cutForm = params.cut_form || 'L (Layer)';
  const silhouette = params.silhouette || 'Combination';
  const graduationAngle = params.graduation_angle || params.celestial_angle || 45;

  // 1차: 라인 형태로 분류
  if (shapeOfLine === 'Triangular' || shapeOfLine.includes('Triangular')) {
    // OG, GO, LO 중 선택
    if (cutForm.includes('G') || cutForm.includes('Graduation')) return 'OG';
    if (cutForm.includes('L') || silhouette === 'Expanded Shape') return 'LO';
    return 'GO';
  }

  if (shapeOfLine === 'Square' || shapeOfLine.includes('Square')) {
    // OL, GL, LG 중 선택
    if (cutForm.includes('O') && cutForm.includes('L')) return 'OL';
    if (cutForm.includes('G') && cutForm.includes('L')) return 'GL';
    return 'LG';
  }

  if (shapeOfLine === 'Round' || shapeOfLine.includes('Round')) {
    // OGL, LGO, GOL 중 선택 - 무게감 흐름에 따라
    if (params.weight_distribution === 'Bottom Heavy') return 'OGL';
    if (params.weight_distribution === 'Top Heavy') return 'LGO';
    return 'GOL';
  }

  // 기본값
  return 'OGL';
}

/**
 * 섹션 타입 결정 함수
 * @param {Object} params - 분석된 파라미터
 * @returns {string} 섹션 타입 코드 (HS, VS, DFS, DBS, PS, RS)
 */
function determineSectionType(params) {
  const volumeZone = params.volume_zone || 'Medium';
  const volumePosition = params.volume_position || [];
  const sectionPrimary = params.section_primary || 'Diagonal-Backward';
  const sectionType = params.section_type || null;

  // section_type이 직접 지정된 경우
  if (sectionType) {
    const typeMap = {
      'Horizontal': 'HS',
      'Vertical': 'VS',
      'Diagonal_Fwd': 'DFS',
      'Diagonal_Bkwd': 'DBS',
      'Pie': 'PS',
      'Radial': 'RS'
    };
    if (typeMap[sectionType]) return typeMap[sectionType];
  }

  // volume_position 기반 결정
  if (volumePosition.includes('Top') || volumePosition.includes('Crown')) {
    return 'HS';  // 상단 볼륨 → 가로 섹션
  }
  if (volumePosition.includes('Front') || volumePosition.includes('Bang')) {
    return 'DFS'; // 앞쪽 볼륨 → 전대각 섹션
  }
  if (volumePosition.includes('Back') || volumePosition.includes('Nape')) {
    return 'DBS'; // 뒤쪽 볼륨 → 후대각 섹션
  }
  if (volumePosition.includes('Side')) {
    return 'VS';  // 사이드 → 세로 섹션
  }

  // section_primary 기반 결정
  if (sectionPrimary.includes('Horizontal')) return 'HS';
  if (sectionPrimary.includes('Diagonal-Forward')) return 'DFS';
  if (sectionPrimary.includes('Diagonal-Backward')) return 'DBS';
  if (sectionPrimary.includes('Vertical')) return 'VS';
  if (sectionPrimary.includes('Pie')) return 'PS';
  if (sectionPrimary.includes('Radial')) return 'RS';

  return 'DBS'; // 기본값
}

/**
 * DFS (전대각) 기법 번호 결정 - Module B 로직
 * @param {Object} params - 분석된 파라미터
 * @returns {Object} { number, name, distribution, description }
 */
function determineDFSTechnique(params) {
  const sectionAngle = params.section_angle || 45;
  const distribution = params.distribution || 'Natural';
  const directionFlow = params.direction_flow || null;

  // Section Angle 기반 NO. 결정 (15°, 45°, 75°)
  if (sectionAngle <= 15) {
    return {
      number: 1,
      name: "Low Graduation",
      Section_Angle: 15,
      Distribution: "Variable",
      description: "완만한 전대각, N.S.P 오목하게 들어감, 좁은 네이프 라인"
    };
  }
  if (sectionAngle <= 45) {
    return {
      number: 2,
      name: "Medium Graduation",
      Section_Angle: 45,
      Distribution: ["Natural", "Perpendicular"],
      description: "볼륨 포인트 상승, 이상적인 달걀형"
    };
  }
  if (sectionAngle <= 75) {
    return {
      number: 3,
      name: "High Graduation",
      Section_Angle: 75,
      Distribution: ["Perpendicular", "Variable"],
      description: "볼륨 High, 넓고 플랫한 두상 보정 효과"
    };
  }

  // 복합 섹션 체크
  if (params.section_primary?.includes('+')) {
    return {
      number: 4,
      name: "Combination",
      description: "복합 섹션 - 점진적 각도 변화"
    };
  }

  return {
    number: 5,
    name: "Advanced",
    description: "고급 전대각 기법"
  };
}

/**
 * DBS (후대각) 기법 번호 결정 - Module C 로직
 * @param {Object} params - 분석된 파라미터
 * @returns {Object} { number, name, angle, fingerPosition, description }
 */
function determineDBSTechnique(params) {
  const liftingDegree = params.lifting_degree || params.celestial_angle || 45;
  const layerType = params.layer_type || 'Mid Layer';
  const fingerPosition = params.finger_position || 'Parallel';
  const angleSequence = params.angle_sequence || null;

  // Round Graduation (NO.1 ~ NO.4)
  if (liftingDegree >= 75 && fingerPosition === 'Non_Parallel') {
    return {
      number: 1,
      name: "Basic Round Graduation",
      Angle: 75,
      Finger_Position: "Non_Parallel",
      description: "섹션과 비평행 - 상단을 더 짧게 자름"
    };
  }

  // Disconnection (NO.3) - 두 구역 각도 분리
  if (params.connection_type === 'Disconnected') {
    return {
      number: 3,
      name: "Disconnection",
      zones: { External: 45, Internal: 75 },
      description: "두 구역의 각도를 다르게 입력하여 볼륨감 조절"
    };
  }

  // High Elevation (NO.4)
  if (liftingDegree >= 135) {
    return {
      number: 4,
      name: "High Elevation",
      Angle: 135,
      description: "탑 부분 극대화된 볼륨"
    };
  }

  // Round Layer (NO.5 ~ NO.7)
  if (layerType.includes('Layer')) {
    // NO.6 - Gradual Layer with Angle Sequence
    if (angleSequence && angleSequence.length >= 3) {
      return {
        number: 6,
        name: "Gradual Layer",
        Angle_Sequence: angleSequence,
        description: "각도가 널뛰기하듯 변하며 층의 단차 형성"
      };
    }

    // NO.7 - Egg Shape Correction
    if (params.focus_points?.includes('N_S_P') || params.target_point === 'N_S_P') {
      return {
        number: 7,
        name: "Egg Shape Correction",
        focus: "N_S_P",
        Distribution: "Variable",
        description: "N.S.P의 튀어나온 볼륨을 깎아냄 (Slimming)"
      };
    }

    return {
      number: 5,
      name: "Basic Round Layer",
      description: "기본 라운드 레이어"
    };
  }

  // 기본 DBS
  if (liftingDegree <= 45) return { number: 2, name: "Low DBS", Angle: 45 };
  if (liftingDegree <= 75) return { number: 3, name: "Medium DBS", Angle: 75 };
  return { number: 4, name: "High DBS", Angle: 90 };
}

/**
 * VS (세로섹션) 기법 번호 결정 - Module D 로직
 * @param {Object} params - 분석된 파라미터
 * @returns {Object} { number, name, guide, line, description }
 */
function determineVSTechnique(params) {
  const guideLine = params.guide_line || 'Fixed';
  const liftingDegree = params.lifting_degree || 90;
  const outlineShape = params.outline_shape || 'Square';

  // NO.1 - Heavy (Fixed Guide)
  if (guideLine === 'Fixed') {
    return {
      number: 1,
      name: "Heavy",
      Section: "Vertical",
      Line: "Square",
      Angle: 90,
      Guide: "Fixed",
      description: "고정 디자인 라인 - 층은 있지만 실루엣은 무거움"
    };
  }

  // NO.2 - Light (Traveling Guide)
  if (guideLine === 'Traveling') {
    return {
      number: 2,
      name: "Light",
      Section: "Vertical",
      Line: "Round",
      Angle: 90,
      Guide: "Traveling",
      description: "이동 디자인 라인 - 균일한 층, 가벼운 움직임"
    };
  }

  // 기타 VS 기법들
  if (liftingDegree === 0) return { number: 1, name: "VS Zero Elevation" };
  if (liftingDegree <= 45) return { number: 3, name: "VS Low" };
  if (liftingDegree <= 90) return { number: 5, name: "VS Medium" };
  if (liftingDegree <= 135) return { number: 6, name: "VS High" };
  if (outlineShape === 'Round') return { number: 9, name: "VS Round" };

  return { number: 10, name: "VS Advanced" };
}

/**
 * 기법 번호 결정 통합 함수
 * @param {string} sectionType - 섹션 타입 (HS, VS, DFS, DBS, PS, RS)
 * @param {Object} params - 분석된 파라미터
 * @returns {number} 기법 번호
 */
function determineTechniqueNumber(sectionType, params) {
  switch (sectionType) {
    case 'DFS':
      return determineDFSTechnique(params).number;
    case 'DBS':
      return determineDBSTechnique(params).number;
    case 'VS':
      return determineVSTechnique(params).number;
    case 'HS': {
      // Horizontal Section 로직
      const cutForm = params.cut_form || 'L (Layer)';
      const graduationAngle = params.graduation_angle || 45;
      const layerType = params.layer_type || 'Mid Layer';

      if (cutForm.includes('O') || cutForm.includes('One Length')) return 1;
      if (graduationAngle <= 15) return 2;
      if (graduationAngle <= 45) return 3;
      if (graduationAngle <= 75) return 4;
      if (layerType === 'Low Layer') return 5;
      if (layerType === 'High Layer' || layerType === 'Full Layer') return 6;
      return 7;
    }
    case 'PS':
      return 1; // Pie Section
    case 'RS':
      return 1; // Radial Section
    default:
      return 1;
  }
}

/**
 * 스타일 매칭 통합 함수
 * @param {Object} params - 분석된 파라미터
 * @returns {Object} 매칭 결과 (matrix, sectionType, techniqueNumber, techniqueCode, details)
 */
function matchStyleFromParams(params) {
  const matrix = selectMatrix(params);
  const sectionType = determineSectionType(params);
  const techniqueNumber = determineTechniqueNumber(sectionType, params);

  // 상세 기법 정보 가져오기
  let techniqueDetails = null;
  switch (sectionType) {
    case 'DFS':
      techniqueDetails = determineDFSTechnique(params);
      break;
    case 'DBS':
      techniqueDetails = determineDBSTechnique(params);
      break;
    case 'VS':
      techniqueDetails = determineVSTechnique(params);
      break;
  }

  return {
    matrix: matrix,
    matrixInfo: MATRIX_9[matrix],
    sectionType: sectionType,
    techniqueNumber: techniqueNumber,
    techniqueCode: `${sectionType} NO.${techniqueNumber}`,
    techniqueDetails: techniqueDetails,
    // 공통 변수 상태
    globalParams: {
      head_position: params.head_position || 'Upright',
      distribution: params.distribution || 'Natural',
      guide_line: params.guide_line || 'Fixed',
      finger_position: params.finger_position || 'Parallel',
      direction_flow: params.direction_flow || null
    }
  };
}

/**
 * 방향성 모드 결정 함수 (DFS용)
 * @param {Object} params - 분석된 파라미터
 * @returns {Object} 방향성 정보
 */
function determineDirectionMode(params) {
  const directionFlow = params.direction_flow || 'Out_to_In';

  if (directionFlow === 'Out_to_In') {
    return {
      mode: 'Out_to_In',
      Direction_Flow: 'Out_to_In',
      Distribution: 'Variable',
      Shape: 'Round',
      effect: {
        side: 'Long 유지',
        nape: '타이트함 (Short)',
        forms: ['Form_A', 'Form_B', 'Form_C']
      }
    };
  } else {
    return {
      mode: 'In_to_Out',
      Direction_Flow: 'In_to_Out',
      Distribution: 'Perpendicular',
      effect: {
        side: '짧아짐',
        overall: '전체적으로 가벼움'
      }
    };
  }
}

// ==================== 9. Module Exports ====================
module.exports = {
  // 스키마
  FEMALE_PARAMS_SCHEMA,
  MALE_PARAMS_SCHEMA,

  // 카테고리 정보
  MALE_STYLE_CATEGORIES,
  FEMALE_LENGTH_CATEGORIES,

  // 공통 변수 & 좌표
  GLOBAL_VARIABLES,
  REFERENCE_POINTS,
  SECTIONING_VECTORS,
  WEIGHT_ZONES,

  // 모듈 정의
  MODULE_A_OUTLINE,
  MODULE_B_DFS,
  MODULE_C_DBS,
  MODULE_D_VS,

  // 매트릭스
  MATRIX_9,

  // 함수들
  selectMatrix,
  determineSectionType,
  determineTechniqueNumber,
  matchStyleFromParams,

  // 상세 기법 함수들
  determineDFSTechnique,
  determineDBSTechnique,
  determineVSTechnique,
  determineDirectionMode
};
