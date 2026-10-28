const acorn = require("acorn");
const fs = require("fs");
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, "utf8");
  try { acorn.parse(src, { ecmaVersion: 2015, sourceType: "script" }); console.log("ES2015 OK:", f.split("/").slice(-2).join("/")); }
  catch (e) { console.log("NEWER SYNTAX in", f, e.message, JSON.stringify(src.slice(Math.max(0, e.pos - 60), e.pos + 40))); }
}
