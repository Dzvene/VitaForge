"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  onResult: (text: string) => void;
  lang?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRec = any;

export function useVoiceFood({ onResult, lang = "ru-RU" }: Options) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRec>(null);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !!(((window as any).SpeechRecognition) || ((window as any).webkitSpeechRecognition));
    setSupported(supported);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => {
      const text = (event.results[0]?.[0]?.transcript ?? "").trim();
      if (text) onResult(text);
      stop();
    };

    rec.onerror = () => stop();
    rec.onend = () => setListening(false);

    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [lang, onResult, stop]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => { recRef.current?.stop(); }, []);

  return { listening, supported, toggle, start, stop };
}
