import {Accommodation, SaaSPlanId, Tenant} from '../types/models';

export type MediaAssetRole = 'logo' | 'hero' | 'room_photo';

export interface OptimizedImageResult {
  dataUrl: string;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  savingsPercent: number;
}

export interface PlanMediaQuotaSpec {
  maxCustomImages: number;
  maxTotalStorageKB: number;
  maxPhotosPerRoom: number;
  maxLogoKB: number;
  maxRoomPhotoKB: number;
  maxHeroPhotoKB: number;
}

export const PLAN_MEDIA_QUOTAS: Record<SaaSPlanId, PlanMediaQuotaSpec> = {
  starter: {
    maxCustomImages: 8,
    maxTotalStorageKB: 480,
    maxPhotosPerRoom: 3,
    maxLogoKB: 35,
    maxRoomPhotoKB: 85,
    maxHeroPhotoKB: 110,
  },
  pro: {
    maxCustomImages: 18,
    maxTotalStorageKB: 1100,
    maxPhotosPerRoom: 3,
    maxLogoKB: 45,
    maxRoomPhotoKB: 95,
    maxHeroPhotoKB: 120,
  },
  enterprise: {
    maxCustomImages: 36,
    maxTotalStorageKB: 2200,
    maxPhotosPerRoom: 3,
    maxLogoKB: 55,
    maxRoomPhotoKB: 110,
    maxHeroPhotoKB: 135,
  },
};

export function isCustomUploadedDataUrl(url?: string): boolean {
  return Boolean(url && url.startsWith('data:image/'));
}

export function estimateDataUrlKB(url?: string): number {
  if (!url || !url.startsWith('data:image/')) return 0;
  // Base64 payload is roughly 0.75 bytes per character
  return Math.max(1, Math.round((url.length * 0.75) / 1024));
}

export interface TenantMediaUsageSummary {
  usedCustomImagesCount: number;
  maxCustomImagesCount: number;
  usedStorageKB: number;
  maxStorageKB: number;
  usagePercent: number;
  canUploadMore: boolean;
  quotaSpec: PlanMediaQuotaSpec;
}

export function calculateTenantMediaUsage(
  tenant: Tenant,
  accommodations: Accommodation[]
): TenantMediaUsageSummary {
  const quotaSpec = PLAN_MEDIA_QUOTAS[tenant.plan] || PLAN_MEDIA_QUOTAS.pro;

  let usedCustomImagesCount = 0;
  let usedStorageKB = 0;

  if (isCustomUploadedDataUrl(tenant.logoUrl)) {
    usedCustomImagesCount += 1;
    usedStorageKB += estimateDataUrlKB(tenant.logoUrl);
  }

  if (isCustomUploadedDataUrl(tenant.heroImageUrl)) {
    usedCustomImagesCount += 1;
    usedStorageKB += estimateDataUrlKB(tenant.heroImageUrl);
  }

  for (const acc of accommodations) {
    const photos =
      acc.galleryUrls && acc.galleryUrls.length > 0
        ? acc.galleryUrls
        : acc.imageUrl
        ? [acc.imageUrl]
        : [];
    const uniquePhotos = Array.from(new Set(photos));
    for (const p of uniquePhotos) {
      if (isCustomUploadedDataUrl(p)) {
        usedCustomImagesCount += 1;
        usedStorageKB += estimateDataUrlKB(p);
      }
    }
  }

  const countRatio = (usedCustomImagesCount / quotaSpec.maxCustomImages) * 100;
  const kbRatio = (usedStorageKB / quotaSpec.maxTotalStorageKB) * 100;
  const usagePercent = Math.min(100, Math.round(Math.max(countRatio, kbRatio)));

  return {
    usedCustomImagesCount,
    maxCustomImagesCount: quotaSpec.maxCustomImages,
    usedStorageKB,
    maxStorageKB: quotaSpec.maxTotalStorageKB,
    usagePercent,
    canUploadMore:
      usedCustomImagesCount < quotaSpec.maxCustomImages &&
      usedStorageKB < quotaSpec.maxTotalStorageKB,
    quotaSpec,
  };
}

/**
 * Compresses and resizes an uploaded image file on the client using HTML5 Canvas
 * to WebP/JPEG so it uses minimal cloud memory/bandwidth (<25KB for logos, <75KB for rooms).
 */
export async function compressImageForCloudQuota(
  file: File,
  role: MediaAssetRole
): Promise<OptimizedImageResult> {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
  ];
  if (!validTypes.includes(file.type)) {
    throw new Error(
      'Formato não suportado. Envie uma imagem JPG, PNG ou WebP.'
    );
  }

  // Block raw files > 8 MB before decoding to protect browser memory
  const maxRawBytes = 8 * 1024 * 1024;
  if (file.size > maxRawBytes) {
    throw new Error(
      'Arquivo original muito grande (máx. 8 MB). Escolha uma fotografia menor.'
    );
  }

  const targetSpec =
    role === 'logo'
      ? {maxWidth: 240, maxHeight: 240, quality: 0.8, maxCharLen: 65000}
      : role === 'hero'
      ? {maxWidth: 960, maxHeight: 540, quality: 0.72, maxCharLen: 155000}
      : {maxWidth: 780, maxHeight: 520, quality: 0.72, maxCharLen: 135000};

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(new Error('Não foi possível processar o arquivo de imagem.'));
      el.src = bitmapUrl;
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > targetSpec.maxWidth || height > targetSpec.maxHeight) {
      const ratio = Math.min(
        targetSpec.maxWidth / width,
        targetSpec.maxHeight / height
      );
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Contexto gráfico indisponível no navegador.');
    }

    // Fill white background for non-logo photos; keep transparency if logo is WebP/PNG
    if (role !== 'logo') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    // Prefer WebP for best compression; fallback to JPEG
    let quality = targetSpec.quality;
    let dataUrl = canvas.toDataURL('image/webp', quality);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    // Step down quality if still above target character budget
    while (dataUrl.length > targetSpec.maxCharLen && quality > 0.42) {
      quality = Number((quality - 0.1).toFixed(2));
      const nextTry = canvas.toDataURL('image/jpeg', quality);
      dataUrl = nextTry;
    }

    const compressedBytes = Math.max(256, Math.round(dataUrl.length * 0.75));
    const savingsPercent =
      file.size > compressedBytes
        ? Math.round(((file.size - compressedBytes) / file.size) * 100)
        : 0;

    return {
      dataUrl,
      originalBytes: file.size,
      compressedBytes,
      width,
      height,
      savingsPercent,
    };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}
