import fs from "node:fs";
import http from "node:http";

const [portArg, outDir, login = "contributors-please-bot", idArg = "10001"] =
  process.argv.slice(2);

if (!portArg || !outDir) {
  console.error("usage: fake-github-api.mjs <port> <out-dir> [login] [id]");
  process.exit(2);
}

const port = Number(portArg);
const id = Number(idArg);

if (!Number.isInteger(port) || !Number.isInteger(id)) {
  console.error("port and id must be integers");
  process.exit(2);
}

fs.mkdirSync(outDir, { recursive: true });

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/__ready") {
    return json(res, { ready: true });
  }

  fs.appendFileSync(`${outDir}/api.log`, `${req.method} ${url.pathname}${url.search}\n`);

  if (url.pathname === "/user") {
    return json(res, { login, id });
  }
  if (url.pathname.endsWith("/contributors")) {
    return json(res, []);
  }

  json(res, { error: "not found", path: url.pathname }, 404);
});

server.listen(port, "127.0.0.1");

function json(res, value, status = 200) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(value));
}
