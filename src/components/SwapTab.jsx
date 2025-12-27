import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import { addresses, erc20Abi, defaultToken } from '../config/constants';
import TokenSelectModal from './TokenSelectModal';
import ConfirmModal from './ConfirmModal';
import { useTokenBalance } from '../hooks/useTokenBalance';
import { formatBalance, formatSwapAmount } from '../utils/formatBalance';
import TokenImage from './TokenImage';

const SwapTab = ({ showAlert, slippage }) => {
  const { provider, signer, userAddress, routerContract, currentNetwork, refreshBalances } = useWeb3();
  const [fromToken, setFromToken] = useState(defaultToken);
  const [toToken, setToToken] = useState(null);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [selectingFor, setSelectingFor] = useState(null);
  const [priceInfo, setPriceInfo] = useState(null);
  const [swapDetails, setSwapDetails] = useState(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [priceReversed, setPriceReversed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSwap, setPendingSwap] = useState(false);

  const { balance: fromBalance, formattedBalance: fromBalanceFormatted, loading: fromBalanceLoading } = useTokenBalance(fromToken?.address);
  const { balance: toBalance, formattedBalance: toBalanceFormatted, loading: toBalanceLoading } = useTokenBalance(toToken?.address);

  // Debug logging for production
  useEffect(() => {
    console.log('💰 Balance Debug:', {
      fromToken: fromToken?.symbol,
      fromBalance,
      fromBalanceFormatted,
      fromBalanceLoading,
      toToken: toToken?.symbol,
      toBalance,
      toBalanceFormatted,
      toBalanceLoading,
      userAddress
    });
  }, [fromBalance, toBalance, fromBalanceFormatted, toBalanceFormatted]);

  useEffect(() => {
    if (amountIn && fromToken && toToken && routerContract) {
      calculateAmountOut();
    } else {
      setAmountOut('');
      setSwapDetails(null);
    }
  }, [amountIn, fromToken, toToken, routerContract, slippage]);

  const calculateAmountOut = async () => {
    try {
      const amount = parseFloat(amountIn);
      if (amount <= 0) {
        setAmountOut('');
        return;
      }

      const amountInParsed = ethers.parseUnits(amountIn, fromToken.decimals);
      const path = getPath(fromToken, toToken);
      
      const amounts = await routerContract.getAmountsOut(amountInParsed, path);
      const outputAmount = amounts[amounts.length - 1];
      const formatted = ethers.formatUnits(outputAmount, toToken.decimals);
      setAmountOut(formatSwapAmount(formatted));

      // Calculate price impact
      const oneUnit = ethers.parseUnits('0.001', fromToken.decimals);
      const idealAmounts = await routerContract.getAmountsOut(oneUnit, path);
      const idealRate = parseFloat(ethers.formatUnits(idealAmounts[idealAmounts.length - 1], toToken.decimals)) / 0.001;
      const actualRate = parseFloat(formatted) / amount;
      const impact = ((idealRate - actualRate) / idealRate) * 100;

      const minReceived = parseFloat(formatted) * (1 - slippage / 100);
      const lpFee = amount * 0.003;

      setSwapDetails({
        minReceived: formatSwapAmount(minReceived),
        priceImpact: formatSwapAmount(impact),
        lpFee: formatSwapAmount(lpFee),
        route: path
      });

      setPriceInfo({
        rate: priceReversed ? formatSwapAmount(amount / parseFloat(formatted)) : formatSwapAmount(parseFloat(formatted) / amount),
        fromSymbol: priceReversed ? toToken.symbol : fromToken.symbol,
        toSymbol: priceReversed ? fromToken.symbol : toToken.symbol
      });
    } catch (error) {
      console.error('Error calculating amount out:', error);
      setAmountOut('');
    }
  };

  const getPath = (tokenA, tokenB) => {
    const isFromETH = tokenA.address.toLowerCase() === addresses.weth.toLowerCase();
    const isToETH = tokenB.address.toLowerCase() === addresses.weth.toLowerCase();
    
    if (isFromETH || isToETH) {
      return [ethers.getAddress(tokenA.address), ethers.getAddress(tokenB.address)];
    }
    return [ethers.getAddress(tokenA.address), ethers.getAddress(addresses.weth), ethers.getAddress(tokenB.address)];
  };

  const executeSwap = async () => {
    if (!signer || !fromToken || !toToken || !amountIn) return;

    const balance = parseFloat(fromBalance);
    const amount = parseFloat(amountIn);
    
    if (amount > balance) {
      showAlert('Insufficient balance', 'error');
      return;
    }

    setIsSwapping(true);
    try {
      const amountInParsed = ethers.parseUnits(amountIn, fromToken.decimals);
      const path = getPath(fromToken, toToken);
      const amounts = await routerContract.getAmountsOut(amountInParsed, path);
      const amountOutMin = amounts[amounts.length - 1] - (amounts[amounts.length - 1] * BigInt(Math.floor(slippage * 100))) / BigInt(10000);
      
      // Get current block timestamp and add 30 minutes
      const block = await provider.getBlock('latest');
      const deadline = block.timestamp + 1800; // 30 minutes from now

      const isFromETH = fromToken.address.toLowerCase() === addresses.weth.toLowerCase();
      const isToETH = toToken.address.toLowerCase() === addresses.weth.toLowerCase();

      let tx;

      if (isFromETH) {
        showAlert('Swap...', 'info');
        tx = await routerContract.swapExactETHForTokens(
          amountOutMin, path, userAddress, deadline,
          { value: amountInParsed }
        );
      } else if (isToETH) {
        const tokenContract = new ethers.Contract(fromToken.address, erc20Abi, signer);
        const allowance = await tokenContract.allowance(userAddress, addresses.router);
        
        if (allowance < amountInParsed) {
          showAlert(`Approving ${fromToken.symbol}...`, 'info');
          const approveTx = await tokenContract.approve(addresses.router, ethers.MaxUint256);
          await approveTx.wait();
          showAlert('Approval successful!', 'success');
        }
        
        showAlert('Swap...', 'info');
        tx = await routerContract.swapExactTokensForETH(
          amountInParsed, amountOutMin, path, userAddress, deadline
        );
      } else {
        const tokenContract = new ethers.Contract(fromToken.address, erc20Abi, signer);
        const allowance = await tokenContract.allowance(userAddress, addresses.router);
        
        if (allowance < amountInParsed) {
          showAlert(`Approving ${fromToken.symbol}...`, 'info');
          const approveTx = await tokenContract.approve(addresses.router, ethers.MaxUint256);
          await approveTx.wait();
          showAlert('Approval successful!', 'success');
        }
        
        showAlert('Swap...', 'info');
        tx = await routerContract.swapExactTokensForTokens(
          amountInParsed, amountOutMin, path, userAddress, deadline
        );
      }

      await tx.wait();
      showAlert('Swap successful!', 'success', tx.hash);
      setAmountIn('');
      setAmountOut('');
      refreshBalances(); // Refresh all balances
    } catch (error) {
      console.error('Swap error:', error);
      // Check if user rejected the transaction
      if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error.message?.includes('user rejected') || error.message?.includes('User denied')) {
        showAlert('User rejected', 'error');
      } else {
        showAlert('Swap failed', 'error');
      }
    } finally {
      setIsSwapping(false);
    }
  };

  const handleSwap = () => {
    if (!swapDetails) return;
    
    const impact = parseFloat(swapDetails.priceImpact);
    
    // If price impact > 5%, show confirmation
    if (impact > 5) {
      setShowConfirmModal(true);
      setPendingSwap(true);
    } else {
      executeSwap();
    }
  };

  const handleSwitch = () => {
    if (!toToken) return;
    setFromToken(toToken);
    setToToken(fromToken);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  };

  const handleMax = () => {
    setAmountIn(fromBalance);
  };

  return (
    <>
      <div className="relative space-y-1">
        {/* You Pay Section */}
        <div className="group bg-[#0a0a0a]/70 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400 text-sm font-medium">You pay</span>
            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setAmountIn((parseFloat(fromBalance) * 0.5).toString())}
                  className="text-[#69d169] hover:text-[#5bc05b] text-xs font-semibold transition-all opacity-0 group-hover:opacity-100 bg-black/40 hover:bg-black/60 px-2 py-1 rounded-lg"
                >
                  50%
                </button>
                <button
                  onClick={handleMax}
                  className="text-[#69d169] hover:text-[#5bc05b] text-xs font-semibold transition-all opacity-0 group-hover:opacity-100 bg-black/40 hover:bg-black/60 px-2 py-1 rounded-lg"
                >
                  100%
                </button>
              </div>
              <i className="fa-solid fa-wallet text-xs"></i>
              <span>
                {fromBalanceLoading ? (
                  <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                ) : (
                  `${fromBalanceFormatted} ${fromToken.symbol}`
                )}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectingFor('from')}
              className="flex items-center space-x-2 bg-black/40 hover:bg-black/60 px-3 py-2 rounded-full font-semibold transition-colors"
            >
              <TokenImage src={fromToken.logoURI} alt={fromToken.symbol} />
              <span className="text-white">{fromToken.symbol}</span>
              <i className="fa-solid fa-chevron-down text-xs text-white"></i>
            </button>
            
            <div className="flex flex-col items-end flex-1 ml-4">
              <input
                type="text"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.00"
                className="w-full text-white bg-transparent text-3xl font-bold text-right focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Switch Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleSwitch}
            className="flex items-center justify-center h-10 w-10 bg-[#0a0a0a] border-2 border-white/10 hover:border-[#69d169] rounded-full text-[#69d169] hover:text-white hover:bg-[#69d169] hover:rotate-180 transition-all duration-300"
          >
            <i className="fa-solid fa-arrow-down text-lg"></i>
          </button>
        </div>

        {/* You Receive Section */}
        <div className="bg-[#0a0a0a]/70 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400 text-sm font-medium">You receive</span>
            {toToken && (
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <i className="fa-solid fa-wallet text-xs"></i>
                <span>
                  {toBalanceLoading ? (
                    <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                  ) : (
                    `${toBalanceFormatted} ${toToken.symbol}`
                  )}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectingFor('to')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-full font-semibold transition-colors ${
                toToken ? 'bg-black/40 hover:bg-black/60' : 'bg-[#69d169] hover:bg-[#5bc05b]'
              }`}
            >
              {toToken ? (
                <>
                  <TokenImage src={toToken.logoURI} alt={toToken.symbol} />
                  <span className="text-white">{toToken.symbol}</span>
                </>
              ) : (
                <span className="text-[#1c1c1c]">Select token</span>
              )}
              <i className={`fa-solid fa-chevron-down text-xs ${toToken ? 'text-white' : 'text-[#1c1c1c]'}`}></i>
            </button>
            
            <div className="flex flex-col items-end flex-1 ml-4">
              <input
                type="text"
                value={amountOut}
                placeholder="0.00"
                className="w-full bg-transparent text-white text-3xl font-bold text-right focus:outline-none"
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {priceInfo && (
        <div className="text-sm text-gray-400 mt-4 flex justify-between items-center">
          <span>Price</span>
          <div className="flex items-center space-x-2">
            <span>1 {priceInfo.fromSymbol} = {priceInfo.rate} {priceInfo.toSymbol}</span>
            <button onClick={() => setPriceReversed(!priceReversed)} className="hover:text-white transition-colors">
              <i className="fa-solid fa-repeat"></i>
            </button>
          </div>
        </div>
      )}

      <button
        onClick={handleSwap}
        disabled={
          !signer || 
          !fromToken || 
          !toToken || 
          !amountIn || 
          isSwapping || 
          (swapDetails && parseFloat(swapDetails.priceImpact) > 20)
        }
        className="btn btn-primary mt-4 text-lg"
      >
        {!signer 
          ? 'Connect Wallet' 
          : isSwapping 
          ? 'Swap...' 
          : swapDetails && parseFloat(swapDetails.priceImpact) > 20
          ? 'Price Impact Too High'
          : 'Swap'
        }
      </button>

      {swapDetails && (
        <div className="text-sm text-gray-300 mt-4 p-3 bg-[#0a0a0a]/70 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Minimum received</span>
            <span>{swapDetails.minReceived} {toToken.symbol}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Price Impact</span>
            <span className={parseFloat(swapDetails.priceImpact) > 5 ? 'text-red-400' : 'text-green-400'}>
              {swapDetails.priceImpact}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Liquidity Provider Fee</span>
            <span>{swapDetails.lpFee} {fromToken.symbol}</span>
          </div>
          
          {/* Route Display */}
          {swapDetails.route && swapDetails.route.length > 2 && (
            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="text-gray-400">Route</span>
              <div className="flex items-center space-x-1.5">
                <div className="flex items-center space-x-1">
                  <TokenImage src={fromToken.logoURI} alt={fromToken.symbol} className="w-4 h-4 rounded-full" />
                  <span className="text-xs">{fromToken.symbol}</span>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-gray-500"></i>
                <div className="flex items-center space-x-1">
                  <TokenImage src={defaultToken.logoURI} alt="MNT" className="w-4 h-4 rounded-full" />
                  <span className="text-xs text-gray-400">MNT</span>
                </div>
                <i className="fa-solid fa-chevron-right text-xs text-gray-500"></i>
                <div className="flex items-center space-x-1">
                  <TokenImage src={toToken.logoURI} alt={toToken.symbol} className="w-4 h-4 rounded-full" />
                  <span className="text-xs">{toToken.symbol}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectingFor && (
        <TokenSelectModal
          onClose={() => setSelectingFor(null)}
          onSelect={(token) => {
            // Prevent selecting the same token
            const otherToken = selectingFor === 'from' ? toToken : fromToken;
            if (otherToken && token.address.toLowerCase() === otherToken.address.toLowerCase()) {
              return; // Don't select same token
            }
            
            if (selectingFor === 'from') setFromToken(token);
            else setToToken(token);
            setSelectingFor(null);
          }}
          excludeToken={selectingFor === 'from' ? toToken : fromToken}
        />
      )}

      {showConfirmModal && swapDetails && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setPendingSwap(false);
          }}
          onConfirm={() => {
            setShowConfirmModal(false);
            executeSwap();
          }}
          priceImpact={swapDetails.priceImpact}
        />
      )}
    </>
  );
};

export default SwapTab;
