// js/chatbot.js - HAIRGATOR 마크다운 파싱 + 스트리밍 + 언어선택 + 인덱스

class HairGatorChatbot {
  constructor() {
    this.apiEndpoint = '/.netlify/functions/chatbot-api';
    this.supabaseUrl = 'https://bhsbwbeisqzgipvzpvym.supabase.co';
    this.isOpen = false;
    this.conversationHistory = [];
    this.currentLanguage = 'ko'; // 기본 언어
    this.init();
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
              <p><strong>🦎 HAIRGATOR</strong></p>
              <p id="welcome-text">${texts.welcome}</p>
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

    // 색인 버튼
    document.getElementById('index-btn').addEventListener('click', () => {
      this.showIndex();
    });

    // 색인 모달 닫기
    document.getElementById('index-modal-close').addEventListener('click', () => {
      this.hideIndex();
    });

    document.getElementById('index-modal-overlay').addEventListener('click', () => {
      this.hideIndex();
    });

    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('language-dropdown');
      const langBtn = document.getElementById('language-btn');
      if (!langBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // 언어 변경
  changeLanguage(lang) {
    this.currentLanguage = lang;
    const texts = this.getTexts();
    
    // UI 텍스트 업데이트
    document.getElementById('chatbot-title').textContent = texts.title;
    document.getElementById('welcome-text').textContent = texts.welcome;
    document.getElementById('chatbot-input').placeholder = texts.placeholder;
    document.getElementById('index-modal-title').textContent = texts.indexTitle;

    console.log(`언어 변경: ${lang}`);
  }

  // 색인 표시
  async showIndex() {
    const modal = document.getElementById('index-modal');
    const content = document.getElementById('index-content');
    
    modal.classList.remove('hidden');
    
    // 색인 이미지 갤러리 생성 (89개)
    content.innerHTML = '<div class="index-loading">색인 로딩 중...</div>';
    
    try {
      const indexImages = [];
      
      // 89개 이미지 경로 생성
      for (let i = 1; i <= 89; i++) {
        const paddedNum = String(i).padStart(2, '0');
        const imagePath = `/indexes/${this.currentLanguage}/${paddedNum}.png`;
        indexImages.push({
          num: paddedNum,
          path: imagePath
        });
      }
      
      // 갤러리 HTML 생성
      const galleryHTML = `
        <div class="index-gallery">
          ${indexImages.map(img => `
            <div class="index-item" onclick="window.hairgatorChatbot.showImagePreview('${img.path}', '${img.num}')">
              <img src="${img.path}" alt="Index ${img.num}" loading="lazy" 
                   onerror="this.style.display='none'; this.parentElement.classList.add('image-error');">
              <span class="index-number">${img.num}</span>
            </div>
          `).join('')}
        </div>
      `;
      
      content.innerHTML = galleryHTML;
      
    } catch (error) {
      console.error('색인 로드 오류:', error);
      content.innerHTML = '<p class="index-error">색인을 불러올 수 없습니다.</p>';
    }
  }

  // 이미지 미리보기
  showImagePreview(imagePath, imageNum) {
    const previewHTML = `
      <div class="image-preview-overlay" onclick="this.remove()">
        <div class="image-preview-container" onclick="event.stopPropagation()">
          <div class="image-preview-header">
            <span class="image-preview-title">Index ${imageNum}</span>
            <button class="image-preview-close" onclick="this.closest('.image-preview-overlay').remove()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="image-preview-content">
            <img src="${imagePath}" alt="Index ${imageNum}">
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', previewHTML);
  }

  // 색인 숨기기
  hideIndex() {
    document.getElementById('index-modal').classList.add('hidden');
  }

  initKeyboardHandler() {
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotMessages = document.getElementById('chatbot-messages');

    if (window.innerWidth <= 768) {
      let lastHeight = window.innerHeight;
      
      const handleResize = () => {
        const currentHeight = window.innerHeight;
        
        if (currentHeight < lastHeight * 0.8) {
          chatbotContainer.style.height = `${currentHeight}px`;
          
          const headerHeight = 60;
          const inputHeight = 80;
          chatbotMessages.style.maxHeight = `${currentHeight - headerHeight - inputHeight}px`;
          
          setTimeout(() => {
            this.scrollToBottom();
          }, 100);
        } else {
          chatbotContainer.style.height = '100vh';
          chatbotMessages.style.maxHeight = '';
        }
        
        lastHeight = currentHeight;
      };
      
      window.addEventListener('resize', handleResize);
      
      if (chatbotInput) {
        chatbotInput.addEventListener('focus', () => {
          setTimeout(() => {
            handleResize();
            this.scrollToBottom();
          }, 300);
        });
        
        chatbotInput.addEventListener('blur', () => {
          setTimeout(() => {
            handleResize();
          }, 300);
        });
      }
    }

    console.log('✅ HAIRGATOR 챗봇: 전체 화면 + 키보드 대응 완료');
  }

  toggleChatbot() {
    this.isOpen = !this.isOpen;
    const container = document.getElementById('chatbot-container');
    const toggle = document.getElementById('chatbot-toggle');
    
    if (this.isOpen) {
      container.classList.add('open');
      toggle.classList.add('hidden');
      
      document.body.classList.add('chatbot-open');
      
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
      
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.position = 'fixed';
      document.documentElement.style.width = '100%';
      document.documentElement.style.height = '100%';
    } else {
      container.classList.remove('open');
      toggle.classList.remove('hidden');
      
      document.body.classList.remove('chatbot-open');
      
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
      
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.documentElement.style.width = '';
      document.documentElement.style.height = '';
    }
  }

  // 이미지 업로드 처리
  async handleImageUpload(file) {
    if (!file) return;

    const texts = this.getTexts();

    if (file.size > 5 * 1024 * 1024) {
      this.addMessage('bot', texts.errorSize);
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.addMessage('bot', texts.errorType);
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    this.addMessage('user', `<img src="${imageUrl}" alt="업로드 이미지" class="uploaded-image">`);
    this.addMessage('bot', texts.analyzing);

    try {
      const base64 = await this.fileToBase64(file);

      // 1단계: 이미지 분석
      const analyzeResponse = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_image',
          payload: {
            image_base64: base64,
            mime_type: file.type
          }
        })
      });

      const analyzeResult = await analyzeResponse.json();

      if (!analyzeResult.success) {
        throw new Error(analyzeResult.error || '분석 실패');
      }

      const analysisData = analyzeResult.data;
      
      // 분석 결과 표시 (전문 용어 제거)
      const summaryText = this.formatParameters(analysisData);
      this.replaceLastBotMessage(summaryText);

      // 2단계: 레시피 생성
      this.addMessage('bot', `<div class="recipe-streaming">✂️ <strong>${texts.generating}</strong></div>`);

      await this.streamRecipe(analysisData);

    } catch (error) {
      console.error('❌ 이미지 분석 오류:', error);
      this.replaceLastBotMessage('❌ 오류가 발생했습니다. 다시 시도해주세요.');
    }

    document.getElementById('image-upload').value = '';
  }

  // 레시피 스트리밍 생성
  async streamRecipe(analysisData) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_recipe',
          payload: {
            analysis_result: analysisData
          }
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '레시피 생성 실패');
      }

      const rawRecipe = result.data;
      const formattedRecipe = this.markdownToHTML(rawRecipe);
      
      await this.typeWriter(formattedRecipe);

    } catch (error) {
      console.error('❌ 레시피 생성 오류:', error);
      this.replaceLastBotMessage('❌ 레시피 생성 중 오류가 발생했습니다.');
    }
  }

  // 마크다운 → HTML 변환
  markdownToHTML(markdown) {
    let html = markdown;

    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = `<div class="recipe-content">${html}</div>`;

    return html;
  }

  // 타이핑 효과
  async typeWriter(html) {
    const messages = document.querySelectorAll('.bot-message');
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const contentDiv = lastMessage.querySelector('.message-content');
    
    contentDiv.innerHTML = '<div class="recipe-streaming"></div>';
    const streamingDiv = contentDiv.querySelector('.recipe-streaming');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    streamingDiv.innerHTML = html;
    const allElements = streamingDiv.querySelectorAll('*');
    
    allElements.forEach(el => {
      el.style.opacity = '0';
    });

    for (let i = 0; i < allElements.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      allElements[i].style.opacity = '1';
      allElements[i].style.transition = 'opacity 0.2s ease-in';
      this.scrollToBottom();
    }
  }

  // 파라미터 포맷팅 (전문 용어 제거)
  formatParameters(analysisData) {
    const lines = [];
    const params56 = analysisData.parameters_56 || analysisData;

    lines.push('<div class="analysis-result">');
    lines.push('<h3>📊 분석 완료</h3>');

    // 핵심 정보만 표시
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
  console.log('🦎 HAIRGATOR 챗봇 로드 완료 (언어선택 + 색인 + 전문용어 제거)');
});
