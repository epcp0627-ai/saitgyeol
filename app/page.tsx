"use client";

import {
  Children,
  cloneElement,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  isValidElement,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";

type ThemeKey = "apricot" | "rain" | "summer" | "night";
type RatioKey = "landscape" | "portrait" | "square";

type CardData = {
  nickname: string;
  handle: string;
  genre: string;
  phrase: string;
  intro: string;
  profileImage: string;
  imageZoom: number;
  imageX: number;
  imageY: number;
  favorites: string;
  rank: string;
  modes: string[];
  playStyles: string[];
  times: string[];
  voice: string;
  activities: string[];
  otherGenre: string;
  breakup: string;
  goodMatch: string;
  headsUp: string;
  memo: string;
  theme: ThemeKey;
  customTone: string;
  ratio: RatioKey;
};

type Theme = {
  name: string;
  note: string;
  backdrop: string;
  paper: string;
  ink: string;
  tone: string;
};

type CardPalette = Theme & {
  accent: string;
  leaf: string;
  sun: string;
  accentSoft: string;
  leafSoft: string;
  photoPaper: string;
};

const STORAGE_KEY = "saitgyeol-card-v1";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const CARD_SANS_NAME = "Noto Sans KR Variable";
const CARD_SERIF_NAME = "Noto Serif KR Variable";
const CARD_SANS = `"${CARD_SANS_NAME}", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
const CARD_SERIF = `"${CARD_SERIF_NAME}", "AppleMyungjo", Batang, serif`;

const themes: Record<ThemeKey, Theme> = {
  apricot: {
    name: "살구 종이",
    note: "살구빛에서 고른 차분한 잉크",
    backdrop: "#eadcc9",
    paper: "#fffaf1",
    ink: "#263746",
    tone: "#de6048",
  },
  rain: {
    name: "비 온 뒤",
    note: "비 갠 바탕을 닮은 청회색",
    backdrop: "#cedbd4",
    paper: "#f7faf4",
    ink: "#23353e",
    tone: "#3b7180",
  },
  summer: {
    name: "초여름",
    note: "연둣빛에서 고른 잔잔한 잉크",
    backdrop: "#dfe5be",
    paper: "#fffdf1",
    ink: "#293b37",
    tone: "#3f7c62",
  },
  night: {
    name: "밤편지",
    note: "먹빛과 이어지는 낮은 푸른색",
    backdrop: "#343b53",
    paper: "#f4efe5",
    ink: "#293147",
    tone: "#6978a8",
  },
};

function mixHex(from: string, to: string, toWeight: number) {
  const read = (value: string) => [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  const fromRgb = read(from);
  const toRgb = read(to);
  const amount = Math.min(1, Math.max(0, toWeight));
  return `#${fromRgb
    .map((channel, index) => Math.round(channel + (toRgb[index] - channel) * amount))
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function withAlpha(hex: string, alpha: number) {
  const [red, green, blue] = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  return `rgba(${red}, ${green}, ${blue}, ${Math.min(1, Math.max(0, alpha))})`;
}

function relativeLuminance(hex: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function ensureContrast(color: string, surfaces: string[], toward: string, minimum = 4.5) {
  let adjusted = color;
  for (let step = 0; step < 20; step += 1) {
    if (surfaces.every((surface) => contrastRatio(adjusted, surface) >= minimum)) return adjusted;
    adjusted = mixHex(adjusted, toward, 0.1);
  }
  return adjusted;
}

function resolveTheme(theme: Theme): CardPalette {
  const softenedTone = mixHex(theme.tone, theme.backdrop, 0.3);
  let accent = ensureContrast(mixHex(softenedTone, theme.ink, 0.46), [theme.paper], theme.ink);
  let accentSoft = mixHex(theme.paper, accent, 0.085);
  accent = ensureContrast(accent, [theme.paper, accentSoft], theme.ink);
  accentSoft = mixHex(theme.paper, accent, 0.085);
  const leaf = mixHex(accent, theme.ink, 0.16);
  return {
    ...theme,
    accent,
    leaf,
    sun: mixHex(theme.paper, theme.backdrop, 0.62),
    accentSoft,
    leafSoft: mixHex(theme.paper, leaf, 0.085),
    photoPaper: mixHex(theme.paper, theme.backdrop, 0.18),
  };
}

function resolveCardPalette(data: Pick<CardData, "theme" | "customTone">) {
  if (!HEX_COLOR.test(data.customTone)) return resolveTheme(themes[data.theme]);
  const tone = data.customTone.toLowerCase();
  return resolveTheme({
    name: "나만의 색",
    note: "고른 색을 차분하게 맞춘 팔레트",
    backdrop: mixHex("#e8e0d4", tone, 0.2),
    paper: mixHex("#fffaf1", tone, 0.035),
    ink: "#263746",
    tone,
  });
}

function readableColor(background: string, first: string, second: string) {
  return contrastRatio(background, first) >= contrastRatio(background, second) ? first : second;
}

const defaultData: CardData = {
  nickname: "모과",
  handle: "@mogwa_play",
  genre: "이터널 리턴",
  phrase: "좋아하는 마음은 오래, 플레이는 가볍게.",
  intro: "밤에 주로 접속하는 즐겜러예요. 낯은 가리지만 마음은 빨리 열려요.",
  profileImage: "",
  imageZoom: 100,
  imageX: 50,
  imageY: 50,
  favorites: "아야, 리 다이린, 쇼우",
  rank: "골드",
  modes: ["일반게임", "랭크게임"],
  playStyles: ["즐겜"],
  times: ["밤", "주말"],
  voice: "듣코도 좋아요",
  activities: ["게임", "마음", "일상"],
  otherGenre: "가끔 해요",
  breakup: "블언블",
  goodMatch: "천천히 친해져도 괜찮은 분, 플레이 실수에 너그러운 분",
  headsUp: "답장이 느릴 수 있어요. 먼저 말 걸어주면 정말 기뻐요!",
  memo: "우리의 속도가 달라도 오래 좋아할 수 있으면 좋겠어요.",
  theme: "apricot",
  customTone: "",
  ratio: "landscape",
};

const emptyData: CardData = {
  ...defaultData,
  nickname: "",
  handle: "",
  genre: "",
  phrase: "",
  intro: "",
  profileImage: "",
  favorites: "",
  rank: "",
  modes: [],
  playStyles: [],
  times: [],
  voice: "",
  activities: [],
  otherGenre: "",
  breakup: "",
  goodMatch: "",
  headsUp: "",
  memo: "",
};

const steps = [
  { short: "나", title: "먼저, 나를 부르는 말" },
  { short: "취향", title: "요즘 마음이 가는 것" },
  { short: "사이", title: "우리 사이가 편해지는 법" },
  { short: "꾸미기", title: "내 결에 맞는 종이" },
] as const;

const ratioLabels: Record<RatioKey, { name: string; note: string }> = {
  landscape: { name: "X 피드 4:3", note: "1600 × 1200" },
  portrait: { name: "세로 4:5", note: "1200 × 1500" },
  square: { name: "정사각 1:1", note: "1200 × 1200" },
};

const MODE_OPTIONS = ["일반게임", "랭크게임", "코발트", "론울프"] as const;
const PLAY_STYLE_OPTIONS = ["즐겜", "빡겜", "승리지향"] as const;
const TIME_OPTIONS = ["오전", "오후", "밤", "새벽", "주말", "랜덤"] as const;
const ACTIVITY_OPTIONS = ["게임", "마음", "멘션", "일상"] as const;
const CUSTOM_TONE_OPTIONS = ["#b5695f", "#a87542", "#657a52", "#4f7977", "#5d6f9c", "#856985"] as const;

const MODE_ALIASES: Record<string, string> = {
  일반: "일반게임",
  "함께 플레이": "일반게임",
  랭크: "랭크게임",
};

const PLAY_STYLE_ALIASES: Record<string, string> = {
  "목표 지향": "승리지향",
};

const cn = (...names: Array<string | false | undefined>) =>
  names.filter(Boolean).join(" ");

function toggleValue(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function clampText(value: string, fallback: string) {
  return value.trim() || fallback;
}

function splitGraphemes(value: string) {
  const normalized = value.normalize("NFC");
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
    return Array.from(segmenter.segment(normalized), ({ segment }) => segment);
  }
  return Array.from(normalized);
}

function firstGrapheme(value: string, fallback: string) {
  return splitGraphemes(clampText(value, fallback))[0] ?? fallback;
}

function canvasFont(weight: number, size: number, family: "sans" | "serif" = "sans") {
  return `${weight} ${size}px ${family === "serif" ? CARD_SERIF : CARD_SANS}`;
}

async function loadCardFonts(data: CardData) {
  const sample = [
    "사잇결 취향 기록 나의 한 장 나의 취향 결 선호 모드 플레이 결 요즘 마음이 가는 것 교류 타 장르 이별은 잘 맞아요 미리 알려요",
    data.nickname,
    data.handle,
    data.genre,
    data.phrase,
    data.intro,
    data.favorites,
    data.rank,
    ...data.modes,
    ...data.playStyles,
    ...data.times,
    data.voice,
    ...data.activities,
    data.otherGenre,
    data.breakup,
    data.goodMatch,
    data.headsUp,
    data.memo,
  ].join(" ").normalize("NFC");
  await Promise.all([
    document.fonts.load(`700 24px "${CARD_SANS_NAME}"`, sample),
    document.fonts.load(`700 24px "${CARD_SERIF_NAME}"`, sample),
  ]);
  await document.fonts.ready;
}

function splitFavorites(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function normalizeChoices(
  value: unknown,
  options: readonly string[],
  aliases: Record<string, string> = {},
) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => aliases[item] ?? item)
        .filter((item) => options.includes(item)),
    ),
  );
}

