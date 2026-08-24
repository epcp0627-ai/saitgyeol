import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the branded card maker", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const visibleHtml = html.split('<div hidden="">')[0];
  assert.match(html, /<title>사잇결<\/title>/);
  assert.match(html, /<meta name="description" content="트친소 카드 메이커"/);
  assert.match(visibleHtml, /트친소 시트 제작기/);
  assert.match(visibleHtml, /트친소 카드/);
  assert.doesNotMatch(visibleHtml, /취향의 결을 모아|잘 맞을 사이|사진과 입력 내용은 이 기기 안에서만 사용돼요/);
  assert.doesNotMatch(visibleHtml, /보여주고 싶은 취향과 편안한 관계의 방식을, 당신의 말로만 남겨보세요/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/);
});

test("ships the finished editor without starter artifacts", async () => {
  const [page, layout, css, packageJson, pagesWorkflow, pagesEntry, pagesConfig, analyticsRoute, schema, hosting] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../github-pages/main.tsx", import.meta.url), "utf8"),
    readFile(new URL("../vite.github-pages.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analytics/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /^"use client";/);
  assert.match(page, /async function renderCard/);
  assert.match(page, /window\.localStorage/);
  assert.match(page, /navigator\.share/);
  assert.match(page, /살구 종이/);
  assert.match(page, /밤편지/);
  assert.match(page, /MODE_OPTIONS = \["일반게임", "랭크게임", "코발트"\]/);
  assert.match(page, /PLAY_STYLE_OPTIONS = \["즐겜", "빡겜", "승리지향"\]/);
  assert.match(page, /TIME_OPTIONS = \["오전", "오후", "밤", "새벽", "주말", "랜덤"\]/);
  assert.match(page, /ACTIVITY_OPTIONS = \["게임", "마음", "멘션", "일상"\]/);
  assert.match(page, /function normalizeStoredData/);
  assert.match(page, /function getFavoriteRows/);
  assert.match(page, /function getPreferredModes/);
  assert.match(page, /function hasStructuredBody/);
  assert.match(page, /function resolveTheme/);
  assert.match(page, /function createCustomTheme/);
  assert.match(page, /function resolveCardPalette/);
  assert.match(page, /const backdrop = data\.customTone\.toLowerCase\(\)/);
  assert.match(page, /const tape = resolveTape\(theme\.backdrop, \[theme\.backdrop\]\)/);
  assert.match(page, /return resolveTheme\(createCustomTheme\(backdrop\)\)/);
  assert.match(page, /<Field label="카드 바깥 배경색" hint="고른 색에 맞춰 종이 색감도 함께 바뀌어요">/);
  assert.match(page, /value=\{data\.customTone \|\| themes\[data\.theme\]\.backdrop\}/);
  assert.match(page, /data\.theme === key && !data\.customTone && "is-active"/);
  assert.match(page, /theme: key, customTone: ""/);
  assert.match(page, /customTone/);
  assert.match(page, /KAKAOTALK/);
  assert.match(page, /다른 브라우저로 열기/);
  assert.match(page, /source\.split\(\/\\r\?\\n\/u\)/);
  assert.match(page, /function firstGrapheme/);
  assert.match(page, /async function loadCardFonts/);
  assert.match(page, /function getSocialNotes/);
  assert.match(page, /function RenderedCardPreview/);
  assert.match(page, /onPointerDown=\{startPhotoDrag\}/);
  assert.match(page, /label: "선호 모드", value: preferredModes\.join\(" · "\), row: 1, column: 0, span: 2/);
  assert.match(page, /label: "플레이 성향", value: data\.playStyles\.join\(" · "\), row: 1, column: 2, span: 1/);
  assert.match(page, /availableInfoWidth \* 0\.66/);
  assert.match(page, /detailColumnWidth \* detail\.span - 12 \* unit/);
  assert.match(page, /relationY \+ \(portrait \? 70 : 60\) \* unit/);
  assert.doesNotMatch(page, /drawPreferenceGroup|tag-block/);
  assert.match(page, /preferenceBottomY \+ 18 \* unit/);
  assert.match(page, /connectionDetailY = connectionDividerY \+ 58 \* unit/);
  assert.match(page, /교류 방식/);
  assert.match(page, /좋아하는 교류/);
  assert.match(page, /안 맞아요/);
  assert.match(page, /customMode/);
  assert.match(page, /mainCharacter/);
  assert.doesNotMatch(page, /<h3>나의 취향<\/h3>|sectionTitle\(left, nextY, "나의 취향"\)/);
  assert.doesNotMatch(page, /<h3>좋아하는 것<\/h3>|sectionTitle\(favoriteX, favoriteTitleY, "좋아하는 것"\)/);
  assert.match(page, /<Field label="한마디"/);
  assert.match(page, /\{ area: "rank", label: "랭크", value: data\.rank\.trim\(\) \}/);
  assert.match(page, /label: "랭크", value: data\.rank\.trim\(\), row: 0, column: 0, span: 1/);
  assert.match(page, /<Field label="랭크 · 티어 · 레벨"/);
  assert.doesNotMatch(page, /나의 취향 결|미리 알려요|마음을 담은 한 문장/);
  assert.doesNotMatch(page, /label: "등급"|\["등급"/);
  assert.match(page, /drawRelation\(left, theme\.accent, theme\.accentSoft/);
  assert.match(page, /const isSparse = !hasBodyContent/);
  assert.match(page, /isSparse \? \(portrait \|\| square \? 78 : 92\)/);
  assert.match(page, /identity-name-row/);
  assert.match(page, /without-handle/);
  assert.doesNotMatch(page, /made with Y_SUN|취향 기록|나의 한 장|formatCardDate/);
  assert.doesNotMatch(page, /게시글 문구 복사|서버 업로드 없음/);
  assert.match(page, /<h1 id="main-title">트친소 시트 제작기<\/h1>/);
  assert.match(page, /const defaultData[\s\S]*?phrase: "",[\s\S]*?intro: "",[\s\S]*?memo: "",/);
  assert.match(page, /function trackAnalytics/);
  assert.match(page, /trackAnalytics\("page_view"\)/);
  assert.match(page, /trackAnalytics\("card_complete"\)/);
  assert.match(page, /trackAnalytics\("png_download"\)/);
  assert.match(page, /trackAnalytics\("share"\)/);
  assert.match(page, /trackAnalytics\("copy_text"\)/);
  assert.match(page, /function AnalyticsDashboard/);
  assert.match(page, /익명 이용 현황 보기/);
  assert.match(page, /theme\.leafSoft/);
  assert.doesNotMatch(page, /ctx\.font\s*=\s*`[^`]*(Pretendard|Arial|Batang)/);
  assert.doesNotMatch(page, /className="section-number"/);
  assert.match(layout, /generateMetadata/);
  assert.match(layout, /@fontsource-variable\/noto-sans-kr/);
  assert.match(layout, /@fontsource-variable\/noto-serif-kr/);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /title: "사잇결"/);
  assert.match(layout, /description: "트친소 카드 메이커"/);
  assert.doesNotMatch(layout, /취향의 결을 모아|잘 맞을 사이를 그려요/);
  assert.match(css, /--font-sans: "Noto Sans KR Variable"/);
  assert.match(css, /\.connection-detail[\s\S]*border-left: 0\.28cqw solid var\(--accent\)/);
  assert.match(css, /\.connection-detail > span[\s\S]*font-family: var\(--font-serif\)[\s\S]*font-size: 1\.15em/);
  assert.match(css, /\.relationship-label[\s\S]*font-size: 1\.15em/);
  assert.match(css, /\.relationship-grid p[\s\S]*font-size: 0\.92em;[\s\S]*font-weight: 700/);
  assert.match(css, /\.card-information[\s\S]*grid-template-columns: minmax\(0, 2fr\) minmax\(0, 1fr\)/);
  assert.match(css, /grid-template-areas:[\s\S]*"mode mode style"/);
  assert.match(css, /\.relationship-grid p[\s\S]*margin: 0\.92em 0 0/);
  assert.match(css, /\.connection-section/);
  assert.match(css, /--tape:/);
  assert.match(css, /\.paper-tape[\s\S]*background: var\(--tape\)/);
  assert.doesNotMatch(css, /\.preference-group|\.tag-block/);
  assert.match(css, /\.friend-card\.is-sparse/);
  assert.match(css, /\.identity-name-row/);
  assert.match(css, /\.custom-color-picker/);
  assert.match(css, /\.kakao-browser-notice/);
  assert.match(css, /white-space: pre-line/);
  assert.match(css, /box-shadow: inset 0\.32cqw 0 0 var\(--accent\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(packageJson, /"name": "saitgyeol-friend-card-maker"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page + layout, /codex-preview|_sites-preview|SkeletonPreview/);
  assert.match(packageJson, /"build:pages"/);
  assert.match(pagesWorkflow, /actions\/deploy-pages@v4/);
  assert.match(pagesWorkflow, /pnpm run build:pages/);
  assert.match(pagesEntry, /import Home from "\.\.\/app\/page"/);
  assert.match(pagesConfig, /base: "\/saitgyeol\/"/);
  assert.match(analyticsRoute, /INSERT INTO analytics_daily/);
  assert.match(analyticsRoute, /INSERT OR IGNORE INTO analytics_visitors/);
  assert.match(analyticsRoute, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(schema, /analyticsDaily/);
  assert.match(schema, /analyticsVisitors/);
  assert.equal(JSON.parse(hosting).d1, "DB");

  await access(new URL("../public/og.png", import.meta.url));
  const retiredPreviewFiles = await readdir(
    new URL("../app/_sites-preview", import.meta.url),
  ).catch(() => []);
  assert.deepEqual(retiredPreviewFiles, []);
});

