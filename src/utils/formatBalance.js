export const formatBalance = (balance, maxDecimals = 4) => {
  try {
    // Handle null, undefined, atau empty string
    if (balance === null || balance === undefined || balance === '') {
      return '0';
    }

    const num = parseFloat(balance);
    
    // Handle NaN atau 0
    if (isNaN(num) || num === 0) return '0';
    
    // Jika angka bulat, tampilkan tanpa desimal
    if (Number.isInteger(num)) return num.toString();
    
    // Untuk angka sangat kecil
    if (num < 0.0001 && num > 0) return '< 0.0001';
    
    // Gunakan toFixed untuk limit desimal
    const fixed = num.toFixed(maxDecimals);
    
    // Parse kembali untuk hilangkan trailing zeros
    const parsed = parseFloat(fixed);
    
    // Return sebagai string
    return parsed.toString();
  } catch (error) {
    console.error('Error formatting balance:', error);
    return '0';
  }
};

// Format untuk swap amounts (6 decimal max, smart trailing zeros)
export const formatSwapAmount = (amount) => {
  try {
    if (amount === null || amount === undefined || amount === '') return '';
    
    const num = parseFloat(amount);
    if (isNaN(num)) return '';
    if (num === 0) return '0';
    
    // Untuk angka sangat kecil
    if (num < 0.000001 && num > 0) return '< 0.000001';
    
    // Tentukan jumlah desimal yang diperlukan
    const str = num.toString();
    
    // Jika sudah dalam format scientific notation, convert dulu
    if (str.includes('e')) {
      return num.toFixed(6).replace(/\.?0+$/, '');
    }
    
    // Hitung desimal yang signifikan
    const parts = str.split('.');
    if (parts.length === 1) return str; // Angka bulat
    
    // Ambil maksimal 6 desimal, hilangkan trailing zeros
    const decimals = parts[1].slice(0, 6);
    const trimmed = decimals.replace(/0+$/, '');
    
    return trimmed ? `${parts[0]}.${trimmed}` : parts[0];
  } catch (error) {
    return '';
  }
};
