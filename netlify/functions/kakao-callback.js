// 카카오 OAuth 콜백 처리 → Firebase Custom Token 발급
const admin = require('firebase-admin');

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || 'e085ad4b34b316bdd26d67bf620b2ec9';
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET || ''; // 선택적

// Firebase Admin 초기화 함수
function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return admin.apps[0];
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('Firebase 환경변수 체크:', {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
        privateKeyLength: privateKey?.length || 0
    });

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(`Firebase 환경변수 누락: projectId=${!!projectId}, clientEmail=${!!clientEmail}, privateKey=${!!privateKey}`);
    }

    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n')
        })
    });
}

exports.handler = async (event, context) => {
    console.log('카카오 콜백 함수 시작');

    const { code, error, error_description } = event.queryStringParameters || {};

    // 에러 처리
    if (error) {
        console.error('카카오 OAuth 에러:', error, error_description);
        return {
            statusCode: 302,
            headers: {
                Location: `/login.html?error=${encodeURIComponent(error_description || error)}`
            }
        };
    }

    // 인가 코드 없음
    if (!code) {
        return {
            statusCode: 302,
            headers: {
                Location: '/login.html?error=no_code'
            }
        };
    }

    try {
        // Firebase Admin 초기화
        initializeFirebaseAdmin();
        console.log('Firebase Admin 초기화 성공');

        // 1. 인가 코드로 액세스 토큰 발급
        const REDIRECT_URI = `https://${event.headers.host}/.netlify/functions/kakao-callback`;

        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'authorization_code');
        tokenParams.append('client_id', KAKAO_REST_API_KEY);
        tokenParams.append('redirect_uri', REDIRECT_URI);
        tokenParams.append('code', code);
        if (KAKAO_CLIENT_SECRET) {
            tokenParams.append('client_secret', KAKAO_CLIENT_SECRET);
        }

        const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
            },
            body: tokenParams.toString()
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error('카카오 토큰 발급 에러:', tokenData);
            return {
                statusCode: 302,
                headers: {
                    Location: `/login.html?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`
                }
            };
        }

        const accessToken = tokenData.access_token;
        console.log('카카오 액세스 토큰 발급 성공');

        // 2. 사용자 정보 조회
        const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
            }
        });

        const userData = await userResponse.json();

        if (!userData.id) {
            console.error('카카오 사용자 정보 조회 실패:', userData);
            return {
                statusCode: 302,
                headers: {
                    Location: '/login.html?error=user_info_failed'
                }
            };
        }

        console.log('카카오 사용자 정보:', {
            id: userData.id,
            nickname: userData.properties?.nickname,
            email: userData.kakao_account?.email
        });

        // 3. Firebase Custom Token 생성
        // 카카오 ID를 Firebase UID로 사용 (접두사 추가)
        const firebaseUid = `kakao_${userData.id}`;

        // 추가 클레임 (Firestore에 저장할 정보)
        const additionalClaims = {
            provider: 'kakao',
            kakaoId: userData.id,
            email: userData.kakao_account?.email || '',
            displayName: userData.properties?.nickname || '',
            photoURL: userData.properties?.profile_image || ''
        };

        const customToken = await admin.auth().createCustomToken(firebaseUid, additionalClaims);
        console.log('Firebase Custom Token 생성 성공:', firebaseUid);

        // 4. Firestore에 사용자 정보 저장/업데이트
        const db = admin.firestore();
        const userRef = db.collection('users').doc(firebaseUid);
        const userDoc = await userRef.get();

        const userDataToSave = {
            uid: firebaseUid,
            email: userData.kakao_account?.email || '',
            displayName: userData.properties?.nickname || '',
            photoURL: userData.properties?.profile_image || '',
            provider: 'kakao',
            kakaoId: userData.id,
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (!userDoc.exists) {
            // 신규 사용자
            userDataToSave.tokenBalance = 200;
            userDataToSave.plan = 'free';
            userDataToSave.createdAt = admin.firestore.FieldValue.serverTimestamp();
            await userRef.set(userDataToSave);
            console.log('신규 카카오 사용자 생성:', firebaseUid);
        } else {
            // 기존 사용자 업데이트
            await userRef.update(userDataToSave);
            console.log('카카오 사용자 정보 업데이트:', firebaseUid);
        }

        // 5. 로그인 페이지로 리다이렉트 (토큰 전달)
        return {
            statusCode: 302,
            headers: {
                Location: `/login.html?token=${encodeURIComponent(customToken)}`
            }
        };

    } catch (error) {
        console.error('카카오 로그인 처리 에러:', error.message);
        console.error('에러 스택:', error.stack);

        // 개발 환경에서는 상세 에러 표시
        const errorMessage = process.env.NODE_ENV === 'development'
            ? error.message
            : '서버 오류가 발생했습니다.';

        return {
            statusCode: 302,
            headers: {
                Location: `/login.html?error=${encodeURIComponent(errorMessage)}`
            }
        };
    }
};
