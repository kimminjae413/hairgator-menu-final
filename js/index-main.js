// HAIRGATOR 메인 JavaScript

// ========== 전역 변수 ==========
let selectedGender = null;
let currentCategory = null;
let currentSubCategory = null;
let categoryData = {};
let currentStyle = null;

// ========== 초기화 ==========
document.addEventListener('DOMContentLoaded', () => {
   console.log('🚀 HAIRGATOR 메인 앱 시작');
   
   // 디자이너 로그인 확인
   const designerInfo = localStorage.getItem('designerInfo');
   if (!designerInfo) {
       // 로그인 화면 표시
       document.getElementById('designerLogin').style.display = 'flex';
       document.getElementById('genderSelection').style.display = 'none';
       document.getElementById('mainContainer').style.display = 'none';
   } else {
       // 성별 선택 화면으로
       const designer = JSON.parse(designerInfo);
       console.log(`✅ 로그인된 디자이너: ${designer.name}`);
       document.getElementById('designerLogin').style.display = 'none';
       document.getElementById('genderSelection').style.display = 'flex';
       document.getElementById('mainContainer').style.display = 'none';
       
       // 햄버거 메뉴에 디자이너 이름 표시
       const menuDesignerName = document.getElementById('menuDesignerName');
       if (menuDesignerName) {
           menuDesignerName.textContent = `🎨 ${designer.name} 디자이너`;
       }
   }
   
   // 기기 안내 메시지 표시
   setTimeout(() => {
       const deviceNotice = document.getElementById('deviceNotice');
       if (deviceNotice) {
           deviceNotice.style.display = 'none';
       }
   }, 5000);
});

// ========== 디자이너 로그인 ==========
function checkDesignerLogin() {
   const name = document.getElementById('designerName').value.trim();
   const phone = document.getElementById('designerPhone').value.trim();
   const pin = document.getElementById('designerPin').value.trim();
   
   if (!name || !phone || !pin) {
       showLoginResult('모든 정보를 입력해주세요.', 'error');
       return;
   }
   
   if (phone.length !== 4) {
       showLoginResult('휴대폰 끝 4자리를 정확히 입력해주세요.', 'error');
       return;
   }
   
   if (pin.length !== 4) {
       showLoginResult('비밀번호는 4자리여야 합니다.', 'error');
       return;
   }
   
   // 디자이너 정보 저장
   const designerInfo = {
       name: name,
       phone: phone,
       pin: pin,
       designerId: `${name}_${phone}_${pin}`,
       loginTime: new Date().toISOString()
   };
   
   localStorage.setItem('designerInfo', JSON.stringify(designerInfo));
   
   showLoginResult(`환영합니다, ${name} 디자이너님!`, 'success');
   
   // 2초 후 성별 선택 화면으로 전환
   setTimeout(() => {
       document.getElementById('designerLogin').style.display = 'none';
       document.getElementById('genderSelection').style.display = 'flex';
       
       // 햄버거 메뉴에 디자이너 이름 표시
       const menuDesignerName = document.getElementById('menuDesignerName');
       if (menuDesignerName) {
           menuDesignerName.textContent = `🎨 ${name} 디자이너`;
       }
   }, 1500);
}

function showLoginResult(message, type) {
   const resultDiv = document.getElementById('loginResult');
   resultDiv.textContent = message;
   resultDiv.className = `check-result ${type}`;
   resultDiv.style.display = 'block';
}

// ========== 성별 선택 ==========
function selectGender(gender) {
   selectedGender = gender;
   console.log(`🎯 성별 선택: ${gender}`);
   
   // 성별에 따른 테마 색상 적용
   document.body.setAttribute('data-gender', gender);
   
   // UI 전환
   document.getElementById('genderSelection').style.display = 'none';
   document.getElementById('mainContainer').style.display = 'block';
   document.getElementById('mainContainer').classList.add('active');
   
   // 고객 추가 버튼 표시
   const addCustomerBtn = document.getElementById('addCustomerBtn');
   if (addCustomerBtn) {
       addCustomerBtn.style.display = 'block';
   }
   
   // Firebase 연결 확인 후 카테고리 로드
   loadCategoryData();
}

