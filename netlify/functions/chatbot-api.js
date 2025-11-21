// netlify/functions/chatbot-api.js
// HAIRGATOR v5.0 FINAL - 일반대화 제거 버전 (2025-01-25)

const fetch = require('node-fetch');

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

// ==================== 56개 파라미터 스키마 ====================
const PARAMS_56_SCHEMA = {
    type: "object",
    properties: {
        cut_category: { type: "string", enum: ["Women's Cut", "Men's Cut"], description: "Gender category" },
        length_category: { type: "string", enum: ["A Length", "B Length", "C Length", "D Length", "E Length", "F Length", "G Length", "H Length"], description: "Overall length category based on body landmarks" },
        estimated_hair_length_cm: { type: "string", description: "Estimated hair length in cm (e.g., '35')" },
        front_length: { type: "string", enum: ["Very Short", "Short", "Medium", "Long", "Very Long"], description: "Front hair length" },
        back_length: { type: "string", enum: ["Very Short", "Short", "Medium", "Long", "Very Long"], description: "Back hair length" },
        side_length: { type: "string", enum: ["Very Short", "Short", "Medium", "Long", "Very Long"], description: "Side hair length" },
        cut_form: { type: "string", enum: ["O (One Length)", "G (Graduation)", "L (Layer)"], description: "Cut form - must include parentheses" },
        structure_layer: { type: "string", enum: ["No Layer", "Low Layer", "Mid Layer", "High Layer", "Full Layer", "Square Layer", "Round Layer", "Graduated Layer"], description: "Layer structure" },
        graduation_type: { type: "string", enum: ["None", "Light", "Medium", "Heavy"], description: "Graduation level" },
        weight_distribution: { type: "string", enum: ["Top Heavy", "Balanced", "Bottom Heavy"], description: "Weight distribution" },
        layer_type: { type: "string", enum: ["No Layer", "Low Layer", "Mid Layer", "High Layer", "Full Layer"], description: "Layer type" },
        silhouette: { type: "string", enum: ["Triangular", "Square", "Round"], description: "Overall silhouette shape" },
        outline_shape: { type: "string", enum: ["Straight", "Curved", "Angular", "Irregular"], description: "Outline shape" },
        volume_zone: { type: "string", enum: ["Low", "Medium", "High"], description: "Volume zone (bottom/middle/top)" },
        volume_distribution: { type: "string", enum: ["Top", "Middle", "Bottom", "Even"], description: "Volume distribution" },
        line_quality: { type: "string", enum: ["Sharp", "Soft", "Blended", "Disconnected"], description: "Line quality" },
        fringe_type: { type: "string", enum: ["Full Bang", "See-through Bang", "Side Bang", "Center Part", "No Fringe"], description: "Fringe type" },
        fringe_length: { type: "string", enum: ["Forehead", "Eyebrow", "Eye", "Cheekbone", "Lip", "Chin", "None"], description: "Fringe length" },
        fringe_texture: { type: "string", enum: ["Blunt", "Textured", "Wispy", "Choppy"], description: "Fringe texture" },
        surface_texture: { type: "string", enum: ["Smooth", "Textured", "Choppy", "Soft"], description: "Surface texture" },
        internal_texture: { type: "string", enum: ["Blunt", "Point Cut", "Slide Cut", "Razor Cut"], description: "Internal texture" },
        hair_density: { type: "string", enum: ["Thin", "Medium", "Thick"], description: "Hair density" },
        hair_texture: { type: "string", enum: ["Straight", "Wavy", "Curly", "Coily"], description: "Natural hair texture" },
        movement: { type: "string", enum: ["Static", "Slight", "Moderate", "High"], description: "Movement level" },
        texture_technique: { type: "string", enum: ["None", "Point Cut", "Slide Cut", "Razor", "Texturizing"], description: "Texturizing technique" },
        section_primary: { type: "string", enum: ["Horizontal", "Vertical", "Diagonal-Forward", "Diagonal-Backward"], description: "Primary sectioning direction" },
        lifting_range: { type: "array", items: { type: "string", enum: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"] }, minItems: 1, maxItems: 9, description: "Lifting angle range (array format)" },
        direction_primary: { type: "string", enum: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"], description: "Primary cutting direction" },
        cutting_method: { type: "string", enum: ["Blunt Cut", "Point Cut", "Slide Cut", "Stroke Cut", "Razor Cut"], description: "Cutting method" },
        styling_method: { type: "string", enum: ["Blow Dry", "Natural Dry", "Iron", "Curl", "Wave"], description: "Styling method" },
        design_emphasis: { type: "string", enum: ["Volume", "Length", "Texture", "Shape", "Movement"], description: "Design emphasis" },
        weight_flow: { type: "string", enum: ["Balanced", "Forward Weighted", "Backward Weighted"], description: "Weight flow" },
        connection_type: { type: "string", enum: ["Connected", "Disconnected", "Semi-Connected"], description: "Connection type" },
        womens_cut_category: { type: "string", enum: ["Long Straight", "Long Wave", "Long Curl", "Medium Straight", "Medium Wave", "Medium Curl", "Short Bob", "Short Pixie", "Shoulder Length"], description: "Women's cut category" },
        mens_cut_category: { type: "string", enum: ["Side Fringe", "Side Part", "Fringe Up", "Pushed Back", "Buzz", "Crop", "Mohican"], description: "Men's cut category" },
        face_shape_match: { type: "array", items: { type: "string", enum: ["Oval", "Round", "Square", "Heart", "Long", "Diamond"] }, minItems: 1, maxItems: 3, description: "Suitable face shapes" },
        curl_pattern: { type: ["string", "null"], enum: ["C-Curl", "CS-Curl", "S-Curl", "SS-Curl", null], description: "Curl pattern" },
        curl_strength: { type: ["string", "null"], enum: ["Soft", "Medium", "Strong", null], description: "Curl strength" },
        perm_type: { type: ["string", "null"], enum: ["Wave Perm", "Digital Perm", "Heat Perm", "Iron Perm", null], description: "Perm type" }
    },
    required: ["cut_category", "length_category", "cut_form", "lifting_range", "section_primary", "fringe_type", "volume_zone", "face_shape_match"],
    additionalProperties: false
};

// ==================== 메인 핸들러 ====================
exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
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
            case 'analyze_image': return await analyzeImage(payload, OPENAI_KEY);
            case 'generate_recipe': return await generateRecipe(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
            case 'generate_recipe_stream': return await generateRecipeStream(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
            case 'search_styles': return await searchStyles(payload, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
            case 'generate_response': return await generateProfessionalResponse(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
            case 'generate_response_stream': return await generateProfessionalResponseStream(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);
            default: return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
        }
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};

// ==================== 전문 답변 생성 (일반대화 통합) ====================
async function generateProfessionalResponse(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
    const { user_query, search_results } = payload;
    const userLanguage = detectLanguage(user_query);

    console.log(`💬 전문 답변: "${user_query}"`);

    let normalizedQuery = user_query
        .replace(/A\s*렝스|A\s*랭스|에이\s*렝스|에이\s*랭스|A\s*기장/gi, 'A Length')
        .replace(/B\s*렝스|B\s*랭스|비\s*렝스|비\s*랭스|B\s*기장/gi, 'B Length')
        .replace(/C\s*렝스|C\s*랭스|씨\s*렝스|씨\s*랭스|C\s*기장/gi, 'C Length')
        .replace(/D\s*렝스|D\s*랭스|디\s*렝스|디\s*랭스|D\s*기장/gi, 'D Length')
        .replace(/E\s*렝스|E\s*랭스|이\s*렝스|이\s*랭스|E\s*기장/gi, 'E Length')
        .replace(/F\s*렝스|F\s*랭스|에프\s*렝스|에프\s*랭스|F\s*기장/gi, 'F Length')
        .replace(/G\s*렝스|G\s*랭스|지\s*렝스|지\s*랭스|G\s*기장/gi, 'G Length')
        .replace(/H\s*렝스|H\s*랭스|에이치\s*렝스|에이치\s*랭스|H\s*기장/gi, 'H Length')
        .replace(/레이어|layer/gi, 'Layer')
        .replace(/그래쥬에이션|그라데이션|graduation/gi, 'Graduation');

    if (normalizedQuery !== user_query) {
        console.log(`📝 질문 정규화: "${user_query}" → "${normalizedQuery}"`);
    }

    const simpleGreetings = ['안녕', 'hi', 'hello', '헬로', '하이', '반가워', '여보세요'];
    const isSimpleGreeting = simpleGreetings.some(g => {
        const query = user_query.toLowerCase().trim();
        return query === g || query === g + '하세요' || query === g + '!' || query === g + '?';
    }) && user_query.length < 15;

    if (isSimpleGreeting) {
        const greetingResponses = {
            korean: '안녕하세요! 헤어스타일에 대해 무엇이든 물어보세요. 😊\n\n예시:\n• "렝스별로 설명해줘"\n• "레이어드 컷이 뭐야?"\n• "G Length가 뭐야?"\n• "얼굴형에 맞는 스타일 추천해줘"',
            english: 'Hello! Feel free to ask anything about hairstyles. 😊\n\nExamples:\n• "Explain length categories"\n• "What is layered cut?"\n• "Recommend styles for my face shape"',
            japanese: 'こんにちは！ヘアスタイルについて何でも聞いてください。😊',
            chinese: '你好！请随便问关于发型的问题。😊',
            vietnamese: 'Xin chào! Hỏi gì về kiểu tóc cũng được. 😊'
        };
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: greetingResponses[userLanguage] || greetingResponses['korean'] }) };
    }

    const securityKeywords = ['42포뮬러', '42개 포뮬러', '42 formula', '9매트릭스', '9개 매트릭스', '9 matrix', 'DBS NO', 'DFS NO', 'VS NO', 'HS NO', '42층', '7개 섹션', '7 section'];
    const isSecurityQuery = securityKeywords.some(keyword => user_query.toLowerCase().includes(keyword.toLowerCase()));

    if (isSecurityQuery) {
        const securityResponse = {
            korean: '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀입니다.\n\n대신 이런 질문은 어떠세요?\n• "레이어 컷의 기본 원리는?"\n• "얼굴형별 추천 스타일"\n• "헤어 길이 분류 시스템"',
            english: 'I apologize, but that information is proprietary to the 2WAY CUT system.\n\nHow about these questions instead?\n• "Basic principles of layer cut"\n• "Recommended styles by face shape"',
            japanese: '申し訳ございませんが、その情報は企業秘密です。',
            chinese: '抱歉，该信息属于核心商业机密。',
            vietnamese: 'Xin lỗi, thông tin đó là bí mật kinh doanh.'
        };
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: securityResponse[userLanguage] || securityResponse['korean'], security_filtered: true }) };
    }

    const theoryChunks = await searchTheoryChunks(normalizedQuery, geminiKey, supabaseUrl, supabaseKey, 10);
    console.log(`📚 theory_chunks 검색 결과: ${theoryChunks.length}개`);

    let systemPrompt;
    if (theoryChunks.length > 0) {
        const theoryContext = theoryChunks.map((chunk, idx) => {
            const title = chunk.section_title || '';
            const content = (chunk.content_ko || chunk.content || '').substring(0, 500);
            return `【참고자료 ${idx + 1}】${title}\n${content}`;
        }).join('\n\n');
        systemPrompt = buildTheoryBasedPrompt(normalizedQuery, theoryContext, userLanguage);
    } else {
        systemPrompt = buildGeneralPrompt(normalizedQuery, userLanguage);
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: user_query }],
                temperature: 0.3,
                max_tokens: 300
            })
        });

        if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
        const data = await response.json();
        const gptResponse = data.choices[0].message.content;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data: gptResponse, theory_used: theoryChunks.length > 0, theory_count: theoryChunks.length })
        };
    } catch (error) {
        console.error('💥 GPT 호출 실패:', error);
        const fallbackResponse = {
            korean: '죄송합니다. 답변 생성 중 오류가 발생했습니다.\n다시 시도해주시거나, 더 구체적으로 질문해주세요.',
            english: 'Sorry, an error occurred while generating the response.\nPlease try again or ask more specifically.',
            japanese: '申し訳ございません。エラーが発生しました。',
            chinese: '抱歉，生成回复时出错。',
            vietnamese: 'Xin lỗi, đã xảy ra lỗi khi tạo phản hồi.'
        };
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: fallbackResponse[userLanguage] || fallbackResponse['korean'] }) };
    }
}

