// js/payment.js
// 포트원 V2 결제 연동

const HAIRGATOR_PAYMENT = {
  // 포트원 설정
  storeId: 'store-69fa8bc3-f410-433a-a8f2-f5d922f94dcb',
  channelKey: 'channel-key-da1e7007-39b9-4afa-8c40-0f158d323af1',
  // 본인인증용 다날 채널 키
  identityChannelKey: 'channel-key-48488a5d-8ae1-416d-b570-f91cab03398f',

  // 요금제 정보
  plans: {
    basic: {
      name: '베이직',
      nameEn: 'Basic',
      price: 22000,
      tokens: 10000,
      productId: 'hairgator_basic'
    },
    pro: {
      name: '프로',
      nameEn: 'Pro',
      price: 38000,
      tokens: 18000,
      productId: 'hairgator_pro'
    },
    business: {
      name: '비즈니스',
      nameEn: 'Business',
      price: 50000,
      tokens: 25000,
      productId: 'hairgator_business'
    },
    tokens_5000: {
      name: '추가 토큰 5,000',
      nameEn: 'Extra 5,000 Tokens',
      price: 5000,
      tokens: 5000,
      productId: 'hairgator_tokens_5000'
    }
  },

  /**
   * 결제 요청
   * @param {string} planKey - 요금제 키 (basic, pro, business, tokens_5000)
   * @param {string} userId - 사용자 ID
   * @param {string} userEmail - 사용자 이메일 (선택)
   * @param {string} userName - 사용자 이름 (선택)
   */
  async requestPayment(planKey, userId, userEmail = '', userName = '') {
    const plan = this.plans[planKey];
    if (!plan) {
      throw new Error('유효하지 않은 요금제입니다.');
    }

    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    // 고유 주문번호 생성
    const paymentId = `HG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('💳 결제 요청 시작:', { planKey, plan, paymentId, userId });

    // 리다이렉션 모드를 위해 결제 정보 저장
    sessionStorage.setItem('pending_payment', JSON.stringify({
      paymentId,
      planKey,
      userId,
      userName,
      tokens: plan.tokens
    }));

    try {
      // 포트원 V2 결제 요청
      const response = await PortOne.requestPayment({
        storeId: this.storeId,
        channelKey: this.channelKey,
        paymentId: paymentId,
        orderName: `HAIRGATOR ${plan.name}`,
        totalAmount: plan.price,
        currency: 'KRW',
        payMethod: 'CARD',
        windowType: { pc: 'POPUP', mobile: 'REDIRECTION' },  // PC는 팝업, 모바일은 리다이렉션
        customer: {
          customerId: userId,
          email: userEmail || undefined,
          fullName: userName || undefined
        },
        customData: {
          planKey: planKey,
          tokens: plan.tokens,
          userId: userId
        },
        redirectUrl: window.location.origin + '/payment-complete.html'
      });

      console.log('💳 포트원 응답:', response);

      // 결제 실패 처리
      if (response.code) {
        // 사용자가 취소한 경우
        if (response.code === 'FAILURE_TYPE_PG' && response.message?.includes('취소')) {
          console.log('💳 사용자가 결제를 취소했습니다.');
          return { success: false, cancelled: true, message: '결제가 취소되었습니다.' };
        }
        throw new Error(response.message || '결제에 실패했습니다.');
      }

      // 결제 성공 - 서버에서 검증 및 토큰 충전
      const verifyResult = await this.verifyAndChargeTokens(paymentId, planKey, userId, userName);

      return {
        success: true,
        paymentId: paymentId,
        tokens: plan.tokens,
        ...verifyResult
      };

    } catch (error) {
      console.error('💳 결제 오류:', error);
      throw error;
    }
  },

  /**
   * 결제 검증 및 토큰 충전 (서버 호출)
   */
  async verifyAndChargeTokens(paymentId, planKey, userId, userName = '') {
    const response = await fetch('/.netlify/functions/payment-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: paymentId,
        planKey: planKey,
        userId: userId,
        userName: userName
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || '결제 검증에 실패했습니다.');
    }

    return result;
  },

  /**
   * 현재 로그인한 사용자 ID 가져오기
   */
  getUserId() {
    // 1. URL 파라미터에서 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    if (urlUserId) return urlUserId;

    // 2. window.currentDesigner에서 가져오기 (Firebase 기반)
    if (window.currentDesigner?.id) return window.currentDesigner.id;

    // 3. localStorage의 firebase_user에서 가져오기
    try {
      const firebaseUser = localStorage.getItem('firebase_user');
      if (firebaseUser) {
        const parsed = JSON.parse(firebaseUser);
        if (parsed.id) return parsed.id;
      }
    } catch (_e) {}

    return null;
  },

  /**
   * 결제 모달에서 플랜 선택 시 호출
   */
  async purchasePlan(planKey) {
    // 현재 로그인한 사용자 정보 가져오기
    const userId = this.getUserId();

    // 사용자 이름/이메일 가져오기 (Firebase 기반)
    let userEmail = window.currentDesigner?.email || '';
    let userName = window.currentDesigner?.name || window.currentDesigner?.displayName || '';

    // fallback: localStorage
    if (!userEmail || !userName) {
      try {
        const firebaseUser = localStorage.getItem('firebase_user');
        if (firebaseUser) {
          const parsed = JSON.parse(firebaseUser);
          userEmail = userEmail || parsed.email || '';
          userName = userName || parsed.name || parsed.displayName || '';
        }
      } catch (_e) {}
    }

    console.log('💳 결제 시도 - userId:', userId);

    if (!userId) {
      alert(t('payment.loginRequired') || '로그인이 필요합니다.');
      return;
    }

    try {
      // ⚠️ 결제 팝업 열기 전에는 로딩 표시하지 않음 (팝업을 가리기 때문)
      // 요금제 모달 닫기 (결제 팝업과 겹치지 않도록)
      closePricingModal();

      const result = await this.requestPayment(planKey, userId, userEmail, userName);

      if (result.cancelled) {
        // 사용자 취소 - 모달 다시 열기
        openPricingModal();
        return;
      }

      if (result.success) {
        // 성공 메시지
        const plan = this.plans[planKey];
        alert(`${plan.tokens.toLocaleString()} 토큰이 충전되었습니다!`);

        // 토큰 표시 업데이트 (bullnabi-bridge.js의 함수 호출)
        if (window.BullnabiBridge && typeof window.BullnabiBridge.updateTokenDisplay === 'function') {
          window.BullnabiBridge.updateTokenDisplay(result.newBalance, result.plan || planKey);
        }
      }

    } catch (error) {
      console.error('💳 구매 실패:', error);
      alert(error.message || '결제 처리 중 오류가 발생했습니다.');
      // 실패 시 모달 다시 열기
      openPricingModal();
    }
  },

  /**
   * 추가 토큰 구매
   */
  async purchaseExtraTokens() {
    return this.purchasePlan('tokens_5000');
  }
};

/**
 * 결제 로딩 표시
 */
function showPaymentLoading(show) {
  let loader = document.getElementById('payment-loading');

  if (show) {
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'payment-loading';
      loader.innerHTML = `
        <div class="payment-loading-overlay">
          <div class="payment-loading-spinner"></div>
          <p>결제 처리 중...</p>
        </div>
      `;
      loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
      `;
      loader.querySelector('.payment-loading-overlay').style.cssText = `
        text-align: center;
        color: white;
      `;
      loader.querySelector('.payment-loading-spinner').style.cssText = `
        width: 50px;
        height: 50px;
        border: 3px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
      `;

      // 스핀 애니메이션 추가
      if (!document.getElementById('payment-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'payment-spinner-style';
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }

      document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
  } else {
    if (loader) {
      loader.style.display = 'none';
    }
  }
}

/**
 * 결제 모달 닫기
 */
function closePricingModal() {
  const modal = document.getElementById('pricingModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * 요금제 선택 (모달에서 호출)
 * HTML 버튼: onclick="selectPlan('basic')" 등
 *
 * 2025-12-24: 결제는 불나비 앱 상품 탭에서만 가능하도록 변경
 * 선택 시 토스트 메시지 표시 후 모달 닫기
 */
function selectPlan(planType) {
  console.log('💳 플랜 선택:', planType, '→ 상품 탭 결제 안내');

  // 모달 닫기
  closePricingModal();

  // 다국어 토스트 메시지 표시
  const message = t('payment.payAtProductTab') || '상품 탭에서 결제해 주세요';

  // showToast 함수가 있으면 사용, 없으면 alert
  if (typeof showToast === 'function') {
    showToast(message, 'info');
  } else {
    alert(message);
  }
}

// ========== 본인인증 기능 ==========

/**
 * 본인인증 완료 여부 확인
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object|null>} 인증 정보 (verifiedName, verifiedPhone) 또는 null
 */
async function checkIdentityVerification(userId) {
  if (!userId) return null;

  try {
    const userDoc = await firebase.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (userDoc.exists) {
      const data = userDoc.data();
      if (data.identityVerified && data.verifiedName && data.verifiedPhone) {
        return {
          verified: true,
          name: data.verifiedName,
          phone: data.verifiedPhone,
          verifiedAt: data.identityVerifiedAt
        };
      }
    }
    return null;
  } catch (error) {
    console.error('본인인증 확인 오류:', error);
    return null;
  }
}

/**
 * 본인인증 요청
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 인증 결과
 */
async function requestIdentityVerification(userId) {
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  console.log('🔐 본인인증 시작:', userId);

  try {
    // 고유 인증 ID 생성
    const identityVerificationId = `HG_ID_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 포트원 본인인증 요청 (다날 본인인증 채널 사용)
    const response = await PortOne.requestIdentityVerification({
      storeId: HAIRGATOR_PAYMENT.storeId,
      identityVerificationId: identityVerificationId,
      channelKey: HAIRGATOR_PAYMENT.identityChannelKey,
      windowType: { pc: 'POPUP', mobile: 'REDIRECTION' },
      redirectUrl: window.location.origin + '/identity-complete.html'
    });

    console.log('🔐 본인인증 응답:', response);

    // 에러 처리
    if (response.code) {
      if (response.code === 'USER_CANCEL') {
        return { success: false, cancelled: true, message: '본인인증이 취소되었습니다.' };
      }
      throw new Error(response.message || '본인인증에 실패했습니다.');
    }

    // 서버에서 본인인증 결과 검증 및 저장
    const verifyResponse = await fetch('/.netlify/functions/identity-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identityVerificationId: identityVerificationId,
        userId: userId
      })
    });

    const verifyResult = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyResult.success) {
      throw new Error(verifyResult.error || '본인인증 검증에 실패했습니다.');
    }

    console.log('✅ 본인인증 완료:', verifyResult);

    return {
      success: true,
      name: verifyResult.name,
      phone: verifyResult.phone
    };

  } catch (error) {
    console.error('본인인증 오류:', error);
    throw error;
  }
}

/**
 * 본인인증 필수 확인 후 결제 진행
 * @param {string} planKey - 요금제 키
 */
async function verifyAndPay(planKey) {
  const userId = HAIRGATOR_PAYMENT.getUserId();
  if (!userId) {
    alert('로그인이 필요합니다.');
    return;
  }

  // 본인인증 활성화 (다날 채널 사용)
  const SKIP_IDENTITY_VERIFICATION = false;

  if (SKIP_IDENTITY_VERIFICATION) {
    // 테스트 모드 - 바로 결제 진행
    await showPaymentOptions(planKey);
    return;
  }

  // 본인인증 여부 확인
  const verification = await checkIdentityVerification(userId);

  if (!verification) {
    // 본인인증 필요
    const confirmed = confirm('결제를 진행하려면 본인인증이 필요합니다.\n본인인증을 진행하시겠습니까?');
    if (!confirmed) return;

    try {
      const result = await requestIdentityVerification(userId);

      if (result.cancelled) {
        return;
      }

      if (result.success) {
        alert(`본인인증이 완료되었습니다!\n${result.name}님, 결제를 진행합니다.`);
        // 본인인증 완료 후 결제 진행
        await showPaymentOptions(planKey);
      }
    } catch (error) {
      alert(error.message || '본인인증에 실패했습니다.');
      return;
    }
  } else {
    // 이미 본인인증 완료 - 바로 결제
    await showPaymentOptions(planKey);
  }
}

// ========== 빌링키 (카드 저장) 기능 ==========

/**
 * 저장된 카드 목록 조회
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Array>} 저장된 카드 목록
 */
async function getSavedCards(userId) {
  if (!userId) return [];

  try {
    const snapshot = await firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('billing_keys')
      .where('status', '==', 'ACTIVE')
      .get();

    const cards = [];
    snapshot.forEach(doc => {
      cards.push({
        billingKey: doc.id,
        ...doc.data()
      });
    });

    console.log('💳 저장된 카드 목록:', cards.length);
    return cards;
  } catch (error) {
    console.error('저장된 카드 조회 오류:', error);
    return [];
  }
}

/**
 * 기본 카드 가져오기
 * @param {string} userId - 사용자 ID
 * @returns {Promise<string|null>} 기본 빌링키
 */
async function getDefaultCard(userId) {
  if (!userId) return null;

  try {
    const userDoc = await firebase.firestore()
      .collection('users')
      .doc(userId)
      .get();

    return userDoc.exists ? userDoc.data().defaultBillingKey : null;
  } catch (error) {
    console.error('기본 카드 조회 오류:', error);
    return null;
  }
}

/**
 * 빌링키 발급 (카드 등록)
 * @param {string} userId - 사용자 ID
 * @param {string} userEmail - 사용자 이메일
 * @param {string} userName - 사용자 이름
 * @returns {Promise<Object>} 발급 결과
 */
async function issueBillingKey(userId, userEmail = '', userName = '') {
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  console.log('💳 빌링키 발급 시작:', userId);

  try {
    // 고유 발급 ID 생성
    const issueId = `HG_BK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 포트원 빌링키 발급 요청
    const response = await PortOne.requestIssueBillingKey({
      storeId: HAIRGATOR_PAYMENT.storeId,
      channelKey: HAIRGATOR_PAYMENT.channelKey,
      billingKeyMethod: 'CARD',
      issueName: 'HAIRGATOR 카드 등록',  // 필수 파라미터
      issueId: issueId,  // 나이스페이 V2 필수: 주문번호
      customer: {
        customerId: userId,
        email: userEmail || undefined,
        fullName: userName || undefined
      }
    });

    console.log('💳 빌링키 발급 응답:', response);

    // 에러 처리
    if (response.code) {
      if (response.code === 'USER_CANCEL') {
        return { success: false, cancelled: true, message: '카드 등록이 취소되었습니다.' };
      }
      throw new Error(response.message || '카드 등록에 실패했습니다.');
    }

    const billingKey = response.billingKey;
    if (!billingKey) {
      throw new Error('빌링키를 받지 못했습니다.');
    }

    // 서버에 빌링키 저장
    const saveResponse = await fetch('/.netlify/functions/billing-key-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billingKey: billingKey,
        userId: userId
      })
    });

    const saveResult = await saveResponse.json();

    if (!saveResponse.ok || !saveResult.success) {
      throw new Error(saveResult.error || '카드 저장에 실패했습니다.');
    }

    console.log('✅ 카드 등록 완료:', saveResult.card);

    return {
      success: true,
      billingKey: billingKey,
      card: saveResult.card
    };

  } catch (error) {
    console.error('빌링키 발급 오류:', error);
    throw error;
  }
}

