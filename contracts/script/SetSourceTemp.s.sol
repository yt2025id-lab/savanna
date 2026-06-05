// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {SavannaFunctionsConsumer} from "../src/functions/SavannaFunctionsConsumer.sol";

contract SetSourceTemp is Script {
    function run() external {
        address consumer = vm.envAddress("CONSUMER_ADDRESS");
        string memory source = vm.readFile("./functions/source.js");

        vm.startBroadcast();
        SavannaFunctionsConsumer(consumer).setSourceCode(source);
        console2.log("Source code set!");
        vm.stopBroadcast();
    }
}
