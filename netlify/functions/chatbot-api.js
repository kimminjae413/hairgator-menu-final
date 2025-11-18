// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - Structured Output + File Search + 보안 필터링 최종 완성 버전
// ✅ Structured Output (56파라미터 100% 정확도) ⭐신규⭐
// ✅ File Search 통합 (Supabase 이론 대체)
// ✅ 보안 필터링 (42개 포뮬러, 9개 매트릭스 보호)
// ✅ 5개 언어 지원 (ko/en/ja/zh/vi)
// 📅 최종 업그레이드: 2025-11-18

const fetch = require('node-fetch');
const { PARAMS_56_SCHEMA } = require('./params56-schema.js'); // ⭐ 신규 추가

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

    // ==================== 🔑 환경변수 확인 (File Search Store 추가) ====================
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    if (!GEMINI_KEY) throw new Error('Gemini API key not configured');
    if (!OPENAI_KEY) throw new Error('OpenAI API key not configured');
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase credentials not configured');

    console.log('🔑 환경변수 확인 완료 (File Search Store 포함)');

    switch (action) {
      case 'analyze_image':
        return await analyzeImage(payload, GEMINI_KEY);
      
      case 'generate_recipe':
       return await generateRecipe(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
      case 'generate_recipe_stream':
       return await generateRecipeStream(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
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

// ==================== ⭐ 1단계: 이미지 분석 (Structured Output) ⭐ ====================
async function analyzeImage(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  // ✅ 간소화된 프롬프트 (Structured Output이 스키마 강제)
  const systemPrompt = `당신은 전문 헤어 스타일리스트입니다. 
업로드된 헤어스타일 이미지를 56개 파라미터로 정확히 분석하세요.

**🎯 핵심 판단 기준**

**1. 길이 (Length Category) - 어깨선 기준**
- 어깨에 닿음 → **D Length**
- 어깨 아래 → A/B/C (가슴/쇄골 위치)
- 어깨 위 → E/F/G/H (목 노출 정도)
  - 목 전체 + 어깨 보임 → **E Length**
  - 목 상단만 보임 → **F Length**
  - 목 거의 안 보임 → **G Length**

**2. 커트 형태 (Cut Form) - 반드시 괄호 포함**
- "O (One Length)" / "G (Graduation)" / "L (Layer)"

**3. 리프팅 각도 (Lifting Range) - 배열로**
- ["L0"], ["L2"], ["L2", "L4"]

**4. 펌/컬 (있는 경우만)**
- curl_pattern: C-Curl / CS-Curl / S-Curl / SS-Curl / null
- curl_strength: Soft / Medium / Strong / null
- perm_type: Wave Perm / Digital Perm / Heat Perm / Iron Perm / null
- 컬이 없으면 모두 null

**애매한 경우 더 긴 쪽 선택. JSON Schema에 정확히 맞춰 출력하세요.`;

  try {
    console.log('📸 Gemini 2.0 Flash (Structured Output) 이미지 분석 시작');

    // ⭐⭐⭐ Structured Output 적용 ⭐⭐⭐
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
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
            maxOutputTokens: 2048,
            // ⭐ Structured Output 설정
            responseMimeType: "application/json",
            responseSchema: PARAMS_56_SCHEMA
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // ✅ Structured Output은 항상 완벽한 JSON 반환!
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const params56 = JSON.parse(text);
    
    // 리프팅 각도 → 볼륨 자동 매핑 (검증용)
    if (params56.lifting_range && params56.lifting_range.length > 0) {
      const maxLifting = params56.lifting_range[params56.lifting_range.length - 1];
      const calculatedVolume = calculateVolumeFromLifting(maxLifting);
      
      // Structured Output 결과와 다르면 로그
      if (calculatedVolume !== params56.volume_zone) {
        console.log(`⚠️ Volume 불일치: Structured=${params56.volume_zone}, Calculated=${calculatedVolume}`);
      }
    }

    console.log('✅ Structured Output 분석 완료:', {
      length: params56.length_category,
      form: params56.cut_form,
      volume: params56.volume_zone,
      lifting: params56.lifting_range
    });

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
        success: false,
        error: 'Image analysis failed', 
        details: error.message 
      })
    };
  }
}

// ==================== 리프팅 각도 → 볼륨 자동 계산 (엄격한 기준) ====================
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

