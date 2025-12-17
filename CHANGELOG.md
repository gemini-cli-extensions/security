# Changelog

## [0.4.0](https://github.com/gemini-cli-extensions/security/compare/v0.3.0...v0.4.0) (2025-12-17)


### Features

* Add basic poc command functionality to the MCP server ([2f533fd](https://github.com/gemini-cli-extensions/security/commit/2f533fdb65368aa64219bd772d0228f73b544c36))
* Add privacy specific taxonomy ([#84](https://github.com/gemini-cli-extensions/security/issues/84)) ([46b3eb0](https://github.com/gemini-cli-extensions/security/commit/46b3eb037d7e9f7c2f8f56c68ba91520c0207719))
* add tooling for defining the audit scope ([1730bbb](https://github.com/gemini-cli-extensions/security/commit/1730bbb9c2437921198e495a31d9703fbfb07244))
* Use problem statements in the PoC function to allow for more flexible usage ([a0449d3](https://github.com/gemini-cli-extensions/security/commit/a0449d3baddc9833bdca68af91eca27446c83c2c))
* download/package OSV scanner and register as MCP server ([eccf9eb](https://github.com/gemini-cli-extensions/security/pull/105/commits/eccf9eb885294235a84eef9968a0ceb5c14ff512))

## [0.3.0](https://github.com/gemini-cli-extensions/security/compare/v0.2.0...v0.3.0) (2025-10-20)


### Features

* add  folder to contain artifacts ([e03b2c6](https://github.com/gemini-cli-extensions/security/commit/e03b2c60d7b0ca3256533125175f43c9758236ce))
* add folder to contain security artifacts ([2fe3588](https://github.com/gemini-cli-extensions/security/commit/2fe35888d5cff981c88ef31fae3daf39c6a695ef))
* Add preamble to security scan to make confirms user's decision to use command or manual security auditing ([67658d5](https://github.com/gemini-cli-extensions/security/commit/67658d587472be8283bc5aa00864429786bd1500))
* **GHA workflows:** Add run-gemini-cli GHA workflows to repo PR's ([facc88b](https://github.com/gemini-cli-extensions/security/commit/facc88be48db43b3b8482ff6a6d19d34fd0513e1))
* **GitHub Action:** Add /security:github-pr command for use with run-gemini-cli GitHub Action ([59db0ad](https://github.com/gemini-cli-extensions/security/commit/59db0add3f6aee54821570725f1c33859c24bc4d))


### Bug Fixes

* Diff issues were due to non remote repositories, support local changes by defulating to ([53a52c6](https://github.com/gemini-cli-extensions/security/commit/53a52c650c07575a18840b5b357eb80d8941c304))
* **GHA:** Gemini-review MCP calls and prompt changes ([6d2d20f](https://github.com/gemini-cli-extensions/security/commit/6d2d20f070e034a90fdb7b6369b600f71d539430))
* **GHA:** Gemini-review MCP calls and prompt changes ([ad93687](https://github.com/gemini-cli-extensions/security/commit/ad936878615d772cf00e17eb9e24d2c813e37a61))
* **GHA:** Update github-mcp-server calls ([2c1e176](https://github.com/gemini-cli-extensions/security/commit/2c1e176bebee987e6beba630b7d1409a14f4f76f))
* nit white space and revert deletion prompt to only affect temp files ([9d64b30](https://github.com/gemini-cli-extensions/security/commit/9d64b307eec2946b2f155a062febefae1c7f03bb))
* phrasing and whitespace ([4fb13d6](https://github.com/gemini-cli-extensions/security/commit/4fb13d651822619d1f442bdd4226d81ec9ec4bac))
* remove additional test causing gemini cli to try to run a command ([2caa615](https://github.com/gemini-cli-extensions/security/commit/2caa615f2f4563034ecc92842fec7583dbd102d1))
* suggest user to run commands themselves, since gemini cli cannot correctly run it's own commands. ([caafd73](https://github.com/gemini-cli-extensions/security/commit/caafd7399b3ddae851f701885a74468a55a36424))
* suggest user to run commands themselves, since gemini cli cannot… ([96f84f9](https://github.com/gemini-cli-extensions/security/commit/96f84f95d327482f4c5d8ddc267ea3f271aebcdb))
* use  to store line number mappings in the MCP server ([#91](https://github.com/gemini-cli-extensions/security/issues/91)) ([909c901](https://github.com/gemini-cli-extensions/security/commit/909c901fd0a9b181b13a6462d50de7ca5acf4a5e))
* Use a command available on all platforms to generate a file diff ([21fc350](https://github.com/gemini-cli-extensions/security/commit/21fc35037b22b7acf51e7c78a5eb233d2f02cff3))
* Use a command available on all platforms to generate a file diff ([f1fca9b](https://github.com/gemini-cli-extensions/security/commit/f1fca9bd98bef7f10f957701d5ca4fd69c9f2e9c))
* whitespace at end fo file ([4257532](https://github.com/gemini-cli-extensions/security/commit/4257532aaa734171bfcf083deba8472c6e8453a7))

## [0.2.0](https://github.com/gemini-cli-extensions/security/compare/v0.1.0...v0.2.0) (2025-10-07)


### Features

* migrate initial template ([6e71cc4](https://github.com/gemini-cli-extensions/security/commit/6e71cc405040cd733207fb2130fba732c10e4481))
* migrate initial template ([7c5d56e](https://github.com/gemini-cli-extensions/security/commit/7c5d56ed68511bb906650ae9fe37403a96e9920c))
