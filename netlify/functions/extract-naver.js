// Netlify Function - 네이버 정보 추출 (디버깅 강화 버전)
// 파일 위치: netlify/functions/extract-naver.js

const cheerio = require('cheerio');
const fetch = require('node-fetch');

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

  try {
    console.log('🚀 네이버 크롤링 함수 시작');
    console.log('📥 요청 데이터:', event.body);
    
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

    console.log('🔍 네이버 URL 추출 시작:', targetUrl);

    // 1단계: URL 패턴 분석
    const urlInfo = analyzeNaverUrl(targetUrl);
    console.log('📊 URL 분석 결과:', urlInfo);

    // 2단계: 실제 URL로 리다이렉션 따라가기
    let finalUrl = targetUrl;
    if (urlInfo.isShortUrl) {
      console.log('🔗 단축 URL 해결 시작...');
      finalUrl = await resolveShortUrl(targetUrl);
      console.log('🔗 최종 URL:', finalUrl);
    }

    // 3단계: 네이버 페이지 크롤링
    console.log('🕷️ 페이지 크롤링 시작:', finalUrl);
    const storeInfo = await crawlNaverPage(finalUrl);
    
    console.log('✅ 추출 완료:', storeInfo);

    // 4단계: 결과 검증
    const isValidData = storeInfo.storeName || storeInfo.name || storeInfo.address || storeInfo.phone;
    
    if (!isValidData) {
      console.log('⚠️ 유효한 데이터 없음');
      throw new Error('추출된 매장 정보가 없습니다. 수동으로 입력해주세요.');
    }

    console.log('📤 성공 응답 전송');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          // 여러 필드명 지원으로 호환성 향상
          name: storeInfo.storeName || storeInfo.name || '',
          storeName: storeInfo.storeName || storeInfo.name || '',
          address: storeInfo.address || '',
          phone: storeInfo.phone || '',
          hours: storeInfo.businessHours || storeInfo.hours || '',
          description: storeInfo.description || '',
          category: storeInfo.category || '',
          services: storeInfo.services || [],
          // 메타데이터
          extractionMethod: storeInfo.extractionMethod || 'html_parsing',
          sourceUrl: finalUrl,
          extractedAt: new Date().toISOString(),
          // 디버깅 정보 추가
          debugInfo: {
            originalUrl: targetUrl,
            finalUrl: finalUrl,
            urlInfo: urlInfo,
            foundSelectors: storeInfo.foundSelectors || []
          }
        }
      })
    };

  } catch (error) {
    console.error('❌ 추출 실패:', error);
    console.error('❌ 스택 트레이스:', error.stack);
    
    return {
      statusCode: 200, // 200으로 변경하여 클라이언트에서 성공적으로 받도록
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || '정보 추출에 실패했습니다',
        fallback: '수동 입력을 권장합니다',
        timestamp: new Date().toISOString(),
        debugError: error.stack
      })
    };
  }
};

// URL 패턴 분석 (확장된 버전)
function analyzeNaverUrl(url) {
  console.log('🔍 URL 패턴 분석:', url);
  
  const patterns = {
    booking: /booking\.naver\.com.*\/store\/(\d+)/,
    place: /map\.naver\.com.*\/place\/(\d+)/,
    shortUrl: /naver\.me\/([a-zA-Z0-9]+)/,
    smartstore: /smartstore\.naver\.com\/([^\/]+)/,
    // 추가 패턴들
    search: /search\.naver\.com.*query=([^&]+)/,
    local: /m\.place\.naver\.com\/place\/(\d+)/
  };
  
  let result = {
    originalUrl: url,
    platform: 'unknown',
    id: null,
    isShortUrl: false,
    isNaverUrl: url.includes('naver')
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    const match = url.match(pattern);
    if (match) {
      result.platform = type;
      result.id = match[1];
      if (type === 'shortUrl') {
        result.isShortUrl = true;
      }
      console.log(`✅ URL 패턴 매칭: ${type}, ID: ${match[1]}`);
      break;
    }
  }
  
  return result;
}

// 단축 URL 해결 (강화된 버전)
async function resolveShortUrl(shortUrl) {
  try {
    console.log('🔗 단축 URL 해결 시도:', shortUrl);
    
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      },
      timeout: 10000
    });
    
    const resolvedUrl = response.url;
    console.log('✅ URL 해결 성공:', resolvedUrl);
    return resolvedUrl;
    
  } catch (error) {
    console.log('⚠️ 단축 URL 해결 실패, 원본 사용:', shortUrl);
    console.log('⚠️ 해결 오류:', error.message);
    return shortUrl;
  }
}

// 네이버 페이지 크롤링 (강화된 버전)
async function crawlNaverPage(url) {
  console.log('🕷️ 페이지 크롤링 시작:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    },
    timeout: 15000
  });

  if (!response.ok) {
    console.error(`❌ HTTP 오류: ${response.status} ${response.statusText}`);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  console.log('📄 HTML 획득 성공, 길이:', html.length);
  console.log('📄 HTML 샘플 (처음 500자):', html.substring(0, 500));
  
  return parseNaverHTML(html, url);
}

