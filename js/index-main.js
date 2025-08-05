// ========== HAIRGATOR 메인 로직 (햄버거 메뉴 업데이트 버전) ==========
console.log('🚀 HAIRGATOR 최종 완전 버전 시작 - 프로모션 + 프로필 기능 포함');

// ========== 전역 변수 ==========
let currentDesigner = null;
let currentDesignerName = null;
let currentGender = null;
let currentCategory = null;
let currentCustomer = null;
let currentStyleCode = null;
let currentStyleName = null;
let currentStyleImage = null;
let hierarchyStructure = {};

// Excel 기반 완전 구조 (오타 수정됨)
const PERFECT_STRUCTURE = {
    male: {
        'SIDE FRINGE': ['Fore Head', 'Eye Brow'],
        'SIDE PART': ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone'], // FART → PART 수정
        'FRINGE UP': ['None', 'Fore Head'], // FRINDGE → FRINGE 수정
        'PUSHED BACK': ['None'],
        'BUZZ': ['None'],
        'CROP': ['None'],
        'MOHICAN': ['None']
    },
    female: {
        'LONG': ['A Length', 'B Length'],
        'SEMI LONG': ['C Length'],
        'MEDIUM': ['D Length', 'E Length'],
        'BOB': ['F Length', 'G Length'],
        'SHORT': ['H Length']
    }
};

// ========== 세션 관리 ==========
function checkExistingSession() {
    const savedDesigner = sessionStorage.getItem('currentDesigner');
    const savedDesignerName = sessionStorage.getItem('designerName');
    
    if (savedDesigner && savedDesignerName) {
        console.log('🔄 기존 세션 복원:', savedDesigner, savedDesignerName);
        currentDesigner = savedDesigner;
        currentDesignerName = savedDesignerName;
        
        document.getElementById('designerLogin').style.display = 'none';
        document.getElementById('genderSelection').classList.add('show');
        document.getElementById('addCustomerBtn').classList.add('show');
        
        document.getElementById('menuDesignerName').textContent = `🎨 ${savedDesignerName}`;
        
        return true;
    }
    
    return false;
}

