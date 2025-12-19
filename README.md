# Gemini CLI Security Extension

The Security extension is an open-source Gemini CLI extension, built to enhance your repository's security posture. The extension adds a new command to Gemini CLI that analyzes code changes to identify a variety of security risks and vulnerabilities.

![Security Extension Workflow](./assets/gemini-cli-security-extension-workflow.gif)

## Features

- **AI-powered security analysis**: Leverages Gemini's advanced capabilities to provide intelligent and context-aware security analysis.
- **Focused analysis**: Specifically designed to analyze code changes within pull requests, helping to identify and address vulnerabilities early in the development process.
- **Open source**: The extension is open source and distributed under the Apache 2.0 license.
- **Integrated with Gemini CLI**: As a Google-developed extension, it integrates seamlessly into the Gemini CLI environment, making security an accessible part of your workflow.
- **Expandable scope**: The extension is designed with an extensible architecture, allowing for future expansion of detected security risks and more advanced analysis techniques.
- **Dependency scans**: Identifies known vulnerabilities affecting your project's dependencies using [OSV-Scanner](https://github.com/google/osv-scanner).

## Installation

Install the Security extension by running the following command from your terminal *(requires Gemini CLI v0.4.0 or newer)*:

```bash
gemini extensions install https://github.com/gemini-cli-extensions/security
```

## Use the extension

The Security extension adds the `/security:analyze` command to Gemini CLI which analyzes code changes on your current branch for common security vulnerabilities and provides an intelligent, Gemini-powered security report to improve the repository's security posture.

Important: This report is a first-pass analysis, not a complete security audit. Use in combination with other tools and manual review.