function normalizeStoredData(value: Partial<CardData>) {
  const text = <K extends keyof CardData>(key: K) =>
    typeof value[key] === "string" ? (value[key] as string) : (emptyData[key] as string);
  return {
    ...emptyData,
    nickname: text("nickname"),
    handle: text("handle"),
    genre: text("genre"),
    phrase: text("phrase"),
    intro: text("intro"),
    profileImage: text("profileImage"),
    favorites: text("favorites"),
    rank: text("rank"),
    voice: text("voice"),
    otherGenre: text("otherGenre"),
    breakup: text("breakup"),
    goodMatch: text("goodMatch"),
    headsUp: text("headsUp"),
    memo: text("memo"),
    imageZoom: clampNumber(value.imageZoom, emptyData.imageZoom, 100, 180),
    imageX: clampNumber(value.imageX, emptyData.imageX, 0, 100),
    imageY: clampNumber(value.imageY, emptyData.imageY, 0, 100),
    modes: normalizeChoices(value.modes, MODE_OPTIONS, MODE_ALIASES),
    playStyles: normalizeChoices(
      value.playStyles,
      PLAY_STYLE_OPTIONS,
      PLAY_STYLE_ALIASES,
    ),
    times: normalizeChoices(value.times, TIME_OPTIONS),
    activities: normalizeChoices(value.activities, ACTIVITY_OPTIONS),
    theme:
      typeof value.theme === "string" && Object.hasOwn(themes, value.theme)
        ? (value.theme as ThemeKey)
        : emptyData.theme,
    customTone:
      typeof value.customTone === "string" && HEX_COLOR.test(value.customTone)
        ? value.customTone.toLowerCase()
        : "",
    ratio:
      value.ratio === "landscape" || value.ratio === "portrait" || value.ratio === "square"
        ? value.ratio
        : emptyData.ratio,
  } satisfies CardData;
}

function formatCardDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function hasPersonalContent(data: CardData) {
  return Boolean(
    data.nickname.trim() ||
      data.handle.trim() ||
      data.genre.trim() ||
      data.phrase.trim() ||
      data.intro.trim() ||
      data.profileImage ||
      data.favorites.trim() ||
      data.rank.trim() ||
      data.modes.length ||
      data.playStyles.length ||
      data.times.length ||
      data.voice ||
      data.activities.length ||
      data.otherGenre ||
      data.breakup ||
      data.goodMatch.trim() ||
      data.headsUp.trim() ||
      data.memo.trim(),
  );
}

function hasStructuredBody(data: CardData) {
  return Boolean(
    splitFavorites(data.favorites).length ||
      data.rank.trim() ||
      data.modes.length ||
      data.playStyles.length ||
      data.times.length ||
      data.voice.trim() ||
      data.activities.length ||
      data.otherGenre.trim() ||
      data.breakup.trim() ||
      data.goodMatch.trim() ||
      data.headsUp.trim(),
  );
}

function ChoiceChips({
  options,
  selected,
  onChange,
  multiple = true,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
}) {
  return (
    <div className="choice-grid">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            type="button"
            key={option}
            className={cn("choice-chip", active && "is-active")}
            aria-pressed={active}
            onClick={() =>
              onChange(
                multiple
                  ? toggleValue(selected, option)
                  : active
                    ? []
                    : [option],
              )
            }
          >
            <span className="chip-check" aria-hidden="true">
              {active ? "✓" : "+"}
            </span>
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const onlyChild = Children.count(children) === 1 ? Children.only(children) : null;
  const isNativeControl =
    isValidElement<{ id?: string }>(onlyChild) &&
    typeof onlyChild.type === "string" &&
    ["input", "textarea", "select"].includes(onlyChild.type);
  const controlId = isNativeControl
    ? (onlyChild.props.id ?? generatedId)
    : undefined;
  const renderedControl = isNativeControl
    ? cloneElement(onlyChild, { id: controlId })
    : (
        <div className="field-control" role="group" aria-labelledby={labelId}>
          {children}
        </div>
      );

  return (
    <div className="field">
      <div className="field-heading">
        {controlId ? (
          <label className="field-label" htmlFor={controlId} id={labelId}>
            {label}
          </label>
        ) : (
          <span className="field-label" id={labelId}>{label}</span>
        )}
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      {renderedControl}
    </div>
  );
}

function StepButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn("step-tab", active && "is-current")}
      aria-current={active ? "step" : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function PaperPhoto({ data }: { data: CardData }) {
  const initial = firstGrapheme(data.nickname, "나");
  return (
    <div className="paper-photo-wrap">
      <span className="paper-tape" aria-hidden="true" />
      <div className="paper-photo">
        {data.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.profileImage}
            alt="업로드한 프로필 미리보기"
            style={{
              objectPosition: `${data.imageX}% ${data.imageY}%`,
              transform: `scale(${data.imageZoom / 100})`,
              transformOrigin: `${data.imageX}% ${data.imageY}%`,
            }}
          />
        ) : (
          <div className="photo-placeholder" aria-hidden="true">
            <span>{initial}</span>
            <i>사진 자리</i>
          </div>
        )}
      </div>
      <span className="photo-caption">나의 한 장</span>
    </div>
  );
}

function getSocialNotes(data: CardData) {
  return [
    data.activities.length
      ? { label: "교류", value: data.activities.join(" · "), isAccent: true }
      : null,
    data.otherGenre ? { label: "타 장르", value: data.otherGenre, isAccent: false } : null,
    data.breakup ? { label: "이별은", value: data.breakup, isAccent: false } : null,
  ].filter((note): note is { label: string; value: string; isAccent: boolean } => Boolean(note));
}

