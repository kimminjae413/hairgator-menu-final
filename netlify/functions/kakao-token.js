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
        const { code, redirectUri, kakaoId, kakaoAccessToken, email, nickname, profileImage } = body;
        let finalKakaoId, finalEmail, finalNickname, finalProfileImage;

        if (code && redirectUri) {
            // 웹 OAuth 방식 - authorization code 처리
            console.log('웹 OAuth 방식 - authorization code 처리');
            const tokenData = await exchangeKakaoCodeForToken(code, redirectUri);
            console.log('카카오 토큰 교환 성공');
            const userInfo = await getKakaoUserInfo(tokenData.access_token);
            console.log('카카오 사용자 정보 조회 성공:', userInfo.id);
            finalKakaoId = userInfo.id;
            finalEmail = userInfo.kakao_account?.email || '';
            finalNickname = userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || '';
            finalProfileImage = userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image || '';
        } else if (kakaoAccessToken) {
            // 🔒 Flutter 앱 방식 - accessToken으로 카카오 API 검증
            console.log('Flutter 앱 방식 - accessToken 검증');
            const userInfo = await getKakaoUserInfo(kakaoAccessToken);
            console.log('✅ 카카오 accessToken 검증 성공:', userInfo.id);

            // 클라이언트가 보낸 kakaoId와 실제 사용자가 일치하는지 확인
            if (kakaoId && String(userInfo.id) !== String(kakaoId)) {
                console.error('❌ kakaoId 불일치! 요청:', kakaoId, '실제:', userInfo.id);
                return { statusCode: 401, headers, body: JSON.stringify({ error: '사용자 정보가 일치하지 않습니다.' }) };
            }

            finalKakaoId = userInfo.id;
            finalEmail = userInfo.kakao_account?.email || '';
            finalNickname = userInfo.kakao_account?.profile?.nickname || userInfo.properties?.nickname || '';
            finalProfileImage = userInfo.kakao_account?.profile?.profile_image_url || userInfo.properties?.profile_image || '';
        } else if (kakaoId) {
            // ❌ 레거시 방식 - 보안 위험으로 거부
            console.error('❌ 레거시 방식 거부 - accessToken 없이 kakaoId만 전달됨:', kakaoId);
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'kakaoAccessToken이 필요합니다.' }) };
        } else {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'authorization code 또는 kakaoAccessToken이 필요합니다.' }) };
        }

        console.log('Flutter 카카오 로그인 처리:', { kakaoId: finalKakaoId, email: finalEmail, nickname: finalNickname, profileImage: finalProfileImage || '없음' });

        // 이메일 필수 체크 - 이메일 없으면 회원가입 불가
        if (!finalEmail) {
            console.error('❌ 카카오 로그인 실패 - 이메일 동의 필요:', finalKakaoId);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: '이메일 제공 동의가 필요합니다. 카카오 계정 설정에서 이메일 제공을 허용해주세요.',
                    errorCode: 'EMAIL_REQUIRED'
                })
            };
        }

        initializeFirebaseAdmin();
        const firebaseUid = 'kakao_' + finalKakaoId;
        const additionalClaims = { provider: 'kakao', kakaoId: parseInt(finalKakaoId), email: finalEmail, displayName: finalNickname, photoURL: finalProfileImage };
        const customToken = await admin.auth().createCustomToken(firebaseUid, additionalClaims);
        console.log('Firebase Custom Token 생성 성공:', firebaseUid);

        const db = admin.firestore();
        const sanitizeEmail = (e) => e ? e.toLowerCase().replace(/@/g, '_').replace(/\./g, '_') : null;

        // 검색 순서: 이메일 → kakaoId (이메일 기반 문서 우선)
        let existingUserRef = null;
        let existingUserDoc = null;
        const kakaoIdNum = parseInt(finalKakaoId);
        const emailDocId = sanitizeEmail(finalEmail);

        console.log('[DEBUG] 검색 시작 - kakaoId:', kakaoIdNum, 'email:', finalEmail, 'emailDocId:', emailDocId);

        // 1. 이메일 문서 ID로 검색 (가장 신뢰할 수 있음)
        if (emailDocId) {
            const emailRef = db.collection('users').doc(emailDocId);
            const emailDoc = await emailRef.get();
            if (emailDoc.exists) {
                existingUserRef = emailRef;
                existingUserDoc = emailDoc;
                console.log('[DEBUG] 기존 사용자 발견 (이메일 문서ID):', emailDocId);
            }
        }

        // 2. 이메일 필드로 검색
        if (!existingUserRef && finalEmail) {
            const emailFieldQuery = await db.collection('users')
                .where('email', '==', finalEmail.toLowerCase())
                .limit(1)
                .get();
            if (!emailFieldQuery.empty) {
                existingUserRef = emailFieldQuery.docs[0].ref;
                existingUserDoc = emailFieldQuery.docs[0];
                console.log('[DEBUG] 기존 사용자 발견 (email 필드):', existingUserRef.id);
            }
        }

        // 3. kakaoId로 검색 (이메일 기반 문서 우선, kakao_ 문서도 포함)
        if (!existingUserRef) {
            const kakaoIdQuery = await db.collection('users')
                .where('kakaoId', '==', kakaoIdNum)
                .get();

            // 이메일 기반 문서 우선 선택, 없으면 kakao_ 문서라도 선택
            const nonKakaoDoc = kakaoIdQuery.docs.find(doc => !doc.id.startsWith('kakao_'));
            const kakaoDoc = kakaoIdQuery.docs.find(doc => doc.id.startsWith('kakao_'));

            if (nonKakaoDoc) {
                existingUserRef = nonKakaoDoc.ref;
                existingUserDoc = nonKakaoDoc;
                console.log('[DEBUG] 기존 사용자 발견 (kakaoId, 이메일 문서):', existingUserRef.id);
            } else if (kakaoDoc) {
                // kakao_ 레거시 문서 발견 - 이메일 기반으로 마이그레이션 필요
                existingUserRef = kakaoDoc.ref;
                existingUserDoc = kakaoDoc;
                console.log('[DEBUG] 기존 kakao_ 레거시 문서 발견:', existingUserRef.id, '→ 이메일 업데이트 예정');
            }
        }

        // 4. 기존 사용자 없으면 새 문서 ID 결정 (이메일 기반 우선)
        console.log('[DEBUG] existingUserRef:', existingUserRef ? existingUserRef.id : 'null', '| emailDocId:', emailDocId, '| firebaseUid:', firebaseUid);
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
        // photoURL: 카카오에서 받으면 항상 업데이트 (최신 프로필 반영)
        if (finalProfileImage) {
            // Mixed Content 경고 방지: http:// → https:// 변환
            const secureProfileImage = finalProfileImage.replace(/^http:\/\//i, 'https://');
            userDataToSave.photoURL = secureProfileImage;
            console.log('[DEBUG] photoURL 저장:', secureProfileImage.substring(0, 50) + '...');
        } else {
            console.log('[DEBUG] photoURL 없음 - 카카오에서 프로필 이미지 안 줌');
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
