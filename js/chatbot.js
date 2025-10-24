// js/chatbot.js - HAIRGATOR v2.0
// 89용어 통합 + 새 레시피 포맷(###1~###7) + 스트리밍 지원

class HairGatorChatbot {
  constructor() {
    this.apiEndpoint = '/.netlify/functions/chatbot-api';
    this.supabaseUrl = 'https://bhsbwbeisqzgipvzpvym.supabase.co';
    this.isOpen = false;
    this.conversationHistory = [];
    this.currentLanguage = 'ko';
    this.terms89Map = this.init89TermsMap(); // 89용어 매핑
    this.init();
  }

  // 89용어 매핑 테이블 (하이라이팅용)
  init89TermsMap() {
    return {
      // Tier 1: 필수 핵심 15개
      '01': { ko: '1 Section & 2 Section', en: '1 Section & 2 Section' },
      '02': { ko: '1Way & 2Way Cut', en: '1Way & 2Way Cut' },
      '05': { ko: 'A Zone & V Zone', en: 'A Zone & V Zone' },
      '11': { ko: 'Base Control', en: 'Base Control' },
      '19': { ko: 'Blunt Cut', en: 'Blunt Cut' },
      '31': { ko: 'Design Line', en: 'Design Line' },
      '33': { ko: 'Direction', en: 'Direction' },
      '35': { ko: 'Distribution', en: 'Distribution' },
      '44': { ko: 'Graduation', en: 'Graduation' },
      '52': { ko: 'Layer', en: 'Layer' },
      '54': { ko: 'Lifting', en: 'Lifting' },
      '62': { ko: 'Over Direction', en: 'Over Direction' },
      '70': { ko: 'Section', en: 'Section' },
      '86': { ko: 'Volume', en: 'Volume' },
      '89': { ko: 'Zone', en: 'Zone' },
      
      // Tier 2: 고급 기법 25개
      '04': { ko: '210 Degree Panel Control', en: '210 Degree Panel Control' },
      '06': { ko: 'Angle', en: 'Angle' },
      '20': { ko: 'Brick Cut', en: 'Brick Cut' },
      '22': { ko: 'Channel Cut', en: 'Channel Cut' },
      '23': { ko: 'Clipper Cut', en: 'Clipper Cut' },
      '24': { ko: 'Clipper Over Comb', en: 'Clipper Over Comb' },
      '29': { ko: 'Cut Form', en: 'Cut Form' },
      '34': { ko: 'Disconnection', en: 'Disconnection' },
      '36': { ko: 'Elevation', en: 'Elevation' },
      '38': { ko: 'Face Shape', en: 'Face Shape' },
      '41': { ko: 'Freehands Cut', en: 'Freehands Cut' },
      '42': { ko: 'Fringe', en: 'Fringe' },
      '45': { ko: 'Graduation & Layer', en: 'Graduation & Layer' },
      '51': { ko: 'Inner Length', en: 'Inner Length' },
      '53': { ko: 'Layer & Weight', en: 'Layer & Weight' },
      '59': { ko: 'One Length', en: 'One Length' },
      '60': { ko: 'Outline Long Form', en: 'Outline Long Form' },
      '61': { ko: 'Outline Medium Form', en: 'Outline Medium Form' },
      '75': { ko: 'Silhouette', en: 'Silhouette' },
      '76': { ko: 'Skull Structure', en: 'Skull Structure' },
      '81': { ko: 'Texturizing', en: 'Texturizing' },
      '82': { ko: 'Texturizing Zone', en: 'Texturizing Zone' },
      '84': { ko: 'Under Cut', en: 'Under Cut' },
      '88': { ko: 'Weight Sit Area', en: 'Weight Sit Area' },
      
      // 추가 용어들 (필요시 확장)
      '09': { ko: 'Balance', en: 'Balance' },
      '47': { ko: 'Head Point', en: 'Head Point' },
      '49': { ko: 'Hemline', en: 'Hemline' },
      '64': { ko: 'Perimeter Line', en: 'Perimeter Line' },
      '87': { ko: 'Volume Location', en: 'Volume Location' }
    };
  }

