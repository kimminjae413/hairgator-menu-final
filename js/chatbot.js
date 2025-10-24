// js/chatbot.js - HAIRGATOR v2.0
// 89용어 통합 + 새 레시피 포맷(###1~###7) + 스트리밍 지원
// ✅ TypeError 버그 수정 완료

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

      <div id="chatbot-container" class="chatbot-container" style="display: none;">
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
        <div class="index-content">
          <div class="index-header">
            <h3 id="index-modal-title">${texts.indexTitle}</h3>
            <button id="index-close" class="index-close">×</button>
          </div>
          <div class="index-body">
            <div class="index-search">
              <input type="text" id="index-search-input" placeholder="용어 검색...">
            </div>
            <div id="index-list" class="index-list"></div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    this.renderIndexList();
  }

  renderIndexList() {
    const indexList = document.getElementById('index-list');
    if (!indexList) return;

    const tier1 = ['01', '02', '05', '11', '19', '31', '33', '35', '44', '52', '54', '62', '70', '86', '89'];
    const tier2 = ['04', '06', '20', '22', '23', '24', '29', '34', '36', '38', '41', '42', '45', '51', '53', '59', '60', '61', '75', '76', '81', '82', '84', '88'];
    
    let html = '<div class="tier-section"><h4>⭐ Tier 1: 필수 핵심</h4><ul>';
    tier1.forEach(num => {
      const term = this.terms89Map[num];
      if (term) {
        html += `<li><span class="term-number">${num}</span> ${term.ko}</li>`;
      }
    });
    html += '</ul></div>';

    html += '<div class="tier-section"><h4>🔸 Tier 2: 고급 기법</h4><ul>';
    tier2.forEach(num => {
      const term = this.terms89Map[num];
      if (term) {
        html += `<li><span class="term-number">${num}</span> ${term.ko}</li>`;
      }
    });
    html += '</ul></div>';

    indexList.innerHTML = html;
  }

  attachEventListeners() {
    // 토글 버튼
    document.getElementById('chatbot-toggle').addEventListener('click', () => {
      this.toggleChat();
    });

    // 닫기 버튼
    document.getElementById('chatbot-close').addEventListener('click', () => {
      this.closeChat();
    });

    // 업로드 버튼
    document.getElementById('upload-btn').addEventListener('click', () => {
      document.getElementById('image-upload').click();
    });

    // 파일 선택
    document.getElementById('image-upload').addEventListener('change', (e) => {
      this.handleImageUpload(e);
    });

    // 전송 버튼
    document.getElementById('send-btn').addEventListener('click', () => {
      this.handleTextMessage();
    });

    // Enter 키
    document.getElementById('chatbot-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleTextMessage();
      }
    });

    // 언어 선택
    document.getElementById('language-btn').addEventListener('click', () => {
      document.getElementById('language-dropdown').classList.toggle('hidden');
    });

    document.querySelectorAll('.lang-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentLanguage = btn.dataset.lang;
        document.getElementById('language-dropdown').classList.add('hidden');
        this.updateLanguage();
      });
    });

    // 색인 버튼
    document.getElementById('index-btn').addEventListener('click', () => {
      document.getElementById('index-modal').classList.remove('hidden');
    });

    document.getElementById('index-close').addEventListener('click', () => {
      document.getElementById('index-modal').classList.add('hidden');
    });

    // 색인 검색
    document.getElementById('index-search-input')?.addEventListener('input', (e) => {
      this.filterIndexTerms(e.target.value);
    });
  }

  filterIndexTerms(query) {
    const items = document.querySelectorAll('#index-list li');
    const lowerQuery = query.toLowerCase();

    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(lowerQuery) ? '' : 'none';
    });
  }

  initKeyboardHandler() {
    window.addEventListener('resize', () => {
      if (window.visualViewport) {
        const container = document.getElementById('chatbot-container');
        if (container) {
          const offsetY = window.visualViewport.offsetTop;
          const height = window.visualViewport.height;
          container.style.transform = `translateY(${offsetY}px)`;
          container.style.height = `${height}px`;
        }
      }
    });
  }

  toggleChat() {
    const container = document.getElementById('chatbot-container');
    const toggle = document.getElementById('chatbot-toggle');
    
    if (!this.isOpen) {
      // 챗봇 열기
      this.isOpen = true;
      container.style.display = 'flex';
      toggle.style.display = 'none';
      this.scrollToBottom();
    } else {
      // 챗봇 닫기
      this.isOpen = false;
      container.style.display = 'none';
      toggle.style.display = 'flex';
    }
  }

  closeChat() {
    this.isOpen = false;
    document.getElementById('chatbot-container').style.display = 'none';
    document.getElementById('chatbot-toggle').style.display = 'flex';
  }

  updateLanguage() {
    const texts = this.getTexts();
    document.getElementById('chatbot-title').textContent = texts.title;
    document.getElementById('welcome-text').textContent = texts.welcome;
    document.getElementById('chatbot-input').placeholder = texts.placeholder;
    document.getElementById('index-modal-title').textContent = texts.indexTitle;
  }

  async handleImageUpload(event) {
    const file = event.target.files[0];
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
      const imageData = e.target.result;
      
      this.addRawHTML(`
        <div class="user-message">
          <div class="message-content">
            <img src="${imageData}" alt="Uploaded" style="max-width:200px;border-radius:8px;">
          </div>
        </div>
      `);

      this.addMessage('bot', texts.analyzing);

      try {
        const base64Data = imageData.split(',')[1];
        
        const analysisResponse = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'analyze_image',
            payload: {
              image_base64: base64Data,
              mime_type: file.type
            }
          })
        });

        const analysisResult = await analysisResponse.json();

        if (!analysisResult.success) {
          throw new Error(analysisResult.error || '분석 실패');
        }

        const params56 = analysisResult.data;
        this.replaceLastBotMessage(this.formatParameters(params56));

        // 레시피 생성 (스트리밍)
        await this.generateRecipeWithStream(params56);

      } catch (error) {
        console.error('이미지 분석 오류:', error);
        this.replaceLastBotMessage(`❌ 이미지 분석에 실패했습니다: ${error.message}`);
      }
    };

    reader.readAsDataURL(file);
  }

  async generateRecipeWithStream(params56) {
    const texts = this.getTexts();
    
    // 새 메시지 추가
    this.addMessage('bot', `<div class="streaming-content">${texts.generating}</div>`);
    
    const botMessages = document.querySelectorAll('.bot-message');
    const streamingMessage = botMessages[botMessages.length - 1];
    const contentDiv = streamingMessage.querySelector('.streaming-content');

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_recipe_stream',
          payload: { params56 }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const formattedRecipe = this.parseNewRecipeFormat(result.data.recipe);
        contentDiv.innerHTML = formattedRecipe;
      } else {
        throw new Error(result.error || '레시피 생성 실패');
      }

    } catch (error) {
      console.error('레시피 생성 오류:', error);
      contentDiv.innerHTML = `❌ 레시피 생성에 실패했습니다: ${error.message}`;
    }

    this.scrollToBottom();
  }

  // 🆕 새 레시피 포맷 파싱 (###1~###7 구조)
  parseNewRecipeFormat(text) {
    if (!text) return '<p>레시피 내용이 없습니다.</p>';

    // <커트 레시피> 제목 제거
    text = text.replace(/<커트 레시피>/gi, '');

    // 섹션 분할 (###1 ~ ###7)
    const sections = [];
    const regex = /###(\d+)\.\s*([^:]+):\s*([\s\S]*?)(?=###\d+\.|$)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      sections.push({
        number: match[1],
        title: match[2].trim(),
        content: match[3].trim()
      });
    }

    if (sections.length === 0) {
      return `<div class="recipe-error">⚠️ 레시피 형식을 인식할 수 없습니다.</div>`;
    }

    // HTML 생성
    let html = '<div class="new-recipe-format">';

    sections.forEach(section => {
      const sectionClass = this.getSectionClass(section.number);
      
      html += `
        <div class="recipe-section ${sectionClass}">
          <div class="section-header">
            <span class="section-number">###${section.number}</span>
            <h3 class="section-title">${this.escapeHtml(section.title)}</h3>
          </div>
          <div class="section-content">
            ${this.highlight89Terms(this.parseMarkdown(section.content))}
          </div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

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

  // 🆕 89용어 하이라이팅 (✅ TypeError 버그 수정)
  highlight89Terms(text) {
    // ⭐ 타입 안전성 체크 강화 (배열/객체 처리)
    if (!text) return '';
    
    // 문자열이 아닌 경우 문자열로 변환
    if (typeof text !== 'string') {
      console.warn('⚠️ highlight89Terms: 문자열 변환 필요', typeof text);
      
      // 배열인 경우 join
      if (Array.isArray(text)) {
        text = text.join(' ');
      } 
      // 객체인 경우 JSON stringify
      else if (typeof text === 'object') {
        text = JSON.stringify(text);
      }
      // 그 외의 경우 String() 변환
      else {
        text = String(text);
      }
    }

    // 안전하게 문자열이 되었으므로 replace 가능
    let highlighted = text;

    // 용어 번호 패턴 (01~89)
    Object.keys(this.terms89Map).forEach(termNum => {
      const termInfo = this.terms89Map[termNum];
      const pattern = new RegExp(`(${termNum}\\.[\\w\\s&-]+)`, 'gi');
      
      // 이제 highlighted는 확실히 문자열
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

  // 🆕 개선된 마크다운 파싱 (구조 유지)
  parseMarkdown(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // 코드 블록 임시 저장
    const codeBlocks = [];
    let html = text.replace(/```([\s\S]*?)```/g, (match, code) => {
      const index = codeBlocks.length;
      codeBlocks.push(`<pre><code>${this.escapeHtml(code.trim())}</code></pre>`);
      return `___CODE_BLOCK_${index}___`;
    });

    // 1. **굵은 글씨** → <strong>
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 2. *이탤릭* → <em>
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 3. 줄바꿈 처리
    const lines = html.split('\n');
    const result = [];
    let inList = false;

    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        return;
      }

      // 리스트 항목 (- 또는 * 로 시작)
      if (/^[-*]\s+/.test(trimmed)) {
        if (!inList) {
          result.push('<ul class="recipe-list">');
          inList = true;
        }
        const content = trimmed.replace(/^[-*]\s+/, '');
        result.push(`<li>${content}</li>`);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(`<p class="recipe-text">${trimmed}</p>`);
      }
    });

    // 리스트가 열려있으면 닫기
    if (inList) {
      result.push('</ul>');
    }

    html = result.join('\n');

    // 5. 코드 블록 복원
    codeBlocks.forEach((block, index) => {
      html = html.replace(`___CODE_BLOCK_${index}___`, block);
    });

    // 6. → 화살표를 예쁘게
    html = html.replace(/→/g, '<span class="arrow">→</span>');

    return html;
  }

  // HTML 이스케이프
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
  console.log('🦎 HAIRGATOR v2.0 챗봇 로드 완료 (TypeError 수정 + 89용어)');
});
