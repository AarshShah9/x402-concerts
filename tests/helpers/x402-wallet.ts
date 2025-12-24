import { privateKeyToAccount } from "viem/accounts";
import { env } from "../../src/lib/env";

/**
 * Get wallet address from private key
 */
export function getWalletAddress(): string {
  const signer = privateKeyToAccount(
    env.TEST_WALLET_PRIVATE_KEY as `0x${string}`,
  );
  return signer.address;
}

/**
 * Check wallet balances on Base Sepolia
 */
export async function checkWalletBalances(): Promise<{
  ethBalance: number;
  usdcBalance: number;
}> {
  const address = getWalletAddress();

  try {
    // Check ETH balance using viem
    const { createPublicClient, http } = await import("viem");
    const { baseSepolia } = await import("viem/chains");

    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    const ethBalance = await client.getBalance({
      address: address as `0x${string}`,
    });

    // Check USDC balance (Base Sepolia USDC address)
    const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

    // ERC20 balanceOf ABI
    const balanceOfAbi = [
      {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ] as const;

    const usdcBalance = await client.readContract({
      address: usdcAddress as `0x${string}`,
      abi: balanceOfAbi,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    return {
      ethBalance: Number(ethBalance) / 1e18,
      usdcBalance: Number(usdcBalance) / 1e6,
    };
  } catch (error) {
    console.error("Error checking balances:", error.message);
    return {
      ethBalance: 0,
      usdcBalance: 0,
    };
  }
}

/**
 * Check if wallet is configured for testing
 */
export function isWalletConfigured(): {
  isValid: boolean;
  message: string;
} {
  if (
    !env.TEST_WALLET_PRIVATE_KEY ||
    env.TEST_WALLET_PRIVATE_KEY.length === 0
  ) {
    return {
      isValid: false,
      message: "TEST_WALLET_PRIVATE_KEY is not set",
    };
  }

  // Check if it's a valid hex private key (starts with 0x and is 66 characters total)
  const privateKey = env.TEST_WALLET_PRIVATE_KEY;
  const isValidFormat = privateKey.startsWith("0x") && privateKey.length === 66;

  if (!isValidFormat) {
    return {
      isValid: false,
      message: `TEST_WALLET_PRIVATE_KEY is set but invalid format, expected 0x followed by 64 hex characters but got ${privateKey.substring(0, 10)}... (length: ${privateKey.length})`,
    };
  }

  return {
    isValid: true,
    message: "TEST_WALLET_PRIVATE_KEY is set and valid",
  };
}
