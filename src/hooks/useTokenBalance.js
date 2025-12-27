import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import { addresses, erc20Abi } from '../config/constants';
import { formatBalance } from '../utils/formatBalance';

export const useTokenBalance = (tokenAddress) => {
  const { userAddress, balanceRefreshTrigger } = useWeb3();
  const [balance, setBalance] = useState('0.0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    
    const fetchBalance = async () => {
      // Validasi input
      if (!tokenAddress || !userAddress) {
        if (isMounted) {
          setBalance('0.0');
          setLoading(false); // Not loading if no address
        }
        return;
      }

      // Gunakan window.ethereum untuk production reliability
      if (!window.ethereum) {
        console.warn('No ethereum provider found');
        if (isMounted) {
          setBalance('0.0');
          setLoading(false); // Not loading if no provider
        }
        return;
      }

      setLoading(true);
      try {
        // Buat provider baru dari window.ethereum untuk ensure fresh connection
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const checksumAddress = ethers.getAddress(tokenAddress);
        
        if (checksumAddress.toLowerCase() === addresses.weth.toLowerCase()) {
          // Fetch native token balance (MNT)
          const balanceHex = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [userAddress, 'latest']
          });
          const balanceWei = BigInt(balanceHex);
          const formatted = ethers.formatEther(balanceWei);
          if (isMounted) {
            setBalance(formatted);
            setLoading(false); // Set loading false on success
          }
        } else {
          // Fetch ERC20 token balance
          const tokenContract = new ethers.Contract(checksumAddress, erc20Abi, web3Provider);
          const [decimals, bal] = await Promise.all([
            tokenContract.decimals(),
            tokenContract.balanceOf(userAddress)
          ]);
          const formatted = ethers.formatUnits(bal, decimals);
          if (isMounted) {
            setBalance(formatted);
            setLoading(false); // Set loading false on success
          }
        }
      } catch (error) {
        console.error(`Failed to get balance for ${tokenAddress} (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
        
        // Retry logic untuk production reliability
        if (retryCount < MAX_RETRIES && isMounted) {
          retryCount++;
          console.log(`🔄 Retrying balance fetch in ${retryCount}s...`);
          setTimeout(() => {
            if (isMounted) fetchBalance();
          }, retryCount * 1000); // Exponential backoff: 1s, 2s, 3s
        } else {
          // Final retry failed, set loading false
          if (isMounted) {
            setBalance('0.0');
            setLoading(false);
          }
        }
      }
    };

    fetchBalance();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [userAddress, tokenAddress, balanceRefreshTrigger]);

  // Return balance mentah dan balance yang sudah diformat
  return { 
    balance, // untuk kalkulasi
    formattedBalance: formatBalance(balance), // untuk display
    loading 
  };
};
