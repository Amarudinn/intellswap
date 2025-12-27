import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { masterFactoryAbi, factoryAbi, sportsBettingAddresses } from '../config/sportsBettingAbi';

const FactoryContext = createContext();

export const FactoryProvider = ({ children }) => {
  const [factories, setFactories] = useState([]);
  const [currentFactory, setCurrentFactory] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeFactories();
  }, []);

  const initializeFactories = async () => {
    try {
      // Check if master factory is deployed
      if (!sportsBettingAddresses.masterFactory) {
        // Use legacy factory
        const legacyFactory = {
          address: sportsBettingAddresses.factory,
          name: 'Legacy Factory',
          active: true,
          totalMatchesWithDraw: 0,
          totalMatchesNoDraw: 0
        };
        setFactories([legacyFactory]);
        setCurrentFactory(legacyFactory.address);
        
        // Load from localStorage if exists
        const saved = localStorage.getItem('selectedFactory');
        if (saved) setCurrentFactory(saved);
        
        return;
      }

      await fetchFactories();
    } catch (error) {
      console.error('Error initializing factories:', error);
    }
  };

  const fetchFactories = async () => {
    setLoading(true);
    try {
      if (!sportsBettingAddresses.masterFactory) {
        // Use legacy factory
        const legacyFactory = {
          address: sportsBettingAddresses.factory,
          name: 'Legacy Factory',
          active: true,
          totalMatchesWithDraw: 0,
          totalMatchesNoDraw: 0
        };
        setFactories([legacyFactory]);
        setCurrentFactory(legacyFactory.address);
        
        // Load from localStorage if exists
        const saved = localStorage.getItem('selectedFactory');
        if (saved) setCurrentFactory(saved);
        
        setLoading(false);
        return;
      }

      if (!window.ethereum) {
        console.log('⚠️ No ethereum provider, using legacy factory');
        setFactories([{
          address: sportsBettingAddresses.factory,
          name: 'Legacy Factory',
          active: true,
          totalMatchesWithDraw: 0,
          totalMatchesNoDraw: 0
        }]);
        setCurrentFactory(sportsBettingAddresses.factory);
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const masterContract = new ethers.Contract(
        sportsBettingAddresses.masterFactory,
        masterFactoryAbi,
        provider
      );

      let factoryAddresses;
      try {
        factoryAddresses = await masterContract.getAllFactories();
        console.log('📊 Fetched factories:', factoryAddresses);
        
        // If no factories returned, use legacy
        if (!factoryAddresses || factoryAddresses.length === 0) {
          console.log('⚠️ No factories found in master, using legacy factory');
          setFactories([{
            address: sportsBettingAddresses.factory,
            name: 'Legacy Factory',
            active: true,
            totalMatchesWithDraw: 0,
            totalMatchesNoDraw: 0
          }]);
          setCurrentFactory(sportsBettingAddresses.factory);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('⚠️ Master factory not available, using legacy factory');
        console.error('Master factory error:', err.message || err);
        setFactories([{
          address: sportsBettingAddresses.factory,
          name: 'Legacy Factory',
          active: true,
          totalMatchesWithDraw: 0,
          totalMatchesNoDraw: 0
        }]);
        setCurrentFactory(sportsBettingAddresses.factory);
        setLoading(false);
        return;
      }

      const factoriesData = [];

      for (let addr of factoryAddresses) {
        try {
          const info = await masterContract.getFactoryInfo(addr);
          factoriesData.push({
            address: addr,
            name: info[0],
            active: info[1],
            totalMatchesWithDraw: Number(info[2]),
            totalMatchesNoDraw: Number(info[3])
          });
        } catch (err) {
          console.error(`Error fetching factory ${addr}:`, err);
        }
      }

      setFactories(factoriesData);

      // Set current factory from localStorage or first active factory
      const saved = localStorage.getItem('selectedFactory');
      if (saved && factoriesData.find(f => f.address === saved)) {
        setCurrentFactory(saved);
      } else {
        const activeFactory = factoriesData.find(f => f.active);
        if (activeFactory) {
          setCurrentFactory(activeFactory.address);
        } else if (factoriesData.length > 0) {
          // If no active factory, use first factory
          setCurrentFactory(factoriesData[0].address);
        } else {
          // If no factories at all, fallback to legacy
          console.log('⚠️ No factories found, using legacy factory');
          setCurrentFactory(sportsBettingAddresses.factory);
          setFactories([{
            address: sportsBettingAddresses.factory,
            name: 'Legacy Factory',
            active: true,
            totalMatchesWithDraw: 0,
            totalMatchesNoDraw: 0
          }]);
        }
      }
    } catch (error) {
      console.error('Error fetching factories:', error);
    }
    setLoading(false);
  };

  const switchFactory = (factoryAddress) => {
    console.log('🔄 Switching to factory:', factoryAddress);
    setCurrentFactory(factoryAddress);
    localStorage.setItem('selectedFactory', factoryAddress);
  };

  const createFactory = async (name) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      console.log('🏭 Deploying new SportsBettingFactory...');
      
      // Deploy SportsBettingFactory from bytecode
      const SportsBettingFactoryBytecode = sportsBettingAddresses.factoryBytecode;
      
      if (!SportsBettingFactoryBytecode) {
        // Fallback: use addFactory if bytecode not available
        console.log('⚠️ No bytecode available, please deploy factory manually and use addFactory');
        return false;
      }
      
      // Create contract factory
      const factory = new ethers.ContractFactory(
        factoryAbi,
        SportsBettingFactoryBytecode,
        signer
      );
      
      // Deploy
      const deployedFactory = await factory.deploy();
      await deployedFactory.waitForDeployment();
      const factoryAddress = await deployedFactory.getAddress();
      
      console.log('✅ SportsBettingFactory deployed at:', factoryAddress);
      
      // Register to MasterFactory
      const masterContract = new ethers.Contract(
        sportsBettingAddresses.masterFactory,
        masterFactoryAbi,
        signer
      );
      
      console.log('📝 Registering factory to MasterFactory...');
      const tx = await masterContract.addFactoryWithStaking(factoryAddress, name);
      await tx.wait();

      console.log('✅ Factory registered successfully');
      await fetchFactories();
      
      return true;
    } catch (error) {
      console.error('❌ Error creating factory:', error);
      return false;
    }
  };

  // Add existing factory to MasterFactory
  const addExistingFactory = async (factoryAddress, name) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const masterContract = new ethers.Contract(
        sportsBettingAddresses.masterFactory,
        masterFactoryAbi,
        signer
      );

      console.log('📝 Adding existing factory:', factoryAddress);
      const tx = await masterContract.addFactory(factoryAddress, name);
      await tx.wait();

      console.log('✅ Factory added successfully');
      await fetchFactories();
      
      return true;
    } catch (error) {
      console.error('❌ Error adding factory:', error);
      return false;
    }
  };

  const setFactoryActive = async (factoryAddress, active) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const masterContract = new ethers.Contract(
        sportsBettingAddresses.masterFactory,
        masterFactoryAbi,
        signer
      );

      console.log(`🔄 Setting factory ${factoryAddress} to ${active ? 'active' : 'inactive'}`);
      const tx = await masterContract.setFactoryActive(factoryAddress, active);
      await tx.wait();

      console.log('✅ Factory status updated');
      await fetchFactories();
      
      return true;
    } catch (error) {
      console.error('❌ Error updating factory status:', error);
      return false;
    }
  };

  const getCurrentFactoryData = () => {
    return factories.find(f => f.address === currentFactory);
  };

  return (
    <FactoryContext.Provider value={{
      factories,
      currentFactory,
      loading,
      switchFactory,
      fetchFactories,
      createFactory,
      addExistingFactory,
      setFactoryActive,
      getCurrentFactoryData
    }}>
      {children}
    </FactoryContext.Provider>
  );
};

export const useFactory = () => {
  const context = useContext(FactoryContext);
  if (!context) {
    throw new Error('useFactory must be used within FactoryProvider');
  }
  return context;
};
