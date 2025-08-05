// Netlify Function - 네이버 정보 추출 (리다이렉트 추적 버전)
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
    console.log('🚀 네이버 크롤링 함수 시작 (리다이렉트 추적 버전)');
    
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

    console.log('🔍 입력 URL:', targetUrl);

    // 1단계: 단축 URL이면 실제 URL로 리다이렉트 추적
    let finalUrl = targetUrl;
    if (targetUrl.includes('naver.me/')) {
      console.log('🔗 단축 URL 감지 - 리다이렉트 추적 시작');
      finalUrl = await followRedirects(targetUrl);
      console.log('🎯 최종 URL:', finalUrl);
    }

    // 2단계: 최종 URL에서 Place ID 추출
    const placeId = extractPlaceId(finalUrl);
    console.log('📍 Place ID:', placeId);

    // 3단계: 여러 방법으로 정보 추출 시도
    let storeInfo = null;

    // 방법 1: 최종 URL에서 HTML 정보 추출
    console.log('🔍 방법 1: 최종 URL HTML 추출...');
    storeInfo = await extractFromHTML(finalUrl);
    
    if (storeInfo && storeInfo.storeName) {
      console.log('✅ HTML 추출 성공!');
    } else {
      // 방법 2: 네이버 API 직접 호출 시도
      if (placeId) {
        console.log('🔍 방법 2: 네이버 API 시도...');
        const apiResult = await tryNaverAPI(placeId);
        if (apiResult && apiResult.storeName) {
          storeInfo = apiResult;
          console.log('✅ 네이버 API 성공!');
        }
      }
    }

    // 방법 3: 메타 태그 정보 추출
    if (!storeInfo || !storeInfo.storeName) {
      console.log('🔍 방법 3: 메타 태그 추출...');
      const metaInfo = await extractFromMetaTags(finalUrl);
      if (metaInfo && metaInfo.storeName) {
        storeInfo = metaInfo;
      }
    }

    console.log('✅ 최종 추출 결과:', storeInfo);

    // 결과 검증
    const isValidData = storeInfo && (storeInfo.storeName || storeInfo.address || storeInfo.phone);
    
    if (!isValidData) {
      throw new Error(`정보 추출 실패. 최종 URL: ${finalUrl}, PlaceID: ${placeId}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          name: storeInfo.storeName || '',
          storeName: storeInfo.storeName || '',
          address: storeInfo.address || '',
          phone: storeInfo.phone || '',
          hours: storeInfo.businessHours || '',
          category: storeInfo.category || '',
          description: storeInfo.description || '',
          extractionMethod: storeInfo.method || 'redirect_follow',
          sourceUrl: finalUrl,
          originalUrl: targetUrl,
          extractedAt: new Date().toISOString(),
          debugInfo: {
            placeId: placeId,
            redirectPath: targetUrl !== finalUrl ? `${targetUrl} → ${finalUrl}` : 'no redirect',
            extractionDetails: storeInfo.debugInfo || {}
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

// 리다이렉트 추적 함수
async function followRedirects(url, maxRedirects = 5) {
  console.log('🔗 리다이렉트 추적 시작:', url);
  
  let currentUrl = url;
  let redirectCount = 0;
  
  while (redirectCount < maxRedirects) {
    try {
      console.log(`🔗 리다이렉트 ${redirectCount + 1}/${maxRedirects}: ${currentUrl}`);
      
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual', // 수동으로 리다이렉트 처리
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        timeout: 10000
      });
      
      console.log(`📡 응답 상태: ${response.status}`);
      
      // 리다이렉트 상태 코드 확인
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          // 상대 URL인 경우 절대 URL로 변환
          if (location.startsWith('/')) {
            const urlObj = new URL(currentUrl);
            currentUrl = `${urlObj.protocol}//${urlObj.host}${location}`;
          } else if (location.startsWith('http')) {
            currentUrl = location;
          } else {
            // 상대 경로 처리
            const urlObj = new URL(currentUrl);
            currentUrl = new URL(location, urlObj.href).href;
          }
          
          console.log(`➡️ 리다이렉트 대상: ${currentUrl}`);
          redirectCount++;
          continue;
        }
      }
      
      // 리다이렉트가 더 이상 없으면 현재 URL 반환
      console.log(`✅ 최종 URL 확정: ${currentUrl}`);
      return currentUrl;
      
    } catch (error) {
      console.log(`⚠️ 리다이렉트 추적 오류: ${error.message}`);
      break;
    }
  }
  
  console.log(`⚠️ 최대 리다이렉트 횟수 초과 또는 오류. 마지막 URL: ${currentUrl}`);
  return currentUrl;
}

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
    
    // p/숫자 패턴 (모바일)
    match = url.match(/\/p\/(\d+)/);
    if (match) {
      console.log('✅ /p/ 패턴으로 Place ID 발견:', match[1]);
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
      `https://m.place.naver.com/place/${placeId}/home`,
      `https://map.naver.com/p/api/place/summary/${placeId}`
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
        
        console.log(`📡 API 응답 상태: ${response.status}`);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('📊 API 응답 키들:', Object.keys(data));
            
            // API 응답에서 정보 추출
            if (data.name || data.title || data.displayName) {
              result.storeName = data.name || data.title || data.displayName;
              console.log('✅ API에서 매장명 추출:', result.storeName);
            }
            if (data.address || data.roadAddress || data.fullAddress) {
              result.address = data.address || data.roadAddress || data.fullAddress;
              console.log('✅ API에서 주소 추출:', result.address);
            }
            if (data.phone || data.tel || data.phoneNumber) {
              result.phone = data.phone || data.tel || data.phoneNumber;
              console.log('✅ API에서 전화번호 추출:', result.phone);
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

// HTML에서 정보 추출
async function extractFromHTML(url) {
  const result = { method: 'html_extraction' };
  
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
    
    // HTML이 충분히 크면 (실제 페이지) 정보 추출 시도
    if (html.length > 5000) {
      console.log('📄 충분한 HTML 컨텐츠 감지 - 정보 추출 시도');
      
      // JSON 데이터 찾기
      const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);
          console.log('✅ __INITIAL_STATE__ 파싱 성공');
          
          result.storeName = extractFromObject(jsonData, ['name', 'title', 'placeName', 'businessName', 'displayName']);
          result.address = extractFromObject(jsonData, ['address', 'roadAddress', 'fullAddress']);
          result.phone = extractFromObject(jsonData, ['phone', 'tel', 'phoneNumber']);
          
          if (result.storeName) {
            console.log('✅ JSON에서 정보 추출 성공');
            return result;
          }
        } catch (parseError) {
          console.log('⚠️ JSON 파싱 실패:', parseError.message);
        }
      }
      
      // 간단한 문자열 검색
      const patterns = [
        { key: 'storeName', patterns: ['placeName', 'name', 'title', 'businessName'] },
        { key: 'address', patterns: ['address', 'roadAddress', 'fullAddress'] },
        { key: 'phone', patterns: ['phone', 'tel', 'phoneNumber'] }
      ];
      
      for (const { key, patterns: searchPatterns } of patterns) {
        for (const pattern of searchPatterns) {
          const regex = new RegExp(`"${pattern}"\\s*:\\s*"([^"]+)"`, 'i');
          const match = html.match(regex);
          if (match && match[1] && !match[1].includes('네이버') && !match[1].includes('지도')) {
            result[key] = match[1];
            console.log(`✅ 문자열 검색으로 ${key} 발견:`, match[1]);
            break;
          }
        }
      }
    } else {
      console.log('📄 HTML이 너무 짧음 (리다이렉트 페이지일 가능성)');
    }
    
  } catch (error) {
    console.log('⚠️ HTML 추출 실패:', error.message);
  }
  
  return result;
}

