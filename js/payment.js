// js/payment.js
// 포트원 V2 결제 연동

const HAIRGATOR_PAYMENT = {
  // 포트원 설정
  storeId: 'store-69fa8bc3-f410-433a-a8f2-f5d922f94dcb',
  channelKey: 'channel-key-da1e7007-39b9-4afa-8c40-0f158d323af1',

  // 요금제 정보
  plans: {
    basic: {
      name: '베이직',
      nameEn: 'Basic',
      price: 22000,
      tokens: 10000,
      productId: 'hairgator_basic'
    },
    standard: {
      name: '스탠다드',
      nameEn: 'Standard',
      price: 38000,
      tokens: 18000,
      productId: 'hairgator_standard'
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
   * @param {string} planKey - 요금제 키 (basic, standard, business, tokens_5000)
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

    // 2. localStorage의 bullnabi_user에서 가져오기
    try {
      const bullnabiUser = localStorage.getItem('bullnabi_user');
      if (bullnabiUser) {
        const parsed = JSON.parse(bullnabiUser);
        if (parsed.id) return parsed.id;
      }
    } catch (e) {}

    // 3. window.currentDesigner에서 가져오기
    if (window.currentDesigner?.id) return window.currentDesigner.id;

    return null;
  },

  /**
   * 결제 모달에서 플랜 선택 시 호출
   */
  async purchasePlan(planKey) {
    // 현재 로그인한 사용자 정보 가져오기
    const userId = this.getUserId();

    // 사용자 이름/이메일 가져오기
    let userEmail = '';
    let userName = '';
    try {
      const bullnabiUser = localStorage.getItem('bullnabi_user');
      if (bullnabiUser) {
        const parsed = JSON.parse(bullnabiUser);
        userEmail = parsed.email || '';
        userName = parsed.nickname || parsed.name || '';
      }
    } catch (e) {}

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
 */
function selectPlan(planType) {
  // HTML에서 사용하는 이름 → payment.js 내부 키 매핑
  const planMapping = {
    'basic': 'basic',      // 베이직 22,000원
    'pro': 'standard',     // 프로 → 스탠다드 38,000원
    'standard': 'standard',
    'business': 'business' // 비즈니스 50,000원
  };

  const planKey = planMapping[planType] || planType;
  console.log('💳 플랜 선택:', planType, '→', planKey);

  HAIRGATOR_PAYMENT.purchasePlan(planKey);
}

// 전역 함수로 노출
window.HAIRGATOR_PAYMENT = HAIRGATOR_PAYMENT;
window.selectPlan = selectPlan;
window.purchasePlan = (planKey) => HAIRGATOR_PAYMENT.purchasePlan(planKey);
window.purchaseExtraCredits = () => HAIRGATOR_PAYMENT.purchaseExtraCredits();
