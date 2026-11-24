"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Copy,
  Plus,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileJson,
  X,
  Check,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  getSubjectsForClassAction,
  getExistingTestsForSubjectAction,
  addQuestionsToExistingTestAction,
  createTestWithQuestionsAction,
} from "@/app/admin/ai-generator/actions";
import { getDefaultShowResultAction } from "@/app/admin/settings/actions";
import type { GeneratedMCQ, EditableQuestionItem } from "@/lib/validations/ai";
import { useAIGenerator } from "./ai-generator-context";

interface PresetChip {
  label: string;
  count: number;
  difficulty: string;
}

const PRESET_CHIPS: PresetChip[] = [
  { label: "50 Easy to Moderate", count: 50, difficulty: "Easy to Moderate" },
  { label: "50 Moderate to Hard", count: 50, difficulty: "Moderate to Hard" },
  { label: "50 Hard", count: 50, difficulty: "Hard" },
  { label: "25 Easy to Moderate", count: 25, difficulty: "Easy to Moderate" },
  { label: "25 Moderate to Hard", count: 25, difficulty: "Moderate to Hard" },
  { label: "10 Quick Practice (Easy)", count: 10, difficulty: "Easy" },
];

export function AIGeneratorForm() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const initialClass = searchParams.get("class")
    ? parseInt(searchParams.get("class")!, 10)
    : 10;
  const initialSubjectId = searchParams.get("subject") || "";

  // Persistent AI Generator Context State
  const {
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
    startGeneration,
    cancelGeneration,
    toggleQuestion,
    selectAllQuestions,
    updateQuestionField,
  } = useAIGenerator();

  const [subjectsList, setSubjectsList] = React.useState<{ id: string; name: string }[]>([]);

  // Add to Test Modal state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [testMode, setTestMode] = React.useState<"existing" | "new">("new");
  const [existingTests, setExistingTests] = React.useState<
    { id: string; title: string; durationMinutes: number | null }[]
  >([]);
  const [selectedTestId, setSelectedTestId] = React.useState<string>("");
  const [newTestTitle, setNewTestTitle] = React.useState<string>("");
  const [newTestDuration, setNewTestDuration] = React.useState<number | string>(30);
  const [newTestMarks, setNewTestMarks] = React.useState<number | string>(1);
  const [newTestNegativeMarks, setNewTestNegativeMarks] = React.useState<number | string>(0);
  const [newTestShowResult, setNewTestShowResult] = React.useState<boolean>(false);
  const [newTestIsPublished, setNewTestIsPublished] = React.useState<boolean>(true);
  const [isSavingTest, setIsSavingTest] = React.useState(false);

  // Set initial class/subject if provided via query params and not already set
  React.useEffect(() => {
    if (initialClass && (!classLevel || classLevel === 10)) {
      if (initialClass >= 8 && initialClass <= 12) {
        setClassLevel(initialClass);
      }
    }
    if (initialSubjectId && !selectedSubjectId) {
      setSelectedSubjectId(initialSubjectId);
    }
  }, [initialClass, initialSubjectId]);

  // Load default show result setting on mount
  React.useEffect(() => {
    async function loadDefaultSetting() {
      const res = await getDefaultShowResultAction();
      if (res.success) {
        setNewTestShowResult(res.defaultShowResult);
      }
    }
    loadDefaultSetting();
  }, []);

  // Load subjects whenever class changes
  React.useEffect(() => {
    let isMounted = true;
    async function loadSubjects() {
      const res = await getSubjectsForClassAction(classLevel);
      if (isMounted && res.success) {
        setSubjectsList(res.subjects);
        if (res.subjects.length > 0) {
          // If query param matches an existing subject, keep it, otherwise pick the first
          const found = res.subjects.find((s) => s.id === selectedSubjectId);
          if (!found) {
            setSelectedSubjectId(res.subjects[0].id);
          }
        } else {
          setSelectedSubjectId("");
        }
      }
    }
    loadSubjects();
    return () => {
      isMounted = false;
    };
  }, [classLevel]);

  // Selected subject name
  const currentSubjectName =
    subjectsList.find((s) => s.id === selectedSubjectId)?.name || "General";

  // Preset chip click
  const handleApplyPreset = (chip: PresetChip) => {
    setCount(chip.count);
    setDifficulty(chip.difficulty);
    toast.info(`Preset applied: ${chip.count} questions, ${chip.difficulty}`);
  };

  // Generate Questions via Context
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!topic.trim()) {
      setErrorMessage("Please enter a topic or chapter name.");
      return;
    }

    if (!selectedSubjectId && subjectsList.length > 0) {
      setErrorMessage("Please select a subject.");
      return;
    }

    const finalCount = typeof count === "number" ? count : parseInt(String(count), 10);
    if (!finalCount || isNaN(finalCount) || finalCount < 1 || finalCount > 50) {
      setErrorMessage("Please enter a valid number of questions between 1 and 50.");
      return;
    }

    // Pre-fill new test title
    setNewTestTitle(`${topic.trim()} - Class ${classLevel} Test`);

    await startGeneration({
      classLevel,
      subject: currentSubjectName,
      subjectId: selectedSubjectId,
      topic: topic.trim(),
      language,
      count: finalCount,
      difficulty,
      extraInstructions: extraInstructions.trim() || undefined,
    });
  };

  const handleCancel = () => {
    cancelGeneration();
  };

  // Question editing handlers
  const handleToggleQuestion = (id: string) => {
    toggleQuestion(id);
  };

  const handleSelectAll = (select: boolean) => {
    selectAllQuestions(select);
  };

  const handleUpdateQuestion = (
    id: string,
    field: keyof GeneratedMCQ,
    value: string
  ) => {
    updateQuestionField(id, field, value);
  };

  // Selected count
  const selectedCount = generatedQuestions.filter((q) => q.selected).length;

  // Copy as CSV
  const handleCopyCSV = async () => {
    const selected = generatedQuestions.filter((q) => q.selected);
    if (selected.length === 0) {
      toast.warning("No questions selected to copy.");
      return;
    }

    const header = "question_text,option_a,option_b,option_c,option_d,correct_option,explanation";
    const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

    const rows = selected.map((q) =>
      [
        escapeCsv(q.question),
        escapeCsv(q.option_a),
        escapeCsv(q.option_b),
        escapeCsv(q.option_c),
        escapeCsv(q.option_d),
        q.correct,
        escapeCsv(q.explanation || ""),
      ].join(",")
    );

    const csvContent = [header, ...rows].join("\n");
    await navigator.clipboard.writeText(csvContent);
    toast.success(`Copied ${selected.length} questions as CSV to clipboard.`);
  };

  // Copy as JSON
  const handleCopyJSON = async () => {
    const selected = generatedQuestions.filter((q) => q.selected);
    if (selected.length === 0) {
      toast.warning("No questions selected to copy.");
      return;
    }

    const clean = selected.map(({ id, selected: _, ...rest }) => rest);
    await navigator.clipboard.writeText(JSON.stringify(clean, null, 2));
    toast.success(`Copied ${selected.length} questions as JSON to clipboard.`);
  };

  // Open "Add to Test" Modal
  const handleOpenAddModal = async () => {
    if (selectedCount === 0) {
      toast.warning("Please tick at least one question to add.");
      return;
    }

    // Default subject if not set
    let currentSubId = selectedSubjectId;
    if (!currentSubId && subjectsList.length > 0) {
      currentSubId = subjectsList[0].id;
      setSelectedSubjectId(currentSubId);
    }

    // Default title if empty
    if (!newTestTitle.trim()) {
      setNewTestTitle(`${topic ? topic.trim() : "MCQ Assessment"} - Class ${classLevel}`);
    }

    // Fetch existing tests for this subject
    if (currentSubId) {
      const res = await getExistingTestsForSubjectAction(currentSubId);
      if (res.success && res.tests.length > 0) {
        setExistingTests(res.tests);
        setSelectedTestId(res.tests[0].id);
        setTestMode("existing");
      } else {
        setExistingTests([]);
        setTestMode("new");
      }
    } else {
      setTestMode("new");
    }

    setIsAddModalOpen(true);
  };

  // Save selected questions to test
  const handleSaveToTest = async () => {
    const selected = generatedQuestions.filter((q) => q.selected);
    if (selected.length === 0) return;

    setIsSavingTest(true);

    try {
      if (testMode === "existing") {
        if (!selectedTestId) {
          toast.error("Please select an existing test.");
          setIsSavingTest(false);
          return;
        }

        const res = await addQuestionsToExistingTestAction(
          selectedTestId,
          selected.map(({ id, selected: _, ...rest }) => rest)
        );

        if (res.success) {
          toast.success(`Added ${res.insertedCount} questions to test!`);
          setIsAddModalOpen(false);
        } else {
          toast.error(res.error || "Failed to add questions to test.");
        }
      } else {
        // Create new test
        if (!selectedSubjectId) {
          toast.error("Please select a subject for the test.");
          setIsSavingTest(false);
          return;
        }

        if (!newTestTitle.trim()) {
          toast.error("Please enter a test title.");
          setIsSavingTest(false);
          return;
        }

        const res = await createTestWithQuestionsAction({
          subjectId: selectedSubjectId,
          title: newTestTitle.trim(),
          durationMinutes: Number(newTestDuration) || 30,
          marksPerQuestion: Number(newTestMarks) || 1,
          negativeMarks: Number(newTestNegativeMarks) || 0,
          showResult: newTestShowResult,
          isPublished: newTestIsPublished,
          questions: selected.map(({ id, selected: _, ...rest }) => rest),
        });

        if (res.success) {
          toast.success(
            newTestIsPublished
              ? `Test "${res.testTitle}" published with ${res.insertedCount} questions!`
              : `Test "${res.testTitle}" saved as Draft (${res.insertedCount} questions). You can publish it from the Tests menu anytime!`
          );
          setIsAddModalOpen(false);
        } else {
          toast.error(res.error || "Failed to create test.");
        }
      }
    } catch (e: any) {
      toast.error(e?.message || "An unexpected error occurred.");
    } finally {
      setIsSavingTest(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* -------------------------------------------------------------------- */}
      {/* PRESET CHIPS */}
      {/* -------------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Quick Generation Presets
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_CHIPS.map((chip) => {
            const isCurrent =
              count === chip.count && difficulty === chip.difficulty;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleApplyPreset(chip)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-[6px] text-xs font-medium transition-colors border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] ${
                  isCurrent
                    ? "bg-[#1E3A8A] text-white border-[#1E3A8A]"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* GENERATOR FORM CARD */}
      {/* -------------------------------------------------------------------- */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[6px] bg-blue-50 text-[#1E3A8A] flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-[#1E3A8A]" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">
                AI Question Generator
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Generate NCERT-syllabus aligned MCQs with answer keys and explanations via Gemini.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleGenerate}>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Error Message */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-[6px] border border-red-200 bg-red-50 text-red-700 text-sm leading-snug"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Class Selector */}
              <Select
                label="Target Class"
                value={classLevel}
                onChange={(e) => setClassLevel(parseInt(e.target.value, 10))}
                options={[
                  { value: 8, label: "Class 8" },
                  { value: 9, label: "Class 9" },
                  { value: 10, label: "Class 10" },
                  { value: 11, label: "Class 11" },
                  { value: 12, label: "Class 12" },
                ]}
              />

              {/* Subject Selector */}
              <Select
                label="Subject"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                options={
                  subjectsList.length > 0
                    ? subjectsList.map((s) => ({ value: s.id, label: s.name }))
                    : [{ value: "", label: "No subjects found in class" }]
                }
                helperText={`Filtered for Class ${classLevel}`}
              />
            </div>

            {/* Topic or Chapter Name */}
            <Input
              label="Topic or Chapter Name *"
              placeholder="e.g. Chemical Reactions and Equations, Probability, Trigonometry"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              helperText="Specify the textbook chapter or particular concept you want to test."
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Language */}
              <Select
                label="Language"
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value as "English" | "Hindi" | "Punjabi")
                }
                options={[
                  { value: "English", label: "English" },
                  { value: "Hindi", label: "Hindi" },
                  { value: "Punjabi", label: "Punjabi" },
                ]}
              />

              {/* Number of Questions */}
              <Input
                label="Number of Questions (1-50)"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 10"
                value={count === "" ? "" : String(count)}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  if (val === "") {
                    setCount("");
                  } else {
                    const num = parseInt(val, 10);
                    setCount(num > 50 ? 50 : num);
                  }
                }}
                helperText="Auto-batched in chunks of 10. Type any number from 1 to 50."
              />

              {/* Difficulty */}
              <Select
                label="Difficulty Level"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                options={[
                  { value: "Easy", label: "Easy" },
                  { value: "Easy to Moderate", label: "Easy to Moderate" },
                  { value: "Moderate", label: "Moderate" },
                  { value: "Moderate to Hard", label: "Moderate to Hard" },
                  { value: "Hard", label: "Hard" },
                ]}
              />
            </div>

            {/* Extra Instructions */}
            <Textarea
              label="Extra Instructions (Optional)"
              placeholder="e.g. Include 5 numerical problems, focus on board exam high-weightage topics, avoid tricky negative phrasing..."
              rows={2}
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
            />
          </CardContent>

          <CardFooter className="p-4 sm:p-6 pt-0 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Generates up to 50 NCERT-standard MCQs.
            </div>

            <div className="flex items-center gap-2">
              {isGenerating && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  className="min-h-[44px]"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                variant="primary"
                isLoading={isGenerating}
                className="min-h-[44px] px-6"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                {isGenerating
                  ? `Generating ${count} Questions...`
                  : `Generate ${count} Questions`}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* -------------------------------------------------------------------- */}
      {/* RESULT PREVIEW & ACTION BAR */}
      {/* -------------------------------------------------------------------- */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          {/* Mandatory Review Notice Banner */}
          <div className="flex items-start gap-3 p-4 rounded-[8px] border border-blue-200 bg-blue-50/70 text-slate-800 text-sm">
            <div className="mt-0.5 p-1 rounded-full bg-blue-100 text-[#1E3A8A]">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-900 block">
                Verification Required
              </span>
              <p className="text-slate-600 text-xs sm:text-sm">
                AI questions must be reviewed for accuracy before students see them. You can edit any question text, modify option values, change the correct answer, or uncheck items to discard them.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white rounded-[8px] border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900">
                {selectedCount} of {generatedQuestions.length} selected
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-[#1E3A8A] hover:underline font-medium min-h-[44px] px-2 inline-flex items-center"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-slate-500 hover:underline font-medium min-h-[44px] px-2 inline-flex items-center"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Copy CSV Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyCSV}
                title="Copy questions formatted as CSV template"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-slate-600" />
                Copy as CSV
              </Button>

              {/* Copy JSON Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyJSON}
                title="Copy questions as JSON"
              >
                <FileJson className="w-3.5 h-3.5 mr-1 text-slate-600" />
                Copy as JSON
              </Button>

              {/* Add to Test Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddModal}
                disabled={selectedCount === 0}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add to Test ({selectedCount})
              </Button>
            </div>
          </div>

          {/* Editable Question Cards List */}
          <div className="space-y-4">
            {generatedQuestions.map((q, index) => {
              const options: ("A" | "B" | "C" | "D")[] = ["A", "B", "C", "D"];

              return (
                <Card
                  key={q.id}
                  className={`transition-colors ${
                    q.selected
                      ? "border-slate-300 bg-white"
                      : "border-slate-200 bg-slate-50/70 opacity-60"
                  }`}
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-3 space-y-0">
                    <div className="flex items-center gap-2.5">
                      {/* Checkbox (min-height 44px container) */}
                      <label className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center cursor-pointer -ml-2 -mt-2">
                        <input
                          type="checkbox"
                          checked={q.selected}
                          onChange={() => handleToggleQuestion(q.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer"
                        />
                      </label>
                      <Badge variant="secondary" className="font-bold text-xs">
                        Q{index + 1}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {q.selected ? "Included" : "Discarded"}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <span>Correct:</span>
                      <span className="px-2 py-0.5 rounded-[4px] bg-green-50 text-green-700 font-bold border border-green-200">
                        Option {q.correct}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    {/* Question text textarea */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">
                        Question Statement
                      </label>
                      <Textarea
                        value={q.question}
                        onChange={(e) =>
                          handleUpdateQuestion(q.id, "question", e.target.value)
                        }
                        rows={2}
                        className="text-sm font-medium"
                      />
                    </div>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {options.map((optKey) => {
                        const optField = `option_${optKey.toLowerCase()}` as keyof GeneratedMCQ;
                        const isCorrect = q.correct === optKey;

                        return (
                          <div
                            key={optKey}
                            className={`flex items-center gap-2 p-2 rounded-[6px] border ${
                              isCorrect
                                ? "border-green-300 bg-green-50/40"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            {/* Clickable radio button to set correct answer */}
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateQuestion(q.id, "correct", optKey)
                              }
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer transition-colors ${
                                isCorrect
                                  ? "bg-green-700 text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                              title={`Set Option ${optKey} as correct`}
                            >
                              {optKey}
                            </button>

                            <input
                              type="text"
                              value={q[optField] as string}
                              onChange={(e) =>
                                handleUpdateQuestion(q.id, optField, e.target.value)
                              }
                              className="w-full text-xs sm:text-sm bg-transparent border-0 p-1 text-slate-900 focus:outline-none focus:ring-0"
                              placeholder={`Option ${optKey}`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div className="pt-1">
                      <Input
                        label="Explanation (Shown after test review)"
                        value={q.explanation || ""}
                        onChange={(e) =>
                          handleUpdateQuestion(q.id, "explanation", e.target.value)
                        }
                        placeholder="Reason or textbook reference..."
                        className="text-xs text-slate-700"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* ADD TO TEST MODAL */}
      {/* -------------------------------------------------------------------- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Questions to Test"
        description={`Save ${selectedCount} selected questions to Class ${classLevel} ${currentSubjectName}.`}
        maxWidth="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSavingTest}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveToTest}
              isLoading={isSavingTest}
              className="w-full sm:w-auto"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {testMode === "existing"
                ? `Add ${selectedCount} to Test`
                : `Create Test with ${selectedCount} Questions`}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          {/* Toggle existing vs new */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-[6px]">
            <button
              type="button"
              onClick={() => setTestMode("new")}
              className={`py-2 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer min-h-[44px] ${
                testMode === "new"
                  ? "bg-white text-[#1E3A8A] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Create New Test
            </button>
            <button
              type="button"
              onClick={() => setTestMode("existing")}
              disabled={existingTests.length === 0}
              className={`py-2 text-xs font-semibold rounded-[4px] transition-colors cursor-pointer min-h-[44px] ${
                testMode === "existing"
                  ? "bg-white text-[#1E3A8A] shadow-xs"
                  : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
              }`}
            >
              Existing Test ({existingTests.length})
            </button>
          </div>

          {testMode === "existing" ? (
            <div className="space-y-3 pt-2">
              <Select
                label="Select Test"
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                options={existingTests.map((t) => ({
                  value: t.id,
                  label: `${t.title} (${t.durationMinutes ? `${t.durationMinutes}m` : "No limit"})`,
                }))}
              />
              <p className="text-xs text-slate-500">
                The {selectedCount} questions will be appended to the end of this test.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <Select
                label="Subject *"
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  if (e.target.value) {
                    getExistingTestsForSubjectAction(e.target.value).then((res) => {
                      if (res.success) {
                        setExistingTests(res.tests);
                      }
                    });
                  }
                }}
                options={subjectsList.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
                required
              />

              <Input
                label="Test Title *"
                value={newTestTitle}
                onChange={(e) => setNewTestTitle(e.target.value)}
                placeholder="e.g. Chapter 4 Quadratic Equations Midterm"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <Input
                  label="Duration (mins)"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="30"
                  value={newTestDuration === "" ? "" : String(newTestDuration)}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "");
                    setNewTestDuration(val === "" ? "" : parseInt(val, 10));
                  }}
                />
                <Input
                  label="Marks / Q"
                  type="text"
                  inputMode="decimal"
                  placeholder="1"
                  value={newTestMarks === "" ? "" : String(newTestMarks)}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    setNewTestMarks(val === "" ? "" : parseFloat(val) || "");
                  }}
                />
                <Input
                  label="Neg Marks"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={newTestNegativeMarks === "" ? "" : String(newTestNegativeMarks)}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    setNewTestNegativeMarks(val === "" ? "" : parseFloat(val) || "");
                  }}
                />
              </div>

              {/* Show result switch */}
              <div className="flex items-center justify-between p-3 rounded-[6px] border border-slate-200 bg-slate-50">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900 block">
                    Show result to students
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {newTestShowResult
                      ? "Students will see their score right after submitting"
                      : "Results are hidden from students until released"}
                  </span>
                </div>
                <Switch
                  id="new-test-show-result"
                  checked={newTestShowResult}
                  onCheckedChange={setNewTestShowResult}
                />
              </div>

              {/* Publish immediately switch */}
              <div className="flex items-center justify-between p-3 rounded-[6px] border border-slate-200 bg-emerald-50/50">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900 block">
                    Publish immediately to students
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {newTestIsPublished
                      ? "Students can see and attempt this test right away"
                      : "Save as draft (hidden from students until published)"}
                  </span>
                </div>
                <Switch
                  id="new-test-is-published"
                  checked={newTestIsPublished}
                  onCheckedChange={setNewTestIsPublished}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
