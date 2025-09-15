async function processGPTHairStyleChange(userPhoto, styleImageUrl, styleName) {
    console.log('🎨 GPT Image 1 헤어스타일 변경 시작...');
    
    try {
        // 사용자 사진을 Base64로 변환
        const userPhotoBase64 = await fileToBase64(userPhoto);
        
        // 이미지 편집 대신 생성 모드 사용 (더 안정적)
        const prompt = buildHairStyleChangePrompt(styleName, styleImageUrl);
        
        // Netlify Function 호출 (생성 모드)
        const response = await fetch('/.netlify/functions/openai-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'generate',  // edit → generate로 변경
                prompt: prompt
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error.message || result.error);
        }
        
        if (result.data && result.data[0]) {
            return {
                success: true,
                originalImage: userPhotoBase64,
                styledImage: result.data[0].url,
                styleName: styleName,
                method: 'generate'  // edit → generate로 변경
            };
        } else {
            throw new Error('GPT Image 1 API에서 유효한 결과를 받지 못했습니다');
        }
        
    } catch (error) {
        console.error('GPT 헤어스타일 변경 실패:', error);
        throw error;
    }
}
