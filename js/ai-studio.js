// ============================================================
// HAIRGATOR AI Studio - Pro Workstation JavaScript
// Split View Layout + Firebase Integration
// ============================================================

class AIStudio {
  constructor() {
    this.apiEndpoint = '/.netlify/functions/chatbot-api';
    this.currentLanguage = this.getStoredLanguage();
    this.conversationHistory = [];
    this.currentUserId = null;
    this.userPhotoUrl = null; // 사용자 프로필 사진 URL
    this.HISTORY_EXPIRE_DAYS = 7;
    this.MAX_MESSAGES = 200;

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
      // 1. Firebase userSettings에서 프로필 사진 가져오기
      if (window.db) {
        const userStr = localStorage.getItem('bullnabi_user');
        if (userStr) {
          const userInfo = JSON.parse(userStr);
          const docId = `${userInfo.name}_${userInfo.phone || '0000'}`;

          try {
            const doc = await window.db.collection('userSettings').doc(docId).get();
            if (doc.exists) {
              const data = doc.data();
              if (data.profileImage) {
                this.userPhotoUrl = data.profileImage;
                console.log('👤 Firebase userSettings 프로필 사진 로드됨');
                return;
              }
            }
          } catch (fbError) {
            console.warn('Firebase 프로필 사진 로드 실패:', fbError);
          }
        }
      }

      // 2. localStorage에서 프로필 사진 가져오기 (캐시)
      const savedProfileImage = localStorage.getItem('hairgator_profile_image');
      if (savedProfileImage) {
        this.userPhotoUrl = savedProfileImage;
        console.log('👤 localStorage 프로필 사진 로드됨');
        return;
      }

      // 3. 불나비 사용자 정보에서 프로필 사진 가져오기
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

    console.log('✅ AI Studio 초기화 완료');
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

      historyList.innerHTML = analysisHistory.map((item, idx) => `
        <div class="history-item" onclick="window.aiStudio.showHistoryDetail(${idx})">
          <div class="history-item-thumb">
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="분석 이미지">` : '<span>📷</span>'}
          </div>
          <div class="history-item-info">
            <div class="history-item-title">${item.title || '이미지 분석'}</div>
            <div class="history-item-meta">
              <span>${item.length || ''}</span>
              <span>${item.form || ''}</span>
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

  // 분석 히스토리 가져오기 (canvasData가 있는 메시지만)
  async getAnalysisHistory() {
    const history = [];

    // conversationHistory에서 canvasData가 있는 항목 필터링
    this.conversationHistory.forEach((msg, idx) => {
      if (msg.canvasData && msg.sender === 'bot') {
        history.push({
          index: idx,
          imageUrl: msg.canvasData.imageUrl || null,
          title: msg.canvasData.type === 'analysis' ? '이미지 분석' : '맞춤 레시피',
          length: msg.canvasData.analysis?.lengthName || msg.canvasData.params?.length_category || '',
          form: msg.canvasData.analysis?.form || msg.canvasData.params?.cut_form || '',
          timestamp: msg.timestamp,
          canvasData: msg.canvasData
        });
      }
    });

    return history.reverse(); // 최신순
  }

  // 히스토리 상세 보기
  showHistoryDetail(idx) {
    const history = [];
    this.conversationHistory.forEach((msg, i) => {
      if (msg.canvasData && msg.sender === 'bot') {
        history.push({ ...msg, originalIndex: i });
      }
    });

    const reversedHistory = history.reverse();
    const item = reversedHistory[idx];

    if (item && item.canvasData) {
      // 결과 탭으로 전환하고 해당 결과 표시
      document.querySelectorAll('.canvas-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.canvas-tab[data-tab="result"]')?.classList.add('active');

      if (item.canvasData.type === 'analysis') {
        this.showCanvas(item.canvasData);
      } else if (item.canvasData.customRecipe) {
        // 맞춤 레시피 결과
        this.showCustomRecipeCanvas(item.canvasData, item.canvasData.uploadedImageUrl || '');
      } else {
        this.showCanvas(item.canvasData);
      }
    }
  }

  // 히스토리 항목 삭제
  async deleteHistoryItem(idx) {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;

    const history = [];
    this.conversationHistory.forEach((msg, i) => {
      if (msg.canvasData && msg.sender === 'bot') {
        history.push({ ...msg, originalIndex: i });
      }
    });

    const reversedHistory = history.reverse();
    const item = reversedHistory[idx];

    if (item && item.id) {
      try {
        // Firebase에서 삭제
        await window.db
          .collection('chatHistory')
          .doc(this.currentUserId)
          .collection('messages')
          .doc(item.id)
          .delete();

        // 로컬에서도 삭제
        this.conversationHistory = this.conversationHistory.filter(m => m.id !== item.id);

        // UI 새로고침
        this.loadHistoryToCanvas();

      } catch (e) {
        console.error('❌ 삭제 실패:', e);
        alert('삭제에 실패했습니다.');
      }
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

      this.addMessageToUI(msg.sender, msg.content, false);
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

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // Call API
      const response = await this.callAPI(text);

      // Remove typing indicator
      this.hideTypingIndicator();

      // Add bot response
      this.addMessageToUI('bot', response.content, true, response.canvasData);

      // Save bot response
      this.conversationHistory.push({
        sender: 'bot',
        content: response.content,
        timestamp: Date.now(),
        canvasData: response.canvasData
      });
      this.saveMessageToFirebase('bot', response.content, response.canvasData);

      // If canvas data exists, show canvas
      if (response.canvasData) {
        this.showCanvas(response.canvasData);
      }

    } catch (error) {
      this.hideTypingIndicator();
      this.addMessageToUI('bot', '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.');
      console.error('❌ API Error:', error);
    }
  }

  async callAPI(query) {
    console.log('📤 API 호출:', query);

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_response_stream',
        payload: {
          user_query: query,
          language: this.currentLanguage
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
    const lines = responseText.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const data = JSON.parse(jsonStr);
          if (data.type === 'content' && data.content) {
            fullContent += data.content;
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
      canvasData: hasRecipeData ? this.parseRecipeData(fullContent) : null
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
    if (canvasData.type === 'recipe') {
      this.canvasResult.innerHTML = this.generateRecipeCard(canvasData);
    } else if (canvasData.type === 'analysis') {
      this.canvasResult.innerHTML = this.generateAnalysisCard(canvasData);
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

  // ==================== Image Upload ====================

  async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    // Show user message with image preview
    const imageUrl = URL.createObjectURL(file);
    this.addMessageToUI('user', `<img src="${imageUrl}" style="max-width: 200px; border-radius: 8px;" alt="업로드된 이미지">`);

    // Convert to base64
    const base64 = await this.fileToBase64(file);

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
    alert('저장 기능은 준비 중입니다.');
  }

  shareResult() {
    if (navigator.share) {
      navigator.share({
        title: 'HAIRGATOR AI 분석 결과',
        text: '헤어스타일 분석 결과를 확인해보세요!',
        url: window.location.href
      });
    } else {
      alert('공유 기능을 지원하지 않는 브라우저입니다.');
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
            <div class="style-card" onclick="window.aiStudio.showStyleDetail('${style.styleId}')">
              <div class="style-rank">${idx + 1}</div>
              <div class="style-info">
                <h3>${style.styleId}</h3>
                <span class="series-badge">${style.seriesName || style.series}</span>
                <div class="similarity-bar">
                  <div class="similarity-fill" style="width: ${(style.similarity * 100).toFixed(0)}%"></div>
                  <span class="similarity-text">${(style.similarity * 100).toFixed(1)}%</span>
                </div>
              </div>
              ${style.resultImage ? `
                <img src="${style.resultImage}" class="style-thumb" alt="${style.styleId}">
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

  // 스타일 상세 보기
  async showStyleDetail(styleId) {
    console.log(`📋 스타일 상세: ${styleId}`);
    // TODO: 스타일 상세 모달 또는 페이지로 이동
    alert(`스타일 ${styleId} 상세 보기 기능 준비 중`);
  }

  // ==================== 맞춤 레시피 캔버스 표시 ====================

  showCustomRecipeCanvas(data, uploadedImageUrl) {
    this.canvasEmpty.classList.add('hidden');
    this.canvasResult.classList.remove('hidden');

    const { analysis, targetSeries, referenceStyles, customRecipe, mainDiagrams, params56 } = data;

    // 42포뮬러 핵심 파라미터 추출
    const liftingStr = Array.isArray(analysis.liftingRange) ? analysis.liftingRange.join(', ') : (analysis.liftingRange || 'L4');

    this.canvasResult.innerHTML = `
      <div class="custom-recipe-canvas">
        <!-- 헤더: 업로드 이미지 + 분석 결과 (컴팩트) -->
        <div class="recipe-header compact">
          <div class="uploaded-image-section">
            <img src="${uploadedImageUrl}" alt="업로드한 이미지" class="uploaded-image">
            <div class="analysis-badge">${analysis.lengthName}</div>
          </div>
          <div class="analysis-summary">
            <h2>🎯 맞춤 레시피</h2>
            <div class="analysis-tags">
              <span class="tag primary">${analysis.form}</span>
              <span class="tag">${liftingStr}</span>
              <span class="tag">${analysis.sectionPrimary || 'Diagonal-Backward'}</span>
            </div>
          </div>
        </div>

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

        <!-- 도해도 뷰어 (스크린샷 참고 UI) -->
        <div class="diagrams-section large">
          <h3>📐 기술 매칭 도해도 (${mainDiagrams.length}장)</h3>
          ${this.generateDiagramViewer(mainDiagrams)}
        </div>

        <!-- 생성된 맞춤 레시피 -->
        <div class="custom-recipe-section">
          <h3>✨ AI 생성 맞춤 레시피</h3>
          <div class="recipe-content">
            ${this.formatRecipeContent(customRecipe)}
          </div>
        </div>
      </div>
    `;

    // Mobile: Show canvas panel
    if (window.innerWidth <= 1024) {
      this.canvasPanel.classList.add('active');
    }

    // 도해도 뷰어 초기화
    this.initDiagramViewer(mainDiagrams);
  }

  // ==================== 도해도 뷰어 ====================

  // 도해도 뷰어 HTML 생성
  generateDiagramViewer(diagrams) {
    if (!diagrams || diagrams.length === 0) {
      return '<p style="color: #999; text-align: center;">도해도가 없습니다.</p>';
    }

    const firstDiagram = diagrams[0];
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
          <img src="${firstDiagram.url}" alt="Step ${firstDiagram.step}" id="diagram-main-image">
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
        </div>

        <!-- 썸네일 스트립 -->
        <div class="diagram-thumbnails-strip" id="diagram-thumbnails">
          ${diagrams.map((d, idx) => `
            <div class="diagram-thumb-item ${idx === 0 ? 'active' : ''}"
                 onclick="window.aiStudio.selectDiagram(${idx})"
                 data-index="${idx}">
              <img src="${d.url}" alt="Step ${d.step}">
              <span class="thumb-step">${d.step || idx + 1}</span>
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

    // 초기 버튼 상태 설정
    this.updateNavButtons();
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

    // 메인 이미지 업데이트
    const mainImage = document.getElementById('diagram-main-image');
    if (mainImage) mainImage.src = diagram.url;

    // Step indicator 업데이트
    const stepIndicator = document.getElementById('diagram-step-indicator');
    if (stepIndicator) stepIndicator.textContent = `Step ${index + 1} / ${this.currentDiagrams.length}`;

    // 썸네일 active 상태 업데이트
    document.querySelectorAll('.diagram-thumb-item').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });

    // 선택된 썸네일이 보이도록 스크롤
    const thumbnailsContainer = document.getElementById('diagram-thumbnails');
    const activeThumb = thumbnailsContainer?.querySelector('.diagram-thumb-item.active');
    if (activeThumb && thumbnailsContainer) {
      activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
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

  // 자동 재생 토글
  toggleAutoPlay() {
    const playBtn = document.getElementById('diagram-play-btn');

    if (this.autoPlayInterval) {
      // 정지
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
      if (playBtn) {
        playBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        `;
      }
    } else {
      // 재생
      if (playBtn) {
        playBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        `;
      }
      this.autoPlayInterval = setInterval(() => {
        if (this.currentDiagramIndex < this.currentDiagrams.length - 1) {
          this.nextDiagram();
        } else {
          // 끝에 도달하면 처음으로
          this.selectDiagram(0);
        }
      }, 3000); // 3초마다 전환
    }
  }

  // 레시피 내용 포맷팅 (세련된 HTML로 변환)
  formatRecipeContent(content) {
    if (!content) return '<p class="recipe-empty">레시피를 불러올 수 없습니다.</p>';

    let formatted = content;

    // 마크다운 헤더 제거 및 변환 (##, ###, ####)
    formatted = formatted
      .replace(/^####\s*(.+)$/gm, '<h5 class="recipe-h5">$1</h5>')
      .replace(/^###\s*(.+)$/gm, '<h4 class="recipe-h4">$1</h4>')
      .replace(/^##\s*(.+)$/gm, '<h3 class="recipe-h3">$1</h3>')
      .replace(/^#\s*(.+)$/gm, '<h2 class="recipe-h2">$1</h2>');

    // 굵은 글씨 **text**
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // 기울임 *text*
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 번호 리스트 (1. 2. 3.)
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered-item"><span class="num">$1</span>$2</li>');

    // 불릿 리스트 (- item)
    formatted = formatted.replace(/^-\s+(.+)$/gm, '<li class="bullet-item">$1</li>');

    // 연속된 li들을 ul로 감싸기
    formatted = formatted.replace(/(<li class="numbered-item">[\s\S]*?<\/li>)(\n?<li class="numbered-item">)/g, '$1$2');
    formatted = formatted.replace(/(<li class="bullet-item">[\s\S]*?<\/li>)(\n?<li class="bullet-item">)/g, '$1$2');

    // 리스트 그룹화
    let inList = false;
    const lines = formatted.split('\n');
    const result = [];

    for (let line of lines) {
      const trimmed = line.trim();
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
        if (trimmed && !trimmed.startsWith('<h')) {
          result.push(`<p class="recipe-para">${trimmed}</p>`);
        } else {
          result.push(trimmed);
        }
      }
    }
    if (inList) result.push('</ul>');

    // 빈 p 태그 제거
    formatted = result.join('\n')
      .replace(/<p class="recipe-para"><\/p>/g, '')
      .replace(/<p class="recipe-para">\s*<\/p>/g, '');

    return `<div class="recipe-formatted">${formatted}</div>`;
  }
}

// ==================== Global Functions ====================

function goBack() {
  if (document.referrer && document.referrer.includes(window.location.hostname)) {
    history.back();
  } else {
    window.location.href = 'index.html';
  }
}

function clearChat() {
  if (confirm('대화 내용을 모두 삭제하시겠습니까?')) {
    window.aiStudio.conversationHistory = [];
    const messages = document.getElementById('chat-messages');
    messages.innerHTML = `
      <div class="message bot">
        <div class="message-avatar bot-logo"><img src="icons/icon-72.png" alt="H"></div>
        <div class="message-content">
          <p><strong>대화가 초기화되었습니다.</strong></p>
          <p>새로운 질문을 입력해주세요.</p>
        </div>
      </div>
    `;

    // Clear Firebase
    if (window.aiStudio.currentUserId && window.db) {
      window.aiStudio.clearFirebaseHistory();
    }
  }
}

// ==================== 이미지 업로드 함수들 ====================

// 대기 중인 이미지 저장
let pendingImageData = null;

// 선택된 성별 저장
let selectedGender = null;

// 성별 선택 함수
function selectGender(gender) {
  selectedGender = gender;

  // 버튼 UI 업데이트
  const femaleBtn = document.getElementById('gender-female');
  const maleBtn = document.getElementById('gender-male');

  femaleBtn.classList.remove('selected');
  maleBtn.classList.remove('selected');

  if (gender === 'female') {
    femaleBtn.classList.add('selected');
  } else if (gender === 'male') {
    maleBtn.classList.add('selected');
  }

  console.log(`🎯 성별 선택: ${gender}`);
}

function triggerImageUpload() {
  document.getElementById('image-upload').click();
}

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 유효성 검사
  if (!file.type.startsWith('image/')) {
    alert('이미지 파일만 업로드 가능합니다.');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('이미지 크기는 10MB 이하여야 합니다.');
    return;
  }

  // 미리보기 표시
  const imageUrl = URL.createObjectURL(file);
  const previewArea = document.getElementById('image-preview-area');
  const previewImage = document.getElementById('preview-image');

  previewImage.src = imageUrl;
  previewArea.style.display = 'block';

  // 파일 데이터 저장
  pendingImageData = {
    file: file,
    url: imageUrl
  };

  console.log('📷 이미지 선택됨:', file.name);
  console.log('📷 pendingImageData 설정됨:', pendingImageData);

  // 파일 입력 초기화
  event.target.value = '';
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

  // 성별 선택 초기화
  selectedGender = null;
  document.getElementById('gender-female').classList.remove('selected');
  document.getElementById('gender-male').classList.remove('selected');

  console.log('🗑️ 이미지 제거됨');
}

async function sendImageWithQuestion() {
  if (!pendingImageData) return false;

  // 성별 선택 검증
  if (!selectedGender) {
    alert('성별을 선택해주세요.');
    return false;
  }

  const textInput = document.getElementById('chat-input');
  const question = textInput.value.trim() || '이 헤어스타일에 맞는 레시피를 만들어주세요';

  // 성별 표시 텍스트
  const genderText = selectedGender === 'male' ? '👨 남자' : '👩 여자';

  // 사용자 메시지 표시 (이미지 + 성별 + 텍스트)
  window.aiStudio.addMessageToUI('user', `
    <img src="${pendingImageData.url}" style="max-width: 200px; border-radius: 8px; margin-bottom: 8px;" alt="업로드된 이미지">
    <p><strong>${genderText}</strong></p>
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

    console.log(`📤 맞춤 레시피 생성 API 호출... (성별: ${selectedGender})`);

    // API 호출 - 이미지 분석 + 맞춤 레시피 생성 (성별 포함)
    const response = await fetch(window.aiStudio.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze_and_match_recipe',
        payload: {
          image_base64: base64,
          mime_type: pendingImageData.file.type,
          gender: selectedGender
        }
      })
    });

    const result = await response.json();
    console.log('📥 API 응답:', result);

    window.aiStudio.hideTypingIndicator();

    if (result.success && result.data) {
      const data = result.data;
      let analysisMsg;

      // 남자/여자에 따라 분석 결과 메시지 분기
      if (data.gender === 'male') {
        // 남자 스타일 분석 결과
        analysisMsg = `**👨 남자 스타일 분석 완료!**

💇 **스타일**: ${data.analysis.styleName} (${data.analysis.styleCode})
📏 **탑 길이**: ${data.analysis.topLength}
📐 **사이드 길이**: ${data.analysis.sideLength}
✂️ **페이드**: ${data.analysis.fadeType}
🎨 **텍스처**: ${data.analysis.texture}
💆 **스타일링 제품**: ${data.analysis.productType}

📁 **대상 시리즈**: ${data.targetSeries.code} - ${data.targetSeries.name} (${data.targetSeries.totalStyles}개 스타일)

🎯 **참고 스타일 Top-3**:
${data.referenceStyles.map((s, i) => `  ${i+1}. ${s.styleId} (유사도: ${(s.similarity * 100).toFixed(1)}%)`).join('\n')}

👉 **오른쪽 캔버스에서 맞춤 레시피를 확인하세요!**`;
      } else {
        // 여자 스타일 분석 결과 (기존 로직)
        analysisMsg = `**👩 여자 스타일 분석 완료!**

📏 **기장**: ${data.analysis.lengthName}
✂️ **형태**: ${data.analysis.form}
💇 **앞머리**: ${data.analysis.hasBangs ? data.analysis.bangsType : '없음'}
📐 **볼륨**: ${data.analysis.volumePosition}
🎨 **텍스처**: ${data.analysis.texture}

📁 **대상 시리즈**: ${data.targetSeries.code} (${data.targetSeries.totalStyles}개 스타일)

🎯 **참고 스타일 Top-3**:
${data.referenceStyles.map((s, i) => `  ${i+1}. ${s.styleId} - ${s.featureReasons ? s.featureReasons.join(', ') : `유사도 ${(s.similarity * 100).toFixed(1)}%`}`).join('\n')}

👉 **오른쪽 캔버스에서 맞춤 레시피를 확인하세요!**`;
      }

      window.aiStudio.addMessageToUI('bot', analysisMsg);

      // 캔버스에 맞춤 레시피 표시
      window.aiStudio.showCustomRecipeCanvas(data, pendingImageData.url);

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
  console.log('🔍 sendMessage 호출됨, pendingImageData:', pendingImageData);

  // 이미지가 있으면 이미지와 함께 전송
  if (pendingImageData && pendingImageData.file) {
    console.log('📷 이미지와 함께 전송 시작');
    await sendImageWithQuestion();
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
      // 결과 메시지 표시
      const resultMsg = `✅ **${searchData.results.length}개의 유사 스타일을 찾았습니다!**\n\n` +
        searchData.results.map((s, i) =>
          `${i + 1}. **${s.styleId}** (${s.seriesName}) - 유사도 ${(s.similarity * 100).toFixed(1)}%`
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
});
