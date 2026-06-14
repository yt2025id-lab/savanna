import { ethers } from "ethers";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────
const CELO_RPC = "https://forno.celo.org";
const CHAIN_ID = 42220;
const CONTROLLER = "0xf4B8358E372aE659a4D9219DD86C61233cE4280e";
const DEPLOYER = "0x757DE1048723381fceB0Ddd301eFC28EeeD6760c";

const CONTROLLER_ABI = [
  "function onReport(bytes calldata, bytes calldata report) external",
];

const TX_COUNT = parseInt(process.argv[2] || "10", 10);
const MODE = (process.argv[3] || "transfer").toLowerCase();

// ── Load private key ────────────────────────────────────────────────
function loadPrivateKey() {
  if (process.env.PRIVATE_KEY) return process.env.PRIVATE_KEY;
  const envPath = resolve(__dirname, "x402-server", ".env");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const m = line.match(/^PRIVATE_KEY=(.+)$/);
      if (m) return m[1].trim();
    }
  }
  throw new Error(
    "Set PRIVATE_KEY env var or ensure offchain/x402-server/.env has it"
  );
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Mode: simple CELO self-transfer ─────────────────────────────────
async function sendTransfers(wallet, count) {
  console.log(`\nSending ${count} self-transfers from ${wallet.address}...`);
  for (let i = 0; i < count; i++) {
    try {
      const tx = await wallet.sendTransaction({
        to: wallet.address,
        value: 0n,
        gasLimit: 30000,
      });
      console.log(`  [${i + 1}/${count}] Tx: ${tx.hash}`);
      await tx.wait();
      console.log(`  ✅ Confirmed`);
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
    }
    await sleep(500);
  }
}

// ── Mode: controller.onReport() calls ───────────────────────────────
async function sendOnReports(wallet, count) {
  console.log(`\nSending ${count} onReport() calls from ${wallet.address}...`);
  const provider = wallet.provider;
  const controller = new ethers.Contract(CONTROLLER, CONTROLLER_ABI, wallet);

  for (let i = 0; i < count; i++) {
    try {
      const protocolId = i % 4; // 0=Aave, 1=Moola, 2=Mento, 3=Reserve
      const report = ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint8", "uint256", "uint256", "string"],
        [DEPLOYER, protocolId, 10000, 850_000_000, "Savanna AI agent"]
      );
      const tx = await controller.onReport("0x", report, {
        gasLimit: 500_000,
      });
      console.log(`  [${i + 1}/${count}] Tx: ${tx.hash} (protocol=${protocolId})`);
      const receipt = await tx.wait();
      const status = receipt.status === 1 ? "✅" : "❌";
      console.log(`  ${status} Confirmed (gasUsed=${receipt.gasUsed})`);
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
    }
    await sleep(1000);
  }
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  const pk = loadPrivateKey();
  const provider = new ethers.JsonRpcProvider(CELO_RPC);
  const wallet = new ethers.Wallet(pk, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Wallet: ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} CELO`);
  console.log(`Tx count: ${TX_COUNT}`);
  console.log(`Mode: ${MODE}`);

  if (MODE === "onreport") {
    await sendOnReports(wallet, TX_COUNT);
  } else {
    await sendTransfers(wallet, TX_COUNT);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
