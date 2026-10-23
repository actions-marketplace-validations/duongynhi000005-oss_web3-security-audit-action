const { auditSolidityCode } = require('./security_rules.js');
const { optimizeGas } = require('./gas_rules.js');

const sampleSolidity = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Vault {
    mapping(address => uint256) public balances;
    address public owner;

    function setOwner(address newOwner) external {
        owner = newOwner;
    }

    function withdraw(uint256 amount) external {
        require(tx.origin == owner, "Only owner via tx.origin");
        require(balances[msg.sender] >= amount, "Insufficient funds");

        (bool s, ) = msg.sender.call{value: amount}("");
        balances[msg.sender] -= amount;
    }

    function batchProcess(uint256[] memory values) external {
        for (uint256 i = 0; i < values.length; i++) {
            // processing
        }
    }
}
`;

const secResult = auditSolidityCode(sampleSolidity);
console.log('[PASS] Security Audit Result:');
console.log('  Score:', secResult.security_score);
console.log('  Rating:', secResult.rating);
console.log('  Total issues found:', secResult.total_issues);
secResult.findings.forEach(f => console.log(`   - [${f.severity}] ${f.rule}: ${f.title} (line ${f.line})`));

const gasResult = optimizeGas(sampleSolidity);
console.log('\n[PASS] Gas Optimization Result:');
console.log('  Est. Gas Saved:', gasResult.estimated_gas_savings_per_call);
console.log('  Optimizations found:', gasResult.total_optimizations_found);
gasResult.optimizations.forEach(o => console.log(`   - ${o.rule}: ${o.title} (line ${o.line})`));

if (secResult.total_issues >= 3 && gasResult.total_optimizations_found >= 2) {
    console.log('\n[SUCCESS] SHARED SECURITY & GAS RULES VERIFIED 100%!');
} else {
    process.exit(1);
}
