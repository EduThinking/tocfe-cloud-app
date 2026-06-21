import React from "react";

// 글자별 시각 폭: 한글/CJK ≈ 1, 라틴/숫자/괄호/공백 ≈ 0.55
function charWidth(ch) {
  return /[ᄀ-ᇿ　-鿿가-힯豈-﫿]/.test(ch) ? 1 : 0.55;
}

// 긴 텍스트를 상자 폭(가중치 합)에 맞춰 여러 줄로 나눈다. '\n'은 강제 줄바꿈.
function splitLines(text, budget, maxLines) {
  if (!text) return [];
  const out = [];
  let cur = "";
  let w = 0;
  for (const ch of String(text)) {
    if (ch === "\n") {
      out.push(cur);
      cur = "";
      w = 0;
      continue;
    }
    const cw = charWidth(ch);
    if (w + cw > budget && cur) {
      out.push(cur);
      cur = "";
      w = 0;
    }
    cur += ch;
    w += cw;
  }
  if (cur) out.push(cur);
  if (out.length > maxLines) {
    const t = out.slice(0, maxLines);
    const last = t[maxLines - 1];
    t[maxLines - 1] = last.slice(0, Math.max(0, last.length - 1)) + "…";
    return t;
  }
  return out;
}

const W = 190;
const H = 124;
const MAX_UNITS = 10.5;

export default function CloudDiagram({ a, b, c, d, dPrime, highlight, bdAssumption, cdAssumption, resolved }) {
  const bdOn = highlight === "BD" || !!bdAssumption;
  const cdOn = highlight === "CD" || !!cdAssumption;

  const node = (key, x, y, label, value, color) => {
    const active = highlight === key;
    const filled = !!value;
    const lines = splitLines(value || label, MAX_UNITS, filled ? 4 : 2);
    const centerY = y + H / 2 + 10;
    const lineH = 22;
    const startY = centerY - ((lines.length - 1) * lineH) / 2;
    return (
      <g key={key} style={{ transition: "all 0.5s ease" }}>
        <rect
          x={x}
          y={y}
          width={W}
          height={H}
          rx={16}
          fill={filled ? color : "var(--paper)"}
          stroke={color}
          strokeWidth={active ? 3.5 : 2}
          style={{
            filter: active ? "drop-shadow(0 0 12px rgba(194,84,63,0.4))" : "none",
            transition: "all 0.4s ease",
          }}
        />
        <text x={x + 18} y={y + 30} className="cloud-key" fill={filled ? "var(--paper)" : color}>
          {key}
        </text>
        {lines.map((ln, i) => (
          <text
            key={i}
            x={x + W / 2}
            y={startY + i * lineH}
            textAnchor="middle"
            className="cloud-text"
            fill={filled ? "var(--paper)" : "var(--ink-soft)"}
          >
            {ln}
          </text>
        ))}
      </g>
    );
  };

  // 위치: A(좌 중앙) — B/C(중앙 상·하) — D/D'(우 상·하)
  const A = { x: 18, y: 170 };
  const B = { x: 300, y: 30 };
  const C = { x: 300, y: 310 };
  const D = { x: 577, y: 30 };
  const Dp = { x: 577, y: 310 };
  const midY = (h) => h + H / 2;

  return (
    <svg viewBox="0 0 780 460" className="cloud-svg">
      <defs>
        <marker id="arrow" markerWidth="12" markerHeight="12" refX="9" refY="3.5" orient="auto-start-reverse">
          <path d="M0,0 L9,3.5 L0,7 Z" fill="var(--ink-soft)" />
        </marker>
        <marker id="arrowC" markerWidth="12" markerHeight="12" refX="9" refY="3.5" orient="auto-start-reverse">
          <path d="M0,0 L9,3.5 L0,7 Z" fill="var(--terracotta)" />
        </marker>
        <marker id="arrowG" markerWidth="12" markerHeight="12" refX="9" refY="3.5" orient="auto-start-reverse">
          <path d="M0,0 L9,3.5 L0,7 Z" fill="var(--sage)" />
        </marker>
      </defs>

      {/* 필요성 화살표: 모두 공통목표(A)를 향한다 (D→B→A, D'→C→A) */}
      {/* D → B */}
      <path
        d={`M ${D.x - 6} ${midY(B.y)} L ${B.x + W + 4} ${midY(B.y)}`}
        stroke={bdOn ? "var(--gold)" : "var(--ink-faint)"}
        strokeWidth={bdOn ? 3.5 : 2}
        markerEnd="url(#arrow)"
        fill="none"
        style={{ transition: "all 0.4s ease" }}
      />
      {/* D' → C */}
      <path
        d={`M ${Dp.x - 6} ${midY(C.y)} L ${C.x + W + 4} ${midY(C.y)}`}
        stroke={cdOn ? "var(--gold)" : "var(--ink-faint)"}
        strokeWidth={cdOn ? 3.5 : 2}
        markerEnd="url(#arrow)"
        fill="none"
        style={{ transition: "all 0.4s ease" }}
      />
      {/* B → A */}
      <path
        d={`M ${B.x - 4} ${B.y + H - 22} L ${A.x + W + 2} ${A.y + 34}`}
        stroke="var(--ink-faint)"
        strokeWidth="2"
        markerEnd="url(#arrow)"
        fill="none"
      />
      {/* C → A */}
      <path
        d={`M ${C.x - 4} ${C.y + 22} L ${A.x + W + 2} ${A.y + H - 34}`}
        stroke="var(--ink-faint)"
        strokeWidth="2"
        markerEnd="url(#arrow)"
        fill="none"
      />

      {/* 갈등: D ↔ D' (양방향) */}
      <path
        d={`M ${D.x + W / 2} ${D.y + H + 8} L ${Dp.x + W / 2} ${Dp.y - 8}`}
        stroke={resolved ? "var(--sage)" : "var(--terracotta)"}
        strokeWidth="2.5"
        strokeDasharray={resolved ? "none" : "6 4"}
        markerStart={`url(#${resolved ? "arrowG" : "arrowC"})`}
        markerEnd={`url(#${resolved ? "arrowG" : "arrowC"})`}
        fill="none"
        style={{ transition: "all 0.5s ease" }}
      />
      <text
        x={D.x + W / 2 + 24}
        y={(D.y + H + Dp.y) / 2 + 6}
        textAnchor="middle"
        className="cloud-vs"
        fill={resolved ? "var(--sage)" : "var(--terracotta)"}
      >
        {resolved ? "✓" : "⚡"}
      </text>

      {/* 가정(전제) 태그 */}
      {bdOn && (
        <text x={(D.x + B.x + W) / 2} y={midY(B.y) - 12} textAnchor="middle" className="cloud-assumption-tag">
          전제?
        </text>
      )}
      {cdOn && (
        <text x={(Dp.x + C.x + W) / 2} y={midY(C.y) - 12} textAnchor="middle" className="cloud-assumption-tag">
          전제?
        </text>
      )}

      {node("A", A.x, A.y, "공통목표\n(Common Objective)", a, "var(--navy)")}
      {node("B", B.x, B.y, "필요(Need)", b, "var(--sage)")}
      {node("C", C.x, C.y, "필요(Need)", c, "var(--sage)")}
      {node("D", D.x, D.y, "주장(Want)", d, "var(--terracotta)")}
      {node("D'", Dp.x, Dp.y, "주장(Want)", dPrime, "var(--terracotta)")}
    </svg>
  );
}