Note: The /security:analyze command is currently designed for interactive use. Support for non-interactive sessions is planned for a future release (tracked in [issue #20](https://github.com/gemini-cli-extensions/security/issues/20)).

### Customize the `/security:analyze` command

By default, the `/security:analyze` command determines the scope of the analysis using `git diff --merge-base origin/HEAD`. However, to customize the scope, you can add instructions to the command using natural language. For example, to analyze all files in `scripts` folder, you can run the command as
```bash
/security:analyze Analyze all the source code under the script folder. Skip the docs, config files and package files.
```

![Customize analysis command](./assets/customize_command.gif)

### Scan for vulnerable dependencies

Modern software is built on open-source dependencies, but this can introduce security risks if a dependency contains vulnerabilities.

Regularly running a dependency scan is a critical step in securing your software supply chain and protecting your project from well-known attack vectors.

The `/scan-deps` command automates this process by integrating [OSV-Scanner](https://github.com/google/osv-scanner), a tool that cross-references your project's dependencies with [OSV.dev](https://osv.dev/), a Google-maintained, open-source vulnerability database. OSV.dev provides precise vulnerability data by aggregating information from a wide range of open-source ecosystems, ensuring comprehensive and reliable security advisories.

To run a dependency scan, use the following command:
```bash
/scan-deps
```

After running the command, you will receive a report listing:
- **Which dependencies are vulnerable.**
- **Details about the specific vulnerabilities**, including their severity and identifiers (like CVEs).
- **Guidance on how to remediate the issues**, such as which version to upgrade to.

## GitHub Integration

### I already use [run-gemini-cli](https://github.com/google-github-actions/run-gemini-cli) workflows in my repository:

* Replace your existing `gemini-review.yml` with this [updated workflow](https://github.com/gemini-cli-extensions/security/blob/main/.github/workflows/gemini-review.yml), which includes the new Security Analysis step.

### I don't use [run-gemini-cli](https://github.com/google-github-actions/run-gemini-cli) workflows in my repository yet:

1. Integrate the Gemini CLI Security Extension into your GitHub workflow to analyze incoming code:

2. Follow Steps 1-3 in this [Quick Start](https://github.com/google-github-actions/run-gemini-cli?tab=readme-ov-file#quick-start).

3. Create a `.github/workflows` directory in your repository's root (if it doesn't already exist).

4. Copy this [Example Workflow](https://github.com/gemini-cli-extensions/security/blob/main/.github/workflows/gemini-review.yml) into the `.github/workflows` directory. See the run-gemini-cli [configuration](https://github.com/google-github-actions/run-gemini-cli?tab=readme-ov-file#configuration) to make changes to the workflow.

5. Ensure the new workflow file is committed and pushed to GitHub.

6. Open a new pull request, or comment `@gemini-cli /review` on an existing PR, to run the Gemini CLI Code Review along with Security Analysis.

## Benchmark

To evaluate the quality and effectiveness of our security analysis, we benchmarked the extension against a real-world dataset of known vulnerabilities.

### Methodology

Our evaluation process is designed to test the extension's ability to identify vulnerabilities in code changes.

1. **Dataset**: We used the [OpenSSF CVE Benchmark](https://github.com/ossf-cve-benchmark/ossf-cve-benchmark), a dataset containing GitHub repositories of real applications in TypeScript / JavaScript. For each vulnerability, the dataset provides the commit containing the vulnerable code (`prePatch`) and the commit where the vulnerability was fixed (`postPatch`).
2. **Analysis Target**: For each CVE, we set up the repository, found the introducing patch with the help of [archeogit](https://github.com/samaritan/archeogit), and added that patch to our local environment.
3. **Report Generation**: We ran the `/security:analyze` command on this diff to generate a security report.
4. **Validation**: Since the dataset has a small number of repositories, we manually reviewed all the generated security reports and compared with the ground truth to calculate the final precision and recall numbers.

We are now actively working to automate the evaluation framework and enrich our datasets by adding new classes of vulnerabilities.

### Results

Our evaluation on this dataset yielded a precision of **90%** and a recall of **93%**.

* **Precision (90%)** measures the accuracy of our detections. Of all the potential vulnerabilities the extension identified, 90% were actual security risks.
* **Recall (93%)** measures the completeness of our coverage. The extension successfully identified 93% of all the known vulnerabilities present in the dataset.

## Types of vulnerabilities

The Security extension scans files for the following vulnerabilities:

### Secrets management

- **Hardcoded secrets**: Credentials such as API keys, private keys, passwords and connection strings, and symmetric encryption keys embedded directly in the source code

### Insecure data handling

- **Weak cryptographic algorithms**: Weak or outdated cryptographic algorithms, including any instances of DES, Triple DES, RC4, or ECB mode in block ciphers
- **Logging of sensitive information**: Logging statements that might write passwords, PII, API keys, or session tokens to application or system logs
- **Personally identifiable information (PII) handling violations**: Improper storage, insecure transmission, or any use of PII that may violate data privacy regulations
- **Insecure deserialization**: Code that deserializes data from untrusted sources without proper validation, which could allow an attacker to execute arbitrary code

### Injection vulnerabilities

- **Cross-site scripting (XSS)**: Instances where unsanitized or improperly escaped user input is rendered directly into HTML, which could allow for script execution in a user's browser
- **SQL injection (SQLi)**: Database queries that are constructed by concatenating strings with raw, un-parameterized user input
- **Command injection**: Code that executes system commands or cloud functions using user-provided input without proper sanitization
- **Server-side request forgery (SSRF)**: Code that makes network requests to URLs provided by users without validation, which could allow an attacker to probe internal networks or services
- **Server-side template injection (SSTI)**:  Instances where user input is directly embedded into a server-side template before it is rendered

### Authentication

- **Authentication bypass**: Improper session validation, insecure "remember me" functionality, or custom authentication endpoints that lack brute-force protection
- **Weak or predictable session tokens**: Tokens that are predictable, lack sufficient entropy, or are generated from user-controllable data
- **Insecure password reset**: Predictable reset tokens, leakage of tokens in logs or URLs, and insecure confirmation of a user's identity

## LLM Safety
- **Insecure Prompt Handling (Prompt Injection)**: Analyzes how prompts are constructed to identify risks from untrusted user data, which could lead to prompt injection attacks. This can also include embedding sensitive information (API Keys, credentials, PII) directly within the code used to generate the prompt or the prompt itself.
- **Improper Output Handling**: Detects when LLM-generated content is used unsafely, leading to vulnerabilities like Cross-Site Scripting (XSS), SQL Injection (SQLi), or the remote execution of code via functions like `eval()`. Also flags code where security-sensitive decisions are based on unvalidated LLM output.
- **Insecure Plugin and Tool Usage**: Scans for vulnerabilities in how the LLM interacts with external tools, flagging overly permissive tools or unsafe data flows that could be exploited by malicious output.

## Resources

- [Gemini CLI extensions](https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/index.md): Documentation about using extensions in Gemini CLI
- Blog post (coming soon!): More information about the Security extension
- [GitHub issues](https://github.com/gemini-cli-extensions/security/issues): Report bugs or request features

## Legal

- License: [Apache License 2.0](https://github.com/gemini-cli-extensions/security/blob/main/LICENSE)
- Security: [Security Policy](https://github.com/gemini-cli-extensions/security/blob/main/SECURITY.md)

## Star history

[![Star History Chart](https://api.star-history.com/svg?repos=gemini-cli-extensions/security&type=Date)](https://www.star-history.com/#gemini-cli-extensions/security&Date)
