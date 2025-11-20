// js/chatbot-ui.js - HAIRGATOR v3.1 UI Module - FINAL FIX (2025-11-20 17:20)
// 🎉 최종 수정: 도해도 스크롤 문제 완벽 해결
// ✅ 이중 JSON 파싱 완료
// ✅ 모달 스크롤 활성화
// ✅ 도해도 정상 표시

import { ChatbotCore } from './chatbot-core.js';

class HairGatorChatbot {
  constructor() {
    // Core 모듈 초기화
    this.core = new ChatbotCore({
      apiEndpoint: '/.netlify/functions/chatbot-api',
      supabaseUrl: 'https://bhsbwbeisqzgipvzpvym.supabase.co',
      language: this.getStoredLanguage()
    });
    
    this.isOpen = false;
    this.conversationHistory = [];
    this.currentLanguage = this.core.currentLanguage;
    
    // 유저별 히스토리 관리
    this.currentUserId = null;
    this.HISTORY_EXPIRE_DAYS = 30;
    this.MAX_MESSAGES_PER_USER = 100;
    
    this.initUserHistory();
    this.init();
  }

  // ==================== localStorage 관리 ====================
  
  getStoredLanguage() {
    try {
      return localStorage.getItem('hairgator_chatbot_lang') || 'ko';
    } catch (e) {
      console.warn('⚠️ localStorage 접근 실패, 기본값 사용:', e);
      return 'ko';
    }
  }
  
  setStoredLanguage(lang) {
    try {
      localStorage.setItem('hairgator_chatbot_lang', lang);
      console.log(`✅ localStorage 저장 성공: ${lang}`);
      return true;
    } catch (e) {
      console.warn('⚠️ localStorage 저장 실패:', e);
      return false;
    }
  }

  // ==================== 유저 히스토리 관리 ====================
  
  initUserHistory() {
    try {
      const bullnabiUser = window.getBullnabiUser ? window.getBullnabiUser() : null;
      
      if (bullnabiUser && bullnabiUser.userId) {
        this.currentUserId = bullnabiUser.userId;
        console.log(`👤 유저 ID 설정: ${this.currentUserId}`);
      } else {
        this.currentUserId = this.getOrCreateAnonymousId();
        console.log(`👤 임시 유저 ID: ${this.currentUserId}`);
      }
      
      this.loadUserHistory();
      this.cleanExpiredMessages();
      
    } catch (e) {
      console.error('❌ 유저 히스토리 초기화 실패:', e);
      this.currentUserId = 'anonymous_' + Date.now();
    }
  }
  
  getOrCreateAnonymousId() {
    try {
      let anonId = localStorage.getItem('hairgator_anonymous_id');
      if (!anonId) {
        anonId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('hairgator_anonymous_id', anonId);
      }
      return anonId;
    } catch (e) {
      return 'anon_' + Date.now();
    }
  }
  
  loadUserHistory() {
    try {
      if (!this.currentUserId) return;
      
      const key = `hairgator_history_${this.currentUserId}`;
      const saved = localStorage.getItem(key);
      
      if (saved) {
        const history = JSON.parse(saved);
        this.conversationHistory = history;
        console.log(`📚 히스토리 로드: ${history.length}개 메시지`);
        this.restoreHistoryToUI();
      }
    } catch (e) {
      console.error('❌ 히스토리 로드 실패:', e);
      this.conversationHistory = [];
    }
  }
  
  saveUserHistory() {
    try {
      if (!this.currentUserId) return;
      
      const key = `hairgator_history_${this.currentUserId}`;
      
      if (this.conversationHistory.length > this.MAX_MESSAGES_PER_USER) {
        this.conversationHistory = this.conversationHistory.slice(-this.MAX_MESSAGES_PER_USER);
      }
      
      localStorage.setItem(key, JSON.stringify(this.conversationHistory));
      console.log(`💾 히스토리 저장: ${this.conversationHistory.length}개 메시지`);
      
    } catch (e) {
      console.warn('⚠️ 히스토리 저장 실패 (WebView):', e);
    }
  }
  
