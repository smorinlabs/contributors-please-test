#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const testRepo = resolve(scriptDir, "..");
const workspace = resolve(testRepo, "..");

const workflowDir = join(testRepo, ".github", "workflows");
const testPlan = readFileSync(join(workspace, "contributors-please_TEST.md"), "utf8");
const prd = readFileSync(join(workspace, "contributors-please_PRD.md"), "utf8");
const actionYml = readFileSync(join(workspace, "contributors-please-action", "action.yml"), "utf8");
const dashboard = readFileSync(join(testRepo, "DASHBOARD.md"), "utf8");
const coreCi = readFileSync(
  join(workspace, "contributors-please", ".github", "workflows", "ci.yml"),
  "utf8",
);

const expectedWorkflows = {
  "auth-and-discovery.yml": ["001", "002", "003", "004", "005", "006"],
  "classification-and-state.yml": [
    "007",
    "008",
    "009",
    "010",
    "011",
    "012",
    "013",
    "019",
    "020",
  ],
  "rendering.yml": ["014", "015", "016", "017", "018"],
  "modes-and-labels.yml": ["021", "022", "023", "024", "025", "026"],
  "outputs-selection-config.yml": ["027", "028", "029", "030", "045", "046"],
  "network-ghe-security.yml": ["031", "032", "041", "042", "043", "048"],
  "bootstrap-cli-api-build.yml": [
    "033",
    "034",
    "035",
    "036",
    "037",
    "038",
    "044",
    "047",
  ],
  "acceptance-loopguards.yml": ["039", "040"],
};

const coreJobs = [
  "schema",
  "classifier",
  "state",
  "rendering",
  "discovery-identity",
  "selection",
  "engine-idempotency",
  "cli",
  "github-client",
  "public-api",
  "package-dist",
  "run-result-contract",
];

const expectedFailureIds = new Set([
  "003",
  "005",
  "010",
  "018",
  "023",
  "030",
  "034",
  "042",
  "043",
]);

const verifiedRuns = {
  "auth-and-discovery.yml": "26567206204",
  "classification-and-state.yml": "26565949591",
  "rendering.yml": "26568635624",
  "modes-and-labels.yml": "26566585329",
  "outputs-selection-config.yml": "26568634901",
  "network-ghe-security.yml": "26568360731",
  "bootstrap-cli-api-build.yml": "26567834746",
  "acceptance-loopguards.yml": "26568556124",
};

const artifactIds = {
  "001": "7262690921",
  "002": "7262694893",
  "003": "7262698643",
  "004": "7262702308",
  "005": "7262706141",
  "006": "7262710118",
  "007": "7262159571",
  "008": "7262164699",
  "009": "7262169781",
  "010": "7262174334",
  "011": "7262178571",
  "012": "7262182819",
  "013": "7262186671",
  "014": "7263313605",
  "015": "7263317487",
  "016": "7263321502",
  "017": "7263325562",
  "018": "7263329450",
  "019": "7262191355",
  "020": "7262194701",
  "021": "7262428677",
  "022": "7262432216",
  "023": "7262435689",
  "024": "7262440541",
  "025": "7262445647",
  "026": "7262450944",
  "027": "7263288686",
  "028": "7263291796",
  "029": "7263295209",
  "030": "7263299072",
  "031": "7263174239",
  "032": "7263177847",
  "033": "7262956350",
  "034": "7262960151",
  "035": "7262964497",
  "036": "7262971221",
  "037": "7262983003",
  "038": "7262995310",
  "039": "7263257452",
  "040": "7263262774",
  "041": "7263181324",
  "042": "7263184334",
  "043": "7263188455",
  "044": "7263000802",
  "045": "7263303842",
  "046": "7263308911",
  "047": "7263004402",
  "048": "7263191884",
};

const errors = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function uniq(values) {
  return [...new Set(values)];
}

function itemChecked(prefix, id) {
  return testPlan.includes(`- [x] **${prefix}-${id}**`);
}

function sectionBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert(start !== -1, `missing section ${startMarker}`);
  if (start === -1) {
    return "";
  }
  const end = endMarker ? text.indexOf(endMarker, start + startMarker.length) : -1;
  return text.slice(start, end === -1 ? undefined : end);
}

const workflowFiles = readdirSync(workflowDir).filter(file => file.endsWith(".yml")).sort();
assert(
  JSON.stringify(workflowFiles) === JSON.stringify(Object.keys(expectedWorkflows).sort()),
  `expected workflow set ${Object.keys(expectedWorkflows).sort().join(", ")}, found ${workflowFiles.join(", ")}`,
);

const plannedGhaIds = [
  ...testPlan.matchAll(/^- \[[ x]\] \*\*CP-GHA-(\d{3})\*\*/gm),
].map(match => match[1]);
const expectedIds = Array.from({ length: 48 }, (_, index) =>
  String(index + 1).padStart(3, "0"),
);
assert(
  JSON.stringify(plannedGhaIds) === JSON.stringify(expectedIds),
  `contributors-please_TEST.md CP-GHA IDs are not exactly 001..048: ${plannedGhaIds.join(", ")}`,
);

for (const [file, ids] of Object.entries(expectedWorkflows)) {
  const text = readFileSync(join(workflowDir, file), "utf8");
  assert(
    text.includes("group: contributors-please-test-${{ github.ref }}"),
    `${file} does not use the shared contributors-please-test concurrency group`,
  );
  assert(text.includes("action_ref:"), `${file} is missing workflow_dispatch action_ref input`);
  const artifactUploads = [...text.matchAll(/uses: actions\/upload-artifact@v4/g)].length;
  const hiddenArtifactUploads = [...text.matchAll(/include-hidden-files: true/g)].length;
  assert(
    artifactUploads === hiddenArtifactUploads,
    `${file} must set include-hidden-files: true on every artifact upload so .contributors* evidence is published`,
  );
  for (const id of ids) {
    const cpId = `CP-GHA-${id}`;
    const jobId = `cp-gha-${id}`;
    assert(text.includes(`- ${cpId}`), `${file} missing workflow_dispatch option ${cpId}`);
    assert(text.includes(`${jobId}:`), `${file} missing job ${jobId}`);
    assert(text.includes(`test_id == '${cpId}'`) || file === "acceptance-loopguards.yml", `${file} missing test_id gate for ${cpId}`);
    assert(text.includes(`test-output/${cpId}`), `${file} missing test-output path for ${cpId}`);
    assert(text.includes(`name: ${jobId}`), `${file} missing artifact named ${jobId}`);
  }
}

for (const id of expectedFailureIds) {
  const file = Object.entries(expectedWorkflows).find(([, ids]) => ids.includes(id))?.[0];
  const text = readFileSync(join(workflowDir, file), "utf8");
  assert(text.includes("EXPECTED FAILURE"), `${file} missing expected-failure marker for CP-GHA-${id}`);
}

const rendering = readFileSync(join(workflowDir, "rendering.yml"), "utf8");
for (const id of ["014", "015", "016", "017", "018"]) {
  assert(rendering.includes(`cp-gha-${id}:`), `rendering.yml missing separate job cp-gha-${id}`);
}
for (const marker of [
  "missing_file",
  "missing_marker",
  "duplicate_marker",
  "inverted_marker",
  "mutual_exclusion",
]) {
  assert(rendering.includes(marker), `rendering.yml CP-GHA-018 missing ${marker}`);
}

for (const job of coreJobs) {
  assert(coreCi.includes(`  ${job}:`), `contributors-please CI missing job ${job}`);
}
assert(
  !coreCi.includes("contributors-please-action"),
  "contributors-please core CI should not depend on contributors-please-action",
);

