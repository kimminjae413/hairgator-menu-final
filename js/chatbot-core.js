// js/chatbot-core.js - HAIRGATOR v5.0 Core Logic (최종 완성 버전)
// 성별 선택 통합, 스트리밍 응답, 에러 처리 강화

class ChatbotCore {
  constructor(config) {
    this.apiEndpoint = config.apiEndpoint || '/.netlify/functions/chatbot-api';
    this.supabaseUrl = config.supabaseUrl || 'https://bhsbwbeisqzgipvzpvym.supabase.co';
    this.currentLanguage = config.language || 'ko';
    
    this.terms89Map = this.init89TermsMap();
    
    console.log('✅ ChatbotCore 초기화 완료:', {
      apiEndpoint: this.apiEndpoint,
      language: this.currentLanguage
    });
  }

  // ==================== 89용어 매핑 ====================
  init89TermsMap() {
    return {
      '01': { ko: '1 Section & 2 Section', en: '1 Section & 2 Section' },
      '02': { ko: '1Way & 2Way Cut', en: '1Way Cut & 2Way Cut' },
      '03': { ko: '2 Section', en: '2 Section' },
      '04': { ko: '210 Degree Panel Control', en: '210 Degree Panel Control' },
      '05': { ko: 'A Zone & V Zone', en: 'A Zone & V Zone' },
      '06': { ko: 'Angle', en: 'Angle' },
      '07': { ko: 'Asymmetry', en: 'Asymmetry' },
      '08': { ko: 'Bais Cut', en: 'Bais Cut' },
      '09': { ko: 'Balance', en: 'Balance' },
      '10': { ko: 'Base', en: 'Base' },
      '11': { ko: 'Base Control', en: 'Base Control' },
      '12': { ko: 'Base Line', en: 'Base Line' },
      '13': { ko: 'Base Position', en: 'Base Position' },
      '14': { ko: 'Bevel', en: 'Bevel' },
      '15': { ko: 'Bevel Off', en: 'Bevel Off' },
      '16': { ko: 'Block Cut', en: 'Block Cut' },
      '17': { ko: 'Blocking', en: 'Blocking' },
      '18': { ko: 'Blow Dry', en: 'Blow Dry' },
      '19': { ko: 'Blunt Cut', en: 'Blunt Cut' },
      '20': { ko: 'Brick Cut', en: 'Brick Cut' },
      '21': { ko: 'C Curveture', en: 'C Curveture' },
      '22': { ko: 'Channel Cut', en: 'Channel Cut' },
      '23': { ko: 'Clipper Cut', en: 'Clipper Cut' },
      '24': { ko: 'Clipper Over Comb', en: 'Clipper Over Comb' },
      '25': { ko: 'Convex Line & Concave Line', en: 'Convex Line & Concave Line' },
      '26': { ko: 'Corner Off', en: 'Corner Off' },
      '27': { ko: 'Cowlick Parting', en: 'Cowlick Parting' },
      '28': { ko: 'Curved Shape', en: 'Curved Shape' },
      '29': { ko: 'Cut Form', en: 'Cut Form' },
      '30': { ko: 'Degree', en: 'Degree' },
      '31': { ko: 'Design Line', en: 'Design Line' },
      '32': { ko: 'Diffuser', en: 'Diffuser' },
      '33': { ko: 'Direction', en: 'Direction' },
      '34': { ko: 'Disconnection', en: 'Disconnection' },
      '35': { ko: 'Distribution', en: 'Distribution' },
      '36': { ko: 'Elevation', en: 'Elevation' },
      '37': { ko: 'Face Line', en: 'Face Line' },
      '38': { ko: 'Face Shape', en: 'Face Shape' },
      '39': { ko: "Finger's Angle", en: "Finger's Angle" },
      '40': { ko: 'Form', en: 'Form' },
      '41': { ko: 'Freehands Cut', en: 'Freehands Cut' },
      '42': { ko: 'Fringe', en: 'Fringe' },
      '43': { ko: 'Geometric Shape', en: 'Geometric Shape' },
      '44': { ko: 'Graduation', en: 'Graduation' },
      '45': { ko: 'Graduation & Layer', en: 'Graduation & Layer' },
      '46': { ko: 'Hairstyle Classification', en: 'Hairstyle Classification' },
      '47': { ko: 'Head Point', en: 'Head Point' },
      '48': { ko: 'Head Position', en: 'Head Position' },
      '49': { ko: 'Hemline', en: 'Hemline' },
      '50': { ko: 'Image Cycle On & On', en: 'Image Cycle On & On' },
      '51': { ko: 'Inner Length', en: 'Inner Length' },
      '52': { ko: 'Layer', en: 'Layer' },
      '53': { ko: 'Layer & Weight', en: 'Layer & Weight' },
      '54': { ko: 'Lifting', en: 'Lifting' },
      '55': { ko: 'Natural Inversion', en: 'Natural Inversion' },
      '56': { ko: 'Natural Parting', en: 'Natural Parting' },
      '57': { ko: 'Occipital Bone', en: 'Occipital Bone' },
      '58': { ko: 'One Finger Projection', en: 'One Finger Projection' },
      '59': { ko: 'One Length', en: 'One Length' },
      '60': { ko: 'Outline Long Form', en: 'Outline Long Form' },
      '61': { ko: 'Outline Medium Form', en: 'Outline Medium Form' },
      '62': { ko: 'Over Direction', en: 'Over Direction' },
      '63': { ko: 'Panel', en: 'Panel' },
      '64': { ko: 'Perimeter Line', en: 'Perimeter Line' },
      '65': { ko: 'Personalizing', en: 'Personalizing' },
      '66': { ko: 'Proportion', en: 'Proportion' },
      '67': { ko: 'Recession Area', en: 'Recession Area' },
      '68': { ko: 'Recession Type', en: 'Recession Type' },
      '69': { ko: 'Scissor Over Comb', en: 'Scissor Over Comb' },
      '70': { ko: 'Section', en: 'Section' },
      '71': { ko: 'Section Application', en: 'Section Application' },
      '72': { ko: 'Section Control', en: 'Section Control' },
      '73': { ko: 'Section Off', en: 'Section Off' },
      '74': { ko: 'Separation', en: 'Separation' },
      '75': { ko: 'Silhouette', en: 'Silhouette' },
      '76': { ko: 'Skull Structure', en: 'Skull Structure' },
      '77': { ko: 'Style Form', en: 'Style Form' },
      '78': { ko: 'Subsequent Section', en: 'Subsequent Section' },
      '79': { ko: 'Symmetry', en: 'Symmetry' },
      '80': { ko: 'Temple Area', en: 'Temple Area' },
      '81': { ko: 'Texturizing', en: 'Texturizing' },
      '82': { ko: 'Texturizing Zone', en: 'Texturizing Zone' },
      '83': { ko: 'Trimming', en: 'Trimming' },
      '84': { ko: 'Under Cut', en: 'Under Cut' },
      '85': { ko: 'Visual Balance', en: 'Visual Balance' },
      '86': { ko: 'Volume', en: 'Volume' },
      '87': { ko: 'Volume Location by Section', en: 'Volume Location by Section' },
      '88': { ko: 'Weight Sit Area', en: 'Weight Sit Area' },
      '89': { ko: 'Zone', en: 'Zone' }
    };
  }

