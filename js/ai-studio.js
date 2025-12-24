// ============================================================
// HAIRGATOR AI Studio - Pro Workstation JavaScript
// Split View Layout + Firebase Integration
// ============================================================

// ⭐ Pull-to-Refresh 비활성화 (웹뷰용) - 스크롤 가능 영역 제외
(function() {
    let lastY = 0;
    let scrollableParent = null;

    document.addEventListener('touchstart', function(e) {
        lastY = e.touches[0].clientY;

        // 터치 시작 시 스크롤 가능한 부모 요소 찾기
        scrollableParent = null;
        let el = e.target;
        while (el && el !== document.body) {
            const style = window.getComputedStyle(el);
            const overflowY = style.overflowY;
            if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                scrollableParent = el;
                break;
            }
            el = el.parentElement;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
        const currentY = e.touches[0].clientY;
        const isPullingDown = currentY > lastY;

        // 스크롤 가능한 컨테이너 내부인 경우
        if (scrollableParent) {
            // 스크롤이 최상단이고 아래로 당기는 경우에만 막기
            if (scrollableParent.scrollTop <= 0 && isPullingDown) {
                e.preventDefault();
            }
            // 그 외의 경우 (위로 스크롤하거나, 아래에 스크롤 여유가 있을 때)는 허용
            return;
        }

        // 스크롤 가능한 컨테이너 밖에서 페이지 최상단에서 아래로 당길 때만 막기
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        if (scrollTop <= 0 && isPullingDown) {
            e.preventDefault();
        }
    }, { passive: false });
})();

class AIStudio {
  constructor() {
    this.apiEndpoint = '/.netlify/functions/chatbot-api';
    this.currentLanguage = this.getStoredLanguage();
    this.conversationHistory = [];
    this.currentUserId = null;
    this.userPhotoUrl = null; // 사용자 프로필 사진 URL
    this.HISTORY_EXPIRE_DAYS = 7;
    this.MAX_MESSAGES = 200;
    this.currentSessionId = this.generateSessionId(); // 현재 대화 세션 ID

    // UI Elements
    this.messagesContainer = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('send-btn');
    this.imageUpload = document.getElementById('image-upload');
    this.canvasPanel = document.getElementById('canvas-panel');
    this.canvasContent = document.getElementById('canvas-content');
    this.canvasEmpty = document.getElementById('canvas-empty');
    this.canvasResult = document.getElementById('canvas-result');

    this.init();
  }

  // 사용자 프로필 사진 로드 (Firebase userSettings → localStorage → 불나비)
  async loadUserPhoto() {
    try {
      // Firebase brandSettings에서 프로필 사진 가져오기 (localStorage 사용 안 함)
      if (window.db) {
        const userStr = localStorage.getItem('bullnabi_user');
        if (userStr) {
          const userInfo = JSON.parse(userStr);
          const docId = `${userInfo.name}_${userInfo.phone || '0000'}`;

          try {
            const doc = await window.db.collection('brandSettings').doc(docId).get();
            if (doc.exists) {
              const data = doc.data();
              if (data.profileImage) {
                this.userPhotoUrl = data.profileImage;
                console.log('👤 Firebase brandSettings 프로필 사진 로드됨:', docId);
                return;
              }
            }
          } catch (fbError) {
            console.warn('Firebase 프로필 사진 로드 실패:', fbError);
          }
        }
      }

      // 불나비 사용자 정보에서 프로필 사진 가져오기 (fallback)
      const userStr = localStorage.getItem('bullnabi_user');
      if (userStr) {
        const userInfo = JSON.parse(userStr);
        this.userPhotoUrl = userInfo.photoUrl || userInfo.profileImage || userInfo.photo || userInfo.profilePhoto || userInfo.image || null;
        if (this.userPhotoUrl) {
          console.log('👤 불나비 프로필 사진 로드됨');
          return;
        }
      }

      console.log('👤 프로필 사진 없음 - 기본 아이콘 사용');
    } catch (e) {
      console.warn('프로필 사진 로드 실패:', e);
    }
  }