function buildTheoryBasedPrompt(query, theoryContext, language) {
    const prompts = {
        korean: `질문: ${query}\n\n참고:\n${theoryContext.substring(0, 500)}\n\n2문장으로 간단히 답변하세요.`,
        english: `Question: ${query}\n\nReference:\n${theoryContext.substring(0, 500)}\n\nAnswer briefly in 2 sentences.`,
        japanese: `質問: ${query}\n\n参考:\n${theoryContext.substring(0, 500)}\n\n2文で簡潔に答えてください。`,
        chinese: `问题: ${query}\n\n参考:\n${theoryContext.substring(0, 500)}\n\n用2句话简短回答。`,
        vietnamese: `Câu hỏi: ${query}\n\nTham khảo:\n${theoryContext.substring(0, 500)}\n\nTrả lời ngắn gọn trong 2 câu.`
    };
    return prompts[language] || prompts['korean'];
}

function buildGeneralPrompt(query, language) {
    const prompts = {
        korean: `질문: ${query}\n\n(정확한 자료 없음)\n\n일반 지식으로 2문장 답변:`,
        english: `Question: ${query}\n\n(No exact data)\n\nAnswer in 2 sentences:`,
        japanese: `質問: ${query}\n\n(データなし)\n\n2文で答えて:`,
        chinese: `问题: ${query}\n\n(无数据)\n\n2句话:`,
        vietnamese: `Câu hỏi: ${query}\n\n(Không có dữ liệu)\n\n2 câu:`
    };
    return prompts[language] || prompts['korean'];
}

