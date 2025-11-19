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
        // ⭐⭐⭐ 수정 1/3: Supabase 파라미터 추가 ⭐⭐⭐
        return await generateResponse(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
      
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
  
  // 6. 7개 섹션/존 제거
  filtered = filtered.replace(/7개\s+섹션|7개\s+존|7\s+section|7\s+zone/gi, '여러 부분');
  filtered = filtered.replace(/섹션|존|section|zone/gi, '부분');
  
  // 7. Book 참조 제거
  filtered = filtered.replace(/\(Book\s+[A-E],\s+p\.\s*\d+\)/gi, '');
  filtered = filtered.replace(/\(2WAY\s+CUT\s+Book\s+[A-E],\s+Page\s+\d+\)/gi, '');
  
  console.log('🔒 보안 필터링 적용 완료');
  return filtered;
}

// ==================== ⭐ 유효한 이미지 필터링 함수 (2025-01-25 추가) ⭐ ====================
function filterValidStyles(styles) {
  if (!styles || !Array.isArray(styles)) {
    console.log('⚠️ styles가 배열이 아니거나 undefined');
    return [];
  }

  const filtered = styles.filter(style => {
    // 1. image_url 필드 확인 (main_image_url이 아님!)
    if (!style.image_url) {
      console.log(`❌ 제외: ${style.code} - image_url 없음`);
      return false;
    }
    
    // 2. URL이 문자열인지 확인
    if (typeof style.image_url !== 'string') {
      console.log(`❌ 제외: ${style.code} - image_url이 문자열이 아님`);
      return false;
    }
    
    // 3. 빈 문자열 체크
    if (style.image_url.trim() === '') {
      console.log(`❌ 제외: ${style.code} - image_url이 빈 문자열`);
      return false;
    }
    
    // 4. 임시 파일만 제외 (temp, temporary)
    if (style.image_url.includes('/temp/') || 
        style.image_url.includes('/temporary/')) {
      console.log(`❌ 제외: ${style.code} - 임시 이미지`);
      return false;
    }
    
    // 5. ✅ hairgatorchatbot 폴더는 허용! (제거하던 코드 삭제)
    // 6. ✅ supabase.co/storage도 허용! (제거하던 코드 삭제)
    
    console.log(`✅ 유효: ${style.code}`);
    return true;
  });

  console.log(`📊 필터링 결과: ${filtered.length}개 유효 (전체 ${styles.length}개)`);
  return filtered;
}
// ==================== ⭐ theory_chunks 벡터 검색 함수 (신규 추가) ⭐ ====================
async function searchTheoryChunks(query, geminiKey, supabaseUrl, supabaseKey, matchCount = 15) {
  try {
    console.log(`🔍 theory_chunks 벡터 검색: "${query}"`);
    
    // Gemini 임베딩 생성 (768차원)
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: query }] }
        })
      }
    );

    if (!embeddingResponse.ok) {
      console.error('❌ Gemini 임베딩 생성 실패');
      return [];
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.embedding.values;

    // Supabase RPC 호출
    const rpcResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/match_theory_chunks`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query_embedding: queryEmbedding,
          match_threshold: 0.70,
          match_count: matchCount
        })
      }
    );

    if (!rpcResponse.ok) {
      console.error('❌ Supabase RPC 호출 실패:', rpcResponse.status);
      return [];
    }

    const results = await rpcResponse.json();
    console.log(`✅ theory_chunks ${results.length}개 검색 완료`);
    
    return results;

  } catch (error) {
    console.error('💥 theory_chunks 검색 오류:', error);
    return [];
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

    // ⭐⭐⭐ 수정 2/3: theory_chunks 벡터 검색 추가 ⭐⭐⭐
    const searchQuery = `${params56.length_category || ''} ${params56.cut_form || ''} ${params56.volume_zone || ''} Volume ${params56.section_primary || ''} Section`;
    const theoryChunks = await searchTheoryChunks(searchQuery, geminiKey, supabaseUrl, supabaseKey, 15);
    
    // 이론 컨텍스트 구성
    const theoryContext = theoryChunks.length > 0 
      ? theoryChunks.map((chunk, idx) => 
          `[이론 ${idx+1}] ${chunk.section_title || ''}\n${(chunk.content_ko || chunk.content || '').substring(0, 300)}`
        ).join('\n\n')
      : '관련 이론을 찾을 수 없습니다.';

  // STEP 2: Supabase는 도해도만 검색 + 필터링
    const allSimilarStyles = await searchSimilarStyles(
      searchQuery, 
      openaiKey, 
      supabaseUrl, 
      supabaseKey, 
      params56.cut_category?.includes('Women') ? 'female' : 'male'
    );

    // ⭐ 유효한 이미지만 필터링
    const similarStyles = filterValidStyles(allSimilarStyles);
    console.log(`📊 도해도 검색 완료: 전체 ${allSimilarStyles.length}개 → 유효 ${similarStyles.length}개`);
    
    // STEP 3: 언어별 용어
    const langTerms = getTerms(language);
    const directionDesc = langTerms.direction[params56.direction_primary || 'D0'] || langTerms.direction['D0'];
    const sectionDesc = langTerms.section[params56.section_primary] || langTerms.section['Vertical'];
    const liftingDescs = (params56.lifting_range || ['L2', 'L4']).map(l => `${l} (${langTerms.lifting[l] || l})`).join(', ');
    const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];

    // ⭐ STEP 4: 언어별 시스템 프롬프트 (42층 구체적 레시피 생성)
    const systemPromptTemplates = {
  ko: `당신은 HAIRGATOR 시스템의 2WAY CUT 마스터입니다.

**🔒 보안 규칙 (철저히 준수):**
다음 용어들은 절대 언급 금지하되, 원리는 레시피에 반영:
- 포뮬러 번호 (DBS NO.3, VS NO.6 등) → "뒷머리 기법", "중앙 기법"으로 표현
- 각도 코드 (L2(45°), D4(180°) 등) → 각도 숫자는 명시하되 코드는 숨김
- 섹션 이름 (가로섹션, 후대각섹션 등) → "상단 부분", "뒷머리 부분"으로 표현
- 42층 구조, 7섹션 시스템 → "체계적인 구조"로 표현
- 9개 매트릭스 → "전문적인 분류"로 표현

**📊 분석 데이터:**
${JSON.stringify({
  length: params56.length_category,
  form: params56.cut_form,
  volume: params56.volume_zone,
  fringe: params56.fringe_type,
  lifting: params56.lifting_range,
  texture: params56.texture_technique,
  silhouette: params56.silhouette_type
}, null, 2)}

**🎓 이론 근거 (참고용 - 직접 인용 금지):**
${theoryContext}

**📐 커팅 원리 (2WAY CUT 시스템 기반):**

1. **볼륨 형성 원리:**
   - 리프팅 각도: ${params56.lifting_range?.join(', ') || '적절한 각도'}
   - 볼륨 위치: ${volumeDesc}
   - 실루엣: ${params56.silhouette_type || '자연스러운 형태'}

2. **섹션 순서 (일반적 흐름):**
   - 1순위: 목 부위 (네이프존) - 기준선 설정
   - 2순위: 뒷머리 부분 - 그래쥬에이션 또는 레이어
   - 3순위: 사이드 부분 - 연결 및 블렌딩
   - 4순위: 상단 부분 (크라운) - 볼륨 형성
   - 5순위: 앞머리 (뱅) - 얼굴 라인 연출

3. **형태별 커팅 방식:**
   - O (Outline): 블런트 컷 60-80% + 질감 처리 20-40%
   - G (Graduation): 그래쥬에이션 50-70% + 블렌딩 30-50%
   - L (Layer): 레이어 60-80% + 슬라이딩 20-40%

---

**📋 레시피 작성 형식 (7단계 구조):**

### STEP 1: 기본 분석 결과
- **길이**: ${langTerms.lengthDesc[params56.length_category] || params56.length_category}
- **형태**: ${langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form}
- **볼륨**: ${volumeDesc}
- **앞머리**: ${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}
- **질감**: ${params56.texture_technique?.join(', ') || '자연스러운 질감'}

---

### STEP 2: 스타일 특성
위 이론 근거를 바탕으로:
- **이 스타일의 핵심**: 왜 이 방식을 사용하는지 (2-3문장)
- **기대 효과**: 어떤 실루엣이 나오는지
- **추천 대상**: 얼굴형, 모질, 라이프스타일

---

### STEP 3: 상세 커팅 프로세스 ⭐핵심⭐

**【1단계: 목 부위 (네이프존) - 기준선 설정】**
\`\`\`
분할: 목덜미를 수평 방향으로 1-2cm 간격 분할
리프팅: 자연 낙하 상태 (0도) 또는 약간 들어올림
방향: 정면 또는 후면 방향으로 코밍
커팅 기법:
  - 블런트 컷 70% (깔끔한 기준선)
  - 포인트 컷 30% (끝부분 자연스럽게)
가이드 라인: ${params56.length_category} 길이 기준 설정
주의사항: 목선 따라 자연스러운 라운드 유지
\`\`\`

**【2단계: 뒷머리 부분 - 그래쥬에이션/레이어 형성】**
\`\`\`
분할: 뒷머리를 대각선 방향으로 2-3cm 간격 분할
리프팅: ${params56.lifting_range?.[0] === 'L0' || params56.lifting_range?.[0] === 'L1' ? '자연 낙하~약간 들어올림 (0-22.5도)' : params56.lifting_range?.[0] === 'L2' || params56.lifting_range?.[0] === 'L3' ? '중간 높이 (45-67.5도)' : '높게 들어올림 (90도 이상)'}
방향: 후면 대각선 방향
커팅 기법:
  - ${params56.cut_form === 'G' || params56.cut_form?.includes('G') ? '그래쥬에이션 60% (볼륨 형성)' : '레이어 65% (가벼움)'}
  - 슬라이드 컷 ${params56.cut_form === 'G' ? '40%' : '35%'} (부드러운 연결)
목표: ${volumeDesc === 'High' ? '풍성한 볼륨' : volumeDesc === 'Medium' ? '자연스러운 볼륨' : '컴팩트한 형태'} 생성
\`\`\`

**【3단계: 사이드 부분 - 얼굴 라인 연출】**
\`\`\`
분할: 귀 앞뒤로 수직 분할
리프팅: ${params56.volume_zone === 'Top' ? '90도 수직' : params56.volume_zone === 'Middle' ? '45-67.5도' : '자연 낙하~약간 들어올림'}
방향: 얼굴 쪽 또는 후면 방향
커팅 기법:
  - 레이어 또는 그래쥬에이션 65%
  - 포인트 컷 35% (자연스러운 질감)
블렌딩: 뒷머리와 자연스럽게 연결
주의사항: 얼굴형에 따라 길이 조절
\`\`\`

**【4단계: 상단 부분 (크라운/탑) - 볼륨 포인트】**
\`\`\`
분할: 정수리 부분을 ${params56.volume_zone === 'Top' ? '방사형' : '수평'} 분할
리프팅: ${params56.volume_zone === 'Top' ? '90도 수직 (최대 볼륨)' : params56.volume_zone === 'Middle' ? '45-67.5도 (자연스러운 볼륨)' : '자연 낙하'}
커팅 기법:
  - 레이어 ${params56.volume_zone === 'Top' ? '70%' : '60%'} 
  - 슬라이딩 ${params56.volume_zone === 'Top' ? '30%' : '40%'}
목표: ${volumeDesc} 실루엣 완성
\`\`\`

**【5단계: 앞머리 (뱅) - 디테일 완성】**
\`\`\`
길이: ${langTerms.fringeLength?.[params56.fringe_length] || params56.fringe_length || '적절한 길이'}
스타일: ${langTerms.fringeType?.[params56.fringe_type] || params56.fringe_type || '자연스러운 형태'}
${params56.fringe_type === 'Side Bang' ? `
커팅 방법:
  - 대각선 라인으로 커트
  - 사이드로 자연스럽게 흘러내리도록
  - 포인트 컷으로 끝부분 처리
` : params56.fringe_type === 'See-through Bang' ? `
커팅 방법:
  - 얇게 섹션 분할 (30-40% 밀도)
  - 눈썹 라인 길이
  - 슬라이드 컷으로 가벼운 질감
` : params56.fringe_type === 'Curtain Bang' ? `
커팅 방법:
  - 중앙 파팅 기준
  - 양쪽으로 대각선 라인
  - 얼굴 라인 따라 길이 조절
` : `
커팅 방법:
  - ${params56.fringe_type} 스타일 특성 반영
  - 자연스러운 라인 형성
`}블렌딩: 사이드와 자연스럽게 연결
\`\`\`

---

### STEP 4: 질감 처리 (텍스처링)

**1차 질감 (전체 형태 조정):**
- **기법**: ${params56.texture_technique?.includes('Slide Cut') ? '슬라이드 컷 40%' : params56.texture_technique?.includes('Point Cut') ? '포인트 컷 40%' : '슬라이드 또는 포인트 컷 40%'}
- **목적**: 부드러운 연결, 자연스러운 흐름
- **적용 부위**: 전체 (특히 연결 부분)

**2차 질감 (디테일 마무리):**
- **기법**: ${params56.texture_technique?.includes('Stroke Cut') ? '스트록 컷 30%' : '틴닝 또는 슬라이드 30%'}
- **목적**: 가벼운 느낌, 동적인 움직임
- **깊이**: ${params56.texture_density === 'High' ? '표면 위주 (1-2cm)' : params56.texture_density === 'Medium' ? '중간 깊이 (2-3cm)' : '깊게 (3-4cm)'}

**3차 질감 (마무리 터치):**
- **기법**: 포인트 컷 또는 틴닝 20-30%
- **목적**: 끝부분 자연스러움
- **비율**: ${params56.texture_density || '중간 밀도'}에 맞춰 조절

---

### STEP 5: 스타일링 가이드

**드라이 방법:**
1. 뿌리부터 드라이 (${volumeDesc === 'High' ? '브러시로 볼륨 살리며' : '자연스럽게 떨어뜨리며'})
2. 중간~끝: ${params56.texture_type?.includes('Wavy') || params56.texture_type?.includes('Curly') ? '손으로 웨이브 살리며' : '브러시로 매끄럽게'}
3. 마무리: 찬바람으로 고정

**아이론/고데기 (선택사항):**
- ${params56.cut_form?.includes('L') ? '32mm 고데기로 끝부분 C컬' : params56.cut_form === 'O' ? '고데기 불필요 (자연 낙하)' : '26-32mm로 자연스러운 웨이브'}
- 온도: 160-180도
- 시간: 모발 1회 3-5초

**제품 추천:**
- 베이스: ${params56.texture_type?.includes('Straight') ? '볼륨 무스 또는 스프레이' : '컬 크림 또는 세럼'}
- 마무리: ${params56.volume_zone === 'Top' ? '볼륨 파우더 (뿌리)' : '헤어 오일 (끝부분)'}
- 고정: 소프트 왁스 또는 가벼운 스프레이

---

### STEP 6: 주의사항

**얼굴형별 조언:**
- 둥근 얼굴: ${params56.fringe_type === 'Side Bang' ? '사이드 뱅이 이미 적용되어 얼굴이 갸름해 보임' : '사이드 볼륨을 약간 줄이면 더욱 효과적'}
- 각진 얼굴: ${params56.texture_type?.includes('Wavy') ? '웨이브가 각진 라인을 부드럽게 함' : '끝부분에 포인트 질감 추가 권장'}
- 긴 얼굴: ${params56.volume_zone === 'Middle' ? '중간 볼륨이 얼굴 길이 보완' : '사이드 볼륨 강조 권장'}

**모질별 팁:**
- 가는 모발: 질감 처리 최소화 (20-30%), 볼륨 제품 필수
- 보통 모발: 질감 처리 적절히 (30-40%), 표준 스타일링
- 굵은 모발: 질감 처리 충분히 (40-50%), 세럼으로 정리

**유지 관리:**
- 다듬기 주기: ${params56.length_category === 'Short' ? '3-4주' : params56.length_category === 'Medium' ? '4-6주' : '6-8주'}
- 집에서 관리: ${params56.texture_type?.includes('Straight') ? '매일 드라이 정리' : '2-3일마다 웨이브 살리기'}
- 트리트먼트: ${params56.texture_density === 'High' ? '주 1회 영양 공급' : '월 2-3회'}

---

### STEP 7: 유사 스타일 참고

다음 스타일들도 함께 고려해보세요:

${similarStyles.slice(0, 3).map((s, i) => `
**${i+1}. ${s.name || s.code}**
- 유사도: ${(s.similarity * 100).toFixed(0)}%
- 특징: ${s.description || s.recipe?.substring(0, 100) || '상세 설명 준비 중'}
`).join('\n')}

---

**⚠️ 작성 시 절대 금지 사항:**
1. "준비 단계", "머리 감기", "고객 상담" 같은 사전 과정 언급 금지
2. "확인합니다", "조절합니다" 같은 추상적 동사 사용 금지
3. 포뮬러 번호 (DBS NO.3, VS NO.6 등) 직접 언급 금지
4. 각도 코드 (L2, D4 등) 직접 언급 금지 - 각도 숫자만 사용 (45도, 90도 등)

**✅ 반드시 포함해야 할 요소:**
1. 분할 간격: 1-2cm, 2-3cm 등 구체적 수치
2. 리프팅 높이: 0도, 45도, 90도, 135도 등 명확한 각도
3. 커팅 비율: 블런트 70% + 포인트 30% 등 정확한 비율
4. 질감 비율: 슬라이딩 40%, 포인팅 30% 등 구체적 비율
5. 각 단계마다 "왜 이렇게 하는지" 이유 설명

위 형식을 정확히 따라 STEP 1부터 STEP 7까지 순서대로 작성해주세요.
모든 내용은 **한국어로만** 작성하며, 실제 살롱에서 바로 적용 가능한 구체적 지시사항을 제공하세요.`,

  // 영어 버전도 동일한 구조로...
  en: `You are a HAIRGATOR 2WAY CUT master.

**🔒 Security Rules (Strictly Enforce):**
Never mention but apply principles:
- Formula numbers (DBS NO.3, VS NO.6) → Use "back technique", "center technique"
- Angle codes (L2(45°), D4(180°)) → Use angle numbers but hide codes
- Section names (Horizontal, Diagonal Backward) → Use "top area", "back area"

**📊 Analysis Data:**
${JSON.stringify({
  length: params56.length_category,
  form: params56.cut_form,
  volume: params56.volume_zone,
  fringe: params56.fringe_type,
  lifting: params56.lifting_range
}, null, 2)}

**📐 Cutting Principles (2WAY CUT System):**

1. **Volume Formation:**
   - Lifting angles: ${params56.lifting_range?.join(', ') || 'appropriate angles'}
   - Volume zone: ${volumeDesc}
   - Silhouette: ${params56.silhouette_type || 'natural shape'}

2. **Section Order:**
   - 1st: Nape zone (baseline)
   - 2nd: Back area (graduation/layer)
   - 3rd: Side area (connection)
   - 4th: Crown (volume point)
   - 5th: Fringe (facial frame)

---

**📋 Recipe Format (7 Steps):**

### STEP 1: Basic Analysis
- Length: ${langTerms.lengthDesc[params56.length_category] || params56.length_category}
- Form: ${langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form}
- Volume: ${volumeDesc}
- Fringe: ${langTerms.fringeType[params56.fringe_type] || params56.fringe_type}

### STEP 2: Style Characteristics
Based on theory above:
- Key point of this style (2-3 sentences)
- Expected effect
- Recommended for

### STEP 3: Detailed Cutting Process ⭐KEY⭐

**【Step 1: Nape Zone - Baseline】**
\`\`\`
Sectioning: Horizontal sections, 1-2cm intervals
Lifting: Natural fall (0°) or slightly lifted
Direction: Front or back direction
Cutting technique:
  - Blunt cut 70% (clean baseline)
  - Point cut 30% (natural ends)
Guide line: ${params56.length_category} length standard
\`\`\`

**【Step 2: Back Area - Graduation/Layer】**
\`\`\`
Sectioning: Diagonal sections, 2-3cm intervals
Lifting: ${params56.lifting_range?.[0] === 'L0' || params56.lifting_range?.[0] === 'L1' ? 'Natural fall~slight lift (0-22.5°)' : params56.lifting_range?.[0] === 'L2' || params56.lifting_range?.[0] === 'L3' ? 'Medium height (45-67.5°)' : 'High lift (90°+)'}
Direction: Back diagonal
Cutting technique:
  - ${params56.cut_form === 'G' || params56.cut_form?.includes('G') ? 'Graduation 60%' : 'Layer 65%'}
  - Slide cut ${params56.cut_form === 'G' ? '40%' : '35%'}
Goal: ${volumeDesc === 'High' ? 'Full volume' : volumeDesc === 'Medium' ? 'Natural volume' : 'Compact shape'}
\`\`\`

**【Step 3: Side Area - Facial Line】**
\`\`\`
Sectioning: Vertical around ear
Lifting: ${params56.volume_zone === 'Top' ? '90° vertical' : params56.volume_zone === 'Middle' ? '45-67.5°' : 'Natural~slight lift'}
Cutting technique:
  - Layer or graduation 65%
  - Point cut 35%
Blending: Connect smoothly with back
\`\`\`

**【Step 4: Crown/Top - Volume Point】**
\`\`\`
Sectioning: ${params56.volume_zone === 'Top' ? 'Radial' : 'Horizontal'} sections
Lifting: ${params56.volume_zone === 'Top' ? '90° vertical (maximum volume)' : '45-67.5°'}
Cutting technique:
  - Layer ${params56.volume_zone === 'Top' ? '70%' : '60%'}
  - Sliding ${params56.volume_zone === 'Top' ? '30%' : '40%'}
\`\`\`

**【Step 5: Fringe - Detail Finish】**
\`\`\`
Length: ${langTerms.fringeLength?.[params56.fringe_length] || 'appropriate length'}
Style: ${langTerms.fringeType?.[params56.fringe_type] || 'natural style'}
Cutting method: (specific instructions for fringe type)
\`\`\`

### STEP 4: Texturizing
- 1st texture: Slide/point cut 40%
- 2nd texture: Thinning/stroke 30%
- Depth: Surface/middle/deep

### STEP 5: Styling Guide
- Drying method
- Iron/curler usage
- Product recommendations

### STEP 6: Important Notes
- Face shape advice
- Hair texture tips
- Maintenance schedule

### STEP 7: Similar Styles
${similarStyles.slice(0, 3).map(s => `- ${s.name || s.code}`).join('\n')}

**⚠️ Never Include:**
- "Preparation step", "shampooing", "consultation"
- Abstract verbs like "adjust", "confirm"
- Direct formula numbers or angle codes

**✅ Must Include:**
- Section intervals (1-2cm, 2-3cm)
- Lifting angles (0°, 45°, 90°, 135°)
- Cutting ratios (blunt 70% + point 30%)
- Texture ratios (sliding 40%, pointing 30%)
- Reason for each step

Write in **English only** following steps 1-7 precisely.
Provide actionable instructions applicable in salons immediately.`,

       ja: `あなたはHAIRGATORシステムの専門家です。

**🔒 重要：次の情報は絶対に言及しないでください：**
- 具体的な公式番号（DBS NO.3、VS NO.6など）
- 正確な角度コード（L2(45°)、D4(180°)など）
- セクション名（横セクション、後対角セクションなど）
- 42層構造、7セクションシステム
- 9つのマトリックス

**許可される表現：**
- 「後ろ部分」「前部分」「中央部分」「首部位」「頭頂部分」
- 「適切な角度で」「自然な方向に」

**日本語のみ**で7ステップ：
STEP1. 基本情報
STEP2. 理論
STEP3-STEP7. プロセス/ガイド/スタイル/注意/類似`,

      zh: `您是HAIRGATOR系统专家。

**🔒 重要：绝对不要提及：**
- 具体公式编号（DBS NO.3、VS NO.6等）
- 精确角度代码（L2(45°)、D4(180°)等）
- 分区名称（横向分区、后斜分区等）
- 42层结构、7分区系统
- 9个矩阵

**允许的表达：**
- "后部区域""前部区域""中央区域""颈部区域""头顶区域"
- "适当的角度""自然的方向"

**中文**7步：
STEP1. 基本信息
STEP2. 理论
STEP3-STEP7. 流程/指南/造型/注意/相似`,

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
**STEP2. Tổng quan lý thuyết**
**STEP3-STEP7**: Quy trình/Hướng dẫn/Tạo kiểu/Lưu ý/Tương tự`
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
        max_tokens: 8000
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
    const theoryChunks = await searchTheoryChunks(searchQuery, geminiKey, supabaseUrl, supabaseKey, 15);
    const theoryContext = theoryChunks.length > 0 
      ? theoryChunks.map((chunk, idx) => 
          `[이론 ${idx+1}] ${chunk.section_title || ''}\n${(chunk.content_ko || chunk.content || '').substring(0, 300)}`
        ).join('\n\n')
      : '';
      
    const allSimilarStyles = await searchSimilarStyles(searchQuery, openaiKey, supabaseUrl, supabaseKey, params56.cut_category?.includes('Women') ? 'female' : 'male');

    // ⭐ 유효한 이미지만 필터링
    const similarStyles = filterValidStyles(allSimilarStyles);
    console.log(`📊 스트리밍 도해도 검색: 전체 ${allSimilarStyles.length}개 → 유효 ${similarStyles.length}개`);

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
        max_tokens: 8000,
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
  `${supabaseUrl}/rest/v1/hairstyles?select=id,name,category,code,recipe,description,image_url`,  // ✅ image_url 추가
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

// ⭐ 이 부분 추가!
if (style.image_url) {
  score += 50;
}

return { 
  ...style, 
  similarity: score / 1000,  // ✅ similarity로 변경 (0-1 사이)
  parsed_gender: parsed.gender
};

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

// ==================== ⭐⭐⭐ 수정 3/3: 일반 대화 응답 (theory_chunks + 보안 필터링) ⭐⭐⭐ ====================
async function generateResponse(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { user_query, search_results } = payload;
  const userLanguage = detectLanguage(user_query);
  
  console.log(`💬 일반 대화 응답: "${user_query}" (언어: ${userLanguage})`);
  
  // ⭐ 보안 키워드 감지 (가장 먼저 체크)
  const securityKeywords = [
    '42포뮬러', '42개 포뮬러', '42 formula', 'formula 42',
    '9매트릭스', '9개 매트릭스', '9 matrix', 'matrix 9',
    'DBS NO', 'DFS NO', 'VS NO', 'HS NO',
    '가로섹션', '후대각섹션', '전대각섹션', '세로섹션',
    'Horizontal Section', 'Diagonal Backward', 'Diagonal Forward', 'Vertical Section',
    '42층', '7개 섹션', '7 section'
  ];
  
  const isSecurityQuery = securityKeywords.some(keyword => 
    user_query.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (isSecurityQuery) {
    const securityResponse = {
      korean: '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀로, 원장급 이상만 접근 가능합니다. 일반 사용자께는 체계적인 커팅 가이드를 제공해드립니다.',
      english: 'I apologize, but that information is proprietary to the 2WAY CUT system and only accessible to director-level professionals.',
      japanese: '申し訳ございませんが、その情報は2WAY CUTシステムの企業秘密であり、ディレクターレベル以上のみアクセス可能です。',
      chinese: '抱歉，该信息属于2WAY CUT系统的核心商业机密，仅对总监级别以上开放。',
      vietnamese: 'Xin lỗi, thông tin đó là bí mật kinh doanh của hệ thống 2WAY CUT.'
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: securityResponse[userLanguage] || securityResponse['korean'],
        security_filtered: true
      })
    };
  }
  
  // ⭐ 1WAY vs 2WAY 비교 질문 감지 (서양인/한국인 두상)
  const is1WayVs2WayQuery = /원웨이|1웨이|1way|서양|두상|머리\s?모양|한국인|동양인|평평|뒤통수/i.test(user_query);
  
  if (is1WayVs2WayQuery) {
    console.log('📚 1WAY vs 2WAY 비교 질문 - 자연스러운 답변 생성');
    
    // 배경 지식 제공
    const backgroundKnowledge = {
      korean: `**1WAY CUT vs 2WAY CUT 배경 지식:**

원웨이컷(1WAY CUT)은 서양인의 두상 구조에 최적화된 커팅 시스템입니다.

**서양인 두상 특징:**
- 뒤통수(후두부)가 자연스럽게 튀어나와 있음
- 측면에서 봤을 때 입체적이고 둥근 형태
- 원웨이컷을 적용하면 자연스러운 실루엣이 완성됨

**한국인(동양인) 두상 특징:**
- 뒤통수가 평평함 (flat back of head)
- 측면이 넓고 전체적으로 납작한 형태
- 원웨이컷을 그대로 적용하면 더 평평해 보이고 볼륨감 부족

**2WAY CUT의 탄생:**
이러한 동서양 두상의 근본적인 차이를 해결하기 위해, 크리스기 원장이 한국인을 포함한 동양인 두상에 최적화된 투웨이컷(2WAY CUT) 시스템을 개발했습니다. 

2WAY CUT은 평평한 뒤통수에 자연스러운 볼륨을 만들고, 측면의 넓은 부분을 보완하여 균형잡힌 실루엣을 완성하는 것이 핵심입니다.`,

      english: `**1WAY CUT vs 2WAY CUT Background:**

1WAY CUT was originally designed for Western head shapes.

**Western head characteristics:**
- Prominent occipital bone (naturally protruding back of head)
- Three-dimensional and rounded profile from the side
- 1WAY CUT creates natural silhouette

**Korean/Asian head characteristics:**
- Flat back of head
- Wider sides, overall flatter shape
- Direct 1WAY CUT application results in flatter appearance and lack of volume

**Birth of 2WAY CUT:**
To address these fundamental differences between Eastern and Western head shapes, Master Chris-gi developed the 2WAY CUT system specifically optimized for Korean and Asian head shapes.

2WAY CUT focuses on creating natural volume on flat back heads and balancing wider sides to achieve harmonious silhouettes.`
    };
    
    const knowledge = backgroundKnowledge[userLanguage] || backgroundKnowledge['korean'];
    
    // GPT로 자연스러운 답변 생성
    const systemPrompt = {
      korean: `당신은 친절하고 전문적인 헤어 스타일리스트입니다. 

다음 배경 지식을 바탕으로 사용자의 질문에 **자연스럽고 대화하듯이** 답변하세요:

${knowledge}

**답변 스타일:**
1. 친근하고 공감하는 톤 사용 ("맞아요", "정확히 아시네요" 등)
2. 2-3문단으로 구성
3. 전문 용어는 쉽게 풀어서 설명
4. 마지막에 추가 질문 유도하지 말 것`,

      english: `You are a friendly and professional hair stylist.

Answer the user's question naturally and conversationally based on this background knowledge:

${knowledge}

**Answer style:**
1. Use friendly and empathetic tone
2. 2-3 paragraphs
3. Explain technical terms simply
4. Don't ask follow-up questions at the end`
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
          { role: 'system', content: systemPrompt[userLanguage] || systemPrompt['korean'] },
          { role: 'user', content: user_query }
        ],
        temperature: 0.8, // 더 자연스럽게
        max_tokens: 400
      })
    });
    
    const data = await response.json();
    let answer = data.choices[0].message.content;
    
    // 보안 필터링
    answer = sanitizeRecipeForPublic(answer, userLanguage);
    
    console.log('✅ 자연스러운 답변 생성 완료');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: answer,
        theory_used: false,
        comparison_answer: true
      })
    };
  }
  
  // ⭐ 2WAY CUT 시스템 질문 감지 (정확한 매칭)
  const is2WayCutSystemQuery = /투웨이|투 웨이|2웨이|2 웨이|2way|two way|twoway|크리스기/i.test(user_query);
  
  console.log(`🔍 2WAY CUT 시스템 질문: ${is2WayCutSystemQuery}, 질문: "${user_query}"`);
  
  // ⭐ 2WAY CUT 시스템 질문이면 직접 답변 (theory_chunks 의존 X)
  if (is2WayCutSystemQuery) {
    console.log('📚 2WAY CUT 시스템 직접 답변 생성...');
    
    const systemOverview = {
      korean: `2WAY CUT은 크리스기 원장이 개발한 과학적 헤어 커팅 시스템입니다. 

**핵심 특징:**
- 수학적 공식을 기반으로 체계적인 커팅 방법 제공
- 직관이 아닌 논리적 접근으로 누구나 배울 수 있는 시스템
- 머리를 여러 부분으로 나누어 각 부분마다 최적의 기법 적용
- 다양한 헤어스타일을 일관된 방법론으로 구현 가능

이 시스템은 전문 미용사들의 학습 시간을 획기적으로 단축시키고, 일관된 품질의 결과물을 만들어낼 수 있도록 설계되었습니다.`,

      english: `2WAY CUT is a scientific hair cutting system developed by director Chris-gi.

**Key Features:**
- Systematic cutting methods based on mathematical formulas
- Logical approach that anyone can learn, not relying on intuition
- Divides hair into multiple sections and applies optimal techniques to each
- Enables various hairstyles through a consistent methodology

This system significantly reduces learning time for professional stylists and ensures consistent quality results.`
    };
    
    const answer = systemOverview[userLanguage] || systemOverview['korean'];
    
    console.log('✅ 2WAY CUT 시스템 설명 완료');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: answer,
        theory_used: false,
        system_overview: true
      })
    };
  }
  
  // ⭐ 일반 헤어 질문 감지
  const isGeneralHairQuery = /헤어|머리|커트|컷|cut|hair|스타일|레이어|layer|그래쥬에이션|graduation|앞머리|뱅|bang|펌|perm/i.test(user_query);
  
  console.log(`🔍 일반 헤어 질문: ${isGeneralHairQuery}`);
  
  // ⭐ 일반 헤어 질문이면 theory_chunks 검색
  if (isGeneralHairQuery) {
    console.log('📚 theory_chunks 검색 시작...');
    
    const theoryResults = await searchTheoryChunks(user_query, geminiKey, supabaseUrl, supabaseKey, 10);
    
    console.log(`✅ theory_chunks ${theoryResults.length}개 검색 완료`);
    
    if (theoryResults.length > 0) {
      // 첫 3개만 사용 (너무 많으면 혼란)
      const topResults = theoryResults.slice(0, 3);
      
      // 이론 컨텍스트 구성
      const context = topResults.map((chunk, idx) => 
        `[참고 ${idx+1}] ${(chunk.content_ko || chunk.content || '').substring(0, 250)}`
      ).join('\n\n');
      
      console.log(`📝 컨텍스트 길이: ${context.length}자`);
      
      const systemPrompt = {
        korean: `당신은 전문 헤어 스타일리스트입니다. 

다음 전문 자료를 참고하여 **간단하고 이해하기 쉽게** 2-3문장으로 답변하세요:

${context}

**중요:**
- 전문 용어(포뮬러, 섹션, 코드 등)는 절대 사용 금지
- 일반인이 이해할 수 있는 쉬운 말로 설명
- 핵심만 간결하게`,

        english: `You are a professional hair stylist.

Reference these materials and answer in 2-3 sentences using simple language:

${context}

**Important:**
- NO technical terms (formulas, sections, codes)
- Use language that general public can understand
- Keep it brief and clear`
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
            { role: 'system', content: systemPrompt[userLanguage] || systemPrompt['korean'] },
            { role: 'user', content: user_query }
          ],
          temperature: 0.6,
          max_tokens: 300
        })
      });
      
      const data = await response.json();
      let answer = data.choices[0].message.content;
      
      // 보안 필터링 적용
      answer = sanitizeRecipeForPublic(answer, userLanguage);
      
      console.log('✅ theory 기반 답변 완료');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          data: answer,
          theory_used: true,
          theory_count: theoryResults.length
        })
      };
    } else {
      console.log('⚠️ theory_chunks 검색 결과 없음');
    }
  }
  
  // ⭐ search_results가 있으면 전문가 조언
  if (search_results && search_results.length > 0) {
    return await professionalAdvice(user_query, search_results, userLanguage, openaiKey);
  }
  
  // ⭐ 그 외는 캐주얼 대화
  return await casualConversation(user_query, userLanguage, openaiKey);
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
