"use client";

import styles from "./HomeLaundryScene.module.css";

function ShirtMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
      <path
        fill="var(--teal)"
        d="M6.5 7.2 12 4.6l1.8 4.6h4.4L20 4.6l5.5 2.6-1.8 5.4h-1.7V25a2.2 2.2 0 0 1-2.2 2.2h-8.2A2.2 2.2 0 0 1 9.4 25V12.6H7.7Z"
      />
      <path fill="var(--card)" opacity="0.4" d="M12.2 12.2h7.6v2.2h-7.6z" />
    </svg>
  );
}

function SocksMark() {
  return (
    <svg viewBox="0 0 28 28" className="h-full w-full" aria-hidden>
      <path
        fill="var(--clay)"
        d="M7.2 3.8h5.6v9.4c0 1.3.5 2.6 1.8 3.5 1.3 1 1.6 2.5.7 3.6-1 1.3-3 1.4-4.4.2C8.4 18.6 7.2 16 7.2 13.2Z"
      />
      <path
        fill="color-mix(in srgb, var(--clay) 62%, var(--sand))"
        d="M15 5h5.2v9c0 1.2.4 2.4 1.6 3.3 1.2 1 1.4 2.4.6 3.5-.9 1.2-2.8 1.3-4.1.2C16.2 19.2 15 16.8 15 14Z"
      />
    </svg>
  );
}

function TowelMark() {
  return (
    <svg viewBox="0 0 36 16" className="h-full w-full" aria-hidden>
      <rect width="36" height="16" rx="3.5" fill="var(--load-low)" />
      <rect x="2.2" y="2.2" width="31.6" height="11.6" rx="2.4" fill="color-mix(in srgb, var(--load-low) 58%, var(--card))" />
    </svg>
  );
}

function BagBack() {
  return (
    <svg viewBox="0 0 64 72" className="h-full w-full" aria-hidden>
      <ellipse cx="32" cy="66" rx="16" ry="3.4" fill="rgba(28, 23, 18, 0.16)" />
      <path
        fill="color-mix(in srgb, var(--teal) 38%, var(--sand))"
        d="M14 22c1.2-6 6.5-10 18-10s16.8 4 18 10l4 36c.6 6.2-7.2 11-22 11s-22.6-4.8-22-11Z"
      />
      <ellipse cx="32" cy="22" rx="18" ry="7" fill="color-mix(in srgb, var(--sand) 60%, var(--card))" />
    </svg>
  );
}

function BagFront() {
  return (
    <svg viewBox="0 0 64 72" className="h-full w-full" aria-hidden>
      <path
        fill="color-mix(in srgb, var(--teal) 72%, var(--ink))"
        d="M16 34c1.4 18 5.5 28 16 28s14.6-10 16-28c-3.2 8-8.8 12-16 12s-12.8-4-16-12Z"
      />
      <path
        fill="none"
        stroke="color-mix(in srgb, var(--ink) 45%, var(--teal))"
        strokeWidth="2"
        strokeLinecap="round"
        d="M20 20 Q32 8 44 20"
      />
      <path
        fill="none"
        stroke="color-mix(in srgb, var(--ink) 45%, var(--teal))"
        strokeWidth="2"
        strokeLinecap="round"
        d="M22 22 Q32 12 42 22"
      />
      <ellipse cx="32" cy="24" rx="7" ry="3.2" fill="none" stroke="var(--clay)" strokeWidth="1.8" />
    </svg>
  );
}

