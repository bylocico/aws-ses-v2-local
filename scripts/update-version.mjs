import { readFile, writeFile } from 'node:fs/promises'

const NPM_REGISTRY_URL = 'https://registry.npmjs.org/aws-ses-v2-local'
const VERSION_FILE = new URL('../VERSION', import.meta.url)
const DOCKERFILE = new URL('../Dockerfile', import.meta.url)
const README = new URL('../README.md', import.meta.url)

const args = new Set(process.argv.slice(2))
const versionArgIndex = process.argv.indexOf('--version')
const requestedVersion =
	versionArgIndex === -1 ? null : process.argv[versionArgIndex + 1]

function parseSemver(version) {
	const match = version.match(
		/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/,
	)
	if (!match) return null

	return {
		version,
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: match[4]?.split('.') ?? [],
	}
}

function comparePrerelease(left, right) {
	if (left.length === 0 && right.length === 0) return 0
	if (left.length === 0) return 1
	if (right.length === 0) return -1

	const length = Math.max(left.length, right.length)
	for (let i = 0; i < length; i++) {
		const a = left[i]
		const b = right[i]
		if (a === undefined) return -1
		if (b === undefined) return 1
		if (a === b) continue

		const aNumber = /^\d+$/.test(a) ? Number(a) : null
		const bNumber = /^\d+$/.test(b) ? Number(b) : null
		if (aNumber !== null && bNumber !== null) return aNumber - bNumber
		if (aNumber !== null) return -1
		if (bNumber !== null) return 1
		return a.localeCompare(b)
	}

	return 0
}

function compareSemver(left, right) {
	for (const key of ['major', 'minor', 'patch']) {
		const delta = left[key] - right[key]
		if (delta !== 0) return delta
	}
	return comparePrerelease(left.prerelease, right.prerelease)
}

async function fetchNpmVersions() {
	const response = await fetch(NPM_REGISTRY_URL)
	if (!response.ok) {
		throw new Error(
			`npm registry query failed with ${response.status} ${response.statusText}`,
		)
	}

	const payload = await response.json()
	return Object.keys(payload.versions ?? {})
}

function stableVersions(tags) {
	return tags
		.map(parseSemver)
		.filter((v) => v !== null && v.prerelease.length === 0)
		.sort(compareSemver)
}

function replaceVersion(text, currentVersion, nextVersion) {
	return text.split(currentVersion).join(nextVersion)
}

const current = (await readFile(VERSION_FILE, 'utf8')).trim()
const currentSemver = parseSemver(current)
if (!currentSemver) {
	throw new Error(`VERSION file is not valid semver: ${current}`)
}

const tags = await fetchNpmVersions()
const versions = stableVersions(tags)
const latest = versions.at(-1)
if (!latest) throw new Error('No stable versions found on npm')

if (args.has('--list-newer')) {
	const newerVersions = versions
		.filter((v) => compareSemver(v, currentSemver) > 0)
		.map((v) => v.version)
	console.log(JSON.stringify(newerVersions))
	process.exit(0)
}

const target = requestedVersion ? parseSemver(requestedVersion) : latest
if (!target) throw new Error(`Invalid requested version: ${requestedVersion}`)
if (!versions.some((v) => v.version === target.version)) {
	throw new Error(`aws-ses-v2-local@${target.version} was not found on npm`)
}

if (target.version === current) {
	console.log(`Already targeting aws-ses-v2-local@${current}`)
	process.exit(0)
}

await writeFile(VERSION_FILE, `${target.version}\n`)

const dockerfile = await readFile(DOCKERFILE, 'utf8')
await writeFile(DOCKERFILE, replaceVersion(dockerfile, current, target.version))

const readme = await readFile(README, 'utf8')
await writeFile(README, replaceVersion(readme, current, target.version))

console.log(`Updated aws-ses-v2-local target ${current} -> ${target.version}`)
