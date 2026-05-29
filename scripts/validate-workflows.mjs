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
const orchestratorWorkflow = "action-downstream-suite.yml";
const liveAdoptionWorkflow = "live-adoption.yml";
const expectedWorkflowFiles = [
  ...Object.keys(expectedWorkflows),
  liveAdoptionWorkflow,
  orchestratorWorkflow,
].sort();

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
  "auth-and-discovery.yml": "26569760477",
  "classification-and-state.yml": "26569886321",
  "rendering.yml": "26570058172",
  "modes-and-labels.yml": "26570107581",
  "outputs-selection-config.yml": "26570170937",
  "network-ghe-security.yml": "26569780095",
  "bootstrap-cli-api-build.yml": "26570229629",
  "acceptance-loopguards.yml": "26570360909",
};

const artifactIds = {
  "001": "7263761820",
  "002": "7263764773",
  "003": "7263767785",
  "004": "7263770718",
  "005": "7263773974",
  "006": "7263778235",
  "007": "7263811850",
  "008": "7263814704",
  "009": "7263817428",
  "010": "7263821295",
  "011": "7263825314",
  "012": "7263829464",
  "013": "7263832976",
  "014": "7263884131",
  "015": "7263888281",
  "016": "7263891581",
  "017": "7263894903",
  "018": "7263898333",
  "019": "7263836272",
  "020": "7263839020",
  "021": "7263904873",
  "022": "7263909525",
  "023": "7263913232",
  "024": "7263917220",
  "025": "7263920726",
  "026": "7263924836",
  "027": "7263931180",
  "028": "7263934688",
  "029": "7263938491",
  "030": "7263941495",
  "031": "7263782655",
  "032": "7263785681",
  "033": "7263954370",
  "034": "7263957735",
  "035": "7263961919",
  "036": "7263969449",
  "037": "7263978162",
  "038": "7263991350",
  "039": "7264005940",
  "040": "7264012079",
  "041": "7263789201",
  "042": "7263793218",
  "043": "7263796332",
  "044": "7263996252",
  "045": "7263944827",
  "046": "7263948750",
  "047": "7263999491",
  "048": "7263799041",
};

const primaryArtifactFileOverrides = {
  "003": "expected-failure.log",
  "005": "control-contributors.md",
  "010": "control-contributors.md",
  "018": "control-contributors.md",
  "023": "control-contributors.md",
  "024": "control-contributors.md",
  "025": "control-contributors.md",
  "030": "control-contributors.md",
  "034": "expected-failure.log",
  "036": "schema-codegen.diff",
  "043": "control-contributors.md",
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
  JSON.stringify(workflowFiles) === JSON.stringify(expectedWorkflowFiles),
  `expected workflow set ${expectedWorkflowFiles.join(", ")}, found ${workflowFiles.join(", ")}`,
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
  assert(text.includes("suite_run_id:"), `${file} is missing workflow_dispatch suite_run_id input`);
  assert(text.includes("run-name:"), `${file} is missing run-name for downstream suite run discovery`);
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

const orchestrator = readFileSync(join(workflowDir, orchestratorWorkflow), "utf8");
for (const marker of [
  "repository_dispatch:",
  "contributors-please-action-updated",
  "workflow_dispatch:",
  "action_ref:",
  "library_ref:",
  "permissions:",
  "actions: write",
  "contents: read",
  "workflow run",
  "gh run watch",
  "suite_run_id",
]) {
  assert(orchestrator.includes(marker), `${orchestratorWorkflow} missing ${marker}`);
}
for (const file of Object.keys(expectedWorkflows)) {
  assert(orchestrator.includes(file), `${orchestratorWorkflow} does not dispatch ${file}`);
}
assert(
  orchestrator.includes(liveAdoptionWorkflow),
  `${orchestratorWorkflow} does not dispatch ${liveAdoptionWorkflow}`,
);

const liveAdoption = readFileSync(join(workflowDir, liveAdoptionWorkflow), "utf8");
for (const marker of [
  "CONTRIBUTORS_PLEASE_E2E_TOKEN",
  "CONTRIBUTORS_PLEASE_E2E_OWNER",
  "CONTRIBUTORS_PLEASE_E2E_REPO",
  "smorinlabs/contributors-please-action",
  "mode: commit",
  "mode: pull-request",
  "bootstrap: true",
  "unignore:",
  ".contributors.jsonl",
  "CONTRIBUTORS.md",
  "contributors-please/update",
  "gh pr view",
  "changed",
  "commit-sha",
  "pr-opened",
  "pr-number",
  "live-adoption-evidence",
  "include-hidden-files: true",
]) {
  assert(liveAdoption.includes(marker), `${liveAdoptionWorkflow} missing ${marker}`);
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
      `DASHBOARD.md missing artifact output path for ${cpId}`,
    );
    const primaryArtifactFile = primaryArtifactFileOverrides[id] ?? "contributors.md";
    assert(
      dashboard.includes(`test-output/${cpId}/${primaryArtifactFile}`),
      `DASHBOARD.md missing primary artifact file ${primaryArtifactFile} for ${cpId}`,
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
  `validated ${Object.keys(expectedWorkflows).length} grouped contributors-please-test workflows, 1 live adoption workflow, 1 orchestrator workflow, and ${plannedGhaIds.length} CP-GHA IDs`,
);
