#!/usr/bin/env node

/**
 * ARIA Coverage Analysis Script
 * Analyzes the React/TypeScript codebase for ARIA attribute usage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, './src');

// ARIA attributes to track
const ariaPatterns = {
  'aria-label': /aria-label=['"]([^'"]*)['"]/g,
  'aria-labelledby': /aria-labelledby=['"]([^'"]*)['"]/g,
  'aria-describedby': /aria-describedby=['"]([^'"]*)['"]/g,
  'aria-hidden': /aria-hidden=['"]([^'"]*)['"]/g,
  'aria-live': /aria-live=['"]([^'"]*)['"]/g,
  'aria-atomic': /aria-atomic=['"]([^'"]*)['"]/g,
  'aria-relevant': /aria-relevant=['"]([^'"]*)['"]/g,
  'aria-busy': /aria-busy=['"]([^'"]*)['"]/g,
  'aria-disabled': /aria-disabled=['"]([^'"]*)['"]/g,
  'aria-expanded': /aria-expanded=['"]([^'"]*)['"]/g,
  'aria-haspopup': /aria-haspopup=['"]([^'"]*)['"]/g,
  'aria-pressed': /aria-pressed=['"]([^'"]*)['"]/g,
  'aria-selected': /aria-selected=['"]([^'"]*)['"]/g,
  'aria-checked': /aria-checked=['"]([^'"]*)['"]/g,
  'aria-required': /aria-required=['"]([^'"]*)['"]/g,
  'aria-invalid': /aria-invalid=['"]([^'"]*)['"]/g,
  'aria-valuenow': /aria-valuenow=['"]([^'"]*)['"]/g,
  'aria-valuemin': /aria-valuemin=['"]([^'"]*)['"]/g,
  'aria-valuemax': /aria-valuemax=['"]([^'"]*)['"]/g,
  'aria-level': /aria-level=['"]([^'"]*)['"]/g,
  'aria-current': /aria-current=['"]([^'"]*)['"]/g,
  'role': /role=['"]([^'"]*)['"]/g,
};

const semanticElements = {
  'nav': /<nav/gi,
  'main': /<main/gi,
  'button': /<button/gi,
  'input': /<input/gi,
  'label': /<label/gi,
  'form': /<form/gi,
  'section': /<section/gi,
  'article': /<article/gi,
  'header': /<header/gi,
  'footer': /<footer/gi,
  'aside': /<aside/gi,
  'fieldset': /<fieldset/gi,
  'legend': /<legend/gi,
};

let stats = {
  filesAnalyzed: 0,
  totalLines: 0,
  ariaAttributes: {},
  semanticElements: {},
  filesWithAriaIssues: [],
};

// Initialize counters
Object.keys(ariaPatterns).forEach(attr => {
  stats.ariaAttributes[attr] = 0;
});
Object.keys(semanticElements).forEach(elem => {
  stats.semanticElements[elem] = 0;
});

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  stats.filesAnalyzed++;
  stats.totalLines += content.split('\n').length;

  let fileHasIssues = false;
  const fileStats = { ariaAttrs: 0, semanticElemsWithoutAria: [] };

  // Count ARIA attributes
  Object.keys(ariaPatterns).forEach(attr => {
    const matches = content.match(ariaPatterns[attr]);
    if (matches) {
      stats.ariaAttributes[attr] += matches.length;
      fileStats.ariaAttrs += matches.length;
    }
  });

  // Count semantic elements
  Object.keys(semanticElements).forEach(elem => {
    const matches = content.match(semanticElements[elem]);
    if (matches) {
      stats.semanticElements[elem] += matches.length;
    }
  });

  // Check for interactive elements without ARIA
  const interactivePatterns = [
    { pattern: /<div\s+onClick/gi, name: 'onClick div' },
    { pattern: /<span\s+onClick/gi, name: 'onClick span' },
    { pattern: /<a\s+(?!href)/gi, name: 'anchor without href' },
  ];

  interactivePatterns.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches) {
      fileHasIssues = true;
      fileStats.semanticElemsWithoutAria.push({
        type: name,
        count: matches.length,
      });
    }
  });

  if (fileHasIssues) {
    stats.filesWithAriaIssues.push({
      file: path.relative(srcDir, filePath),
      issues: fileStats.semanticElemsWithoutAria,
    });
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.startsWith('.')
      && file !== 'main.ts') {
      analyzeFile(filePath);
    }
  });
}

// Run analysis
walkDir(srcDir);

// Calculate percentages
const totalAriaAttributes = Object.values(stats.ariaAttributes).reduce((a, b) => a + b, 0);
const totalSemanticElements = Object.values(stats.semanticElements).reduce((a, b) => a + b, 0);

// Print report
console.log('\n========================================');
console.log('  ARIA COVERAGE ANALYSIS REPORT');
console.log('========================================\n');

console.log(` Overall Statistics:`);
console.log(`  • Files Analyzed: ${stats.filesAnalyzed}`);
console.log(`  • Total Lines of Code: ${stats.totalLines.toLocaleString()}`);
console.log(`  • Total ARIA Attributes: ${totalAriaAttributes}`);
console.log(`  • Total Semantic Elements: ${totalSemanticElements}\n`);

console.log(`  ARIA Attributes Found:`);
const sortedAria = Object.entries(stats.ariaAttributes)
  .filter(([, count]) => count > 0)
  .sort((a, b) => b[1] - a[1]);

if (sortedAria.length === 0) {
  console.log(`    No ARIA attributes found in codebase\n`);
} else {
  sortedAria.forEach(([attr, count]) => {
    console.log(`  • ${attr}: ${count}`);
  });
  console.log();
}

console.log(` Semantic Elements Found:`);
const sortedSemantic = Object.entries(stats.semanticElements)
  .filter(([, count]) => count > 0)
  .sort((a, b) => b[1] - a[1]);

if (sortedSemantic.length === 0) {
  console.log(`    No semantic elements found\n`);
} else {
  sortedSemantic.forEach(([elem, count]) => {
    console.log(`  • ${elem}: ${count}`);
  });
  console.log();
}

console.log(`  Potential Accessibility Issues:`);
if (stats.filesWithAriaIssues.length === 0) {
  console.log(`   No obvious issues detected\n`);
} else {
  console.log(`  Found ${stats.filesWithAriaIssues.length} files with potential issues:\n`);
  stats.filesWithAriaIssues.forEach(({ file, issues }) => {
    console.log(`   ${file}`);
    issues.forEach(issue => {
      console.log(`     - ${issue.type}: ${issue.count} occurrence(s)`);
    });
  });
  console.log();
}

// Estimate ARIA Coverage Score
const estimatedCoverage = totalAriaAttributes > 0 
  ? Math.min(100, Math.round((totalAriaAttributes / (stats.filesAnalyzed * 2)) * 100)) 
  : 0;

console.log(`Estimated ARIA Coverage Score: ${estimatedCoverage}%\n`);

console.log(`Legend:`);
console.log(`  • ARIA Attributes: HTML attributes that provide accessibility information`);
console.log(`  • Semantic Elements: Native HTML elements that convey meaning\n`);
console.log('========================================\n');