// ========== 카테고리 데이터 로드 ==========
async function loadCategoryData() {
   console.log(`📂 ${selectedGender} 카테고리 데이터 로드 시작...`);
   
   // Firebase 연결 대기 (최대 5초)
   let attempts = 0;
   const maxAttempts = 50;
   
   const waitForFirebase = setInterval(() => {
       attempts++;
       
       if (window.db) {
           clearInterval(waitForFirebase);
           console.log('✅ Firebase 연결 확인');
           loadCategoriesFromFirebase();
       } else if (attempts >= maxAttempts) {
           clearInterval(waitForFirebase);
           console.log('⚠️ Firebase 연결 시간 초과, 오프라인 모드 사용');
           loadOfflineCategories();
       }
   }, 100);
}

// Firebase에서 카테고리 로드
async function loadCategoriesFromFirebase() {
   try {
       const snapshot = await window.db.collection('category_hierarchy')
           .where('gender', '==', selectedGender)
           .get();
           
       if (snapshot.empty) {
           console.log('⚠️ Firebase에 카테고리 데이터가 없습니다');
           loadOfflineCategories();
           return;
       }
       
       // 데이터 구조 재구성
       categoryData = { categories: {} };
       
       snapshot.forEach(doc => {
           const data = doc.data();
           const mainCat = data.mainCategory;
           const subCat = data.subCategory;
           
           if (!categoryData.categories[mainCat]) {
               categoryData.categories[mainCat] = {
                   name: mainCat,
                   description: getCategoryDescription(selectedGender, mainCat),
                   subcategories: {}
               };
           }
           
           if (!categoryData.categories[mainCat].subcategories[subCat]) {
               categoryData.categories[mainCat].subcategories[subCat] = {
                   name: subCat,
                   description: ''
               };
           }
       });
       
       console.log('✅ Firebase 카테고리 로드 완료:', categoryData);
       displayCategories();
       
   } catch (error) {
       console.error('❌ Firebase 로드 오류:', error);
       loadOfflineCategories();
   }
}

// 오프라인 카테고리 데이터
function loadOfflineCategories() {
   console.log('📱 오프라인 카테고리 데이터 사용');
   
   if (selectedGender === 'male') {
       categoryData = {
           categories: {
               'SIDE FRINGE': {
                   name: 'SIDE FRINGE',
                   description: '사이드 프린지는 삼칠 볼륨이 있으면서 앞으로 떨어지는 스타일입니다.',
                   subcategories: {
                       'Fore Head': { name: 'Fore Head' },
                       'Eye Brow': { name: 'Eye Brow' }
                   }
               },
               'SIDE PART': {
                   name: 'SIDE PART',
                   description: '사이드 파트는 클래식함과 모던함의 대명사입니다.',
                   subcategories: {
                       'None': { name: 'None' },
                       'Fore Head': { name: 'Fore Head' },
                       'Eye Brow': { name: 'Eye Brow' },
                       'Eye': { name: 'Eye' },
                       'Cheekbone': { name: 'Cheekbone' }
                   }
               },
               'FRINGE UP': {
                   name: 'FRINGE UP',
                   description: '프린지 업은 짧고 자연스럽게 프린지를 올려놓은 스타일입니다.',
                   subcategories: {
                       'None': { name: 'None' },
                       'Fore Head': { name: 'Fore Head' }
                   }
               },
               'PUSHED BACK': {
                   name: 'PUSHED BACK',
                   description: '푸시드 백은 앞머리 부분의 볼륨감을 강조한 스타일입니다.',
                   subcategories: {
                       'None': { name: 'None' }
                   }
               },
               'BUZZ': {
                   name: 'BUZZ',
                   description: '버즈컷은 클리퍼의 길이에 따라 다양한 스타일을 연출할 수 있습니다.',
                   subcategories: {
                       'None': { name: 'None' }
                   }
               },
               'CROP': {
                   name: 'CROP',
                   description: '크롭컷은 매우 짧은 라운드 형태의 스타일입니다.',
                   subcategories: {
                       'None': { name: 'None' }
                   }
               },
               'MOHICAN': {
                   name: 'MOHICAN',
                   description: '모히칸은 개성이 넘치는 스타일입니다.',
                   subcategories: {
                       'None': { name: 'None' }
                   }
               }
           }
       };
   } else {
       categoryData = {
           categories: {
               'LONG': {
                   name: 'LONG',
                   description: '롱헤어는 여성스러움과 우아함을 표현합니다.',
                   subcategories: {
                       'A Length': { name: 'A Length' },
                       'B Length': { name: 'B Length' }
                   }
               },
               'SEMI LONG': {
                   name: 'SEMI LONG',
                   description: '세미롱은 관리하기 쉬우면서도 다양한 스타일링이 가능합니다.',
                   subcategories: {
                       'C Length': { name: 'C Length' }
                   }
               },
               'MEDIUM': {
                   name: 'MEDIUM',
                   description: '미디엄 헤어는 활동적이면서도 여성스러운 매력을 표현합니다.',
                   subcategories: {
                       'D Length': { name: 'D Length' },
                       'E Length': { name: 'E Length' }
                   }
               },
               'BOB': {
                   name: 'BOB',
                   description: '보브컷은 클래식하면서도 모던한 느낌을 줍니다.',
                   subcategories: {
                       'F Length': { name: 'F Length' },
                       'G Length': { name: 'G Length' }
                   }
               },
               'SHORT': {
                   name: 'SHORT',
                   description: '숏헤어는 시크하고 세련된 이미지를 연출합니다.',
                   subcategories: {
                       'H Length': { name: 'H Length' }
                   }
               }
           }
       };
   }
   
   displayCategories();
}

