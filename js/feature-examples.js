// HAIRGATOR 권한별 기능 사용 예시

// ========== Level 0 기능 (공통 기능) - 로그인 불필요 ==========

// 기본 메뉴 조회
function viewBasicMenu() {
    // Level 0 기능은 권한 체크 불필요
    console.log('기본 메뉴 표시');
    // 메뉴 로딩 로직...
}

// 스타일 상세 보기
function viewStyleDetail(styleId) {
    console.log(`스타일 상세 보기: ${styleId}`);
    // 상세 정보 표시 로직...
}

// ========== Level 1 기능 (기본 기능) - 로그인 후 자동 부여 ==========

// 고객 등록
async function registerCustomer(customerData) {
    // 권한 체크
    if (!await checkPermission('CUSTOMER_BASIC')) {
        return;
    }
    
    try {
        // 고객 등록 로직
        await db.collection('customers').add({
            ...customerData,
            createdBy: permissionManager.currentUser.id,
            createdAt: new Date()
        });
        
        console.log('고객 등록 완료');
        showToast('고객이 성공적으로 등록되었습니다');
        
    } catch (error) {
        console.error('고객 등록 실패:', error);
        showToast('고객 등록에 실패했습니다');
    }
}

// 예약 생성
async function createReservation(reservationData) {
    if (!await checkPermission('RESERVATION')) {
        return;
    }
    
    try {
        await db.collection('reservations').add({
            ...reservationData,
            designerId: permissionManager.currentUser.id,
            createdAt: new Date(),
            status: 'confirmed'
        });
        
        console.log('예약 생성 완료');
        showToast('예약이 생성되었습니다');
        
    } catch (error) {
        console.error('예약 생성 실패:', error);
        showToast('예약 생성에 실패했습니다');
    }
}

// 기본 스타일 추천
async function getBasicStyleRecommendation(criteria) {
    if (!await checkPermission('STYLE_RECOMMEND_BASIC')) {
        return;
    }
    
    try {
        // 카테고리 기반 필터링
        const styles = await db.collection('hairstyles')
            .where('gender', '==', criteria.gender)
            .where('mainCategory', '==', criteria.category)
            .limit(10)
            .get();
        
        const recommendations = styles.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log('기본 추천 완료:', recommendations.length);
        return recommendations;
        
    } catch (error) {
        console.error('기본 추천 실패:', error);
        throw error;
    }
}

// ========== Level 2 기능 (프리미엄 기능) - 관리자 개별 승인 필요 ==========

// AI 얼굴 분석 (토큰 2개 차감)
async function performFaceAnalysis(imageFile) {
    // 권한과 토큰 체크를 한번에 처리
    return await executeWithPermission('AI_FACE_ANALYSIS', async () => {
        // 토큰 차감
        await permissionManager.deductTokens(2, 'AI 얼굴 분석');
        
        try {
            // 이미지를 Firebase Storage에 업로드
            const imageRef = storage.ref().child(`face-analysis/${Date.now()}.jpg`);
            await imageRef.put(imageFile);
            const imageUrl = await imageRef.getDownloadURL();
            
            // AKOOL API 호출 (실제 구현에서는 서버 사이드에서 처리)
            const response = await fetch('/api/face-analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    imageUrl: imageUrl,
                    userId: permissionManager.currentUser.id
                })
            });
            
            if (!response.ok) {
                throw new Error('AI 분석 서버 오류');
            }
            
            const analysisResult = await response.json();
            
            // 분석 결과 저장
            await db.collection('face_analysis_history').add({
                userId: permissionManager.currentUser.id,
                imageUrl: imageUrl,
                result: analysisResult,
                tokensUsed: 2,
                createdAt: new Date()
            });
            
            console.log('AI 얼굴 분석 완료');
            showToast('AI 분석이 완료되었습니다');
            return analysisResult;
            
        } catch (error) {
            console.error('AI 분석 실패:', error);
            // 토큰 복구 (실패 시)
            await permissionManager.deductTokens(-2, 'AI 분석 실패로 토큰 복구');
            throw error;
        }
    });
}

// 고급 스타일 추천 (AI 기반)
async function getAdvancedStyleRecommendation(faceAnalysisData) {
    return await executeWithPermission('ADVANCED_RECOMMEND', async () => {
        await permissionManager.deductTokens(1, '고급 스타일 추천');
        
        try {
            // AI 기반 매칭 알고리즘
            const response = await fetch('/api/advanced-recommendation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    faceShape: faceAnalysisData.faceShape,
                    skinTone: faceAnalysisData.skinTone,
                    features: faceAnalysisData.features,
                    preferences: faceAnalysisData.preferences
                })
            });
            
            const recommendations = await response.json();
            
            // 추천 이력 저장
            await db.collection('recommendation_history').add({
                userId: permissionManager.currentUser.id,
                type: 'advanced_ai',
                input: faceAnalysisData,
                recommendations: recommendations,
                tokensUsed: 1,
                createdAt: new Date()
            });
            
            return recommendations;
            
        } catch (error) {
            // 토큰 복구
            await permissionManager.deductTokens(-1, '고급 추천 실패로 토큰 복구');
            throw error;
        }
    });
}

