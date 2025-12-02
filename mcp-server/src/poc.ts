/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import ivm from 'isolated-vm';

const execAsync = promisify(exec);

export async function validatePocParams(
  {
    vulnerabilityType,
    sourceCode,
  }: {
    vulnerabilityType: string;
    sourceCode: string;
  }
): Promise<CallToolResult> {
  if (!vulnerabilityType || !vulnerabilityType.trim()) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Vulnerability type is required.' }),
        },
      ],
      isError: true,
    };
  }

  if (!sourceCode || !sourceCode.trim()) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Source code is required.' }),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ message: 'Parameters are valid.' }),
      },
    ],
  };
}

export async function runPoc(
  {
    code,
  }: {
    code: string;
    }
): Promise<CallToolResult> {
  try {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const jail = context.global;
    await jail.set('global', jail.derefInto());

    const logs: string[] = [];
    await jail.set('print', new ivm.Reference((...args: any[]) => {
      logs.push(args.map(arg => String(arg)).join(' '));
    }));

    await context.eval(`
      global.console = {
        log: function(...args) {
          print.apply(undefined, args, { arguments: { copy: true } });
        },
        error: function(...args) {
          print.apply(undefined, args, { arguments: { copy: true } });
        }
      };
    `);

    const script = await isolate.compileScript(code);
    await script.run(context);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ stdout: logs.join('\n'), stderr: '' }),
        },
      ],
    };
  } catch (error) {
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }),
        },
      ],
      isError: true,
    };
  }
}
