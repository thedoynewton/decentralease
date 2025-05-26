import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
} from 'wagmi/chains';

const localhost = {
  id: 31337,
  name: 'Localhost',
  network: 'localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://10.0.254.8:8545'],
    },
    public: {
      http: ['http://10.0.254.8:8545'],
    },
  },
};

export const config = getDefaultConfig({
  appName: 'RainbowKit App',
  projectId: '796c2f9807ef0c82a498b1ff262319a0',
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [sepolia] : []),
    ...(process.env.NEXT_PUBLIC_ENABLE_LOCALHOST === 'true' ? [localhost] : []),
  ],
  ssr: true,
});
