// 세미나 관리 API (어드민용)
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
      // ==================== 세미나 관리 ====================
      case 'getSeminars':
        return await getSeminars(body, headers);
      case 'getSeminar':
        return await getSeminar(body, headers);
      case 'createSeminar':
        return await createSeminar(body, headers);
      case 'updateSeminar':
        return await updateSeminar(body, headers);
      case 'deleteSeminar':
        return await deleteSeminar(body, headers);

      // ==================== 등록자 관리 ====================
      case 'getRegistrations':
        return await getRegistrations(body, headers);
      case 'getRegistration':
        return await getRegistration(body, headers);
      case 'processRefund':
        return await processRefund(body, headers);
      case 'exportRegistrations':
        return await exportRegistrations(body, headers);

      // ==================== 통계 ====================
      case 'getSeminarStats':
        return await getSeminarStats(body, headers);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `알 수 없는 action: ${action}` })
        };
    }
  } catch (error) {
    console.error('seminar-api 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// ==================== 세미나 관리 ====================

async function getSeminars(body, headers) {
  const { status, limit = 50 } = body;

  // 복합 인덱스 없이 쿼리하기 위해 조건부로 처리
  let query = db.collection('seminars');

  if (status) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.limit(limit).get();

  let seminars = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date?.toDate?.()?.toISOString() || null,
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
  }));

  // JavaScript에서 날짜순 정렬 (내림차순)
  seminars.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, seminars })
  };
}

async function getSeminar(body, headers) {
  const { seminarId } = body;

  if (!seminarId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'seminarId 필요' }) };
  }

  const doc = await db.collection('seminars').doc(seminarId).get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '세미나를 찾을 수 없습니다' }) };
  }

  const data = doc.data();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      seminar: {
        id: doc.id,
        ...data,
        date: data.date?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
      }
    })
  };
}

async function createSeminar(body, headers) {
  const { title, description, date, time, location, locationDetail, price, capacity } = body;

  if (!title || !date || !price || !capacity) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '필수 필드 누락 (title, date, price, capacity)' }) };
  }

  const seminarData = {
    title,
    description: description || '',
    date: admin.firestore.Timestamp.fromDate(new Date(date)),
    time: time || '',
    location: location || '',
    locationDetail: locationDetail || '',
    price: parseInt(price),
    capacity: parseInt(capacity),
    currentCount: 0,
    status: 'draft',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection('seminars').add(seminarData);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, seminarId: docRef.id })
  };
}

async function updateSeminar(body, headers) {
  const { seminarId, ...updateData } = body;

  if (!seminarId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'seminarId 필요' }) };
  }

  // action 필드 제거
  delete updateData.action;

  // date 필드 변환
  if (updateData.date) {
    updateData.date = admin.firestore.Timestamp.fromDate(new Date(updateData.date));
  }

  // 숫자 필드 변환
  if (updateData.price) updateData.price = parseInt(updateData.price);
  if (updateData.capacity) updateData.capacity = parseInt(updateData.capacity);

  updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection('seminars').doc(seminarId).update(updateData);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

async function deleteSeminar(body, headers) {
  const { seminarId } = body;

  if (!seminarId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'seminarId 필요' }) };
  }

  // 등록자가 있는지 확인
  const registrations = await db.collection('seminar_registrations')
    .where('seminarId', '==', seminarId)
    .where('paymentStatus', '==', 'paid')
    .get();

  if (!registrations.empty) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '결제 완료된 등록자가 있어 삭제할 수 없습니다. 먼저 환불 처리해주세요.' })
    };
  }

  // pending 상태 등록자 삭제
  const pendingRegistrations = await db.collection('seminar_registrations')
    .where('seminarId', '==', seminarId)
    .get();

  const batch = db.batch();
  pendingRegistrations.forEach(doc => {
    batch.delete(doc.ref);
  });

  // 세미나 삭제
  batch.delete(db.collection('seminars').doc(seminarId));
  await batch.commit();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

// ==================== 등록자 관리 ====================

async function getRegistrations(body, headers) {
  const { seminarId, paymentStatus, limit = 200 } = body;

  if (!seminarId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'seminarId 필요' }) };
  }

  let query = db.collection('seminar_registrations')
    .where('seminarId', '==', seminarId)
    .orderBy('createdAt', 'desc');

  if (paymentStatus) {
    query = db.collection('seminar_registrations')
      .where('seminarId', '==', seminarId)
      .where('paymentStatus', '==', paymentStatus)
      .orderBy('createdAt', 'desc');
  }

  const snapshot = await query.limit(limit).get();

  const registrations = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
      refundedAt: data.refundedAt?.toDate?.()?.toISOString() || null,
      virtualAccount: data.virtualAccount ? {
        ...data.virtualAccount,
        dueDate: data.virtualAccount.dueDate?.toDate?.()?.toISOString() || null
      } : null
    };
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, registrations })
  };
}

