/**
 * Failure List Core Service
 * Shared policy enforcement and business logic
 */

const {
  findClassByCode,
  isGraduateSubject,
  findWindowByTermKey,
  findListByClassKey,
  findStudentsByListId,
  findClassRosterWithGrades,
  autoPassNonListedStudents,
} = require("../repositories/failure-list.repository");

const {
  normalizeTermType,
  normalizeDateOnly,
  isUndergradProgram,
} = require("../helpers");

const { SPECIAL_REMARKS } = require("../config/failure-list.config");

/**
 * Get the failure list policy for a class
 * Determines applicability, window state, submission state, etc.
 * @param {*} conn Database connection
 * @param {string} classCode Class code
 * @param {string} termType Term type
 * @returns {Promise<Object>} Policy object
 */
const getFailureListPolicy = async (conn, classCode, termType) => {
  const normalizedTermType = normalizeTermType(termType);
  const classInfo = await findClassByCode(conn, classCode);

  if (!classInfo) {
    return { isApplicable: false, reason: "class_not_found" };
  }

  const isGraduate = await isGraduateSubject(conn, classInfo.subject_code);
  const isApplicable = !isGraduate && isUndergradProgram(classInfo.program_code);

  if (!isApplicable) {
    return { isApplicable: false, reason: "program_not_supported" };
  }

  const window = await findWindowByTermKey(
    conn,
    classInfo.school_year,
    classInfo.semester,
    normalizedTermType
  );
  const list = await findListByClassKey(
    conn,
    classInfo.class_code,
    classInfo.school_year,
    classInfo.semester,
    normalizedTermType
  );
  const students = await findStudentsByListId(conn, list?.failure_list_id);

  const today = normalizeDateOnly(new Date());
  const startDate = normalizeDateOnly(window?.start_date);
  const endDate = normalizeDateOnly(window?.end_date);
  const isWindowOpen = !!(
    startDate &&
    endDate &&
    today >= startDate &&
    today <= endDate
  );
  const isWindowClosed = !!(endDate && today > endDate);
  const isSubmitted = list?.status === "submitted";

  const studentIds = new Set(students.map((item) => item.student_id));
  const studentGradeIds = new Set(
    students
      .map((item) => item.student_grades_id)
      .filter((value) => value !== null && value !== undefined)
  );

  return {
    isApplicable: !!window && isApplicable && today >= startDate,
    isApplicable2: isApplicable,
    isWithinWindow: today >= startDate && today <= endDate,
    classInfo,
    window,
    list,
    isWindowOpen,
    isWindowClosed,
    isSubmitted,
    postDeadlineAction: window?.post_deadline_action || "restrict_only",
    selectedStudents: students,
    studentIds,
    studentGradeIds,
  };
};

/**
 * Enforce failure list policy on grade data
 * Throws error if grade violates policy
 * @param {Object} policy Policy object
 * @param {Object} gradeData Grade data to validate
 * @param {string} [contextLabel] Optional context label for error message
 * @returns {Object} Grade data (unchanged if valid)
 * @throws {Error} If grade violates policy
 */
const enforceFailureListPolicy = (
  policy,
  gradeData,
  contextLabel,
  options = {}
) => {
  if (!policy?.isApplicable) {
    return gradeData;
  }

  const isListed =
    policy.studentGradeIds.has(gradeData.student_grades_id) ||
    policy.studentIds.has(gradeData.student_id);

  const remarks = String(
    gradeData.remarks || gradeData.dbRemark || gradeData.remark || ""
  ).toLowerCase();
  if (SPECIAL_REMARKS.has(remarks)) {
    if (options.restrictSpecialRemarksToListed && !isListed) {
      throw new Error(
        "The List of Failures is now active. Special remarks (e.g., Incomplete, Dropped, No Attendance, No Grade, and Withdrawn) are only allowed for highlighted rows. Please ensure that special remarks are entered only for students included in the highlighted rows to avoid submission errors."
      );
    }
    return gradeData;
  }

  const mid = Number(gradeData.mid_grade || 0);
  const finalGrade = Number(gradeData.final_grade || 0);
  const averageGrade = Number(gradeData.grade || 0) || (mid > 0 && finalGrade > 0 ? Math.round((mid + finalGrade) / 2) : 0);

  const hasFailingAverage = averageGrade > 0 && averageGrade < 75;
  const hasPassingAverage = averageGrade >= 75;

  const label = contextLabel ? ` (${contextLabel})` : "";

  if (!isListed) {
    const hasFailing = hasFailingAverage;
    if (hasFailing) {
      throw new Error(
        "The List of Failures is now active. Only students included in the highlighted rows are allowed to receive failing grades. Please review your entries carefully before submitting grades to avoid submission errors."
      );
    }
  }

  if (isListed) {
    const hasPassing = hasPassingAverage;

    if (hasPassing) {
      throw new Error(
        `The List of Failures is now active. Students in the highlighted rows must receive failing grades. Please review your entries carefully before submitting grades to avoid submission errors.`
      );
    }
  }

  return gradeData;
};

/**
 * Apply auto-pass to non-listed students
 * @param {*} conn Database connection
 * @param {Object} classInfo Class information
 * @param {string} termType Term type
 * @param {Array} selectedStudents Selected students
 * @returns {Promise<Object>} Query result
 */
const applyAutoPassForNonListed = async (
  conn,
  classInfo,
  termType,
  selectedStudents
) => {
  const studentIds = selectedStudents.map((item) => item.student_id);
  return await autoPassNonListedStudents(conn, classInfo, termType, studentIds);
};

/**
 * Get failure list roster with selection state
 * @param {*} conn Database connection
 * @param {string} classCode Class code
 * @param {string} termType Term type
 * @returns {Promise<Object>} Policy and roster
 */
const getFailureListRoster = async (conn, classCode, termType) => {
  const policy = await getFailureListPolicy(conn, classCode, termType);

  if (!policy.isApplicable) {
    return { policy, students: [] };
  }

  const rows = await findClassRosterWithGrades(conn, classCode);

  const students = rows.map((row) => ({
    student_grades_id: row.student_grades_id,
    student_id: row.student_id,
    name: row.name,
    selected:
      policy.studentGradeIds.has(row.student_grades_id) ||
      policy.studentIds.has(row.student_id),
  }));

  return { policy, students };
};

module.exports = {
  getFailureListPolicy,
  enforceFailureListPolicy,
  applyAutoPassForNonListed,
  getFailureListRoster,
};
