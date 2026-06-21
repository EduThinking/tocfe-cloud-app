// src/exportCloud.js
//
// 구름 다이어그램을 외부 라이브러리 없이 내보내는 유틸.
// - PNG: 화면의 <svg>를 캔버스에 렌더 후 다운로드
// - PDF: window.print()로 브라우저의 "PDF로 저장" 사용 (App의 인쇄용 레이아웃 참고)
//
// SVG는 fill="var(--navy)" 같은 CSS 변수와 .cloud-label 등 클래스에 스타일을
// 의존하므로, 이미지로 떼어낼 때 변수/폰트를 직접 인라인해야 깨지지 않는다.

const CSS_VARS = [
  "paper",
  "paper-dim",
  "ink",
  "ink-soft",
  "ink-faint",
  "navy",
  "terracotta",
  "sage",
  "gold",
];

const TEXT_STYLE = `
  text { font-family: 'NanumSquare','Noto Sans KR',-apple-system,sans-serif; }
  .cloud-key { font-size: 18px; font-weight: 800; }
  .cloud-text { font-size: 16.5px; font-weight: 800; }
  .cloud-vs { font-size: 18px; font-weight: 700; }
  .cloud-assumption-tag { font-size: 11px; font-weight: 800; }
`;

export async function svgToPngDataUrl(svg, scale = 2) {
  const cs = getComputedStyle(document.documentElement);
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  // 폰트/크기 클래스 규칙을 SVG 안에 직접 심는다
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = TEXT_STYLE;
  clone.insertBefore(styleEl, clone.firstChild);

  let str = new XMLSerializer().serializeToString(clone);

  // var(--x) → 실제 색상값으로 치환
  for (const name of CSS_VARS) {
    const val = cs.getPropertyValue(`--${name}`).trim();
    if (val) str = str.split(`var(--${name})`).join(val);
  }

  const vb = svg.viewBox && svg.viewBox.baseVal;
  const w = (vb && vb.width) || 720;
  const h = (vb && vb.height) || 380;
  const bg = cs.getPropertyValue("--paper").trim() || "#ffffff";

  const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(str);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
