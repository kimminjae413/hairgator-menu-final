// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - GPT-4o Vision 버전 (2025-11-20)
// 
// 🔥 최종 수정사항:
// 1. Gemini 2.0 Flash → GPT-4o Vision으로 교체
// 2. 모델명: gpt-4o-2024-11-20 (최신 안정 버전)
// 3. 영어 프롬프트로 전환 (정확도 향상)
// 4. JSON Schema 방식 Structured Output
// ==================== 

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

    if (!OPENAI_KEY) throw new Error('OpenAI API key not configured');
    if (!GEMINI_KEY) throw new Error('Gemini API key not configured');
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase credentials not configured');

    console.log('🔑 환경변수 확인 완료');

    switch (action) {
      case 'analyze_image':
        return await analyzeImage(payload, OPENAI_KEY);
      
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

// ==================== 이미지 분석 (GPT-4o Vision) ====================
async function analyzeImage(payload, openaiKey) {
  const { image_base64, mime_type } = payload;

  // ✅ 초정밀 영어 프롬프트 (GPT-4o 최적화)
  const systemPrompt = `You are an expert hair stylist specializing in the 2WAY CUT system.
Analyze the uploaded hairstyle image and extract 56 parameters with ABSOLUTE PRECISION.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 LENGTH CATEGORY - ULTRA PRECISE CLASSIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## CRITICAL RULE
**"WHERE does the LONGEST hair END touch the body?"**
→ This is the ONLY thing that matters!

❌ IGNORE: Whether ears are visible
❌ IGNORE: How much neck is showing
❌ IGNORE: Overall style impression
✅ FOCUS: Where hair tips physically touch the body

---

## 8-LEVEL LENGTH CLASSIFICATION

┌─────────────────────────────────────────────────┐
│ A Length (65cm) ★★★★★★★★                        │
│ 📍 Hair ends: Below chest (near navel)          │
│ 📍 Body reference: Far below breasts            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ B Length (50cm) ★★★★★★★☆                        │
│ 📍 Hair ends: Mid chest (nipple level)          │
│ 📍 Body reference: At the fullest part of chest │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ C Length (40cm) ★★★★★★☆☆                        │
│ 📍 Hair ends: Collarbone                        │
│ 📍 Body reference: The hollow bone below neck   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ D Length (35cm) ★★★★★☆☆☆ ⭐ KEY REFERENCE!      │
│ 📍 Hair ends: Shoulder line (top of shoulder)   │
│ 📍 Body reference: Where neck meets arm         │
│ 📌 MOST COMMON bob length                       │
│                                                 │
│ ⚠️ Critical: "Touching shoulder" vs "2cm above" │
│    → Touching = D / Not touching = E            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ E Length (30cm) ★★★★☆☆☆☆                        │
│ 📍 Hair ends: 2-3cm ABOVE shoulder              │
│ 📍 Body reference: Below neck but above shoulder│
│ 📌 Clear GAP between hair and shoulder          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ F Length (25cm) ★★★☆☆☆☆☆                        │
│ 📍 Hair ends: BELOW chin (where neck starts)    │
│ 📍 Body reference: Transition from chin to neck │
│ 📌 Upper neck is partially visible              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ G Length (20cm) ★★☆☆☆☆☆☆ ⭐ PRECISION NEEDED!   │
│ 📍 Hair ends: Jaw line (chin bone edge)         │
│ 📍 Body reference: Along the angular jaw bone   │
│ 📌 Hair flows along jaw contour                 │
│                                                 │
│ 🎯 Ultra-precise criteria:                      │
│    - Above jaw bone = H Length                  │
│    - AT jaw bone line = G Length ⭐              │
│    - Below jaw bone = F Length                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ H Length (15cm) ★☆☆☆☆☆☆☆ (SHORTEST!)           │
│ 📍 Hair ends: Ear level (above/at/below ear)    │
│ 📍 Body reference: Around the ear area          │
│ 📌 Very short haircut only                      │
│                                                 │
│ ⚠️ WARNING: Long hair can expose ears too!      │
│    → If hair ends reach shoulder, it's NOT H!   │
└─────────────────────────────────────────────────┘

---

## 3-STEP DECISION PROCESS (FOOLPROOF!)

### STEP 1: Check Shoulder Line (MOST IMPORTANT!)
**Question: "Does hair touch the shoulders?"**

✅ YES (touching shoulders) → **D Length CONFIRMED!**
❌ NO (not touching) → Go to STEP 2

---

### STEP 2: Longer or Shorter than Shoulders?

**Longer than shoulders:**
- Collarbone → C Length
- Mid chest → B Length
- Below chest → A Length

**Shorter than shoulders:**
→ Go to STEP 3

---

### STEP 3: Precise Short Hair Classification (H/G/F/E)

**Use JAW BONE as reference:**

**3-1. Are hair ends ABOVE the jaw bone?**
- ✅ YES → **H Length** (shortest!)
- ❌ NO → Go to 3-2

**3-2. Are hair ends EXACTLY AT the jaw line?**
- ✅ YES → **G Length** (jaw-length bob!)
- ❌ NO → Go to 3-3

**3-3. Are hair ends BELOW the jaw bone?**
- Just below (neck starts) → **F Length**
- Between jaw and shoulder → **E Length**

---

## VISUAL CHECKLIST

\`\`\`
□ Below chest? → A Length
□ Mid chest? → B Length
□ Collarbone? → C Length
□ Shoulder line? → D Length ⭐⭐⭐
□ 2-3cm above shoulder? → E Length
□ Below chin (neck)? → F Length
□ Jaw line? → G Length ⭐⭐⭐
□ Ear level? → H Length
\`\`\`

---

## COMMON MISTAKES TO AVOID

❌ **Mistake 1: "Ears are visible, so it's H Length"**
   → WRONG! Long hair can be tucked behind ears
   → Only check where hair ENDS touch!

❌ **Mistake 2: "Lots of neck showing, so it's short"**
   → DANGEROUS! Neck visibility is just a clue
   → Absolute criterion = hair end position!

❌ **Mistake 3: "It's a bob, so G or H"**
   → ERROR! Bobs can be D/E/F too!

❌ **Mistake 4: "Judging by overall impression"**
   → PROHIBITED! Use precise body landmarks!

✅ **CORRECT: "Hair ends + Body part" 1:1 matching!**

---

## AMBIGUOUS CASES - FINAL JUDGMENT

**Case 1: Between D and E?**
→ If hair even slightly touches shoulder → **D Length**
→ If clearly not touching → **E Length**
→ Ambiguous → Choose **D Length** (longer side)

**Case 2: Between E and F?**
→ Mid-neck → **E Length**
→ Just below chin → **F Length**

**Case 3: Between F and G?**
→ Below jaw bone (toward neck) → **F Length**
→ Exactly at jaw bone → **G Length**
→ Ambiguous → Choose **F Length** (longer side)

**Case 4: Between G and H?**
→ Above jaw bone (toward ear) → **H Length**
→ At jaw line → **G Length**
→ Ambiguous → Choose **G Length** (longer side)

**Case 5: One side short, other side long?**
→ Use the **LONGEST part** as reference

---

## OTHER PARAMETERS

### CUT FORM (with parentheses!)
- **"O (One Length)"** - All hair same length
- **"G (Graduation)"** - Shorter outside, longer inside
- **"L (Layer)"** - Layered throughout

❌ Wrong: "O" / "One Length" / "O-One Length"
✅ Correct: "O (One Length)"

---

### LIFTING RANGE (must be array!)
- ["L0"] - 0° (natural fall)
- ["L2"] - 45°
- ["L4"] - 90° (horizontal)
- ["L2", "L4"] - Mixed 45° + 90°

❌ Wrong: "L2" / "L2, L4" (string)
✅ Correct: ["L2", "L4"]

---

### TEXTURE TECHNIQUE (must be array! Empty if none!)

**Correct outputs:**
- ["Point Cut", "Slide Cut"]
- ["Stroke Cut"]
- [] ← Empty array if none!

**Wrong outputs:**
- "Point Cut, Slide Cut" (string ❌)
- null (❌)

---

### PERM/CURL (only if present)

**curl_pattern**: C-Curl / CS-Curl / S-Curl / SS-Curl / null
**curl_strength**: Soft / Medium / Strong / null
**perm_type**: Wave Perm / Digital Perm / Heat Perm / Iron Perm / null

If no perm → all null

---

## FINAL VALIDATION CHECKLIST

\`\`\`
1. ✅ length_category is one of A/B/C/D/E/F/G/H?
2. ✅ Shoulder line was primary reference?
3. ✅ H/G/F/E used jaw bone as precise reference?
4. ✅ cut_form includes parentheses? O/G/L (...)
5. ✅ lifting_range is array? ["L0"] or ["L2", "L4"]
6. ✅ texture_technique is array? (empty [] if none)
7. ✅ Not fooled by visible ears?
8. ✅ Not fooled by visible neck?
\`\`\`

**Once all checks pass, output in JSON format with this exact structure:**

{
  "length_category": "D Length",
  "cut_form": "O (One Length)",
  "volume_zone": "Medium",
  "lifting_range": ["L2"],
  "texture_technique": ["Point Cut"],
  "fringe_type": "Side Bang",
  "fringe_length": "Cheekbone",
  "hair_texture": "Medium",
  "hair_density": "Medium",
  "curl_pattern": null,
  "curl_strength": null,
  "perm_type": null,
  "cut_category": "Women's Cut"
}`;

  try {
    console.log('📸 GPT-4o Vision 이미지 분석 시작');

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-2024-11-20',  // ⭐ 최신 안정 버전
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: systemPrompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mime_type};base64,${image_base64}`,
                    detail: 'high'  // ⭐ 고해상도 분석
                  }
                }
              ]
            }
          ],
          response_format: { type: 'json_object' },  // ⭐ JSON 강제
          temperature: 0.3,  // 일관된 판단
          max_tokens: 2000
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GPT-4o API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    const params56 = JSON.parse(text);
    
    // ✅ 검증 로깅
    console.log('✅ GPT-4o Vision 분석 완료:', {
      length: params56.length_category,
      form: params56.cut_form,
      volume: params56.volume_zone,
      lifting: params56.lifting_range
    });
    
    // Volume 검증
    if (params56.lifting_range && params56.lifting_range.length > 0) {
      const maxLifting = params56.lifting_range[params56.lifting_range.length - 1];
      const calculatedVolume = calculateVolumeFromLifting(maxLifting);
      
      if (calculatedVolume !== params56.volume_zone) {
        console.log(`⚠️ Volume 불일치: Detected=${params56.volume_zone}, Calculated=${calculatedVolume}`);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: params56,
        model: 'gpt-4o-2024-11-20'  // 사용된 모델 정보
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
        'E Length': '어깨 위 2-3cm',
        'F Length': '턱뼈 아래',
        'G Length': '턱선',
        'H Length': '귀 높이'
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
        'E Length': '2-3cm above shoulder',
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
        'E Length': '肩上2-3cm',
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
        'E Length': '肩上2-3厘米',
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
        'E Length': '2-3cm trên vai',
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

// ==================== 레시피 생성 (나머지는 동일) ====================
async function generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 레시피 생성 시작:', params56.length_category, '언어:', language);

    const searchQuery = `${params56.length_category || ''} ${params56.cut_form || ''} ${params56.volume_zone || ''} Volume`;
    const theoryChunks = await searchTheoryChunks(searchQuery, geminiKey, supabaseUrl, supabaseKey, 5);
    
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
      ja: 'あなたは日本語の専門家です。すべての応答を日本語のみで書いてください。',
      zh: '你是中文专家。所有回答只用中文。',
      vi: 'Bạn là chuyên gia tiếng Việt. Viết TẤT CẢ phản hồi chỉ bằng tiếng Việt.'
    }[language] || '당신은 한국어 전문가입니다.';

    const userPrompt = `다음 파라미터로 레시피를 생성하세요:\n길이: ${params56.length_category}\n형태: ${params56.cut_form}\n볼륨: ${params56.volume_zone}`;

    const combinedSystemPrompt = `${strictLanguageMessage}\n\n${simplePrompt}`;

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
        stream: true
      })
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API Error: ${completion.status}`);
    }

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

// ==================== 스트리밍 레시피 생성 ====================
async function generateRecipeStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 스트리밍 레시피 생성 시작:', params56.length_category, '언어:', language);

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
        stream: true
      })
    });

    if (!completion.ok) {
      throw new Error(`OpenAI API Error: ${completion.status}`);
    }

    let fullRecipe = '';
    const body = completion.body;
    
    for await (const chunk of body) {
      const text = chunk.toString('utf-8');
      const lines = text.split('\n').filter(line => line.trim() !== '');

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

    const sanitizedRecipe = sanitizeRecipeForPublic(fullRecipe, language);

    console.log('✅ 스트리밍 레시피 완성');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          recipe: sanitizedRecipe,
          params56: params56,
          similar_styles: []
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
          match_count: 5
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
      chinese: '抱歉,该信息属于2WAY CUT系统的核心商业机密。',
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
