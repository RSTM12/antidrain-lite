import { useState } from "react"
import { Wallet } from "ethers"

export default function App() {
  const [wallet, setWallet] = useState(null)

  function generateWallet() {
    const newWallet = Wallet.createRandom()
    setWallet({
      address: newWallet.address,
      privateKey: newWallet.privateKey,
      mnemonic: newWallet.mnemonic.phrase
    })
  }

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <h2>Phase 0 — Sponsor Wallet Generator</h2>

      <button onClick={generateWallet}>
        Generate Sponsor Wallet
      </button>

      {wallet && (
        <div style={{ marginTop: 20 }}>
          <p><b>Address:</b></p>
          <pre>{wallet.address}</pre>

          <p><b>Private Key:</b></p>
          <pre>{wallet.privateKey}</pre>

          <p><b>Mnemonic Phrase:</b></p>
          <pre>{wallet.mnemonic}</pre>

          <p style={{ color: "red" }}>
            ⚠️ Jangan simpan key ini. Copy manual.
          </p>
        </div>
      )}
    </div>
  )
}
