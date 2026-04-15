import { useEffect, useRef, useCallback, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import toast from 'react-hot-toast';

export interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => Promise<void> | void;
  minLength?: number;
  scannerMaxGap?: number;
  duplicateDelay?: number;
}

export function useBarcodeScanner({
  onScan,
  minLength = 4,
  scannerMaxGap = 250,
  duplicateDelay = 1000,
}: UseBarcodeScannerOptions) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'scanning' | 'searching' | 'success' | 'not_found' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const lastScannedRef = useRef<{ code: string; timestamp: number } | null>(null);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef<boolean>(false); // Guard to prevent duplicate processing

  const playSuccessSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not supported
    }
  }, []);

  const playErrorSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 300;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not supported
    }
  }, []);

  const processBarcode = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < minLength) return;
    
    // Prevent duplicate processing if already processing
    if (processingRef.current) return;
    
    // Prevent same barcode from being processed too quickly
    const now = Date.now();
    if (lastScannedRef.current && 
        lastScannedRef.current.code === trimmed && 
        now - lastScannedRef.current.timestamp < duplicateDelay) {
      return; // Ignore duplicate within duplicateDelay
    }
    
    processingRef.current = true;
    lastScannedRef.current = { code: trimmed, timestamp: now };
    
    setStatus('searching');
    setMessage(`Qidirilmoqda: ${trimmed}...`);

    try {
      await onScan(trimmed);
      playSuccessSound();
      setStatus('success');
      setMessage(`Topildi: ${trimmed}`);
    } catch (error) {
      playErrorSound();
      setStatus('not_found');
      setMessage(`Topilmadi: ${trimmed}`);
      toast.error(`Mahsulot topilmadi: ${trimmed}`);
    }

    setTimeout(() => {
      setStatus('idle');
      setMessage('');
      setValue('');
      processingRef.current = false;
    }, 1500);
  }, [minLength, onScan, playSuccessSound, playErrorSound, duplicateDelay]);

  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    // Don't process barcode scanning from input
    // User should use scan button or global scanner when input is NOT focused
    
    // Just clear on Escape
    if (e.key === 'Escape') {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
    }
  }, []);

  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let keyBuffer = '';
    let lastKeyTime = 0;
    let flushTimeout: ReturnType<typeof setTimeout> | null = null;
    let listening = true;
    let lastProcessedBarcode = '';

    const handleGlobalKeyDown = (e: Event) => {
      if (!listening) return;
      
      // Skip if input is focused (let input handler deal with it)
      if (document.activeElement === inputRef.current) {
        return;
      }
      
      const ke = e as unknown as { key: string; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean; preventDefault?: () => void; target?: HTMLElement };
      
      // Skip if typing in another input/textarea
      if (ke.target instanceof HTMLInputElement || ke.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const now = Date.now();
      const gap = now - lastKeyTime;
      
      if (ke.ctrlKey && ke.key === 's') {
        ke.preventDefault?.();
        return;
      }
      
      if (ke.key === 'Escape') {
        ke.preventDefault?.();
        return;
      }

      if (ke.key === 'Enter') {
        if (keyBuffer.length >= minLength && lastProcessedBarcode !== keyBuffer && !processingRef.current) {
          lastProcessedBarcode = keyBuffer;
          processBarcode(keyBuffer);
        }
        keyBuffer = '';
        if (flushTimeout) {
          clearTimeout(flushTimeout);
          flushTimeout = null;
        }
        setMessage('');
        return;
      }

      if (ke.ctrlKey || ke.altKey || ke.metaKey) {
        return;
      }
      
      if (ke.key && ke.key.length === 1) {
        if (gap > scannerMaxGap) {
          keyBuffer = '';
        }
        
        keyBuffer += ke.key;
        
        if (flushTimeout) {
          clearTimeout(flushTimeout);
        }
        flushTimeout = setTimeout(() => {
          if (keyBuffer.length >= minLength && lastProcessedBarcode !== keyBuffer && !processingRef.current) {
            lastProcessedBarcode = keyBuffer;
            processBarcode(keyBuffer);
          }
          keyBuffer = '';
          flushTimeout = null;
        }, scannerMaxGap + 100);
      }
      
      lastKeyTime = now;
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    
    return () => {
      listening = false;
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
      if (flushTimeout) {
        clearTimeout(flushTimeout);
      }
    };
  }, [minLength, scannerMaxGap, processBarcode]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    if (status === 'success' || status === 'not_found' || status === 'error') {
      timeoutId = setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 2000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status]);

  return {
    inputRef,
    value,
    onChange,
    onKeyDown,
    focus,
    status,
    message,
    isScanning: status === 'scanning' || status === 'searching',
  };
}