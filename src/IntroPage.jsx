import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/IntroPage.css";

const INTRO_HERO_IMAGES = [
    { url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=80", alt: "Fresh vegetables" },
    { url: "https://images.unsplash.com/photo-1488459716781-31ed595d2ba0?w=900&q=80", alt: "Fresh produce" },
    { url: "https://images.unsplash.com/photo-1597362925123-77861d3facaf?w=900&q=80", alt: "Leafy greens" },
    { url: "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=900&q=80", alt: "Local market food" },
    { url: "https://images.unsplash.com/photo-1518843875459-f738682238a6?w=900&q=80", alt: "Organic food" },
];

const INTRO_FEATURES = ["Local", "Fresh", "Donate", "Near you", "Sustainable"];
const CYCLE_MS = 4000;

const IntroPage = () => {
    const navigate = useNavigate();
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        const t = setInterval(() => {
            setActiveImageIndex((i) => (i + 1) % INTRO_HERO_IMAGES.length);
        }, CYCLE_MS);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="intro-page">
            <div className="intro-background" aria-hidden="true" />
            <div className="intro-blob intro-blob-1" aria-hidden="true" />
            <div className="intro-blob intro-blob-2" aria-hidden="true" />
            <div className="intro-blob intro-blob-3" aria-hidden="true" />
            <div className="intro-orb intro-orb-1" aria-hidden="true" />
            <div className="intro-orb intro-orb-2" aria-hidden="true" />
            <div className="intro-orb intro-orb-3" aria-hidden="true" />
            <div className="intro-orb intro-orb-4" aria-hidden="true" />
            <div className="intro-glow-line intro-glow-line-1" aria-hidden="true" />
            <div className="intro-glow-line intro-glow-line-2" aria-hidden="true" />
            <div className="intro-layout">
                <div className="intro-content-top">
                    <h1 className="intro-title intro-anim-1">
                        <span className="intro-title-green">Green</span>
                        <span className="intro-title-shelf"> Shelf</span>
                    </h1>
                    <p className="intro-tagline intro-anim-2">
                        Your local food marketplace — buy, sell, and donate fresh food near you.
                    </p>
                </div>
                <div className="intro-image-wrap">
                    <div className="intro-carousel">
                        {INTRO_HERO_IMAGES.map((img, i) => (
                            <img
                                key={img.url}
                                src={img.url}
                                alt={img.alt}
                                className={`intro-hero-image ${i === activeImageIndex ? "intro-hero-active" : ""}`}
                            />
                        ))}
                    </div>
                    <div className="intro-image-overlay" aria-hidden="true" />
                    <div className="intro-carousel-dots">
                        {INTRO_HERO_IMAGES.map((_, i) => (
                            <span
                                key={i}
                                className={`intro-dot ${i === activeImageIndex ? "intro-dot-active" : ""}`}
                                aria-hidden="true"
                            />
                        ))}
                    </div>
                </div>
                <div className="intro-content-bottom">
                    <div className="intro-features intro-anim-3">
                        {INTRO_FEATURES.map((label, i) => (
                            <span key={label} className="intro-feature-pill" style={{ animationDelay: `${0.1 * i}s` }}>
                                {label}
                            </span>
                        ))}
                    </div>
                    <p className="intro-description intro-anim-4">
                        Connect with sellers and NGOs. Discover nearby deals, reduce waste,
                        and support your community with location-based, sustainable food.
                    </p>
                    <button
                        type="button"
                        className="intro-enter-btn intro-anim-5"
                        onClick={() => navigate("/home")}
                    >
                        Enter Green Shelf
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IntroPage;
