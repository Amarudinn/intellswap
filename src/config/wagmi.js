import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';

// Define Mantle Testnet chain
export const nexusTestnet = {
  id: 5003,
  name: 'Mantle Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Mantle Testnet',
    symbol: 'MNT',
  },
  rpcUrls: {
    default: { 
      http: ['https://rpc.sepolia.mantle.xyz'] 
    },
    public: { 
      http: ['https://rpc.sepolia.mantle.xyz'] 
    },
  },
  blockExplorers: {
    default: { name: 'Mantle Testnet Explorer', url: 'https://sepolia.mantlescan.xyz' },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'IntellSwap',
  projectId: 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [nexusTestnet],
  transports: {
    [nexusTestnet.id]: http(),
  },
  ssr: false,
});

// Custom theme for RainbowKit
export const rainbowTheme = {
  blurs: {
    modalOverlay: 'blur(8px)',
  },
  colors: {
    accentColor: '#69d169',
    accentColorForeground: '#1c1c1c',
    actionButtonBorder: 'rgba(255, 255, 255, 0.1)',
    actionButtonBorderMobile: 'rgba(255, 255, 255, 0.1)',
    actionButtonSecondaryBackground: 'rgba(255, 255, 255, 0.05)',
    closeButton: 'rgba(255, 255, 255, 0.4)',
    closeButtonBackground: 'rgba(255, 255, 255, 0.05)',
    connectButtonBackground: '#69d169',
    connectButtonBackgroundError: '#ef4444',
    connectButtonInnerBackground: 'rgba(0, 0, 0, 0.3)',
    connectButtonText: '#1c1c1c',
    connectButtonTextError: 'white',
    connectionIndicator: '#69d169',
    downloadBottomCardBackground: 'rgba(26, 26, 46, 0.9)',
    downloadTopCardBackground: 'rgba(26, 26, 46, 0.9)',
    error: '#ef4444',
    generalBorder: 'rgba(255, 255, 255, 0.1)',
    generalBorderDim: 'rgba(255, 255, 255, 0.05)',
    menuItemBackground: 'rgba(255, 255, 255, 0.05)',
    modalBackdrop: 'rgba(0, 0, 0, 0.8)',
    modalBackground: 'rgba(26, 26, 46, 0.95)',
    modalBorder: 'rgba(255, 255, 255, 0.1)',
    modalText: 'white',
    modalTextDim: 'rgba(255, 255, 255, 0.6)',
    modalTextSecondary: 'rgba(255, 255, 255, 0.7)',
    profileAction: 'rgba(255, 255, 255, 0.05)',
    profileActionHover: 'rgba(255, 255, 255, 0.1)',
    profileForeground: 'rgba(26, 26, 46, 0.9)',
    selectedOptionBorder: '#69d169',
    standby: '#F59E0B',
  },
  fonts: {
    body: 'Inter, sans-serif',
  },
  radii: {
    actionButton: '12px',
    connectButton: '12px',
    menuButton: '12px',
    modal: '16px',
    modalMobile: '16px',
  },
  shadows: {
    connectButton: 'none',
    dialog: '0 8px 32px rgba(0, 0, 0, 0.8)',
    profileDetailsAction: '0 2px 6px rgba(0, 0, 0, 0.4)',
    selectedOption: '0 0 0 2px #69d169',
    selectedWallet: '0 0 0 2px #69d169',
    walletLogo: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
};
