// HAIRGATOR 다국어 지원 시스템
// 지원 언어: 한국어(ko), 영어(en), 일본어(ja), 중국어(zh), 베트남어(vi)

const HAIRGATOR_I18N = {
  ko: {
    // ========== 성별 ==========
    gender: {
      male: 'Male',
      female: 'Female'
    },

    // ========== 카테고리 이름 (남성) ==========
    categories: {
      'SIDE FRINGE': '사이드 프린지',
      'SIDE PART': '사이드 파트',
      'FRINGE UP': '프린지 업',
      'PUSHED BACK': '푸시드 백',
      'BUZZ': '버즈컷',
      'CROP': '크롭컷',
      'MOHICAN': '모히칸',

      // 여성
      'A LENGTH': 'A 길이',
      'B LENGTH': 'B 길이',
      'C LENGTH': 'C 길이',
      'D LENGTH': 'D 길이',
      'E LENGTH': 'E 길이',
      'F LENGTH': 'F 길이',
      'G LENGTH': 'G 길이',
      'H LENGTH': 'H 길이'
    },

    // ========== 카테고리 설명 ==========
    descriptions: {
      'SIDE FRINGE': '앞머리를 앞으로 내려 자연스럽게 흐르는 스타일、 넓은 이마를 돌출 시킨 역삼각형 얼굴형 보완에 효과적이며、 부드럽고 감성적인 이미지를 연출',
      'SIDE PART': '가르마를 기준으로 나누는 스타일、 뒤로 넘기면 클래식、내리면 캐주얼、 다양한 얼굴형에 무난하고 활용도가 높음',
      'FRINGE UP': '윗머리는 앞으로 흐르고、 앞머리 끝만 위로 올린 스타일이며、 이마를 적당히 드러내 시원하고 세련된 인상、 활동적이며 깔끔한 스타일을 연출',
      'PUSHED BACK': '모발의 전체 흐름이 뒤쪽으로 자연스럽게 넘어가는 스타일、 이마를 드러내 단정＆클래식＆도희적 무드、 직장／포멀 룩과 잘 어울림',
      'BUZZ': '남성 스타일 중 가장 짧은 커트 스타일、 두상 및 윤곽이 그대로 드러나 심플하고 군더더기 없는 이미지이며 관리가 매우 쉬움',
      'CROP': '버즈보다 조금 더 긴 길이이며 앞머리가 이마 상단을 가볍게 덮는 형태、 텍스처＆볼륨 표현이 가능하며 트렌디하고 시크한 느낌',
      'MOHICAN': '톱（센터）부분을 위쪽으로 세워 강조하며 사이드가 상대적으로 짧아 코너 및 라인감이 또렷、 강한 개성 ＆ 에너지 ＆ 스트릿 무드 연출',

      'A LENGTH': 'A 길이는 가슴선 아래로 내려오는 롱헤어로, 원랭스·레이어드 롱·굵은 S컬이 잘 맞아 우아하고 드라마틱한 분위기를 냅니다.',
      'B LENGTH': 'B 길이는 가슴 아래(A)와 쇄골 아래(C) 사이의 미디엄-롱으로, 레이어드 미디엄롱·바디펌이 어울려 부드럽고 실용적인 인상을 줍니다.',
      'C LENGTH': 'C 길이는 쇄골 라인 아래의 세미 롱으로, 레이어드 C/S컬·에어리펌과 잘 맞아 단정하고 세련된 오피스 무드를 냅니다.',
      'D LENGTH': 'D 길이는 어깨에 정확히 닿는 길이로, LOB·숄더 C컬·빌드펌이 어울려 트렌디하고 깔끔한 느낌을 줍니다.',
      'E LENGTH': 'E 길이는 어깨 바로 위의 단발로, 클래식 보브·A라인 보브·내/외 C컬이 잘 맞아 경쾌하고 모던한 인상을 만듭니다.',
      'F LENGTH': 'F 길이는 턱선 바로 밑 보브 길이로, 프렌치 보브·일자 단발·텍스쳐 보브가 어울려 시크하고 도회적인 분위기를 연출합니다.',
      'G LENGTH': 'G 길이는 턱선과 같은 높이의 미니 보브로, 클래식 턱선 보브·미니 레이어 보브가 잘 맞아 똘똘하고 미니멀한 무드를 줍니다.',
      'H LENGTH': 'H 길이는 귀선~베리숏구간의 숏헤어로, 픽시·샤그 숏·허쉬 숏 등이 어울려 활동적이고 개성 있는 스타일을 완성합니다.'
    },

    // ========== 서브카테고리 (앞머리 길이) ==========
    subcategories: {
      'None': '없음',
      'Fore Head': '이마 라인',
      'Eye Brow': '눈썹 라인',
      'Eye': '눈 라인',
      'Cheekbone': '광대 라인'
    },

    // ========== UI 텍스트 ==========
    ui: {
      // 버튼
      close: '닫기',
      select: '선택하기',
      logout: '로그아웃',
      login: '로그인',

      // 테마
      darkMode: '다크 모드',
      lightMode: '라이트 모드',

      // 사이드바
      personalColor: '퍼스널 컬러 진단',
      personalColorDesc: '614개 헤어컬러 데이터 기반 분석',

      // 메시지
      loginSuccess: '로그인 성공',
      logoutSuccess: '로그아웃되었습니다',
      loginFailed: '로그인 실패',
      selectGender: '성별을 선택해주세요',
      loading: '로딩 중...',
      noStyles: '스타일이 없습니다',
      error: '오류가 발생했습니다',

      // 모달
      category: '카테고리',
      subcategory: '서브카테고리',

      // 크레딧
      credit: '크레딧',
      loginStatus: '로그인',
      guest: '게스트'
    },

    // ========== 룩북 (Lookbook) ==========
    lookbook: {
      button: '룩북',
      noCredits: '크레딧이 부족합니다',
      insufficientCredits: '크레딧이 부족합니다. 충전 후 이용해주세요.',
      loading: 'AI가 스타일을 분석하고 있습니다...',
      loadingSubtext: '이미지 3장을 생성 중입니다. 잠시만 기다려주세요.',
      theEdit: 'THE EDIT',
      createNew: '새로운 스타일 생성',
      close: '닫기',
      trendReport: '트렌드 리포트 2025',
      analysis: 'AI 분석 결과',
      variations: '스타일 변형 (Variations)',
      faceShape: '추천 얼굴형 (Best Match)',
      styleLook: '스타일링 가이드',
      maintenance: '관리 및 유지',
      hydration: '수분 공급',
      trim: '커트 주기',
      weeks: '주',
      high: '높음',
      low: '낮음',
      medium: '보통',
      tags: {
        vintage: '#빈티지',
        bohemian: '#보헤미안',
        volume: '#볼륨감',
        lovely: '#러블리'
      },
      descriptions: {
        main: '혼돈 속의 조화. 이 스타일은 현대적인 스타일링에 자유분방한 보헤미안 정신을 불어넣습니다. 단순한 헤어스타일이 아닌, 하나의 태도입니다.',
        faceShape: '이 헤어스타일의 **풍성한 사이드 볼륨**은 하트형 얼굴의 좁은 턱선을 보완하여 밸런스를 맞춰주며, 계란형 얼굴의 부드러운 윤곽을 더욱 돋보이게 하여 장점을 극대화합니다.',
        maintenance: '이 스타일의 매력은 **낮은 유지보수**에 있습니다. 헝클어질수록 더 멋스럽습니다. 하지만 "지푸라기"처럼 보이지 않으려면 수분 공급이 핵심입니다.'
      },
      styleVariations: {
        chic: '시크 스트럭처',
        chicDesc: '볼륨감과 대비되는 날렵한 테일러링.',
        boho: '로맨틱 보호',
        bohoDesc: '몽환적인 미학을 위한 부드러운 패브릭.',
        casual: '데일리 캐주얼',
        casualDesc: '데님과 티셔츠로 완성하는 무심한 듯한 멋.'
      },
      styling: {
        item1: '오버사이즈 블레이저',
        desc1: '와일드한 헤어와 구조적인 테일러링의 대비.',
        item2: '플로럴 원피스',
        desc2: '코티지 코어 미학을 극대화하세요.',
        item3: '볼드 이어링',
        desc3: '얇은 링보다는 청키한 스테이트먼트 주얼리.'
      }
    },

    // ========== 퍼스널컬러 ==========
    personalColor: {
      title: 'HAIRGATOR Personal Color',
      subtitle: 'AI 기반 퍼스널컬러 진단 시스템',
      loading: '시스템 초기화 중...',
      close: '닫기',
      modeSelect: '퍼스널컬러 진단 방법을 선택하세요',

      // 메인 메뉴
      mainMenu: {
        aiAnalysis: 'AI 퍼스널컬러 분석',
        aiAnalysisDesc: '카메라로 실시간 피부톤 분석',
        draping: '전문가 드래이핑',
        drapingDesc: '4계절 컬러로 직접 비교'
      },

      // AI 분석 모드
      aiMode: {
        title: 'AI 퍼스널컬러 분석',
        backHome: '← 홈으로',
        startCamera: '📹 카메라 시작',
        capture: '📸 촬영하기',
        retry: '🔄 다시 촬영',
        faceGuide: '얼굴을 화면 중앙에<br>위치시켜주세요',
        captureGuide: '✨ 얼굴이 인식되었습니다! <b>촬영하기</b> 버튼을 눌러주세요',
        faceDetected: '얼굴이 인식되었습니다! 촬영 버튼을 눌러주세요',
        captureComplete: '촬영 완료! 분석 결과를 확인하세요',
        retryMessage: '다시 얼굴을 화면에 맞춰주세요',
        description: '최신 AI 기술로 얼굴을 분석하여 정확한 퍼스널컬러를 진단합니다. MediaPipe 얼굴 인식과 Delta E 2000 색차 측정을 활용합니다.',
        feature1: '실시간 얼굴 인식 및 피부톤 추출',
        feature2: 'LAB 색공간 기반 정밀 분석',
        feature3: '전문가 노하우 데이터베이스 활용',
        feature4: '624개 헤어컬러와 자동 매칭',
        startBtn: 'AI 분석 시작',

        // 분석 단계
        steps: {
          title: 'AI 분석 진행상황',
          step1: '얼굴 인식',
          step1Desc: 'MediaPipe로 얼굴 영역을 감지합니다',
          step2: '피부톤 분석',
          step2Desc: 'RGB → LAB 색공간 변환 및 색상 추출',
          step3: 'Delta E 계산',
          step3Desc: '색차 측정 및 정확도 산출',
          step4: '결과 생성',
          step4Desc: '전문가 노하우 기반 최종 진단'
        },

        // 결과
        result: {
          title: '🎨 퍼스널컬러 분석 결과',
          skinAnalysis: '📍 당신의 피부 분석',
          skinTone: '피부톤',
          undertone: '언더톤',
          recommendedSeason: '✨ 추천 퍼스널컬러',
          matchingColors: '💄 어울리는 컬러',
          confidence: '신뢰도'
        }
      },

      // 드래이핑 모드
      drapingMode: {
        title: '전문가 드래이핑 모드',
        startCamera: '카메라 시작',
        saveColor: '현재 색상 저장',
        faceGuide: '얼굴을 가이드라인에\n맞춰주세요',
        seasonPalette: '4계절 색상 팔레트',
        spring: '봄',
        summer: '여름',
        autumn: '가을',
        winter: '겨울',
        description: '전문가 노하우를 바탕으로 실시간 드래이핑을 통해 가장 어울리는 헤어컬러를 직접 확인해보세요.',
        feature1: '실시간 카메라 드래이핑',
        feature2: '4계절 색상 팔레트 제공',
        feature3: 'Before/After 즉시 비교',
        feature4: '브랜드별 제품 추천',
        startBtn: '드래이핑 시작'
      },

      // 언더톤
      undertones: {
        warm: '웜톤 (따뜻한 톤)',
        cool: '쿨톤 (차가운 톤)',
        neutral: '뉴트럴 (중간 톤)'
      },

      // 시즌 타입
      seasons: {
        springWarmBright: '봄 웜 브라이트',
        springWarmLight: '봄 웜 라이트',
        autumnWarmDeep: '가을 웜 딥',
        autumnWarmMuted: '가을 웜 뮤트',
        summerCoolBright: '여름 쿨 브라이트',
        summerCoolLight: '여름 쿨 라이트',
        winterCoolDeep: '겨울 쿨 딥',
        winterCoolMuted: '겨울 쿨 뮤트',
        neutralLight: '뉴트럴 라이트',
        neutralDeep: '뉴트럴 딥'
      },

      // 시즌별 설명
      seasonDescriptions: {
        springWarmBright: '생기 넘치고 화사한 이미지! 선명하고 밝은 웜톤 컬러가 잘 어울립니다.',
        springWarmLight: '맑고 청순한 이미지! 연하고 부드러운 웜톤 컬러가 잘 어울립니다.',
        autumnWarmDeep: '깊고 고급스러운 이미지! 진하고 풍부한 웜톤 컬러가 잘 어울립니다.',
        autumnWarmMuted: '내추럴하고 세련된 이미지! 차분하고 자연스러운 웜톤 컬러가 잘 어울립니다.',
        summerCoolBright: '청아하고 시원한 이미지! 선명하고 깨끗한 쿨톤 컬러가 잘 어울립니다.',
        summerCoolLight: '우아하고 부드러운 이미지! 파스텔톤의 쿨 컬러가 잘 어울립니다.',
        winterCoolDeep: '강렬하고 도시적인 이미지! 선명하고 진한 쿨톤 컬러가 잘 어울립니다.',
        winterCoolMuted: '차분하고 세련된 이미지! 무채색 계열과 저채도 쿨 컬러가 잘 어울립니다.',
        neutralLight: '다양한 컬러가 어울리는 타입! 밝은 톤의 부드러운 컬러를 추천합니다.',
        neutralDeep: '다양한 컬러가 어울리는 타입! 깊은 톤의 세련된 컬러를 추천합니다.'
      },

      // 시즌별 추천
      seasonRecommendations: {
        springWarmBright: '💄 추천 컬러: 비비드 코랄, 오렌지레드, 선명한 피치\n💎 추천 메탈: 옐로우 골드, 브라이트 골드',
        springWarmLight: '💄 추천 컬러: 살구색, 라이트 코랄, 아이보리, 크림\n💎 추천 메탈: 로즈골드, 샴페인 골드',
        autumnWarmDeep: '💄 추천 컬러: 버건디, 초콜릿브라운, 딥 테라코타\n💎 추천 메탈: 앤틱 골드, 브론즈',
        autumnWarmMuted: '💄 추천 컬러: 머스타드, 올리브, 카키, 테라코타\n💎 추천 메탈: 골드, 브라스',
        summerCoolBright: '💄 추천 컬러: 로즈핑크, 라벤더, 스카이블루\n💎 추천 메탈: 화이트골드, 로즈골드',
        summerCoolLight: '💄 추천 컬러: 소프트 핑크, 라일락, 파우더블루\n💎 추천 메탈: 실버, 화이트골드',
        winterCoolDeep: '💄 추천 컬러: 와인, 로얄블루, 에메랄드, 블랙\n💎 추천 메탈: 플래티넘, 화이트골드',
        winterCoolMuted: '💄 추천 컬러: 차콜, 네이비, 버건디, 다크그레이\n💎 추천 메탈: 실버, 건메탈',
        neutralLight: '💄 추천 컬러: 더스티 핑크, 소프트 베이지, 라이트 모브\n💎 추천 메탈: 로즈골드, 소프트 실버',
        neutralDeep: '💄 추천 컬러: 토프, 머브, 다크브라운, 올리브\n💎 추천 메탈: 혼합 메탈, 앤틱 실버'
      }
    }
  },

  en: {
    // ========== Gender ==========
    gender: {
      male: 'Male',
      female: 'Female'
    },

    // ========== Category Names ==========
    categories: {
      'SIDE FRINGE': 'Side Fringe',
      'SIDE PART': 'Side Part',
      'FRINGE UP': 'Fringe Up',
      'PUSHED BACK': 'Pushed Back',
      'BUZZ': 'Buzz Cut',
      'CROP': 'Crop Cut',
      'MOHICAN': 'Mohican',

      'A LENGTH': 'A Length',
      'B LENGTH': 'B Length',
      'C LENGTH': 'C Length',
      'D LENGTH': 'D Length',
      'E LENGTH': 'E Length',
      'F LENGTH': 'F Length',
      'G LENGTH': 'G Length',
      'H LENGTH': 'H Length'
    },

    // ========== Category Descriptions ==========
    descriptions: {
      'SIDE FRINGE': 'Bangs that fall forward naturally, effective for balancing triangular face shapes with prominent foreheads, creating a soft and emotional image',
      'SIDE PART': 'Style parted along the side, classic when swept back, casual when down, versatile for various face shapes with high usability',
      'FRINGE UP': 'Hair flows forward with bangs lifted up, reveals forehead moderately for a fresh and sophisticated look, creates an active and clean style',
      'PUSHED BACK': 'Hair flows naturally backward, reveals forehead for a neat, classic, and urban mood, perfect for business and formal looks',
      'BUZZ': 'The shortest men\'s cut style, reveals head shape and contours for a simple, no-frills image with very easy maintenance',
      'CROP': 'Slightly longer than buzz with bangs lightly covering upper forehead, allows texture and volume expression with trendy and chic feel',
      'MOHICAN': 'Center section lifted upward for emphasis, shorter sides create clear corners and lines, expresses strong personality, energy, and street mood',

      'A LENGTH': 'A length is long hair below chest line, suits one-length, layered long, and thick S-curls for an elegant and dramatic atmosphere.',
      'B LENGTH': 'B length is medium-long between below chest (A) and below collarbone (C), suits layered medium-long and body perm for soft and practical impression.',
      'C LENGTH': 'C length is semi-long below collarbone line, suits layered C/S-curl and airy perm for neat and sophisticated office mood.',
      'D LENGTH': 'D length reaches exactly to shoulders, suits LOB, shoulder C-curl, and build perm for trendy and clean feel.',
      'E LENGTH': 'E length is bob just above shoulders, suits classic bob, A-line bob, and inward/outward C-curl for lively and modern impression.',
      'F LENGTH': 'F length is bob just below jawline, suits French bob, straight bob, and texture bob for chic and urban atmosphere.',
      'G LENGTH': 'G length is mini bob at jawline height, suits classic jawline bob and mini layered bob for smart and minimal mood.',
      'H LENGTH': 'H length is short hair from ear line to very short range, suits pixie, shag short, and hush short for active and unique style.'
    },

    // ========== Subcategories ==========
    subcategories: {
      'None': 'None',
      'Fore Head': 'Fore Head',
      'Eye Brow': 'Eye Brow',
      'Eye': 'Eye',
      'Cheekbone': 'Cheekbone'
    },

    // ========== UI Text ==========
    ui: {
      close: 'Close',
      select: 'Select',
      logout: 'Logout',
      login: 'Login',

      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',

      personalColor: 'Personal Color Analysis',
      personalColorDesc: 'Analysis based on 614 hair color data',

      loginSuccess: 'Login successful',
      logoutSuccess: 'Logged out',
      loginFailed: 'Login failed',
      selectGender: 'Please select gender',
      loading: 'Loading...',
      noStyles: 'No styles available',
      error: 'An error occurred',

      category: 'Category',
      subcategory: 'Subcategory',

      credit: 'Credit',
      loginStatus: 'Login',
      guest: 'Guest'
    },

    // ========== Lookbook ==========
    lookbook: {
      button: 'Lookbook',
      noCredits: 'Insufficient credits',
      insufficientCredits: 'Insufficient credits. Please recharge to continue.',
      loading: 'AI is analyzing your style...',
      loadingSubtext: 'Generating 3 style images. Please wait.',
      theEdit: 'THE EDIT',
      createNew: 'Create New Look',
      close: 'Close',
      trendReport: 'Trend Report 2025',
      analysis: 'Analysis',
      variations: 'Style Variations',
      faceShape: 'Recommended Face Shape',
      styleLook: 'Style The Look',
      maintenance: 'Maintenance',
      hydration: 'Hydration',
      trim: 'Trim',
      weeks: 'Weeks',
      high: 'High',
      low: 'Low',
      medium: 'Medium',
      tags: {
        vintage: '#Vintage',
        bohemian: '#Bohemian',
        volume: '#Volume',
        lovely: '#Lovely'
      },
      descriptions: {
        main: 'Embrace the chaos. This style brings a carefree, bohemian spirit to modern styling. It\'s not just a hairstyle; it\'s an attitude.',
        faceShape: 'The **rich side volume** of this style complements the narrow jawline of heart-shaped faces, creating balance, while maximizing the advantages of oval faces by highlighting their soft contours.',
        maintenance: 'The beauty of this style lies in its **low maintenance**. The messier, the better. However, hydration is key to preventing a \'straw-like\' appearance.'
      },
      styleVariations: {
        chic: 'The Chic Structured',
        chicDesc: 'Contrast volume with sharp tailoring.',
        boho: 'The Romantic Boho',
        bohoDesc: 'Soft fabrics for a dreamy aesthetic.',
        casual: 'The Daily Casual',
        casualDesc: 'Effortless vibes with denim and tees.'
      },
      styling: {
        item1: 'Oversized Blazers',
        desc1: 'Contrast the wild hair with structured tailoring.',
        item2: 'Floral Dresses',
        desc2: 'Lean into the cottage-core aesthetic.',
        item3: 'Bold Earrings',
        desc3: 'Gold hoops get lost; go for chunky statements.'
      }
    },

    // ========== Personal Color ==========
    personalColor: {
      title: 'HAIRGATOR Personal Color',
      subtitle: 'AI-Based Personal Color Analysis System',
      loading: 'Initializing system...',
      close: 'Close',
      modeSelect: 'Choose your personal color analysis method',

      mainMenu: {
        aiAnalysis: 'AI Personal Color Analysis',
        aiAnalysisDesc: 'Real-time skin tone analysis with camera',
        draping: 'Expert Draping',
        drapingDesc: 'Compare with 4 seasonal colors'
      },

      aiMode: {
        title: 'AI Personal Color Analysis',
        backHome: '← Home',
        startCamera: '📹 Start Camera',
        capture: '📸 Capture',
        retry: '🔄 Retry',
        faceGuide: 'Position your face<br>in the center',
        captureGuide: '✨ Face detected! Press the <b>Capture</b> button',
        faceDetected: 'Face detected! Press the capture button',
        captureComplete: 'Capture complete! Check your results',
        retryMessage: 'Please position your face again',
        description: 'Analyze your face with latest AI technology for accurate personal color diagnosis. Using MediaPipe face detection and Delta E 2000 color difference measurement.',
        feature1: 'Real-time face detection and skin tone extraction',
        feature2: 'LAB color space based precision analysis',
        feature3: 'Expert know-how database utilization',
        feature4: 'Auto-matching with 624 hair colors',
        startBtn: 'Start AI Analysis',

        steps: {
          title: 'AI Analysis Progress',
          step1: 'Face Detection',
          step1Desc: 'Detecting face area with MediaPipe',
          step2: 'Skin Tone Analysis',
          step2Desc: 'RGB to LAB color space conversion',
          step3: 'Delta E Calculation',
          step3Desc: 'Color difference measurement',
          step4: 'Result Generation',
          step4Desc: 'Expert-based final diagnosis'
        },

        result: {
          title: '🎨 Personal Color Analysis Result',
          skinAnalysis: '📍 Your Skin Analysis',
          skinTone: 'Skin Tone',
          undertone: 'Undertone',
          recommendedSeason: '✨ Recommended Personal Color',
          matchingColors: '💄 Matching Colors',
          confidence: 'Confidence'
        }
      },

      drapingMode: {
        title: 'Expert Draping Mode',
        startCamera: 'Start Camera',
        saveColor: 'Save Current Color',
        faceGuide: 'Align your face<br>with the guideline',
        seasonPalette: '4 Season Color Palette',
        spring: 'Spring',
        summer: 'Summer',
        autumn: 'Autumn',
        winter: 'Winter',
        description: 'Experience real-time draping based on expert know-how to find your best matching hair color.',
        feature1: 'Real-time camera draping',
        feature2: '4 season color palette provided',
        feature3: 'Instant Before/After comparison',
        feature4: 'Brand-specific product recommendations',
        startBtn: 'Start Draping'
      },

      undertones: {
        warm: 'Warm Tone',
        cool: 'Cool Tone',
        neutral: 'Neutral Tone'
      },

      seasons: {
        springWarmBright: 'Spring Warm Bright',
        springWarmLight: 'Spring Warm Light',
        autumnWarmDeep: 'Autumn Warm Deep',
        autumnWarmMuted: 'Autumn Warm Muted',
        summerCoolBright: 'Summer Cool Bright',
        summerCoolLight: 'Summer Cool Light',
        winterCoolDeep: 'Winter Cool Deep',
        winterCoolMuted: 'Winter Cool Muted',
        neutralLight: 'Neutral Light',
        neutralDeep: 'Neutral Deep'
      },

      seasonDescriptions: {
        springWarmBright: 'Vibrant and radiant image! Vivid and bright warm colors suit you best.',
        springWarmLight: 'Clear and pure image! Soft and gentle warm colors suit you best.',
        autumnWarmDeep: 'Deep and luxurious image! Rich and deep warm colors suit you best.',
        autumnWarmMuted: 'Natural and sophisticated image! Calm and natural warm colors suit you best.',
        summerCoolBright: 'Fresh and cool image! Vivid and clean cool colors suit you best.',
        summerCoolLight: 'Elegant and soft image! Pastel cool colors suit you best.',
        winterCoolDeep: 'Bold and urban image! Vivid and deep cool colors suit you best.',
        winterCoolMuted: 'Calm and refined image! Achromatic and low-saturation cool colors suit you best.',
        neutralLight: 'Versatile type! Light and soft colors are recommended.',
        neutralDeep: 'Versatile type! Deep and sophisticated colors are recommended.'
      },

      seasonRecommendations: {
        springWarmBright: '💄 Colors: Vivid Coral, Orange Red, Bright Peach\n💎 Metals: Yellow Gold, Bright Gold',
        springWarmLight: '💄 Colors: Apricot, Light Coral, Ivory, Cream\n💎 Metals: Rose Gold, Champagne Gold',
        autumnWarmDeep: '💄 Colors: Burgundy, Chocolate Brown, Deep Terracotta\n💎 Metals: Antique Gold, Bronze',
        autumnWarmMuted: '💄 Colors: Mustard, Olive, Khaki, Terracotta\n💎 Metals: Gold, Brass',
        summerCoolBright: '💄 Colors: Rose Pink, Lavender, Sky Blue\n💎 Metals: White Gold, Rose Gold',
        summerCoolLight: '💄 Colors: Soft Pink, Lilac, Powder Blue\n💎 Metals: Silver, White Gold',
        winterCoolDeep: '💄 Colors: Wine, Royal Blue, Emerald, Black\n💎 Metals: Platinum, White Gold',
        winterCoolMuted: '💄 Colors: Charcoal, Navy, Burgundy, Dark Gray\n💎 Metals: Silver, Gunmetal',
        neutralLight: '💄 Colors: Dusty Pink, Soft Beige, Light Mauve\n💎 Metals: Rose Gold, Soft Silver',
        neutralDeep: '💄 Colors: Taupe, Mauve, Dark Brown, Olive\n💎 Metals: Mixed Metals, Antique Silver'
      }
    }
  },

  ja: {
    // ========== 性別 ==========
    gender: {
      male: '男性',
      female: '女性'
    },

    // ========== カテゴリ名 ==========
    categories: {
      'SIDE FRINGE': 'サイドフリンジ',
      'SIDE PART': 'サイドパート',
      'FRINGE UP': 'フリンジアップ',
      'PUSHED BACK': 'プッシュドバック',
      'BUZZ': 'バズカット',
      'CROP': 'クロップカット',
      'MOHICAN': 'モヒカン',

      'A LENGTH': 'Aレングス',
      'B LENGTH': 'Bレングス',
      'C LENGTH': 'Cレングス',
      'D LENGTH': 'Dレングス',
      'E LENGTH': 'Eレングス',
      'F LENGTH': 'Fレングス',
      'G LENGTH': 'Gレングス',
      'H LENGTH': 'Hレングス'
    },

    // ========== カテゴリ説明 ==========
    descriptions: {
      'SIDE FRINGE': '前髪を前に下ろして自然に流すスタイル、広いおでこを目立たせた逆三角形の顔型の補正に効果的で、柔らかく感性的なイメージを演出',
      'SIDE PART': '分け目を基準に分けるスタイル、後ろに流すとクラシック、下ろすとカジュアル、様々な顔型に無難で活用度が高い',
      'FRINGE UP': '上の髪は前に流れ、前髪の先端だけを上げたスタイル、おでこを適度に見せて爽やかで洗練された印象、活動的できれいなスタイルを演出',
      'PUSHED BACK': '髪の全体的な流れが後ろに自然に流れるスタイル、おでこを見せて端正でクラシックで都会的なムード、職場やフォーマルルックによく合う',
      'BUZZ': '男性スタイルの中で最も短いカットスタイル、頭の形と輪郭がそのまま現れてシンプルで無駄のないイメージで管理が非常に簡単',
      'CROP': 'バズより少し長い長さで前髪がおでこの上部を軽く覆う形、テクスチャとボリューム表現が可能でトレンディでシックな感じ',
      'MOHICAN': 'トップ（センター）部分を上に立てて強調し、サイドが相対的に短くてコーナーとラインがはっきり、強い個性とエネルギーとストリートムードを演出',

      'A LENGTH': 'Aレングスは胸より下に降りるロングヘアで、ワンレングス・レイヤードロング・太いSカールがよく合い、優雅でドラマチックな雰囲気を出します。',
      'B LENGTH': 'Bレングスは胸下（A）と鎖骨下（C）の間のミディアムロングで、レイヤードミディアムロング・ボディパーマが似合い、柔らかく実用的な印象を与えます。',
      'C LENGTH': 'Cレングスは鎖骨ライン下のセミロングで、レイヤードC/Sカール・エアリーパーマとよく合い、端正で洗練されたオフィスムードを出します。',
      'D LENGTH': 'Dレングスは肩に正確に触れる長さで、LOB・ショルダーCカール・ビルドパーマが似合い、トレンディできれいな感じを与えます。',
      'E LENGTH': 'Eレングスは肩のすぐ上のボブで、クラシックボブ・Aラインボブ・内外Cカールがよく合い、軽快でモダンな印象を作ります。',
      'F LENGTH': 'Fレングスは顎のすぐ下のボブ長で、フレンチボブ・ストレートボブ・テクスチャボブが似合い、シックで都会的な雰囲気を演出します。',
      'G LENGTH': 'Gレングスは顎と同じ高さのミニボブで、クラシック顎ボブ・ミニレイヤーボブがよく合い、きびきびとミニマルなムードを与えます。',
      'H LENGTH': 'Hレングスは耳～ベリーショート区間のショートヘアで、ピクシー・シャグショート・ハッシュショートなどが似合い、活動的で個性的なスタイルを完成します。'
    },

    // ========== サブカテゴリ ==========
    subcategories: {
      'None': 'なし',
      'Fore Head': '額ライン',
      'Eye Brow': '眉ライン',
      'Eye': '目ライン',
      'Cheekbone': '頬骨ライン'
    },

    // ========== UIテキスト ==========
    ui: {
      close: '閉じる',
      select: '選択',
      logout: 'ログアウト',
      login: 'ログイン',

      darkMode: 'ダークモード',
      lightMode: 'ライトモード',

      personalColor: 'パーソナルカラー診断',
      personalColorDesc: '614個のヘアカラーデータ基盤分析',

      loginSuccess: 'ログイン成功',
      logoutSuccess: 'ログアウトしました',
      loginFailed: 'ログイン失敗',
      selectGender: '性別を選択してください',
      loading: '読み込み中...',
      noStyles: 'スタイルがありません',
      error: 'エラーが発生しました',

      category: 'カテゴリ',
      subcategory: 'サブカテゴリ',

      credit: 'クレジット',
      loginStatus: 'ログイン',
      guest: 'ゲスト'
    },

    // ========== Lookbook (Japanese) ==========
    lookbook: {
      button: 'ルックブック',
      noCredits: 'クレジットが不足しています',
      insufficientCredits: 'クレジットが不足しています。チャージしてからご利用ください。',
      loading: 'AIがスタイルを分析しています...',
      loadingSubtext: '3枚の画像を生成中です。しばらくお待ちください。',
      theEdit: 'THE EDIT',
      createNew: '新しいスタイルを作成',
      close: '閉じる',
      trendReport: 'トレンドレポート 2025',
      analysis: 'AI分析結果',
      variations: 'スタイルバリエーション',
      faceShape: 'おすすめの顔型 (Best Match)',
      styleLook: 'スタイリングガイド',
      maintenance: 'メンテナンス',
      hydration: '保湿',
      trim: 'カット周期',
      weeks: '週間',
      high: '高い',
      low: '低い',
      medium: '普通',
      tags: {
        vintage: '#ヴィンテージ',
        bohemian: '#ボヘミアン',
        volume: '#ボリューム',
        lovely: '#ラブリー'
      },
      descriptions: {
        main: 'カオスを受け入れて。このスタイルは、現代のスタイリングに自由奔放なボヘミアン精神をもたらします。単なる髪型ではなく、一つの態度です。',
        faceShape: 'このヘアスタイルの**豊かなサイドボリューム**は、ハート型顔の細い顎のラインを補完してバランスを取り、卵型顔の柔らかい輪郭をさらに引き立てて長所を最大化します。',
        maintenance: 'このスタイルの美しさは**手入れのしやすさ**にあります。無造作であるほど良いのです。ただし、「わら」のように見えないように保湿が重要です。'
      },
      styleVariations: {
        chic: 'シック・ストラクチャード',
        chicDesc: 'ボリュームと対照的なシャープなテーラリング。',
        boho: 'ロマンティック・ボーホー',
        bohoDesc: '夢のような美学のための柔らかい生地。',
        casual: 'デイリー・カジュアル',
        casualDesc: 'デニムとTシャツでエフォートレスな雰囲気を。'
      },
      styling: {
        item1: 'オーバーサイズブレザー',
        desc1: 'ワイルドな髪と構築的なテーラリングの対比。',
        item2: '花柄ワンピース',
        desc2: 'コテージコアの美学を取り入れて。',
        item3: '大胆なイヤリング',
        desc3: '華奢なものは埋もれてしまいます。大ぶりなものを。'
      }
    },

    // ========== パーソナルカラー ==========
    personalColor: {
      title: 'HAIRGATOR Personal Color',
      subtitle: 'AI ベースのパーソナルカラー診断システム',
      loading: 'システム初期化中...',
      close: '閉じる',
      modeSelect: 'パーソナルカラー診断方法を選択してください',

      mainMenu: {
        aiAnalysis: 'AI パーソナルカラー分析',
        aiAnalysisDesc: 'カメラでリアルタイム肌トーン分析',
        draping: 'エキスパートドレーピング',
        drapingDesc: '4シーズンカラーで比較'
      },

      aiMode: {
        title: 'AI パーソナルカラー分析',
        backHome: '← ホーム',
        startCamera: '📹 カメラ開始',
        capture: '📸 撮影',
        retry: '🔄 再撮影',
        faceGuide: '顔を画面の中央に<br>配置してください',
        captureGuide: '✨ 顔が認識されました！<b>撮影</b>ボタンを押してください',
        faceDetected: '顔が認識されました！撮影ボタンを押してください',
        captureComplete: '撮影完了！結果を確認してください',
        retryMessage: '顔を画面に合わせてください',
        description: '最新AI技術で顔を分析し、正確なパーソナルカラーを診断します。MediaPipe顔認識とDelta E 2000色差測定を活用します。',
        feature1: 'リアルタイム顔認識と肌トーン抽出',
        feature2: 'LAB色空間ベースの精密分析',
        feature3: '専門家ノウハウデータベース活用',
        feature4: '624種類のヘアカラーと自動マッチング',
        startBtn: 'AI分析開始',

        steps: {
          title: 'AI 分析進行状況',
          step1: '顔認識',
          step1Desc: 'MediaPipeで顔領域を検出',
          step2: '肌トーン分析',
          step2Desc: 'RGB から LAB 色空間変換',
          step3: 'Delta E 計算',
          step3Desc: '色差測定と精度算出',
          step4: '結果生成',
          step4Desc: '専門家ノウハウ基盤の最終診断'
        },

        result: {
          title: '🎨 パーソナルカラー分析結果',
          skinAnalysis: '📍 あなたの肌分析',
          skinTone: '肌トーン',
          undertone: 'アンダートーン',
          recommendedSeason: '✨ おすすめパーソナルカラー',
          matchingColors: '💄 似合う色',
          confidence: '信頼度'
        }
      },

      drapingMode: {
        title: 'エキスパートドレーピングモード',
        startCamera: 'カメラ開始',
        saveColor: '現在の色を保存',
        faceGuide: 'ガイドラインに<br>顔を合わせてください',
        seasonPalette: '4シーズンカラーパレット',
        spring: '春',
        summer: '夏',
        autumn: '秋',
        winter: '冬',
        description: '専門家のノウハウをベースにリアルタイムドレーピングで最も似合うヘアカラーを直接確認できます。',
        feature1: 'リアルタイムカメラドレーピング',
        feature2: '4シーズンカラーパレット提供',
        feature3: 'Before/After即時比較',
        feature4: 'ブランド別商品推薦',
        startBtn: 'ドレーピング開始'
      },

      undertones: {
        warm: 'ウォームトーン（暖かいトーン）',
        cool: 'クールトーン（冷たいトーン）',
        neutral: 'ニュートラル（中間トーン）'
      },

      seasons: {
        springWarmBright: 'スプリングウォームブライト',
        springWarmLight: 'スプリングウォームライト',
        autumnWarmDeep: 'オータムウォームディープ',
        autumnWarmMuted: 'オータムウォームミュート',
        summerCoolBright: 'サマークールブライト',
        summerCoolLight: 'サマークールライト',
        winterCoolDeep: 'ウィンタークールディープ',
        winterCoolMuted: 'ウィンタークールミュート',
        neutralLight: 'ニュートラルライト',
        neutralDeep: 'ニュートラルディープ'
      },

      seasonDescriptions: {
        springWarmBright: '生き生きとした華やかなイメージ！鮮やかで明るいウォームカラーがお似合いです。',
        springWarmLight: '澄んで清楚なイメージ！淡く柔らかいウォームカラーがお似合いです。',
        autumnWarmDeep: '深みのある高級感のあるイメージ！濃厚で豊かなウォームカラーがお似合いです。',
        autumnWarmMuted: 'ナチュラルで洗練されたイメージ！落ち着いた自然なウォームカラーがお似合いです。',
        summerCoolBright: '爽やかで涼しげなイメージ！鮮明できれいなクールカラーがお似合いです。',
        summerCoolLight: '優雅で柔らかいイメージ！パステルトーンのクールカラーがお似合いです。',
        winterCoolDeep: '強烈で都会的なイメージ！鮮やかで深いクールカラーがお似合いです。',
        winterCoolMuted: '落ち着いて洗練されたイメージ！無彩色系と低彩度クールカラーがお似合いです。',
        neutralLight: '様々な色が似合うタイプ！明るいトーンの柔らかい色をお勧めします。',
        neutralDeep: '様々な色が似合うタイプ！深いトーンの洗練された色をお勧めします。'
      },

      seasonRecommendations: {
        springWarmBright: '💄 おすすめカラー: ビビッドコーラル、オレンジレッド、明るいピーチ\n💎 おすすめメタル: イエローゴールド、ブライトゴールド',
        springWarmLight: '💄 おすすめカラー: アプリコット、ライトコーラル、アイボリー、クリーム\n💎 おすすめメタル: ローズゴールド、シャンパンゴールド',
        autumnWarmDeep: '💄 おすすめカラー: バーガンディ、チョコレートブラウン、ディープテラコッタ\n💎 おすすめメタル: アンティークゴールド、ブロンズ',
        autumnWarmMuted: '💄 おすすめカラー: マスタード、オリーブ、カーキ、テラコッタ\n💎 おすすめメタル: ゴールド、ブラス',
        summerCoolBright: '💄 おすすめカラー: ローズピンク、ラベンダー、スカイブルー\n💎 おすすめメタル: ホワイトゴールド、ローズゴールド',
        summerCoolLight: '💄 おすすめカラー: ソフトピンク、ライラック、パウダーブルー\n💎 おすすめメタル: シルバー、ホワイトゴールド',
        winterCoolDeep: '💄 おすすめカラー: ワイン、ロイヤルブルー、エメラルド、ブラック\n💎 おすすめメタル: プラチナ、ホワイトゴールド',
        winterCoolMuted: '💄 おすすめカラー: チャコール、ネイビー、バーガンディ、ダークグレー\n💎 おすすめメタル: シルバー、ガンメタル',
        neutralLight: '💄 おすすめカラー: ダスティピンク、ソフトベージュ、ライトモーヴ\n💎 おすすめメタル: ローズゴールド、ソフトシルバー',
        neutralDeep: '💄 おすすめカラー: トープ、モーヴ、ダークブラウン、オリーブ\n💎 おすすめメタル: ミックスメタル、アンティークシルバー'
      }
    }
  },

  zh: {
    // ========== 性别 ==========
    gender: {
      male: '男性',
      female: '女性'
    },

    // ========== 分类名称 ==========
    categories: {
      'SIDE FRINGE': '侧刘海',
      'SIDE PART': '侧分',
      'FRINGE UP': '刘海上翘',
      'PUSHED BACK': '后梳',
      'BUZZ': '寸头',
      'CROP': '短发',
      'MOHICAN': '莫西干',

      'A LENGTH': 'A长度',
      'B LENGTH': 'B长度',
      'C LENGTH': 'C长度',
      'D LENGTH': 'D长度',
      'E LENGTH': 'E长度',
      'F LENGTH': 'F长度',
      'G LENGTH': 'G长度',
      'H LENGTH': 'H长度'
    },

    // ========== 分类说明 ==========
    descriptions: {
      'SIDE FRINGE': '刘海自然下垂的风格，有效修饰额头宽的倒三角脸型，营造柔和感性的形象',
      'SIDE PART': '以分界线为基准分开的风格，向后梳是经典款，放下来是休闲款，适合各种脸型，实用性高',
      'FRINGE UP': '上部头发向前流动，只有刘海尖端向上翘起的风格，适度露出额头，清爽精致，营造活力整洁的风格',
      'PUSHED BACK': '整体发流自然向后的风格，露出额头，干练、经典、都市气质，适合职场和正装造型',
      'BUZZ': '男士发型中最短的剪发风格，头型和轮廓完全展现，简约无赘，打理非常容易',
      'CROP': '比寸头稍长，刘海轻盖额头上部的形态，可表现质感和蓬松感，时尚别致',
      'MOHICAN': '顶部（中心）部分向上竖立强调，两侧相对较短，棱角和线条分明，表现强烈个性、活力和街头气息',

      'A LENGTH': 'A长度是胸线以下的长发，适合一刀切、层次长发、粗S卷，展现优雅和戏剧性氛围。',
      'B LENGTH': 'B长度是胸下（A）和锁骨下（C）之间的中长发，适合层次中长发和身体烫，给人柔和实用的印象。',
      'C LENGTH': 'C长度是锁骨线下的半长发，适合层次C/S卷和空气烫，展现干练精致的办公气质。',
      'D LENGTH': 'D长度正好触及肩膀，适合LOB、肩部C卷和蓬松烫，给人时尚整洁的感觉。',
      'E LENGTH': 'E长度是肩膀正上方的短发，适合经典波波头、A线波波头、内外C卷，营造轻快现代的印象。',
      'F LENGTH': 'F长度是下巴正下方的波波头长度，适合法式波波头、直发短发、质感波波头，展现别致都市氛围。',
      'G LENGTH': 'G长度是与下巴同高的迷你波波头，适合经典下巴波波头、迷你层次波波头，给人干练简约的气质。',
      'H LENGTH': 'H长度是耳线至超短发区间的短发，适合精灵短发、碎发短发等，完成活力个性的风格。'
    },

    // ========== 子分类 ==========
    subcategories: {
      'None': '无',
      'Fore Head': '额头线',
      'Eye Brow': '眉毛线',
      'Eye': '眼线',
      'Cheekbone': '颧骨线'
    },

    // ========== UI文本 ==========
    ui: {
      close: '关闭',
      select: '选择',
      logout: '登出',
      login: '登录',

      darkMode: '暗色模式',
      lightMode: '亮色模式',

      personalColor: '个人色彩分析',
      personalColorDesc: '基于614个染发数据的分析',

      loginSuccess: '登录成功',
      logoutSuccess: '已登出',
      loginFailed: '登录失败',
      selectGender: '请选择性别',
      loading: '加载中...',
      noStyles: '没有可用风格',
      error: '发生错误',

      category: '分类',
      subcategory: '子分类',

      credit: '积分',
      loginStatus: '登录',
      guest: '访客'
    },

    // ========== Lookbook (Chinese) ==========
    lookbook: {
      button: '造型册',
      noCredits: '积分不足',
      insufficientCredits: '积分不足，请充值后使用。',
      loading: 'AI正在分析您的风格...',
      loadingSubtext: '正在生成3张风格图片，请稍候。',
      theEdit: 'THE EDIT',
      createNew: '创建新风格',
      close: '关闭',
      trendReport: '趋势报告 2025',
      analysis: 'AI分析结果',
      variations: '风格变体',
      faceShape: '推荐脸型 (Best Match)',
      styleLook: '造型指南',
      maintenance: '保养与维护',
      hydration: '保湿',
      trim: '修剪周期',
      weeks: '周',
      high: '高',
      low: '低',
      medium: '中',
      tags: {
        vintage: '#复古',
        bohemian: '#波希米亚',
        volume: '#蓬松感',
        lovely: '#可爱'
      },
      descriptions: {
        main: '拥抱混乱。这种风格为现代造型带来了无忧无虑的波希米亚精神。这不仅仅是一种发型，更是一种态度。',
        faceShape: '这款发型的**丰富侧面发量**弥补了心形脸下巴窄的缺点，平衡了比例，同时突出了鹅蛋脸柔和的轮廓，最大化了优点。',
        maintenance: '这种风格的美在于**低维护**。越凌乱越好。然而，保湿是防止看起来像“稻草”的关键。'
      },
      styleVariations: {
        chic: '别致结构',
        chicDesc: '蓬松感与利落剪裁的对比。',
        boho: '浪漫波希米亚',
        bohoDesc: '梦幻美学的柔软面料。',
        casual: '日常休闲',
        casualDesc: '牛仔裤和T恤的轻松氛围。'
      },
      styling: {
        item1: '超大西装外套',
        desc1: '狂野发型与结构化剪裁的对比。',
        item2: '碎花连衣裙',
        desc2: '融入田园风格美学。',
        item3: '大胆耳环',
        desc3: '金圈耳环会被淹没；选择厚重的声明首饰。'
      }
    },

    // ========== 个人色彩 ==========
    personalColor: {
      title: 'HAIRGATOR Personal Color',
      subtitle: 'AI个人色彩诊断系统',
      loading: '系统初始化中...',
      close: '关闭',
      modeSelect: '请选择个人色彩诊断方法',

      mainMenu: {
        aiAnalysis: 'AI个人色彩分析',
        aiAnalysisDesc: '相机实时肤色分析',
        draping: '专家披巾测试',
        drapingDesc: '用四季颜色进行比较'
      },

      aiMode: {
        title: 'AI个人色彩分析',
        backHome: '← 首页',
        startCamera: '📹 启动相机',
        capture: '📸 拍照',
        retry: '🔄 重新拍照',
        faceGuide: '请将脸部置于<br>画面中央',
        captureGuide: '✨ 已识别人脸！请按<b>拍照</b>按钮',
        faceDetected: '已识别人脸！请按拍照按钮',
        captureComplete: '拍照完成！请查看结果',
        retryMessage: '请重新将脸部对准画面',
        description: '使用最新AI技术分析面部，准确诊断个人色彩。采用MediaPipe人脸识别和Delta E 2000色差测量。',
        feature1: '实时人脸识别及肤色提取',
        feature2: '基于LAB色彩空间的精密分析',
        feature3: '专家经验数据库应用',
        feature4: '与624种发色自动匹配',
        startBtn: '开始AI分析',

        steps: {
          title: 'AI分析进度',
          step1: '人脸识别',
          step1Desc: '使用MediaPipe检测面部区域',
          step2: '肤色分析',
          step2Desc: 'RGB转LAB色彩空间',
          step3: 'Delta E计算',
          step3Desc: '色差测量和准确度计算',
          step4: '结果生成',
          step4Desc: '基于专家经验的最终诊断'
        },

        result: {
          title: '🎨 个人色彩分析结果',
          skinAnalysis: '📍 您的皮肤分析',
          skinTone: '肤色',
          undertone: '底色调',
          recommendedSeason: '✨ 推荐个人色彩',
          matchingColors: '💄 适合的颜色',
          confidence: '置信度'
        }
      },

      drapingMode: {
        title: '专家披巾测试模式',
        startCamera: '启动相机',
        saveColor: '保存当前颜色',
        faceGuide: '请将脸部对准<br>引导线',
        seasonPalette: '四季色彩调色板',
        spring: '春',
        summer: '夏',
        autumn: '秋',
        winter: '冬',
        description: '基于专家经验的实时披巾测试，直接查看最适合您的发色。',
        feature1: '实时相机披巾测试',
        feature2: '四季色彩调色板提供',
        feature3: '即时Before/After对比',
        feature4: '品牌产品推荐',
        startBtn: '开始披巾测试'
      },

      undertones: {
        warm: '暖色调',
        cool: '冷色调',
        neutral: '中性色调'
      },

      seasons: {
        springWarmBright: '春季暖色明亮型',
        springWarmLight: '春季暖色浅淡型',
        autumnWarmDeep: '秋季暖色深沉型',
        autumnWarmMuted: '秋季暖色柔和型',
        summerCoolBright: '夏季冷色明亮型',
        summerCoolLight: '夏季冷色浅淡型',
        winterCoolDeep: '冬季冷色深沉型',
        winterCoolMuted: '冬季冷色柔和型',
        neutralLight: '中性浅淡型',
        neutralDeep: '中性深沉型'
      },

      seasonDescriptions: {
        springWarmBright: '活力四射的明亮形象！鲜艳明亮的暖色调最适合您。',
        springWarmLight: '清新纯净的形象！柔和淡雅的暖色调最适合您。',
        autumnWarmDeep: '深沉高贵的形象！浓郁丰富的暖色调最适合您。',
        autumnWarmMuted: '自然精致的形象！沉稳自然的暖色调最适合您。',
        summerCoolBright: '清爽凉爽的形象！鲜明清透的冷色调最适合您。',
        summerCoolLight: '优雅柔和的形象！粉彩冷色调最适合您。',
        winterCoolDeep: '强烈都市的形象！鲜艳深沉的冷色调最适合您。',
        winterCoolMuted: '沉稳精致的形象！无彩色系和低饱和冷色调最适合您。',
        neutralLight: '多色皆宜的类型！推荐明亮柔和的色调。',
        neutralDeep: '多色皆宜的类型！推荐深沉精致的色调。'
      },

      seasonRecommendations: {
        springWarmBright: '💄 推荐颜色: 亮珊瑚色、橙红色、明亮桃色\n💎 推荐金属: 黄金、亮金',
        springWarmLight: '💄 推荐颜色: 杏色、浅珊瑚色、象牙白、奶油色\n💎 推荐金属: 玫瑰金、香槟金',
        autumnWarmDeep: '💄 推荐颜色: 酒红、巧克力棕、深陶土色\n💎 推荐金属: 古金、青铜',
        autumnWarmMuted: '💄 推荐颜色: 芥末黄、橄榄绿、卡其、陶土色\n💎 推荐金属: 金色、黄铜',
        summerCoolBright: '💄 推荐颜色: 玫瑰粉、薰衣草紫、天蓝\n💎 推荐金属: 白金、玫瑰金',
        summerCoolLight: '💄 推荐颜色: 柔粉、丁香紫、粉蓝\n💎 推荐金属: 银色、白金',
        winterCoolDeep: '💄 推荐颜色: 酒红、皇家蓝、祖母绿、黑色\n💎 推荐金属: 铂金、白金',
        winterCoolMuted: '💄 推荐颜色: 炭灰、海军蓝、酒红、深灰\n💎 推荐金属: 银色、枪色',
        neutralLight: '💄 推荐颜色: 灰粉、柔和米色、浅紫\n💎 推荐金属: 玫瑰金、柔银',
        neutralDeep: '💄 推荐颜色: 灰褐、紫红、深棕、橄榄\n💎 推荐金属: 混合金属、古银'
      }
    }
  },

  vi: {
    // ========== Giới tính ==========
    gender: {
      male: 'Nam',
      female: 'Nữ'
    },

    // ========== Tên danh mục ==========
    categories: {
      'SIDE FRINGE': 'Mái lệch',
      'SIDE PART': 'Ngôi lệch',
      'FRINGE UP': 'Mái vểnh',
      'PUSHED BACK': 'Chải ngược',
      'BUZZ': 'Buzz Cut',
      'CROP': 'Crop Cut',
      'MOHICAN': 'Mohican',

      'A LENGTH': 'Độ dài A',
      'B LENGTH': 'Độ dài B',
      'C LENGTH': 'Độ dài C',
      'D LENGTH': 'Độ dài D',
      'E LENGTH': 'Độ dài E',
      'F LENGTH': 'Độ dài F',
      'G LENGTH': 'Độ dài G',
      'H LENGTH': 'Độ dài H'
    },

    // ========== Mô tả danh mục ==========
    descriptions: {
      'SIDE FRINGE': 'Kiểu mái rủ tự nhiên về phía trước, hiệu quả trong việc cân bằng khuôn mặt tam giác với trán rộng, tạo hình ảnh mềm mại và cảm xúc',
      'SIDE PART': 'Kiểu tóc chia ngôi bên, cổ điển khi chải ngược, thoải mái khi buông xõa, phù hợp với nhiều khuôn mặt với tính ứng dụng cao',
      'FRINGE UP': 'Tóc trên chảy về phía trước, mái vểnh lên, để lộ trán vừa phải tạo ấn tượng tươi mát và tinh tế, tạo phong cách năng động và gọn gàng',
      'PUSHED BACK': 'Tóc chảy tự nhiên về phía sau, để lộ trán tạo phong cách gọn gàng, cổ điển và đô thị, hoàn hảo cho công sở và trang phục trang trọng',
      'BUZZ': 'Kiểu cắt tóc ngắn nhất dành cho nam, để lộ hình dạng đầu và đường nét cho hình ảnh đơn giản, gọn gàng với bảo dưỡng rất dễ dàng',
      'CROP': 'Dài hơn buzz một chút với mái che nhẹ phần trên trán, cho phép thể hiện kết cấu và độ phồng với cảm giác thời trang và thanh lịch',
      'MOHICAN': 'Phần giữa (trung tâm) dựng lên nhấn mạnh, hai bên tương đối ngắn tạo góc cạnh và đường nét rõ ràng, thể hiện cá tính mạnh mẽ, năng lượng và phong cách đường phố',

      'A LENGTH': 'Độ dài A là tóc dài dưới đường ngực, phù hợp với kiểu một độ dài, tầng dài, và S-curl dày tạo bầu không khí thanh lịch và kịch tính.',
      'B LENGTH': 'Độ dài B là trung bình-dài giữa dưới ngực (A) và dưới xương đòn (C), phù hợp với tầng trung dài và uốn body tạo ấn tượng mềm mại và thực dụng.',
      'C LENGTH': 'Độ dài C là bán dài dưới đường xương đòn, phù hợp với tầng C/S-curl và uốn nhẹ tạo phong cách văn phòng gọn gàng và tinh tế.',
      'D LENGTH': 'Độ dài D chạm chính xác đến vai, phù hợp với LOB, C-curl vai và uốn phồng tạo cảm giác thời trang và gọn gàng.',
      'E LENGTH': 'Độ dài E là tóc bob ngay trên vai, phù hợp với bob cổ điển, bob A-line và C-curl trong/ngoài tạo ấn tượng sống động và hiện đại.',
      'F LENGTH': 'Độ dài F là bob ngay dưới đường hàm, phù hợp với bob Pháp, bob thẳng và bob kết cấu tạo bầu không khí thanh lịch và đô thị.',
      'G LENGTH': 'Độ dài G là mini bob bằng đường hàm, phù hợp với bob hàm cổ điển và bob tầng mini tạo phong cách thông minh và tối giản.',
      'H LENGTH': 'Độ dài H là tóc ngắn từ đường tai đến rất ngắn, phù hợp với pixie, shag ngắn, hush ngắn tạo phong cách năng động và độc đáo.'
    },

    // ========== Danh mục phụ ==========
    subcategories: {
      'None': 'Không có',
      'Fore Head': 'Đường trán',
      'Eye Brow': 'Đường lông mày',
      'Eye': 'Đường mắt',
      'Cheekbone': 'Đường gò má'
    },

    // ========== Văn bản UI ==========
    ui: {
      close: 'Đóng',
      select: 'Chọn',
      logout: 'Đăng xuất',
      login: 'Đăng nhập',

      darkMode: 'Chế độ tối',
      lightMode: 'Chế độ sáng',

      personalColor: 'Phân tích màu cá nhân',
      personalColorDesc: 'Phân tích dựa trên 614 dữ liệu màu tóc',

      loginSuccess: 'Đăng nhập thành công',
      logoutSuccess: 'Đã đăng xuất',
      loginFailed: 'Đăng nhập thất bại',
      selectGender: 'Vui lòng chọn giới tính',
      loading: 'Đang tải...',
      noStyles: 'Không có kiểu tóc',
      error: 'Đã xảy ra lỗi',

      category: 'Danh mục',
      subcategory: 'Danh mục phụ',

      credit: 'Tín dụng',
      loginStatus: 'Đăng nhập',
      guest: 'Khách'
    },

    // ========== Lookbook (Vietnamese) ==========
    lookbook: {
      button: 'Lookbook',
      noCredits: 'Không đủ tín dụng',
      insufficientCredits: 'Không đủ tín dụng. Vui lòng nạp thêm để tiếp tục.',
      loading: 'AI đang phân tích phong cách của bạn...',
      loadingSubtext: 'Đang tạo 3 hình ảnh. Vui lòng đợi.',
      theEdit: 'THE EDIT',
      createNew: 'Tạo kiểu mới',
      close: 'Đóng',
      trendReport: 'Báo cáo xu hướng 2025',
      analysis: 'Kết quả phân tích AI',
      variations: 'Biến thể phong cách',
      faceShape: 'Khuôn mặt phù hợp (Best Match)',
      styleLook: 'Hướng dẫn phối đồ',
      maintenance: 'Bảo dưỡng',
      hydration: 'Dưỡng ẩm',
      trim: 'Chu kỳ cắt',
      weeks: 'Tuần',
      high: 'Cao',
      low: 'Thấp',
      medium: 'Trung bình',
      tags: {
        vintage: '#CổĐiển',
        bohemian: '#Bohemian',
        volume: '#Phồng',
        lovely: '#ĐángYêu'
      },
      descriptions: {
        main: 'Đón nhận sự hỗn loạn. Phong cách này mang tinh thần bohemian tự do vào phong cách hiện đại. Nó không chỉ là một kiểu tóc; đó là một thái độ.',
        faceShape: 'Độ phồng hai bên phong phú của kiểu tóc này bổ sung cho đường hàm hẹp của khuôn mặt trái tim, tạo sự cân bằng, đồng thời làm nổi bật các đường nét mềm mại của khuôn mặt trái xoan để tối đa hóa ưu điểm.',
        maintenance: 'Vẻ đẹp của phong cách này nằm ở việc **ít bảo dưỡng**. Càng rối càng tốt. Tuy nhiên, dưỡng ẩm là chìa khóa để ngăn ngừa vẻ ngoài như "rơm".'
      },
      styleVariations: {
        chic: 'Cấu trúc sang trọng',
        chicDesc: 'Tương phản độ phồng với đường may sắc sảo.',
        boho: 'Boho lãng mạn',
        bohoDesc: 'Vải mềm cho thẩm mỹ mộng mơ.',
        casual: 'Thường ngày',
        casualDesc: 'Cảm giác thoải mái với denim và áo phông.'
      },
      styling: {
        item1: 'Áo khoác Blazer quá khổ',
        desc1: 'Tương phản tóc hoang dã với đường may cấu trúc.',
        item2: 'Váy hoa',
        desc2: 'Hòa mình vào thẩm mỹ cottage-core.',
        item3: 'Bông tai đậm',
        desc3: 'Khuyên vàng sẽ bị chìm; hãy chọn trang sức to bản.'
      }
    },

    // ========== Màu cá nhân ==========
    personalColor: {
      title: 'HAIRGATOR Personal Color',
      subtitle: 'Hệ thống chẩn đoán màu cá nhân AI',
      loading: 'Đang khởi tạo hệ thống...',
      close: 'Đóng',
      modeSelect: 'Chọn phương pháp chẩn đoán màu cá nhân',

      mainMenu: {
        aiAnalysis: 'Phân tích màu cá nhân AI',
        aiAnalysisDesc: 'Phân tích tông da thời gian thực qua camera',
        draping: 'Draping chuyên gia',
        drapingDesc: 'So sánh với màu 4 mùa'
      },

      aiMode: {
        title: 'Phân tích màu cá nhân AI',
        backHome: '← Trang chủ',
        startCamera: '📹 Bắt đầu camera',
        capture: '📸 Chụp',
        retry: '🔄 Chụp lại',
        faceGuide: 'Đặt khuôn mặt<br>vào giữa màn hình',
        captureGuide: '✨ Đã nhận diện khuôn mặt! Nhấn nút <b>Chụp</b>',
        faceDetected: 'Đã nhận diện khuôn mặt! Nhấn nút chụp',
        captureComplete: 'Chụp hoàn tất! Kiểm tra kết quả',
        retryMessage: 'Vui lòng đặt lại khuôn mặt',
        description: 'Phân tích khuôn mặt bằng công nghệ AI mới nhất để chẩn đoán chính xác màu cá nhân. Sử dụng MediaPipe nhận diện khuôn mặt và đo độ chênh lệch màu Delta E 2000.',
        feature1: 'Nhận diện khuôn mặt thời gian thực và trích xuất tông da',
        feature2: 'Phân tích chính xác dựa trên không gian màu LAB',
        feature3: 'Sử dụng cơ sở dữ liệu kiến thức chuyên gia',
        feature4: 'Tự động kết hợp với 624 màu tóc',
        startBtn: 'Bắt đầu phân tích AI',

        steps: {
          title: 'Tiến trình phân tích AI',
          step1: 'Nhận diện khuôn mặt',
          step1Desc: 'Phát hiện vùng mặt với MediaPipe',
          step2: 'Phân tích tông da',
          step2Desc: 'Chuyển đổi không gian màu RGB sang LAB',
          step3: 'Tính toán Delta E',
          step3Desc: 'Đo độ chênh lệch màu',
          step4: 'Tạo kết quả',
          step4Desc: 'Chẩn đoán cuối cùng dựa trên chuyên gia'
        },

        result: {
          title: '🎨 Kết quả phân tích màu cá nhân',
          skinAnalysis: '📍 Phân tích da của bạn',
          skinTone: 'Tông da',
          undertone: 'Undertone',
          recommendedSeason: '✨ Màu cá nhân đề xuất',
          matchingColors: '💄 Màu phù hợp',
          confidence: 'Độ tin cậy'
        }
      },

      drapingMode: {
        title: 'Chế độ Draping chuyên gia',
        startCamera: 'Bắt đầu camera',
        saveColor: 'Lưu màu hiện tại',
        faceGuide: 'Căn chỉnh khuôn mặt<br>với đường hướng dẫn',
        seasonPalette: 'Bảng màu 4 mùa',
        spring: 'Xuân',
        summer: 'Hạ',
        autumn: 'Thu',
        winter: 'Đông',
        description: 'Trải nghiệm draping thời gian thực dựa trên kiến thức chuyên gia để tìm màu tóc phù hợp nhất với bạn.',
        feature1: 'Draping camera thời gian thực',
        feature2: 'Cung cấp bảng màu 4 mùa',
        feature3: 'So sánh Before/After tức thì',
        feature4: 'Đề xuất sản phẩm theo thương hiệu',
        startBtn: 'Bắt đầu Draping'
      },

      undertones: {
        warm: 'Tông ấm',
        cool: 'Tông lạnh',
        neutral: 'Tông trung tính'
      },

      seasons: {
        springWarmBright: 'Xuân Ấm Sáng',
        springWarmLight: 'Xuân Ấm Nhạt',
        autumnWarmDeep: 'Thu Ấm Đậm',
        autumnWarmMuted: 'Thu Ấm Dịu',
        summerCoolBright: 'Hạ Lạnh Sáng',
        summerCoolLight: 'Hạ Lạnh Nhạt',
        winterCoolDeep: 'Đông Lạnh Đậm',
        winterCoolMuted: 'Đông Lạnh Dịu',
        neutralLight: 'Trung Tính Nhạt',
        neutralDeep: 'Trung Tính Đậm'
      },

      seasonDescriptions: {
        springWarmBright: 'Hình ảnh tươi sáng và rực rỡ! Màu ấm sáng và rực rỡ phù hợp nhất với bạn.',
        springWarmLight: 'Hình ảnh trong sáng và thuần khiết! Màu ấm nhẹ nhàng phù hợp nhất với bạn.',
        autumnWarmDeep: 'Hình ảnh sâu lắng và sang trọng! Màu ấm đậm và phong phú phù hợp nhất với bạn.',
        autumnWarmMuted: 'Hình ảnh tự nhiên và tinh tế! Màu ấm trầm và tự nhiên phù hợp nhất với bạn.',
        summerCoolBright: 'Hình ảnh tươi mát và trong trẻo! Màu lạnh sáng và sạch phù hợp nhất với bạn.',
        summerCoolLight: 'Hình ảnh thanh lịch và dịu dàng! Màu pastel lạnh phù hợp nhất với bạn.',
        winterCoolDeep: 'Hình ảnh mạnh mẽ và đô thị! Màu lạnh sáng và đậm phù hợp nhất với bạn.',
        winterCoolMuted: 'Hình ảnh điềm tĩnh và tinh tế! Màu vô sắc và độ bão hòa thấp phù hợp nhất với bạn.',
        neutralLight: 'Loại đa năng! Màu sáng và mềm mại được đề xuất.',
        neutralDeep: 'Loại đa năng! Màu đậm và tinh tế được đề xuất.'
      },

      seasonRecommendations: {
        springWarmBright: '💄 Màu: San hô tươi, Đỏ cam, Đào sáng\n💎 Kim loại: Vàng, Vàng sáng',
        springWarmLight: '💄 Màu: Mơ, San hô nhạt, Ngà, Kem\n💎 Kim loại: Vàng hồng, Vàng champagne',
        autumnWarmDeep: '💄 Màu: Đỏ rượu, Nâu sôcôla, Đất nung đậm\n💎 Kim loại: Vàng cổ, Đồng',
        autumnWarmMuted: '💄 Màu: Mù tạt, Oliu, Kaki, Đất nung\n💎 Kim loại: Vàng, Đồng thau',
        summerCoolBright: '💄 Màu: Hồng hoa hồng, Oải hương, Xanh da trời\n💎 Kim loại: Vàng trắng, Vàng hồng',
        summerCoolLight: '💄 Màu: Hồng nhạt, Tử đinh hương, Xanh phấn\n💎 Kim loại: Bạc, Vàng trắng',
        winterCoolDeep: '💄 Màu: Rượu vang, Xanh hoàng gia, Ngọc lục bảo, Đen\n💎 Kim loại: Bạch kim, Vàng trắng',
        winterCoolMuted: '💄 Màu: Than, Hải quân, Đỏ rượu, Xám đậm\n💎 Kim loại: Bạc, Kim loại súng',
        neutralLight: '💄 Màu: Hồng bụi, Beige nhạt, Tím nhạt\n💎 Kim loại: Vàng hồng, Bạc mềm',
        neutralDeep: '💄 Màu: Nâu xám, Tím, Nâu đậm, Oliu\n💎 Kim loại: Kim loại hỗn hợp, Bạc cổ'
      }
    }
  }
};