// 카테고리 설명 가져오기
function getCategoryDescription(gender, category) {
   const descriptions = {
       male: {
           'SIDE FRINGE': '사이드 프린지는 삼칠 볼륨이 있으면서 앞으로 떨어지는 스타일과 옆머리 숱을 쳐서 소프트한 시스루 느낌을 다양하게 표현 할 수 있습니다.',
           'SIDE PART': '사이드 파트는 클래식함과 모던함의 대명사로 스타일링에 따라 원하는 이미지를 자유롭게 표현할 수 있습니다.',
           'FRINGE UP': '프린지 업은 흔히 아이비리그 헤어라고도 하며 짧고 자연스럽게 프린지를 올려놓은 짧은 머리 스타일입니다.',
           'PUSHED BACK': '푸시드 백은 앞머리 부분의 볼륨감을 강조한 스타일로써, 밑부분은 짧게 남기면서 뒤로 갈수록 볼륨이 작아지는 것이 특징인 스타일입니다.',
           'BUZZ': '버즈컷은 흔히 반삭이라고하여 클리퍼의 길이와 밑머리 스타일에 따라 다양한 스타일을 연출할 수 있습니다.',
           'CROP': '크롭컷은 매우 짧은 라운드 형태로 깔끔하면서도 세련된 남성미를 강조한 스타일입니다.',
           'MOHICAN': '모히칸은 옆머리를 짧게 하고 윗머리에 엣지(EDGE)감을 표현하여, 동그런 얼굴형을 보완 할 수 있는 개성이 넘치는 스타일입니다.'
       },
       female: {
           'LONG': '롱헤어는 여성스러움과 우아함을 동시에 표현할 수 있는 스타일입니다.',
           'SEMI LONG': '세미롱은 관리하기 쉬우면서도 다양한 스타일링이 가능한 길이입니다.',
           'MEDIUM': '미디엄 헤어는 활동적이면서도 여성스러운 매력을 표현할 수 있습니다.',
           'BOB': '보브컷은 클래식하면서도 모던한 느낌을 주는 대표적인 여성 헤어스타일입니다.',
           'SHORT': '숏헤어는 시크하고 세련된 이미지를 연출하는 스타일입니다.'
       }
   };
   
   return descriptions[gender]?.[category] || '';
}

