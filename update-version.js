#!/usr/bin/env node

/**
 * HAIRGATOR 버전 자동 업데이트 스크립트
 * sw.js와 index.html의 버전을 한 번에 업데이트합니다
 * 
 * 사용법:
 * node update-version.js [버전번호]
 * 
 * 예시:
 * node update-version.js 5.0.0
 * node update-version.js 5.0.1
 * node update-version.js patch (패치 버전 자동 증가)
 * node update-version.js minor (마이너 버전 자동 증가)
 * node update-version.js major (메이저 버전 자동 증가)
 */

const fs = require('fs');
const path = require('path');

// 색상 코드 (터미널 출력용)
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// 현재 날짜를 YYYYMMDD 형식으로 가져오기
function getCurrentDateVersion() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// sw.js에서 현재 버전 추출
function getCurrentVersion() {
    try {
        const swPath = path.join(__dirname, 'sw.js');
        const swContent = fs.readFileSync(swPath, 'utf8');
        
        // CACHE_NAME에서 버전 추출
        const versionMatch = swContent.match(/const CACHE_NAME = 'hairgator-v(\d+\.\d+\.\d+)'/);
        
        if (versionMatch) {
            return versionMatch[1];
        }
        
        console.log(`${colors.yellow}⚠️  현재 버전을 찾을 수 없습니다. 기본값 사용: 1.0.0${colors.reset}`);
        return '1.0.0';
    } catch (error) {
        console.error(`${colors.red}❌ sw.js 파일 읽기 실패:${colors.reset}`, error.message);
        return '1.0.0';
    }
}

// 버전 번호 증가 함수
function incrementVersion(currentVersion, type) {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    switch(type) {
        case 'major':
            return `${major + 1}.0.0`;
        case 'minor':
            return `${major}.${minor + 1}.0`;
        case 'patch':
        default:
            return `${major}.${minor}.${patch + 1}`;
    }
}

// 버전 유효성 검증
function isValidVersion(version) {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    return versionRegex.test(version);
}

// sw.js 파일 업데이트
function updateServiceWorker(newVersion, dateVersion) {
    const swPath = path.join(__dirname, 'sw.js');
    
    try {
        let content = fs.readFileSync(swPath, 'utf8');
        
        // CACHE_NAME 업데이트
        content = content.replace(
            /const CACHE_NAME = 'hairgator-v\d+\.\d+\.\d+'/,
            `const CACHE_NAME = 'hairgator-v${newVersion}'`
        );
        
        // CACHE_VERSION 업데이트
        content = content.replace(
            /const CACHE_VERSION = '\d{8}'/,
            `const CACHE_VERSION = '${dateVersion}'`
        );
        
        // 백업 파일 생성
        fs.writeFileSync(`${swPath}.backup`, fs.readFileSync(swPath, 'utf8'));
        
        // 업데이트된 내용 저장
        fs.writeFileSync(swPath, content);
        
        console.log(`${colors.green}✅ sw.js 업데이트 완료${colors.reset}`);
        console.log(`   - CACHE_NAME: hairgator-v${newVersion}`);
        console.log(`   - CACHE_VERSION: ${dateVersion}`);
        
        return true;
    } catch (error) {
        console.error(`${colors.red}❌ sw.js 업데이트 실패:${colors.reset}`, error.message);
        return false;
    }
}

// index.html의 버전 주석 업데이트 (선택사항)
function updateIndexHtml(newVersion, dateVersion) {
    const indexPath = path.join(__dirname, 'index.html');
    
    try {
        let content = fs.readFileSync(indexPath, 'utf8');
        
        // HTML 주석으로 버전 정보 추가/업데이트
        const versionComment = `<!-- HAIRGATOR v${newVersion} (${dateVersion}) -->`;
        
        // 기존 버전 주석이 있으면 교체
        if (content.includes('<!-- HAIRGATOR v')) {
            content = content.replace(
                /<!-- HAIRGATOR v[\d.]+ \(\d{8}\) -->/,
                versionComment
            );
        } else {
            // 없으면 <!DOCTYPE html> 다음에 추가
            content = content.replace(
                '<!DOCTYPE html>',
                `<!DOCTYPE html>\n${versionComment}`
            );
        }
        
        // 백업 파일 생성
        fs.writeFileSync(`${indexPath}.backup`, fs.readFileSync(indexPath, 'utf8'));
        
        // 업데이트된 내용 저장
        fs.writeFileSync(indexPath, content);
        
        console.log(`${colors.green}✅ index.html 업데이트 완료${colors.reset}`);
        console.log(`   - 버전 주석 추가: v${newVersion}`);
        
        return true;
    } catch (error) {
        console.error(`${colors.red}❌ index.html 업데이트 실패:${colors.reset}`, error.message);
        return false;
    }
}

