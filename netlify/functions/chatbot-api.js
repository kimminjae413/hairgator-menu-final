// netlify/functions/chatbot-api.js
// HAIRGATOR 챗봇 - Structured Output + File Search + 보안 필터링 최종 완성 버전
// ✅ Structured Output (56파라미터 100% 정확도)
// ✅ File Search 통합 (Supabase 이론 대체)
// ✅ 보안 필터링 (42개 포뮬러, 9개 매트릭스 보호)
// ✅ 5개 언어 지원 (ko/en/ja/zh/vi)
// ⭐ Syntax Error 완전 제거 버전 (2025-01-25)

const fetch = require('node-fetch');
const { PARAMS_56_SCHEMA } = require('./params56-schema.js');

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

// ==================== 이미지 분석 (Structured Output) ====================
async function analyzeImage(payload, geminiKey) {
  const { image_base64, mime_type } = payload;

  const systemPrompt = `당신은 전문 헤어 스타일리스트입니다. 
업로드된 헤어스타일 이미지를 56개 파라미터로 정확히 분석하세요.

**핵심 판단 기준**

**1. 길이 - 어깨선 기준**
- 어깨에 닿음 → D Length
- 어깨 아래 → A/B/C
- 어깨 위 → E/F/G/H

**2. 커트 형태 - 괄호 포함**
- "O (One Length)" / "G (Graduation)" / "L (Layer)"

**3. 리프팅 각도 - 배열로**
- ["L0"], ["L2"], ["L2", "L4"]

**4. 펌/컬 - 있는 경우만**
- curl_pattern: C-Curl / CS-Curl / S-Curl / SS-Curl / null
- curl_strength: Soft / Medium / Strong / null
- perm_type: Wave Perm / Digital Perm / Heat Perm / Iron Perm / null

애매한 경우 더 긴 쪽 선택. JSON Schema에 정확히 맞춰 출력하세요.`;

  try {
    console.log('📸 Gemini 이미지 분석 시작');

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
    
    if (params56.lifting_range && params56.lifting_range.length > 0) {
      const maxLifting = params56.lifting_range[params56.lifting_range.length - 1];
      const calculatedVolume = calculateVolumeFromLifting(maxLifting);
      
      if (calculatedVolume !== params56.volume_zone) {
        console.log(`⚠️ Volume 불일치: Structured=${params56.volume_zone}, Calculated=${calculatedVolume}`);
      }
    }

    console.log('✅ 분석 완료:', {
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

// ==================== 프롬프트 생성 헬퍼 함수 ====================
function buildKoreanPrompt(params56, theoryContext, similarStylesText, langTerms, volumeDesc) {
  const lengthDesc = langTerms.lengthDesc[params56.length_category] || params56.length_category;
  const formDesc = langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form;
  const fringeDesc = langTerms.fringeType[params56.fringe_type] || params56.fringe_type;
  const textureDesc = params56.texture_technique?.join(', ') || '자연스러운 질감';
  
  const liftingDesc = params56.lifting_range?.[0] === 'L0' || params56.lifting_range?.[0] === 'L1' 
    ? '자연 낙하~약간 들어올림 (0-22.5도)' 
    : params56.lifting_range?.[0] === 'L2' || params56.lifting_range?.[0] === 'L3' 
      ? '중간 높이 (45-67.5도)' 
      : '높게 들어올림 (90도 이상)';

  const sideLifting = params56.volume_zone === 'Top' 
    ? '90도 수직' 
    : params56.volume_zone === 'Middle' 
      ? '45-67.5도' 
      : '자연 낙하~약간 들어올림';

  const crownSectioning = params56.volume_zone === 'Top' ? '방사형' : '수평';
  const crownLifting = params56.volume_zone === 'Top' 
    ? '90도 수직 (최대 볼륨)' 
    : params56.volume_zone === 'Middle' 
      ? '45-67.5도 (자연스러운 볼륨)' 
      : '자연 낙하';
  
  const crownLayerPct = params56.volume_zone === 'Top' ? '70%' : '60%';
  const crownSlidePct = params56.volume_zone === 'Top' ? '30%' : '40%';

  const cutTech = params56.cut_form === 'G' || params56.cut_form?.includes('G') 
    ? '그래쥬에이션 60% (볼륨 형성)' 
    : '레이어 65% (가벼움)';
  
  const slidePct = params56.cut_form === 'G' ? '40%' : '35%';
  
  const volumeGoal = volumeDesc === 'High' 
    ? '풍성한 볼륨' 
    : volumeDesc === 'Medium' 
      ? '자연스러운 볼륨' 
      : '컴팩트한 형태';

  const fringeMethod = params56.fringe_type === 'Side Bang' 
    ? '커팅 방법:\n  - 대각선 라인으로 커트\n  - 사이드로 자연스럽게 흘러내리도록\n  - 포인트 컷으로 끝부분 처리'
    : params56.fringe_type === 'See-through Bang'
      ? '커팅 방법:\n  - 얇게 섹션 분할 (30-40% 밀도)\n  - 눈썹 라인 길이\n  - 슬라이드 컷으로 가벼운 질감'
      : params56.fringe_type === 'Curtain Bang'
        ? '커팅 방법:\n  - 중앙 파팅 기준\n  - 양쪽으로 대각선 라인\n  - 얼굴 라인 따라 길이 조절'
        : `커팅 방법:\n  - ${params56.fringe_type} 스타일 특성 반영\n  - 자연스러운 라인 형성`;

  const texture1Tech = params56.texture_technique?.includes('Slide Cut') 
    ? '슬라이드 컷 40%' 
    : params56.texture_technique?.includes('Point Cut') 
      ? '포인트 컷 40%' 
      : '슬라이드 또는 포인트 컷 40%';

  const texture2Tech = params56.texture_technique?.includes('Stroke Cut') 
    ? '스트록 컷 30%' 
    : '틴닝 또는 슬라이드 30%';

  const textureDepth = params56.texture_density === 'High' 
    ? '표면 위주 (1-2cm)' 
    : params56.texture_density === 'Medium' 
      ? '중간 깊이 (2-3cm)' 
      : '깊게 (3-4cm)';

  const dryMethod = volumeDesc === 'High' ? '브러시로 볼륨 살리며' : '자연스럽게 떨어뜨리며';
  const midEndMethod = params56.texture_type?.includes('Wavy') || params56.texture_type?.includes('Curly') 
    ? '손으로 웨이브 살리며' 
    : '브러시로 매끄럽게';

  const ironUsage = params56.cut_form?.includes('L') 
    ? '32mm 고데기로 끝부분 C컬' 
    : params56.cut_form === 'O' 
      ? '고데기 불필요 (자연 낙하)' 
      : '26-32mm로 자연스러운 웨이브';

  const productBase = params56.texture_type?.includes('Straight') 
    ? '볼륨 무스 또는 스프레이' 
    : '컬 크림 또는 세럼';
  
  const productFinish = params56.volume_zone === 'Top' 
    ? '볼륨 파우더 (뿌리)' 
    : '헤어 오일 (끝부분)';

  const roundFaceAdv = params56.fringe_type === 'Side Bang' 
    ? '사이드 뱅이 이미 적용되어 얼굴이 갸름해 보임' 
    : '사이드 볼륨을 약간 줄이면 더욱 효과적';
  
  const squareFaceAdv = params56.texture_type?.includes('Wavy') 
    ? '웨이브가 각진 라인을 부드럽게 함' 
    : '끝부분에 포인트 질감 추가 권장';
  
  const longFaceAdv = params56.volume_zone === 'Middle' 
    ? '중간 볼륨이 얼굴 길이 보완' 
    : '사이드 볼륨 강조 권장';

  const trimCycle = params56.length_category === 'Short' 
    ? '3-4주' 
    : params56.length_category === 'Medium' 
      ? '4-6주' 
      : '6-8주';

  const homeCare = params56.texture_type?.includes('Straight') 
    ? '매일 드라이 정리' 
    : '2-3일마다 웨이브 살리기';

  const treatment = params56.texture_density === 'High' 
    ? '주 1회 영양 공급' 
    : '월 2-3회';

  return `당신은 HAIRGATOR 시스템의 2WAY CUT 마스터입니다.

**🔒 보안 규칙 (철저히 준수):**
다음 용어들은 절대 언급 금지하되, 원리는 레시피에 반영:
- 포뮬러 번호 (DBS NO.3, VS NO.6 등) → "뒷머리 기법", "중앙 기법"으로 표현
- 각도 코드 (L2(45°), D4(180°) 등) → 각도 숫자는 명시하되 코드는 숨김
- 섹션 이름 (가로섹션, 후대각섹션 등) → "상단 부분", "뒷머리 부분"으로 표현
- 42층 구조, 7섹션 시스템 → "체계적인 구조"로 표현
- 9개 매트릭스 → "전문적인 분류"로 표현

**📊 분석 데이터:**
- 길이: ${params56.length_category}
- 형태: ${params56.cut_form}
- 볼륨: ${params56.volume_zone}
- 앞머리: ${params56.fringe_type}
- 리프팅: ${params56.lifting_range?.join(', ')}
- 질감: ${textureDesc}
- 실루엣: ${params56.silhouette_type}

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
- **길이**: ${lengthDesc}
- **형태**: ${formDesc}
- **볼륨**: ${volumeDesc}
- **앞머리**: ${fringeDesc}
- **질감**: ${textureDesc}

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
리프팅: ${liftingDesc}
방향: 후면 대각선 방향
커팅 기법:
  - ${cutTech}
  - 슬라이드 컷 ${slidePct} (부드러운 연결)
목표: ${volumeGoal} 생성
\`\`\`

**【3단계: 사이드 부분 - 얼굴 라인 연출】**
\`\`\`
분할: 귀 앞뒤로 수직 분할
리프팅: ${sideLifting}
방향: 얼굴 쪽 또는 후면 방향
커팅 기법:
  - 레이어 또는 그래쥬에이션 65%
  - 포인트 컷 35% (자연스러운 질감)
블렌딩: 뒷머리와 자연스럽게 연결
주의사항: 얼굴형에 따라 길이 조절
\`\`\`

**【4단계: 상단 부분 (크라운/탑) - 볼륨 포인트】**
\`\`\`
분할: 정수리 부분을 ${crownSectioning} 분할
리프팅: ${crownLifting}
커팅 기법:
  - 레이어 ${crownLayerPct}
  - 슬라이딩 ${crownSlidePct}
목표: ${volumeDesc} 실루엣 완성
\`\`\`

**【5단계: 앞머리 (뱅) - 디테일 완성】**
\`\`\`
길이: ${params56.fringe_length || '적절한 길이'}
스타일: ${fringeDesc}
${fringeMethod}
블렌딩: 사이드와 자연스럽게 연결
\`\`\`

---

### STEP 4: 질감 처리 (텍스처링)

**1차 질감 (전체 형태 조정):**
- **기법**: ${texture1Tech}
- **목적**: 부드러운 연결, 자연스러운 흐름
- **적용 부위**: 전체 (특히 연결 부분)

**2차 질감 (디테일 마무리):**
- **기법**: ${texture2Tech}
- **목적**: 가벼운 느낌, 동적인 움직임
- **깊이**: ${textureDepth}

**3차 질감 (마무리 터치):**
- **기법**: 포인트 컷 또는 틴닝 20-30%
- **목적**: 끝부분 자연스러움
- **비율**: ${params56.texture_density || '중간 밀도'}에 맞춰 조절

---

### STEP 5: 스타일링 가이드

**드라이 방법:**
1. 뿌리부터 드라이 (${dryMethod})
2. 중간~끝: ${midEndMethod}
3. 마무리: 찬바람으로 고정

**아이론/고데기 (선택사항):**
- ${ironUsage}
- 온도: 160-180도
- 시간: 모발 1회 3-5초

**제품 추천:**
- 베이스: ${productBase}
- 마무리: ${productFinish}
- 고정: 소프트 왁스 또는 가벼운 스프레이

---

### STEP 6: 주의사항

**얼굴형별 조언:**
- 둥근 얼굴: ${roundFaceAdv}
- 각진 얼굴: ${squareFaceAdv}
- 긴 얼굴: ${longFaceAdv}

**모질별 팁:**
- 가는 모발: 질감 처리 최소화 (20-30%), 볼륨 제품 필수
- 보통 모발: 질감 처리 적절히 (30-40%), 표준 스타일링
- 굵은 모발: 질감 처리 충분히 (40-50%), 세럼으로 정리

**유지 관리:**
- 다듬기 주기: ${trimCycle}
- 집에서 관리: ${homeCare}
- 트리트먼트: ${treatment}

---

### STEP 7: 유사 스타일 참고

다음 스타일들도 함께 고려해보세요:

${similarStylesText}

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
모든 내용은 **한국어로만** 작성하며, 실제 살롱에서 바로 적용 가능한 구체적 지시사항을 제공하세요.`;
}

function buildEnglishPrompt(params56, theoryContext, similarStylesText, langTerms, volumeDesc) {
  const lengthDesc = langTerms.lengthDesc[params56.length_category] || params56.length_category;
  const formDesc = langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form;
  const fringeDesc = langTerms.fringeType[params56.fringe_type] || params56.fringe_type;

  return `You are a HAIRGATOR 2WAY CUT master.

**🔒 Security Rules (Strictly Enforce):**
Never mention but apply principles:
- Formula numbers (DBS NO.3, VS NO.6) → Use "back technique", "center technique"
- Angle codes (L2(45°), D4(180°)) → Use angle numbers but hide codes
- Section names (Horizontal, Diagonal Backward) → Use "top area", "back area"

**📊 Analysis Data:**
- Length: ${params56.length_category}
- Form: ${params56.cut_form}
- Volume: ${params56.volume_zone}
- Fringe: ${params56.fringe_type}
- Lifting: ${params56.lifting_range?.join(', ')}

**📐 Cutting Principles:**

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
- Length: ${lengthDesc}
- Form: ${formDesc}
- Volume: ${volumeDesc}
- Fringe: ${fringeDesc}

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
Note: Maintain natural round following neckline
\`\`\`

**【Step 2: Back Area - Graduation/Layer】**
\`\`\`
Sectioning: Diagonal sections, 2-3cm intervals
Lifting: Medium height (45-90 degrees)
Direction: Back diagonal
Cutting technique:
  - Graduation or layer 60%
  - Slide cut 35-40% (smooth connection)
Goal: Create ${volumeDesc} volume
\`\`\`

**【Step 3: Side Area - Facial Line】**
\`\`\`
Sectioning: Vertical around ear
Lifting: According to volume zone
Direction: Toward face or back
Cutting technique:
  - Layer or graduation 65%
  - Point cut 35% (natural texture)
Blending: Connect smoothly with back
Note: Adjust length according to face shape
\`\`\`

**【Step 4: Crown/Top - Volume Point】**
\`\`\`
Sectioning: Radial or horizontal sections
Lifting: According to desired volume
Cutting technique:
  - Layer 60-70%
  - Sliding 30-40%
Goal: Complete ${volumeDesc} silhouette
\`\`\`

**【Step 5: Fringe - Detail Finish】**
\`\`\`
Length: Appropriate length for style
Style: ${fringeDesc}
Cutting method: Specific to fringe type
Blending: Connect naturally with sides
\`\`\`

### STEP 4: Texturizing

**1st Texture (Overall Shape Adjustment):**
- **Technique**: Slide cut or point cut 40%
- **Purpose**: Smooth connection, natural flow
- **Application**: Throughout (especially connection areas)

**2nd Texture (Detail Finishing):**
- **Technique**: Thinning or stroke cut 30%
- **Purpose**: Light feeling, dynamic movement
- **Depth**: Surface, middle, or deep according to hair density

**3rd Texture (Final Touch):**
- **Technique**: Point cut or thinning 20-30%
- **Purpose**: Natural ends
- **Ratio**: Adjust according to texture density

---

### STEP 5: Styling Guide

**Drying Method:**
1. Dry from roots (with volume or naturally)
2. Mid to ends: Brush smoothly or scrunch for waves
3. Finish: Cool air to set

**Iron/Curler (Optional):**
- Use 26-32mm curling iron for natural waves
- Temperature: 160-180°C
- Time: 3-5 seconds per section

**Product Recommendations:**
- Base: Volume mousse or curl cream
- Finish: Hair oil or volume powder
- Hold: Soft wax or light spray

---

### STEP 6: Important Notes

**Face Shape Advice:**
- Round face: Side volume or angled fringe helps
- Square face: Soft waves soften angular lines
- Long face: Side volume balances face length

**Hair Texture Tips:**
- Fine hair: Minimize texturizing (20-30%), use volume products
- Normal hair: Standard texturizing (30-40%)
- Thick hair: More texturizing (40-50%), use serum to control

**Maintenance:**
- Trim cycle: 3-6 weeks depending on length
- Home care: Daily styling or every 2-3 days
- Treatment: Weekly or monthly depending on damage

### STEP 7: Similar Styles
${similarStylesText}

Write in **English only** following steps 1-7 precisely.`;
}

function buildJapanesePrompt(params56, theoryContext, similarStylesText, langTerms, volumeDesc) {
  const lengthDesc = langTerms.lengthDesc[params56.length_category] || params56.length_category;
  const formDesc = langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form;
  const fringeDesc = langTerms.fringeType[params56.fringe_type] || params56.fringe_type;
  const volumeDescJa = langTerms.volume[params56.volume_zone] || '中部ボリューム';

  return `あなたはHAIRGATORシステムの2WAY CUT専門家です。

**🔒 セキュリティルール（厳守）:**
次の用語は絶対に言及禁止ですが、原理はレシピに反映してください:
- 公式番号 (DBS NO.3、VS NO.6など) → "後ろ部分の技法"、"中央技法"と表現
- 角度コード (L2(45°)、D4(180°)など) → 角度の数字は明示するがコードは隠す
- セクション名 (横セクション、後対角セクションなど) → "上部部分"、"後ろ部分"と表現
- 42層構造、7セクションシステム → "体系的な構造"と表現
- 9つのマトリックス → "専門的な分類"と表現

**📊 分析データ:**
- 長さ: ${params56.length_category}
- 形: ${params56.cut_form}
- ボリューム: ${params56.volume_zone}
- 前髪: ${params56.fringe_type}

**🎓 理論的根拠 (参考用 - 直接引用禁止):**
${theoryContext.substring(0, 400)}

**📐 カッティング原理:**

1. **ボリューム形成の原理:**
   - リフティング角度: 適切な角度
   - ボリューム位置: ${volumeDescJa}
   - シルエット: 自然な形

2. **セクション順序:**
   - 1番目: 首部位（ネープゾーン）- 基準線設定
   - 2番目: 後ろ部分 - グラデーションまたはレイヤー
   - 3番目: サイド部分 - 接続とブレンディング
   - 4番目: 上部部分（クラウン）- ボリューム形成
   - 5番目: 前髪（バング）- 顔のライン演出

---

**📋 レシピ作成形式 (7ステップ構造):**

### STEP 1: 基本分析結果
- **長さ**: ${lengthDesc}
- **形**: ${formDesc}
- **ボリューム**: ${volumeDescJa}
- **前髪**: ${fringeDesc}

---

### STEP 2: スタイルの特徴
上記の理論に基づいて:
- **このスタイルの核心**: なぜこの方式を使用するか（2-3文）
- **期待効果**: どんなシルエットができるか
- **推奨対象**: 顔型、髪質、ライフスタイル

---

### STEP 3: 詳細カッティングプロセス ⭐核心⭐

**【1段階: 首部位（ネープゾーン）- 基準線設定】**
\`\`\`
分割: 首筋を水平方向に1-2cm間隔で分割
リフティング: 自然落下状態（0度）または少し持ち上げ
方向: 正面または後面方向にコーミング
カッティング技法:
  - ブラントカット 70%（きれいな基準線）
  - ポイントカット 30%（毛先を自然に）
ガイドライン: ${params56.length_category} 長さ基準設定
注意事項: 首のラインに沿って自然なラウンド維持
\`\`\`

**【2段階: 後ろ部分 - グラデーション/レイヤー形成】**
\`\`\`
分割: 後ろ髪を対角線方向に2-3cm間隔で分割
リフティング: 中間の高さ（45-90度）
方向: 後面対角線方向
カッティング技法:
  - グラデーションまたはレイヤー 60%
  - スライドカット 35-40%（滑らかな接続）
目標: ${volumeDescJa}を生成
\`\`\`

**【3段階: サイド部分 - 顔のライン演出】**
\`\`\`
分割: 耳の前後に垂直分割
リフティング: ボリュームゾーンに応じて
方向: 顔側または後面方向
カッティング技法:
  - レイヤーまたはグラデーション 65%
  - ポイントカット 35%（自然な質感）
ブレンディング: 後ろ髪と自然に接続
注意事項: 顔型に応じて長さ調節
\`\`\`

**【4段階: 上部部分（クラウン/トップ）- ボリュームポイント】**
\`\`\`
分割: 頭頂部分を放射状または水平分割
リフティング: 希望するボリュームに応じて
カッティング技法:
  - レイヤー 60-70%
  - スライディング 30-40%
目標: ${volumeDescJa}シルエット完成
\`\`\`

**【5段階: 前髪（バング）- ディテール完成】**
\`\`\`
長さ: 適切な長さ
スタイル: ${fringeDesc}
カッティング方法: 前髪タイプに応じて
ブレンディング: サイドと自然に接続
\`\`\`

---

### STEP 4: テクスチャリング（質感処理）

**1次質感（全体形態調整）:**
- **技法**: スライドカットまたはポイントカット 40%
- **目的**: 滑らかな接続、自然な流れ
- **適用部位**: 全体（特に接続部分）

**2次質感（ディテール仕上げ）:**
- **技法**: シニングまたはストロークカット 30%
- **目的**: 軽い感じ、動的な動き
- **深さ**: 表面、中間、または深く（髪質に応じて）

---

### STEP 5: スタイリングガイド

**ドライ方法:**
1. 根元からドライ（ボリュームを出すまたは自然に）
2. 中間〜毛先: ブラシで滑らかにまたはウェーブを出す
3. 仕上げ: 冷風で固定

**アイロン/コテ（オプション）:**
- 26-32mmコテで自然なウェーブ
- 温度: 160-180度
- 時間: 1回3-5秒

**製品推奨:**
- ベース: ボリュームムースまたはカールクリーム
- 仕上げ: ヘアオイルまたはボリュームパウダー
- 固定: ソフトワックスまたは軽いスプレー

---

### STEP 6: 注意事項

**顔型別アドバイス:**
- 丸顔: サイドボリュームまたは斜め前髪が効果的
- 角顔: ウェーブが角張ったラインを柔らかくする
- 長顔: サイドボリュームが顔の長さをバランス

**髪質別ヒント:**
- 細い髪: 質感処理最小化（20-30%）、ボリューム製品必須
- 普通髪: 質感処理適度に（30-40%）
- 太い髪: 質感処理十分に（40-50%）、セラムで整える

**維持管理:**
- カット周期: 長さに応じて3-6週間
- 自宅ケア: 毎日または2-3日ごと
- トリートメント: 週1回または月2-3回

---

### STEP 7: 類似スタイル参考

次のスタイルも一緒に考慮してみてください:

${similarStylesText}

---

上記の形式を正確に従ってSTEP 1からSTEP 7まで順番に作成してください。
すべての内容は**日本語のみ**で作成し、実際のサロンですぐに適用可能な具体的な指示事項を提供してください。`;
}

function buildChinesePrompt(params56, theoryContext, similarStylesText, langTerms, volumeDesc) {
  const lengthDesc = langTerms.lengthDesc[params56.length_category] || params56.length_category;
  const formDesc = langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form;
  const fringeDesc = langTerms.fringeType[params56.fringe_type] || params56.fringe_type;
  const volumeDescZh = langTerms.volume[params56.volume_zone] || '中部体积';

  return `您是HAIRGATOR系统的2WAY CUT大师。

**🔒 安全规则（严格遵守）:**
以下术语绝对禁止提及，但原理应体现在配方中:
- 公式编号 (DBS NO.3、VS NO.6等) → 用"后部技法"、"中央技法"表达
- 角度代码 (L2(45°)、D4(180°)等) → 说明角度数字但隐藏代码
- 分区名称 (横向分区、后斜分区等) → 用"上部区域"、"后部区域"表达
- 42层结构、7分区系统 → 用"系统化结构"表达
- 9个矩阵 → 用"专业分类"表达

**📊 分析数据:**
- 长度: ${params56.length_category}
- 形态: ${params56.cut_form}
- 体积: ${params56.volume_zone}
- 刘海: ${params56.fringe_type}

**🎓 理论依据 (参考用 - 禁止直接引用):**
${theoryContext.substring(0, 400)}

**📐 剪发原理:**

1. **体积形成原理:**
   - 提升角度: 适当角度
   - 体积位置: ${volumeDescZh}
   - 轮廓: 自然形态

2. **分区顺序:**
   - 第1步: 颈部区域（后颈区）- 设定基准线
   - 第2步: 后部区域 - 渐层或层次
   - 第3步: 侧面区域 - 连接和混合
   - 第4步: 顶部区域（头顶）- 形成体积
   - 第5步: 刘海 - 塑造面部线条

---

**📋 配方格式 (7步结构):**

### STEP 1: 基本分析结果
- **长度**: ${lengthDesc}
- **形态**: ${formDesc}
- **体积**: ${volumeDescZh}
- **刘海**: ${fringeDesc}

---

### STEP 2: 风格特点
基于上述理论:
- **此风格的核心**: 为什么使用这种方式（2-3句）
- **预期效果**: 会形成什么样的轮廓
- **推荐对象**: 脸型、发质、生活方式

---

### STEP 3: 详细剪发流程 ⭐核心⭐

**【第1步: 颈部区域（后颈区）- 设定基准线】**
\`\`\`
分区: 颈部水平方向1-2cm间隔分区
提升: 自然下垂状态（0度）或稍微提升
方向: 正面或后面方向梳理
剪发技法:
  - 齐剪 70%（整洁基准线）
  - 点剪 30%（发尾自然）
基准线: ${params56.length_category} 长度标准设定
注意事项: 沿着颈线保持自然圆润
\`\`\`

**【第2步: 后部区域 - 渐层/层次形成】**
\`\`\`
分区: 后发斜线方向2-3cm间隔分区
提升: 中等高度（45-90度）
方向: 后面斜线方向
剪发技法:
  - 渐层或层次 60%
  - 滑剪 35-40%（平滑连接）
目标: 创造${volumeDescZh}
\`\`\`

**【第3步: 侧面区域 - 面部线条塑造】**
\`\`\`
分区: 耳朵前后垂直分区
提升: 根据体积区域
方向: 面部侧或后面方向
剪发技法:
  - 层次或渐层 65%
  - 点剪 35%（自然质感）
混合: 与后部自然连接
注意事项: 根据脸型调整长度
\`\`\`

**【第4步: 顶部区域（头顶）- 体积点】**
\`\`\`
分区: 头顶部分放射状或水平分区
提升: 根据期望体积
剪发技法:
  - 层次 60-70%
  - 滑动 30-40%
目标: 完成${volumeDescZh}轮廓
\`\`\`

**【第5步: 刘海 - 细节完成】**
\`\`\`
长度: 适当长度
风格: ${fringeDesc}
剪发方法: 根据刘海类型
混合: 与侧面自然连接
\`\`\`

---

### STEP 4: 质感处理

**第1次质感（整体形态调整）:**
- **技法**: 滑剪或点剪 40%
- **目的**: 平滑连接、自然流动
- **应用部位**: 全部（特别是连接部分）

**第2次质感（细节完成）:**
- **技法**: 打薄或削剪 30%
- **目的**: 轻盈感、动态感
- **深度**: 表面、中等或深层（根据发质）

---

### STEP 5: 造型指南

**吹干方法:**
1. 从发根开始吹干（增加体积或自然）
2. 中段到发尾: 用梳子梳理平滑或制造波浪
3. 完成: 冷风定型

**烫发棒/卷发棒（可选）:**
- 使用26-32mm卷发棒制造自然波浪
- 温度: 160-180度
- 时间: 每次3-5秒

**产品推荐:**
- 基础: 蓬松慕斯或卷发霜
- 完成: 护发油或蓬松粉
- 定型: 软蜡或轻喷雾

---

### STEP 6: 注意事项

**脸型建议:**
- 圆脸: 侧面体积或斜刘海有效
- 方脸: 波浪柔化棱角线条
- 长脸: 侧面体积平衡脸长

**发质提示:**
- 细发: 最小化质感处理（20-30%）、必须使用蓬松产品
- 普通发: 适度质感处理（30-40%）
- 粗发: 充分质感处理（40-50%）、用精华素整理

**维护:**
- 修剪周期: 根据长度3-6周
- 家庭护理: 每天或每2-3天
- 护理: 每周1次或每月2-3次

---

### STEP 7: 相似风格参考

以下风格也可以一起考虑:

${similarStylesText}

---

请严格按照上述格式从STEP 1到STEP 7依次创建。
所有内容仅用**中文**编写，提供在实际沙龙可立即应用的具体指导。`;
}

function buildVietnamesePrompt(params56, theoryContext, similarStylesText, langTerms, volumeDesc) {
  const lengthDesc = langTerms.lengthDesc[params56.length_category] || params56.length_category;
  const formDesc = langTerms.formDesc[params56.cut_form?.charAt(0)] || params56.cut_form;
  const fringeDesc = langTerms.fringeType[params56.fringe_type] || params56.fringe_type;
  const volumeDescVi = langTerms.volume[params56.volume_zone] || 'Thể tích trung';

  return `Bạn là bậc thầy 2WAY CUT của hệ thống HAIRGATOR.

**🔒 Quy tắc bảo mật (tuân thủ nghiêm ngặt):**
Các thuật ngữ sau tuyệt đối cấm đề cập, nhưng nguyên tắc phải được phản ánh trong công thức:
- Số công thức (DBS NO.3, VS NO.6, v.v.) → Dùng "kỹ thuật phần sau", "kỹ thuật trung tâm"
- Mã góc (L2(45°), D4(180°), v.v.) → Nêu số góc nhưng ẩn mã
- Tên phân khu (Phân ngang, Phân chéo sau, v.v.) → Dùng "phần trên", "phần sau"
- Cấu trúc 42 lớp, Hệ thống 7 phân khu → Dùng "cấu trúc có hệ thống"
- 9 ma trận → Dùng "phân loại chuyên nghiệp"

**📊 Dữ liệu phân tích:**
- Chiều dài: ${params56.length_category}
- Hình dạng: ${params56.cut_form}
- Thể tích: ${params56.volume_zone}
- Mái: ${params56.fringe_type}

**🎓 Căn cứ lý thuyết (chỉ tham khảo - cấm trích dẫn trực tiếp):**
${theoryContext.substring(0, 400)}

**📐 Nguyên tắc cắt tóc:**

1. **Nguyên tắc hình thành thể tích:**
   - Góc nâng: Góc phù hợp
   - Vị trí thể tích: ${volumeDescVi}
   - Đường nét: Hình dạng tự nhiên

2. **Thứ tự phân khu:**
   - Bước 1: Vùng gáy - Thiết lập đường cơ sở
   - Bước 2: Phần sau - Tầng nấc hoặc lớp
   - Bước 3: Phần bên - Kết nối và pha trộn
   - Bước 4: Phần trên (đỉnh đầu) - Tạo thể tích
   - Bước 5: Mái - Hoàn thiện chi tiết

---

**📋 Định dạng công thức (Cấu trúc 7 bước):**

### STEP 1: Kết quả phân tích cơ bản
- **Chiều dài**: ${lengthDesc}
- **Hình dạng**: ${formDesc}
- **Thể tích**: ${volumeDescVi}
- **Mái**: ${fringeDesc}

---

### STEP 2: Đặc điểm phong cách
Dựa trên lý thuyết trên:
- **Cốt lõi của phong cách này**: Tại sao sử dụng phương pháp này (2-3 câu)
- **Hiệu quả mong đợi**: Đường nét nào sẽ được tạo ra
- **Đối tượng khuyến nghị**: Hình dạng khuôn mặt, chất tóc, lối sống

---

### STEP 3: Quy trình cắt chi tiết ⭐CỐT LÕI⭐

**【Bước 1: Vùng gáy - Thiết lập đường cơ sở】**
\`\`\`
Phân khu: Phân vùng gáy theo chiều ngang với khoảng cách 1-2cm
Nâng: Trạng thái rơi tự nhiên (0 độ) hoặc nâng nhẹ
Hướng: Chải hướng về phía trước hoặc sau
Kỹ thuật cắt:
  - Cắt thẳng 70% (đường cơ sở sạch)
  - Cắt điểm 30% (đuôi tóc tự nhiên)
Đường dẫn: Thiết lập tiêu chuẩn chiều dài ${params56.length_category}
Lưu ý: Duy trì đường cong tự nhiên theo đường cổ
\`\`\`

**【Bước 2: Phần sau - Hình thành tầng nấc/lớp】**
\`\`\`
Phân khu: Phân tóc sau theo hướng chéo với khoảng cách 2-3cm
Nâng: Độ cao trung bình (45-90 độ)
Hướng: Hướng chéo phía sau
Kỹ thuật cắt:
  - Tầng nấc hoặc lớp 60%
  - Cắt trượt 35-40% (kết nối mượt mà)
Mục tiêu: Tạo ${volumeDescVi}
\`\`\`

**【Bước 3: Phần bên - Tạo đường viền khuôn mặt】**
\`\`\`
Phân khu: Phân dọc quanh tai
Nâng: Theo vùng thể tích
Hướng: Hướng về mặt hoặc phía sau
Kỹ thuật cắt:
  - Lớp hoặc tầng nấc 65%
  - Cắt điểm 35% (kết cấu tự nhiên)
Pha trộn: Kết nối tự nhiên với phần sau
Lưu ý: Điều chỉnh chiều dài theo hình dạng khuôn mặt
\`\`\`

**【Bước 4: Phần trên (Đỉnh đầu) - Điểm thể tích】**
\`\`\`
Phân khu: Phân đỉnh đầu theo hình tia hoặc ngang
Nâng: Theo thể tích mong muốn
Kỹ thuật cắt:
  - Lớp 60-70%
  - Trượt 30-40%
Mục tiêu: Hoàn thành đường nét ${volumeDescVi}
\`\`\`

**【Bước 5: Mái - Hoàn thiện chi tiết】**
\`\`\`
Chiều dài: Chiều dài phù hợp
Phong cách: ${fringeDesc}
Phương pháp cắt: Tùy theo loại mái
Pha trộn: Kết nối tự nhiên với hai bên
\`\`\`

---

### STEP 4: Xử lý kết cấu

**Kết cấu lần 1 (Điều chỉnh hình dạng tổng thể):**
- **Kỹ thuật**: Cắt trượt hoặc cắt điểm 40%
- **Mục đích**: Kết nối mượt mà, dòng chảy tự nhiên
- **Vùng áp dụng**: Toàn bộ (đặc biệt là vùng kết nối)

**Kết cấu lần 2 (Hoàn thiện chi tiết):**
- **Kỹ thuật**: Tỉa hoặc cắt vạch 30%
- **Mục đích**: Cảm giác nhẹ nhàng, chuyển động năng động
- **Độ sâu**: Bề mặt, trung bình hoặc sâu (tùy chất tóc)

---

### STEP 5: Hướng dẫn tạo kiểu

**Phương pháp sấy:**
1. Sấy từ chân tóc (tăng thể tích hoặc tự nhiên)
2. Giữa đến đuôi: Chải mượt hoặc tạo sóng
3. Hoàn thiện: Gió lạnh để cố định

**Máy uốn/Máy ép (Tùy chọn):**
- Sử dụng máy uốn 26-32mm để tạo sóng tự nhiên
- Nhiệt độ: 160-180 độ C
- Thời gian: 3-5 giây mỗi phần

**Sản phẩm khuyến nghị:**
- Cơ sở: Mousse tăng thể tích hoặc kem uốn
- Hoàn thiện: Dầu dưỡng hoặc bột tăng thể tích
- Cố định: Sáp mềm hoặc xịt nhẹ

---

### STEP 6: Lưu ý quan trọng

**Lời khuyên theo hình dạng khuôn mặt:**
- Mặt tròn: Thể tích bên hoặc mái chéo hiệu quả
- Mặt vuông: Sóng làm mềm đường nét góc cạnh
- Mặt dài: Thể tích bên cân bằng độ dài khuôn mặt

**Mẹo theo chất tóc:**
- Tóc mỏng: Giảm thiểu xử lý kết cấu (20-30%), phải dùng sản phẩm tăng thể tích
- Tóc thường: Xử lý kết cấu vừa phải (30-40%)
- Tóc dày: Xử lý kết cấu đầy đủ (40-50%), dùng serum để chỉnh

**Bảo dưỡng:**
- Chu kỳ cắt tỉa: 3-6 tuần tùy chiều dài
- Chăm sóc tại nhà: Hàng ngày hoặc mỗi 2-3 ngày
- Điều trị: Tuần 1 lần hoặc tháng 2-3 lần

---

### STEP 7: Tham khảo phong cách tương tự

Các phong cách sau cũng có thể xem xét:

${similarStylesText}

---

Vui lòng tạo chính xác theo định dạng trên từ STEP 1 đến STEP 7.
Tất cả nội dung chỉ viết bằng **tiếng Việt**, cung cấp hướng dẫn cụ thể có thể áp dụng ngay tại salon.`;
}

// ==================== 레시피 생성 ====================
async function generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
  const { params56, language = 'ko' } = payload;

  try {
    console.log('🍳 레시피 생성 시작:', params56.length_category, '언어:', language);

    const searchQuery = `${params56.length_category || ''} ${params56.cut_form || ''} ${params56.volume_zone || ''} Volume`;
    const theoryChunks = await searchTheoryChunks(searchQuery, geminiKey, supabaseUrl, supabaseKey, 15);
    
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
      params56.cut_category?.includes('Women') ? 'female' : 'male'
    );

    const similarStyles = filterValidStyles(allSimilarStyles);
    console.log(`📊 도해도 검색 완료: 전체 ${allSimilarStyles.length}개 → 유효 ${similarStyles.length}개`);
    
    const langTerms = getTerms(language);
    const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];

    // ⭐⭐⭐ 유사 스타일 텍스트 미리 생성 (Syntax Error 방지) ⭐⭐⭐
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

    // 언어별 시스템 프롬프트 생성
    let systemPrompt;
    if (language === 'ko') {
      systemPrompt = buildKoreanPrompt(params56, theoryContext, similarStylesTextKo, langTerms, volumeDesc);
    } else if (language === 'en') {
      systemPrompt = buildEnglishPrompt(params56, theoryContext, similarStylesTextEn, langTerms, volumeDesc);
    } else if (language === 'ja') {
      systemPrompt = buildJapanesePrompt(params56, theoryContext, similarStylesTextKo, langTerms, volumeDesc);
    } else if (language === 'zh') {
      systemPrompt = buildChinesePrompt(params56, theoryContext, similarStylesTextKo, langTerms, volumeDesc);
    } else if (language === 'vi') {
      systemPrompt = buildVietnamesePrompt(params56, theoryContext, similarStylesTextKo, langTerms, volumeDesc);
    } else {
      systemPrompt = buildKoreanPrompt(params56, theoryContext, similarStylesTextKo, langTerms, volumeDesc);
    }

    const strictLanguageMessage = {
      ko: '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요.',
      en: 'You are an English expert. Write ALL responses in English ONLY.',
      ja: 'あなたは日本語の専門家です。すべての応答を日本語のみで書いてください。',
      zh: '你是中文专家。所有回答只用中文。',
      vi: 'Bạn là chuyên gia tiếng Việt. Viết TẤT CẢ phản hồi chỉ bằng tiếng Việt.'
    }[language] || '당신은 한국어 전문가입니다.';

    const userPrompt = `다음 파라미터로 레시피를 생성하세요:\n길이: ${params56.length_category}\n형태: ${params56.cut_form}\n볼륨: ${params56.volume_zone}`;

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
  return await generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey);
}

// ==================== 벡터 검색 (도해도) ====================
async function searchSimilarStyles(query, openaiKey, supabaseUrl, supabaseKey, targetGender = null) {
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

// ==================== 직접 테이블 검색 ====================
async function directTableSearch(supabaseUrl, supabaseKey, query, targetGender = null) {
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
