import React, { useState, useEffect } from 'react';
import HeroUploader from './components/HeroUploader';
import LookbookPage from './components/LookbookPage';
import './App.css';
import './styles/magazine.css';

function App() {
    const [uploadedImage, setUploadedImage] = useState(null);
    const [styleTitle, setStyleTitle] = useState("");

    const handleUpload = (file) => {
        // Create a local URL for the uploaded file to display it
        const imageUrl = URL.createObjectURL(file);
        setUploadedImage(imageUrl);
    };

    const handleReset = () => {
        setUploadedImage(null);
        setStyleTitle("");
    };

    // Listen for OPEN_LOOKBOOK event from vanilla JS (menu.js)
    useEffect(() => {
        const handleOpenLookbook = (e) => {
            console.log("📖 OPEN_LOOKBOOK event received:", e.detail);
            if (e.detail && e.detail.imageSrc) {
                setUploadedImage(e.detail.imageSrc);
                setStyleTitle(e.detail.title || "Selected Style");
            }
        };

        window.addEventListener('OPEN_LOOKBOOK', handleOpenLookbook);
        return () => window.removeEventListener('OPEN_LOOKBOOK', handleOpenLookbook);
    }, []);

    // 이미지가 없으면 아무것도 렌더링하지 않음 (메인 앱 UI 유지)
    if (!uploadedImage) {
        return null;
    }

    return (
        <div className="App">
            <LookbookPage imageSrc={uploadedImage} title={styleTitle} onReset={handleReset} />
        </div>
    );
}

export default App;
