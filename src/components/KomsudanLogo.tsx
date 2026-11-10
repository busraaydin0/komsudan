"use client";

import styles from "./KomsudanLogo.module.css";

const sizes = {
  md: "text-[1.28rem]",
  lg: "text-[2.05rem]",
} as const;

function DrumO() {
  return (
    <span className={styles.o} aria-hidden>
      <span className={styles.drum}>
        <span className={styles.washShirt}>
          <svg viewBox="0 0 32 32">
            <path
              fill="var(--teal)"
              d="M6.5 7.2 12 4.6l1.8 4.6h4.4L20 4.6l5.5 2.6-1.8 5.4h-1.7V25a2.2 2.2 0 0 1-2.2 2.2h-8.2A2.2 2.2 0 0 1 9.4 25V12.6H7.7Z"
            />
          </svg>
        </span>
        <span className={styles.washSocks}>
          <svg viewBox="0 0 28 28">
            <path
              fill="var(--clay)"
              d="M7.2 3.8h5.6v9.4c0 1.3.5 2.6 1.8 3.5 1.3 1 1.6 2.5.7 3.6-1 1.3-3 1.4-4.4.2C8.4 18.6 7.2 16 7.2 13.2Z"
            />
            <path
              fill="color-mix(in srgb, var(--clay) 62%, var(--sand))"
              d="M15 5h5.2v9c0 1.2.4 2.4 1.6 3.3 1.2 1 1.4 2.4.6 3.5-.9 1.2-2.8 1.3-4.1.2C16.2 19.2 15 16.8 15 14Z"
            />
          </svg>
        </span>
        <span className={styles.washTowel}>
          <svg viewBox="0 0 36 16">
            <rect width="36" height="16" rx="3.5" fill="var(--load-low)" />
          </svg>
        </span>
      </span>
    </span>
  );
}

function CornerIron() {
  return (
    <span className={styles.corner} aria-hidden>
      <span className={styles.steam} />
      <span className={styles.steam} />
      <span className={styles.steam} />
      <svg viewBox="0 0 76 48" className={styles.iron}>
        <path
          fill="none"
          stroke="var(--teal)"
          strokeWidth="2.6"
          strokeLinecap="round"
          d="M66 32c3.5 7.5-1 13.5-11 15"
        />
        <path fill="var(--clay)" d="M3 36 22 16h40l8 8v14H12Z" />
        <path fill="color-mix(in srgb, var(--ink) 42%, var(--clay))" d="M10 35.5h54v5.5H14Z" />
        <rect
          x="34"
          y="21"
          width="18"
          height="6.5"
          rx="2"
          fill="color-mix(in srgb, var(--teal) 38%, var(--card))"
        />
        <path
          fill="none"
          stroke="color-mix(in srgb, var(--ink) 82%, var(--clay))"
          strokeWidth="6.8"
          strokeLinecap="round"
          d="M28 16c1-13 32-13 33 0"
        />
        <circle cx="14" cy="30" r="1.5" fill="color-mix(in srgb, var(--ink) 35%, var(--clay))" />
        <circle cx="20" cy="30" r="1.5" fill="color-mix(in srgb, var(--ink) 35%, var(--clay))" />
        <circle cx="26" cy="30" r="1.5" fill="color-mix(in srgb, var(--ink) 35%, var(--clay))" />
      </svg>
    </span>
  );
}

function Clothesline() {
  return (
    <svg viewBox="0 0 140 52" preserveAspectRatio="none" className={styles.line} aria-hidden>
      <path
        d="M8 3 Q70 40 132 3"
        fill="none"
        stroke="color-mix(in srgb, var(--ink) 62%, var(--teal))"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="3" r="2.2" fill="color-mix(in srgb, var(--ink) 62%, var(--teal))" />
      <circle cx="132" cy="3" r="2.2" fill="color-mix(in srgb, var(--ink) 62%, var(--teal))" />
      <rect x="26" y="11" width="2.4" height="8" rx="0.7" fill="var(--clay)" />
      <rect x="66" y="16" width="2.4" height="8" rx="0.7" fill="var(--clay)" />
      <rect x="104" y="11.2" width="2.4" height="8" rx="0.7" fill="var(--clay)" />
      <g transform="translate(16 16) scale(0.72)">
        <path
          fill="var(--teal)"
          d="M6.5 7.2 12 4.6l1.8 4.6h4.4L20 4.6l5.5 2.6-1.8 5.4h-1.7V25a2.2 2.2 0 0 1-2.2 2.2h-8.2A2.2 2.2 0 0 1 9.4 25V12.6H7.7Z"
        />
      </g>
      <g transform="translate(54 20) scale(0.64)">
        <path
          fill="var(--clay)"
          d="M7.2 3.8h5.6v9.4c0 1.3.5 2.6 1.8 3.5 1.3 1 1.6 2.5.7 3.6-1 1.3-3 1.4-4.4.2C8.4 18.6 7.2 16 7.2 13.2Z"
        />
        <path
          fill="color-mix(in srgb, var(--clay) 62%, var(--sand))"
          d="M15 5h5.2v9c0 1.2.4 2.4 1.6 3.3 1.2 1 1.4 2.4.6 3.5-.9 1.2-2.8 1.3-4.1.2C16.2 19.2 15 16.8 15 14Z"
        />
      </g>
      <g transform="translate(92 18) scale(0.7)">
        <rect width="36" height="16" rx="3.5" fill="var(--load-low)" />
      </g>
    </svg>
  );
}

export function KomsudanLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span className={`${styles.word} ${sizes[size]} ${className ?? ""}`}>
      <span className={styles.span}>
        K
        <DrumO />
        mşud
        <Clothesline />
      </span>
      <span className={styles.tail}>
        an
        <CornerIron />
      </span>
    </span>
  );
}
