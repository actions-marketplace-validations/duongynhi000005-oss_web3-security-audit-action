/**
 * Standalone Web3 Smart Contract Security Audit Engine for VS Code Extension & GitHub Action.
 * Zero-dependency CommonJS & ESM compatible.
 */

function auditSolidityCode(sourceCode) {
    if (!sourceCode || typeof sourceCode !== 'string') {
        return { score: 100, findings: [], total_issues: 0 };
    }

    const lines = sourceCode.split('\n');
    const findings = [];

    let hasReentrancy = false;
    let hasTxOrigin = false;
    let hasUncheckedCall = false;
    let hasSelfDestruct = false;
    let hasMissingZeroCheck = false;
    let hasUnprotectedEtherWithdraw = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();

        // 1. tx.origin authentication check
        if (/tx\.origin\s*==/.test(trimmed) || /require\s*\(\s*tx\.origin/.test(trimmed)) {
            findings.push({
                id: "SEC-001",
                rule: "TX_ORIGIN_AUTHORIZATION",
                severity: "HIGH",
                line: lineNum,
                title: "Use of tx.origin for Authentication",
                description: "tx.origin can be manipulated via phishing attacks through intermediate contracts.",
                remediation: "Replace tx.origin with msg.sender."
            });
            hasTxOrigin = true;
        }

        // 2. Unchecked low-level call return value
        if (/\.call\s*\{/.test(trimmed) && !/(bool\s+\w+\s*=|\(bool\s+\w+,)/.test(trimmed)) {
            findings.push({
                id: "SEC-002",
                rule: "UNCHECKED_LOW_LEVEL_CALL",
                severity: "HIGH",
                line: lineNum,
                title: "Unchecked Return Value of Low-Level Call",
                description: "Low-level .call() does not revert on failure; it returns false. Unchecked calls lead to silent execution failures.",
                remediation: "Capture return status: (bool success, ) = target.call{value: amt}(''); require(success, 'Call failed');"
            });
            hasUncheckedCall = true;
        }

        // 3. Reentrancy Vulnerability (State modification after external call)
        if (/\.call\s*\{value:/.test(trimmed) || /\.transfer\(/.test(trimmed) || /\.send\(/.test(trimmed)) {
            // Check subsequent lines for state assignment
            for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
                const nextLine = lines[j].trim();
                if (/^\w+(\[[^\]]+\])?\s*(-=|\+=|=)/.test(nextLine) && !nextLine.startsWith('emit') && !nextLine.startsWith('require')) {
                    findings.push({
                        id: "SEC-003",
                        rule: "REENTRANCY_CHECK_EFFECTS_INTERACTION",
                        severity: "CRITICAL",
                        line: lineNum,
                        title: "Potential Reentrancy: State Update After External Call",
                        description: `External Ether transfer at line ${lineNum} occurs before state modification at line ${j + 1}.`,
                        remediation: "Follow Check-Effects-Interactions pattern: update balances before making external calls, or use OpenZeppelin ReentrancyGuard nonReentrant."
                    });
                    hasReentrancy = true;
                    break;
                }
            }
        }

        // 4. Unprotected selfdestruct / suicide
        if (/selfdestruct\s*\(/.test(trimmed) || /suicide\s*\(/.test(trimmed)) {
            findings.push({
                id: "SEC-004",
                rule: "DANGEROUS_SELFDESTRUCT",
                severity: "CRITICAL",
                line: lineNum,
                title: "Selfdestruct Instruction Present",
                description: "selfdestruct enables immediate contract destruction and can lock funds or remove logic permanently.",
                remediation: "Remove selfdestruct or enforce strict multi-sig timelocked access control."
            });
            hasSelfDestruct = true;
        }

        // 5. Missing Zero-Address Validation
        if (/function\s+set\w+\s*\([^)]*address\s+(\w+)[^)]*\)/.test(trimmed)) {
            const match = trimmed.match(/function\s+set\w+\s*\([^)]*address\s+(\w+)[^)]*\)/);
            const varName = match ? match[1] : 'addr';
            let hasCheck = false;
            for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
                if (lines[j].includes(varName) && lines[j].includes('address(0)')) {
                    hasCheck = true;
                    break;
                }
            }
            if (!hasCheck) {
                findings.push({
                    id: "SEC-005",
                    rule: "MISSING_ZERO_ADDRESS_CHECK",
                    severity: "LOW",
                    line: lineNum,
                    title: "Missing Zero-Address Validation",
                    description: `Address parameter '${varName}' is not validated against address(0).`,
                    remediation: `Add: require(${varName} != address(0), "Zero address not allowed");`
                });
                hasMissingZeroCheck = true;
            }
        }
    }

    // Security Score Calculation (0 - 100)
    let score = 100;
    findings.forEach(f => {
        if (f.severity === 'CRITICAL') score -= 35;
        else if (f.severity === 'HIGH') score -= 20;
        else if (f.severity === 'MEDIUM') score -= 10;
        else if (f.severity === 'LOW') score -= 5;
    });
    score = Math.max(0, score);

    return {
        security_score: score,
        rating: score >= 90 ? 'SECURE' : (score >= 70 ? 'ADEQUATE' : 'VULNERABLE'),
        total_issues: findings.length,
        findings: findings
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auditSolidityCode };
}
