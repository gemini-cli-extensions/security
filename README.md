# Gemini CLI Security Extension

The Security extension is an open-source Gemini CLI extension, built to enhance your repository's security posture. The extension adds a new command to Gemini CLI that analyzes code changes to identify a variety of security risks and vulnerabilities.

## Features

- **AI-powered security analysis**: Leverages Gemini's advanced capabilities to provide intelligent and context-aware security analysis.
- **Focused analysis**: Specifically designed to analyze code changes within pull requests, helping to identify and address vulnerabilities early in the development process.
- **Open source**: The extension is open source and distributed under the Apache 2.0 license.
- **Integrated with Gemini CLI**: As a Google-developed extension, it integrates seamlessly into the Gemini CLI environment, making security an accessible part of your workflow.
- **Expandable scope**: The extension is designed with an extensible architecture, allowing for future expansion of detected security risks and more advanced analysis techniques.

## Installation

Install the Security extension by running the following command from your terminal:

```bash
gemini extensions install --source https://github.com/google-gemini/gemini-cli-security
```

## Use the extension

The Security extension adds the `/security:analyze` command to Gemini CLI.

## GitHub Integration

Coming soon!

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

## Resources

- [Gemini CLI extensions](https://github.com/google-gemini/gemini-cli/blob/main/docs/extension.md): Documentation about using extensions in Gemini CLI
- Blog post (coming soon!): More information about the Security extension
- [GitHub issues](https://github.com/google-gemini/gemini-cli-security/issues): Report bugs or request features

## Legal

- License: [Apache License 2.0](https://github.com/google-gemini/gemini-cli-security/blob/main/LICENSE)
- Security: [Security Policy](https://github.com/google-gemini/gemini-cli-security/blob/main/SECURITY.md)
