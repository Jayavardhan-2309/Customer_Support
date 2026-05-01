"use client";

import { useRef, useState } from "react";
import {
  SpeechRecognitionConstructorLike,
  SpeechRecognitionInstanceLike,
} from "./types";

const MAX_RECOGNITION_MS = 60000;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (globalThis.window === undefined) return null;
  const speechWindow = globalThis as typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const finalRef = useRef("");
  const stoppedRef = useRef(false);
  const startTimeRef = useRef(0);

  const createAndStart = () => {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalRef.current += `${event.results[i][0].transcript} `;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalRef.current);
      setInterimTranscript(interim);
    };
    recognition.onend = () => {
      setInterimTranscript("");
      if (stoppedRef.current || Date.now() - startTimeRef.current >= MAX_RECOGNITION_MS) {
        setIsListening(false);
        setTranscript(finalRef.current.trim());
      } else {
        createAndStart();
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        setIsListening(false);
        stoppedRef.current = true;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const start = (preservedText = "") => {
    if (!getSpeechRecognitionConstructor()) return;
    finalRef.current = preservedText ? `${preservedText} ` : "";
    stoppedRef.current = false;
    startTimeRef.current = Date.now();
    setTranscript(preservedText);
    setInterimTranscript("");
    createAndStart();
    setTimeout(() => {
      if (!stoppedRef.current) {
        stoppedRef.current = true;
        recognitionRef.current?.stop();
      }
    }, MAX_RECOGNITION_MS);
  };

  const stop = () => {
    stoppedRef.current = true;
    recognitionRef.current?.stop();
  };

  return { transcript, interimTranscript, isListening, setTranscript, start, stop };
}
