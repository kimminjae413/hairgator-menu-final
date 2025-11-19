// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - ULTRA FINAL 버전 (2025-01-25)
// 
// 🔥 최종 수정사항:
// 1. H Length vs G Length 판단 프롬프트 극강화
// 2. 시각적 체크리스트 추가
// 3. 단계별 판단 로직 명확화
// ==================== 

const fetch = require('node-fetch');
const { PARAMS_56_SCHEMA } = require('./params56-schema.js');

// 프롬프트 빌더 import
const { buildKoreanPrompt } = require('./prompts/korean-prompt.js');
const { buildEnglishPrompt } = require('./prompts/english-prompt.js');
const { buildJapanesePrompt } = require('./prompts/japanese-prompt.js');
const { buildChinesePrompt } = require('./prompts/chinese-prompt.js');
const { buildVietnamesePrompt } = require('./prompts/vietnamese-prompt.js');

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

    console.log('🔑 환경변수 확인 완료');

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

// ==================== 이미지 분석 (Structured Output) - ULTRA 버전 ====================
async function analyzeImage(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  // ✅ 완전 수정된 systemPrompt (머리카락 끝 위치 기준)
  const systemPrompt = `당신은 전문 헤어 스타일리스트입니다. 
업로드된 헤어스타일 이미지를 56개 파라미터로 정확히 분석하세요.

## 🔥🔥🔥 길이 판단 절대 원칙 🔥🔥🔥

**⚠️ 중요: "머리카락 끝"의 신체 위치만 보세요! 귀가 보이는지는 중요하지 않습니다!**

### 📐 길이 기준 (머리카락 "끝"이 어디에 닿는가?)
\`\`\`
A Length (65cm) ═══════ 머리카락 끝이 가슴 아래 (배꼽 근처) - 가장 김!
B Length (50cm) ═══════ 머리카락 끝이 가슴 중간 (유두 높이)
C Length (40cm) ═══════ 머리카락 끝이 쇄골뼈
D Length (35cm) ═══════ 머리카락 끝이 어깨선 ⭐ 핵심 기준!
E Length (30cm) ═══════ 머리카락 끝이 어깨 위 2-3cm
F Length (25cm) ═══════ 머리카락 끝이 턱뼈 아래 (목 시작)
G Length (20cm) ═══════ 머리카락 끝이 턱선 (Jaw Line) ⭐⭐⭐
H Length (15cm) ═══════ 머리카락 끝이 귀 높이 - 가장 짧음!
\`\`\`

---

## 🎯 2단계 판단 프로세스 (단순하고 명확하게!)

### 【STEP 1】 머리카락 끝의 절대 위치 파악
**"이미지에서 머리카락의 가장 긴 부분(끝)이 신체 어디에 닿는가?"**

⭐ **절대적 기준점 (위에서 아래로):**
1. 가슴 아래? → **A Length**
2. 가슴 중간? → **B Length**
3. 쇄골? → **C Length**
4. **어깨선?** → **D Length** ⭐⭐⭐ (가장 중요한 기준선!)
5. 어깨 위 2-3cm? → **E Length**
6. 턱 아래 (목 시작)? → **F Length**
7. **턱선?** → **G Length** ⭐⭐⭐
8. 귀 높이? → **H Length**

---

### 【STEP 2】 H vs G 최종 구분 (가장 헷갈리는 부분!)

**🔴 핵심 질문: "머리카락 끝이 턱뼈보다 위인가? 아래인가?"**

**📏 측정 방법:**
1. 턱뼈의 각도 라인(Jaw Line) 위치를 상상
2. 머리카락 끝이 그 라인보다:
   - **위쪽 (귀 쪽)** → **H Length** ⭐
   - **라인 위에 정확히** → **G Length** ⭐
   - **아래쪽 (목 쪽)** → **F Length**

---

## 🔍 구체적인 예시로 이해하기

### ✅ H Length 예시
\`\`\`
- 짧은 단발 (bob cut)
- 머리카락 끝이 귀 중간~귀 아래
- 턱선보다 확실히 위쪽
- 목 전체가 완전히 노출

❌ 주의: 긴 머리를 귀 뒤로 넘겨서 귀가 보여도,
         머리카락 끝이 어깨 아래면 H Length 아님!
\`\`\`

### ⚠️ G Length 예시
\`\`\`
- 턱선 길이 bob
- 머리카락 끝이 턱뼈 라인에 정확히 닿음
- 턱 윤곽선을 따라감
- 목 상단이 약간 보이거나 거의 안 보임

🎯 판단 포인트: 턱선을 따라 흐르는가?
\`\`\`

### 📐 F Length 예시
\`\`\`
- 턱선보다 살짝 긴 bob
- 머리카락 끝이 턱뼈 아래 (목 시작 부분)
- 목 상단 일부가 보임
- 어깨와는 확실한 거리

🎯 판단 포인트: 턱과 어깨 중간
\`\`\`

---

## 💡 애매한 경우 최종 판단 기준

**Case 1: H vs G 사이?**
→ 머리카락 끝이 턱선보다 위? → **H**
→ 머리카락 끝이 턱선 위? → **G**
→ 정확히 경계? → **더 짧은 쪽 (H) 선택**

**Case 2: G vs F 사이?**
→ 머리카락 끝이 턱뼈 위치? → **G**
→ 머리카락 끝이 턱뼈 아래? → **F**
→ 정확히 경계? → **더 긴 쪽 (F) 선택**

**Case 3: 한쪽은 짧고 한쪽은 길어서 애매?**
→ **가장 긴 부분(끝) 기준**으로 판단

---

## 🚫 절대 하지 말아야 할 실수

❌ "귀가 보이니까 H Length" → **틀림!**
   → 긴 머리도 귀 뒤로 넘기면 귀 보임

❌ "목이 많이 보이니까 H Length" → **위험!**
   → 목 노출은 참고만, 절대 기준은 머리카락 끝!

❌ "단발머리니까 무조건 G나 H" → **틀림!**
   → D/E/F Length 단발도 있음

✅ **오직 "머리카락 끝이 신체 어디?"만 보세요!**

---

## 📸 분석 순서 (반드시 이 순서로!)

1️⃣ **어깨선 확인** (D Length 체크)
   - 머리카락 끝이 어깨에 닿음? → **D Length 확정**

2️⃣ **어깨보다 긴가? 짧은가?**
   - 긴 쪽 → A/B/C 중 하나
   - 짧은 쪽 → E/F/G/H 중 하나

3️⃣ **짧은 경우: 턱선 기준으로 재확인**
   - 턱선보다 위 → **H Length**
   - 턱선 위치 → **G Length**
   - 턱선 아래 → **F Length**
   - 턱과 어깨 중간 → **E Length**

---

## ✂️ 커트 형태 - 반드시 괄호 포함
- **"O (One Length)"** / **"G (Graduation)"** / **"L (Layer)"**

## 📐 리프팅 각도 - 반드시 배열
- **["L0"]** / **["L2"]** / **["L2", "L4"]**

## 🎨 질감 기법 - 반드시 배열
**✅ 올바른 출력:** 
  - ["Point Cut", "Slide Cut"]
  - ["Stroke Cut"]
  - [] (없으면 빈 배열)

**❌ 잘못된 출력:** 
  - "Point Cut, Slide Cut" (문자열 ❌)
  - null (❌)

## 💇 펌/컬 - 있는 경우만
- curl_pattern: C-Curl / CS-Curl / S-Curl / SS-Curl / null
- curl_strength: Soft / Medium / Strong / null
- perm_type: Wave Perm / Digital Perm / Heat Perm / Iron Perm / null

## 🎯 최종 검증

**반드시 다시 한번 확인:**
1. 귀가 완전히 보이는가? → YES = H Length 강력 후보
2. 머리카락이 어깨에 닿는가? → YES = D Length 확정
3. 목 노출이 50% 이상인가? → YES = E Length 이상
4. cut_form은 O/G/L 중 하나 + 괄호 포함
5. lifting_range는 배열 형태
6. texture_technique는 배열 (없으면 [])

JSON Schema에 정확히 맞춰 출력하세요.`;

  try {
    console.log('📸 Gemini 이미지 분석 시작 (ULTRA 프롬프트)');

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
            temperature: 0.2,  // 0.3 → 0.2로 낮춤 (더 일관된 판단)
            topP: 0.90,        // 0.95 → 0.90으로 낮춤
            topK: 30,          // 40 → 30으로 낮춤
            maxOutputTokens: 2048,
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const params56 = JSON.parse(text);
    
    // ✅ 추가 검증 로직: H Length 재확인
    if (params56.length_category === 'G Length') {
      console.log('⚠️ G Length 판단 재검증 필요');
      // 로그만 남기고, AI 판단 존중 (나중에 피드백 수집용)
    }
    
    if (params56.lifting_range && params56.lifting_range.length > 0) {
      const maxLifting = params56.lifting_range[params56.lifting_range.length - 1];
      const calculatedVolume = calculateVolumeFromLifting(maxLifting);
      
      if (calculatedVolume !== params56.volume_zone) {
        console.log(`⚠️ Volume 불일치: Structured=${params56.volume_zone}, Calculated=${calculatedVolume}`);
      }
    }

    console.log('✅ 분석 완료 (ULTRA):', {
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

// ==================== 리프팅 각도 → 볼륨 계산 ====================
function calculateVolumeFromLifting(liftingCode) {
  const angles = {
    'L0': 0, 'L1': 22.5, 'L2': 45, 'L3': 67.5,
    'L4': 90, 'L5': 112.5, 'L6': 135, 'L7': 157.5, 'L8': 180
  };
  
  const angle = angles[liftingCode] || 0;
  
  if (angle < 45) return 'Low';
  if (angle < 90) return 'Medium';
  return 'High';
}

// ==================== 보안 필터링 ====================
function sanitizeRecipeForPublic(recipe, language = 'ko') {
  if (!recipe) return recipe;
  
  let filtered = recipe;
  
  filtered = filtered.replace(/DBS\s+NO\.\s*\d+/gi, '뒷머리 기법');
  filtered = filtered.replace(/DFS\s+NO\.\s*\d+/gi, '앞머리 기법');
  filtered = filtered.replace(/VS\s+NO\.\s*\d+/gi, '중앙 기법');
  filtered = filtered.replace(/HS\s+NO\.\s*\d+/gi, '상단 기법');
  filtered = filtered.replace(/UP[\s-]?STEM\s+NO\.\s*\d+/gi, '정수리 기법');
  filtered = filtered.replace(/NAPE\s+ZONE\s+NO\.\s*\d+/gi, '목 부위 기법');
  
  filtered = filtered.replace(/가로섹션|Horizontal\s+Section/gi, '상단 부분');
  filtered = filtered.replace(/후대각섹션|Diagonal\s+Backward\s+Section/gi, '뒷머리 부분');
  filtered = filtered.replace(/전대각섹션|Diagonal\s+Forward\s+Section/gi, '앞쪽 부분');
  filtered = filtered.replace(/세로섹션|Vertical\s+Section/gi, '중앙 부분');
  filtered = filtered.replace(/네이프존|Nape\s+Zone/gi, '목 부위');
  filtered = filtered.replace(/업스템|Up[\s-]?Stem/gi, '정수리 부분');
  filtered = filtered.replace(/백존|Back\s+Zone/gi, '후면 부분');
  
  filtered = filtered.replace(/L[0-8]\s*\([^)]+\)/gi, '적절한 각도로');
  filtered = filtered.replace(/D[0-8]\s*\([^)]+\)/gi, '자연스러운 방향으로');
  
  filtered = filtered.replace(/42층|42\s+layers?|42-layer/gi, '전문적인 층 구조');
  filtered = filtered.replace(/\d+층\s+구조/gi, '체계적인 층 구조');
  
  filtered = filtered.replace(/9개\s+매트릭스|9\s+matrix|nine\s+matrix/gi, '체계적인 분류');
  filtered = filtered.replace(/매트릭스\s+코드|matrix\s+code/gi, '스타일 분류');
  
  filtered = filtered.replace(/7개\s+섹션|7개\s+존|7\s+section|7\s+zone/gi, '여러 부분');
  
  filtered = filtered.replace(/\(Book\s+[A-E],\s+p\.\s*\d+\)/gi, '');
  filtered = filtered.replace(/\(2WAY\s+CUT\s+Book\s+[A-E],\s+Page\s+\d+\)/gi, '');
  
  console.log('🔒 보안 필터링 완료');
  return filtered;
}

// ==================== 유효한 이미지 필터링 ====================
function filterValidStyles(styles) {
  if (!styles || !Array.isArray(styles)) {
    console.log('⚠️ styles가 배열이 아니거나 undefined');
    return [];
  }

  const filtered = styles.filter(style => {
    if (!style.image_url) {
      console.log(`❌ 제외: ${style.code} - image_url 없음`);
      return false;
    }
    
    if (typeof style.image_url !== 'string') {
      console.log(`❌ 제외: ${style.code} - image_url이 문자열이 아님`);
      return false;
    }
    
    if (style.image_url.trim() === '') {
      console.log(`❌ 제외: ${style.code} - image_url이 빈 문자열`);
      return false;
    }
    
    if (style.image_url.includes('/temp/') || 
        style.image_url.includes('/temporary/')) {
      console.log(`❌ 제외: ${style.code} - 임시 이미지`);
      return false;
    }
    
    console.log(`✅ 유효: ${style.code}`);
    return true;
  });

  console.log(`📊 필터링 결과: ${filtered.length}개 유효 (전체 ${styles.length}개)`);
  return filtered;
}

// ==================== theory_chunks 벡터 검색 ====================
async function searchTheoryChunks(query, geminiKey, supabaseUrl, supabaseKey, matchCount = 15) {
  try {
    console.log(`🔍 theory_chunks 벡터 검색: "${query}"`);
    
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

// ==================== 길이별 도해도 코드 매칭 ====================
function getLengthCodePrefix(lengthCategory) {
  const lengthMap = {
    'A Length': 'FAL',
    'B Length': 'FBL',
    'C Length': 'FCL',
    'D Length': 'FDL',
    'E Length': 'FEL',
    'F Length': 'FFL',
    'G Length': 'FGL',
    'H Length': 'FHL'
  };
  
  return lengthMap[lengthCategory] || null;
}

// ==================== 언어별 용어 매핑 ====================
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
      volume: {
        'Low': 'Low volume (0-44°)',
        'Medium': 'Medium volume (45-89°)',
        'High': 'High volume (90°+)'
      }
    },
    ja: {
      lengthDesc: {
        'A Length': '胸下',
        'D Length': '肩のライン',
        'E Length': '肩上5cm',
        'G Length': '顎のライン'
      },
      formDesc: {
        'O': 'ワンレングス',
        'G': 'グラデーション',
        'L': 'レイヤー'
      },
      fringeType: {
        'Full Bang': '全体前髪',
        'Side Bang': '横に流した前髪',
        'No Fringe': '前髪なし'
      },
      volume: {
        'Low': '下部ボリューム',
        'Medium': '中部ボリューム',
        'High': '上部ボリューム'
      }
    },
    zh: {
      lengthDesc: {
        'A Length': '胸部以下',
        'D Length': '肩线',
        'E Length': '肩上5厘米',
        'G Length': '下巴线'
      },
      formDesc: {
        'O': '齐长',
        'G': '渐层',
        'L': '层次'
      },
      fringeType: {
        'Full Bang': '全刘海',
        'Side Bang': '侧分刘海',
        'No Fringe': '无刘海'
      },
      volume: {
        'Low': '下部体积',
        'Medium': '中部体积',
        'High': '上部体积'
      }
    },
    vi: {
      lengthDesc: {
        'A Length': 'Dưới ngực',
        'D Length': 'Vai',
        'E Length': '5cm trên vai',
        'G Length': 'Đường cằm'
      },
      formDesc: {
        'O': 'Một độ dài',
        'G': 'Tầng nấc',
        'L': 'Lớp'
      },
      fringeType: {
        'Full Bang': 'Mái đầy',
        'Side Bang': 'Mái lệch',
        'No Fringe': 'Không mái'
      },
      volume: {
        'Low': 'Thể tích thấp',
        'Medium': 'Thể tích trung',
        'High': 'Thể tích cao'
      }
    }
  };
  
  return terms[lang] || terms['ko'];
}

// ==================== 레시피 생성 ====================
async function generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 레시피 생성 시작:', params56.length_category, '언어:', language);

    const searchQuery = `${params56.length_category || ''} ${params56.cut_form || ''} ${params56.volume_zone || ''} Volume`;
    const theoryChunks = await searchTheoryChunks(searchQuery, geminiKey, supabaseUrl, supabaseKey, 5);  // ⚡ 10 → 5
    
    const theoryContext = theoryChunks.length > 0 
      ? theoryChunks.map((chunk, idx) => {
          const title = chunk.section_title || '';
          const content = (chunk.content_ko || chunk.content || '').substring(0, 300);
          return `[이론 ${idx+1}] ${title}\n${content}`;
        }).join('\n\n')
      : '관련 이론을 찾을 수 없습니다.';

    const allSimilarStyles = await searchSimilarStyles(
      searchQuery, 
      openaiKey, 
      supabaseUrl, 
      supabaseKey, 
      params56.cut_category?.includes('Women') ? 'female' : 'male',
      params56.length_category
    );

    const similarStyles = filterValidStyles(allSimilarStyles);
    console.log(`📊 도해도 검색 완료: 전체 ${allSimilarStyles.length}개 → 유효 ${similarStyles.length}개`);
    
    const langTerms = getTerms(language);
    const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];

    const similarStylesTextKo = similarStyles.slice(0, 3).map((s, i) => {
      const name = s.name || s.code || '이름없음';
      const similarity = ((s.similarity || 0) * 100).toFixed(0);
      const desc = s.description || (s.recipe ? s.recipe.substring(0, 100) : '상세 설명 준비 중');
      return `**${i+1}. ${name}**\n- 유사도: ${similarity}%\n- 특징: ${desc}`;
    }).join('\n\n');

    const similarStylesTextEn = similarStyles.slice(0, 3).map((s, i) => {
      const name = s.name || s.code || 'Unnamed';
      return `${i+1}. ${name}`;
    }).join('\n');

    // ⚡ 긴급 수정: 간단한 프롬프트로 교체 (속도 개선)
    const simpleSystemPrompt = `당신은 전문 헤어 스타일리스트입니다.

다음 정보로 간단하고 실용적인 커팅 레시피를 작성하세요:

**분석 결과:**
- 길이: ${params56.length_category} (${langTerms.lengthDesc[params56.length_category] || params56.length_category})
- 형태: ${params56.cut_form}
- 볼륨: ${params56.volume_zone} (${volumeDesc})
- 앞머리: ${params56.fringe_type || '없음'}
- 모질: ${params56.hair_texture || '보통'}

**레시피 구성:**
1. 전체 개요 (2-3줄)
2. 주요 커팅 방법 (3-4단계)
3. 스타일링 팁 (2-3줄)

간결하고 실용적으로 작성하세요. 총 500자 이내.`;

    const systemPrompt = simpleSystemPrompt;

    const strictLanguageMessage = {
      ko: '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요.',
      en: 'You are an English expert. Write ALL responses in English ONLY.',
      ja: 'あなたは日本語の専門家です。すべての応答を日本語のみで書いてください。',
      zh: '你是中文专家。所有回答只用中文。',
      vi: 'Bạn là chuyên gia tiếng Việt. Viết TẤT CẢ phản hồi chỉ bằng tiếng Việt.'
    }[language] || '당신은 한국어 전문가입니다.';

    const userPrompt = `다음 파라미터로 레시피를 생성하세요:\n길이: ${params56.length_category}\n형태: ${params56.cut_form}\n볼륨: ${params56.volume_zone}`;

    // ✅ 시스템 프롬프트 합치기 (400 에러 방지)
    const combinedSystemPrompt = `${strictLanguageMessage}\n\n${systemPrompt}`;

    // ⚡⚡⚡ 스트리밍 방식으로 변경! ⚡⚡⚡
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: combinedSystemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 2000,
        stream: true  // ⭐⭐⭐ 스트리밍 활성화!
      })
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API Error: ${completion.status}`);
    }

    // ⚡ 스트리밍 응답 처리
    let fullRecipe = '';
    const reader = completion.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullRecipe += content;
            }
          } catch (e) {
            // 파싱 에러 무시
          }
        }
      }
    }

    let recipe = fullRecipe;

    recipe = sanitizeRecipeForPublic(recipe, language);

    console.log('✅ 레시피 생성 완료');

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

// ==================== 스트리밍 레시피 생성 (진짜 스트리밍) ====================
async function generateRecipeStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 스트리밍 레시피 생성 시작:', params56.length_category, '언어:', language);

    // ⚡ 간단한 프롬프트만 사용 (속도 최우선)
    const langTerms = getTerms(language);
    const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];
    
    const simplePrompt = `당신은 전문 헤어 스타일리스트입니다.

