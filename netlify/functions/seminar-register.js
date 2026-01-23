// 세미나 등록 API (사용자용) - 결제 연동
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
const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;

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
      case 'getSeminarInfo':
        return await getSeminarInfo(body, headers);
      case 'checkAvailability':
        return await checkAvailability(body, headers);
      case 'register':
        return await registerWithCard(body, headers);
      case 'verifyPayment':
        return await verifyPayment(body, headers);
      case 'getMyRegistration':
        return await getMyRegistration(body, headers);
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `알 수 없는 action: ${action}` })
        };
    }
  } catch (error) {
    console.error('seminar-register 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// 세미나 정보 조회 (공개용)
async function getSeminarInfo(body, headers) {
  const { seminarId } = body;

  if (!seminarId) {
    // seminarId 없으면 open 상태 세미나 목록 반환
    // 복합 인덱스 없이 쿼리하기 위해 status만으로 필터링 후 JS에서 정렬
    const snapshot = await db.collection('seminars')
      .where('status', '==', 'open')
      .get();

    const seminars = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        date: data.date?.toDate?.()?.toISOString() || null,
        time: data.time,
        location: data.location,
        locationDetail: data.locationDetail,
        price: data.price,
        capacity: data.capacity,
        currentCount: data.currentCount || 0,
        isFull: (data.currentCount || 0) >= data.capacity
      };
    });

    // 날짜순 정렬 (오름차순)
    seminars.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, seminars })
    };
  }

  const doc = await db.collection('seminars').doc(seminarId).get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '세미나를 찾을 수 없습니다' }) };
  }

  const data = doc.data();

  // open 상태가 아니면 비공개
  if (data.status !== 'open') {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '접수 가능한 세미나가 아닙니다' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      seminar: {
        id: doc.id,
        title: data.title,
        description: data.description,
        date: data.date?.toDate?.()?.toISOString() || null,
        time: data.time,
        location: data.location,
        locationDetail: data.locationDetail,
        price: data.price,
        capacity: data.capacity,
        currentCount: data.currentCount || 0,
        isFull: (data.currentCount || 0) >= data.capacity
      }
    })
  };
}

// 잔여석 확인
async function checkAvailability(body, headers) {
  const { seminarId } = body;

  if (!seminarId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'seminarId 필요' }) };
  }

  const doc = await db.collection('seminars').doc(seminarId).get();

  if (!doc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '세미나를 찾을 수 없습니다' }) };
  }

  const data = doc.data();
  const available = data.capacity - (data.currentCount || 0);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      capacity: data.capacity,
      currentCount: data.currentCount || 0,
      available,
      isAvailable: available > 0 && data.status === 'open'
    })
  };
}

// 카드 결제 등록 (결제 전 등록 생성)
async function registerWithCard(body, headers) {
  const { seminarId, name, store, position, phone, email, experience } = body;

  // 필수 필드 확인
  if (!seminarId || !name || !phone) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '필수 필드 누락 (seminarId, name, phone)' }) };
  }

  // 세미나 정보 확인
  const seminarDoc = await db.collection('seminars').doc(seminarId).get();
  if (!seminarDoc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '세미나를 찾을 수 없습니다' }) };
  }

  const seminar = seminarDoc.data();

  // 상태 확인
  if (seminar.status !== 'open') {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '접수 가능한 세미나가 아닙니다' }) };
  }

  // 정원 확인
  if ((seminar.currentCount || 0) >= seminar.capacity) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '정원이 마감되었습니다' }) };
  }

  // 중복 등록 확인 (같은 연락처로 같은 세미나)
  const existingRegistration = await db.collection('seminar_registrations')
    .where('seminarId', '==', seminarId)
    .where('phone', '==', phone)
    .get();

  for (const doc of existingRegistration.docs) {
    const data = doc.data();
    if (data.paymentStatus === 'paid') {
      // 이미 결제 완료된 등록이 있으면 거부
      return { statusCode: 400, headers, body: JSON.stringify({ error: '이미 등록된 연락처입니다' }) };
    }
    // pending 상태(결제 실패/취소)는 삭제하고 재등록 허용
    if (data.paymentStatus === 'pending') {
      await doc.ref.delete();
      console.log('기존 pending 등록 삭제:', doc.id);
    }
  }

  // 무료 세미나인 경우 바로 등록 완료
  if (!seminar.price || seminar.price === 0) {
    const seminarRef = db.collection('seminars').doc(seminarId);

    // 트랜잭션으로 등록 처리
    const registrationId = await db.runTransaction(async (transaction) => {
      const currentSeminar = await transaction.get(seminarRef);
      const currentCount = currentSeminar.data()?.currentCount || 0;

      // 정원 초과 확인
      if (currentCount >= seminar.capacity) {
        throw new Error('정원이 마감되었습니다.');
      }

      // 등록 문서 생성
      const registrationRef = db.collection('seminar_registrations').doc();
      transaction.set(registrationRef, {
        seminarId,
        name,
        store: store || '',
        position: position || '',
        phone,
        email: email || '',
        experience: experience || '',
        paymentMethod: 'free',
        paymentStatus: 'paid',
        paymentId: null,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        paidAmount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 세미나 현재 인원 증가
      transaction.update(seminarRef, {
        currentCount: currentCount + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return registrationRef.id;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        registrationId,
        seminarTitle: seminar.title,
        price: 0,
        isFree: true,
        message: '무료 세미나 등록이 완료되었습니다!'
      })
    };
  }

  // 유료 세미나 - 등록 문서 생성 (결제 대기)
  const registrationData = {
    seminarId,
    name,
    store: store || '',
    position: position || '',
    phone,
    email: email || '',
    experience: experience || '',
    paymentMethod: 'card',
    paymentStatus: 'pending',
    paymentId: null,
    paidAt: null,
    paidAmount: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const registrationRef = await db.collection('seminar_registrations').add(registrationData);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      registrationId: registrationRef.id,
      seminarTitle: seminar.title,
      price: seminar.price,
      isFree: false,
      message: '등록이 생성되었습니다. 결제를 진행해주세요.'
    })
  };
}

