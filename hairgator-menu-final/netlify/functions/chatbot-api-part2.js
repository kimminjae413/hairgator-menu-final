
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
                console.error('💥 에러 상세:', error.message);
                console.error('💥 에러 스택:', error.stack);
                const errorMsg = `답변 생성 중 오류가 발생했습니다. (${error.message})`;
                return { statusCode: 200, headers: { ...headers, 'Content-Type': 'text/event-stream' }, body: `data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\ndata: [DONE]\n\n` };
            }
        }

        function buildTheoryBasedPrompt(query, theoryContext, language) {
            const prompts = {
                korean: `당신은 전문 헤어 디자이너입니다. 다음 전문 이론을 바탕으로 질문에 답변하세요.\n\n【전문 이론 자료】\n${theoryContext}\n\n위 자료를 참고하여 사용자의 질문에 전문적이고 정확하게 답변하세요. 300자 이내로 간결하게 작성하세요.`,
                english: `You are a professional hair designer. Answer based on the following theory.\n\n【Theory】\n${theoryContext}\n\nProvide a professional answer within 150 words.`,
                japanese: `あなたはプロのヘアデザイナーです。次の理論に基づいて答えてください。\n\n【理論】\n${theoryContext}\n\n150文字以内で簡潔に答えてください。`,
                chinese: `你是专业的发型设计师。基于以下理论回答问题。\n\n【理论】\n${theoryContext}\n\n请在150字以内简洁回答。`,
                vietnamese: `Bạn là nhà thiết kế tóc chuyên nghiệp. Trả lời dựa trên lý thuyết sau.\n\n【Lý thuyết】\n${theoryContext}\n\nTrả lời trong 150 từ.`
            };
            return prompts[language] || prompts['korean'];
        }

        function buildGeneralPrompt(query, language) {
            const prompts = {
                korean: `당신은 친절한 헤어 스타일 상담 전문가입니다. 사용자의 질문에 대해 일반적인 헤어스타일 조언을 제공하세요. 200자 이내로 간결하게 답변하세요.`,
                english: `You are a friendly hair styling consultant. Provide general hair advice within 100 words.`,
                japanese: `あなたは親切なヘアスタイルコンサルタントです。一般的なアドバイスを100文字以内で提供してください。`,
                chinese: `你是友好的发型顾问。在100字内提供一般建议。`,
                vietnamese: `Bạn là cố vấn kiểu tóc thân thiện. Cung cấp lời khuyên trong 100 từ.`
            };
            return prompts[language] || prompts['korean'];
        }

        async function analyzeImage(payload, openaiKey) {
            const { image_data } = payload;
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openaiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{
                            role: 'user',
                            content: [
                                { type: 'text', text: '이 헤어스타일 이미지를 분석하여 56개 파라미터를 추출하세요.' },
                                { type: 'image_url', image_url: { url: image_data } }
                            ]
                        }],
                        max_tokens: 1000
                    })
                });
                if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
                const data = await response.json();
                return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: data.choices[0].message.content }) };
            } catch (error) {
                console.error('💥 Image analysis failed:', error);
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'Image analysis failed', details: error.message }) };
            }
        }

        exports.handler = async (event, context) => {
            if (event.httpMethod === 'OPTIONS') {
                return { statusCode: 200, headers, body: '' };
            }

            const OPENAI_KEY = process.env.OPENAI_API_KEY;
            const GEMINI_KEY = process.env.GEMINI_API_KEY;
            const SUPABASE_URL = process.env.SUPABASE_URL;
            const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

            if (!OPENAI_KEY || !GEMINI_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
                console.error('❌ Missing environment variables');
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Server configuration error: Missing API keys' })
                };
            }

            try {
                const { action, payload } = JSON.parse(event.body);

                switch (action) {
                    case 'analyze_image':
                        return await analyzeImage(payload, OPENAI_KEY);

                    case 'generate_recipe':
                        return await generateRecipe(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);

                    case 'generate_recipe_stream':
                        return await generateRecipeStream(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);

                    case 'search_styles':
                        return await searchStyles(payload, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);

                    case 'generate_response_stream':
                        return await generateProfessionalResponseStream(payload, OPENAI_KEY, GEMINI_KEY, SUPABASE_URL, SUPABASE_KEY);

                    default:
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ error: 'Unknown action' })
                        };
                }
            } catch (error) {
                console.error('💥 Handler error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Internal server error', details: error.message })
                };
            }
        };
