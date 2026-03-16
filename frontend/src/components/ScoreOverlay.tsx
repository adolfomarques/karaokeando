import { useEffect, useRef, useState } from "react";
import {
  getScoreData,
  getScoreValue,
  rotateScore,
} from "../score/pikaraokeScore";
import { useTranslation } from "react-i18next";
import { launchFireworkShow } from "../score/fireworks";
import { getPublicScoreMeta, AdminBackground, AdminPhrase } from "../api";
import "./ScoreOverlay.css";

const IconMic = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

type Props = {
  open: boolean;
  // If provided, uses this score; otherwise generates score exactly like PiKaraoke.
  scoreOverride?: number;
  // If provided, shows singer name in review line prefix.
  singer?: string;
  // TV should play audio; mobile should not.
  enableAudio?: boolean;
  onDone?: (finalScore: number) => void;
};

const DEFAULT_BACKGROUNDS = [
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1920&auto=format&fit=crop", // Karaoke Stage
  "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1920&auto=format&fit=crop", // Concert Mic
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1920&auto=format&fit=crop", // Festival crowd
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1920&auto=format&fit=crop", // DJ Party
];

export default function ScoreOverlay({
  open,
  scoreOverride,
  singer,
  enableAudio = false,
  onDone,
}: Props) {
  const { t } = useTranslation();
  const [scoreText, setScoreText] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [bgImage, setBgImage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [metaBackgrounds, setMetaBackgrounds] = useState<AdminBackground[]>([]);
  const [metaPhrases, setMetaPhrases] = useState<AdminPhrase[]>([]);

  // Store onDone in a ref to avoid re-triggering effect when callback changes
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // Load meta data once
    getPublicScoreMeta().then(data => {
      setMetaBackgrounds(data.backgrounds);
      setMetaPhrases(data.phrases);
    }).catch(() => {
      // ignore
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    // Pick random background on open
    const allBgs = metaBackgrounds.length > 0 
      ? metaBackgrounds.map(b => b.url) 
      : DEFAULT_BACKGROUNDS;
    const randomBg = allBgs[Math.floor(Math.random() * allBgs.length)];
    setBgImage(randomBg);

    let cancelled = false;

    const run = async () => {
      const scoreValue =
        typeof scoreOverride === "number" ? scoreOverride : getScoreValue();
      const scoreData = getScoreData(scoreValue);

      setReviewText("");
      setScoreText("");

      const drums = new Audio("/sounds/score-drums.mp3");
      const applause = new Audio(`/sounds/${scoreData.applause}`);

      // PiKaraoke settings
      drums.volume = 0.3;

      if (enableAudio) {
        // best-effort; browsers may block until a user gesture
        void drums.play().catch(() => { });
      }

      const drumDuration = 4100;
      await rotateScore(setScoreText, drumDuration);
      if (cancelled) return;

      setScoreText(String(scoreValue).padStart(2, "0"));

      const name = singer || t("mobile.alone", "Sozinho(a)");
      
      // Try to find a dynamic phrase for this score
      const matchingPhrases = metaPhrases.filter(p => scoreValue >= p.minScore && scoreValue <= p.maxScore);
      let localizedReview = "";

      if (matchingPhrases.length > 0) {
        const randomPhrase = matchingPhrases[Math.floor(Math.random() * matchingPhrases.length)].phrase;
        localizedReview = randomPhrase.replace("{name}", name);
      } else {
        const scoreKey = `reviews.scores.${scoreValue}`;
        const exactTranslation = t(scoreKey, { name });

        // If i18next returns the key itself, it means the translation is missing for that specific score.
        localizedReview = exactTranslation !== scoreKey
          ? exactTranslation
          : t(`reviews.${scoreData.bucket}.${scoreData.reviewIndex}`, { name });
      }

      setReviewText(localizedReview);

      const canvas = canvasRef.current;
      if (canvas) launchFireworkShow(canvas, scoreValue);

      if (enableAudio) {
        await new Promise<void>(resolve => {
          void applause.play().catch(() => {
            resolve();
          });
          applause.onended = () => resolve();
        });
      } else {
        // keep overlay visible a bit like the applause duration
        await new Promise(r => setTimeout(r, 2500));
      }

      if (cancelled) return;
      setReviewText("");
      onDoneRef.current?.(scoreValue);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [open, scoreOverride, singer, enableAudio, t, metaBackgrounds, metaPhrases]);

  if (!open) return null;

  return (
    <div className="pk-score" style={{ backgroundImage: bgImage ? `url(${bgImage})` : undefined }}>
      <div className="pk-score__content">
        <div className="pk-score__your">{t("mobile.yourScore", "Sua Pontuação")}</div>
        <div className="pk-score__number">{scoreText}</div>
        <div className="pk-score__divider" />
        {singer && (
          <div className="pk-score__singer">
            <IconMic size={28} /> {singer}
          </div>
        )}
        {reviewText && (
          <div className="pk-score__review-text">{reviewText}</div>
        )}
      </div>
      <canvas ref={canvasRef} className="pk-score__canvas" />
    </div>
  );
}
