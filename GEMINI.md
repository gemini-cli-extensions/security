# Gemini PR Security Scan Instructions

## Phase 0: Change Analysis

### 0.1. Identify Code Modifications
*   **Action:** Determine the precise set of changes to be audited.
*   ** Tools:** You have access to the git tools to learn about the files that were changed, and the changes that were made.
*   **Procedure:**
    *   Always run `git diff --merge-base origin/HEAD` to generate the diff and define the scope of the scan. Run the exact command, and no other git command. This is the only way to generate the diff for our purposes.
    *   This diff defines the primary scope of the audit. All subsequent analysis should be centered on the vulnerabilities *introduced* by these changes.
    *   Consider all aspects of the diff and how it impacts the security in detail. For context, look at the surrounding code and read the files.

## Generate Guidelines
* Use the command line tools to understand the repository structure.
* Infer the contexts of the directories and files using the file names and repository structure.
* For files that were changed, read the files (and any related file) while doing the analysis to fully understand the nature of the change.

## Phase 1: Static Application Security Testing (SAST)

### 1.1. Hardcoded Secrets
*   **Action:** Scan the modified lines of code for any newly hardcoded secrets.
*   **Procedure:**
    *   Within the diff, scan files for credentials embedded directly in the source code and search for common patterns of API keys, passwords, private keys, connection strings, and symmetric encryption keys.
    *   Decode any newly introduced base64 strings and search for these patterns within the output.

### 1.2. Broken Access Control

*   **Action:** Scan the modified lines of code for flaws in how user permissions are enforced.
*   **Procedure:**
    *   **Insecure Direct Object Reference (IDOR):** Check API endpoints and data access functions that use user-supplied identifiers (like user_id, order_id, or file_id) without also verifying that the authenticated user has permission to access that specific object.
    *   **Missing Function-Level Access Control:** Review API endpoints, serverless functions, and other entry points to ensure that they perform robust authorization checks (e.g., verifying user roles or permissions) before executing sensitive logic.
    *   **Privilege Escalation Flaws:** Look for code paths where a user can modify their own role or permissions, or where administrative functions can be called by non-administrative users.
    *   **Improper Service Account Implementation:** Check for service accounts with overly broad permissions and identify where their keys are stored and used. Ensure they follow the principle of least privilege.
    *   **Path Traversal / Local File Inclusion (LFI):** Examine any code that handles file paths based on user input and check for insufficient sanitization that would allow an attacker to access files outside of the intended directory (e.g., using ../).

### 1.3. Insecure Data Handling

*   **Action:** Scan the modified lines of code for weaknesses in data encryption, storage, and processing.
*   **Procedure:**
    *   **Weak Cryptographic Algorithms:** Flag any instances of weak or outdated cryptographic algorithms, such as DES, Triple DES, RC4, or ECB mode in block ciphers, or DSA, blowfish, or twofish in asymmetric ciphers. Flag instances of public key algorithms with insufficient key length, such as RSA with fewer than 2048 bits or ECC with fewer than 256 bits..
    *   **Logging of Sensitive Information:** Scan the code for logging statements that might write passwords, PII, API keys, or session tokens to application or system logs.
    *   **PII Handling Violations:** Look for improper storage (e.g., unencrypted or improperly permissioned), insecure transmission, or any use of Personal Identifiable Information (PII) that may violate data privacy regulations.
    *   **Insecure Deserialization:** Look for any code that deserializes data from untrusted sources without proper validation, which could allow an attacker to execute arbitrary code.

### 1.4. Injection Vulnerabilities
*   **Action:** Look for vulnerabilities related to improper handling of user-supplied input.
*   **Procedure:**
    *   **SQL Injection:** Review all code that constructs database queries. Ensure that ORMs or parameterized queries are used exclusively. Flag any instance of string concatenation or interpolation used to build queries with user input.
    *   **Cross-Site Scripting (XSS):** Check for any instances where unsanitized or improperly escaped user input is rendered directly into HTML, which could allow for script execution in a user's browser. Examine all points where user input is rendered in the UI. If it is a React project, focus on the usage of `dangerouslySetInnerHTML`. Check `src/app/page.tsx` and other components for direct rendering of state or props that could originate from user input without proper sanitization.
    *   **Command Injection:** If the application uses `child_process` or any other method to execute shell commands, verify that user input is not part of the command string. Look for any code that executes system commands or cloud functions using user-provided input without proper sanitization.
    *   **Server-Side Request Forgery (SSRF):** Examine code that makes network requests to URLs provided by users and check for a lack of validation, which could allow an attacker to probe internal networks or services.
    *   **Server-Side Template Injection (SSTI):** Check for any instances where user input is directly embedded into a server-side template before it is rendered.

    In general, do not make assumptions about the security features of the application or the framework - independently analyze if there is a vulnerability. It is best to assume that if a potential vulnerability can be exploited, then it will be exploited.

### 1.5. Authentication
*   **Action:** Analyze any modifications to authentication logic, understanding their interaction with the existing codebase.
*   **Procedure:**
    *   **Authentication Bypass:** In the diff, review authentication logic for weaknesses, such as improper session validation, insecure "remember me" functionality, or custom authentication endpoints that lack brute-force protection.
    *   **Weak or Predictable Session Tokens:** In the diff, analyze how session tokens are generated and managed. Look for tokens that are predictable, lack sufficient entropy, or are generated from user-controllable data (e.g., a simple Base64 encoding of a user ID).
    *   **Insecure Password Reset:** Analyze the password reset implementation for security flaws. Check for predictable reset tokens, leakage of tokens in logs or URLs, and whether the flow confirms a user's identity securely.

## Phase 2: Reporting

*   **Action:** Create a clear, actionable report of vulnerabilities.

---

### Newly Introduced Vulnerabilities
For each vulnerability introduced by the current pull request, provide the following:

*   **Vulnerability:** A brief name for the issue (e.g., "Cross-Site Scripting," "Hardcoded API Key").
*   **Severity:** Critical, High, Medium, or Low.
*   **Location:** The file path and line number(s) where the vulnerability was introduced.
*   **Description:** A short explanation of the vulnerability and the potential impact stemming from this change.
*   **Recommendation:** A clear suggestion on how to remediate the issue within the new code.
--------

Begin the scan.