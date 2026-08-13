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
  assert.match(html, /<title>사잇결/);
  assert.match(html, /취향의 결을 모아/);
  assert.match(html, /잘 맞을 사이/);
  assert.match(html, /트친소 카드/);
  assert.match(html, /사진과 입력 내용은 이 기기 안에서만 사용돼요/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/);
});

test("ships the finished editor without starter artifacts", async () => {
  const [page, layout, css, packageJson, pagesWorkflow, pagesEntry, pagesConfig] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../github-pages/main.tsx", import.meta.url), "utf8"),
    readFile(new URL("../vite.github-pages.config.ts", import.meta.url), "utf8"),
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
  assert.match(page, /function resolveCardPalette/);
  assert.match(page, /customTone/);
  assert.match(page, /KAKAOTALK/);
  assert.match(page, /다른 브라우저로 열기/);
  assert.match(page, /source\.split\(\/\\r\?\\n\/u\)/);
  assert.match(page, /function firstGrapheme/);
  assert.match(page, /async function loadCardFonts/);
  assert.match(page, /function getSocialNotes/);
  assert.match(page, /function RenderedCardPreview/);
  assert.match(page, /onPointerDown=\{startPhotoDrag\}/);
  assert.match(page, /drawPreferenceGroup\("선호 모드", preferredModes/);
  assert.match(page, /drawPreferenceGroup\("플레이 결", data\.playStyles/);
  assert.match(page, /교류 방식/);
  assert.match(page, /좋아하는 교류/);
  assert.match(page, /안 맞아요/);
  assert.match(page, /customMode/);
  assert.match(page, /mainCharacter/);
  assert.doesNotMatch(page, /나의 취향 결|미리 알려요|마음을 담은 한 문장/);
  assert.match(page, /drawRelation\(left, theme\.accent, theme\.accentSoft/);
  assert.match(page, /const isSparse = !hasBodyContent/);
  assert.match(page, /isSparse \? \(portrait \|\| square \? 78 : 92\)/);
  assert.match(page, /identity-name-row/);
  assert.match(page, /without-handle/);
  assert.match(page, /made with Y_SUN/);
  assert.match(page, /theme\.leafSoft/);
  assert.doesNotMatch(page, /ctx\.font\s*=\s*`[^`]*(Pretendard|Arial|Batang)/);
  assert.doesNotMatch(page, /className="section-number"/);
  assert.match(layout, /generateMetadata/);
  assert.match(layout, /@fontsource-variable\/noto-sans-kr/);
  assert.match(layout, /@fontsource-variable\/noto-serif-kr/);
  assert.match(layout, /\/og\.png/);
  assert.match(css, /--font-sans: "Noto Sans KR Variable"/);
  assert.match(css, /\.connection-activities/);
  assert.match(css, /\.connection-section/);
  assert.match(css, /--tape:/);
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

  await access(new URL("../public/og.png", import.meta.url));
  const retiredPreviewFiles = await readdir(
    new URL("../app/_sites-preview", import.meta.url),
  ).catch(() => []);
  assert.deepEqual(retiredPreviewFiles, []);
});
