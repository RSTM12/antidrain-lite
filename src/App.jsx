import { useState } from "react"
import {
  Wallet,
  JsonRpcProvider,
  formatEther,
  isHexString
} from "ethers"

/**
 * Supported networks
 */
const NETWORKS = {
  ethereum: {
    name: "Ethereum Mainnet",
    rpc: "https://rpc.ankr.com/eth"
  },
  arbitrum: {
    name: "Arbitrum One",
    rpc: "https://rpc.ankr.com/arbitrum"
  }
}

export default function App() {
  // Phase 1 state
  const [sponsorWallet, setSponsorWallet] = useState(null)
  const [network, setNetwork] = useState("ethereum")
  const [balance, setBalance] = useState(null)
  const [balanceError, setBalanceError] = useState(false)
  const [loading, setLoading] = useState(false)

  // Phase 2 state
  const [compKey, setCompKey] = useState("")
  const [compWallet, setCompWallet] = useState(null)
  const [compError, setCompError] = useState("")

  /**
   * Generate sponsor wallet
   */
  async function generateSponsorWallet() {
    setLoading(true)
    setBalance(null)
    setBalanceError(false)

    const w = Wallet.createRandom()
    const data = {
      address: w.address,
      privateKey: w.privateKey,
      mnemonic: w.mnemonic.phrase
    }
    setSponsorWallet(data)

    try {
      const provider = new JsonRpcProvider(NETWORKS[network].rpc)
      const bal = await provider.getBalance(data.address)
      setBalance(formatEther(bal))
    } catch {
      setBalanceError(true)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Validate compromised private key (LOCAL ONLY)
   */
  function validateCompromisedKey() {
    setCompError("")
    setCompWallet(null)

    try {
      if (!isHexString(compKey, 32)) {
        throw new Error("Invalid private key format")
      }

      const provider = new JsonRpcProvider(NETWORKS[network].rpc)
      const w = new Wallet(compKey, provider)

      setCompWallet({
        address: w.address
      })
    } catch (err) {
      setCompError(err.message)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Antidrain Lite</h2>

        {/* Network */}
        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          style={styles.select}
        >
          {Object.entries(NETWORKS).map(([key, net]) => (
            <option key={key} value={key}>
              {net.name}
            </option>
          ))}
        </select>

        {/* Phase 1 */}
        <h3 style={styles.section}>Phase 1 — Sponsor Wallet</h3>
        <button
          style={styles.button}
          onClick={generateSponsorWallet}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Sponsor Wallet"}
        </button>

        {sponsorWallet && (
          <div style={styles.result}>
            <Field label="Sponsor Address" value={sponsorWallet.address} />
            <Field label="Private Key" value={sponsorWallet.privateKey} />
            <Field label="Mnemonic Phrase" value={sponsorWallet.mnemonic} />

            {balance !== null && (
              <Field label="ETH Balance" value={`${balance} ETH`} />
            )}
            {balanceError && (
              <p style={styles.rpcWarning}>
                ⚠️ Gagal load balance (RPC publik error)
              </p>
            )}
          </div>
        )}

        {/* Phase 2 */}
        <h3 style={styles.section}>Phase 2 — Compromised Wallet</h3>

        <input
          type="password"
          placeholder="Paste compromised private key (0x...)"
          value={compKey}
          onChange={(e) => setCompKey(e.target.value.trim())}
          style={styles.input}
        />

        <button style={styles.buttonSecondary} onClick={validateCompromisedKey}>
          Validate Private Key
        </button>

        {compError && <p style={styles.error}>❌ {compError}</p>}

        {compWallet && (
          <div style={styles.result}>
            <Field
              label="Compromised Address (Derived)"
              value={compWallet.address}
            />
            <p style={styles.info}>
              ✅ Private key valid & address derived locally
            </p>
          </div>
        )}

        <p style={styles.warning}>
          ⚠️ Private key diproses **hanya di browser**.  
          Tidak dikirim ke server, tidak disimpan.
        </p>
      </div>
    </div>
  )
}

/**
 * Reusable field
 */
function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={styles.label}>{label}</div>
      <pre style={styles.box}>{value}</pre>
    </div>
  )
}

/**
 * Styles
 */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0f1a",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#eaeaea"
  },
  card: {
    background: "#131a2a",
    padding: 24,
    borderRadius: 12,
    width: "100%",
    maxWidth: 600,
    boxShadow: "0 0 40px rgba(0,0,0,0.6)"
  },
  title: {
    textAlign: "center",
    marginBottom: 12
  },
  section: {
    marginTop: 20,
    marginBottom: 8
  },
  select: {
    width: "100%",
    padding: 10,
    marginBottom: 12,
    borderRadius: 8
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  button: {
    width: "100%",
    padding: "12px 16px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
  },
  buttonSecondary: {
    width: "100%",
    padding: "10px 16px",
    background: "#334155",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    marginBottom: 10
  },
  result: {
    marginTop: 12
  },
  label: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 4
  },
  box: {
    background: "#0b0f1a",
    padding: 10,
    borderRadius: 6,
    fontSize: 13,
    overflowX: "auto"
  },
  warning: {
    marginTop: 16,
    fontSize: 13,
    color: "#f87171"
  },
  rpcWarning: {
    fontSize: 13,
    color: "#facc15"
  },
  error: {
    fontSize: 13,
    color: "#fb7185",
    marginBottom: 6
  },
  info: {
    fontSize: 13,
    color: "#4ade80"
  }
}