  init() {
    this.createChatbotUI();
    this.attachEventListeners();
    this.initKeyboardHandler();
  }

  // 다국어 텍스트
  getTexts() {
    const texts = {
      ko: {
        title: '✂️ AI 커트 레시피',
        welcome: '헤어스타일 이미지를 업로드하거나 질문해주세요',
        analyzing: '📊 이미지 분석 중...',
        generating: '✂️ 커트 레시피 생성 중...',
        placeholder: '헤어스타일 검색...',
        indexTitle: '📑 색인',
        errorSize: '⚠️ 이미지 크기는 5MB 이하여야 합니다.',
        errorType: '⚠️ 이미지 파일만 업로드 가능합니다.'
      },
      en: {
        title: '✂️ AI Cut Recipe',
        welcome: 'Upload a hairstyle image or ask a question',
        analyzing: '📊 Analyzing image...',
        generating: '✂️ Generating cut recipe...',
        placeholder: 'Search hairstyle...',
        indexTitle: '📑 Index',
        errorSize: '⚠️ Image size must be under 5MB.',
        errorType: '⚠️ Only image files are allowed.'
      },
      ja: {
        title: '✂️ AIカットレシピ',
        welcome: 'ヘアスタイル画像をアップロードするか質問してください',
        analyzing: '📊 画像分析中...',
        generating: '✂️ カットレシピ生成中...',
        placeholder: 'ヘアスタイル検索...',
        indexTitle: '📑 索引',
        errorSize: '⚠️ 画像サイズは5MB以下である必要があります。',
        errorType: '⚠️ 画像ファイルのみアップロード可能です。'
      },
      zh: {
        title: '✂️ AI剪发配方',
        welcome: '上传发型图片或提问',
        analyzing: '📊 正在分析图片...',
        generating: '✂️ 正在生成剪发配方...',
        placeholder: '搜索发型...',
        indexTitle: '📑 索引',
        errorSize: '⚠️ 图片大小必须小于5MB。',
        errorType: '⚠️ 仅允许上传图片文件。'
      },
      vi: {
        title: '✂️ Công Thức Cắt Tóc AI',
        welcome: 'Tải lên hình ảnh kiểu tóc hoặc đặt câu hỏi',
        analyzing: '📊 Đang phân tích hình ảnh...',
        generating: '✂️ Đang tạo công thức cắt...',
        placeholder: 'Tìm kiếm kiểu tóc...',
        indexTitle: '📑 Mục lục',
        errorSize: '⚠️ Kích thước hình ảnh phải dưới 5MB.',
        errorType: '⚠️ Chỉ cho phép tải lên tệp hình ảnh.'
      }
    };
    return texts[this.currentLanguage] || texts.ko;
  }

