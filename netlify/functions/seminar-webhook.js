// 세미나 가상계좌 입금 웹훅
const admin = require('firebase-admin');
const crypto = require('crypto');

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
const PORTONE_WEBHOOK_SECRET = process.env.PORTONE_WEBHOOK_SECRET;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // 포트원은 POST로 웹훅 전송
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    console.log('📥 세미나 웹훅 수신:', event.body);

    const body = JSON.parse(event.body || '{}');
    const { type, data } = body;

    // 웹훅 서명 검증 (선택적)
    if (PORTONE_WEBHOOK_SECRET) {
      const signature = event.headers['webhook-signature'] || event.headers['x-portone-signature'];
      if (signature) {
        const isValid = verifyWebhookSignature(event.body, signature);
        if (!isValid) {
          console.error('웹훅 서명 검증 실패');
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid signature' }) };
        }
      }
    }

    // 결제 완료 이벤트 처리
    if (type === 'Transaction.Paid' || type === 'payment.paid') {
      const paymentId = data?.paymentId || body.paymentId;

      if (!paymentId) {
        console.log('paymentId 없음, 무시');
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      // 세미나 결제인지 확인 (SEMINAR_ 접두사)
      if (!paymentId.startsWith('SEMINAR_')) {
        console.log('세미나 결제 아님, 무시:', paymentId);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      // 이미 처리된 결제인지 확인
      const existingPayment = await db.collection('seminar_registrations')
        .where('paymentId', '==', paymentId)
        .where('paymentStatus', '==', 'paid')
        .get();

      if (!existingPayment.empty) {
        console.log('이미 처리된 결제:', paymentId);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Already processed' }) };
      }

      // 등록 정보 조회
      const registrationSnapshot = await db.collection('seminar_registrations')
        .where('paymentId', '==', paymentId)
        .get();

      if (registrationSnapshot.empty) {
        console.error('등록 정보 없음:', paymentId);
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Registration not found' }) };
      }

      const registrationDoc = registrationSnapshot.docs[0];
      const registration = registrationDoc.data();
      const registrationRef = registrationDoc.ref;

      // 세미나 정보 조회
      const seminarRef = db.collection('seminars').doc(registration.seminarId);
      const seminarDoc = await seminarRef.get();

      if (!seminarDoc.exists) {
        console.error('세미나 없음:', registration.seminarId);
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Seminar not found' }) };
      }

      const seminar = seminarDoc.data();

      // 트랜잭션으로 처리
      await db.runTransaction(async (transaction) => {
        const currentSeminar = await transaction.get(seminarRef);
        const currentCount = currentSeminar.data()?.currentCount || 0;

        // 정원 초과 확인
        if (currentCount >= seminar.capacity) {
          console.error('정원 초과, 환불 필요:', paymentId);
          // 환불 로직은 별도로 처리 (알림 발송)
          throw new Error('정원 초과');
        }

        // 등록 상태 업데이트
        transaction.update(registrationRef, {
          paymentStatus: 'paid',
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          paidAmount: data?.amount?.total || seminar.price,
          webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 세미나 현재 인원 증가
        transaction.update(seminarRef, {
          currentCount: currentCount + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      console.log('✅ 가상계좌 입금 처리 완료:', paymentId);

      // 알림톡 발송 (별도 함수로 분리 가능)
      try {
        await sendPaymentConfirmationSMS(registration, seminar);
      } catch (smsError) {
        console.error('알림톡 발송 실패:', smsError);
        // 알림톡 실패해도 결제 처리는 완료
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Payment processed' })
      };
    }

    // 결제 취소 이벤트 처리
    if (type === 'Transaction.Cancelled' || type === 'payment.cancelled') {
      const paymentId = data?.paymentId || body.paymentId;

      if (!paymentId || !paymentId.startsWith('SEMINAR_')) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      // 등록 정보 조회 및 상태 업데이트
      const registrationSnapshot = await db.collection('seminar_registrations')
        .where('paymentId', '==', paymentId)
        .get();

      if (!registrationSnapshot.empty) {
        const registrationDoc = registrationSnapshot.docs[0];
        const registration = registrationDoc.data();

        if (registration.paymentStatus === 'paid') {
          // 세미나 인원 감소
          const seminarRef = db.collection('seminars').doc(registration.seminarId);
          await db.runTransaction(async (transaction) => {
            const seminarDoc = await transaction.get(seminarRef);
            if (seminarDoc.exists) {
              const currentCount = seminarDoc.data().currentCount || 0;
              transaction.update(seminarRef, {
                currentCount: Math.max(0, currentCount - 1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
            }

            transaction.update(registrationDoc.ref, {
              paymentStatus: 'cancelled',
              cancelledAt: admin.firestore.FieldValue.serverTimestamp()
            });
          });
        } else {
          await registrationDoc.ref.update({
            paymentStatus: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        console.log('✅ 결제 취소 처리 완료:', paymentId);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Cancellation processed' })
      };
    }

    // 가상계좌 만료 이벤트
    if (type === 'Transaction.VirtualAccountIssued.Expired' || type === 'virtualAccount.expired') {
      const paymentId = data?.paymentId || body.paymentId;

      if (paymentId && paymentId.startsWith('SEMINAR_')) {
        const registrationSnapshot = await db.collection('seminar_registrations')
          .where('paymentId', '==', paymentId)
          .where('paymentStatus', '==', 'pending')
          .get();

        if (!registrationSnapshot.empty) {
          await registrationSnapshot.docs[0].ref.update({
            paymentStatus: 'expired',
            expiredAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('가상계좌 만료 처리:', paymentId);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    // 기타 이벤트는 무시
    console.log('알 수 없는 웹훅 타입:', type);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Event ignored' })
    };

  } catch (error) {
    console.error('웹훅 처리 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// 웹훅 서명 검증
function verifyWebhookSignature(payload, signature) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', PORTONE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  } catch (error) {
    console.error('서명 검증 오류:', error);
    return false;
  }
}

// 입금 확인 알림톡 발송
async function sendPaymentConfirmationSMS(registration, seminar) {
  // 카카오 알림톡 API 호출 (환경변수 설정 시 활성화)
  const KAKAO_ALIMTALK_API_KEY = process.env.KAKAO_ALIMTALK_API_KEY;
  const KAKAO_ALIMTALK_SENDER_KEY = process.env.KAKAO_ALIMTALK_SENDER_KEY;

  if (!KAKAO_ALIMTALK_API_KEY || !KAKAO_ALIMTALK_SENDER_KEY) {
    console.log('카카오 알림톡 미설정, SMS 발송 건너뜀');
    return;
  }

  const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

  const message = `[HAIRGATOR 세미나]
${registration.name}님, 입금이 확인되었습니다.

세미나: ${seminar.title}
일시: ${seminar.date?.toDate?.()?.toLocaleDateString('ko-KR')} ${seminar.time}
장소: ${seminar.location}
${seminar.locationDetail ? seminar.locationDetail : ''}

문의: hairgator.kr`;

  // 실제 알림톡 API 호출 (카카오 비즈메시지 API)
  // 여기서는 로그만 출력
  console.log('📱 알림톡 발송 예정:', {
    phone: registration.phone,
    message
  });
}