// HTML 파싱해서 정보 추출 (향상된 디버깅 버전)
function parseNaverHTML(html, url) {
  console.log('🔍 HTML 파싱 시작');
  const $ = cheerio.load(html);
  
  let storeInfo = {
    storeName: '',
    name: '',
    address: '',
    phone: '',
    businessHours: '',
    hours: '',
    category: '',
    description: '',
    services: [],
    extractionMethod: 'html_parsing',
    sourceUrl: url,
    foundSelectors: [] // 디버깅용
  };

  // 모든 가능한 선택자들을 시도하고 결과 기록
  console.log('🔍 매장명 추출 시도...');
  
  // 매장명 추출 (확장된 선택자 + 디버깅)
  const nameSelectors = [
    // 2024년 네이버 지도 새로운 선택자들
    '[data-place-name]',
    '[data-title]',
    '.place_bluelink',
    '.place_name',
    '.title_area h1',
    '.store_name',
    '.business_name',
    // 기존 선택자들
    'h1.GHAhO',
    'h1.place_bluelink', 
    '.place_bluelink h1',
    'h1[class*="name"]',
    '.place_section_header h1',
    '.shop_name',
    'h1.store-name',
    // 메타 태그들
    'meta[property="og:title"]',
    'title'
  ];

  for (const selector of nameSelectors) {
    let name = '';
    
    try {
      if (selector === 'meta[property="og:title"]') {
        name = $(selector).attr('content') || '';
      } else if (selector === 'title') {
        const title = $(selector).text().trim();
        // "네이버 지도" 등 불필요한 텍스트 제거
        name = title.split('|')[0].split('-')[0].split('::')[0].trim();
        if (name.includes('네이버') || name.includes('지도')) {
          name = '';
        }
      } else {
        name = $(selector).text().trim();
      }
      
      console.log(`🔍 선택자 ${selector}: "${name}"`);
      
      if (name && name.length > 0 && name.length < 100) {
        storeInfo.storeName = name;
        storeInfo.name = name;
        storeInfo.foundSelectors.push(`매장명: ${selector}`);
        console.log('✅ 매장명 추출 성공:', name);
        break;
      }
    } catch (error) {
      console.log(`⚠️ 선택자 ${selector} 오류:`, error.message);
    }
  }

  // 주소 추출 (확장된 선택자 + 디버깅)
  console.log('🔍 주소 추출 시도...');
  const addressSelectors = [
    // 2024년 네이버 지도 새로운 선택자들
    '[data-address]',
    '.place_addr',
    '.address_area',
    '.location_area .addr',
    // 기존 선택자들
    '.place_section_content .place_addr',
    '[class*="address"]',
    '.store_addr',
    '.shop_addr',
    '.business-address',
    '.addr_txt',
    'meta[property="og:description"]'
  ];

  for (const selector of addressSelectors) {
    let address = '';
    
    try {
      if (selector === 'meta[property="og:description"]') {
        const content = $(selector).attr('content') || '';
        // 주소 패턴 추출 (더 정교한 정규식)
        const addressMatch = content.match(/([가-힣]+시\s+[가-힣]+구\s+[가-힣\s\d-]+)|([가-힣]+구\s+[가-힣\s\d-]+)|([가-힣]+시\s+[가-힣\s\d-]+)/);
        address = addressMatch ? addressMatch[0] : '';
      } else {
        address = $(selector).text().trim();
      }
      
      console.log(`🔍 주소 선택자 ${selector}: "${address}"`);
      
      if (address && address.length > 5 && address.length < 200) {
        storeInfo.address = address;
        storeInfo.foundSelectors.push(`주소: ${selector}`);
        console.log('✅ 주소 추출 성공:', address);
        break;
      }
    } catch (error) {
      console.log(`⚠️ 주소 선택자 ${selector} 오류:`, error.message);
    }
  }

  // 전화번호 추출
  console.log('🔍 전화번호 추출 시도...');
  const phoneSelectors = [
    '[data-phone]',
    '.place_tel',
    '[class*="phone"]',
    '[class*="tel"]',
    '.store_phone',
    '.shop_phone',
    '.contact_phone',
    '.business-phone',
    'a[href^="tel:"]'
  ];

  for (const selector of phoneSelectors) {
    let phone = '';
    
    try {
      if (selector === 'a[href^="tel:"]') {
        phone = $(selector).attr('href')?.replace('tel:', '') || '';
      } else {
        phone = $(selector).text().trim();
      }
      
      console.log(`🔍 전화번호 선택자 ${selector}: "${phone}"`);
      
      // 전화번호 패턴 확인 (더 유연한 정규식)
      if (phone && phone.match(/\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}/)) {
        storeInfo.phone = phone.replace(/\s/g, '').replace(/-+/g, '-');
        storeInfo.foundSelectors.push(`전화번호: ${selector}`);
        console.log('✅ 전화번호 추출 성공:', storeInfo.phone);
        break;
      }
    } catch (error) {
      console.log(`⚠️ 전화번호 선택자 ${selector} 오류:`, error.message);
    }
  }

  // 최종 결과 로깅
  console.log('📊 최종 추출 결과:', {
    storeName: storeInfo.storeName ? `✅ ${storeInfo.storeName}` : '❌',
    address: storeInfo.address ? `✅ ${storeInfo.address}` : '❌', 
    phone: storeInfo.phone ? `✅ ${storeInfo.phone}` : '❌',
    foundSelectors: storeInfo.foundSelectors
  });

  // HTML 구조 분석 (실패 시 참고용)
  if (!storeInfo.storeName && !storeInfo.address && !storeInfo.phone) {
    console.log('❌ 모든 추출 실패 - HTML 구조 분석:');
    
    // 모든 h1, h2, h3 태그 찾기
    $('h1, h2, h3').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length < 100) {
        console.log(`🔍 발견된 제목 태그: <${elem.tagName}> "${text}"`);
      }
    });
    
    // class나 id에 "name", "title", "address" 포함된 요소들 찾기
    $('[class*="name"], [class*="title"], [class*="address"], [id*="name"], [id*="title"], [id*="address"]').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text && text.length < 100) {
        console.log(`🔍 발견된 관련 요소: <${elem.tagName} class="${elem.className}" id="${elem.id}"> "${text}"`);
      }
    });
  }

  return storeInfo;
}
