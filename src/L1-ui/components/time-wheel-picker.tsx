import { useState } from "react";

export function TimeWheelPicker({ value, onCancel, onConfirm, daily = false }: { value: string; onCancel: () => void; onConfirm: (value: string) => void; daily?: boolean }) {
  const now = new Date();
  const [hour, setHour] = useState(() => Number(value.split(":")[0] || now.getHours()));
  const [minute, setMinute] = useState(() => Number(value.split(":")[1] || now.getMinutes()));
  const valid = (h: number, m: number) => daily || h > now.getHours() || (h === now.getHours() && m >= now.getMinutes());
  return <div className="wheel-overlay"><section className="wheel-picker"><em>REFRESH TIME</em><h3>选择刷新时间</h3><div className="wheel-columns"><div>{Array.from({ length: 24 }, (_, h) => <button className={hour === h ? "selected" : ""} disabled={!valid(h, minute)} onClick={() => setHour(h)} key={h}>{String(h).padStart(2, "0")}</button>)}</div><b>:</b><div>{Array.from({ length: 60 }, (_, m) => <button className={minute === m ? "selected" : ""} disabled={!valid(hour, m)} onClick={() => setMinute(m)} key={m}>{String(m).padStart(2, "0")}</button>)}</div></div><div className="wheel-actions"><button onClick={onCancel}>取消</button><button className="primary" disabled={!valid(hour, minute)} onClick={() => onConfirm(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)}>确认</button></div></section></div>;
}