  // Firebase Auth 상태 변경 시 프로필 사진 업데이트
  setupAuthListener() {
    if (firebase && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user && user.photoURL) {
          this.userPhotoUrl = user.photoURL;
          console.log('👤 Firebase Auth 프로필 사진 업데이트됨');
        }
      });
    }
  }

  async init() {
    console.log('🚀 HAIRGATOR AI Studio 초기화 중...');

    // Event Listeners
    this.setupEventListeners();

    // Firebase Auth 리스너 설정 (프로필 사진 업데이트용)
    this.setupAuthListener();

    // 사용자 프로필 사진 로드 (Firebase userSettings에서)
    await this.loadUserPhoto();

    // User History
    await this.initUserHistory();

    // 다국어 적용 (i18n.js의 updateAllTexts 함수 사용)
    this.applyLanguage();

    console.log('✅ AI Studio 초기화 완료');
  }

  // 다국어 UI 적용
  applyLanguage() {
    const lang = this.currentLanguage;
    console.log(`🌐 AI Studio 언어 적용: ${lang}`);

    // i18n.js의 currentLanguage도 동기화
    if (typeof window.currentLanguage !== 'undefined') {
      window.currentLanguage = lang;
    }

    // i18n.js의 updateAllTexts 함수가 있으면 호출
    if (typeof updateAllTexts === 'function') {
      updateAllTexts(lang);
    } else {
      // fallback: 직접 DOM 업데이트
      this.updateDOMTexts(lang);
    }
  }

  // DOM 텍스트 직접 업데이트 (fallback)
  updateDOMTexts(lang) {
    // data-i18n 속성 처리
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.getTranslation(key);
      if (text) {
        el.textContent = text;
      }
    });

    // data-i18n-html 속성 처리
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const text = this.getTranslation(key);
      if (text) {
        el.innerHTML = text;
      }
    });

    // data-i18n-placeholder 속성 처리
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.getTranslation(key);
      if (text) {
        el.placeholder = text;
      }
    });
  }

  // 번역 텍스트 가져오기
  getTranslation(key) {
    try {
      if (typeof HAIRGATOR_I18N === 'undefined') return null;
      const keys = key.split('.');
      let value = HAIRGATOR_I18N[this.currentLanguage];
      for (const k of keys) {
        if (value && value[k]) {
          value = value[k];
        } else {
          return null;
        }
      }
      return value;
    } catch (e) {
      return null;
    }
  }

  setupEventListeners() {
    // Send Message - Enter 키 이벤트
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // 전역 sendMessage 호출 (이미지 체크 포함)
        sendMessage();
      }
    });

    // Canvas Tabs
    document.querySelectorAll('.canvas-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.canvas-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        const tabName = e.target.dataset.tab;
        this.switchCanvasTab(tabName);
      });
    });
  }

  // 캔버스 탭 전환
  switchCanvasTab(tabName) {
    const resultContainer = document.getElementById('canvas-result');
    const historyContainer = document.getElementById('canvas-history');
    const emptyState = document.getElementById('canvas-empty');

    if (tabName === 'result') {
      // 결과 탭
      if (historyContainer) historyContainer.classList.add('hidden');
      // 결과가 있으면 결과 보여주고, 없으면 empty state
      if (resultContainer && resultContainer.innerHTML.trim()) {
        resultContainer.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
      } else {
        if (resultContainer) resultContainer.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
      }
    } else if (tabName === 'history') {
      // 히스토리 탭
      if (resultContainer) resultContainer.classList.add('hidden');
      if (emptyState) emptyState.classList.add('hidden');
      if (historyContainer) historyContainer.classList.remove('hidden');
      this.loadHistoryToCanvas();
    }
  }

  // 히스토리를 캔버스에 로드
  async loadHistoryToCanvas() {
    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');

    if (!historyList) return;

    // Firebase에서 분석 히스토리 가져오기
    try {
      const analysisHistory = await this.getAnalysisHistory();

      if (analysisHistory.length === 0) {
        historyList.style.display = 'none';
        if (historyEmpty) historyEmpty.style.display = 'flex';
        return;
      }

      historyList.style.display = 'block';
      if (historyEmpty) historyEmpty.style.display = 'none';

      // 히스토리 데이터를 임시 저장 (상세보기용)
      this.historyData = analysisHistory;

      historyList.innerHTML = analysisHistory.map((item, idx) => `
        <div class="history-item" onclick="window.aiStudio.showHistoryDetail(${idx})">
          <div class="history-item-thumb">
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="분석 이미지">` : `<span>${item.hasCanvasData ? '📷' : '💬'}</span>`}
          </div>
          <div class="history-item-info">
            <div class="history-item-title">${item.title}</div>
            <div class="history-item-meta">
              <span>${item.messageCount}개 메시지</span>
              ${item.hasCanvasData ? '<span>• 레시피 포함</span>' : ''}
            </div>
            <div class="history-item-date">${this.formatDate(item.timestamp)}</div>
          </div>
          <button class="history-item-delete" onclick="event.stopPropagation(); window.aiStudio.deleteHistoryItem(${idx})" title="삭제">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      `).join('');

    } catch (e) {
      console.error('❌ 히스토리 로드 실패:', e);
      historyList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">히스토리를 불러올 수 없습니다.</p>';
    }
  }

  // 대화 히스토리 가져오기 (세션 단위로 그룹화)
  async getAnalysisHistory() {
    const sessions = {};

    // conversationHistory에서 세션별로 그룹화
    this.conversationHistory.forEach((msg, idx) => {
      const sessionId = msg.sessionId || 'default';

      if (!sessions[sessionId]) {
        sessions[sessionId] = {
          sessionId: sessionId,
          messages: [],
          firstUserMessage: null,
          timestamp: msg.timestamp,
          hasCanvasData: false,
          canvasData: null,
          imageUrl: null
        };
      }

      sessions[sessionId].messages.push({ ...msg, index: idx });

      // 첫 번째 사용자 메시지를 제목으로 사용
      if (msg.sender === 'user' && !sessions[sessionId].firstUserMessage) {
        // HTML 태그 제거하고 텍스트만 추출
        let cleanText = msg.content.replace(/<[^>]*>/g, '').trim();
        // 30자 이상이면 자르기
        if (cleanText.length > 30) {
          cleanText = cleanText.substring(0, 30) + '...';
        }
        sessions[sessionId].firstUserMessage = cleanText || '새 대화';
      }

      // canvasData가 있으면 저장 (이미지 분석/레시피)
      if (msg.canvasData && msg.sender === 'bot') {
        sessions[sessionId].hasCanvasData = true;
        sessions[sessionId].canvasData = msg.canvasData;
        sessions[sessionId].imageUrl = msg.canvasData.imageUrl || null;
      }
    });

    // 세션 배열로 변환하고 최신순 정렬
    const history = Object.values(sessions).map(session => ({
      sessionId: session.sessionId,
      title: session.firstUserMessage || '새 대화',
      imageUrl: session.imageUrl,
      timestamp: session.timestamp,
      messageCount: session.messages.length,
      hasCanvasData: session.hasCanvasData,
      canvasData: session.canvasData,
      messages: session.messages
    }));

    return history.sort((a, b) => b.timestamp - a.timestamp); // 최신순
  }

  // 히스토리 상세 보기 - 해당 세션의 대화를 채팅창에 로드
  showHistoryDetail(idx) {
    if (!this.historyData || !this.historyData[idx]) return;

    const session = this.historyData[idx];

    // 채팅창 초기화
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '';

    // 해당 세션의 메시지들을 채팅창에 표시
    session.messages.forEach(msg => {
      this.addMessageToUI(msg.sender, msg.content, false, msg.canvasData || null);
    });

    // 현재 세션 ID를 해당 세션으로 변경 (이어서 대화 가능)
    this.currentSessionId = session.sessionId;

    // 캔버스 패널 닫기
    const canvasPanel = document.getElementById('canvas-panel');
    canvasPanel.classList.remove('active');

    // canvasData가 있으면 캔버스에도 표시
    if (session.hasCanvasData && session.canvasData) {
      if (session.canvasData.type === 'analysis') {
        this.showCanvas(session.canvasData);
      } else if (session.canvasData.customRecipe) {
        this.showCustomRecipeCanvas(session.canvasData, session.canvasData.uploadedImageUrl || '');
      } else {
        this.showCanvas(session.canvasData);
      }
    }

    // 스크롤을 맨 아래로
    this.scrollToBottom();
  }

  // 히스토리 항목 삭제 (세션 단위)
  async deleteHistoryItem(idx) {
    if (!confirm('이 대화를 삭제하시겠습니까?')) return;

    if (!this.historyData || !this.historyData[idx]) return;

    const session = this.historyData[idx];

    try {
      // 해당 세션의 모든 메시지 Firebase에서 삭제
      const batch = window.db.batch();

      for (const msg of session.messages) {
        if (msg.id) {
          const docRef = window.db
            .collection('chatHistory')
            .doc(this.currentUserId)
            .collection('messages')
            .doc(msg.id);
          batch.delete(docRef);
        }
      }

      await batch.commit();

      // 로컬에서도 삭제
      this.conversationHistory = this.conversationHistory.filter(
        m => m.sessionId !== session.sessionId
      );

      // UI 새로고침
      this.loadHistoryToCanvas();

    } catch (e) {
      console.error('❌ 삭제 실패:', e);
      alert(t('aiStudio.deleteFailed') || '삭제에 실패했습니다.');
    }
  }

  // 날짜 포맷
  formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }

  // ==================== Language ====================

  getStoredLanguage() {
    try {
      return localStorage.getItem('hairgator_language') || 'ko';
    } catch (e) {
      return 'ko';
    }
  }

  // 세션 ID 생성
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // ==================== User History (Firebase) ====================

  async initUserHistory() {
    try {
      const bullnabiUser = window.getBullnabiUser ? window.getBullnabiUser() : null;
      const firebaseUser = firebase.auth ? firebase.auth().currentUser : null;

      if (bullnabiUser && bullnabiUser.userId) {
        this.currentUserId = bullnabiUser.userId;
      } else if (firebaseUser && firebaseUser.uid) {
        this.currentUserId = firebaseUser.uid;
      } else {
        this.currentUserId = this.getOrCreateAnonymousId();
      }

      console.log(`👤 User ID: ${this.currentUserId}`);

      await this.loadUserHistoryFromFirebase();
      await this.cleanExpiredMessages();

    } catch (e) {
      console.error('❌ History init failed:', e);
      this.currentUserId = 'anon_' + Date.now();
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

  async loadUserHistoryFromFirebase() {
    try {
      if (!this.currentUserId || !window.db) {
        return;
      }

      const expireTime = Date.now() - (this.HISTORY_EXPIRE_DAYS * 24 * 60 * 60 * 1000);

      const snapshot = await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .where('timestamp', '>', expireTime)
        .orderBy('timestamp', 'asc')
        .limit(this.MAX_MESSAGES)
        .get();

      this.conversationHistory = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        this.conversationHistory.push({
          id: doc.id,
          sender: data.sender,
          content: data.content,
          timestamp: data.timestamp,
          canvasData: data.canvasData || null
        });
      });

      console.log(`📚 Loaded ${this.conversationHistory.length} messages from Firebase`);

      if (this.conversationHistory.length > 0) {
        this.restoreHistoryToUI();
      }

    } catch (e) {
      console.error('❌ Firebase load failed:', e);
    }
  }

  async saveMessageToFirebase(sender, content, canvasData = null) {
    try {
      if (!this.currentUserId || !window.db) return;

      const message = {
        sender: sender,
        content: content,
        timestamp: Date.now(),
        sessionId: this.currentSessionId, // 세션 ID 추가
        canvasData: canvasData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .add(message);

    } catch (e) {
      console.error('❌ Firebase save failed:', e);
    }
  }

  async cleanExpiredMessages() {
    try {
      if (!this.currentUserId || !window.db) return;

      const expireTime = Date.now() - (this.HISTORY_EXPIRE_DAYS * 24 * 60 * 60 * 1000);

      const snapshot = await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .where('timestamp', '<', expireTime)
        .get();

      if (snapshot.empty) return;

      const batch = window.db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      console.log(`🗑️ Deleted ${snapshot.size} expired messages`);

    } catch (e) {
      console.error('❌ Cleanup failed:', e);
    }
  }

  restoreHistoryToUI() {
    // Clear current messages except welcome
    const welcomeMsg = this.messagesContainer.querySelector('.message.bot');
    this.messagesContainer.innerHTML = '';
    if (welcomeMsg) {
      this.messagesContainer.appendChild(welcomeMsg);
    }

    let lastDate = null;

    this.conversationHistory.forEach(msg => {
      // Date Divider
      if (msg.timestamp) {
        const msgDate = new Date(msg.timestamp).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        if (msgDate !== lastDate) {
          this.addDateDivider(msgDate);
          lastDate = msgDate;
        }
      }

      // canvasData가 있으면 함께 복원
      this.addMessageToUI(msg.sender, msg.content, false, msg.canvasData || null);
    });

    this.scrollToBottom();
  }

  // ==================== Message Handling ====================

  async sendMessage(directText = null) {
    const text = directText || this.chatInput.value.trim();
    if (!text) return;

    // Clear input
    this.chatInput.value = '';

    // Add user message to UI
    this.addMessageToUI('user', text);

    // Save to history
    this.conversationHistory.push({
      sender: 'user',
      content: text,
      timestamp: Date.now()
    });
    this.saveMessageToFirebase('user', text);

    // ⭐ 스트리밍용: 빈 봇 메시지 박스를 먼저 추가
    const streamingMessageEl = this.addStreamingMessageToUI();
    const contentEl = streamingMessageEl.querySelector('.message-content');

    try {
      // ⭐ 스트리밍 API 호출
      const response = await this.callAPIStreaming(text, (chunk) => {
        // 실시간으로 텍스트 업데이트
        if (contentEl) {
          contentEl.innerHTML = this.formatMessage(chunk);
          this.scrollToBottom();
        }
      });

      // ⭐ 가이드 이미지가 있으면 콘텐츠에 추가
      let finalContent = response.content;
      if (response.guideImage) {
        finalContent += `\n\n<div class="guide-image-container">
          <img src="${response.guideImage.url}" alt="${response.guideImage.title}" class="guide-image" onclick="window.aiStudio.showFullImage('${response.guideImage.url}', '${response.guideImage.title}')">
          <span class="guide-image-caption">${response.guideImage.title}</span>
        </div>`;
      }

      // ⭐ 연관 질문이 있으면 콘텐츠에 추가
      if (response.relatedQuestions && response.relatedQuestions.questions?.length > 0) {
        const rq = response.relatedQuestions;
        const questionsHtml = rq.questions.map(q =>
          `<button class="related-question-chip" onclick="window.aiStudio.askRelatedQuestion('${q.replace(/'/g, "\\'")}')">${q}</button>`
        ).join('');

        finalContent += `\n\n<div class="related-questions-container">
          <p class="related-questions-intro">${rq.intro}</p>
          <div class="related-questions-chips">${questionsHtml}</div>
        </div>`;
      }

      // 최종 콘텐츠로 업데이트 (가이드 이미지, 연관 질문 포함)
      if (contentEl) {
        contentEl.innerHTML = this.formatMessage(finalContent);
      }

      // 스트리밍 표시 제거
      streamingMessageEl.classList.remove('streaming');

      // Save bot response
      this.conversationHistory.push({
        sender: 'bot',
        content: finalContent,
        timestamp: Date.now(),
        canvasData: response.canvasData
      });
      this.saveMessageToFirebase('bot', finalContent, response.canvasData);

      // If canvas data exists, show canvas
      if (response.canvasData) {
        this.showCanvas(response.canvasData);
      }
      // ⭐ guideImage가 있으면 캔버스에 가이드 카드 표시
      else if (response.guideImage) {
        this.showCanvas({
          type: 'guide',
          title: response.guideImage.title,
          imageUrl: response.guideImage.url,
          content: '' // 응답 내용은 채팅창에 이미 표시됨
        });
      }

      // ⭐ 챗봇 크레딧 차감 (토큰 사용량 기반 구간별)
      const totalTokens = response.tokenUsage?.totalTokens || 0;

      // 인사말 등 API 미호출 시(토큰 0)는 차감 스킵
      if (totalTokens > 0 && window.BullnabiBridge && typeof window.BullnabiBridge.deductTokensDynamic === 'function') {
        try {
          // 토큰 구간별 크레딧 계산
          // ~500: 3, 501~1500: 10, 1501~3000: 20, 3000+: 30
          let creditCost = 3;  // 기본값
          if (totalTokens > 3000) creditCost = 30;
          else if (totalTokens > 1500) creditCost = 20;
          else if (totalTokens > 500) creditCost = 10;

          const result = await window.BullnabiBridge.deductTokensDynamic(null, creditCost, 'chatbot', {
            query: text.substring(0, 100),
            tokenCount: totalTokens
          });

          if (result.success) {
            console.log(`💳 챗봇 크레딧 차감: ${creditCost} (토큰: ${totalTokens}), 잔액: ${result.newBalance}`);
          } else if (result.code === 'INSUFFICIENT_TOKENS') {
            console.warn('⚠️ 크레딧 부족');
          }
        } catch (tokenError) {
          console.warn('⚠️ 크레딧 차감 실패:', tokenError);
        }
      } else if (totalTokens === 0) {
        console.log('💬 인사말/캐시 응답 - 크레딧 차감 스킵');
      }

    } catch (error) {
      // 에러 시 스트리밍 메시지에 에러 표시
      if (contentEl) {
        contentEl.innerHTML = '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.';
      }
      streamingMessageEl.classList.remove('streaming');
      console.error('❌ API Error:', error);
    }
  }

  // ⭐ 스트리밍용 빈 메시지 박스 추가
  addStreamingMessageToUI() {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot streaming';
    messageDiv.innerHTML = `
      <div class="message-avatar bot-logo"><img src="icons/icon-72.png" alt="H"></div>
      <div class="message-content"><span class="typing-cursor">▋</span></div>
    `;
    messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
    return messageDiv;
  }

  async callAPI(query) {
    console.log('📤 API 호출:', query);

    // 최근 대화 히스토리 (최대 30개) - 맥락 유지용
    const recentHistory = this.conversationHistory
      .slice(-30)
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        content: msg.content
      }));

    // ⭐ 현재 활성 레시피 컨텍스트 (30분 이내면 유효)
    let recipeContext = null;
    if (this.currentRecipeContext && (Date.now() - this.currentRecipeContext.timestamp) < 30 * 60 * 1000) {
      recipeContext = this.currentRecipeContext;
      console.log('📋 레시피 컨텍스트 포함:', recipeContext.analysis?.styleCode || recipeContext.analysis?.lengthName);
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_response_stream',
        payload: {
          user_query: query,
          language: this.currentLanguage,
          chat_history: recentHistory,
          recipe_context: recipeContext  // ⭐ 레시피 컨텍스트 추가
        }
      })
    });

    console.log('📥 API 응답 상태:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // 응답 텍스트 전체 읽기
    const responseText = await response.text();
    console.log('📥 API 원본 응답:', responseText.substring(0, 500));

    // SSE 형식 파싱
    let fullContent = '';
    let guideImage = null; // ⭐ 가이드 이미지
    let relatedQuestions = null; // ⭐ 연관 질문
    const lines = responseText.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const data = JSON.parse(jsonStr);
          if (data.type === 'content' && data.content) {
            fullContent += data.content;
          } else if (data.type === 'guide_image') {
            // ⭐ 가이드 이미지 이벤트 처리
            guideImage = {
              url: data.imageUrl,
              title: data.title
            };
            console.log('📸 가이드 이미지 수신:', guideImage.title);
          } else if (data.type === 'related_questions') {
            // ⭐ 연관 질문 이벤트 처리
            relatedQuestions = {
              questionType: data.questionType,  // popular 또는 suggested
              intro: data.intro,
              questions: data.questions
            };
            console.log('💡 연관 질문 수신:', data.questionType, data.questions?.length || 0, '개');
          } else if (data.content) {
            fullContent += data.content;
          } else if (typeof data === 'string') {
            fullContent += data;
          }
        } catch (e) {
          // JSON이 아닌 경우 그냥 텍스트로 추가
          if (jsonStr && jsonStr !== '[DONE]') {
            fullContent += jsonStr;
          }
        }
      }
    }

    // SSE 파싱 실패시 원본 텍스트 사용
    if (!fullContent && responseText) {
      // JSON 응답인 경우
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.content) {
          fullContent = jsonResponse.content;
        } else if (jsonResponse.data && jsonResponse.data.content) {
          fullContent = jsonResponse.data.content;
        } else if (jsonResponse.message) {
          fullContent = jsonResponse.message;
        }
      } catch (e) {
        fullContent = responseText;
      }
    }

    console.log('📥 파싱된 내용:', fullContent.substring(0, 200));

    // Check if response contains recipe-like content
    const hasRecipeData = this.detectRecipeContent(fullContent);

    return {
      content: fullContent || '응답을 받지 못했습니다. 다시 시도해주세요.',
      canvasData: hasRecipeData ? this.parseRecipeData(fullContent) : null,
      guideImage: guideImage, // ⭐ 가이드 이미지 반환
      relatedQuestions: relatedQuestions // ⭐ 연관 질문 반환
    };
  }

  // ⭐ 실시간 스트리밍 API 호출
  async callAPIStreaming(query, onChunk) {
    console.log('📤 스트리밍 API 호출:', query);

    // 최근 대화 히스토리 (최대 30개) - 맥락 유지용
    const recentHistory = this.conversationHistory
      .slice(-30)
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        content: msg.content
      }));

    // 현재 활성 레시피 컨텍스트 (30분 이내면 유효)
    let recipeContext = null;
    if (this.currentRecipeContext && (Date.now() - this.currentRecipeContext.timestamp) < 30 * 60 * 1000) {
      recipeContext = this.currentRecipeContext;
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_response_stream',
        payload: {
          user_query: query,
          language: this.currentLanguage,
          chat_history: recentHistory,
          recipe_context: recipeContext
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // ⭐ ReadableStream으로 실시간 처리
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let guideImage = null;
    let relatedQuestions = null;
    let tokenUsage = null;  // ⭐ 토큰 사용량
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 청크를 텍스트로 디코딩
      buffer += decoder.decode(value, { stream: true });

      // 줄 단위로 파싱
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 마지막 불완전한 줄은 버퍼에 유지

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'content' && data.content) {
              fullContent += data.content;
              onChunk(fullContent); // ⭐ 실시간 콜백
            } else if (data.type === 'guide_image') {
              guideImage = {
                url: data.imageUrl,
                title: data.title
              };
            } else if (data.type === 'related_questions') {
              relatedQuestions = {
                questionType: data.questionType,
                intro: data.intro,
                questions: data.questions
              };
            } else if (data.type === 'token_usage') {
              // ⭐ 토큰 사용량 저장
              tokenUsage = {
                totalTokens: data.totalTokens || 0,
                promptTokens: data.promptTokens || 0,
                completionTokens: data.completionTokens || 0
              };
              console.log('📊 토큰 사용량:', tokenUsage.totalTokens);
            } else if (data.content) {
              fullContent += data.content;
              onChunk(fullContent);
            }
          } catch (e) {
            // JSON 파싱 실패 시 무시
          }
        }
      }
    }

    // 버퍼에 남은 데이터 처리
    if (buffer.startsWith('data: ')) {
      const jsonStr = buffer.slice(6).trim();
      if (jsonStr && jsonStr !== '[DONE]') {
        try {
          const data = JSON.parse(jsonStr);
          if (data.content) {
            fullContent += data.content;
          }
        } catch (e) {}
      }
    }

    console.log('📥 스트리밍 완료, 총 길이:', fullContent.length, '토큰:', tokenUsage?.totalTokens || 0);

    const hasRecipeData = this.detectRecipeContent(fullContent);

    return {
      content: fullContent || '응답을 받지 못했습니다.',
      canvasData: hasRecipeData ? this.parseRecipeData(fullContent) : null,
      guideImage: guideImage,
      relatedQuestions: relatedQuestions,
      tokenUsage: tokenUsage  // ⭐ 토큰 사용량 반환
    };
  }

  detectRecipeContent(content) {
    const keywords = ['Length', 'Layer', 'Graduation', 'Lifting', 'Section', '섹션', '리프팅', '레이어'];
    return keywords.some(k => content.includes(k)) && content.length > 200;
  }

  parseRecipeData(content) {
    // Extract structured data from response
    return {
      type: 'recipe',
      rawContent: content,
      title: this.extractTitle(content),
      specs: this.extractSpecs(content)
    };
  }

  extractTitle(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('**') || line.startsWith('#')) {
        return line.replace(/[*#]/g, '').trim().substring(0, 50);
      }
    }
    return '스타일 분석 결과';
  }

  extractSpecs(content) {
    const specs = {};

    // Length
    const lengthMatch = content.match(/([A-H])\s*Length/i);
    if (lengthMatch) specs.length = lengthMatch[1].toUpperCase() + ' Length';

    // Form
    if (content.includes('Layer') || content.includes('레이어')) specs.form = 'Layer';
    else if (content.includes('Graduation') || content.includes('그래쥬에이션')) specs.form = 'Graduation';
    else if (content.includes('One Length') || content.includes('원렝스')) specs.form = 'One Length';

    // Lifting
    const liftMatch = content.match(/L([0-8])/);
    if (liftMatch) specs.lifting = `L${liftMatch[1]}`;

    // Section
    if (content.includes('DBS')) specs.section = 'DBS (후대각)';
    else if (content.includes('DFS')) specs.section = 'DFS (전대각)';
    else if (content.includes('VS')) specs.section = 'VS (수직)';
    else if (content.includes('HS')) specs.section = 'HS (수평)';

    return specs;
  }

  // ==================== UI Methods ====================

  addMessageToUI(sender, content, animate = true, canvasData = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    if (animate) messageDiv.style.animation = 'messageSlide 0.3s ease';

    // 아바타: 봇은 이모지, 사용자는 프로필 사진 또는 기본 아이콘
    let avatarHtml;
    if (sender === 'bot') {
      avatarHtml = `<div class="message-avatar bot-logo"><img src="icons/icon-72.png" alt="H"></div>`;
    } else {
      // 사용자 프로필 사진이 있으면 이미지로, 없으면 기본 아이콘
      if (this.userPhotoUrl) {
        avatarHtml = `<div class="message-avatar user-photo"><img src="${this.userPhotoUrl}" alt="프로필" onerror="this.parentElement.innerHTML='👤'"></div>`;
      } else {
        avatarHtml = `<div class="message-avatar">👤</div>`;
      }
    }

    let canvasButton = '';
    if (canvasData) {
      canvasButton = `
        <div class="view-canvas-btn" onclick="window.aiStudio.showCanvas(${JSON.stringify(canvasData).replace(/"/g, '&quot;')})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 3v18M3 9h18"/>
          </svg>
          <span>상세 결과 보기 →</span>
        </div>
      `;
    }

    messageDiv.innerHTML = `
      ${avatarHtml}
      <div class="message-content">
        ${this.formatMessage(content)}
        ${canvasButton}
      </div>
    `;

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  formatMessage(content) {
    // Basic markdown-like formatting
    let formatted = content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    return `<p>${formatted}</p>`;
  }

  addDateDivider(date) {
    const divider = document.createElement('div');
    divider.className = 'chat-date-divider';
    divider.innerHTML = `<span>${date}</span>`;
    this.messagesContainer.appendChild(divider);
  }

  showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'message bot';
    typing.id = 'typing-indicator';
    typing.innerHTML = `
      <div class="message-avatar bot-logo"><img src="icons/icon-72.png" alt="H"></div>
      <div class="message-content">
        <div class="typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(typing);
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  // ==================== Canvas Methods ====================

  showCanvas(canvasData) {
    this.canvasEmpty.classList.add('hidden');
    this.canvasResult.classList.remove('hidden');

    // Generate canvas content
    if (canvasData.type === 'customRecipe' || canvasData.customRecipe === true) {
      // ⭐ customRecipe 타입: showCustomRecipeCanvas로 위임
      // canvasData 구조 변환: recipe → customRecipe (showCustomRecipeCanvas가 기대하는 형식)
      const transformedData = {
        ...canvasData,
        customRecipe: canvasData.recipe || canvasData.customRecipe, // recipe 필드를 customRecipe로 매핑
        mainDiagrams: canvasData.mainDiagrams || []
      };
      this.showCustomRecipeCanvas(transformedData, canvasData.uploadedImageUrl || '');
      return;
    } else if (canvasData.type === 'recipe') {
      this.canvasResult.innerHTML = this.generateRecipeCard(canvasData);
    } else if (canvasData.type === 'analysis') {
      this.canvasResult.innerHTML = this.generateAnalysisCard(canvasData);
    } else if (canvasData.type === 'guide') {
      this.canvasResult.innerHTML = this.generateGuideCard(canvasData);
    }

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }
  }

  generateRecipeCard(data) {
    const specs = data.specs || {};

    return `
      <div class="recipe-card">
        <div class="recipe-card-header">
          <div>
            <h2>${data.title || '스타일 레시피'}</h2>
            <div class="recipe-badges">
              ${specs.length ? `<span class="badge length">${specs.length}</span>` : ''}
              ${specs.form ? `<span class="badge form">${specs.form}</span>` : ''}
            </div>
          </div>
          <div class="recipe-card-actions">
            <button class="card-action-btn" onclick="window.aiStudio.saveResult()" title="저장">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
            </button>
          </div>
        </div>

        ${Object.keys(specs).length > 0 ? `
        <div class="specs-box-full">
          ${specs.length ? `
            <div class="spec-item highlight">
              <label>Length</label>
              <span>${specs.length}</span>
            </div>
          ` : ''}
          ${specs.form ? `
            <div class="spec-item">
              <label>Form</label>
              <span>${specs.form}</span>
            </div>
          ` : ''}
          ${specs.section ? `
            <div class="spec-item">
              <label>Section</label>
              <span>${specs.section}</span>
            </div>
          ` : ''}
          ${specs.lifting ? `
            <div class="spec-item">
              <label>Lifting</label>
              <span>${specs.lifting}</span>
            </div>
          ` : ''}
        </div>
        ` : ''}

        <div class="guide-section">
          <h3>💡 상세 가이드</h3>
          <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.7;">
            ${data.rawContent || ''}
          </div>
        </div>
      </div>
    `;
  }

  generateAnalysisCard(data) {
    return `
      <div class="analysis-card">
        <div class="analysis-header">
          ${data.imageUrl ? `<img src="${data.imageUrl}" class="analysis-image" alt="분석 이미지">` : ''}
          <div class="analysis-summary">
            <h2>이미지 분석 결과</h2>
            <p>2WAY CUT 시스템 기반 분석</p>
          </div>
        </div>
        <div class="analysis-params">
          ${Object.entries(data.params || {}).map(([key, value]) => `
            <div class="param-item">
              <label>${key}</label>
              <span>${value}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  hideCanvas() {
    this.canvasPanel.classList.remove('active');
  }

  // ==================== 가이드 이미지 캔버스 카드 ====================
  generateGuideCard(data) {
    const t = window.t || ((key) => key);
    return `
      <div class="guide-card">
        <div class="guide-card-header">
          <h2>📚 ${data.title || '이론 가이드'}</h2>
        </div>

        ${data.imageUrl ? `
        <div class="guide-card-image">
          <img src="${data.imageUrl}" alt="${data.title}" onclick="window.aiStudio.showFullImage('${data.imageUrl}', '${data.title}')">
        </div>
        ` : ''}

        ${data.content ? `
        <div class="guide-card-content">
          <div class="guide-text">${data.content}</div>
        </div>
        ` : ''}

        ${data.relatedTerms && data.relatedTerms.length > 0 ? `
        <div class="guide-card-terms">
          <h3>🔗 관련 용어</h3>
          <div class="terms-chips">
            ${data.relatedTerms.map(term => `<span class="term-chip">${term}</span>`).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  // ==================== 가이드 이미지 전체화면 (핀치 줌 지원) ====================
  showFullImage(imageUrl, title) {
    // 오버레이 생성
    const overlay = document.createElement('div');
    overlay.className = 'full-image-overlay';
    overlay.innerHTML = `
      <div class="full-image-container">
        <button class="full-image-close">✕</button>
        <div class="pinch-zoom-wrapper">
          <img src="${imageUrl}" alt="${title}" class="pinch-zoom-image">
        </div>
        <div class="full-image-title">${title}</div>
      </div>
    `;

    const closeBtn = overlay.querySelector('.full-image-close');
    const wrapper = overlay.querySelector('.pinch-zoom-wrapper');
    const img = overlay.querySelector('.pinch-zoom-image');

    // 닫기 버튼
    closeBtn.addEventListener('click', () => overlay.remove());

    // 배경 클릭 시 닫기
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // ===== 핀치 줌 & 드래그 구현 =====
    let scale = 1;
    let posX = 0;
    let posY = 0;
    let lastTouchDistance = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let isDragging = false;

    // 두 터치 포인트 간 거리 계산
    const getTouchDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // 두 터치 포인트 중심점
    const getTouchCenter = (touches) => {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
    };

    // 변환 적용
    const applyTransform = () => {
      img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;
    };

    // 터치 시작
    wrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        // 핀치 줌 시작
        e.preventDefault();
        lastTouchDistance = getTouchDistance(e.touches);
      } else if (e.touches.length === 1 && scale > 1) {
        // 드래그 시작 (확대 상태에서만)
        isDragging = true;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
    }, { passive: false });

    // 터치 이동
    wrapper.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        // 핀치 줌
        e.preventDefault();
        const newDistance = getTouchDistance(e.touches);
        const delta = newDistance / lastTouchDistance;

        scale = Math.min(Math.max(scale * delta, 1), 5); // 1x ~ 5x
        lastTouchDistance = newDistance;

        // 1x로 돌아오면 위치 리셋
        if (scale === 1) {
          posX = 0;
          posY = 0;
        }

        applyTransform();
      } else if (e.touches.length === 1 && isDragging && scale > 1) {
        // 드래그 (확대 상태에서만)
        e.preventDefault();
        const deltaX = e.touches[0].clientX - lastTouchX;
        const deltaY = e.touches[0].clientY - lastTouchY;

        posX += deltaX;
        posY += deltaY;

        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;

        applyTransform();
      }
    }, { passive: false });

    // 터치 종료
    wrapper.addEventListener('touchend', (e) => {
      isDragging = false;
      if (e.touches.length < 2) {
        lastTouchDistance = 0;
      }
    });

    // 더블 탭으로 확대/축소 토글
    let lastTap = 0;
    wrapper.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        const now = Date.now();
        if (now - lastTap < 300) {
          // 더블 탭
          if (scale > 1) {
            scale = 1;
            posX = 0;
            posY = 0;
          } else {
            scale = 2.5;
          }
          applyTransform();
        }
        lastTap = now;
      }
    });

    // 스타일 추가
    wrapper.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; touch-action: none;';
    img.style.cssText = 'max-width: 100%; max-height: 100%; object-fit: contain; transition: transform 0.1s ease-out; transform-origin: center center;';

    document.body.appendChild(overlay);
  }

  // ==================== 연관 질문 클릭 처리 ====================
  askRelatedQuestion(question) {
    console.log('💡 연관 질문 클릭:', question);
    // 입력창에 질문 입력
    if (this.chatInput) {
      this.chatInput.value = question;
    }
    // 질문 전송
    this.sendMessage();
    // 해당 연관 질문 컨테이너 숨기기 (클릭한 것만)
    const containers = document.querySelectorAll('.related-questions-container');
    if (containers.length > 0) {
      containers[containers.length - 1].style.opacity = '0.5';
    }
  }

  // ==================== Image Upload ====================

  async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      alert(t('aiStudio.onlyImageFiles') || '이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(t('aiStudio.imageSizeLimit5MB') || '이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    // Show user message with image preview
    const imageUrl = URL.createObjectURL(file);
    this.addMessageToUI('user', `<img src="${imageUrl}" style="max-width: 200px; border-radius: 8px;" alt="업로드된 이미지">`);

    // Convert to base64
    const base64 = await this.fileToBase64(file);

    // 재분석용 이미지 데이터 저장
    this.pendingImageBase64 = base64;
    this.pendingMimeType = file.type;

    // Show typing
    this.showTypingIndicator();

    try {
      // Call analyze API
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
      this.hideTypingIndicator();

      if (result.success && result.data) {
        const analysisText = this.formatAnalysisResult(result.data);
        this.addMessageToUI('bot', analysisText, true, {
          type: 'analysis',
          imageUrl: imageUrl,
          params: result.data.parameters_56 || result.data
        });

        // Show in canvas
        this.showCanvas({
          type: 'analysis',
          imageUrl: imageUrl,
          params: result.data.parameters_56 || result.data
        });
      } else {
        this.addMessageToUI('bot', '이미지 분석에 실패했습니다. 다시 시도해주세요.');
      }

    } catch (error) {
      this.hideTypingIndicator();
      this.addMessageToUI('bot', '이미지 분석 중 오류가 발생했습니다.');
      console.error('❌ Image analysis error:', error);
    }

    // Reset input
    event.target.value = '';
  }

  formatAnalysisResult(data) {
    const params = data.parameters_56 || data;
    let result = '**📊 이미지 분석 완료!**\n\n';

    if (params.length_category) {
      result += `📏 **길이**: ${params.length_category}\n`;
    }
    if (params.cut_form) {
      result += `✂️ **형태**: ${params.cut_form}\n`;
    }
    if (params.volume_zone) {
      result += `📐 **볼륨**: ${params.volume_zone}\n`;
    }

    result += '\n👉 상세 결과를 확인하려면 "상세 결과 보기"를 클릭하세요.';

    return result;
  }

  fileToBase64(file) {
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

  // ==================== Firebase Storage 이미지 업로드 (7일 보관) ====================

  async uploadImageToStorage(file) {
    try {
      if (!firebase.storage) {
        console.warn('Firebase Storage not available, using blob URL');
        return URL.createObjectURL(file);
      }

      const storage = firebase.storage();
      const userId = this.currentUserId || 'anonymous';
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `temp_uploads/${userId}/${timestamp}_${randomStr}.${ext}`;

      console.log(`📤 이미지 업로드 중: ${filePath}`);

      const storageRef = storage.ref(filePath);

      // 메타데이터에 업로드 시간 저장 (cleanup용)
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedAt: timestamp.toString(),
          userId: userId,
          expiresAt: (timestamp + 7 * 24 * 60 * 60 * 1000).toString() // 7일 후
        }
      };

      const snapshot = await storageRef.put(file, metadata);
      const downloadURL = await snapshot.ref.getDownloadURL();

      console.log(`✅ 이미지 업로드 완료: ${downloadURL}`);
      return downloadURL;

    } catch (error) {
      console.error('❌ Firebase Storage 업로드 실패:', error);
      // 실패 시 blob URL fallback
      return URL.createObjectURL(file);
    }
  }

  // ==================== Actions ====================

  async clearFirebaseHistory() {
    try {
      if (!this.currentUserId || !window.db) return;

      const snapshot = await window.db
        .collection('chatHistory')
        .doc(this.currentUserId)
        .collection('messages')
        .get();

      if (snapshot.empty) return;

      const batch = window.db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      console.log('🗑️ Firebase history cleared');

    } catch (e) {
      console.error('❌ Clear Firebase history failed:', e);
    }
  }

  saveResult() {
    alert(t('aiStudio.saveComingSoon') || '저장 기능은 준비 중입니다.');
  }

  shareResult() {
    if (navigator.share) {
      navigator.share({
        title: 'HAIRGATOR AI 분석 결과',
        text: '헤어스타일 분석 결과를 확인해보세요!',
        url: window.location.href
      });
    } else {
      alert(t('aiStudio.shareNotSupported') || '공유 기능을 지원하지 않는 브라우저입니다.');
    }
  }

  // ==================== Firestore 스타일 검색 (임베딩 기반) ====================

  async searchSimilarStyles(query, topK = 3) {
    try {
      console.log(`🔍 유사 스타일 검색: "${query}"`);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search_firestore_styles',
          payload: {
            query: query,
            top_k: topK
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log(`✅ 스타일 검색 완료: ${result.data.results.length}개`);
        return result.data;
      } else {
        console.error('❌ 스타일 검색 실패:', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ 스타일 검색 오류:', error);
      return null;
    }
  }

  // 스타일 검색 결과를 캔버스에 표시
  showStyleSearchResults(searchData) {
    if (!searchData || !searchData.results || searchData.results.length === 0) {
      return;
    }

    this.canvasEmpty.classList.add('hidden');
    this.canvasResult.classList.remove('hidden');

    const results = searchData.results;

    this.canvasResult.innerHTML = `
      <div class="style-search-results">
        <div class="search-header">
          <h2>🎯 추천 스타일 Top-${results.length}</h2>
          <p class="search-query">"${searchData.query}" 검색 결과</p>
        </div>

        <div class="style-cards">
          ${results.map((style, idx) => `
            <div class="style-card">
              <div class="style-rank">${idx + 1}</div>
              <div class="style-info">
                <h3>${style.seriesName || '스타일'}</h3>
                <div class="similarity-bar">
                  <div class="similarity-fill" style="width: ${(style.similarity * 100).toFixed(0)}%"></div>
                  <span class="similarity-text">${(style.similarity * 100).toFixed(1)}%</span>
                </div>
              </div>
              ${style.resultImage ? `
                <img src="${style.resultImage}" class="style-thumb" alt="스타일 이미지">
              ` : `
                <div class="style-thumb-placeholder">📷</div>
              `}
            </div>
          `).join('')}
        </div>

        <div class="diagrams-preview">
          <h3>📐 도해도 미리보기</h3>
          <div class="diagrams-grid">
            ${results[0].diagrams.slice(0, 6).map(d => `
              <img src="${d.url}" alt="Step ${d.step}" class="diagram-thumb"
                   onclick="window.open('${d.url}', '_blank')">
            `).join('')}
          </div>
          ${results[0].diagramCount > 6 ? `
            <p class="more-diagrams">+${results[0].diagramCount - 6}장 더보기</p>
          ` : ''}
        </div>
      </div>
    `;

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }
  }

  // 스타일 상세 보기 (내부용)
  async showStyleDetail(styleName) {
    console.log(`📋 스타일 상세: ${styleName}`);
    // TODO: 스타일 상세 모달 또는 페이지로 이동
  }

  // ==================== 맞춤 레시피 캔버스 표시 ====================

  showCustomRecipeCanvas(data, uploadedImageUrl) {
    this.canvasEmpty.classList.add('hidden');
    this.canvasResult.classList.remove('hidden');

    // 남자/여자 분기 처리
    if (data.gender === 'male') {
      this.showMaleRecipeCanvas(data, uploadedImageUrl);
      return;
    }

    // 여자 스타일 (기존 로직)
    const { analysis, targetSeries, referenceStyles, customRecipe, mainDiagrams, params56 } = data;

    // 현재 분석 데이터 저장 (재분석용)
    this.currentFemaleAnalysis = { data, uploadedImageUrl };

    // ⭐ 펌/커트 구분
    const isPerm = data.service === 'perm';

    // 42포뮬러 핵심 파라미터 추출
    const liftingStr = Array.isArray(analysis.liftingRange) ? analysis.liftingRange.join(', ') : (analysis.liftingRange || 'L4');

    // Length 코드 추출 (A~H)
    const currentLengthCode = analysis.lengthName ? analysis.lengthName.charAt(0) : 'E';
    const currentForm = analysis.form || 'Layer';

    // ⭐ 펌 타입 추출 (styleId에서: FALP0001 → 0, FCLP1001 → 1)
    let currentPermType = '2'; // 기본값: 로드(S컬)
    if (isPerm && referenceStyles && referenceStyles[0]) {
      const styleId = referenceStyles[0].styleId || '';
      const match = styleId.match(/F[A-H]LP(\d)/);
      if (match) {
        currentPermType = match[1];
      }
    }

    this.canvasResult.innerHTML = `
      <div class="custom-recipe-canvas">
        <!-- 헤더: 업로드 이미지 + 분석 결과 (컴팩트) -->
        <div class="recipe-header compact">
          <div class="uploaded-image-section">
            <img src="${uploadedImageUrl}" alt="업로드한 이미지" class="uploaded-image">
            <div class="analysis-badge">${analysis.lengthName}</div>
          </div>
          <div class="analysis-summary">
            <h2>👩 맞춤 레시피</h2>
            <div class="analysis-tags">
              <span class="tag primary">${analysis.form}</span>
              <span class="tag">${liftingStr}</span>
              <span class="tag">${analysis.sectionPrimary || 'Diagonal-Backward'}</span>
            </div>
          </div>
        </div>

        <!-- 📐 레시피 오버레이 이미지 (자동 표시) -->
        <div class="recipe-overlay-section" id="recipeOverlaySection">
          <div class="recipe-overlay-header">
            <h3>📐 AI 레시피 시각화</h3>
          </div>
          <div class="recipe-overlay-container" id="recipeOverlayContainer">
            <img src="${uploadedImageUrl}" alt="분석 이미지" class="overlay-base-image" id="overlayBaseImage">
            <div class="recipe-overlay-labels" id="recipeOverlayLabels">
              <!-- 동적으로 생성될 레시피 수치 라벨들 (순차 애니메이션) -->
            </div>
          </div>
          <div class="overlay-legend">
            <span class="legend-item"><span class="legend-color lifting"></span> Lifting (각도)</span>
            <span class="legend-item"><span class="legend-color length"></span> Length (길이)</span>
            <span class="legend-item"><span class="legend-color section"></span> Section (섹션)</span>
          </div>
        </div>

        <!-- 스타일 수정 섹션 -->
        ${isPerm ? `
        <!-- ⭐ 펌 재분석 섹션 -->
        <div class="style-correction-section female perm">
          <div class="correction-header">
            <span class="correction-icon">⚠️</span>
            <span>AI 분석이 틀렸나요? 기장/펌타입을 수정하세요</span>
          </div>

          <div class="correction-controls female">
            <!-- 기장 드롭다운 -->
            <div class="custom-length-dropdown" style="position: relative; flex: 1;">
              <button type="button" id="length-dropdown-btn" class="style-select"
                      style="width: 100%; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span id="length-dropdown-text">${currentLengthCode ? currentLengthCode + ' Length' : '기장 선택...'}</span>
                <span>▼</span>
              </button>
              <input type="hidden" id="length-correction-select" value="${currentLengthCode || ''}">

              <div id="length-dropdown-content" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; max-height: 400px; overflow-y: auto;">
                <div style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; background: #f9f9f9;">
                  <img src="${window.location.origin}/images/length-guide.png" alt="기장 가이드" style="max-width: 100%; height: auto; border-radius: 4px;" onerror="this.parentElement.style.display='none'">
                </div>
                <div class="length-option" data-value="H" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #FF9500;">H</strong> - 후두부/목덜미 (Short)
                </div>
                <div class="length-option" data-value="G" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #FFCC00;">G</strong> - 목 상단 (Bob)
                </div>
                <div class="length-option" data-value="F" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #4CD964;">F</strong> - 목 하단 (Bob)
                </div>
                <div class="length-option" data-value="E" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #5AC8FA;">E</strong> - 어깨선 상단 (Medium)
                </div>
                <div class="length-option" data-value="D" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #007AFF;">D</strong> - 어깨선 하단 (Medium)
                </div>
                <div class="length-option" data-value="C" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #5856D6;">C</strong> - 겨드랑이 (Semi Long)
                </div>
                <div class="length-option" data-value="B" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #AF52DE;">B</strong> - 가슴 중간 (Long)
                </div>
                <div class="length-option" data-value="A" style="padding: 10px 15px; cursor: pointer;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #FF2D55;">A</strong> - 가슴 하단/허리 (Long)
                </div>
              </div>
            </div>

            <!-- 펌 타입 드롭다운 -->
            <select id="perm-type-select" class="style-select">
              <option value="" disabled>펌 타입 선택...</option>
              <option value="0" ${currentPermType === '0' ? 'selected' : ''}>매직 (프레스)</option>
              <option value="1" ${currentPermType === '1' ? 'selected' : ''}>셋팅롤 (C컬)</option>
              <option value="2" ${currentPermType === '2' ? 'selected' : ''}>로드 (S컬)</option>
              <option value="3" ${currentPermType === '3' ? 'selected' : ''}>볼륨 웨이브</option>
              <option value="4" ${currentPermType === '4' ? 'selected' : ''}>트위스트</option>
            </select>
            <button class="correction-btn perm-btn" onclick="window.aiStudio.reanalyzePermWithStyle()">
              🔄 재분석
            </button>
          </div>
        </div>

        ` : `
        <!-- 커트 재분석 섹션 (기존) -->
        <div class="style-correction-section female">
          <div class="correction-header">
            <span class="correction-icon">⚠️</span>
            <span>AI 분석이 틀렸나요? 길이/형태를 수정하세요</span>
          </div>

          <div class="correction-controls female">
            <!-- 커스텀 기장 드롭다운 (이미지 포함) -->
            <div class="custom-length-dropdown" style="position: relative; flex: 1;">
              <button type="button" id="length-dropdown-btn" class="style-select"
                      style="width: 100%; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span id="length-dropdown-text">${currentLengthCode ? currentLengthCode + ' Length' : '길이 선택...'}</span>
                <span>▼</span>
              </button>
              <input type="hidden" id="length-correction-select" value="${currentLengthCode || ''}">

              <div id="length-dropdown-content" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; max-height: 400px; overflow-y: auto;">
                <!-- 기장 가이드 이미지 -->
                <div style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; background: #f9f9f9;">
                  <img src="${window.location.origin}/images/length-guide.png" alt="기장 가이드" style="max-width: 100%; height: auto; border-radius: 4px;" onerror="this.parentElement.style.display='none'">
                </div>
                <!-- 옵션들 -->
                <div class="length-option" data-value="H" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #FF9500;">H</strong> - 후두부/목덜미 (Short)
                </div>
                <div class="length-option" data-value="G" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #FFCC00;">G</strong> - 목 상단 (Bob)
                </div>
                <div class="length-option" data-value="F" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #4CD964;">F</strong> - 목 하단 (Bob)
                </div>
                <div class="length-option" data-value="E" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #5AC8FA;">E</strong> - 어깨선 상단 (Medium)
                </div>
                <div class="length-option" data-value="D" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #007AFF;">D</strong> - 어깨선 하단 (Medium)
                </div>
                <div class="length-option" data-value="C" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #5856D6;">C</strong> - 겨드랑이 (Semi Long)
                </div>
                <div class="length-option" data-value="B" style="padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #AF52DE;">B</strong> - 가슴 중간 (Long)
                </div>
                <div class="length-option" data-value="A" style="padding: 10px 15px; cursor: pointer;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='#fff'">
                  <strong style="color: #FF2D55;">A</strong> - 가슴 하단/허리 (Long)
                </div>
              </div>
            </div>

            <select id="form-correction-select" class="style-select">
              <option value="" disabled>형태 선택...</option>
              <option value="One Length" ${currentForm.includes('One') ? 'selected' : ''}>One Length (원렝스)</option>
              <option value="Graduation" ${currentForm.includes('Graduation') ? 'selected' : ''}>Graduation (그래쥬에이션)</option>
              <option value="Layer" ${currentForm.includes('Layer') ? 'selected' : ''}>Layer (레이어)</option>
            </select>
            <button class="correction-btn" onclick="window.aiStudio.reanalyzeFemaleWithStyle()">
              🔄 재분석
            </button>
          </div>
        </div>

        `}

        <!-- 이미지 주요 분석 -->
        <div class="formula-params-section">
          <h3>📋 이미지 주요 분석</h3>
          <div class="formula-grid">
            <div class="formula-item">
              <span class="formula-label">Length</span>
              <span class="formula-value">${analysis.lengthName}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Cut Form</span>
              <span class="formula-value">${analysis.form}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Lifting</span>
              <span class="formula-value highlight">${liftingStr}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Section</span>
              <span class="formula-value">${analysis.sectionPrimary || 'Diagonal-Backward'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Volume</span>
              <span class="formula-value">${analysis.volumePosition}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Weight</span>
              <span class="formula-value">${analysis.weightDistribution || 'Balanced'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Fringe</span>
              <span class="formula-value">${analysis.hasBangs ? analysis.bangsType : 'No Fringe'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">Connection</span>
              <span class="formula-value">${analysis.connectionType || 'Connected'}</span>
            </div>
          </div>
        </div>

        <!-- ⭐ 어울리는 얼굴형 섹션 (이론 기반) -->
        ${analysis.suitableFaceShapes && analysis.suitableFaceShapes.length > 0 ? `
        <div class="face-shape-section">
          <h3>👤 어울리는 얼굴형</h3>
          <div class="face-shapes-grid">
            ${analysis.suitableFaceShapes.map((shape, idx) => `
              <div class="face-shape-card">
                <span class="face-shape-icon">${this.getFaceShapeIcon(shape)}</span>
                <span class="face-shape-name">${shape}</span>
                ${analysis.faceShapeReasons && analysis.faceShapeReasons[idx] ?
                  `<span class="face-shape-reason">${analysis.faceShapeReasons[idx]}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- 도해도 뷰어 (스크린샷 참고 UI) -->
        <div class="diagrams-section large">
          <h3>📐 기술 매칭 도해도 (${mainDiagrams ? mainDiagrams.length : 0}장)</h3>
          ${this.generateDiagramViewer(mainDiagrams || [])}
        </div>

        <!-- 생성된 맞춤 레시피 -->
        <div class="custom-recipe-section">
          <h3>✨ AI 생성 맞춤 레시피</h3>
          <div class="recipe-content">
            ${this.formatRecipeContent(customRecipe)}
          </div>
        </div>

        <!-- ⭐ 이 스타일 펌/커트 레시피 보기 버튼 (맨 아래) -->
        ${isPerm ? `
        <div class="cut-recipe-link-section">
          <button class="cut-recipe-link-btn" onclick="window.aiStudio.showMatchingCutRecipe('${referenceStyles && referenceStyles[0] ? referenceStyles[0].styleId : ''}')">
            ${t('aiStudio.viewCutRecipe') || '✂️ 이 스타일 커트 레시피 보기'}
          </button>
          <span class="cut-link-hint">${t('aiStudio.cutRecipeHint') || '동일 스타일의 커트 레시피를 확인하세요'}</span>
        </div>
        ` : `
        <div class="perm-recipe-link-section">
          <button class="perm-recipe-link-btn" onclick="window.aiStudio.showMatchingPermRecipe('${referenceStyles && referenceStyles[0] ? referenceStyles[0].styleId : ''}')">
            ${t('aiStudio.viewPermRecipe') || '🌀 이 스타일 펌 레시피 보기'}
          </button>
          <span class="perm-link-hint">${t('aiStudio.permRecipeHint') || '동일 스타일의 펌 레시피를 확인하세요'}</span>
        </div>
        `}
      </div>
    `;

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }

    // ⭐ 기장 드롭다운 이벤트 리스너 등록 (innerHTML 삽입 후)
    this.initLengthDropdown();

    // 도해도 뷰어 초기화
    this.initDiagramViewer(mainDiagrams || []);

    // 📐 레시피 오버레이 라벨 생성 (hair_regions 좌표 사용)
    this.generateRecipeOverlayLabels(analysis, 'female', params56);
  }

  // ⭐ 기장 드롭다운 이벤트 초기화
  initLengthDropdown() {
    // 옵션 클릭 이벤트
    document.querySelectorAll('.length-option').forEach(opt => {
      opt.addEventListener('click', function() {
        const value = this.dataset.value;
        const selectInput = document.getElementById('length-correction-select');
        const textSpan = document.getElementById('length-dropdown-text');
        const content = document.getElementById('length-dropdown-content');

        if (selectInput) selectInput.value = value;
        if (textSpan) textSpan.textContent = value + ' Length';
        if (content) content.style.display = 'none';
      });
    });

    // 버튼 클릭 이벤트 (드롭다운 토글)
    const dropdownBtn = document.getElementById('length-dropdown-btn');
    if (dropdownBtn) {
      dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const content = document.getElementById('length-dropdown-content');
        if (content) {
          content.style.display = content.style.display === 'block' ? 'none' : 'block';
        }
      });
    }

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.custom-length-dropdown')) {
        const content = document.getElementById('length-dropdown-content');
        if (content) content.style.display = 'none';
      }
    });
  }

  // ==================== 남자 맞춤 레시피 캔버스 표시 ====================

  showMaleRecipeCanvas(data, uploadedImageUrl) {
    const { analysis, targetSeries, referenceStyles, recipe, diagrams, params56 } = data;
    const subStyleDisplay = analysis.subStyle || analysis.styleName;

    // 현재 분석 데이터 저장 (재분석용)
    this.currentMaleAnalysis = { data, uploadedImageUrl };

    this.canvasResult.innerHTML = `
      <div class="custom-recipe-canvas male">
        <!-- 헤더: 업로드 이미지 + 분석 결과 -->
        <div class="recipe-header compact">
          <div class="uploaded-image-section">
            <img src="${uploadedImageUrl}" alt="업로드한 이미지" class="uploaded-image">
            <div class="analysis-badge male">${analysis.styleCode}</div>
          </div>
          <div class="analysis-summary">
            <h2>👨 맞춤 레시피</h2>
            <div class="analysis-tags">
              <span class="tag primary">${subStyleDisplay}</span>
              <span class="tag">${analysis.fadeType || 'No Fade'}</span>
              <span class="tag">${analysis.texture || 'Smooth'}</span>
            </div>
          </div>
        </div>

        <!-- 📐 레시피 오버레이 이미지 (자동 표시) -->
        <div class="recipe-overlay-section" id="recipeOverlaySection">
          <div class="recipe-overlay-header">
            <h3>📐 AI 레시피 시각화</h3>
          </div>
          <div class="recipe-overlay-container" id="recipeOverlayContainer">
            <img src="${uploadedImageUrl}" alt="분석 이미지" class="overlay-base-image" id="overlayBaseImage">
            <div class="recipe-overlay-labels" id="recipeOverlayLabels">
              <!-- 동적으로 생성될 레시피 수치 라벨들 (순차 애니메이션) -->
            </div>
          </div>
          <div class="overlay-legend">
            <span class="legend-item"><span class="legend-color lifting"></span> Lifting (각도)</span>
            <span class="legend-item"><span class="legend-color length"></span> Length (길이)</span>
            <span class="legend-item"><span class="legend-color section"></span> Section (섹션)</span>
          </div>
        </div>

        <!-- 스타일 수정 섹션 -->
        <div class="style-correction-section">
          <div class="correction-header">
            <span class="correction-icon">⚠️</span>
            <span>AI 분석이 틀렸나요? 스타일을 수정하세요</span>
          </div>
          <div class="correction-controls">
            <select id="style-correction-select" class="style-select">
              <option value="" disabled>스타일 선택...</option>
              <option value="SF" ${analysis.styleCode === 'SF' ? 'selected' : ''}>SF - 사이드 프린지 (댄디컷)</option>
              <option value="SP" ${analysis.styleCode === 'SP' ? 'selected' : ''}>SP - 사이드 파트 (가르마)</option>
              <option value="FU" ${analysis.styleCode === 'FU' ? 'selected' : ''}>FU - 프린지 업</option>
              <option value="PB" ${analysis.styleCode === 'PB' ? 'selected' : ''}>PB - 푸시드 백 (슬릭백)</option>
              <option value="BZ" ${analysis.styleCode === 'BZ' ? 'selected' : ''}>BZ - 버즈컷</option>
              <option value="CP" ${analysis.styleCode === 'CP' ? 'selected' : ''}>CP - 크롭컷</option>
              <option value="MC" ${analysis.styleCode === 'MC' ? 'selected' : ''}>MC - 모히칸</option>
            </select>
            <button class="correction-btn" onclick="window.aiStudio.reanalyzeWithStyle()">
              🔄 재분석
            </button>
          </div>
        </div>

        <!-- 남자 스타일 분석 -->
        <div class="formula-params-section">
          <h3>📋 스타일 분석</h3>
          <div class="formula-grid">
            <div class="formula-item">
              <span class="formula-label">카테고리</span>
              <span class="formula-value">${analysis.styleName}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">스타일</span>
              <span class="formula-value highlight">${subStyleDisplay}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">코드</span>
              <span class="formula-value">${analysis.styleCode}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">탑 길이</span>
              <span class="formula-value">${analysis.topLength || 'Medium'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">사이드 길이</span>
              <span class="formula-value">${analysis.sideLength || 'Short'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">페이드</span>
              <span class="formula-value">${analysis.fadeType || 'None'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">텍스처</span>
              <span class="formula-value">${analysis.texture || 'Smooth'}</span>
            </div>
            <div class="formula-item">
              <span class="formula-label">스타일링</span>
              <span class="formula-value">${analysis.stylingDirection || 'Forward'}</span>
            </div>
          </div>
        </div>

        <!-- ⭐ 어울리는 얼굴형 섹션 (이론 기반) -->
        ${analysis.suitableFaceShapes && analysis.suitableFaceShapes.length > 0 ? `
        <div class="face-shape-section">
          <h3>👤 어울리는 얼굴형</h3>
          <div class="face-shapes-grid">
            ${analysis.suitableFaceShapes.map((shape, idx) => `
              <div class="face-shape-card">
                <span class="face-shape-icon">${this.getFaceShapeIcon(shape)}</span>
                <span class="face-shape-name">${shape}</span>
                ${analysis.faceShapeReasons && analysis.faceShapeReasons[idx] ?
                  `<span class="face-shape-reason">${analysis.faceShapeReasons[idx]}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- 도해도 뷰어 -->
        <div class="diagrams-section large">
          <h3>📐 기술 매칭 도해도 (${diagrams ? diagrams.length : 0}장)</h3>
          ${this.generateDiagramViewer(diagrams || [])}
        </div>

        <!-- 생성된 맞춤 레시피 -->
        <div class="custom-recipe-section">
          <h3>✨ AI 생성 맞춤 레시피</h3>
          <div class="recipe-content">
            ${this.formatRecipeContent(recipe)}
          </div>
        </div>
      </div>
    `;

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }

    // 도해도 뷰어 초기화
    this.initDiagramViewer(diagrams || []);

    // 📐 레시피 오버레이 라벨 생성 (hair_regions 좌표 사용)
    this.generateRecipeOverlayLabels(analysis, 'male', params56);
  }

  // ==================== 도해도 뷰어 ====================

  // 도해도 뷰어 HTML 생성
  generateDiagramViewer(diagrams) {
    if (!diagrams || diagrams.length === 0) {
      return '<p style="color: #999; text-align: center;">도해도가 없습니다.</p>';
    }

    const firstDiagram = diagrams[0];
    // 여자/남자 API 응답 형식 모두 지원
    const getUrl = (d) => d.url || d.image_url;
    const getStep = (d) => d.step || d.step_number;
    const ldsInfo = [firstDiagram.lifting, firstDiagram.direction, firstDiagram.section].filter(Boolean).join(' ');

    return `
      <div class="diagram-viewer" id="diagram-viewer">
        <!-- 메인 이미지 영역 -->
        <div class="diagram-viewer-main">
          <span class="diagram-step-indicator" id="diagram-step-indicator">Step 1 / ${diagrams.length}</span>
          <button class="diagram-nav-btn prev" onclick="window.aiStudio.prevDiagram()" id="diagram-prev-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <img src="${getUrl(firstDiagram)}" alt="Step ${getStep(firstDiagram)}" id="diagram-main-image">
          <button class="diagram-nav-btn next" onclick="window.aiStudio.nextDiagram()" id="diagram-next-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <!-- 재생 컨트롤 -->
        <div class="diagram-playback">
          <button onclick="window.aiStudio.prevDiagram()" title="이전">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="19 20 9 12 19 4 19 20"></polygon>
              <line x1="5" y1="19" x2="5" y2="5"></line>
            </svg>
          </button>
          <button class="play-btn" onclick="window.aiStudio.toggleAutoPlay()" id="diagram-play-btn" title="자동 재생">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          <button onclick="window.aiStudio.nextDiagram()" title="다음">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
              <line x1="19" y1="5" x2="19" y2="19"></line>
            </svg>
          </button>
          <div class="speed-control">
            <button class="speed-btn active" onclick="window.aiStudio.setPlaybackSpeed(1)" data-speed="1" title="1x 속도">1x</button>
            <button class="speed-btn" onclick="window.aiStudio.setPlaybackSpeed(1.5)" data-speed="1.5" title="1.5x 속도">1.5x</button>
            <button class="speed-btn" onclick="window.aiStudio.setPlaybackSpeed(2)" data-speed="2" title="2x 속도">2x</button>
          </div>
        </div>

        <!-- 썸네일 스트립 -->
        <div class="diagram-thumbnails-strip" id="diagram-thumbnails">
          ${diagrams.map((d, idx) => `
            <div class="diagram-thumb-item ${idx === 0 ? 'active' : ''}"
                 onclick="window.aiStudio.selectDiagram(${idx})"
                 data-index="${idx}">
              <img src="${getUrl(d)}" alt="Step ${getStep(d)}">
              <span class="thumb-step">${getStep(d) || idx + 1}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 도해도 뷰어 초기화
  initDiagramViewer(diagrams) {
    this.currentDiagrams = diagrams;
    this.currentDiagramIndex = 0;
    this.autoPlayInterval = null;
    this.playbackSpeed = 1; // 기본 속도 (1x = 3초)

    // 초기 버튼 상태 설정
    this.updateNavButtons();
    this.updateSpeedButtons();
  }

  // 재생 속도 설정
  setPlaybackSpeed(speed) {
    this.playbackSpeed = speed;
    this.updateSpeedButtons();

    // 재생 중이면 새 속도로 재시작
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.startAutoPlay();
    }
  }

  // 속도 버튼 상태 업데이트
  updateSpeedButtons() {
    const speedBtns = document.querySelectorAll('.speed-btn');
    speedBtns.forEach(btn => {
      const btnSpeed = parseFloat(btn.dataset.speed);
      btn.classList.toggle('active', btnSpeed === this.playbackSpeed);
    });
  }

  // 이전 도해도
  prevDiagram() {
    if (this.currentDiagramIndex > 0) {
      this.selectDiagram(this.currentDiagramIndex - 1);
    }
  }

  // 다음 도해도
  nextDiagram() {
    if (this.currentDiagramIndex < this.currentDiagrams.length - 1) {
      this.selectDiagram(this.currentDiagramIndex + 1);
    }
  }

  // 특정 도해도 선택
  selectDiagram(index) {
    if (!this.currentDiagrams || index < 0 || index >= this.currentDiagrams.length) return;

    this.currentDiagramIndex = index;
    const diagram = this.currentDiagrams[index];

    // 메인 이미지 업데이트 (여자/남자 API 형식 모두 지원)
    const mainImage = document.getElementById('diagram-main-image');
    if (mainImage) mainImage.src = diagram.url || diagram.image_url;

    // Step indicator 업데이트
    const stepIndicator = document.getElementById('diagram-step-indicator');
    if (stepIndicator) stepIndicator.textContent = `Step ${index + 1} / ${this.currentDiagrams.length}`;

    // 썸네일 active 상태 업데이트
    document.querySelectorAll('.diagram-thumb-item').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });

    // 선택된 썸네일이 보이도록 스크롤 (컨테이너 내부에서만)
    const thumbnailsContainer = document.getElementById('diagram-thumbnails');
    const activeThumb = thumbnailsContainer?.querySelector('.diagram-thumb-item.active');
    if (activeThumb && thumbnailsContainer) {
      // 페이지 전체 스크롤 방지 - 컨테이너 내부 스크롤만 조정
      const containerRect = thumbnailsContainer.getBoundingClientRect();
      const thumbRect = activeThumb.getBoundingClientRect();
      const scrollLeft = thumbnailsContainer.scrollLeft + (thumbRect.left - containerRect.left) - (containerRect.width / 2) + (thumbRect.width / 2);
      thumbnailsContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }

    // 네비게이션 버튼 상태 업데이트
    this.updateNavButtons();
  }

  // 네비게이션 버튼 상태 업데이트
  updateNavButtons() {
    const prevBtn = document.getElementById('diagram-prev-btn');
    const nextBtn = document.getElementById('diagram-next-btn');

    if (prevBtn) prevBtn.disabled = this.currentDiagramIndex === 0;
    if (nextBtn) nextBtn.disabled = this.currentDiagramIndex >= this.currentDiagrams.length - 1;
  }

  // 자동 재생 시작
  startAutoPlay() {
    const playBtn = document.getElementById('diagram-play-btn');
    if (playBtn) {
      playBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16"></rect>
          <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
      `;
    }
    // 속도에 따른 간격: 1x=3초, 1.5x=2초, 2x=1.5초
    const interval = 3000 / (this.playbackSpeed || 1);
    this.autoPlayInterval = setInterval(() => {
      if (this.currentDiagramIndex < this.currentDiagrams.length - 1) {
        this.nextDiagram();
      } else {
        // 끝에 도달하면 처음으로
        this.selectDiagram(0);
      }
    }, interval);
  }

  // 자동 재생 정지
  stopAutoPlay() {
    const playBtn = document.getElementById('diagram-play-btn');
    clearInterval(this.autoPlayInterval);
    this.autoPlayInterval = null;
    if (playBtn) {
      playBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
    }
  }

  // 자동 재생 토글
  toggleAutoPlay() {
    if (this.autoPlayInterval) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  // ==================== 레시피 오버레이 시각화 ====================

  // 레시피 오버레이 라벨 생성
  generateRecipeOverlayLabels(analysis, gender, params56) {
    const labelsContainer = document.getElementById('recipeOverlayLabels');
    if (!labelsContainer) return;

    // 📍 AI가 감지한 헤어 영역 좌표 (Gemini Vision 결과)
    const regions = params56?.hair_regions || {};

    // 기본 좌표 (AI 감지 실패 시 폴백)
    const defaultRegions = {
      top: { x: 50, y: 10 },
      crown: { x: 50, y: 20 },
      side_left: { x: 20, y: 35 },
      side_right: { x: 80, y: 35 },
      back: null,
      fringe: { x: 50, y: 25 },
      nape: { x: 50, y: 70 },
      length_end: { x: 50, y: 85 }
    };

    // AI 좌표와 기본값 병합
    const getCoord = (key) => regions[key] || defaultRegions[key];

    let labels = [];

    if (gender === 'female') {
      // 여자 스타일 - 42 포뮬러 기반 라벨 (실제 헤어 위치에 배치)
      const liftingRange = Array.isArray(analysis.liftingRange) ? analysis.liftingRange : [analysis.liftingRange || 'L4'];

      // Lifting 각도 라벨 (정수리/크라운 영역에 배치)
      const liftingAngles = {
        'L0': '0°', 'L1': '22.5°', 'L2': '45°', 'L3': '67.5°',
        'L4': '90°', 'L5': '112.5°', 'L6': '135°', 'L7': '157.5°', 'L8': '180°'
      };

      const topCoord = getCoord('top');
      const crownCoord = getCoord('crown');

      if (liftingRange.length > 0 && topCoord) {
        const mainLift = liftingRange[0];
        const angle = liftingAngles[mainLift] || '90°';
        labels.push({
          type: 'lifting',
          text: angle,
          subText: mainLift,
          position: { top: topCoord.y, left: topCoord.x }
        });
      }

      // 추가 Lifting (크라운에)
      if (liftingRange.length > 1 && crownCoord) {
        const subLift = liftingRange[1];
        const angle = liftingAngles[subLift] || '90°';
        labels.push({
          type: 'lifting',
          text: angle,
          subText: subLift,
          position: { top: crownCoord.y, left: crownCoord.x }
        });
      }

      // Section 라벨 (오른쪽 사이드에 배치)
      const sideRightCoord = getCoord('side_right');
      if (analysis.sectionPrimary && sideRightCoord) {
        labels.push({
          type: 'section',
          text: analysis.sectionPrimary.replace('Diagonal-', 'D-'),
          subText: 'Section',
          position: { top: sideRightCoord.y, left: sideRightCoord.x }
        });
      }

      // Length 라벨 (머리카락 끝 위치에 배치)
      const lengthEndCoord = getCoord('length_end');
      if (analysis.lengthName && lengthEndCoord) {
        labels.push({
          type: 'length',
          text: analysis.lengthName,
          subText: 'Length',
          position: { top: lengthEndCoord.y, left: lengthEndCoord.x }
        });
      }

      // Volume 라벨 (왼쪽 사이드)
      const sideLeftCoord = getCoord('side_left');
      if (analysis.volumePosition && sideLeftCoord) {
        labels.push({
          type: 'section',
          text: Array.isArray(analysis.volumePosition) ? analysis.volumePosition[0] : analysis.volumePosition,
          subText: 'Volume',
          position: { top: sideLeftCoord.y, left: sideLeftCoord.x }
        });
      }

      // Fringe/앞머리 라벨 (앞머리 위치)
      const fringeCoord = getCoord('fringe');
      if (analysis.bangsType && analysis.bangsType !== 'No Fringe' && fringeCoord) {
        labels.push({
          type: 'length',
          text: analysis.bangsType,
          subText: 'Fringe',
          position: { top: fringeCoord.y, left: fringeCoord.x }
        });
      }

    } else {
      // 남자 스타일 라벨 (실제 헤어 위치에 배치)
      const topCoord = getCoord('top');
      const sideLeftCoord = getCoord('side_left');
      const sideRightCoord = getCoord('side_right');
      const napeCoord = getCoord('nape');

      // Top Length (정수리에)
      if (analysis.topLength && topCoord) {
        labels.push({
          type: 'length',
          text: analysis.topLength,
          subText: 'Top',
          position: { top: topCoord.y, left: topCoord.x }
        });
      }

      // Side Length (왼쪽 사이드에)
      if (analysis.sideLength && sideLeftCoord) {
        labels.push({
          type: 'length',
          text: analysis.sideLength,
          subText: 'Side',
          position: { top: sideLeftCoord.y, left: sideLeftCoord.x }
        });
      }

      // Fade Type (목덜미에)
      if (analysis.fadeType && analysis.fadeType !== 'None' && napeCoord) {
        labels.push({
          type: 'lifting',
          text: analysis.fadeType,
          subText: 'Fade',
          position: { top: napeCoord.y, left: napeCoord.x }
        });
      }

      // Texture (오른쪽 사이드에)
      if (analysis.texture && sideRightCoord) {
        labels.push({
          type: 'section',
          text: analysis.texture,
          subText: 'Texture',
          position: { top: sideRightCoord.y, left: sideRightCoord.x }
        });
      }

      // Style Code (크라운에)
      const crownCoord = getCoord('crown');
      if (analysis.styleCode && crownCoord) {
        labels.push({
          type: 'lifting',
          text: analysis.styleCode,
          subText: analysis.styleName || '',
          position: { top: crownCoord.y + 10, left: crownCoord.x }
        });
      }
    }

    // 저장
    this.overlayLabelsData = labels;

    // 🎬 헤어 메쉬 스캐닝 애니메이션 실행
    this.runHairMeshScanAnimation(regions, labels, labelsContainer);
  }

  // ==================== 헤어 메쉬 스캐닝 애니메이션 ====================
  runHairMeshScanAnimation(regions, labels, labelsContainer) {
    const container = document.getElementById('recipeOverlayContainer');
    if (!container) return;

    // 기존 스캐너 제거
    const existingScanner = container.querySelector('.hair-mesh-scanner');
    if (existingScanner) existingScanner.remove();

    // 스캐너 오버레이 생성
    const scanner = document.createElement('div');
    scanner.className = 'hair-mesh-scanner';
    scanner.innerHTML = `
      <div class="mesh-grid"></div>
      <div class="scan-line"></div>
      <div class="scan-progress">
        <span>Scanning</span>
        <div class="scan-progress-bar">
          <div class="scan-progress-fill"></div>
        </div>
      </div>
    `;
    container.appendChild(scanner);

    // 기본 좌표 (AI 감지 실패 시)
    const defaultRegions = {
      top: { x: 50, y: 10 },
      crown: { x: 50, y: 20 },
      side_left: { x: 20, y: 35 },
      side_right: { x: 80, y: 35 },
      fringe: { x: 50, y: 25 },
      nape: { x: 50, y: 70 },
      length_end: { x: 50, y: 85 }
    };

    // 탐지 포인트 순서 (위에서 아래로)
    const regionOrder = ['top', 'crown', 'fringe', 'side_left', 'side_right', 'nape', 'length_end'];
    const regionLabels = {
      top: 'TOP',
      crown: 'CROWN',
      fringe: 'FRINGE',
      side_left: 'SIDE L',
      side_right: 'SIDE R',
      nape: 'NAPE',
      length_end: 'LENGTH'
    };

    // 포인트들 순차적으로 표시
    let pointDelay = 500; // 스캔 시작 후 0.5초 뒤부터
    const detectionPoints = [];

    regionOrder.forEach((regionKey, idx) => {
      const coord = regions[regionKey] || defaultRegions[regionKey];
      if (!coord) return;

      setTimeout(() => {
        // 탐지 포인트 생성
        const point = document.createElement('div');
        point.className = 'detection-point';
        point.style.left = `${coord.x}%`;
        point.style.top = `${coord.y}%`;
        point.style.animationDelay = '0s';
        scanner.appendChild(point);
        detectionPoints.push(point);

        // 영역 라벨 생성
        const label = document.createElement('div');
        label.className = 'region-label';
        label.style.left = `${coord.x}%`;
        label.style.top = `${coord.y}%`;
        label.textContent = regionLabels[regionKey];
        label.style.animationDelay = '0.2s';
        scanner.appendChild(label);

        // 이전 포인트와 연결선 그리기
        if (detectionPoints.length > 1) {
          const prevPoint = detectionPoints[detectionPoints.length - 2];
          const prevRect = { x: parseFloat(prevPoint.style.left), y: parseFloat(prevPoint.style.top) };
          const currRect = { x: coord.x, y: coord.y };

          // 두 점 사이 거리와 각도 계산
          const dx = currRect.x - prevRect.x;
          const dy = currRect.y - prevRect.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          const line = document.createElement('div');
          line.className = 'connection-line';
          line.style.left = `${prevRect.x}%`;
          line.style.top = `${prevRect.y}%`;
          line.style.width = `${distance}%`;
          line.style.transform = `rotate(${angle}deg)`;
          scanner.appendChild(line);
        }
      }, pointDelay + (idx * 250)); // 각 포인트 0.25초 간격
    });

    // 스캔 완료 후 라벨 표시
    const scanDuration = pointDelay + (regionOrder.length * 250) + 500;

    setTimeout(() => {
      // 스캐너 완료 상태로 전환
      scanner.classList.add('completed');

      // 라벨 HTML 생성 (순차 애니메이션용 delay 추가)
      setTimeout(() => {
        labelsContainer.innerHTML = labels.map((label, idx) => {
          let posStyle = '';
          if (label.position.top !== undefined) posStyle += `top: ${label.position.top}%;`;
          if (label.position.bottom !== undefined) posStyle += `bottom: ${label.position.bottom}%;`;
          if (label.position.left !== undefined) posStyle += `left: ${label.position.left}%;`;
          if (label.position.right !== undefined) posStyle += `right: ${label.position.right}%;`;

          // 순차적 애니메이션 딜레이 (0.3초 간격)
          const delay = idx * 0.3;

          return `
            <div class="overlay-label ${label.type}" style="${posStyle}; animation-delay: ${delay}s;">
              <span class="label-main">${label.text}</span>
              ${label.subText ? `<span class="label-sub">${label.subText}</span>` : ''}
            </div>
          `;
        }).join('');

        // 스캐너 제거
        setTimeout(() => {
          scanner.remove();
        }, 500);
      }, 300);
    }, scanDuration);
  }

  // ==================== 각도별 AI 이미지 생성 ====================

  async generateAngleViews(gender) {
    const gallery = document.getElementById('angleViewsGallery');
    const btn = document.getElementById('generateAnglesBtn');

    if (!gallery || !btn) return;

    // 이미지 데이터 확인
    if (!this.pendingImageBase64) {
      alert(t('aiStudio.noImageData') || '이미지 데이터가 없습니다. 이미지를 다시 업로드해주세요.');
      return;
    }

    // 버튼 로딩 상태
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ AI 이미지 생성 중...';
    btn.disabled = true;

    // 갤러리에 로딩 표시
    gallery.innerHTML = `
      <div class="angle-views-loading">
        <div class="loading-spinner"></div>
        <p>AI가 정면/측면/후면/대각선 이미지를 생성하고 있습니다...</p>
        <p class="loading-sub">약 30초~1분 소요됩니다</p>
      </div>
    `;

    try {
      // 분석 데이터 가져오기
      const analysisData = gender === 'male'
        ? this.currentMaleAnalysis?.data?.analysis
        : this.currentFemaleAnalysis?.data?.analysis;

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_angle_views',
          payload: {
            reference_image: this.pendingImageBase64,
            mime_type: this.pendingMimeType || 'image/jpeg',
            gender: gender,
            analysis: analysisData
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data?.images) {
        const images = result.data.images;

        // 갤러리 HTML 생성
        gallery.innerHTML = `
          <div class="angle-views-scroll">
            ${images.map((img, idx) => `
              <div class="angle-view-item ${img.error ? 'error' : ''}">
                ${img.url
                  ? `<img src="${img.url}" alt="${img.angle}" class="angle-view-image" onclick="window.aiStudio.openAngleViewModal('${img.url}', '${img.angle}')">`
                  : `<div class="angle-view-error">
                      <span>⚠️</span>
                      <p>생성 실패</p>
                    </div>`
                }
                <div class="angle-view-label">${img.angle}</div>
              </div>
            `).join('')}
          </div>
          <div class="angle-views-nav">
            <span class="nav-hint">← 스와이프하여 각도별 이미지 확인 →</span>
          </div>
        `;

        // 터치 스크롤 초기화
        this.initAngleViewsScroll();

        console.log(`✅ 각도별 이미지 ${result.data.successCount}/${result.data.totalCount}개 생성 완료`);
        btn.innerHTML = '✅ 생성 완료';
      } else {
        throw new Error(result.error || '이미지 생성 실패');
      }
    } catch (error) {
      console.error('각도별 이미지 생성 오류:', error);
      gallery.innerHTML = `
        <div class="angle-views-error">
          <p>⚠️ 이미지 생성 중 오류가 발생했습니다</p>
          <p class="error-detail">${error.message}</p>
          <button class="retry-btn" onclick="window.aiStudio.generateAngleViews('${gender}')">다시 시도</button>
        </div>
      `;
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // 각도별 이미지 스크롤 초기화
  initAngleViewsScroll() {
    const scrollContainer = document.querySelector('.angle-views-scroll');
    if (!scrollContainer) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    scrollContainer.addEventListener('mousedown', (e) => {
      isDown = true;
      scrollContainer.classList.add('grabbing');
      startX = e.pageX - scrollContainer.offsetLeft;
      scrollLeft = scrollContainer.scrollLeft;
    });

    scrollContainer.addEventListener('mouseleave', () => {
      isDown = false;
      scrollContainer.classList.remove('grabbing');
    });

    scrollContainer.addEventListener('mouseup', () => {
      isDown = false;
      scrollContainer.classList.remove('grabbing');
    });

    scrollContainer.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - scrollContainer.offsetLeft;
      const walk = (x - startX) * 2;
      scrollContainer.scrollLeft = scrollLeft - walk;
    });
  }

  // 각도 이미지 모달 열기
  openAngleViewModal(imageUrl, angleLabel) {
    // 간단한 이미지 모달
    const modal = document.createElement('div');
    modal.className = 'angle-view-modal';
    modal.innerHTML = `
      <div class="angle-view-modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="angle-view-modal-content">
        <button class="angle-view-modal-close" onclick="this.closest('.angle-view-modal').remove()">×</button>
        <img src="${imageUrl}" alt="${angleLabel}">
        <div class="angle-view-modal-label">${angleLabel}</div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // ==================== 스타일 수정 재분석 ====================

  async reanalyzeWithStyle() {
    const selectEl = document.getElementById('style-correction-select');
    if (!selectEl) return;

    const newStyleCode = selectEl.value;
    if (!newStyleCode) {
      alert(t('aiStudio.selectStyleAlert') || '스타일을 선택해주세요.');
      return;
    }

    // 현재 분석 데이터가 없으면 리턴
    if (!this.currentMaleAnalysis || !this.pendingImageBase64) {
      alert(t('aiStudio.noImageData') || '재분석할 이미지 데이터가 없습니다. 이미지를 다시 업로드해주세요.');
      return;
    }

    // 버튼 로딩 상태
    const btn = document.querySelector('.correction-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ 재분석 중...';
    btn.disabled = true;

    try {
      // 수정된 스타일 코드로 레시피 재생성 요청
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_male_recipe',
          payload: {
            style_code: newStyleCode,
            image_base64: this.pendingImageBase64,
            mime_type: this.pendingMimeType || 'image/jpeg',
            original_analysis: this.currentMaleAnalysis.data.analysis
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        // 새 데이터로 캔버스 업데이트
        this.showMaleRecipeCanvas(result.data, this.currentMaleAnalysis.uploadedImageUrl);
        console.log(`✅ ${newStyleCode} 스타일로 재분석 완료!`);
      } else {
        throw new Error(result.error || '재분석 실패');
      }
    } catch (error) {
      console.error('재분석 오류:', error);
      alert((t('aiStudio.reanalysisError') || '재분석 중 오류가 발생했습니다') + ': ' + error.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // 여자 스타일 재분석 (길이/형태 수정)
  async reanalyzeFemaleWithStyle() {
    const lengthSelect = document.getElementById('length-correction-select');
    const formSelect = document.getElementById('form-correction-select');

    if (!lengthSelect || !formSelect) return;

    const newLengthCode = lengthSelect.value;
    const newForm = formSelect.value;

    if (!newLengthCode || !newForm) {
      alert(t('aiStudio.selectLengthAndForm') || '길이와 형태를 모두 선택해주세요.');
      return;
    }

    // 현재 분석 데이터가 없으면 리턴
    if (!this.currentFemaleAnalysis || !this.pendingImageBase64) {
      alert(t('aiStudio.noImageData') || '재분석할 이미지 데이터가 없습니다. 이미지를 다시 업로드해주세요.');
      return;
    }

    // 버튼 로딩 상태
    const btn = document.querySelector('.style-correction-section.female .correction-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ 재분석 중...';
    btn.disabled = true;

    try {
      // 수정된 길이/형태로 레시피 재생성 요청
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_female_recipe',
          payload: {
            length_code: newLengthCode,
            cut_form: newForm,
            image_base64: this.pendingImageBase64,
            mime_type: this.pendingMimeType || 'image/jpeg',
            original_analysis: this.currentFemaleAnalysis.data.analysis
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        // ⭐ 디버그: 서버 응답 확인
        console.log('📦 재분석 서버 응답:', result.data);
        console.log('📦 analysis.length:', result.data.analysis?.length);
        console.log('📦 analysis.lengthName:', result.data.analysis?.lengthName);

        // 새 데이터로 캔버스 업데이트
        this.showCustomRecipeCanvas(result.data, this.currentFemaleAnalysis.uploadedImageUrl);
        console.log(`✅ ${newLengthCode} Length + ${newForm}로 재분석 완료!`);
      } else {
        throw new Error(result.error || '재분석 실패');
      }
    } catch (error) {
      console.error('여자 스타일 재분석 오류:', error);
      alert((t('aiStudio.reanalysisError') || '재분석 중 오류가 발생했습니다') + ': ' + error.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // ⭐ 펌 스타일 재분석 (기장/펌타입 수정)
  async reanalyzePermWithStyle() {
    const lengthSelect = document.getElementById('length-correction-select');
    const permTypeSelect = document.getElementById('perm-type-select');

    if (!lengthSelect || !permTypeSelect) return;

    const newLengthCode = lengthSelect.value;
    const newPermType = permTypeSelect.value;

    if (!newLengthCode || newPermType === '') {
      alert(t('aiStudio.selectLengthAndPermType') || '기장과 펌 타입을 모두 선택해주세요.');
      return;
    }

    // 현재 분석 데이터가 없으면 리턴
    if (!this.currentFemaleAnalysis || !this.pendingImageBase64) {
      alert(t('aiStudio.noImageData') || '재분석할 이미지 데이터가 없습니다. 이미지를 다시 업로드해주세요.');
      return;
    }

    // 버튼 로딩 상태
    const btn = document.querySelector('.style-correction-section.perm .correction-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ 재분석 중...';
    btn.disabled = true;

    try {
      // 수정된 기장/펌타입으로 레시피 재생성 요청
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_perm_recipe',
          payload: {
            length_code: newLengthCode,
            perm_type: newPermType,
            image_base64: this.pendingImageBase64,
            mime_type: this.pendingMimeType || 'image/jpeg',
            original_analysis: this.currentFemaleAnalysis.data.analysis
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('📦 펌 재분석 서버 응답:', result.data);

        // 새 데이터로 캔버스 업데이트
        this.showCustomRecipeCanvas(result.data, this.currentFemaleAnalysis.uploadedImageUrl);

        const permTypeNames = { '0': '매직', '1': '셋팅롤', '2': '로드', '3': '볼륨웨이브', '4': '트위스트' };
        console.log(`✅ ${newLengthCode} Length + ${permTypeNames[newPermType]}로 펌 재분석 완료!`);
      } else {
        throw new Error(result.error || '펌 재분석 실패');
      }
    } catch (error) {
      console.error('펌 스타일 재분석 오류:', error);
      alert((t('aiStudio.permReanalysisError') || '펌 재분석 중 오류가 발생했습니다') + ': ' + error.message);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // ⭐ 커트 스타일의 매칭 펌 레시피 보기
  async showMatchingPermRecipe(cutStyleId) {
    if (!cutStyleId) {
      alert(t('aiStudio.noStyleInfo') || '스타일 정보가 없습니다.');
      return;
    }

    // 커트 styleId → 펌 styleId 변환 (FAL0001 → FALP0001)
    // 패턴: F{A-H}L{숫자} → F{A-H}LP{숫자}
    const permStyleId = cutStyleId.replace(/^(F[A-H])L(\d+)$/, '$1LP$2');
    console.log(`🌀 펌 레시피 조회: ${cutStyleId} → ${permStyleId}`);

    // 로딩 표시
    const btn = document.querySelector('.perm-recipe-link-btn');
    if (btn) {
      btn.innerHTML = '⏳ 로딩 중...';
      btn.disabled = true;
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_perm_recipe_by_style',
          payload: {
            perm_style_id: permStyleId,
            cut_style_id: cutStyleId
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        // 펌 레시피 캔버스 표시
        this.showPermRecipeFromCut(result.data, permStyleId, cutStyleId);
      } else {
        throw new Error(result.error || '펌 레시피를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('펌 레시피 조회 오류:', error);
      alert((t('aiStudio.permRecipeError') || '펌 레시피 조회 중 오류가 발생했습니다') + ': ' + error.message);

      if (btn) {
        btn.innerHTML = t('aiStudio.viewPermRecipe') || '🌀 이 스타일 펌 레시피 보기';
        btn.disabled = false;
      }
    }
  }

  // ⭐ 커트에서 연결된 펌 레시피 캔버스 표시
  showPermRecipeFromCut(permData, permStyleId, cutStyleId) {
    this.canvasEmpty.classList.add('hidden');
    this.canvasResult.classList.remove('hidden');

    const { textRecipe, diagrams, seriesName } = permData;

    // 펌 타입 추출 (FALP0001 → 0 = 매직, FBLP2003 → 2 = 로드)
    const permTypeMatch = permStyleId.match(/F[A-H]LP(\d)/);
    const permTypeCode = permTypeMatch ? permTypeMatch[1] : '2';
    const permTypeNames = { '0': '매직 (프레스)', '1': '셋팅롤 (C컬)', '2': '로드 (S컬)', '3': '볼륨 웨이브', '4': '트위스트' };
    const permTypeName = permTypeNames[permTypeCode] || '펌';

    // 기장 추출 (FALP → A Length)
    const lengthMatch = permStyleId.match(/F([A-H])LP/);
    const lengthCode = lengthMatch ? lengthMatch[1] : '';
    const lengthName = lengthCode ? `${lengthCode} Length` : '';

    this.canvasResult.innerHTML = `
      <div class="custom-recipe-canvas perm-from-cut">
        <!-- 헤더 -->
        <div class="recipe-header compact perm-header">
          <div class="perm-header-info">
            <h2>🌀 펌 레시피</h2>
            <div class="analysis-tags">
              <span class="tag primary">${lengthName}</span>
              <span class="tag perm-type">${permTypeName}</span>
            </div>
          </div>
          <button class="back-to-cut-btn" onclick="window.aiStudio.backToCutRecipe()">
            ← 커트 레시피로 돌아가기
          </button>
        </div>

        <!-- 연결 정보 -->
        <div class="perm-cut-link-info">
          <span class="link-label">✂️ 연결된 커트:</span>
          <span class="link-value">${cutStyleId.replace(/^F([A-H])L(\d+)$/, '$1 Length 스타일')}</span>
        </div>

        <!-- 도해도 뷰어 -->
        ${diagrams && diagrams.length > 0 ? `
        <div class="diagrams-section large">
          <h3>📐 펌 도해도 (${diagrams.length}장)</h3>
          ${this.generateDiagramViewer(diagrams)}
        </div>
        ` : ''}

        <!-- 펌 레시피 텍스트 -->
        <div class="custom-recipe-section">
          <h3>✨ ${permTypeName} 레시피</h3>
          <div class="recipe-content">
            ${this.formatRecipeContent(textRecipe || '레시피 정보가 없습니다.')}
          </div>
        </div>
      </div>
    `;

    // 도해도 뷰어 초기화
    if (diagrams && diagrams.length > 0) {
      this.initDiagramViewer(diagrams);
    }

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }
  }

  // ⭐ 커트 레시피로 돌아가기
  backToCutRecipe() {
    if (this.currentFemaleAnalysis) {
      this.showCustomRecipeCanvas(this.currentFemaleAnalysis.data, this.currentFemaleAnalysis.uploadedImageUrl);
    } else {
      console.warn('저장된 커트 분석 데이터가 없습니다.');
    }
  }

  // ⭐ 펌 레시피로 돌아가기
  backToPermRecipe() {
    if (this.currentFemaleAnalysis) {
      this.showCustomRecipeCanvas(this.currentFemaleAnalysis.data, this.currentFemaleAnalysis.uploadedImageUrl);
    } else {
      console.warn('저장된 펌 분석 데이터가 없습니다.');
    }
  }

  // ⭐ 펌 스타일의 매칭 커트 레시피 보기
  async showMatchingCutRecipe(permStyleId) {
    if (!permStyleId) {
      alert(t('aiStudio.noStyleInfo') || '스타일 정보가 없습니다.');
      return;
    }

    // 펌 styleId → 커트 styleId 변환 (FALP0001 → FAL0001)
    // 패턴: F{A-H}LP{숫자} → F{A-H}L{숫자}
    const cutStyleId = permStyleId.replace(/^(F[A-H])LP(\d+)$/, '$1L$2');
    console.log(`✂️ 커트 레시피 조회: ${permStyleId} → ${cutStyleId}`);

    // 로딩 표시
    const btn = document.querySelector('.cut-recipe-link-btn');
    if (btn) {
      btn.innerHTML = '⏳ 로딩 중...';
      btn.disabled = true;
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_cut_recipe_by_style',
          payload: {
            cut_style_id: cutStyleId,
            perm_style_id: permStyleId
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        // 커트 레시피 캔버스 표시
        this.showCutRecipeFromPerm(result.data, cutStyleId, permStyleId);
      } else {
        throw new Error(result.error || '커트 레시피를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('커트 레시피 조회 오류:', error);
      alert((t('aiStudio.cutRecipeError') || '커트 레시피 조회 중 오류가 발생했습니다') + ': ' + error.message);

      if (btn) {
        btn.innerHTML = t('aiStudio.viewCutRecipe') || '✂️ 이 스타일 커트 레시피 보기';
        btn.disabled = false;
      }
    }
  }

  // ⭐ 펌에서 연결된 커트 레시피 캔버스 표시
  showCutRecipeFromPerm(cutData, cutStyleId, permStyleId) {
    this.canvasEmpty.classList.add('hidden');
    this.canvasResult.classList.remove('hidden');

    const { textRecipe, diagrams, seriesName } = cutData;

    // 디버그: 텍스트 레시피 길이 확인
    console.log(`📋 커트 레시피 로드: ${cutStyleId}, 텍스트 길이: ${textRecipe ? textRecipe.length : 0}자`);
    if (textRecipe) {
      console.log(`📋 레시피 시작: ${textRecipe.substring(0, 100)}...`);
      console.log(`📋 레시피 끝: ...${textRecipe.substring(textRecipe.length - 100)}`);
    }

    // 기장 추출 (FAL → A Length)
    const lengthMatch = cutStyleId.match(/F([A-H])L/);
    const lengthCode = lengthMatch ? lengthMatch[1] : '';
    const lengthName = lengthCode ? `${lengthCode} Length` : '';

    this.canvasResult.innerHTML = `
      <div class="custom-recipe-canvas cut-from-perm">
        <!-- 헤더 -->
        <div class="recipe-header compact cut-header">
          <div class="cut-header-info">
            <h2>✂️ 커트 레시피</h2>
            <div class="analysis-tags">
              <span class="tag primary">${lengthName}</span>
            </div>
          </div>
          <button class="back-to-perm-btn" onclick="window.aiStudio.backToPermRecipe()">
            ← 펌 레시피로 돌아가기
          </button>
        </div>

        <!-- 연결 정보 -->
        <div class="cut-perm-link-info">
          <span class="link-label">🌀 연결된 펌:</span>
          <span class="link-value">${permStyleId.replace(/^F([A-H])LP(\d+)$/, '$1 Length 펌 스타일')}</span>
        </div>

        <!-- 도해도 뷰어 -->
        ${diagrams && diagrams.length > 0 ? `
        <div class="diagrams-section large">
          <h3>📐 커트 도해도 (${diagrams.length}장)</h3>
          ${this.generateDiagramViewer(diagrams)}
        </div>
        ` : ''}

        <!-- 커트 레시피 텍스트 -->
        <div class="custom-recipe-section">
          <h3>✨ 커트 레시피</h3>
          <div class="recipe-content">
            ${this.formatRecipeContent(textRecipe || '레시피 정보가 없습니다.')}
          </div>
        </div>
      </div>
    `;

    // 도해도 뷰어 초기화
    if (diagrams && diagrams.length > 0) {
      this.initDiagramViewer(diagrams);
    }

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }
  }

  // 레시피 내용 포맷팅 (세련된 HTML로 변환)
  formatRecipeContent(content) {
    if (!content) return '<p class="recipe-empty">레시피를 불러올 수 없습니다.</p>';

    // ⭐ 문자열이 아닌 경우 처리 (객체, boolean 등)
    if (typeof content !== 'string') {
      console.warn('formatRecipeContent: content is not a string:', typeof content, content);
      return '<p class="recipe-empty">레시피를 불러올 수 없습니다.</p>';
    }

    let formatted = content;

    // --- 구분선을 hr 태그로 변환 (먼저 처리)
    formatted = formatted.replace(/^---+$/gm, '<hr class="recipe-divider">');

    // ⭐ [External], [Internal] 섹션 헤더를 예쁜 카드로 변환 (커트 레시피)
    formatted = formatted.replace(/\*?\*?\[External\]\s*\(Under\s*Zone[^)]*\)\*?\*?/gi,
      '<div class="recipe-section external"><span class="section-icon">🔵</span><span class="section-title">External</span><span class="section-desc">Under Zone</span></div>');
    formatted = formatted.replace(/\*?\*?\[Internal\]\s*\(Over\s*Zone[^)]*\)\*?\*?/gi,
      '<div class="recipe-section internal"><span class="section-icon">🟣</span><span class="section-title">Internal</span><span class="section-desc">Over Zone</span></div>');

    // 기존 한글 형식도 지원 (호환성)
    formatted = formatted.replace(/\*?\*?\[엑스터널\s*부분\]\s*\([^)]*\)\*?\*?/gi,
      '<div class="recipe-section external"><span class="section-icon">🔵</span><span class="section-title">External</span><span class="section-desc">Under Zone</span></div>');
    formatted = formatted.replace(/\*?\*?\[인터널\s*부분\]\s*\([^)]*\)\*?\*?/gi,
      '<div class="recipe-section internal"><span class="section-icon">🟣</span><span class="section-title">Internal</span><span class="section-desc">Over Zone</span></div>');

    // ⭐ 펌 레시피 Zone 섹션 헤더 (A존/B존/C존)
    formatted = formatted.replace(/\*?\*?\[A존\s*\/?\s*Under\s*Zone\]\*?\*?\s*\([^)]*\)?/gi,
      '<div class="recipe-section zone-a"><span class="section-icon">🟢</span><span class="section-title">A존</span><span class="section-desc">Under Zone</span></div>');
    formatted = formatted.replace(/\*?\*?\[B존\s*\/?\s*Mid\s*Zone\]\*?\*?\s*\([^)]*\)?/gi,
      '<div class="recipe-section zone-b"><span class="section-icon">🟡</span><span class="section-title">B존</span><span class="section-desc">Mid Zone</span></div>');
    formatted = formatted.replace(/\*?\*?\[C존\s*\/?\s*Over\s*Zone\]\*?\*?\s*\([^)]*\)?/gi,
      '<div class="recipe-section zone-c"><span class="section-icon">🟣</span><span class="section-title">C존</span><span class="section-desc">Over Zone</span></div>');

    // [텍스트] 형태의 다른 섹션 헤더들 (위에서 처리되지 않은 것만)
    formatted = formatted.replace(/\*?\*?\[([^\]]+)\]\*?\*?/g, '<div class="recipe-section-simple"><span class="section-badge">$1</span></div>');

    // 마크다운 헤더 제거 및 변환 (##, ###, ####)
    formatted = formatted
      .replace(/^####\s*(.+)$/gm, '<h5 class="recipe-h5">$1</h5>')
      .replace(/^###\s*(.+)$/gm, '<h4 class="recipe-h4">$1</h4>')
      .replace(/^##\s*(.+)$/gm, '<h3 class="recipe-h3">$1</h3>')
      .replace(/^#\s*(.+)$/gm, '<h2 class="recipe-h2">$1</h2>');

    // ⭐ 펌 레시피 Zone 헤더 처리 (◆ 네이프, ◆ 센터 백 등)
    formatted = formatted.replace(/^◆\s*(.+)$/gm, '<div class="recipe-zone-header"><span class="zone-icon">◆</span><span class="zone-name">$1</span></div>');

    // ⭐ 펌 레시피 구분선 처리
    formatted = formatted.replace(/^─+$/gm, '<hr class="recipe-divider perm-divider">');

    // ⭐ 펌 레시피 주의/참고 사항 처리
    formatted = formatted.replace(/^⚠️\s*(.+)$/gm, '<div class="recipe-warning"><span class="warning-icon">⚠️</span><span class="warning-text">$1</span></div>');

    // 💡 초보자 설명 처리 (전문용어 뒤의 쉬운 설명)
    formatted = formatted.replace(/^💡\s*(.+)$/gm, '<div class="recipe-tip"><span class="tip-icon">💡</span><span class="tip-text">$1</span></div>');
    formatted = formatted.replace(/\s*💡\s*([^<\n]+)/g, '<span class="beginner-tip">💡 $1</span>');

    // ⭐ 마크다운 정리: 남아있는 *, **, # 기호 제거
    // 굵은 글씨 **text** → text
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '$1');
    // 기울임 *text* → text
    formatted = formatted.replace(/(?<![<])\*([^*\n]+)\*(?![>])/g, '$1');
    // 남은 단독 ** 제거
    formatted = formatted.replace(/\*\*/g, '');
    // 줄 시작의 * (불릿) → 공백으로 대체
    formatted = formatted.replace(/^\*\s+/gm, '');
    // 남은 단독 * 제거 (HTML 태그 안은 제외)
    formatted = formatted.replace(/(?<![<a-zA-Z])\*(?![a-zA-Z>])/g, '');
    // 서버 출력 이모지 제거 (📐, ✂️, ➡️, ⭐ 등) - 섹션 아이콘(🔵🟣🟢🟡)은 유지
    formatted = formatted.replace(/[📐✂️➡️⭐🎯✨🌀]/g, '');

    // 번호 리스트 (1. 2. 3.)
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered-item"><span class="num">$1</span>$2</li>');

    // 불릿 리스트 (- item) - 단 이미 처리된 것 제외
    formatted = formatted.replace(/^-\s+(.+)$/gm, '<li class="bullet-item">$1</li>');

    // 리스트 그룹화 + 섹션별 번호 매기기
    let inList = false;
    let sectionCounter = 0;  // External/Internal 섹션 내 문장 번호
    let inSection = false;   // 현재 섹션(External/Internal/Zone) 안에 있는지
    const lines = formatted.split('\n');
    const result = [];

    for (let line of lines) {
      const trimmed = line.trim();

      // External/Internal/Zone 섹션 헤더 감지 → 번호 리셋
      if (trimmed.includes('class="recipe-section') &&
          (trimmed.includes('external') || trimmed.includes('internal') ||
           trimmed.includes('zone-a') || trimmed.includes('zone-b') || trimmed.includes('zone-c'))) {
        sectionCounter = 0;
        inSection = true;
        result.push(trimmed);
        continue;
      }

      // 다른 섹션 헤더나 구분선 만나면 섹션 종료
      if (trimmed.includes('class="recipe-section') || trimmed.startsWith('<hr')) {
        inSection = false;
      }

      if (trimmed.startsWith('<li')) {
        if (!inList) {
          result.push('<ul class="recipe-list">');
          inList = true;
        }
        result.push(trimmed);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        // 섹션, hr, h태그, beginner-tip, keyword, zone-header, warning, tip은 그대로 유지
        if (trimmed &&
            !trimmed.startsWith('<h') &&
            !trimmed.startsWith('<hr') &&
            !trimmed.startsWith('<div class="recipe-') &&
            !trimmed.startsWith('<span class="beginner-tip">') &&
            !trimmed.startsWith('<span class="tip-')) {
          // 빈 문장이 아니면 p로 감싸기
          if (trimmed.length > 0) {
            // ⭐ 섹션 내부이면 번호 추가
            if (inSection) {
              sectionCounter++;
              result.push(`<p class="recipe-para numbered"><span class="step-num">${sectionCounter}</span>${trimmed}</p>`);
            } else {
              result.push(`<p class="recipe-para">${trimmed}</p>`);
            }
          }
        } else {
          result.push(trimmed);
        }
      }
    }
    if (inList) result.push('</ul>');

    // 빈 p 태그 및 불필요한 태그 정리
    formatted = result.join('\n')
      .replace(/<p class="recipe-para"><\/p>/g, '')
      .replace(/<p class="recipe-para">\s*<\/p>/g, '')
      .replace(/<p class="recipe-para">\s*<p class="recipe-step">/g, '<p class="recipe-step">')
      .replace(/<\/p>\s*<\/p>/g, '</p>');

    return `<div class="recipe-formatted">${formatted}</div>`;
  }

  // ⭐ 얼굴형별 아이콘 반환 (이론 기반)
  getFaceShapeIcon(shape) {
    const shapeLower = (shape || '').toLowerCase();

    if (shapeLower.includes('round') || shapeLower.includes('둥근')) return '🔵';
    if (shapeLower.includes('oval') || shapeLower.includes('달걀')) return '🥚';
    if (shapeLower.includes('long') || shapeLower.includes('긴')) return '📏';
    if (shapeLower.includes('square') || shapeLower.includes('각진') || shapeLower.includes('사각')) return '⬜';
    if (shapeLower.includes('heart') || shapeLower.includes('하트')) return '💗';
    if (shapeLower.includes('diamond') || shapeLower.includes('다이아')) return '💎';
    if (shapeLower.includes('이마')) return '👁️';
    if (shapeLower.includes('짧은')) return '📐';
    if (shapeLower.includes('균형') || shapeLower.includes('두상')) return '⭕';

    return '👤';  // 기본 아이콘
  }
}

// ==================== Global Functions ====================

function goBack() {
  // 브라우저 히스토리가 있으면 뒤로가기
  if (window.history.length > 1) {
    history.back();
  } else {
    // 히스토리가 없으면 메인 페이지로
    window.location.href = 'index.html';
  }
}

// 모바일에서 히스토리 패널 표시
function showHistoryPanel() {
  const canvasPanel = document.getElementById('canvas-panel');
  canvasPanel.classList.add('active');

  // 히스토리 탭 활성화
  document.querySelectorAll('.canvas-tab').forEach(tab => tab.classList.remove('active'));
  const historyTab = document.querySelector('.canvas-tab[data-tab="history"]');
  if (historyTab) historyTab.classList.add('active');

  // 히스토리 로드
  window.aiStudio.switchCanvasTab('history');
}

// 새 채팅 시작 (기존 대화는 유지, 새로운 대화 시작)
function startNewChat() {
  const messages = document.getElementById('chat-messages');

  // 다국어 지원
  const welcomeTitle = typeof t === 'function' ? t('aiStudio.welcomeTitle') : '안녕하세요! HAIRGATOR AI입니다.';
  const welcomeMessage = typeof t === 'function' ? t('aiStudio.welcomeMessage') : '헤어스타일 사진을 업로드하거나 질문해주세요. 2WAY CUT 시스템 기반으로 전문적인 분석과 레시피를 제공해드립니다.';
  const quickALength = typeof t === 'function' ? t('aiStudio.quickALength') : 'A Length란?';
  const quickLayerGrad = typeof t === 'function' ? t('aiStudio.quickLayerGrad') : 'Layer vs Graduation';
  const quickLifting = typeof t === 'function' ? t('aiStudio.quickLifting') : 'Lifting 설명';
  const quickDamagedPerm = typeof t === 'function' ? t('aiStudio.quickDamagedPerm') : '극손상모 펌 레시피';
  const quickHardenedHair = typeof t === 'function' ? t('aiStudio.quickHardenedHair') : '경화된 모발 펌 방법';

  messages.innerHTML = `
    <div class="message bot">
      <div class="message-avatar bot-logo"><img src="icons/icon-72.png" alt="H"></div>
      <div class="message-content">
        <p><strong>${welcomeTitle}</strong></p>
        <p>${welcomeMessage}</p>
        <div class="message-actions">
          <button class="action-btn" onclick="quickAction('${quickALength.replace(/'/g, "\\'")}')">${quickALength}</button>
          <button class="action-btn" onclick="quickAction('${quickLayerGrad.replace(/'/g, "\\'")}')">${quickLayerGrad}</button>
          <button class="action-btn" onclick="quickAction('${quickLifting.replace(/'/g, "\\'")}')">${quickLifting}</button>
          <button class="action-btn" onclick="quickAction('${quickDamagedPerm.replace(/'/g, "\\'")}')">${quickDamagedPerm}</button>
          <button class="action-btn" onclick="quickAction('${quickHardenedHair.replace(/'/g, "\\'")}')">${quickHardenedHair}</button>
        </div>
      </div>
    </div>
  `;

  // 새 세션 ID 생성 (히스토리에서 구분하기 위해)
  if (window.aiStudio) {
    window.aiStudio.currentSessionId = window.aiStudio.generateSessionId();
  }

  // 히스토리는 유지하되, 현재 세션 메모리만 초기화
  // Firebase 히스토리는 삭제하지 않음 (히스토리 탭에서 볼 수 있도록)

  // 캔버스 초기화
  const canvasResult = document.getElementById('canvas-result');
  const canvasEmpty = document.getElementById('canvas-empty');
  if (canvasResult) canvasResult.classList.add('hidden');
  if (canvasEmpty) canvasEmpty.classList.remove('hidden');

  // 이미지 프리뷰 초기화
  removePreviewImage();

  console.log('🆕 새 채팅 시작');
}

// 대화 내용 완전 삭제
function clearChat() {
  const confirmMsg = typeof t === 'function' ? t('aiStudio.confirmClear') : '대화 내용을 모두 삭제하시겠습니까?\n(히스토리도 함께 삭제됩니다)';
  const clearedMsg = typeof t === 'function' ? t('aiStudio.chatCleared') : '대화가 초기화되었습니다.';
  const enterNewMsg = typeof t === 'function' ? t('aiStudio.enterNewQuestion') : '새로운 질문을 입력해주세요.';

  if (confirm(confirmMsg)) {
    window.aiStudio.conversationHistory = [];
    const messages = document.getElementById('chat-messages');
    messages.innerHTML = `
      <div class="message bot">
        <div class="message-avatar bot-logo"><img src="icons/icon-72.png" alt="H"></div>
        <div class="message-content">
          <p><strong>${clearedMsg}</strong></p>
          <p>${enterNewMsg}</p>
        </div>
      </div>
    `;

    // Clear Firebase
    if (window.aiStudio.currentUserId && window.db) {
      window.aiStudio.clearFirebaseHistory();
    }

    // 캔버스 초기화
    const canvasResult = document.getElementById('canvas-result');
    const canvasEmpty = document.getElementById('canvas-empty');
    if (canvasResult) canvasResult.classList.add('hidden');
    if (canvasEmpty) canvasEmpty.classList.remove('hidden');
  }
}

// ==================== 이미지 업로드 함수들 ====================

// 대기 중인 이미지 저장
let pendingImageData = null;

// 선택된 액션 타입 (recipe / question)
let selectedImageAction = null;

// 선택된 성별 저장
let selectedGender = null;
// 선택된 시술 타입 (cut / perm)
let selectedService = null;
// 선택된 카테고리 저장
let selectedCategory = null;

// 이미지 액션 선택 (레시피 보기 / 질문하기)
function selectImageAction(action) {
  selectedImageAction = action;

  // 버튼 UI 업데이트
  const recipeBtn = document.getElementById('action-recipe');
  const questionBtn = document.getElementById('action-question');
  const genderSelection = document.getElementById('gender-selection');
  const categorySelection = document.getElementById('category-selection');

  recipeBtn.classList.remove('selected');
  questionBtn.classList.remove('selected');

  if (action === 'recipe') {
    recipeBtn.classList.add('selected');
    // 레시피 모드: 성별 선택 표시
    genderSelection.style.display = 'flex';
  } else if (action === 'question') {
    questionBtn.classList.add('selected');
    // 질문 모드: 성별 선택 숨기고 바로 질문 모드 시작
    genderSelection.style.display = 'none';
    categorySelection.style.display = 'none';
    selectedGender = null;
    selectedCategory = null;
    // 질문 모드 활성화
    startQuestionMode();
  }

  console.log(`🎯 이미지 액션 선택: ${action}`);
}

// 질문 모드 시작: 이미지를 채팅에 표시하고 안내 메시지
async function startQuestionMode() {
  if (!pendingImageData) return;

  const imageUrl = pendingImageData.url;
  const imageFile = pendingImageData.file;

  // 미리보기 숨기기
  document.getElementById('image-preview-area').style.display = 'none';

  // 사용자 메시지로 이미지만 표시
  window.aiStudio.addMessageToUI('user', `
    <img src="${imageUrl}" style="max-width: 200px; border-radius: 8px;" alt="업로드된 이미지">
  `);

  // 타이핑 표시
  window.aiStudio.showTypingIndicator();

  try {
    // Base64 변환 및 저장 (후속 질문에서 사용)
    const base64 = await window.aiStudio.fileToBase64(imageFile);
    window.aiStudio.pendingImageBase64 = base64;
    window.aiStudio.pendingMimeType = imageFile.type;
    window.aiStudio.questionModeImageUrl = imageUrl; // 질문 모드 이미지 URL 저장

    // i18n 적용된 안내 메시지
    const askMsg = typeof t === 'function'
      ? t('aiStudio.imageQuestionPrompt')
      : '이 이미지에 대해 어떤 점이 궁금하세요? 질문을 입력해주세요.';

    window.aiStudio.hideTypingIndicator();
    window.aiStudio.addMessageToUI('bot', `<p>${askMsg}</p>`);

    // 입력창에 포커스
    document.getElementById('chat-input').focus();

  } catch (error) {
    console.error('❌ 질문 모드 시작 실패:', error);
    window.aiStudio.hideTypingIndicator();
    window.aiStudio.addMessageToUI('bot', '<p>이미지 처리 중 오류가 발생했습니다.</p>');
  }

  // pendingImageData 유지 (나중에 질문 시 사용)
  // pendingImageData = null; // 주석 처리 - 질문 모드에서는 유지
}

// 여자 기장 카테고리 (H~A) - H가 가장 짧고 A가 가장 긺
// i18n 키 사용: aiStudio.category.female.{code}
const FEMALE_CATEGORIES = [
  { code: 'H', nameKey: 'catFemaleH', series: 'FHL', positionKey: 'catFemaleHPos', descKey: 'catFemaleHDesc' },
  { code: 'G', nameKey: 'catFemaleG', series: 'FGL', positionKey: 'catFemaleGPos', descKey: 'catFemaleGDesc' },
  { code: 'F', nameKey: 'catFemaleF', series: 'FFL', positionKey: 'catFemaleFPos', descKey: 'catFemaleFDesc' },
  { code: 'E', nameKey: 'catFemaleE', series: 'FEL', positionKey: 'catFemaleEPos', descKey: 'catFemaleEDesc' },
  { code: 'D', nameKey: 'catFemaleD', series: 'FDL', positionKey: 'catFemaleDPos', descKey: 'catFemaleDDesc' },
  { code: 'C', nameKey: 'catFemaleC', series: 'FCL', positionKey: 'catFemaleCPos', descKey: 'catFemaleCDesc' },
  { code: 'B', nameKey: 'catFemaleB', series: 'FBL', positionKey: 'catFemaleBPos', descKey: 'catFemaleBDesc' },
  { code: 'A', nameKey: 'catFemaleA', series: 'FAL', positionKey: 'catFemaleAPos', descKey: 'catFemaleADesc' }
];

// 남자 스타일 카테고리
// i18n 키 사용: aiStudio.category.male.{code}
const MALE_CATEGORIES = [
  { code: 'SF', nameKey: 'catMaleSF', series: 'SF' },
  { code: 'SP', nameKey: 'catMaleSP', series: 'SP' },
  { code: 'FU', nameKey: 'catMaleFU', series: 'FU' },
  { code: 'PB', nameKey: 'catMalePB', series: 'PB' },
  { code: 'BZ', nameKey: 'catMaleBZ', series: 'BZ' },
  { code: 'CP', nameKey: 'catMaleCP', series: 'CP' },
  { code: 'MC', nameKey: 'catMaleMC', series: 'MC' }
];

// 성별 선택 함수
function selectGender(gender) {
  selectedGender = gender;
  selectedService = null; // 시술 초기화
  selectedCategory = null; // 카테고리 초기화

  // 버튼 UI 업데이트
  const femaleBtn = document.getElementById('gender-female');
  const maleBtn = document.getElementById('gender-male');

  femaleBtn.classList.remove('selected');
  maleBtn.classList.remove('selected');

  if (gender === 'female') {
    femaleBtn.classList.add('selected');
    // 여성: 시술 선택(컷/펌) 표시
    document.getElementById('service-cut').classList.remove('selected');
    document.getElementById('service-selection').style.display = 'flex';
    document.getElementById('category-selection').style.display = 'none';
  } else if (gender === 'male') {
    maleBtn.classList.add('selected');
    // 남성: 시술 선택 건너뛰고 바로 스타일 선택
    selectedService = 'cut';
    document.getElementById('service-selection').style.display = 'none';
    showCategorySelection(gender);
  }

  console.log(`🎯 성별 선택: ${gender}`);
}

// 시술 선택 함수 (컷/펌)
function selectService(service) {
  selectedService = service;
  selectedCategory = null; // 카테고리 초기화

  // 버튼 UI 업데이트
  const cutBtn = document.getElementById('service-cut');
  const permBtn = document.getElementById('service-perm');
  cutBtn.classList.remove('selected');
  permBtn.classList.remove('selected');

  if (service === 'cut') {
    cutBtn.classList.add('selected');
  } else if (service === 'perm') {
    permBtn.classList.add('selected');
  }

  // 카테고리 선택 UI 표시 (여자만 펌 레시피 지원)
  if (selectedGender === 'female' || service === 'cut') {
    showCategorySelection(selectedGender);
  } else {
    // 남자 펌은 아직 미지원 - 메시지 표시
    alert(t('aiStudio.malePermComingSoon') || '남자 펌 레시피는 준비 중입니다.');
    selectedService = null;
    permBtn.classList.remove('selected');
  }

  console.log(`🎯 시술 선택: ${service}`);
}

// 카테고리 선택 UI 표시
function showCategorySelection(gender) {
  const categorySelection = document.getElementById('category-selection');
  const categoryLabel = document.getElementById('category-label');
  const categoryButtons = document.getElementById('category-buttons');

  // 카테고리 목록 결정
  const categories = gender === 'female' ? FEMALE_CATEGORIES : MALE_CATEGORIES;
  const labelKey = gender === 'female' ? 'aiStudio.selectLength' : 'aiStudio.selectStyle';
  const labelText = typeof t === 'function' ? t(labelKey) : (gender === 'female' ? '기장 선택:' : '스타일 선택:');
  const categoryClass = gender === 'female' ? 'female-category' : 'male-category';

  // 라벨 업데이트
  categoryLabel.textContent = labelText;

  // 버튼 생성 (여성: 상세 설명 툴팁 포함)
  categoryButtons.innerHTML = categories.map(cat => {
    const name = typeof t === 'function' ? t(`aiStudio.${cat.nameKey}`) : cat.code;
    let tooltip = '';
    if (cat.positionKey && cat.descKey) {
      const position = typeof t === 'function' ? t(`aiStudio.${cat.positionKey}`) : '';
      const desc = typeof t === 'function' ? t(`aiStudio.${cat.descKey}`) : '';
      if (position && desc) {
        tooltip = `title="${position}: ${desc}"`;
      }
    }
    return `
    <button class="category-btn ${categoryClass}" data-code="${cat.code}" data-series="${cat.series}" ${tooltip} onclick="selectCategory('${cat.code}', '${cat.series}')">
      ${name}
    </button>
  `;
  }).join('');

  // 표시
  categorySelection.style.display = 'flex';
}

// 카테고리 선택 함수
function selectCategory(code, series) {
  selectedCategory = { code, series };

  // 버튼 UI 업데이트
  const buttons = document.querySelectorAll('.category-btn');
  buttons.forEach(btn => btn.classList.remove('selected'));

  const selectedBtn = document.querySelector(`.category-btn[data-code="${code}"]`);
  if (selectedBtn) {
    selectedBtn.classList.add('selected');
  }

  console.log(`📂 카테고리 선택: ${code} (시리즈: ${series})`);
}

function triggerImageUpload() {
  document.getElementById('image-upload').click();
}

async function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 유효성 검사
  if (!file.type.startsWith('image/')) {
    alert(t('aiStudio.onlyImageFiles') || '이미지 파일만 업로드 가능합니다.');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert(t('aiStudio.imageSizeLimit10MB') || '이미지 크기는 10MB 이하여야 합니다.');
    return;
  }

  // 즉시 미리보기 표시 (blob URL - 빠른 UX)
  const blobUrl = URL.createObjectURL(file);
  const previewArea = document.getElementById('image-preview-area');
  const previewImage = document.getElementById('preview-image');

  previewImage.src = blobUrl;
  previewArea.style.display = 'block';

  // 파일 데이터 저장 (초기: blob URL)
  pendingImageData = {
    file: file,
    url: blobUrl,
    isUploading: true,
    storageUrl: null
  };

  console.log('📷 이미지 선택됨:', file.name);

  // 파일 입력 초기화
  event.target.value = '';

  // ⭐ 백그라운드에서 Firebase Storage 업로드
  try {
    if (window.aiStudio && window.aiStudio.uploadImageToStorage) {
      console.log('📤 Firebase Storage 업로드 시작...');
      const storageUrl = await window.aiStudio.uploadImageToStorage(file);

      // 업로드 완료 시 URL 업데이트
      if (pendingImageData && pendingImageData.file === file) {
        pendingImageData.storageUrl = storageUrl;
        pendingImageData.url = storageUrl; // 영구 URL로 교체
        pendingImageData.isUploading = false;
        console.log('✅ Firebase Storage URL 업데이트:', storageUrl);
      }
    } else {
      // Firebase Storage 사용 불가 시 blob URL 유지
      pendingImageData.isUploading = false;
      console.warn('⚠️ Firebase Storage 사용 불가, blob URL 사용');
    }
  } catch (error) {
    console.error('❌ Firebase Storage 업로드 실패:', error);
    pendingImageData.isUploading = false;
  }
}

function removePreviewImage() {
  const previewArea = document.getElementById('image-preview-area');
  const previewImage = document.getElementById('preview-image');

  if (pendingImageData && pendingImageData.url) {
    URL.revokeObjectURL(pendingImageData.url);
  }

  previewImage.src = '';
  previewArea.style.display = 'none';
  pendingImageData = null;

  // 액션 선택 초기화
  selectedImageAction = null;
  document.getElementById('action-recipe').classList.remove('selected');
  document.getElementById('action-question').classList.remove('selected');

  // 성별 선택 초기화
  selectedGender = null;
  selectedService = null;
  selectedCategory = null;
  document.getElementById('gender-selection').style.display = 'none';
  document.getElementById('gender-female').classList.remove('selected');
  document.getElementById('gender-male').classList.remove('selected');
  document.getElementById('service-selection').style.display = 'none';
  document.getElementById('service-cut').classList.remove('selected');
  document.getElementById('category-selection').style.display = 'none';

  console.log('🗑️ 이미지 제거됨');
}

async function sendImageWithQuestion() {
  if (!pendingImageData) return false;

  // 성별 선택 검증
  if (!selectedGender) {
    alert(t('aiStudio.selectGenderAlert') || '성별을 선택해주세요.');
    return false;
  }

  // 카테고리 선택 검증
  if (!selectedCategory) {
    const categoryType = selectedGender === 'female' ? (t('aiStudio.selectLength') || '기장') : (t('aiStudio.selectStyle') || '스타일');
    alert(categoryType.replace(':', '') + ' ' + (t('aiStudio.selectCategoryFormat') || '을(를) 선택해주세요.'));
    return false;
  }

  // ⭐ Firebase Storage 업로드 완료 대기
  if (pendingImageData.isUploading) {
    console.log('⏳ 이미지 업로드 완료 대기 중...');
    // 최대 10초 대기
    for (let i = 0; i < 100 && pendingImageData.isUploading; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (pendingImageData.isUploading) {
      console.warn('⚠️ 이미지 업로드 타임아웃, blob URL 사용');
    }
  }

  const textInput = document.getElementById('chat-input');
  const question = textInput.value.trim() || '이 헤어스타일에 맞는 레시피를 만들어주세요';

  // 성별 + 카테고리 표시 텍스트
  const genderText = selectedGender === 'male' ? '👨 남자' : '👩 여자';
  const categoryText = selectedGender === 'female'
    ? `${selectedCategory.code} 기장`
    : selectedCategory.code;

  // 사용자 메시지 표시 (이미지 + 성별 + 카테고리 + 텍스트)
  // ⭐ Firebase Storage URL 사용 (있으면)
  const displayUrl = pendingImageData.storageUrl || pendingImageData.url;
  window.aiStudio.addMessageToUI('user', `
    <img src="${displayUrl}" style="max-width: 200px; border-radius: 8px; margin-bottom: 8px;" alt="업로드된 이미지">
    <p><strong>${genderText} | ${categoryText}</strong></p>
    <p>${question}</p>
  `);

  // 미리보기 숨기기
  document.getElementById('image-preview-area').style.display = 'none';

  // 입력창 초기화
  textInput.value = '';

  // 타이핑 표시
  window.aiStudio.showTypingIndicator();

  try {
    // Base64 변환
    const base64 = await window.aiStudio.fileToBase64(pendingImageData.file);

    // 재분석용 이미지 데이터 저장
    window.aiStudio.pendingImageBase64 = base64;
    window.aiStudio.pendingMimeType = pendingImageData.file.type;

    // ⭐⭐⭐ 전송 데이터 로그 (디버깅용)
    console.log(`📤 맞춤 레시피 생성 API 호출...`);
    console.log(`   - 성별: ${selectedGender}`);
    console.log(`   - 시술: ${selectedService || 'cut'}`);
    console.log(`   - category (기장코드): ${selectedCategory.code}`);
    console.log(`   - series: ${selectedCategory.series}`);

    const requestPayload = {
      action: 'analyze_and_match_recipe',
      payload: {
        image_base64: base64,
        mime_type: pendingImageData.file.type,
        gender: selectedGender,
        service: selectedService || 'cut',  // ⭐ 시술 타입 (cut/perm)
        category: selectedCategory.code,
        series: selectedCategory.series
      }
    };

    // API 호출 - 이미지 분석 + 맞춤 레시피 생성 (성별 + 카테고리 포함)
    const response = await fetch(window.aiStudio.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    const result = await response.json();
    console.log('📥 API 응답:', result);
    console.log(`   - 응답 기장: ${result.data?.analysis?.lengthName}`);
    console.log(`   - 응답 시리즈: ${result.data?.targetSeries?.code}`);

    window.aiStudio.hideTypingIndicator();

    if (result.success && result.data) {
      const data = result.data;
      let analysisMsg;

      // 필수 데이터 확인
      if (!data.targetSeries || !data.analysis || !data.referenceStyles) {
        console.error('❌ API 응답 데이터 불완전:', data);
        window.aiStudio.addMessageToUI('bot', '분석 결과가 불완전합니다. 다시 시도해주세요.');
        return;
      }

      // 남자/여자에 따라 분석 결과 메시지 분기
      if (data.gender === 'male') {
        // 남자 스타일 분석 결과 (스타일 코드 숨김)
        analysisMsg = `**👨 남자 스타일 분석 완료!**

💇 **스타일**: ${data.analysis.styleName || '분석중'}
📏 **탑 길이**: ${data.analysis.topLength || '-'}
📐 **사이드 길이**: ${data.analysis.sideLength || '-'}
✂️ **페이드**: ${data.analysis.fadeType || 'None'}
🎨 **텍스처**: ${data.analysis.texture || '-'}
💆 **스타일링 제품**: ${data.analysis.productType || '-'}

👉 **오른쪽 캔버스에서 맞춤 레시피를 확인하세요!**`;
      } else {
        // 여자 스타일 분석 결과 (스타일 코드 숨김)
        analysisMsg = `**👩 여자 스타일 분석 완료!**

📏 **기장**: ${data.analysis.lengthName || '-'}
✂️ **형태**: ${data.analysis.form || '-'}
💇 **앞머리**: ${data.analysis.hasBangs ? data.analysis.bangsType : '없음'}
📐 **볼륨**: ${data.analysis.volumePosition || '-'}
🎨 **텍스처**: ${data.analysis.texture || '-'}

👉 **오른쪽 캔버스에서 맞춤 레시피를 확인하세요!**`;
      }

      window.aiStudio.addMessageToUI('bot', analysisMsg);

      // ⭐ 레시피 분석 결과를 대화 히스토리에 저장 (후속 질문 컨텍스트용)
      window.aiStudio.conversationHistory.push({
        sender: 'user',
        content: `[이미지 업로드] ${genderText} 헤어스타일 레시피 생성 요청`,
        timestamp: Date.now()
      });

      // ⭐ 분석 결과를 상세하게 히스토리에 저장
      let recipeContext;
      if (data.gender === 'male') {
        recipeContext = `[레시피 분석 결과]
성별: 남자
스타일 코드: ${data.analysis.styleCode || '-'}
스타일명: ${data.analysis.styleName || '-'}
서브스타일: ${data.analysis.subStyle || '-'}
탑 길이: ${data.analysis.topLength || '-'}
사이드 길이: ${data.analysis.sideLength || '-'}
페이드: ${data.analysis.fadeType || 'None'}
텍스처: ${data.analysis.texture || '-'}
스타일링 방향: ${data.analysis.stylingDirection || '-'}
추천 제품: ${data.analysis.productType || '-'}
참고 스타일: ${data.referenceStyles.map(s => s.styleId).join(', ')}
${data.recipe ? `\n생성된 레시피:\n${data.recipe}` : ''}`;
      } else {
        recipeContext = `[레시피 분석 결과]
성별: 여자
기장: ${data.analysis.lengthName || '-'}
형태: ${data.analysis.form || '-'}
앞머리: ${data.analysis.hasBangs ? data.analysis.bangsType : '없음'}
볼륨 위치: ${Array.isArray(data.analysis.volumePosition) ? data.analysis.volumePosition.join(', ') : data.analysis.volumePosition || '-'}
텍스처: ${data.analysis.texture || '-'}
리프팅: ${Array.isArray(data.analysis.liftingRange) ? data.analysis.liftingRange.join(', ') : data.analysis.liftingRange || '-'}
섹션: ${data.analysis.sectionPrimary || '-'}
연결: ${data.analysis.connectionType || '-'}
참고 스타일: ${data.referenceStyles.map(s => s.styleId).join(', ')}
${data.customRecipe ? `\n생성된 레시피:\n${data.customRecipe}` : ''}`;
      }

      // ⭐ 캔버스 데이터 구성 (히스토리 복원용)
      // Firebase Storage URL 우선 사용 (영구 보관)
      const permanentImageUrl = pendingImageData.storageUrl || pendingImageData.url;
      const canvasData = {
        type: 'customRecipe',
        customRecipe: true,
        gender: data.gender,
        analysis: data.analysis,
        referenceStyles: data.referenceStyles,
        recipe: data.gender === 'male' ? data.recipe : data.customRecipe,
        imageUrl: permanentImageUrl,
        uploadedImageUrl: permanentImageUrl
      };

      window.aiStudio.conversationHistory.push({
        sender: 'bot',
        content: recipeContext,
        timestamp: Date.now(),
        isRecipeContext: true,  // 레시피 컨텍스트 표시
        canvasData: canvasData  // ⭐ 캔버스 데이터 포함
      });

      // ⭐ Firebase에도 캔버스 데이터 저장
      window.aiStudio.saveMessageToFirebase('bot', recipeContext, canvasData);

      // ⭐ 현재 활성 레시피 컨텍스트 저장 (API 호출 시 사용)
      window.aiStudio.currentRecipeContext = {
        gender: data.gender,
        analysis: data.analysis,
        referenceStyles: data.referenceStyles,
        recipe: data.gender === 'male' ? data.recipe : data.customRecipe,
        timestamp: Date.now()
      };

      // 캔버스에 맞춤 레시피 표시 (영구 URL 사용)
      window.aiStudio.showCustomRecipeCanvas(data, permanentImageUrl);

      // ⭐ 레시피 생성 크레딧 차감 (Vision 분석 포함 = 30크레딧)
      if (window.BullnabiBridge && typeof window.BullnabiBridge.deductTokensDynamic === 'function') {
        try {
          const result = await window.BullnabiBridge.deductTokensDynamic(null, 30, 'recipe', {
            gender: data.gender,
            series: data.targetSeries?.code,
            service: selectedService || 'cut'
          });
          if (result.success) {
            console.log(`💳 레시피 생성 크레딧 차감: 30, 잔액: ${result.newBalance}`);
          }
        } catch (e) {
          console.warn('⚠️ 레시피 크레딧 차감 실패:', e);
        }
      }

    } else {
      window.aiStudio.addMessageToUI('bot', result.error || '레시피 생성에 실패했습니다. 다시 시도해주세요.');
    }

  } catch (error) {
    window.aiStudio.hideTypingIndicator();
    window.aiStudio.addMessageToUI('bot', '레시피 생성 중 오류가 발생했습니다.');
    console.error('❌ 레시피 생성 오류:', error);
  }

  // 이미지 데이터 및 성별 선택 초기화
  pendingImageData = null;
  selectedGender = null;

  return true;
}

async function sendMessage() {
  console.log('🔍 sendMessage 호출됨, pendingImageData:', pendingImageData, 'selectedImageAction:', selectedImageAction);

  // 이미지가 있고 레시피 모드가 선택된 경우
  if (pendingImageData && pendingImageData.file && selectedImageAction === 'recipe') {
    console.log('📷 레시피 모드: 이미지와 함께 전송 시작');
    await sendImageWithQuestion();
    return;
  }

  // 질문 모드에서 후속 질문 처리 (이미지 base64가 저장되어 있는 경우)
  if (window.aiStudio.pendingImageBase64) {
    const textInput = document.getElementById('chat-input');
    const question = textInput.value.trim();

    if (!question) {
      alert(typeof t === 'function' ? t('aiStudio.enterQuestion') || '질문을 입력해주세요.' : '질문을 입력해주세요.');
      return;
    }

    console.log('💬 질문 모드: 이미지와 함께 질문 전송');
    await sendQuestionWithImage(question);
    return;
  }

  // 텍스트만 전송
  console.log('📝 텍스트만 전송');
  if (window.aiStudio && typeof window.aiStudio.sendMessage === 'function') {
    window.aiStudio.sendMessage();
  } else {
    console.error('❌ aiStudio가 초기화되지 않았습니다');
  }
}

// 질문 모드: 이미지와 함께 질문 전송
async function sendQuestionWithImage(question) {
  const textInput = document.getElementById('chat-input');

  // 사용자 메시지 표시
  window.aiStudio.addMessageToUI('user', `<p>${question}</p>`);
  textInput.value = '';

  // 타이핑 표시
  window.aiStudio.showTypingIndicator();

  try {
    // 언어 설정
    const lang = localStorage.getItem('hairgator_language') || 'ko';

    // 서버에 이미지 + 질문 전송
    const response = await fetch('/.netlify/functions/chatbot-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'image_question',
        payload: {
          image_base64: window.aiStudio.pendingImageBase64,
          mime_type: window.aiStudio.pendingMimeType,
          question: question,
          language: lang
        }
      })
    });

    const data = await response.json();

    window.aiStudio.hideTypingIndicator();

    if (data.success && data.answer) {
      window.aiStudio.addMessageToUI('bot', `<p>${data.answer}</p>`);

      // Firebase에 저장
      if (window.aiStudio.currentUserId) {
        window.aiStudio.saveMessageToFirebase('user', question);
        window.aiStudio.saveMessageToFirebase('bot', data.answer);
      }

      // ⭐ 이미지 질문 크레딧 차감 (Vision 분석 = 20크레딧)
      if (window.BullnabiBridge && typeof window.BullnabiBridge.deductTokensDynamic === 'function') {
        try {
          const result = await window.BullnabiBridge.deductTokensDynamic(null, 20, 'image_question', {
            question: question.substring(0, 100)
          });
          if (result.success) {
            console.log(`💳 이미지 질문 크레딧 차감: 20, 잔액: ${result.newBalance}`);
          }
        } catch (e) {
          console.warn('⚠️ 이미지 질문 크레딧 차감 실패:', e);
        }
      }
    } else {
      window.aiStudio.addMessageToUI('bot', '<p>답변을 생성하지 못했습니다. 다시 시도해주세요.</p>');
    }

  } catch (error) {
    console.error('❌ 질문 전송 실패:', error);
    window.aiStudio.hideTypingIndicator();
    window.aiStudio.addMessageToUI('bot', '<p>오류가 발생했습니다. 다시 시도해주세요.</p>');
  }
}

function quickAction(query) {
  if (window.aiStudio && typeof window.aiStudio.sendMessage === 'function') {
    window.aiStudio.sendMessage(query);
  } else {
    console.error('❌ aiStudio가 초기화되지 않았습니다');
  }
}

// 스타일 검색 데모 함수
async function searchStylesDemo(query) {
  if (!window.aiStudio) {
    console.error('❌ aiStudio가 초기화되지 않았습니다');
    return;
  }

  // 사용자 메시지 표시
  window.aiStudio.addMessageToUI('user', `🔍 유사 스타일 검색: "${query}"`);

  // 타이핑 표시
  window.aiStudio.showTypingIndicator();

  try {
    // 스타일 검색 API 호출
    const searchData = await window.aiStudio.searchSimilarStyles(query, 3);

    window.aiStudio.hideTypingIndicator();

    if (searchData && searchData.results && searchData.results.length > 0) {
      // 결과 메시지 표시 (스타일 코드 숨김, 시리즈명만 표시)
      const resultMsg = `✅ **${searchData.results.length}개의 유사 스타일을 찾았습니다!**\n\n` +
        searchData.results.map((s, i) =>
          `${i + 1}. **${s.seriesName || '스타일'}** - 유사도 ${(s.similarity * 100).toFixed(1)}%`
        ).join('\n') +
        `\n\n👉 오른쪽 캔버스에서 상세 정보를 확인하세요.`;

      window.aiStudio.addMessageToUI('bot', resultMsg);

      // 캔버스에 결과 표시
      window.aiStudio.showStyleSearchResults(searchData);
    } else {
      window.aiStudio.addMessageToUI('bot', '죄송합니다. 유사한 스타일을 찾지 못했습니다. 다른 검색어를 시도해보세요.');
    }
  } catch (error) {
    window.aiStudio.hideTypingIndicator();
    window.aiStudio.addMessageToUI('bot', '스타일 검색 중 오류가 발생했습니다.');
    console.error('❌ 스타일 검색 오류:', error);
  }
}

function hideCanvas() {
  window.aiStudio.hideCanvas();
}

function saveResult() {
  window.aiStudio.saveResult();
}

function shareResult() {
  window.aiStudio.shareResult();
}

// ==================== Initialize ====================

document.addEventListener('DOMContentLoaded', () => {
  window.aiStudio = new AIStudio();
  console.log('✅ HAIRGATOR AI Studio Ready');

  // 모바일: 입력창 외부 터치 시 키보드 숨기기
  document.addEventListener('touchstart', (e) => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput && document.activeElement === chatInput) {
      // 입력창이나 전송 버튼이 아닌 곳을 터치하면 blur
      if (!e.target.closest('.input-wrapper')) {
        chatInput.blur();
      }
    }
  }, { passive: true });

  // ⭐ 자동 레시피 생성 모드 처리 (스타일 메뉴에서 레시피 버튼 클릭 시)
  setTimeout(() => {
    handleAutoRecipeMode();
  }, 500);
});

// ========== 자동 레시피 생성 모드 ==========
async function handleAutoRecipeMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const autoRecipe = urlParams.get('autoRecipe');

  if (autoRecipe !== 'true') return;

  console.log('📋 자동 레시피 모드 감지');

  // URL 파라미터 파싱
  const imageUrl = urlParams.get('imageUrl');
  const gender = urlParams.get('gender') || 'female';
  const service = urlParams.get('service') || 'cut';
  const category = urlParams.get('category');
  const series = urlParams.get('series');
  const styleName = urlParams.get('styleName') || '';
  const styleId = urlParams.get('styleId') || '';

  if (!imageUrl) {
    console.error('❌ 이미지 URL이 없습니다');
    window.aiStudio.addMessageToUI('bot', '이미지 정보가 없어 레시피를 생성할 수 없습니다.');
    return;
  }

  console.log('📋 자동 레시피 파라미터:', { gender, service, category, series, styleName });

  // 로딩 메시지 표시
  const loadingMsg = gender === 'male'
    ? `📋 ${styleName || '선택한 스타일'}의 커트 레시피를 생성하고 있습니다...`
    : `📋 ${styleName || '선택한 스타일'}의 ${service === 'perm' ? '펌' : '커트'} 레시피를 생성하고 있습니다...`;

  window.aiStudio.addMessageToUI('bot', loadingMsg);
  window.aiStudio.showTypingIndicator();

  try {
    // 1. 전역 변수 설정 (기존 로직 호환)
    selectedGender = gender;
    selectedService = service;
    selectedCategory = { code: category, series: series };

    // UI 업데이트
    updateAutoRecipeUI(gender, service, category);

    // 2. API 호출 - 서버에서 이미지 URL 직접 가져오도록 (더 빠름)
    console.log('📤 자동 레시피 API 호출 (image_url 전달)...');
    const requestPayload = {
      action: 'analyze_and_match_recipe',
      payload: {
        image_url: imageUrl,  // ⭐ 서버에서 직접 fetch
        gender: gender,
        service: service,
        category: category,
        series: series
      }
    };

    const response = await fetch(window.aiStudio.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    const result = await response.json();
    console.log('📥 자동 레시피 API 응답:', result);

    window.aiStudio.hideTypingIndicator();

    if (result.success && result.data) {
      const data = result.data;

      // 분석 결과 메시지
      let analysisMsg;
      if (data.gender === 'male') {
        analysisMsg = `**👨 남자 스타일 분석 완료!**

💇 **스타일**: ${data.analysis.styleName || styleName || '분석중'}
📏 **탑 길이**: ${data.analysis.topLength || '-'}
📐 **사이드 길이**: ${data.analysis.sideLength || '-'}
✂️ **페이드**: ${data.analysis.fadeType || 'None'}

👉 **오른쪽 캔버스에서 맞춤 레시피를 확인하세요!**`;
      } else {
        const serviceText = service === 'perm' ? '펌' : '커트';
        analysisMsg = `**👩 여자 ${serviceText} 스타일 분석 완료!**

📏 **기장**: ${data.analysis.lengthName || '-'}
🎨 **형태**: ${data.analysis.form || '-'}
💇 **앞머리**: ${data.analysis.hasBangs ? data.analysis.bangsType : '없음'}
🌊 **텍스처**: ${data.analysis.texture || '-'}

👉 **오른쪽 캔버스에서 맞춤 레시피를 확인하세요!**`;
      }

      window.aiStudio.addMessageToUI('bot', analysisMsg);

      // 캔버스에 레시피 표시
      window.aiStudio.showCustomRecipeCanvas(data, imageUrl);

      // 크레딧 차감
      if (window.BullnabiBridge && typeof window.BullnabiBridge.deductTokensDynamic === 'function') {
        try {
          const deductResult = await window.BullnabiBridge.deductTokensDynamic(null, 30, 'recipe', {
            gender: data.gender,
            series: series,
            service: service,
            autoRecipe: true
          });
          if (deductResult.success) {
            console.log(`💳 자동 레시피 크레딧 차감: 30, 잔액: ${deductResult.newBalance}`);
          }
        } catch (e) {
          console.warn('⚠️ 레시피 크레딧 차감 실패:', e);
        }
      }

    } else {
      window.aiStudio.addMessageToUI('bot', result.error || '레시피 생성에 실패했습니다. 다시 시도해주세요.');
    }

  } catch (error) {
    console.error('❌ 자동 레시피 생성 오류:', error);
    window.aiStudio.hideTypingIndicator();
    window.aiStudio.addMessageToUI('bot', `레시피 생성 중 오류가 발생했습니다: ${error.message}`);
  }

  // URL 파라미터 정리 (히스토리에서 제거)
  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
}

// 이미지 URL을 base64로 변환
async function fetchImageAsBase64(imageUrl) {
  try {
    // Firebase Storage URL인 경우 직접 fetch
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`이미지 로드 실패: ${response.status}`);
    }

    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve({ base64, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('이미지 base64 변환 실패:', error);
    return null;
  }
}

// 자동 레시피 모드 UI 업데이트
function updateAutoRecipeUI(gender, service, category) {
  // 성별 버튼 선택
  const femaleBtn = document.getElementById('gender-female');
  const maleBtn = document.getElementById('gender-male');

  if (femaleBtn && maleBtn) {
    femaleBtn.classList.remove('selected');
    maleBtn.classList.remove('selected');

    if (gender === 'male') {
      maleBtn.classList.add('selected');
    } else {
      femaleBtn.classList.add('selected');
    }
  }

  // 시술 선택 (여자만)
  if (gender === 'female') {
    const serviceSelection = document.getElementById('service-selection');
    const cutBtn = document.getElementById('service-cut');
    const permBtn = document.getElementById('service-perm');

    if (serviceSelection) serviceSelection.style.display = 'flex';
    if (cutBtn && permBtn) {
      cutBtn.classList.remove('selected');
      permBtn.classList.remove('selected');
      if (service === 'perm') {
        permBtn.classList.add('selected');
      } else {
        cutBtn.classList.add('selected');
      }
    }
  }

  // 카테고리 선택 표시
  const categorySelection = document.getElementById('category-selection');
  if (categorySelection) {
    categorySelection.style.display = 'flex';

    // 해당 카테고리 버튼 선택
    setTimeout(() => {
      const categoryBtn = document.querySelector(`.category-btn[data-code="${category}"]`);
      if (categoryBtn) {
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('selected'));
        categoryBtn.classList.add('selected');
      }
    }, 100);
  }
}
