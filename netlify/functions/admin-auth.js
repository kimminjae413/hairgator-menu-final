// 관리자 인증 API (bcrypt 사용)
// 클라이언트에서 직접 Firestore 접근 대신 이 API를 통해 인증

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

// Firebase Admin 초기화
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  } catch (error) {
    console.error('Firebase Admin 초기화 실패:', error.message);
  }
}

const db = admin.firestore();
const SALT_ROUNDS = 10;

// 기존 simpleHash 함수 (마이그레이션용)
function legacySimpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { action, email, password, name, currentPassword, newPassword } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'login':
        return await handleLogin(email, password, headers);

      case 'register':
        return await handleRegister(email, password, name, headers);

      case 'changePassword':
        return await handleChangePassword(email, currentPassword, newPassword, headers);

      case 'delete':
        return await handleDelete(email, headers);

      case 'list':
        return await handleList(headers);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: '유효하지 않은 action입니다.' })
        };
    }
  } catch (error) {
    console.error('admin-auth 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '서버 오류가 발생했습니다.' })
    };
  }
};

// 로그인 처리
async function handleLogin(email, password, headers) {
  if (!email || !password) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '이메일과 비밀번호를 입력해주세요.' })
    };
  }

  const docId = email.replace(/[@.]/g, '_');
  const adminDoc = await db.collection('admin_users').doc(docId).get();

  if (!adminDoc.exists) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: '등록되지 않은 관리자입니다.' })
    };
  }

  const adminData = adminDoc.data();
  let isValidPassword = false;

  // 1. bcrypt 해시로 먼저 확인
  if (adminData.passwordHash) {
    isValidPassword = await bcrypt.compare(password, adminData.passwordHash);
  }

  // 2. 레거시 simpleHash로 확인 (마이그레이션)
  if (!isValidPassword && adminData.password) {
    const legacyHash = legacySimpleHash(password);
    if (adminData.password === legacyHash) {
      isValidPassword = true;

      // 마이그레이션: bcrypt 해시로 업데이트
      console.log(`[admin-auth] 비밀번호 마이그레이션: ${email}`);
      const newHash = await bcrypt.hash(password, SALT_ROUNDS);
      await db.collection('admin_users').doc(docId).update({
        passwordHash: newHash,
        password: admin.firestore.FieldValue.delete(), // 레거시 필드 삭제
        migratedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }

  if (!isValidPassword) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: '비밀번호가 일치하지 않습니다.' })
    };
  }

  // 로그인 성공 - 세션 토큰 생성
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간

  await db.collection('admin_users').doc(docId).update({
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
    sessionToken: sessionToken,
    sessionExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt)
  });

  console.log(`[admin-auth] 로그인 성공: ${email}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      admin: {
        email: adminData.email,
        name: adminData.name || '관리자'
      },
      sessionToken: sessionToken
    })
  };
}

// 관리자 등록
async function handleRegister(email, password, name, headers) {
  if (!email || !password) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '이메일과 비밀번호를 입력해주세요.' })
    };
  }

  // 비밀번호 정책: 숫자 6자리
  if (!/^\d{6}$/.test(password)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '비밀번호는 숫자 6자리여야 합니다.' })
    };
  }

  const docId = email.replace(/[@.]/g, '_');
  const existingDoc = await db.collection('admin_users').doc(docId).get();

  if (existingDoc.exists) {
    return {
      statusCode: 409,
      headers,
      body: JSON.stringify({ error: '이미 등록된 관리자입니다.' })
    };
  }

  // bcrypt로 해시
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await db.collection('admin_users').doc(docId).set({
    email: email,
    name: name || '관리자',
    passwordHash: passwordHash,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`[admin-auth] 관리자 등록: ${email}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: '관리자가 등록되었습니다.' })
  };
}

// 비밀번호 변경
async function handleChangePassword(email, currentPassword, newPassword, headers) {
  if (!email || !currentPassword || !newPassword) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '모든 필드를 입력해주세요.' })
    };
  }

  if (!/^\d{6}$/.test(newPassword)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '새 비밀번호는 숫자 6자리여야 합니다.' })
    };
  }

  const docId = email.replace(/[@.]/g, '_');
  const adminDoc = await db.collection('admin_users').doc(docId).get();

  if (!adminDoc.exists) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: '관리자를 찾을 수 없습니다.' })
    };
  }

  const adminData = adminDoc.data();
  let isValidPassword = false;

  // 현재 비밀번호 확인
  if (adminData.passwordHash) {
    isValidPassword = await bcrypt.compare(currentPassword, adminData.passwordHash);
  } else if (adminData.password) {
    isValidPassword = adminData.password === legacySimpleHash(currentPassword);
  }

  if (!isValidPassword) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: '현재 비밀번호가 일치하지 않습니다.' })
    };
  }

  // 새 비밀번호로 업데이트
  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.collection('admin_users').doc(docId).update({
    passwordHash: newHash,
    password: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`[admin-auth] 비밀번호 변경: ${email}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: '비밀번호가 변경되었습니다.' })
  };
}

// 관리자 삭제
async function handleDelete(email, headers) {
  if (!email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '이메일을 입력해주세요.' })
    };
  }

  const docId = email.replace(/[@.]/g, '_');
  const adminDoc = await db.collection('admin_users').doc(docId).get();

  if (!adminDoc.exists) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: '관리자를 찾을 수 없습니다.' })
    };
  }

  await db.collection('admin_users').doc(docId).delete();

  console.log(`[admin-auth] 관리자 삭제: ${email}`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: '관리자가 삭제되었습니다.' })
  };
}

// 관리자 목록
async function handleList(headers) {
  const snapshot = await db.collection('admin_users').get();

  const admins = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      docId: doc.id,
      email: data.email,
      name: data.name || '관리자',
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || null
    };
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, admins })
  };
}

// 세션 토큰 생성
function generateSessionToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