// ========== 번역 함수 ==========

let currentLanguage = 'ko'; // 기본 언어

// 언어 설정
function setLanguage(lang) {
  if (HAIRGATOR_I18N[lang]) {
    currentLanguage = lang;
    localStorage.setItem('hairgator_language', lang);
    console.log(`✅ 언어 변경: ${lang}`);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    return true;
  }
  console.warn(`⚠️ 지원하지 않는 언어: ${lang}`);
  return false;
}

// 저장된 언어 불러오기
function loadLanguage() {
  const savedLang = localStorage.getItem('hairgator_language');
  if (savedLang && HAIRGATOR_I18N[savedLang]) {
    currentLanguage = savedLang;
  }
  return currentLanguage;
}

// 번역 함수 (키 경로 방식)
function t(keyPath, lang = currentLanguage) {
  const keys = keyPath.split('.');
  let value = HAIRGATOR_I18N[lang];

  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      console.warn(`⚠️ 번역 키를 찾을 수 없음: ${keyPath} (${lang})`);
      return keyPath; // 키를 찾을 수 없으면 키 자체 반환
    }
  }

  return value || keyPath;
}

// 카테고리 이름 번역 (직접 접근)
function translateCategory(categoryName, lang = currentLanguage) {
  return HAIRGATOR_I18N[lang]?.categories?.[categoryName] || categoryName;
}

// 카테고리 설명 번역
function translateDescription(categoryName, lang = currentLanguage) {
  return HAIRGATOR_I18N[lang]?.descriptions?.[categoryName] || '';
}

// 서브카테고리 번역
function translateSubcategory(subcategoryName, lang = currentLanguage) {
  return HAIRGATOR_I18N[lang]?.subcategories?.[subcategoryName] || subcategoryName;
}

// 전역 객체로 노출
window.HAIRGATOR_I18N = HAIRGATOR_I18N;
window.setLanguage = setLanguage;
window.loadLanguage = loadLanguage;
window.t = t;
window.translateCategory = translateCategory;
window.translateDescription = translateDescription;
window.translateSubcategory = translateSubcategory;

console.log('🌍 HAIRGATOR 다국어 시스템 로드 완료 (5개 언어 지원)');
console.log('사용법: t("ui.close"), translateCategory("SIDE FRINGE"), setLanguage("en")');
