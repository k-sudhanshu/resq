'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Icon from '@/components/Icon';

const MAX_BYTES = 3 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Optional and always skippable in one tap. Size and type are pre-checked
 * here purely to fail fast; the backend re-validates by magic bytes and never
 * stores the file.
 */
export default function ImagePicker({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const t = useTranslations('assess');
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    if (!selected) {
      onChange(null);
      return;
    }
    if (!ACCEPTED.includes(selected.type)) {
      setError(t('imageWrongType'));
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError(t('imageTooLarge'));
      return;
    }
    onChange(selected);
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-headline-md text-primary">{t('imageTitle')}</h2>
        <p className="mt-1 text-onSurface-variant">{t('imageBody')}</p>
      </div>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- local blob URL, not a remote asset
        <img
          src={preview}
          alt=""
          className="max-h-64 w-full rounded-lg border border-outline-variant object-contain"
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        onChange={handleSelect}
        className="hidden"
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-secondary"
        >
          <Icon name="photo_camera" />
          {t('imageChoose')}
        </button>
        {file && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="btn-secondary"
          >
            {t('imageRemove')}
          </button>
        )}
      </div>

      {error && (
        <p className="text-critical-onContainer" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
