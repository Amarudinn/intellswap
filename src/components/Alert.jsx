import { useEffect } from 'react';

const Alert = ({ message, type = 'info', txHash, onClose, explorerUrl }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-500/10 border-green-500 text-green-300',
    error: 'bg-red-500/10 border-red-500 text-red-300',
    info: 'bg-blue-500/10 border-blue-500 text-blue-300',
  };

  const icons = {
    success: 'fa-check-circle text-green-500',
    error: 'fa-circle-xmark text-red-500',
    info: 'fa-circle-info text-blue-500',
  };

  return (
    <div className={`alert-popup max-w-sm w-full p-4 border-l-4 rounded-lg flex items-center gap-3 glass-card ${colors[type]} animate-fade-in`}>
      <div className="mt-0.5">
        <i className={`fa-solid ${icons[type]} text-lg`}></i>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{message}</p>
        {txHash && explorerUrl && (
          <a
            href={`${explorerUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-cyan-400 hover:underline"
          >
            View on Explorer
          </a>
        )}
      </div>
      <button
        onClick={onClose}
        className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <i className="fa-solid fa-xmark text-lg"></i>
      </button>
    </div>
  );
};

export default Alert;
