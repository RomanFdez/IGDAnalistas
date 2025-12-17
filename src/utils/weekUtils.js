import { startOfWeek, differenceInCalendarWeeks, addWeeks, addDays } from 'date-fns';

/**
 * Calculates a Week ID based on the Monday of the week.
 * Rule: The year of the week is the year of its Monday.
 * Week 1 of a year starts on the first Monday of that year.
 * Weeks prior to the first Monday belong to the previous year.
 */
export const getCustomWeekId = (date) => {
    const monday = startOfWeek(date, { weekStartsOn: 1 });
    const year = monday.getFullYear();

    // Find first Monday of variable year
    const jan1 = new Date(year, 0, 1);
    // (8 - (day || 7)) % 7 gives days to add to reach next Monday.
    // If Jan 1 is Monday (1), add 0. 
    // If Jan 1 is Sunday (0->7), add 1 -> Jan 2.
    const daysToFirstMonday = (8 - (jan1.getDay() || 7)) % 7;
    const firstMonday = addDays(jan1, daysToFirstMonday);

    // Calculate week number
    // If 'monday' < 'firstMonday', this shouldn't happen if year matches monday.getFullYear()
    // UNLESS firstMonday is e.g. Jan 7, and we are Jan 1 (which is prev year effectively?)
    // But we defined year = monday.getFullYear().
    // So 'monday' is guaranteed to be >= Jan 1.
    // If 'monday' < 'firstMonday', it means we are in the partial week before the first Monday.
    // e.g. Jan 1 is Tuesday. First Monday is Jan 7.
    // Our 'monday' is Dec 31 (prev year). 
    // But monday.getFullYear() would be 2024.
    // So logic holds: We always calculate relative to the year of the Monday.

    const weekNumber = differenceInCalendarWeeks(monday, firstMonday, { weekStartsOn: 1 }) + 1;

    return `${year}-W${weekNumber}`;
};

/**
 * Returns the Monday date for a given custom Week ID.
 */
export const getMondayFromCustomWeekId = (weekId) => {
    if (!weekId) return new Date();
    const [yearStr, weekStr] = weekId.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);

    const jan1 = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - (jan1.getDay() || 7)) % 7;
    const firstMonday = addDays(jan1, daysToFirstMonday);

    return addWeeks(firstMonday, week - 1);
};
