import { Procedure, PROCEDURE_TYPE_LABELS } from "@/types/procedure";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Activity, Building2, User, Stethoscope } from "lucide-react";

interface ProcedurePrintViewProps {
  procedure: Procedure;
}

export default function ProcedurePrintView({ procedure }: ProcedurePrintViewProps) {
  const sections = [
    { title: "Indication", content: procedure.indication },
    { title: "Findings", content: procedure.findings },
    { title: "Impression", content: procedure.impression },
    { title: "Recommendation", content: procedure.recommendation },
  ];

  return (
    <div className="procedure-print bg-white max-w-4xl mx-auto">
      <div className="border-b-2 border-brand-600 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Endoscopy Procedure Report</h1>
            <p className="text-brand-700 font-semibold mt-1">
              {PROCEDURE_TYPE_LABELS[procedure.procedure_type]}
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>Report #{procedure.id}</p>
            <p>Procedure Date: {formatDate(procedure.procedure_date)}</p>
            <p>Generated: {formatDateTime(procedure.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8 text-sm">
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <User className="w-4 h-4" />
            <span className="font-medium">Patient</span>
          </div>
          <p className="font-semibold text-slate-900">{procedure.patient?.full_name ?? "—"}</p>
          <p className="text-slate-600">
            {procedure.patient ? `${procedure.patient.age}y · ${procedure.patient.sex}` : ""}
          </p>
          {procedure.patient?.phone && (
            <p className="text-slate-500 mt-1">{procedure.patient.phone}</p>
          )}
        </div>
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Stethoscope className="w-4 h-4" />
            <span className="font-medium">Endoscopist</span>
          </div>
          <p className="font-semibold text-slate-900">{procedure.doctor?.name ?? "—"}</p>
          <p className="text-slate-600">{procedure.doctor?.department ?? procedure.doctor?.role}</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Building2 className="w-4 h-4" />
            <span className="font-medium">Facility</span>
          </div>
          <p className="font-semibold text-slate-900">{procedure.facility?.facility_name ?? "—"}</p>
          <p className="text-slate-600">
            {procedure.facility ? `${procedure.facility.city}, ${procedure.facility.region}` : ""}
          </p>
        </div>
      </div>

      <div className="space-y-5 mb-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-bold text-brand-700 uppercase tracking-wide border-b border-slate-200 pb-1 mb-2">
              {section.title}
            </h2>
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
              {section.content || "Not documented"}
            </p>
          </div>
        ))}
      </div>

      {procedure.image_urls.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-brand-700 uppercase tracking-wide border-b border-slate-200 pb-1 mb-4">
            Procedure Images
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {procedure.image_urls.map((url, index) => (
              <div key={url} className="border border-slate-200 rounded-lg overflow-hidden">
                <img
                  src={url}
                  alt={`Procedure image ${index + 1}`}
                  className="w-full h-48 object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 pt-4 flex items-center gap-2 text-xs text-slate-400">
        <Activity className="w-3.5 h-3.5" />
        <span>Ghana Gastroenterology & Hepatology Registry — Confidential Medical Record</span>
      </div>
    </div>
  );
}
