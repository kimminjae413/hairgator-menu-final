// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - 56파라미터 기반 7섹션 레시피 완성 버전
// ✅ 파라미터 설명 강제 출력 (D0, L2 등 괄호 설명 필수)
// ✅ Length 판단 정확도 향상 (E vs F 구분 강화)
// ✅ 언어별 레시피 생성 (한국어/영어/일본어/중국어/베트남어)

const fetch = require('node-fetch');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { action, payload } = JSON.parse(event.body);

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    if (!GEMINI_KEY) throw new Error('Gemini API key not configured');
    if (!OPENAI_KEY) throw new Error('OpenAI API key not configured');
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase credentials not configured');

    switch (action) {
      case 'analyze_image':
        return await analyzeImage(payload, GEMINI_KEY);
      
      case 'generate_recipe':
        return await generateRecipe(payload, OPENAI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
      case 'generate_recipe_stream':
        return await generateRecipeStream(payload, OPENAI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
      case 'search_styles':
        return await searchStyles(payload, OPENAI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
      case 'generate_response':
        return await generateResponse(payload, OPENAI_KEY);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Unknown action' })
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// ==================== 1단계: 이미지 분석 (56파라미터) - Length 정확도 향상 ====================
async function analyzeImage(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  const systemPrompt = `당신은 전문 헤어 스타일리스트입니다. 
업로드된 헤어스타일 이미지를 **56파라미터 체계**에 따라 분석하세요.

## 분석 가이드라인

### Cut Category (필수)
- "Women's Cut" 또는 "Men's Cut"

### Women's Cut Length Categories (매우 중요 - 신체 랜드마크 기준)

**🔥 LENGTH 판단 3단계 프로세스 (정확도 향상)**

**STEP 1: 어깨선 확인 (최우선)**
- 머리카락 끝이 어깨에 **정확히 닿음** → **D Length** (확정)
- 어깨보다 명확히 아래 → A/B/C 중 하나
- 어깨보다 명확히 위 → E/F/G/H 중 하나

**STEP 2-A: 어깨 아래인 경우**
- 가슴 아래 → A Length (65cm)
- 가슴 중간 → B Length (50cm)
- 쇄골 밑선 → C Length (40cm)

**STEP 2-B: 어깨 위인 경우 (목 노출 정도로 판단!)**

✅ **E Length (30cm) - 목 전체 노출형**
- **목 전체가 완전히 보임** (목덜미 + 목 중간 + 목 상단)
- 어깨와 머리카락 사이 **명확한 공간** (2-5cm)
- 뒤에서 봤을 때 목선이 깔끔하게 드러남
- **핵심: 어깨 시작 부분도 보임**

✅ **F Length (25cm) - 목 부분 노출형**
- **목 상단만 보임** (턱 밑 ~ 목 중간까지만 머리카락)
- 목 하단 (목덜미 쪽)은 머리카락에 가려짐
- 턱선 아래 3-5cm 위치
- **핵심: 목이 절반 정도 보임**

✅ **G Length (20cm) - 턱선형**
- 목이 거의 안 보임 (턱선에 머리카락이 걸침)
- 턱뼈 각도 라인을 따라감
- **핵심: 목 노출 최소**

❌ **H Length (15cm) - 숏헤어**
- 귀 높이, 목 전체 노출

**STEP 3: 애매한 경우 판단 규칙**

D vs E:
- 어깨에 살짝이라도 닿음 → D
- 어깨와 공간 있음 → E

E vs F (가장 헷갈림!):
- 목 전체 보임 + 어깨 시작점 보임 → **E**
- 목 절반만 보임 + 어깨 안 보임 → **F**
- **기준: 목덜미가 보이는가?** → 보임 = E, 안 보임 = F

F vs G:
- 목이 조금이라도 보임 → F
- 목이 거의 안 보임 → G

**중간 길이면 → 더 긴 쪽 선택**

### Men's Cut Categories (해당 시)
- Side Fringe / Side Part / Fringe Up / Pushed Back / Buzz / Crop / Mohican

### 스타일 형태 (Cut Form) - 반드시 3가지 중 하나만 선택
**⚠️ 중요: O, G, L 중 하나만 선택하세요. Combination(C)은 절대 사용 금지**

- **O (One Length, 원렝스)**: 모든 머리카락이 같은 길이로 떨어지는 형태
  → 머리카락 끝이 일직선, 층이 없음
  
- **G (Graduation, 그래쥬에이션)**: 외곽이 짧고 내부가 긴 층, 무게감이 하단
  → 뒤에서 보면 삼각형 모양, 아래가 무거움
  
- **L (Layer, 레이어)**: 층을 두어 자르는 기법, 전체적인 볼륨과 움직임
  → 여러 층으로 나뉘어져 있음, 가벼운 느낌

**선택 가이드:**
- 끝이 일직선, 층 없음 → **O**
- 아래가 무겁고 위가 가벼움 → **G**
- 전체적으로 층이 많음 → **L**

### Structure Layer
- Long Layer / Medium Layer / Short Layer
- Square Layer / Round Layer / Graduated Layer

### Fringe (앞머리)
**타입:** Full Bang / See-through Bang / Side Bang / No Fringe
**길이:** Forehead / Eyebrow / Eye / Cheekbone / Lip / Chin / None

### Volume & Weight
- Volume Zone: Low / Medium / High
- Weight Flow: Balanced / Forward Weighted / Backward Weighted

### 기술 파라미터
- Section: Horizontal / Vertical / Diagonal Forward / Diagonal Backward
- Lifting: L0~L8
- Direction: D0~D8

**중요: JSON 출력 시 절대 규칙**
- womens_cut_category 필드 생성 금지 (스타일명은 포함하지 말것)
- length_category만 A~H Length 형식으로 출력
- cut_form은 O, G, L 중 하나만 (C 사용 금지)

**출력 형식 (JSON만):**
\`\`\`json
{
  "cut_category": "Women's Cut",
  "length_category": "E Length",
  "estimated_hair_length_cm": 30,
  "cut_form": "L (Layer)",
  "structure_layer": "Graduated Layer",
  "fringe_type": "Side Bang",
  "fringe_length": "Eye",
  "volume_zone": "Medium",
  "weight_flow": "Forward Weighted",
  "hair_texture": "Medium",
  "styling_method": "Blow Dry",
  "section_primary": "Vertical",
  "lifting_range": ["L2", "L4", "L6"],
  "direction_primary": "D0"
}
\`\`\`

**재확인 체크리스트:**
- ✅ **어깨에 닿는가? → D Length**
- ✅ **목 전체 + 어깨 보이는가? → E Length**
- ✅ **목 절반만 보이는가? → F Length**
- ✅ **목 거의 안 보이는가? → G Length**
- ✅ 애매하면 더 긴 쪽 선택
- ✅ cut_form은 O/G/L만 사용 (C 금지)
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.0-flash-lite:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemPrompt },
              {
                inline_data: {
                  mime_type: mime_type,
                  data: image_base64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
    const params56 = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : JSON.parse(text);

    // womens_cut_category 필드가 있으면 제거
    if (params56.womens_cut_category) {
      delete params56.womens_cut_category;
    }

    // Cut Form에서 C (Combination) 제거 - L로 기본 변경
    if (params56.cut_form && params56.cut_form.startsWith('C')) {
      params56.cut_form = 'L (Layer)';
      console.log('⚠️ Cut Form "C" 감지 → "L (Layer)"로 자동 변경');
    }

    // ⚠️ CRITICAL: Cut Form 괄호 강제 추가!
    if (params56.cut_form && !params56.cut_form.includes('(')) {
      const formChar = params56.cut_form.charAt(0).toUpperCase();
      const formMap = {
        'O': 'O (One Length)',
        'G': 'G (Graduation)',
        'L': 'L (Layer)'
      };
      params56.cut_form = formMap[formChar] || 'L (Layer)';
      console.log('✅ Cut Form 괄호 자동 추가:', params56.cut_form);
    }

    // 리프팅 각도 → 볼륨 자동 매핑 (엄격한 기준)
    if (params56.lifting_range && params56.lifting_range.length > 0) {
      const maxLifting = params56.lifting_range[params56.lifting_range.length - 1];
      params56.volume_zone = calculateVolumeFromLifting(maxLifting);
    }

    console.log('✅ Gemini 분석 완료:', params56.length_category, params56.estimated_hair_length_cm + 'cm', params56.cut_form, params56.volume_zone);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: params56
      })
    };
  } catch (error) {
    console.error('💥 analyzeImage Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Image analysis failed', 
        details: error.message 
      })
    };
  }
}

// 리프팅 각도 → 볼륨 자동 계산 (엄격한 기준)
function calculateVolumeFromLifting(liftingCode) {
  const angles = {
    'L0': 0, 'L1': 22.5, 'L2': 45, 'L3': 67.5,
    'L4': 90, 'L5': 112.5, 'L6': 135, 'L7': 157.5, 'L8': 180
  };
  
  const angle = angles[liftingCode] || 0;
  
  if (angle < 45) return 'Low';      // 0~44° (L0, L1)
  if (angle < 90) return 'Medium';   // 45~89° (L2, L3)
  return 'High';                      // 90°~ (L4, L5, L6, L7, L8)
}

// ==================== 언어별 용어 매핑 시스템 ====================
function getTerms(lang) {
  const terms = {
    ko: {
      lengthDesc: {
        'A Length': '가슴 아래 밑선',
        'B Length': '가슴 상단~중간',
        'C Length': '쇄골 밑선',
        'D Length': '어깨선',
        'E Length': '어깨 위 5cm',
        'F Length': '턱 아래',
        'G Length': '턱선',
        'H Length': '귀 중간'
      },
      formDesc: {
        'O': 'One Length, 원렝스 - 모든 머리카락이 같은 길이',
        'G': 'Graduation, 그래쥬에이션 - 외곽이 짧고 내부가 긴 층',
        'L': 'Layer, 레이어 - 층을 두어 자르는 기법'
      },
      fringeType: {
        'Full Bang': '전체 앞머리',
        'See-through Bang': '시스루 앞머리',
        'Side Bang': '옆으로 넘긴 앞머리',
        'No Fringe': '앞머리 없음'
      },
      fringeLength: {
        'Forehead': '이마 길이',
        'Eyebrow': '눈썹 길이',
        'Eye': '눈 길이',
        'Cheekbone': '광대 길이',
        'Lip': '입술 길이',
        'Chin': '턱 길이',
        'None': '없음'
      },
      direction: {
        'D0': '정면 방향 (0도)',
        'D1': '우측 전방 (45도)',
        'D2': '우측 측면 (90도)',
        'D3': '우측 후방 (135도)',
        'D4': '정후방 (180도)',
        'D5': '좌측 후방 (225도)',
        'D6': '좌측 측면 (270도)',
        'D7': '좌측 전방 (315도)',
        'D8': '전체 방향 (360도)'
      },
      section: {
        'Horizontal': '가로 섹션 (수평 분할)',
        'Vertical': '세로 섹션 (수직 분할)',
        'Diagonal Forward': '전대각 섹션 (앞쪽 대각선)',
        'Diagonal Backward': '후대각 섹션 (뒤쪽 대각선)'
      },
      lifting: {
        'L0': '0도 (자연낙하)',
        'L1': '22.5도 (낮은 각도)',
        'L2': '45도 (대각선)',
        'L3': '67.5도 (중간 각도)',
        'L4': '90도 (수평)',
        'L5': '112.5도 (중상 각도)',
        'L6': '135도 (대각선 위)',
        'L7': '157.5도 (높은 각도)',
        'L8': '180도 (수직)'
      },
      volume: {
        'Low': '하단 볼륨 (0~44도)',
        'Medium': '중단 볼륨 (45~89도)',
        'High': '상단 볼륨 (90도 이상)'
      }
    },
    en: {
      lengthDesc: {
        'A Length': 'Below chest',
        'B Length': 'Upper to mid chest',
        'C Length': 'Collarbone',
        'D Length': 'Shoulder line',
        'E Length': '5cm above shoulder',
        'F Length': 'Below chin',
        'G Length': 'Jaw line',
        'H Length': 'Ear level'
      },
      formDesc: {
        'O': 'One Length - All hair same length',
        'G': 'Graduation - Shorter outside, longer inside',
        'L': 'Layer - Layered throughout'
      },
      fringeType: {
        'Full Bang': 'Full fringe',
        'See-through Bang': 'See-through fringe',
        'Side Bang': 'Side-swept fringe',
        'No Fringe': 'No fringe'
      },
      fringeLength: {
        'Forehead': 'Forehead length',
        'Eyebrow': 'Eyebrow length',
        'Eye': 'Eye length',
        'Cheekbone': 'Cheekbone length',
        'Lip': 'Lip length',
        'Chin': 'Chin length',
        'None': 'None'
      },
      direction: {
        'D0': 'Front (0°)',
        'D1': 'Right front (45°)',
        'D2': 'Right side (90°)',
        'D3': 'Right back (135°)',
        'D4': 'Back (180°)',
        'D5': 'Left back (225°)',
        'D6': 'Left side (270°)',
        'D7': 'Left front (315°)',
        'D8': 'All directions (360°)'
      },
      section: {
        'Horizontal': 'Horizontal section',
        'Vertical': 'Vertical section',
        'Diagonal Forward': 'Forward diagonal section',
        'Diagonal Backward': 'Backward diagonal section'
      },
      lifting: {
        'L0': '0° (Natural fall)',
        'L1': '22.5° (Low angle)',
        'L2': '45° (Diagonal)',
        'L3': '67.5° (Medium angle)',
        'L4': '90° (Horizontal)',
        'L5': '112.5° (Medium-high)',
        'L6': '135° (Diagonal up)',
        'L7': '157.5° (High angle)',
        'L8': '180° (Vertical)'
      },
      volume: {
        'Low': 'Low volume (0-44°)',
        'Medium': 'Medium volume (45-89°)',
        'High': 'High volume (90°+)'
      }
    },
    ja: {
      lengthDesc: {
        'A Length': '胸下',
        'B Length': '胸上~中央',
        'C Length': '鎖骨',
        'D Length': '肩のライン',
        'E Length': '肩上5cm',
        'F Length': '顎下',
        'G Length': '顎のライン',
        'H Length': '耳の高さ'
      },
      formDesc: {
        'O': 'ワンレングス - 全て同じ長さ',
        'G': 'グラデーション - 外側が短く内側が長い層',
        'L': 'レイヤー - 段を付けてカット'
      },
      fringeType: {
        'Full Bang': '全体前髪',
        'See-through Bang': 'シースルー前髪',
        'Side Bang': '横に流した前髪',
        'No Fringe': '前髪なし'
      },
      fringeLength: {
        'Forehead': 'おでこの長さ',
        'Eyebrow': '眉の長さ',
        'Eye': '目の長さ',
        'Cheekbone': '頬骨の長さ',
        'Lip': '唇の長さ',
        'Chin': '顎の長さ',
        'None': 'なし'
      },
      direction: {
        'D0': '正面方向 (0度)',
        'D1': '右前方 (45度)',
        'D2': '右側面 (90度)',
        'D3': '右後方 (135度)',
        'D4': '正後方 (180度)',
        'D5': '左後方 (225度)',
        'D6': '左側面 (270度)',
        'D7': '左前方 (315度)',
        'D8': '全方向 (360度)'
      },
      section: {
        'Horizontal': '水平セクション',
        'Vertical': '垂直セクション',
        'Diagonal Forward': '前斜めセクション',
        'Diagonal Backward': '後斜めセクション'
      },
      lifting: {
        'L0': '0度 (自然落下)',
        'L1': '22.5度 (低い角度)',
        'L2': '45度 (斜め)',
        'L3': '67.5度 (中間角度)',
        'L4': '90度 (水平)',
        'L5': '112.5度 (中高角度)',
        'L6': '135度 (斜め上)',
        'L7': '157.5度 (高い角度)',
        'L8': '180度 (垂直)'
      },
      volume: {
        'Low': '下部ボリューム (0~44度)',
        'Medium': '中部ボリューム (45~89度)',
        'High': '上部ボリューム (90度以上)'
      }
    },
    zh: {
      lengthDesc: {
        'A Length': '胸部以下',
        'B Length': '胸部上方至中部',
        'C Length': '锁骨',
        'D Length': '肩线',
        'E Length': '肩上5厘米',
        'F Length': '下巴以下',
        'G Length': '下巴线',
        'H Length': '耳朵高度'
      },
      formDesc: {
        'O': '齐长 - 所有头发长度相同',
        'G': '渐层 - 外侧短内侧长',
        'L': '层次 - 分层剪裁'
      },
      fringeType: {
        'Full Bang': '全刘海',
        'See-through Bang': '空气刘海',
        'Side Bang': '侧分刘海',
        'No Fringe': '无刘海'
      },
      fringeLength: {
        'Forehead': '额头长度',
        'Eyebrow': '眉毛长度',
        'Eye': '眼睛长度',
        'Cheekbone': '颧骨长度',
        'Lip': '嘴唇长度',
        'Chin': '下巴长度',
        'None': '无'
      },
      direction: {
        'D0': '正面方向 (0度)',
        'D1': '右前方 (45度)',
        'D2': '右侧面 (90度)',
        'D3': '右后方 (135度)',
        'D4': '正后方 (180度)',
        'D5': '左后方 (225度)',
        'D6': '左侧面 (270度)',
        'D7': '左前方 (315度)',
        'D8': '全方向 (360度)'
      },
      section: {
        'Horizontal': '水平分区',
        'Vertical': '垂直分区',
        'Diagonal Forward': '前斜分区',
        'Diagonal Backward': '后斜分区'
      },
      lifting: {
        'L0': '0度 (自然下垂)',
        'L1': '22.5度 (低角度)',
        'L2': '45度 (斜线)',
        'L3': '67.5度 (中角度)',
        'L4': '90度 (水平)',
        'L5': '112.5度 (中高角度)',
        'L6': '135度 (斜上)',
        'L7': '157.5度 (高角度)',
        'L8': '180度 (垂直)'
      },
      volume: {
        'Low': '下部体积 (0~44度)',
        'Medium': '中部体积 (45~89度)',
        'High': '上部体积 (90度以上)'
      }
    },
    vi: {
      lengthDesc: {
        'A Length': 'Dưới ngực',
        'B Length': 'Trên ngực đến giữa ngực',
        'C Length': 'Xương đòn',
        'D Length': 'Vai',
        'E Length': '5cm trên vai',
        'F Length': 'Dưới cằm',
        'G Length': 'Đường cằm',
        'H Length': 'Tai'
      },
      formDesc: {
        'O': 'Một độ dài - Tất cả tóc cùng độ dài',
        'G': 'Tầng nấc - Ngoài ngắn trong dài',
        'L': 'Lớp - Cắt từng lớp'
      },
      fringeType: {
        'Full Bang': 'Mái đầy',
        'See-through Bang': 'Mái thưa',
        'Side Bang': 'Mái lệch',
        'No Fringe': 'Không mái'
      },
      fringeLength: {
        'Forehead': 'Dài trán',
        'Eyebrow': 'Dài lông mày',
        'Eye': 'Dài mắt',
        'Cheekbone': 'Dài gò má',
        'Lip': 'Dài môi',
        'Chin': 'Dài cằm',
        'None': 'Không có'
      },
      direction: {
        'D0': 'Hướng trước (0°)',
        'D1': 'Phải trước (45°)',
        'D2': 'Phải ngang (90°)',
        'D3': 'Phải sau (135°)',
        'D4': 'Hướng sau (180°)',
        'D5': 'Trái sau (225°)',
        'D6': 'Trái ngang (270°)',
        'D7': 'Trái trước (315°)',
        'D8': 'Toàn bộ (360°)'
      },
      section: {
        'Horizontal': 'Phân ngang',
        'Vertical': 'Phân dọc',
        'Diagonal Forward': 'Phân chéo trước',
        'Diagonal Backward': 'Phân chéo sau'
      },
      lifting: {
        'L0': '0° (Rơi tự nhiên)',
        'L1': '22.5° (Góc thấp)',
        'L2': '45° (Chéo)',
        'L3': '67.5° (Góc trung)',
        'L4': '90° (Ngang)',
        'L5': '112.5° (Trung cao)',
        'L6': '135° (Chéo lên)',
        'L7': '157.5° (Góc cao)',
        'L8': '180° (Dọc)'
      },
      volume: {
        'Low': 'Thể tích thấp (0~44°)',
        'Medium': 'Thể tích trung (45~89°)',
        'High': 'Thể tích cao (90°+)'
      }
    }
  };
  
  return terms[lang] || terms['ko'];
}

// ==================== 2단계: 레시피 생성 (파라미터 설명 강제 버전) ====================
async function generateRecipe(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 레시피 생성 시작:', params56, '언어:', language);

    // 벡터 검색으로 유사 스타일 찾기
    const searchQuery = `${params56.length_category || ''} ${params56.structure_layer || ''} ${params56.cut_form || ''}`;
    const similarStyles = await searchSimilarStyles(
      searchQuery, 
      openaiKey, 
      supabaseUrl, 
      supabaseKey, 
      params56.cut_category?.includes('Women') ? 'female' : 'male'
    );

    // 언어별 용어 가져오기
    const langTerms = getTerms(language);
    
    // Direction 설명 (언어별)
    const directionDesc = langTerms.direction[params56.direction_primary || 'D0'] || langTerms.direction['D0'];
    
    // Section 설명 (언어별)
    const sectionDesc = langTerms.section[params56.section_primary] || langTerms.section['Vertical'];
    
    // Lifting 설명 (언어별, 배열 처리)
    const liftingDescs = (params56.lifting_range || ['L2', 'L4']).map(l => `${l} (${langTerms.lifting[l] || l})`).join(', ');
    
    // Volume 설명 (언어별)
    const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];

    // ⭐ 언어별 시스템 프롬프트 완전 분리
    const systemPromptTemplates = {
      ko: `당신은 HAIRGATOR 시스템 전문가입니다.

**CRITICAL: 반드시 한국어로만 작성하세요.**

<커트 레시피>
STEP1. 스타일 설명: 
[2-3문장으로 작성]

STEP2. 스타일 길이: 
**${params56.length_category} (${params56.estimated_hair_length_cm}cm)**

STEP3. 스타일 형태: 
**${params56.cut_form}**

STEP4. 앞머리 길이: 
**${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}**

STEP5. 42포뮬러 기초 커트

### 5-1. 가로섹션 (Section: Horizontal) - 2층
**공간:** 정수리 → 이마
- **L1:** L0 (Lifting: 0°), D4 (Direction: 정후방), Blunt Cut
- **L2:** L1 (Lifting: 22.5°), D4 (Direction: 정후방), Blunt Cut

### 5-2. 후대각섹션 (Section: Diagonal-Backward) - 9층  
**공간:** 뒷머리 대각 (귀 뒤→정수리)
- **L1-3:** L1~L3 (Lifting: 22.5°~67.5°), D3~D5 (Direction: 우측후방~좌측후방), Slide Cut, Over Direction Backward
- **L4-6:** L3~L5 (Lifting: 67.5°~112.5°), **Graduation Decreasing** → **C컬 형성 설계**
  - **컬 원리:** 외부층(짧음) < 내부층(길음) → 끝단이 자연스럽게 안으로 말림
  - **각도 설계:** 67.5°~112.5° 중간 리프팅 → 드라이 시 자동 C컬 완성
  - Volume ${params56.volume_zone}
- **L7-9:** L5~L6 (Lifting: 112.5°~135°), Weight Flow Forward

### 5-3. 전대각섹션 (Section: Diagonal-Forward) - 6층
**공간:** 측면→앞머리  
- **L1-3:** L4 (Lifting: 90°), D1~D3 (Direction: 측면 대각), 측면 수평
- **L4-6:** L5~L6 (Lifting: 112.5°~135°), Fringe 연결

### 5-4. 세로섹션 (Section: Vertical) - 12층
**공간:** V Zone (정수리→목 중앙축)
- **L1-4:** L2~L3 (Lifting: 45°~67.5°), Round Layer
- **L5-8:** L4~L6 (Lifting: 90°~135°), Zone-B (중단)
- **L9-12:** L6~L8 (Lifting: 135°~180°), Silhouette

### 5-5. 현대각섹션_백준 (Hemline) - 3층
**공간:** 목덜미
- **L1-3:** Perimeter Line, L0~L1 (Lifting: 0°~22.5°), Trimming

### 5-6. 네이프존 (Zone-A) - 4층
**공간:** 목 부위
- **L1-4:** L0~L2 (Lifting: 0°~45°), **Increasing Graduation** → **목선 C컬 형성**
  - **컬 원리:** 목 라인을 따라 Graduation 증가 → 목선에 밀착되는 C컬
  - **각도 설계:** 0°~45° 낮은 리프팅 → 자연 낙하 시 C컬 자동 형성
  - Brick Cut, Weight Sit

### 5-7. 업스컵 (Zone-C + Head Point) - 6층
**공간:** 정수리 최상단
- **L1-6:** L5~L8 (Lifting: 112.5°~180°), Volume High, Over Direction Forward

**✓ 검증:** 2+9+6+12+3+4+6 = 42층

STEP6. 질감처리
- Texturizing: Point Cut → **C컬 끝단 부드럽게 (자연스러운 컬 강화)**
- Zone: 중단~하단  
- Corner Off → **모서리 둥글게 (컬 흐름 부드럽게)**

STEP7. 스타일링
- Blow Dry: Round Brush → **Graduation으로 설계된 C컬 방향 강조**
- **컬 활성화:** 커트 단계에서 설계된 C컬을 드라이로 완성
- Volume: 정수리
- Finish: Natural`,

      en: `You are a HAIRGATOR system expert.

**CRITICAL: Write entirely in English.**

<Cut Recipe>
STEP1. Style Description: 
[Write 2-3 sentences]

STEP2. Style Length: 
**${params56.length_category} (${params56.estimated_hair_length_cm}cm)**

STEP3. Style Form: 
**${params56.cut_form}**

STEP4. Fringe Length: 
**${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}**

STEP5. 42 Formula Base Cut

### 5-1. Horizontal Section (70.Section-Horizontal) - 2 Layers
**Space:** Crown → Forehead
- **L1:** 54.Lifting L0 (0°), 33.D4 (Back), 19.Blunt Cut
- **L2:** 54.Lifting L1 (22.5°), 33.D4, 19.Blunt Cut

### 5-2. Diagonal Backward Section (70.Section-Diagonal-Backward) - 9 Layers
**Space:** Back diagonal (Behind ear→Crown)
- **L1-3:** 54.L1~L3 (22.5°~67.5°), 33.D3~D5, Slide Cut, 62.Backward
- **L4-6:** 54.L3~L5 (67.5°~112.5°), 44.Graduation Decreasing, 86.Volume ${params56.volume_zone}
- **L7-9:** 54.L5~L6 (112.5°~135°), Weight Flow Forward

### 5-3. Diagonal Forward Section (70.Section-Diagonal-Forward) - 6 Layers
**Space:** Side→Fringe
- **L1-3:** 54.L4 (90°), 33.D1~D3, Side horizontal
- **L4-6:** 54.L5~L6 (112.5°~135°), 42.Fringe connection

### 5-4. Vertical Section (70.Section-Vertical) - 12 Layers
**Space:** 05.V Zone (Crown→Nape central axis)
- **L1-4:** 54.L2~L3 (45°~67.5°), 52.Round Layer
- **L5-8:** 54.L4~L6 (90°~135°), 89.Zone-B
- **L9-12:** 54.L6~L8 (135°~180°), 75.Silhouette

### 5-5. Diagonal Nape Line (49.Hemline) - 3 Layers
**Space:** Nape line
- **L1-3:** 64.Perimeter Line, 54.L0~L1, 83.Trimming

### 5-6. Nape Zone (89.Zone-A) - 4 Layers
**Space:** Neck area
- **L1-4:** 54.L0~L2 (0°~45°), 20.Brick Cut, 88.Weight Sit

### 5-7. Up-Scoop (89.Zone-C + 47.Head Point) - 6 Layers
**Space:** Crown top
- **L1-6:** 54.L5~L8 (112.5°~180°), 86.Volume High, 62.Forward

**✓ Verify:** 2+9+6+12+3+4+6 = 42 layers

STEP6. Texturizing
- 81.Texturizing: Point Cut
- 82.Zone: Mid~Low
- 26.Corner Off

STEP7. Styling
- 18.Blow Dry: Round Brush
- Volume: Crown
- Finish: Natural`,

      ja: `あなたはHAIRGATORシステムの専門家です。

**CRITICAL: 必ず日本語で書いてください。**

<カットレシピ>
STEP1. スタイル説明: 
[2-3文で作成]

STEP2. スタイル長さ: 
**${params56.length_category} (${params56.estimated_hair_length_cm}cm)**

STEP3. スタイル形態: 
**${params56.cut_form}**

STEP4. 前髪長さ: 
**${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}**

STEP5. 42フォーミュラ ベースカット

### 5-1. 横セクション (70.Section-Horizontal) - 2層
**空間:** 頭頂部 → 額
- **L1:** 54.Lifting L0 (0°), 33.D4 (後方), 19.Blunt Cut
- **L2:** 54.Lifting L1 (22.5°), 33.D4, 19.Blunt Cut

### 5-2. 後方斜めセクション (70.Section-Diagonal-Backward) - 9層
**空間:** 後頭部斜め (耳後→頭頂)
- **L1-3:** 54.L1~L3 (22.5°~67.5°), 33.D3~D5, Slide Cut, 62.Backward
- **L4-6:** 54.L3~L5 (67.5°~112.5°), 44.Graduation Decreasing, 86.Volume ${params56.volume_zone}
- **L7-9:** 54.L5~L6 (112.5°~135°), Weight Flow Forward

### 5-3. 前方斜めセクション (70.Section-Diagonal-Forward) - 6層
**空間:** 側面→前髪
- **L1-3:** 54.L4 (90°), 33.D1~D3, 側面水平
- **L4-6:** 54.L5~L6 (112.5°~135°), 42.Fringe 接続

### 5-4. 縦セクション (70.Section-Vertical) - 12層
**空間:** 05.V Zone (頭頂→襟足中央軸)
- **L1-4:** 54.L2~L3 (45°~67.5°), 52.Round Layer
- **L5-8:** 54.L4~L6 (90°~135°), 89.Zone-B
- **L9-12:** 54.L6~L8 (135°~180°), 75.Silhouette

### 5-5. 斜め襟足ライン (49.Hemline) - 3層
**空間:** 襟足ライン
- **L1-3:** 64.Perimeter Line, 54.L0~L1, 83.Trimming

### 5-6. ネープゾーン (89.Zone-A) - 4層
**空間:** 首部位
- **L1-4:** 54.L0~L2 (0°~45°), 20.Brick Cut, 88.Weight Sit

### 5-7. アップスクープ (89.Zone-C + 47.Head Point) - 6層
**空間:** 頭頂最上部
- **L1-6:** 54.L5~L8 (112.5°~180°), 86.Volume High, 62.Forward

**✓ 検証:** 2+9+6+12+3+4+6 = 42層

STEP6. 質感処理
- 81.Texturizing: Point Cut
- 82.Zone: 中段~下段
- 26.Corner Off

STEP7. スタイリング
- 18.Blow Dry: Round Brush
- Volume: 頭頂部
- Finish: Natural`,

      zh: `你是HAIRGATOR系统专家。

**CRITICAL: 必须用中文书写。**

<剪发配方>
STEP1. 风格说明: 
[用2-3句话描述]

STEP2. 风格长度: 
**${params56.length_category} (${params56.estimated_hair_length_cm}cm)**

STEP3. 风格形态: 
**${params56.cut_form}**

STEP4. 刘海长度: 
**${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}**

STEP5. 42配方 基础剪裁

### 5-1. 横向分区 (70.Section-Horizontal) - 2层
**空间:** 头顶 → 额头
- **L1:** 54.Lifting L0 (0°), 33.D4 (后方), 19.Blunt Cut
- **L2:** 54.Lifting L1 (22.5°), 33.D4, 19.Blunt Cut

### 5-2. 后斜分区 (70.Section-Diagonal-Backward) - 9层
**空间:** 后脑斜向 (耳后→头顶)
- **L1-3:** 54.L1~L3 (22.5°~67.5°), 33.D3~D5, Slide Cut, 62.Backward
- **L4-6:** 54.L3~L5 (67.5°~112.5°), 44.Graduation Decreasing, 86.Volume ${params56.volume_zone}
- **L7-9:** 54.L5~L6 (112.5°~135°), Weight Flow Forward

### 5-3. 前斜分区 (70.Section-Diagonal-Forward) - 6层
**空间:** 侧面→刘海
- **L1-3:** 54.L4 (90°), 33.D1~D3, 侧面水平
- **L4-6:** 54.L5~L6 (112.5°~135°), 42.Fringe 连接

### 5-4. 纵向分区 (70.Section-Vertical) - 12层
**空间:** 05.V Zone (头顶→颈部中央轴)
- **L1-4:** 54.L2~L3 (45°~67.5°), 52.Round Layer
- **L5-8:** 54.L4~L6 (90°~135°), 89.Zone-B
- **L9-12:** 54.L6~L8 (135°~180°), 75.Silhouette

### 5-5. 斜向颈部线 (49.Hemline) - 3层
**空间:** 颈部线
- **L1-3:** 64.Perimeter Line, 54.L0~L1, 83.Trimming

### 5-6. 颈部区 (89.Zone-A) - 4层
**空间:** 颈部
- **L1-4:** 54.L0~L2 (0°~45°), 20.Brick Cut, 88.Weight Sit

### 5-7. 顶部区 (89.Zone-C + 47.Head Point) - 6层
**空间:** 头顶最上部
- **L1-6:** 54.L5~L8 (112.5°~180°), 86.Volume High, 62.Forward

**✓ 验证:** 2+9+6+12+3+4+6 = 42层

STEP6. 质感处理
- 81.Texturizing: Point Cut
- 82.Zone: 中段~下段
- 26.Corner Off

STEP7. 造型
- 18.Blow Dry: Round Brush
- Volume: 头顶
- Finish: Natural`,

      vi: `Bạn là chuyên gia hệ thống HAIRGATOR.

**CRITICAL: Viết hoàn toàn bằng tiếng Việt.**

<Công thức cắt>
STEP1. Mô tả phong cách: 
[Viết 2-3 câu]

STEP2. Chiều dài phong cách: 
**${params56.length_category} (${params56.estimated_hair_length_cm}cm)**

STEP3. Hình thức phong cách: 
**${params56.cut_form}**

STEP4. Chiều dài tóc mái: 
**${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}**

STEP5. 42 Công thức Cắt cơ bản

### 5-1. Phân ngang (70.Section-Horizontal) - 2 lớp
**Không gian:** Đỉnh đầu → Trán
- **L1:** 54.Lifting L0 (0°), 33.D4 (Sau), 19.Blunt Cut
- **L2:** 54.Lifting L1 (22.5°), 33.D4, 19.Blunt Cut

### 5-2. Phân chéo sau (70.Section-Diagonal-Backward) - 9 lớp
**Không gian:** Chéo sau (Sau tai→Đỉnh)
- **L1-3:** 54.L1~L3 (22.5°~67.5°), 33.D3~D5, Slide Cut, 62.Backward
- **L4-6:** 54.L3~L5 (67.5°~112.5°), 44.Graduation Decreasing, 86.Volume ${params56.volume_zone}
- **L7-9:** 54.L5~L6 (112.5°~135°), Weight Flow Forward

### 5-3. Phân chéo trước (70.Section-Diagonal-Forward) - 6 lớp
**Không gian:** Bên→Mái
- **L1-3:** 54.L4 (90°), 33.D1~D3, Bên ngang
- **L4-6:** 54.L5~L6 (112.5°~135°), 42.Fringe kết nối

### 5-4. Phân dọc (70.Section-Vertical) - 12 lớp
**Không gian:** 05.V Zone (Đỉnh→Gáy trục giữa)
- **L1-4:** 54.L2~L3 (45°~67.5°), 52.Round Layer
- **L5-8:** 54.L4~L6 (90°~135°), 89.Zone-B
- **L9-12:** 54.L6~L8 (135°~180°), 75.Silhouette

### 5-5. Đường gáy chéo (49.Hemline) - 3 lớp
**Không gian:** Đường gáy
- **L1-3:** 64.Perimeter Line, 54.L0~L1, 83.Trimming

### 5-6. Vùng gáy (89.Zone-A) - 4 lớp
**Không gian:** Vùng cổ
- **L1-4:** 54.L0~L2 (0°~45°), 20.Brick Cut, 88.Weight Sit

### 5-7. Vùng đỉnh (89.Zone-C + 47.Head Point) - 6 lớp
**Không gian:** Đỉnh đầu trên cùng
- **L1-6:** 54.L5~L8 (112.5°~180°), 86.Volume High, 62.Forward

**✓ Xác minh:** 2+9+6+12+3+4+6 = 42 lớp

STEP6. Xử lý kết cấu
- 81.Texturizing: Point Cut
- 82.Zone: Giữa~Dưới
- 26.Corner Off

STEP7. Tạo kiểu
- 18.Blow Dry: Round Brush
- Volume: Đỉnh đầu
- Finish: Natural`,
    };

    const systemPrompt = systemPromptTemplates[language] || systemPromptTemplates['ko'];


    const userPrompt = `다음 파라미터로 레시피를 생성하세요:
${JSON.stringify(params56, null, 2)}

참고할 유사 스타일 (실제 데이터):
${similarStyles.slice(0, 3).map((s, idx) => 
  `${idx+1}. ${s.name || s.code}: ${s.description || s.recipe?.substring(0, 100) || '설명 없음'}`
).join('\n')}

위 형식을 정확히 따라서 STEP1부터 STEP7까지 순서대로 작성해주세요.`;

    // 언어별 강제 시스템 메시지 (짬뽕 방지)
    const strictLanguageMessage = {
      ko: '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요. 영어나 일본어 단어를 절대 사용하지 마세요.',
      en: 'You are an English expert. Write ALL responses in English ONLY. Never use Korean or Japanese words.',
      ja: 'あなたは日本語の専門家です。すべての応答を日本語のみで書いてください。英語や韓国語の単語を絶対に使用しないでください。',
      zh: '你是中文专家。所有回答只用中文。绝对不要使用英语或韩语单词。',
      vi: 'Bạn là chuyên gia tiếng Việt. Viết TẤT CẢ phản hồi chỉ bằng tiếng Việt. Không bao giờ sử dụng từ tiếng Anh hoặc tiếng Hàn.'
    }[language] || '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요.';

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: strictLanguageMessage }, // 1차: 언어 강제
          { role: 'system', content: systemPrompt },           // 2차: 레시피 형식
          { role: 'user', content: userPrompt }                // 3차: 사용자 요청
        ],
        temperature: 0.5, // 온도 낮춤 (더 정확하게)
        max_tokens: 2000
      })
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API Error: ${completion.status}`);
    }

    const gptData = await completion.json();
    const recipe = gptData.choices[0].message.content;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          recipe: recipe,
          params56: params56,
          similar_styles: similarStyles.slice(0, 3)
        }
      })
    };

  } catch (error) {
    console.error('💥 generateRecipe Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Recipe generation failed', 
        details: error.message 
      })
    };
  }
}

