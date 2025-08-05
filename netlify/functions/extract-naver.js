// Netlify Function - 네이버 정보 추출 (API/정규식 접근법)
// 파일 위치: netlify/functions/extract-naver.js

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
    console.log('🚀 네이버 크롤링 함수 시작 (API/정규식 접근법)');
    
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

    // 1단계: URL에서 Place ID 추출
    const placeId = extractPlaceId(targetUrl);
    console.log('📍 Place ID:', placeId);

    // 2단계: 여러 방법으로 정보 추출 시도
    let storeInfo = null;

    // 방법 1: 네이버 API 직접 호출 시도
    if (placeId) {
      console.log('🔍 방법 1: 네이버 API 시도...');
      storeInfo = await tryNaverAPI(placeId);
      if (storeInfo.storeName) {
        console.log('✅ 네이버 API 성공!');
      }
    }

    // 방법 2: HTML에서 JSON 데이터 추출
    if (!storeInfo || !storeInfo.storeName) {
      console.log('🔍 방법 2: HTML JSON 데이터 추출...');
      storeInfo = await extractFromHTML(targetUrl);
    }

    // 방법 3: 메타 태그 정보 추출
    if (!storeInfo || !storeInfo.storeName) {
      console.log('🔍 방법 3: 메타 태그 추출...');
      storeInfo = await extractFromMetaTags(targetUrl);
    }

    console.log('✅ 최종 추출 결과:', storeInfo);

    // 결과 검증
    const isValidData = storeInfo && (storeInfo.storeName || storeInfo.address || storeInfo.phone);
    
    if (!isValidData) {
      // 방법 4: 제한적 성공이라도 시도 (부분 정보)
      storeInfo = await tryPartialExtraction(targetUrl);
      
      if (!storeInfo || (!storeInfo.storeName && !storeInfo.address && !storeInfo.phone)) {
        throw new Error('모든 추출 방법이 실패했습니다. 네이버 페이지 구조가 변경되었을 수 있습니다.');
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          name: storeInfo.storeName || storeInfo.businessName || '',
          storeName: storeInfo.storeName || storeInfo.businessName || '',
          address: storeInfo.address || '',
          phone: storeInfo.phone || '',
          hours: storeInfo.businessHours || storeInfo.hours || '',
          category: storeInfo.category || '',
          description: storeInfo.description || '',
          extractionMethod: storeInfo.method || 'regex_extraction',
          sourceUrl: targetUrl,
          extractedAt: new Date().toISOString(),
          debugInfo: {
            placeId: placeId,
            extractionDetails: storeInfo.debugInfo || {}
          }
        }
      })
    };

  } catch (error) {
    console.error('❌ 추출 실패:', error);
    
    return {
      statusCode: 200,
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

// Place ID 추출
function extractPlaceId(url) {
  console.log('🔍 Place ID 추출:', url);
  
  const patterns = [
    /place\/(\d+)/,
    /entry\/place\/(\d+)/,
    /placeId[=:](\d+)/,
    /place[=:](\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      console.log('✅ Place ID 발견:', match[1]);
      return match[1];
    }
  }
  
  console.log('⚠️ Place ID 추출 실패');
  return null;
}

// 네이버 API 직접 호출 시도
async function tryNaverAPI(placeId) {
  const result = { method: 'naver_api' };
  
  try {
    // 네이버 지도 API 엔드포인트들 시도
    const apiUrls = [
      `https://map.naver.com/v5/api/sites/summary/${placeId}`,
      `https://map.naver.com/p/api/place/summary/${placeId}`,
      `https://m.place.naver.com/place/${placeId}/home`
    ];
    
    for (const apiUrl of apiUrls) {
      console.log('📡 API 요청:', apiUrl);
      
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ko-KR,ko;q=0.9',
            'Referer': 'https://map.naver.com/',
          },
          timeout: 10000
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 API 응답 성공:', Object.keys(data));
          
          // API 응답에서 정보 추출
          if (data.name || data.title) {
            result.storeName = data.name || data.title;
          }
          if (data.address || data.roadAddress) {
            result.address = data.address || data.roadAddress;
          }
          if (data.phone || data.tel) {
            result.phone = data.phone || data.tel;
          }
          if (data.businessHours || data.openHour) {
            result.businessHours = data.businessHours || data.openHour;
          }
          
          if (result.storeName) {
            console.log('✅ API에서 정보 추출 성공');
            return result;
          }
        }
      } catch (apiError) {
        console.log('⚠️ API 요청 실패:', apiError.message);
      }
    }
    
  } catch (error) {
    console.log('⚠️ 네이버 API 전체 실패:', error.message);
  }
  
  return result;
}