// 데이터 내보내기 (Excel/CSV)
async function exportCustomerData(format = 'excel') {
    return await executeWithPermission('DATA_EXPORT', async () => {
        try {
            // 현재 디자이너의 고객 데이터만 조회
            const customers = await db.collection('customers')
                .where('createdBy', '==', permissionManager.currentUser.id)
                .get();
            
            const customerData = customers.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.()?.toLocaleDateString?.() || 'N/A'
            }));
            
            if (format === 'excel') {
                // Excel 파일 생성
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(customerData);
                XLSX.utils.book_append_sheet(wb, ws, '고객목록');
                
                const fileName = `customers_${new Date().toISOString().split('T')[0]}.xlsx`;
                XLSX.writeFile(wb, fileName);
                
            } else if (format === 'csv') {
                // CSV 파일 생성
                const csv = Papa.unparse(customerData);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const fileName = `customers_${new Date().toISOString().split('T')[0]}.csv`;
                
                // 파일 다운로드
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                link.click();
            }
            
            // 내보내기 이력 저장
            await db.collection('export_history').add({
                userId: permissionManager.currentUser.id,
                type: 'customer_data',
                format: format,
                recordCount: customerData.length,
                createdAt: new Date()
            });
            
            console.log(`데이터 내보내기 완료: ${customerData.length}개 레코드`);
            showToast(`${customerData.length}개의 고객 데이터를 ${format.toUpperCase()}로 내보냈습니다`);
            
        } catch (error) {
            console.error('데이터 내보내기 실패:', error);
            throw error;
        }
    });
}

// 대량 작업 (일괄 스타일 업데이트)
async function bulkUpdateStyles(styleIds, updateData) {
    return await executeWithPermission('BULK_OPERATIONS', async () => {
        if (!permissionManager.currentUser?.isAdmin) {
            throw new Error('관리자 권한이 필요합니다');
        }
        
        try {
            const batch = db.batch();
            const updateCount = styleIds.length;
            
            styleIds.forEach(styleId => {
                const styleRef = db.collection('hairstyles').doc(styleId);
                batch.update(styleRef, {
                    ...updateData,
                    updatedAt: new Date(),
                    updatedBy: permissionManager.currentUser.id
                });
            });
            
            await batch.commit();
            
            console.log(`대량 업데이트 완료: ${updateCount}개 스타일`);
            showToast(`${updateCount}개의 스타일이 업데이트되었습니다`);
            
        } catch (error) {
            console.error('대량 업데이트 실패:', error);
            throw error;
        }
    });
}

// 고급 분석 리포트 생성
async function generateAdvancedReport(reportType, dateRange) {
    return await executeWithPermission('ADVANCED_ANALYTICS', async () => {
        try {
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            
            let reportData = {};
            
            switch (reportType) {
                case 'customer_analysis':
                    reportData = await generateCustomerAnalysisReport(startDate, endDate);
                    break;
                case 'style_trends':
                    reportData = await generateStyleTrendsReport(startDate, endDate);
                    break;
                case 'revenue_analysis':
                    reportData = await generateRevenueAnalysisReport(startDate, endDate);
                    break;
                default:
                    throw new Error('알 수 없는 리포트 유형');
            }
            
            // 리포트 생성 이력 저장
            await db.collection('report_history').add({
                userId: permissionManager.currentUser.id,
                reportType: reportType,
                dateRange: { start: startDate, end: endDate },
                generatedAt: new Date(),
                dataPoints: Object.keys(reportData).length
            });
            
            return reportData;
            
        } catch (error) {
            console.error('고급 리포트 생성 실패:', error);
            throw error;
        }
    });
}

// ========== UI 권한 적용 헬퍼 함수들 ==========