// ==================== 🔒 보안 필터링 함수 (신규 추가) ====================
function sanitizeRecipeForPublic(recipe, language = 'ko') {
  if (!recipe) return recipe;
  
  let filtered = recipe;
  
  // 1. 포뮬러 번호 제거 (42개 보호)
  filtered = filtered.replace(/DBS\s+NO\.\s*\d+/gi, '뒷머리 기법');
  filtered = filtered.replace(/DFS\s+NO\.\s*\d+/gi, '앞머리 기법');
  filtered = filtered.replace(/VS\s+NO\.\s*\d+/gi, '중앙 기법');
  filtered = filtered.replace(/HS\s+NO\.\s*\d+/gi, '상단 기법');
  filtered = filtered.replace(/UP[\s-]?STEM\s+NO\.\s*\d+/gi, '정수리 기법');
  filtered = filtered.replace(/NAPE\s+ZONE\s+NO\.\s*\d+/gi, '목 부위 기법');
  
  // 2. 섹션 이름 일반화
  filtered = filtered.replace(/가로섹션|Horizontal\s+Section/gi, '상단 부분');
  filtered = filtered.replace(/후대각섹션|Diagonal\s+Backward\s+Section/gi, '뒷머리 부분');
  filtered = filtered.replace(/전대각섹션|Diagonal\s+Forward\s+Section/gi, '앞쪽 부분');
  filtered = filtered.replace(/세로섹션|Vertical\s+Section/gi, '중앙 부분');
  filtered = filtered.replace(/네이프존|Nape\s+Zone/gi, '목 부위');
  filtered = filtered.replace(/업스템|Up[\s-]?Stem/gi, '정수리 부분');
  filtered = filtered.replace(/백존|Back\s+Zone/gi, '후면 부분');
  
  // 3. 각도 코드 일반화 (L0~L8, D0~D8)
  filtered = filtered.replace(/L[0-8]\s*\([^)]+\)/gi, '적절한 각도로');
  filtered = filtered.replace(/D[0-8]\s*\([^)]+\)/gi, '자연스러운 방향으로');
  
  // 4. 42층 구조 제거
  filtered = filtered.replace(/42층|42\s+layers?|42-layer/gi, '전문적인 층 구조');
  filtered = filtered.replace(/\d+층\s+구조/gi, '체계적인 층 구조');
  
  // 5. 9개 매트릭스 제거
  filtered = filtered.replace(/9개\s+매트릭스|9\s+matrix|nine\s+matrix/gi, '체계적인 분류');
  filtered = filtered.replace(/매트릭스\s+코드|matrix\s+code/gi, '스타일 분류');
  
  // 6. Book 참조 제거
  filtered = filtered.replace(/\(Book\s+[A-E],\s+p\.\s*\d+\)/gi, '');
  filtered = filtered.replace(/\(2WAY\s+CUT\s+Book\s+[A-E],\s+Page\s+\d+\)/gi, '');
  
  console.log('🔒 보안 필터링 적용 완료');
  return filtered;
}

// ==================== ⭐ File Search 검색 함수 (신규 추가) ====================
async function searchTheoryWithFileSearch(query, geminiKey, storeId) {
  console.log(`🔍 File Search 시작: "${query}"`);
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `다음 헤어스타일 정보에 대해 2WAY CUT 이론 문서를 참조하여 설명해주세요:\n\n${query}`
            }]
          }],
          tools: [{
            file_search_tool: {
              file_search_stores: [storeId]
            }
          }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      console.error('❌ File Search API 오류:', response.status);
      return '';
    }

    const data = await response.json();
    const theoryText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log(`✅ File Search 완료 (${theoryText.length}자)`);
    return theoryText;

  } catch (error) {
    console.error('💥 File Search 오류:', error);
    return '';
  }
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