async function getRegistration(body, headers) {
  const { registrationId } = body;

  if (!registrationId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'registrationId 필요' }) };
  }

  const doc = await db.collection('seminar_registrations').doc(registrationId).get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '등록 정보를 찾을 수 없습니다' }) };
  }

  const data = doc.data();
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      registration: {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
        refundedAt: data.refundedAt?.toDate?.()?.toISOString() || null
      }
    })
  };
}

async function processRefund(body, headers) {
  const { registrationId, refundReason } = body;

  if (!registrationId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'registrationId 필요' }) };
  }

  const registrationRef = db.collection('seminar_registrations').doc(registrationId);
  const registrationDoc = await registrationRef.get();

  if (!registrationDoc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '등록 정보를 찾을 수 없습니다' }) };
  }

  const registration = registrationDoc.data();

  if (registration.paymentStatus !== 'paid') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '결제 완료 상태만 환불 가능합니다' }) };
  }

  // 포트원 환불 처리 (카드 결제인 경우)
  if (registration.paymentMethod === 'card' && registration.paymentId) {
    const refundResult = await refundWithPortone(registration.paymentId, registration.paidAmount, refundReason);
    if (!refundResult.success) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: refundResult.error || '포트원 환불 처리 실패' })
      };
    }
  }

  // Firestore 트랜잭션으로 환불 처리
  await db.runTransaction(async (transaction) => {
    const seminarRef = db.collection('seminars').doc(registration.seminarId);
    const seminarDoc = await transaction.get(seminarRef);

    if (seminarDoc.exists) {
      const currentCount = seminarDoc.data().currentCount || 0;
      transaction.update(seminarRef, {
        currentCount: Math.max(0, currentCount - 1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    transaction.update(registrationRef, {
      paymentStatus: 'refunded',
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundReason: refundReason || '관리자 환불 처리'
    });
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: '환불 처리가 완료되었습니다' })
  };
}

// 포트원 환불 API 호출
async function refundWithPortone(paymentId, amount, reason) {
  try {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

    const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${process.env.PORTONE_API_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: reason || '세미나 환불',
        amount: amount
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('포트원 환불 API 오류:', response.status, errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error('포트원 환불 호출 실패:', error);
    return { success: false, error: error.message };
  }
}

async function exportRegistrations(body, headers) {
  const { seminarId } = body;

  if (!seminarId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'seminarId 필요' }) };
  }

  // 세미나 정보 조회
  const seminarDoc = await db.collection('seminars').doc(seminarId).get();
  const seminar = seminarDoc.exists ? seminarDoc.data() : {};

  // 결제 완료된 등록자만 조회
  const snapshot = await db.collection('seminar_registrations')
    .where('seminarId', '==', seminarId)
    .where('paymentStatus', '==', 'paid')
    .orderBy('paidAt', 'asc')
    .get();

  const registrations = snapshot.docs.map((doc, index) => {
    const data = doc.data();
    return {
      번호: index + 1,
      이름: data.name,
      미용실: data.store,
      직급: data.position,
      연락처: data.phone,
      이메일: data.email,
      경력: data.experience,
      결제방법: data.paymentMethod === 'card' ? '카드' : '가상계좌',
      결제금액: data.paidAmount,
      결제일시: data.paidAt?.toDate?.()?.toISOString() || ''
    };
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      seminarTitle: seminar.title || '',
      seminarDate: seminar.date?.toDate?.()?.toISOString() || '',
      registrations
    })
  };
}

// ==================== 통계 ====================

async function getSeminarStats(body, headers) {
  // 전체 세미나 통계
  const seminarsSnapshot = await db.collection('seminars').get();

  let totalSeminars = 0;
  let openSeminars = 0;
  let totalCapacity = 0;
  let totalRegistered = 0;

  seminarsSnapshot.forEach(doc => {
    const data = doc.data();
    totalSeminars++;
    if (data.status === 'open') openSeminars++;
    totalCapacity += data.capacity || 0;
    totalRegistered += data.currentCount || 0;
  });

  // 총 매출
  const paidRegistrations = await db.collection('seminar_registrations')
    .where('paymentStatus', '==', 'paid')
    .get();

  let totalRevenue = 0;
  paidRegistrations.forEach(doc => {
    totalRevenue += doc.data().paidAmount || 0;
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      stats: {
        totalSeminars,
        openSeminars,
        totalCapacity,
        totalRegistered,
        totalRevenue,
        paidCount: paidRegistrations.size
      }
    })
  };
}
