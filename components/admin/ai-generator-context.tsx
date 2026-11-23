"use client";

import * as React from "react";
import { useToast } from "@/components/ui/toast";
import type { GeneratedMCQ, EditableQuestionItem } from "@/lib/validations/ai";

export interface AIGenerationParams {
  classLevel: number;
  subject: string;
  topic: string;
  language: "English" | "Hindi" | "Punjabi";
  count: number;
  difficulty: string;
  extraInstructions?: string;
}

export interface AIGeneratorContextType {
  // Form fields
  classLevel: number;
  setClassLevel: (level: number) => void;
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  topic: string;
  setTopic: (t: string) => void;
  language: "English" | "Hindi" | "Punjabi";
  setLanguage: (lang: "English" | "Hindi" | "Punjabi") => void;
  count: number;
  setCount: (c: number) => void;
  difficulty: string;
  setDifficulty: (d: string) => void;
  extraInstructions: string;
  setExtraInstructions: (i: string) => void;

  // Generation status & results
  isGenerating: boolean;
  generatedQuestions: EditableQuestionItem[];
  setGeneratedQuestions: React.Dispatch<React.SetStateAction<EditableQuestionItem[]>>;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  generationSummary: {
    classLevel: number;
    subject: string;
    topic: string;
    count: number;
  } | null;

  // Operations
  startGeneration: (params: AIGenerationParams) => Promise<void>;
  cancelGeneration: () => void;
  clearGeneratedQuestions: () => void;
  toggleQuestion: (id: string) => void;
  selectAllQuestions: (select: boolean) => void;
  updateQuestionField: (
    id: string,
    field: keyof GeneratedMCQ,
    value: string
  ) => void;
}

const AIGeneratorContext = React.createContext<AIGeneratorContextType | undefined>(undefined);

const STORAGE_KEY = "testhub_ai_generated_questions";
const PARAMS_STORAGE_KEY = "testhub_ai_params";

export function AIGeneratorProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  // Form State
  const [classLevel, setClassLevel] = React.useState<number>(10);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("");
  const [topic, setTopic] = React.useState<string>("");
  const [language, setLanguage] = React.useState<"English" | "Hindi" | "Punjabi">("English");
  const [count, setCount] = React.useState<number>(50);
  const [difficulty, setDifficulty] = React.useState<string>("Moderate to Hard");
  const [extraInstructions, setExtraInstructions] = React.useState<string>("");

  // Generation State
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedQuestions, setGeneratedQuestions] = React.useState<EditableQuestionItem[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [abortController, setAbortController] = React.useState<AbortController | null>(null);
  const [generationSummary, setGenerationSummary] = React.useState<{
    classLevel: number;
    subject: string;
    topic: string;
    count: number;
  } | null>(null);

  // Restore previous generated questions from sessionStorage on mount
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGeneratedQuestions(parsed);
        }
      }

      const savedParams = sessionStorage.getItem(PARAMS_STORAGE_KEY);
      if (savedParams) {
        const p = JSON.parse(savedParams);
        if (p.classLevel) setClassLevel(p.classLevel);
        if (p.topic) setTopic(p.topic);
        if (p.count) setCount(p.count);
        if (p.difficulty) setDifficulty(p.difficulty);
        if (p.language) setLanguage(p.language);
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }, []);

  // Sync generated questions to sessionStorage
  React.useEffect(() => {
    try {
      if (generatedQuestions.length > 0) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(generatedQuestions));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore quota exceeded
    }
  }, [generatedQuestions]);

  // Protect against tab closure while generation is active
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isGenerating]);

  // Start Generation: persistent across page changes inside /admin
  const startGeneration = React.useCallback(
    async (params: AIGenerationParams) => {
      setErrorMessage(null);
      const controller = new AbortController();
      setAbortController(controller);
      setIsGenerating(true);
      setGenerationSummary({
        classLevel: params.classLevel,
        subject: params.subject,
        topic: params.topic,
        count: params.count,
      });

      // Save parameters
      try {
        sessionStorage.setItem(
          PARAMS_STORAGE_KEY,
          JSON.stringify({
            classLevel: params.classLevel,
            topic: params.topic,
            count: params.count,
            difficulty: params.difficulty,
            language: params.language,
          })
        );
      } catch {
        // Ignore
      }

      try {
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classLevel: params.classLevel,
            subject: params.subject,
            topic: params.topic.trim(),
            language: params.language,
            count: params.count,
            difficulty: params.difficulty,
            extraInstructions: params.extraInstructions?.trim() || undefined,
          }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to generate questions");
        }

        const questions: GeneratedMCQ[] = data.questions || [];
        const editableItems: EditableQuestionItem[] = questions.map((q, idx) => ({
          ...q,
          id: `gen-${Date.now()}-${idx}`,
          selected: true,
        }));

        setGeneratedQuestions(editableItems);
        toast.success(
          `Generated ${editableItems.length} questions for Class ${params.classLevel} ${params.subject}! You can review and add them to a test in AI Generator.`,
          "Generation Complete"
        );
      } catch (err: any) {
        if (err.name === "AbortError") {
          toast.info("AI question generation was cancelled.");
        } else {
          const msg = err.message || "An error occurred during question generation.";
          setErrorMessage(msg);
          toast.error(msg, "AI Generation Failed");
        }
      } finally {
        setIsGenerating(false);
        setAbortController(null);
      }
    },
    [toast]
  );

  const cancelGeneration = React.useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
  }, [abortController]);

  const clearGeneratedQuestions = React.useCallback(() => {
    setGeneratedQuestions([]);
    setErrorMessage(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const toggleQuestion = React.useCallback((id: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
    );
  }, []);

  const selectAllQuestions = React.useCallback((select: boolean) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => ({ ...q, selected: select }))
    );
  }, []);

  const updateQuestionField = React.useCallback(
    (id: string, field: keyof GeneratedMCQ, value: string) => {
      setGeneratedQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
      );
    },
    []
  );

  return (
    <AIGeneratorContext.Provider
      value={{
        classLevel,
        setClassLevel,
        selectedSubjectId,
        setSelectedSubjectId,
        topic,
        setTopic,
        language,
        setLanguage,
        count,
        setCount,
        difficulty,
        setDifficulty,
        extraInstructions,
        setExtraInstructions,
        isGenerating,
        generatedQuestions,
        setGeneratedQuestions,
        errorMessage,
        setErrorMessage,
        generationSummary,
        startGeneration,
        cancelGeneration,
        clearGeneratedQuestions,
        toggleQuestion,
        selectAllQuestions,
        updateQuestionField,
      }}
    >
      {children}
    </AIGeneratorContext.Provider>
  );
}

export function useAIGenerator() {
  const context = React.useContext(AIGeneratorContext);
  if (!context) {
    throw new Error("useAIGenerator must be used within an AIGeneratorProvider");
  }
  return context;
}
