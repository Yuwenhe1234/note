import { ArrowLeft } from "lucide-react";

export function PageBackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="page-back-button" onClick={onClick}><ArrowLeft aria-hidden="true" />{label}</button>;
}
