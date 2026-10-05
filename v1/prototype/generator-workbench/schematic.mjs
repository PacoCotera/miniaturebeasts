// A diagnostic construction grammar, not final game art. It consumes expression only.
export function drawDiagnosticCreature(phenotype) {
  const supportedValues = {
    crown: ["soft crown frill present", "no crown frill"],
    "eye-rings": ["pale eye rings present", "plain amber eyes"],
    "body-markings": ["pale body markings present", "no pale body markings"],
    "base.coat": ["charcoal body"], "base.ventrum": ["cream underside"], "base.eyes": ["amber eyes"],
  };
  if (phenotype?.status !== "resolved" || phenotype.contentVersion !== "pip-proof-v1") {
    throw new Error("Diagnostic construction requires the pinned resolved Pip phenotype.");
  }
  for (const [id, allowed] of Object.entries(supportedValues)) {
    if (!allowed.includes(phenotype.fields?.[id]?.value)) throw new Error(`Unsupported or missing diagnostic trait: ${id}`);
  }
  const value = (id) => phenotype.fields[id]?.value;
  const crown = value("crown") === "soft crown frill present";
  const rings = value("eye-rings") === "pale eye rings present";
  const markings = value("body-markings") === "pale body markings present";
  const legs = [140, 215, 290].flatMap((x) => [-1, 1].map((side) =>
    `<path d="M ${x} ${side < 0 ? 240 : 280} Q ${x + side * 23} ${side < 0 ? 325 : 345} ${x + side * 17} ${side < 0 ? 342 : 366}" fill="none" stroke="#56626a" stroke-width="16" stroke-linecap="round"/><path d="M ${x + side * 17} ${side < 0 ? 342 : 366} l 12 4" stroke="#eeddbc" stroke-width="5" stroke-linecap="round"/>`));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 410" role="img" aria-label="Generated diagnostic Pip schematic: six legs, ${crown ? "crown" : "no crown"}, ${rings ? "eye rings" : "plain eyes"}, ${markings ? "pale markings" : "plain coat"}">
    <ellipse cx="218" cy="356" rx="143" ry="16" fill="#0b171b" opacity=".35"/>
    ${legs.join("")}
    <ellipse cx="234" cy="232" rx="131" ry="91" fill="#3c4650" stroke="#a5b7ad" stroke-width="3"/>
    <ellipse cx="245" cy="277" rx="79" ry="34" fill="#eeddbc"/>
    ${markings ? [175, 230, 287, 320].map((x, i) => `<path d="M ${x} ${175 + (i % 2) * 27} q -18 12 0 25" fill="none" stroke="#eeddbc" stroke-width="10" stroke-linecap="round"/>`).join("") : ""}
    ${crown ? `<path d="M 104 139 Q 60 80 94 62 Q 115 60 131 98 Q 126 38 158 43 Q 183 48 173 110 Q 201 58 224 83 Q 242 105 199 151" fill="#a6c286" stroke="#d4e5b2" stroke-width="3"/>` : ""}
    <ellipse cx="138" cy="195" rx="83" ry="78" fill="#3c4650" stroke="#a5b7ad" stroke-width="3"/>
    <ellipse cx="134" cy="237" rx="38" ry="20" fill="#eeddbc"/>
    ${[102, 166].map((x) => `${rings ? `<ellipse cx="${x}" cy="187" rx="27" ry="30" fill="#eeddbc"/>` : ""}<ellipse cx="${x}" cy="187" rx="18" ry="22" fill="#dca249"/><ellipse cx="${x + 2}" cy="188" rx="9" ry="14" fill="#152127"/><circle cx="${x - 4}" cy="180" r="5" fill="#fff4d8"/>`).join("")}
    <path d="M 119 222 Q 135 235 151 222" fill="none" stroke="#152127" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}
