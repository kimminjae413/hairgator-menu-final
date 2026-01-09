// 어드민 통합 API - Firestore 접근을 서버에서만 처리
const admin = require('firebase-admin');

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
    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    switch (action) {
      // ==================== 사용자 관리 ====================
      case 'getUsers':
        return await getUsers(body, headers);
      case 'getUserDetail':
        return await getUserDetail(body, headers);
      case 'updateUserTokens':
        return await updateUserTokens(body, headers);
      case 'updateUserPlan':
        return await updateUserPlan(body, headers);
      case 'deleteUser':
        return await deleteUser(body, headers);

      // ==================== 결제 관리 ====================
      case 'getPayments':
        return await getPayments(body, headers);
      case 'getPaymentDetail':
        return await getPaymentDetail(body, headers);

      // ==================== 대시보드 ====================
      case 'getDashboardStats':
        return await getDashboardStats(body, headers);
      case 'getUsageStats':
        return await getUsageStats(body, headers);
      case 'getDailyUsageChart':
        return await getDailyUsageChart(body, headers);
      case 'getActivityLogs':
        return await getActivityLogs(body, headers);

      // ==================== 공지사항 관리 ====================
      case 'getNotices':
        return await getNotices(body, headers);
      case 'saveNotice':
        return await saveNotice(body, headers);
      case 'deleteNotice':
        return await deleteNotice(body, headers);

      // ==================== 문의 관리 ====================
      case 'getInquiries':
        return await getInquiries(body, headers);
      case 'replyInquiry':
        return await replyInquiry(body, headers);
      case 'markInquiryRead':
        return await markInquiryRead(body, headers);

      // ==================== 스타일 관리 ====================
      case 'getStyles':
        return await getStyles(body, headers);
      case 'saveStyle':
        return await saveStyle(body, headers);
      case 'deleteStyle':
        return await deleteStyle(body, headers);

      // ==================== 앱 설정 ====================
      case 'getAppConfig':
        return await getAppConfig(body, headers);
      case 'saveAppConfig':
        return await saveAppConfig(body, headers);

      // ==================== 법적 문서 ====================
      case 'getLegalDocs':
        return await getLegalDocs(body, headers);
      case 'saveLegalDoc':
        return await saveLegalDoc(body, headers);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `알 수 없는 action: ${action}` })
        };
    }
  } catch (error) {
    console.error('admin-api 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// ==================== 사용자 관리 ====================

async function getUsers(body, headers) {
  const { source, limit = 100 } = body;

  let users = [];

  // Firebase users
  if (!source || source === 'firebase') {
    const firebaseSnapshot = await db.collection('users')
      .orderBy('lastLoginAt', 'desc')
      .limit(limit)
      .get();

    firebaseSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        source: 'firebase',
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString() || null,
        planExpiresAt: doc.data().planExpiresAt?.toDate?.()?.toISOString() || null
      });
    });
  }

  // Bullnabi users
  if (!source || source === 'bullnabi') {
    const bullnabiSnapshot = await db.collection('bullnabi_users')
      .orderBy('lastLoginAt', 'desc')
      .limit(limit)
      .get();

    bullnabiSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        source: 'bullnabi',
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        lastLoginAt: doc.data().lastLoginAt?.toDate?.()?.toISOString() || null
      });
    });
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      users,
      firebaseCount: users.filter(u => u.source === 'firebase').length,
      bullnabiCount: users.filter(u => u.source === 'bullnabi').length
    })
  };
}

async function getUserDetail(body, headers) {
  const { userId, source = 'firebase' } = body;

  if (!userId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId 필요' }) };
  }

  const collection = source === 'bullnabi' ? 'bullnabi_users' : 'users';
  const doc = await db.collection(collection).doc(userId).get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '사용자를 찾을 수 없습니다' }) };
  }

  const data = doc.data();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      user: {
        id: doc.id,
        source,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || null,
        planExpiresAt: data.planExpiresAt?.toDate?.()?.toISOString() || null
      }
    })
  };
}

