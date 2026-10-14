// Generates src/assets/marks/icons.css from src/components/marks/icons.ts:
// one mask URL per icon, for ::before/::after. Run from anywhere: node scripts/build-icon-css.mjs
import fs from "node:fs";
const C = new URL("../apps/client", import.meta.url).pathname;
const icon = fs.readFileSync(`${C}/src/components/marks/icons.ts`, "utf8");
const grab = (n) => Function(`return ${icon.match(new RegExp(`const ${n}[^=]*= (\\{[\\s\\S]*?\\n\\});`))[1]}`)();
const lines = grab("lines"),
  fills = grab("fills");
const enc = (s) => s.replace(/"/g, "'").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E");
let out = `/* GENERATED from src/components/marks/icons.ts by scripts/build-icon-css.mjs — do not hand-edit.
   For pseudo-elements, where <Icon> can't go. The glyph takes currentColor:
     .x::after { content: ""; inline-size: 1em; block-size: 1em; background: currentColor;
                 mask: var(--icon-arrow-right) center / contain no-repeat; }            */
:root {\n`;
for (const [n, d] of Object.entries(lines))
  out += `  --icon-${n}: url("data:image/svg+xml,${enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}" fill="none" stroke="#000" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/></svg>`)}");\n`;
for (const [n, d] of Object.entries(fills))
  out += `  --icon-${n}: url("data:image/svg+xml,${enc(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}"/></svg>`)}");\n`;
out += `}\n`;
fs.writeFileSync(`${C}/src/assets/marks/icons.css`, out);
console.log(out.length);
