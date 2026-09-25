/**
 * Typical single-line capacity / empty-row fill target on one A4 landscape page.
 * Tall multi-line diagnosis/cast rows use height-based pagination instead, so a
 * page may hold fewer than this many persons when cells wrap to 3+ lines.
 */
export const CAST_CASE_LOG_ROWS_PER_PAGE = 12;

/** Fixed compensation (THB) written into volume + actual columns per case. */
export const CAST_CASE_LOG_PAY_PER_CASE = 50;
