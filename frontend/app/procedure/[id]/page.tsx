"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { isAuthenticated, getUser } from "@/lib/auth";
import { proceduresApi } from "@/lib/api";
import ProcedurePrintView from "@/components/procedures/ProcedurePrintView";
import { User } from "@/types";
import { Procedure } from "@/types/procedure";
import { ArrowLeft, Printer } from "lucide-react";

export default function ProcedureDetailPage() {
  const router = useRouter();
  const params = useParams();
  const procedureId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth/login");
      return;
    }
    setUser(getUser());

    if (Number.isNaN(procedureId)) {
      setLoading(false);
      return;
    }

    proceduresApi
      .get(procedureId)
      .then((res) => setProcedure(res.data))
      .finally(() => setLoading(false));
  }, [router, procedureId]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!procedure) {
    return (
      <div className="text-center py-12 text-slate-500">Procedure report not found</div>
    );
  }

  return (
    <div>

      <div className="max-w-4xl mx-auto px-4 py-6 print:hidden">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      <div className="px-4 pb-12 print:p-0">
        <ProcedurePrintView procedure={procedure} />
      </div>
    </div>
  );
}