for (const id of Array.from({ length: 16 }, (_, index) =>
  String(index + 1).padStart(3, "0"),
)) {
  assert(itemChecked("CP-LIB", id), `contributors-please_TEST.md CP-LIB-${id} is not checked`);
  assert(
    itemChecked("CP-LIB", `${id}-DC`),
    `contributors-please_TEST.md CP-LIB-${id}-DC is not checked`,
  );
}

for (const id of Array.from({ length: 25 }, (_, index) =>
  String(index + 1).padStart(3, "0"),
)) {
  assert(itemChecked("CP-COV", id), `contributors-please_TEST.md CP-COV-${id} is not checked`);
}

for (const id of Array.from({ length: 30 }, (_, index) =>
  String(index + 1).padStart(3, "0"),
)) {
  assert(itemChecked("CP-INP", id), `contributors-please_TEST.md CP-INP-${id} is not checked`);
}

for (const id of Array.from({ length: 8 }, (_, index) =>
  String(index + 1).padStart(3, "0"),
)) {
  assert(itemChecked("CP-PUB", id), `contributors-please_TEST.md CP-PUB-${id} is not checked`);
}

const plannedFeatureText = sectionBetween(
  testPlan,
  "## Group 1 - `contributors-please` Repo Test Series",
  "## FR Coverage Double-Check",
);
const prdFrs = uniq(prd.match(/FR-\d+\.\d+/g) ?? []).sort();
const plannedFrs = new Set(plannedFeatureText.match(/FR-\d+\.\d+/g) ?? []);
for (const fr of prdFrs) {
  assert(plannedFrs.has(fr), `${fr} appears in PRD but not in a CP-LIB/CP-GHA test item`);
}

const enhancementEvidence = sectionBetween(
  testPlan,
  "## Enhancement Coverage Evidence",
  "## Harness Conventions",
);
const prdEnhancements = uniq([...prd.matchAll(/\| (E\d+) \|/g)].map(match => match[1])).sort();
for (const enhancement of prdEnhancements) {
  const row = enhancementEvidence
    .split("\n")
    .find(line => line.startsWith(`| \`${enhancement}\` |`));
  assert(Boolean(row), `${enhancement} is missing from Enhancement Coverage Evidence`);
  assert(
    Boolean(row?.includes("CP-LIB-") && row.includes("CP-GHA-")),
    `${enhancement} must name both CP-LIB and CP-GHA coverage`,
  );
}

const inputsBlock = actionYml.match(/^inputs:\n([\s\S]*?)^outputs:/m)?.[1] ?? "";
const actionInputs = [...inputsBlock.matchAll(/^  ([a-z0-9-]+):/gm)].map(
  match => match[1],
);
assert(actionInputs.length > 0, "contributors-please-action/action.yml inputs were not parsed");
const inputAudit = sectionBetween(
  testPlan,
  "## Action Input Coverage Audit",
  "## Publication Double-Check",
);
for (const input of actionInputs) {
  assert(inputAudit.includes(`\`${input}\``), `action input ${input} is missing from CP-INP audit`);
}

for (const [file, ids] of Object.entries(expectedWorkflows)) {
  for (const id of ids) {
    const cpId = `CP-GHA-${id}`;
    assert(dashboard.includes(`| \`${cpId}\` |`), `DASHBOARD.md missing ${cpId}`);
    assert(
      dashboard.includes(`/actions/runs/${verifiedRuns[file]}`),
      `DASHBOARD.md missing run link for ${cpId}`,
    );
    assert(
      dashboard.includes(`/actions/artifacts/${artifactIds[id]}/zip`),
      `DASHBOARD.md missing artifact archive link for ${cpId}`,
    );
    assert(
      dashboard.includes(`test-output/${cpId}/`),
      `DASHBOARD.md missing generated output path for ${cpId}`,
    );
  }
}

if (errors.length) {
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `validated ${workflowFiles.length} contributors-please-test workflows and ${plannedGhaIds.length} CP-GHA IDs`,
);
