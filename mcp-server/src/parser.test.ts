/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdownToDict } from './parser.js';

describe('parseMarkdownToDict', () => {
  it('should parse a standard security vulnerability correctly', () => {
    const mdContent = `
Vulnerability: Hardcoded API Key
Vulnerability Type: Security
Severity: Critical
Source Location: config/settings.js:15-15
Line Content: const KEY = "sk_live_12345";
Description: A production secret was found hardcoded in the source.
Recommendation: Move the secret to an environment variable.
    `;

    const results = parseMarkdownToDict(mdContent);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      vulnerability: 'Hardcoded API Key',
      vulnerabilityType: 'Security',
      severity: 'Critical',
      lineContent: 'const KEY = "sk_live_12345";',
      codeSuggestion: null, // Should be null if no code block in recommendation
      sourceLocation: {
        file: 'config/settings.js',
        startLine: 15,
        endLine: 15
      }
    });
  });

  it('should extract codeSuggestion from recommendation code blocks', () => {
    const mdContent = `
Vulnerability: SQL Injection
Severity: High
Source Location: db.js:10
Recommendation: Use parameterized queries.
\`\`\`javascript
const row = await db.query('SELECT * FROM users WHERE id = ?', [id]);
\`\`\`
    `;

    const results = parseMarkdownToDict(mdContent);

    expect(results).toHaveLength(1);
    // Verify code block is extracted into codeSuggestion
    expect(results[0].codeSuggestion).toBe("const row = await db.query('SELECT * FROM users WHERE id = ?', [id]);");
    // Verify recommendation text is cleaned of the code block
    expect(results[0].recommendation).toBe("Use parameterized queries.");
  });

  it('should handle a complex, messy markdown input with multiple findings and irregular formatting', () => {
    const mdContent = `
### Finding 1
**Vulnerability**: Path Traversal
**Severity**: High
**Source Location**: \`lib/file-utils.ts:102-105\`
**Line Content**:
\`\`\`typescript
const data = fs.readFileSync(path.join(__dirname, req.query.file));
\`\`\`
**Description**: User input is joined directly to a file path.
**Recommendation**: 
First, sanitize the input using a whitelist. 
\`\`\`typescript
const safePath = path.basename(req.query.file);
const data = fs.readFileSync(path.join(__dirname, 'safe_dir', safePath));
\`\`\`
After that, ensure permissions are restricted.

---

Vulnerability: Unencrypted Communication
Severity: Medium
Source Location: src/network.js
Recommendation: Use HTTPS instead of HTTP.
    `;

    const results = parseMarkdownToDict(mdContent);

    expect(results).toHaveLength(2);

    // Assertions for the complex first finding
    expect(results[0]).toMatchObject({
      vulnerability: 'Path Traversal',
      severity: 'High',
      sourceLocation: {
        file: 'lib/file-utils.ts',
        startLine: 102,
        endLine: 105
      }
    });
    
    // Check that the code suggestion was extracted correctly despite surrounding text
    expect(results[0].codeSuggestion).toBe('const safePath = path.basename(req.query.file);\nconst data = fs.readFileSync(path.join(__dirname, \'safe_dir\', safePath));');
    
    // Check that recommendation text preserved the parts before and after the code block
    expect(results[0].recommendation).toContain('First, sanitize the input');
    expect(results[0].recommendation).toContain('After that, ensure permissions are restricted.');
    expect(results[0].recommendation).not.toContain('```typescript');

    // Assertions for the second, simpler finding in the same batch
    expect(results[1]).toMatchObject({
      vulnerability: 'Unencrypted Communication',
      severity: 'Medium',
      codeSuggestion: null
    });
  });

  it('should handle complex recommendations with text following a code block', () => {
    const mdContent = `
Vulnerability: Insecure Regex
Severity: Low
Source Location: utils.js:5
Recommendation: Use a more restrictive regex.
\`\`\`javascript
const regex = /^[a-z]+$/;
\`\`\`
This will prevent special character injection.
    `;

    const results = parseMarkdownToDict(mdContent);

    expect(results[0].codeSuggestion).toBe("const regex = /^[a-z]+$/;");
    expect(results[0].recommendation).toContain("Use a more restrictive regex.");
    expect(results[0].recommendation).toContain("This will prevent special character injection.");
  });

  it('should parse a privacy violation with Sink and Data Type', () => {
    const mdContent = `
Vulnerability: PII Leak in Logs
Vulnerability Type: Privacy
Severity: Medium
Source Location: src/auth.ts:22
Sink Location: console.log:45
Data Type: Email Address
Line Content: logger.info("User logged in: " + user.email);
Description: Unmasked email addresses are being written to application logs.
Recommendation: Redact the email address before logging.
    `;

    const results = parseMarkdownToDict(mdContent);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      sinkLocation: {
        file: 'console.log',
        startLine: 45,
        endLine: 45
      },
      dataType: 'Email Address'
    });
  });

  it('should handle multiple vulnerabilities in one file', () => {
    const mdContent = `
Vulnerability: SQL Injection
Vulnerability Type: Security
Severity: High
Source Location: db.js:10
Line Content: query = "SELECT * FROM users WHERE id = " + id;
Description: Raw input used in query.
Recommendation: Use parameterized queries.

Vulnerability: Reflected XSS
Vulnerability Type: Security
Severity: Medium
Source Location: app.js:100
Line Content: res.send("Hello " + req.query.name);
Description: User input rendered without escaping.
Recommendation: Use a templating engine with auto-escaping.
    `;

    const results = parseMarkdownToDict(mdContent);
    expect(results).toHaveLength(2);
    expect(results[0].vulnerability).toBe('SQL Injection');
    expect(results[1].vulnerability).toBe('Reflected XSS');
  });

  it('should handle markdown formatting like bolding and bullets', () => {
    const mdContent = `
* **Vulnerability:** Hardcoded Secret
- **Severity:** High
* **Source Location:** \`index.js:5-10\`
- **Line Content:** \`\`\`javascript
  const secret = "password";
  \`\`\`
    `;

    const results = parseMarkdownToDict(mdContent);

    expect(results[0].vulnerability).toBe('Hardcoded Secret');
    expect(results[0].severity).toBe('High');
    expect(results[0].sourceLocation.file).toBe('index.js');
    expect(results[0].lineContent).toBe('const secret = "password";');
  });

  it('should return empty array if no "Vulnerability:" trigger is found', () => {
    const mdContent = "This is a summary report with no specific findings.";
    const results = parseMarkdownToDict(mdContent);
    expect(results).toHaveLength(0);
  });

  it('should handle missing line numbers and sink location', () => {
    const mdContent = `
Vulnerability: Missing Line Numbers
Vulnerability Type: Security
Severity: High
Source Location: src/index.ts
Line Content: const apiKey = process.env.API_KEY;
Description: Source location without line numbers.
Recommendation: Verify the vulnerability details.
    `;

    const results = parseMarkdownToDict(mdContent);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      vulnerability: 'Missing Line Numbers',
      vulnerabilityType: 'Security',
      severity: 'High',
      lineContent: 'const apiKey = process.env.API_KEY;'
    });
    expect(results[0].sourceLocation.file).toBe('src/index.ts');
  });

  it('should handle missing end line number', () => {
    const mdContent = `
Vulnerability: No End Line
Vulnerability Type: Security
Severity: Medium
Source Location: app.js:42
Line Content: res.send(userInput);
Description: Source location with only start line number.
Recommendation: Check this line.
    `;

    const results = parseMarkdownToDict(mdContent);

    expect(results).toHaveLength(1);
    expect(results[0].sourceLocation).toMatchObject({
      file: 'app.js',
      startLine: 42
    });
  });

  it('should handle missing sink location', () => {
    const mdContent = `
Vulnerability: No Sink Info
Vulnerability Type: Privacy
Severity: Low
Source Location: logger.ts:15
Data Type: User ID
Line Content: console.log(user.id);
Description: Vulnerability without sink location details.
Recommendation: Use proper logging.
    `;

    const results = parseMarkdownToDict(mdContent);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      vulnerability: 'No Sink Info',
      vulnerabilityType: 'Privacy',
      severity: 'Low'
    });
    expect(results[0].dataType).toBe('User ID');
    expect(
      results[0].sinkLocation === undefined ||
      (results[0].sinkLocation?.file === null &&
       results[0].sinkLocation?.startLine === null &&
       results[0].sinkLocation?.endLine === null)
    ).toBe(true);
  });
});