// ========== 카테고리 표시 ==========
function displayCategories() {
   const navTabs = document.getElementById('navTabs');
   const content = document.getElementById('content');
   
   if (!navTabs || !content) {
       console.error('UI 요소를 찾을 수 없습니다');
       return;
   }
   
   navTabs.innerHTML = '';
   content.innerHTML = '';
   
   if (!categoryData.categories || Object.keys(categoryData.categories).length === 0) {
       content.innerHTML = `
           <div class="empty-state">
               <div class="empty-state-icon">📂</div>
               <div class="empty-state-title">카테고리가 없습니다</div>
               <div class="empty-state-message">
                   <a href="/admin.html" target="_blank" style="color: #FF1493;">
                       관리자 페이지에서 초기화를 실행해주세요
                   </a>
               </div>
           </div>
       `;
       return;
   }
   
   let firstCategory = null;
   
   // 카테고리별 탭과 콘텐츠 생성
   Object.entries(categoryData.categories).forEach(([categoryKey, category], index) => {
       if (index === 0) firstCategory = categoryKey;
       
       // 탭 생성
       const tab = document.createElement('button');
       tab.className = 'nav-tab';
       tab.textContent = category.name;
       tab.onclick = () => selectCategory(categoryKey);
       navTabs.appendChild(tab);
       
       // 콘텐츠 섹션 생성
       const section = document.createElement('div');
       section.className = 'category-section';
       section.id = `category-${categoryKey.replace(/\s+/g, '-')}`;
       
       // 카테고리 설명
       if (category.description) {
           const desc = document.createElement('div');
           desc.className = 'category-description';
           desc.textContent = category.description;
           section.appendChild(desc);
       }
       
       // 하위 카테고리별 스타일 표시
       if (category.subcategories) {
           Object.entries(category.subcategories).forEach(([subKey, subCategory]) => {
               const subSection = document.createElement('div');
               subSection.className = 'subcategory-container';
               
               // 제목
               const title = document.createElement('h3');
               title.textContent = subCategory.name;
               subSection.appendChild(title);
               
               // 스타일 그리드
               const grid = document.createElement('div');
               grid.className = 'hairstyle-grid';
               grid.id = `grid-${categoryKey}-${subKey}`.replace(/\s+/g, '-');
               subSection.appendChild(grid);
               
               section.appendChild(subSection);
               
               // 스타일 로드
               loadStyles(categoryKey, subKey, grid);
           });
       }
       
       content.appendChild(section);
   });
   
   // 첫 번째 카테고리 선택
   if (firstCategory) {
       selectCategory(firstCategory);
   }
}

// ========== 카테고리 선택 ==========
function selectCategory(categoryKey) {
   currentCategory = categoryKey;
   
   // 탭 활성화
   document.querySelectorAll('.nav-tab').forEach((tab, index) => {
       const categories = Object.keys(categoryData.categories);
       if (categories[index] === categoryKey) {
           tab.classList.add('active');
       } else {
           tab.classList.remove('active');
       }
   });
   
   // 섹션 표시
   document.querySelectorAll('.category-section').forEach(section => {
       if (section.id === `category-${categoryKey.replace(/\s+/g, '-')}`) {
           section.classList.add('active');
       } else {
           section.classList.remove('active');
       }
   });
}

// ========== 스타일 로드 ==========
async function loadStyles(categoryKey, subKey, container) {
   if (!window.db) {
       // 오프라인 모드 - 샘플 데이터 표시
       loadOfflineStyles(categoryKey, subKey, container);
       return;
   }
   
   try {
       const snapshot = await window.db.collection('hairstyles')
           .where('gender', '==', selectedGender)
           .where('mainCategory', '==', categoryKey)
           .where('subCategory', '==', subKey)
           .get();
           
       if (snapshot.empty) {
           container.innerHTML = '<div class="empty-state">등록된 스타일이 없습니다</div>';
           return;
       }
       
       container.innerHTML = '';
       snapshot.forEach(doc => {
           const style = { id: doc.id, ...doc.data() };
           const card = createStyleCard(style);
           container.appendChild(card);
       });
       
   } catch (error) {
       console.error('스타일 로드 오류:', error);
       loadOfflineStyles(categoryKey, subKey, container);
   }
}

// 오프라인 스타일 데이터
function loadOfflineStyles(categoryKey, subKey, container) {
   // 샘플 스타일 데이터
   const sampleStyles = [
       { code: 'SAMPLE001', name: '샘플 스타일 1', imageUrl: 'placeholder.jpg' },
       { code: 'SAMPLE002', name: '샘플 스타일 2', imageUrl: 'placeholder.jpg' },
       { code: 'SAMPLE003', name: '샘플 스타일 3', imageUrl: 'placeholder.jpg' }
   ];
   
   container.innerHTML = '';
   sampleStyles.forEach(style => {
       const card = createStyleCard(style);
       container.appendChild(card);
   });
}