async function analyzeImage(payload, openaiKey) {
    const { image_base64, mime_type, user_gender } = payload;
    console.log(`🎯 이미지 분석 시작 - 사용자 선택 성별: ${user_gender || 'unspecified'}`);

    const genderContext = user_gender === 'male'
        ? `\n\n⚠️ IMPORTANT: This is a MALE hairstyle. Focus on men's cut categories and techniques.\n- Use "Men's Cut" for cut_category\n- Select from mens_cut_category options\n- Consider typical male length ranges (mostly E~H Length)`
        : user_gender === 'female'
            ? `\n\n⚠️ IMPORTANT: This is a FEMALE hairstyle. Focus on women's cut categories and techniques.\n- Use "Women's Cut" for cut_category\n- Select from womens_cut_category options\n- Consider typical female length ranges (A~H Length)`
            : `\n\nAnalyze the hairstyle gender and select appropriate cut_category.`;

    const systemPrompt = `You are an expert hair stylist specializing in the 2WAY CUT system.
Analyze the uploaded hairstyle image and extract ALL 56 parameters with ABSOLUTE PRECISION.
${genderContext}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CRITICAL INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## LENGTH CLASSIFICATION (MOST IMPORTANT!)
**"WHERE does the LONGEST hair END touch the body?"**
8 Length Categories:
- A Length (65cm): Below chest (near navel)
- B Length (50cm): Mid chest (nipple level)
- C Length (40cm): Collarbone
- D Length (35cm): Shoulder line ⭐ KEY REFERENCE
- E Length (30cm): 2-3cm ABOVE shoulder
- F Length (25cm): Below chin (neck starts)
- G Length (20cm): Jaw line
- H Length (15cm): Ear level

STEP 1: Find the LONGEST hair strand in the BACK
STEP 2: Compare to body landmarks CAREFULLY
STEP 3: If between two lengths, choose the LONGER one
STEP 4: Double-check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## OTHER KEY PARAMETERS
**Cut Form (with parentheses!):**
- "O (One Length)" / "G (Graduation)" / "L (Layer)"
**Lifting Range (array!):**
- ["L0"] / ["L2"] / ["L2", "L4"]
**Volume Zone:**
- Low (0-44°) / Medium (45-89°) / High (90°+)
**Face Shape Match (1-3 selections!):**
- ["Oval", "Round"] or ["Square", "Heart", "Long"] etc.
Extract ALL parameters accurately following the JSON schema!`;

    try {
        console.log('📸 GPT-4o Vision 분석 시작 (Function Calling)');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o-2024-11-20',
                messages: [{ role: 'user', content: [{ type: 'text', text: systemPrompt }, { type: 'image_url', image_url: { url: `data:${mime_type};base64,${image_base64}`, detail: 'high' } }] }],
                functions: [{ name: 'extract_hair_parameters', description: 'Extract all 56 hair analysis parameters', parameters: PARAMS_56_SCHEMA }],
                function_call: { name: 'extract_hair_parameters' },
                temperature: 0.3,
                max_tokens: 4000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GPT-4o API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const functionCall = data.choices?.[0]?.message?.function_call;
        if (!functionCall || !functionCall.arguments) throw new Error('No function call in response');

        const params56 = JSON.parse(functionCall.arguments);

        if (user_gender === 'male' && params56.cut_category !== "Men's Cut") {
            params56.cut_category = "Men's Cut";
        } else if (user_gender === 'female' && params56.cut_category !== "Women's Cut") {
            params56.cut_category = "Women's Cut";
        }

        console.log('✅ GPT-4o Vision 분석 완료 (56개 파라미터)');
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: params56, user_gender: user_gender, model: 'gpt-4o-2024-11-20', method: 'function_calling' }) };
    } catch (error) {
        console.error('💥 analyzeImage Error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Image analysis failed', details: error.message }) };
    }
}

