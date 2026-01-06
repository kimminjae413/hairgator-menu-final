// Flutter 앱용 카카오 OAuth 콜백 핸들러
// 카카오에서 받은 authorization code를 앱 커스텀 스킴으로 리다이렉트

/* eslint-disable no-unused-vars */
exports.handler = async (event, _context) => {
    const { code, error, error_description } = event.queryStringParameters || {};

    console.log('카카오 모바일 OAuth 콜백:', { code: code ? '있음' : '없음', error });

    // 에러 발생 시 앱으로 에러 전달
    if (error) {
        console.error('카카오 OAuth 에러:', error, error_description);
        const errorRedirect = `hairgator://oauth?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}`;
        return {
            statusCode: 302,
            headers: {
                'Location': errorRedirect,
                'Cache-Control': 'no-cache'
            },
            body: ''
        };
    }

    // authorization code가 없는 경우
    if (!code) {
        console.error('카카오 OAuth: authorization code 없음');
        const errorRedirect = 'hairgator://oauth?error=no_code&error_description=Authorization%20code%20not%20received';
        return {
            statusCode: 302,
            headers: {
                'Location': errorRedirect,
                'Cache-Control': 'no-cache'
            },
            body: ''
        };
    }

    // 성공: 앱 커스텀 스킴으로 authorization code 전달
    const successRedirect = `hairgator://oauth?code=${encodeURIComponent(code)}`;
    console.log('앱으로 리다이렉트:', successRedirect);

    return {
        statusCode: 302,
        headers: {
            'Location': successRedirect,
            'Cache-Control': 'no-cache'
        },
        body: ''
    };
};