function CardPreview({ data }: { data: CardData }) {
  const theme = resolveCardPalette(data);
  const isSparse = !hasStructuredBody(data);
  const favorites = splitFavorites(data.favorites);
  const details = [
    { label: "등급", value: data.rank.trim() },
    { label: "접속", value: data.times.join(" · ") },
    { label: "보이스", value: data.voice.trim() },
  ].filter((detail) => detail.value);
  const hasPlayNotes = Boolean(
    details.length || data.modes.length || data.playStyles.length,
  );
  const socialNotes = getSocialNotes(data);
  const style = {
    "--paper": theme.paper,
    "--ink": theme.ink,
    "--accent": theme.accent,
    "--leaf": theme.leaf,
    "--sun": theme.sun,
    "--accent-soft": theme.accentSoft,
    "--leaf-soft": theme.leafSoft,
    "--photo-paper": theme.photoPaper,
    "--backdrop": theme.backdrop,
  } as CSSProperties;

  return (
    <article
      className={cn("friend-card", `ratio-${data.ratio}`, isSparse && "is-sparse")}
      style={style}
      data-testid="friend-card"
      aria-label="트친소 카드 실시간 미리보기"
    >
      <span className="contour contour-one" aria-hidden="true" />
      <span className="contour contour-two" aria-hidden="true" />
      <span className="stitch stitch-one" aria-hidden="true" />
      <header className="card-masthead">
        <span className="card-brand">사잇결</span>
        <span>취향 기록</span>
        <span className="card-index">{formatCardDate()}</span>
      </header>

      <div className="profile-composition">
        <PaperPhoto data={data} />
        <div className="identity-copy">
          {data.genre.trim() && <span className="genre-tag">{data.genre}</span>}
          <div className={cn("identity-name-row", !data.handle.trim() && "without-handle")}>
            <h2>{clampText(data.nickname, "당신의 이름")}</h2>
            {data.handle.trim() && <p className="handle">{data.handle}</p>}
          </div>
          {data.phrase.trim() && <p className="phrase">“{data.phrase}”</p>}
        </div>
      </div>

      {data.intro.trim() && <p className="card-intro">{data.intro}</p>}

      {(hasPlayNotes || favorites.length > 0) && (
        <div className={cn("card-information", !hasPlayNotes && "only-favorites", !favorites.length && "only-play") }>
          {hasPlayNotes && (
            <section className="play-notes">
              <div className="section-title-row">
                <h3>나의 취향 결</h3>
              </div>
              {details.length > 0 && (
                <div className="micro-details">
                  {details.map((detail) => (
                    <div className="micro-detail" key={detail.label}>
                      <span>{detail.label}</span>
                      <strong>{detail.value}</strong>
                    </div>
                  ))}
                </div>
              )}
              {(data.modes.length > 0 || data.playStyles.length > 0) && (
                <div className="preference-groups">
                  {data.modes.length > 0 && (
                    <div className="preference-group">
                      <strong>선호 모드</strong>
                      <div className="tag-block is-mode">
                        {data.modes.map((item) => <span key={item}>{item}</span>)}
                      </div>
                    </div>
                  )}
                  {data.playStyles.length > 0 && (
                    <div className="preference-group">
                      <strong>플레이 결</strong>
                      <div className="tag-block is-style">
                        {data.playStyles.map((item) => <span key={item}>{item}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {favorites.length > 0 && (
            <section className="favorite-notes">
              <div className="section-title-row">
                <h3>요즘 마음이 가는 것</h3>
              </div>
              <ul>
                {favorites.map((favorite, index) => (
                <li key={`${favorite}-${index}`}>{favorite}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {socialNotes.length > 0 && (
        <div className="card-social-line">
          {socialNotes.map((note) => (
            <span
              className={cn("social-note", note.isAccent && "is-accent")}
              key={note.label}
            >
              <strong>{note.label}</strong>
              <span>{note.value}</span>
            </span>
          ))}
        </div>
      )}

      {(data.goodMatch.trim() || data.headsUp.trim()) && (
        <div className={cn("relationship-grid", (!data.goodMatch.trim() || !data.headsUp.trim()) && "has-single") }>
          {data.goodMatch.trim() && (
            <section>
              <span className="relationship-label">잘 맞아요</span>
              <p>{data.goodMatch}</p>
            </section>
          )}
          {data.headsUp.trim() && (
            <section>
              <span className="relationship-label is-leaf">미리 알려요</span>
              <p>{data.headsUp}</p>
            </section>
          )}
        </div>
      )}

      <footer className="card-footer">
        {data.memo.trim() ? <p>{data.memo}</p> : <span aria-hidden="true" />}
        <span>made with Y_SUN</span>
      </footer>
    </article>
  );
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3,
) {
  const source = text.trim().normalize("NFC");
  if (!source) return [];
  const lines: string[] = [];
  let truncated = false;
  const paragraphs = source.split(/\r?\n/u);
  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex];
    if (!paragraph) {
      if (lines.length < maxLines) lines.push("");
      else truncated = true;
      continue;
    }
    let current = "";
    for (const char of splitGraphemes(paragraph)) {
      const next = current + char;
      if (ctx.measureText(next).width > maxWidth && current) {
        lines.push(current.trimEnd());
        if (lines.length === maxLines) {
          truncated = true;
          break;
        }
        current = char;
      } else {
        current = next;
      }
    }
    if (truncated) break;
    if (current && lines.length < maxLines) lines.push(current.trimEnd());
    if (lines.length === maxLines && paragraphIndex < paragraphs.length - 1) {
      truncated = true;
      break;
    }
  }
  if (truncated && lines.length) {
    const last = lines.length - 1;
    lines[last] = ellipsizeText(ctx, `${lines[last]}…`, maxWidth);
  }
  return lines;
}

function ellipsizeText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const source = value.trim().normalize("NFC");
  if (ctx.measureText(source).width <= maxWidth) return source;
  const graphemes = splitGraphemes(source.replace(/…+$/u, ""));
  let low = 0;
  let high = graphemes.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = `${graphemes.slice(0, middle).join("")}…`;
    if (ctx.measureText(candidate).width <= maxWidth) low = middle;
    else high = middle - 1;
  }
  return `${graphemes.slice(0, low).join("")}…`;
}

function drawEllipsizedText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  ctx.fillText(ellipsizeText(ctx, value, maxWidth), x, y);
}

function fitCanvasFont(
  ctx: CanvasRenderingContext2D,
  value: string,
  weight: number,
  preferredSize: number,
  minimumSize: number,
  maxWidth: number,
  family: "sans" | "serif" = "sans",
) {
  let size = preferredSize;
  ctx.font = canvasFont(weight, size, family);
  while (size > minimumSize && ctx.measureText(value).width > maxWidth) {
    size -= 1;
    ctx.font = canvasFont(weight, size, family);
  }
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
) {
  const lines = wrapLines(ctx, text, maxWidth, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function compressImage(file: File, background: string) {
  const src = URL.createObjectURL(file);
  try {
    const image = await loadImage(src);
    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지를 준비할 수 없어요.");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function renderCard(data: CardData) {
  const dimensions: Record<RatioKey, [number, number]> = {
    landscape: [1600, 1200],
    portrait: [1200, 1500],
    square: [1200, 1200],
  };
  const [width, height] = dimensions[data.ratio];
  const theme = resolveCardPalette(data);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PNG를 만들 수 없어요.");
  await loadCardFonts(data);

  const portrait = data.ratio === "portrait";
  const square = data.ratio === "square";
  const pad = Math.round(width * 0.055);
  const unit = data.ratio === "landscape" ? width / 1600 : width / 1200;
  const favorites = splitFavorites(data.favorites);
  const detailValues = [
    ["등급", data.rank.trim()],
    ["접속", data.times.join(" · ")],
    ["보이스", data.voice.trim()],
  ].filter((detail): detail is [string, string] => Boolean(detail[1]));
  const hasPlayNotes = Boolean(
    detailValues.length || data.modes.length || data.playStyles.length,
  );
  const socialNotes = getSocialNotes(data);
  const hasRelationship = Boolean(data.goodMatch.trim() || data.headsUp.trim());
  const hasBodyContent = Boolean(
    hasPlayNotes || favorites.length || socialNotes.length || hasRelationship,
  );
  const isSparse = !hasBodyContent;

  ctx.fillStyle = theme.backdrop;
  ctx.fillRect(0, 0, width, height);
  ctx.shadowColor = "rgba(28, 38, 42, 0.22)";
  ctx.shadowBlur = 24 * unit;
  ctx.shadowOffsetX = 12 * unit;
  ctx.shadowOffsetY = 14 * unit;
  roundedRect(ctx, pad * 0.65, pad * 0.65, width - pad * 1.3, height - pad * 1.3, 10 * unit);
  ctx.fillStyle = theme.paper;
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.save();
  roundedRect(ctx, pad * 0.65, pad * 0.65, width - pad * 1.3, height - pad * 1.3, 10 * unit);
  ctx.clip();
  for (let index = 0; index < 2100; index += 1) {
    const x = (index * 47) % width;
    const y = (index * 97) % height;
    ctx.fillStyle = index % 4 === 0 ? withAlpha(theme.ink, 0.026) : withAlpha(theme.accent, 0.018);
    ctx.fillRect(x, y, 1.4 * unit, 1.4 * unit);
  }
  ctx.strokeStyle = withAlpha(theme.accent, 0.21);
  ctx.lineWidth = 2.2 * unit;
  for (let index = 0; index < 4; index += 1) {
    const offset = index * 24 * unit;
    ctx.beginPath();
    ctx.ellipse(width * 0.91, height * 0.13, 180 * unit + offset, 105 * unit + offset, -0.34, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  const left = pad;
  const right = width - pad;
  const top = pad;
  ctx.fillStyle = theme.ink;
  ctx.font = canvasFont(700, (isSparse ? 26 : 23) * unit);
  ctx.fillText("사잇결", left, top + 16 * unit);
  ctx.font = canvasFont(600, (isSparse ? 14 : 12) * unit);
  ctx.fillText("취향 기록", left + 86 * unit, top + 15 * unit);
  ctx.textAlign = "right";
  ctx.fillText(formatCardDate(), right, top + 15 * unit);
  ctx.textAlign = "left";
  ctx.strokeStyle = theme.ink;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(left, top + 34 * unit);
  ctx.lineTo(right, top + 34 * unit);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const photoX = isSparse
    ? left + (portrait ? 30 : square ? 40 : 70) * unit
    : left;
  const photoY = isSparse
    ? (portrait
        ? (data.intro.trim() ? 310 : 370)
        : square
          ? (data.intro.trim() ? 245 : 300)
          : (data.intro.trim() ? 250 : 300)) * unit
    : top + 72 * unit;
  const photoSize = isSparse
    ? (portrait ? 360 : square ? 340 : 410) * unit
    : portrait
      ? 330 * unit
      : square
        ? 300 * unit
        : 310 * unit;
  ctx.save();
  ctx.translate(photoX + 9 * unit, photoY + 11 * unit);
  ctx.rotate(-0.025);
  ctx.fillStyle = theme.photoPaper;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2.2 * unit;
  ctx.fillRect(0, 0, photoSize + 24 * unit, photoSize + 62 * unit);
  ctx.strokeRect(0, 0, photoSize + 24 * unit, photoSize + 62 * unit);
  ctx.save();
  ctx.beginPath();
  ctx.rect(12 * unit, 12 * unit, photoSize, photoSize);
  ctx.clip();
  if (data.profileImage) {
    const image = await loadImage(data.profileImage);
    const baseScale = Math.max(photoSize / image.width, photoSize / image.height);
    const zoom = data.imageZoom / 100;
    const drawWidth = image.width * baseScale * zoom;
    const drawHeight = image.height * baseScale * zoom;
    const freeX = photoSize - drawWidth;
    const freeY = photoSize - drawHeight;
    const drawX = 12 * unit + freeX * (data.imageX / 100);
    const drawY = 12 * unit + freeY * (data.imageY / 100);
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  } else {
    ctx.fillStyle = theme.sun;
    ctx.fillRect(12 * unit, 12 * unit, photoSize, photoSize);
    ctx.fillStyle = theme.ink;
    ctx.textAlign = "center";
    ctx.font = canvasFont(700, 105 * unit, "serif");
    ctx.fillText(firstGrapheme(data.nickname, "나"), 12 * unit + photoSize / 2, 12 * unit + photoSize * 0.62);
    ctx.textAlign = "left";
  }
  ctx.restore();
  ctx.fillStyle = theme.ink;
  ctx.font = canvasFont(600, (isSparse ? 15 : 12) * unit);
  ctx.fillText("나의 한 장", 13 * unit, photoSize + 42 * unit);
  ctx.restore();
  ctx.save();
  ctx.translate(photoX + photoSize * 0.32, photoY - 10 * unit);
  ctx.rotate(-0.07);
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = theme.sun;
  ctx.fillRect(0, 0, (isSparse ? 126 : 112) * unit, (isSparse ? 38 : 34) * unit);
  ctx.restore();

  const copyX = photoX + photoSize + (isSparse ? (portrait ? 70 : square ? 65 : 110) : portrait ? 72 : 92) * unit;
  const copyY = photoY + (isSparse ? 40 : 32) * unit;
  const copyWidth = right - copyX;
  if (data.genre.trim()) {
    const genreFontSize = isSparse ? 16 : 14;
    const genreHeight = isSparse ? 38 : 32;
    const genrePadding = isSparse ? 38 : 32;
    ctx.font = canvasFont(700, genreFontSize * unit);
    const genreMaxWidth = Math.min(copyWidth, (isSparse ? 285 : 255) * unit);
    const genreText = ellipsizeText(ctx, data.genre, genreMaxWidth - genrePadding * unit);
    const genreWidth = Math.min(genreMaxWidth, ctx.measureText(genreText).width + genrePadding * unit);
    ctx.fillStyle = theme.accent;
    roundedRect(ctx, copyX, copyY, genreWidth, genreHeight * unit, genreHeight * 0.5 * unit);
    ctx.fill();
    ctx.fillStyle = theme.paper;
    ctx.fillText(genreText, copyX + genrePadding * 0.5 * unit, copyY + (isSparse ? 26 : 22) * unit);
  }
  ctx.fillStyle = theme.ink;
  const nicknameSize = isSparse ? (portrait || square ? 78 : 92) : portrait ? 68 : 74;
  const nickname = clampText(data.nickname, "이름").normalize("NFC");
  const nameBaseline = copyY + (isSparse ? 126 : 108) * unit;
  const handleFontSize = isSparse ? (portrait || square ? 19 : 22) : 19;
  const handleGap = (isSparse ? 18 : 14) * unit;
  let handleText = "";
  let handleWidth = 0;
  if (data.handle.trim()) {
    ctx.font = canvasFont(600, handleFontSize * unit);
    handleText = ellipsizeText(
      ctx,
      data.handle,
      Math.min(copyWidth * 0.4, (isSparse ? 260 : 230) * unit),
    );
    handleWidth = ctx.measureText(handleText).width;
  }
  const nicknameWidth = Math.max(
    copyWidth * 0.42,
    copyWidth - (handleText ? handleWidth + handleGap : 0),
  );
  fitCanvasFont(
    ctx,
    nickname,
    700,
    nicknameSize * unit,
    (isSparse ? 48 : 40) * unit,
    nicknameWidth,
    "serif",
  );
  const nicknameText = ellipsizeText(ctx, nickname, nicknameWidth);
  ctx.fillText(nicknameText, copyX, nameBaseline);
  const renderedNicknameWidth = ctx.measureText(nicknameText).width;
  if (handleText) {
    ctx.font = canvasFont(600, handleFontSize * unit);
    ctx.globalAlpha = 0.7;
    ctx.fillText(
      handleText,
      Math.min(copyX + renderedNicknameWidth + handleGap, right - handleWidth),
      nameBaseline - 2 * unit,
    );
    ctx.globalAlpha = 1;
  }
  if (data.phrase.trim()) {
    ctx.font = canvasFont(700, (isSparse ? 30 : 25) * unit, "serif");
    drawWrappedText(
      ctx,
      `“${data.phrase}”`,
      copyX,
      copyY + (isSparse ? 198 : 178) * unit,
      copyWidth,
      (isSparse ? 42 : 36) * unit,
      isSparse ? 2 : 3,
    );
  }

  let nextY = photoY + photoSize + (isSparse ? 123 : 119) * unit;
  if (data.intro.trim()) {
    ctx.fillStyle = theme.ink;
    ctx.font = canvasFont(700, (isSparse ? 29 : 22) * unit);
    const introHeight = drawWrappedText(
      ctx,
      data.intro,
      photoX + 9 * unit,
      nextY,
      right - photoX - 9 * unit,
      (isSparse ? 41 : 31) * unit,
      portrait ? 3 : 2,
    );
    nextY += introHeight + 6 * unit;
  }
  if (hasBodyContent) {
    ctx.strokeStyle = theme.ink;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.moveTo(left, nextY);
    ctx.lineTo(right, nextY);
    ctx.stroke();
    ctx.globalAlpha = 1;
    nextY += (data.intro.trim() ? 38 : 34) * unit;
  }

  const columnGap = 38 * unit;
  const stackInfo = portrait && hasPlayNotes && favorites.length > 0;
  const splitInfo = !stackInfo && hasPlayNotes && favorites.length > 0;
  const sectionWidth = splitInfo ? (right - left - columnGap) / 2 : right - left;
  const playWidth = splitInfo ? sectionWidth : right - left;
  const favoriteX = splitInfo ? left + sectionWidth + columnGap : left;
  let favoriteTitleY = nextY;
  const sectionTitle = (x: number, y: number, title: string) => {
    ctx.fillStyle = theme.ink;
    ctx.font = canvasFont(600, 24 * unit, "serif");
    ctx.fillText(title, x, y + 1 * unit);
  };
  if (hasPlayNotes) sectionTitle(left, nextY, "나의 취향 결");
  if (splitInfo) {
    ctx.strokeStyle = withAlpha(theme.ink, 0.2);
    ctx.lineWidth = 1 * unit;
    ctx.beginPath();
    ctx.moveTo(favoriteX - columnGap / 2, nextY - 4 * unit);
    ctx.lineTo(favoriteX - columnGap / 2, nextY + 146 * unit);
    ctx.stroke();
  }

  const detailY = nextY + 38 * unit;
  detailValues.forEach(([label, value], index) => {
    const x = left + (index % 3) * (playWidth / 3);
    const y = detailY + Math.floor(index / 3) * 55 * unit;
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.55;
    ctx.font = canvasFont(500, 18 * unit);
    ctx.fillText(label, x, y);
    ctx.globalAlpha = 1;
    ctx.font = canvasFont(600, 23 * unit);
    drawEllipsizedText(ctx, value, x, y + 28 * unit, playWidth / 3 - 8 * unit);
  });

  const detailRows = detailValues.length ? Math.ceil(detailValues.length / 3) : 0;
  let preferenceY = detailY + detailRows * 54 * unit;
  const drawPreferenceGroup = (
    label: string,
    tags: string[],
    color: string,
  ) => {
    if (!tags.length) return;
    ctx.fillStyle = color;
    ctx.font = canvasFont(600, 18 * unit);
    ctx.fillText(label, left, preferenceY + 25 * unit);

    let tagX = left + 82 * unit;
    ctx.font = canvasFont(600, 20 * unit);
    tags.forEach((tag) => {
      const tagWidth = Math.min(ctx.measureText(tag).width + 30 * unit, playWidth - 82 * unit);
      if (tagX + tagWidth > left + playWidth) {
        tagX = left + 82 * unit;
        preferenceY += 40 * unit;
      }
      roundedRect(ctx, tagX, preferenceY, tagWidth, 36 * unit, 18 * unit);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * unit;
      ctx.stroke();
      ctx.fillStyle = color;
      drawEllipsizedText(ctx, tag, tagX + 15 * unit, preferenceY + 25 * unit, tagWidth - 22 * unit);
      tagX += tagWidth + 8 * unit;
    });
    preferenceY += 38 * unit;
  };
  drawPreferenceGroup("선호 모드", data.modes, theme.accent);
  drawPreferenceGroup("플레이 결", data.playStyles, theme.leaf);
  const playBottomY = hasPlayNotes ? Math.max(detailY + 46 * unit, preferenceY) : nextY;
  favoriteTitleY = stackInfo
    ? Math.max(nextY + 184 * unit, playBottomY + 24 * unit)
    : nextY;
  if (stackInfo && favorites.length) {
    ctx.strokeStyle = withAlpha(theme.ink, 0.2);
    ctx.lineWidth = 1 * unit;
    ctx.beginPath();
    ctx.moveTo(left, favoriteTitleY - 18 * unit);
    ctx.lineTo(right, favoriteTitleY - 18 * unit);
    ctx.stroke();
  }
  if (favorites.length) {
    sectionTitle(favoriteX, favoriteTitleY, "요즘 마음이 가는 것");
  }

  favorites.forEach((favorite, index) => {
    const x = favoriteX;
    const y = favoriteTitleY + 52 * unit + index * 36 * unit;
    ctx.fillStyle = theme.ink;
    ctx.font = canvasFont(600, 22 * unit);
    drawEllipsizedText(ctx, favorite, x, y, sectionWidth - 6 * unit);
  });

  const favoriteBottomY = favorites.length
    ? favoriteTitleY + 66 * unit + (favorites.length - 1) * 36 * unit
    : nextY;
  let relationY = (hasPlayNotes || favorites.length)
    ? Math.max(playBottomY, favoriteBottomY) + 14 * unit
    : nextY;
  if (socialNotes.length) {
    let socialX = left;
    socialNotes.forEach((note) => {
      const available = right - socialX;
      if (available <= 40 * unit) return;
      ctx.font = canvasFont(note.isAccent ? 600 : 500, 14 * unit);
      const text = ellipsizeText(ctx, `${note.label} ${note.value}`, available - 20 * unit);
      const pillWidth = Math.min(available, ctx.measureText(text).width + 20 * unit);
      roundedRect(ctx, socialX, relationY, pillWidth, 27 * unit, 13.5 * unit);
      ctx.fillStyle = note.isAccent ? theme.accentSoft : theme.photoPaper;
      ctx.fill();
      ctx.strokeStyle = withAlpha(note.isAccent ? theme.accent : theme.ink, note.isAccent ? 0.42 : 0.16);
      ctx.lineWidth = 1.25 * unit;
      ctx.stroke();
      ctx.fillStyle = note.isAccent ? theme.accent : theme.ink;
      ctx.globalAlpha = note.isAccent ? 1 : 0.78;
      ctx.fillText(text, socialX + 10 * unit, relationY + 19 * unit);
      ctx.globalAlpha = 1;
      socialX += pillWidth + 8 * unit;
    });
    relationY += 42 * unit;
  }
  const relationHeight = portrait ? 190 * unit : square ? 152 * unit : 122 * unit;
  const bothRelationships = Boolean(data.goodMatch.trim() && data.headsUp.trim());
  const relationWidth = bothRelationships
    ? (right - left - columnGap) / 2
    : right - left;
  const drawRelation = (
    x: number,
    color: string,
    surface: string,
    label: string,
    value: string,
  ) => {
    roundedRect(ctx, x, relationY, relationWidth, relationHeight, 8 * unit);
    ctx.fillStyle = surface;
    ctx.fill();
    ctx.strokeStyle = withAlpha(color, 0.48);
    ctx.lineWidth = 1.6 * unit;
    ctx.stroke();
    roundedRect(ctx, x + 10 * unit, relationY + 14 * unit, 5 * unit, relationHeight - 28 * unit, 2.5 * unit);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = canvasFont(600, 18 * unit);
    ctx.fillText(label, x + 26 * unit, relationY + 35 * unit);
    ctx.fillStyle = theme.ink;
    ctx.font = canvasFont(500, 17 * unit);
    drawWrappedText(
      ctx,
      value,
      x + 26 * unit,
      relationY + (square || portrait ? 70 : 66) * unit,
      relationWidth - 52 * unit,
      (square ? 23 : portrait ? 26 : 24) * unit,
      portrait || square ? 4 : 3,
    );
  };
  if (data.goodMatch.trim()) {
    drawRelation(left, theme.accent, theme.accentSoft, "잘 맞아요", data.goodMatch);
  }
  if (data.headsUp.trim()) {
    drawRelation(
      data.goodMatch.trim() ? left + relationWidth + columnGap : left,
      theme.leaf,
      theme.leafSoft,
      "미리 알려요",
      data.headsUp,
    );
  }

  const footerY = height - pad - 22 * unit;
  ctx.strokeStyle = theme.ink;
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.moveTo(left, footerY - 32 * unit);
  ctx.lineTo(right, footerY - 32 * unit);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.ink;
  if (data.memo.trim()) {
    ctx.font = canvasFont(700, 22 * unit, "serif");
    drawEllipsizedText(ctx, `“${data.memo}”`, left, footerY, right - left - 190 * unit);
  }
  ctx.textAlign = "right";
  ctx.font = canvasFont(600, 12 * unit);
  ctx.globalAlpha = 0.58;
  ctx.fillText("made with Y_SUN", right, footerY);
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG를 만들 수 없어요."))),
      "image/png",
    );
  });
}

function RenderedCardPreview({ data }: { data: CardData }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const latestRender = useRef(0);
  const activeUrl = useRef("");

  useEffect(() => {
    const renderId = ++latestRender.current;
    const timer = window.setTimeout(async () => {
      try {
        const blob = await renderCard(data);
        const nextUrl = URL.createObjectURL(blob);
        if (renderId !== latestRender.current) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        if (activeUrl.current) URL.revokeObjectURL(activeUrl.current);
        activeUrl.current = nextUrl;
        setPreviewUrl(nextUrl);
      } catch {
        // 입력 중 렌더가 취소되면 직전 미리보기를 그대로 유지해요.
      }
    }, 90);

    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(
    () => () => {
      latestRender.current += 1;
      if (activeUrl.current) URL.revokeObjectURL(activeUrl.current);
    },
    [],
  );

  if (!previewUrl) return <CardPreview data={data} />;

  return (
    <div
      className={cn("rendered-card-preview", `ratio-${data.ratio}`)}
      aria-label="저장 이미지와 같은 카드 미리보기"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewUrl} alt="완성된 사잇결 트친소 카드" draggable={false} />
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<CardData>(emptyData);
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState("새 카드가 준비됐어요");
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState("");
  const [isAndroidKakao, setIsAndroidKakao] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const photoDrag = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    imageX: number;
    imageY: number;
    overflowX: number;
    overflowY: number;
  } | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as unknown;
          setData(
            normalizeStoredData(
              parsed && typeof parsed === "object" ? (parsed as Partial<CardData>) : {},
            ),
          );
          setSaveState("이 기기에 저장한 내용을 불러왔어요");
        }
      } catch {
        setSaveState("새 카드로 시작했어요");
      } finally {
        setHydrated(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsAndroidKakao(
        /Android/i.test(navigator.userAgent) && /KAKAOTALK/i.test(navigator.userAgent),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setSaveState("이 기기에 저장했어요");
      } catch {
        setSaveState("사진을 줄이면 자동 저장할 수 있어요");
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [data, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const progress = `${((step + 1) / steps.length) * 100}%`;
  const theme = resolveCardPalette(data);
  const previewInk = readableColor(theme.backdrop, theme.ink, theme.paper);
  const cardStyle = useMemo(
    () =>
      ({
        "--preview-backdrop": theme.backdrop,
        "--preview-ink": previewInk,
        "--preview-button-bg": previewInk,
        "--preview-button-ink": readableColor(previewInk, theme.ink, theme.paper),
      }) as CSSProperties,
    [previewInk, theme.backdrop, theme.ink, theme.paper],
  );

  const update = <K extends keyof CardData>(key: K, value: CardData[K]) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const startPhotoDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    const image = event.currentTarget.querySelector("img");
    if (!image?.naturalWidth || !image.naturalHeight) return;

    const boxWidth = event.currentTarget.clientWidth;
    const boxHeight = event.currentTarget.clientHeight;
    const nextZoom = Math.max(data.imageZoom, 108);
    const baseScale = Math.max(
      boxWidth / image.naturalWidth,
      boxHeight / image.naturalHeight,
    );
    photoDrag.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      imageX: data.imageX,
      imageY: data.imageY,
      overflowX: Math.max(0, image.naturalWidth * baseScale * (nextZoom / 100) - boxWidth),
      overflowY: Math.max(0, image.naturalHeight * baseScale * (nextZoom / 100) - boxHeight),
    };
    if (nextZoom !== data.imageZoom) update("imageZoom", nextZoom);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const movePhoto = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = photoDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.clientX;
    const deltaY = event.clientY - drag.clientY;
    const nextX = drag.overflowX
      ? Math.min(100, Math.max(0, drag.imageX - (deltaX / drag.overflowX) * 100))
      : 50;
    const nextY = drag.overflowY
      ? Math.min(100, Math.max(0, drag.imageY - (deltaY / drag.overflowY) * 100))
      : 50;
    setData((current) => ({ ...current, imageX: nextX, imageY: nextY }));
    event.preventDefault();
  };

  const finishPhotoDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (photoDrag.current?.pointerId !== event.pointerId) return;
    photoDrag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const movePhotoWithKeys = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const distance = event.shiftKey ? 10 : 3;
    const changes: Partial<Pick<CardData, "imageX" | "imageY">> = {};
    if (event.key === "ArrowLeft") changes.imageX = Math.min(100, data.imageX + distance);
    if (event.key === "ArrowRight") changes.imageX = Math.max(0, data.imageX - distance);
    if (event.key === "ArrowUp") changes.imageY = Math.min(100, data.imageY + distance);
    if (event.key === "ArrowDown") changes.imageY = Math.max(0, data.imageY - distance);
    if (!Object.keys(changes).length) return;
    setData((current) => ({
      ...current,
      imageZoom: Math.max(current.imageZoom, 108),
      ...changes,
    }));
    event.preventDefault();
  };

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("이미지 파일을 골라주세요.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setToast("12MB보다 작은 이미지를 골라주세요.");
      return;
    }
    try {
      setSaveState("사진을 다듬는 중…");
      const result = await compressImage(file, theme.photoPaper);
      setData((current) => ({
        ...current,
        profileImage: result,
        imageZoom: 110,
        imageX: 50,
        imageY: 50,
      }));
      setToast("사진을 카드에 담았어요.");
    } catch {
      setToast("사진을 불러오지 못했어요. 다른 파일을 골라주세요.");
    } finally {
      event.target.value = "";
    }
  };

  const createBlob = async () => {
    setExporting(true);
    try {
      return await renderCard(data);
    } finally {
      setExporting(false);
    }
  };

  const downloadFilename = () => {
    const safeNickname = clampText(data.nickname, "card")
      .normalize("NFC")
      .replace(/[\\/:*?"<>|%]/g, "")
      .replace(/[\s.]+$/g, "")
      .slice(0, 32) || "card";
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return `saitgyeol_${safeNickname}_${date}.png`;
  };

  const triggerBlobDownload = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadFilename();
    link.rel = "noopener";
    link.style.display = "none";
    document.body.append(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 30_000);
  };

  const downloadCard = async () => {
    if (!data.nickname.trim()) {
      setStep(0);
      setToast("PNG에 담을 닉네임을 먼저 적어주세요.");
      document.querySelector("#maker")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (isAndroidKakao) {
      setToast("카카오톡의 ⋮ 메뉴에서 ‘다른 브라우저로 열기’ 후 저장해 주세요.");
      return;
    }
    try {
      const blob = await createBlob();
      triggerBlobDownload(blob);
      setToast("PNG 다운로드를 시작했어요.");
    } catch {
      setToast("PNG 저장에 실패했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  };

  const postCopy = `${clampText(data.genre, "요즘 좋아하는 것")} 트친소 열어요 🌿\n${clampText(data.phrase, "마음 맞는 분을 기다려요.")}\n\n#트친소 #사잇결`;

  const copyPost = async () => {
    try {
      await navigator.clipboard.writeText(postCopy);
      setToast("게시글 문구를 복사했어요.");
    } catch {
      setToast("복사하지 못했어요. 브라우저 권한을 확인해 주세요.");
    }
  };

  const shareCard = async () => {
    if (!data.nickname.trim()) {
      setStep(0);
      setToast("공유할 카드의 닉네임을 먼저 적어주세요.");
      document.querySelector("#maker")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (isAndroidKakao) {
      setToast("카카오톡의 ⋮ 메뉴에서 ‘다른 브라우저로 열기’를 이용해 주세요.");
      return;
    }
    try {
      const blob = await createBlob();
      const file = new File([blob], "saitgyeol-card.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "사잇결 트친소 카드",
          text: postCopy,
          files: [file],
        });
        setToast("카드를 건넸어요.");
        return;
      }
      await navigator.clipboard.writeText(postCopy);
      triggerBlobDownload(blob);
      setToast("PNG를 저장하고 게시글 문구를 복사했어요.");
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        setToast("공유를 마치지 못했어요. PNG 저장을 이용해 주세요.");
      }
    }
  };

  const resetCard = () => {
    if (!window.confirm("지금까지 쓴 내용을 모두 비울까요?")) return;
    setData(emptyData);
    setStep(0);
    window.localStorage.removeItem(STORAGE_KEY);
    setToast("새 종이를 펼쳤어요.");
  };

  const fillExample = () => {
    if (
      hasPersonalContent(data) &&
      !window.confirm("작성 중인 내용을 예시로 바꿀까요?")
    ) {
      return;
    }
    setData(defaultData);
    setToast("예시 내용을 다시 담았어요.");
  };

  return (
    <div className="site-page">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="사잇결 처음으로">
          <span className="wordmark-seal">결</span>
          <span>
            <strong>사잇결</strong>
            <small>취향으로 잇는 트친소</small>
          </span>
        </a>
        <div className="header-note">
          <span className="privacy-dot" aria-hidden="true" />
          사진과 입력 내용은 이 기기 안에서만 사용돼요
        </div>
        <a className="header-link" href="#maker">
          바로 만들기 <span aria-hidden="true">↘</span>
        </a>
      </header>

      <main id="top">
        {isAndroidKakao && (
          <div className="kakao-browser-notice" role="alert">
            <strong>카카오톡 안에서는 PNG 저장이 제한돼요.</strong>
            <span>오른쪽 위 ⋮ 메뉴에서 ‘다른 브라우저로 열기’를 선택해 주세요.</span>
          </div>
        )}
        <section className="intro-band" aria-labelledby="main-title">
          <div className="intro-copy">
            <h1 id="main-title">
              취향의 결을 모아,
              <br />
              <em>잘 맞을 사이</em>를 그려요.
            </h1>
          </div>
          <div className="intro-aside">
            <p>
              보여주고 싶은 것만 골라 한 장에 담아보세요.
              <br />
              가입 없이, 천천히 써도 괜찮아요.
            </p>
          </div>
        </section>

        <section className="maker" id="maker" aria-label="트친소 카드 제작기">
          <div className="editor-panel">
            <div className="editor-heading">
              <div>
                <h2>{steps[step].title}</h2>
              </div>
              <button className="text-button" type="button" onClick={fillExample}>
                예시 불러오기
              </button>
            </div>

            <nav className="step-tabs" aria-label="카드 만들기 단계">
              {steps.map((item, index) => (
                <StepButton
                  key={item.short}
                  active={step === index}
                  label={item.short}
                  onClick={() => setStep(index)}
                />
              ))}
              <span className="step-progress" style={{ width: progress }} />
            </nav>

            <div className="step-body">
              {step === 0 && (
                <div className="form-stack">
                  <h3 className="form-group-title">기본 정보</h3>
                  <div className="photo-upload-row">
                    <button
                      type="button"
                      className={cn("upload-preview", data.profileImage && "is-draggable")}
                      aria-label={
                        data.profileImage
                          ? "프로필 사진 위치 조정. 사진을 끌거나 방향키로 이동하세요."
                          : "프로필 사진 미리보기"
                      }
                      onPointerDown={startPhotoDrag}
                      onPointerMove={movePhoto}
                      onPointerUp={finishPhotoDrag}
                      onPointerCancel={finishPhotoDrag}
                      onKeyDown={movePhotoWithKeys}
                    >
                      {data.profileImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={data.profileImage}
                          alt=""
                          draggable={false}
                          style={{
                            objectPosition: `${data.imageX}% ${data.imageY}%`,
                            transform: `scale(${data.imageZoom / 100})`,
                            transformOrigin: `${data.imageX}% ${data.imageY}%`,
                          }}
                        />
                      ) : (
                        <span>{firstGrapheme(data.nickname, "나")}</span>
                      )}
                    </button>
                    <div>
                      <strong>프로필 사진</strong>
                      <p>정사각형에 가까운 사진이 가장 예쁘게 담겨요.</p>
                      <input
                        ref={fileInput}
                        className="sr-only"
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImage}
                      />
                      <div className="upload-actions">
                        <button
                          className="small-action"
                          type="button"
                          onClick={() => fileInput.current?.click()}
                        >
                          사진 고르기
                        </button>
                        {data.profileImage && (
                          <button
                            className="small-action is-quiet"
                            type="button"
                            onClick={() => update("profileImage", "")}
                          >
                            사진 빼기
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {data.profileImage && (
                    <div className="image-control-wrap">
                      <div className="image-controls">
                        <label>
                          <span>확대</span>
                          <input
                            type="range"
                            min="100"
                            max="180"
                            value={data.imageZoom}
                            onChange={(event) => update("imageZoom", Number(event.target.value))}
                          />
                        </label>
                        <label>
                          <span>좌우</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={data.imageX}
                            onChange={(event) =>
                              setData((current) => ({
                                ...current,
                                imageZoom: Math.max(current.imageZoom, 108),
                                imageX: Number(event.target.value),
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>상하</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={data.imageY}
                            onChange={(event) =>
                              setData((current) => ({
                                ...current,
                                imageZoom: Math.max(current.imageZoom, 108),
                                imageY: Number(event.target.value),
                              }))
                            }
                          />
                        </label>
                      </div>
                      <p>사진을 직접 끌어도 위치를 바꿀 수 있어요.</p>
                    </div>
                  )}

                  <div className="two-fields">
                    <Field label="닉네임" hint={`${data.nickname.length}/14`}>
                      <input
                        value={data.nickname}
                        maxLength={14}
                        placeholder="나를 부르는 이름"
                        onChange={(event) => update("nickname", event.target.value)}
                      />
                    </Field>
                    <Field label="X 아이디" hint={`${data.handle.length}/24`}>
                      <input
                        value={data.handle}
                        maxLength={24}
                        placeholder="@your_handle"
                        onChange={(event) => update("handle", event.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="장르 · 작품 · 게임" hint={`${data.genre.length}/24`}>
                    <input
                      value={data.genre}
                      maxLength={24}
                      placeholder="요즘 가장 좋아하는 세계"
                      onChange={(event) => update("genre", event.target.value)}
                    />
                  </Field>
                  <div className="form-section-divider"><span>한마디 소개</span></div>
                  <Field label="마음을 담은 한 문장" hint={`${data.phrase.length}/42`}>
                    <input
                      value={data.phrase}
                      maxLength={42}
                      placeholder="좋아하는 방식이 드러나는 문장"
                      onChange={(event) => update("phrase", event.target.value)}
                    />
                  </Field>
                  <Field label="짧은 소개" hint={`${data.intro.length}/92`}>
                    <textarea
                      rows={3}
                      value={data.intro}
                      maxLength={92}
                      placeholder="어떤 사람인지, 어떤 속도로 친해지고 싶은지 적어주세요."
                      onChange={(event) => update("intro", event.target.value)}
                    />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="form-stack">
                  <h3 className="form-group-title">플레이 취향</h3>
                  <Field label="최애 · 주캐" hint="쉼표로 나눠 최대 3개">
                    <input
                      value={data.favorites}
                      maxLength={48}
                      placeholder="예: 아야, 리 다이린, 쇼우"
                      onChange={(event) => update("favorites", event.target.value)}
                    />
                  </Field>
                  <Field label="티어 · 등급 · 레벨" hint="장르에 맞게 자유롭게 적어주세요">
                    <input
                      value={data.rank}
                      maxLength={18}
                      placeholder="예: 골드, 100레벨, 입문자"
                      onChange={(event) => update("rank", event.target.value)}
                    />
                  </Field>
                  <Field label="선호 모드" hint="여러 개 골라도 좋아요">
                    <ChoiceChips
                      options={MODE_OPTIONS}
                      selected={data.modes}
                      onChange={(next) => update("modes", next)}
                    />
                  </Field>
                  <Field label="플레이의 결">
                    <ChoiceChips
                      options={PLAY_STYLE_OPTIONS}
                      selected={data.playStyles}
                      onChange={(next) => update("playStyles", next)}
                    />
                  </Field>
                  <div className="form-section-divider"><span>접속 환경</span></div>
                  <Field label="주로 만나는 시간">
                    <ChoiceChips
                      options={TIME_OPTIONS}
                      selected={data.times}
                      onChange={(next) => update("times", next)}
                    />
                  </Field>
                  <Field label="보이스">
                    <ChoiceChips
                      options={["사용해요", "듣코도 좋아요", "사용 안 해요"]}
                      selected={data.voice ? [data.voice] : []}
                      multiple={false}
                      onChange={(next) => update("voice", next[0] || "")}
                    />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="form-stack">
                  <h3 className="form-group-title">교류 방식</h3>
                  <Field label="좋아하는 교류">
                    <ChoiceChips
                      options={ACTIVITY_OPTIONS}
                      selected={data.activities}
                      onChange={(next) => update("activities", next)}
                    />
                  </Field>
                  <div className="two-fields">
                    <Field label="타 장르 이야기">
                      <select
                        value={data.otherGenre}
                        onChange={(event) => update("otherGenre", event.target.value)}
                      >
                        <option value="">표시하지 않기</option>
                        <option>자주 해요</option>
                        <option>가끔 해요</option>
                        <option>거의 안 해요</option>
                      </select>
                    </Field>
                    <Field label="헤어질 때">
                      <select
                        value={data.breakup}
                        onChange={(event) => update("breakup", event.target.value)}
                      >
                        <option value="">표시하지 않기</option>
                        <option>블언블</option>
                        <option>블락</option>
                        <option>언팔</option>
                        <option>편하게</option>
                      </select>
                    </Field>
                  </div>
                  <div className="form-section-divider"><span>서로 알아둘 것</span></div>
                  <Field label="잘 맞아요" hint={`${data.goodMatch.length}/92`}>
                    <textarea
                      rows={3}
                      value={data.goodMatch}
                      maxLength={92}
                      placeholder="함께 있으면 편할 것 같은 사람을 적어주세요."
                      onChange={(event) => update("goodMatch", event.target.value)}
                    />
                  </Field>
                  <Field label="미리 알려요" hint={`${data.headsUp.length}/92`}>
                    <textarea
                      rows={3}
                      value={data.headsUp}
                      maxLength={92}
                      placeholder="서로 편해지기 위해 미리 알려둘 점이 있나요?"
                      onChange={(event) => update("headsUp", event.target.value)}
                    />
                  </Field>
                  <Field label="마지막 한마디" hint={`${data.memo.length}/68`}>
                    <input
                      value={data.memo}
                      maxLength={68}
                      placeholder="카드 아래에 크게 남길 문장"
                      onChange={(event) => update("memo", event.target.value)}
                    />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="form-stack">
                  <Field label="종이의 분위기" hint="글자가 잘 보이도록 색을 맞춰뒀어요">
                    <div className="theme-grid">
                      {(Object.keys(themes) as ThemeKey[]).map((key) => {
                        const item = themes[key];
                        const palette = resolveTheme(item);
                        return (
                          <button
                            type="button"
                            key={key}
                            className={cn("theme-choice", data.theme === key && !data.customTone && "is-active")}
                            aria-pressed={data.theme === key && !data.customTone}
                            onClick={() => setData((current) => ({ ...current, theme: key, customTone: "" }))}
                          >
                            <span
                              className="theme-swatches"
                              style={{
                                background: item.paper,
                                color: item.ink,
                                borderColor: item.ink,
                              }}
                            >
                              <i style={{ background: palette.accent }} />
                              <i style={{ background: palette.leaf }} />
                              <i style={{ background: palette.sun }} />
                            </span>
                            <strong>{item.name}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="직접 색 고르기" hint="가독성은 자동으로 맞춰져요">
                    <div className={cn("custom-color-picker", data.customTone && "is-active") }>
                      <label className="color-input-label">
                        <input
                          type="color"
                          value={data.customTone || themes[data.theme].tone}
                          onChange={(event) => update("customTone", event.target.value.toLowerCase())}
                        />
                        <span>색상 직접 선택</span>
                      </label>
                      <div className="quick-colors" aria-label="추천 색상">
                        {CUSTOM_TONE_OPTIONS.map((color) => (
                          <button
                            type="button"
                            key={color}
                            className={data.customTone === color ? "is-active" : undefined}
                            aria-label={`${color} 색상`}
                            aria-pressed={data.customTone === color}
                            style={{ background: color }}
                            onClick={() => update("customTone", color)}
                          />
                        ))}
                      </div>
                      {data.customTone && (
                        <button type="button" className="color-reset" onClick={() => update("customTone", "")}>기본 테마로</button>
                      )}
                    </div>
                  </Field>

                  <Field label="카드 비율" hint="올릴 곳에 맞춰 골라보세요">
                    <div className="ratio-grid">
                      {(Object.keys(ratioLabels) as RatioKey[]).map((key) => (
                        <button
                          type="button"
                          key={key}
                          className={cn("ratio-choice", data.ratio === key && "is-active")}
                          aria-pressed={data.ratio === key}
                          onClick={() => update("ratio", key)}
                        >
                          <span className={cn("ratio-shape", key)} aria-hidden="true" />
                          <span>
                            <strong>{ratioLabels[key].name}</strong>
                            <small>{ratioLabels[key].note}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </Field>

                </div>
              )}
            </div>

            <div className="editor-footer">
              <span className="save-state" role="status">
                <i aria-hidden="true" /> {saveState}
              </span>
              <div className="step-actions">
                {step > 0 && (
                  <button type="button" className="secondary-button" onClick={() => setStep(step - 1)}>
                    이전
                  </button>
                )}
                {step < steps.length - 1 ? (
                  <button type="button" className="primary-button" onClick={() => setStep(step + 1)}>
                    다음 · {steps[step + 1].short}
                  </button>
                ) : (
                  <button type="button" className="primary-button" onClick={downloadCard} disabled={exporting}>
                    {exporting ? "종이를 접는 중…" : "PNG 저장"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside id="preview-mobile" className="preview-panel" style={cardStyle} aria-label="카드 미리보기와 저장">
            <div className="preview-heading">
              <div>
                <h2>내 결 카드</h2>
              </div>
              <span>{ratioLabels[data.ratio].note}</span>
            </div>
            <div className={cn("preview-stage", `stage-${data.ratio}`)}>
              <RenderedCardPreview data={data} />
            </div>
            <div className="preview-actions">
              <button className="download-button" type="button" onClick={downloadCard} disabled={exporting}>
                <span>{exporting ? "종이를 접는 중…" : "PNG 저장"}</span>
                <span aria-hidden="true">↓</span>
              </button>
              <button className="share-button" type="button" onClick={shareCard} disabled={exporting}>
                공유하기
              </button>
              <button className="copy-button" type="button" onClick={copyPost}>
                게시글 문구 복사
              </button>
            </div>
            <div className="preview-meta">
              <span>서버 업로드 없음</span>
              <button type="button" onClick={resetCard}>처음부터 다시 쓰기</button>
            </div>
          </aside>
        </section>

        <section className="closing-note" aria-label="사잇결 소개">
          <span>사잇결의 약속</span>
          <p>
            모두 채우지 않아도 괜찮아요. 나이와 성별처럼 꼭 필요하지 않은 질문은 처음부터 묻지 않았어요.
            보여주고 싶은 취향과 편안한 관계의 방식을, 당신의 말로만 남겨보세요.
          </p>
          <i aria-hidden="true">↗</i>
        </section>
      </main>

      <div className="mobile-action-bar">
        <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          이전
        </button>
        <a href="#preview-mobile">미리보기</a>
        {step < steps.length - 1 ? (
          <button type="button" onClick={() => setStep(step + 1)}>다음</button>
        ) : (
          <button type="button" onClick={downloadCard} disabled={exporting}>저장</button>
        )}
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