async function updateUserTokens(body, headers) {
  const { userId, amount, type, reason } = body;

  if (!userId || amount === undefined) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId와 amount 필요' }) };
  }

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '사용자를 찾을 수 없습니다' }) };
  }

  const currentTokens = userDoc.data().tokenBalance || 0;
  const newTokens = type === 'add'
    ? currentTokens + parseInt(amount)
    : Math.max(0, currentTokens - parseInt(amount));

  await userRef.update({
    tokenBalance: newTokens,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // 로그 기록
  await db.collection('credit_logs').add({
    userId,
    action: type === 'add' ? 'admin_charge' : 'admin_deduct',
    amount: parseInt(amount),
    previousBalance: currentTokens,
    newBalance: newTokens,
    reason: reason || '관리자 조정',
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      previousTokens: currentTokens,
      newTokens
    })
  };
}

async function updateUserPlan(body, headers) {
  const { userId, plan, expiresAt } = body;

  if (!userId || !plan) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId와 plan 필요' }) };
  }

  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '사용자를 찾을 수 없습니다' }) };
  }

  const updateData = {
    plan,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (expiresAt) {
    updateData.planExpiresAt = admin.firestore.Timestamp.fromDate(new Date(expiresAt));
  } else if (plan !== 'free') {
    // 30일 후 만료
    updateData.planExpiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
  } else {
    updateData.planExpiresAt = null;
  }

  await userRef.update(updateData);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, plan, expiresAt: updateData.planExpiresAt })
  };
}

async function deleteUser(body, headers) {
  const { userId, source = 'firebase' } = body;

  if (!userId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId 필요' }) };
  }

  const collection = source === 'bullnabi' ? 'bullnabi_users' : 'users';
  await db.collection(collection).doc(userId).delete();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: '사용자가 삭제되었습니다' })
  };
}

// ==================== 결제 관리 ====================

async function getPayments(body, headers) {
  const { limit = 200 } = body;

  const snapshot = await db.collection('payments')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const payments = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    cancelledAt: doc.data().cancelledAt?.toDate?.()?.toISOString() || null
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, payments })
  };
}

async function getPaymentDetail(body, headers) {
  const { paymentId } = body;

  if (!paymentId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'paymentId 필요' }) };
  }

  const doc = await db.collection('payments').doc(paymentId).get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '결제를 찾을 수 없습니다' }) };
  }

  const data = doc.data();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      payment: {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null
      }
    })
  };
}

// ==================== 대시보드 ====================

async function getDashboardStats(body, headers) {
  // 오늘 시작 시간
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 사용자 조회
  const usersSnapshot = await db.collection('users').get();
  const bullnabiSnapshot = await db.collection('bullnabi_users').get();

  const firebaseUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'firebase' }));
  const bullnabiUsersData = bullnabiSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'bullnabi' }));

  // 이메일 기준 중복 제거 (firebase 우선)
  const firebaseEmails = new Set(firebaseUsers.map(u => u.email?.toLowerCase()).filter(Boolean));
  const uniqueBullnabi = bullnabiUsersData.filter(u => !firebaseEmails.has(u.email?.toLowerCase()));
  const allUsers = [...firebaseUsers, ...uniqueBullnabi];

  // 통계 계산
  const totalUsers = allUsers.length;
  const paidUsers = allUsers.filter(u => u.plan && u.plan !== 'free').length;
  const totalTokens = allUsers.reduce((sum, u) => sum + (u.tokenBalance || 0), 0);

  // 오늘 가입자/활성 사용자
  const todayNewUsers = firebaseUsers.filter(u => {
    if (!u.createdAt) return false;
    const date = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
    return date >= todayStart;
  }).length;

  const todayActive = firebaseUsers.filter(u => {
    if (!u.lastLoginAt) return false;
    const date = u.lastLoginAt?.toDate ? u.lastLoginAt.toDate() : new Date(u.lastLoginAt);
    return date >= todayStart;
  }).length;

  // 플랜 분포
  const planCounts = {
    free: allUsers.filter(u => !u.plan || u.plan === 'free').length,
    basic: allUsers.filter(u => u.plan === 'basic').length,
    pro: allUsers.filter(u => u.plan === 'pro').length,
    business: allUsers.filter(u => u.plan === 'business').length
  };

  // 결제 조회
  const paymentsSnapshot = await db.collection('payments')
    .where('status', 'in', ['completed', 'paid'])
    .get();

  let todayRevenue = 0;
  let totalRevenue = 0;

  paymentsSnapshot.forEach(doc => {
    const data = doc.data();
    const amount = data.amount || 0;
    totalRevenue += amount;

    const createdAt = data.createdAt?.toDate?.();
    if (createdAt && createdAt >= todayStart) {
      todayRevenue += amount;
    }
  });

  // 읽지 않은 문의
  const unreadInquiries = await db.collection('inquiries')
    .where('adminRead', '==', false)
    .get();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      stats: {
        totalUsers,
        bullnabiUsers: bullnabiSnapshot.size,
        paidUsers,
        totalTokens,
        todayNewUsers,
        todayActive,
        planCounts,
        todayRevenue,
        totalRevenue,
        totalPayments: paymentsSnapshot.size,
        unreadInquiries: unreadInquiries.size
      }
    })
  };
}

