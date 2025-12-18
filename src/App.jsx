import { useState } from "react"
import { Wallet, JsonRpcProvider, formatEther } from "ethers"

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
  const [wallet, setWallet] = useState(null)
  const [network, setNetwork] = useState("ethereum")
  const [balance, setBalance] = useState(null)
  const [balanceError, setBalanceError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function generateWallet() {
    setLoading(true)
    setBalance(null)
    setBalanceError(false)

    // 1️⃣ Generate wallet (INI TIDAK BOLEH FAIL)
    const w = Wallet.createRandom()

    const data = {
      address: w.address,
      privateKey: w.privateKey,
      mnemonic: w.mnemonic.phrase
    }

    setWallet(data)

    // 2️⃣ Load balance (BOLEH FAIL)
    try {
      const provider = new JsonRpcProvider(NETWORKS[network].rpc)
      const bal = await provider.getBalance(data.address)
      setBalance(formatEther(bal))
    } catch (err) {
      console.warn("Failed to load balance:", err)
      setBalanceError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Sponsor Wallet (Phase 1)</h2>

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

        <button
          style={styles.button}
          onClick={generateWallet}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Sponsor Wallet"}
        </button>

        {wallet && (
          <div style={styles.result}>
            <Field label="Network" value={NETWORKS[network].name} />
            <Field label="Address" value={wallet.address} />
            <Field label="Private Key" value={wallet.privateKey} />
            <Field label="Mnemonic Phrase" value={wallet.mnemonic} />

            {balance !== null && (
              <Field label="ETH Balance" value={`${balance} ETH`} />
            )}

            {balanceError && (
              <p style={styles.rpcWarning}>
                ⚠️ Gagal load balance (RPC publik error / rate limit)
              </p>
            )}

            <p style={styles.warning}>
              ⚠️ Wallet ini hanya untuk sponsor gas.
              Jangan simpan aset bernilai di sini.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={styles.label}>{label}</div>
      <pre style={styles.box}>{value}</pre>
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
    color: "#eaeaea"
  },
  card: {
    background: "#131a2a",
    padding: 24,
    borderRadius: 12,
    width: "100%",
    maxWidth: 560,
    boxShadow: "0 0 40px rgba(0,0,0,0.6)"
  },
  title: {
    marginBottom: 16,
    textAlign: "center"
  },
  select: {
    width: "100%",
    padding: 10,
    marginBottom: 12,
    borderRadius: 8
  },
  button: {
    width: "100%",
    padding: "12px 16px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    cursor: "pointer"
  },
  result: {
    marginTop: 20
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
    marginTop: 8,
    fontSize: 13,
    color: "#facc15"
  }
}
