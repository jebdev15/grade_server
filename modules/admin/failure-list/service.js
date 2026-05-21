/**
 * Admin Service
 * Admin-only business logic for window and list management
 */

const { repository } = require("@shared/failure-list");

const getWindow = async (conn, schoolYear, semester, termType) => {
  return repository.findWindowByTermKey(conn, schoolYear, semester, termType);
};

const listWindows = async (conn) => {
  return repository.listWindows(conn);
};

const saveWindow = async (conn, windowData) => {
  return repository.saveWindow(conn, windowData);
};

const deleteWindow = async (conn, id) => {
  return repository.deleteWindowById(conn, id);
};

const getClassRoster = async (conn, classCode, termType) => {
  const classInfo = await repository.findClassByCode(conn, classCode);
  if (!classInfo) {
    return { classInfo: null, students: [] };
  }

  const list = await repository.findListByClassKey(
    conn,
    classCode,
    classInfo.school_year,
    classInfo.semester,
    termType
  );
  const selectedStudents = await repository.findStudentsByListId(conn, list?.failure_list_id);
  const allStudents = await repository.findClassRosterWithGrades(conn, classCode);

  const selectedIds = new Set(selectedStudents.map((s) => s.student_id));
  const selectedGradeIds = new Set(
    selectedStudents
      .map((s) => s.student_grades_id)
      .filter((v) => v !== null && v !== undefined)
  );

  const students = allStudents.map((row) => ({
    student_grades_id: row.student_grades_id,
    student_id: row.student_id,
    name: row.name,
    selected:
      selectedGradeIds.has(row.student_grades_id) ||
      selectedIds.has(row.student_id),
  }));

  return { classInfo, students };
};

const upsertFailureList = async (conn, classCode, termType, students, status) => {
  const classInfo = await repository.findClassByCode(conn, classCode);
  if (!classInfo) {
    throw new Error("Class not found");
  }

  return repository.saveList(conn, classInfo, termType, students, status);
};

const deleteFailureList = async (conn, classCode, termType) => {
  const classInfo = await repository.findClassByCode(conn, classCode);
  if (!classInfo) {
    throw new Error("Class not found");
  }

  const list = await repository.findListByClassKey(
    conn,
    classCode,
    classInfo.school_year,
    classInfo.semester,
    termType
  );

  if (!list) {
    throw new Error("No list found");
  }

  await repository.deleteListById(conn, list.failure_list_id);
};

module.exports = {
  getWindow,
  listWindows,
  saveWindow,
  deleteWindow,
  getClassRoster,
  upsertFailureList,
  deleteFailureList,
};
