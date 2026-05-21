/**
 * @typedef {Object} FailureListWindow
 * @property {number} id
 * @property {number} school_year
 * @property {string} semester
 * @property {string} term_type
 * @property {Date} start_date
 * @property {Date} end_date
 * @property {string} post_deadline_action
 * @property {Date} created_at
 * @property {Date} updated_at
 */

/**
 * @typedef {Object} FailureList
 * @property {number} failure_list_id
 * @property {string} class_code
 * @property {string} faculty_id
 * @property {number} school_year
 * @property {string} semester
 * @property {string} term_type
 * @property {string} status
 * @property {Date} submitted_at
 * @property {Date} created_at
 * @property {Date} updated_at
 */

/**
 * @typedef {Object} FailureListStudent
 * @property {number} failure_list_student_id
 * @property {number} failure_list_id
 * @property {string} student_id
 * @property {number} student_grades_id
 * @property {Date} created_at
 */

/**
 * @typedef {Object} ClassInfo
 * @property {string} class_code
 * @property {string} subject_code
 * @property {number} school_year
 * @property {string} semester
 * @property {string} faculty_id
 * @property {string} program_code
 */

/**
 * @typedef {Object} FailureListPolicy
 * @property {boolean} isApplicable
 * @property {string} [reason]
 * @property {ClassInfo} [classInfo]
 * @property {FailureListWindow} [window]
 * @property {FailureList} [list]
 * @property {boolean} [isWindowOpen]
 * @property {boolean} [isWindowClosed]
 * @property {boolean} [isSubmitted]
 * @property {string} [postDeadlineAction]
 * @property {Array} [selectedStudents]
 * @property {Set<string>} [studentIds]
 * @property {Set<number>} [studentGradeIds]
 */

/**
 * @typedef {Object} StudentInRoster
 * @property {number} student_grades_id
 * @property {string} student_id
 * @property {string} name
 * @property {boolean} selected
 */

/**
 * @typedef {Object} GradeData
 * @property {number} student_grades_id
 * @property {string} student_id
 * @property {number} mid_grade
 * @property {number} final_grade
 * @property {number} grade
 * @property {string} remarks
 */

module.exports = {};
