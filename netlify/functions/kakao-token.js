// Flutter 앱용 카카오 로그인 - Firebase Custom Token 발급 API
// 웹 OAuth 방식: authorization code - access token - Firebase Custom Token
const admin = require('firebase-admin');

function initializeFirebaseAdmin() {
    if (admin.apps.length) return admin.apps[0];
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase 환경변수 누락');
    return admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey: privateKey.replace(/\n/g, '\n') })
    });
}

async function exchangeKakaoCodeForToken(code, redirectUri) {
    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY || 'e085ad4b34b316bdd26d67bf620b2ec9';
    const params = new URLSearchParams({ grant_type: 'authorization_code', client_id: KAKAO_REST_API_KEY, redirect_uri: redirectUri, code: code });
    const response = await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
    if (!response.ok) { const errorText = await response.text(); console.error('Kakao token exchange failed:', errorText); throw new Error('카카오 토큰 교환 실패: ' + errorText); }
    return await response.json();
}

async function getKakaoUserInfo(accessToken) {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', { method: 'GET', headers: { 'Authorization': 'Bearer ' + accessToken } });
    if (!response.ok) { const errorText = await response.text(); console.error('Kakao user info failed:', errorText); throw new Error('카카오 사용자 정보 조회 실패'); }
    return await response.json();
}

/* eslint-disable no-unused-vars */
exports.handler = async (event, _context) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    try {
        const body = JSON.parse(event.body || '{}');
        const { code, redirectUri, kakaoId, email, nickname, profileImage } = body;
        let finalKakaoId, finalEmail, finalNickname, finalProfileImage;

        if (code && redirectUri) {
            console.log('웹 OAuth 방식 - authorization code 처리');
            const tokenData = await exchangeKakaoCodeForToken(code, redirectUri);
            console.log('카카오 토큰 교환 성공');
            const userInfo = await getKakaoUserInfo(tokenData.access_token);
            console.log('카카오 사용자 정보 조회 성공:', userInfo.id);
            finalKakaoId = userInfo.id;
            finalEmail = userInfo.kakao_account?.email || '';
            finalNickname = userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || '';
            finalProfileImage = userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image || '';
        } else if (kakaoId) {
            console.log('레거시 방식 - 직접 사용자 정보');
            finalKakaoId = kakaoId;
            finalEmail = email || '';
            finalNickname = nickname || '';
            finalProfileImage = profileImage || '';
        } else {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'authorization code 또는 kakaoId가 필요합니다.' }) };
        }

        console.log('Flutter 카카오 로그인 처리:', { kakaoId: finalKakaoId, email: finalEmail, nickname: finalNickname });
        initializeFirebaseAdmin();
        const firebaseUid = 'kakao_' + finalKakaoId;
        const additionalClaims = { provider: 'kakao', kakaoId: parseInt(finalKakaoId), email: finalEmail, displayName: finalNickname, photoURL: finalProfileImage };
        const customToken = await admin.auth().createCustomToken(firebaseUid, additionalClaims);
        console.log('Firebase Custom Token 생성 성공:', firebaseUid);

        const db = admin.firestore();
        const sanitizeEmail = (e) => e ? e.toLowerCase().replace(/@/g, '_').replace(/\./g, '_') : null;

        // 1. 먼저 kakaoId로 기존 사용자 검색 (이메일 없어도 매칭 가능)
        let existingUserRef = null;
        let existingUserDoc = null;

        const kakaoIdQuery = await db.collection('users')
            .where('kakaoId', '==', parseInt(finalKakaoId))
            .limit(1)
            .get();

        if (!kakaoIdQuery.empty) {
            existingUserRef = kakaoIdQuery.docs[0].ref;
            existingUserDoc = kakaoIdQuery.docs[0];
            console.log('기존 사용자 발견 (kakaoId 매칭):', existingUserRef.id);
        }

        // 2. kakaoId로 못 찾으면 이메일로 검색
        const emailDocId = sanitizeEmail(finalEmail);
        if (!existingUserRef && emailDocId) {
            const emailRef = db.collection('users').doc(emailDocId);
            const emailDoc = await emailRef.get();
            if (emailDoc.exists) {
                existingUserRef = emailRef;
                existingUserDoc = emailDoc;
                console.log('기존 사용자 발견 (이메일 매칭):', emailDocId);
            }
        }

        // 3. 기존 사용자 없으면 새 문서 ID 결정
        const userRef = existingUserRef || db.collection('users').doc(emailDocId || firebaseUid);
        const userDoc = existingUserDoc || await userRef.get();

        let bullnabiUserData = null;
        if (finalEmail) {
            try {
                const bullnabiDocId = 'bullnabi_' + finalEmail.replace(/[^a-zA-Z0-9]/g, '_');
                const bullnabiDoc = await db.collection('bullnabi_users').doc(bullnabiDocId).get();
                if (bullnabiDoc.exists) {
                    const data = bullnabiDoc.data();
                    bullnabiUserData = { bullnabiUserId: data.bullnabiUserId, tokenBalance: data.tokenBalance || 0, plan: data.plan || 'free', name: data.name || data.nickname || '' };
                    console.log('불나비 사용자 발견:', bullnabiUserData);
                }
            } catch (e) { console.log('불나비 마이그레이션 체크 실패:', e.message); }
        }

        // 기존 사용자가 있으면 displayName/photoURL 유지 (덮어쓰기 방지)
        const existingData = userDoc.exists ? userDoc.data() : {};
        const shouldUpdateName = !existingData.displayName || existingData.displayName === '사용자';
        const shouldUpdatePhoto = !existingData.photoURL;

        const userDataToSave = {
            email: finalEmail || existingData.email || '',
            primaryProvider: 'kakao',
            kakaoId: parseInt(finalKakaoId),
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
            lastProvider: 'kakao'
        };

        // displayName: 기존 값 없거나 '사용자'일 때만 업데이트
        if (shouldUpdateName && finalNickname) {
            userDataToSave.displayName = finalNickname;
        }
        // photoURL: 기존 값 없을 때만 업데이트
        if (shouldUpdatePhoto && finalProfileImage) {
            userDataToSave.photoURL = finalProfileImage;
        }

        console.log('저장할 데이터:', userDataToSave, '기존 displayName:', existingData.displayName);

        if (!userDoc.exists) {
            userDataToSave.createdAt = admin.firestore.FieldValue.serverTimestamp();
            userDataToSave.linkedProviders = { kakao: { uid: firebaseUid, kakaoId: parseInt(finalKakaoId), linkedAt: admin.firestore.FieldValue.serverTimestamp() } };
            if (bullnabiUserData) {
                userDataToSave.tokenBalance = bullnabiUserData.tokenBalance || 200;
                userDataToSave.plan = bullnabiUserData.plan || 'free';
                userDataToSave.name = bullnabiUserData.name || finalNickname;
                userDataToSave.migratedFromBullnabi = true;
                userDataToSave.bullnabiUserId = bullnabiUserData.bullnabiUserId;
            } else { userDataToSave.tokenBalance = 200; userDataToSave.plan = 'free'; }
            await userRef.set(userDataToSave);
            console.log('신규 사용자 생성:', emailDocId);
        } else {
            await userRef.update(userDataToSave);
            console.log('사용자 정보 업데이트:', emailDocId);
        }

        return { statusCode: 200, headers, body: JSON.stringify({ success: true, customToken: customToken, uid: firebaseUid, email: finalEmail }) };
    } catch (error) {
        console.error('카카오 토큰 처리 에러:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: '서버 오류가 발생했습니다.', message: error.message }) };
    }
};
