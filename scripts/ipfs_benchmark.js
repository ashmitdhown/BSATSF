const axios = require("axios");

async function main() {
  const cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oc6compile"; // Example CID
  const url = `https://cloudflare-ipfs.com/ipfs/${cid}`;
  const latencies = [];
  const runs = 10;

  console.log(`Pinging public IPFS gateway Cloudflare for CID ${cid} (${runs} iterations)...`);
  for (let i = 0; i < runs; i++) {
    const start = Date.now();
    try {
      await axios.get(url, { timeout: 15000 });
      const delay = Date.now() - start;
      latencies.push(delay);
      console.log(`Run ${i + 1}: ${delay}ms`);
    } catch (err) {
      console.log(`Run ${i + 1}: Failed (${err.message})`);
    }
  }

  if (latencies.length > 0) {
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const stdDev = Math.sqrt(latencies.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / latencies.length);
    console.log(`\nIPFS Retrieval Latency Stats: Mean = ${(mean / 1000).toFixed(2)}s, Std Dev = ${(stdDev / 1000).toFixed(2)}s`);
  } else {
    console.log("No successful IPFS responses recorded.");
  }
}

main().catch(console.error);
