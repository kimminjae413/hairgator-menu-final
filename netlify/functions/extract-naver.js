// Netlify Function - 네이버 정보 추출
// 파일 위치: netlify/functions/extract-naver.js

const cheerio = require('cheerio');

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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { url } = JSON.parse(event.body);
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL이 필요합니다' })
      };
    }

    console.log('🔍 네이버 URL 추출 시작:', url);

    // 1단계: URL 패턴 분석
    const urlInfo = analyzeNaverUrl(url);
    console.log('📊 URL 분석 결과:', urlInfo);

    // 2단계: 실제 URL로 리다이렉션 따라가기
    let finalUrl = url;
    if (urlInfo.isShortUrl) {
      finalUrl = await resolveShortUrl(url);
      console.log('🔗 최종 URL:', finalUrl);
    }

    // 3단계: 네이버 페이지 크롤링
    const storeInfo = await crawlNaverPage(finalUrl);
    
    console.log('✅ 추출 완료:', storeInfo);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: storeInfo,
        extractedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ 추출 실패:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message,
        fallback: '수동 입력을 권장합니다'
      })
    };
  }
};

// URL 패턴 분석
function analyzeNaverUrl(url) {
  const patterns = {
    booking: /booking\.naver\.com.*\/store\/(\d+)/,
    place: /map\.naver\.com.*\/place\/(\d+)/,
    shortUrl: /naver\.me\/([a-zA-Z0-9]+)/,
    smartstore: /smartstore\.naver\.com\/([^\/]+)/
  };
  
  let result = {
    originalUrl: url,
    platform: 'unknown',
    id: null,
    isShortUrl: false
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    const match = url.match(pattern);
    if (match) {
      result.platform = type;
      result.id = match[1];
      if (type === 'shortUrl') {
        result.isShortUrl = true;
      }
      break;
    }
  }
  
  return result;
}

// 단축 URL 해결
async function resolveShortUrl(shortUrl) {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return response.url;
  } catch (error) {
    console.log('단축 URL 해결 실패, 원본 사용:', shortUrl);
    return shortUrl;
  }
}

// 네이버 페이지 크롤링
async function crawlNaverPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  return parseNaverHTML(html, url);
}

// HTML 파싱해서 정보 추출
function parseNaverHTML(html, url) {
  const $ = cheerio.load(html);
  
  let storeInfo = {
    storeName: '',
    address: '',
    phone: '',
    businessHours: '',
    category: '',
    services: [],
    extractionMethod: 'html_parsing',
    sourceUrl: url
  };

  // 매장명 추출 (여러 패턴 시도)
  const nameSelectors = [
    'h1.GHAhO',
    'h1.place_bluelink',
    '.place_bluelink h1',
    'h1[class*="name"]',
    '.place_section_header h1',
    'meta[property="og:title"]'
  ];

  for (const selector of nameSelectors) {
    let name = '';
    if (selector.startsWith('meta')) {
      name = $(selector).attr('content');
    } else {
      name = $(selector).text().trim();
    }
    
    if (name && name.length > 0) {
      storeInfo.storeName = name;
      break;
    }
  }

  // 주소 추출
  const addressSelectors = [
    '.place_section_content .place_addr',
    '.place_addr',
    '[class*="address"]',
    '.location_area .addr',
    'meta[property="og:description"]'
  ];

  for (const selector of addressSelectors) {
    let address = '';
    if (selector.startsWith('meta')) {
      const content = $(selector).attr('content');
      // 주소 패턴 추출
      const addressMatch = content?.match(/([가-힣]+시\s+[가-힣]+구\s+[가-힣\s\d-]+)/);
      address = addressMatch ? addressMatch[1] : '';
    } else {
      address = $(selector).text().trim();
    }
    
    if (address && address.length > 0) {
      storeInfo.address = address;
      break;
    }
  }

  // 전화번호 추출
  const phoneSelectors = [
    '.place_section_content .place_tel',
    '.place_tel',
    '[class*="phone"]',
    '[class*="tel"]'
  ];

  for (const selector of phoneSelectors) {
    const phone = $(selector).text().trim();
    if (phone && phone.match(/\d{2,3}-\d{3,4}-\d{4}/)) {
      storeInfo.phone = phone;
      break;
    }
  }

  // 영업시간 추출
  const hoursSelectors = [
    '.place_section_content .place_time',
    '.place_time',
    '[class*="hours"]',
    '[class*="time"]'
  ];

  for (const selector of hoursSelectors) {
    const hours = $(selector).text().trim();
    if (hours && hours.length > 0) {
      storeInfo.businessHours = hours;
      break;
    }
  }

  // 카테고리 추출
  const categorySelectors = [
    '.place_section_header .category',
    '.category',
    '[class*="category"]'
  ];

  for (const selector of categorySelectors) {
    const category = $(selector).text().trim();
    if (category && category.length > 0) {
      storeInfo.category = category;
      break;
    }
  }

  // 미용실 기본 서비스 추가 (카테고리가 미용실/헤어샵인 경우)
  const isHairSalon = storeInfo.category.includes('미용') || 
                     storeInfo.category.includes('헤어') ||
                     storeInfo.storeName.includes('헤어') ||
                     storeInfo.storeName.includes('미용');

  if (isHairSalon) {
    storeInfo.services = [
      { name: '커트', price: '25000' },
      { name: '펌', price: '80000' },
      { name: '염색', price: '60000' },
      { name: '트리트먼트', price: '30000' }
    ];
  }

  // 페이지 타이틀에서 추가 정보 추출 (fallback)
  if (!storeInfo.storeName) {
    const title = $('title').text().trim();
    if (title && !title.includes('네이버')) {
      storeInfo.storeName = title.split('|')[0].trim();
    }
  }

  return storeInfo;
}
