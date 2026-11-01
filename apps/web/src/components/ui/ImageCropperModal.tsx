'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move, Loader2 } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  cropShape: 'circle' | 'rect';
  aspectRatio?: number; // e.g. 1 for circle/square, 3 for 3:1 cover
  title: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => Promise<void> | void;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  cropShape = 'circle',
  aspectRatio = cropShape === 'circle' ? 1 : 2.8,
  title,
  onClose,
  onCropComplete,
}: ImageCropperModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  // Load image
  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      setImage(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
  }, [isOpen, imageSrc]);

  // Draw crop preview on canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Calculate crop window
    let cropWidth = width * 0.85;
    let cropHeight = cropWidth / aspectRatio;
    if (cropHeight > height * 0.85) {
      cropHeight = height * 0.85;
      cropWidth = cropHeight * aspectRatio;
    }

    const cropX = (width - cropWidth) / 2;
    const cropY = (height - cropHeight) / 2;

    // Draw background dimmed
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw transformed image
    ctx.save();
    // Clip to crop region
    ctx.beginPath();
    if (cropShape === 'circle') {
      const radius = Math.min(cropWidth, cropHeight) / 2;
      ctx.arc(cropX + cropWidth / 2, cropY + cropHeight / 2, radius, 0, Math.PI * 2);
    } else {
      ctx.rect(cropX, cropY, cropWidth, cropHeight);
    }
    ctx.clip();

    // Scale and translate
    const imgScale = Math.max(cropWidth / image.width, cropHeight / image.height) * zoom;
    const imgDrawW = image.width * imgScale;
    const imgDrawH = image.height * imgScale;

    const imgCenterX = cropX + cropWidth / 2 + offset.x;
    const imgCenterY = cropY + cropHeight / 2 + offset.y;

    ctx.drawImage(
      image,
      imgCenterX - imgDrawW / 2,
      imgCenterY - imgDrawH / 2,
      imgDrawW,
      imgDrawH,
    );
    ctx.restore();

    // Draw overlay shading around crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    if (cropShape === 'circle') {
      const radius = Math.min(cropWidth, cropHeight) / 2;
      ctx.arc(cropX + cropWidth / 2, cropY + cropHeight / 2, radius, 0, Math.PI * 2, true);
    } else {
      ctx.rect(cropX + cropWidth, cropY, -cropWidth, cropHeight);
    }
    ctx.fill();

    // Draw crop border guideline
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (cropShape === 'circle') {
      const radius = Math.min(cropWidth, cropHeight) / 2;
      ctx.arc(cropX + cropWidth / 2, cropY + cropHeight / 2, radius, 0, Math.PI * 2);
    } else {
      ctx.roundRect ? ctx.roundRect(cropX, cropY, cropWidth, cropHeight, 16) : ctx.rect(cropX, cropY, cropWidth, cropHeight);
    }
    ctx.stroke();

    ctx.restore();
  }, [image, zoom, offset, cropShape, aspectRatio]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handling
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleApply = async () => {
    if (!image) return;
    setProcessing(true);

    try {
      // Create high-res offscreen canvas for final export
      const exportCanvas = document.createElement('canvas');
      const targetWidth = cropShape === 'circle' ? 600 : 1200;
      const targetHeight = targetWidth / aspectRatio;

      exportCanvas.width = targetWidth;
      exportCanvas.height = targetHeight;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // Calculate scale relative to preview canvas
      const previewCanvas = canvasRef.current;
      const previewW = previewCanvas ? previewCanvas.width : 500;
      const previewH = previewCanvas ? previewCanvas.height : 350;

      let cropWidth = previewW * 0.85;
      let cropHeight = cropWidth / aspectRatio;
      if (cropHeight > previewH * 0.85) {
        cropHeight = previewH * 0.85;
        cropWidth = cropHeight * aspectRatio;
      }

      const scaleRatio = targetWidth / cropWidth;
      const imgScale = Math.max(cropWidth / image.width, cropHeight / image.height) * zoom * scaleRatio;
      const imgDrawW = image.width * imgScale;
      const imgDrawH = image.height * imgScale;

      const imgCenterX = targetWidth / 2 + offset.x * scaleRatio;
      const imgCenterY = targetHeight / 2 + offset.y * scaleRatio;

      ctx.drawImage(
        image,
        imgCenterX - imgDrawW / 2,
        imgCenterY - imgDrawH / 2,
        imgDrawW,
        imgDrawH,
      );

      // Convert to blob and File
      exportCanvas.toBlob(
        async (blob) => {
          if (!blob) {
            setProcessing(false);
            return;
          }
          const fileName = cropShape === 'circle' ? 'avatar_cropped.jpg' : 'cover_cropped.jpg';
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          await onCropComplete(file);
          setProcessing(false);
          onClose();
        },
        'image/jpeg',
        0.92,
      );
    } catch (err) {
      console.error('Failed to crop image:', err);
      setProcessing(false);
      alert('Error cropping image');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-foreground">{title}</h3>
            <p className="text-xs text-muted">Drag to reposition, use slider to zoom</p>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="p-1.5 rounded-full hover:bg-surface-muted text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Canvas */}
        <div className="relative bg-slate-950 flex items-center justify-center overflow-hidden p-2">
          <canvas
            ref={canvasRef}
            width={520}
            height={360}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="cursor-move max-w-full max-h-[50vh] object-contain rounded-xl select-none touch-none shadow-inner"
          />
          <div className="absolute bottom-3 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] pointer-events-none">
            <Move className="w-3.5 h-3.5" />
            <span>Pan / Move</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="p-4 px-6 bg-surface-muted/30 border-t border-border flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
              className="p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-muted text-muted hover:text-foreground transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-primary cursor-pointer h-1.5 rounded-lg bg-border"
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-muted text-muted hover:text-foreground transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-muted text-muted hover:text-foreground transition-colors text-xs font-semibold flex items-center gap-1"
              title="Reset position"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 px-6 border-t border-border flex items-center justify-end gap-3 bg-surface">
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-border text-xs font-semibold text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={processing}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow-md shadow-primary/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Apply & Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
