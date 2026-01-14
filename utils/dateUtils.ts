
import { 
  addDays, 
  addYears, 
  differenceInDays, 
  isBefore, 
  startOfDay,
  format
} from 'date-fns';
import { Milestone } from '../types';

export const calculateDDay = (startDate: Date): number => {
  const today = startOfDay(new Date());
  const start = startOfDay(startDate);
  // Korean style D-Day: Day 1 is the anniversary date itself
  return differenceInDays(today, start) + 1;
};

export const getMilestones = (startDate: Date): Milestone[] => {
  const today = startOfDay(new Date());
  const start = startOfDay(startDate);
  
  const milestones: Milestone[] = [];
  
  // Specific day milestones
  [100, 200, 300, 400, 500, 1000].forEach(days => {
    const mDate = addDays(start, days - 1);
    milestones.push({
      label: `${days}일`,
      date: mDate,
      daysRemaining: differenceInDays(mDate, today),
      isPassed: isBefore(mDate, today)
    });
  });

  // Year milestones
  [1, 2, 3, 5, 10].forEach(years => {
    const mDate = addYears(start, years);
    milestones.push({
      label: `${years}주년`,
      date: mDate,
      daysRemaining: differenceInDays(mDate, today),
      isPassed: isBefore(mDate, today)
    });
  });

  return milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const getGoogleCalendarLink = (title: string, date: Date) => {
  const fmtDate = format(date, "yyyyMMdd");
  const nextDay = format(addDays(date, 1), "yyyyMMdd");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmtDate}/${nextDay}&details=${encodeURIComponent("캐릭터 페어 기념일 축하!")}`;
};
