/**
 * Netlify Scheduled Function: 플랜 만료 체크 및 알림
 *
 * 스케줄: 매일 새벽 9시 (KST) = UTC 00:00
 * 기능:
 *   1. 만료된 플랜 자동 다운그레이드 (free 전환, 토큰 초기화)
 *   2. 만료 임박 알림 생성 (7일, 3일, 1일 전)
 *   3. 인앱 알림 저장 (notifications 컬렉션)
 *   4. [TODO] 이메일 발송 (SendGrid 연동 시)
 */

const admin = require('firebase-admin');

// Firebase Admin 초기화
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Firebase 환경변수 누락');
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n')
      })
    });
  }
}

const db = admin.firestore();

// 스케줄 설정 (매일 UTC 00:00 = KST 09:00)
exports.schedule = '@daily';

// 플랜 이름 매핑
const PLAN_NAMES = {
  basic: '베이직',
  pro: '프로',
  business: '비즈니스'
};

/**
 * 인앱 알림 생성
 */
async function createNotification(userId, type, title, message, data = {}) {
  try {
    await db.collection('notifications').add({
      userId,
      type,           // 'plan_expiring', 'plan_expired'
      title,
      message,
      data,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`📢 알림 생성: ${userId} - ${type}`);
  } catch (error) {
    console.error(`❌ 알림 생성 실패 (${userId}):`, error.message);
  }
}

/**
 * 이메일 발송 (SendGrid 연동 시 활성화)
 * TODO: SENDGRID_API_KEY 환경변수 설정 후 활성화
 */
async function sendExpirationEmail(user, daysRemaining) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  if (!SENDGRID_API_KEY) {
    console.log(`📧 이메일 발송 스킵 (SendGrid 미설정): ${user.email}`);
    return false;
  }

  // SendGrid 연동 코드 (추후 활성화)
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(SENDGRID_API_KEY);

  const planName = PLAN_NAMES[user.plan] || user.plan;
  const subject = daysRemaining === 0
    ? `[HAIRGATOR] ${planName} 플랜이 만료되었습니다`
    : `[HAIRGATOR] ${planName} 플랜이 ${daysRemaining}일 후 만료됩니다`;

  const msg = {
    to: user.email,
    from: 'noreply@hairgator.kr',
    subject: subject,
    html: `
      <h2>안녕하세요, ${user.displayName || '고객'}님</h2>
      <p>${daysRemaining === 0
        ? `${planName} 플랜이 만료되어 무료 플랜으로 전환되었습니다.`
        : `${planName} 플랜이 ${daysRemaining}일 후 만료됩니다.`
      }</p>
      <p>만료 시 토큰이 소멸됩니다. 계속 이용하시려면 플랜을 갱신해주세요.</p>
      <a href="https://app.hairgator.kr/#products" style="
        display: inline-block;
        padding: 12px 24px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        text-decoration: none;
        border-radius: 8px;
        margin-top: 16px;
      ">플랜 갱신하기</a>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`📧 이메일 발송 성공: ${user.email}`);
    return true;
  } catch (error) {
    console.error(`❌ 이메일 발송 실패 (${user.email}):`, error.message);
    return false;
  }
  */

  return false;
}

/**
 * 만료된 플랜 다운그레이드
 */
async function downgradeExpiredPlan(userId, userData) {
  const previousPlan = userData.plan;
  const previousTokens = userData.tokenBalance || 0;

  await db.collection('users').doc(userId).update({
    plan: 'free',
    tokenBalance: 0,
    planExpiredAt: admin.firestore.FieldValue.serverTimestamp(),
    previousPlan: previousPlan,
    previousTokenBalance: previousTokens,
    planExpiresAt: null  // 만료일 초기화
  });

  // 만료 로그 기록
  await db.collection('credit_logs').add({
    userId,
    action: 'plan_expired',
    previousPlan,
    previousTokenBalance: previousTokens,
    newPlan: 'free',
    newTokenBalance: 0,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    metadata: {
      reason: 'scheduled_expiration_check',
      expiredAt: userData.planExpiresAt
    }
  });

  console.log(`⏰ 플랜 만료 처리: ${userId} (${previousPlan} → free, ${previousTokens} → 0 토큰)`);
  return { previousPlan, previousTokens };
}

/**
 * 메인 핸들러
 */
exports.handler = async (event, context) => {
  console.log('🔔 플랜 만료 체크 시작...');
  console.log(`⏰ 실행 시간: ${new Date().toISOString()}`);

  const now = new Date();
  const stats = {
    totalChecked: 0,
    expired: 0,
    warning7days: 0,
    warning3days: 0,
    warning1day: 0,
    errors: 0
  };

  try {
    // 유료 플랜 사용자 조회 (planExpiresAt 있는 사용자)
    const usersSnapshot = await db.collection('users')
      .where('plan', 'in', ['basic', 'pro', 'business'])
      .get();

    console.log(`👥 유료 플랜 사용자: ${usersSnapshot.size}명`);

    for (const doc of usersSnapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();

      stats.totalChecked++;

      try {
        const planExpiresAt = userData.planExpiresAt;
        if (!planExpiresAt) continue;

        const expiresDate = planExpiresAt.toDate ? planExpiresAt.toDate() : new Date(planExpiresAt);
        const daysRemaining = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
        const planName = PLAN_NAMES[userData.plan] || userData.plan;

        console.log(`  📋 ${userId}: ${planName}, 만료까지 ${daysRemaining}일`);

        // 1. 만료된 경우 - 다운그레이드
        if (daysRemaining <= 0) {
          const result = await downgradeExpiredPlan(userId, userData);
          stats.expired++;

          // 만료 알림 생성
          await createNotification(
            userId,
            'plan_expired',
            '플랜 만료',
            `${planName} 플랜이 만료되어 무료 플랜으로 전환되었습니다. 토큰 ${result.previousTokens.toLocaleString()}개가 초기화되었습니다.`,
            { previousPlan: result.previousPlan, previousTokens: result.previousTokens }
          );

          // 이메일 발송 시도
          await sendExpirationEmail(userData, 0);
          continue;
        }

        // 2. 1일 전 알림
        if (daysRemaining === 1) {
          // 오늘 이미 알림 보냈는지 확인
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          const existingNotif = await db.collection('notifications')
            .where('userId', '==', userId)
            .where('type', '==', 'plan_expiring_1day')
            .where('createdAt', '>=', todayStart)
            .limit(1)
            .get();

          if (existingNotif.empty) {
            await createNotification(
              userId,
              'plan_expiring_1day',
              '⚠️ 플랜 만료 임박',
              `${planName} 플랜이 내일 만료됩니다! 만료 시 토큰 ${(userData.tokenBalance || 0).toLocaleString()}개가 소멸됩니다.`,
              { daysRemaining: 1, tokenBalance: userData.tokenBalance }
            );
            await sendExpirationEmail(userData, 1);
            stats.warning1day++;
          }
        }
        // 3. 3일 전 알림
        else if (daysRemaining === 3) {
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          const existingNotif = await db.collection('notifications')
            .where('userId', '==', userId)
            .where('type', '==', 'plan_expiring_3days')
            .where('createdAt', '>=', todayStart)
            .limit(1)
            .get();

          if (existingNotif.empty) {
            await createNotification(
              userId,
              'plan_expiring_3days',
              '플랜 만료 예정',
              `${planName} 플랜이 3일 후 만료됩니다. 갱신하지 않으면 토큰이 소멸됩니다.`,
              { daysRemaining: 3, tokenBalance: userData.tokenBalance }
            );
            await sendExpirationEmail(userData, 3);
            stats.warning3days++;
          }
        }
        // 4. 7일 전 알림
        else if (daysRemaining === 7) {
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          const existingNotif = await db.collection('notifications')
            .where('userId', '==', userId)
            .where('type', '==', 'plan_expiring_7days')
            .where('createdAt', '>=', todayStart)
            .limit(1)
            .get();

          if (existingNotif.empty) {
            await createNotification(
              userId,
              'plan_expiring_7days',
              '플랜 갱신 안내',
              `${planName} 플랜이 7일 후 만료됩니다. 미리 갱신하시면 서비스를 계속 이용하실 수 있습니다.`,
              { daysRemaining: 7, tokenBalance: userData.tokenBalance }
            );
            await sendExpirationEmail(userData, 7);
            stats.warning7days++;
          }
        }

      } catch (userError) {
        console.error(`❌ 사용자 처리 오류 (${userId}):`, userError.message);
        stats.errors++;
      }
    }

    console.log('\n📊 처리 결과:');
    console.log(`  - 총 체크: ${stats.totalChecked}명`);
    console.log(`  - 만료 처리: ${stats.expired}명`);
    console.log(`  - 7일 알림: ${stats.warning7days}명`);
    console.log(`  - 3일 알림: ${stats.warning3days}명`);
    console.log(`  - 1일 알림: ${stats.warning1day}명`);
    console.log(`  - 오류: ${stats.errors}건`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: '플랜 만료 체크 완료',
        stats,
        executedAt: now.toISOString()
      })
    };

  } catch (error) {
    console.error('💥 플랜 만료 체크 실패:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
