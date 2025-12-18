import { useState } from "react"
import {
  Wallet,
  JsonRpcProvider,
  Contract,
  parseUnits,
  isAddress,
  isHexString,
  TypedDataEncoder
} from "ethers"

/**
 * RPC TANPA API KEY
 */
const NETWORKS = {
  ethereum: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpc: "https://cloudflare-eth.com"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpc: "https://arb1.arbitrum.io/rpc"
  }
}

/**
 * ERC20 + PERMIT ABI
 */
const ERC20_PERMIT_ABI = [
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function nonces(address) view returns (uint256)",
  "function permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
  "function transferFrom(address,address,uint256) returns (bool)"
]

export default function App() {
  const [network, setNetwork] = useState("arbitrum")

  // wallets
  const [sponsor, setSponsor] = useState(null)
  const [compKey, setCompKey] = useState("")
  const [compAddr, setCompAddr] = useState("")

  // inputs
  const [token, setToken] = useState("")
  const [receiver, setReceiver] = useState("")
  const [amount, setAmount] = useState("")

  // state
  const [permitSupported, setPermitSupported] = useState(null)
  const [checking, setChecking] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function generateSponsorWallet() {
    const w = Wallet.createRandom()
    setSponsor(w)
  }

  function validateCompromised() {
    setError("")
    setCompAddr("")
    try {
      if (!isHexString(compKey, 32)) throw new Error("Invalid private key")
      const w = new Wallet(compKey)
      setCompAddr(w.address)
    } catch (e) {
      setError(e.message)
    }
  }

  /**
   * CHECK PERMIT SUPPORT
   */
  async function checkPermitSupport() {
    setPermitSupported(null)
    setError("")
    setChecking(true)

    try {
      if (!isAddress(token)) throw new Error("Invalid token address")
      if (!compAddr) throw new Error("Validate compromised wallet first")

      const net = NETWORKS[network]
      const provider = new JsonRpcProvider(net.rpc)

      const erc20 = new Contract(token, ERC20_PERMIT_ABI, provider)

      // try read permit-related methods
      await erc20.name()
      await erc20.nonces(compAddr)

      setPermitSupported(true)
    } catch {
      setPermitSupported(false)
    } finally {
      setChecking(false)
    }
  }

  /**
   * EXECUTE SPONSORED PERMIT TRANSFER
   */
  async function executeSponsoredTransfer() {
    setLoading(true)
    setError("")
    setTxHash("")

    try {
      if (!permitSupported) throw new Error("Permit not supported")
      if (!sponsor) throw new Error("Sponsor wallet missing")
      if (!isHexString(compKey, 32)) throw new Error("Invalid compromised key")
      if (!isAddress(receiver)) throw new Error("Invalid receiver")
      if (!amount || Number(amount) <= 0) throw new Error("Invalid amount")

      const net = NETWORKS[network]
      const provider = new JsonRpcProvider(net.rpc)

      const compromised = new Wallet(compKey, provider)
      const sponsorSigner = sponsor.connect(provider)

      const erc20 = new Contract(token, ERC20_PERMIT_ABI, provider)

      const name = await erc20.name()
      const decimals = await erc20.decimals()
      const nonce = await erc20.nonces(compromised.address)

      const value = parseUnits(amount, decimals)
      const deadline = Math.floor(Date.now() / 1000) + 300 // 5 menit

      const domain = {
        name,
        version: "1",
        chainId: net.chainId,
        verifyingContract: token
      }

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      }

      const message = {
        owner: compromised.address,
        spender: sponsorSigner.address,
        value,
        nonce,
        deadline
      }

      // SIGN (NO GAS)
      const sig = await compromised.signTypedData(domain, types, message)
      const { v, r, s } = TypedDataEncoder.decodeSignature(sig)

      const erc20Sponsor = erc20.connect(sponsorSigner)

      // permit
      await (await erc20Sponsor.permit(
        compromised.address,
        sponsorSigner.address,
        value,
        deadline,
        v,
        r,
        s
      )).wait()

      // transfer
      const tx = await erc20Sponsor.transferFrom(
        compromised.address,
        receiver,
        value
      )

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
        <h2>Antidrain Lite — Permit Mode</h2>

        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          style={styles.input}
        >
          {Object.entries(NETWORKS).map(([k, n]) => (
            <option key={k} value={k}>{n.name}</option>
          ))}
        </select>

        <h3>Sponsor Wallet</h3>
        <button onClick={generateSponsorWallet} style={styles.buttonSecondary}>
          Generate Sponsor Wallet
        </button>
        {sponsor && <p style={styles.mono}>{sponsor.address}</p>}

        <h3>Compromised Wallet</h3>
        <input
          type="password"
          placeholder="Compromised private key"
          value={compKey}
          onChange={(e) => setCompKey(e.target.value.trim())}
          style={styles.input}
        />
        <button onClick={validateCompromised} style={styles.buttonSecondary}>
          Validate Key
        </button>
        {compAddr && <p style={styles.mono}>{compAddr}</p>}

        <h3>Rescue Setup</h3>
        <input
          placeholder="Token address"
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
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={checkPermitSupport}
          style={styles.buttonSecondary}
        >
          {checking ? "Checking..." : "Check Permit Support"}
        </button>

        {permitSupported === true && (
          <p style={styles.success}>✅ Token supports PERMIT</p>
        )}

        {permitSupported === false && (
          <p style={styles.error}>
            ❌ Token does NOT support permit  
            <br />Rescue blocked to protect wallet
          </p>
        )}

        {permitSupported && (
          <button
            onClick={executeSponsoredTransfer}
            style={styles.button}
            disabled={loading}
          >
            {loading ? "Executing..." : "Execute Sponsored Transfer"}
          </button>
        )}

        {txHash && (
          <p style={styles.success}>
            Tx:<br /><span style={styles.mono}>{txHash}</span>
          </p>
        )}

        {error && <p style={styles.error}>❌ {error}</p>}

        <p style={styles.warning}>
          ⚠️ Fallback TX disabled by design.  
          Tokens without permit are NOT executed.
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
    maxWidth: 640
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
    fontSize: 13
  },
  warning: {
    fontSize: 12,
    color: "#facc15",
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

