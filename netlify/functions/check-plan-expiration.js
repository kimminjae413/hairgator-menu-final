/**
 * Netlify Scheduled Function: 플랜 만료 체크 및 알림
 *
 * 스케줄: 매일 새벽 9시 (KST) = UTC 00:00
 * 기능:
 *   1. 만료된 플랜 자동 다운그레이드 (free 전환, 토큰 초기화)
 *   2. 만료 임박 알림 생성 (7일, 3일, 1일 전)
 *   3. 인앱 알림 저장 (notifications 컬렉션)
 *   4. 이메일 발송 (SendGrid) - SENDGRID_API_KEY 환경변수 필요
 *
 * 환경변수:
 *   - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *   - SENDGRID_API_KEY (선택적 - 없으면 이메일 발송 스킵)
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
 * 이메일 HTML 템플릿 생성
 */
function buildEmailTemplate(user, daysRemaining) {
  const planName = PLAN_NAMES[user.plan] || user.plan;
  const userName = user.displayName || user.name || '고객';
  const tokenBalance = (user.tokenBalance || 0).toLocaleString();

  // 상황별 메시지
  let headerText, mainMessage, urgencyColor, ctaText;

  if (daysRemaining === 0) {
    headerText = '플랜이 만료되었습니다';
    mainMessage = `${planName} 플랜이 만료되어 무료 플랜으로 전환되었습니다.<br>보유하셨던 토큰이 초기화되었습니다.`;
    urgencyColor = '#dc3545';
    ctaText = '플랜 다시 구독하기';
  } else if (daysRemaining === 1) {
    headerText = '⚠️ 플랜이 내일 만료됩니다!';
    mainMessage = `${planName} 플랜이 <strong>내일</strong> 만료됩니다.<br>만료 시 보유 토큰 <strong>${tokenBalance}개</strong>가 소멸됩니다.`;
    urgencyColor = '#dc3545';
    ctaText = '지금 갱신하기';
  } else if (daysRemaining === 3) {
    headerText = '플랜 만료 3일 전입니다';
    mainMessage = `${planName} 플랜이 <strong>3일 후</strong> 만료됩니다.<br>갱신하지 않으면 토큰 ${tokenBalance}개가 소멸됩니다.`;
    urgencyColor = '#fd7e14';
    ctaText = '플랜 갱신하기';
  } else {
    headerText = '플랜 갱신 안내';
    mainMessage = `${planName} 플랜이 <strong>${daysRemaining}일 후</strong> 만료됩니다.<br>미리 갱신하시면 서비스를 계속 이용하실 수 있습니다.`;
    urgencyColor = '#667eea';
    ctaText = '플랜 갱신하기';
  }

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">HAIRGATOR</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">AI 헤어스타일 어시스턴트</p>
            </td>
          </tr>

          <!-- Urgency Banner -->
          <tr>
            <td style="background-color: ${urgencyColor}; padding: 16px 40px; text-align: center;">
              <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">${headerText}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; color: #333333; font-size: 16px; line-height: 1.6;">
                안녕하세요, <strong>${userName}</strong>님
              </p>

              <p style="margin: 0 0 32px; color: #333333; font-size: 16px; line-height: 1.8;">
                ${mainMessage}
              </p>

              <!-- Plan Info Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding-bottom: 8px;">현재 플랜</td>
                        <td style="color: #333333; font-size: 14px; font-weight: 600; text-align: right; padding-bottom: 8px;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px;">보유 토큰</td>
                        <td style="color: #333333; font-size: 14px; font-weight: 600; text-align: right;">${tokenBalance}개</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="https://app.hairgator.kr/#products" style="
                      display: inline-block;
                      padding: 16px 48px;
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: #ffffff;
                      text-decoration: none;
                      font-size: 16px;
                      font-weight: 600;
                      border-radius: 50px;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    ">${ctaText}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px; color: #999999; font-size: 12px;">
                본 메일은 HAIRGATOR 서비스 이용과 관련하여 발송되었습니다.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                문의사항은 <a href="mailto:support@hairgator.kr" style="color: #667eea;">support@hairgator.kr</a>로 연락해주세요.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 이메일 발송 (SendGrid)
 * 환경변수: SENDGRID_API_KEY 필요
 */
async function sendExpirationEmail(user, daysRemaining) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  if (!SENDGRID_API_KEY) {
    console.log(`📧 이메일 발송 스킵 (SendGrid 미설정): ${user.email || 'no email'}`);
    return false;
  }

  if (!user.email) {
    console.log(`📧 이메일 발송 스킵 (이메일 없음): ${user.displayName || 'unknown'}`);
    return false;
  }

  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(SENDGRID_API_KEY);

  const planName = PLAN_NAMES[user.plan] || user.plan;
  const subject = daysRemaining === 0
    ? `[HAIRGATOR] ${planName} 플랜이 만료되었습니다`
    : daysRemaining === 1
      ? `[HAIRGATOR] ⚠️ ${planName} 플랜이 내일 만료됩니다!`
      : `[HAIRGATOR] ${planName} 플랜이 ${daysRemaining}일 후 만료됩니다`;

  const msg = {
    to: user.email,
    from: {
      email: 'noreply@hairgator.kr',
      name: 'HAIRGATOR'
    },
    subject: subject,
    html: buildEmailTemplate(user, daysRemaining)
  };

  try {
    await sgMail.send(msg);
    console.log(`📧 이메일 발송 성공: ${user.email}`);
    return true;
  } catch (error) {
    console.error(`❌ 이메일 발송 실패 (${user.email}):`, error.message);
    if (error.response) {
      console.error('SendGrid 응답:', JSON.stringify(error.response.body));
    }
    return false;
  }
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
    emailsSent: 0,
    emailsFailed: 0,
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
          const emailSent = await sendExpirationEmail(userData, 0);
          if (emailSent) stats.emailsSent++;
          else stats.emailsFailed++;
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
            const emailSent = await sendExpirationEmail(userData, 1);
            if (emailSent) stats.emailsSent++;
            else stats.emailsFailed++;
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
            const emailSent = await sendExpirationEmail(userData, 3);
            if (emailSent) stats.emailsSent++;
            else stats.emailsFailed++;
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
            const emailSent = await sendExpirationEmail(userData, 7);
            if (emailSent) stats.emailsSent++;
            else stats.emailsFailed++;
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
    console.log(`  - 📧 이메일 발송: ${stats.emailsSent}건 성공, ${stats.emailsFailed}건 실패`);
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
