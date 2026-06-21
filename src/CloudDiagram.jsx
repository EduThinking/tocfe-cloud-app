import React from "react";

function wrap(text, w) {
  const maxChars = Math.floor(w / 8.2);
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1) + "…";
}

export default function CloudDiagram({ a, b, c, d, dPrime, highlight, bdAssumption, cdAssumption, resolved }) {
  const bdOn = highlight === "BD" || !!bdAssumption;
  const cdOn = highlight === "CD" || !!cdAssumption;
  const node = (key, x, y, w, h, label, value, color) => {
    const active = highlight === key;
    return (
      <g key={key} style={{ transition: "all 0.5s ease" }}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          rx={14}
          fill={value ? color : "var(--paper)"}
          stroke={color}
          strokeWidth={active ? 3 : 1.5}
          style={{
            filter: active ? "drop-shadow(0 0 10px rgba(194,84,63,0.35))" : "none",
            transition: "all 0.4s ease",
          }}
        />
        <text
          x={x + w / 2}
          y={y + 22}
          textAnchor="middle"
          className="cloud-label"
          fill={value ? "var(--paper)" : color}
        >
          {key}
        </text>
        <text
          x={x + w / 2}
          y={y + h / 2 + 6}
          textAnchor="middle"
          className="cloud-text"
          fill={value ? "var(--paper)" : "var(--ink-soft)"}
        >
          {wrap(value || label, w)}
        </text>
      </g>
    );
  };

  return (
    <svg viewBox="0 0 720 380" className="cloud-svg">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
          <path d="M0,0 L8,3 L0,6 Z" fill="var(--ink-faint)" />
        </marker>
      </defs>

      {/* connectors */}
      <path d="M 150 90 L 230 60" stroke="var(--ink-faint)" strokeWidth="2" markerEnd="url(#arrow)" fill="none" />
      <path d="M 150 130 L 230 165" stroke="var(--ink-faint)" strokeWidth="2" markerEnd="url(#arrow)" fill="none" />
      <path
        d="M 320 50 L 400 50"
        stroke={bdOn ? "var(--gold)" : "var(--ink-faint)"}
        strokeWidth={bdOn ? 3.5 : 2}
        markerEnd="url(#arrow)"
        fill="none"
        style={{ transition: "all 0.4s ease" }}
      />
      <path
        d="M 320 175 L 400 175"
        stroke={cdOn ? "var(--gold)" : "var(--ink-faint)"}
        strokeWidth={cdOn ? 3.5 : 2}
        markerEnd="url(#arrow)"
        fill="none"
        style={{ transition: "all 0.4s ease" }}
      />
      {bdOn && (
        <text x="360" y="40" textAnchor="middle" className="cloud-assumption-tag">
          전제?
        </text>
      )}
      {cdOn && (
        <text x="360" y="165" textAnchor="middle" className="cloud-assumption-tag">
          전제?
        </text>
      )}
      <path
        d="M 510 65 C 600 100, 600 130, 510 160"
        stroke={resolved ? "var(--sage)" : "var(--terracotta)"}
        strokeWidth="2.5"
        strokeDasharray={resolved ? "none" : "5 4"}
        fill="none"
        style={{ transition: "all 0.5s ease" }}
      />
      <text
        x="600"
        y="118"
        textAnchor="middle"
        className="cloud-vs"
        fill={resolved ? "var(--sage)" : "var(--terracotta)"}
      >
        {resolved ? "✓" : "↔"}
      </text>

      {node("A", 20, 80, 130, 60, "공동목표", a, "var(--navy)")}
      {node("B", 230, 20, 90, 60, "나의 욕구", b, "var(--sage)")}
      {node("C", 230, 145, 90, 60, "상대의 욕구", c, "var(--sage)")}
      {node("D", 400, 20, 110, 60, "나의 주장", d, "var(--terracotta)")}
      {node("D'", 400, 145, 110, 60, "상대의 주장", dPrime, "var(--terracotta)")}
    </svg>
  );
}