function NeighborMan() {
  return (
    <svg viewBox="0 0 42 62" className="h-full w-full" aria-hidden>
      <circle cx="21" cy="10" r="8" fill="var(--sand)" stroke="var(--ink)" strokeWidth="1.4" />
      <rect x="11.5" y="18.5" width="19" height="24" rx="8" fill="var(--teal)" />
      <rect x="7.5" y="21" width="5.5" height="16" rx="2.7" fill="color-mix(in srgb, var(--teal) 72%, var(--ink))" />
      <rect x="29" y="21.5" width="5.5" height="13" rx="2.7" fill="color-mix(in srgb, var(--teal) 72%, var(--ink))" />
      <rect x="13.5" y="40.5" width="5.6" height="17.5" rx="2.6" fill="var(--ink)" />
      <rect x="23" y="40.5" width="5.6" height="17.5" rx="2.6" fill="var(--ink)" />
    </svg>
  );
}

function NeighborWoman() {
  return (
    <svg viewBox="0 0 42 62" className="h-full w-full" aria-hidden>
      <circle cx="26.5" cy="8.2" r="4.2" fill="color-mix(in srgb, var(--clay) 70%, var(--ink))" />
      <circle cx="21" cy="11" r="7.4" fill="var(--sand)" stroke="var(--ink)" strokeWidth="1.4" />
      <path fill="var(--clay)" d="M14.2 18.5h13.6l4.8 37.5c.3 2.2-1.2 3.6-11.6 3.6S9.1 58.2 9.4 56Z" />
      <rect x="8.2" y="22" width="5.2" height="14" rx="2.6" fill="color-mix(in srgb, var(--clay) 75%, var(--ink))" />
      <rect x="28.6" y="22.5" width="5.2" height="12" rx="2.6" fill="color-mix(in srgb, var(--clay) 75%, var(--ink))" />
    </svg>
  );
}

function ClotheslineMark() {
  return (
    <svg viewBox="0 0 108 72" className="h-full w-full" aria-hidden>
      <rect x="6" y="10" width="4.2" height="58" rx="1.6" fill="color-mix(in srgb, var(--clay) 55%, var(--ink))" />
      <rect x="97.5" y="10" width="4.2" height="58" rx="1.6" fill="color-mix(in srgb, var(--clay) 55%, var(--ink))" />
      <path d="M8.2 16 Q54 26 99.6 16" fill="none" stroke="var(--ink)" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="28" y="18.2" width="1.6" height="5" rx="0.6" fill="var(--clay)" />
      <rect x="52" y="20.2" width="1.6" height="5" rx="0.6" fill="var(--clay)" />
      <rect x="76" y="18.4" width="1.6" height="5" rx="0.6" fill="var(--clay)" />
    </svg>
  );
}

function BoardMark() {
  return (
    <svg viewBox="0 0 90 36" className="h-full w-full" aria-hidden>
      <rect x="18" y="28" width="3.2" height="8" rx="1" fill="color-mix(in srgb, var(--ink) 55%, var(--sand))" />
      <rect x="68" y="28" width="3.2" height="8" rx="1" fill="color-mix(in srgb, var(--ink) 55%, var(--sand))" />
      <rect x="4" y="8" width="82" height="22" rx="4" fill="color-mix(in srgb, var(--sand) 70%, var(--card))" stroke="var(--line)" strokeWidth="1.4" />
      <rect x="8" y="12" width="74" height="4" rx="2" fill="color-mix(in srgb, var(--card) 80%, var(--teal))" opacity="0.55" />
    </svg>
  );
}

function IronMark() {
  return (
    <svg viewBox="0 0 36 22" className="h-full w-full" aria-hidden>
      <path fill="var(--clay)" d="M4 16c0-2.2 1.4-8.5 8.5-11.2C18.2 2.6 28 3.4 32 8.2c1.4 1.7 1.6 4.4.2 6.2L30 18.2H8.5C5.8 18.2 4 17.4 4 16Z" />
      <rect x="10" y="3.2" width="12" height="5.2" rx="2.2" fill="color-mix(in srgb, var(--ink) 72%, var(--clay))" />
    </svg>
  );
}

function FoldedMark() {
  return (
    <svg viewBox="0 0 40 28" className="h-full w-full" aria-hidden>
      <rect x="4" y="10" width="30" height="14" rx="2.4" fill="var(--load-low)" />
      <rect x="6" y="6" width="30" height="14" rx="2.4" fill="var(--clay)" />
      <rect x="8" y="2" width="30" height="14" rx="2.4" fill="var(--teal)" />
    </svg>
  );
}

function CoinMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="var(--load-low)" stroke="color-mix(in srgb, var(--clay) 72%, var(--ink))" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="6.4" fill="none" stroke="color-mix(in srgb, var(--card) 50%, var(--clay))" strokeWidth="1.2" />
    </svg>
  );
}

function CashMark() {
  return (
    <svg viewBox="0 0 36 20" className="h-full w-full" aria-hidden>
      <rect
        x="1.2"
        y="2"
        width="33.6"
        height="16"
        rx="3"
        fill="color-mix(in srgb, var(--teal) 38%, var(--card))"
        stroke="color-mix(in srgb, var(--teal) 72%, var(--ink))"
        strokeWidth="1.4"
      />
      <circle cx="18" cy="10" r="4" fill="none" stroke="color-mix(in srgb, var(--teal) 58%, var(--ink))" strokeWidth="1.2" />
      <rect x="4.2" y="5.2" width="2.8" height="9.6" rx="0.8" fill="color-mix(in srgb, var(--load-low) 78%, var(--teal))" />
      <rect x="29" y="5.2" width="2.8" height="9.6" rx="0.8" fill="color-mix(in srgb, var(--load-low) 78%, var(--teal))" />
    </svg>
  );
}

function Washer() {
  return (
    <div className={styles.washer}>
      <div className={styles.washerBody}>
        <span className={styles.washerPanel} />
        <span className={styles.porthole}>
          <span className={styles.drum}>
            <span className={styles.washShirt}>
              <ShirtMark />
            </span>
            <span className={styles.washSocks}>
              <SocksMark />
            </span>
            <span className={styles.washTowel}>
              <TowelMark />
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}

export function HomeLaundryScene() {
  return (
    <div className={`${styles.root} relative mx-auto mb-2 w-full shrink-0`} aria-hidden>
      <div className={styles.stage}>
        <div className={styles.world}>
          <div className={styles.house}>
            <Washer />
            <div className={styles.roof} />
            <div className={styles.wall}>
              <span className={styles.window} />
              <span className={styles.door}>
                <span className={styles.knob} />
              </span>
            </div>
          </div>
          <div className={styles.line}>
            <ClotheslineMark />
            <span className={`${styles.peg} ${styles.hungShirt}`}>
              <ShirtMark />
            </span>
            <span className={`${styles.peg} ${styles.hungSocks}`}>
              <SocksMark />
            </span>
            <span className={`${styles.peg} ${styles.hungTowel}`}>
              <TowelMark />
            </span>
          </div>
          <div className={styles.board}>
            <BoardMark />
            <span className={styles.press}>
              <ShirtMark />
            </span>
            <span className={styles.iron}>
              <IronMark />
            </span>
          </div>
          <div className={styles.load}>
            <div className={styles.shadow} />
            <div className={styles.bagBack}>
              <BagBack />
            </div>
            <span className={styles.folded}>
              <FoldedMark />
            </span>
            <div className={styles.bagFront}>
              <BagFront />
            </div>
          </div>
          <div className={styles.resident}>
            <div className={styles.residentFigure}>
              <NeighborWoman />
            </div>
          </div>
          <div className={styles.actor}>
            <div className={styles.figure}>
              <NeighborMan />
            </div>
            <div className={styles.payout}>
              <span className={`${styles.burst} ${styles.plusA}`}>+</span>
              <span className={`${styles.burst} ${styles.plusB}`}>+</span>
              <span className={`${styles.burst} ${styles.coinA}`}>
                <CoinMark />
              </span>
              <span className={`${styles.burst} ${styles.coinB}`}>
                <CoinMark />
              </span>
              <span className={`${styles.burst} ${styles.noteA}`}>
                <CashMark />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
