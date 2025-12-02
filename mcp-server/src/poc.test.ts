import { describe, it, vi, expect } from 'vitest';
import { validatePocParams, runPoc } from './poc.js';

describe('validatePocParams', () => {
  it('should return valid message when parameters are provided', async () => {
    const result = await validatePocParams({
      vulnerabilityType: 'SQL Injection',
      sourceCode: 'SELECT * FROM users WHERE id = ' + 1,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe(
      JSON.stringify({ message: 'Parameters are valid.' })
    );
  });

  it('should return error when vulnerabilityType is missing', async () => {
    const result = await validatePocParams({
      vulnerabilityType: '',
      sourceCode: 'code',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      JSON.stringify({ error: 'Vulnerability type is required.' })
    );
  });

  it('should return error when sourceCode is missing', async () => {
    const result = await validatePocParams({
      vulnerabilityType: 'type',
      sourceCode: '',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe(
      JSON.stringify({ error: 'Source code is required.' })
    );
  });
});

describe('runPoc', () => {
  it('should write file and execute it', async () => {
    const result = await runPoc(
      { code: 'console.log("test")' }
    );

    expect(result.content[0].text).toBe(
      JSON.stringify({ stdout: 'test', stderr: '' })
    );
  });

  it('should handle execution errors', async () => {
    const result = await runPoc(
      { code: 'throw new Error("Execution failed")' }
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Execution failed');
  });

});
