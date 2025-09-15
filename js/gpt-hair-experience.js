/**
 * GPT 헤어스타일 변경 처리 - GPT Image 1 전용 최적화
 */
async function processGPTHairStyleChange(userPhoto, styleImageUrl, styleName, options = {}) {
    console.log('🎨 GPT Image 1 헤어스타일 변경 시작 (얼굴 보존 모드)...');
    
    try {
        let userPhotoBase64;
        
        // 사용자 사진 처리 (파일 vs 샘플)
        if (userPhoto.type === 'sample') {
            // 샘플 모델인 경우
            userPhotoBase64 = userPhoto.url;
        } else {
            // 업로드된 파일인 경우
            userPhotoBase64 = await fileToBase64(userPhoto);
        }
        
        // GPT Image 1 Edit 모드 우선 시도
        console.log('🔗 GPT Image 1 Edit 모드 시도...');
        
        const editPrompt = buildGPTImage1EditPrompt(styleName, options);
        
        const editResponse = await fetch('/.netlify/functions/openai-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'edit',
                image: userPhotoBase64,
                mask: await generateHairMask(),
                prompt: editPrompt,
                input_fidelity: 'high',  // 얼굴 보존 핵심 설정
                quality: options.enhanceQuality ? 'high' : 'medium',
                size: '1024x1024',
                n: 1
            })
        });
        
        console.log('📡 Edit 응답 상태:', editResponse.status);
        
        if (editResponse.ok) {
            const editResult = await editResponse.json();
            
            if (editResult.data && editResult.data[0]) {
                return {
                    success: true,
                    originalImage: userPhotoBase64,
                    styledImage: editResult.data[0].url,
                    styleName: styleName,
                    method: 'gpt-image-1-edit',
                    options: options
                };
            }
        }
        
        // Edit 모드 실패시 Generate 모드로 폴백
        console.log('⚠️ Edit 모드 실패, GPT Image 1 Generate 모드로 폴백...');
        
        const generatePrompt = buildGPTImage1GeneratePrompt(styleName, options);
        
        const generateResponse = await fetch('/.netlify/functions/openai-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'generate',
                prompt: generatePrompt,
                quality: options.enhanceQuality ? 'high' : 'medium',
                size: '1024x1024',
                n: 1
            })
        });
        
        if (!generateResponse.ok) {
            const errorText = await generateResponse.text();
            throw new Error(`HTTP ${generateResponse.status}: ${errorText}`);
        }
        
        const generateResult = await generateResponse.json();
        
        if (generateResult.error) {
            throw new Error(generateResult.error.message || generateResult.error);
        }
        
        if (generateResult.data && generateResult.data[0]) {
            return {
                success: true,
                originalImage: userPhotoBase64,
                styledImage: generateResult.data[0].url,
                styleName: styleName,
                method: 'gpt-image-1-generate',
                options: options
            };
        } else {
            throw new Error('GPT Image 1 API에서 유효한 결과를 받지 못했습니다');
        }
        
    } catch (error) {
        console.error('GPT Image 1 헤어스타일 변경 실패:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * GPT Image 1 Edit 모드용 프롬프트 (얼굴 보존 특화)
 */
function buildGPTImage1EditPrompt(styleName, options = {}) {
    let prompt = `Transform the hairstyle to "${styleName}" while preserving the person's face completely.
CRITICAL: Keep all facial features identical - eyes, nose, mouth, face shape, skin tone, glasses, expression.
Only change the hair style and color, everything else must remain exactly the same.`;
    
    if (options.colorMatch) {
        prompt += ' Choose hair color that complements the person\'s natural skin tone.';
    }
    
    prompt += ' Professional salon quality, realistic lighting, natural hair texture.';
    
    return prompt;
}

/**
 * GPT Image 1 Generate 모드용 고급 프롬프트
 */
function buildGPTImage1GeneratePrompt(styleName, options = {}) {
    let prompt = `Professional portrait photo of a person with "${styleName}" hairstyle.
High-quality salon photography with natural lighting.
Focus on realistic hair texture and professional styling.`;
    
    if (options.colorMatch) {
        prompt += ' Hair color that naturally complements skin tone.';
    }
    
    if (options.enhanceQuality) {
        prompt += ' Studio lighting, professional photography, crisp details, high resolution.';
    }
    
    prompt += ' Style: photorealistic, professional, clean, natural.';
    prompt += ' Avoid: artificial effects, cartoon-like features, distorted proportions.';
    
    return prompt;
}

/**
 * 헤어 영역 마스크 생성 (GPT Image 1 최적화)
 */
async function generateHairMask() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1024;
    canvas.height = 1024;
    
    // 투명한 배경
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 헤어 영역을 흰색으로 마스킹 (상단 35%)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.35);
    
    // 측면 헤어 영역 추가
    ctx.fillRect(0, canvas.height * 0.2, canvas.width * 0.25, canvas.height * 0.3);
    ctx.fillRect(canvas.width * 0.75, canvas.height * 0.2, canvas.width * 0.25, canvas.height * 0.3);
    
    // 부드러운 경계를 위한 그라데이션
    const gradient = ctx.createLinearGradient(0, canvas.height * 0.3, 0, canvas.height * 0.45);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height * 0.3, canvas.width, canvas.height * 0.15);
    
    return canvas.toDataURL('image/png');
}
