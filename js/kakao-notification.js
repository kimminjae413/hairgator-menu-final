// ========== 카카오톡 알림 시스템 ==========

// 카카오톡 API 설정 (실제 서비스용 - 현재는 시뮬레이션)
const KAKAO_CONFIG = {
    // 실제 카카오 비즈니스 API 키 (테스트용)
    API_KEY: 'test_api_key_for_hairgator',
    // 카카오톡 채널 ID
    CHANNEL_ID: '@hairgator_official',
    // 알림톡 템플릿 ID들
    TEMPLATES: {
        PROMOTION: 'promotion_template_001',
        APPOINTMENT_REMINDER: 'appointment_reminder_001',
        BIRTHDAY_GREETING: 'birthday_greeting_001',
        FOLLOW_UP: 'follow_up_001'
    }
};

// 알림 발송 이력
let notificationHistory = [];

// 프로모션 알림 발송 (메인 함수)
async function sendKakaoNotification(promotionId) {
    if (!firebaseConnected || !currentDesigner) {
        alert('Firebase 연결 또는 로그인이 필요합니다');
        return;
    }

    try {
        console.log('📱 카카오톡 알림 발송 시작:', promotionId);
        
        // 프로모션 정보 가져오기
        const promotionDoc = await db.collection('promotions').doc(promotionId).get();
        
        if (!promotionDoc.exists) {
            alert('프로모션 정보를 찾을 수 없습니다');
            return;
        }
        
        const promotionData = promotionDoc.data();
        
        // 대상 고객 목록 가져오기
        const targetCustomers = await getTargetCustomers(promotionData.targetCustomers);
        
        if (targetCustomers.length === 0) {
            alert('발송 대상 고객이 없습니다');
            return;
        }
        
        // 알림 발송 확인 모달 표시
        showNotificationConfirmModal(promotionData, targetCustomers);
        
    } catch (error) {
        console.error('❌ 알림 발송 준비 오류:', error);
        alert('알림 발송 준비 중 오류가 발생했습니다: ' + error.message);
    }
}

