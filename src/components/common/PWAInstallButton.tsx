import React, {useState} from 'react';
import {Download} from 'lucide-react';
import {usePWAInstall} from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  toneClassName?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  toneClassName = 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Instalar App"
        aria-label="Instalar App"
        className={`guest-btn-transition h-8 w-8 sm:w-auto sm:px-2 inline-flex items-center justify-center gap-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 ${toneClassName}`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden md:inline">App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Instalar no iPhone / iPad"
          aria-label="Instalar no iPhone / iPad"
          className={`guest-btn-transition h-8 w-8 sm:w-auto sm:px-2 inline-flex items-center justify-center gap-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 ${toneClassName}`}
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline">App</span>
        </button>

        {showIOSGuide && (
          <div className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="animate-modal-in w-full max-w-sm rounded-xl bg-white p-6 border border-slate-200 text-slate-900">
              <h3 className="text-base font-semibold text-slate-900">
                Instalar no iPhone / iPad
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.
                <br />
                2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="guest-btn-transition mt-4 w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
