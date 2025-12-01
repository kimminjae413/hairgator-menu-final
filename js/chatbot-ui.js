// js/chatbot-ui.js - HAIRGATOR v5.0 UI Module - FINAL VERSION (2025-01-25)
// ✅ 성별 선택 UI 통합 완료
// ✅ 이중 JSON 파싱 완료
// ✅ 모달 스크롤 활성화
// ✅ 도해도 세로 배치

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

    // 유저별 히스토리 관리 (7일 보관 후 자동 삭제)
    this.currentUserId = null;
    this.HISTORY_EXPIRE_DAYS = 7;  // 7일 후 자동 삭제
    this.MAX_MESSAGES_PER_USER = 200;  // 최대 200개 메시지 보관

    // ⭐ 이미지 업로드 임시 저장
    this.pendingImage = null;

    this.initUserHistory();
    this.init();

    console.log('✅ HairGatorChatbot 초기화 완료');
  }

  // ==================== localStorage 관리 ====================

  getStoredLanguage() {
    try {
      // ⭐ 메인 앱과 동일한 키 사용
      return localStorage.getItem('hairgator_language') || 'ko';
    } catch (e) {
      console.warn('⚠️ localStorage 접근 실패, 기본값 사용:', e);
      return 'ko';
    }
  }

  setStoredLanguage(lang) {
    try {
      // ⭐ 메인 앱과 동일한 키 사용
      localStorage.setItem('hairgator_language', lang);
      console.log(`✅ localStorage 저장 성공: ${lang}`);

      // ⭐ 메인 앱의 언어도 동기화
      if (window.setLanguage) {
        window.setLanguage(lang);
      }

      return true;
    } catch (e) {
      console.warn('⚠️ localStorage 저장 실패:', e);
      return false;
    }
  }

  // ==================== Firebase 기반 유저 히스토리 관리 ====================

  async initUserHistory() {
    try {
      // 불나비 유저 또는 Firebase Auth 유저 확인
      const bullnabiUser = window.getBullnabiUser ? window.getBullnabiUser() : null;
      const firebaseUser = firebase.auth ? firebase.auth().currentUser : null;

      if (bullnabiUser && bullnabiUser.userId) {
        this.currentUserId = bullnabiUser.userId;
        console.log(`👤 불나비 유저 ID: ${this.currentUserId}`);
      } else if (firebaseUser && firebaseUser.uid) {
        this.currentUserId = firebaseUser.uid;
        console.log(`👤 Firebase 유저 ID: ${this.currentUserId}`);
      } else {
        this.currentUserId = this.getOrCreateAnonymousId();
        console.log(`👤 임시 유저 ID: ${this.currentUserId}`);
      }

      // Firebase에서 히스토리 로드
      await this.loadUserHistoryFromFirebase();

      // 7일 지난 메시지 삭제
      await this.cleanExpiredMessagesFromFirebase();

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

  // Firebase에서 대화 기록 로드
  async loadUserHistoryFromFirebase() {
    try {
      if (!this.currentUserId || !window.db) {
        console.warn('⚠️ Firebase 또는 유저 ID 없음, 로컬 폴백');
        this.loadUserHistoryFromLocal();
        return;
      }

      const expireTime = Date.now() - (this.HISTORY_EXPIRE_DAYS * 24 * 60 * 60 * 1000);

      const snapshot = await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .where('timestamp', '>', expireTime)
        .orderBy('timestamp', 'asc')
        .limit(this.MAX_MESSAGES_PER_USER)
        .get();

      this.conversationHistory = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        this.conversationHistory.push({
          id: doc.id,
          sender: data.sender,
          content: data.content,
          timestamp: data.timestamp
        });
      });

      console.log(`📚 Firebase 히스토리 로드: ${this.conversationHistory.length}개 메시지`);

      if (this.conversationHistory.length > 0) {
        this.restoreHistoryToUI();
      }

    } catch (e) {
      console.error('❌ Firebase 히스토리 로드 실패:', e);
      // 로컬 폴백
      this.loadUserHistoryFromLocal();
    }
  }

  // 로컬 스토리지 폴백
  loadUserHistoryFromLocal() {
    try {
      const key = `hairgator_history_${this.currentUserId}`;
      const saved = localStorage.getItem(key);

      if (saved) {
        this.conversationHistory = JSON.parse(saved);
        console.log(`📚 로컬 히스토리 로드: ${this.conversationHistory.length}개 메시지`);
        this.restoreHistoryToUI();
      }
    } catch (e) {
      console.error('❌ 로컬 히스토리 로드 실패:', e);
      this.conversationHistory = [];
    }
  }

  // Firebase에 메시지 저장
  async saveMessageToFirebase(sender, content) {
    try {
      if (!this.currentUserId || !window.db) {
        console.warn('⚠️ Firebase 없음, 로컬에만 저장');
        return;
      }

      const message = {
        sender: sender,
        content: content,
        timestamp: Date.now(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .add(message);

      console.log(`💾 Firebase 메시지 저장 완료`);

    } catch (e) {
      console.error('❌ Firebase 저장 실패:', e);
    }
  }

  // 7일 지난 메시지 삭제 (Firebase)
  async cleanExpiredMessagesFromFirebase() {
    try {
      if (!this.currentUserId || !window.db) return;

      const expireTime = Date.now() - (this.HISTORY_EXPIRE_DAYS * 24 * 60 * 60 * 1000);

      const snapshot = await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .where('timestamp', '<', expireTime)
        .get();

      if (snapshot.empty) {
        console.log('🗑️ 삭제할 만료 메시지 없음');
        return;
      }

      // 배치 삭제 (최대 500개씩)
      const batch = window.db.batch();
      let deleteCount = 0;

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        deleteCount++;
      });

      await batch.commit();
      console.log(`🗑️ Firebase에서 ${deleteCount}개 만료 메시지 삭제 (${this.HISTORY_EXPIRE_DAYS}일 이상)`);

    } catch (e) {
      console.error('❌ Firebase 만료 메시지 삭제 실패:', e);
    }
  }

  restoreHistoryToUI() {
    try {
      const messagesDiv = document.getElementById('chatbot-messages');
      if (!messagesDiv) return;

      messagesDiv.innerHTML = '';

      // 날짜별로 그룹화하여 표시
      let lastDate = null;

      this.conversationHistory.forEach(msg => {
        // 날짜 구분선 추가
        if (msg.timestamp) {
          const msgDate = new Date(msg.timestamp).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          if (msgDate !== lastDate) {
            const dateDivider = `
              <div class="chat-date-divider">
                <span>${msgDate}</span>
              </div>
            `;
            messagesDiv.insertAdjacentHTML('beforeend', dateDivider);
            lastDate = msgDate;
          }
        }

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

      // Firebase에 저장 (비동기)
      this.saveMessageToFirebase(sender, content);

      // 로컬에도 백업 저장
      this.saveUserHistoryToLocal();

    } catch (e) {
      console.error('❌ 히스토리 추가 실패:', e);
    }
  }

  // 로컬 백업 저장
  saveUserHistoryToLocal() {
    try {
      if (!this.currentUserId) return;

      const key = `hairgator_history_${this.currentUserId}`;

      if (this.conversationHistory.length > this.MAX_MESSAGES_PER_USER) {
        this.conversationHistory = this.conversationHistory.slice(-this.MAX_MESSAGES_PER_USER);
      }

      localStorage.setItem(key, JSON.stringify(this.conversationHistory));

    } catch (e) {
      console.warn('⚠️ 로컬 백업 저장 실패:', e);
    }
  }

  // 대화 기록 전체 삭제 (Firebase + 로컬)
  async clearUserHistory() {
    try {
      if (!this.currentUserId) return;

      // Firebase에서 삭제
      if (window.db) {
        const snapshot = await window.db
          .collection('chatHistory')
          .doc(this.currentUserId)
          .collection('messages')
          .get();

        if (!snapshot.empty) {
          const batch = window.db.batch();
          snapshot.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`🗑️ Firebase에서 ${snapshot.size}개 메시지 삭제`);
        }
      }

      // 로컬에서도 삭제
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
        title: '🤖 HAIRGATOR AI',
        welcome: '헤어스타일 이미지를 업로드하거나 질문해주세요',
        analyzing: '📊 이미지 분석 중...',
        generating: '🤖 답변 생성 중...',
        placeholder: '헤어스타일 검색...',
        indexTitle: '📑 색인',
        errorSize: '⚠️ 이미지 크기는 5MB 이하여야 합니다.',
        errorType: '⚠️ 이미지 파일만 업로드 가능합니다.',
        selectGender: '성별을 선택해주세요'
      },
      en: {
        title: '🤖 HAIRGATOR AI',
        welcome: 'Upload a hairstyle image or ask a question',
        analyzing: '📊 Analyzing image...',
        generating: '🤖 Generating response...',
        placeholder: 'Search hairstyle...',
        indexTitle: '📑 Index',
        errorSize: '⚠️ Image size must be under 5MB.',
        errorType: '⚠️ Only image files are allowed.',
        selectGender: 'Please select gender'
      },
      ja: {
        title: '🤖 HAIRGATOR AI',
        welcome: 'ヘアスタイル画像をアップロードするか質問してください',
        analyzing: '📊 画像分析中...',
        generating: '🤖 生成中...',
        placeholder: 'ヘアスタイル検索...',
        indexTitle: '📑 索引',
        errorSize: '⚠️ 画像サイズは5MB以下である必要があります。',
        errorType: '⚠️ 画像ファイルのみアップロード可能です。',
        selectGender: '性別を選択してください'
      },
      zh: {
        title: '🤖 HAIRGATOR AI',
        welcome: '上传发型图片或提问',
        analyzing: '📊 正在分析图片...',
        generating: '🤖 正在生成...',
        placeholder: '搜索发型...',
        indexTitle: '📑 索引',
        errorSize: '⚠️ 图片大小必须小于5MB。',
        errorType: '⚠️ 仅允许上传图片文件。',
        selectGender: '请选择性别'
      },
      vi: {
        title: '🤖 HAIRGATOR AI',
        welcome: 'Tải lên hình ảnh kiểu tóc hoặc đặt câu hỏi',
        analyzing: '📊 Đang phân tích hình ảnh...',
        generating: '🤖 Đang tạo...',
        placeholder: 'Tìm kiếm kiểu tóc...',
        indexTitle: '📑 Mục lục',
        errorSize: '⚠️ Kích thước hình ảnh phải dưới 5MB.',
        errorType: '⚠️ Chỉ cho phép tải lên tệp hình ảnh.',
        selectGender: 'Vui lòng chọn giới tính'
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
              <p><strong>HAIRGATOR v5.0</strong></p>
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

    this.addModalScrollStyles();
  }

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
        padding-bottom: 100px !important;
        -webkit-overflow-scrolling: touch !important;
      }
      
      /* 도해도 컨테이너 - 세로 배치 */
      .style-cards-container {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        padding: 20px 10px !important;
        margin-top: 20px !important;
        margin-bottom: 40px !important;
        position: relative !important;
        width: 100% !important;
      }
      
      /* 도해도 카드 - 전체 너비 */
      .style-card {
        width: 100% !important;
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
        height: auto !important;
        max-height: 400px !important;
        object-fit: contain !important;
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
      
      /* 메시지 스크롤바 */
      .chatbot-messages::-webkit-scrollbar {
        width: 6px !important;
      }
      
      .chatbot-messages::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3) !important;
        border-radius: 3px !important;
      }
      
      /* 타이핑 인디케이터 애니메이션 */
      .typing-indicator {
        display: inline-block;
        font-weight: bold;
        color: #2196F3;
        animation: typing 1.4s infinite ease-in-out both;
      }
      
      @keyframes typing {
        0% { opacity: 0.2; }
        50% { opacity: 1; }
        100% { opacity: 0.2; }
      }
    `;
    document.head.appendChild(style);
    console.log('✅ 모달 스크롤 스타일 추가 완료');
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
    this.currentLanguage = lang;
    this.core.currentLanguage = lang;
    this.setStoredLanguage(lang);

    const texts = this.getTexts();

    setTimeout(() => {
      const titleEl = document.getElementById('chatbot-title');
      if (titleEl) titleEl.textContent = texts.title;

      const inputEl = document.getElementById('chatbot-input');
      if (inputEl) inputEl.placeholder = texts.placeholder;

      const indexTitleEl = document.getElementById('index-modal-title');
      if (indexTitleEl) indexTitleEl.textContent = texts.indexTitle;

      const welcomeTextEl = document.getElementById('welcome-text');
      if (welcomeTextEl) welcomeTextEl.textContent = texts.welcome;

      const messagesDiv = document.getElementById('chatbot-messages');
      if (messagesDiv) {
        messagesDiv.innerHTML = `
          <div class="welcome-message">
            <div class="welcome-icon">👋</div>
            <div class="welcome-text">${texts.welcome}</div>
          </div>
        `;
      }

      this.conversationHistory = [];
      console.log(`✅ 언어 변경 완료: ${lang}`);
    }, 10);
  }

  // ==================== 이미지 업로드 핸들러 (성별 선택 통합) ====================

  async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 파일 크기 체크
    if (file.size > 5 * 1024 * 1024) {
      const texts = this.getTexts();
      this.addMessage('bot', texts.errorSize);
      return;
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      const texts = this.getTexts();
      this.addMessage('bot', texts.errorType);
      return;
    }

    try {
      // 이미지 미리보기 표시
      const previewURL = URL.createObjectURL(file);
      this.addMessage('user', `<img src="${previewURL}" alt="Uploaded Image" style="max-width:200px;border-radius:8px;">`);

      // ⭐ 임시 저장
      this.pendingImage = {
        file: file,
        previewURL: previewURL
      };

      // ⭐⭐⭐ 성별 선택 UI 표시 ⭐⭐⭐
      const genderSelectionHTML = `
        <p>Please select the gender for this hairstyle:</p>
        <div style="display: flex; gap: 12px; margin-top: 12px;">
          <button class="gender-select-btn" data-gender="female" style="flex: 1; padding: 12px 20px; background: linear-gradient(135deg, #E91E63, #C2185B); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 15px; font-weight: 600; transition: all 0.3s;">
            👩 Female
          </button>
          <button class="gender-select-btn" data-gender="male" style="flex: 1; padding: 12px 20px; background: linear-gradient(135deg, #2196F3, #1976D2); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 15px; font-weight: 600; transition: all 0.3s;">
            👨 Male
          </button>
        </div>
      `;

      this.addMessage('bot', genderSelectionHTML);
      this.attachGenderButtonHandlers();

    } catch (error) {
      console.error('❌ 이미지 업로드 오류:', error);
      this.addMessage('bot', '❌ Image upload failed.');
    }

    event.target.value = '';
  }

  // ⭐⭐⭐ 성별 선택 버튼 핸들러 ⭐⭐⭐
  attachGenderButtonHandlers() {
    const buttons = document.querySelectorAll('.gender-select-btn');
    buttons.forEach(btn => {
      if (btn.dataset.handlerAttached) return;
      btn.dataset.handlerAttached = 'true';

      btn.addEventListener('click', async (e) => {
        const gender = e.target.dataset.gender || e.currentTarget.dataset.gender;
        await this.processImageWithGender(gender);
      });
    });
  }

  // ⭐⭐⭐ 성별 선택 후 이미지 처리 ⭐⭐⭐
  async processImageWithGender(gender) {
    if (!this.pendingImage) {
      this.addMessage('bot', '❌ No image found. Please upload again.');
      return;
    }

    try {
      const texts = this.getTexts();
      this.addMessage('bot', `✅ Selected: ${gender === 'female' ? '👩 Female' : '👨 Male'}`);
      this.addMessage('bot', texts.analyzing);

      const base64Image = await this.core.fileToBase64(this.pendingImage.file);

      // ⭐ 성별 정보 포함하여 API 호출
      const analysisResult = await this.core.analyzeImage(
        base64Image,
        this.pendingImage.file.type,
        gender  // ⭐⭐⭐ 핵심: 성별 전달
      );

      console.log('📊 분석 결과:', analysisResult);

      let params56;
      if (analysisResult.success && analysisResult.data) {
        params56 = analysisResult.data;
      } else if (analysisResult.data) {
        params56 = analysisResult.data;
      } else {
        params56 = analysisResult;
      }

      if (!params56 || !params56.length_category) {
        throw new Error('Invalid analysis result');
      }

      const formattedAnalysis = this.core.formatParameters(params56);
      this.replaceLastBotMessage(formattedAnalysis);

      this.addMessage('bot', texts.generating);

      const recipeResult = await this.core.generateRecipe(params56, this.currentLanguage);

      console.log('📥 레시피 결과:', recipeResult);

      let recipe = '';
      let styles = [];
      let parsedData = null;

      if (recipeResult.success && recipeResult.data) {
        parsedData = recipeResult.data;

        // 이중 JSON 파싱
        if (typeof parsedData.recipe === 'string' && parsedData.recipe.trim().startsWith('{')) {
          try {
            const innerJson = JSON.parse(parsedData.recipe);
            if (innerJson.success === true && innerJson.data) {
              parsedData = innerJson.data;
            } else if (innerJson.recipe) {
              parsedData = innerJson;
            }
          } catch (e) {
            console.warn('⚠️ 이중 JSON 파싱 실패');
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
        recipe = 'Recipe generation failed.';
      }

      // 레시피 렌더링
      if (recipe && recipe.length > 0 && typeof recipe === 'string') {
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
            console.warn('⚠️ 최종 파싱 실패');
          }
        }

        let formattedRecipe = recipe.replace(/\\n/g, '\n').replace(/\n/g, '<br>');
        const rendered = this.core.parseMarkdownWithHighlight(formattedRecipe);
        const wrappedRecipe = `<div class="recipe-text" style="white-space: normal; word-wrap: break-word; max-width: 100%; overflow-x: hidden;">${rendered}</div>`;

        this.replaceLastBotMessage(wrappedRecipe);
      } else {
        this.replaceLastBotMessage('⚠️ Recipe content is empty.');
      }

      // 도해도 표시
      if (styles && Array.isArray(styles) && styles.length > 0) {
        this.displayStyleCards(styles.slice(0, 3));
      }

      // ⭐ 임시 저장 초기화
      this.pendingImage = null;

    } catch (error) {
      console.error('❌ 이미지 처리 오류:', error);
      this.replaceLastBotMessage(`❌ Error: ${error.message}`);
      this.pendingImage = null;
    }
  }

  // ==================== 나머지 메서드들 (변경 없음) ====================

  async handleTextMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();

    if (!message) return;

    this.addMessage('user', message);
    input.value = '';

    this.addMessage('bot', '<span class="typing-indicator">...</span>');

    try {
      const response = await this.core.generateResponse(message, [], (partialResponse) => {
        // 스트리밍 업데이트
        const rendered = this.core.parseMarkdownWithHighlight(partialResponse);
        this.replaceLastBotMessage(rendered);
      });

      // 최종 완료 (혹시 누락된 업데이트 보장)
      const finalRendered = this.core.parseMarkdownWithHighlight(response);
      this.replaceLastBotMessage(finalRendered);

    } catch (error) {
      console.error('응답 생성 오류:', error);
      this.replaceLastBotMessage('답변 생성에 실패했습니다.');
    }
  }

  displayStyleCards(styles) {
    if (!styles || !Array.isArray(styles) || styles.length === 0) return;

    const cardsHTML = styles.map((style, index) => {
      const imageUrl = style.image_url || style.main_image_url || '';
      const hasValidImage = imageUrl && imageUrl.includes('supabase.co');
      const name = style.name || style.style_name_ko || '이름 없음';
      const code = style.code || style.sample_code || '';
      const similarity = style.similarity ? `(${(style.similarity * 100).toFixed(0)}% 매칭)` : '';

      return `
        <div class="style-card">
          ${hasValidImage ?
          `<img src="${imageUrl}" alt="${name}" loading="lazy">` :
          '<div style="height:300px;display:flex;align-items:center;justify-content:center;font-size:64px;">📄</div>'}
          <div class="style-card-info">
            <h4>${name} ${similarity}</h4>
            ${code ? `<span class="style-code">${code}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    this.addRawHTML(`<div class="style-cards-container">${cardsHTML}</div>`);

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

  attach89TermClickHandlers() {
    document.querySelectorAll('.term-89.clickable').forEach(termEl => {
      if (termEl.dataset.listenerAttached) return;
      termEl.dataset.listenerAttached = 'true';

      const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const termId = termEl.dataset.term;
        this.showIndexModal();

        setTimeout(() => {
          const targetCard = document.querySelector(`.term-card-single[data-term-id="${termId}"]`);
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetCard.style.border = '3px solid #2196F3';
            setTimeout(() => {
              targetCard.style.border = '';
            }, 2000);
          }
        }, 300);
      };

      termEl.addEventListener('click', handleClick);
      termEl.style.cursor = 'pointer';
    });
  }

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
}

// 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
  window.hairgatorChatbot = new HairGatorChatbot();
  console.log('✅ HAIRGATOR v5.0 챗봇 최종 버전 로드 완료');
});