// 스타일 카드 생성
function createStyleCard(style) {
   const card = document.createElement('div');
   card.className = 'hairstyle-item';
   card.onclick = () => openImageModal(style);
   
   card.innerHTML = `
       <img src="${style.imageUrl || 'placeholder.jpg'}" 
            alt="${style.name}" 
            onerror="this.src='placeholder.jpg'">
       <h4>${style.code || 'N/A'}</h4>
       <p>${style.name || 'N/A'}</p>
   `;
   
   return card;
}

// ========== 이미지 모달 ==========
function openImageModal(style) {
   currentStyle = style;
   
   const modal = document.getElementById('imageModal');
   const modalImage = document.getElementById('modalImage');
   const modalCode = document.getElementById('modalCode');
   const modalName = document.getElementById('modalName');
   
   modalImage.src = style.imageUrl || 'placeholder.jpg';
   modalCode.textContent = style.code || 'N/A';
   modalName.textContent = style.name || 'N/A';
   
   modal.style.display = 'block';
   
   // 좋아요 상태 확인
   checkStyleLikeStatus();
}

function checkStyleLikeStatus() {
   // 좋아요 상태 확인 로직
   const likeBtn = document.getElementById('likeBtn');
   if (likeBtn) {
       // TODO: Firebase에서 좋아요 상태 확인
       likeBtn.classList.remove('liked');
   }
}

function toggleStyleLike() {
   const likeBtn = document.getElementById('likeBtn');
   likeBtn.classList.toggle('liked');
   
   // TODO: Firebase에 좋아요 상태 저장
}

// 모달 닫기
document.querySelector('.modal .close')?.addEventListener('click', () => {
   document.getElementById('imageModal').style.display = 'none';
});

// ========== 햄버거 메뉴 ==========
function toggleHamburgerMenu() {
   const overlay = document.getElementById('hamburgerOverlay');
   overlay.classList.toggle('active');
}

function closeHamburgerMenu() {
   const overlay = document.getElementById('hamburgerOverlay');
   overlay.classList.remove('active');
}

function logoutDesigner() {
   if (confirm('로그아웃 하시겠습니까?')) {
       localStorage.removeItem('designerInfo');
       location.reload();
   }
}

function closeApp() {
   if (window.close) {
       window.close();
   } else {
       alert('브라우저에서 직접 탭을 닫아주세요.');
   }
}

// ========== 기타 기능 ==========
function backToGenderSelection() {
   document.getElementById('mainContainer').style.display = 'none';
   document.getElementById('genderSelection').style.display = 'flex';
   
   // 상태 초기화
   selectedGender = null;
   currentCategory = null;
   categoryData = {};
}

function showEmptyState() {
   const content = document.getElementById('content');
   content.innerHTML = `
       <div class="empty-state">
           <div class="empty-state-icon">📂</div>
           <div class="empty-state-title">카테고리가 없습니다</div>
           <div class="empty-state-message">
               <a href="/admin.html" target="_blank" style="color: #FF1493;">
                   관리자 페이지에서 초기화를 실행해주세요
               </a>
           </div>
       </div>
   `;
}

// 동기화 상태 업데이트
function updateSyncStatus(message) {
   const syncStatus = document.getElementById('syncStatus');
   if (syncStatus) {
       syncStatus.textContent = message;
       setTimeout(() => {
           syncStatus.style.opacity = '0';
       }, 3000);
   }
}

console.log('✅ index-main.js 로드 완료');

// ========== 전역 함수 등록 ==========
// HTML에서 접근 가능하도록 window 객체에 등록
window.checkDesignerLogin = checkDesignerLogin;
window.selectGender = selectGender;
window.backToGenderSelection = backToGenderSelection;
window.toggleHamburgerMenu = toggleHamburgerMenu;
window.closeHamburgerMenu = closeHamburgerMenu;
window.showCustomerSearch = showCustomerSearch;
window.showPopularityStats = showPopularityStats;
window.openAIFaceAnalysis = openAIFaceAnalysis;
window.logoutDesigner = logoutDesigner;
window.closeApp = closeApp;
window.showNewCustomerModal = showNewCustomerModal;
window.toggleStyleLike = toggleStyleLike;
window.showCustomerRegisterModal = showCustomerRegisterModal;
window.selectCategory = selectCategory;
window.openImageModal = openImageModal;
window.closeModal = function() {
    document.getElementById('imageModal').style.display = 'none';
};

console.log('✅ 전역 함수 등록 완료');
