"use client";

import * as React from "react";
import {
  Settings,
  Eye,
  ShieldCheck,
  Mail,
  School,
  Database,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { updateDefaultShowResultAction } from "@/app/admin/settings/actions";
import type { CurrentUser } from "@/lib/supabase/server";

interface AdminSettingsFormProps {
  initialDefaultShowResult: boolean;
  user: CurrentUser;
}

export function AdminSettingsForm({
  initialDefaultShowResult,
  user,
}: AdminSettingsFormProps) {
  const { toast } = useToast();
  const [defaultShowResult, setDefaultShowResult] = React.useState(
    initialDefaultShowResult
  );
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleToggleDefault = async (newVal: boolean) => {
    setDefaultShowResult(newVal);
    setIsUpdating(true);

    try {
      const res = await updateDefaultShowResultAction(newVal);
      if (res.success) {
        toast.success(res.message);
      } else {
        setDefaultShowResult(!newVal);
        toast.error(res.message || "Failed to update default setting.");
      }
    } catch (err: any) {
      setDefaultShowResult(!newVal);
      toast.error(err?.message || "An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* -------------------------------------------------------------------- */}
      {/* RESULT VISIBILITY DEFAULTS CARD                                      */}
      {/* -------------------------------------------------------------------- */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-blue-50 text-[#1E3A8A] flex items-center justify-center font-bold">
              <Eye className="w-4 h-4 text-[#1E3A8A]" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Test Result Visibility Defaults
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure whether newly created or generated tests reveal results to students upon submission.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-[8px] border border-slate-200 bg-slate-50 gap-4">
            <div className="space-y-1 flex-1">
              <span className="text-sm font-semibold text-slate-900 block">
                Default for new tests
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                When enabled, newly created or AI-generated tests will automatically have &quot;Show result to students&quot; enabled. You can still toggle this per test anytime.
              </p>
            </div>

            <Switch
              id="default-show-result"
              checked={defaultShowResult}
              disabled={isUpdating}
              onCheckedChange={handleToggleDefault}
            />
          </div>

          <div className="text-xs text-slate-500 bg-blue-50/60 border border-blue-100 p-3 rounded-[6px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1E3A8A] shrink-0" />
            <span>
              Changes save instantly to system configurations (<code className="font-mono text-[11px]">app_settings.default_show_result</code>).
            </span>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------------------------- */}
      {/* SYSTEM & OWNER DETAILS CARD                                          */}
      {/* -------------------------------------------------------------------- */}
      <Card className="border border-slate-200 bg-white">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Coaching Portal Information
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Authenticated administrative profile and security details.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              Owner Admin Account
            </span>
            <span className="font-semibold text-slate-900 font-mono text-xs">
              {user.email}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-2">
              <School className="w-4 h-4 text-slate-400" />
              Coaching Curriculum
            </span>
            <Badge variant="primary" className="text-xs">
              Classes 8 to 12
            </Badge>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500 flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-400" />
              Access Authority
            </span>
            <Badge variant="success" className="text-xs">
              Owner Privileges Active
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