// 버전 정보 표시
function showVersionInfo(oldVersion, newVersion, dateVersion) {
    console.log(`\n${colors.bright}${colors.cyan}🦎 HAIRGATOR 버전 업데이트${colors.reset}`);
    console.log('═══════════════════════════════════════');
    console.log(`${colors.yellow}이전 버전:${colors.reset} v${oldVersion}`);
    console.log(`${colors.green}새 버전:${colors.reset}   v${newVersion}`);
    console.log(`${colors.blue}날짜 버전:${colors.reset} ${dateVersion}`);
    console.log('═══════════════════════════════════════\n');
}

// 메인 실행 함수
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`${colors.yellow}사용법:${colors.reset}`);
        console.log('  node update-version.js [버전번호]');
        console.log('  node update-version.js patch  (패치 버전 자동 증가)');
        console.log('  node update-version.js minor  (마이너 버전 자동 증가)');
        console.log('  node update-version.js major  (메이저 버전 자동 증가)');
        console.log('\n예시:');
        console.log('  node update-version.js 5.0.0');
        console.log('  node update-version.js patch');
        process.exit(0);
    }
    
    const currentVersion = getCurrentVersion();
    const dateVersion = getCurrentDateVersion();
    let newVersion = args[0];
    
    // 자동 증가 명령어 처리
    if (['patch', 'minor', 'major'].includes(newVersion)) {
        newVersion = incrementVersion(currentVersion, newVersion);
        console.log(`${colors.blue}📈 자동 버전 증가: ${args[0]}${colors.reset}`);
    }
    
    // 버전 유효성 검증
    if (!isValidVersion(newVersion)) {
        console.error(`${colors.red}❌ 잘못된 버전 형식: ${newVersion}${colors.reset}`);
        console.log('올바른 형식: X.Y.Z (예: 5.0.0)');
        process.exit(1);
    }
    
    // 버전 정보 표시
    showVersionInfo(currentVersion, newVersion, dateVersion);
    
    // 파일 업데이트
    let success = true;
    
    // sw.js 업데이트
    if (!updateServiceWorker(newVersion, dateVersion)) {
        success = false;
    }
    
    // index.html 업데이트
    if (!updateIndexHtml(newVersion, dateVersion)) {
        success = false;
    }
    
    // 결과 표시
    if (success) {
        console.log(`\n${colors.bright}${colors.green}🎉 모든 파일이 성공적으로 업데이트되었습니다!${colors.reset}`);
        console.log(`${colors.cyan}💡 팁: 백업 파일이 생성되었습니다 (.backup)${colors.reset}`);
        console.log(`${colors.yellow}⚠️  주의: 브라우저 캐시를 지우고 테스트하세요${colors.reset}\n`);
        
        // Git 커밋 명령어 제안
        console.log(`${colors.blue}Git 커밋 제안:${colors.reset}`);
        console.log(`git add sw.js index.html`);
        console.log(`git commit -m "🔧 버전 업데이트: v${newVersion} (${dateVersion})"`);
        console.log(`git push origin main\n`);
    } else {
        console.log(`\n${colors.red}⚠️  일부 파일 업데이트에 실패했습니다.${colors.reset}`);
        console.log('백업 파일(.backup)을 확인하고 수동으로 복구할 수 있습니다.');
        process.exit(1);
    }
}

// 스크립트 실행
main();
