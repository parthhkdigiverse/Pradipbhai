export interface LateCalculationResult {
  isLate: boolean;
  lateMinutes: number;
  penaltyAmount: number;
  warningNote: string;
  status: string;
}

export function calculateLatePunchIn(
  checkInStr: string,
  officeStartTime: string = '09:00',
  lateBufferMinutes: number = 15,
  enableLatePenalty: boolean = true,
  latePenaltyAction: 'warning' | 'deduction' | 'half_day' = 'warning',
  latePenaltyAmount: number = 50
): LateCalculationResult {
  if (!enableLatePenalty || !checkInStr || !officeStartTime) {
    return { isLate: false, lateMinutes: 0, penaltyAmount: 0, warningNote: '', status: 'Present' };
  }

  const parseMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const checkInMin = parseMinutes(checkInStr);
  const startMin = parseMinutes(officeStartTime);
  const cutoffMin = startMin + (lateBufferMinutes || 0);

  if (checkInMin > cutoffMin) {
    const lateMinutes = checkInMin - startMin;
    let penaltyAmount = 0;
    let warningNote = `Late Punch-In Warning: Punched in at ${checkInStr} (Office Start: ${officeStartTime}, Buffer: ${lateBufferMinutes}m). ${lateMinutes}m late.`;
    let status = 'Present';

    if (latePenaltyAction === 'deduction') {
      penaltyAmount = latePenaltyAmount || 0;
      warningNote = `Late Penalty Deduction ₹${penaltyAmount}: Punched in at ${checkInStr} (${lateMinutes}m late).`;
    } else if (latePenaltyAction === 'half_day') {
      status = 'Half Day';
      warningNote = `Late Punch-In: Marked as Half Day (Punched in at ${checkInStr}, ${lateMinutes}m late).`;
    }

    return { isLate: true, lateMinutes, penaltyAmount, warningNote, status };
  }

  return { isLate: false, lateMinutes: 0, penaltyAmount: 0, warningNote: '', status: 'Present' };
}