// 기간별 사용 통계
async function getUsageStats(body, headers) {
  const { period = 'day' } = body;

  // 기간에 따른 시작 날짜 계산
  const now = new Date();
  let startDate;
  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'day':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
  }

  // credit_logs에서 기간 내 로그 조회
  const logsSnapshot = await db.collection('credit_logs')
    .where('timestamp', '>=', startDate)
    .get();

  const logs = logsSnapshot.docs.map(doc => doc.data());

  const chatbotCount = logs.filter(l => l.action === 'chatbot').length;
  const lookbookCount = logs.filter(l => l.action === 'lookbook').length;
  const hairTryCount = logs.filter(l => l.action === 'hairTry').length;
  const totalUsed = logs.reduce((sum, l) => sum + (l.creditsUsed || 0), 0);

  // 신규 가입자 수
  const usersSnapshot = await db.collection('users')
    .where('createdAt', '>=', startDate)
    .get();
  const newUsersCount = usersSnapshot.size;

  // 접속자 수
  const activeUsersSnapshot = await db.collection('users')
    .where('lastLoginAt', '>=', startDate)
    .get();
  const activeUsersCount = activeUsersSnapshot.size;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      stats: {
        chatbotCount,
        lookbookCount,
        hairTryCount,
        totalUsed,
        newUsersCount,
        activeUsersCount,
        period
      }
    })
  };
}

// 일별 사용량 차트 데이터 (14일)
async function getDailyUsageChart(body, headers) {
  const { days = 14 } = body;

  // 시작 날짜 설정
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  // credit_logs에서 최근 데이터 조회
  const logsSnapshot = await db.collection('credit_logs')
    .where('timestamp', '>=', startDate)
    .orderBy('timestamp', 'asc')
    .get();

  // 일별 데이터 초기화
  const dailyData = {};
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = {
      users: new Set(),
      count: 0
    };
  }

  // 로그 데이터 집계
  logsSnapshot.forEach(doc => {
    const log = doc.data();
    if (log.timestamp) {
      const logDate = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
      const dateKey = logDate.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].count++;
        if (log.userId) {
          dailyData[dateKey].users.add(log.userId);
        }
      }
    }
  });

  // 응답 데이터 생성
  const labels = [];
  const uniqueUsersData = [];
  const usageCountData = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateKey = date.toISOString().split('T')[0];

    labels.push(date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }));
    uniqueUsersData.push(dailyData[dateKey]?.users.size || 0);
    usageCountData.push(dailyData[dateKey]?.count || 0);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        labels,
        uniqueUsersData,
        usageCountData
      }
    })
  };
}

async function getActivityLogs(body, headers) {
  const { userId, action, limit = 100 } = body;

  let query = db.collection('credit_logs').orderBy('timestamp', 'desc').limit(limit);

  // userId 필터 (복합 인덱스 필요)
  if (userId) {
    query = db.collection('credit_logs')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit);
  }

  const snapshot = await query.get();
  let logs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || null
  }));

  // action 필터 (클라이언트 사이드 필터링)
  if (action) {
    logs = logs.filter(l => l.action === action);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, logs })
  };
}

// ==================== 공지사항 관리 ====================

async function getNotices(body, headers) {
  const snapshot = await db.collection('notices')
    .orderBy('createdAt', 'desc')
    .get();

  const notices = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, notices })
  };
}

