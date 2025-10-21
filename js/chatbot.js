// js/chatbot.js - HAIRGATOR 브랜드 통합 버전

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
          <div class="chatbot-title">
            <svg class="logo-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
            <span>AI 헤어 상담</span>
          </div>
          <button id="chatbot-close" class="chatbot-close" aria-label="닫기">×</button>
        </div>

        <div id="chatbot-messages" class="chatbot-messages">
          <div class="bot-message">
            <div class="message-content">
              <p><strong>원하는 헤어스타일을</strong></p>
              <p>이미지 또는 텍스트로 설명해주세요</p>
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

  toggleChatbot() {
    this.isOpen = !this.isOpen;
    const container = document.getElementById('chatbot-container');
    const toggle = document.getElementById('chatbot-toggle');
    
    if (this.isOpen) {
      container.classList.add('open');
      toggle.classList.add('hidden');
    } else {
      container.classList.remove('open');
      toggle.classList.remove('hidden');
    }
  }

  async handleImageUpload(file) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.addMessage('bot', '이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.addMessage('bot', '이미지 파일만 업로드 가능합니다.');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    this.addMessage('user', `<img src="${imageUrl}" alt="업로드 이미지" class="uploaded-image">`);
    this.addMessage('bot', '이미지를 분석하고 있습니다...');

    try {
      const base64 = await this.fileToBase64(file);

      const response = await fetch(this.apiEndpoint, {
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

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '분석 실패');
      }

      const analysisResult = result.data;
      const displayText = this.formatAnalysisResult(analysisResult);
      this.replaceLastBotMessage(displayText);

      await this.searchAndRecommend(analysisResult);

    } catch (error) {
      console.error('이미지 분석 오류:', error);
      this.replaceLastBotMessage('이미지 분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    }

    document.getElementById('image-upload').value = '';
  }

  async handleTextMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage('user', message);
    input.value = '';
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

  async searchAndRecommend(analysisResult) {
    try {
      const searchQuery = this.createSearchQuery(analysisResult);
      this.addMessage('bot', `"${searchQuery}" 스타일을 검색합니다...`);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search_styles',
          payload: { query: searchQuery }
        })
      });

      const result = await response.json();

      if (!result.success || result.data.length === 0) {
        this.addMessage('bot', '유사한 스타일을 찾지 못했습니다.');
        return;
      }

      this.addMessage('bot', `업로드하신 이미지와 유사한 스타일 ${result.data.length}개를 찾았습니다`);
      this.displayStyleCards(result.data);

    } catch (error) {
      console.error('추천 오류:', error);
      this.addMessage('bot', '추천 중 오류가 발생했습니다.');
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

  createSearchQuery(analysisResult) {
    const keywords = [];
    
    if (analysisResult.womens_cut_category) {
      keywords.push(analysisResult.womens_cut_category);
    }
    if (analysisResult.estimated_hair_length_cm) {
      const length = analysisResult.estimated_hair_length_cm;
      if (length > 40) keywords.push('롱');
      else if (length > 25) keywords.push('미디엄');
      else keywords.push('단발');
    }
    
    return keywords.join(' ') || '헤어스타일';
  }

  formatAnalysisResult(result) {
    const lines = ['분석 결과\n'];
    
    if (result.womens_cut_category) {
      lines.push(`스타일: ${result.womens_cut_category}`);
    }
    if (result.estimated_hair_length_cm) {
      lines.push(`예상 길이: 약 ${result.estimated_hair_length_cm}cm`);
    }
    if (result.confidence_score) {
      const confidence = (result.confidence_score * 100).toFixed(0);
      lines.push(`\n분석 신뢰도: ${confidence}%`);
    }
    
    return lines.join('\n');
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
}

document.addEventListener('DOMContentLoaded', () => {
  window.hairgatorChatbot = new HairGatorChatbot();
});
