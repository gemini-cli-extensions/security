/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Location {
  File: string | null;
  startLine: number | null;
  endLine: number | null;
}

export interface Finding {
  vulnerability: string | null;
  vulnerabilityType: string | null;
  severity: string | null;
  extension: {
    sourceLocation: Location;
    sinkLocation: Location;
    dataType: string | null;
  };
  lineContent: string | null;
  description: string | null;
  recommendation: string | null;
}

/**
 * Parses a markdown string containing security findings into a structured format.
 * The markdown should follow a specific format where each finding starts with "Vulnerability:" and includes fields like "Severity:", "Source Location:", etc.
 * The function uses regular expressions to extract the relevant information and returns an array of findings.
 *
 * @param content - The markdown string to parse.
 * @returns An array of structured findings extracted from the markdown.
 */
function parseLocation(locationStr: string | null): Location {
  if (!locationStr) {
    return { File: null, startLine: null, endLine: null };
  }

  const cleanStr = locationStr.replace(/`/g, '').trim();
  // Regex: path/file.ext:start-end or path/file.ext:line
  // Matches: file.ext:12-34 OR file.ext:12 OR file.ext
  const match = cleanStr.match(/^([^:]+)(?::(\d+)(?:-(\d+))?)?$/);

  if (match) {
    const filePath = match[1].trim();
    let start: number | null = null;
    let end: number | null = null;
    if (match[2] && match[3]) {
      start = parseInt(match[2], 10);
      end = parseInt(match[3], 10);
    } else if (match[2]) {
      start = parseInt(match[2], 10);
      end = start;
    }
    return { File: filePath, startLine: start, endLine: end };
  }

  return { File: cleanStr, startLine: null, endLine: null };
}

/**
 * Parses a markdown string containing security findings into a structured format.
 * The markdown should follow a specific format where each finding starts with "Vulnerability:" and includes fields like "Severity:", "Source Location:", etc.
 * The function uses regular expressions to extract the relevant information and returns an array of findings.
 *
 * @param content - The markdown string to parse.
 * @returns An array of structured findings extracted from the markdown.
 */
export function parseMarkdownToDict(content: string): Finding[] {
  const findings: Finding[] = [];

  // Remove markdown formatting (bullet points at line start, ** markers), preserve hyphens in text
  const cleanContent = content.replace(/^\s*[\*\-]\s*/gm, '').replace(/\*\*/g, '');
  
  // Split each finding by "Vulnerability:" preceded by newline
  const sections = cleanContent.split(/\n(?=#{1,6} |\s*Vulnerability:)/);

  for (let section of sections) {
    section = section.trim();
    if (!section || !section.includes("Vulnerability:")) continue;

    const extract = (label: string): string | null => {
      const fieldNames = 'Vulnerability Type|Severity|Source Location|Sink Location|Data Type|Line Content|Description|Recommendation';
      const patternStr = `(?:-?\\s*\\**)?${label}\\**:\\s*([\\s\\S]*?)(?=\\n(?:-?\\s*\\**)?(?:${fieldNames})|$)`;
      const pattern = new RegExp(patternStr, 'i');
      const match = section.match(pattern);
      return match ? match[1].trim() : null;
    };

    const rawSource = extract("Source Location");
    const rawSink = extract("Sink Location");

    let lineContent = extract("Line Content");
    if (lineContent) {
      lineContent = lineContent.replace(/^```[a-z]*\n|```$/gm, '').trim();
    }

    findings.push({
      vulnerability: extract("Vulnerability"),
      vulnerabilityType: extract("Vulnerability Type"),
      severity: extract("Severity"),
      extension: {
        sourceLocation: parseLocation(rawSource),
        sinkLocation: parseLocation(rawSink),
        dataType: extract("Data Type")
      },
      lineContent,
      description: extract("Description"),
      recommendation: extract("Recommendation")
    });
  }

  return findings;
}