/**
 * 저장된 카드로 결제
 * @param {string} billingKey - 빌링키
 * @param {string} planKey - 요금제 키
 * @param {string} userId - 사용자 ID
 * @param {string} userName - 사용자 이름
 * @returns {Promise<Object>} 결제 결과
 */
async function payWithBillingKey(billingKey, planKey, userId, userName = '') {
  console.log('💳 빌링키 결제 시작:', { planKey, userId });

  try {
    const response = await fetch('/.netlify/functions/billing-key-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billingKey: billingKey,
        planKey: planKey,
        userId: userId,
        userName: userName
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || '결제에 실패했습니다.');
    }

    console.log('✅ 빌링키 결제 완료:', result);

    return {
      success: true,
      paymentId: result.paymentId,
      tokens: result.tokens,
      newBalance: result.newBalance,
      plan: result.plan
    };

  } catch (error) {
    console.error('빌링키 결제 오류:', error);
    throw error;
  }
}

/**
 * 저장된 카드 삭제
 * @param {string} billingKey - 빌링키
 * @param {string} userId - 사용자 ID
 * @returns {Promise<Object>} 삭제 결과
 */
async function deleteSavedCard(billingKey, userId) {
  console.log('💳 카드 삭제:', billingKey.substring(0, 20) + '...');

  try {
    const response = await fetch('/.netlify/functions/billing-key-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billingKey: billingKey,
        userId: userId
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || '카드 삭제에 실패했습니다.');
    }

    console.log('✅ 카드 삭제 완료');

    return { success: true };

  } catch (error) {
    console.error('카드 삭제 오류:', error);
    throw error;
  }
}