// HTML 요소에 권한 속성 설정 예시
function setupPermissionBasedUI() {
    // Level 1 기능 버튼들
    const standardButtons = `
        <button data-feature="CUSTOMER_BASIC" onclick="registerCustomer()">
            고객 등록
        </button>
        <button data-feature="RESERVATION" onclick="createReservation()">
            예약 생성
        </button>
        <button data-feature="BASIC_ANALYTICS" onclick="showBasicAnalytics()">
            기본 통계
        </button>
    `;
    
    // Level 2 기능 버튼들
    const premiumButtons = `
        <button data-feature="AI_FACE_ANALYSIS" 
                data-permission-level="2" 
                data-feature-key="AI_FACE_ANALYSIS"
                onclick="startFaceAnalysis()">
            🤖 AI 얼굴 분석 (토큰 2개)
        </button>
        <button data-feature="DATA_EXPORT" 
                data-permission-level="2"
                data-feature-key="DATA_EXPORT"
                onclick="exportData()">
            📊 데이터 내보내기
        </button>
        <button data-feature="ADVANCED_ANALYTICS" 
                data-permission-level="2"
                data-feature-key="ADVANCED_ANALYTICS"
                onclick="showAdvancedAnalytics()">
            📈 고급 분석
        </button>
    `;
    
    // UI에 버튼 추가
    document.getElementById('standardFeatures').innerHTML = standardButtons;
    document.getElementById('premiumFeatures').innerHTML = premiumButtons;
    
    // 권한에 따른 UI 업데이트
    permissionManager.updateUIPermissions();
}

// 기능별 실행 함수들
async function startFaceAnalysis() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            showLoading(true);
            try {
                const result = await performFaceAnalysis(file);
                showFaceAnalysisResult(result);
            } catch (error) {
                alert(`AI 분석 실패: ${error.message}`);
            } finally {
                showLoading(false);
            }
        }
    };
    
    fileInput.click();
}

async function exportData() {
    const format = confirm('Excel로 내보내시겠습니까?\n확인: Excel, 취소: CSV') ? 'excel' : 'csv';
    
    showLoading(true);
    try {
        await exportCustomerData(format);
    } catch (error) {
        alert(`데이터 내보내기 실패: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// ========== 권한 관리자용 함수들 ==========

// 권한 신청 목록 조회 (관리자용)
async function getPendingPermissionRequests() {
    if (!permissionManager.currentUser?.isAdmin) {
        throw new Error('관리자 권한이 필요합니다');
    }
    
    try {
        const requests = await db.collection('permission_requests')
            .where('status', '==', 'pending')
            .orderBy('requestDate', 'desc')
            .get();
        
        return requests.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            requestDate: doc.data().requestDate?.toDate?.()
        }));
        
    } catch (error) {
        console.error('권한 신청 목록 조회 실패:', error);
        throw error;
    }
}

// 권한 신청 승인/거부 (관리자용)
async function handlePermissionRequest(requestId, action, reason = '') {
    if (!permissionManager.currentUser?.isAdmin) {
        throw new Error('관리자 권한이 필요합니다');
    }
    
    try {
        const requestDoc = await db.collection('permission_requests').doc(requestId).get();
        const requestData = requestDoc.data();
        
        if (action === 'approve') {
            // 사용자에게 권한 부여
            await permissionManager.grantPermission(requestData.userId, requestData.featureKey);
            
            // 신청 상태 업데이트
            await db.collection('permission_requests').doc(requestId).update({
                status: 'approved',
                approvedBy: permissionManager.currentUser.id,
                approvedAt: new Date(),
                adminReason: reason
            });
            
            console.log('권한 신청 승인 완료:', requestId);
            
        } else if (action === 'reject') {
            // 신청 상태 업데이트
            await db.collection('permission_requests').doc(requestId).update({
                status: 'rejected',
                rejectedBy: permissionManager.currentUser.id,
                rejectedAt: new Date(),
                adminReason: reason
            });
            
            console.log('권한 신청 거부 완료:', requestId);
        }
        
        return true;
        
    } catch (error) {
        console.error('권한 신청 처리 실패:', error);
        throw error;
    }
}

// ========== 유틸리티 함수들 ==========

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function getAuthToken() {
    // JWT 토큰이나 Firebase 토큰 반환
    return permissionManager.currentUser?.token || '';
}

// ========== 초기화 ==========

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // 저장된 사용자 정보 로드
    if (permissionManager.loadUserFromStorage()) {
        console.log('저장된 사용자 정보 로드됨:', permissionManager.currentUser.name);
        setupPermissionBasedUI();
    } else {
        console.log('로그인이 필요합니다');
        // Level 0 기능만 활성화
        permissionManager.updateUIPermissions();
    }
});

// 로그인 성공 후 실행할 함수
window.onLoginSuccess = function(userData) {
    setupPermissionBasedUI();
    permissionManager.updateUIPermissions();
    console.log('권한 기반 UI 설정 완료');
};

console.log('✅ HAIRGATOR 권한별 기능 시스템 로드 완료');
