// ============ HAIRGATOR Main Application (v1.8-COMPLETE-FINAL) ============
// 인라인 스크립트에서 이동, 기능 100% 동일 + 모든 누락 기능 포함

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    console.log('🚀 HAIRGATOR v1.8-COMPLETE-FINAL 로딩 시작');
    
    // ========== 상수 및 설정 (가장 먼저 정의) ==========
    const CONFIG = {
        CACHE_PREFIX: 'hairgator_',
        ANIMATION_DURATION: 300,
        MAX_RETRIES: 3,
        NEW_THRESHOLD_DAYS: 7
    };

    // ========== 유틸리티 함수 (CONFIG 정의 후 바로) ==========
    const utils = {
        setStorage: function(key, value) {
            try {
                localStorage.setItem(CONFIG.CACHE_PREFIX + key, value);
            } catch(e) {
                console.warn('Storage failed:', e);
            }
        },
        
        getStorage: function(key) {
            try {
                return localStorage.getItem(CONFIG.CACHE_PREFIX + key);
            } catch(e) {
                console.warn('Storage retrieval failed:', e);
                return null;
            }
        },
        
        showLoading: function(show) {
            if (elements.loadingOverlay) {
                elements.loadingOverlay.classList.toggle('active', show);
            }
        },
        
        handleError: function(error, context) {
            context = context || '';
            console.error('Error in ' + context + ':', error);
            alert('오류가 발생했습니다: ' + error.message);
        }
    };

    // ========== 메뉴 데이터 ==========
    const MENU_DATA = {
        male: {
            categories: [
                { 
                    id: 'side-fringe', 
                    name: 'SIDE FRINGE',
                    description: '사이드 프린지는 클래식함과 모던함의 대명사로 스타일링이 따라 원하는 이미지를 자유롭게 표현할 수 있습니다.'
                },
                { 
                    id: 'side-part', 
                    name: 'SIDE PART',
                    description: '사이드 파트는 정갈하고 단정한 스타일로 비즈니스맨들에게 인기가 많습니다.'
                },
                { 
                    id: 'fringe-up', 
                    name: 'FRINGE UP',
                    description: '프린지 업은 앞머리를 올려 이마를 드러내는 시원한 스타일입니다.'
                },
                { 
                    id: 'pushed-back', 
                    name: 'PUSHED BACK',
                    description: '푸시백은 머리를 뒤로 넘긴 댄디한 스타일입니다.'
                },
                { 
                    id: 'buzz', 
                    name: 'BUZZ',
                    description: '버즈컷은 짧고 깔끔한 스타일로 관리가 편합니다.'
                },
                { 
                    id: 'crop', 
                    name: 'CROP',
                    description: '크롭 스타일은 짧으면서도 스타일리시한 느낌을 줍니다.'
                },
                { 
                    id: 'mohican', 
                    name: 'MOHICAN',
                    description: '모히칸 스타일은 개성 있고 강한 인상을 줍니다.'
                }
            ],
            subcategories: ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone']
        },
        female: {
            categories: [
                { 
                    id: 'a-length', 
                    name: 'A Length',
                    description: 'A 길이는 가슴선 아래로 내려오는 롱헤어로, 우아하고 드라마틱한 분위기를 냅니다.'
                },
                { 
                    id: 'b-length', 
                    name: 'B Length',
                    description: 'B 길이는 가슴 아래와 쇄골 아래 사이의 미디언-롱으로, 부드럽고 실용적인 인상을 줍니다.'
                },
                { 
                    id: 'c-length', 
                    name: 'C Length',
                    description: 'C 길이는 쇄골 라인 아래의 세미 롱으로, 단정하고 세련된 오피스 무드를 냅니다.'
                },
                { 
                    id: 'd-length', 
                    name: 'D Length',
                    description: 'D 길이는 어깨에 정확히 닿는 길이로, 트렌디하고 깔끔한 느낌을 줍니다.'
                },
                { 
                    id: 'e-length', 
                    name: 'E Length',
                    description: 'E 길이는 어깨 바로 위의 단발로, 경쾌하고 모던한 인상을 만듭니다.'
                },
                { 
                    id: 'f-length', 
                    name: 'F Length',
                    description: 'F 길이는 턱선 바로 밑 보브 길이로, 시크하고 도회적인 분위기를 연출합니다.'
                },
                { 
                    id: 'g-length', 
                    name: 'G Length',
                    description: 'G 길이는 턱선과 같은 높이의 미니 보브로, 뚜렷하고 미니멀한 무드를 줍니다.'
                },
                { 
                    id: 'h-length', 
                    name: 'H Length',
                    description: 'H 길이는 귀선~베리숏구간의 숏헤어로, 활동적이고 개성 있는 스타일을 완성합니다.'
                }
            ],
            subcategories: ['None', 'Fore Head', 'Eye Brow', 'Eye', 'Cheekbone']
        }
    };

    // ========== 전역 변수 ==========
    let currentGender = null;
    let currentCategory = null;
    let currentSubcategory = 'None';
    let menuData = {};

    // ========== DOM 요소 참조 ==========
    const elements = {
        loginScreen: document.getElementById('loginScreen'),
        loginForm: document.getElementById('loginForm'),
        designerName: document.getElementById('designerName'),
        phoneNumber: document.getElementById('phoneNumber'),
        password: document.getElementById('password'),
        loginBtn: document.getElementById('loginBtn'),
        rememberInfo: document.getElementById('rememberInfo'),
        backBtn: document.getElementById('backBtn'),
        menuBtn: document.getElementById('menuBtn'),
        sidebar: document.getElementById('sidebar'),
        sidebarClose: document.getElementById('sidebarClose'),
        themeToggle: document.getElementById('themeToggle'),
        themeToggleBottom: document.getElementById('themeToggleBottom'),
        themeStatus: document.getElementById('themeStatus'),
        genderSelection: document.getElementById('genderSelection'),
        menuContainer: document.getElementById('menuContainer'),
        categoryTabs: document.getElementById('categoryTabs'),
        categoryDescription: document.getElementById('categoryDescription'),
        subcategoryTabs: document.getElementById('subcategoryTabs'),
        menuGrid: document.getElementById('menuGrid'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        styleModal: document.getElementById('styleModal'),
        modalClose: document.getElementById('modalClose'),
        modalImage: document.getElementById('modalImage'),
        modalCode: document.getElementById('modalCode'),
        modalName: document.getElementById('modalName'),
        btnRegister: document.getElementById('btnRegister'),
        btnLike: document.getElementById('btnLike'),
        btnAkool: document.getElementById('btnAkool'),
        petalSakuraBtn: document.getElementById('petalSakuraBtn'),
        designerNameDisplay: document.getElementById('designerNameDisplay'),
        hairGuideModal: document.getElementById('hairGuideModal'),
        hairGuideClose: document.getElementById('hairGuideClose'),
        akoolModal: document.getElementById('akoolModal'),
        akoolStartBtn: document.getElementById('akoolStartBtn'),
        akoolCloseBtn: document.getElementById('akoolCloseBtn'),
        loadingModal: document.getElementById('loadingModal'),
        resultModal: document.getElementById('resultModal'),
        resultImage: document.getElementById('resultImage'),
        resultCloseBtn: document.getElementById('resultCloseBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        retryBtn: document.getElementById('retryBtn')
    };

    // ========== 전화번호 포맷팅 유틸리티 ==========
    const phoneUtils = {
        format: function(value) {
            const numbers = value.replace(/\D/g, '');
            
            if (numbers.length <= 3) {
                return numbers;
            } else if (numbers.length <= 7) {
                return numbers.slice(0, 3) + '-' + numbers.slice(3);
            } else {
                return numbers.slice(0, 3) + '-' + numbers.slice(3, 7) + '-' + numbers.slice(7, 11);
            }
        },
        
        validate: function(phone) {
            const numbersOnly = phone.replace(/\D/g, '');
            return numbersOnly.length === 11 && numbersOnly.startsWith('010');
        }
    };

    // ========== New 표시 시스템 ==========
    const NewIndicatorSystem = {
        NEW_THRESHOLD_DAYS: CONFIG.NEW_THRESHOLD_DAYS,
        newStylesCache: new Map(),
        
        async init() {
            console.log('🔴 New 표시 시스템 초기화');
            if (window.firebaseReady && typeof db !== 'undefined') {
                await this.loadNewStyles();
            }
        },
        
        async loadNewStyles() {
            try {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - this.NEW_THRESHOLD_DAYS);
                
                const snapshot = await db.collection('hairstyles')
                    .where('createdAt', '>=', sevenDaysAgo)
                    .get();
                
                this.newStylesCache.clear();
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const categoryKey = `${data.gender}-${data.mainCategory}`;
                    const subcategoryKey = `${data.gender}-${data.mainCategory}-${data.subCategory}`;
                    
                    if (!this.newStylesCache.has(categoryKey)) {
                        this.newStylesCache.set(categoryKey, []);
                    }
                    if (!this.newStylesCache.has(subcategoryKey)) {
                        this.newStylesCache.set(subcategoryKey, []);
                    }
                    
                    this.newStylesCache.get(categoryKey).push(doc.id);
                    this.newStylesCache.get(subcategoryKey).push(doc.id);
                });
                
                console.log('✅ New 표시 데이터 로드 완료:', this.newStylesCache.size);
                
            } catch (error) {
                console.error('❌ New 표시 데이터 로드 실패:', error);
            }
        },
        
        markNewCategories: function(gender) {
            const categoryTabs = document.querySelectorAll('.category-tab:not(.help-tab)');
            categoryTabs.forEach(tab => {
                const categoryName = tab.textContent;
                const categoryKey = `${gender}-${categoryName}`;
                
                if (this.newStylesCache.has(categoryKey) && this.newStylesCache.get(categoryKey).length > 0) {
                    tab.classList.add('has-new');
                } else {
                    tab.classList.remove('has-new');
                }
            });
        },
        
        markNewSubcategories: function(gender, mainCategory) {
            const subcategoryTabs = document.querySelectorAll('.subcategory-tab');
            subcategoryTabs.forEach(tab => {
                const subCategory = tab.textContent;
                const subcategoryKey = `${gender}-${mainCategory}-${subCategory}`;
                
                if (this.newStylesCache.has(subcategoryKey) && this.newStylesCache.get(subcategoryKey).length > 0) {
                    tab.classList.add('has-new');
                } else {
                    tab.classList.remove('has-new');
                }
            });
        }
    };

    // ========== 벚꽃 시스템 ==========
    const petalSakuraSystem = {
        active: false,
        canvas: null,
        ctx: null,
        petals: [],
        animationId: null,
        petalImage: null,

        init: function() {
            console.log('🌸 벚꽃 시스템 초기화');
            
            this.stop();
            this.loadPetalImage();
            this.createCanvas();
            this.createPetals();
            
            this.active = true;
            
            var self = this;
            setTimeout(function() {
                self.forceStartAnimation();
            }, 100);
            
            console.log('✅ 벚꽃 시스템 시작!');
        },

        loadPetalImage: function() {
            var self = this;
            self.petalImage = new Image();
            self.petalImage.crossOrigin = 'anonymous';
            
            var imagePaths = [
                './petal.png',
                '/petal.png', 
                './images/petal.png',
                '/images/petal.png',
                './assets/petal.png',
                '/assets/petal.png'
            ];
            
            var currentPathIndex = 0;
            
            function tryNextPath() {
                if (currentPathIndex >= imagePaths.length) {
                    console.warn('⚠️ petal.png를 찾을 수 없어서 기본 꽃잎으로 대체');
                    return;
                }
                
                self.petalImage.src = imagePaths[currentPathIndex];
                currentPathIndex++;
            }
            
            self.petalImage.onload = function() {
                console.log('✅ petal.png 로드 성공!', self.petalImage.src);
            };
            
            self.petalImage.onerror = tryNextPath;
            tryNextPath();
        },

        createCanvas: function() {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'petalSakuraCanvas';
            this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;';
            
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.ctx = this.canvas.getContext('2d');
            
            document.body.appendChild(this.canvas);
            console.log('✅ Canvas 생성 완료');
        },

        createPetals: function() {
            console.log('🌸 꽃잎 생성 중');
            this.petals = [];
            
            var screenWidth = this.canvas.width;
            var screenHeight = this.canvas.height;
            
            for (var i = 0; i < 25; i++) {
                var petal = {
                    x: Math.random() * screenWidth,
                    y: Math.random() * screenHeight - 200,
                    size: Math.random() * 0.8 + 0.4,
                    speedY: Math.random() * 2 + 1,
                    speedX: Math.random() * 1 - 0.5,
                    rotation: Math.random() * 360,
                    rotationSpeed: (Math.random() - 0.5) * 4,
                    opacity: Math.random() * 0.6 + 0.4,
                    swing: Math.random() * 0.02 + 0.01
                };
                
                this.petals.push(petal);
            }
            
            console.log('✅ 꽃잎 ' + this.petals.length + '개 생성 완료');
        },

        forceStartAnimation: function() {
            console.log('🌸 강제 애니메이션 시작');
            
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            
            if (this.canvas) {
                this.canvas.style.zIndex = '999999';
            }
            
            var self = this;
            function animate() {
                if (!self.active || !self.canvas || !self.ctx) {
                    self.animationId = null;
                    return;
                }
                
                self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);
                
                for (var i = 0; i < self.petals.length; i++) {
                    var petal = self.petals[i];
                    
                    petal.y += petal.speedY;
                    petal.x += petal.speedX + Math.sin(petal.y * petal.swing) * 0.5;
                    petal.rotation += petal.rotationSpeed;
                    
                    if (petal.y > self.canvas.height + 50) {
                        petal.y = -50;
                        petal.x = Math.random() * self.canvas.width;
                    }
                    
                    if (petal.x > self.canvas.width + 50) petal.x = -50;
                    if (petal.x < -50) petal.x = self.canvas.width + 50;
                    
                    self.ctx.save();
                    self.ctx.translate(petal.x, petal.y);
                    self.ctx.rotate(petal.rotation * Math.PI / 180);
                    self.ctx.globalAlpha = petal.opacity;
                    
                    if (self.petalImage && self.petalImage.complete && self.petalImage.naturalWidth > 0) {
                        var size = 30 * petal.size;
                        self.ctx.drawImage(
                            self.petalImage, 
                            -size/2, -size/2, 
                            size, size
                        );
                    } else {
                        self.ctx.fillStyle = '#ff69b4';
                        self.ctx.beginPath();
                        self.ctx.arc(0, 0, 15, 0, Math.PI * 2);
                        self.ctx.fill();
                    }
                    
                    self.ctx.restore();
                }
                
                self.animationId = requestAnimationFrame(animate);
            }
            
            animate();
            console.log('✅ 애니메이션 루프 시작됨');
        },

        stop: function() {
            console.log('🌸 벚꽃 시스템 중지');
            this.active = false;
            
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            if (this.canvas) {
                this.canvas.remove();
                this.canvas = null;
            }
            
            this.petals = [];
        },

        handleResize: function() {
            if (this.canvas) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }
        }
    };

    // ========== AKOOL API 시스템 ==========
    const AkoolManager = {
        async startFaceSwap(userImageFile, styleImageUrl) {
            if (!userImageFile) {
                throw new Error('사용자 이미지가 필요합니다');
            }
            
            try {
                console.log('🎭 AKOOL 얼굴 바꾸기 시작');
                
                // 사용자 이미지를 Firebase Storage에 업로드
                const userImageUrl = await this.uploadToFirebase(userImageFile);
                
                // AKOOL API 호출
                const response = await fetch('/.netlify/functions/akool-proxy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_image: userImageUrl,
                        style_image: styleImageUrl
                    })
                });
                
                if (!response.ok) {
                    throw new Error('AKOOL API 호출 실패');
                }
                
                const result = await response.json();
                
                if (result.success) {
                    return result;
                } else {
                    throw new Error(result.error || 'AKOOL 처리 실패');
                }
                
            } catch (error) {
                console.error('❌ AKOOL 얼굴 바꾸기 실패:', error);
                throw error;
            }
        },
        
        async uploadToFirebase(file) {
            try {
                const timestamp = Date.now();
                const filename = `temp/user_image_${timestamp}.jpg`;
                const storageRef = firebase.storage().ref(filename);
                
                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();
                
                console.log('✅ Firebase 업로드 완료:', downloadURL);
                return downloadURL;
                
            } catch (error) {
                console.error('❌ Firebase 업로드 실패:', error);
                throw new Error('이미지 업로드 실패');
            }
        }
    };

    // ========== 로그인 관리 ==========
    function initLogin() {
        setupLoginEventListeners();
        loadSavedData();
        checkAutoLogin();
    }

    function setupLoginEventListeners() {
        // 전화번호 자동 포맷팅
        if (elements.phoneNumber) {
            elements.phoneNumber.addEventListener('input', function(e) {
                e.target.value = phoneUtils.format(e.target.value);
            });

            elements.phoneNumber.addEventListener('keypress', function(e) {
                if (!/[0-9-]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }

        if (elements.password) {
            elements.password.addEventListener('keypress', function(e) {
                if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }

        if (elements.loginForm) {
            elements.loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handleLogin();
            });
        }

        [elements.designerName, elements.phoneNumber, elements.password].forEach(function(input) {
            if (input) {
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        handleLogin();
                    }
                });
            }
        });
    }

    function loadSavedData() {
        var savedName = utils.getStorage('designerName');
        var savedPhone = utils.getStorage('designerPhone');
        
        if (savedName && savedPhone && 
            savedName.trim() !== '' && savedPhone.trim() !== '' &&
            elements.designerName && elements.phoneNumber && elements.rememberInfo) {
            
            if (elements.designerName.value === '' && elements.phoneNumber.value === '') {
                elements.designerName.value = savedName;
                elements.phoneNumber.value = savedPhone;
                elements.rememberInfo.style.display = 'block';
                elements.rememberInfo.innerHTML = '<span style="color: #4CAF50;">💾 저장된 정보로 간편 로그인 가능</span>';
                
                console.log('✅ 현재 사용자 정보 불러오기 완료:', savedName);
            }
        } else {
            if (elements.rememberInfo) {
                elements.rememberInfo.style.display = 'none';
            }
            console.log('ℹ️ 저장된 사용자 정보 없음');
        }
    }

    function checkAutoLogin() {
        console.log('🔐 로그인 화면 표시');
        if (elements.loginScreen) {
            elements.loginScreen.style.display = 'flex';
            elements.loginScreen.classList.remove('hidden');
        }
    }

    function handleLogin() {
        console.log('🔐 로그인 시도 시작');
        
        var name = elements.designerName.value.trim();
        var phone = elements.phoneNumber.value.trim();
        var password = elements.password.value.trim();

        console.log('입력 데이터:', { name: name, phone: phone.slice(0, 8) + '****', password: '****' });

        if (!name) {
            alert('디자이너 이름을 입력해주세요.');
            elements.designerName.focus();
            return;
        }

        if (!phoneUtils.validate(phone)) {
            alert('올바른 전화번호를 입력해주세요.\n예: 010-1234-5678');
            elements.phoneNumber.focus();
            return;
        }

        if (password.length !== 4) {
            alert('비밀번호는 숫자 4자리를 입력해주세요.');
            elements.password.focus();
            return;
        }

        console.log('✅ 유효성 검사 통과');

        elements.loginBtn.disabled = true;
        elements.loginBtn.textContent = '로그인 중...';

        try {
            console.log('💾 현재 사용자 정보 저장 중...');
            
            var savedName = utils.getStorage('designerName');
            var savedPhone = utils.getStorage('designerPhone');
            var isReturningUser = (savedName === name && savedPhone === phone);
            
            utils.setStorage('designerName', name);
            utils.setStorage('designerPhone', phone);
            utils.setStorage('designerPassword', password);
            utils.setStorage('loginTime', new Date().getTime().toString());
            
            var allKeys = Object.keys(localStorage);
            allKeys.forEach(function(key) {
                if (key.startsWith(CONFIG.CACHE_PREFIX) && 
                    !['designerName', 'designerPhone', 'designerPassword', 'loginTime', 'theme', 'gender'].includes(key.replace(CONFIG.CACHE_PREFIX, ''))) {
                    console.log('🧹 불필요한 데이터 정리:', key);
                    localStorage.removeItem(key);
                }
            });
            
            var welcomeMessage = isReturningUser ? 
                '👋 ' + name + ' 디자이너님 다시 오셨네요!' : 
                '🎉 처음 사용하시는군요! ' + name + ' 디자이너님 환영합니다';
            var messageColor = isReturningUser ? '#4A90E2' : '#4CAF50';
            
            showWelcomeMessage(welcomeMessage, messageColor);
            
            setTimeout(function() {
                elements.loginScreen.style.display = 'none';
                elements.loginScreen.classList.add('hidden');
                elements.genderSelection.style.display = 'flex';
                if (elements.designerNameDisplay) {
                    elements.designerNameDisplay.textContent = name;
                }
            }, 2000);

        } catch (error) {
            console.error('❌ 로그인 처리 중 오류:', error);
            alert('로그인 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setTimeout(function() {
                elements.loginBtn.disabled = false;
                elements.loginBtn.textContent = '로그인';
            }, 2000);
        }
    }

    function showWelcomeMessage(message, color) {
        var existingWelcome = document.getElementById('welcomeMessage');
        if (existingWelcome) {
            existingWelcome.remove();
        }
        
        var welcomeDiv = document.createElement('div');
        welcomeDiv.id = 'welcomeMessage';
        welcomeDiv.style.cssText = 
            'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
            'background: ' + color + '; color: white; padding: 20px 30px; ' +
            'border-radius: 15px; font-size: 18px; font-weight: bold; ' +
            'z-index: 3000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); ' +
            'animation: fadeInOut 2s ease-in-out;';
        
        welcomeDiv.textContent = message;
        
        if (!document.getElementById('welcomeAnimationCSS')) {
            var style = document.createElement('style');
            style.id = 'welcomeAnimationCSS';
            style.textContent = 
                '@keyframes fadeInOut {' +
                '0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }' +
                '20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }' +
                '80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }' +
                '100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }' +
                '}';
            document.head.appendChild(style);
        }
        
        document.body.appendChild(welcomeDiv);
        
        setTimeout(function() {
            if (welcomeDiv && welcomeDiv.parentNode) {
                welcomeDiv.remove();
            }
        }, 2000);
    }

    // ========== 테마 관리 ==========
    function initTheme() {
        var savedTheme = utils.getStorage('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            if (elements.themeStatus) {
                elements.themeStatus.textContent = 'OFF';
            }
        }
    }
    
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        var isLight = document.body.classList.contains('light-theme');
        if (elements.themeStatus) {
            elements.themeStatus.textContent = isLight ? 'OFF' : 'ON';
        }
        utils.setStorage('theme', isLight ? 'light' : 'dark');
    }

    // ========== 사이드바 관리 ==========
    function openSidebar() {
        if (elements.sidebar) {
            elements.sidebar.classList.add('active');
        }
    }
    
    function closeSidebar() {
        if (elements.sidebar) {
            elements.sidebar.classList.remove('active');
        }
    }
    
    function toggleSidebar() {
        if (elements.sidebar) {
            elements.sidebar.classList.toggle('active');
        }
    }

    // ========== 네비게이션 관리 ==========
    function goBack() {
        if (elements.menuContainer && elements.menuContainer.classList.contains('active')) {
            elements.menuContainer.classList.remove('active');
            elements.genderSelection.style.display = 'flex';
            elements.backBtn.style.display = 'none';
            elements.themeToggleBottom.style.display = 'flex';
            
            currentGender = null;
            currentCategory = null;
        }
    }
    
    function selectGender(gender) {
        console.log('🎯 성별 선택:', gender);
        currentGender = gender;
        
        elements.genderSelection.style.display = 'none';
        elements.menuContainer.classList.add('active');
        elements.backBtn.style.display = 'flex';
        elements.themeToggleBottom.style.display = 'none';
        
        setTimeout(function() {
            loadMenuData(gender);
        }, 50);
        
        utils.setStorage('gender', gender);
    }

    // ========== 메뉴 관리 ==========
    function loadMenuData(gender) {
        console.log('🔧 loadMenuData 실행:', gender);
        utils.showLoading(true);
        menuData = MENU_DATA[gender];
        
        renderCategories(gender);
        
        if (menuData.categories.length > 0) {
            selectCategory(menuData.categories[0], gender);
        }
        
        setTimeout(function() {
            utils.showLoading(false);
        }, CONFIG.ANIMATION_DURATION);
    }
    
    function renderCategories(gender) {
        console.log('🔧 renderCategories 실행:', gender, elements.categoryTabs);
        if (!elements.categoryTabs) {
            console.error('❌ categoryTabs 요소를 찾을 수 없음!');
            return;
        }
        
        elements.categoryTabs.innerHTML = '';
        
        // 여성일 때 도움말 버튼 먼저 추가
        if (gender === 'female') {
            var helpTab = document.createElement('button');
            helpTab.className = 'category-tab help-tab';
            helpTab.innerHTML = '?';
            helpTab.addEventListener('click', function() {
                showHairGuideModal();
            });
            elements.categoryTabs.appendChild(helpTab);
            console.log('✅ 도움말 버튼 추가됨');
        }
        
        // 대분류 탭들 추가
        console.log('📝 추가할 카테고리들:', menuData.categories);
        for (var i = 0; i < menuData.categories.length; i++) {
            var category = menuData.categories[i];
            var tab = document.createElement('button');
            tab.className = 'category-tab';
            tab.textContent = category.name;
            tab.dataset.categoryId = category.id;
            
            console.log('➕ 카테고리 탭 생성:', category.name);
            
            if (i === 0) {
                tab.classList.add('active', gender);
                console.log('✅ 첫 번째 탭 활성화:', category.name);
            }
            
            // 클로저를 사용하여 올바른 category를 전달
            (function(cat, gen) {
                tab.addEventListener('click', function() {
                    console.log('🖱️ 카테고리 클릭:', cat.name);
                    selectCategory(cat, gen);
                });
            })(category, gender);
            
            elements.categoryTabs.appendChild(tab);
        }

        console.log('📊 최종 렌더링된 탭 개수:', elements.categoryTabs.children.length);

        // New 표시 추가
        NewIndicatorSystem.markNewCategories(gender);
    }
    
    function selectCategory(category, gender) {
        console.log('🎯 카테고리 선택:', category.name);
        currentCategory = category;
        
        var categoryTabs = document.querySelectorAll('.category-tab');
        for (var i = 0; i < categoryTabs.length; i++) {
            var tab = categoryTabs[i];
            if (tab.classList.contains('help-tab')) continue;
            tab.classList.remove('active', 'male', 'female');
            if (tab.dataset.categoryId === category.id) {
                tab.classList.add('active', gender);
            }
        }
        
        if (elements.categoryDescription) {
            elements.categoryDescription.textContent = category.description;
        }
        renderSubcategories(gender);
        loadStyles(category.id, currentSubcategory, gender);
    }
    
    function renderSubcategories(gender) {
        if (!elements.subcategoryTabs) return;
        
        elements.subcategoryTabs.innerHTML = '';
        
        for (var i = 0; i < menuData.subcategories.length; i++) {
            var sub = menuData.subcategories[i];
            var tab = document.createElement('button');
            tab.className = 'subcategory-tab';
            tab.textContent = sub;
            tab.dataset.subcategory = sub;
            
            if (i === 0) {
                tab.classList.add('active', gender);
                currentSubcategory = sub;
            }
            
            // 클로저를 사용하여 올바른 subcategory를 전달
            (function(subcat, gen) {
                tab.addEventListener('click', function() {
                    selectSubcategory(subcat, gen);
                });
            })(sub, gender);
            
            elements.subcategoryTabs.appendChild(tab);
        }

        // New 표시 추가
        NewIndicatorSystem.markNewSubcategories(gender, currentCategory.name);
    }
    
    function selectSubcategory(subcategory, gender) {
        currentSubcategory = subcategory;
        
        var subcategoryTabs = document.querySelectorAll('.subcategory-tab');
        for (var i = 0; i < subcategoryTabs.length; i++) {
            var tab = subcategoryTabs[i];
            tab.classList.remove('active', 'male', 'female');
            if (tab.dataset.subcategory === subcategory) {
                tab.classList.add('active', gender);
            }
        }
        
        loadStyles(currentCategory.id, subcategory, gender);
    }
    
    function loadStyles(categoryId, subcategory, gender) {
        if (!elements.menuGrid) return;
        
        elements.menuGrid.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        if (!window.firebaseReady || typeof db === 'undefined') {
            elements.menuGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">Firebase 연결 중...</div>';
            return;
        }
        
        try {
            var categoryName = currentCategory.name;
            
            var query = db.collection('hairstyles')
                .where('gender', '==', gender)
                .where('mainCategory', '==', categoryName)
                .where('subCategory', '==', subcategory);
            
            query.get().then(function(snapshot) {
                elements.menuGrid.innerHTML = '';
                
                if (snapshot.empty) {
                    elements.menuGrid.innerHTML = 
                        '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">' +
                        '<div style="font-size: 48px; margin-bottom: 20px;">🔭</div>' +
                        '<div>등록된 스타일이 없습니다</div>' +
                        '<div style="font-size: 12px; margin-top: 10px;">' + categoryName + ' - ' + subcategory + '</div>' +
                        '</div>';
                    return;
                }
                
                snapshot.forEach(function(doc) {
                    var data = doc.data();
                    var item = document.createElement('div');
                    item.className = 'menu-item ' + gender;
                    
                    var createdAt = data.createdAt ? data.createdAt.toDate() : null;
                    var isNew = createdAt && (new Date() - createdAt) < (CONFIG.NEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
                    if (isNew) {
                        item.classList.add('has-new');
                    }
                    
                    item.innerHTML = 
                        '<img src="' + (data.imageUrl || '') + '" ' +
                        'alt="' + (data.name || 'Style') + '" ' +
                        'class="menu-item-image" ' +
                        'onerror="this.style.display=\'none\'; this.parentElement.style.background=\'linear-gradient(135deg, #667eea 0%, #764ba2 100%)\';">';
                    
                    item.addEventListener('click', function() {
                        showStyleModal(data.code, data.name, gender, data.imageUrl, doc.id);
                    });
                    
                    elements.menuGrid.appendChild(item);
                });
                
            }).catch(function(error) {
                utils.handleError(error, 'loadStyles');
                elements.menuGrid.innerHTML = 
                    '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ff4444;">' +
                    '<div>데이터 로드 실패</div>' +
                    '<div style="font-size: 12px; margin-top: 10px;">' + error.message + '</div>' +
                    '</div>';
            });
            
        } catch (error) {
            utils.handleError(error, 'loadStyles');
        }
    }

    // ========== 헤어 길이 가이드 모달 관리 ==========
    function showHairGuideModal() {
        var modal = document.getElementById('hairGuideModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function hideHairGuideModal() {
        var modal = document.getElementById('hairGuideModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ========== AKOOL 모달 동적 생성 및 관리 ==========
    function createAkoolModals() {
        // 1. AKOOL 메인 모달 생성
        if (!document.getElementById('akoolModal')) {
            const akoolModal = document.createElement('div');
            akoolModal.id = 'akoolModal';
            akoolModal.className = 'akool-modal';
            akoolModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;
            
            akoolModal.innerHTML = `
                <div class="akool-content" style="
                    background: #1a1a1a;
                    border-radius: 15px;
                    padding: 30px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    color: white;
                    position: relative;
                ">
                    <button id="akoolCloseBtn" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: none;
                        border: none;
                        color: #FF1493;
                        font-size: 24px;
                        cursor: pointer;
                    ">×</button>
                    
                    <div style="font-size: 48px; margin-bottom: 20px;">🎭</div>
                    <h2 style="color: #FF1493; margin-bottom: 15px;">AI 얼굴 바꾸기</h2>
                    <p style="margin-bottom: 25px; color: #ccc;">
                        선택하신 헤어스타일로 AI가 얼굴을 변환해드립니다!
                    </p>
                    
                    <button id="akoolStartBtn" style="
                        background: linear-gradient(135deg, #FF1493, #FF69B4);
                        color: white;
                        border: none;
                        padding: 15px 30px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 16px;
                        width: 100%;
                    ">📸 사진 선택하기</button>
                </div>
            `;
            
            document.body.appendChild(akoolModal);
            elements.akoolModal = akoolModal;
            elements.akoolStartBtn = document.getElementById('akoolStartBtn');
            elements.akoolCloseBtn = document.getElementById('akoolCloseBtn');
            
            // 닫기 버튼 이벤트
            elements.akoolCloseBtn.addEventListener('click', hideAkoolModal);
            akoolModal.addEventListener('click', function(e) {
                if (e.target === akoolModal) hideAkoolModal();
            });
        }
        
        // 2. 로딩 모달 생성
        if (!document.getElementById('loadingModal')) {
            const loadingModal = document.createElement('div');
            loadingModal.id = 'loadingModal';
            loadingModal.className = 'loading-modal';
            loadingModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 10001;
            `;
            
            loadingModal.innerHTML = `
                <div class="loading-content" style="
                    background: #1a1a1a;
                    border-radius: 15px;
                    padding: 40px;
                    text-align: center;
                    color: white;
                    max-width: 300px;
                    width: 90%;
                ">
                    <div class="loading-spinner" style="
                        width: 50px;
                        height: 50px;
                        border: 4px solid #333;
                        border-top: 4px solid #FF1493;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    "></div>
                    <div class="loading-message" style="color: #FF1493; font-weight: bold;">
                        AI 얼굴 바꾸기 처리 중...
                    </div>
                    <div style="color: #ccc; font-size: 12px; margin-top: 10px;">
                        잠시만 기다려주세요
                    </div>
                </div>
            `;
            
            // 스피너 애니메이션 CSS 추가
            if (!document.getElementById('spinner-css')) {
                const spinnerStyle = document.createElement('style');
                spinnerStyle.id = 'spinner-css';
                spinnerStyle.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(spinnerStyle);
            }
            
            document.body.appendChild(loadingModal);
            elements.loadingModal = loadingModal;
        }
        
        // 3. 결과 모달 생성
        if (!document.getElementById('resultModal')) {
            const resultModal = document.createElement('div');
            resultModal.id = 'resultModal';
            resultModal.className = 'result-modal';
            resultModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;
            
            resultModal.innerHTML = `
                <div class="result-content" style="
                    background: #1a1a1a;
                    border-radius: 15px;
                    padding: 20px;
                    max-width: 500px;
                    width: 90%;
                    text-align: center;
                    color: white;
                    position: relative;
                ">
                    <button id="resultCloseBtn" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: none;
                        border: none;
                        color: #FF1493;
                        font-size: 24px;
                        cursor: pointer;
                    ">×</button>
                    
                    <h2 style="color: #FF1493; margin-bottom: 20px;">🎉 변환 완료!</h2>
                    
                    <img id="resultImage" style="
                        max-width: 100%;
                        max-height: 400px;
                        border-radius: 10px;
                        margin-bottom: 20px;
                    " />
                    
                    <div class="result-actions" style="display: flex; gap: 10px; justify-content: center;">
                        <button id="downloadBtn" style="
                            background: linear-gradient(135deg, #FF1493, #FF69B4);
                            color: white;
                            border: none;
                            padding: 12px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: bold;
                        ">💾 다운로드</button>
                        
                        <button id="retryBtn" style="
                            background: linear-gradient(135deg, #666, #888);
                            color: white;
                            border: none;
                            padding: 12px 20px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: bold;
                        ">🔄 다시 시도</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(resultModal);
            elements.resultModal = resultModal;
            elements.resultImage = document.getElementById('resultImage');
            elements.resultCloseBtn = document.getElementById('resultCloseBtn');
            elements.downloadBtn = document.getElementById('downloadBtn');
            elements.retryBtn = document.getElementById('retryBtn');
            
            // 이벤트 리스너 추가
            elements.resultCloseBtn.addEventListener('click', hideResultModal);
            resultModal.addEventListener('click', function(e) {
                if (e.target === resultModal) hideResultModal();
            });
        }
        
        console.log('✅ AKOOL 모달들 동적 생성 완료');
    }

    function showAkoolModal() {
        createAkoolModals(); // 모달이 없으면 생성
        if (elements.akoolModal) {
            elements.akoolModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            console.log('✅ AKOOL 모달 표시');
        }
    }
    
    function hideAkoolModal() {
        if (elements.akoolModal) {
            elements.akoolModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    function showLoadingModal(message) {
        createAkoolModals(); // 모달이 없으면 생성
        var modal = elements.loadingModal;
        if (modal) {
            var messageEl = modal.querySelector('.loading-message');
            if (messageEl) messageEl.textContent = message || '처리 중...';
            modal.style.display = 'flex';
            console.log('✅ 로딩 모달 표시:', message);
        }
    }

    function hideLoadingModal() {
        if (elements.loadingModal) {
            elements.loadingModal.style.display = 'none';
        }
    }

    function showResultModal(imageUrl) {
        createAkoolModals(); // 모달이 없으면 생성
        if (elements.resultModal && elements.resultImage) {
            elements.resultImage.src = imageUrl;
            elements.resultModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            console.log('✅ 결과 모달 표시:', imageUrl);
        }
    }

    function hideResultModal() {
        if (elements.resultModal) {
            elements.resultModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    // ========== AKOOL 모달 버튼들 설정 함수 ==========
    function setupAkoolModalButtons(imageSrc) {
        const akoolStartBtn = document.getElementById('akoolStartBtn');
        const akoolCloseBtn = document.getElementById('akoolCloseBtn');
        
        // 닫기 버튼
        if (akoolCloseBtn) {
            akoolCloseBtn.onclick = function() {
                hideAkoolModal();
            };
        }
        
        // 시작 버튼 - 사진첩/카메라 선택 제공
        if (akoolStartBtn) {
            akoolStartBtn.onclick = function() {
                console.log('📸 AKOOL 시작 버튼 클릭');
                showPhotoSelectionModal(imageSrc);
            };
        } else {
            console.warn('⚠️ akoolStartBtn을 찾을 수 없음');
        }
    }

    // ========== 사진 선택 모달 생성 및 표시 ==========
    function showPhotoSelectionModal(imageSrc) {
        // 기존 사진 선택 모달 제거
        const existingModal = document.getElementById('photoSelectionModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // 새 사진 선택 모달 생성
        const photoModal = document.createElement('div');
        photoModal.id = 'photoSelectionModal';
        photoModal.className = 'photo-selection-modal';
        photoModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
            padding: 20px;
        `;
        
        photoModal.innerHTML = `
            <div class="photo-selection-content" style="
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border-radius: 20px;
                padding: 30px;
                max-width: 400px;
                width: 100%;
                text-align: center;
                color: white;
                position: relative;
                animation: modalSlideUp 0.3s ease;
            ">
                <button class="photo-selection-close" onclick="hidePhotoSelectionModal()" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    color: #FF1493;
                    font-size: 24px;
                    cursor: pointer;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
                
                <div style="font-size: 48px; margin-bottom: 20px;">📸</div>
                <h2 style="color: #FF1493; margin-bottom: 15px; font-size: 20px;">사진 선택</h2>
                <p style="margin-bottom: 30px; color: #ccc; line-height: 1.5;">
                    어떤 방법으로 사진을 선택하시겠어요?
                </p>
                
                <div class="photo-options" style="display: flex; flex-direction: column; gap: 15px;">
                    <button id="selectFromGallery" style="
                        background: linear-gradient(135deg, #4A90E2, #357ABD);
                        color: white;
                        border: none;
                        padding: 15px 20px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        transition: all 0.3s ease;
                    ">
                        <span style="font-size: 20px;">🖼️</span>
                        <span>사진첩에서 선택</span>
                    </button>
                    
                    <button id="takePhoto" style="
                        background: linear-gradient(135deg, #FF6B6B, #FF8E53);
                        color: white;
                        border: none;
                        padding: 15px 20px;
                        border-radius: 12px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        transition: all 0.3s ease;
                    ">
                        <span style="font-size: 20px;">📷</span>
                        <span>카메라로 촬영</span>
                    </button>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px; color: #999; line-height: 1.4;">
                    선택한 사진으로 AI가 헤어스타일을 적용해드립니다.<br>
                    얼굴이 선명하게 나온 정면 사진을 사용해주세요.
                </p>
            </div>
        `;
        
        document.body.appendChild(photoModal);
        document.body.style.overflow = 'hidden';
        
        // 버튼 이벤트 설정
        const galleryBtn = document.getElementById('selectFromGallery');
        const cameraBtn = document.getElementById('takePhoto');
        
        if (galleryBtn) {
            galleryBtn.onclick = function() {
                selectPhoto('gallery', imageSrc);
            };
            
            galleryBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 5px 15px rgba(74, 144, 226, 0.4)';
            });
            
            galleryBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            });
        }
        
        if (cameraBtn) {
            cameraBtn.onclick = function() {
                selectPhoto('camera', imageSrc);
            };
            
            cameraBtn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 5px 15px rgba(255, 107, 107, 0.4)';
            });
            
            cameraBtn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            });
        }
        
        console.log('✅ 사진 선택 모달 표시 완료');
    }

    // ========== 사진 선택 실행 함수 ==========
    function selectPhoto(source, imageSrc) {
        console.log('📷 사진 선택:', source);
        
        hidePhotoSelectionModal();
        
        // 파일 선택 input 생성
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        // 카메라 촬영인 경우 capture 속성 추가
        if (source === 'camera') {
            fileInput.capture = 'user'; // 전면 카메라
            console.log('📷 카메라 모드 활성화');
        } else {
            console.log('🖼️ 갤러리 모드 활성화');
        }
        
        fileInput.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) {
                console.log('❌ 파일이 선택되지 않음');
                showAkoolModal(); // 다시 AKOOL 모달 표시
                return;
            }
            
            console.log('📸 선택된 파일:', file.name, file.size);
            
            // 파일 크기 체크 (10MB 제한)
            if (file.size > 10 * 1024 * 1024) {
                alert('파일 크기가 너무 큽니다. 10MB 이하의 이미지를 선택해주세요.');
                showAkoolModal(); // 다시 AKOOL 모달 표시
                return;
            }
            
            // 진행 상황 표시
            hideAkoolModal();
            showLoadingModal('AI 얼굴 바꾸기 처리 중...');
            
            try {
                console.log('🚀 AKOOL 처리 시작');
                console.log('- 사용자 이미지:', file.name);
                console.log('- 스타일 이미지:', imageSrc);
                console.log('- 선택 방법:', source);
                
                // window.akoolAPI 사용 (akool-api.js에서 제공)
                if (typeof window.akoolAPI !== 'undefined' && typeof window.akoolAPI.processFaceSwap === 'function') {
                    const result = await window.akoolAPI.processFaceSwap(file, imageSrc, function(progress) {
                        console.log('🔄 진행률:', progress + '%');
                        // 로딩 모달에 진행률 표시
                        updateLoadingProgress(progress);
                    });
                    
                    console.log('✅ AKOOL 결과:', result);
                    hideLoadingModal();
                    
                    if (result && result.success && result.resultUrl) {
                        console.log('🎉 성공! 결과 이미지:', result.resultUrl);
                        showResultModal(result.resultUrl);
                    } else {
                        console.error('❌ AKOOL 처리 실패:', result);
                        alert('AI 처리에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
                    }
                } else {
                    throw new Error('AKOOL API가 로드되지 않았습니다. akool-api.js를 확인해주세요.');
                }
                
            } catch (error) {
                console.error('❌ AKOOL 처리 중 오류:', error);
                hideLoadingModal();
                alert('AI 처리 중 오류가 발생했습니다: ' + error.message);
            }
        };
        
        // 파일 선택 창 열기
        fileInput.click();
    }

    // ========== 모달 제어 함수들 ==========
    function hidePhotoSelectionModal() {
        const modal = document.getElementById('photoSelectionModal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    }

    function updateLoadingProgress(progress) {
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            const messageEl = loadingModal.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = `AI 얼굴 바꾸기 처리 중... ${Math.round(progress)}%`;
            }
            
            // 진행바 추가 (있으면)
            let progressBar = loadingModal.querySelector('.progress-bar');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'progress-bar';
                progressBar.style.cssText = `
                    width: 100%;
                    height: 4px;
                    background: #333;
                    border-radius: 2px;
                    margin-top: 15px;
                    overflow: hidden;
                `;
                
                const progressFill = document.createElement('div');
                progressFill.className = 'progress-fill';
                progressFill.style.cssText = `
                    height: 100%;
                    background: linear-gradient(90deg, #FF1493, #FF69B4);
                    width: 0%;
                    transition: width 0.3s ease;
                    border-radius: 2px;
                `;
                
                progressBar.appendChild(progressFill);
                
                const loadingContent = loadingModal.querySelector('.loading-content');
                if (loadingContent) {
                    loadingContent.appendChild(progressBar);
                }
            }
            
            const progressFill = progressBar.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = `${Math.min(progress, 100)}%`;
            }
        }
    }

    // ========== 스타일 모달 관리 ==========
    function showStyleModal(code, name, gender, imageSrc, docId) {
        console.log('🔧 showStyleModal 실행:', { code, name, gender, imageSrc });
        
        if (!elements.styleModal) {
            console.error('❌ styleModal 요소를 찾을 수 없음');
            return;
        }
        
        if (elements.modalImage) {
            elements.modalImage.src = imageSrc || '';
            elements.modalImage.onerror = function() {
                this.style.display = 'none';
                this.parentElement.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            };
        }
        
        if (elements.modalCode) elements.modalCode.textContent = code || '';
        if (elements.modalName) elements.modalName.textContent = name || '';
        
        if (elements.btnRegister) {
            if (gender === 'female') {
                elements.btnRegister.classList.add('female');
            } else {
                elements.btnRegister.classList.remove('female');
            }
        }
        
        if (elements.btnLike) {
            elements.btnLike.classList.remove('active');
            var heart = elements.btnLike.querySelector('span:first-child');
            if (heart) heart.textContent = '♡';
        }
        
        elements.styleModal.classList.add('active');
        elements.styleModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        console.log('✅ 스타일 모달 열기 완료');
        
        setupModalActions(code, name, gender, docId, imageSrc);
    }

    function hideStyleModal() {
        console.log('🚪 hideStyleModal 실행');
        
        if (elements.styleModal) {
            elements.styleModal.classList.remove('active');
            elements.styleModal.style.display = 'none';
            document.body.style.overflow = '';
            console.log('✅ 스타일 모달 닫기 완료');
        }
    }
    
    function setupModalActions(code, name, gender, docId, imageSrc) {
        console.log('🔧 setupModalActions 실행:', { code, name, gender });
        
        // 고객 등록 버튼
        if (elements.btnRegister) {
            elements.btnRegister.onclick = function() {
                var customerName = prompt('고객 이름을 입력하세요:');
                if (!customerName) return;
                
                var customerPhone = prompt('고객 전화번호를 입력하세요:\n(예: 010-1234-5678)');
                if (!customerPhone) return;
                
                if (!phoneUtils.validate(customerPhone)) {
                    alert('올바른 전화번호를 입력해주세요\n예: 010-1234-5678');
                    return;
                }
                
                customerPhone = phoneUtils.format(customerPhone);
                
                if (typeof db !== 'undefined') {
                    db.collection('customers').add({
                        name: customerName,
                        phone: customerPhone,
                        styleCode: code,
                        styleName: name,
                        styleId: docId,
                        gender: gender,
                        designer: utils.getStorage('designerName') || 'Unknown',
                        registeredAt: new Date(),
                        lastVisit: new Date()
                    }).then(function() {
                        alert('고객 등록 완료!');
                        hideStyleModal();
                    }).catch(function(error) {
                        utils.handleError(error, 'Customer registration');
                    });
                }
            };
        }
        
        // 좋아요 버튼
        if (elements.btnLike) {
            elements.btnLike.onclick = function() {
                this.classList.toggle('active');
                var heart = this.querySelector('span:first-child');
                if (heart) {
                    var isLiked = this.classList.contains('active');
                    heart.textContent = isLiked ? '♥' : '♡';
                    
                    if (docId && typeof db !== 'undefined') {
                        db.collection('hairstyles').doc(docId).update({
                            likes: firebase.firestore.FieldValue.increment(isLiked ? 1 : -1)
                        }).catch(function(error) {
                            console.error('Like update error:', error);
                        });
                    }
                }
            };
        }
        
        // 🔧 AI 체험하기 버튼 - 없으면 강제 생성
        let btnAkool = document.getElementById('btnAkool');
        if (!btnAkool) {
            console.log('🔧 AI 버튼이 없어서 강제 생성합니다');
            
            const modalActions = document.querySelector('.modal-actions');
            if (modalActions) {
                btnAkool = document.createElement('button');
                btnAkool.id = 'btnAkool';
                btnAkool.className = 'modal-btn btn-akool';
                btnAkool.innerHTML = '<span>🎭</span><span>AI 체험하기</span>';
                btnAkool.style.cssText = `
                    background: linear-gradient(135deg, #FF1493, #FF69B4) !important;
                    color: white !important;
                    border: none !important;
                    padding: 12px 20px !important;
                    border-radius: 8px !important;
                    cursor: pointer !important;
                    font-weight: bold !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    margin: 5px !important;
                    flex: 1 !important;
                    justify-content: center !important;
                    transition: all 0.3s ease !important;
                `;
                
                // 호버 효과 추가
                btnAkool.addEventListener('mouseenter', function() {
                    this.style.background = 'linear-gradient(135deg, #FF69B4, #FFB6C1)';
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 5px 15px rgba(255, 20, 147, 0.4)';
                });
                
                btnAkool.addEventListener('mouseleave', function() {
                    this.style.background = 'linear-gradient(135deg, #FF1493, #FF69B4)';
                    this.style.transform = 'translateY(0)';
                    this.style.boxShadow = 'none';
                });
                
                modalActions.appendChild(btnAkool);
                console.log('✅ AI 버튼 강제 생성 완료');
            }
        }
        
        // ========== AKOOL 모달 플로우 복원 ==========
        // AI 체험하기 버튼 이벤트 설정
        if (btnAkool) {
            btnAkool.onclick = function() {
                console.log('🎭 AI 체험하기 버튼 클릭됨');
                hideStyleModal();
                
                // 🔧 AKOOL 모달 먼저 표시 (즉시 파일 선택 X)
                createAkoolModals(); // 모달이 없으면 생성
                showAkoolModal();    // AKOOL 모달 표시
                
                // AKOOL 모달 내부 버튼들 설정
                setupAkoolModalButtons(imageSrc);
            };
            console.log('✅ AI 체험하기 AKOOL 모달 플로우 연결 완료');
        } else {
            console.warn('⚠️ AI 버튼 생성 실패');
        }
    }

    // ========== 로그아웃 ==========
    function logout() {
        if (confirm('로그아웃 하시겠습니까?')) {
            ['designerName', 'designerPhone', 'designerPassword', 'loginTime', 'theme', 'gender'].forEach(function(key) {
                localStorage.removeItem(CONFIG.CACHE_PREFIX + key);
            });
            
            location.reload();
        }
    }

    // ========== 이벤트 리스너 설정 ==========
    function setupEventListeners() {
        // 네비게이션 관련
        if (elements.backBtn) {
            elements.backBtn.addEventListener('click', goBack);
        }
        
        if (elements.menuBtn) {
            elements.menuBtn.addEventListener('click', openSidebar);
        }
        
        if (elements.sidebarClose) {
            elements.sidebarClose.addEventListener('click', closeSidebar);
        }
        
        // 테마 관련
        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', toggleTheme);
        }
        
        if (elements.themeToggleBottom) {
            elements.themeToggleBottom.addEventListener('click', toggleTheme);
        }
        
        // 벚꽃 배경 관련
        if (elements.petalSakuraBtn) {
            elements.petalSakuraBtn.addEventListener('click', function() {
                if (petalSakuraSystem.active) {
                    petalSakuraSystem.stop();
                    this.classList.remove('active');
                    var textSpan = this.querySelector('span:last-child');
                    if (textSpan) textSpan.textContent = '벚꽃 배경';
                } else {
                    petalSakuraSystem.init();
                    this.classList.add('active');
                    var textSpan = this.querySelector('span:last-child');
                    if (textSpan) textSpan.textContent = '배경 끄기';
                }
            });
        }
        
        // 성별 선택 관련
        var genderBtns = document.querySelectorAll('.gender-btn');
        for (var i = 0; i < genderBtns.length; i++) {
            genderBtns[i].addEventListener('click', function() {
                selectGender(this.dataset.gender);
            });
        }
        
        // 헤어 가이드 모달 관련
        var hairGuideClose = document.getElementById('hairGuideClose');
        var hairGuideModal = document.getElementById('hairGuideModal');
        
        if (hairGuideClose) {
            hairGuideClose.addEventListener('click', hideHairGuideModal);
        }
        
        if (hairGuideModal) {
            hairGuideModal.addEventListener('click', function(e) {
                if (e.target === this) hideHairGuideModal();
            });
        }
        
        // 스타일 모달 관련
        if (elements.modalClose) {
            elements.modalClose.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚪 모달 닫기 버튼 클릭됨');
                hideStyleModal();
            });
        }
        
        if (elements.styleModal) {
            elements.styleModal.addEventListener('click', function(e) {
                if (e.target === this) hideStyleModal();
            });
        }

        // AKOOL 모달 관련
        if (elements.akoolCloseBtn) {
            elements.akoolCloseBtn.addEventListener('click', hideAkoolModal);
        }

        if (elements.resultCloseBtn) {
            elements.resultCloseBtn.addEventListener('click', hideResultModal);
        }

        if (elements.downloadBtn) {
            elements.downloadBtn.addEventListener('click', function() {
                if (elements.resultImage && elements.resultImage.src) {
                    var link = document.createElement('a');
                    link.href = elements.resultImage.src;
                    link.download = 'akool_result_' + Date.now() + '.jpg';
                    link.click();
                }
            });
        }

        if (elements.retryBtn) {
            elements.retryBtn.addEventListener('click', function() {
                hideResultModal();
                showAkoolModal();
            });
        }
        
        // 키보드 이벤트
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (document.getElementById('hairGuideModal').classList.contains('active')) {
                    hideHairGuideModal();
                }
                else if (elements.styleModal && elements.styleModal.classList.contains('active')) {
                    hideStyleModal();
                }
                else if (elements.akoolModal && elements.akoolModal.style.display === 'flex') {
                    hideAkoolModal();
                }
                else if (elements.resultModal && elements.resultModal.style.display === 'flex') {
                    hideResultModal();
                }
            }
        });
        
        // 사이드바 외부 클릭 시 닫기
        document.addEventListener('click', function(e) {
            if (elements.sidebar && elements.sidebar.classList.contains('active')) {
                if (!elements.sidebar.contains(e.target) && !elements.menuBtn.contains(e.target)) {
                    closeSidebar();
                }
            }
        });

        // 화면 크기 변경 대응
        window.addEventListener('resize', function() {
            petalSakuraSystem.handleResize();
        });
    }

    // ========== Service Worker 관리 시스템 ==========
    const ServiceWorkerManager = {
        registration: null,
        updateCheckInterval: null,
        
        async init() {
            if (!('serviceWorker' in navigator)) {
                console.log('❌ Service Worker 미지원');
                return;
            }
            
            try {
                console.log('🔧 Service Worker 등록 중...');
                
                this.registration = await navigator.serviceWorker.register('./service-worker.js', {
                    scope: './',
                    updateViaCache: 'none'
                });
                
                console.log('✅ Service Worker 등록 성공');
                this.setupEventListeners();
                this.startUpdateCheck();
                await this.checkForUpdates();
                
            } catch (error) {
                console.error('❌ Service Worker 등록 실패:', error);
            }
        },
        
        setupEventListeners() {
            if (this.registration) {
                this.registration.addEventListener('updatefound', () => {
                    console.log('🔄 새로운 Service Worker 발견');
                    const newWorker = this.registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.handleUpdateAvailable();
                        }
                    });
                });
            }
            
            navigator.serviceWorker.addEventListener('message', (event) => {
                this.handleServiceWorkerMessage(event.data);
            });
            
            window.addEventListener('online', () => {
                console.log('🌐 온라인 상태 복구, 업데이트 확인');
                this.checkForUpdates();
            });
            
            window.addEventListener('focus', () => {
                if (Math.random() < 0.1) {
                    this.checkForUpdates();
                }
            });
        },
        
        async checkForUpdates() {
            if (!this.registration) return;
            
            try {
                console.log('🔍 업데이트 확인 중...');
                await this.registration.update();
            } catch (error) {
                console.warn('⚠️ 업데이트 확인 실패:', error);
            }
        },
        
        startUpdateCheck() {
            this.updateCheckInterval = setInterval(() => {
                this.checkForUpdates();
            }, 60 * 60 * 1000); // 1시간
        },
        
        handleUpdateAvailable() {
            console.log('🎉 새 버전 사용 가능');
            this.showUpdateNotification();
        },
        
        showUpdateNotification() {
            const existingNotification = document.getElementById('update-notification');
            if (existingNotification) {
                existingNotification.remove();
            }
            
            const notification = document.createElement('div');
            notification.id = 'update-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                font-size: 14px;
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
            `;
            
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; margin-bottom: 5px;">🎉 새 버전 사용 가능!</div>
                        <div style="font-size: 12px; opacity: 0.9;">더 나은 경험을 위해 업데이트하세요.</div>
                    </div>
                    <button onclick="ServiceWorkerManager.applyUpdate()" 
                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); 
                                   color: white; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 12px;">
                        업데이트
                    </button>
                    <button onclick="ServiceWorkerManager.dismissUpdate()" 
                            style="background: transparent; border: none; color: white; cursor: pointer; font-size: 16px; padding: 5px;">
                        ×
                    </button>
                </div>
            `;
            
            if (!document.getElementById('update-notification-css')) {
                const style = document.createElement('style');
                style.id = 'update-notification-css';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.animation = 'slideIn 0.3s ease-out reverse';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 30000);
        },
        
        applyUpdate() {
            console.log('🔄 업데이트 적용 중...');
            
            if (this.registration && this.registration.waiting) {
                this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            
            setTimeout(() => {
                window.location.reload();
            }, 500);
        },
        
        dismissUpdate() {
            const notification = document.getElementById('update-notification');
            if (notification) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        },
        
        handleServiceWorkerMessage(data) {
            console.log('📨 Service Worker 메시지:', data);
            
            switch (data.type) {
                case 'CACHE_UPDATED':
                    console.log('✅ 캐시 업데이트 완료:', data.version);
                    this.showCacheUpdateToast();
                    break;
                    
                case 'CACHE_CLEARED':
                    console.log('🧹 캐시 정리 완료');
                    break;
            }
        },
        
        showCacheUpdateToast() {
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 12px;
                z-index: 10000;
                animation: fadeInOut 3s ease-in-out;
            `;
            toast.textContent = '✅ 캐시가 업데이트되었습니다';
            
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    };

    // 전역으로 노출
    window.ServiceWorkerManager = ServiceWorkerManager;

    // ========== 레이아웃 최적화 (PWA 안전 영역 고려) ==========
    function fixCategoryTabsLayout() {
        const style = document.createElement('style');
        style.id = 'category-tabs-layout-fix';
        style.textContent = `
            /* ✅ PWA 안전 영역 고려한 레이아웃 */
            .header {
                top: max(env(safe-area-inset-top, 0px), 5px) !important;
                z-index: 1000 !important;
            }
            
            .main-content {
                margin-top: calc(65px + max(env(safe-area-inset-top, 0px), 5px) + 10px) !important;
                padding-top: 0px !important;
            }
            
            .category-tabs-wrapper {
                margin-top: 0px !important;
                padding: 8px 0 6px 0 !important;
                min-height: auto !important;
                position: relative !important;
                z-index: 50 !important;
            }
            
            .category-tabs {
                min-height: 36px !important;
                padding: 2px 20px !important;
            }
            
            .category-tab {
                padding: 8px 14px !important;
                min-height: 36px !important;
                font-size: 13px !important;
            }
            
            .category-description {
                padding: 8px 20px 10px 20px !important;
                line-height: 1.4 !important;
            }
            
            .subcategory-wrapper {
                padding: 12px 20px 16px 20px !important;
            }
            
            /* ========== 모바일 PWA 전용 (핸드폰에서 대분류 처음부터 보이게) ========== */
            @media (max-width: 768px) {
                .header {
                    top: max(env(safe-area-inset-top, 0px), 15px) !important;
                    height: 55px !important;
                }
                
                .main-content {
                    margin-top: calc(55px + max(env(safe-area-inset-top, 0px), 15px) + 5px) !important;
                    padding-top: 0px !important;
                }
                
                .category-tabs-wrapper {
                    margin-top: 0px !important;
                    padding: 5px 0 !important;
                    background: var(--primary-dark) !important;
                    position: relative !important;
                    z-index: 50 !important;
                }
                
                .category-tabs {
                    min-height: 32px !important;
                    padding: 1px 15px !important;
                }
                
                .category-tab {
                    padding: 6px 12px !important;
                    min-height: 32px !important;
                    font-size: 12px !important;
                }
                
                .category-description {
                    padding: 8px 15px 10px 15px !important;
                    font-size: 13px !important;
                }
                
                .subcategory-wrapper {
                    padding: 10px 15px 14px 15px !important;
                }
                
                /* 헤더 컴팩트하게 */
                .header .logo {
                    font-size: 16px !important;
                }
                
                .back-btn, .menu-btn {
                    width: 45px !important;
                    height: 45px !important;
                    z-index: 1001 !important;
                    touch-action: manipulation !important;
                }
            }
            
            /* ========== PWA 전체화면 모드 전용 ========== */
            @media (display-mode: standalone) {
                .header {
                    top: max(env(safe-area-inset-top, 0px), 5px) !important;
                }
                
                .main-content {
                    margin-top: calc(65px + max(env(safe-area-inset-top, 0px), 5px) + 5px) !important;
                }
                
                .back-btn, .menu-btn {
                    z-index: 1002 !important;
                    background: rgba(255, 255, 255, 0.05) !important;
                    border-radius: 8px !important;
                    touch-action: manipulation !important;
                }
                
                .back-btn:active, .menu-btn:active {
                    background: rgba(255, 255, 255, 0.15) !important;
                    transform: translateY(-50%) scale(0.95) !important;
                }
            }
            
            /* ========== 태블릿 PWA 전용 (버튼 클릭 안됨 해결) ========== */
            @media (min-width: 769px) and (display-mode: standalone) {
                .header {
                    top: max(env(safe-area-inset-top, 0px), 10px) !important;
                    height: 65px !important;
                }
                
                .main-content {
                    margin-top: calc(65px + max(env(safe-area-inset-top, 0px), 10px) + 10px) !important;
                }
                
                .back-btn, .menu-btn {
                    top: 50% !important;
                    transform: translateY(-50%) !important;
                    width: 48px !important;
                    height: 48px !important;
                    z-index: 1003 !important;
                    background: rgba(255, 255, 255, 0.1) !important;
                    border-radius: 10px !important;
                    transition: all 0.2s ease !important;
                    touch-action: manipulation !important;
                    pointer-events: auto !important;
                    position: absolute !important;
                }
                
                .menu-btn {
                    right: 15px !important;
                }
                
                .back-btn {
                    left: 15px !important;
                }
                
                .back-btn:hover, .menu-btn:hover {
                    background: rgba(255, 255, 255, 0.2) !important;
                    transform: translateY(-50%) scale(1.1) !important;
                }
                
                .back-btn:active, .menu-btn:active {
                    background: rgba(255, 20, 147, 0.3) !important;
                    transform: translateY(-50%) scale(0.9) !important;
                }
            }
            
            /* ========== PC/데스크톱 전용 ========== */
            @media (min-width: 769px) and (display-mode: browser) {
                .header {
                    top: 0px !important;
                }
                
                .main-content {
                    margin-top: 85px !important;
                }
            }
        `;
        
        // 기존 스타일 제거 후 새로 추가
        const existingStyle = document.getElementById('category-tabs-layout-fix');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        document.head.appendChild(style);
        console.log('✅ PWA 안전 영역 고려한 레이아웃 적용 (핸드폰 대분류 처음부터 보이게 + 태블릿 버튼 클릭 해결)');
    }

    // ========== 초기화 ==========
    function init() {
        console.log('🔧 애플리케이션 초기화 시작');
        
        // 🔧 레이아웃 문제 즉시 해결
        fixCategoryTabsLayout();
        
        setupEventListeners();
        initTheme();
        
        // Firebase 연결 대기
        var retries = 0;
        var maxRetries = 10;
        
        function waitForFirebase() {
            if (window.firebaseReady || retries >= maxRetries) {
                if (window.firebaseReady) {
                    console.log('✅ Firebase 연결 확인됨');
                    // New 표시 시스템 초기화
                    NewIndicatorSystem.init().then(function() {
                        initLogin();
                    }).catch(function() {
                        initLogin();
                    });
                } else {
                    console.error('❌ Firebase 연결 실패');
                    alert('Firebase 연결에 실패했습니다. 페이지를 새로고침해주세요.');
                    initLogin();
                }
            } else {
                console.log('🔄 Firebase 연결 대기 중... (' + (retries + 1) + '/' + maxRetries + ')');
                retries++;
                setTimeout(waitForFirebase, 500);
            }
        }
        
        waitForFirebase();
        
        if (elements.backBtn) {
            elements.backBtn.style.display = 'none';
        }
        
        // Service Worker 초기화 (마지막에 추가)
        ServiceWorkerManager.init();
        
        console.log('✅ HAIRGATOR App initialized (COMPLETE-FINAL VERSION)');
    }

    // ========== 콘솔 디버깅 명령어 ==========
    window.debugHairGator = {
        // AI 버튼 상태 확인
        checkAIButton: function() {
            const btnAkool = document.getElementById('btnAkool');
            console.log('🔍 AI 버튼 상태:');
            console.log('- 요소 존재:', !!btnAkool);
            console.log('- 요소 객체:', btnAkool);
            if (btnAkool) {
                console.log('- display 스타일:', btnAkool.style.display);
                console.log('- computed display:', window.getComputedStyle(btnAkool).display);
                console.log('- 클래스:', btnAkool.className);
                console.log('- 부모 요소:', btnAkool.parentElement);
            }
            return btnAkool;
        },
        
        // 모든 모달 버튼 확인
        checkModalButtons: function() {
            console.log('🔍 모달 버튼들 상태:');
            const buttons = ['btnRegister', 'btnLike', 'btnAkool'];
            buttons.forEach(id => {
                const btn = document.getElementById(id);
                console.log(`- ${id}:`, !!btn, btn);
            });
        },
        
        // 테스트 모달 열기
        openTestModal: function() {
            console.log('🧪 테스트 모달 열기...');
            const modal = document.getElementById('styleModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
                console.log('✅ 테스트 모달 열림');
                
                // AI 버튼 확인
                setTimeout(() => {
                    this.checkAIButton();
                }, 100);
            }
        }
    };

    // ========== 전역 함수 등록 ==========
    window.selectGender = selectGender;
    window.logout = logout;
    window.showHairGuideModal = showHairGuideModal;
    window.hideHairGuideModal = hideHairGuideModal;
    window.showStyleModal = showStyleModal;
    window.hideStyleModal = hideStyleModal;
    window.showAkoolModal = showAkoolModal;
    window.hideAkoolModal = hideAkoolModal;
    window.goBack = goBack;
    window.toggleSidebar = toggleSidebar;
    window.closeSidebar = closeSidebar;
    window.toggleTheme = toggleTheme;
    window.hidePhotoSelectionModal = hidePhotoSelectionModal;
    window.setupAkoolModalButtons = setupAkoolModalButtons;
    window.showPhotoSelectionModal = showPhotoSelectionModal;

    // ========== 앱 초기화 실행 ==========
    init();
    
    console.log('🎉 HAIRGATOR 메인 애플리케이션 로드 완료 (COMPLETE-FINAL)');
    
});
