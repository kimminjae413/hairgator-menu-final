// 세미나 알림톡/SMS 발송 API
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

// 카카오 알림톡 설정
const KAKAO_ALIMTALK_API_KEY = process.env.KAKAO_ALIMTALK_API_KEY;
const KAKAO_ALIMTALK_SENDER_KEY = process.env.KAKAO_ALIMTALK_SENDER_KEY;
const KAKAO_ALIMTALK_API_URL = 'https://alimtalk-api.kakao.com/v1/messages';

// 알림톡 템플릿 ID (카카오 비즈니스에서 승인 받아야 함)
const TEMPLATES = {
  REGISTRATION_COMPLETE: 'registration_complete',    // 등록 완료 (카드)
  VIRTUAL_ACCOUNT_ISSUED: 'virtual_account_issued',  // 가상계좌 발급
  PAYMENT_CONFIRMED: 'payment_confirmed',            // 입금 확인
  REMINDER: 'reminder'                               // 리마인더
};

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
      case 'sendToOne':
        return await sendToOne(body, headers);
      case 'sendToAll':
        return await sendToAll(body, headers);
      case 'sendReminder':
        return await sendReminder(body, headers);
      case 'sendCustom':
        return await sendCustomMessage(body, headers);
      case 'checkConfig':
        return await checkConfig(headers);
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `알 수 없는 action: ${action}` })
        };
    }
  } catch (error) {
    console.error('seminar-sms 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// 설정 확인
async function checkConfig(headers) {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      configured: !!(KAKAO_ALIMTALK_API_KEY && KAKAO_ALIMTALK_SENDER_KEY),
      message: KAKAO_ALIMTALK_API_KEY
        ? '카카오 알림톡 설정됨'
        : '카카오 알림톡 미설정 (환경변수 KAKAO_ALIMTALK_API_KEY, KAKAO_ALIMTALK_SENDER_KEY 필요)'
    })
  };
}

// 개별 발송
async function sendToOne(body, headers) {
  const { registrationId, templateType, customMessage } = body;

  if (!registrationId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'registrationId 필요' }) };
  }

  // 등록 정보 조회
  const registrationDoc = await db.collection('seminar_registrations').doc(registrationId).get();

  if (!registrationDoc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '등록 정보를 찾을 수 없습니다' }) };
  }

  const registration = registrationDoc.data();

  // 세미나 정보 조회
  const seminarDoc = await db.collection('seminars').doc(registration.seminarId).get();
  const seminar = seminarDoc.exists ? seminarDoc.data() : {};

  // 메시지 생성
  const message = customMessage || buildMessage(templateType || 'REMINDER', registration, seminar);

  // 발송
  const result = await sendAlimtalk(registration.phone, message, templateType || 'REMINDER');

  // 발송 로그 기록
  await db.collection('seminar_sms_logs').add({
    registrationId,
    seminarId: registration.seminarId,
    phone: registration.phone,
    templateType: templateType || 'CUSTOM',
    message,
    result,
    sentAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: result.success,
      message: result.success ? '발송 완료' : result.error
    })
  };
}

// 전체 발송 (결제 완료된 등록자 대상)
async function sendToAll(body, headers) {
  const { seminarId, templateType, customMessage } = body;

  if (!seminarId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'seminarId 필요' }) };
  }

  // 세미나 정보 조회
  const seminarDoc = await db.collection('seminars').doc(seminarId).get();

  if (!seminarDoc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '세미나를 찾을 수 없습니다' }) };
  }

  const seminar = seminarDoc.data();

  // 결제 완료된 등록자 조회
  const registrationsSnapshot = await db.collection('seminar_registrations')
    .where('seminarId', '==', seminarId)
    .where('paymentStatus', '==', 'paid')
    .get();

  if (registrationsSnapshot.empty) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, sent: 0, message: '발송 대상자가 없습니다' })
    };
  }

  let sentCount = 0;
  let failCount = 0;
  const errors = [];

  for (const doc of registrationsSnapshot.docs) {
    const registration = doc.data();
    const message = customMessage || buildMessage(templateType || 'REMINDER', registration, seminar);

    const result = await sendAlimtalk(registration.phone, message, templateType || 'REMINDER');

    if (result.success) {
      sentCount++;
    } else {
      failCount++;
      errors.push({ phone: registration.phone, error: result.error });
    }

    // 발송 로그
    await db.collection('seminar_sms_logs').add({
      registrationId: doc.id,
      seminarId,
      phone: registration.phone,
      templateType: templateType || 'CUSTOM',
      message,
      result,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Rate limiting (초당 10건)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      total: registrationsSnapshot.size,
      sent: sentCount,
      failed: failCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    })
  };
}

