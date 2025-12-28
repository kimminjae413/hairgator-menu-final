// Flutter 앱용 카카오 로그인 → Firebase Custom Token 발급 API
const admin = require('firebase-admin');

// Firebase Admin 초기화 함수
function initializeFirebaseAdmin() {
    if (admin.apps.length) {
        return admin.apps[0];
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase 환경변수 누락');
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
    // CORS 헤더
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // OPTIONS 요청 처리
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // POST만 허용
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // 요청 본문 파싱
        const body = JSON.parse(event.body || '{}');
        const { kakaoAccessToken, kakaoId, email, nickname, profileImage } = body;

        console.log('Flutter 카카오 로그인 요청:', { kakaoId, email, nickname });

        if (!kakaoId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '카카오 ID가 필요합니다.' })
            };
        }

        // Firebase Admin 초기화
        initializeFirebaseAdmin();

        // Firebase Custom Token 생성
        const firebaseUid = 'kakao_' + kakaoId;

        const additionalClaims = {
            provider: 'kakao',
            kakaoId: parseInt(kakaoId),
            email: email || '',
            displayName: nickname || '',
            photoURL: profileImage || ''
        };

        const customToken = await admin.auth().createCustomToken(firebaseUid, additionalClaims);
        console.log('Firebase Custom Token 생성 성공:', firebaseUid);

        // Firestore에 사용자 정보 저장/업데이트
        const db = admin.firestore();
        const sanitizeEmail = function(e) {
            return e ? e.toLowerCase().replace(/@/g, '_').replace(/\./g, '_') : null;
        };
        const emailDocId = sanitizeEmail(email) || firebaseUid;

        const userRef = db.collection('users').doc(emailDocId);
        const userDoc = await userRef.get();

        // 불나비 사용자 마이그레이션 체크
        let bullnabiUserData = null;
        if (email) {
            try {
                const bullnabiDocId = 'bullnabi_' + email.replace(/[^a-zA-Z0-9]/g, '_');
                const bullnabiDoc = await db.collection('bullnabi_users').doc(bullnabiDocId).get();

                if (bullnabiDoc.exists) {
                    const data = bullnabiDoc.data();
                    bullnabiUserData = {
                        bullnabiUserId: data.bullnabiUserId,
                        tokenBalance: data.tokenBalance || 0,
                        plan: data.plan || 'free',
                        name: data.name || data.nickname || ''
                    };
                    console.log('불나비 사용자 발견:', bullnabiUserData);
                }
            } catch (e) {
                console.log('불나비 마이그레이션 체크 실패:', e.message);
            }
        }

        const userDataToSave = {
            email: email || '',
            displayName: nickname || '',
            photoURL: profileImage || '',
            primaryProvider: 'kakao',
            kakaoId: parseInt(kakaoId),
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
            lastProvider: 'kakao'
        };

        if (!userDoc.exists) {
            // 신규 사용자
            userDataToSave.createdAt = admin.firestore.FieldValue.serverTimestamp();
            userDataToSave.linkedProviders = {
                kakao: {
                    uid: firebaseUid,
                    kakaoId: parseInt(kakaoId),
                    linkedAt: admin.firestore.FieldValue.serverTimestamp()
                }
            };

            if (bullnabiUserData) {
                userDataToSave.tokenBalance = bullnabiUserData.tokenBalance || 200;
                userDataToSave.plan = bullnabiUserData.plan || 'free';
                userDataToSave.name = bullnabiUserData.name || nickname || '';
                userDataToSave.migratedFromBullnabi = true;
                userDataToSave.bullnabiUserId = bullnabiUserData.bullnabiUserId;
            } else {
                userDataToSave.tokenBalance = 200;
                userDataToSave.plan = 'free';
            }

            await userRef.set(userDataToSave);
            console.log('신규 사용자 생성:', emailDocId);
        } else {
            // 기존 사용자 업데이트
            await userRef.update(userDataToSave);
            console.log('사용자 정보 업데이트:', emailDocId);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                customToken: customToken,
                uid: firebaseUid,
                email: email || ''
            })
        };

    } catch (error) {
        console.error('카카오 토큰 처리 에러:', error.message);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: '서버 오류가 발생했습니다.',
                message: error.message
            })
        };
    }
};
