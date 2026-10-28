// Har app ka JavaScript aik file mein, purane Android (Chrome/WebView 49+) ke syntax mein
import esbuild from "esbuild"; // npm install esbuild
const [kind, entry, out, shim] = process.argv.slice(2);
if (kind === "js") {
  await esbuild.build({
    entryPoints: [entry], bundle: true, format: "iife", target: ["chrome51"], minify: true, outfile: out, legalComments: "none", logLevel: "warning",
    define: { globalThis: "window", __KMX_VERSION__: JSON.stringify(process.env.KMX_VERSION || "dev") },
    plugins: [{ name: "cfg", setup(b) { b.onResolve({ filter: /^\.\/config\.js$/ }, () => ({ path: shim })); } }],
  });
} else if (kind === "css") {
  await esbuild.build({ entryPoints: [entry], outfile: out, minify: true, target: ["chrome51"], logLevel: "warning" });
} else if (kind === "config") {
  const m = await import(entry);
  const fs = await import("node:fs");
  const body = `// ====== KOT MOMIN EXPRESS SETTINGS ======
// Firebase lagane ke baad sirf "firebaseConfig" ki 4 values badlein (README dekhein).
// Baqi settings (fee, area, auqaat, PIN) Admin > Settings se badalti hain.
window.KMX_CONFIG = ${JSON.stringify({ firebaseConfig: m.firebaseConfig, DEFAULTS: m.DEFAULTS }, null, 2)};
`;
  fs.writeFileSync(out, body);
}
