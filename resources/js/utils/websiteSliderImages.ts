const svgToDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const commonWebsiteSliderImages = [
  {
    title: 'Campus Boulevard',
    src: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="45%" stop-color="#1d4ed8"/>
            <stop offset="100%" stop-color="#f472b6"/>
          </linearGradient>
          <linearGradient id="road" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#082f49"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#sky)"/>
        <circle cx="1260" cy="170" r="94" fill="#bfdbfe" opacity="0.88"/>
        <rect x="0" y="620" width="1600" height="280" fill="url(#road)"/>
        <path d="M660 900 L790 520 L810 520 L940 900 Z" fill="#dbeafe" opacity="0.86"/>
        <path d="M715 900 L800 565 L885 900 Z" fill="#0f172a" opacity="0.48"/>
        <rect x="160" y="250" width="320" height="290" rx="30" fill="#f8fafc" opacity="0.9"/>
        <rect x="215" y="300" width="210" height="175" rx="18" fill="#0f172a" opacity="0.18"/>
        <rect x="1120" y="210" width="250" height="350" rx="30" fill="#ffffff" opacity="0.86"/>
        <rect x="1170" y="280" width="150" height="215" rx="18" fill="#0f172a" opacity="0.16"/>
      </svg>
    `),
  },
  {
    title: 'Innovation Studio',
    src: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#020617"/>
            <stop offset="45%" stop-color="#0f766e"/>
            <stop offset="100%" stop-color="#67e8f9"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#bg)"/>
        <rect x="0" y="660" width="1600" height="240" fill="#022c22"/>
        <rect x="160" y="190" width="420" height="250" rx="28" fill="#e0f2fe" opacity="0.12"/>
        <rect x="1030" y="150" width="360" height="240" rx="28" fill="#ffffff" opacity="0.14"/>
        <rect x="280" y="520" width="1040" height="34" rx="17" fill="#1e293b"/>
        <rect x="340" y="430" width="240" height="128" rx="18" fill="#e2e8f0"/>
        <rect x="390" y="468" width="140" height="52" rx="10" fill="#38bdf8" opacity="0.66"/>
        <rect x="700" y="395" width="220" height="165" rx="20" fill="#f8fafc" opacity="0.94"/>
        <circle cx="810" cy="478" r="48" fill="#22d3ee" opacity="0.48"/>
        <rect x="1015" y="415" width="280" height="145" rx="22" fill="#e2e8f0"/>
      </svg>
    `),
  },
  {
    title: 'Library Atrium',
    src: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="atrium" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#312e81"/>
            <stop offset="50%" stop-color="#7c3aed"/>
            <stop offset="100%" stop-color="#2563EB"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#atrium)"/>
        <rect x="0" y="660" width="1600" height="240" fill="#1e1b4b"/>
        <rect x="160" y="150" width="1280" height="430" rx="38" fill="#ffffff" opacity="0.16"/>
        <rect x="250" y="230" width="160" height="280" rx="18" fill="#f8fafc" opacity="0.92"/>
        <rect x="455" y="230" width="160" height="280" rx="18" fill="#f8fafc" opacity="0.86"/>
        <rect x="660" y="230" width="280" height="280" rx="24" fill="#bfdbfe" opacity="0.8"/>
        <rect x="985" y="230" width="160" height="280" rx="18" fill="#f8fafc" opacity="0.86"/>
        <rect x="1190" y="230" width="160" height="280" rx="18" fill="#f8fafc" opacity="0.92"/>
      </svg>
    `),
  },
  {
    title: 'Sports Arena',
    src: svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
        <defs>
          <linearGradient id="arena" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#111827"/>
            <stop offset="45%" stop-color="#1d4ed8"/>
            <stop offset="100%" stop-color="#22c55e"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#arena)"/>
        <rect x="0" y="610" width="1600" height="290" fill="#14532d"/>
        <ellipse cx="800" cy="630" rx="470" ry="108" fill="#22c55e" opacity="0.88"/>
        <ellipse cx="800" cy="630" rx="270" ry="58" fill="#dcfce7" opacity="0.74"/>
        <rect x="220" y="180" width="280" height="240" rx="28" fill="#ffffff" opacity="0.16"/>
        <rect x="1100" y="160" width="240" height="270" rx="28" fill="#ffffff" opacity="0.18"/>
        <rect x="660" y="180" width="280" height="220" rx="28" fill="#f8fafc" opacity="0.16"/>
      </svg>
    `),
  },
];

export const getCommonWebsiteSliderImage = (index: number) =>
  commonWebsiteSliderImages[index % commonWebsiteSliderImages.length];
