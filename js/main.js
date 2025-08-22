// HAIRGATOR - 최적화된 메인 로직
document.addEventListener('DOMContentLoaded',function(){
if(!window.firebaseInitialized){window.addEventListener('firebaseReady',initApp);}else{initApp();}
});

function initApp(){
// 전역 변수
let currentGender=null,currentCategory=null,currentSubcategory='None',menuData={};

// 엘리먼트 캐싱
const el={
backBtn:document.getElementById('backBtn'),
menuBtn:document.getElementById('menuBtn'),
sidebar:document.getElementById('sidebar'),
sidebarClose:document.getElementById('sidebarClose'),
themeToggle:document.getElementById('themeToggle'),
themeToggleBottom:document.getElementById('themeToggleBottom'),
themeStatus:document.getElementById('themeStatus'),
logoutBtn:document.getElementById('logoutBtn'),
genderSelection:document.getElementById('genderSelection'),
menuContainer:document.getElementById('menuContainer'),
categoryTabs:document.getElementById('categoryTabs'),
categoryDescription:document.getElementById('categoryDescription'),
subcategoryTabs:document.getElementById('subcategoryTabs'),
menuGrid:document.getElementById('menuGrid'),
loadingOverlay:document.getElementById('loadingOverlay'),
styleModal:document.getElementById('styleModal'),
modalClose:document.getElementById('modalClose'),
modalImage:document.getElementById('modalImage'),
modalCode:document.getElementById('modalCode'),
modalName:document.getElementById('modalName'),
btnRegister:document.getElementById('btnRegister'),
btnLike:document.getElementById('btnLike')
};

// 메뉴 데이터
const MENU_DATA={
male:{
categories:[
{id:'side-fringe',name:'SIDE FRINGE',description:'사이드 프린지는 클래식함과 모던함의 대명사로 스타일링이 따라 원하는 이미지를 자유롭게 표현할 수 있습니다. 가르마를 기준으로 단순히 넘어가는 스타일을 넘어 개인의 특성과 트렌드에 맞춰 고급 테이퍼링을 표현하는 것이 매우 중요합니다.'},
{id:'side-part',name:'SIDE PART',description:'사이드 파트는 정갈하고 단정한 스타일로 비즈니스맨들에게 인기가 많습니다.'},
{id:'fringe-up',name:'FRINGE UP',description:'프린지 업은 앞머리를 올려 이마를 드러내는 시원한 스타일입니다.'},
{id:'pushed-back',name:'PUSHED BACK',description:'푸시백은 머리를 뒤로 넘긴 댄디한 스타일입니다.'},
{id:'buzz',name:'BUZZ',description:'버즈컷은 짧고 깔끔한 스타일로 관리가 편합니다.'},
{id:'crop',name:'CROP',description:'크롭 스타일은 짧으면서도 스타일리시한 느낌을 줍니다.'},
{id:'mohican',name:'MOHICAN',description:'모히칸 스타일은 개성 있고 강한 인상을 줍니다.'}
],
subcategories:['None','Fore Head','Eye Brow','Eye','Cheekbone']
},
female:{
categories:[
{id:'a-length',name:'A Length',description:'A 길이는 가슴선 아래로 내려오는 롱헤어로, 원랭스·레이어드 롱·굵은 S컬이 잘 맞아 우아하고 드라마틱한 분위기를 냅니다.'},
{id:'b-length',name:'B Length',description:'B 길이는 가슴 아래(A)와 쇄골 아래(C) 사이의 미디엄-롱으로, 레이어드 미디엄롱·바디펌이 어울려 부드럽고 실용적인 인상을 줍니다.'},
{id:'c-length',name:'C Length',description:'C 길이는 쇄골 라인 아래의 세미 롱으로, 레이어드 C/S컬·에어리펌과 잘 맞아 단정하고 세련된 오피스 무드를 냅니다.'},
{id:'d-length',name:'D Length',description:'D 길이는 어깨에 정확히 닿는 길이로, LOB·숄더 C컬·빌드펌이 어울려 트렌디하고 깔끔한 느낌을 줍니다.'},
{id:'e-length',name:'E Length',description:'E 길이는 어깨 바로 위의 단발로, 클래식 보브·A라인 보브·내/외 C컬이 잘 맞아 경쾌하고 모던한 인상을 만듭니다.'},
{id:'f-length',name:'F Length',description:'F 길이는 턱선 바로 밑 보브 길이로, 프렌치 보브·일자 단발·텍스처 보브가 어울려 시크하고 도회적인 분위기를 연출합니다.'},
{id:'g-length',name:'G Length',description:'G 길이는 턱선과 같은 높이의 미니 보브로, 클래식 턱선 보브·미니 레이어 보브가 잘 맞아 또렷하고 미니멀한 무드를 줍니다.'},
{id:'h-length',name:'H Length',description:'H 길이는 귀선~베리숏 구간의 숏헤어로, 픽시·샤그 숏·허쉬 숏 등이 어울려 활동적이고 개성 있는 스타일을 완성합니다.'}
],
subcategories:['None','Fore Head','Eye Brow','Eye','Cheekbone']
}
};

// 이벤트 리스너 최적화
function setupEvents(){
// 네비게이션
el.backBtn?.addEventListener('click',()=>{
if(el.menuContainer.classList.contains('active')){
el.menuContainer.classList.remove('active');
el.genderSelection.style.display='flex';
el.backBtn.style.display='none';
el.themeToggleBottom&&(el.themeToggleBottom.style.display='flex');
currentGender=currentCategory=null;
}
});

// 사이드바
el.menuBtn?.addEventListener('click',()=>el.sidebar.classList.add('active'));
el.sidebarClose?.addEventListener('click',()=>el.sidebar.classList.remove('active'));

// 테마
[el.themeToggle,el.themeToggleBottom].forEach(btn=>{
btn?.addEventListener('click',()=>{
document.body.classList.toggle('light-theme');
const isLight=document.body.classList.contains('light-theme');
el.themeStatus&&(el.themeStatus.textContent=isLight?'OFF':'ON');
localStorage.setItem('hairgator_theme',isLight?'light':'dark');
});
});

// 로그아웃
el.logoutBtn?.addEventListener('click',async()=>{
if(confirm('로그아웃 하시겠습니까?')){
try{window.authManager&&await window.authManager.signOut();location.reload();}
catch(e){console.error('Logout error:',e);}
}
});

// 성별 선택
document.querySelectorAll('.gender-btn').forEach(btn=>{
btn.addEventListener('click',function(){
console.log('성별 버튼 클릭됨:', this.dataset.gender);
selectGender(this.dataset.gender);
});
});

// 모달
el.modalClose?.addEventListener('click',closeModal);
el.styleModal?.addEventListener('click',e=>{if(e.target===el.styleModal)closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&el.styleModal?.classList.contains('active'))closeModal();});

// 외부 클릭
document.addEventListener('click',e=>{
if(el.sidebar?.classList.contains('active')&&!el.sidebar.contains(e.target)&&!el.menuBtn.contains(e.target)){
el.sidebar.classList.remove('active');
}
});
}

