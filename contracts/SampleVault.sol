// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SampleVault
 * @notice Test fixture for Web3 Smart Contract Security Audit & Gas Action.
 */
contract SampleVault {
    mapping(address => uint256) public balances;
    address public admin;

    constructor(address _admin) {
        admin = _admin;
    }

    function setAdmin(address newAdmin) external {
        admin = newAdmin;
    }

    function emergencyWithdraw(uint256 amount) external {
        require(tx.origin == admin, "Only admin");
        (bool ok, ) = msg.sender.call{value: amount}("");
        balances[msg.sender] -= amount;
    }

    function batchTransfer(uint256[] memory amounts) external {
        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] > 0) {
                balances[msg.sender] += amounts[i];
            }
        }
    }
}