// ==================== 2-2단계: 스트리밍 레시피 생성 (동일 로직 적용) ====================
async function generateRecipeStream(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 스트리밍 레시피 생성 시작:', params56, '언어:', language);

    const searchQuery = `${params56.length_category || ''} ${params56.structure_layer || ''} ${params56.cut_form || ''}`;
    const similarStyles = await searchSimilarStyles(
      searchQuery, 
      openaiKey, 
      supabaseUrl, 
      supabaseKey, 
      params56.cut_category?.includes('Women') ? 'female' : 'male'
    );

    const langTerms = getTerms(language);
    
    // Direction/Section/Lifting/Volume 설명 (generateRecipe와 동일)
    const directionDesc = langTerms.direction[params56.direction_primary || 'D0'] || langTerms.direction['D0'];
    const sectionDesc = langTerms.section[params56.section_primary] || langTerms.section['Vertical'];
    const liftingDescs = (params56.lifting_range || ['L2', 'L4']).map(l => `${l} (${langTerms.lifting[l] || l})`).join(', ');
    const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];

    // ⭐ generateRecipeStream도 언어별 systemPrompt 사용 (generateRecipe와 동일)
    const systemPromptTemplates = {
      ko: `당신은 HAIRGATOR 시스템 전문가입니다.

**CRITICAL: 반드시 한국어로만 작성하세요.**

<커트 레시피>
STEP1. 스타일 설명: [2-3문장]
STEP2. 스타일 길이: **${params56.length_category} (${params56.estimated_hair_length_cm}cm)**
STEP3. 스타일 형태: **${params56.cut_form}**
STEP4. 앞머리 길이: **${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}**
STEP5. 42포뮬러 기초 커트
### 5-1. 가로섹션 (Horizontal) - 2층
- **L1-2:** L0~L1 (Lifting: 0°~22.5°), D4 (Direction: 정후방), Blunt Cut
### 5-2. 후대각섹션 (Diagonal-Backward) - 9층  
- **L1-3:** L1~L3 (Lifting: 22.5°~67.5°), D3~D5 (Direction: 후방), Slide Cut, Over Direction Backward
- **L4-6:** L3~L5 (Lifting: 67.5°~112.5°), **Graduation Decreasing → C컬 형성 설계**, Volume ${params56.volume_zone}
- **L7-9:** L5~L6 (Lifting: 112.5°~135°), Weight Forward
### 5-3. 전대각섹션 (Diagonal-Forward) - 6층
- **L1-6:** L4~L6 (Lifting: 90°~135°), D1~D3 (Direction: 전방), Fringe 연결
### 5-4. 세로섹션 (Vertical) - 12층
- **L1-12:** L2~L8 (Lifting: 45°~180°), V Zone, Round Layer, Silhouette
### 5-5. 현대각_백준 (Hemline) - 3층
- **L1-3:** Perimeter Line, L0~L1 (Lifting: 0°~22.5°), Trimming
### 5-6. 네이프존 (Zone-A) - 4층
- **L1-4:** L0~L2 (Lifting: 0°~45°), **Increasing Graduation → 목선 C컬 형성**, Brick Cut, Weight Sit
### 5-7. 업스컵 (Zone-C) - 6층
- **L1-6:** L5~L8 (Lifting: 112.5°~180°), Volume High, Over Direction Forward
**✓ 42층**
STEP6. 질감: Point Cut (C컬 끝단 부드럽게), Zone 중하단, Corner Off (컬 흐름 부드럽게)
STEP7. 스타일: Blow Dry (Graduation으로 설계된 C컬 방향 강조), Volume 정수리`,

      en: `You are a HAIRGATOR system expert.

**CRITICAL: Write entirely in English.**

<Cut Recipe>
STEP1. Style Description: [2-3 sentences]
STEP2. Style Length: **${params56.length_category} (${params56.estimated_hair_length_cm}cm)**
STEP3. Style Form: **${params56.cut_form}**
STEP4. Fringe Length: **${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}**
STEP5. 42 Formula Base Cut
### 5-1. Horizontal Section - 2 layers
- **L1-2:** L0~L1 (Lifting: 0°~22.5°), D4 (Direction: Back), Blunt Cut
### 5-2. Diagonal Backward Section - 9 layers  
- **L1-3:** L1~L3 (Lifting: 22.5°~67.5°), D3~D5 (Direction: Back), Slide Cut, Over Direction Backward
- **L4-6:** L3~L5 (Lifting: 67.5°~112.5°), **Graduation Decreasing → C-Curl Formation Design**, Volume ${params56.volume_zone}
- **L7-9:** L5~L6 (Lifting: 112.5°~135°), Weight Forward
### 5-3. Diagonal Forward Section - 6 layers
- **L1-6:** L4~L6 (Lifting: 90°~135°), D1~D3 (Direction: Forward), Fringe Connection
### 5-4. Vertical Section - 12 layers
- **L1-12:** L2~L8 (Lifting: 45°~180°), V Zone, Round Layer, Silhouette
### 5-5. Diagonal Nape Section (Hemline) - 3 layers
- **L1-3:** Perimeter Line, L0~L1 (Lifting: 0°~22.5°), Trimming
### 5-6. Nape Zone (Zone-A) - 4 layers
- **L1-4:** L0~L2 (Lifting: 0°~45°), **Increasing Graduation → Neckline C-Curl Formation**, Brick Cut, Weight Sit
### 5-7. Up-Scoop Zone (Zone-C) - 6 layers
- **L1-6:** L5~L8 (Lifting: 112.5°~180°), Volume High, Over Direction Forward
**✓ 42 layers**
STEP6. Texturing: Point Cut (Soften C-curl ends), Zone Mid-Lower, Corner Off (Smooth curl flow)
STEP7. Styling: Blow Dry (Enhance C-curl designed by Graduation), Volume Crown`,
### 5-6. Nape Zone (89.Zone-A) - 4 layers
- **L1-4:** 54.L0~L2, 20.Brick, 88.Weight
### 5-7. Up-Scoop (89.Zone-C) - 6 layers
- **L1-6:** 54.L5~L8, 86.Vol High, 62.Forward
**✓ 42 layers**
STEP6. Texture: 81.Point Cut, 82.Zone mid-low, 26.Corner Off
STEP7. Style: 18.Blow Dry, Vol crown`,

      ja: `あなたはHAIRGATORシステムの専門家です。

**CRITICAL: 必ず日本語で書いてください。**

<カットレシピ>
STEP1. スタイル説明: [2-3文]
STEP2. スタイル長さ: **${params56.length_category} (${params56.estimated_hair_length_cm}cm)**
STEP3. スタイル形態: **${params56.cut_form}**
STEP4. 前髪長さ: **${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}**
STEP5. 42フォーミュラ ベースカット
### 5-1. 横 (70.Horizontal) - 2層
- **L1-2:** 54.L0~L1, 33.D4, 19.Blunt
### 5-2. 後方斜め (70.Diagonal-Backward) - 9層  
- **L1-3:** 54.L1~L3, 33.D3~D5, Slide, 62.Backward
- **L4-6:** 54.L3~L5, 44.Graduation, 86.Vol ${params56.volume_zone}
- **L7-9:** 54.L5~L6, Weight Forward
### 5-3. 前方斜め (70.Diagonal-Forward) - 6層
- **L1-6:** 54.L4~L6, 33.D1~D3, 42.Fringe
### 5-4. 縦 (70.Vertical) - 12層
- **L1-12:** 54.L2~L8, 05.V Zone, 52.Round, 75.Silhouette
### 5-5. 斜め襟足 (49.Hemline) - 3層
- **L1-3:** 64.Perimeter, 54.L0~L1, 83.Trimming
### 5-6. ネープ (89.Zone-A) - 4層
- **L1-4:** 54.L0~L2, 20.Brick, 88.Weight
### 5-7. アップスクープ (89.Zone-C) - 6層
- **L1-6:** 54.L5~L8, 86.Vol High, 62.Forward
**✓ 42層**
STEP6. 質感: 81.Point Cut, 82.Zone 中下段, 26.Corner Off
STEP7. スタイル: 18.Blow Dry, Vol 頭頂`,

      zh: `你是HAIRGATOR系统专家。

**CRITICAL: 必须用中文书写。**

<剪发配方>
STEP1. 风格说明: [2-3句]
STEP2. 风格长度: **${params56.length_category} (${params56.estimated_hair_length_cm}cm)**
STEP3. 风格形态: **${params56.cut_form}**
STEP4. 刘海长度: **${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}**
STEP5. 42配方 基础剪裁
### 5-1. 横向 (70.Horizontal) - 2层
- **L1-2:** 54.L0~L1, 33.D4, 19.Blunt
### 5-2. 后斜 (70.Diagonal-Backward) - 9层  
- **L1-3:** 54.L1~L3, 33.D3~D5, Slide, 62.Backward
- **L4-6:** 54.L3~L5, 44.Graduation, 86.Vol ${params56.volume_zone}
- **L7-9:** 54.L5~L6, Weight Forward
### 5-3. 前斜 (70.Diagonal-Forward) - 6层
- **L1-6:** 54.L4~L6, 33.D1~D3, 42.Fringe
### 5-4. 纵向 (70.Vertical) - 12层
- **L1-12:** 54.L2~L8, 05.V Zone, 52.Round, 75.Silhouette
### 5-5. 斜向颈 (49.Hemline) - 3层
- **L1-3:** 64.Perimeter, 54.L0~L1, 83.Trimming
### 5-6. 颈部区 (89.Zone-A) - 4层
- **L1-4:** 54.L0~L2, 20.Brick, 88.Weight
### 5-7. 顶部区 (89.Zone-C) - 6层
- **L1-6:** 54.L5~L8, 86.Vol High, 62.Forward
**✓ 42层**
STEP6. 质感: 81.Point Cut, 82.Zone 中下, 26.Corner Off
STEP7. 造型: 18.Blow Dry, Vol 头顶`,

      vi: `Bạn là chuyên gia hệ thống HAIRGATOR.

**CRITICAL: Viết hoàn toàn bằng tiếng Việt.**

<Công thức cắt>
STEP1. Mô tả phong cách: [2-3 câu]
STEP2. Chiều dài phong cách: **${params56.length_category} (${params56.estimated_hair_length_cm}cm)**
STEP3. Hình thức phong cách: **${params56.cut_form}**
STEP4. Chiều dài tóc mái: **${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}**
STEP5. 42 Công thức Cắt cơ bản
### 5-1. Ngang (70.Horizontal) - 2 lớp
- **L1-2:** 54.L0~L1, 33.D4, 19.Blunt
### 5-2. Chéo sau (70.Diagonal-Backward) - 9 lớp  
- **L1-3:** 54.L1~L3, 33.D3~D5, Slide, 62.Backward
- **L4-6:** 54.L3~L5, 44.Graduation, 86.Vol ${params56.volume_zone}
- **L7-9:** 54.L5~L6, Weight Forward
### 5-3. Chéo trước (70.Diagonal-Forward) - 6 lớp
- **L1-6:** 54.L4~L6, 33.D1~D3, 42.Fringe
### 5-4. Dọc (70.Vertical) - 12 lớp
- **L1-12:** 54.L2~L8, 05.V Zone, 52.Round, 75.Silhouette
### 5-5. Chéo gáy (49.Hemline) - 3 lớp
- **L1-3:** 64.Perimeter, 54.L0~L1, 83.Trimming
### 5-6. Vùng gáy (89.Zone-A) - 4 lớp
- **L1-4:** 54.L0~L2, 20.Brick, 88.Weight
### 5-7. Vùng đỉnh (89.Zone-C) - 6 lớp
- **L1-6:** 54.L5~L8, 86.Vol High, 62.Forward
**✓ 42 lớp**
STEP6. Kết cấu: 81.Point Cut, 82.Zone giữa-dưới, 26.Corner Off
STEP7. Tạo kiểu: 18.Blow Dry, Vol đỉnh`,
    };

    const systemPrompt = systemPromptTemplates[language] || systemPromptTemplates['ko'];


    const userPrompt = `다음 파라미터로 레시피를 생성하세요:
${JSON.stringify(params56, null, 2)}

참고 스타일:
${similarStyles.slice(0, 3).map((s, idx) => `${idx+1}. ${s.name || s.code}`).join('\n')}`;

    // 언어별 강제 시스템 메시지 (짬뽕 방지)
    const strictLanguageMessage = {
      ko: '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요. 영어나 일본어 단어를 절대 사용하지 마세요.',
      en: 'You are an English expert. Write ALL responses in English ONLY. Never use Korean or Japanese words.',
      ja: 'あなたは日本語の専門家です。すべての応答を日本語のみで書いてください。英語や韓国語の単語を絶対に使用しないでください。',
      zh: '你是中文专家。所有回答只用中文。绝对不要使用英语或韩语单词。',
      vi: 'Bạn là chuyên gia tiếng Việt. Viết TẤT CẢ phản hồi chỉ bằng tiếng Việt. Không bao giờ sử dụng từ tiếng Anh hoặc tiếng Hàn.'
    }[language] || '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요.';

    const streamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: strictLanguageMessage }, // 1차: 언어 강제
          { role: 'system', content: systemPrompt },           // 2차: 레시피 형식
          { role: 'user', content: userPrompt }                // 3차: 사용자 요청
        ],
        temperature: 0.5, // 온도 낮춤
        max_tokens: 2000,
        stream: false
      })
    });

    const data = await streamResponse.json();
    const fullRecipe = data.choices[0].message.content;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          recipe: fullRecipe,
          params56: params56,
          similar_styles: similarStyles.slice(0, 3)
        }
      })
    };

  } catch (error) {
    console.error('💥 generateRecipeStream Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Stream recipe generation failed', 
        details: error.message 
      })
    };
  }
}

// ==================== 벡터 검색 함수 ====================
async function searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey, targetGender = null) {
  try {
    console.log(`🔍 벡터 검색 시작: "${query}"${targetGender ? ` (${targetGender})` : ''}`);

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query
      })
    });

    if (!embeddingResponse.ok) {
      return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const rpcResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/match_hairstyles`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          match_count: 10
        })
      }
    );

    if (!rpcResponse.ok) {
      return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender);
    }

    let results = await rpcResponse.json();

    if (targetGender) {
      results = results.map(r => {
        const parsed = parseHairstyleCode(r.code);
        return { ...r, parsed_gender: parsed.gender };
      });

      const sameGender = results.filter(r => r.parsed_gender === targetGender);
      const otherGender = results.filter(r => r.parsed_gender !== targetGender);
      results = [...sameGender, ...otherGender].slice(0, 10);
    }

    return results;

  } catch (error) {
    console.error('💥 Vector search failed:', error);
    return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender);
  }
}