// 테마 로드
function loadTheme(){
const savedTheme=localStorage.getItem('hairgator_theme')||'dark';
if(savedTheme==='light'){
document.body.classList.add('light-theme');
el.themeStatus&&(el.themeStatus.textContent='OFF');
}
}

// 인증 상태 체크
function checkAuth(){
const info=document.getElementById('designerInfo');
if(window.auth?.currentUser){
info&&(info.style.display='block');
const nameEl=document.getElementById('designerName');
nameEl&&(nameEl.textContent=window.auth.currentUser.displayName||window.auth.currentUser.email);
}
}

// 성별 선택
function selectGender(gender){
console.log('📱 성별 선택 함수 실행:', gender);
if(!gender){
console.error('❌ 성별이 전달되지 않음');
return;
}

currentGender=gender;
console.log('✅ 현재 성별 설정됨:', currentGender);

// DOM 요소 확인
if(!el.genderSelection || !el.menuContainer){
console.error('❌ 필수 DOM 요소를 찾을 수 없음');
return;
}

el.genderSelection.style.display='none';
el.menuContainer.classList.add('active');
el.backBtn&&(el.backBtn.style.display='flex');
el.themeToggleBottom&&(el.themeToggleBottom.style.display='none');

console.log('📋 메뉴 데이터 로드 시작...');
loadMenuData(gender);
localStorage.setItem('hairgator_gender',gender);
}

