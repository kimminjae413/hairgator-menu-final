import React, { useState, useRef } from 'react';
import { supabase, uploadLookbookImage, saveLookbookEntry } from '../lib/supabase';

const HeroUploader = ({ onImageAnalyzed }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // 드래그 앤 드롭 핸들러
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    // 파일 선택 핸들러
    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    // 파일 처리 및 업로드
    const handleFile = async (file) => {
        // 이미지 파일 검증
        if (!file.type.startsWith('image/')) {
            setError('이미지 파일만 업로드 가능합니다.');
            return;
        }

        // 파일 크기 제한 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('파일 크기는 10MB 이하여야 합니다.');
            return;
        }

        setError(null);
        setIsUploading(true);
        setUploadProgress(10);

        try {
            // 파일명 생성
            const timestamp = Date.now();
            const fileName = `lookbook_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

            setUploadProgress(30);

            // Supabase Storage에 업로드
            const imageUrl = await uploadLookbookImage(file, fileName);

            setUploadProgress(60);

            // AI 분석 시뮬레이션 (실제로는 API 호출)
            const analysisResult = await simulateAIAnalysis(file);

            setUploadProgress(80);

            // 룩북 데이터 저장
            const lookbookEntry = await saveLookbookEntry({
                image_url: imageUrl,
                title: analysisResult.title,
                style_tags: analysisResult.tags,
                face_shape: analysisResult.faceShape,
                analysis_data: analysisResult,
                created_at: new Date().toISOString()
            });

            setUploadProgress(100);

            // 부모 컴포넌트에 전달
            onImageAnalyzed(imageUrl, analysisResult.title);

        } catch (err) {
            console.error('업로드 실패:', err);
            setError('업로드에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // AI 분석 시뮬레이션 (데모용)
    const simulateAIAnalysis = async (file) => {
        // 실제로는 여기서 AI API를 호출
        await new Promise(resolve => setTimeout(resolve, 1500));

        const titles = [
            'The Vintage Hippie Perm',
            'Modern Layered Cut',
            'Classic Bob Style',
            'Soft Wave Perm',
            'Natural Straight Look'
        ];

        const tags = ['#빈티지', '#내추럴', '#볼륨', '#러블리', '#시크'];
        const faceShapes = ['Oval', 'Round', 'Heart', 'Square', 'Long'];

        return {
            title: titles[Math.floor(Math.random() * titles.length)],
            tags: tags.slice(0, 3 + Math.floor(Math.random() * 2)),
            faceShape: faceShapes[Math.floor(Math.random() * faceShapes.length)],
            confidence: 0.85 + Math.random() * 0.1
        };
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            padding: '2rem'
        }}>
            {/* 헤더 */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{
                    fontSize: '3rem',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '1rem',
                    fontFamily: 'Georgia, serif'
                }}>
                    HAIRGATOR Lookbook
                </h1>
                <p style={{
                    fontSize: '1.2rem',
                    color: '#aaa',
                    maxWidth: '500px'
                }}>
                    AI가 분석한 당신만의 헤어스타일 룩북을 만들어보세요
                </p>
            </div>

            {/* 업로드 영역 */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    padding: '4rem 2rem',
                    border: `3px dashed ${isDragging ? '#E91E63' : '#444'}`,
                    borderRadius: '20px',
                    background: isDragging ? 'rgba(233, 30, 99, 0.1)' : 'rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center'
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />

                {isUploading ? (
                    <div>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            border: '4px solid #333',
                            borderTop: '4px solid #E91E63',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 1.5rem'
                        }} />
                        <p style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem' }}>
                            AI 분석 중... {uploadProgress}%
                        </p>
                        <div style={{
                            width: '100%',
                            height: '6px',
                            background: '#333',
                            borderRadius: '3px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${uploadProgress}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #E91E63, #9C27B0)',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📸</div>
                        <p style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                            이미지를 드래그하거나 클릭하여 업로드
                        </p>
                        <p style={{ color: '#888', fontSize: '0.9rem' }}>
                            JPG, PNG, WEBP (최대 10MB)
                        </p>
                    </>
                )}
            </div>

            {/* 에러 메시지 */}
            {error && (
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'rgba(244, 67, 54, 0.2)',
                    border: '1px solid #F44336',
                    borderRadius: '10px',
                    color: '#F44336',
                    maxWidth: '500px',
                    width: '100%',
                    textAlign: 'center'
                }}>
                    {error}
                </div>
            )}

            {/* 샘플 이미지 버튼 */}
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    또는 샘플 이미지로 체험해보세요
                </p>
                <button
                    onClick={() => onImageAnalyzed('/images/hippie_perm_blazer_1764037619611.png', 'The Vintage Hippie Perm')}
                    style={{
                        background: 'transparent',
                        border: '1px solid #E91E63',
                        color: '#E91E63',
                        padding: '0.8rem 2rem',
                        borderRadius: '30px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.background = '#E91E63';
                        e.target.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.color = '#E91E63';
                    }}
                >
                    샘플로 시작하기
                </button>
            </div>

            {/* CSS 애니메이션 */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default HeroUploader;
