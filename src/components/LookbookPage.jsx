import React, { useState, useEffect } from 'react';
import '../styles/magazine.css';

const LookbookPage = ({ imageSrc, title, onReset }) => {
    console.log('LookbookPage rendering...');
    const [currentLayout, setCurrentLayout] = useState('classic');
    const [lang, setLang] = useState(window.loadLanguage ? window.loadLanguage() : 'ko');
    const [randomTheme, setRandomTheme] = useState({
        primary: '#000',
        secondary: '#666',
        accent: '#d4af37',
        font: 'sans-serif'
    });

    // Helper for translation
    const t = (key) => {
        return window.t ? window.t(key) : key;
    };

    // Listen for language changes
    useEffect(() => {
        const handleLangChange = (e) => {
            setLang(e.detail);
        };
        window.addEventListener('languageChanged', handleLangChange);
        return () => window.removeEventListener('languageChanged', handleLangChange);
    }, []);

    // Randomize layout and theme on mount or when image changes (reset)
    useEffect(() => {
        const layouts = ['classic', 'modern', 'street'];
        const selectedLayout = layouts[Math.floor(Math.random() * layouts.length)];
        setCurrentLayout(selectedLayout);

        // Randomize Theme Colors based on layout
        if (selectedLayout === 'street') {
            setRandomTheme({
                primary: '#fff',
                bg: '#111',
                secondary: '#aaa',
                accent: '#ff0055', // Neon pink
                font: '"Courier New", monospace'
            });
        } else if (selectedLayout === 'modern') {
            setRandomTheme({
                primary: '#2c3e50',
                bg: '#f8f9fa',
                secondary: '#7f8c8d',
                accent: '#3498db', // Blue
                font: 'Helvetica, sans-serif'
            });
        } else {
            // Classic
            setRandomTheme({
                primary: '#1a1a1a',
                bg: '#fff',
                secondary: '#555',
                accent: '#d4af37', // Gold
                font: 'Georgia, serif'
            });
        }
    }, [imageSrc]);

    const displayTitle = title || "The Vintage Hippie Perm";

    // --- RENDERERS FOR DIFFERENT LAYOUTS ---

    // 1. CLASSIC LAYOUT (Original Style)
    const renderClassic = () => (
        <div className="magazine-grid" style={{ alignItems: 'end', marginBottom: '4rem' }}>
            <div className="col-span-5">
                <span className="display-text" style={{ color: randomTheme.accent, display: 'block', marginBottom: '1rem' }}>
                    {t('lookbook.trendReport')}
                </span>
                <h1 style={{ fontSize: '4.5rem', marginBottom: '2rem', lineHeight: '1.1', color: randomTheme.primary, fontFamily: randomTheme.font }}>
                    {displayTitle}
                </h1>
                <p style={{ fontSize: '1.2rem', color: randomTheme.secondary, maxWidth: '90%' }}>
                    {t('lookbook.descriptions.main')}
                </p>
                {/* Demo Disclaimer */}
                <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#f0f0f0', borderRadius: '4px', fontSize: '0.8rem', color: '#666', display: 'inline-block' }}>
                    Demo Mode: Analysis result is simulated.
                </div>
            </div>
            <div className="col-span-7" style={{ position: 'relative' }}>
                <div style={{
                    position: 'absolute', top: '-20px', right: '-20px', width: '100%', height: '100%',
                    border: `1px solid ${randomTheme.accent}`, zIndex: 0
                }}></div>
                <img src={imageSrc} alt="Analyzed Hairstyle" style={{
                    width: '100%', height: '600px', objectFit: 'cover', position: 'relative', zIndex: 1,
                    filter: 'sepia(10%) contrast(1.05)'
                }} />
            </div>
        </div>
    );

    // 2. MODERN LAYOUT (Split Screen / Clean)
    const renderModern = () => (
        <div className="modern-split">
            <div>
                <span style={{ background: randomTheme.accent, color: '#fff', padding: '0.2rem 0.8rem', fontSize: '0.8rem', borderRadius: '20px' }}>
                    {t('lookbook.analysis')}
                </span>
                <h1 style={{ fontSize: '3.5rem', margin: '1rem 0', color: randomTheme.primary, fontFamily: randomTheme.font }}>
                    {displayTitle}
                </h1>
                <div style={{ width: '50px', height: '4px', background: randomTheme.primary, marginBottom: '2rem' }}></div>
                <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: randomTheme.secondary }}>
                    {t('lookbook.descriptions.main')}
                </p>
                {/* Demo Disclaimer */}
                <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#eee', borderRadius: '4px', fontSize: '0.8rem', color: '#666', display: 'inline-block' }}>
                    Demo Mode: Analysis result is simulated.
                </div>
            </div>
            <div style={{ position: 'relative' }}>
                <img src={imageSrc} alt="Analyzed Hairstyle" style={{
                    width: '100%', height: '700px', objectFit: 'cover', borderRadius: '0px 40px 0px 40px'
                }} />
                <div style={{
                    position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(255,255,255,0.9)',
                    padding: '1rem', borderRadius: '10px'
                }}>
                    <strong style={{ color: randomTheme.primary }}>#2025_TREND</strong>
                </div>
            </div>
        </div>
    );

    // 3. STREET LAYOUT (Bold / Dark Mode / Overlay)
    const renderStreet = () => (
        <div className="street-container">
            <img src={imageSrc} alt="Analyzed Hairstyle" style={{
                width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.2) brightness(0.8)'
            }} />
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'linear-gradient(to top, #000 0%, transparent 50%)'
            }}></div>
            <div style={{ position: 'absolute', bottom: '3rem', left: '3rem', zIndex: 10, paddingRight: '1rem' }}>
                <h1 style={{
                    fontSize: '5rem', color: '#fff', fontFamily: 'Impact, sans-serif', textTransform: 'uppercase',
                    lineHeight: '0.9', marginBottom: '1rem', textShadow: '2px 2px 0px #ff0055'
                }}>
                    {displayTitle}
                </h1>
                <p style={{ color: '#ddd', fontSize: '1.2rem', maxWidth: '600px', borderLeft: '4px solid #ff0055', paddingLeft: '1rem' }}>
                    {t('lookbook.descriptions.main')}
                </p>
                {/* Demo Disclaimer */}
                <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '4px', fontSize: '0.8rem', color: '#fff', display: 'inline-block' }}>
                    Demo Mode: Analysis result is simulated.
                </div>
            </div>
            <div style={{ position: 'absolute', top: '2rem', right: '2rem', transform: 'rotate(5deg)' }}>
                <span style={{
                    background: '#ff0055', color: '#fff', padding: '0.5rem 1rem', fontSize: '1.2rem', fontWeight: 'bold'
                }}>
                    NEW ARRIVAL
                </span>
            </div>
        </div>
    );

    return (
        <div className="lookbook-container animate-fade-in" style={{
            backgroundColor: randomTheme.bg,
            color: randomTheme.primary,
            minHeight: '100vh',
            transition: 'background-color 0.5s ease'
        }}>
            {/* Navigation / Header */}
            <nav style={{
                padding: '2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${currentLayout === 'street' ? '#333' : '#eee'}`
            }}>
                <div className="display-text" style={{ fontSize: '1.5rem', fontWeight: 'bold', color: randomTheme.primary }}>
                    {t('lookbook.theEdit')}
                </div>
                <button onClick={onReset} style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    textDecoration: 'underline',
                    color: randomTheme.primary,
                    fontSize: '1rem'
                }}>
                    ↻ {t('lookbook.createNew')}
                </button>
            </nav>

            <div className="container" style={{ marginTop: '4rem', paddingBottom: '4rem' }}>

                {/* Dynamic Main Layout */}
                {currentLayout === 'classic' && renderClassic()}
                {currentLayout === 'modern' && renderModern()}
                {currentLayout === 'street' && renderStreet()}

                {/* Analysis Tags (Common) */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '4rem', justifyContent: 'center' }}>
                    {[t('lookbook.tags.vintage'), t('lookbook.tags.bohemian'), t('lookbook.tags.volume'), t('lookbook.tags.lovely')].map((tag, i) => (
                        <span key={i} style={{
                            fontSize: '0.9rem',
                            border: `1px solid ${randomTheme.secondary}`,
                            color: randomTheme.primary,
                            padding: '0.4rem 1rem',
                            borderRadius: '30px',
                            background: currentLayout === 'street' ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }}>{tag}</span>
                    ))}
                </div>

                {/* Model Variations Gallery */}
                <div style={{ marginBottom: '6rem' }}>
                    <h3 className="display-text" style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '3rem', color: randomTheme.primary }}>
                        {t('lookbook.variations')}
                    </h3>
                    <div className="magazine-grid">
                        <div className="col-span-4">
                            <img src="/images/hippie_perm_blazer_1764037619611.png" alt="Blazer Style" style={{ width: '100%', height: '400px', objectFit: 'cover', marginBottom: '1rem' }} />
                            <h4 style={{ fontFamily: randomTheme.font, color: randomTheme.primary }}>{t('lookbook.styleVariations.chic')}</h4>
                            <p style={{ fontSize: '0.9rem', color: randomTheme.secondary }}>{t('lookbook.styleVariations.chicDesc')}</p>
                        </div>
                        <div className="col-span-4">
                            <img src="/images/hippie_perm_floral_1764037686316.png" alt="Floral Style" style={{ width: '100%', height: '400px', objectFit: 'cover', marginBottom: '1rem' }} />
                            <h4 style={{ fontFamily: randomTheme.font, color: randomTheme.primary }}>{t('lookbook.styleVariations.boho')}</h4>
                            <p style={{ fontSize: '0.9rem', color: randomTheme.secondary }}>{t('lookbook.styleVariations.bohoDesc')}</p>
                        </div>
                        <div className="col-span-4">
                            <img src="/images/hippie_perm_casual_1764037709035.png" alt="Casual Style" style={{ width: '100%', height: '400px', objectFit: 'cover', marginBottom: '1rem' }} />
                            <h4 style={{ fontFamily: randomTheme.font, color: randomTheme.primary }}>{t('lookbook.styleVariations.casual')}</h4>
                            <p style={{ fontSize: '0.9rem', color: randomTheme.secondary }}>{t('lookbook.styleVariations.casualDesc')}</p>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="magazine-grid" style={{ marginTop: '6rem' }}>

                    {/* Column 1: Face Shape */}
                    <div className="col-span-4">
                        <h3 className="display-text" style={{ borderBottom: `2px solid ${randomTheme.accent}`, paddingBottom: '1rem', marginBottom: '2rem', color: randomTheme.primary }}>
                            {t('lookbook.faceShape')}
                        </h3>
                        <img src="/images/face_shape_analysis_1764037597527.png" alt="Face Shape Analysis" style={{ width: '100%', marginBottom: '1.5rem', border: '1px solid #eee' }} />
                        <div style={{ marginBottom: '2rem' }}>
                            <h4 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: randomTheme.primary }}>Oval & Heart</h4>
                            <p style={{ color: randomTheme.secondary }}>
                                {t('lookbook.descriptions.faceShape')}
                            </p>
                        </div>
                    </div>

                    {/* Column 2: Fashion */}
                    <div className="col-span-4">
                        <h3 className="display-text" style={{ borderBottom: `2px solid ${randomTheme.accent}`, paddingBottom: '1rem', marginBottom: '2rem', color: randomTheme.primary }}>
                            {t('lookbook.styleLook')}
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '2rem', marginRight: '1rem', fontFamily: 'var(--font-display)', color: randomTheme.accent }}>01</span>
                                <div>
                                    <strong style={{ color: randomTheme.primary }}>{t('lookbook.styling.item1')}</strong>
                                    <p style={{ fontSize: '0.9rem', color: randomTheme.secondary }}>{t('lookbook.styling.desc1')}</p>
                                </div>
                            </li>
                            <li style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '2rem', marginRight: '1rem', fontFamily: 'var(--font-display)', color: randomTheme.accent }}>02</span>
                                <div>
                                    <strong style={{ color: randomTheme.primary }}>{t('lookbook.styling.item2')}</strong>
                                    <p style={{ fontSize: '0.9rem', color: randomTheme.secondary }}>{t('lookbook.styling.desc2')}</p>
                                </div>
                            </li>
                            <li style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '2rem', marginRight: '1rem', fontFamily: 'var(--font-display)', color: randomTheme.accent }}>03</span>
                                <div>
                                    <strong style={{ color: randomTheme.primary }}>{t('lookbook.styling.item3')}</strong>
                                    <p style={{ fontSize: '0.9rem', color: randomTheme.secondary }}>{t('lookbook.styling.desc3')}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Maintenance */}
                    <div className="col-span-4">
                        <h3 className="display-text" style={{ borderBottom: `2px solid ${randomTheme.accent}`, paddingBottom: '1rem', marginBottom: '2rem', color: randomTheme.primary }}>
                            {t('lookbook.maintenance')}
                        </h3>
                        <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem', lineHeight: '1.8', color: randomTheme.secondary }}>
                            {t('lookbook.descriptions.maintenance')}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: currentLayout === 'street' ? '#222' : '#fff', padding: '1rem', textAlign: 'center', border: `1px solid ${randomTheme.secondary}` }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💧</div>
                                <small style={{ color: randomTheme.secondary }}>{t('lookbook.hydration')}</small>
                                <div style={{ fontWeight: 'bold', color: randomTheme.primary }}>{t('lookbook.high')}</div>
                            </div>
                            <div style={{ background: currentLayout === 'street' ? '#222' : '#fff', padding: '1rem', textAlign: 'center', border: `1px solid ${randomTheme.secondary}` }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✂️</div>
                                <small style={{ color: randomTheme.secondary }}>{t('lookbook.trim')}</small>
                                <div style={{ fontWeight: 'bold', color: randomTheme.primary }}>8 {t('lookbook.weeks')}</div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LookbookPage;
