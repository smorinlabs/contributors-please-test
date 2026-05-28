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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/__ready") {
    return json(res, { ready: true });
  }

  fs.appendFileSync(`${outDir}/api.log`, `${req.method} ${url.pathname}${url.search}\n`);

  if (url.pathname === "/user" || url.pathname.endsWith("/api/v3/user")) {
    return json(res, { login, id });
  }
  const user = url.pathname.match(/^\/users\/(.+)$/);
  if (user && req.method === "GET") {
    return json(res, { login: decodeURIComponent(user[1]), id });
  }
  if (url.pathname.endsWith("/installation") && req.method === "GET") {
    return json(res, { id, app_slug: login.replace(/\[bot\]$/, "") });
  }
  const appToken = url.pathname.match(/\/app\/installations\/(\d+)\/access_tokens$/);
  if (appToken && req.method === "POST") {
    return json(res, {
      token: `fake-installation-token-${appToken[1]}`,
      expires_at: "2099-01-01T00:00:00.000Z",
      permissions: { contents: "write", issues: "write", pull_requests: "write" },
      repository_selection: "selected",
    }, 201);
  }
  if (url.pathname.endsWith("/contributors")) {
    return json(res, readContributorsFixture());
  }
  const issueLabels = url.pathname.match(/\/issues\/(\d+)\/labels$/);
  if (issueLabels && req.method === "POST") {
    const body = JSON.parse(await readBody(req));
    const labels = readJson("issue-labels.json", []);
    labels.push({ issue: Number(issueLabels[1]), labels: body.labels ?? [] });
    writeJson("issue-labels.json", labels);
    return json(res, body, 201);
  }
  if (url.pathname.includes("/labels/")) {
    const label = findLabel(decodeURIComponent(url.pathname.split("/labels/")[1] ?? ""));
    return label ? json(res, label) : json(res, { message: "not found" }, 404);
  }
  if (url.pathname.endsWith("/labels") && req.method === "POST") {
    const label = JSON.parse(await readBody(req));
    const labels = readJson("labels.json", []);
    const existing = labels.findIndex(candidate => candidate.name === label.name);
    if (existing >= 0) {
      labels[existing] = label;
    } else {
      labels.push(label);
    }
    writeJson("labels.json", labels);
    return json(res, label, 201);
  }
  if (url.pathname.endsWith("/pulls")) {
    if (req.method === "GET") {
      const pull = readJson("pull-request.json", undefined);
      return json(res, pull ? [pull] : []);
    }
    if (req.method === "POST") {
      const body = JSON.parse(await readBody(req));
      const pull = {
        number: id,
        html_url: `https://example.com/pulls/${id}`,
        ...body,
      };
      writeJson("pull-request.json", pull);
      return json(res, pull, 201);
    }
  }
  const pullPatch = url.pathname.match(/\/pulls\/(\d+)$/);
  if (pullPatch && req.method === "PATCH") {
    const body = JSON.parse(await readBody(req));
    const current = readJson("pull-request.json", {
      number: Number(pullPatch[1]),
      html_url: `https://example.com/pulls/${pullPatch[1]}`,
    });
    const pull = { ...current, ...body };
    writeJson("pull-request.json", pull);
    return json(res, pull);
  }
  json(res, { error: "not found", path: url.pathname }, 404);
});

server.listen(port, "127.0.0.1");

function json(res, value, status = 200) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(value));
}

function readContributorsFixture() {
  const path = `${outDir}/api-contributors.json`;
  if (!fs.existsSync(path)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function findLabel(name) {
  return readJson("labels.json", []).find(label => label.name === name);
}

function readJson(file, fallback) {
  const path = `${outDir}/${file}`;
  if (!fs.existsSync(path)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(`${outDir}/${file}`, `${JSON.stringify(value, null, 2)}\n`);
}

function readBody(req) {
  return new Promise(resolve => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
  });
}
