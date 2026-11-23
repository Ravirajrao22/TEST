"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  FileCheck2,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Smartphone,
  Tablet,
  Laptop,
  Maximize2,
  Trash2,
  Edit,
  ArrowRight,
  TrendingUp,
  Users,
  Award,
  Layers,
  Settings,
  HelpCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ResponsiveTable, type Column } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

interface SampleTest {
  id: string;
  title: string;
  grade: number;
  subject: string;
  questions: number;
  resultMode: string;
  status: "Active" | "Draft" | "Closed";
}

const sampleTests: SampleTest[] = [
  {
    id: "test-1",
    title: "Linear Equations & Polynomials",
    grade: 10,
    subject: "Mathematics",
    questions: 25,
    resultMode: "Immediate",
    status: "Active",
  },
  {
    id: "test-2",
    title: "Light: Reflection & Refraction",
    grade: 10,
    subject: "Science",
    questions: 20,
    resultMode: "On Release",
    status: "Draft",
  },
  {
    id: "test-3",
    title: "Electrostatics & Capacitance",
    grade: 12,
    subject: "Physics",
    questions: 30,
    resultMode: "Immediate",
    status: "Active",
  },
];

type ViewportMode = "fluid" | "360" | "768" | "1280";

export default function DesignPreviewPage() {
  const { toast } = useToast();
  const [viewport, setViewport] = React.useState<ViewportMode>("fluid");

  // Interactive component states
  const [modalOpen, setModalOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [switchChecked, setSwitchChecked] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("classes");
  const [inputValue, setInputValue] = React.useState("Class 10 Science");
  const [inputError, setInputError] = React.useState("");

  const columns: Column<SampleTest>[] = [
    {
      key: "title",
      header: "Test Title",
      render: (item) => (
        <div className="font-semibold text-slate-900">{item.title}</div>
      ),
    },
    {
      key: "subject",
      header: "Class & Subject",
      render: (item) => (
        <span className="text-slate-600 font-medium">
          Class {item.grade} • {item.subject}
        </span>
      ),
    },
    {
      key: "questions",
      header: "Questions",
      render: (item) => (
        <span className="text-slate-700">{item.questions} MCQs</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const variant =
          item.status === "Active"
            ? "success"
            : item.status === "Draft"
            ? "warning"
            : "secondary";
        return <Badge variant={variant}>{item.status}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[36px] px-2.5 text-xs text-slate-600 hover:text-[#4338CA]"
            onClick={() => toast.info(`Editing ${item.title}`)}
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[36px] px-2.5 text-xs text-[#B91C1C] hover:bg-red-50"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen text-slate-800 pb-20">
      {/* ==================================================================== */}
      {/* FLOATING VIEWPORT SWITCHER TOP BAR                                   */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/80 px-4 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-slate-900 font-heading text-lg"
            >
              <div className="w-8 h-8 rounded-[10px] bg-[#4338CA] text-white flex items-center justify-center text-xs font-bold shadow-[0_2px_8px_rgba(67,56,202,0.30)]">
                TH
              </div>
              <span>TestHub</span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-[#4338CA] font-semibold">
              Glassmorphism Design System
            </span>
          </div>

          {/* Viewport switch chips */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/60 backdrop-blur-md border border-white/80 shadow-2xs">
            <button
              onClick={() => setViewport("fluid")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 min-h-[36px]",
                viewport === "fluid"
                  ? "bg-white text-[#4338CA] shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fluid</span>
            </button>
            <button
              onClick={() => setViewport("360")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 min-h-[36px]",
                viewport === "360"
                  ? "bg-white text-[#4338CA] shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>360px</span>
            </button>
            <button
              onClick={() => setViewport("768")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 min-h-[36px]",
                viewport === "768"
                  ? "bg-white text-[#4338CA] shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>768px</span>
            </button>
            <button
              onClick={() => setViewport("1280")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 min-h-[36px]",
                viewport === "1280"
                  ? "bg-white text-[#4338CA] shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>1280px</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container framed according to simulated viewport */}
      <div
        className={cn(
          "mx-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 space-y-12 animate-enter",
          viewport === "360" && "max-w-[360px] border-x border-slate-300/60 shadow-2xl bg-white/30",
          viewport === "768" && "max-w-[768px] border-x border-slate-300/60 shadow-2xl bg-white/30",
          viewport === "1280" && "max-w-[1280px]",
          viewport === "fluid" && "max-w-[1200px]"
        )}
      >
        {/* Intro Header */}
        <div className="space-y-2">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Design System", href: "/design-preview" },
              { label: "Glassmorphism Showcase" },
            ]}
          />
          <PageHeader
            title="Design System & Component Showcase"
            description="Visual direction: Glassmorphism + Minimalism with a calm, professional education SaaS aesthetic. High contrast, accessible focus rings, and responsive glass surfaces."
          />
        </div>

        {/* ================================================================== */}
        {/* SECTION 1: THE 3 GLASS SURFACE TIERS                              */}
        {/* ================================================================== */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              1. Glass Surfaces Architecture
            </h2>
            <p className="text-sm text-slate-500">
              Three defined optical density levels calibrated for readability and depth over blurred pastel blobs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Level 1: glass */}
            <div className="glass p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4338CA]">
                  Standard Glass (.glass)
                </span>
                <Badge variant="primary">Cards & Sidebars</Badge>
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                60% Opacity • 16px Blur
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Used for cards, dashboard panels, sidebars, and top navigation bars. 1px white border, subtle inner highlight, and soft deep shadow.
              </p>
              <div className="p-3 rounded-[10px] bg-white/40 border border-white/60 text-[11px] text-slate-600 font-mono">
                box-shadow: 0 8px 32px rgba(31,41,90,0.08)
              </div>
            </div>

            {/* Level 2: glass-strong */}
            <div className="glass-strong p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4338CA]">
                  Strong Glass (.glass-strong)
                </span>
                <Badge variant="secondary">Modals & Drawers</Badge>
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                80% Opacity • 24px Blur
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Used for dialogs, slide-out mobile drawers, dropdowns, and toast capsules. Higher opacity keeps overlay content legible.
              </p>
              <div className="p-3 rounded-[10px] bg-white/60 border border-white/80 text-[11px] text-slate-600 font-mono">
                box-shadow: 0 12px 40px rgba(31,41,90,0.12)
              </div>
            </div>

            {/* Level 3: glass-solid */}
            <div className="glass-solid p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4338CA]">
                  Solid Glass (.glass-solid)
                </span>
                <Badge variant="outline">Tables & Exam Cards</Badge>
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                92% Opacity • 8px Blur
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Used for text-heavy content like data tables and exam question cards. Guarantees 100% WCAG AA contrast for reading long statements.
              </p>
              <div className="p-3 rounded-[10px] bg-white/80 border border-white/90 text-[11px] text-slate-600 font-mono">
                background: rgba(255,255,255,0.92)
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 2: STAT CARDS & METRICS                                   */}
        {/* ================================================================== */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              2. StatCard Primitives
            </h2>
            <p className="text-sm text-slate-500">
              Large numbers, small labels, and category/trend indicators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <StatCard
              label="Total Enrolled"
              value="248 Students"
              icon={<Users className="w-5 h-5 stroke-[1.5]" />}
              trend={{ value: "+12% this month", isPositive: true }}
            />
            <StatCard
              label="Active Tests"
              value="18 Tests"
              icon={<FileCheck2 className="w-5 h-5 stroke-[1.5]" />}
              trend={{ value: "Classes 8-12", isPositive: true, label: "Live" }}
            />
            <StatCard
              label="Pass Percentage"
              value="84.6%"
              icon={<TrendingUp className="w-5 h-5 stroke-[1.5]" />}
              trend={{ value: "+3.2%", isPositive: true }}
            />
            <StatCard
              label="Top Score"
              value="98.0%"
              icon={<Award className="w-5 h-5 stroke-[1.5]" />}
              description="Class 10 Mathematics Unit 1"
            />
          </div>
        </section>

        {/* ================================================================== */}
        {/* SECTION 3: BUTTONS & INTERACTIVE CONTROLS                         */}
        {/* ================================================================== */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              3. Button Variants & Geometry
            </h2>
            <p className="text-sm text-slate-500">
              10px border radius, 44px minimum touch height, 150ms ease transitions, and visible indigo focus rings.
            </p>
          </div>

          <Card className="p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">
                <span>Primary Button</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button variant="secondary">
                <span>Secondary (Glass)</span>
              </Button>

              <Button variant="ghost">
                <span>Ghost Action</span>
              </Button>

              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-1.5" />
                <span>Destructive</span>
              </Button>

              <Button variant="primary" isLoading>
                <span>Loading Action</span>
              </Button>

              <Button variant="primary" disabled>
                <span>Disabled Button</span>
              </Button>
            </div>

            {/* Pill Tabs & Switch */}
            <div className="pt-4 border-t border-white/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Pill Tabs on Glass Track
                </span>
                <div>
                  <Tabs
                    tabs={[
                      { id: "classes", label: "Classes & Subjects", count: 5 },
                      { id: "tests", label: "Tests", count: 18 },
                      { id: "results", label: "Results" },
                      { id: "settings", label: "Settings" },
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase text-slate-500">
                  Glass Switch Control
                </span>
                <div>
                  <Switch
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                    label="Show result to students"
                    description="Immediate score release"
                  />
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ================================================================== */}
        {/* SECTION 4: FORM CONTROLS & FIELD-LEVEL VALIDATION                  */}
        {/* ================================================================== */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              4. Form Controls (12px Radius, 85% White)
            </h2>
            <p className="text-sm text-slate-500">
              Inputs have 16px font size to prevent iOS zoom, subtle border, and clear inline validation error states.
            </p>
          </div>

          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Subject Name"
                placeholder="e.g. Science"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (e.target.value.length < 2) {
                    setInputError("Subject name must be at least 2 characters.");
                  } else {
                    setInputError("");
                  }
                }}
                error={inputError}
                helperText="Enter official syllabus subject title"
              />

              <Select
                label="Target Class"
                defaultValue="10"
                options={[
                  { value: "8", label: "Class 8" },
                  { value: "9", label: "Class 9" },
                  { value: "10", label: "Class 10" },
                  { value: "11", label: "Class 11" },
                  { value: "12", label: "Class 12" },
                ]}
                helperText="Select target academic grade"
              />

              <Textarea
                label="Teacher Instructions (Optional)"
                placeholder="e.g. Focus on numerical problems from Chapter 3"
                helperText="Extra prompt guidance for AI question generation"
              />
            </div>
          </Card>
        </section>

        {/* ================================================================== */}
        {/* SECTION 5: BADGES & STATUS PALETTE                                */}
        {/* ================================================================== */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              5. Badges & Status Tokens
            </h2>
            <p className="text-sm text-slate-500">
              Calm pastel tints with WCAG AA compliant text colors. No loud neon fills.
            </p>
          </div>

          <Card className="p-6 flex flex-wrap items-center gap-3">
            <Badge variant="primary">
              <Sparkles className="w-3.5 h-3.5" />
              Primary Accent (Indigo)
            </Badge>

            <Badge variant="secondary">
              Secondary Surface (Slate)
            </Badge>

            <Badge variant="success">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Passed / Active (#15803D)
            </Badge>

            <Badge variant="warning">
              <AlertTriangle className="w-3.5 h-3.5" />
              Draft / Review (#B45309)
            </Badge>

            <Badge variant="error">
              <XCircle className="w-3.5 h-3.5" />
              Needs Attention (#B91C1C)
            </Badge>

            <Badge variant="outline">
              Neutral Outline
            </Badge>
          </Card>
        </section>

        {/* ================================================================== */}
        {/* SECTION 6: RESPONSIVE DATA TABLE (.glass-solid)                   */}
        {/* ================================================================== */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              6. Responsive Data Table (Solid Glass)
            </h2>
            <p className="text-sm text-slate-500">
              Semantic table on desktop (&ge; 640px), automatically morphing into stacked cards on phones (&lt; 640px) with zero horizontal scroll.
            </p>
          </div>

          <ResponsiveTable
            columns={columns}
            data={sampleTests}
            keyExtractor={(item) => item.id}
          />
        </section>

        {/* ================================================================== */}
        {/* SECTION 7: TOAST NOTIFICATIONS & MODAL DIALOGS                    */}
        {/* ================================================================== */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              7. Modals, Confirm Dialogs & Toasts
            </h2>
            <p className="text-sm text-slate-500">
              Interactive overlays built with strong glass (`.glass-strong`) and 24px backdrop blur.
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Open Glass Modal
              </Button>

              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Open Confirm Dialog
              </Button>

              <Button
                variant="secondary"
                onClick={() => toast.success("Test saved successfully!")}
              >
                Trigger Success Toast
              </Button>

              <Button
                variant="secondary"
                onClick={() => toast.error("Submission failed. Please check internet connection.")}
              >
                Trigger Error Toast
              </Button>

              <Button
                variant="secondary"
                onClick={() => toast.warning("5 minutes remaining in test attempt.")}
              >
                Trigger Warning Toast
              </Button>
            </div>
          </Card>
        </section>

        {/* ================================================================== */}
        {/* SECTION 8: EMPTY STATE & SKELETON LOADERS                         */}
        {/* ================================================================== */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading">
              8. Empty States & Skeletons
            </h2>
            <p className="text-sm text-slate-500">
              Calm illustrations and translucent shimmer cards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmptyState
              icon={<BookOpen className="w-6 h-6 stroke-[1.5]" />}
              title="No tests created yet"
              description="Create a manual test, import questions via CSV, or use the AI Generator to prepare test papers."
              action={
                <Button variant="primary" size="sm">
                  Create First Test
                </Button>
              }
            />

            <SkeletonCard />
          </div>
        </section>
      </div>

      {/* Interactive Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sample Glassmorphism Modal"
        description="Rendered with .glass-strong (80% opacity, 24px blur). On mobile screens this transforms into an accessible full-screen bottom sheet."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setModalOpen(false);
                toast.success("Action completed inside modal.");
              }}
            >
              Confirm Action
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <Input
            label="Example Dialog Field"
            placeholder="Type anything..."
            defaultValue="Unit Test 1: Chemical Reactions"
          />
          <p className="text-xs text-slate-500">
            Modals feature a soft backdrop shadow, 16px radius, and escape key listener.
          </p>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast.success("Item deleted successfully.");
        }}
        title="Delete Test?"
        description="Are you sure you want to delete this test? All student attempts and responses for this test will be permanently removed."
        confirmText="Delete Test"
        variant="destructive"
      />
    </div>
  );
}
