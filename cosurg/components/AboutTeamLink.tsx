import Link from "next/link";
import type { Lang } from "@/lib/tree/types";
import { tr } from "@/lib/i18n";
import { SizeLock, widestOf } from "./ui/SizeLock";

/** Genvej til "About & Team", tilgængelig fra alle sider i appen. */
export function AboutTeamLink({ lang }: { lang: Lang }) {
  return (
    <Link
      href="/aboutandteam"
      className="flex min-h-11 items-center rounded-lg border bg-[var(--paper-raised)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--teal)] hover:bg-[var(--teal-tint)]"
    >
      <SizeLock variants={widestOf("aboutTeam")}>{tr("aboutTeam", lang)}</SizeLock>
    </Link>
  );
}