// 메타 태그에서 정보 추출
async function extractFromMetaTags(url) {
  const result = { method: 'meta_tags' };
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000
    });
    
    const html = await response.text();
    
    // 메타 태그 정보 추출
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i);
    const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
    
    if (titleMatch) {
      const title = titleMatch[1].trim();
      if (!title.includes('네이버') && !title.includes('지도') && title.length > 2) {
        result.storeName = title.split('|')[0].split('-')[0].split('::')[0].trim();
        console.log('✅ title 태그에서 매장명 추출:', result.storeName);
      }
    }
    
    if (ogTitleMatch) {
      const ogTitle = ogTitleMatch[1].trim();
      if (!result.storeName && !ogTitle.includes('네이버') && ogTitle.length > 2) {
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
        console.log('✅ 주소 추출:', result.address);
      }
      
      // 전화번호 패턴 찾기
      const phoneMatch = desc.match(/(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/);
      if (phoneMatch) {
        result.phone = phoneMatch[1];
        console.log('✅ 전화번호 추출:', result.phone);
      }
    }
    
  } catch (error) {
    console.log('⚠️ 메타 태그 추출 실패:', error.message);
  }
  
  return result;
}

// 객체에서 키 리스트로 값 찾기
function extractFromObject(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  
  for (const key of keys) {
    if (obj[key] && typeof obj[key] === 'string' && obj[key].length > 0) {
      return obj[key];
    }
  }
  
  // 중첩 객체 검색
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const result = extractFromObject(value, keys);
      if (result) return result;
    }
  }
  
  return null;
}