  // ==================== API 통신 ====================

  /**
   * 이미지 분석 API 호출
   * @param {string} base64Image - Base64 인코딩된 이미지
   * @param {string} mimeType - MIME 타입 (예: 'image/jpeg')
   * @param {string} userGender - 사용자가 선택한 성별 ('male' | 'female')
   * @returns {Promise<Object>} 분석 결과 (56개 파라미터)
   */
  async analyzeImage(base64Image, mimeType, userGender = null) {
    try {
      console.log('📤 이미지 분석 요청:', {
        imageSize: base64Image.length,
        mimeType: mimeType,
        userGender: userGender
      });

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_image',
          payload: { 
            image_base64: base64Image,
            mime_type: mimeType || 'image/jpeg',
            user_gender: userGender  // ⭐ 성별 정보 전달
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 이미지 분석 응답:', result);

      if (!result.success) {
        throw new Error(result.error || '이미지 분석 실패');
      }

      return result.data;

    } catch (error) {
      console.error('❌ 이미지 분석 오류:', error);
      throw new Error(`이미지 분석 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * 레시피 생성 API 호출 (스트리밍)
   * @param {Object} params56 - 56개 파라미터
   * @param {string} language - 언어 코드 ('ko' | 'en' | 'ja' | 'zh' | 'vi')
   * @param {Function} onProgress - 스트리밍 진행 콜백
   * @returns {Promise<Object>} 생성된 레시피
   */
  async generateRecipe(params56, language = 'ko', onProgress = null) {
    try {
      console.log('📤 레시피 생성 요청:', { 
        params56: params56, 
        language: language 
      });
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_recipe_stream',
          payload: {
            params56: params56,
            language: language
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 스트리밍 응답 처리
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let recipe = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ 스트리밍 완료');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 완전한 JSON 객체를 찾아서 파싱
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6); // 'data: ' 제거
            
            if (jsonStr === '[DONE]') {
              console.log('✅ 스트리밍 종료 신호 수신');
              break;
            }

            try {
              const data = JSON.parse(jsonStr);
              
              if (data.type === 'content') {
                recipe += data.content;
                
                // 진행 상황 콜백 호출
                if (onProgress && typeof onProgress === 'function') {
                  onProgress(recipe);
                }
              } else if (data.type === 'error') {
                throw new Error(data.error || '레시피 생성 중 오류 발생');
              }
            } catch (parseError) {
              console.warn('⚠️ JSON 파싱 실패:', parseError, 'Line:', jsonStr);
            }
          }
        }
      }

      console.log('📥 최종 레시피 길이:', recipe.length);

      return {
        success: true,
        data: { 
          recipe: recipe,
          params56: params56
        }
      };

    } catch (error) {
      console.error('❌ 레시피 생성 오류:', error);
      throw new Error(`레시피 생성 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * 스타일 검색 API 호출
   * @param {string} query - 검색 쿼리
   * @returns {Promise<Array>} 검색된 스타일 목록
   */
  async searchStyles(query) {
    try {
      console.log('🔍 스타일 검색 요청:', query);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search_styles',
          payload: { query: query }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '검색 실패');
      }

      console.log('📥 검색 결과:', result.data?.length || 0, '개');
      return result.data || [];

    } catch (error) {
      console.error('❌ 스타일 검색 오류:', error);
      throw new Error(`스타일 검색 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  /**
   * 텍스트 응답 생성 API 호출 (스트리밍 지원)
   * @param {string} query - 사용자 질문
   * @param {Array} searchResults - 검색 결과 (선택)
   * @param {Function} onProgress - 스트리밍 진행 콜백
   * @returns {Promise<string>} 생성된 응답
   */
  async generateResponse(query, searchResults = [], onProgress = null) {
    try {
      console.log('💬 응답 생성 요청 (스트리밍):', query);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_response_stream', // 스트리밍 액션으로 변경
          payload: {
            user_query: query,
            search_results: searchResults,
            language: this.currentLanguage
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 스트리밍 응답 처리
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ 응답 스트리밍 완료');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 완전한 JSON 객체를 찾아서 파싱
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6); // 'data: ' 제거
            
            if (jsonStr === '[DONE]') {
              console.log('✅ 스트리밍 종료 신호 수신');
              break;
            }

            try {
              const data = JSON.parse(jsonStr);
              
              if (data.type === 'content') {
                fullResponse += data.content;
                
                // 진행 상황 콜백 호출
                if (onProgress && typeof onProgress === 'function') {
                  onProgress(fullResponse);
                }
              } else if (data.type === 'error') {
                throw new Error(data.error || '응답 생성 중 오류 발생');
              }
            } catch (parseError) {
              console.warn('⚠️ JSON 파싱 실패:', parseError, 'Line:', jsonStr);
            }
          }
        }
      }

      console.log('📥 응답 생성 완료 (길이: ' + fullResponse.length + ')');
      return fullResponse;

    } catch (error) {
      console.error('❌ 응답 생성 오류:', error);
      throw new Error(`응답 생성 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  // ==================== 데이터 처리 ====================

  /**
   * 56개 파라미터를 HTML 포맷으로 변환
   * @param {Object} analysisData - 분석 데이터
   * @returns {string} HTML 문자열
   */
  formatParameters(analysisData) {
    const lines = [];
    const params56 = analysisData.parameters_56 || analysisData;
    const langTerms = this.getTerms(this.currentLanguage);

    lines.push('<div class="analysis-result">');
    lines.push('<h3>📊 분석 완료</h3>');
    lines.push('<div class="params-section">');
    lines.push('<ul>');
    
    // 1. 길이 카테고리
    if (params56.length_category) {
      const lengthDesc = langTerms.lengthDesc[params56.length_category] || params56.length_category;
      lines.push(`<li>📏 <strong>길이</strong>: ${params56.length_category} (${lengthDesc})</li>`);
    }
    
    // 2. 컷 형태
    if (params56.cut_form) {
      const formCode = params56.cut_form.charAt(0);
      const formDesc = langTerms.formDesc[formCode] || params56.cut_form;
      lines.push(`<li>✂️ <strong>형태</strong>: ${params56.cut_form} - ${formDesc}</li>`);
    }
    
    // 3. 볼륨 존
    if (params56.volume_zone) {
      const volumeDesc = langTerms.volume[params56.volume_zone] || params56.volume_zone;
      lines.push(`<li>📐 <strong>볼륨</strong>: ${params56.volume_zone} (${volumeDesc})</li>`);
    }
    
    // 4. 리프팅 범위
    if (params56.lifting_range && params56.lifting_range.length > 0) {
      const liftingDesc = params56.lifting_range.map(l => {
        const desc = langTerms.lifting[l] || l;
        return `${l} (${desc})`;
      }).join(', ');
      lines.push(`<li>🎯 <strong>리프팅</strong>: ${liftingDesc}</li>`);
    }
    
    // 5. 앞머리 타입
    if (params56.fringe_type && params56.fringe_type !== 'No Fringe') {
      const fringeDesc = langTerms.fringeType[params56.fringe_type] || params56.fringe_type;
      lines.push(`<li>👤 <strong>앞머리</strong>: ${params56.fringe_type} (${fringeDesc})</li>`);
    }
    
    // 6. 모질
    if (params56.hair_texture) {
      lines.push(`<li>🧵 <strong>모질</strong>: ${params56.hair_texture}</li>`);
    }
    
    // 7. 얼굴형 매칭
    if (params56.face_shape_match) {
      const faceShapes = Array.isArray(params56.face_shape_match) 
        ? params56.face_shape_match 
        : [params56.face_shape_match];
      
      const faceShapeNames = {
        'Oval': '계란형',
        'Round': '둥근형',
        'Square': '사각형',
        'Heart': '하트형',
        'Long': '긴 얼굴형',
        'Diamond': '다이아몬드형'
      };
      
      const faceShapeList = faceShapes.map(shape => {
        const koreanName = faceShapeNames[shape] || shape;
        return `${shape} (${koreanName})`;
      }).join(', ');
      
      lines.push(`<li>😊 <strong>추천 얼굴형</strong>: ${faceShapeList}</li>`);
    }

    lines.push(`</ul>`);
    lines.push('</div>');
    lines.push('</div>');

    return lines.join('');
  }

  /**
   * 마크다운을 HTML로 변환 (89용어 하이라이트 포함)
   * @param {string} markdown - 마크다운 텍스트
   * @returns {string} HTML 문자열
   */
  parseMarkdownWithHighlight(markdown) {
    if (!markdown) return '';

    // 1. 코드 블록 보호
    const codeBlocks = [];
    let html = markdown.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${this.escapeHtml(code.trim())}</code></pre>`);
      return placeholder;
    });

    // 2. 헤더 변환 (STEP 형식 우선)
    html = html.replace(/^###(\d)\.\s*(.+)$/gm, (match, num, title) => {
      return `<h3 class="recipe-step">STEP ${num}. ${title}</h3>`;
    });
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 3. 89용어 하이라이트
    html = this.highlight89Terms(html);

    // 4. 볼드, 이탤릭, 인라인 코드
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // 5. 리스트 처리
    const lines = html.split('\n');
    const result = [];
    let inList = false;

    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (trimmed.match(/^[-*•]\s+/)) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        const content = trimmed.replace(/^[-*•]\s+/, '');
        result.push(`<li>${content}</li>`);
      } 
      else if (trimmed === '') {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
      }
      else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        
        // 헤더나 코드 블록이 아닌 경우만 p 태그로 감싸기
        if (!trimmed.startsWith('<h') && !trimmed.startsWith('___CODE_BLOCK_')) {
          result.push(`<p class="recipe-text">${trimmed}</p>`);
        } else {
          result.push(trimmed);
        }
      }
    });

    if (inList) {
      result.push('</ul>');
    }

    html = result.join('\n');

    // 6. 코드 블록 복원
    codeBlocks.forEach((block, index) => {
      html = html.replace(`___CODE_BLOCK_${index}___`, block);
    });

    // 7. 화살표 스타일링
    html = html.replace(/→/g, '<span class="arrow">→</span>');

    return html;
  }

  /**
   * 89용어 자동 하이라이트
   * @param {string} text - 원본 텍스트
   * @returns {string} 하이라이트된 텍스트
   */
  highlight89Terms(text) {
    if (!text || typeof text !== 'string') return text;

    let result = text;

    // 1. 번호.용어명 패턴 (예: "52.Layer")
    result = result.replace(/(\d{1,2})\.([\w\s&'-]+?)(?=[\s,.:;)]|$)/g, (match, id, termName) => {
      const paddedId = id.padStart(2, '0');
      const term = this.terms89Map[paddedId];
      
      if (term) {
        return `<span class="term-89 clickable" data-term="${paddedId}" title="클릭하여 색인 보기">${id}.${termName}</span>`;
      }
      return match;
    });

    // 2. 용어명 단독 패턴
    Object.entries(this.terms89Map).forEach(([id, term]) => {
      const koTerm = term.ko;
      const enTerm = term.en;

      const regex = new RegExp(`(?<!<span[^>]*>)\\b(${koTerm}|${enTerm})\\b(?![^<]*<\\/span>)`, 'gi');
      
      result = result.replace(regex, (match) => {
        // 이미 하이라이트된 경우 스킵
        if (result.includes(`>${match}</span>`)) return match;
        
        return `<span class="term-89 clickable" data-term="${id}" title="클릭하여 색인 보기">${match} <span class="term-ref">(${id}번 참고)</span></span>`;
      });
    });

    return result;
  }

  /**
   * 유효한 스타일만 필터링
   * @param {Array} styles - 스타일 목록
   * @returns {Array} 필터링된 스타일 목록
   */
  filterValidStyles(styles) {
    if (!styles || !Array.isArray(styles)) return [];

    return styles.filter(style => {
      // 유효한 이미지 URL 체크
      const hasValidImage = style.main_image_url && 
                           !style.main_image_url.includes('hairgatorchatbot') &&
                           !style.main_image_url.includes('temp') &&
                           !style.main_image_url.includes('supabase.co/storage');
      
      return hasValidImage;
    });
  }

  // ==================== 유틸리티 ====================

  /**
   * 파일을 Base64로 변환
   * @param {File} file - 파일 객체
   * @returns {Promise<string>} Base64 문자열
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * HTML 특수문자 이스케이프
   * @param {string} text - 원본 텍스트
   * @returns {string} 이스케이프된 텍스트
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * 언어별 용어 정의 가져오기
   * @param {string} lang - 언어 코드
   * @returns {Object} 용어 정의 객체
   */
  getTerms(lang) {
    const terms = {
      ko: {
        lengthDesc: {
          'A Length': '가슴 아래 밑선',
          'B Length': '가슴 상단~중간',
          'C Length': '쇄골 밑선',
          'D Length': '어깨선',
          'E Length': '어깨 위 5cm',
          'F Length': '턱 아래',
          'G Length': '턱선',
          'H Length': '귀 중간'
        },
        formDesc: {
          'O': 'One Length - 단일 길이로 무게감 있는 스타일',
          'G': 'Graduation - 점진적인 레이어로 볼륨감',
          'L': 'Layer - 자유로운 레이어로 경쾌한 느낌'
        },
        volume: {
          'Low': '0~44° (낮은 볼륨)',
          'Medium': '45~89° (중간 볼륨)',
          'High': '90°+ (높은 볼륨)'
        },
        lifting: {
          'L0': '0° (자연 낙하)',
          'L1': '22.5° (약간 들어올림)',
          'L2': '45° (중간 들어올림)',
          'L3': '67.5° (중강 들어올림)',
          'L4': '90° (수직)',
          'L5': '112.5° (역방향 시작)',
          'L6': '135° (역방향)',
          'L7': '157.5° (강한 역방향)',
          'L8': '180° (완전 역방향)'
        },
        fringeType: {
          'Heavy Fringe': '무거운 앞머리',
          'Light Fringe': '가벼운 앞머리',
          'Side-Swept Fringe': '옆으로 넘긴 앞머리',
          'Curtain Fringe': '커튼 앞머리',
          'No Fringe': '앞머리 없음'
        }
      },
      en: {
        lengthDesc: {
          'A Length': 'Below chest baseline',
          'B Length': 'Upper to mid chest',
          'C Length': 'Below collarbone',
          'D Length': 'Shoulder line',
          'E Length': '5cm above shoulder',
          'F Length': 'Below chin',
          'G Length': 'Chin line',
          'H Length': 'Mid-ear'
        },
        formDesc: {
          'O': 'One Length - Solid, weighty style',
          'G': 'Graduation - Gradual layers with volume',
          'L': 'Layer - Free-flowing layers with movement'
        },
        volume: {
          'Low': '0~44° (Low volume)',
          'Medium': '45~89° (Medium volume)',
          'High': '90°+ (High volume)'
        },
        lifting: {
          'L0': '0° (Natural fall)',
          'L1': '22.5° (Slight lift)',
          'L2': '45° (Medium lift)',
          'L3': '67.5° (Moderate lift)',
          'L4': '90° (Vertical)',
          'L5': '112.5° (Reverse start)',
          'L6': '135° (Reverse)',
          'L7': '157.5° (Strong reverse)',
          'L8': '180° (Full reverse)'
        },
        fringeType: {
          'Heavy Fringe': 'Heavy fringe',
          'Light Fringe': 'Light fringe',
          'Side-Swept Fringe': 'Side-swept fringe',
          'Curtain Fringe': 'Curtain fringe',
          'No Fringe': 'No fringe'
        }
      }
    };
    
    return terms[lang] || terms.ko;
  }

  /**
   * 에러 메시지를 사용자 친화적으로 변환
   * @param {Error} error - 에러 객체
   * @returns {string} 사용자 친화적 에러 메시지
   */
  getFriendlyErrorMessage(error) {
    const message = error.message || error.toString();

    if (message.includes('Network') || message.includes('fetch')) {
      return '네트워크 연결을 확인해주세요.';
    }
    if (message.includes('timeout')) {
      return '요청 시간이 초과되었습니다. 다시 시도해주세요.';
    }
    if (message.includes('401') || message.includes('403')) {
      return '인증에 실패했습니다.';
    }
    if (message.includes('500')) {
      return '서버에 일시적인 문제가 발생했습니다.';
    }

    return message;
  }
}

// ES6 모듈 export
export { ChatbotCore };

console.log('✅ HAIRGATOR ChatbotCore v5.0 최종 버전 로드 완료');