// 메뉴 데이터 로드
function loadMenuData(gender){
showLoading(true);
menuData=MENU_DATA[gender];
renderCategories(gender);
if(menuData.categories.length>0)selectCategory(menuData.categories[0],gender);
setTimeout(()=>showLoading(false),300);
}

// 카테고리 렌더링
function renderCategories(gender){
el.categoryTabs.innerHTML='';
if(gender==='female'){
const helpTab=document.createElement('button');
helpTab.className='category-tab help-tab';
helpTab.innerHTML='?';
helpTab.addEventListener('click',()=>window.open('https://drive.google.com/file/d/15OgT9k5jCC6TjcJSImuQXcznS_HtFBVf/view?usp=sharing','_blank'));
el.categoryTabs.appendChild(helpTab);
}
menuData.categories.forEach((cat,idx)=>{
const tab=document.createElement('button');
tab.className='category-tab';
tab.textContent=cat.name;
tab.dataset.categoryId=cat.id;
if(idx===0)tab.classList.add('active',gender);
tab.addEventListener('click',()=>selectCategory(cat,gender));
el.categoryTabs.appendChild(tab);
});
}

// 카테고리 선택
function selectCategory(category,gender){
currentCategory=category;
document.querySelectorAll('.category-tab').forEach(tab=>{
if(tab.classList.contains('help-tab'))return;
tab.classList.remove('active','male','female');
if(tab.dataset.categoryId===category.id)tab.classList.add('active',gender);
});
el.categoryDescription.textContent=category.description;
renderSubcategories(gender);
loadStyles(category.id,currentSubcategory,gender);
}

// 중분류 렌더링
function renderSubcategories(gender){
el.subcategoryTabs.innerHTML='';
menuData.subcategories.forEach((sub,idx)=>{
const tab=document.createElement('button');
tab.className='subcategory-tab';
tab.textContent=sub;
tab.dataset.subcategory=sub;
if(idx===0){
tab.classList.add('active',gender);
currentSubcategory=sub;
}
tab.addEventListener('click',()=>selectSubcategory(sub,gender));
el.subcategoryTabs.appendChild(tab);
});
}

// 중분류 선택
function selectSubcategory(subcategory,gender){
currentSubcategory=subcategory;
document.querySelectorAll('.subcategory-tab').forEach(tab=>{
tab.classList.remove('active','male','female');
if(tab.dataset.subcategory===subcategory)tab.classList.add('active',gender);
});
loadStyles(currentCategory.id,subcategory,gender);
}

