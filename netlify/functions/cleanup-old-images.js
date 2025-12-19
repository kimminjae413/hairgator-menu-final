/**
 * Netlify Scheduled Function: 7일 지난 업로드 이미지 자동 삭제
 *
 * 스케줄: 매일 새벽 3시 (UTC 기준 18:00)
 * 대상: temp_uploads/ 폴더의 모든 파일
 * 조건: customMetadata.expiresAt가 현재 시간보다 이전인 파일
 */

const admin = require('firebase-admin');

// Firebase Admin 초기화 (중복 방지)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'hairgatormenu-4a43e.appspot.com'
  });
}

const bucket = admin.storage().bucket();

// 스케줄 설정 (Netlify Scheduled Functions)
exports.schedule = '@daily'; // 매일 실행

exports.handler = async (event, context) => {
  console.log('🧹 이미지 정리 작업 시작...');
  console.log(`⏰ 실행 시간: ${new Date().toISOString()}`);

  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

  let deletedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  try {
    // temp_uploads/ 폴더의 모든 파일 가져오기
    const [files] = await bucket.getFiles({ prefix: 'temp_uploads/' });

    console.log(`📁 총 ${files.length}개 파일 발견`);

    for (const file of files) {
      try {
        // 메타데이터 가져오기
        const [metadata] = await file.getMetadata();
        const customMetadata = metadata.metadata || {};

        // expiresAt 확인
        const expiresAt = parseInt(customMetadata.expiresAt || '0', 10);
        const uploadedAt = parseInt(customMetadata.uploadedAt || '0', 10);

        // 만료 조건 체크
        // 1) expiresAt가 있고 현재 시간보다 이전
        // 2) expiresAt가 없으면 uploadedAt 기준 7일
        // 3) 둘 다 없으면 파일 생성일 기준 7일
        let shouldDelete = false;
        let reason = '';

        if (expiresAt > 0 && expiresAt < now) {
          shouldDelete = true;
          reason = `만료됨 (expiresAt: ${new Date(expiresAt).toISOString()})`;
        } else if (uploadedAt > 0 && uploadedAt < sevenDaysAgo) {
          shouldDelete = true;
          reason = `7일 경과 (uploadedAt: ${new Date(uploadedAt).toISOString()})`;
        } else if (!expiresAt && !uploadedAt) {
          // 메타데이터 없는 경우 파일 생성일 확인
          const created = new Date(metadata.timeCreated).getTime();
          if (created < sevenDaysAgo) {
            shouldDelete = true;
            reason = `7일 경과 (timeCreated: ${metadata.timeCreated})`;
          }
        }

        if (shouldDelete) {
          await file.delete();
          deletedCount++;
          console.log(`🗑️ 삭제: ${file.name} - ${reason}`);
        } else {
          skippedCount++;
        }

      } catch (fileError) {
        errorCount++;
        console.error(`❌ 파일 처리 오류 (${file.name}):`, fileError.message);
      }
    }

    const summary = {
      success: true,
      totalFiles: files.length,
      deleted: deletedCount,
      skipped: skippedCount,
      errors: errorCount,
      executedAt: new Date().toISOString()
    };

    console.log('✅ 이미지 정리 작업 완료:', summary);

    return {
      statusCode: 200,
      body: JSON.stringify(summary)
    };

  } catch (error) {
    console.error('❌ 이미지 정리 작업 실패:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
        executedAt: new Date().toISOString()
      })
    };
  }
};
