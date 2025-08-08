import { execSync } from "child_process";
import fs from "fs";

const CHANGELOG_FILE = "CHANGELOG.md";

// Map commit types to changelog sections
const sections = {
  feat: "### Added",
  fix: "### Fixed",
  docs: "### Documentation",
  style: "### Style",
  refactor: "### Changed",
  perf: "### Performance",
  test: "### Tests",
  build: "### Build",
  ci: "### CI",
  chore: "### Chores",
  revert: "### Reverted",
};

function getLastTag() {
  try {
    return execSync("git describe --tags --abbrev=0").toString().trim();
  } catch {
    return null;
  }
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : "";
  const logCmd = range
    ? `git log ${range} --pretty=format:%s`
    : "git log --pretty=format:%s";
  const log = execSync(logCmd).toString();
  return log.split("\n").filter(Boolean);
}

function parseCommit(msg) {
  // Example: feat(scope): description
  const match = msg.match(/^(\w+)(\(.+\))?(!)?: (.+)$/);
  if (!match) return null;
  return {
    type: match[1],
    breaking: !!match[3],
    description: match[4],
  };
}

function determineVersionBump(commits) {
  if (commits.some((c) => c.breaking)) return "major";
  if (commits.some((c) => c.type === "feat")) return "minor";
  if (commits.some((c) => c.type === "fix")) return "patch";
  return null;
}

function bumpVersion(version, bump) {
  const [major, minor, patch] = version.split(".").map(Number);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  return version;
}

function formatChangelog(commits, version) {
  const grouped = {};
  for (const c of commits) {
    if (!sections[c.type]) continue;
    if (!grouped[c.type]) grouped[c.type] = [];
    grouped[c.type].push(c.description);
  }
  let changelog = `## [${version}] - ${
    new Date().toISOString().split("T")[0]
  }\n\n`;
  for (const [type, msgs] of Object.entries(grouped)) {
    changelog += `${sections[type]}\n`;
    for (const m of msgs) {
      changelog += `- ${m}\n`;
    }
    changelog += "\n";
  }
  return changelog;
}

function main() {
  const lastTag = getLastTag() || "0.0.0";
  const commitsRaw = getCommitsSince(lastTag);
  const commits = commitsRaw.map(parseCommit).filter(Boolean);
  if (commits.length === 0) {
    console.log("No new commits to add to changelog.");
    return;
  }
  const bump = determineVersionBump(commits);
  if (!bump) {
    console.log("No version bump detected.");
    return;
  }
  const newVersion = bumpVersion(lastTag, bump);
  const newChangelogSection = formatChangelog(commits, newVersion);
  const oldChangelog = fs.existsSync(CHANGELOG_FILE)
    ? fs.readFileSync(CHANGELOG_FILE, "utf-8")
    : "";
  fs.writeFileSync(CHANGELOG_FILE, `${newChangelogSection}\n${oldChangelog}`);
  console.log(`Changelog updated to version ${newVersion}`);
}

main();