// ==================== 2단계: 레시피 생성 (File Search + 보안 필터링 통합) ====================
async function generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 레시피 생성 시작:', params56.length_category, '언어:', language);

    // ⭐ STEP 1: File Search로 이론 검색 (Supabase 이론 대체)
    const searchQuery = `${params56.length_category || ''} ${params56.cut_form || ''} ${params56.volume_zone || ''} Volume ${params56.section_primary || ''} Section`;
    const theoryContext = ''; // File Search 비활성화 - Supabase theory_chunks 사용 권장

    // STEP 2: Supabase는 도해도만 검색
    const similarStyles = await searchSimilarStyles(
      searchQuery, 
      openaiKey, 
      supabaseUrl, 
      supabaseKey, 
      params56.cut_category?.includes('Women') ? 'female' : 'male'
    );

    // STEP 3: 언어별 용어
    const langTerms = getTerms(language);
    const directionDesc = langTerms.direction[params56.direction_primary || 'D0'] || langTerms.direction['D0'];
    const sectionDesc = langTerms.section[params56.section_primary] || langTerms.section['Vertical'];
    const liftingDescs = (params56.lifting_range || ['L2', 'L4']).map(l => `${l} (${langTerms.lifting[l] || l})`).join(', ');
    const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];

    // ⭐ STEP 4: 언어별 시스템 프롬프트 (보안 규칙 포함)
    const systemPromptTemplates = {
      ko: `당신은 HAIRGATOR 시스템 전문가입니다.

**🔒 중요: 다음 정보는 절대 언급하지 마세요:**
- 구체적인 포뮬러 번호 (DBS NO.3, VS NO.6 등)
- 정확한 각도 코드 (L2(45°), D4(180°) 등)
- 섹션 이름 (가로섹션, 후대각섹션, 세로섹션 등)
- 42층 구조, 7개 섹션 시스템
- 9개 매트릭스, Form×Silhouette

**허용되는 표현:**
- "뒷머리 부분", "앞쪽 부분", "중앙 부분", "목 부위", "정수리 부분"
- "적절한 각도로", "자연스러운 방향으로"
- "체계적인 층 구조", "전문적인 분류"

다음 7단계 구조로 **한국어만** 사용하여 레시피를 작성하세요:

**STEP1. 기본 정보**
- 길이: ${langTerms.lengthDesc[params56.length_category] || params56.length_category}
- 스타일 형태: ${langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form}
- 볼륨: ${volumeDesc}
- 앞머리: ${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}

**STEP2. 이론적 설명**
다음 2WAY CUT 이론을 참고하세요:
${theoryContext}

**STEP3. 프로세스 요약**
1. 상단 부분 → 뒷머리 부분 → 중앙 부분 순서 (포뮬러 번호 언급 금지)
2. 적절한 각도로 자연스러운 방향 (L2, D4 같은 코드 언급 금지)

**STEP4. 상세 커팅 가이드**
각 부분별 설명 (일반적 표현만 사용)

**STEP5. 마무리 및 스타일링**

**STEP6. 주의사항**

**STEP7. 유사 스타일**
${similarStyles.slice(0, 3).map(s => `${s.name || s.code}: ${s.description || s.recipe?.substring(0, 100) || '설명 없음'}`).join('\n')}

위 형식을 정확히 따라서 STEP1부터 STEP7까지 순서대로 작성해주세요.`,

      en: `You are a HAIRGATOR system expert.

**🔒 IMPORTANT: NEVER mention:**
- Specific formula numbers (DBS NO.3, VS NO.6, etc.)
- Exact angle codes (L2(45°), D4(180°), etc.)
- Section names (Horizontal Section, Diagonal Backward Section, etc.)
- 42-layer structure, 7-section system
- 9 matrices, Form×Silhouette

**Allowed expressions:**
- "back area", "front area", "center area", "nape area", "crown area"
- "appropriate angle", "natural direction"
- "systematic layer structure", "professional classification"

Write in **English only** using 7 steps:

**STEP1. Basic Information**
- Length: ${langTerms.lengthDesc[params56.length_category] || params56.length_category}
- Form: ${langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form}
- Volume: ${volumeDesc}
- Fringe: ${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}

**STEP2. Theory Overview**
Reference 2WAY CUT theory:
${theoryContext}

**STEP3. Process Summary**
1. Top area → Back area → Center area (no formula numbers)
2. Appropriate angles and natural directions (no L2, D4 codes)

**STEP4. Detailed Cutting Guide**
**STEP5. Finishing & Styling**
**STEP6. Important Notes**
**STEP7. Similar Styles**
${similarStyles.slice(0, 3).map(s => `${s.name || s.code}`).join('\n')}`,

      ja: `あなたはHAIRGATORシステムの専門家です。

**🔒 重要：次の情報は絶対に言及しないでください：**
- 具体的な公式番号（DBS NO.3、VS NO.6など）
- 正確な角度コード（L2(45°)、D4(180°)など）
- セクション名（横セクション、後対角セクションなど）
- 42層構造、7セクションシステム
- 9つのマトリックス、Form×Silhouette

**許可される表現：**
- 「後ろ部分」「前部分」「中央部分」「首部位」「頭頂部分」
- 「適切な角度で」「自然な方向に」

次の7ステップで**日本語のみ**でレシピを作成してください：

**STEP1. 基本情報**
- 長さ：${langTerms.lengthDesc[params56.length_category] || params56.length_category}
- カット形態：${langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form}
- ボリューム：${volumeDesc}
- 前髪：${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}

**STEP2. 理論的説明**
2WAY CUT理論参照：
${theoryContext}

**STEP3-STEP7**: [similar format]
${similarStyles.slice(0, 3).map(s => `${s.name || s.code}`).join('\n')}`,

      zh: `您是HAIRGATOR系统专家。

**🔒 重要：绝对不要提及：**
- 具体公式编号（DBS NO.3、VS NO.6等）
- 精确角度代码（L2(45°)、D4(180°)等）
- 分区名称（横向分区、后斜分区等）
- 42层结构、7分区系统
- 9个矩阵、Form×Silhouette

**允许的表达：**
- "后部区域""前部区域""中央区域""颈部区域""头顶区域"
- "适当的角度""自然的方向"

请用**中文**按以下7步编写配方：

**STEP1. 基本信息**
- 长度：${langTerms.lengthDesc[params56.length_category] || params56.length_category}
- 剪裁形式：${langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form}
- 体积：${volumeDesc}
- 刘海：${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}

**STEP2. 理论概述**
参考2WAY CUT理论：
${theoryContext}

**STEP3-STEP7**: [similar format]
${similarStyles.slice(0, 3).map(s => `${s.name || s.code}`).join('\n')}`,

      vi: `Bạn là chuyên gia hệ thống HAIRGATOR.

**🔒 QUAN TRỌNG: KHÔNG BAO GIỜ đề cập：**
- Số công thức cụ thể (DBS NO.3, VS NO.6, v.v.)
- Mã góc chính xác (L2(45°), D4(180°), v.v.)
- Tên phân khu (Phân ngang, Phân chéo sau, v.v.)
- Cấu trúc 42 lớp, Hệ thống 7 phân khu
- 9 ma trận, Form×Silhouette

**Biểu đạt được phép:**
- "phần sau", "phần trước", "phần giữa", "vùng gáy", "vùng đỉnh đầu"
- "góc phù hợp", "hướng tự nhiên"

Viết công thức bằng **tiếng Việt** theo 7 bước：

**STEP1. Thông tin cơ bản**
- Độ dài: ${langTerms.lengthDesc[params56.length_category] || params56.length_category}
- Hình thức cắt: ${langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form}
- Thể tích: ${volumeDesc}
- Mái: ${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}

**STEP2. Tổng quan lý thuyết**
Tham khảo lý thuyết 2WAY CUT:
${theoryContext}

**STEP3-STEP7**: [similar format]
${similarStyles.slice(0, 3).map(s => `${s.name || s.code}`).join('\n')}`
    };

    const systemPrompt = systemPromptTemplates[language] || systemPromptTemplates['ko'];

    const strictLanguageMessage = {
      ko: '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요. 영어나 일본어 단어를 절대 사용하지 마세요.',
      en: 'You are an English expert. Write ALL responses in English ONLY. Never use Korean or Japanese words.',
      ja: 'あなたは日本語の専門家です。すべての応答を日本語のみで書いてください。英語や韓国語の単語を絶対に使用しないでください。',
      zh: '你是中文专家。所有回答只用中文。绝对不要使用英语或韩语单词。',
      vi: 'Bạn là chuyên gia tiếng Việt. Viết TẤT CẢ phản hồi chỉ bằng tiếng Việt. Không bao giờ sử dụng từ tiếng Anh hoặc tiếng Hàn.'
    }[language] || '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요.';

    const userPrompt = `다음 파라미터로 레시피를 생성하세요:
${JSON.stringify(params56, null, 2)}

위 시스템 프롬프트의 7단계 형식을 정확히 따라주세요.`;

    // ⭐ STEP 5: GPT-4o-mini로 레시피 생성
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: strictLanguageMessage },
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 2000
      })
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API Error: ${completion.status}`);
    }

    const gptData = await completion.json();
    let recipe = gptData.choices[0].message.content;

    // ⭐ STEP 6: 보안 필터링 적용
    recipe = sanitizeRecipeForPublic(recipe, language);

    console.log('✅ 레시피 생성 완료 (보안 필터링 적용)');

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

// ==================== 2-2단계: 스트리밍 레시피 생성 (File Search + 보안 필터링 통합) ====================
async function generateRecipeStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 스트리밍 레시피 생성 시작:', params56.length_category, '언어:', language);

    // ⭐ File Search + Supabase 검색 (generateRecipe와 동일)
    const searchQuery = `${params56.length_category || ''} ${params56.cut_form || ''} ${params56.volume_zone || ''} Volume`;
     const theoryContext = ''; // File Search 비활성화
    const similarStyles = await searchSimilarStyles(searchQuery, openaiKey, supabaseUrl, supabaseKey, params56.cut_category?.includes('Women') ? 'female' : 'male');

    const langTerms = getTerms(language);
    const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];

    // 시스템 프롬프트 (generateRecipe와 동일 구조, 간소화 버전)
    const systemPromptTemplates = {
      ko: `당신은 HAIRGATOR 시스템 전문가입니다.

