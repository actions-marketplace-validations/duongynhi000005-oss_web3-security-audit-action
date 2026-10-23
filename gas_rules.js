/**
 * Standalone Web3 Smart Contract Gas Optimization Engine for VS Code Extension & GitHub Action.
 * Zero-dependency CommonJS & ESM compatible.
 */

function optimizeGas(sourceCode) {
    if (!sourceCode || typeof sourceCode !== 'string') {
        return { estimated_gas_savings_per_call: 0, optimizations: [] };
    }

    const lines = sourceCode.split('\n');
    const optimizations = [];
    let totalSavings = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();

        // 1. Unchecked loop increment: for (...; i++) -> unchecked { ++i; }
        if (/for\s*\([^;]+;[^;]+;\s*(\w+)\+\+\s*\)/.test(trimmed)) {
            const match = trimmed.match(/for\s*\([^;]+;[^;]+;\s*(\w+)\+\+\s*\)/);
            const varName = match ? match[1] : 'i';
            optimizations.push({
                id: "GAS-001",
                rule: "UNCHECKED_LOOP_INCREMENT",
                line: lineNum,
                gas_saved: 85,
                title: "Use unchecked { ++i; } in for-loops",
                description: "Since Solidity 0.8+, arithmetic overflows revert by default. Loop indices cannot practically overflow array length; wrapping increment in unchecked saves ~85 gas per iteration.",
                remediation: `Modify loop header and use 'unchecked { ++${varName}; }' at end of loop body.`
            });
            totalSavings += 850; // assuming 10 iterations
        }

        // 2. Custom Error instead of require string
        if (/require\s*\([^,]+,\s*"([^"]+)"\s*\);/.test(trimmed)) {
            const match = trimmed.match(/require\s*\([^,]+,\s*"([^"]+)"\s*\);/);
            const msg = match ? match[1] : "Error";
            optimizations.push({
                id: "GAS-002",
                rule: "CUSTOM_ERROR_OVER_REQUIRE_STRING",
                line: lineNum,
                gas_saved: 250,
                title: "Use Custom Errors instead of String Reverts",
                description: `String revert "${msg}" wastes deployment bytecode size and execution gas for ABI encoding.`,
                remediation: `Define 'error ${msg.replace(/\s+/g, '')}();' and replace require with 'if (!condition) revert ${msg.replace(/\s+/g, '')}();'.`
            });
            totalSavings += 250;
        }

        // 3. Calldata vs Memory parameter
        if (/function\s+\w+\s*\([^)]*string\s+memory\s+(\w+)[^)]*\)\s+external/.test(trimmed) ||
            /function\s+\w+\s*\([^)]*bytes\s+memory\s+(\w+)[^)]*\)\s+external/.test(trimmed) ||
            /function\s+\w+\s*\([^)]*uint256\[\]\s+memory\s+(\w+)[^)]*\)\s+external/.test(trimmed)) {
            optimizations.push({
                id: "GAS-003",
                rule: "CALLDATA_PARAMETER_FOR_EXTERNAL_FUNCTIONS",
                line: lineNum,
                gas_saved: 420,
                title: "Use calldata instead of memory for external function arguments",
                description: "Using 'memory' forces the EVM to allocate memory and copy calldata bytes. 'calldata' reads directly from the execution buffer without allocation cost.",
                remediation: "Change parameter modifier from 'memory' to 'calldata'."
            });
            totalSavings += 420;
        }

        // 4. Strict comparison > 0 instead of != 0 for uint256
        if (/>\s*0/.test(trimmed) && !/int\s+/.test(trimmed)) {
            optimizations.push({
                id: "GAS-004",
                rule: "NON_ZERO_CHECK_OPTIMIZATION",
                line: lineNum,
                gas_saved: 6,
                title: "Use != 0 instead of > 0 for unsigned integers",
                description: "The ISZERO opcode (3 gas) is cheaper than GT opcode comparison for uint256 variables.",
                remediation: "Replace '> 0' with '!= 0'."
            });
            totalSavings += 6;
        }
    }

    return {
        estimated_gas_savings_per_call: totalSavings,
        total_optimizations_found: optimizations.length,
        optimizations: optimizations
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { optimizeGas, optimizeGasSolidity: optimizeGas };
}
