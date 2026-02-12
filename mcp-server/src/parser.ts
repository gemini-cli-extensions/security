/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Location {
  file: string | null;
  startLine: number | null;
  endLine: number | null;
}

export interface Finding {
  vulnerability: string | null;
  vulnerabilityType: string | null;
  severity: string | null;
  dataType: string | null;
  sourceLocation: Location;
  sinkLocation: Location;
  lineContent: string | null;
  description: string | null;
  recommendation: string | null;
  codeSuggestion?: string | null;
}

const FIELD_NAMES = [
  'Vulnerability',
  'Vulnerability Type',
  'Severity',
  'Source',
  'Sink',
  'Data',
  'Data Type',
  'Line',
  'Description',
  'Recommendation',
].join('|'); // add labels here
const patternCache = new Map<string, RegExp>();
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds and caches a regex pattern for a given label to extract its content from a markdown section.
 * The pattern looks for the label followed by a colon and captures everything until the next field or end of section.
 *
 * @param label - The label for which to build the regex pattern (e.g., "Vulnerability", "Severity").
 * @returns A RegExp object that can be used to extract the content for the specified label.
 */
const buildPattern = (label: string) => {
  const key = label.toLowerCase();
  if (patternCache.has(key)) return patternCache.get(key)!;
  const escapedLabel = escapeRegExp(label);
  const rx = new RegExp(
    `(?:-?\\s*\\**)?${escapedLabel}\\**:\\s*([\\s\\S]*?)(?=\\n(?:-?\\s*\\**)?(?:${FIELD_NAMES})|$)`,
    'i'
  );
  patternCache.set(key, rx);
  return rx;
};

/**
 * Helper function to extract a specific field from a markdown section using a label.
 * It constructs a regex pattern based on the label and captures the content until the next field or end of section.
 *
 * @param section - The markdown section to search within.
 * @param label - The label of the field to extract (e.g., "Vulnerability", "Severity").
 * @returns The extracted content for the specified label, or null if not found.
 */
function extractFromSection(section: string, label: string): string | null {
  const pattern = buildPattern(label);
  const match = section.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * Parses a location string into a structured Location object.
 * The string can be in formats like "path/to/file.js:10-20", "path/to/file.js:10", or just "path/to/file.js".
 *
 * @param locationStr - The location string to parse.
 * @returns A Location object with file, startLine, and endLine properties.
 */
function parseLocation(locationStr: string | null): Location {
  if (!locationStr) {
    return { file: null, startLine: null, endLine: null };
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
    return { file: filePath, startLine: start, endLine: end };
  }

  return { file: cleanStr, startLine: null, endLine: null };
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

  // TODO: Implement safeguards such as input length limits and complexity checks on the markdown content before parsing.
  // Consider using a more robust markdown parser library if performance becomes an issue.

  // Remove markdown bullet points (only at line start), markdown emphasis, and preserve hyphens/underscores in text
  const cleanContent = content
    .replace(/^\s*[\*\-]\s*/gm, '') // Remove bullet points at line start
    .replace(/\*\*/g, ''); // Remove ** markdown
  
  // Split by "Vulnerability:" preceded by newline
  const sections = cleanContent.split(/\n(?=#{1,6} |\s*Vulnerability:)/);

  for (let section of sections) {
    section = section.trim();
    if (!section || !section.includes("Vulnerability:")) continue;

    const rawSource = extractFromSection(section, "Source Location");
    const rawSink = extractFromSection(section, "Sink Location");

    let lineContent = extractFromSection(section, "Line Content");
    if (lineContent) {
      lineContent = lineContent.replace(/^```[a-z]*\n|```$/gm, '').trim();
    }

    let codeSuggestion: string | null = null;
    let recommendation = extractFromSection(section, "Recommendation");
    if (recommendation) {
      // Extract code blocks from recommendation (```language...code...```)
      const codeMatch = recommendation.match(/```[a-z]*\n([\s\S]*?)```/);
      codeSuggestion = codeMatch ? codeMatch[1].trim() : null;

      // Remove code blocks from recommendation text
      recommendation = recommendation.replace(/```[a-z]*\n[\s\S]*?```/g, '').trim();
    }

    findings.push({
      vulnerability: extractFromSection(section, "Vulnerability"),
      vulnerabilityType: extractFromSection(section, "Vulnerability Type"),
      severity: extractFromSection(section, "Severity"),
      dataType: extractFromSection(section, "Data Type"),
      sourceLocation: parseLocation(rawSource),
      sinkLocation: parseLocation(rawSink),
      lineContent,
      description: extractFromSection(section, "Description"),
      recommendation,
      codeSuggestion
    } as Finding);
  }

  return findings;
}
