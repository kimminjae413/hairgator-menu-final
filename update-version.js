/**
 * HAIRGATOR 버전 관리 가이드
 * GitHub 웹에서 직접 수정용
 * 
 * ========================================
 * 📝 GitHub 웹에서 버전 업데이트 방법
 * ========================================
 * 
 * 1. sw.js 파일 수정:
 *    - 2번째 줄: const CACHE_NAME = 'hairgator-v5.0.0';  ← 버전 변경
 *    - 3번째 줄: const CACHE_VERSION = '20250105';       ← 오늘 날짜로 변경
 * 
 * 2. index.html 파일 수정:
 *    - 2번째 줄에: <!-- HAIRGATOR v5.0.0 (20250105) --> 추가/수정
 * 
 * ========================================
 * 버전 규칙:
 * - 작은 수정: 5.0.0 → 5.0.1 → 5.0.2
 * - 기능 추가: 5.0.2 → 5.1.0
 * - 대규모 변경: 5.1.0 → 6.0.0
 * 
 * 날짜 형식: YYYYMMDD (예: 20250105)
 * ========================================
 */

// 현재 설정된 버전 (GitHub에서 직접 수정)
const CURRENT_VERSION = '5.0.1';  // ← 여기를 새 버전으로 변경
const UPDATE_DATE = '20250105';   // ← 여기를 오늘 날짜로 변경

// ========================================
// 아래는 자동 실행 코드 (수정 불필요)
// ========================================

const fs = require('fs');
const path = require('path');

function updateFiles() {
    console.log('\n🦎 HAIRGATOR 버전 업데이트');
    console.log('========================================');
    console.log(`새 버전: v${CURRENT_VERSION}`);
    console.log(`날짜: ${UPDATE_DATE}`);
    console.log('========================================\n');
    
    // sw.js 업데이트
    try {
        const swPath = path.join(__dirname, 'sw.js');
        let swContent = fs.readFileSync(swPath, 'utf8');
        
        swContent = swContent.replace(
            /const CACHE_NAME = 'hairgator-v\d+\.\d+\.\d+'/,
            `const CACHE_NAME = 'hairgator-v${CURRENT_VERSION}'`
        );
        
        swContent = swContent.replace(
            /const CACHE_VERSION = '\d{8}'/,
            `const CACHE_VERSION = '${UPDATE_DATE}'`
        );
        
        fs.writeFileSync(swPath, swContent);
        console.log('✅ sw.js 업데이트 완료');
    } catch (e) {
        console.log('❌ sw.js 업데이트 실패:', e.message);
    }
    
    // index.html 업데이트
    try {
        const htmlPath = path.join(__dirname, 'index.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        const versionComment = `<!-- HAIRGATOR v${CURRENT_VERSION} (${UPDATE_DATE}) -->`;
        
        if (htmlContent.includes('<!-- HAIRGATOR v')) {
            htmlContent = htmlContent.replace(
                /<!-- HAIRGATOR v[\d.]+ \(\d{8}\) -->/,
                versionComment
            );
        } else {
            htmlContent = htmlContent.replace(
                '<!DOCTYPE html>',
                `<!DOCTYPE html>\n${versionComment}`
            );
        }
        
        fs.writeFileSync(htmlPath, htmlContent);
        console.log('✅ index.html 업데이트 완료');
    } catch (e) {
        console.log('❌ index.html 업데이트 실패:', e.message);
    }
    
    console.log('\n✨ 업데이트 완료!\n');
}

// Node.js에서 실행될 때만 작동
if (require.main === module) {
    updateFiles();
}