function calculateVolumeFromLifting(liftingCode) {
    const angles = { 'L0': 0, 'L1': 22.5, 'L2': 45, 'L3': 67.5, 'L4': 90, 'L5': 112.5, 'L6': 135, 'L7': 157.5, 'L8': 180 };
    const angle = angles[liftingCode] || 0;
    if (angle < 45) return 'Low';
    if (angle < 90) return 'Medium';
    return 'High';
}

function sanitizeRecipeForPublic(recipe, language = 'ko') {
    if (!recipe) return recipe;
    let filtered = recipe;
    filtered = filtered.replace(/DBS\s+NO\.\s*\d+/gi, '뒷머리 기법').replace(/DFS\s+NO\.\s*\d+/gi, '앞머리 기법').replace(/VS\s+NO\.\s*\d+/gi, '중앙 기법').replace(/HS\s+NO\.\s*\d+/gi, '상단 기법').replace(/UP[\s-]?STEM\s+NO\.\s*\d+/gi, '정수리 기법').replace(/NAPE\s+ZONE\s+NO\.\s*\d+/gi, '목 부위 기법');
    filtered = filtered.replace(/가로섹션|Horizontal\s+Section/gi, '상단 부분').replace(/후대각섹션|Diagonal\s+Backward\s+Section/gi, '뒷머리 부분').replace(/전대각섹션|Diagonal\s+Forward\s+Section/gi, '앞쪽 부분').replace(/세로섹션|Vertical\s+Section/gi, '중앙 부분').replace(/네이프존|Nape\s+Zone/gi, '목 부위').replace(/업스템|Up[\s-]?Stem/gi, '정수리 부분').replace(/백존|Back\s+Zone/gi, '후면 부분');
    filtered = filtered.replace(/L[0-8]\s*\([^)]+\)/gi, '적절한 각도로').replace(/D[0-8]\s*\([^)]+\)/gi, '자연스러운 방향으로');
    filtered = filtered.replace(/42층|42\s+layers?|42-layer/gi, '전문적인 층 구조').replace(/\d+층\s+구조/gi, '체계적인 층 구조');
    filtered = filtered.replace(/9개\s+매트릭스|9\s+matrix|nine\s+matrix/gi, '체계적인 분류').replace(/매트릭스\s+코드|matrix\s+code/gi, '스타일 분류');
    filtered = filtered.replace(/7개\s+섹션|7개\s+존|7\s+section|7\s+zone/gi, '여러 부분');
    filtered = filtered.replace(/\(Book\s+[A-E],\s+p\.\s*\d+\)/gi, '').replace(/\(2WAY\s+CUT\s+Book\s+[A-E],\s+Page\s+\d+\)/gi, '');
    console.log('🔒 보안 필터링 완료');
    return filtered;
}

