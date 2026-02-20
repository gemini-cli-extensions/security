/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';

export const SECURITY_DIR_NAME = '.gemini_security';
export const POC_DIR_NAME = 'poc';

export const SECURITY_DIR = path.join(process.cwd(), SECURITY_DIR_NAME);
export const POC_DIR = path.join(SECURITY_DIR, POC_DIR_NAME);