// HTML에서 JSON 데이터 추출
async function extractFromHTML(url) {
  const result = { method: 'html_json_extraction' };
  
  try {
    console.log('📄 HTML 페이지 요청:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      timeout: 15000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    console.log('📄 HTML 길이:', html.length);
    
    // 정규식으로 JSON 데이터 찾기
    const jsonPatterns = [
      /window\.__INITIAL_STATE__\s*=\s*({.+?});/s,
      /window\.__PLACE_STATE__\s*=\s*({.+?});/s,
      /"placeData"\s*:\s*({.+?})/s,
      /"businessInfo"\s*:\s*({.+?})/s
    ];
    
    for (const pattern of jsonPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          const jsonData = JSON.parse(match[1]);
          console.log('✅ JSON 데이터 발견:', Object.keys(jsonData));
          
          // JSON에서 정보 추출
          result.storeName = extractFromObject(jsonData, ['name', 'title', 'placeName', 'businessName']);
          result.address = extractFromObject(jsonData, ['address', 'roadAddress', 'fullAddress']);
          result.phone = extractFromObject(jsonData, ['phone', 'tel', 'phoneNumber']);
          result.businessHours = extractFromObject(jsonData, ['businessHours', 'openHour', 'hours']);
          
          if (result.storeName) {
            console.log('✅ JSON에서 정보 추출 성공');
            return result;
          }
        } catch (parseError) {
          console.log('⚠️ JSON 파싱 실패:', parseError.message);
        }
      }
    }
    
    // 스크립트 태그에서 데이터 찾기
    const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
    if (scriptMatches) {
      for (const script of scriptMatches) {
        if (script.includes('place') || script.includes('business')) {
          // 간단한 정규식으로 정보 추출
          const nameMatch = script.match(/"(?:name|title|placeName)"\s*:\s*"([^"]+)"/);
          const addressMatch = script.match(/"(?:address|roadAddress)"\s*:\s*"([^"]+)"/);
          const phoneMatch = script.match(/"(?:phone|tel)"\s*:\s*"([^"]+)"/);
          
          if (nameMatch) result.storeName = nameMatch[1];
          if (addressMatch) result.address = addressMatch[1];
          if (phoneMatch) result.phone = phoneMatch[1];
          
          if (result.storeName) {
            console.log('✅ 스크립트에서 정보 추출 성공');
            return result;
          }
        }
      }
    }
    
  } catch (error) {
    console.log('⚠️ HTML JSON 추출 실패:', error.message);
  }
  
  return result;
}

// 메타 태그에서 정보 추출
async function extractFromMetaTags(url) {
  const result = { method: 'meta_tags' };
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2)',
      },
      timeout: 10000
    });
    
    const html = await response.text();
    
    // 메타 태그 정보 추출
    const titleMatch = html.match(/<title[^>]*>([^<]+)</title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    
    if (titleMatch) {
      const title = titleMatch[1].trim();
      if (!title.includes('네이버') && !title.includes('지도')) {
        result.storeName = title.split('|')[0].split('-')[0].trim();
      }
    }
    
    if (ogTitleMatch) {
      result.storeName = result.storeName || ogTitleMatch[1].trim();
    }
    
    if (ogDescMatch) {
      const desc = ogDescMatch[1];
      // 주소 패턴 찾기
      const addressMatch = desc.match(/([가-힣]+[시군구]\s+[가-힣\s\d-]+)/);
      if (addressMatch) {
        result.address = addressMatch[1];
      }
      
      // 전화번호 패턴 찾기
      const phoneMatch = desc.match(/(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/);
      if (phoneMatch) {
        result.phone = phoneMatch[1];
      }
    }
    
    console.log('📋 메타 태그 추출 결과:', result);
    
  } catch (error) {
    console.log('⚠️ 메타 태그 추출 실패:', error.message);
  }
  
  return result;
}

// 부분 정보라도 추출 시도
async function tryPartialExtraction(url) {
  console.log('🔍 부분 정보 추출 시도...');
  
  // URL에서 힌트 추출
  const result = { method: 'partial_extraction' };
  
  // URL 경로에서 정보 추출
  const pathMatch = url.match(/\/([^\/\?]+)(?:\?|$)/);
  if (pathMatch) {
    const pathPart = decodeURIComponent(pathMatch[1]);
    if (pathPart.length > 2 && pathPart.length < 50) {
      result.storeName = pathPart.replace(/[^가-힣a-zA-Z0-9\s]/g, '');
    }
  }
  
  // 최소한의 정보라도 제공
  result.address = '정보 추출 실패 - 수동 입력 필요';
  result.debugInfo = { 
    message: '부분 정보만 추출됨',
    extractedFrom: 'url_path'
  };
  
  return result;
}

// 객체에서 키 리스트로 값 찾기
function extractFromObject(obj, keys) {
  for (const key of keys) {
    if (obj[key]) return obj[key];
  }
  
  // 중첩 객체 검색
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      const result = extractFromObject(value, keys);
      if (result) return result;
    }
  }
  
  return null;
}