// 대상 고객 목록 가져오기
async function getTargetCustomers(targetType) {
    try {
        const customersSnapshot = await db.collection('customers')
            .where('designerId', '==', currentDesigner)
            .get();
        
        let customers = [];
        customersSnapshot.forEach(doc => {
            customers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // 타겟 타입에 따른 필터링
        const now = new Date();
        const sixWeeksAgo = new Date(now.getTime() - (6 * 7 * 24 * 60 * 60 * 1000));
        
        switch (targetType) {
            case 'new':
                // 신규 고객 (첫 방문이 최근 2주 이내)
                const twoWeeksAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
                customers = customers.filter(customer => {
                    const firstVisit = customer.createdAt?.toDate() || new Date(customer.createdAt);
                    return firstVisit >= twoWeeksAgo;
                });
                break;
                
            case 'returning':
                // 재방문 고객 (방문 기록이 2회 이상)
                customers = customers.filter(customer => {
                    return (customer.visitHistory?.length || 0) >= 2;
                });
                break;
                
            case 'inactive':
                // 장기 미방문 고객 (마지막 방문이 6주 이상 전)
                customers = customers.filter(customer => {
                    if (!customer.visitHistory || customer.visitHistory.length === 0) {
                        return false;
                    }
                    const lastVisit = customer.visitHistory[customer.visitHistory.length - 1];
                    const lastVisitDate = lastVisit.date?.toDate() || new Date(lastVisit.date);
                    return lastVisitDate < sixWeeksAgo;
                });
                break;
                
            default: // 'all'
                // 모든 고객
                break;
        }
        
        // 전화번호가 있는 고객만 필터링
        customers = customers.filter(customer => 
            customer.phoneNumber && customer.phoneNumber.length >= 10
        );
        
        console.log(`📋 대상 고객 ${customers.length}명 (${targetType})`);
        return customers;
        
    } catch (error) {
        console.error('대상 고객 조회 오류:', error);
        return [];
    }
}

// 알림 발송 확인 모달 표시
function showNotificationConfirmModal(promotionData, targetCustomers) {
    const modalHTML = `
        <div class="notification-confirm-modal" id="notificationConfirmModal">
            <div class="notification-confirm-container">
                <h3>📱 카카오톡 알림 발송</h3>
                
                <div class="promotion-summary">
                    <h4>🎯 프로모션 정보</h4>
                    <div class="summary-item">
                        <strong>이름:</strong> ${promotionData.name}
                    </div>
                    <div class="summary-item">
                        <strong>기간:</strong> ${formatDate(promotionData.startDate)} ~ ${formatDate(promotionData.endDate)}
                    </div>
                    <div class="summary-item">
                        <strong>대상:</strong> ${getTargetText(promotionData.targetCustomers)}
                    </div>
                    <div class="summary-item">
                        <strong>설명:</strong> ${promotionData.description || '없음'}
                    </div>
                </div>
                
                <div class="target-customers-summary">
                    <h4>👥 발송 대상 (${targetCustomers.length}명)</h4>
                    <div class="customers-preview">
                        ${targetCustomers.slice(0, 5).map(customer => `
                            <div class="customer-preview-item">
                                <span class="customer-name">${customer.customerName}</span>
                                <span class="customer-phone">${formatPhoneNumber(customer.phoneNumber)}</span>
                            </div>
                        `).join('')}
                        ${targetCustomers.length > 5 ? `
                            <div class="more-customers">외 ${targetCustomers.length - 5}명 더...</div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="message-template">
                    <h4>💬 발송될 메시지</h4>
                    <div class="message-preview">
                        <div class="message-header">
                            <strong>🎨 ${currentDesignerName} 디자이너</strong>
                        </div>
                        <div class="message-body">
                            ${generatePromotionMessage(promotionData)}
                        </div>
                        <div class="message-footer">
                            <small>📞 문의: ${formatPhoneNumber(getDesignerPhone())}</small>
                        </div>
                    </div>
                </div>
                
                <div class="cost-estimate">
                    <h4>💰 예상 비용</h4>
                    <div class="cost-breakdown">
                        <div class="cost-item">
                            <span>알림톡 단가:</span>
                            <span>개당 8원</span>
                        </div>
                        <div class="cost-item">
                            <span>발송 대상:</span>
                            <span>${targetCustomers.length}명</span>
                        </div>
                        <div class="cost-total">
                            <span><strong>총 예상 비용:</strong></span>
                            <span><strong>${(targetCustomers.length * 8).toLocaleString()}원</strong></span>
                        </div>
                    </div>
                </div>
                
                <div class="notification-actions">
                    <button class="btn-danger" onclick="closeNotificationConfirm()">취소</button>
                    <button class="btn-primary" onclick="executeNotificationSend('${promotionData.id}', ${targetCustomers.length})">
                        📱 발송하기 (${targetCustomers.length}명)
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 모달 데이터 저장 (발송 시 사용)
    window.tempNotificationData = {
        promotion: promotionData,
        customers: targetCustomers
    };
}

// 프로모션 메시지 생성
function generatePromotionMessage(promotionData) {
    let message = `🎉 ${promotionData.name}\n\n`;
    
    if (promotionData.description) {
        message += `${promotionData.description}\n\n`;
    }
    
    if (promotionData.services && promotionData.services.length > 0) {
        message += `✂️ 할인 혜택:\n`;
        promotionData.services.forEach(service => {
            const discountText = service.discountType === 'percentage' 
                ? `${service.discountValue}% 할인`
                : `${service.discountValue.toLocaleString()}원 할인`;
            message += `• ${service.name}: ${discountText}\n`;
        });
        message += '\n';
    }
    
    message += `📅 기간: ${formatDate(promotionData.startDate)} ~ ${formatDate(promotionData.endDate)}\n`;
    message += `⏰ 예약은 미리미리! 선착순 한정 혜택입니다.\n\n`;
    message += `💡 지금 바로 예약하고 특별한 혜택을 받아보세요!`;
    
    return message;
}

// 디자이너 전화번호 가져오기 (프로필에서)
function getDesignerPhone() {
    // 실제로는 디자이너 프로필에서 가져와야 함
    return '010-1234-5678'; // 임시
}

// 실제 알림 발송 실행
async function executeNotificationSend(promotionId, customerCount) {
    if (!window.tempNotificationData) {
        alert('발송 데이터를 찾을 수 없습니다');
        return;
    }
    
    const { promotion, customers } = window.tempNotificationData;
    
    try {
        console.log('📤 알림 발송 실행:', promotionId, customers.length + '명');
        
        // 로딩 상태 표시
        showNotificationSendingProgress(customers.length);
        
        let successCount = 0;
        let failureCount = 0;
        const results = [];
        
        // 실제로는 배치 처리나 큐 시스템을 사용해야 함
        for (let i = 0; i < customers.length; i++) {
            const customer = customers[i];
            
            try {
                // 시뮬레이션: 실제 카카오 API 호출
                const result = await sendSingleKakaoMessage(customer, promotion);
                
                if (result.success) {
                    successCount++;
                } else {
                    failureCount++;
                }
                
                results.push({
                    customerId: customer.id,
                    customerName: customer.customerName,
                    phone: customer.phoneNumber,
                    success: result.success,
                    error: result.error,
                    timestamp: new Date()
                });
                
                // 진행률 업데이트
                updateNotificationProgress(i + 1, customers.length, successCount, failureCount);
                
                // API 속도 제한 준수 (초당 10건)
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`고객 ${customer.customerName} 발송 실패:`, error);
                failureCount++;
                
                results.push({
                    customerId: customer.id,
                    customerName: customer.customerName,
                    phone: customer.phoneNumber,
                    success: false,
                    error: error.message,
                    timestamp: new Date()
                });
            }
        }
        
        // 발송 완료 처리
        await completeNotificationSend(promotionId, results, successCount, failureCount);
        
    } catch (error) {
        console.error('❌ 알림 발송 실행 오류:', error);
        alert('알림 발송 중 오류가 발생했습니다: ' + error.message);
        closeNotificationProgress();
    } finally {
        // 임시 데이터 정리
        delete window.tempNotificationData;
    }
}

// 단일 카카오 메시지 발송 (시뮬레이션)
async function sendSingleKakaoMessage(customer, promotion) {
    // 실제 환경에서는 카카오 비즈니스 API를 호출
    // 현재는 시뮬레이션으로 구현
    
    console.log(`📱 ${customer.customerName}(${customer.phoneNumber})에게 알림 발송 중...`);
    
    // 시뮬레이션: 95% 성공률
    const isSuccess = Math.random() > 0.05;
    
    if (isSuccess) {
        return {
            success: true,
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
    } else {
        return {
            success: false,
            error: '전화번호 오류 또는 카카오톡 미가입'
        };
    }
}

// 알림 발송 진행률 표시
function showNotificationSendingProgress(totalCount) {
    const progressHTML = `
        <div class="notification-progress-modal" id="notificationProgressModal">
            <div class="notification-progress-container">
                <h3>📱 알림 발송 중...</h3>
                
                <div class="progress-info">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    
                    <div class="progress-text">
                        <span id="progressCurrent">0</span> / <span id="progressTotal">${totalCount}</span>
                        (<span id="progressPercent">0</span>%)
                    </div>
                </div>
                
                <div class="progress-stats">
                    <div class="stat-item success">
                        <span class="stat-label">성공:</span>
                        <span class="stat-value" id="successCount">0</span>
                    </div>
                    <div class="stat-item failure">
                        <span class="stat-label">실패:</span>
                        <span class="stat-value" id="failureCount">0</span>
                    </div>
                </div>
                
                <div class="progress-message">
                    <p>📤 고객에게 프로모션 알림을 발송하고 있습니다...</p>
                    <p><small>⚠️ 창을 닫지 말고 잠시만 기다려주세요.</small></p>
                </div>
            </div>
        </div>
    `;
    
    // 기존 모달들 닫기
    closeNotificationConfirm();
    
    document.body.insertAdjacentHTML('beforeend', progressHTML);
}

// 알림 발송 진행률 업데이트
function updateNotificationProgress(current, total, successCount, failureCount) {
    const percent = Math.round((current / total) * 100);
    
    document.getElementById('progressCurrent').textContent = current;
    document.getElementById('progressTotal').textContent = total;
    document.getElementById('progressPercent').textContent = percent;
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('successCount').textContent = successCount;
    document.getElementById('failureCount').textContent = failureCount;
}

// 알림 발송 완료 처리
async function completeNotificationSend(promotionId, results, successCount, failureCount) {
    try {
        // 프로모션 통계 업데이트
        await db.collection('promotions').doc(promotionId).update({
            notificationsSent: firebase.firestore.FieldValue.increment(successCount),
            lastNotificationDate: new Date()
        });
        
        // 발송 이력 저장
        const notificationRecord = {
            promotionId: promotionId,
            designerId: currentDesigner,
            designerName: currentDesignerName,
            totalSent: successCount,
            totalFailed: failureCount,
            sentAt: new Date(),
            results: results
        };
        
        await db.collection('notification_history').add(notificationRecord);
        
        // 성공 메시지 표시
        showNotificationComplete(successCount, failureCount);
        
        console.log('✅ 알림 발송 완료:', successCount + '건 성공,' + failureCount + '건 실패');
        
    } catch (error) {
        console.error('발송 완료 처리 오류:', error);
        alert('발송은 완료되었지만 기록 저장 중 오류가 발생했습니다.');
    }
}

// 알림 발송 완료 메시지
function showNotificationComplete(successCount, failureCount) {
    closeNotificationProgress();
    
    const resultHTML = `
        <div class="notification-result-modal" id="notificationResultModal">
            <div class="notification-result-container">
                <h3>✅ 발송 완료!</h3>
                
                <div class="result-summary">
                    <div class="result-card success">
                        <div class="result-number">${successCount}</div>
                        <div class="result-label">성공</div>
                    </div>
                    
                    ${failureCount > 0 ? `
                        <div class="result-card failure">
                            <div class="result-number">${failureCount}</div>
                            <div class="result-label">실패</div>
                        </div>
                    ` : ''}
                </div>
                
                <div class="result-message">
                    <p>🎉 총 <strong>${successCount}명</strong>에게 프로모션 알림을 성공적으로 발송했습니다!</p>
                    ${failureCount > 0 ? `
                        <p>⚠️ ${failureCount}명은 전화번호 오류 등으로 발송에 실패했습니다.</p>
                    ` : ''}
                    <p>📊 발송 결과는 프로모션 분석에서 확인할 수 있습니다.</p>
                </div>
                
                <div class="result-actions">
                    <button class="btn-primary" onclick="closeNotificationResult()">확인</button>
                    <button class="btn-secondary" onclick="showNotificationHistory()">발송 이력 보기</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', resultHTML);
    
    // 3초 후 자동으로 프로모션 데이터 새로고침
    setTimeout(() => {
        if (typeof loadPromotionData === 'function') {
            loadPromotionData();
        }
    }, 3000);
}

// 생일 축하 알림 자동 발송 (일일 배치용)
async function sendBirthdayNotifications() {
    if (!firebaseConnected || !currentDesigner) {
        return;
    }

    try {
        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayDate = today.getDate();
        
        console.log(`🎂 생일 축하 알림 체크: ${todayMonth}월 ${todayDate}일`);
        
        // 오늘 생일인 고객 찾기
        const customersSnapshot = await db.collection('customers')
            .where('designerId', '==', currentDesigner)
            .get();
        
        const birthdayCustomers = [];
        
        customersSnapshot.forEach(doc => {
            const customer = doc.data();
            if (customer.birthday) {
                const birthday = new Date(customer.birthday);
                if (birthday.getMonth() + 1 === todayMonth && 
                    birthday.getDate() === todayDate) {
                    birthdayCustomers.push({
                        id: doc.id,
                        ...customer
                    });
                }
            }
        });
        
        if (birthdayCustomers.length === 0) {
            console.log('📅 오늘 생일인 고객이 없습니다');
            return;
        }
        
        console.log(`🎉 오늘 생일인 고객 ${birthdayCustomers.length}명 발견`);
        
        // 생일 축하 메시지 발송
        for (const customer of birthdayCustomers) {
            try {
                const message = generateBirthdayMessage(customer);
                await sendSingleKakaoMessage(customer, { type: 'birthday', message });
                console.log(`🎂 ${customer.customerName}님께 생일 축하 메시지 발송 완료`);
            } catch (error) {
                console.error(`생일 메시지 발송 실패 (${customer.customerName}):`, error);
            }
        }
        
    } catch (error) {
        console.error('생일 알림 처리 오류:', error);
    }
}

// 생일 축하 메시지 생성
function generateBirthdayMessage(customer) {
    return `🎂 ${customer.customerName}님, 생일 축하드립니다!
    
🎉 특별한 날을 맞아 ${currentDesignerName} 디자이너가 준비한 생일 선물이 있어요!

✨ 생일 특별 혜택:
• 모든 서비스 20% 할인
• 무료 트리트먼트 서비스
• 생일 기념 헤어 스타일링 상담

📅 혜택 기간: 생일 당일부터 1주일
⏰ 예약 시 "생일 혜택" 말씀해 주세요!

💝 소중한 고객님의 특별한 하루가 더욱 빛나길 바랍니다.

📞 예약 문의: ${getDesignerPhone()}`;
}

// 팔로우업 알림 발송 (방문 후 1주일)
async function sendFollowUpNotifications() {
    if (!firebaseConnected || !currentDesigner) {
        return;
    }

    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const customersSnapshot = await db.collection('customers')
            .where('designerId', '==', currentDesigner)
            .get();
        
        const followUpCustomers = [];
        
        customersSnapshot.forEach(doc => {
            const customer = doc.data();
            if (customer.visitHistory && customer.visitHistory.length > 0) {
                const lastVisit = customer.visitHistory[customer.visitHistory.length - 1];
                const lastVisitDate = lastVisit.date?.toDate() || new Date(lastVisit.date);
                
                // 정확히 7일 전에 방문한 고객
                if (lastVisitDate.toDateString() === oneWeekAgo.toDateString()) {
                    followUpCustomers.push({
                        id: doc.id,
                        ...customer,
                        lastStyle: lastVisit
                    });
                }
            }
        });
        
        if (followUpCustomers.length === 0) {
            console.log('📅 팔로우업 대상 고객이 없습니다');
            return;
        }
        
        console.log(`💌 팔로우업 대상 고객 ${followUpCustomers.length}명`);
        
        // 팔로우업 메시지 발송
        for (const customer of followUpCustomers) {
            try {
                const message = generateFollowUpMessage(customer);
                await sendSingleKakaoMessage(customer, { type: 'followup', message });
                console.log(`💌 ${customer.customerName}님께 팔로우업 메시지 발송 완료`);
            } catch (error) {
                console.error(`팔로우업 메시지 발송 실패 (${customer.customerName}):`, error);
            }
        }
        
    } catch (error) {
        console.error('팔로우업 알림 처리 오류:', error);
    }
}

// 팔로우업 메시지 생성
function generateFollowUpMessage(customer) {
    const styleName = customer.lastStyle?.styleName || '헤어스타일';
    
    return `✨ ${customer.customerName}님, 안녕하세요!

지난주에 시술받으신 "${styleName}" 스타일은 어떠신가요? 😊

💡 스타일 관리 팁:
• 저희가 추천한 제품으로 관리하고 계신가요?
• 혹시 궁금한 점이나 불편한 점은 없으신지요?

🔄 다음 관리 시기:
보통 4-6주 후에 다시 방문하시면 최상의 상태를 유지할 수 있어요!

📞 언제든 궁금한 점이 있으시면 연락주세요
${currentDesignerName} 디자이너가 성심껏 상담해드립니다.

📱 예약 문의: ${getDesignerPhone()}

항상 아름다운 하루 되세요! 💖`;
}

// 전화번호 포맷팅
function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 11 && cleaned.startsWith('010')) {
        return `${cleaned.substr(0, 3)}-${cleaned.substr(3, 4)}-${cleaned.substr(7, 4)}`;
    }
    
    return phoneNumber;
}

// 알림 이력 보기
async function showNotificationHistory() {
    if (!firebaseConnected || !currentDesigner) {
        alert('Firebase 연결 또는 로그인이 필요합니다');
        return;
    }

    try {
        const historySnapshot = await db.collection('notification_history')
            .where('designerId', '==', currentDesigner)
            .orderBy('sentAt', 'desc')
            .limit(20)
            .get();
        
        const history = [];
        historySnapshot.forEach(doc => {
            history.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        showNotificationHistoryModal(history);
        
    } catch (error) {
        console.error('알림 이력 조회 오류:', error);
        alert('알림 이력을 불러올 수 없습니다');
    }
}

// 알림 이력 모달 표시
function showNotificationHistoryModal(history) {
    const modalHTML = `
        <div class="notification-history-modal" id="notificationHistoryModal">
            <div class="notification-history-container">
                <div class="history-header">
                    <h3>📋 알림 발송 이력</h3>
                    <button class="history-close" onclick="closeNotificationHistory()">×</button>
                </div>
                
                <div class="history-list">
                    ${history.length === 0 ? `
                        <div class="no-history">
                            <p>📭 발송 이력이 없습니다</p>
                        </div>
                    ` : history.map(record => `
                        <div class="history-item">
                            <div class="history-info">
                                <div class="history-date">${formatDateTime(record.sentAt)}</div>
                                <div class="history-promotion">프로모션 ID: ${record.promotionId}</div>
                                <div class="history-stats">
                                    성공: <span class="success-count">${record.totalSent}</span>명, 
                                    실패: <span class="failure-count">${record.totalFailed}</span>명
                                </div>
                            </div>
                            <div class="history-actions">
                                <button class="btn-sm btn-info" onclick="showHistoryDetails('${record.id}')">
                                    상세보기
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 날짜/시간 포맷팅
function formatDateTime(dateValue) {
    if (!dateValue) return '날짜 없음';
    
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 모달 닫기 함수들
function closeNotificationConfirm() {
    const modal = document.getElementById('notificationConfirmModal');
    if (modal) {
        modal.remove();
    }
}

function closeNotificationProgress() {
    const modal = document.getElementById('notificationProgressModal');
    if (modal) {
        modal.remove();
    }
}

function closeNotificationResult() {
    const modal = document.getElementById('notificationResultModal');
    if (modal) {
        modal.remove();
    }
}

function closeNotificationHistory() {
    const modal = document.getElementById('notificationHistoryModal');
    if (modal) {
        modal.remove();
    }
}

// 대상 고객 텍스트 변환 (공통 함수)
function getTargetText(target) {
    const targetTexts = {
        all: '모든 고객',
        new: '신규 고객',
        returning: '재방문 고객',
        inactive: '장기 미방문 고객'
    };
    return targetTexts[target] || target;
}

// 날짜 포맷팅 (공통 함수)
function formatDate(dateValue) {
    if (!dateValue) return '날짜 없음';
    
    const date = new Date(dateValue);
    return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
    });
}

console.log('✅ kakao-notification.js 로드 완료');
