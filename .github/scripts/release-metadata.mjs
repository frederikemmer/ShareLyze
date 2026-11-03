import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const version = pkg.version;
if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error('package.json must contain a stable semantic version');
if (lock.version !== version || lock.packages?.['']?.version !== version) throw new Error('package-lock.json and package.json versions differ');
const escapedVersion = version.replaceAll('.', '\\.');
if (!new RegExp(`^## \\[(?:Unreleased|${escapedVersion})\\]`, 'm').test(changelog)) throw new Error('Changelog needs an Unreleased or matching version section');
const tag = process.env.RELEASE_TAG;
if (tag && tag !== `v${version}`) throw new Error(`Release tag must equal v${version}`);
if (tag && !new RegExp(`^## \\[${escapedVersion}\\]`, 'm').test(changelog)) throw new Error('Tagged releases need a matching versioned changelog section');
if (process.argv.includes('--notes')) {
  if (!tag) throw new Error('RELEASE_TAG is required for release notes');
  const match = changelog.match(new RegExp(`^## \\[${escapedVersion}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|$(?![\\s\\S]))`, 'm'));
  if (!match?.[1]?.trim()) throw new Error('Release notes cannot be empty');
  console.log(match[1].trim());
} else console.log(version);
