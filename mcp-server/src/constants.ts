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
// This file is used for testing path traversal vulnerabilities.
// It is created in the workspace root by the security:setup_poc tool and deleted by run_poc.
export const PATH_TRAVERSAL_TEMP_FILE = 'gcli_secext_path_traversal_test.txt';
