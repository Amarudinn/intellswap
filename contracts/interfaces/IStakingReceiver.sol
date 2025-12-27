// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStakingReceiver {
    function receiveRevenue() external payable;
    function totalStaked() external view returns (uint256);
}
