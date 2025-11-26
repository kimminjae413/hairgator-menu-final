// HAIRGATOR 다국어 지원 시스템
// 지원 언어: 한국어(ko), 영어(en), 일본어(ja), 중국어(zh), 베트남어(vi)

const HAIRGATOR_I18N = {
  ko: {
    // ========== 성별 ==========
    gender: {
      male: '남성',
      female: '여성'
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
      theEdit: 'THE EDIT',
      createNew: '새로운 스타일 생성',
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
      theEdit: 'THE EDIT',
      createNew: 'Create New Look',
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
      theEdit: 'THE EDIT',
      createNew: '新しいスタイルを作成',
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
      theEdit: 'THE EDIT',
      createNew: '创建新风格',
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
      theEdit: 'THE EDIT',
      createNew: 'Tạo kiểu mới',
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
