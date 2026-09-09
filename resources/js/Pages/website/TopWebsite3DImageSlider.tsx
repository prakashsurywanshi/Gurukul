import { useEffect, useState } from 'react';
import { WebsiteSlide } from '../../utils/websiteCmsContent';
import { getCommonWebsiteSliderImage } from '../../utils/websiteSliderImages';

interface TopWebsite3DImageSliderProps {
    slides: WebsiteSlide[];
    isLightTheme: boolean;
    sliderImages?: string[];
}

export default function TopWebsite3DImageSlider({
    slides,
    isLightTheme,
    sliderImages = [],
}: TopWebsite3DImageSliderProps) {
    const [activeSlide, setActiveSlide] = useState(0);
    const imageItems =
        sliderImages.length > 0
            ? sliderImages.map((src, index) => ({
                  src,
                  title: `Slider image ${index + 1}`,
              }))
            : slides.map((_, index) => getCommonWebsiteSliderImage(index));
    const totalSlides = imageItems.length;

    useEffect(() => {
        if (totalSlides <= 1) {
            return;
        }

        const timer = window.setInterval(() => {
            setActiveSlide((current) => (current + 1) % totalSlides);
        }, 3400);

        return () => window.clearInterval(timer);
    }, [totalSlides]);

    if (totalSlides === 0) {
        return null;
    }

    return (
        <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden px-4 pb-10 pt-2 sm:px-8 lg:px-12 lg:pb-14">
            <div
                className={`absolute inset-0 -z-10 ${
                    isLightTheme
                        ? 'bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_26%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.66),rgba(255,255,255,0))]'
                        : 'bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.14),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.46),rgba(15,23,42,0.04))]'
                }`}
            />

            <div className="mx-auto max-w-7xl">
                <div className="relative min-h-[18rem] sm:min-h-[22rem] lg:min-h-[28rem] [perspective:2600px]">
                    <div
                        className={`absolute left-[8%] top-10 h-28 w-28 rounded-full blur-3xl ${isLightTheme ? 'bg-sky-300/28' : 'bg-cyan-400/16'}`}
                    />
                    <div
                        className={`absolute right-[12%] top-8 h-32 w-32 rounded-full blur-3xl ${isLightTheme ? 'bg-pink-300/24' : 'bg-fuchsia-500/16'}`}
                    />

                    <div className="absolute inset-0 flex items-center justify-center">
                        {imageItems.map((image, index) => {
                            const offset = index - activeSlide;
                            const wrappedOffset =
                                offset < -Math.floor(totalSlides / 2)
                                    ? offset + totalSlides
                                    : offset > Math.floor(totalSlides / 2)
                                      ? offset - totalSlides
                                      : offset;
                            const isActive = wrappedOffset === 0;

                            return (
                                <button
                                    key={`${image.title}-${index}`}
                                    type="button"
                                    onClick={() => setActiveSlide(index)}
                                    className="absolute h-[15rem] w-[84vw] max-w-[78rem] overflow-hidden rounded-[2rem] text-left shadow-[0_36px_110px_rgba(3,8,20,0.24)] transition duration-700 ease-out sm:h-[25rem] lg:h-[30rem] mt-6"
                                    style={{
                                        transform: `translateX(${wrappedOffset * 18}%) translateZ(${isActive ? 150 : -120}px) rotateY(${wrappedOffset * -18}deg) rotateX(${isActive ? 2 : 7}deg) translateY(${Math.abs(wrappedOffset) * 16}px) scale(${isActive ? 1 : 0.88})`,
                                        opacity: Math.abs(wrappedOffset) > 2 ? 0 : 1,
                                        zIndex: totalSlides - Math.abs(wrappedOffset),
                                    }}
                                    aria-label={`Show image ${index + 1}`}
                                >
                                    <img
                                        src={image.src}
                                        alt={image.title}
                                        className="absolute inset-0 h-full w-full object-fill"
                                    />
                                    <div
                                        className={`absolute inset-0 border ${isLightTheme ? 'border-white/55' : 'border-white/12'}`}
                                    />
                                    <div className="absolute inset-x-0 bottom-6 flex justify-center">
                                        <div className="flex items-center gap-3 rounded-full border border-white/20 bg-black/20 px-4 py-3 backdrop-blur-xl">
                                            {imageItems.map((item, dotIndex) => (
                                                <span
                                                    key={`${item.title}-${dotIndex}-dot`}
                                                    className={`h-2.5 rounded-full transition-all ${
                                                        activeSlide === dotIndex
                                                            ? 'w-12 bg-white'
                                                            : isLightTheme
                                                              ? 'w-3 bg-white/65'
                                                              : 'w-3 bg-white/30'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