/**
 * 결제 옵션 표시 (저장된 카드가 있으면 선택 UI)
 * 상품 페이지에서 호출
 */
async function showPaymentOptions(planKey) {
  const userId = HAIRGATOR_PAYMENT.getUserId();
  if (!userId) {
    alert('로그인이 필요합니다.');
    return;
  }

  const plan = HAIRGATOR_PAYMENT.plans[planKey];
  if (!plan) {
    alert('유효하지 않은 요금제입니다.');
    return;
  }

  // 저장된 카드 조회
  const savedCards = await getSavedCards(userId);
  const defaultBillingKey = await getDefaultCard(userId);

  // 저장된 카드가 없으면 바로 일반 결제
  if (savedCards.length === 0) {
    await processPaymentWithNewCard(planKey, userId);
    return;
  }

  // 저장된 카드가 있으면 선택 모달 표시
  showCardSelectionModal(savedCards, defaultBillingKey, planKey, userId);
}

/**
 * 카드 선택 모달 표시
 */
function showCardSelectionModal(cards, defaultBillingKey, planKey, userId) {
  const plan = HAIRGATOR_PAYMENT.plans[planKey];

  // 기존 모달 제거
  const existingModal = document.getElementById('cardSelectionModal');
  if (existingModal) existingModal.remove();

  // 카드 목록 HTML 생성
  const cardListHtml = cards.map(card => {
    const isDefault = card.billingKey === defaultBillingKey;
    return `
      <div class="saved-card-item ${isDefault ? 'default' : ''}"
           onclick="selectSavedCard('${card.billingKey}', '${planKey}')"
           data-billing-key="${card.billingKey}">
        <div class="card-icon">💳</div>
        <div class="card-info">
          <div class="card-name">${card.displayName || card.cardBrand + ' ****' + card.lastFour}</div>
          ${isDefault ? '<span class="default-badge">기본</span>' : ''}
        </div>
        <div class="card-check">○</div>
      </div>
    `;
  }).join('');

  const modalHtml = `
    <div class="card-selection-overlay" id="cardSelectionModal">
      <div class="card-selection-modal">
        <div class="modal-header">
          <h3>결제 수단 선택</h3>
          <button class="modal-close" onclick="closeCardSelectionModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="plan-summary">
            <span class="plan-name">${plan.name}</span>
            <span class="plan-price">₩${plan.price.toLocaleString()}</span>
          </div>

          <div class="section-title">저장된 카드</div>
          <div class="saved-cards-list">
            ${cardListHtml}
          </div>

          <div class="divider">또는</div>

          <button class="new-card-btn" onclick="processPaymentWithNewCard('${planKey}', '${userId}', true)">
            + 새 카드로 결제
          </button>

          <label class="save-card-checkbox">
            <input type="checkbox" id="saveNewCard" checked>
            <span>다음 결제를 위해 카드 정보 저장</span>
          </label>

          <button class="confirm-payment-btn" id="confirmPaymentBtn" disabled onclick="confirmSavedCardPayment('${planKey}')">
            결제하기
          </button>
        </div>
      </div>
    </div>
  `;

  // 스타일 추가
  if (!document.getElementById('cardSelectionStyles')) {
    const styles = document.createElement('style');
    styles.id = 'cardSelectionStyles';
    styles.textContent = `
      .card-selection-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
      }
      .card-selection-modal {
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 400px;
        max-height: 80vh;
        overflow-y: auto;
      }
      .card-selection-modal .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #eee;
      }
      .card-selection-modal .modal-header h3 {
        margin: 0;
        font-size: 18px;
        color: #333;
      }
      .card-selection-modal .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #999;
        cursor: pointer;
      }
      .card-selection-modal .modal-body {
        padding: 20px;
      }
      .plan-summary {
        display: flex;
        justify-content: space-between;
        padding: 12px 16px;
        background: #f8f8f8;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      .plan-name { font-weight: 600; color: #333; }
      .plan-price { font-weight: 700; color: #E91E63; }
      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: #666;
        margin-bottom: 12px;
      }
      .saved-card-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        border: 2px solid #eee;
        border-radius: 10px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .saved-card-item:hover {
        border-color: #E91E63;
        background: #fef5f8;
      }
      .saved-card-item.selected {
        border-color: #E91E63;
        background: #fef5f8;
      }
      .saved-card-item.selected .card-check {
        color: #E91E63;
      }
      .saved-card-item.selected .card-check::after {
        content: '●';
      }
      .card-icon { font-size: 24px; }
      .card-info { flex: 1; }
      .card-name { font-weight: 500; color: #333; }
      .default-badge {
        font-size: 11px;
        background: #E91E63;
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 8px;
      }
      .card-check { color: #ccc; font-size: 18px; }
      .divider {
        text-align: center;
        color: #999;
        margin: 20px 0;
        position: relative;
      }
      .divider::before, .divider::after {
        content: '';
        position: absolute;
        top: 50%;
        width: 40%;
        height: 1px;
        background: #eee;
      }
      .divider::before { left: 0; }
      .divider::after { right: 0; }
      .new-card-btn {
        width: 100%;
        padding: 14px;
        border: 2px dashed #ddd;
        background: white;
        border-radius: 10px;
        color: #666;
        font-size: 15px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .new-card-btn:hover {
        border-color: #E91E63;
        color: #E91E63;
      }
      .save-card-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        font-size: 13px;
        color: #666;
        cursor: pointer;
      }
      .save-card-checkbox input {
        width: 18px;
        height: 18px;
        accent-color: #E91E63;
      }
      .confirm-payment-btn {
        width: 100%;
        padding: 16px;
        margin-top: 20px;
        background: #E91E63;
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .confirm-payment-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      .confirm-payment-btn:not(:disabled):hover {
        background: #C2185B;
      }
    `;
    document.head.appendChild(styles);
  }

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 카드 선택 모달 닫기
 */
function closeCardSelectionModal() {
  const modal = document.getElementById('cardSelectionModal');
  if (modal) modal.remove();
}

// 선택된 빌링키 저장용 변수
let selectedBillingKey = null;

/**
 * 저장된 카드 선택 (UI만 업데이트)
 */
function selectSavedCard(billingKey, planKey) {
  // 선택 UI 업데이트
  document.querySelectorAll('.saved-card-item').forEach(item => {
    item.classList.remove('selected');
  });
  document.querySelector(`[data-billing-key="${billingKey}"]`)?.classList.add('selected');

  // 선택된 빌링키 저장
  selectedBillingKey = billingKey;

  // 결제하기 버튼 활성화
  const confirmBtn = document.getElementById('confirmPaymentBtn');
  if (confirmBtn) {
    confirmBtn.disabled = false;
  }
}

/**
 * 저장된 카드로 결제 확인
 */
async function confirmSavedCardPayment(planKey) {
  if (!selectedBillingKey) {
    alert('카드를 선택해주세요.');
    return;
  }

  const userId = HAIRGATOR_PAYMENT.getUserId();
  const userName = window.currentDesigner?.name || '';

  closeCardSelectionModal();
  showPaymentLoading(true);

  try {
    const result = await payWithBillingKey(selectedBillingKey, planKey, userId, userName);

    if (result.success) {
      alert(`${result.tokens.toLocaleString()} 토큰이 충전되었습니다!`);

      // 토큰 표시 업데이트
      if (window.BullnabiBridge?.updateTokenDisplay) {
        window.BullnabiBridge.updateTokenDisplay(result.newBalance, result.plan);
      }
    }
  } catch (error) {
    alert(error.message || '결제에 실패했습니다.');
  } finally {
    showPaymentLoading(false);
    selectedBillingKey = null; // 초기화
  }
}

/**
 * 새 카드로 결제 (카드 저장 옵션 포함)
 */
async function processPaymentWithNewCard(planKey, userId, fromModal = false) {
  if (fromModal) {
    closeCardSelectionModal();
  }

  const saveCard = document.getElementById('saveNewCard')?.checked ?? false;
  const userName = window.currentDesigner?.name || '';
  const userEmail = window.currentDesigner?.email || '';

  try {
    if (saveCard) {
      // 카드 저장 + 결제
      // 1. 먼저 빌링키 발급
      const issueResult = await issueBillingKey(userId, userEmail, userName);

      if (issueResult.cancelled) {
        return;
      }

      if (issueResult.success) {
        // 2. 빌링키로 결제
        showPaymentLoading(true);
        const payResult = await payWithBillingKey(issueResult.billingKey, planKey, userId, userName);

        if (payResult.success) {
          alert(`카드가 저장되었습니다!\n${payResult.tokens.toLocaleString()} 토큰이 충전되었습니다!`);

          if (window.BullnabiBridge?.updateTokenDisplay) {
            window.BullnabiBridge.updateTokenDisplay(payResult.newBalance, payResult.plan);
          }
        }
      }
    } else {
      // 일반 결제 (카드 저장 안 함)
      await HAIRGATOR_PAYMENT.purchasePlan(planKey);
    }
  } catch (error) {
    alert(error.message || '결제에 실패했습니다.');
  } finally {
    showPaymentLoading(false);
  }
}

/**
 * iOS Flutter 앱인지 확인
 * @returns {boolean}
 */
function isIOSFlutterApp() {
  // Flutter WebView에서 IAPChannel이 주입되어 있으면 iOS 인앱결제 사용
  return typeof window.IAPChannel !== 'undefined' &&
         typeof window.IAPChannel.postMessage === 'function';
}

/**
 * iOS 인앱결제 요청
 * @param {string} planKey - 요금제 키 (basic, pro, business, tokens_5000)
 */
function requestIOSInAppPurchase(planKey) {
  console.log('[IAP] requestIOSInAppPurchase 함수 진입, planKey:', planKey);

  const plan = HAIRGATOR_PAYMENT.plans[planKey];
  console.log('[IAP] plan 객체:', plan);

  if (!plan || !plan.productId) {
    console.error('[IAP] 유효하지 않은 요금제:', planKey);
    alert('유효하지 않은 요금제입니다. planKey: ' + planKey);
    return;
  }

  console.log('[IAP] iOS 인앱결제 요청:', plan.productId);
  alert('[IAP] Flutter에 전송: ' + plan.productId);  // 디버그용 alert

  // Flutter에 구매 요청 전송
  window.IAPChannel.postMessage(JSON.stringify({
    action: 'purchase',
    productId: plan.productId
  }));

  console.log('[IAP] IAPChannel.postMessage 완료');
}

/**
 * iOS 인앱결제 성공 콜백 (Flutter에서 호출)
 */
window.onIAPSuccess = function(productId, tokens) {
  console.log('[IAP] 구매 성공:', productId, tokens);

  // 토큰 표시 업데이트
  if (window.BullnabiBridge?.updateTokenDisplay) {
    window.BullnabiBridge.updateTokenDisplay(null, productId);
  }

  // 페이지 새로고침하여 토큰 반영
  setTimeout(() => {
    location.reload();
  }, 1000);
};

/**
 * iOS 인앱결제 실패 콜백 (Flutter에서 호출)
 */
window.onIAPError = function(error) {
  console.log('[IAP] 구매 실패:', error);
  // 취소는 별도 알림 안 함
  if (!error.includes('취소')) {
    alert('결제 실패: ' + error);
  }
};

/**
 * 상품 페이지에서 플랜 선택 및 결제 (본인인증 포함)
 * HTML 버튼: onclick="selectPlanAndPay('basic')" 등
 */
async function selectPlanAndPay(planKey) {
  console.log('💳 selectPlanAndPay 호출:', planKey);

  // iOS Flutter 앱이면 인앱결제 사용
  if (isIOSFlutterApp()) {
    console.log('[IAP] iOS Flutter 앱 감지 → 인앱결제 진행');
    requestIOSInAppPurchase(planKey);
    return;
  }

  // 일반 웹/Android 앱은 기존 외부결제 진행
  await verifyAndPay(planKey);
}

// 전역 함수로 노출
window.HAIRGATOR_PAYMENT = HAIRGATOR_PAYMENT;
window.selectPlan = selectPlan;
window.selectPlanAndPay = selectPlanAndPay;
window.isIOSFlutterApp = isIOSFlutterApp;
window.requestIOSInAppPurchase = requestIOSInAppPurchase;
window.purchasePlan = (planKey) => HAIRGATOR_PAYMENT.purchasePlan(planKey);
window.purchaseExtraCredits = () => HAIRGATOR_PAYMENT.purchaseExtraCredits();

// 본인인증 관련 함수 노출
window.checkIdentityVerification = checkIdentityVerification;
window.requestIdentityVerification = requestIdentityVerification;
window.verifyAndPay = verifyAndPay;

// 빌링키 관련 함수 노출
window.getSavedCards = getSavedCards;
window.getDefaultCard = getDefaultCard;
window.issueBillingKey = issueBillingKey;
window.payWithBillingKey = payWithBillingKey;
window.deleteSavedCard = deleteSavedCard;
window.showPaymentOptions = showPaymentOptions;
window.showCardSelectionModal = showCardSelectionModal;
window.closeCardSelectionModal = closeCardSelectionModal;
window.selectSavedCard = selectSavedCard;
window.processPaymentWithNewCard = processPaymentWithNewCard;
