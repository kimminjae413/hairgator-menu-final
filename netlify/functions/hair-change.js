// netlify/functions/hair-change.js
// HAIRGATOR Hair Change API (헤어체험)
//
// 외부 API를 통해 사용자 사진에 헤어스타일을 적용합니다.
// Vmodel이라는 명칭은 사용하지 않습니다.

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

exports.handler = async (event) => {
    // CORS preflight
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
        const {
            customerPhotoBase64,   // 고객 사진 (base64)
            styleImageUrl,         // 적용할 헤어스타일 이미지 URL
            gender = 'female'      // 성별
        } = JSON.parse(event.body);

        if (!customerPhotoBase64) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'customerPhotoBase64 is required' })
            };
        }

        if (!styleImageUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'styleImageUrl is required' })
            };
        }

        // API 키 확인
        const API_KEY = process.env.VMODEL_API_KEY;
        if (!API_KEY) {
            throw new Error('Hair change API key not configured');
        }

        console.log('💇 헤어체험 API 호출 시작');
        console.log('📋 성별:', gender);
        console.log('📋 스타일 이미지:', styleImageUrl);

        // base64 데이터에서 헤더 제거 (있는 경우)
        let cleanBase64 = customerPhotoBase64;
        if (customerPhotoBase64.includes(',')) {
            cleanBase64 = customerPhotoBase64.split(',')[1];
        }

        // 외부 헤어 체인지 API 호출
        const result = await callHairChangeAPI(cleanBase64, styleImageUrl, gender, API_KEY);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                resultImageUrl: result.resultImageUrl,
                message: 'Hair change completed successfully'
            })
        };

    } catch (error) {
        console.error('💇 헤어체험 API 오류:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Hair change failed',
                message: error.message
            })
        };
    }
};

/**
 * 외부 헤어 체인지 API 호출
 * @param {string} customerPhotoBase64 - 고객 사진 (base64, 헤더 제거됨)
 * @param {string} styleImageUrl - 적용할 헤어스타일 이미지 URL
 * @param {string} gender - 성별 (male/female)
 * @param {string} apiKey - API 키
 * @returns {Object} - { resultImageUrl: string }
 */
async function callHairChangeAPI(customerPhotoBase64, styleImageUrl, gender, apiKey) {
    // Vmodel Hair Change API 호출
    // API 문서: https://docs.vmodel.ai/api-reference/hair-change

    const apiUrl = 'https://developer.vmodel.ai/api/model/hair-change';

    const requestBody = {
        face_image: customerPhotoBase64,      // 고객 얼굴 사진 (base64)
        hair_image_url: styleImageUrl,         // 헤어스타일 이미지 URL
        gender: gender === 'male' ? 'man' : 'woman'  // Vmodel API는 man/woman 사용
    };

    console.log('📤 헤어체험 API 요청 전송...');

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API 오류 응답:', response.status, errorText);
        throw new Error(`Hair change API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📥 헤어체험 API 응답:', JSON.stringify(result).substring(0, 200) + '...');

    // API 응답에서 결과 이미지 URL 추출
    // Vmodel API 응답 형식에 따라 조정 필요
    if (result.result && result.result.output_image_url) {
        return {
            resultImageUrl: result.result.output_image_url
        };
    } else if (result.output_image_url) {
        return {
            resultImageUrl: result.output_image_url
        };
    } else if (result.data && result.data.output_image_url) {
        return {
            resultImageUrl: result.data.output_image_url
        };
    } else {
        console.error('예상치 못한 API 응답 형식:', result);
        throw new Error('Unexpected API response format');
    }
}
