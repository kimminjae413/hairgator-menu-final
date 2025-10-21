// js/chatbot.js - HAIRGATOR 56개 파라미터 + 레시피 생성 최종 버전

class HairGatorChatbot {
  constructor() {
    this.apiEndpoint = '/.netlify/functions/chatbot-api';
    this.supabaseUrl = 'https://bhsbwbeisqzgipvzpvym.supabase.co';
    this.isOpen = false;
    this.conversationHistory = [];
    this.init();
  }

  init() {
    this.createChatbotUI();
    this.attachEventListeners();
    this.initKeyboardHandler();
  }

  createChatbotUI() {
    const chatbotHTML = `
      <button id="chatbot-toggle" class="chatbot-toggle" aria-label="AI 헤어 상담">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      <div id="chatbot-container" class="chatbot-container">
        <div class="chatbot-header">
          <span class="chatbot-title">✂️ AI 커트 레시피</span>
          <button id="chatbot-close" class="chatbot-close" aria-label="닫기">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div id="chatbot-messages" class="chatbot-messages">
          <div class="bot-message">
            <div class="message-content">
              <p><strong>🦎 HAIRGATOR AI 분석</strong></p>
              <p>📸 이미지 업로드 → 56개 파라미터 분석</p>
              <p>🔍 유사 스타일 학습 → ✂️ 커트 레시피 생성</p>
              <div class="language-support">
                <span class="lang-badge">🇰🇷 한국어</span>
                <span class="lang-badge">🇺🇸 English</span>
                <span class="lang-badge">🇯🇵 日本語</span>
                <span class="lang-badge">🇨🇳 中文</span>
                <span class="lang-badge">🇻🇳 Tiếng Việt</span>
              </div>
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
              placeholder="헤어스타일 검색..." 
              autocomplete="off"
            >
            
            <button id="send-btn" class="send-btn" title="전송">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
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

  // ⭐ 수정된 부분: 56개 파라미터 분석 + 레시피 생성
  async handleImageUpload(file) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.addMessage('bot', '⚠️ 이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.addMessage('bot', '⚠️ 이미지 파일만 업로드 가능합니다.');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    this.addMessage('user', `<img src="${imageUrl}" alt="업로드 이미지" class="uploaded-image">`);
    this.addMessage('bot', '📊 56개 파라미터 분석 중...');

    try {
      const base64 = await this.fileToBase64(file);

      // 1단계: 이미지 분석 (Gemini - 56개 파라미터)
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

      const params = analyzeResult.data;
      
      // 분석 결과 표시
      const summaryText = this.formatParameters(params);
      this.replaceLastBotMessage(summaryText);

      // 2-4단계: 파라미터 → 검색 → 레시피 생성
      this.addMessage('bot', '🔍 유사 스타일 학습 중...');

      const recipeResponse = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_recipe',
          payload: {
            analysis_result: params
          }
        })
      });

      const recipeResult = await recipeResponse.json();

      if (!recipeResult.success) {
        throw new Error(recipeResult.error || '레시피 생성 실패');
      }

      // 최종 레시피 표시
      const recipe = recipeResult.data.recipe;
      const styleCount = recipeResult.data.similar_styles_count;
      
      this.replaceLastBotMessage(`✂️ **커트 레시피** (유사 스타일 ${styleCount}개 학습)\n\n${recipe}`);

    } catch (error) {
      console.error('이미지 분석 오류:', error);
      this.replaceLastBotMessage('❌ 오류가 발생했습니다. 다시 시도해주세요.');
    }

    document.getElementById('image-upload').value = '';
  }

  // ⭐ 새로 추가: 56개 파라미터 포맷팅
  formatParameters(params) {
    const lines = ['📊 **분석 완료**\n'];

    // 핵심 정보만 표시
    if (params.womens_cut_length) {
      lines.push(`📏 길이 분류: **${params.womens_cut_length}**`);
    }
    if (params.womens_cut_category) {
      lines.push(`✂️ 스타일: **${params.womens_cut_category}**`);
    }
    if (params.estimated_hair_length_cm) {
      lines.push(`📐 예상 길이: **${params.estimated_hair_length_cm}cm**`);
    }
    if (params.structure_layer) {
      lines.push(`🎨 레이어: ${params.structure_layer}`);
    }
    if (params.fringe_type) {
      lines.push(`💇 앞머리: ${params.fringe_type}`);
    }
    if (params.cut_form) {
      lines.push(`📐 컷 형태: ${params.cut_form}`);
    }

    const paramCount = Object.values(params).filter(v => v !== null && v !== undefined && v !== 0).length;
    lines.push(`\n✅ 감지된 파라미터: **${paramCount}/56개**`);

    return lines.join('\n');
  }

  async handleTextMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage('user', message);
    input.value = '';

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
  }

  scrollToBottom() {
    const messagesDiv = document.getElementById('chatbot-messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // ⭐ 키보드 대응 추가
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
}

document.addEventListener('DOMContentLoaded', () => {
  window.hairgatorChatbot = new HairGatorChatbot();
  console.log('🦎 HAIRGATOR 챗봇 로드 완료 (56개 파라미터 + 레시피 생성)');
});
