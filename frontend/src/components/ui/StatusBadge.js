import React from 'react';

export const StatusBadge = ({ type = "default", label, icon: Icon, children }) => {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-800 border-emerald-500/25",
    error: "bg-rose-500/10 text-rose-800 border-rose-500/25",
    warning: "bg-amber-500/10 text-amber-800 border-amber-500/25",
    info: "bg-sky-500/10 text-sky-800 border-sky-500/25",
    neutral: "bg-slate-500/10 text-slate-700 border-slate-300/60",
    indigo: "bg-blue-600/10 text-blue-800 border-blue-500/20"
  };

  const dots = {
    success: "bg-emerald-500",
    error: "bg-rose-500",
    warning: "bg-amber-500",
    info: "bg-sky-500",
    neutral: "bg-slate-400",
    indigo: "bg-blue-600"
  };

  const selectedStyle = styles[type] || styles.neutral;
  const selectedDot = dots[type] || dots.neutral;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border backdrop-blur-md transition-all ${selectedStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${selectedDot} animate-pulse`} />
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{label || children}</span>
    </span>
  );
};

export default StatusBadge;
