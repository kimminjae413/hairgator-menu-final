// Netlify Function - 네이버 정보 추출 (Puppeteer 브라우저 자동화 버전)
// 파일 위치: netlify/functions/extract-naver.js

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers, 
      body: '' 
    };
  }

  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Method not allowed' 
      })
    };
  }

  let browser = null;

  try {
    console.log('🚀 네이버 크롤링 함수 시작 (Puppeteer 버전)');
    
    const { url, naverUrl, fetchURL } = JSON.parse(event.body);
    const targetUrl = url || naverUrl || fetchURL;
    
    if (!targetUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'URL이 필요합니다' 
        })
      };
    }

    console.log('🔍 네이버 URL:', targetUrl);

    // Puppeteer 브라우저 실행
    console.log('🚀 Puppeteer 브라우저 실행...');
    
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // User Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    
    console.log('📱 네이버 페이지 이동 중...');
    
    // 페이지 로드 (JavaScript 실행 대기)
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('⏳ JavaScript 로딩 대기 중...');
    
    // 페이지가 완전히 로드될 때까지 대기
    await page.waitForTimeout(3000);
    
    console.log('🔍 매장 정보 추출 시작...');
    
    // 페이지에서 정보 추출
    const storeInfo = await page.evaluate(() => {
      const result = {
        storeName: '',
        address: '',
        phone: '',
        businessHours: '',
        category: '',
        description: '',
        foundElements: []
      };
      
      // 매장명 추출 - 다양한 선택자 시도
      const nameSelectors = [
        'h1', 'h2', 'h3',
        '[class*="title"]',
        '[class*="name"]',
        '[data-place-name]',
        '.place_bluelink',
        '.business_name',
        '.store_name'
      ];
      
      for (const selector of nameSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 100 && !result.storeName) {
              // 네이버, 지도 등 불필요한 텍스트 필터링
              if (!text.includes('네이버') && !text.includes('지도') && !text.includes('NAVER')) {
                result.storeName = text;
                result.foundElements.push(`매장명: ${selector} = "${text}"`);
              }
            }
          });
        } catch (e) {}
      }
      
      // 주소 추출
      const addressSelectors = [
        '[class*="address"]',
        '[class*="addr"]',
        '.place_addr',
        '.location_area',
        '[data-address]'
      ];
      
      for (const selector of addressSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 5 && text.length < 200 && !result.address) {
              // 한국 주소 패턴 확인
              if (text.match(/[가-힣]+[시구군]/) || text.match(/[가-힣]+동/)) {
                result.address = text;
                result.foundElements.push(`주소: ${selector} = "${text}"`);
              }
            }
          });
        } catch (e) {}
      }
      
      // 전화번호 추출
      const phoneSelectors = [
        '[class*="phone"]',
        '[class*="tel"]',
        'a[href^="tel:"]',
        '.contact_phone'
      ];
      
      for (const selector of phoneSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            let text = el.textContent?.trim() || el.getAttribute('href')?.replace('tel:', '') || '';
            if (text && text.match(/\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}/) && !result.phone) {
              result.phone = text;
              result.foundElements.push(`전화번호: ${selector} = "${text}"`);
            }
          });
        } catch (e) {}
      }
      
      // 영업시간 추출
      const hourSelectors = [
        '[class*="time"]',
        '[class*="hour"]',
        '.business_hours',
        '.operating_hours'
      ];
      
      for (const selector of hourSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && text.length < 200 && !result.businessHours) {
              if (text.match(/\d{1,2}:\d{2}/) || text.includes('시간')) {
                result.businessHours = text;
                result.foundElements.push(`영업시간: ${selector} = "${text}"`);
              }
            }
          });
        } catch (e) {}
      }
      
      // 모든 텍스트 요소 스캔 (백업용)
      if (!result.storeName) {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const text = el.textContent?.trim();
          if (text && text.length > 2 && text.length < 50) {
            // 매장명 패턴 추정
            if (text.includes('헤어') || text.includes('미용') || text.includes('살롱') || text.includes('뷰티')) {
              result.storeName = text;
              result.foundElements.push(`추정 매장명: 텍스트 스캔 = "${text}"`);
              break;
            }
          }
        }
      }
      
      return result;
    });

    console.log('✅ 추출 결과:', storeInfo);
    console.log('🔍 발견된 요소들:', storeInfo.foundElements);

    // 브라우저 종료
    await browser.close();
    browser = null;

    // 결과 검증
    const isValidData = storeInfo.storeName || storeInfo.address || storeInfo.phone;
    
    if (!isValidData) {
      throw new Error('추출된 매장 정보가 없습니다. 네이버 페이지 구조가 변경되었을 수 있습니다.');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          name: storeInfo.storeName,
          storeName: storeInfo.storeName,
          address: storeInfo.address,
          phone: storeInfo.phone,
          hours: storeInfo.businessHours,
          category: storeInfo.category,
          description: storeInfo.description,
          extractionMethod: 'puppeteer_browser_automation',
          sourceUrl: targetUrl,
          extractedAt: new Date().toISOString(),
          debugInfo: {
            foundElements: storeInfo.foundElements,
            extractionTime: new Date().toISOString()
          }
        }
      })
    };

  } catch (error) {
    console.error('❌ 추출 실패:', error);
    
    // 브라우저 정리
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || '브라우저 자동화를 통한 정보 추출에 실패했습니다',
        fallback: '수동 입력을 권장합니다',
        timestamp: new Date().toISOString()
      })
    };
  }
};