// 결제 검증 (카드 결제 완료 후)
async function verifyPayment(body, headers) {
  const { registrationId, paymentId } = body;

  if (!registrationId || !paymentId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'registrationId와 paymentId 필요' }) };
  }

  // 등록 정보 확인
  const registrationRef = db.collection('seminar_registrations').doc(registrationId);
  const registrationDoc = await registrationRef.get();

  if (!registrationDoc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '등록 정보를 찾을 수 없습니다' }) };
  }

  const registration = registrationDoc.data();

  if (registration.paymentStatus === 'paid') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: '이미 결제 완료된 등록입니다' })
    };
  }

  // 포트원 결제 검증
  const paymentData = await verifyPaymentWithPortone(paymentId);

  if (!paymentData) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '결제 정보를 조회할 수 없습니다' }) };
  }

  if (paymentData.status !== 'PAID') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: '결제가 완료되지 않았습니다', status: paymentData.status })
    };
  }

  // 세미나 정보 확인
  const seminarRef = db.collection('seminars').doc(registration.seminarId);
  const seminarDoc = await seminarRef.get();

  if (!seminarDoc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '세미나를 찾을 수 없습니다' }) };
  }

  const seminar = seminarDoc.data();

  // 금액 검증
  if (paymentData.amount.total !== seminar.price) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '결제 금액이 일치하지 않습니다' }) };
  }

  // 트랜잭션으로 결제 완료 처리
  await db.runTransaction(async (transaction) => {
    const currentSeminar = await transaction.get(seminarRef);
    const currentCount = currentSeminar.data()?.currentCount || 0;

    // 정원 초과 확인
    if (currentCount >= seminar.capacity) {
      throw new Error('정원이 마감되었습니다. 환불이 필요합니다.');
    }

    // 등록 상태 업데이트
    transaction.update(registrationRef, {
      paymentStatus: 'paid',
      paymentId: paymentId,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAmount: paymentData.amount.total
    });

    // 세미나 현재 인원 증가
    transaction.update(seminarRef, {
      currentCount: currentCount + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: '결제가 완료되었습니다. 세미나 안내 문자를 보내드립니다.',
      seminarTitle: seminar.title,
      seminarDate: seminar.date?.toDate?.()?.toISOString(),
      location: seminar.location
    })
  };
}

// 포트원 결제 검증
async function verifyPaymentWithPortone(paymentId) {
  try {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

    const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `PortOne ${PORTONE_API_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('포트원 API 오류:', response.status, errorText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('포트원 API 호출 실패:', error);
    return null;
  }
}

// 내 등록 정보 조회 (연락처로)
async function getMyRegistration(body, headers) {
  const { phone, seminarId } = body;

  if (!phone) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'phone 필요' }) };
  }

  let query = db.collection('seminar_registrations')
    .where('phone', '==', phone)
    .orderBy('createdAt', 'desc');

  if (seminarId) {
    query = db.collection('seminar_registrations')
      .where('phone', '==', phone)
      .where('seminarId', '==', seminarId);
  }

  const snapshot = await query.limit(10).get();

  const registrations = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const seminarDoc = await db.collection('seminars').doc(data.seminarId).get();
    const seminar = seminarDoc.exists ? seminarDoc.data() : {};

    registrations.push({
      id: doc.id,
      seminarTitle: seminar.title || '',
      seminarDate: seminar.date?.toDate?.()?.toISOString() || null,
      location: seminar.location || '',
      name: data.name,
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      paidAmount: data.paidAmount,
      paidAt: data.paidAt?.toDate?.()?.toISOString() || null,
      virtualAccount: data.virtualAccount ? {
        bankName: data.virtualAccount.bankName,
        accountNumber: data.virtualAccount.accountNumber,
        dueDate: data.virtualAccount.dueDate?.toDate?.()?.toISOString() || null
      } : null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null
    });
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, registrations })
  };
}