function buildSearchQuery(params56) {
    const parts = [];
    if (params56.length_category) {
        const lengthMap = { 'A Length': '가슴 아래 롱헤어', 'B Length': '가슴 세미롱', 'C Length': '쇄골 세미롱', 'D Length': '어깨선 미디엄', 'E Length': '어깨 위 단발', 'F Length': '턱선 보브', 'G Length': '짧은 보브', 'H Length': '베리숏' };
        parts.push(lengthMap[params56.length_category]);
    }
    if (params56.cut_form) parts.push(params56.cut_form.replace(/[()]/g, '').trim());
    if (params56.lifting_range && params56.lifting_range.length > 0) parts.push(`리프팅 ${params56.lifting_range.join(' ')}`);
    if (params56.section_primary) parts.push(`섹션 ${params56.section_primary}`);
    if (params56.volume_zone) parts.push(`${params56.volume_zone} 볼륨`);
    if (params56.fringe_type && params56.fringe_type !== 'No Fringe') parts.push(params56.fringe_type);
    return parts.join(', ');
}

async function searchRecipeSamples(supabaseUrl, supabaseKey, geminiKey, searchQuery, targetGender, lengthCategory = null) {
    try {
        console.log(`🔍 recipe_samples 검색: "${searchQuery}"`);
        const embeddingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: searchQuery }] } })
        });
        if (!embeddingResponse.ok) throw new Error(`Gemini embedding failed: ${embeddingResponse.status}`);
        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.embedding.values;
        const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/match_recipe_samples`, {
            method: 'POST',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query_embedding: queryEmbedding, match_threshold: 0.55, match_count: 30, filter_gender: targetGender })
        });
        if (!rpcResponse.ok) return [];
        let results = await rpcResponse.json();
        if (lengthCategory) {
            const lengthPrefix = getLengthPrefix(lengthCategory);
            if (lengthPrefix) results = results.filter(r => r.sample_code && r.sample_code.startsWith(lengthPrefix));
        }
        return results;
    } catch (error) {
        console.error('💥 searchRecipeSamples Error:', error);
        return [];
    }
}

function getLengthPrefix(lengthCategory) {
    const map = { 'A Length': 'FAL', 'B Length': 'FBL', 'C Length': 'FCL', 'D Length': 'FDL', 'E Length': 'FEL', 'F Length': 'FFL', 'G Length': 'FGL', 'H Length': 'FHL' };
    return map[lengthCategory] || null;
}

function selectBestDiagrams(recipeSamples, maxDiagrams = 15) {
    const selectedDiagrams = [];
    recipeSamples.forEach(sample => {
        const parts = sample.sample_code.split('_');
        const stepNumber = parseInt(parts[1]) || 1;
        const diagramIndex = stepNumber - 1;
        if (sample.diagram_images && Array.isArray(sample.diagram_images) && sample.diagram_images[diagramIndex]) {
            selectedDiagrams.push({ style_code: parts[0], step_number: stepNumber, image_url: sample.diagram_images[diagramIndex], recipe_text: sample.recipe_full_text_ko, similarity: sample.similarity, sample_code: sample.sample_code });
        }
    });
    selectedDiagrams.sort((a, b) => b.similarity - a.similarity);
    return selectedDiagrams.slice(0, maxDiagrams);
}

function getTerms(lang) {
    const terms = {
        ko: {
            lengthDesc: { 'A Length': '가슴 아래 밑선', 'B Length': '가슴 상단~중간', 'C Length': '쇄골 밑선', 'D Length': '어깨선', 'E Length': '어깨 위 2-3cm', 'F Length': '턱뼈 아래', 'G Length': '턱선', 'H Length': '귀 높이' },
            faceShapeDesc: { 'Oval': '계란형', 'Round': '둥근형', 'Square': '사각형', 'Heart': '하트형', 'Long': '긴 얼굴형', 'Diamond': '다이아몬드형' },
            formDesc: { 'O': 'One Length, 원렝스', 'G': 'Graduation, 그래쥬에이션', 'L': 'Layer, 레이어' },
            volume: { 'Low': '하단 볼륨 (0~44도)', 'Medium': '중단 볼륨 (45~89도)', 'High': '상단 볼륨 (90도 이상)' }
        },
        en: {
            lengthDesc: { 'A Length': 'Below chest', 'D Length': 'Shoulder line', 'E Length': '2-3cm above shoulder', 'G Length': 'Jaw line' },
            faceShapeDesc: { 'Oval': 'Oval', 'Round': 'Round', 'Square': 'Square', 'Heart': 'Heart', 'Long': 'Long', 'Diamond': 'Diamond' },
            formDesc: { 'O': 'One Length', 'G': 'Graduation', 'L': 'Layer' },
            volume: { 'Low': 'Low volume (0-44°)', 'Medium': 'Medium volume (45-89°)', 'High': 'High volume (90°+)' }
        }
    };
    return terms[lang] || terms['ko'];
}

async function searchTheoryChunks(query, geminiKey, supabaseUrl, supabaseKey, matchCount = 5) {
    try {
        const embeddingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: query }] } })
        });
        if (!embeddingResponse.ok) return await fallbackKeywordSearch(query, supabaseUrl, supabaseKey, matchCount);
        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.embedding.values;
        const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/hybrid_search_theory_chunks`, {
            method: 'POST',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query_embedding: queryEmbedding, query_text: query, vector_threshold: 0.55, vector_count: 10, keyword_count: 10, final_count: matchCount })
        });
        if (!rpcResponse.ok) return await fallbackVectorSearch(queryEmbedding, supabaseUrl, supabaseKey, matchCount);
        return await rpcResponse.json();
    } catch (error) {
        console.error('💥 theory_chunks 검색 오류:', error);
        return [];
    }
}

