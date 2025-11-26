import React, { useState } from 'react';
import LookbookPage from './components/LookbookPage';
import HeroUploader from './components/HeroUploader';

function App() {
    const [uploadedImage, setUploadedImage] = useState(null);
    const [analysisTitle, setAnalysisTitle] = useState('');

    const handleImageAnalyzed = (imageUrl, title) => {
        setUploadedImage(imageUrl);
        setAnalysisTitle(title || 'AI Analyzed Hairstyle');
    };

    const handleReset = () => {
        setUploadedImage(null);
        setAnalysisTitle('');
    };

    return (
        <div className="app">
            {uploadedImage ? (
                <LookbookPage
                    imageSrc={uploadedImage}
                    title={analysisTitle}
                    onReset={handleReset}
                />
            ) : (
                <HeroUploader onImageAnalyzed={handleImageAnalyzed} />
            )}
        </div>
    );
}

export default App;
