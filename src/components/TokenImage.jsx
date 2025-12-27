import { useState, useEffect } from 'react';

const TokenImage = ({ src, alt, className = "w-6 h-6 rounded-full" }) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white font-bold text-sm`}>
        ?
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
};

export default TokenImage;