// 리마인더 발송 (세미나 D-1)
async function sendReminder(body, headers) {
  const { seminarId } = body;

  if (!seminarId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'seminarId 필요' }) };
  }

  // 세미나 정보 조회
  const seminarDoc = await db.collection('seminars').doc(seminarId).get();

  if (!seminarDoc.exists) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: '세미나를 찾을 수 없습니다' }) };
  }

  const seminar = seminarDoc.data();
  const seminarDate = seminar.date?.toDate?.();

  if (!seminarDate) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: '세미나 날짜 정보 없음' }) };
  }

  // 결제 완료 등록자 조회
  const registrationsSnapshot = await db.collection('seminar_registrations')
    .where('seminarId', '==', seminarId)
    .where('paymentStatus', '==', 'paid')
    .get();

  if (registrationsSnapshot.empty) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, sent: 0, message: '발송 대상자가 없습니다' })
    };
  }

  let sentCount = 0;
  let failCount = 0;

  for (const doc of registrationsSnapshot.docs) {
    const registration = doc.data();
    const message = buildMessage('REMINDER', registration, seminar);

    const result = await sendAlimtalk(registration.phone, message, 'REMINDER');

    if (result.success) {
      sentCount++;
    } else {
      failCount++;
    }

    // 발송 로그
    await db.collection('seminar_sms_logs').add({
      registrationId: doc.id,
      seminarId,
      phone: registration.phone,
      templateType: 'REMINDER',
      message,
      result,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      total: registrationsSnapshot.size,
      sent: sentCount,
      failed: failCount
    })
  };
}

// 커스텀 메시지 발송
async function sendCustomMessage(body, headers) {
  const { phone, message } = body;

  if (!phone || !message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'phone과 message 필요' }) };
  }

  const result = await sendAlimtalk(phone, message, 'CUSTOM');

  // 발송 로그
  await db.collection('seminar_sms_logs').add({
    phone,
    templateType: 'CUSTOM',
    message,
    result,
    sentAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: result.success,
      message: result.success ? '발송 완료' : result.error
    })
  };
}

// 메시지 템플릿 빌드
function buildMessage(templateType, registration, seminar) {
  const seminarDate = seminar.date?.toDate?.();
  const dateStr = seminarDate
    ? seminarDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  switch (templateType) {
    case 'REGISTRATION_COMPLETE':
      return `[HAIRGATOR 세미나]
${registration.name}님, 등록이 완료되었습니다!

세미나: ${seminar.title || ''}
일시: ${dateStr} ${seminar.time || ''}
장소: ${seminar.location || ''}
${seminar.locationDetail ? `상세: ${seminar.locationDetail}` : ''}

세미나 당일 뵙겠습니다.
문의: hairgator.kr`;

    case 'VIRTUAL_ACCOUNT_ISSUED':
      const vaInfo = registration.virtualAccount || {};
      const dueDate = vaInfo.dueDate?.toDate?.();
      const dueDateStr = dueDate
        ? dueDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';

      return `[HAIRGATOR 세미나]
${registration.name}님, 가상계좌가 발급되었습니다.

세미나: ${seminar.title || ''}
결제금액: ${(seminar.price || 0).toLocaleString()}원

입금계좌
${vaInfo.bankName || ''} ${vaInfo.accountNumber || ''}
예금주: ${vaInfo.accountHolder || 'HAIRGATOR'}

입금기한: ${dueDateStr}

기한 내 미입금 시 자동 취소됩니다.
문의: hairgator.kr`;

    case 'PAYMENT_CONFIRMED':
      return `[HAIRGATOR 세미나]
${registration.name}님, 입금이 확인되었습니다!

세미나: ${seminar.title || ''}
일시: ${dateStr} ${seminar.time || ''}
장소: ${seminar.location || ''}
${seminar.locationDetail ? `상세: ${seminar.locationDetail}` : ''}

세미나 당일 뵙겠습니다.
문의: hairgator.kr`;

    case 'REMINDER':
      return `[HAIRGATOR 세미나 안내]
${registration.name}님, 내일 세미나가 있습니다!

세미나: ${seminar.title || ''}
일시: ${dateStr} ${seminar.time || ''}
장소: ${seminar.location || ''}
${seminar.locationDetail ? `상세: ${seminar.locationDetail}` : ''}

시간에 맞춰 참석 부탁드립니다.
문의: hairgator.kr`;

    default:
      return `[HAIRGATOR 세미나]
${registration.name}님께 안내드립니다.

세미나: ${seminar.title || ''}
일시: ${dateStr} ${seminar.time || ''}
장소: ${seminar.location || ''}

문의: hairgator.kr`;
  }
}

// 카카오 알림톡 발송 (또는 SMS fallback)
async function sendAlimtalk(phone, message, templateId) {
  // 카카오 알림톡 미설정 시 로그만 출력
  if (!KAKAO_ALIMTALK_API_KEY || !KAKAO_ALIMTALK_SENDER_KEY) {
    console.log('📱 알림톡 발송 (미설정):', {
      phone: maskPhone(phone),
      message: message.substring(0, 50) + '...',
      templateId
    });

    return {
      success: true,
      method: 'log_only',
      message: '알림톡 미설정 - 로그만 기록됨'
    };
  }

  try {
    const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

    // 카카오 알림톡 API 호출
    // 실제 API 형식은 카카오 비즈니스 문서 참조
    const response = await fetch(KAKAO_ALIMTALK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KAKAO_ALIMTALK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        senderKey: KAKAO_ALIMTALK_SENDER_KEY,
        templateCode: templateId,
        recipientList: [{
          recipientNo: phone.replace(/-/g, ''),
          templateParameter: {
            message: message
          }
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('알림톡 API 오류:', response.status, errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('✅ 알림톡 발송 성공:', maskPhone(phone));

    return {
      success: true,
      method: 'alimtalk',
      result
    };

  } catch (error) {
    console.error('알림톡 발송 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 전화번호 마스킹
function maskPhone(phone) {
  if (!phone) return '';
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
}