다음 정보로 간단하고 실용적인 커팅 레시피를 작성하세요:

**분석 결과:**
- 길이: ${params56.length_category} (${langTerms.lengthDesc[params56.length_category] || params56.length_category})
- 형태: ${params56.cut_form}
- 볼륨: ${params56.volume_zone} (${volumeDesc})
- 앞머리: ${params56.fringe_type || '없음'}
- 모질: ${params56.hair_texture || '보통'}

**레시피 구성:**
1. 전체 개요 (2-3줄)
2. 주요 커팅 방법 (3-4단계)
3. 스타일링 팁 (2-3줄)

간결하고 실용적으로 작성하세요. 총 500자 이내.`;

    const strictLanguageMessage = {
      ko: '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요.',
      en: 'You are an English expert. Write ALL responses in English ONLY.',
      ja: 'あなたは日本語の専門家です。',
      zh: '你是中文专家。',
      vi: 'Bạn là chuyên gia tiếng Việt.'
    }[language] || '당신은 한국어 전문가입니다.';

    const combinedPrompt = `${strictLanguageMessage}\n\n${simplePrompt}`;

    // ⚡⚡⚡ OpenAI 스트리밍 API 호출
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: combinedPrompt },
          { role: 'user', content: `레시피를 생성하세요.` }
        ],
        temperature: 0.7,
        max_tokens: 800,
        stream: true  // ⭐ 스트리밍 활성화
      })
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API Error: ${completion.status}`);
    }

    // ⚡ 스트리밍 데이터 수집
    let fullRecipe = '';
    const reader = completion.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullRecipe += content;
            }
          } catch (e) {
            // JSON 파싱 에러 무시
          }
        }
      }
    }

    // 보안 필터링
    const sanitizedRecipe = sanitizeRecipeForPublic(fullRecipe, language);

    console.log('✅ 스트리밍 레시피 완성');

    // ⚠️ Netlify Functions는 진짜 스트리밍 응답 불가능
    // 대신 전체 결과를 한 번에 반환
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          recipe: sanitizedRecipe,
          params56: params56,
          similar_styles: []  // 속도 개선을 위해 생략
        }
      })
    };

  } catch (error) {
    console.error('💥 generateRecipeStream Error:', error);
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

// ==================== 벡터 검색 (도해도) ====================
async function searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey, targetGender = null, lengthCategory = null) {
  try {
    console.log(`🔍 도해도 벡터 검색: "${query}"`);

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
      return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender, lengthCategory);
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
          match_count: 5  // ⚡ 8 → 5
        })
      }
    );

    if (!rpcResponse.ok) {
      return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender, lengthCategory);
    }

    let results = await rpcResponse.json();

    if (lengthCategory) {
      const targetPrefix = getLengthCodePrefix(lengthCategory);
      
      if (targetPrefix) {
        console.log(`🎯 길이별 필터링: ${lengthCategory} → ${targetPrefix} 시리즈`);
        
        const sameLength = results.filter(r => r.code && r.code.startsWith(targetPrefix));
        const otherLength = results.filter(r => !r.code || !r.code.startsWith(targetPrefix));
        
        results = [...sameLength, ...otherLength].slice(0, 10);
        
        console.log(`✅ ${targetPrefix} 시리즈 ${sameLength.length}개 우선 배치`);
      }
    }

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
    return await directTableSearch(supabaseUrl, supabaseKey, query, targetGender, lengthCategory);
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