  cleanExpiredMessages() {
    try {
      if (!this.currentUserId) return;
      
      const expireTime = Date.now() - (this.HISTORY_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
      const originalLength = this.conversationHistory.length;
      
      this.conversationHistory = this.conversationHistory.filter(msg => {
        return msg.timestamp && msg.timestamp > expireTime;
      });
      
      const deleted = originalLength - this.conversationHistory.length;
      if (deleted > 0) {
        console.log(`🗑️ 만료된 메시지 ${deleted}개 삭제 (${this.HISTORY_EXPIRE_DAYS}일 이상)`);
        this.saveUserHistory();
      }
      
    } catch (e) {
      console.error('❌ 만료 메시지 정리 실패:', e);
    }
  }
  
  restoreHistoryToUI() {
    try {
      const messagesDiv = document.getElementById('chatbot-messages');
      if (!messagesDiv) return;
      
      messagesDiv.innerHTML = '';
      
      this.conversationHistory.forEach(msg => {
        const messageHTML = `
          <div class="${msg.sender}-message">
            <div class="message-content">${msg.content}</div>
          </div>
        `;
        messagesDiv.insertAdjacentHTML('beforeend', messageHTML);
      });
      
      this.attach89TermClickHandlers();
      this.scrollToBottom();
      console.log('✅ UI 히스토리 복원 완료');
      
    } catch (e) {
      console.error('❌ UI 복원 실패:', e);
    }
  }
  
  addToHistory(sender, content) {
    try {
      const message = {
        sender: sender,
        content: content,
        timestamp: Date.now(),
        userId: this.currentUserId
      };
      
      this.conversationHistory.push(message);
      this.saveUserHistory();
      
    } catch (e) {
      console.error('❌ 히스토리 추가 실패:', e);
    }
  }
  
  clearUserHistory() {
    try {
      if (!this.currentUserId) return;
      
      const key = `hairgator_history_${this.currentUserId}`;
      localStorage.removeItem(key);
      this.conversationHistory = [];
      
      const messagesDiv = document.getElementById('chatbot-messages');
      if (messagesDiv) {
        const texts = this.getTexts();
        messagesDiv.innerHTML = `
          <div class="welcome-message">
            <div class="welcome-icon">👋</div>
            <div class="welcome-text">${texts.welcome}</div>
          </div>
        `;
      }
      
      console.log('🗑️ 히스토리 전체 삭제 완료');
      
    } catch (e) {
      console.error('❌ 히스토리 삭제 실패:', e);
    }
  }

  // ==================== 다국어 텍스트 ====================
  
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

  // ==================== UI 초기화 ====================
  
  init() {
    this.createChatbotUI();
    this.attachEventListeners();
    this.initKeyboardHandler();
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
              <p><strong>HAIR Recipe v3.0</strong></p>
              <p id="welcome-text">${texts.welcome}</p>
              <p style="font-size:0.85em;opacity:0.7;">✨ 89용어 시스템 적용</p>
            </div>
          </div>
        </div>

        <div class="chatbot-input-area">
  <!-- ⭐ 성별 선택 UI 추가 ⭐ -->
  <div class="gender-selector">
    <label>헤어스타일 성별 선택:</label>
    <div class="radio-group">
      <label class="gender-option">
        <input type="radio" name="gender" value="female" checked>
        <span class="gender-label">👩 여성 헤어스타일</span>
      </label>
      <label class="gender-option">
        <input type="radio" name="gender" value="male">
        <span class="gender-label">👨 남성 헤어스타일</span>
      </label>
    </div>
  </div>
  
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
            
            <button id="index-btn" class="index-btn" title="색인 보기">
              <span style="font-size: 20px;">📑</span>
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

      <div id="index-modal" class="index-modal hidden">
        <div class="index-modal-content">
          <div class="index-modal-header">
            <h2 id="index-modal-title">${texts.indexTitle}</h2>
            <button id="close-index-modal" class="close-index-modal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="index-modal-body" id="index-modal-body">
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    
    // ⭐⭐⭐ 핵심 수정: 모달 스크롤 CSS 추가 ⭐⭐⭐
    this.addModalScrollStyles();
  }

  // ⭐⭐⭐ 새 함수: 모달 스크롤 스타일 추가 ⭐⭐⭐
  addModalScrollStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* 챗봇 메시지 영역 스크롤 활성화 */
      .chatbot-messages {
        max-height: calc(80vh - 140px) !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        padding-bottom: 100px !important;  /* 🔥 하단 여백 증가 */
        -webkit-overflow-scrolling: touch !important;
      }
      
      /* 도해도 컨테이너 스타일 - 세로 배치! */
      .style-cards-container {
        display: flex !important;
        flex-direction: column !important;  /* 🔥 세로 배치 */
        gap: 16px !important;
        padding: 20px 10px !important;
        margin-top: 20px !important;
        margin-bottom: 40px !important;  /* 🔥 하단 여백 추가 */
        position: relative !important;
        width: 100% !important;
      }
      
      /* 도해도 카드 스타일 - 전체 너비 */
      .style-card {
        width: 100% !important;  /* 🔥 전체 너비 */
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: 12px !important;
        padding: 12px !important;
        transition: transform 0.2s !important;
        display: flex !important;
        flex-direction: column !important;
      }
      
      .style-card:active {
        transform: scale(0.98) !important;
      }
      
      .style-card img {
        width: 100% !important;
        height: auto !important;  /* 🔥 비율 유지 */
        max-height: 400px !important;
        object-fit: contain !important;  /* 🔥 전체 이미지 표시 */
        border-radius: 8px !important;
        display: block !important;
        margin-bottom: 12px !important;
        background: rgba(0, 0, 0, 0.3) !important;
      }
      
      .style-card-info {
        margin-top: 8px !important;
        padding: 8px !important;
      }
      
      .style-card-info h4 {
        font-size: 15px !important;
        margin: 0 0 6px 0 !important;
        color: #fff !important;
        line-height: 1.4 !important;
      }
      
      .style-code {
        font-size: 13px !important;
        color: rgba(255, 255, 255, 0.7) !important;
        font-family: monospace !important;
      }
      
      /* 이미지 로드 실패 플레이스홀더 */
      .style-card-placeholder {
        width: 100% !important;
        height: 300px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(255, 255, 255, 0.05) !important;
        border-radius: 8px !important;
        font-size: 64px !important;
      }
      
      /* 메시지 스크롤바 스타일 */
      .chatbot-messages::-webkit-scrollbar {
        width: 6px !important;
      }
      
      .chatbot-messages::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3) !important;
        border-radius: 3px !important;
      }
      
      .chatbot-messages::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1) !important;
      }
    `;
    document.head.appendChild(style);
    console.log('✅ 모달 스크롤 스타일 추가 완료 (세로 배치)');
  }

  // ==================== 이벤트 리스너 ====================
  
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
      this.handleImageUpload(e);
    });

    document.getElementById('send-btn').addEventListener('click', () => {
      this.handleTextMessage();
    });

    document.getElementById('chatbot-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleTextMessage();
      }
    });

    const languageBtn = document.getElementById('language-btn');
    const languageDropdown = document.getElementById('language-dropdown');
    
    const toggleDropdown = (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('🌐 언어 버튼 클릭/터치됨');
      languageDropdown.classList.toggle('hidden');
      console.log('드롭다운 상태:', languageDropdown.classList.contains('hidden') ? '숨김' : '표시');
    };
    
    languageBtn.addEventListener('click', toggleDropdown);
    languageBtn.addEventListener('touchstart', toggleDropdown, { passive: false });

    this.reattachLanguageHandlers();

    document.getElementById('index-btn').addEventListener('click', () => {
      this.showIndexModal();
    });

    document.getElementById('close-index-modal').addEventListener('click', () => {
      this.closeIndexModal();
    });

    document.getElementById('index-modal').addEventListener('click', (e) => {
      if (e.target.id === 'index-modal') {
        this.closeIndexModal();
      }
    });

    const closeDropdownOnOutside = (e) => {
      const dropdown = document.getElementById('language-dropdown');
      const langBtn = document.getElementById('language-btn');
      
      if (dropdown && !dropdown.contains(e.target) && !langBtn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    };
    
    document.addEventListener('click', closeDropdownOnOutside);
  }

  initKeyboardHandler() {
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotContainer = document.getElementById('chatbot-container');
    const messagesDiv = document.getElementById('chatbot-messages');

    if (!chatbotInput || !chatbotContainer) return;

    let originalViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    let isKeyboardVisible = false;

    const adjustLayout = () => {
      if (!window.visualViewport) return;

      const currentViewportHeight = window.visualViewport.height;
      const heightDiff = originalViewportHeight - currentViewportHeight;

      if (heightDiff > 150) {
        if (!isKeyboardVisible) {
          isKeyboardVisible = true;
          chatbotContainer.style.height = `${currentViewportHeight}px`;
          
          if (messagesDiv) {
            messagesDiv.style.maxHeight = `calc(${currentViewportHeight}px - 140px)`;
          }

          setTimeout(() => {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.tagName === 'INPUT') {
              activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }
      } else {
        if (isKeyboardVisible) {
          isKeyboardVisible = false;
          chatbotContainer.style.height = '';
          
          if (messagesDiv) {
            messagesDiv.style.maxHeight = '';
          }
        }
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', adjustLayout, { passive: true });
      window.visualViewport.addEventListener('scroll', adjustLayout, { passive: true });
    }

    chatbotInput.addEventListener('focus', () => {
      setTimeout(adjustLayout, 300);
    });

    chatbotInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement.tagName !== 'INPUT') {
          isKeyboardVisible = false;
          chatbotContainer.style.height = '';
          if (messagesDiv) {
            messagesDiv.style.maxHeight = '';
          }
        }
      }, 300);
    });

    window.addEventListener('resize', () => {
      if (!isKeyboardVisible) {
        originalViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      }
    }, { passive: true });
  }

  // ==================== UI 상태 관리 ====================
  
  toggleChatbot() {
    const container = document.getElementById('chatbot-container');
    const toggle = document.getElementById('chatbot-toggle');
    
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      container.classList.add('active');
      toggle.classList.add('hidden');
    } else {
      container.classList.remove('active');
      toggle.classList.remove('hidden');
    }
  }

  changeLanguage(lang) {
    console.log(`🌍 [START] 언어 변경 시작: ${this.currentLanguage} → ${lang}`);
    
    const isWebView = !!(window.ReactNativeWebView || navigator.userAgent.includes('wv'));
    if (isWebView) {
      console.log('📱 WebView 환경 감지됨');
    }
    
    this.currentLanguage = lang;
    this.core.currentLanguage = lang;
    this.setStoredLanguage(lang);
    
    const texts = this.getTexts();
    console.log(`📝 새로운 텍스트:`, texts);
    
    const updateDelay = isWebView ? 150 : 10;
    
    setTimeout(() => {
      const titleEl = document.getElementById('chatbot-title');
      if (titleEl) {
        titleEl.textContent = texts.title;
        console.log(`✅ 타이틀 변경: ${texts.title}`);
      }
      
      const inputEl = document.getElementById('chatbot-input');
      if (inputEl) {
        inputEl.placeholder = texts.placeholder;
        console.log(`✅ placeholder 변경: ${texts.placeholder}`);
      }
      
      const indexTitleEl = document.getElementById('index-modal-title');
      if (indexTitleEl) {
        indexTitleEl.textContent = texts.indexTitle;
      }
      
      const welcomeTextEl = document.getElementById('welcome-text');
      if (welcomeTextEl) {
        welcomeTextEl.textContent = texts.welcome;
      }
      
      const messagesDiv = document.getElementById('chatbot-messages');
      if (messagesDiv) {
        messagesDiv.innerHTML = `
          <div class="welcome-message">
            <div class="welcome-icon">👋</div>
            <div class="welcome-text" id="welcome-text">${texts.welcome}</div>
          </div>
        `;
      }
      
      this.conversationHistory = [];
      
      console.log(`🎉 [COMPLETE] 언어 변경 완료: ${lang}`);
      
      if (window.ReactNativeWebView) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'LANGUAGE_CHANGED',
            language: lang
          }));
        } catch (e) {
          console.warn('WebView postMessage 실패:', e);
        }
      }
    }, updateDelay);
  }

  // ==================== 색인 모달 ====================
  
  showIndexModal() {
    const modal = document.getElementById('index-modal');
    const body = document.getElementById('index-modal-body');

    const getFileSuffix = (id, lang) => {
      const idNum = parseInt(id);
      if (lang === 'ko') return '';
      if (lang === 'en') return ' – 1';
      
      if (idNum <= 2) {
        if (lang === 'ja') return ' – 3';
        if (lang === 'zh') return ' – 2';
        if (lang === 'vi') return ' – 4';
      } else {
        if (lang === 'ja') return ' – 2';
        if (lang === 'zh') return ' – 3';
        if (lang === 'vi') return ' – 5';
      }
      return '';
    };

    const baseURL = 'https://raw.githubusercontent.com/kimminjae413/hairgator-menu-final/main/indexes/';
    const langFolder = this.currentLanguage;

    const galleryHTML = `
      <div class="term-gallery-single-column">
        ${Object.entries(this.core.terms89Map)
          .sort(([idA], [idB]) => parseInt(idA) - parseInt(idB))
          .map(([id, term]) => {
            const termName = term.en;
            const suffix = getFileSuffix(id, this.currentLanguage);
            const fileName = `${id}. ${termName}${suffix}.png`;
            const imageURL = baseURL + langFolder + '/' + encodeURIComponent(fileName);
            const displayName = term[this.currentLanguage] || term.ko || term.en;
            
            return `
              <div class="term-card-single" data-term-id="${id}" onclick="window.hairgatorChatbot.openImageViewer(${parseInt(id) - 1})">
                <img 
                  src="${imageURL}" 
                  alt="${displayName}"
                  onerror="this.parentElement.classList.add('image-error'); this.style.display='none';"
                />
                <div class="term-info-single">
                  <span class="term-num">${id}</span>
                  <span class="term-title">${displayName}</span>
                </div>
              </div>
            `;
          }).join('')}
      </div>
    `;

    body.innerHTML = galleryHTML;
    modal.classList.remove('hidden');

    window.hairgatorTermImages = Object.entries(this.core.terms89Map)
      .sort(([idA], [idB]) => parseInt(idA) - parseInt(idB))
      .map(([id, term]) => {
        const termName = term.en;
        const suffix = getFileSuffix(id, this.currentLanguage);
        const fileName = `${id}. ${termName}${suffix}.png`;
        const displayName = term[this.currentLanguage] || term.ko || term.en;
        
        return {
          url: baseURL + langFolder + '/' + encodeURIComponent(fileName),
          title: `${id}. ${displayName}`
        };
      });
  }

  closeIndexModal() {
    document.getElementById('index-modal').classList.add('hidden');
  }

  openImageViewer(index) {
    const images = window.hairgatorTermImages;
    if (!images || !images[index]) return;

    let currentIndex = index;

    const viewerHTML = `
      <div class="image-viewer-modal" id="image-viewer">
        <div class="viewer-content">
          <img id="viewer-image" src="${images[currentIndex].url}" alt="${images[currentIndex].title}">
          <div class="viewer-info">
            <span class="viewer-title">${images[currentIndex].title}</span>
            <span class="viewer-counter">${currentIndex + 1} / ${images.length}</span>
          </div>
          <button class="viewer-prev" id="viewer-prev">‹</button>
          <button class="viewer-next" id="viewer-next">›</button>
          <button class="viewer-close" id="viewer-close">✕</button>
        </div>
      </div>
    `;

    const existingViewer = document.getElementById('image-viewer');
    if (existingViewer) existingViewer.remove();
    document.body.insertAdjacentHTML('beforeend', viewerHTML);

    const viewer = document.getElementById('image-viewer');
    const viewerImage = document.getElementById('viewer-image');
    const viewerTitle = viewer.querySelector('.viewer-title');
    const viewerCounter = viewer.querySelector('.viewer-counter');

    const updateImage = (newIndex) => {
      if (newIndex < 0 || newIndex >= images.length) return;
      currentIndex = newIndex;
      viewerImage.src = images[currentIndex].url;
      viewerTitle.textContent = images[currentIndex].title;
      viewerCounter.textContent = `${currentIndex + 1} / ${images.length}`;
    };

    document.getElementById('viewer-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentIndex > 0) updateImage(currentIndex - 1);
    });

    document.getElementById('viewer-next').addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentIndex < images.length - 1) updateImage(currentIndex + 1);
    });

    const closeViewer = () => viewer.remove();
    document.getElementById('viewer-close').addEventListener('click', closeViewer);
    viewer.addEventListener('click', (e) => {
      if (e.target === viewer) closeViewer();
    });

    const handleKeyboard = (e) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        updateImage(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        updateImage(currentIndex + 1);
      } else if (e.key === 'Escape') {
        closeViewer();
        document.removeEventListener('keydown', handleKeyboard);
      }
    };
    document.addEventListener('keydown', handleKeyboard);

    let touchStartX = 0;
    let touchEndX = 0;

    viewerImage.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    viewerImage.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchStartX - touchEndX;

      if (Math.abs(swipeDistance) > 50) {
        if (swipeDistance > 0 && currentIndex < images.length - 1) {
          updateImage(currentIndex + 1);
        } else if (swipeDistance < 0 && currentIndex > 0) {
          updateImage(currentIndex - 1);
        }
      }
    }, { passive: true });
  }

  // ==================== 이미지 업로드 핸들러 ====================
  
  ync hasandleImageUpload(event) {
    async handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // ⭐ 성별 선택 값 가져오기 ⭐
  const genderInput = document.querySelector('input[name="gender"]:checked');
  if (!genderInput) {
    alert('성별을 선택해주세요.');
    return;
  }
  const userGender = genderInput.value; // 'female' or 'male'
  console.log(`👤 사용자 선택 성별: ${userGender}`);

  if (file.size > 5 * 1024 * 1024) {
      const texts = this.getTexts();
      this.addMessage('bot', texts.errorSize);
      return;
    }

    if (!file.type.startsWith('image/')) {
      const texts = this.getTexts();
      this.addMessage('bot', texts.errorType);
      return;
    }

    try {
      const previewURL = URL.createObjectURL(file);
      this.addMessage('user', `<img src="${previewURL}" alt="업로드 이미지" style="max-width:200px;border-radius:8px;">`);

      const texts = this.getTexts();
      this.addMessage('bot', texts.analyzing);

      const base64Image = await this.core.fileToBase64(file);
// ⭐ user_gender 파라미터 추가 ⭐
const analysisResult = await this.core.analyzeImage(base64Image, file.type, userGender);

      console.log('📊 분석 결과 전체:', analysisResult);
      
      let params56;
      if (analysisResult.success && analysisResult.data) {
        params56 = analysisResult.data;
      } else if (analysisResult.data) {
        params56 = analysisResult.data;
      } else {
        params56 = analysisResult;
      }
      
      console.log('📤 추출된 params56:', params56);
      
      if (!params56 || !params56.length_category) {
        throw new Error('이미지 분석 결과가 올바르지 않습니다.');
      }

      const formattedAnalysis = this.core.formatParameters(params56);
      this.replaceLastBotMessage(formattedAnalysis);

      this.addMessage('bot', texts.generating);

      const recipeResult = await this.core.generateRecipe(
        params56,
        this.currentLanguage
      );

      console.log('📥 recipeResult 전체:', recipeResult);

      // 이중 JSON 파싱
      let recipe = '';
      let styles = [];
      let parsedData = null;

      if (recipeResult.success && recipeResult.data) {
        parsedData = recipeResult.data;
        
        // 이중 JSON 체크
        if (typeof parsedData.recipe === 'string' && parsedData.recipe.trim().startsWith('{')) {
          try {
            const innerJson = JSON.parse(parsedData.recipe);
            
            if (innerJson.success === true && innerJson.data) {
              parsedData = innerJson.data;
              console.log('✅ 이중 JSON 파싱 성공');
            } else if (innerJson.recipe) {
              parsedData = innerJson;
            }
          } catch (e) {
            console.warn('⚠️ 이중 JSON 파싱 실패, 원본 사용');
          }
        }
        
        recipe = parsedData.recipe || '';
        styles = parsedData.similar_styles || [];
        
      } else if (recipeResult.data) {
        recipe = recipeResult.data.recipe || recipeResult.data || '';
        styles = recipeResult.data.similar_styles || [];
      } else if (typeof recipeResult === 'string') {
        recipe = recipeResult;
      } else {
        recipe = '레시피 생성에 실패했습니다.';
      }

      console.log('📝 최종 recipe 길이:', recipe.length);
      console.log('🖼️ 최종 styles 개수:', styles?.length);

      // 레시피 렌더링
      if (recipe && recipe.length > 0 && typeof recipe === 'string') {
        // 혹시 recipe가 여전히 JSON이라면 최종 파싱
        if (recipe.trim().startsWith('{')) {
          try {
            const finalParse = JSON.parse(recipe);
            if (finalParse.recipe) {
              recipe = finalParse.recipe;
              if (!styles || styles.length === 0) {
                styles = finalParse.similar_styles || [];
              }
            }
          } catch (e) {
            console.warn('⚠️ 최종 파싱 실패, 원본 사용');
          }
        }
        
        // 마크다운 렌더링
        let formattedRecipe = recipe.replace(/\\n/g, '\n').replace(/\n/g, '<br>');
        const rendered = this.core.parseMarkdownWithHighlight(formattedRecipe);
        const wrappedRecipe = `<div class="recipe-text" style="white-space: normal; word-wrap: break-word; max-width: 100%; overflow-x: hidden;">${rendered}</div>`;
        
        this.replaceLastBotMessage(wrappedRecipe);
      } else {
        this.replaceLastBotMessage('⚠️ 레시피 내용이 비어있습니다.');
      }

      // ⭐⭐⭐ 도해도 표시 ⭐⭐⭐
      console.log('🖼️ displayStyleCards 호출 전 - styles:', styles);
      if (styles && Array.isArray(styles) && styles.length > 0) {
        console.log('✅ 도해도 표시 시작:', styles.length, '개');
        this.displayStyleCards(styles.slice(0, 3));
      } else {
        console.warn('⚠️ 도해도가 없거나 배열이 아님');
      }

    } catch (error) {
      console.error('❌ 이미지 처리 오류:', error);
      this.replaceLastBotMessage(`❌ 오류 발생: ${error.message}`);
    }

    event.target.value = '';
  }

  // ==================== 텍스트 메시지 핸들러 ====================
  
  async handleTextMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage('user', message);
    input.value = '';

    const casualKeywords = ['안녕', '반가', '고마', '감사', '도움', '뭐', '어떻게', '알려줘', '설명', '궁금', 'hello', 'hi', 'thanks', 'thank you', 'help', 'explain'];
    const questionKeywords = ['뭐', '무엇', '어떻게', '왜', '언제', '어디', '누가', 'what', 'how', 'why', 'when', 'where', 'who'];
    const styleKeywords = ['스타일', '헤어', '커트', '펌', '컬러', '염색', '미디움', '숏', '롱', '단발', '레이어', '그래쥬에이션', 'style', 'hair', 'cut', 'perm', 'color', 'medium', 'short', 'long', 'layer', 'graduation'];
    
    const isCasualChat = casualKeywords.some(keyword => message.includes(keyword)) && message.length < 30;
    const isStyleSearch = styleKeywords.some(keyword => message.includes(keyword));
    const isTheoryQuestion = questionKeywords.some(keyword => message.includes(keyword)) && !isStyleSearch;

    if (isCasualChat || isTheoryQuestion) {
      this.addMessage('bot', '답변 생성 중...');
      
      try {
        const gptResponse = await this.core.generateResponse(message, []);

        this.replaceLastBotMessage(gptResponse);
      } catch (error) {
        console.error('대화 오류:', error);
        this.replaceLastBotMessage('답변 생성에 실패했습니다.');
      }
      return;
    }

    this.addMessage('bot', '검색 중...');

    try {
      const styles = await this.core.searchStyles(message);

      if (styles.length === 0) {
        this.replaceLastBotMessage('관련된 스타일을 찾지 못했습니다.');
        return;
      }

      const gptResponse = await this.core.generateResponse(message, styles);

      this.replaceLastBotMessage(gptResponse);
      
      const validStyles = this.core.filterValidStyles(styles);
      
      if (validStyles.length > 0) {
        this.displayStyleCards(validStyles);
      }

    } catch (error) {
      console.error('검색 오류:', error);
      this.replaceLastBotMessage('검색 중 오류가 발생했습니다.');
    }
  }

  // ==================== UI 렌더링 ====================
  
  displayStyleCards(styles) {
    console.log('🎨 displayStyleCards 호출됨');
    console.log('   - styles:', styles);
    console.log('   - styles.length:', styles?.length);
    
    if (!styles || !Array.isArray(styles) || styles.length === 0) {
      console.warn('⚠️ styles가 없거나 배열이 아니거나 비어있음');
      return;
    }
    
    const cardsHTML = styles.map((style, index) => {
      console.log(`🖼️ 스타일 ${index}:`, style);
      
      const imageUrl = style.image_url || style.main_image_url || style.imageUrl || '';
      console.log(`   이미지 URL: ${imageUrl}`);
      
      const hasValidImage = imageUrl && 
                           imageUrl.trim() !== '' &&
                           imageUrl.includes('supabase.co') &&
                           !imageUrl.includes('temp') &&
                           !imageUrl.includes('temporary');
      
      const name = style.name || style.style_name_ko || style.title || '이름 없음';
      const code = style.code || style.sample_code || style.id || '';
      const similarity = style.similarity ? `(${(style.similarity * 100).toFixed(0)}% 매칭)` : '';
      
      return `
        <div class="style-card">
          ${hasValidImage ? 
            `<img src="${imageUrl}" alt="${name}" loading="lazy" onload="console.log('✅ 이미지 로드:', '${code}');" onerror="console.error('❌ 이미지 로드 실패:', '${imageUrl}'); this.parentElement.style.display='none';">` : 
            '<div class="style-card-placeholder">📄</div>'}
          <div class="style-card-info">
            <h4>${name} ${similarity}</h4>
            ${code ? `<span class="style-code">${code}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    console.log('✅ 도해도 HTML 생성 완료, 추가 중...');
    this.addRawHTML(`<div class="style-cards-container">${cardsHTML}</div>`);
    console.log('✅ 도해도 HTML 추가 완료');
    
    // ⭐ 추가: 도해도가 추가된 후 스크롤
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  addMessage(sender, content) {
    const messagesDiv = document.getElementById('chatbot-messages');
    const messageHTML = `
      <div class="${sender}-message">
        <div class="message-content">${content}</div>
      </div>
    `;
    messagesDiv.insertAdjacentHTML('beforeend', messageHTML);
    
    this.attach89TermClickHandlers();
    this.addToHistory(sender, content);
    this.scrollToBottom();
  }
  
  attach89TermClickHandlers() {
    document.querySelectorAll('.term-89.clickable').forEach(termEl => {
      if (termEl.dataset.listenerAttached) return;
      termEl.dataset.listenerAttached = 'true';
      
      const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const termId = termEl.dataset.term;
        console.log(`🔍 89용어 클릭: ${termId}번`);
        
        this.showIndexModal();
        
        setTimeout(() => {
          const targetCard = document.querySelector(`.term-card-single[data-term-id="${termId}"]`);
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            targetCard.style.border = '3px solid #2196F3';
            targetCard.style.boxShadow = '0 8px 24px rgba(33, 150, 243, 0.4)';
            
            setTimeout(() => {
              targetCard.style.border = '1px solid #e0e0e0';
              targetCard.style.boxShadow = 'none';
            }, 2000);
          }
        }, 300);
      };
      
      termEl.addEventListener('click', handleClick);
      termEl.addEventListener('touchstart', handleClick, { passive: false });
      
      termEl.style.cursor = 'pointer';
    });
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
      this.attach89TermClickHandlers();
    }
    this.scrollToBottom();
  }

  scrollToBottom() {
    const messagesDiv = document.getElementById('chatbot-messages');
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }

  reattachLanguageHandlers() {
    const self = this;
    const dropdown = document.getElementById('language-dropdown');
    
    if (!dropdown) {
      console.warn('⚠️ 언어 드롭다운을 찾을 수 없음');
      return;
    }
    
    let isProcessing = false;
    
    const handleLanguageChange = function(lang) {
      if (isProcessing) {
        console.log('⏸️ 처리 중 - 스킵');
        return;
      }
      
      isProcessing = true;
      console.log('🎯 언어 선택: ' + lang);
      
      dropdown.classList.add('hidden');
      
      self.currentLanguage = lang;
      self.core.currentLanguage = lang;
      self.setStoredLanguage(lang);
      
      const texts = self.getTexts();
      
      const title = document.getElementById('chatbot-title');
      if (title) title.textContent = texts.title;
      
      const input = document.getElementById('chatbot-input');
      if (input) input.placeholder = texts.placeholder;
      
      const msgs = document.getElementById('chatbot-messages');
      if (msgs) {
        if (self.conversationHistory && self.conversationHistory.length > 0) {
          self.restoreHistoryToUI();
        } else {
          msgs.innerHTML = '<div class="welcome-message"><div class="welcome-icon">👋</div><div class="welcome-text">' + texts.welcome + '</div></div>';
        }
      }
      
      console.log('✅ 언어 변경 완료: ' + lang);
      
      setTimeout(function() {
        isProcessing = false;
      }, 300);
    };
    
    const style = document.createElement('style');
    style.textContent = `
      .chatbot-container {
        overflow: visible !important;
        z-index: 9999 !important;
      }
      
      .chatbot-header {
        overflow: visible !important;
        z-index: 10000 !important;
      }
      
      .language-selector {
        z-index: 10002 !important;
        position: relative !important;
      }
      
      .language-dropdown {
        display: block !important;
        position: absolute !important;
        z-index: 999999 !important;
      }
      
      .language-dropdown.hidden {
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      
      .language-dropdown:not(.hidden) {
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      
      .lang-option {
        pointer-events: auto !important;
        cursor: pointer !important;
        min-height: 44px !important;
        z-index: 1000000 !important;
      }
    `;
    document.head.appendChild(style);
    
    dropdown.addEventListener('click', function(e) {
      const langBtn = e.target.closest('.lang-option');
      
      if (langBtn) {
        e.preventDefault();
        e.stopPropagation();
        
        const lang = langBtn.getAttribute('data-lang');
        handleLanguageChange(lang);
      }
    }, true);
    
    dropdown.addEventListener('touchend', function(e) {
      const langBtn = e.target.closest('.lang-option');
      
      if (langBtn) {
        e.preventDefault();
        e.stopPropagation();
        
        const lang = langBtn.getAttribute('data-lang');
        handleLanguageChange(lang);
      }
    }, true);
    
    console.log('✅ HAIRGATOR 언어 선택 시스템 초기화 완료');
  }
}

// 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.hairgatorChatbot = new HairGatorChatbot();
  console.log('🦎 HAIRGATOR v3.1 챗봇 로드 완료 (최종 수정: 도해도 스크롤 완벽 해결)');
});