// ========== 디자이너 로그인 ==========
async function checkDesignerLogin() {
    const name = document.getElementById('designerName').value.trim();
    const phone = document.getElementById('designerPhone').value.trim();
    const pin = document.getElementById('designerPin').value.trim();
    
    if (!name || phone.length !== 4 || pin.length !== 4) {
        showLoginResult('error', '모든 정보를 정확히 입력해주세요<br>전화번호 4자리, 비밀번호 4자리');
        return;
    }
    
    if (!firebaseConnected) {
        showLoginResult('error', 'Firebase 연결이 필요합니다. 잠시 후 다시 시도해주세요.');
        return;
    }
    
    const designerId = `${name}_${phone}`;
    
    try {
        showLoginResult('warning', '로그인 확인 중...');
        
        const testQuery = await db.collection('designers').limit(1).get();
        console.log('✅ Firebase 연결 테스트 성공');
        
        const designerDoc = await db.collection('designers').doc(designerId).get();
        
        if (designerDoc.exists) {
            const data = designerDoc.data();
            
            if (data.pin === pin) {
                await db.collection('designers').doc(designerId).update({
                    lastLogin: new Date()
                });
                
                startDesignerSession(designerId, name);
            } else {
                showLoginResult('error', '❌ 비밀번호가 틀렸습니다!');
            }
        } else {
            showLoginResult('warning', `
                🆕 신규 디자이너 등록<br>
                📝 ID: <strong>${designerId}</strong><br>
                🔒 비밀번호: <strong>••••</strong> (설정됨)<br>
                ⚠️ <strong>비밀번호를 잊어버리면 복구 불가능합니다!</strong><br>
                <button onclick="confirmRegistration('${designerId}', '${name}', '${pin}')" 
                        style="background: #FF1493; color: white; border: none; padding: 10px 20px; border-radius: 10px; margin-top: 10px; cursor: pointer;">
                    ✅ 등록하고 시작
                </button>
            `);
        }
    } catch (error) {
        console.error('❌ 로그인 확인 오류:', error);
        
        if (error.code === 'permission-denied') {
            showLoginResult('error', 'Firebase 권한 오류가 발생했습니다. 관리자에게 문의하세요.');
        } else if (error.code === 'unavailable') {
            showLoginResult('error', 'Firebase 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.');
        } else {
            showLoginResult('error', '로그인 확인 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
        }
    }
}

// 신규 디자이너 등록 확인
async function confirmRegistration(designerId, name, pin) {
    try {
        await db.collection('designers').doc(designerId).set({
            name: name,
            pin: pin,
            createdAt: new Date(),
            customerCount: 0,
            lastLogin: new Date(),
            // 프로필 기본값 추가
            profile: {
                naverBookingUrl: '',
                salonName: '',
                salonAddress: '',
                salonPhone: '',
                openTime: '09:00',
                closeTime: '18:00',
                closedDays: [],
                services: []
            }
        });
        
        startDesignerSession(designerId, name);
    } catch (error) {
        console.error('등록 실패:', error);
        showLoginResult('error', '등록에 실패했습니다. 다시 시도해주세요.');
    }
}

// 디자이너 세션 시작
function startDesignerSession(designerId, name) {
    currentDesigner = designerId;
    currentDesignerName = name;
    
    sessionStorage.setItem('currentDesigner', designerId);
    sessionStorage.setItem('designerName', name);
    
    showLoginResult('success', `🎉 ${name} 디자이너님 환영합니다!`);
    
    setTimeout(() => {
        document.getElementById('designerLogin').style.display = 'none';
        document.getElementById('genderSelection').classList.add('show');
        document.getElementById('addCustomerBtn').classList.add('show');
        
        document.getElementById('menuDesignerName').textContent = `🎨 ${name}`;
    }, 2000);
}

// 결과 표시
function showLoginResult(type, message) {
    const resultDiv = document.getElementById('loginResult');
    const colors = {
        success: '#28a745',
        warning: '#ffc107', 
        error: '#dc3545'
    };
    
    resultDiv.innerHTML = `
        <div style="
            background: ${colors[type]}22; 
            border: 2px solid ${colors[type]}; 
            border-radius: 10px; 
            padding: 15px; 
            margin-top: 20px;
            text-align: center;
        ">
            ${message}
        </div>
    `;
}

// 디자이너 로그아웃
function logoutDesigner() {
    if (confirm('정말 로그아웃하시겠습니까?')) {
        sessionStorage.removeItem('currentDesigner');
        sessionStorage.removeItem('designerName');
        sessionStorage.removeItem('currentCustomer');
        
        currentDesigner = null;
        currentDesignerName = null;
        currentGender = null;
        currentCategory = null;
        currentCustomer = null;
        currentStyleCode = null;
        currentStyleName = null;
        currentStyleImage = null;
        hierarchyStructure = {};
        
        document.getElementById('hamburgerOverlay').style.display = 'none';
        document.getElementById('genderSelection').classList.remove('show');
        document.getElementById('mainContainer').classList.remove('active');
        document.getElementById('addCustomerBtn').classList.remove('show');
        
        document.getElementById('designerLogin').style.display = 'flex';
        
        document.getElementById('designerName').value = '';
        document.getElementById('designerPhone').value = '';
        document.getElementById('designerPin').value = '';
        document.getElementById('loginResult').innerHTML = '';
        
        console.log('👋 디자이너 로그아웃 완료');
    }
}

// ========== 성별 선택 ==========
function selectGender(gender) {
    console.log(`🎯 성별 선택: ${gender}`);
    currentGender = gender;
    document.getElementById('genderSelection').classList.remove('show');
    document.getElementById('mainContainer').classList.add('active');
    
    // 성별에 따른 테마 클래스 추가
    document.getElementById('mainContainer').classList.remove('male', 'female');
    document.getElementById('mainContainer').classList.add(gender);
    
    updateSyncStatus('updating', '📊 어드민과 실시간 동기화 중...');
    loadHierarchyFromFirebaseOnly(gender);
}

// 성별 선택 화면으로 돌아가기
function backToGenderSelection() {
    document.getElementById('genderSelection').classList.add('show');
    document.getElementById('mainContainer').classList.remove('active');
    currentGender = null;
    currentCategory = null;
    hierarchyStructure = {};
}

// ========== 햄버거 메뉴 (업데이트됨) ==========
function toggleHamburgerMenu() {
    const overlay = document.getElementById('hamburgerOverlay');
    overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
}

function closeHamburgerMenu() {
    document.getElementById('hamburgerOverlay').style.display = 'none';
}

// 내 프로필 표시 (새로 추가)
function showMyProfile() {
    if (typeof showDesignerProfile === 'function') {
        showDesignerProfile();
    } else {
        alert('프로필 기능을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
    closeHamburgerMenu();
}

// 프로모션 관리 표시 (새로 추가)
function showPromotionManager() {
    if (typeof showPromotionManagement === 'function') {
        showPromotionManagement();
    } else {
        alert('프로모션 기능을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
    closeHamburgerMenu();
}

// AI 얼굴 분석 열기
function openAIFaceAnalysis() {
    window.open('https://hairgator-face.web.app', '_blank');
    closeHamburgerMenu();
}

// 앱 닫기
function closeApp() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.close();
    }
}

// ========== Firebase에서 계층 구조 로드 ==========
async function loadHierarchyFromFirebaseOnly(gender) {
    console.log(`=== 🔥 Firebase 실시간 동기화: ${gender} ===`);
    
    const navTabs = document.getElementById('navTabs');
    navTabs.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    if (!firebaseConnected) {
        console.log('❌ Firebase 연결 실패');
        showAdminInitializationRequired('Firebase 연결이 필요합니다. 페이지를 새로고침해주세요.');
        updateSyncStatus('disconnected', '❌ Firebase 연결 실패');
        return;
    }

    try {
        console.log('📊 단순 쿼리로 category_hierarchy 조회 (인덱스 오류 방지)...');
        
        const hierarchySnapshot = await db.collection('category_hierarchy').get();
        
        console.log(`📋 실시간 쿼리 결과: ${hierarchySnapshot.size}개 문서`);
        
        if (hierarchySnapshot.empty) {
            console.log('⚠️ category_hierarchy가 비어있음 - 어드민 초기화 필요');
            showAdminInitializationRequired('어드민에서 "🚀 정리된 데이터로 초기화" 버튼을 먼저 클릭해주세요.');
            updateSyncStatus('disconnected', '⚠️ 어드민 초기화 필요');
            return;
        }
        
        const mainCategories = {};
        let lastUpdateTime = null;
        let totalDocs = 0;
        let longCategoryFound = false;
        
        hierarchySnapshot.forEach(doc => {
            const data = doc.data();
            
            if (data.gender !== gender) return;
            
            console.log('📄 실시간 동기화된 문서:', data);
            
            const mainCat = data.mainCategory;
            const subCat = data.subCategory;
            
            if (!mainCategories[mainCat]) {
                mainCategories[mainCat] = [];
            }
            
            if (!mainCategories[mainCat].includes(subCat)) {
                mainCategories[mainCat].push(subCat);
                console.log(`✅ ${mainCat} > ${subCat} 추가됨`);
                
                if (gender === 'female' && mainCat === 'LONG') {
                    console.log(`🎯 LONG 카테고리 확인: ${subCat} 추가됨`);
                    longCategoryFound = true;
                }
            }
            
            if (data.updatedAt && (!lastUpdateTime || data.updatedAt.toDate() > lastUpdateTime)) {
                lastUpdateTime = data.updatedAt.toDate();
            }
            
            totalDocs++;
        });
        
        Object.keys(mainCategories).forEach(mainCat => {
            mainCategories[mainCat].sort();
        });
        
        console.log('✅ 클라이언트 사이드 정렬 완료:', mainCategories);
        
        if (gender === 'female' && mainCategories.LONG) {
            console.log(`🔍 LONG 카테고리 최종 확인: [${mainCategories.LONG.join(', ')}] (${mainCategories.LONG.length}개)`);
            
            if (mainCategories.LONG.length >= 2) {
                console.log('✅ LONG 문제 해결됨: A Length, B Length 등 로드 성공');
                updateSyncStatus('connected', '✅ LONG 문제 해결됨 (모든 Length 로드)');
            } else {
                console.log('⚠️ LONG 카테고리 일부 누락 가능성');
                updateSyncStatus('connected', '⚠️ LONG 카테고리 일부 누락');
            }
        } else if (gender === 'female' && !longCategoryFound) {
            console.log('❌ LONG 카테고리를 찾을 수 없음');
            updateSyncStatus('disconnected', '❌ LONG 카테고리 누락');
        }
        
        hierarchyStructure[gender] = mainCategories;
        
        renderMainCategoryTabs(Object.keys(mainCategories));
        
        const firstCategory = Object.keys(mainCategories)[0];
        if (firstCategory) {
            currentCategory = firstCategory;
            loadStylesFromHierarchyRealtime(firstCategory);
        }
        
        const timeStr = lastUpdateTime ? lastUpdateTime.toLocaleString('ko-KR') : '방금전';
        updateSyncStatus('connected', `✅ 실시간 동기화 완료 (${timeStr}) - ${totalDocs}개 문서`);
        
    } catch (error) {
        console.error('❌ 실시간 동기화 오류:', error);
        
        if (error.code === 'failed-precondition') {
            showAdminInitializationRequired('Firebase 인덱스가 생성 중입니다. 단순 쿼리로 처리했지만 일부 기능이 제한될 수 있습니다.');
            updateSyncStatus('updating', '🔄 Firebase 인덱스 생성 중...');
        } else if (error.code === 'permission-denied') {
            showAdminInitializationRequired('Firebase 권한 오류입니다. Security Rules를 확인해주세요.');
            updateSyncStatus('disconnected', '❌ 권한 오류');
        } else {
            showAdminInitializationRequired(`실시간 동기화 실패: ${error.message}`);
            updateSyncStatus('disconnected', '❌ 실시간 동기화 실패');
        }
    }
}

// 어드민 초기화 필요 메시지 표시
function showAdminInitializationRequired(message) {
    const navTabs = document.getElementById('navTabs');
    const content = document.getElementById('content');
    
    navTabs.innerHTML = `
        <div style="color: #FF69B4; padding: 15px 25px; text-align: center; width: 100%;">
            ⚠️ 어드민 초기화 필요
        </div>
    `;
    
    content.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔧</div>
            <div class="empty-state-title">어드민 초기화가 필요합니다</div>
            <div class="empty-state-message">
                ${message}<br><br>
                <strong>해결 방법:</strong><br>
                1. 어드민 페이지로 이동<br>
                2. "🚀 정리된 데이터로 초기화" 버튼 클릭<br>
                3. 이 페이지 새로고침
            </div>
        </div>
    `;
}

// 대분류 탭 렌더링
function renderMainCategoryTabs(mainCategories) {
    const navTabs = document.getElementById('navTabs');
    navTabs.innerHTML = '';
    
    if (!mainCategories || mainCategories.length === 0) {
        navTabs.innerHTML = '<div style="color: #666; padding: 20px;">카테고리를 불러올 수 없습니다.</div>';
        return;
    }
    
    const categoryOrder = {
        male: ['SIDE FRINGE', 'SIDE PART', 'FRINGE UP', 'PUSHED BACK', 'BUZZ', 'CROP', 'MOHICAN'],
        female: ['LONG', 'SEMI LONG', 'MEDIUM', 'BOB', 'SHORT']
    };
    
    const orderedCategories = categoryOrder[currentGender] || mainCategories;
    
    orderedCategories.forEach((mainCategory, index) => {
        if (mainCategories.includes(mainCategory)) {
            const tab = document.createElement('div');
            tab.className = index === 0 ? 'nav-tab active' : 'nav-tab';
            tab.dataset.category = mainCategory;
            tab.textContent = mainCategory;
            tab.onclick = () => switchCategory(mainCategory);
            navTabs.appendChild(tab);
        }
    });
}

// 카테고리 전환
function switchCategory(categoryId) {
    if (categoryId === currentCategory) return;
    
    console.log(`🔄 카테고리 전환: ${categoryId}`);
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === categoryId) {
            tab.classList.add('active');
        }
    });
    
    currentCategory = categoryId;
    loadStylesFromHierarchyRealtime(categoryId);
}

// 헤어스타일 실시간 로드
async function loadStylesFromHierarchyRealtime(mainCategory) {
    console.log(`=== 🎨 헤어스타일 실시간 로드: ${currentGender}, ${mainCategory} ===`);
    
    const content = document.getElementById('content');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    if (!firebaseConnected) {
        console.log('❌ Firebase 연결 없음');
        showEmptyState('Firebase 연결이 필요합니다');
        updateSyncStatus('disconnected', '❌ Firebase 연결 필요');
        return;
    }

    try {
        const subCategories = hierarchyStructure[currentGender]?.[mainCategory] || [];
        console.log(`📂 실시간 중분류 목록: ${subCategories.join(', ')}`);
        
        if (subCategories.length === 0) {
            console.log('⚠️ 중분류가 없음');
            showEmptyState('중분류가 설정되지 않았습니다. 어드민에서 확인해주세요.');
            updateSyncStatus('disconnected', '⚠️ 중분류 없음');
            return;
        }

        let allStyles = {};
        let foundData = false;
        let totalStyles = 0;
        
        console.log('📊 실시간 스타일 데이터 로드 중...');
        
        const testQuery = await db.collection('hairstyles').limit(1).get();
        console.log('✅ hairstyles 컬렉션 연결 테스트 성공');
        
        for (const subCategory of subCategories) {
            console.log(`🔍 ${subCategory} 스타일 조회 중...`);
            
            try {
                const allStylesSnapshot = await db.collection('hairstyles').get();
                
                const filteredStyles = [];
                allStylesSnapshot.forEach(doc => {
                    const style = doc.data();
                    if (style.gender === currentGender && 
                        style.mainCategory === mainCategory && 
                        style.subCategory === subCategory) {
                        filteredStyles.push({
                            ...style,
                            id: doc.id
                        });
                    }
                });
                
                if (filteredStyles.length > 0) {
                    allStyles[subCategory] = filteredStyles;
                    totalStyles += filteredStyles.length;
                    foundData = true;
                    console.log(`✅ ${subCategory}: ${filteredStyles.length}개 스타일 발견`);
                } else {
                    console.log(`📄 ${subCategory}: 스타일 없음`);
                }
                
            } catch (error) {
                console.log(`⚠️ ${subCategory} 쿼리 실패:`, error.message);
            }
        }
        
        if (foundData && Object.keys(allStyles).length > 0) {
            console.log('🎨 실시간 스타일 데이터 렌더링:', allStyles);
            renderCategoryRealtime({
                description: getMainCategoryDescription(mainCategory),
                styles: allStyles
            });
            updateSyncStatus('connected', `✅ ${totalStyles}개 스타일 실시간 로드 완료`);
        } else {
            console.log('📄 실시간 스타일 데이터 없음');
            renderEmptyStylesRealtime(mainCategory, subCategories);
            updateSyncStatus('connected', '📄 등록된 스타일이 없습니다 (실시간 확인 완료)');
        }
        
    } catch (error) {
        console.error('❌ 실시간 헤어스타일 로드 오류:', error);
        showEmptyState('실시간 스타일 데이터를 불러올 수 없습니다');
        updateSyncStatus('disconnected', '❌ 실시간 로드 실패: ' + error.message);
    }
}

// 대분류 설명 가져오기
function getMainCategoryDescription(mainCategory) {
    const descriptions = {
        'SIDE FRINGE': '사이드프린지는 살짝 볼륨이 있으면서 앞으로 떨어지는 스타일과 앞머리 숱을 줄여 소프트한 시스루 느낌을 다양하게 표현할 수 있습니다. M자 이마와 넓은 이마를 커버하면서 볼륨과 플랫, 웨이브와 스트레이트의 구성 요소를 디테일하게 표현하는 것이 스타일링의 핵심 포인트입니다.',
        'SIDE PART': '사이드 파트는 클래식함과 모던함의 대명사로 스타일링에 따라 원하는 이미지를 자유롭게 표현할 수 있습니다. 가르마를 기준으로 단순히 넘어가는 스타일을 넘어 개인의 특성과 트렌드에 맞춰 고급한 헤어스타일을 표현하는 것이 매우 중요합니다.',
        'FRINGE UP': '프린지 업은 흔히 아이비리그 컷이라고 하여, 이마를 적극적으로 드러내어 남성적인 이미지를 어필하기 유리한 스타일입니다. 다운펌을 통해 뒷머리와 앞머리를 정리하는 것이 스타일링의 특성상 트렌드에 얽매이지 말고 나름의 포인트와 특색으로 관리하는 것이 중요합니다.',
        'PUSHED BACK': '푸시드 백은 앞머리 부분의 볼륨감을 강조한 스타일로써, 뒷부분으로 넘기면서 뒤로 갈수록 볼륨이 적어지는 것이 특징인 스타일입니다. 모발의 길이가 중간 정도 이상인 분들에게 가장 적합하며, 정교하고 섬세한 길이 조절을 통해 고급스러운 이미지를 유지할 수 있습니다.',
        'BUZZ': '버즈컷은 흔히 반삭이라고 하여 클리퍼의 길이와 헤어 스타일에 따라 다양한 스타일을 연출할 수 있습니다. 정교하고 섬세한 길이 조절이 가장 중요하지만 강함이 아닌 곡선미가 주는 특성인 개성을 강점으로 할 수 있습니다.',
        'CROP': '크롭컷은 매우 짧은 라운드 형태로 깔끔하면서도 세련된 남성미를 강조한 스타일입니다. 앞머리를 짧게 하여 깔끔한 인상을 주며, 양쪽과 뒷머리의 이미지를 단정하게 강조하여 모발의 길이와 절단에 따라 다양한 이미지를 연출할 수 있습니다.',
        'MOHICAN': '모히칸은 옆머리를 짧게 하고 윗머리에 앞머리에서 뒷머리로 이어지는 라인을 표현하여, 둥근 얼굴형을 보완할 수 있는 개성이 남다른 스타일입니다.',
        'LONG': '롱 헤어는 여성스러움과 우아함을 동시에 표현할 수 있는 대표적인 스타일입니다. 다양한 연출이 가능하며 개인의 취향에 따라 웨이브나 스트레이트 등으로 변화를 줄 수 있습니다.',
        'SEMI LONG': '세미 롱 헤어는 롱과 미디엄의 중간 길이로, 여성스러움을 유지하면서도 관리가 용이한 실용적인 스타일입니다.',
        'MEDIUM': '미디엄 헤어는 관리의 편의성과 스타일링의 다양성을 모두 갖춘 실용적인 길이입니다. 직장인부터 학생까지 다양한 연령대에 적합합니다.',
        'BOB': '보브 헤어는 턱선 근처의 깔끔한 라인이 특징으로, 모던하고 세련된 느낌을 연출할 수 있는 클래식한 스타일입니다.',
        'SHORT': '숏 헤어는 세련되고 시크한 분위기를 연출하며, 얼굴형을 또렷하게 부각시키는 스타일입니다. 관리가 쉽고 활동적인 이미지를 표현할 수 있습니다.'
    };
    
    return descriptions[mainCategory] || `${mainCategory} 스타일에 대한 설명입니다.`;
}

// 카테고리 실시간 렌더링 (수정된 버전)
function renderCategoryRealtime(categoryData) {
    const content = document.getElementById('content');
    
    if (!categoryData || !categoryData.styles) {
        showEmptyState('실시간 카테고리 데이터를 불러올 수 없습니다');
        return;
    }

    const lengthTypes = Object.keys(categoryData.styles);
    
    if (lengthTypes.length === 0) {
        showEmptyState('등록된 스타일이 없습니다 (실시간 확인 완료)');
        return;
    }
    
    let html = `
        <div class="category-section active">
            <div class="category-description">${categoryData.description}</div>
            
            <div class="length-tabs">
    `;

    // 여성용인 경우 길이 가이드 버튼 추가
    if (currentGender === 'female') {
        html += `<div class="length-guide-btn" onclick="showLengthGuide()" title="헤어 길이 가이드">?</div>`;
    }

    const orderedLengthTypes = hierarchyStructure[currentGender]?.[currentCategory] || lengthTypes;
    let firstValidTab = null;  // 첫 번째 유효한 탭 저장
    
    orderedLengthTypes.forEach((lengthType) => {
        if (lengthTypes.includes(lengthType)) {
            if (!firstValidTab) firstValidTab = lengthType;  // 첫 번째 유효한 탭 기억
            const isActive = lengthType === firstValidTab ? 'active' : '';  // 첫 번째 유효한 탭에만 active
            html += `<div class="length-tab ${isActive}" data-length="${lengthType}" onclick="switchLengthTab('${lengthType}')">${lengthType}</div>`;
        }
    });

    html += `</div>`;

    const orderedLengthList = hierarchyStructure[currentGender]?.[currentCategory] || Object.keys(categoryData.styles);
    const primaryLengthType = firstValidTab || orderedLengthList[0];  // firstValidTab 사용
    
    for (const lengthType of orderedLengthList) {
        if (!categoryData.styles[lengthType]) continue;
        
        const styles = categoryData.styles[lengthType];
        const isActive = lengthType === primaryLengthType ? 'active' : '';  // 수정된 부분
        
        html += `<div class="length-section ${isActive}" data-length="${lengthType}">`;

        if (!styles || styles.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="empty-state-icon">✂️</div>
                    <div class="empty-state-title">${lengthType}</div>
                    <div class="empty-state-message">해당 앞머리 길이에 대한 스타일이 없습니다.<br>어드민에서 스타일을 추가해주세요.</div>
                </div>
            `;
        } else {
            html += `<div class="hairstyle-grid">`;
            
            const sortedStyles = styles.sort((a, b) => {
                const codeA = a.code || '';
                const codeB = b.code || '';
                return codeA.localeCompare(codeB);
            });
            
            sortedStyles.forEach(style => {
                const imageUrl = style.imageUrl || generatePlaceholderImage(style.name);
                
                html += `
                    <div class="hairstyle-card" onclick="openModal('${style.code || '코드없음'}', '${style.name || '이름없음'}', '${style.imageUrl || ''}')">
                        <img class="hairstyle-image" src="${imageUrl}" alt="${style.name || '이름없음'}" 
                             onerror="this.src='${generatePlaceholderImage(style.name || '이름없음')}'">
                        <div class="hairstyle-info">
                            <div class="hairstyle-code">${style.code || '코드없음'}</div>
                            <div class="hairstyle-name">${style.name || '이름없음'}</div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }

        html += `</div>`;
    }

    html += '</div>';
    content.innerHTML = html;
}

// 빈 스타일 실시간 렌더링 (수정된 버전)
function renderEmptyStylesRealtime(mainCategory, subCategories) {
    const content = document.getElementById('content');
    
    let html = `
        <div class="category-section active">
            <div class="category-description">${getMainCategoryDescription(mainCategory)}</div>
            
            <div class="length-tabs">
    `;

    // 여성용인 경우 길이 가이드 버튼 추가
    if (currentGender === 'female') {
        html += `<div class="length-guide-btn" onclick="showLengthGuide()" title="헤어 길이 가이드">?</div>`;
    }

    const orderedSubCategories = hierarchyStructure[currentGender]?.[mainCategory] || subCategories;
    let firstValidTab = null;  // 첫 번째 유효한 탭 저장
    
    orderedSubCategories.forEach((subCategory) => {
        if (!firstValidTab) firstValidTab = subCategory;  // 첫 번째 탭 기억
        const isActive = subCategory === firstValidTab ? 'active' : '';  // 첫 번째 탭에만 active
        html += `<div class="length-tab ${isActive}" data-length="${subCategory}" onclick="switchLengthTab('${subCategory}')">${subCategory}</div>`;
    });
    
    html += `</div>`;

    const orderedEmptyCategories = hierarchyStructure[currentGender]?.[mainCategory] || subCategories;
    orderedEmptyCategories.forEach((subCategory) => {
        const isActive = subCategory === firstValidTab ? 'active' : '';  // 수정된 부분
        html += `
            <div class="length-section ${isActive}" data-length="${subCategory}">
                <div class="empty-state">
                    <div class="empty-state-icon">✂️</div>
                    <div class="empty-state-title">${subCategory}</div>
                    <div class="empty-state-message">등록된 스타일이 없습니다.<br>어드민에서 스타일을 추가해주세요.</div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    content.innerHTML = html;
}

// 빈 상태 표시
function showEmptyState(message) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-title">데이터가 없습니다</div>
            <div class="empty-state-message">${message}</div>
        </div>
    `;
}

// 플레이스홀더 이미지 생성
function generatePlaceholderImage(text) {
    const encodedText = encodeURIComponent(text || '이미지 준비중');
    return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="267" viewBox="0 0 200 267"%3E%3Crect width="200" height="267" fill="%23222"%3E%3C/rect%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-family="Arial" font-size="12"%3E${encodedText}%3C/text%3E%3C/svg%3E`;
}

// 앞머리 길이 탭 전환
function switchLengthTab(lengthType) {
    document.querySelectorAll('.length-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.length === lengthType) {
            tab.classList.add('active');
        }
    });

    document.querySelectorAll('.length-section').forEach(section => {
        section.classList.remove('active');
        if (section.dataset.length === lengthType) {
            section.classList.add('active');
        }
    });
}

// 길이 가이드 모달 표시
function showLengthGuide() {
    const modalHTML = `
        <div class="length-guide-modal" id="lengthGuideModal">
            <div class="length-guide-container">
                <button class="length-guide-close" onclick="closeLengthGuide()">×</button>
                <h3>✂️ 여성 헤어 길이 가이드</h3>
                <img class="length-guide-image" 
                     src="https://lh3.googleusercontent.com/d/15OgT9k5jCC6TjcJSImuQXcznS_HtFBVf=s1600" 
                     alt="여성 헤어 길이 가이드"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 300\'%3E%3Crect width=\'400\' height=\'300\' fill=\'%23f0f0f0\'/%3E%3Ctext x=\'200\' y=\'150\' text-anchor=\'middle\' font-family=\'Arial\' font-size=\'16\' fill=\'%23666\'%3E이미지를 불러올 수 없습니다%3C/text%3E%3C/svg%3E'">
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 길이 가이드 모달 닫기
function closeLengthGuide() {
    const modal = document.getElementById('lengthGuideModal');
    if (modal) {
        modal.remove();
    }
}

// ========== 모달 관련 ==========
// 모달 초기화
function initializeModal() {
    const modal = document.getElementById('imageModal');
    const span = document.getElementsByClassName('close')[0];

    span.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

// 모달 열기
function openModal(code, name, imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCode = document.getElementById('modalCode');
    const modalName = document.getElementById('modalName');
    const likeBtn = document.getElementById('likeBtn');

    const finalImageUrl = imageUrl || generatePlaceholderImage(name);
    
    modalImage.src = finalImageUrl;
    modalCode.textContent = code;
    modalName.textContent = name;
    
    currentStyleCode = code;
    currentStyleName = name;
    currentStyleImage = imageUrl;
    
    likeBtn.classList.remove('liked');
    likeBtn.textContent = '❤️ 좋아요';
    
    modal.style.display = 'block';
}

// ========== PWA 관련 ==========
// PWA 설치 안내 및 서비스 워커 등록
function initializePWA() {
    console.log('🚫 Service Worker 등록 비활성화 (오류 방지)');
    
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('📱 PWA 설치 프롬프트 감지');
        e.preventDefault();
        deferredPrompt = e;
        
        showInstallPrompt();
    });
    
    window.addEventListener('appinstalled', (evt) => {
        console.log('🎉 PWA 설치 완료');
        showDeviceOptimizationNotice('🎉 앱이 성공적으로 설치되었습니다!');
    });
    
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
        console.log('📱 PWA 모드로 실행 중');
        showDeviceOptimizationNotice('📱 PWA 모드로 실행 중입니다');
    } else {
        console.log('🌐 브라우저 모드로 실행 중');
        setTimeout(() => {
            showInstallPrompt();
        }, 3000);
    }
}

// PWA 설치 안내 표시
function showInstallPrompt() {
    const notice = document.getElementById('deviceNotice');
    notice.innerHTML = '📱 홈 화면에 추가하여 앱처럼 사용하세요!';
    notice.className = 'device-notice show';
    
    setTimeout(() => {
        notice.classList.remove('show');
    }, 10000);
}

// 기기별 최적화 안내 표시
function showDeviceOptimizationNotice(customMessage = null) {
    const notice = document.getElementById('deviceNotice');
    
    if (customMessage) {
        notice.innerHTML = customMessage;
        notice.className = 'device-notice show';
        setTimeout(() => {
            notice.classList.remove('show');
        }, 5000);
        return;
    }
    
    notice.innerHTML = '📱 모든 기기에서 가로 스와이프로 스타일을 확인하세요';
    notice.className = 'device-notice show';
    
    setTimeout(() => {
        notice.classList.remove('show');
    }, 5000);
}

// iOS Safari 주소창 숨기기
function hideAddressBar() {
    setTimeout(function() {
        window.scrollTo(0, 1);
    }, 0);
}

// 스와이프 새로고침 완전 방지 강화
function preventPullToRefresh() {
    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('gesturechange', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('gestureend', function(e) {
        e.preventDefault();
    });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    let startY = 0;
    let startX = 0;
    
    document.addEventListener('touchstart', function(e) {
        startY = e.touches[0].pageY;
        startX = e.touches[0].pageX;
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        const y = e.touches[0].pageY;
        const x = e.touches[0].pageX;
        const deltaY = y - startY;
        const deltaX = x - startX;
        
        if (window.scrollY === 0 && deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
            e.preventDefault();
            console.log('🚫 스와이프 새로고침 방지됨');
        }
    }, { passive: false });
    
    document.body.addEventListener('touchmove', function(e) {
        if (window.scrollY === 0 && e.touches[0].pageY > startY) {
            e.preventDefault();
        }
    }, { passive: false });
    
    console.log('✅ 스와이프 새로고침 완전 방지 설정 완료');
}

// ========== 동기화 상태 ==========
function updateSyncStatus(status, message) {
    const syncStatus = document.getElementById('syncStatus');
    if (syncStatus) {
        syncStatus.textContent = message;
        syncStatus.className = 'sync-status ' + status;
        syncStatus.style.display = 'block';
        
        if (status === 'connected') {
            setTimeout(() => {
                syncStatus.style.opacity = '0';
                setTimeout(() => {
                    syncStatus.style.display = 'none';
                    syncStatus.style.opacity = '1';
                }, 1000);
            }, 3000);
        } else {
            syncStatus.style.opacity = '1';
            syncStatus.style.display = 'block';
        }
    }
}

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
    initializeModal();
    initializePWA();
    preventPullToRefresh();
    hideAddressBar();
    
    if (!checkExistingSession()) {
        console.log('🔐 새로운 세션 - 로그인 필요');
    }
    
    console.log('🚀 HAIRGATOR 최종 완전 버전 로드 완료! (프로모션 + 프로필 기능 포함)');
});

// 페이지 로드 시 초기화
window.addEventListener('load', function() {
    console.log('🎉 HAIRGATOR 최종 완전 버전 완료! (프로모션 + 프로필 + 알림 시스템)');
    
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('📱 PWA 독립 실행 모드');
        showDeviceOptimizationNotice('📱 PWA 앱 모드로 실행 중');
    }
});
