import React from 'react';
import {Check} from 'lucide-react';
import {
  darkenHex,
  hexToRgba,
  isColorLight,
  PALETTE_COLORS_20,
  TENANT_THEMES,
} from '../../constants/branding';
import {TenantThemeVariant} from '../../types/models';

interface ThemePaletteSelectorProps {
  selectedColor: string;
  selectedTheme: TenantThemeVariant;
  onChangeColor: (hex: string) => void;
  onChangeTheme: (theme: TenantThemeVariant) => void;
  previewName?: string;
}

export const ThemePaletteSelector: React.FC<ThemePaletteSelectorProps> = ({
  selectedColor,
  selectedTheme,
  onChangeColor,
  onChangeTheme,
  previewName,
}) => {
  const activeColorMeta = PALETTE_COLORS_20.find(
    (c) => c.hex.toLowerCase() === selectedColor.toLowerCase()
  );
  const lightTextOnBrand = !isColorLight(selectedColor);

  return (
    <div className="space-y-4">
      {/* 1. 72 Colors from COLOR PALETTE Chart (9 rows x 8 columns) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-700">
            Paleta de Cores Predefinidas ({PALETTE_COLORS_20.length} Cores — 9×8)
          </label>
          <div className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
            <span
              className="w-3.5 h-3.5 rounded-sm border border-black/15 inline-block shrink-0"
              style={{backgroundColor: selectedColor}}
            />
            <span className="font-semibold text-slate-900">
              {activeColorMeta ? activeColorMeta.name : 'Cor Personalizada'}
            </span>
            <span className="text-slate-500">
              {selectedColor.toUpperCase()}
            </span>
            {activeColorMeta?.rgb && (
              <span className="text-slate-400 hidden sm:inline">
                · RGB {activeColorMeta.rgb}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-3 rounded-xl bg-white border border-slate-200 max-h-72 overflow-y-auto">
          {PALETTE_COLORS_20.map((color) => {
            const isSelected =
              color.hex.toLowerCase() === selectedColor.toLowerCase();
            return (
              <button
                key={color.hex}
                type="button"
                title={`${color.name} · ${color.hex} · RGB ${color.rgb}`}
                aria-label={`${color.name} (${color.hex})`}
                onClick={() => onChangeColor(color.hex)}
                className={`guest-btn-transition group flex flex-col items-start rounded-lg p-1.5 border text-left ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900/5 ring-2 ring-slate-900'
                    : 'border-slate-200/80 bg-slate-50/50 hover:border-slate-400 hover:bg-white'
                }`}
              >
                <div
                  style={{backgroundColor: color.hex}}
                  className="w-full h-7 rounded-md border border-black/10 flex items-center justify-center relative"
                >
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        isColorLight(color.hex)
                          ? 'text-slate-900'
                          : 'text-white'
                      }`}
                    />
                  )}
                </div>
                <span className="mt-1 text-[9px] font-semibold text-slate-800 truncate w-full leading-tight">
                  {color.name}
                </span>
                <span className="text-[8px] font-mono text-slate-500 truncate w-full leading-tight">
                  {color.hex}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 3 Distinct Visual Themes with Live Mini-Wireframe */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          Estilo Visual / Tema do Portal de Reservas (3 Opções)
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TENANT_THEMES.map((theme) => {
            const active = selectedTheme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onChangeTheme(theme.id)}
                className={`text-left rounded-xl border p-3 transition-all flex flex-col justify-between gap-2.5 ${
                  active
                    ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/15'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Live Mini Visual Mockup reflecting both Theme & Selected Color */}
                <div
                  className={`w-full rounded-lg border overflow-hidden ${
                    theme.id === 'boutique_dark'
                      ? 'bg-slate-950 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Mini Header */}
                  <div
                    className="h-5 px-2 flex items-center justify-between border-b"
                    style={
                      theme.id === 'resort_tint'
                        ? {
                            backgroundColor: selectedColor,
                            borderColor: darkenHex(selectedColor, 0.2),
                            color: lightTextOnBrand ? '#FFFFFF' : '#0F172A',
                          }
                        : theme.id === 'boutique_dark'
                        ? {
                            backgroundColor: '#020617',
                            borderColor: selectedColor,
                            color: '#F8FAFC',
                          }
                        : {
                            backgroundColor: '#FFFFFF',
                            borderColor: '#E2E8F0',
                            color: '#0F172A',
                          }
                    }
                  >
                    <span className="text-[9px] font-bold truncate max-w-[90px]">
                      {previewName?.trim() || 'Seu Estabelecimento'}
                    </span>
                    <span
                      className="w-6 h-2 rounded-sm opacity-80"
                      style={{
                        backgroundColor:
                          theme.id === 'resort_tint'
                            ? lightTextOnBrand
                              ? '#FFFFFF'
                              : '#0F172A'
                            : selectedColor,
                      }}
                    />
                  </div>

                  {/* Mini Hero */}
                  <div
                    className="p-2 space-y-1.5"
                    style={
                      theme.id === 'resort_tint'
                        ? {
                            background: `linear-gradient(135deg, ${selectedColor} 0%, ${darkenHex(
                              selectedColor,
                              0.32
                            )} 100%)`,
                          }
                        : theme.id === 'boutique_dark'
                        ? {
                            background: `radial-gradient(circle at top right, ${hexToRgba(
                              selectedColor,
                              0.28
                            )}, #0F172A 70%)`,
                          }
                        : {backgroundColor: '#FFFFFF'}
                    }
                  >
                    <div
                      className={`h-2 w-3/4 rounded-sm ${
                        theme.id === 'classic_light'
                          ? 'bg-slate-800'
                          : 'bg-white/90'
                      }`}
                    />
                    <div
                      className={`h-1.5 w-1/2 rounded-sm ${
                        theme.id === 'classic_light'
                          ? 'bg-slate-300'
                          : 'bg-white/40'
                      }`}
                    />
                    <div className="flex items-center gap-1 pt-0.5">
                      <span
                        className="h-3 w-12 rounded-sm inline-block"
                        style={{
                          backgroundColor:
                            theme.id === 'resort_tint'
                              ? '#FFFFFF'
                              : selectedColor,
                        }}
                      />
                      <span
                        className={`h-3 w-8 rounded-sm border ${
                          theme.id === 'classic_light'
                            ? 'border-slate-300 bg-white'
                            : 'border-white/30 bg-white/10'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Mini Cards Strip */}
                  <div
                    className="p-2 grid grid-cols-2 gap-1.5"
                    style={
                      theme.id === 'resort_tint'
                        ? {backgroundColor: hexToRgba(selectedColor, 0.06)}
                        : undefined
                    }
                  >
                    {[0, 1].map((idx) => (
                      <div
                        key={idx}
                        className={`rounded border p-1.5 space-y-1 ${
                          theme.id === 'boutique_dark'
                            ? 'bg-slate-900 border-slate-800'
                            : 'bg-white border-slate-200'
                        }`}
                        style={{
                          borderTopWidth: '2px',
                          borderTopColor: selectedColor,
                        }}
                      >
                        <div
                          className={`h-1.5 w-full rounded-sm ${
                            theme.id === 'boutique_dark'
                              ? 'bg-slate-700'
                              : 'bg-slate-200'
                          }`}
                        />
                        <div
                          className="h-2.5 w-full rounded-sm"
                          style={{backgroundColor: selectedColor}}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Theme Title & Description */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {theme.name}
                    </span>
                    {active && (
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-700">
                    {theme.subtitle}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    {theme.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
