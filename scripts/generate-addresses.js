require('dotenv').config();
const fs = require("fs");
const path = require("path");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const normalizeAddress = (value) => {
  if (!value) return ZERO_ADDRESS;
  const trimmed = value.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed) ? trimmed : ZERO_ADDRESS;
};

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const outputDir = path.join(__dirname, "../public/contracts");
const outputFile = path.join(outputDir, "addresses.json");

let previous = {};
if (fs.existsSync(outputFile)) {
  try {
    previous = JSON.parse(fs.readFileSync(outputFile, "utf8"));
  } catch {
    previous = {};
  }
}

const pickAddress = (envKey, previousKey) => {
  const envValue = process.env[envKey];
  if (envValue && normalizeAddress(envValue) !== ZERO_ADDRESS) {
    return normalizeAddress(envValue);
  }
  return normalizeAddress(previous[previousKey]);
};

const pickString = (envKey, previousKey, fallback = "unknown") => {
  const envValue = process.env[envKey];
  if (envValue && envValue.trim().length > 0) {
    return envValue.trim();
  }
  return typeof previous[previousKey] === "string" && previous[previousKey].length > 0
    ? previous[previousKey]
    : fallback;
};

const pickNumber = (envKey, previousKey, fallback = 0) => {
  const envValue = process.env[envKey];
  if (envValue) {
    return normalizeNumber(envValue, fallback);
  }
  const prev = normalizeNumber(previous[previousKey], fallback);
  return prev;
};

const addresses = {
  ERC721: pickAddress("REACT_APP_ERC721_ADDRESS", "ERC721"),
  ERC1155: pickAddress("REACT_APP_ERC1155_ADDRESS", "ERC1155"),
  Marketplace: pickAddress("REACT_APP_MARKETPLACE_ADDRESS", "Marketplace"),
  network: pickString("REACT_APP_NETWORK_NAME", "network"),
  chainId: pickNumber("REACT_APP_CHAIN_ID", "chainId"),
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(addresses, null, 2));

console.log(
  `Contract addresses written to ${outputFile}\n` +
    `  ERC721: ${addresses.ERC721}\n` +
    `  ERC1155: ${addresses.ERC1155}\n` +
    `  Marketplace: ${addresses.Marketplace}\n`
);