  createChatbotUI() {
    const texts = this.getTexts();
    const chatbotHTML = `
      <button id="chatbot-toggle" class="chatbot-toggle" aria-label="AI 헤어 상담">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <div id="chatbot-container" class="chatbot-container">
        <div class="chatbot-header">
          <span class="chatbot-title" id="chatbot-title">${texts.title}</span>
          <div class="header-actions">
            <!-- 언어 선택 버튼 -->
            <div class="language-selector">
              <button id="language-btn" class="language-btn" title="Language">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
              </button>
              <div id="language-dropdown" class="language-dropdown hidden">
                <button class="lang-option" data-lang="ko">🇰🇷 한국어</button>
                <button class="lang-option" data-lang="en">🇺🇸 English</button>
                <button class="lang-option" data-lang="ja">🇯🇵 日本語</button>
                <button class="lang-option" data-lang="zh">🇨🇳 中文</button>
                <button class="lang-option" data-lang="vi">🇻🇳 Tiếng Việt</button>
              </div>
            </div>
            <button id="chatbot-close" class="chatbot-close" aria-label="닫기">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div id="chatbot-messages" class="chatbot-messages">
          <div class="bot-message">
            <div class="message-content" id="welcome-message">
              <p><strong>HAIR Recipe v2.0</strong></p>
              <p id="welcome-text">${texts.welcome}</p>
              <p style="font-size:0.85em;opacity:0.7;">✨ 89용어 시스템 적용</p>
            </div>
          </div>
        </div>

        <div class="chatbot-input-area">
          <input type="file" id="image-upload" accept="image/*" style="display: none;">
          
          <div class="input-wrapper">
            <button id="upload-btn" class="upload-btn" title="이미지 업로드">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </button>
            
            <input 
              type="text" 
              id="chatbot-input" 
              placeholder="${texts.placeholder}" 
              autocomplete="off"
            >
            
            <!-- 색인 버튼 -->
            <button id="index-btn" class="index-btn" title="색인 보기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>

            <button id="send-btn" class="send-btn" title="전송">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 색인 모달 -->
      <div id="index-modal" class="index-modal hidden">
        <div class="index-modal-overlay" id="index-modal-overlay"></div>
        <div class="index-modal-content">
          <div class="index-modal-header">
            <h3 id="index-modal-title">${texts.indexTitle}</h3>
            <button id="index-modal-close" class="index-close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div id="index-content" class="index-content">
            <p>색인 파일을 로드하는 중...</p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  }

  attachEventListeners() {
    document.getElementById('chatbot-toggle').addEventListener('click', () => {
      this.toggleChatbot();
    });

    document.getElementById('chatbot-close').addEventListener('click', () => {
      this.toggleChatbot();
    });

    document.getElementById('upload-btn').addEventListener('click', () => {
      document.getElementById('image-upload').click();
    });

    document.getElementById('image-upload').addEventListener('change', (e) => {
      this.handleImageUpload(e.target.files[0]);
    });

    document.getElementById('send-btn').addEventListener('click', () => {
      this.handleTextMessage();
    });

    document.getElementById('chatbot-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleTextMessage();
      }
    });

    // 언어 선택
    document.getElementById('language-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = document.getElementById('language-dropdown');
      dropdown.classList.toggle('hidden');
    });

    // 언어 옵션 클릭
    document.querySelectorAll('.lang-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lang = e.currentTarget.getAttribute('data-lang');
        this.changeLanguage(lang);
        document.getElementById('language-dropdown').classList.add('hidden');
      });
    });

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', () => {
      document.getElementById('language-dropdown').classList.add('hidden');
    });

    // 색인 버튼
    document.getElementById('index-btn').addEventListener('click', () => {
      this.showIndexModal();
    });

    // 색인 모달 닫기
    document.getElementById('index-modal-close').addEventListener('click', () => {
      this.hideIndexModal();
    });

    document.getElementById('index-modal-overlay').addEventListener('click', () => {
      this.hideIndexModal();
    });
  }

  changeLanguage(lang) {
    this.currentLanguage = lang;
    const texts = this.getTexts();
    
    document.getElementById('chatbot-title').textContent = texts.title;
    document.getElementById('welcome-text').textContent = texts.welcome;
    document.getElementById('chatbot-input').placeholder = texts.placeholder;
    document.getElementById('index-modal-title').textContent = texts.indexTitle;
  }

  showIndexModal() {
    document.getElementById('index-modal').classList.remove('hidden');
    this.loadIndexContent();
  }

  hideIndexModal() {
    document.getElementById('index-modal').classList.add('hidden');
  }

  async loadIndexContent() {
    const indexContent = document.getElementById('index-content');
    
    try {
      const response = await fetch('/hairgator-index.json');
      const indexData = await response.json();
      
      let html = '<div class="index-list">';
      
      Object.entries(indexData).forEach(([category, items]) => {
        html += `<div class="index-category">`;
        html += `<h4>${category}</h4>`;
        html += `<ul>`;
        
        items.forEach(item => {
          html += `<li><a href="#${item.code}">${item.name}</a></li>`;
        });
        
        html += `</ul></div>`;
      });
      
      html += '</div>';
      indexContent.innerHTML = html;
      
    } catch (error) {
      console.error('색인 로드 실패:', error);
      indexContent.innerHTML = '<p>색인을 로드할 수 없습니다.</p>';
    }
  }

  initKeyboardHandler() {
    if (!window.visualViewport) return;

    let originalHeight = window.innerHeight;
    let keyboardOpen = false;

    window.visualViewport.addEventListener('resize', () => {
      const currentHeight = window.visualViewport.height;
      const container = document.getElementById('chatbot-container');
      
      if (!container) return;

      if (currentHeight < originalHeight * 0.75) {
        if (!keyboardOpen) {
          keyboardOpen = true;
          container.style.height = `${currentHeight}px`;
          container.style.top = `${window.visualViewport.offsetTop}px`;
        }
      } else {
        if (keyboardOpen) {
          keyboardOpen = false;
          container.style.height = '';
          container.style.top = '';
        }
      }
    });
  }

  toggleChatbot() {
    const container = document.getElementById('chatbot-container');
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      container.classList.add('active');
      document.getElementById('chatbot-input').focus();
    } else {
      container.classList.remove('active');
    }
  }

  async handleImageUpload(file) {
    if (!file) return;

    const texts = this.getTexts();

    if (file.size > 5 * 1024 * 1024) {
      alert(texts.errorSize);
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert(texts.errorType);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target.result;
      
      this.addMessage('user', `<img src="${imageDataUrl}" alt="업로드된 이미지" class="uploaded-image">`);
      this.addMessage('bot', texts.analyzing);

      try {
        const base64Data = imageDataUrl.split(',')[1];
        
        const analysisResponse = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'analyze_image',
            payload: { image_data: base64Data }
          })
        });

        const analysisResult = await analysisResponse.json();

        if (!analysisResult.success) {
          this.replaceLastBotMessage('❌ 이미지 분석에 실패했습니다.');
          return;
        }

        const params56 = analysisResult.data.parameters_56;
        const formula42 = analysisResult.data.formula_42;

        this.replaceLastBotMessage(this.formatParameters(params56));

        // 새로운 스트리밍 레시피 생성
        await this.generateRecipeWithStream(formula42, params56);

      } catch (error) {
        console.error('이미지 분석 오류:', error);
        this.replaceLastBotMessage('오류가 발생했습니다. 다시 시도해주세요.');
      }
    };

    reader.readAsDataURL(file);
  }

  // 🆕 스트리밍 레시피 생성 (새 포맷 ###1~###7)
  async generateRecipeWithStream(formula42, params56) {
    const texts = this.getTexts();
    
    // 레시피 생성 시작 메시지
    this.addMessage('bot', texts.generating);
    const messages = document.querySelectorAll('.bot-message');
    const recipeMessageDiv = messages[messages.length - 1];
    const contentDiv = recipeMessageDiv.querySelector('.message-content');

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_recipe_stream',
          payload: {
            formula_42: formula42,
            parameters_56: params56
          }
        })
      });

      if (!response.ok) {
        throw new Error('레시피 생성 실패');
      }

      // 스트리밍 응답 처리
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      contentDiv.innerHTML = '<div class="recipe-streaming"></div>';
      const streamingDiv = contentDiv.querySelector('.recipe-streaming');

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // 실시간 렌더링 (89용어 하이라이팅 적용)
        streamingDiv.innerHTML = this.parseNewRecipeFormat(accumulatedText);
        this.scrollToBottom();
      }

      // 최종 렌더링
      contentDiv.innerHTML = this.parseNewRecipeFormat(accumulatedText);
      this.scrollToBottom();

    } catch (error) {
      console.error('레시피 생성 오류:', error);
      contentDiv.innerHTML = '레시피 생성 중 오류가 발생했습니다.';
    }
  }

  // 🆕 새 레시피 포맷 파싱 (###1~###7)
  parseNewRecipeFormat(text) {
    if (!text) return '<p>레시피 생성 중...</p>';

    let html = '<div class="recipe-v2">';

    // ###1 ~ ###7 섹션 분리
    const sectionPattern = /###(\d+)\.\s*([^\n]+)\n([\s\S]*?)(?=###\d+\.|$)/g;
    const sections = [];
    let match;

    while ((match = sectionPattern.exec(text)) !== null) {
      sections.push({
        number: match[1],
        title: match[2].trim(),
        content: match[3].trim()
      });
    }

    if (sections.length === 0) {
      // 아직 섹션이 생성되지 않았을 때
      html += `<div class="recipe-section"><p>${this.highlight89Terms(text)}</p></div>`;
    } else {
      // 섹션별 렌더링
      sections.forEach(section => {
        const sectionClass = this.getSectionClass(section.number);
        html += `
          <div class="recipe-section ${sectionClass}">
            <h3 class="section-title">
              <span class="section-number">###${section.number}</span>
              ${section.title}
            </h3>
            <div class="section-content">
              ${this.parseMarkdown(this.highlight89Terms(section.content))}
            </div>
          </div>
        `;
      });
    }

    html += '</div>';
    return html;
  }

  // 섹션별 CSS 클래스
  getSectionClass(sectionNumber) {
    const classMap = {
      '1': 'style-description',
      '2': 'style-length',
      '3': 'style-form',
      '4': 'fringe-length',
      '5': 'base-cut',
      '6': 'texturizing',
      '7': 'styling'
    };
    return classMap[sectionNumber] || '';
  }

  // 🆕 89용어 하이라이팅
  highlight89Terms(text) {
    if (!text) return '';

    // 89용어 패턴 매칭 (예: 70.Section, 54.Lifting, L4, D0 등)
    let highlighted = text;

    // 용어 번호 패턴 (01~89)
    Object.keys(this.terms89Map).forEach(termNum => {
      const termInfo = this.terms89Map[termNum];
      const pattern = new RegExp(`(${termNum}\\.[\\w\\s&-]+)`, 'gi');
      highlighted = highlighted.replace(pattern, (match) => {
        return `<span class="term-89" data-term="${termNum}" title="${termInfo.ko}">${match}</span>`;
      });
    });

    // 각도 패턴 하이라이팅 (L0~L8)
    highlighted = highlighted.replace(/\bL([0-8])\b/g, '<span class="angle-lift">L$1</span>');
    
    // 방향 패턴 하이라이팅 (D0~D8)
    highlighted = highlighted.replace(/\bD([0-8])\b/g, '<span class="angle-dir">D$1</span>');

    // A존/B존/C존 하이라이팅
    highlighted = highlighted.replace(/\bA존\b/g, '<span class="zone-a">A존</span>');
    highlighted = highlighted.replace(/\bB존\b/g, '<span class="zone-b">B존</span>');
    highlighted = highlighted.replace(/\bC존\b/g, '<span class="zone-c">C존</span>');

    // 영어 Zone 패턴
    highlighted = highlighted.replace(/\bZone-?A\b/gi, '<span class="zone-a">Zone-A</span>');
    highlighted = highlighted.replace(/\bZone-?B\b/gi, '<span class="zone-b">Zone-B</span>');
    highlighted = highlighted.replace(/\bZone-?C\b/gi, '<span class="zone-c">Zone-C</span>');

    return highlighted;
  }

  // 마크다운 파싱 (기존 유지)
  parseMarkdown(text) {
    if (!text) return '';

    let html = text;

    // 헤더
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 볼드
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // 이탤릭
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // 리스트
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // 구분선
    html = html.replace(/^---$/gim, '<hr>');

    // 줄바꿈
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }

  // 파라미터 포맷팅
  formatParameters(analysisData) {
    const lines = [];
    const params56 = analysisData.parameters_56 || analysisData;

    lines.push('<div class="analysis-result">');
    lines.push('<h3>📊 분석 완료</h3>');

    lines.push('<div class="params-section">');
    lines.push('<ul>');
    
    if (params56.womens_cut_length) {
      lines.push(`<li>📏 길이: <strong>${params56.womens_cut_length}</strong></li>`);
    }
    if (params56.womens_cut_category) {
      lines.push(`<li>✂️ 스타일: <strong>${params56.womens_cut_category}</strong></li>`);
    }
    if (params56.fringe_type && params56.fringe_type !== 'No Fringe') {
      lines.push(`<li>💇 앞머리: ${params56.fringe_type}</li>`);
    }
    if (params56.hair_texture) {
      lines.push(`<li>🧵 모질: ${params56.hair_texture}</li>`);
    }
    if (params56.face_shape_match) {
      lines.push(`<li>👤 얼굴형: ${params56.face_shape_match}</li>`);
    }

    lines.push(`</ul>`);
    lines.push('</div>');
    lines.push('</div>');

    return lines.join('');
  }

  async handleTextMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage('user', message);
    input.value = '';

    // 일반 대화 감지
    const casualKeywords = ['안녕', '반가', '고마', '감사', '도움', '뭐', '어떻게', 'hello', 'hi', 'thanks', 'thank you', 'help'];
    const isCasualChat = casualKeywords.some(keyword => message.toLowerCase().includes(keyword)) && message.length < 20;

    if (isCasualChat) {
      this.addMessage('bot', '답변 생성 중...');
      
      try {
        const gptResponse = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_response',
            payload: {
              user_query: message,
              search_results: []
            }
          })
        });

        const gptResult = await gptResponse.json();

        if (gptResult.success) {
          this.replaceLastBotMessage(gptResult.data);
        } else {
          this.replaceLastBotMessage('답변 생성에 실패했습니다.');
        }
      } catch (error) {
        console.error('대화 오류:', error);
        this.replaceLastBotMessage('오류가 발생했습니다. 다시 시도해주세요.');
      }
      return;
    }

    // 스타일 검색 모드
    this.addMessage('bot', '검색 중...');

    try {
      const searchResponse = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search_styles',
          payload: { query: message }
        })
      });

      const searchResult = await searchResponse.json();

      if (!searchResult.success || searchResult.data.length === 0) {
        this.replaceLastBotMessage('관련된 스타일을 찾지 못했습니다.');
        return;
      }

      const styles = searchResult.data;

      const gptResponse = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_response',
          payload: {
            user_query: message,
            search_results: styles
          }
        })
      });

      const gptResult = await gptResponse.json();

      if (gptResult.success) {
        this.replaceLastBotMessage(gptResult.data);
        this.displayStyleCards(styles);
      }

    } catch (error) {
      console.error('검색 오류:', error);
      this.replaceLastBotMessage('검색 중 오류가 발생했습니다.');
    }
  }

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

  displayStyleCards(styles) {
    const cardsHTML = styles.map(style => `
      <div class="style-card" onclick="window.location.href='#${style.code}'">
        <img src="${style.image_url}" alt="${style.name}" loading="lazy">
        <div class="style-card-info">
          <h4>${style.name}</h4>
          <span class="style-code">${style.code}</span>
        </div>
      </div>
    `).join('');

    this.addRawHTML(`<div class="style-cards-container">${cardsHTML}</div>`);
  }

  addMessage(sender, content) {
    const messagesDiv = document.getElementById('chatbot-messages');
    const messageHTML = `
      <div class="${sender}-message">
        <div class="message-content">${content}</div>
      </div>
    `;
    messagesDiv.insertAdjacentHTML('beforeend', messageHTML);
    this.scrollToBottom();
  }

  addRawHTML(html) {
    const messagesDiv = document.getElementById('chatbot-messages');
    messagesDiv.insertAdjacentHTML('beforeend', html);
    this.scrollToBottom();
  }

  replaceLastBotMessage(newContent) {
    const messages = document.querySelectorAll('.bot-message');
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      lastMessage.querySelector('.message-content').innerHTML = newContent;
    }
    this.scrollToBottom();
  }

  scrollToBottom() {
    const messagesDiv = document.getElementById('chatbot-messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

// 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.hairgatorChatbot = new HairGatorChatbot();
  console.log('🦎 HAIRGATOR v2.0 챗봇 로드 완료 (89용어 + 새 레시피 포맷 + 스트리밍)');
});
