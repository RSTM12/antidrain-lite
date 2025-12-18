import { useState } from "react"
import {
  Wallet,
  JsonRpcProvider,
  Contract,
  parseUnits,
  isAddress,
  isHexString
} from "ethers"

/**
 * RPC TANPA API KEY (AMAN BUAT BELAJAR)
 */
const NETWORKS = {
  ethereum: {
    name: "Ethereum Mainnet",
    rpc: "https://cloudflare-eth.com"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: "https://arb1.arbitrum.io/rpc"
  }
}

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
]

export default function App() {
  const [network, setNetwork] = useState("ethereum")

  // Sponsor wallet (belum dipakai buat tx)
  const [sponsorWallet, setSponsorWallet] = useState(null)

  // Compromised wallet
  const [compKey, setCompKey] = useState("")
  const [compAddress, setCompAddress] = useState("")

  // ERC20 transfer input
  const [token, setToken] = useState("")
  const [receiver, setReceiver] = useState("")
  const [amount, setAmount] = useState("")

  const [txHash, setTxHash] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function generateSponsorWallet() {
    const w = Wallet.createRandom()
    setSponsorWallet(w)
  }

  function validateCompromisedKey() {
    setError("")
    setCompAddress("")

    try {
      if (!isHexString(compKey, 32)) {
        throw new Error("Invalid private key format")
      }
      const w = new Wallet(compKey)
      setCompAddress(w.address)
    } catch (e) {
      setError(e.message)
    }
  }

  async function executeTransfer() {
    setError("")
    setTxHash("")
    setLoading(true)

    try {
      if (!isHexString(compKey, 32)) {
        throw new Error("Invalid compromised private key")
      }
      if (!isAddress(token)) {
        throw new Error("Invalid token address")
      }
      if (!isAddress(receiver)) {
        throw new Error("Invalid receiver address")
      }
      if (!amount || Number(amount) <= 0) {
        throw new Error("Invalid amount")
      }

      const provider = new JsonRpcProvider(NETWORKS[network].rpc)
      const wallet = new Wallet(compKey, provider)

      const erc20 = new Contract(token, ERC20_ABI, wallet)
      const decimals = await erc20.decimals()
      const value = parseUnits(amount, decimals)

      const tx = await erc20.transfer(receiver, value)
      setTxHash(tx.hash)
    } catch (e) {
      setError(e.message || "Execution failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>Antidrain Lite — Phase 3</h2>

        {/* Network */}
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          style={styles.input}
        >
          {Object.entries(NETWORKS).map(([k, n]) => (
            <option key={k} value={k}>
              {n.name}
            </option>
          ))}
        </select>

        {/* Phase 1 */}
        <h3>Phase 1 — Sponsor Wallet</h3>
        <button onClick={generateSponsorWallet} style={styles.buttonSecondary}>
          Generate Sponsor Wallet
        </button>
        {sponsorWallet && (
          <p style={styles.mono}>{sponsorWallet.address}</p>
        )}

        {/* Phase 2 */}
        <h3>Phase 2 — Compromised Wallet</h3>
        <input
          type="password"
          placeholder="Compromised private key (0x...)"
          value={compKey}
          onChange={(e) => setCompKey(e.target.value.trim())}
          style={styles.input}
        />
        <button onClick={validateCompromisedKey} style={styles.buttonSecondary}>
          Validate Private Key
        </button>
        {compAddress && (
          <p style={styles.mono}>Derived: {compAddress}</p>
        )}

        {/* Phase 3 */}
        <h3>Phase 3 — ERC20 Transfer</h3>
        <input
          placeholder="Token contract address"
          value={token}
          onChange={(e) => setToken(e.target.value.trim())}
          style={styles.input}
        />
        <input
          placeholder="Receiver address"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value.trim())}
          style={styles.input}
        />
        <input
          placeholder="Amount (human readable)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={styles.input}
        />

        <button onClick={executeTransfer} style={styles.button}>
          {loading ? "Executing..." : "Execute ERC20 Transfer"}
        </button>

        {txHash && (
          <p style={styles.success}>
            Tx sent: <br />
            <span style={styles.mono}>{txHash}</span>
          </p>
        )}

        {error && <p style={styles.error}>❌ {error}</p>}

        <p style={styles.warning}>
          ⚠️ Ini transfer langsung dari compromised wallet.
          Belum ada proteksi frontrun / sponsor gas.
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0f1a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff"
  },
  card: {
    background: "#131a2a",
    padding: 24,
    borderRadius: 12,
    width: "100%",
    maxWidth: 620
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 8,
    borderRadius: 8
  },
  button: {
    width: "100%",
    padding: 10,
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    marginBottom: 8
  },
  buttonSecondary: {
    width: "100%",
    padding: 10,
    background: "#334155",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    marginBottom: 8
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 13,
    opacity: 0.9
  },
  warning: {
    fontSize: 12,
    color: "#f87171",
    marginTop: 12
  },
  error: {
    color: "#fb7185",
    fontSize: 13
  },
  success: {
    color: "#4ade80",
    fontSize: 13
  }
}

