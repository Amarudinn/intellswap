/**
 * Format number dengan smart decimal - menghilangkan trailing zeros
 * @param {string|number} value - Nilai yang akan diformat
 * @param {number} maxDecimals - Maksimal desimal (default 4)
 * @returns {string} - Angka terformat tanpa trailing zeros
 */
export const formatSmartDecimal = (value, maxDecimals = 4) => {
  if (!value || value === '0' || value === 0) return '0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  // Jika angka sangat kecil (< 0.0001), tampilkan 0 atau gunakan 8 desimal
  if (num > 0 && num < 0.0001) {
    // Coba format dengan 8 desimal
    const formatted = num.toFixed(8);
    const cleaned = formatted.replace(/\.?0+$/, '');
    
    // Jika masih 0 setelah format, return "< 0.0001"
    if (parseFloat(cleaned) === 0) {
      return '< 0.0001';
    }
    
    return cleaned;
  }
  
  // Format dengan maxDecimals, lalu hapus trailing zeros
  const formatted = num.toFixed(maxDecimals);
  
  // Hapus trailing zeros dan titik desimal jika tidak perlu
  return formatted.replace(/\.?0+$/, '');
};

/**
 * Format balance dengan smart decimal
 * Contoh: 0.1 → "0.1", 1.0 → "1", 0.1234567 → "0.1235"
 */
export const formatBalance = (value, maxDecimals = 4) => {
  return formatSmartDecimal(value, maxDecimals);
};

/**
 * Format APY dengan 2 desimal
 */
export const formatAPY = (value) => {
  return formatSmartDecimal(value, 2);
};
