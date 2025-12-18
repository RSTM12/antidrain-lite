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

/* ================= RPC ================= */

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

/* ============== ABI ==================== */

const ERC20_PERMIT_ABI = [
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function nonces(address) view returns (uint256)",
  "function permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
  "function transferFrom(address,address,uint256) returns (bool)"
]

/* ============== APP ==================== */

export default function App() {
  const [step, setStep] = useState(1)
  const [network, setNetwork] = useState("arbitrum")

  // sponsor
  const [sponsor, setSponsor] = useState(null)
  const [showSponsorPK, setShowSponsorPK] = useState(false)

  // compromised
  const [compKey, setCompKey] = useState("")
  const [compAddr, setCompAddr] = useState("")

  // rescue
  const [token, setToken] = useState("")
  const [receiver, setReceiver] = useState("")
  const [amount, setAmount] = useState("")

  const [permitSupported, setPermitSupported] = useState(null)
  const [checking, setChecking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState("")
  const [error, setError] = useState("")

  /* ============== LOGIC ================= */

  function generateSponsorWallet() {
    const w = Wallet.createRandom()
    setSponsor(w)
    setShowSponsorPK(false)
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

  async function checkPermitSupport() {
    setPermitSupported(null)
    setChecking(true)
    setError("")

    try {
      if (!isAddress(token)) throw new Error("Invalid token address")
      if (!compAddr) throw new Error("Validate compromised wallet first")

      const provider = new JsonRpcProvider(NETWORKS[network].rpc)
      const erc20 = new Contract(token, ERC20_PERMIT_ABI, provider)

      await erc20.name()
      await erc20.nonces(compAddr)

      setPermitSupported(true)
    } catch {
      setPermitSupported(false)
    } finally {
      setChecking(false)
    }
  }

  async function executeRescue() {
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
      const deadline = Math.floor(Date.now() / 1000) + 300

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

      const sig = await compromised.signTypedData(domain, types, message)
      const { v, r, s } = TypedDataEncoder.decodeSignature(sig)

      const erc20Sponsor = erc20.connect(sponsorSigner)

      await (await erc20Sponsor.permit(
        compromised.address,
        sponsorSigner.address,
        value,
        deadline,
        v,
        r,
        s
      )).wait()

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

  /* ============== UI ==================== */

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>Antidrain Lite (Permit Mode)</h2>

        <select
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
          style={styles.input}
        >
          {Object.entries(NETWORKS).map(([k, n]) => (
            <option key={k} value={k}>{n.name}</option>
          ))}
        </select>

        {/* ========== STEP 1 ========== */}
        {step === 1 && (
          <>
            <h3>Step 1 — Sponsor Wallet</h3>

            <button onClick={generateSponsorWallet} style={styles.button}>
              Generate Sponsor Wallet
            </button>

            {sponsor && (
              <>
                <p style={styles.mono}>Address: {sponsor.address}</p>

                <button
                  onClick={() => setShowSponsorPK(!showSponsorPK)}
                  style={styles.buttonSecondary}
                >
                  {showSponsorPK ? "Hide" : "Show"} Private Key
                </button>

                {showSponsorPK && (
                  <p style={styles.mono}>{sponsor.privateKey}</p>
                )}

                <button
                  onClick={() => setStep(2)}
                  style={styles.button}
                >
                  Continue to Rescue →
                </button>
              </>
            )}
          </>
        )}

        {/* ========== STEP 2 ========== */}
        {step === 2 && (
          <>
            <h3>Step 2 — Compromised Wallet</h3>

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

            <button onClick={checkPermitSupport} style={styles.buttonSecondary}>
              {checking ? "Checking..." : "Check Permit Support"}
            </button>

            {permitSupported === true && (
              <p style={styles.success}>✅ Permit supported</p>
            )}
            {permitSupported === false && (
              <p style={styles.error}>❌ No permit support — blocked</p>
            )}

            {permitSupported && (
              <button onClick={executeRescue} style={styles.button}>
                {loading ? "Executing..." : "Execute Sponsored Rescue"}
              </button>
            )}

            {txHash && (
              <p style={styles.success}>
                Tx:<br /><span style={styles.mono}>{txHash}</span>
              </p>
            )}

            {error && <p style={styles.error}>❌ {error}</p>}

            <button
              onClick={() => setStep(1)}
              style={styles.buttonSecondary}
            >
              ← Back to Sponsor
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ============== STYLES ================= */

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
    maxWidth: 650
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
  success: {
    color: "#4ade80",
    fontSize: 13
  },
  error: {
    color: "#fb7185",
    fontSize: 13
  }
}

