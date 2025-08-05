// Netlify Function - 네이버 정보 추출 (의존성 수정 버전)
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
      finalUrl = await resolveShortUrl(targetUrl);
      console.log('🔗 최종 URL:', finalUrl);
    }

    // 3단계: 네이버 페이지 크롤링
    const storeInfo = await crawlNaverPage(finalUrl);
    
    console.log('✅ 추출 완료:', storeInfo);

    // 4단계: 결과 검증
    const isValidData = storeInfo.storeName || storeInfo.name || storeInfo.address || storeInfo.phone;
    
    if (!isValidData) {
      throw new Error('추출된 매장 정보가 없습니다. 수동으로 입력해주세요.');
    }

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
          extractedAt: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('❌ 추출 실패:', error);
    
    return {
      statusCode: 200, // 200으로 변경하여 클라이언트에서 성공적으로 받도록
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message || '정보 추출에 실패했습니다',
        fallback: '수동 입력을 권장합니다',
        timestamp: new Date().toISOString()
      })
    };
  }
};

// URL 패턴 분석 (확장된 버전)
function analyzeNaverUrl(url) {
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
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  console.log('📄 HTML 획득 성공, 파싱 시작...');
  
  return parseNaverHTML(html, url);
}

// HTML 파싱해서 정보 추출 (향상된 버전)
function parseNaverHTML(html, url) {
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
    sourceUrl: url
  };

  // 매장명 추출 (확장된 선택자)
  const nameSelectors = [
    'h1.GHAhO',
    'h1.place_bluelink', 
    '.place_bluelink h1',
    'h1[class*="name"]',
    '.place_section_header h1',
    '.store_name',
    '.shop_name',
    '.title_area h1',
    'h1.store-name',
    '.business-name',
    'meta[property="og:title"]',
    'title'
  ];

  for (const selector of nameSelectors) {
    let name = '';
    
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
    
    if (name && name.length > 0 && name.length < 100) {
      storeInfo.storeName = name;
      storeInfo.name = name;
      console.log('✅ 매장명 추출:', name);
      break;
    }
  }

  // 주소 추출 (확장된 선택자)
  const addressSelectors = [
    '.place_section_content .place_addr',
    '.place_addr',
    '[class*="address"]',
    '.location_area .addr',
    '.store_addr',
    '.shop_addr',
    '.address_area',
    '.business-address',
    '.addr_txt',
    'meta[property="og:description"]'
  ];

  for (const selector of addressSelectors) {
    let address = '';
    
    if (selector === 'meta[property="og:description"]') {
      const content = $(selector).attr('content') || '';
      // 주소 패턴 추출 (더 정교한 정규식)
      const addressMatch = content.match(/([가-힣]+시\s+[가-힣]+구\s+[가-힣\s\d-]+)|([가-힣]+구\s+[가-힣\s\d-]+)|([가-힣]+시\s+[가-힣\s\d-]+)/);
      address = addressMatch ? addressMatch[0] : '';
    } else {
      address = $(selector).text().trim();
    }
    
    if (address && address.length > 5 && address.length < 200) {
      storeInfo.address = address;
      console.log('✅ 주소 추출:', address);
      break;
    }
  }

  // 전화번호 추출 (확장된 선택자)
  const phoneSelectors = [
    '.place_section_content .place_tel',
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
    
    if (selector === 'a[href^="tel:"]') {
      phone = $(selector).attr('href')?.replace('tel:', '') || '';
    } else {
      phone = $(selector).text().trim();
    }
    
    // 전화번호 패턴 확인 (더 유연한 정규식)
    if (phone && phone.match(/\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4}/)) {
      storeInfo.phone = phone.replace(/\s/g, '').replace(/-+/g, '-');
      console.log('✅ 전화번호 추출:', storeInfo.phone);
      break;
    }
  }

  // 영업시간 추출 (확장된 선택자)
  const hoursSelectors = [
    '.place_section_content .place_time',
    '.place_time',
    '[class*="hours"]',
    '[class*="time"]',
    '.business_hours',
    '.operating_hours',
    '.store_hours',
    '.shop_hours',
    '.time_info'
  ];

  for (const selector of hoursSelectors) {
    const hours = $(selector).text().trim();
    if (hours && hours.length > 0 && hours.length < 200) {
      storeInfo.businessHours = hours;
      storeInfo.hours = hours;
      console.log('✅ 영업시간 추출:', hours);
      break;
    }
  }

  // 카테고리 추출 (확장된 선택자)
  const categorySelectors = [
    '.place_section_header .category',
    '.category',
    '[class*="category"]',
    '.business_category',
    '.store_category',
    '.shop_type'
  ];

  for (const selector of categorySelectors) {
    const category = $(selector).text().trim();
    if (category && category.length > 0 && category.length < 50) {
      storeInfo.category = category;
      console.log('✅ 카테고리 추출:', category);
      break;
    }
  }

  // 설명 추출 (새로 추가)
  const descriptionSelectors = [
    '.place_section_content .place_intro',
    '.store_intro',
    '.business_intro',
    '.shop_description',
    '.description'
  ];

  for (const selector of descriptionSelectors) {
    const description = $(selector).text().trim();
    if (description && description.length > 0 && description.length < 500) {
      storeInfo.description = description;
      console.log('✅ 설명 추출:', description.substring(0, 50) + '...');
      break;
    }
  }

  // 미용실 기본 서비스 추가 (확장된 감지 로직)
  const isHairSalon = (storeInfo.category && (storeInfo.category.includes('미용') || storeInfo.category.includes('헤어'))) ||
                     (storeInfo.storeName && (storeInfo.storeName.includes('헤어') || storeInfo.storeName.includes('미용') || 
                      storeInfo.storeName.includes('살롱') || storeInfo.storeName.includes('뷰티'))) ||
                     (storeInfo.description && (storeInfo.description.includes('헤어') || storeInfo.description.includes('미용')));

  if (isHairSalon) {
    storeInfo.services = [
      { name: '커트', price: '25000' },
      { name: '펌', price: '80000' },
      { name: '염색', price: '60000' },
      { name: '트리트먼트', price: '30000' }
    ];
    console.log('✅ 미용실 서비스 자동 추가');
  }

  // 최종 검증 및 정리
  if (!storeInfo.storeName && !storeInfo.name) {
    // 마지막 시도: URL에서 정보 추출
    const urlParts = url.split('/');
    const possibleName = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
    if (possibleName && possibleName.length > 0) {
      storeInfo.storeName = decodeURIComponent(possibleName).replace(/[^가-힣a-zA-Z0-9\s]/g, '');
      storeInfo.name = storeInfo.storeName;
    }
  }

  console.log('📊 최종 추출 결과:', {
    storeName: storeInfo.storeName ? '✅' : '❌',
    address: storeInfo.address ? '✅' : '❌', 
    phone: storeInfo.phone ? '✅' : '❌',
    hours: storeInfo.businessHours ? '✅' : '❌',
    category: storeInfo.category ? '✅' : '❌'
  });

  return storeInfo;
}
