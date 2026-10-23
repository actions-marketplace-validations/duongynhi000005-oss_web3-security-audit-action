/**
 * Web3 Smart Contract Security Audit & Gas Action
 * GitHub Action Runner for automated CI/CD smart contract security auditing and gas optimization.
 */

const fs = require('fs');
const path = require('path');

let securityAuditFn;
let gasOptimizeFn;

try {
  const sec = require('./security_rules');
  securityAuditFn = sec.auditSolidityCode;
  const gas = require('./gas_rules');
  gasOptimizeFn = gas.optimizeGas || gas.optimizeGasSolidity;
} catch (e) {
  try {
    const sec = require('../shared_rules/security_rules');
    securityAuditFn = sec.auditSolidityCode;
    const gas = require('../shared_rules/gas_rules');
    gasOptimizeFn = gas.optimizeGas || gas.optimizeGasSolidity;
  } catch (err) {
    console.error('Fatal: Shared audit rules could not be loaded:', err.message);
    process.exit(1);
  }
}

function findContractFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', 'artifacts', 'cache'].includes(item.name)) {
        findContractFiles(fullPath, fileList);
      }
    } else if (item.isFile()) {
      if (item.name.endsWith('.sol') || item.name.endsWith('.rs')) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function generateSarifReport(allFindings) {
  return {
    version: "2.1.0",
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "Web3 Smart Contract Security Auditor",
            version: "1.0.0",
            informationUri: "https://github.com/duongynhi18/cashflow-suite",
            rules: [
              {
                id: "SEC-001",
                name: "TxOriginAuthorization",
                shortDescription: { text: "Use of tx.origin for Authentication" },
                defaultConfiguration: { level: "error" }
              },
              {
                id: "SEC-002",
                name: "UncheckedLowLevelCall",
                shortDescription: { text: "Unchecked Return Value of Low-Level Call" },
                defaultConfiguration: { level: "error" }
              },
              {
                id: "SEC-003",
                name: "PotentialReentrancy",
                shortDescription: { text: "Reentrancy state update after external call" },
                defaultConfiguration: { level: "error" }
              }
            ]
          }
        },
        results: allFindings.map(f => ({
          ruleId: f.id || "SEC-GENERIC",
          level: (f.severity === "CRITICAL" || f.severity === "HIGH") ? "error" : "warning",
          message: { text: `${f.title}: ${f.description} Remediation: ${f.remediation}` },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: f.filePath.replace(/\\/g, '/') },
                region: { startLine: f.line || 1 }
              }
            }
          ]
        }))
      }
    ]
  };
}

async function run() {
  console.log("==================================================");
  console.log(" [ACTION] Web3 Smart Contract Security & Gas Audit");
  console.log("==================================================");

  const contractsDir = process.env.INPUT_CONTRACTS_DIR || process.env.INPUT_CONTRACT_DIR || '.';
  const failOnCritical = (process.env.INPUT_FAIL_ON_CRITICAL || 'true').toLowerCase() === 'true';
  const sarifPath = process.env.INPUT_SARIF_OUTPUT || 'web3-audit.sarif';

  console.log(`[INFO] Scanning directory: ${contractsDir}`);
  const files = findContractFiles(contractsDir);
  console.log(`[INFO] Found ${files.length} smart contract file(s).`);

  if (files.length === 0) {
    console.log("[NOTICE] No .sol or .rs files found in target directory.");
    return;
  }

  const allFindings = [];
  const allGasOptimizations = [];

  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    const secResult = securityAuditFn(code);
    if (secResult && secResult.findings) {
      for (const finding of secResult.findings) {
        allFindings.push({ ...finding, filePath: path.relative(process.cwd(), file) });
      }
    }

    if (gasOptimizeFn) {
      const gasResult = gasOptimizeFn(code);
      if (gasResult && gasResult.optimizations) {
        for (const opt of gasResult.optimizations) {
          allGasOptimizations.push({ ...opt, filePath: path.relative(process.cwd(), file) });
        }
      }
    }
  }

  const criticals = allFindings.filter(f => f.severity === 'CRITICAL');
  const highs = allFindings.filter(f => f.severity === 'HIGH');
  const mediums = allFindings.filter(f => f.severity === 'MEDIUM');

  console.log(`\nAudit Summary:`);
  console.log(` - Critical: ${criticals.length}`);
  console.log(` - High:     ${highs.length}`);
  console.log(` - Medium:   ${mediums.length}`);
  console.log(` - Gas Opts: ${allGasOptimizations.length}`);

  // Write SARIF report
  const sarifReport = generateSarifReport(allFindings);
  fs.writeFileSync(sarifPath, JSON.stringify(sarifReport, null, 2), 'utf8');
  console.log(`[SUCCESS] SARIF report written to: ${sarifPath}`);

  // GitHub Step Summary Output
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  let markdown = `## 🛡️ Web3 Smart Contract Security Audit Report\n\n`;
  markdown += `| Metric | Count |\n|---|---|\n`;
  markdown += `| 🔴 Critical Severity | **${criticals.length}** |\n`;
  markdown += `| 🟠 High Severity | **${highs.length}** |\n`;
  markdown += `| 🟡 Medium Severity | **${mediums.length}** |\n`;
  markdown += `| ⚡ Gas Optimizations | **${allGasOptimizations.length}** |\n\n`;

  if (allFindings.length > 0) {
    markdown += `### 🔍 Security Findings\n\n`;
    markdown += `| Severity | Rule | File:Line | Title | Recommendation |\n`;
    markdown += `|---|---|---|---|---|\n`;
    for (const f of allFindings) {
      markdown += `| **${f.severity}** | \`${f.id}\` | \`${f.filePath}:${f.line}\` | ${f.title} | ${f.remediation} |\n`;
    }
  } else {
    markdown += `\n> ✅ **All security invariants and sanity checks passed cleanly! No vulnerabilities discovered.**\n`;
  }

  if (allGasOptimizations.length > 0) {
    markdown += `\n### ⚡ Gas Optimization Opportunities\n\n`;
    markdown += `| Rule | File:Line | Title | Est. Gas Saved | Recommendation |\n`;
    markdown += `|---|---|---|---|---|\n`;
    for (const opt of allGasOptimizations) {
      markdown += `| \`${opt.rule}\` | \`${opt.filePath}:${opt.line}\` | ${opt.title} | **~${opt.gas_saved || 0} gas** | ${opt.remediation} |\n`;
    }
  }

  if (summaryFile && fs.existsSync(path.dirname(summaryFile))) {
    fs.appendFileSync(summaryFile, markdown, 'utf8');
    console.log('[OK] Appended report to GITHUB_STEP_SUMMARY.');
  }

  const isDryRun = process.argv.includes('--dry-run');

  if (failOnCritical && (criticals.length > 0 || highs.length > 0)) {
    if (isDryRun) {
      console.log(`\n[DRY-RUN] Verified vulnerability gating: Found ${criticals.length} CRITICAL and ${highs.length} HIGH issues.`);
      console.log('[DRY-RUN] Action dry-run validation passed cleanly with exit code 0.');
    } else {
      console.error(`\n[FATAL] Job failed due to ${criticals.length} CRITICAL and ${highs.length} HIGH vulnerabilities.`);
      process.exit(1);
    }
  } else {
    console.log('\n[PASS] Security audit finished with passing grade.');
  }
}

if (require.main === module) {
  run().catch(err => {
    console.error('Action error:', err);
    process.exit(1);
  });
}

module.exports = { run, findContractFiles, generateSarifReport };
