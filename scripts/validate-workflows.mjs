#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const testRepo = resolve(scriptDir, "..");
const workspace = resolve(testRepo, "..");

const workflowDir = join(testRepo, ".github", "workflows");
const testPlan = readFileSync(join(workspace, "contributors-please_TEST.md"), "utf8");
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

const errors = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

const workflowFiles = readdirSync(workflowDir).filter(file => file.endsWith(".yml")).sort();
assert(
  JSON.stringify(workflowFiles) === JSON.stringify(Object.keys(expectedWorkflows).sort()),
  `expected workflow set ${Object.keys(expectedWorkflows).sort().join(", ")}, found ${workflowFiles.join(", ")}`,
);

const plannedGhaIds = [
  ...testPlan.matchAll(/^- \[ \] \*\*CP-GHA-(\d{3})\*\*/gm),
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

if (errors.length) {
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `validated ${workflowFiles.length} contributors-please-test workflows and ${plannedGhaIds.length} CP-GHA IDs`,
);