async function fallbackVectorSearch(queryEmbedding, supabaseUrl, supabaseKey, matchCount) {
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/match_theory_chunks`, {
            method: 'POST',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query_embedding: queryEmbedding, match_threshold: 0.55, match_count: matchCount })
        });
        if (!response.ok) return [];
        return await response.json();
    } catch (error) { return []; }
}

async function fallbackKeywordSearch(query, supabaseUrl, supabaseKey, matchCount) {
    try {
        const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);
        const response = await fetch(`${supabaseUrl}/rest/v1/theory_chunks?select=*&limit=${matchCount * 2}`, {
            method: 'GET',
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' }
        });
        if (!response.ok) return [];
        const allData = await response.json();
        const scored = allData.map(item => {
            let score = 0;
            const itemText = `${item.content || ''} ${item.content_ko || ''} ${(item.keywords || []).join(' ')}`.toLowerCase();
            keywords.forEach(kw => { if (itemText.includes(kw)) score++; });
            return { ...item, keyword_score: score };
        });
        return scored.filter(item => item.keyword_score > 0).sort((a, b) => b.keyword_score - a.keyword_score).slice(0, matchCount);
    } catch (error) { return []; }
}

async function generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
    const { params56, language = 'ko' } = payload;
    try {
        const searchQuery = buildSearchQuery(params56);
        const targetGender = params56.cut_category?.includes("Women") ? 'female' : 'male';
        const recipeSamples = await searchRecipeSamples(supabaseUrl, supabaseKey, geminiKey, searchQuery, targetGender, params56.length_category);
        const selectedDiagrams = selectBestDiagrams(recipeSamples, 15);
        const theoryChunks = await searchTheoryChunks(searchQuery, geminiKey, supabaseUrl, supabaseKey, 5);
        const theoryContext = theoryChunks.length > 0 ? theoryChunks.map((t, idx) => `${idx + 1}. ${t.section_title || '이론'}: ${(t.content_ko || t.content || '').substring(0, 100)}...`).join('\n') : '(이론 참고 자료 없음)';
        const diagramsContext = selectedDiagrams.map((d, idx) => `${idx + 1}단계: ${d.sample_code} (유사도 ${(d.similarity * 100).toFixed(0)}%)\n   설명: ${d.recipe_text.substring(0, 100)}...`).join('\n\n');
        const langTerms = getTerms(language);
        const volumeDesc = langTerms.volume[params56.volume_zone] || langTerms.volume['Medium'];
        const faceShapesKo = (params56.face_shape_match || []).map(shape => langTerms.faceShapeDesc[shape] || shape).join(', ');
        const enhancedPrompt = `당신은 전문 헤어 스타일리스트입니다.\n\n**분석 결과:**\n- 길이: ${params56.length_category} (${langTerms.lengthDesc[params56.length_category]})\n- 형태: ${params56.cut_form}\n- 볼륨: ${params56.volume_zone} (${volumeDesc})\n- 앞머리: ${params56.fringe_type || '없음'}\n- 어울리는 얼굴형: ${faceShapesKo || '모든 얼굴형'}\n\n**📚 이론적 근거 (${theoryChunks.length}개):**\n\n${theoryContext}\n\n**🎯 선별된 도해도 순서 (${selectedDiagrams.length}개):**\n\n${diagramsContext}\n\n**📋 작성 지침:**\n\n위의 이론과 도해도 순서를 **정확히 따라서** 레시피를 작성하세요.\n\n### STEP 1: 전체 개요 (2-3줄)\n### STEP 2: 상세 커팅 순서 (${selectedDiagrams.length}단계)\n### STEP 3: 질감 처리\n### STEP 4: 스타일링 가이드\n### STEP 5: 유지 관리\n\n총 800자 이내로 간결하게, 한국어로만 작성하세요.`;
        const completion = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: '당신은 한국어 전문가입니다. 모든 응답을 한국어로만 작성하세요.' }, { role: 'user', content: enhancedPrompt }], temperature: 0.5, max_tokens: 2000 })
        });
        if (!completion.ok) throw new Error(`OpenAI API Error: ${completion.status}`);
        const data = await completion.json();
        let recipe = data.choices[0].message.content;
        recipe = sanitizeRecipeForPublic(recipe, language);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: { recipe: recipe, params56: params56, diagrams: selectedDiagrams, diagram_count: selectedDiagrams.length, matched_samples: recipeSamples.slice(0, 3), theory_chunks: theoryChunks, theory_count: theoryChunks.length } }) };
    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Recipe generation failed', details: error.message }) };
    }
}

