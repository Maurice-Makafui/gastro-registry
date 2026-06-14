"use client";
import { ProcedureTemplates, ProcedureType, PROCEDURE_TYPE_LABELS } from "@/types/procedure";

interface ProcedureTypeFieldsProps {
  procedureType: ProcedureType;
  templates: ProcedureTemplates | null;
  indication: string;
  findings: string;
  impression: string;
  recommendation: string;
  onIndicationChange: (value: string) => void;
  onFindingsChange: (value: string) => void;
  onImpressionChange: (value: string) => void;
  onRecommendationChange: (value: string) => void;
}

function TemplateSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        className="input mb-2"
        value=""
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.label}>
            {opt.label}
          </option>
        ))}
      </select>
      <textarea
        className="input resize-none"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    </div>
  );
}

export default function ProcedureTypeFields({
  procedureType,
  templates,
  indication,
  findings,
  impression,
  recommendation,
  onIndicationChange,
  onFindingsChange,
  onImpressionChange,
  onRecommendationChange,
}: ProcedureTypeFieldsProps) {
  if (!templates) {
    return (
      <div className="text-sm text-slate-500 py-4 text-center">
        Loading {PROCEDURE_TYPE_LABELS[procedureType]} templates...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-brand-50 border border-brand-100 rounded-lg px-4 py-2 text-sm text-brand-800">
        Structured reporting for <strong>{PROCEDURE_TYPE_LABELS[procedureType]}</strong> — select templates or type freely.
      </div>

      <TemplateSelect
        label="Indication"
        options={templates.indications}
        value={indication}
        onChange={onIndicationChange}
        placeholder="Insert indication template..."
      />
      <TemplateSelect
        label="Findings"
        options={templates.common_findings}
        value={findings}
        onChange={onFindingsChange}
        placeholder="Insert findings template..."
      />
      <TemplateSelect
        label="Impression"
        options={templates.impressions}
        value={impression}
        onChange={onImpressionChange}
        placeholder="Insert impression template..."
      />
      <TemplateSelect
        label="Recommendation"
        options={templates.recommendations}
        value={recommendation}
        onChange={onRecommendationChange}
        placeholder="Insert recommendation template..."
      />
    </div>
  );
}
