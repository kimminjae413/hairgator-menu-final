/**
 * Netlify Function: 마케팅 이메일 일괄 발송
 *
 * 기능:
 *   - 마케팅 수신 동의한 사용자에게 이메일 일괄 발송
 *   - SendGrid API 사용
 *   - 발송 기록 Firestore에 저장
 *
 * 환경변수:
 *   - SENDGRID_API_KEY
 *   - SENDGRID_FROM_EMAIL (선택, 기본: noreply@hairgator.kr)
 *   - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

const admin = require('firebase-admin');

// Firebase Admin 초기화
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
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

// CORS 헤더
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * 마케팅 이메일 HTML 템플릿 생성
 */
function buildEmailHtml(subject, content, imageUrl, linkText, linkUrl) {
  const contentHtml = content.replace(/\n/g, '<br>');

  let imageSection = '';
  if (imageUrl) {
    imageSection = `
      <tr>
        <td style="padding: 0 40px;">
          <div style="margin: 24px 0; text-align: center;">
            <img src="${imageUrl}" style="max-width: 100%; border-radius: 12px;" alt="이미지">
          </div>
        </td>
      </tr>
    `;
  }

  let buttonSection = '';
  if (linkText && linkUrl) {
    buttonSection = `
      <tr>
        <td style="padding: 0 40px;">
          <div style="text-align: center; margin: 32px 0;">
            <a href="${linkUrl}" style="
              display: inline-block;
              padding: 16px 48px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #ffffff;
              text-decoration: none;
              font-size: 16px;
              font-weight: 600;
              border-radius: 50px;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            ">${linkText}</a>
          </div>
        </td>
      </tr>
    `;
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

          <!-- Subject -->
          <tr>
            <td style="padding: 40px 40px 0;">
              <h2 style="margin: 0 0 24px; color: #333333; font-size: 20px; font-weight: 600;">${subject}</h2>
            </td>
          </tr>

          ${imageSection}

          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="color: #333333; font-size: 16px; line-height: 1.8;">
                ${contentHtml}
              </div>
            </td>
          </tr>

          ${buttonSection}

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px; color: #999999; font-size: 12px;">
                본 메일은 마케팅 수신에 동의하신 분께 발송되었습니다.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                수신거부는 <a href="https://app.hairgator.kr/#my" style="color: #667eea;">앱 설정</a>에서 변경하실 수 있습니다.
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
 * 메인 핸들러
 */
exports.handler = async (event, context) => {
  // OPTIONS 요청 처리
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@hairgator.kr';

  if (!SENDGRID_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'SendGrid API key not configured' })
    };
  }

  try {
    const { subject, content, imageBase64, linkText, linkUrl } = JSON.parse(event.body);

    if (!subject || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: '제목과 본문을 입력해주세요' })
      };
    }

    console.log('📧 마케팅 이메일 발송 시작...');
    console.log(`  제목: ${subject}`);

    // 1. 마케팅 수신 동의한 사용자 조회
    const usersSnapshot = await db.collection('users').get();
    const recipients = [];

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.termsAgreement?.marketing === true && data.email) {
        recipients.push({
          email: data.email,
          name: data.displayName || data.name || '고객'
        });
      }
    });

    console.log(`  수신 대상: ${recipients.length}명`);

    if (recipients.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          message: '마케팅 수신 동의한 사용자가 없습니다'
        })
      };
    }

    // 2. 이메일 HTML 생성
    const emailHtml = buildEmailHtml(subject, content, imageBase64, linkText, linkUrl);

    // 3. SendGrid로 이메일 발송
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(SENDGRID_API_KEY);

    let successCount = 0;
    let failedCount = 0;
    const failedEmails = [];

    // 개별 발송 (대량 발송 시에는 SendGrid Personalization 사용 권장)
    for (const recipient of recipients) {
      try {
        await sgMail.send({
          to: recipient.email,
          from: {
            email: FROM_EMAIL,
            name: 'HAIRGATOR'
          },
          subject: `[HAIRGATOR] ${subject}`,
          html: emailHtml
        });
        successCount++;
        console.log(`  ✅ 발송 성공: ${recipient.email}`);
      } catch (error) {
        failedCount++;
        failedEmails.push(recipient.email);
        console.error(`  ❌ 발송 실패: ${recipient.email} - ${error.message}`);
      }
    }

    // 4. 발송 기록 저장
    await db.collection('marketing_emails').add({
      subject,
      content,
      hasImage: !!imageBase64,
      linkText: linkText || null,
      linkUrl: linkUrl || null,
      totalRecipients: recipients.length,
      successCount,
      failedCount,
      failedEmails,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      sentBy: 'admin'
    });

    console.log(`📧 마케팅 이메일 발송 완료: 성공 ${successCount}, 실패 ${failedCount}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        total: recipients.length
      })
    };

  } catch (error) {
    console.error('마케팅 이메일 발송 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
