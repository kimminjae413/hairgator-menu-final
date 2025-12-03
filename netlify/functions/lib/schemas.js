// lib/schemas.js
// 파라미터 스키마 정의 (여자/남자 공통 + 개별)

// ==================== 여자 56개 파라미터 스키마 ====================
const FEMALE_PARAMS_SCHEMA = {
  type: "object",
  properties: {
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
    cut_form: { type: "string", enum: ["O (One Length)", "G (Graduation)", "L (Layer)"] },
    structure_layer: { type: "string", enum: ["No Layer", "Low Layer", "Mid Layer", "High Layer", "Full Layer", "Square Layer", "Round Layer", "Graduated Layer"] },
    graduation_type: { type: "string", enum: ["None", "Light", "Medium", "Heavy"] },
    weight_distribution: { type: "string", enum: ["Top Heavy", "Balanced", "Bottom Heavy"] },
    layer_type: { type: "string", enum: ["No Layer", "Low Layer", "Mid Layer", "High Layer", "Full Layer"] },
    silhouette: { type: "string", enum: ["Triangular", "Square", "Round"] },
    outline_shape: { type: "string", enum: ["Straight", "Curved", "Angular", "Irregular"] },
    volume_zone: { type: "string", enum: ["Low", "Medium", "High"] },
    volume_distribution: { type: "string", enum: ["Top", "Middle", "Bottom", "Even"] },
    line_quality: { type: "string", enum: ["Sharp", "Soft", "Blended", "Disconnected"] },
    fringe_type: { type: "string", enum: ["Full Bang", "See-through Bang", "Side Bang", "Center Part", "No Fringe"] },
    fringe_length: { type: "string", enum: ["Forehead", "Eyebrow", "Eye", "Cheekbone", "Lip", "Chin", "None"] },
    fringe_texture: { type: "string", enum: ["Blunt", "Textured", "Wispy", "Choppy"] },
    surface_texture: { type: "string", enum: ["Smooth", "Textured", "Choppy", "Soft"] },
    internal_texture: { type: "string", enum: ["Blunt", "Point Cut", "Slide Cut", "Razor Cut"] },
    hair_density: { type: "string", enum: ["Thin", "Medium", "Thick"] },
    hair_texture: { type: "string", enum: ["Straight", "Wavy", "Curly", "Coily"] },
    movement: { type: "string", enum: ["Static", "Slight", "Moderate", "High"] },
    texture_technique: { type: "string", enum: ["None", "Point Cut", "Slide Cut", "Razor", "Texturizing"] },
    section_primary: { type: "string", enum: ["Horizontal", "Vertical", "Diagonal-Forward", "Diagonal-Backward", "Vertical+Horizontal", "Diagonal-Backward+Vertical"] },
    section_by_zone: {
      type: "object",
      properties: {
        back: { type: "string" },
        side: { type: "string" },
        top: { type: "string" },
        fringe: { type: "string" }
      }
    },
    lifting_range: {
      type: "array",
      items: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"] },
      minItems: 1, maxItems: 9
    },
    direction_primary: { type: "string", enum: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] },
    cutting_method: { type: "string", enum: ["Blunt Cut", "Point Cut", "Slide Cut", "Stroke Cut", "Razor Cut"] },
    styling_method: { type: "string", enum: ["Blow Dry", "Natural Dry", "Iron", "Curl", "Wave"] },
    design_emphasis: { type: "string", enum: ["Volume", "Length", "Texture", "Shape", "Movement"] },
    weight_flow: { type: "string", enum: ["Balanced", "Forward Weighted", "Backward Weighted"] },
    connection_type: { type: "string", enum: ["Connected", "Disconnected", "Semi-Connected"] },
    womens_cut_category: { type: "string", enum: ["Long Straight", "Long Wave", "Long Curl", "Medium Straight", "Medium Wave", "Medium Curl", "Short Bob", "Short Pixie", "Shoulder Length"] },
    face_shape_match: {
      type: "array",
      items: { type: "string", enum: ["Oval", "Round", "Square", "Heart", "Long", "Diamond"] },
      minItems: 1, maxItems: 3
    },
    curl_pattern: { type: ["string", "null"], enum: ["C-Curl", "CS-Curl", "S-Curl", "SS-Curl", null] },
    curl_strength: { type: ["string", "null"], enum: ["Soft", "Medium", "Strong", null] },
    perm_type: { type: ["string", "null"], enum: ["Wave Perm", "Digital Perm", "Heat Perm", "Iron Perm", null] }
  },
  required: ["cut_category", "length_category", "cut_form", "lifting_range", "section_primary", "fringe_type", "volume_zone", "face_shape_match"]
};

// ==================== 남자 파라미터 스키마 ====================
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
    // 기술
    section_primary: { type: "string", enum: ["HS", "VS", "DBS", "DFS", "RS", "PS"] },
    lifting_range: {
      type: "array",
      items: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"] },
      minItems: 1, maxItems: 5
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

// ==================== 스타일 카테고리 정보 ====================
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

module.exports = {
  FEMALE_PARAMS_SCHEMA,
  MALE_PARAMS_SCHEMA,
  MALE_STYLE_CATEGORIES,
  FEMALE_LENGTH_CATEGORIES
};
