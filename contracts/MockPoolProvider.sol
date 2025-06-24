// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPoolProvider {
    function getPool() external view returns (address) {
        return address(this);
    }
} 