// 스타일 로드
async function loadStyles(categoryId,subcategory,gender){
el.menuGrid.innerHTML='<div class="loading"><div class="loading-spinner"></div></div>';
try{
if(!window.db){
el.menuGrid.innerHTML='<div style="color:#999;text-align:center;padding:40px">Firebase 연결 중...</div>';
return;
}
const categoryName=currentCategory.name;
const snapshot=await window.db.collection('hairstyles')
.where('gender','==',gender)
.where('mainCategory','==',categoryName)
.where('subCategory','==',subcategory)
.get();

el.menuGrid.innerHTML='';
if(snapshot.empty){
el.menuGrid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999"><div style="font-size:48px;margin-bottom:20px">📭</div><div>등록된 스타일이 없습니다</div><div style="font-size:12px;margin-top:10px">${categoryName} - ${subcategory}</div></div>`;
return;
}

snapshot.forEach(doc=>{
const data=doc.data();
const item=document.createElement('div');
item.className=`menu-item ${gender}`;
item.innerHTML=`<img src="${data.imageUrl||''}" alt="${data.name||'Style'}" class="menu-item-image" onerror="this.style.display='none';this.parentElement.style.background='linear-gradient(135deg,#667eea 0%,#764ba2 100%)'">`;
item.addEventListener('click',()=>showStyleDetail(data.code,data.name,gender,data.imageUrl,doc.id));
el.menuGrid.appendChild(item);
});
}catch(e){
console.error('Load styles error:',e);
el.menuGrid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:40px;color:#f44"><div>데이터 로드 실패</div><div style="font-size:12px;margin-top:10px">${e.message}</div></div>`;
}
}

// 모달 닫기
function closeModal(){el.styleModal?.classList.remove('active');}

// 스타일 상세 보기
function showStyleDetail(code,name,gender,imageSrc,docId){
if(!el.styleModal)return;
el.modalImage.src=imageSrc||'';
el.modalImage.onerror=function(){this.style.display='none';this.parentElement.style.background='linear-gradient(135deg,#667eea 0%,#764ba2 100%)';};
el.modalCode.textContent=code;
el.modalName.textContent=name;
gender==='female'?el.btnRegister.classList.add('female'):el.btnRegister.classList.remove('female');
el.btnLike.classList.remove('active');
const heart=el.btnLike.querySelector('span:first-child');
heart&&(heart.textContent='♡');
el.styleModal.classList.add('active');

// 고객 등록
el.btnRegister.onclick=async()=>{
const customerName=prompt('고객 이름을 입력하세요:');
if(!customerName)return;
const customerPhone=prompt('전화번호를 입력하세요:');
if(!customerPhone)return;
try{
await window.db.collection('customers').add({
name:customerName,phone:customerPhone,styleCode:code,styleName:name,styleId:docId,gender:gender,
designer:localStorage.getItem('designerName')||'Unknown',registeredAt:new Date(),lastVisit:new Date()
});
alert('고객 등록 완료!');closeModal();
}catch(e){console.error('Customer registration error:',e);alert('등록 실패: '+e.message);}
};

// 좋아요
el.btnLike.onclick=async function(){
this.classList.toggle('active');
const heart=this.querySelector('span:first-child');
if(heart){
const isLiked=this.classList.contains('active');
heart.textContent=isLiked?'♥':'♡';
if(docId){
try{
await window.db.collection('hairstyles').doc(docId).update({
likes:firebase.firestore.FieldValue.increment(isLiked?1:-1)
});
}catch(e){console.error('Like update error:',e);}
}
}
};
}

// 로딩 표시
function showLoading(show){el.loadingOverlay?.classList.toggle('active',show);}

// 초기화
function init(){
console.log('🚀 앱 초기화 시작');
setupEvents();
loadTheme();
checkAuth();
el.backBtn&&(el.backBtn.style.display='none');

// 성별 버튼 재확인 및 이벤트 재등록
setTimeout(()=>{
const genderBtns=document.querySelectorAll('.gender-btn');
console.log('성별 버튼 개수:', genderBtns.length);
genderBtns.forEach((btn,index)=>{
console.log(`성별 버튼 ${index}:`, btn.dataset.gender);
if(!btn.hasAttribute('data-event-added')){
btn.addEventListener('click',function(){
console.log('성별 선택:', this.dataset.gender);
selectGender(this.dataset.gender);
});
btn.setAttribute('data-event-added','true');
}
});
},100);
}
}

// 전역에서 함수 실행
init();

window.addEventListener('load',()=>console.log('HAIRGATOR App Loaded'));
