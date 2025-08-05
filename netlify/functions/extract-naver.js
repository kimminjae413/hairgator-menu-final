// Netlify Function - 네이버 정보 추출 (정규식 문법 수정 버전)
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
    console.log('🚀 네이버 크롤링 함수 시작 (정규식 문법 수정)');
    
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
      if (storeInfo && storeInfo.storeName) {
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
      const metaInfo = await extractFromMetaTags(targetUrl);
      if (metaInfo && metaInfo.storeName) {
        storeInfo = metaInfo;
      }
    }

    console.log('✅ 최종 추출 결과:', storeInfo);

    // 결과 검증
    const isValidData = storeInfo && (storeInfo.storeName || storeInfo.address || storeInfo.phone);
    
    if (!isValidData) {
      // 방법 4: 제한적 성공이라도 시도 (부분 정보)
      console.log('🔍 방법 4: 부분 정보 추출...');
      storeInfo = tryPartialExtraction(targetUrl);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          name: (storeInfo && storeInfo.storeName) || '',
          storeName: (storeInfo && storeInfo.storeName) || '',
          address: (storeInfo && storeInfo.address) || '',
          phone: (storeInfo && storeInfo.phone) || '',
          hours: (storeInfo && storeInfo.businessHours) || '',
          category: (storeInfo && storeInfo.category) || '',
          description: (storeInfo && storeInfo.description) || '',
          extractionMethod: (storeInfo && storeInfo.method) || 'regex_extraction',
          sourceUrl: targetUrl,
          extractedAt: new Date().toISOString(),
          debugInfo: {
            placeId: placeId,
            extractionDetails: (storeInfo && storeInfo.debugInfo) || {}
          }
        }
      })
    };

  } catch (error) {
    console.error('❌ 추출 실패:', error);
    console.error('❌ 스택 트레이스:', error.stack);
    
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
  
  try {
    // place/숫자 패턴
    let match = url.match(/place\/(\d+)/);
    if (match) {
      console.log('✅ place/ 패턴으로 Place ID 발견:', match[1]);
      return match[1];
    }
    
    // entry/place/숫자 패턴
    match = url.match(/entry\/place\/(\d+)/);
    if (match) {
      console.log('✅ entry/place/ 패턴으로 Place ID 발견:', match[1]);
      return match[1];
    }
    
    // placeId=숫자 패턴
    match = url.match(/placeId[=:](\d+)/);
    if (match) {
      console.log('✅ placeId= 패턴으로 Place ID 발견:', match[1]);
      return match[1];
    }
    
  } catch (error) {
    console.log('⚠️ Place ID 추출 중 오류:', error.message);
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
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
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
    console.log('📄 HTML 샘플 (처음 200자):', html.substring(0, 200));
    
    // 정규식으로 JSON 데이터 찾기 (수정된 버전)
    try {
      // window.__INITIAL_STATE__ 찾기
      let match = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        console.log('🔍 __INITIAL_STATE__ 발견');
        try {
          const jsonData = JSON.parse(match[1]);
          console.log('✅ __INITIAL_STATE__ JSON 파싱 성공');
          
          result.storeName = extractFromObject(jsonData, ['name', 'title', 'placeName', 'businessName']);
          result.address = extractFromObject(jsonData, ['address', 'roadAddress', 'fullAddress']);
          result.phone = extractFromObject(jsonData, ['phone', 'tel', 'phoneNumber']);
          
          if (result.storeName) {
            console.log('✅ __INITIAL_STATE__에서 정보 추출 성공');
            return result;
          }
        } catch (parseError) {
          console.log('⚠️ __INITIAL_STATE__ JSON 파싱 실패:', parseError.message);
        }
      }
      
      // 다른 패턴들도 시도
      match = html.match(/window\.__PLACE_STATE__\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        console.log('🔍 __PLACE_STATE__ 발견');
        try {
          const jsonData = JSON.parse(match[1]);
          result.storeName = extractFromObject(jsonData, ['name', 'title']);
          result.address = extractFromObject(jsonData, ['address', 'roadAddress']);
          
          if (result.storeName) {
            console.log('✅ __PLACE_STATE__에서 정보 추출 성공');
            return result;
          }
        } catch (parseError) {
          console.log('⚠️ __PLACE_STATE__ JSON 파싱 실패');
        }
      }
      
    } catch (regexError) {
      console.log('⚠️ 정규식 처리 오류:', regexError.message);
    }
    
    // 간단한 문자열 검색으로 정보 찾기
    if (html.includes('place') || html.includes('business')) {
      console.log('🔍 간단한 문자열 검색 시도...');
      
      // 매장명 찾기
      const namePatterns = [
        /"name"\s*:\s*"([^"]+)"/,
        /"title"\s*:\s*"([^"]+)"/,
        /"placeName"\s*:\s*"([^"]+)"/
      ];
      
      for (const pattern of namePatterns) {
        const match = html.match(pattern);
        if (match && match[1] && !match[1].includes('네이버') && !match[1].includes('지도')) {
          result.storeName = match[1];
          console.log('✅ 간단한 검색으로 매장명 발견:', match[1]);
          break;
        }
      }
      
      // 주소 찾기
      const addressMatch = html.match(/"address"\s*:\s*"([^"]+)"/);
      if (addressMatch) {
        result.address = addressMatch[1];
        console.log('✅ 간단한 검색으로 주소 발견:', addressMatch[1]);
      }
      
      // 전화번호 찾기
      const phoneMatch = html.match(/"phone"\s*:\s*"([^"]+)"/);
      if (phoneMatch) {
        result.phone = phoneMatch[1];
        console.log('✅ 간단한 검색으로 전화번호 발견:', phoneMatch[1]);
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
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    
    if (titleMatch) {
      const title = titleMatch[1].trim();
      if (!title.includes('네이버') && !title.includes('지도')) {
        result.storeName = title.split('|')[0].split('-')[0].trim();
        console.log('✅ title 태그에서 매장명 추출:', result.storeName);
      }
    }
    
    if (ogTitleMatch) {
      const ogTitle = ogTitleMatch[1].trim();
      if (!result.storeName && !ogTitle.includes('네이버')) {
        result.storeName = ogTitle;
        console.log('✅ og:title에서 매장명 추출:', result.storeName);
      }
    }
    
    if (ogDescMatch) {
      const desc = ogDescMatch[1];
      console.log('📋 og:description:', desc);
      
      // 주소 패턴 찾기
      const addressMatch = desc.match(/([가-힣]+[시군구]\s+[가-힣\s\d-]+)/);
      if (addressMatch) {
        result.address = addressMatch[1];
        console.log('✅ og:description에서 주소 추출:', result.address);
      }
      
      // 전화번호 패턴 찾기
      const phoneMatch = desc.match(/(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/);
      if (phoneMatch) {
        result.phone = phoneMatch[1];
        console.log('✅ og:description에서 전화번호 추출:', result.phone);
      }
    }
    
  } catch (error) {
    console.log('⚠️ 메타 태그 추출 실패:', error.message);
  }
  
  return result;
}

// 부분 정보라도 추출 시도
function tryPartialExtraction(url) {
  console.log('🔍 부분 정보 추출 시도...');
  
  const result = { method: 'partial_extraction' };
  
  try {
    // URL 경로에서 정보 추출
    const pathMatch = url.match(/\/([^\/\?]+)(?:\?|$)/);
    if (pathMatch) {
      const pathPart = decodeURIComponent(pathMatch[1]);
      if (pathPart.length > 2 && pathPart.length < 50) {
        result.storeName = pathPart.replace(/[^가-힣a-zA-Z0-9\s]/g, '');
        console.log('✅ URL 경로에서 추출:', result.storeName);
      }
    }
    
    // 최소한의 정보라도 제공
    if (!result.storeName) {
      result.storeName = 'URL에서 추출 실패';
    }
    
    result.debugInfo = { 
      message: '부분 정보만 추출됨',
      extractedFrom: 'url_path'
    };
    
  } catch (error) {
    console.log('⚠️ 부분 추출도 실패:', error.message);
    result.storeName = '추출 실패';
  }
  
  return result;
}

// 객체에서 키 리스트로 값 찾기
function extractFromObject(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  
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