async function saveNotice(body, headers) {
  const { noticeId, title, content, isPinned, isActive, imageUrl, translations } = body;

  if (!title || !content) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'title과 content 필요' }) };
  }

  const noticeData = {
    title,
    content,
    isPinned: isPinned || false,
    isActive: isActive !== false,
    imageUrl: imageUrl || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  // 다국어 필드
  if (translations) {
    Object.keys(translations).forEach(lang => {
      noticeData[`title_${lang}`] = translations[lang].title || title;
      noticeData[`content_${lang}`] = translations[lang].content || content;
    });
  }

  if (noticeId) {
    // 수정
    await db.collection('notices').doc(noticeId).update(noticeData);
  } else {
    // 생성
    noticeData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    noticeData.viewCount = 0;
    await db.collection('notices').add(noticeData);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

async function deleteNotice(body, headers) {
  const { noticeId } = body;

  if (!noticeId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'noticeId 필요' }) };
  }

  await db.collection('notices').doc(noticeId).delete();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

// ==================== 문의 관리 ====================

async function getInquiries(body, headers) {
  const { limit = 100 } = body;

  const snapshot = await db.collection('inquiries')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  const inquiries = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      replies: (data.replies || []).map(r => ({
        ...r,
        createdAt: r.createdAt?.toDate?.()?.toISOString() || null
      }))
    };
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, inquiries })
  };
}

async function replyInquiry(body, headers) {
  const { inquiryId, message } = body;

  if (!inquiryId || !message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'inquiryId와 message 필요' }) };
  }

  const inquiryRef = db.collection('inquiries').doc(inquiryId);
  const inquiryDoc = await inquiryRef.get();

  if (!inquiryDoc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '문의를 찾을 수 없습니다' }) };
  }

  const currentReplies = inquiryDoc.data().replies || [];

  await inquiryRef.update({
    status: 'answered',
    userRead: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    replies: [...currentReplies, {
      from: 'admin',
      message,
      createdAt: admin.firestore.Timestamp.now()
    }]
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

async function markInquiryRead(body, headers) {
  const { inquiryId } = body;

  if (!inquiryId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'inquiryId 필요' }) };
  }

  await db.collection('inquiries').doc(inquiryId).update({
    adminRead: true
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

// ==================== 스타일 관리 ====================

async function getStyles(body, headers) {
  const { gender, limit = 100 } = body;

  let query = db.collection('styles');

  if (gender) {
    query = query.where('gender', '==', gender);
  }

  const snapshot = await query.limit(limit).get();

  const styles = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, styles })
  };
}

async function saveStyle(body, headers) {
  const { styleId, data } = body;

  if (!data) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'data 필요' }) };
  }

  if (styleId) {
    await db.collection('styles').doc(styleId).update(data);
  } else {
    await db.collection('styles').add(data);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

async function deleteStyle(body, headers) {
  const { styleId } = body;

  if (!styleId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'styleId 필요' }) };
  }

  await db.collection('styles').doc(styleId).delete();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

// ==================== 앱 설정 ====================

async function getAppConfig(body, headers) {
  const { configId } = body;

  if (configId) {
    const doc = await db.collection('app_config').doc(configId).get();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        config: doc.exists ? { id: doc.id, ...doc.data() } : null
      })
    };
  }

  const snapshot = await db.collection('app_config').get();
  const configs = {};
  snapshot.forEach(doc => {
    configs[doc.id] = doc.data();
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, configs })
  };
}

async function saveAppConfig(body, headers) {
  const { configId, data } = body;

  if (!configId || !data) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'configId와 data 필요' }) };
  }

  await db.collection('app_config').doc(configId).set(data, { merge: true });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

// ==================== 법적 문서 ====================

async function getLegalDocs(body, headers) {
  const snapshot = await db.collection('legal_documents').get();
  const docs = {};
  snapshot.forEach(doc => {
    docs[doc.id] = {
      ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    };
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, docs })
  };
}

async function saveLegalDoc(body, headers) {
  const { docType, content } = body;

  if (!docType || !content) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'docType과 content 필요' }) };
  }

  await db.collection('legal_documents').doc(docType).set({
    content,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}
