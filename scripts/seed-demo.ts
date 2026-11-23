import { createClient } from "@supabase/supabase-js";
import * as fs from "node:fs";
import * as path from "node:path";

// Load environment variables from .env.local if present
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.log("Alternatively, run supabase/seed-demo.sql directly in the Supabase SQL Editor.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function runSeed() {
  console.log("🌱 Seeding TestHub demo data (Classes 8-12, 1 test each, 10 questions each)...");

  const grades = [8, 9, 10, 11, 12];
  for (const grade of grades) {
    // 1. Ensure class exists
    const { data: classRow, error: classErr } = await supabase
      .from("classes")
      .upsert({ grade }, { onConflict: "grade" })
      .select("id, grade")
      .single();

    if (classErr) {
      console.error(`Failed to seed class ${grade}:`, classErr);
      continue;
    }

    // 2. Ensure subject exists
    const subjectName = grade >= 11 ? "Physics" : "Science";
    const { data: subjectRow, error: subjErr } = await supabase
      .from("subjects")
      .upsert({ class_id: classRow.id, name: subjectName }, { onConflict: "class_id,name" })
      .select("id, name")
      .single();

    if (subjErr) {
      console.error(`Failed to seed subject for class ${grade}:`, subjErr);
      continue;
    }

    console.log(`✓ Class ${grade} - Subject: ${subjectName}`);
  }

  console.log("To insert the complete 50 demo questions and tests with full teacher explanations,");
  console.log("execute supabase/seed-demo.sql in your Supabase project SQL Editor.");
}

runSeed().catch((err) => {
  console.error("Error during seed:", err);
  process.exit(1);
});
