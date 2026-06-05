// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {SavannaFunctionsConsumer} from "../src/functions/SavannaFunctionsConsumer.sol";

contract SetSource is Script {
    string constant SOURCE = "";

    function run() external {
        address consumer = vm.envAddress("CONSUMER_ADDRESS");
        vm.startBroadcast();
        SavannaFunctionsConsumer(consumer).setSourceCode(SOURCE);
        console2.log("Source code set on consumer:", consumer);
        vm.stopBroadcast();
    }
}