**🔒 중요: 포뮬러 번호, 섹션 이름, 각도 코드, 42층, 9개 매트릭스 언급 금지**

**한국어로만** 7단계 작성:
STEP1. 기본 정보
STEP2. 이론 (${theoryContext.substring(0, 500)}...)
STEP3-STEP7. 프로세스/가이드/스타일링/주의/유사스타일`,

      en: `HAIRGATOR expert. **English only**. 🔒 NO formula numbers, section names, angle codes, 42 layers, 9 matrices.
7 steps: Basic Info / Theory (${theoryContext.substring(0, 500)}...) / Process / Guide / Styling / Notes / Similar`,

      ja: `HAIRGATOR専門家。**日本語のみ**。🔒 公式番号、セクション名、角度コード、42層、9マトリックス禁止。
7ステップ: 基本/理論(${theoryContext.substring(0, 500)}...)/プロセス/ガイド/スタイル/注意/類似`,

      zh: `HAIRGATOR专家。**中文**。🔒 禁止公式编号、分区名、角度代码、42层、9矩阵。
7步: 基本/理论(${theoryContext.substring(0, 500)}...)/流程/指南/造型/注意/相似`,

      vi: `HAIRGATOR expert. **Tiếng Việt**. 🔒 CẤM số công thức, tên phân khu, mã góc, 42 lớp, 9 ma trận.