async function generateRecipeStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
    return await generateRecipe(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey);
}

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

async function searchStyles(payload, geminiKey, supabaseUrl, supabaseKey) {
    const { query } = payload;
    const targetGender = null;
    const results = await searchRecipeSamples(supabaseUrl, supabaseKey, geminiKey, query, targetGender);
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: results }) };
}

async function generateProfessionalResponseStream(payload, openaiKey, geminiKey, supabaseUrl, supabaseKey) {
    const { user_query, search_results } = payload;
    const userLanguage = detectLanguage(user_query);
    let normalizedQuery = user_query.replace(/A\s*렝스|A\s*랭스|에이\s*렝스|에이\s*랭스|A\s*기장/gi, 'A Length').replace(/B\s*렝스|B\s*랭스|비\s*렝스|비\s*랭스|B\s*기장/gi, 'B Length').replace(/C\s*렝스|C\s*랭스|씨\s*렝스|씨\s*랭스|C\s*기장/gi, 'C Length').replace(/D\s*렝스|D\s*랭스|디\s*렝스|디\s*랭스|D\s*기장/gi, 'D Length').replace(/E\s*렝스|E\s*랭스|이\s*렝스|이\s*랭스|E\s*기장/gi, 'E Length').replace(/F\s*렝스|F\s*랭스|에프\s*렝스|에프\s*랭스|F\s*기장/gi, 'F Length').replace(/G\s*렝스|G\s*랭스|지\s*렝스|지\s*랭스|G\s*기장/gi, 'G Length').replace(/H\s*렝스|H\s*랭스|에이치\s*렝스|에이치\s*랭스|H\s*기장/gi, 'H Length').replace(/레이어|layer/gi, 'Layer').replace(/그래쥬에이션|그라데이션|graduation/gi, 'Graduation');
    const simpleGreetings = ['안녕', 'hi', 'hello', '헬로', '하이', '반가워', '여보세요'];
    const isSimpleGreeting = simpleGreetings.some(g => { const query = user_query.toLowerCase().trim(); return query === g || query === g + '하세요' || query === g + '!' || query === g + '?'; }) && user_query.length < 15;
    if (isSimpleGreeting) {
        const greetingResponses = { korean: '안녕하세요! 헤어스타일에 대해 무엇이든 물어보세요. 😊', english: 'Hello! Feel free to ask anything about hairstyles. 😊', japanese: 'こんにちは！ヘアスタイルについて何でも聞いてください。😊', chinese: '你好！请随便问关于发型的问题。😊', vietnamese: 'Xin chào! Hỏi gì về kiểu tóc cũng được. 😊' };
        const msg = greetingResponses[userLanguage] || greetingResponses['korean'];
        return { statusCode: 200, headers: { ...headers, 'Content-Type': 'text/event-stream' }, body: `data: ${JSON.stringify({ type: 'content', content: msg })}\n\ndata: [DONE]\n\n` };
    }
    const securityKeywords = ['42포뮬러', '42개 포뮬러', '42 formula', '9매트릭스', '9개 매트릭스', '9 matrix', 'DBS NO', 'DFS NO', 'VS NO', 'HS NO', '42층', '7개 섹션', '7 section'];
    const isSecurityQuery = securityKeywords.some(keyword => user_query.toLowerCase().includes(keyword.toLowerCase()));
    if (isSecurityQuery) {
        const securityResponse = { korean: '죄송합니다. 해당 정보는 2WAY CUT 시스템의 핵심 영업 기밀입니다.', english: 'I apologize, but that information is proprietary.', japanese: '申し訳ございませんが、その情報は企業秘密です。', chinese: '抱歉，该信息属于核心商业机密。', vietnamese: 'Xin lỗi, thông tin đó là bí mật kinh doanh.' };
        const msg = securityResponse[userLanguage] || securityResponse['korean'];
        return { statusCode: 200, headers: { ...headers, 'Content-Type': 'text/event-stream' }, body: `data: ${JSON.stringify({ type: 'content', content: msg })}\n\ndata: [DONE]\n\n` };
    }
    const theoryChunks = await searchTheoryChunks(normalizedQuery, geminiKey, supabaseUrl, supabaseKey, 10);
    let systemPrompt;
    if (theoryChunks.length > 0) {
        const theoryContext = theoryChunks.map((chunk, idx) => { const title = chunk.section_title || ''; const content = (chunk.content_ko || chunk.content || '').substring(0, 500); return `【참고자료 ${idx + 1}】${title}\n${content}`; }).join('\n\n');
        systemPrompt = buildTheoryBasedPrompt(normalizedQuery, theoryContext, userLanguage);
    } else {
        systemPrompt = buildGeneralPrompt(normalizedQuery, userLanguage);
    }
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: user_query }], temperature: 0.3, max_tokens: 300, stream: true })
        });
        if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices[0]?.delta?.content || '';
                        if (content) sseBuffer += `data: ${JSON.stringify({ type: 'content', content: content })}\n\n`;
                    } catch (e) { }
                }
            }
        }
        sseBuffer += 'data: [DONE]\n\n';
        return { statusCode: 200, headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }, body: sseBuffer };
    } catch (error) {
        console.error('💥 GPT 스트리밍 호출 실패:', error);
        const errorMsg = '죄송합니다. 답변 생성 중 오류가 발생했습니다.';
        return { statusCode: 200, headers: { ...headers, 'Content-Type': 'text/event-stream' }, body: `data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\ndata: [DONE]\n\n` };
    }
}
