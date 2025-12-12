# Rabbit Hole - On-Chain Circle Management dApp

An on-chain NFT experiment on Shape L2 where users manage circles that can grow, shrink, and merge. Built with Next.js 15, React 19, and Wagmi v2.

## Features

- 🎯 **Circle Management**: Grow, shrink, and merge your circle NFTs (max size: 1000)
- 🌱 **Community Garden**: Plant circles for automated community growth
- 📊 **Live Statistics**: Real-time stats for wallet and garden NFTs
- 🖼️ **Contract Images**: Display actual on-chain generated SVG images
- 🔗 **OpenSea Integration**: Preview and marketplace links
- 🔒 **Enterprise Security**: Production-ready with comprehensive security headers

## Smart Contracts

- **Main Contract**: `0xCA38813D69409E4E50F1411A0CAB2570E570C75A` by [@0xmonas](https://x.com/0xmonas)
- **Garden Contract**: `0x2940574AF75D350BF37Ceb73CA5dE8e5ADA425c4` by [@takenstheorem](https://x.com/takenstheorem)
- **Network**: Shape L2 (Chain ID: 360)

## Quick Start

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## Environment Variables

Create `.env.local` with:

```env
# WalletConnect Project ID (required for wallet connections)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Server-only Alchemy RPC key (kept secret)
ALCHEMY_RPC_URL=https://shape-mainnet.g.alchemy.com/v2/your-key

# Optional: Fallback public RPC endpoint
NEXT_PUBLIC_SHAPE_RPC_URL=https://mainnet.shape.network

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=
VERCEL_ANALYTICS_ID=
```

## Deployment

### Vercel (Recommended)

1. **Deploy to Vercel**:
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Set Environment Variables** in Vercel dashboard:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - `ALCHEMY_RPC_URL`
   - Other optional variables as needed

3. **Custom Domain** (optional):
   - Add your domain in Vercel dashboard
   - Configure DNS records as instructed

### Other Platforms

The app can be deployed on any platform supporting Next.js:

- **Netlify**: `npm run build && npm run export`
- **Railway**: Connect GitHub repo
- **Digital Ocean**: Use App Platform
- **Self-hosted**: Use `npm run build && npm start`

## Project Structure

```
├── app/                    # Next.js 13+ app directory
├── components/            # React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and helpers
├── types/                 # TypeScript definitions
├── config/               # Wagmi and blockchain config
└── public/               # Static assets
```

## Key Features

### Circle Management
- **Grow/Shrink**: Once per day per token
- **Merge**: Combine two circles into one larger circle
- **Size Limits**: 1 (minimum) to 1000 (maximum, becomes rare 1/1)

### Garden System
- **Plant Seeds**: Send NFTs to garden for automated growth
- **Work Garden**: Community function that grows all eligible garden NFTs
- **Uproot**: Retrieve NFTs back to wallet

### Security Features
- ✅ Zero vulnerabilities (updated to Next.js 15.3.4)
- ✅ Security headers (XSS, clickjacking protection)
- ✅ Sensitive data sanitization
- ✅ Environment-aware logging

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Web3**: Wagmi v2, Viem, Shape L2
- **UI**: Tailwind CSS, shadcn/ui
- **State**: TanStack Query, React hooks

## Credits

- **Smart Contract**: [@0xmonas](https://x.com/0xmonas)
- **Garden Contract**: [@takenstheorem](https://x.com/takenstheorem)
- **Network**: [@SHAPE_L2](https://x.com/SHAPE_L2)
- **Frontend**: Built with ❤️ for the on-chain community

## License

MIT License - Feel free to fork and modify!

---

One of the first 5 on-chain projects on Shape L2. Pure on-chain art with no roadmap, just vibes! 🐰🕳️ 
