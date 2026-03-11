import * as Icon from "lucide-react";

export const GermanFlag = (
  <>
    <svg width="20" height="14" viewBox="0 0 20 14" aria-label="Deutsch Flagge">
      <rect width="20" height="4.67" y="0" fill="#000" />
      <rect width="20" height="4.67" y="4.67" fill="#DD0000" />
      <rect width="20" height="4.66" y="9.34" fill="#FFCE00" />
    </svg>
  </>
);
export const PolishFlag = (
  <>
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      aria-label="Polnische Flagge"
    >
      <rect width="20" height="7" y="0" fill="#fff" />
      <rect width="20" height="7" y="7" fill="#DC143C" />
    </svg>
  </>
);
export const RussianFlag = (
  <>
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      aria-label="Russische Flagge"
    >
      <rect width="20" height="4.67" y="0" fill="#fff" />
      <rect width="20" height="4.67" y="4.67" fill="#0033A0" />
      <rect width="20" height="4.66" y="9.34" fill="#D52B1E" />
    </svg>
  </>
);
export const BulgarianFlag = (
  <>
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      aria-label="Bulgarische Flagge"
    >
      <rect width="20" height="4.67" y="0" fill="#fff" />
      <rect width="20" height="4.67" y="4.67" fill="#00966E" />
      <rect width="20" height="4.66" y="9.34" fill="#D62612" />
    </svg>
  </>
);
export const CroatianFlag = (
  <>
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      aria-label="Kroatische Flagge"
    >
      <rect width="20" height="4.67" y="0" fill="#FF0000" />
      <rect width="20" height="4.67" y="4.67" fill="#fff" />
      <rect width="20" height="4.66" y="9.34" fill="#0000FF" />
      <rect
        x="7"
        y="3"
        width="6"
        height="8"
        fill="#fff"
        stroke="#000"
        strokeWidth="0.5"
      />
      <rect x="8" y="4" width="4" height="6" fill="#FF0000" />
    </svg>
  </>
);
export const EnglishFlag = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    role="img"
    aria-label="English (UK)"
  >
    <defs>
      <clipPath id="clip">
        <circle cx="10" cy="10" r="9.2" />
      </clipPath>
    </defs>

    <circle cx="10" cy="10" r="9.5" fill="#F2F2F2" />

    <g clipPath="url(#clip)">
      <rect width="20" height="20" fill="#012169" />

      <line x1="0" y1="0" x2="20" y2="20" stroke="#FFFFFF" strokeWidth="3.2" />
      <line x1="20" y1="0" x2="0" y2="20" stroke="#FFFFFF" strokeWidth="3.2" />

      <g transform="translate(-0.6,0.6)">
        <line x1="0" y1="0" x2="20" y2="20" stroke="#C8102E" strokeWidth="2" />
      </g>
      <g transform="translate(0.6,0.6)">
        <line x1="20" y1="0" x2="0" y2="20" stroke="#C8102E" strokeWidth="2" />
      </g>

      <rect x="0" y="8.5" width="20" height="3" fill="#FFFFFF" />
      <rect x="8.5" y="0" width="3" height="20" fill="#FFFFFF" />

      <rect x="0" y="9" width="20" height="2" fill="#C8102E" />
      <rect x="9" y="0" width="2" height="20" fill="#C8102E" />
    </g>
  </svg>
);
export const AutoDetectIcon = (
  <Icon.Globe className="h-4 w-4 text-white bg-gradient-to-br from-blue-400 to-purple-500" />
);
