import React, {useRef, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  HardDrive,
  ImagePlus,
  Link2,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {DEMO_IMAGES} from '../../services/tenantProvisioning';
import {
  compressImageForCloudQuota,
  estimateDataUrlKB,
  isCustomUploadedDataUrl,
  MediaAssetRole,
  TenantMediaUsageSummary,
} from '../../utils/imageOptimizer';
import {ResilientImage} from './ResilientImage';

interface SingleMediaUploaderProps {
  label: string;
  helperText: string;
  role: 'logo' | 'hero';
  value: string;
  onChange: (nextUrl: string) => void;
  usage: TenantMediaUsageSummary;
  fallbackText?: string;
}

export const CloudQuotaUsageBar: React.FC<{
  usage: TenantMediaUsageSummary;
  planName?: string;
}> = ({usage, planName}) => {
  const isNearLimit = usage.usagePercent >= 80;
  return (
    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <HardDrive className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>
            Cota de Mídia na Nuvem da Conta{planName ? ` (${planName})` : ''}
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-700">
          <strong>
            {usage.usedCustomImagesCount}/{usage.maxCustomImagesCount}
          </strong>{' '}
          fotos próprias ·{' '}
          <strong>
            {usage.usedStorageKB} KB / {usage.maxStorageKB} KB
          </strong>{' '}
          ({usage.usagePercent}%)
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            !usage.canUploadMore
              ? 'bg-red-600'
              : isNearLimit
              ? 'bg-amber-500'
              : 'bg-emerald-600'
          }`}
          style={{width: `${Math.max(3, usage.usagePercent)}%`}}
        />
      </div>

      <p className="text-[11px] text-slate-500 leading-snug">
        Otimização inteligente ativa: fotos enviadas são redimensionadas e
        convertidas automaticamente em WebP/JPEG leve no navegador (economia de
        até 92% de memória e processamento em nuvem).
      </p>
    </div>
  );
};

export const SingleCloudMediaUploader: React.FC<SingleMediaUploaderProps> = ({
  label,
  helperText,
  role,
  value,
  onChange,
  usage,
  fallbackText,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [compressionNote, setCompressionNote] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const isCurrentCustom = isCustomUploadedDataUrl(value);
  const currentKB = estimateDataUrlKB(value);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setCompressionNote(null);

    // If replacing an existing custom image, it doesn't increase image count
    if (!isCurrentCustom && !usage.canUploadMore) {
      setErrorMsg(
        `Limite da conta atingido (${usage.maxCustomImagesCount} fotos / ${usage.maxStorageKB} KB). Remova uma imagem antiga ou use um modelo da galeria.`
      );
      return;
    }

    setIsProcessing(true);
    try {
      const result = await compressImageForCloudQuota(file, role);
      const nextKB = Math.max(1, Math.round(result.compressedBytes / 1024));
      const projectedKB =
        usage.usedStorageKB - (isCurrentCustom ? currentKB : 0) + nextKB;

      if (projectedKB > usage.maxStorageKB) {
        setErrorMsg(
          `Esta imagem (${nextKB} KB) ultrapassaria a cota de memória da conta (${usage.maxStorageKB} KB).`
        );
        return;
      }

      onChange(result.dataUrl);
      setCompressionNote(
        `Otimizada para ${nextKB} KB (${result.width}×${result.height}px · -${result.savingsPercent}% de memória)`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Falha ao comprimir imagem.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0 flex-1">
          <label className="block font-semibold text-slate-800">{label}</label>
          <p className="text-[11px] text-slate-500">{helperText}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="guest-btn-transition h-8 px-3 rounded-lg bg-slate-900 text-white font-semibold inline-flex items-center gap-1.5 hover:bg-slate-800 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Otimizando...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Enviar Arquivo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowUrlInput((prev) => !prev);
              setUrlDraft(value.startsWith('http') ? value : '');
            }}
            className="guest-btn-transition h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium inline-flex items-center gap-1 hover:bg-slate-50"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link URL</span>
          </button>

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(role === 'hero' ? DEMO_IMAGES.hero : '');
                setCompressionNote(null);
              }}
              title="Remover imagem personalizada"
              className="guest-btn-transition h-8 px-2 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Preview Row */}
      <div className="flex items-center gap-3 pt-1">
        {role === 'logo' ? (
          <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
            {value ? (
              <ResilientImage
                src={value}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-slate-400">
                {(fallbackText || 'LOGO').slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        ) : (
          <div className="w-28 h-16 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0">
            <ResilientImage
              src={value || DEMO_IMAGES.hero}
              alt="Capa do Estabelecimento"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          {value ? (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-semibold text-slate-800">
                {isCurrentCustom
                  ? `Arquivo enviado na nuvem (${currentKB} KB)`
                  : 'Imagem externa / Galeria padrão (0 KB da cota)'}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 block">
              Nenhum logotipo enviado. O sistema exibirá as iniciais do
              estabelecimento até você enviar uma imagem.
            </span>
          )}

          {compressionNote && (
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{compressionNote}</span>
            </div>
          )}

          {role === 'hero' && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-500">
                Ou escolha da galeria leve (0 KB):
              </span>
              {[
                {label: 'Resort / Piscina', url: DEMO_IMAGES.hero},
                {label: 'Suíte Vista Mar', url: DEMO_IMAGES.masterSuite},
                {label: 'Chalé Serra', url: DEMO_IMAGES.familyChalet},
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onChange(preset.url);
                    setCompressionNote(null);
                  }}
                  className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                    value === preset.url
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://exemplo.com/imagem.jpg"
            className="h-8 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900"
          />
          <button
            type="button"
            onClick={() => {
              if (urlDraft.trim()) {
                onChange(urlDraft.trim());
                setShowUrlInput(false);
                setCompressionNote(null);
              }
            }}
            className="h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold"
          >
            Aplicar URL
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

interface RoomPhotosGalleryUploaderProps {
  photos: string[];
  onChangePhotos: (nextPhotos: string[]) => void;
  usage: TenantMediaUsageSummary;
  maxPhotosPerRoom?: number;
}

export const RoomPhotosGalleryUploader: React.FC<
  RoomPhotosGalleryUploaderProps
> = ({photos, onChangePhotos, usage, maxPhotosPerRoom = 3}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [showUrlBox, setShowUrlBox] = useState(false);

  const canAddSlot = photos.length < maxPhotosPerRoom;

  const handleUploadRoomPhoto = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setStatusNote(null);

    if (!canAddSlot) {
      setErrorMsg(
        `Limite de ${maxPhotosPerRoom} fotos por acomodação atingido para economizar memória.`
      );
      return;
    }

    if (!usage.canUploadMore) {
      setErrorMsg(
        `Cota de imagens da conta atingida (${usage.maxCustomImagesCount} fotos / ${usage.maxStorageKB} KB).`
      );
      return;
    }

    setIsProcessing(true);
    try {
      const result = await compressImageForCloudQuota(
        file,
        'room_photo' as MediaAssetRole
      );
      const nextKB = Math.max(1, Math.round(result.compressedBytes / 1024));
      if (usage.usedStorageKB + nextKB > usage.maxStorageKB) {
        setErrorMsg(
          `Esta foto (${nextKB} KB) excede o limite de memória do seu plano (${usage.maxStorageKB} KB).`
        );
        return;
      }

      const nextList = [...photos, result.dataUrl].slice(0, maxPhotosPerRoom);
      onChangePhotos(nextList);
      setStatusNote(
        `Foto adicionada e comprimida para ${nextKB} KB (${result.width}×${result.height}px · -${result.savingsPercent}% de tamanho).`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erro ao comprimir foto do quarto.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetMainPhoto = (idx: number) => {
    if (idx === 0) return;
    const picked = photos[idx];
    const rest = photos.filter((_, i) => i !== idx);
    onChangePhotos([picked, ...rest]);
  };

  const handleRemovePhoto = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    onChangePhotos(next);
  };

  const handleAddPresetPhoto = (presetUrl: string) => {
    setErrorMsg(null);
    if (photos.includes(presetUrl)) return;
    if (photos.length >= maxPhotosPerRoom) {
      // Replace the last one or first one if full
      onChangePhotos([presetUrl, ...photos.slice(1)]);
      return;
    }
    onChangePhotos([...photos, presetUrl]);
  };

  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-bold text-slate-900 block">
            Fotografias do Quarto / Acomodação ({photos.length}/
            {maxPhotosPerRoom} máx.)
          </span>
          <span className="text-[11px] text-slate-500">
            Envie fotos reais do seu computador/celular (comprimidas
            automaticamente em ~45 KB) ou use fotos da galeria (0 KB).
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={handleUploadRoomPhoto}
            className="hidden"
          />
          <button
            type="button"
            disabled={isProcessing || !canAddSlot}
            onClick={() => fileInputRef.current?.click()}
            className="guest-btn-transition h-8 px-3 rounded-lg bg-slate-900 text-white font-semibold inline-flex items-center gap-1.5 hover:bg-slate-800 disabled:opacity-45"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Comprimindo...</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Enviar Foto do Quarto</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={!canAddSlot}
            onClick={() => setShowUrlBox((prev) => !prev)}
            className="guest-btn-transition h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium inline-flex items-center gap-1 hover:bg-slate-50 disabled:opacity-45"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>URL</span>
          </button>
        </div>
      </div>

      {/* Thumbnails Grid (up to 3 slots) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {photos.map((url, idx) => {
          const isCustom = isCustomUploadedDataUrl(url);
          const kb = estimateDataUrlKB(url);
          return (
            <div
              key={`${idx}_${url.slice(0, 28)}`}
              className={`rounded-lg border bg-white p-2 space-y-1.5 ${
                idx === 0
                  ? 'border-slate-900 ring-1 ring-slate-900'
                  : 'border-slate-200'
              }`}
            >
              <div className="h-24 w-full rounded overflow-hidden border border-slate-100 relative">
                <ResilientImage
                  src={url}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px] font-semibold">
                  {idx === 0 ? 'Capa Principal' : `Foto ${idx + 1}`}
                </span>
              </div>

              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className="font-mono text-slate-500 truncate">
                  {isCustom ? `${kb} KB (nuvem)` : 'Galeria (0 KB)'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetMainPhoto(idx)}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"
                    >
                      Tornar Capa
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    title="Remover foto"
                    className="p-1 rounded text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {photos.length === 0 && (
          <div className="sm:col-span-3 p-4 rounded-lg border border-dashed border-slate-300 bg-white text-center text-slate-500">
            Nenhuma fotografia selecionada. Envie uma foto do quarto ou escolha
            um modelo abaixo.
          </div>
        )}
      </div>

      {/* Quick Zero-Cost Preset Gallery Selector */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-medium text-slate-600 inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-slate-500" />
          <span>Modelos prontos (0 KB da cota):</span>
        </span>
        {[
          {label: 'Suíte Master', url: DEMO_IMAGES.masterSuite},
          {label: 'Chalé Familiar', url: DEMO_IMAGES.familyChalet},
          {label: 'Dormitório / Camas', url: DEMO_IMAGES.sharedDorm},
          {label: 'Studio Individual', url: DEMO_IMAGES.singleStudio},
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handleAddPresetPhoto(preset.url)}
            className="px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:border-slate-400"
          >
            + {preset.label}
          </button>
        ))}
      </div>

      {showUrlBox && (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://exemplo.com/foto-quarto.jpg"
            className="h-8 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900"
          />
          <button
            type="button"
            onClick={() => {
              if (urlDraft.trim() && canAddSlot) {
                onChangePhotos([...photos, urlDraft.trim()]);
                setUrlDraft('');
                setShowUrlBox(false);
              }
            }}
            className="h-8 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold"
          >
            Adicionar
          </button>
        </div>
      )}

      {statusNote && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{statusNote}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
