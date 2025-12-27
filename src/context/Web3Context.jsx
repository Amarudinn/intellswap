import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { addresses, routerAbi, supportedNetworks } from '../config/constants';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const { address: wagmiAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [routerContract, setRouterContract] = useState(null);
  const [currentNetwork, setCurrentNetwork] = useState(supportedNetworks['0x138B']);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);

  // Sync wagmi address with userAddress
  useEffect(() => {
    if (isConnected && wagmiAddress && wagmiAddress !== userAddress) {
      console.log('🔄 Syncing wagmi address:', wagmiAddress);
      setUserAddress(wagmiAddress);
      
      // Re-initialize provider and signer when wagmi connects
      if (window.ethereum) {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        web3Provider.getSigner().then(web3Signer => {
          setProvider(web3Provider);
          setSigner(web3Signer);
          const router = new ethers.Contract(addresses.router, routerAbi, web3Signer);
          setRouterContract(router);
          console.log('✅ Provider and signer re-initialized from wagmi');
        }).catch(console.error);
      }
    } else if (!isConnected && userAddress) {
      console.log('🔌 Wagmi disconnected, clearing state');
      disconnectWallet();
    }
  }, [isConnected, wagmiAddress]);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed!');
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('Please connect to MetaMask.');
      }

      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      if (chainId !== currentNetwork.chainId) {
        await switchNetwork(currentNetwork);
      }

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const address = await web3Signer.getAddress();
      const router = new ethers.Contract(addresses.router, routerAbi, web3Signer);

      setProvider(web3Provider);
      setSigner(web3Signer);
      setUserAddress(address);
      setRouterContract(router);

      localStorage.setItem('walletConnected', 'true');
      return { success: true, address };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setUserAddress(null);
    setRouterContract(null);
    localStorage.removeItem('walletConnected');
  };

  const switchNetwork = async (network) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });
      setCurrentNetwork(network);
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: network.chainId,
              chainName: network.chainName,
              rpcUrls: network.rpcUrls,
              nativeCurrency: network.nativeCurrency,
              blockExplorerUrls: network.blockExplorerUrls,
            }],
          });
          setCurrentNetwork(network);
        } catch (addError) {
          throw addError;
        }
      } else {
        throw switchError;
      }
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== userAddress) {
          connectWallet().catch(console.error);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Auto-connect if previously connected (with delay for production)
      if (localStorage.getItem('walletConnected') === 'true') {
        // Add small delay to ensure provider is ready
        const timer = setTimeout(() => {
          connectWallet().catch((error) => {
            console.error('Auto-connect failed:', error);
            // Clear the flag if auto-connect fails
            localStorage.removeItem('walletConnected');
          });
        }, 100);
        
        return () => clearTimeout(timer);
      }

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  const refreshBalances = () => {
    console.log('🔄 Refreshing all balances...');
    setBalanceRefreshTrigger(prev => prev + 1);
  };

  const value = {
    provider,
    signer,
    userAddress,
    account: userAddress, // Alias untuk backward compatibility
    routerContract,
    currentNetwork,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    refreshBalances,
    balanceRefreshTrigger,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