// ==================== 직접 테이블 검색 ====================
async function directTableSearch(supabaseUrl, supabaseKey, query, targetGender = null, lengthCategory = null) {
  console.log(`🔍 Fallback 검색 시작`);
  
  const response = await fetch(
    `${supabaseUrl}/rest/v1/hairstyles?select=id,name,category,code,recipe,description,image_url`,
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

    if (lengthCategory) {
      const targetPrefix = getLengthCodePrefix(lengthCategory);
      if (targetPrefix && style.code && style.code.startsWith(targetPrefix)) {
        score += 300;
      }
    }

    if (targetGender && parsed.gender === targetGender) {
      score += 200;
    }

    if (nameLower.includes(queryLower)) {
      score += 100;
    }

    if (style.recipe || style.description) {
      score += 30;
    }

    if (style.image_url) {
      score += 50;
    }

    return { 
      ...style, 
      similarity: score / 1000,
      parsed_gender: parsed.gender
    };
  });

  return scoredStyles
    .filter(s => s.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
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

// ==================== 스타일 검색 ====================
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
async function generateResponse(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { user_query, search_results } = payload;
  const userLanguage = detectLanguage(user_query);
  
  console.log(`💬 일반 대화 응답: "${user_query}"`);
  
  const securityKeywords = [
    '42포뮬러', '42개 포뮬러', '42 formula',
    '9매트릭스', '9개 매트릭스', '9 matrix',
    'DBS NO', 'DFS NO', 'VS NO', 'HS NO',
    '가로섹션', '후대각섹션', '전대각섹션', '세로섹션',
    '42층', '7개 섹션', '7 section'
  ];
  
  const isSecurityQuery = securityKeywords.some(keyword => 
    user_query.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (isSecurityQuery) {
    const securityResponse = {
      korean: '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀로, 원장급 이상만 접근 가능합니다.',
      english: 'I apologize, but that information is proprietary to the 2WAY CUT system.',
      japanese: '申し訳ございませんが、その情報は2WAY CUTシステムの企業秘密です。',
      chinese: '抱歉，该信息属于2WAY CUT系统的核心商业机密。',
      vietnamese: 'Xin lỗi, thông tin đó là bí mật kinh doanh.'
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
      temperature: 0.7,
      max_tokens: 150
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
