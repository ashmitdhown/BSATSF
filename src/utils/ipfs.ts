import axios from 'axios'
import { Web3Storage } from 'web3.storage'

function gatewayBase() {
  const g = process.env.REACT_APP_IPFS_GATEWAY || ''
  return g && g.endsWith('/') ? g : g ? `${g}/` : 'https://ipfs.io/ipfs/'
}

export async function uploadFileToIPFS(file: File) {
  const provider = (process.env.REACT_APP_IPFS_PROVIDER || 'pinata').toLowerCase()
  if (provider === 'pinata') {
    const jwt = process.env.REACT_APP_PINATA_JWT || ''
    const apiKey = process.env.REACT_APP_PINATA_API_KEY || ''
    const secret = process.env.REACT_APP_PINATA_SECRET_KEY || ''
    if (!jwt && (!apiKey || !secret)) throw new Error('Pinata auth required: set REACT_APP_PINATA_JWT or both REACT_APP_PINATA_API_KEY and REACT_APP_PINATA_SECRET_KEY')
    const formData = new FormData()
    formData.append('file', file)
    const headers: Record<string, string> = {}
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`
    else {
      headers['pinata_api_key'] = apiKey
      headers['pinata_secret_api_key'] = secret
    }
    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
    const res = await axios.post(url, formData, { headers })
    return res.data.IpfsHash as string
  } else {
    const token = process.env.REACT_APP_WEB3_STORAGE_TOKEN || ''
    if (!token) throw new Error('Missing REACT_APP_WEB3_STORAGE_TOKEN')
    const client = new Web3Storage({ token })
    const cid = await client.put([file], { wrapWithDirectory: false })
    return cid
  }
}

export async function uploadJsonToIPFS(name: string, json: Record<string, any>) {
  const provider = (process.env.REACT_APP_IPFS_PROVIDER || 'pinata').toLowerCase()
  if (provider === 'pinata') {
    const jwt = process.env.REACT_APP_PINATA_JWT || ''
    const apiKey = process.env.REACT_APP_PINATA_API_KEY || ''
    const secret = process.env.REACT_APP_PINATA_SECRET_KEY || ''
    if (!jwt && (!apiKey || !secret)) throw new Error('Pinata auth required: set REACT_APP_PINATA_JWT or both REACT_APP_PINATA_API_KEY and REACT_APP_PINATA_SECRET_KEY')
    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS'
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`
    else {
      headers['pinata_api_key'] = apiKey
      headers['pinata_secret_api_key'] = secret
    }
    const body = { pinataMetadata: { name }, pinataContent: json }
    const res = await axios.post(url, body, { headers })
    return res.data.IpfsHash as string
  } else {
    const token = process.env.REACT_APP_WEB3_STORAGE_TOKEN || ''
    if (!token) throw new Error('Missing REACT_APP_WEB3_STORAGE_TOKEN')
    const client = new Web3Storage({ token })
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' })
    const file = new File([blob], name.endsWith('.json') ? name : `${name}.json`, { type: 'application/json' })
    const cid = await client.put([file], { wrapWithDirectory: false })
    return cid
  }
}

export function ipfsGatewayUrl(cid: string) {
  return `${gatewayBase()}${cid}`
}

export function ipfsUri(cid: string) {
  return `ipfs://${cid}`
}
