# Path Traversal Remediation

## Description
Path traversal vulnerabilities occur when an application uses user-contributed data to construct a file path for file system access without properly validating that the resulting path is within the intended directory. This allows attackers to access arbitrary files on the system (e.g., `/etc/passwd`).

## Remediation Strategy
1.  **Resolve the Path**: Use `path.resolve()` to create an absolute path from the safe root directory and the user input.
2.  **Validate the Path**: Check if the resolved path starts with the safe root directory.
3.  **Reject Invalid Paths**: If the path is outside the safe root, throw an error or reject the request.

## Secure Coding Patterns

### Node.js (TypeScript/JavaScript)

```typescript
import path from 'path';
import fs from 'fs/promises';

async function safeReadFile(userInput: string) {
  const SAFE_ROOT = path.resolve('/var/www/uploads');
  const targetPath = path.resolve(SAFE_ROOT, userInput);

  // Critical: Check if the resolved path starts with the safe root
  if (!targetPath.startsWith(SAFE_ROOT + path.sep)) {
    throw new Error('Access denied: Invalid file path.');
  }

  return fs.readFile(targetPath, 'utf-8');
}
```

## Vulnerable vs Secure Comparison

### ❌ Vulnerable (Do Not Use)
```typescript
// VULNERABLE: Direct concatenation allows inputs like "../../etc/passwd"
const targetPath = path.join('/var/www/uploads', userInput);
return fs.readFile(targetPath, 'utf-8');
```

### ✅ Secure
```typescript
// SECURE: Resolve + Prefix Check
const safeRoot = path.resolve('/var/www/uploads');
const targetPath = path.resolve(safeRoot, userInput);

if (!targetPath.startsWith(safeRoot + path.sep)) {
  throw new Error('Path traversal detected');
}
return fs.readFile(targetPath, 'utf-8');
```
