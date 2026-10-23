<div align="center">

<img src="icon.png" width="128" height="128" alt="Web3 Smart Contract Security Audit & Gas Action Logo" />

# Web3 Smart Contract Security Audit & Gas Action

### Continuous Smart Contract Security Auditing, Invariant Fuzzing & Gas Optimization for GitHub Actions

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Web3%20Security%20Audit-2563eb.svg?style=for-the-badge&logo=github&logoColor=white)](https://github.com/marketplace)
[![SARIF 2.1.0](https://img.shields.io/badge/SARIF-2.1.0%20Compliant-10b981.svg?style=for-the-badge&logo=securityscorecard&logoColor=white)](https://sarifweb.azurewebsites.net)
[![GitHub Actions](https://img.shields.io/badge/Node.js-v20%20LTS-3b82f6.svg?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Security Standard](https://img.shields.io/badge/Standard-OWASP%20Web3%20Top%2010-059669.svg?style=for-the-badge)](https://owasp.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Automate security checks on every Pull Request.</b><br/>
  Detect reentrancy bugs, access control vulnerabilities, and calldata gas bloat before your Solidity & Rust smart contracts hit mainnet.
</p>

[Quickstart](#-quickstart-workflow) • [Key Features](#-key-features) • [Inputs & Outputs](#-inputs--parameters) • [SARIF Code Scanning](#-github-code-scanning-integration) • [Security Rules](#-vulnerability-rules-covered)

---

</div>

## 💡 Why Add Web3 Security Audit to Your CI/CD?

Securing smart contracts after deployment is impossible without costly proxies or emergency pause procedures. Most multimillion-dollar DeFi hacks occur due to common logic errors overlooked during code reviews.

**Web3 Smart Contract Security Audit & Gas Action** brings enterprise-grade automated security gating directly to your GitHub CI/CD pipeline:
- 🚫 **Block Vulnerable PRs**: Automatically fails Pull Requests if `CRITICAL` (Reentrancy, Selfdestruct) or `HIGH` (`tx.origin` phishing, unchecked calls) vulnerabilities are introduced.
- 📊 **GitHub Step Summary**: Automatically produces a clean, high-visibility summary table inside the GitHub Actions run summary.
- 🛡️ **Native SARIF 2.1.0 Integration**: Feeds security findings directly into your repository's **Security > Code Scanning Alerts** tab.
- ⚡ **Automated Gas Optimization Audit**: Flags wasteful string reverts, unoptimized memory parameters, and redundant loop counters.
- 🏎️ **Ultra-Fast Sub-Second Execution**: Built with zero external runtime dependencies in native Node.js 20, executing full audits in under 1 second.

---

## ⚡ Quickstart Workflow

Create `.github/workflows/web3-audit.yml` in your repository:

```yaml
name: "Web3 Smart Contract Security & Gas Audit"

on:
  push:
    branches: [ "main", "develop" ]
  pull_request:
    branches: [ "main" ]

jobs:
  security-audit:
    name: "Audit Contracts & Profile Gas"
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      pull-requests: write

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Run Web3 Security Audit Action
        uses: duongynhi000005-oss/web3-security-audit-action@v1
        with:
          contracts_dir: "contracts"
          fail_on_critical: "true"
          sarif_output: "web3-audit.sarif"

      - name: Upload SARIF to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: "web3-audit.sarif"
```

---

## 📸 Automated GitHub Step Summary Output

When this Action executes on a Pull Request, it automatically publishes an interactive visual breakdown:

```markdown
## 🛡️ Web3 Smart Contract Security Audit Report

| Metric | Count |
|---|---|
| 🔴 Critical Severity | **1** |
| 🟠 High Severity | **1** |
| 🟡 Medium Severity | **0** |
| ⚡ Gas Optimizations | **3** |

### 🔍 Security Findings

| Severity | Rule | File:Line | Title | Recommendation |
|---|---|---|---|---|
| **CRITICAL** | `SEC-003` | `contracts/Vault.sol:21` | Potential Reentrancy: State Update After External Call | Follow Check-Effects-Interactions pattern: update balances before external call |
| **HIGH** | `SEC-001` | `contracts/Vault.sol:17` | Use of tx.origin for Authentication | Replace tx.origin with msg.sender |

### ⚡ Gas Optimization Opportunities

| Rule | File:Line | Title | Est. Gas Saved | Recommendation |
|---|---|---|---|---|
| `CUSTOM_ERROR_OVER_REQUIRE_STRING` | `contracts/Vault.sol:18` | Use Custom Errors instead of String Reverts | ~250 gas | Replace require string with custom error revert |
| `CALLDATA_PARAMETER_FOR_EXTERNAL_FUNCTIONS` | `contracts/Vault.sol:24` | Use calldata instead of memory for external function arguments | ~420 gas | Change modifier from memory to calldata |
| `UNCHECKED_LOOP_INCREMENT` | `contracts/Vault.sol:25` | Use unchecked { ++i; } in for-loops | ~85 gas/iter | Wrap loop increment in unchecked block |
```

---

## ⚙️ Inputs & Parameters

| Input Parameter | Required | Default Value | Description |
|---|:---:|:---:|---|
| `contracts_dir` | No | `.` | Directory containing smart contracts to scan (`.sol` and `.rs` files). Automatically skips `node_modules`, `artifacts`, and `cache`. |
| `fail_on_critical` | No | `true` | When set to `true`, exits with status code `1` if any `CRITICAL` or `HIGH` vulnerabilities are discovered, failing the CI/CD pipeline. |
| `sarif_output` | No | `web3-audit.sarif` | Destination file path for generated SARIF 2.1.0 output report. |
| `github_token` | No | `${{ github.token }}` | GitHub Personal Access Token used to authenticate and post pull request annotations. |

---

## 🛡️ GitHub Code Scanning Integration

By piping the generated `web3-audit.sarif` file into `github/codeql-action/upload-sarif@v3`, all detected vulnerabilities automatically populate in your repository's native GitHub Security Dashboard:

1. Go to your repository on GitHub.
2. Click the **Security** tab.
3. Select **Code scanning alerts**.
4. View line-by-line triage, branch comparisons, and automated alert dismissal upon resolution.

---

## 🔍 Vulnerability Rules Covered

| Rule ID | Severity | Identifier | Security Description |
|:---:|:---:|---|---|
| `SEC-001` | **HIGH** | `TX_ORIGIN_AUTHORIZATION` | Detects `tx.origin` used in authorization checks, leaving contracts vulnerable to phishing attacks. |
| `SEC-002` | **HIGH** | `UNCHECKED_LOW_LEVEL_CALL` | Flags low-level `.call{value: ...}("")` without boolean success verification. |
| `SEC-003` | **CRITICAL** | `REENTRANCY_CHECK_EFFECTS_INTERACTION` | Identifies state modifications occurring after raw ether transfers or untrusted external calls. |
| `SEC-004` | **CRITICAL** | `DANGEROUS_SELFDESTRUCT` | Flags unprotected `selfdestruct` or `suicide` instructions that allow arbitrary destruction of contract state. |
| `SEC-005` | **LOW** | `MISSING_ZERO_ADDRESS_CHECK` | Identifies address setter functions that lack validation against `address(0)`. |

---

## ⚡ Gas Optimization Rules Covered

| Rule ID | Gas Saved | Optimization Description |
|:---:|:---:|---|
| `GAS-001` | **~85 gas / iter** | **Unchecked Loop Increment**: Replaces checked arithmetic in loops with `unchecked { ++i; }` (Solidity 0.8+). |
| `GAS-002` | **~250 gas / revert** | **Custom Errors**: Replaces runtime string reverts with gas-efficient custom errors (`error MyError();`). |
| `GAS-003` | **~420 gas / array** | **Calldata Parameter**: Replaces `memory` with `calldata` for read-only external function arguments. |
| `GAS-004` | **~6 gas / check** | **Non-Zero Comparison**: Uses `!= 0` instead of `> 0` to leverage cheaper `ISZERO` opcode over `GT`. |

---

## 💻 Monorepo & Multi-Framework Support

### Foundry Projects
```yaml
- name: Audit Foundry Contracts
  uses: duongynhi000005-oss/web3-security-audit-action@v1
  with:
    contracts_dir: "src"
    fail_on_critical: "true"
```

### Hardhat Projects
```yaml
- name: Audit Hardhat Contracts
  uses: duongynhi000005-oss/web3-security-audit-action@v1
  with:
    contracts_dir: "contracts"
```

### Solana / Anchor Projects
```yaml
- name: Audit Solana Anchor Programs
  uses: duongynhi000005-oss/web3-security-audit-action@v1
  with:
    contracts_dir: "programs"
```

---

## 🛡️ License

Released under the **MIT License**. Free for public and private repositories, open-source projects, and commercial protocols.

---

<div align="center">
  <b>Protect your protocols before they go live.</b><br/>
  ⭐ Found this Action useful? Star the repository on GitHub and share it with your team!
</div>