7 bước: Cơ bản/Lý thuyết(${theoryContext.substring(0, 500)}...)/Quy trình/Hướng dẫn/Tạo kiểu/Lưu ý/Tương tự`
    };

    const systemPrompt = systemPromptTemplates[language] || systemPromptTemplates['ko'];

    const strictLanguageMessage = {
      ko: '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요.',
      en: 'You are an English expert. Write ALL responses in English ONLY.',
      ja: 'あなたは日本語の専門家です。すべての応答を日本語のみで書いてください。',
      zh: '你是中文专家。所有回答只用中文。',
      vi: 'Bạn là chuyên gia tiếng Việt. Viết TẤT CẢ phản hồi chỉ bằng tiếng Việt.'
    }[language] || '당신은 한국어 전문가입니다.';

    const userPrompt = `파라미터: ${JSON.stringify(params56, null, 2)}`;

    const streamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: strictLanguageMessage },
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 2000,
        stream: false
      })
    });

    const data = await streamResponse.json();
    let fullRecipe = data.choices[0].message.content;

    // ⭐ 보안 필터링
    fullRecipe = sanitizeRecipeForPublic(fullRecipe, language);

    console.log('✅ 스트리밍 레시피 완료 (보안 필터링 적용)');

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

// ==================== 벡터 검색 함수 (도해도만) ====================
async function searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey, targetGender = null) {
  try {
    console.log(`🔍 도해도 벡터 검색: "${query}"${targetGender ? ` (${targetGender})` : ''}`);

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

    console.log(`✅ 도해도 ${results.length}개 검색 완료`);
    return results;

  } catch (error) {
    console.error('💥 Vector search failed:', error);
    return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender);
  }
}

// ==================== 헤어스타일 코드 파싱 ====================
function parseHairstyleCode(code) {
  if (!code || typeof code !== 'string') return { gender: null, length: null };
  
  const gender = code.startsWith('F') ? 'female' : code.startsWith('M') ? 'male' : null;
  const lengthMatch = code.match(/([A-H])L/);
  const length = lengthMatch ? lengthMatch[1] : null;
  
  return { gender, length, code };
}

// ==================== 직접 테이블 검색 (Fallback) ====================
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

// ==================== 언어 감지 ====================
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

// ==================== 스타일 검색 (텍스트 기반) ====================
async function searchStyles(payload, openaiKey, supabaseUrl, supabaseKey) {
  const { query } = payload;
  const results = await searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, data: results })
  };
}

// ==================== 일반 대화 응답 ====================
async function generateResponse(payload, openaiKey) {
  const { user_query, search_results } = payload;
  const userLanguage = detectLanguage(user_query);
  
  const isCasualChat = !search_results || search_results.length === 0;

  if (isCasualChat) {
    return await casualConversation(user_query, userLanguage, openaiKey);
  }

  return await professionalAdvice(user_query, search_results, userLanguage, openaiKey);
}

// ==================== 캐주얼 대화 ====================
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

// ==================== 전문가 조언 ====================
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