function parseHairstyleCode(code) {
  if (!code || typeof code !== 'string') return { gender: null, length: null };
  
  const gender = code.startsWith('F') ? 'female' : code.startsWith('M') ? 'male' : null;
  const lengthMatch = code.match(/([A-H])L/);
  const length = lengthMatch ? lengthMatch[1] : null;
  
  return { gender, length, code };
}

async function directTableSearch(supabaseUrl, supabaseKey, query, targetGender = null) {
  console.log(`🔍 Fallback 검색 시작: "${query}"`);
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/hairstyles?select=id,name,category,code,recipe,description`,
    {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  );

  if (!response.ok) {
    throw new Error('All search methods failed');
  }

  const allStyles = await response.json();

  const scoredStyles = allStyles.map(style => {
    let score = 0;
    const queryLower = query.toLowerCase();
    const nameLower = (style.name || '').toLowerCase();
    
    const parsed = parseHairstyleCode(style.code);

    if (targetGender && parsed.gender === targetGender) {
      score += 200;
    }

    if (nameLower.includes(queryLower)) {
      score += 100;
    }

    if (style.recipe || style.description) {
      score += 30;
    }

    return { 
      ...style, 
      similarity_score: score,
      parsed_gender: parsed.gender
    };
  });

  return scoredStyles
    .filter(s => s.similarity_score > -50)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 10);
}

// ==================== 기타 함수들 ====================
function detectLanguage(text) {
  const koreanRegex = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/;
  if (koreanRegex.test(text)) return 'korean';
  
  const vietnameseRegex = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  if (vietnameseRegex.test(text)) return 'vietnamese';
  
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
  if (japaneseRegex.test(text)) return 'japanese';
  
  const chineseRegex = /[\u4E00-\u9FFF]/;
  if (chineseRegex.test(text)) return 'chinese';
  
  return 'english';
}

async function searchStyles(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { query } = payload;
  const results = await searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: results })
  };
}

async function generateResponse(payload, openaiKey) {
  const { user_query, search_results } = payload;
  const userLanguage = detectLanguage(user_query);
  
  const isCasualChat = !search_results || search_results.length === 0;

  if (isCasualChat) {
    return await casualConversation(user_query, userLanguage, openaiKey);
  }

  return await professionalAdvice(user_query, search_results, userLanguage, openaiKey);
}

async function casualConversation(user_query, userLanguage, openaiKey) {
  const casualPrompts = {
    korean: '당신은 친근한 헤어 AI 어시스턴트입니다.',
    english: 'You are a friendly hair AI assistant.',
    japanese: 'あなたは親しみやすいヘアAIアシスタントです。',
    chinese: '你是友好的发型AI助手。',
    vietnamese: 'Bạn là trợ lý AI tóc thân thiện.'
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: casualPrompts[userLanguage] || casualPrompts['korean'] },
        { role: 'user', content: user_query }
      ],
      temperature: 0.9,
      max_tokens: 100
    })
  });
  
  const data = await response.json();
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      data: data.choices[0].message.content
    })
  };
}

async function professionalAdvice(user_query, search_results, userLanguage, openaiKey) {
  const systemPrompts = {
    korean: '당신은 경력 20년 이상의 헤어 마스터입니다. 실무 조언을 2-3문장으로 제공하세요.',
    english: 'You are a master hair stylist with 20+ years of experience.',
    japanese: 'あなたは20年以上の経験を持つヘアマスターです。',
    chinese: '你是拥有20年以上经验的发型大师。',
    vietnamese: 'Bạn là bậc thầy tóc với hơn 20 năm kinh nghiệm.'
  };

  const context = search_results.map(r => 
    `${r.name}: ${r.description || '스타일 정보'}`
  ).join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompts[userLanguage] || systemPrompts['korean'] },
        { role: 'user', content: `질문: ${user_query}\n\n참고:\n${context}` }
      ],
      temperature: 0.8,
      max_tokens: 200
    })
  });
  
  const data = await response.json();
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      success: true, 
      data: data.choices[0].message.content
    })
  };
}
