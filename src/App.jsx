import { useState } from "react"
import { Wallet } from "ethers"

export default function App() {
  const [wallet, setWallet] = useState(null)

  function generateWallet() {
    const w = Wallet.createRandom()
    setWallet({
      address: w.address,
      privateKey: w.privateKey,
      mnemonic: w.mnemonic.phrase
    })
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Sponsor EVM Wallet Generator</h2>

        <button style={styles.button} onClick={generateWallet}>
          Generate Wallet
        </button>

        {wallet && (
          <div style={styles.result}>
            <Field label="Address" value={wallet.address} />
            <Field label="Private Key" value={wallet.privateKey} />
            <Field label="Mnemonic Phrase" value={wallet.mnemonic} />

            <p style={styles.warning}>
              ⚠️ Wallet ini hanya untuk sponsor fee.
              Jangan simpan aset di sini.
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
    maxWidth: 520,
    boxShadow: "0 0 40px rgba(0,0,0,0.6)"
  },
  title: {
    marginBottom: 16,
    textAlign: "center"
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
  }
}

