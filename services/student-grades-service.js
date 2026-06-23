const ExcelJS = require("exceljs");
const fs = require("fs").promises;
const { startConnection, endConnection } = require("../config/conn");
const model = require("../models/student-grades-model");
const gradeFormatterUtil = require("../utils/grade-formatter-util");
const { urlDecode } = require("url-encode-base64");
const failureListService = require("@shared/failure-list/services/failure-list.service");

// Faculty - Student Grades
const getStudents = async (req) => {
  const { academic_level, class_code, semester, school_year } = req.params;
  const decode = {
    class_code: urlDecode(class_code),
    semester: urlDecode(semester),
    school_year: urlDecode(school_year)
  };

  const conn = await startConnection(req);
  try {
    if (academic_level === "undergraduate") return await model.fetchUndergradStudents(conn, decode);
    return await model.fetchGraduateStudiesStudents(conn, decode);
  } catch (err) {
    throw err;
  } finally {
    await endConnection(conn);
  }
}

// Faculty - Update Student Grades
const updateStudentGrade = async (req) => {
  const { grades, class_code, method, term_type } = req.body;
  const ipAddress = req.ip;
  const conn = await startConnection(req);
  try {
    await conn.beginTransaction();
    const decodeClassCode = urlDecode(class_code);

    let totalAffectedRows = 0;
    const userName = await model.eventkeyUserEmailRef(conn, req.cookies.email);
    const subjectCode = await model.getSubjectCodeByClassCode(conn, decodeClassCode);
    const subjectCredit = await model.getCredits(conn, subjectCode);
    const failurePolicy = req.params.academic_level === "undergraduate"
      ? await failureListService.getFailureListPolicy(conn, decodeClassCode, term_type)
      : null;

    if (
      failurePolicy?.isApplicable &&
      failurePolicy.isWindowClosed &&
      failurePolicy.isSubmitted &&
      failurePolicy.postDeadlineAction === "auto_pass"
    ) {
      await failureListService.applyAutoPassForNonListed(
        conn,
        failurePolicy.classInfo,
        term_type,
        failurePolicy.selectedStudents || []
      );
    }

    for (const grade of grades) {
      const processedGradeData = gradeFormatterUtil.processedEncodedRow(grade, req.params.academic_level);
      if (req.params.academic_level === "undergraduate" && [processedGradeData.mid_grade, processedGradeData.final_grade, processedGradeData.grade].some(value => Number(value) > 0 && Number(value) < 65)) {
        throw new Error('Grades below 65 are not allowed to be uploaded. Please review the grade entries and upload again.');
        await conn.rollback();
      }
      const policyReadyData = failurePolicy
        ? failureListService.enforceFailureListPolicy(
          failurePolicy,
          { ...processedGradeData, student_id: grade.student_id },
          grade.name || grade.student_id || grade.sg_id,
          { restrictSpecialRemarksToListed: true }
        )
        : processedGradeData;
      const credit = policyReadyData.hasCredits ? subjectCredit : 0;

      const modifiedEventKey = await model.insertModifiedEventLog(
        conn,
        "modified_eventlog",
        "student_grades",
        userName,
        "Registrar",
        ipAddress
      );

      const { hasCredits, ...filteredData } = policyReadyData;
      const data = { ...filteredData, credit, modifiedEventKey }
      try {
        const result = await model.updateStudentGrade(
          conn,
          data
        );

        totalAffectedRows += result.affectedRows || 0;
      } catch (error) {
        throw new Error(error);
      }
    }
    try {
      await model.insertUpdateLog(conn, decodeClassCode, method, term_type);
    } catch (error) {
      throw new Error(error);
    }
    await conn.commit();

    return { totalAffectedRows, changedRows: totalAffectedRows };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await endConnection(conn);
  }
};

// Faculty - Process
// Faculty - Upload Grade Sheet
const uploadExcel = async (req) => {
  const uploadFile = req.file;
  const { method, term_type } = req.body;
  const class_code = urlDecode(req.body.class_code);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(uploadFile.path);

  const sheet = workbook.worksheets[0];
  if (sheet.name !== class_code) {
    await fs.unlink(uploadFile.path);
    throw new Error("Please upload the correct file.");
  }

  const conn = await startConnection(req);
  const userName = await model.eventkeyUserEmailRef(conn, req.cookies.email);
  try {
    await conn.beginTransaction();

    const modifiedEventKey = await model.insertModifiedEventLog(
      conn,
      'modified_eventlog',
      'student_grades',
      userName,
      'Registrar',
      req.ip
    );
    let totalAffectedRows = 0;
    let totalChangedRows = 0;
    const subjectCode = await model.getSubjectCodeByClassCode(conn, class_code);
    if (!subjectCode) throw new Error("Subject code not found");
    const subjectCredit = await model.getCredits(conn, subjectCode);
    const failurePolicy = req.params.academic_level === "undergraduate"
      ? await failureListService.getFailureListPolicy(conn, class_code, term_type)
      : null;

    if (
      failurePolicy?.isApplicable &&
      failurePolicy.isWindowClosed &&
      failurePolicy.isSubmitted &&
      failurePolicy.postDeadlineAction === "auto_pass"
    ) {
      await failureListService.applyAutoPassForNonListed(
        conn,
        failurePolicy.classInfo,
        term_type,
        failurePolicy.selectedStudents || []
      );
    }
    for (let i = 14; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const rowData = gradeFormatterUtil.extractRowData(row);
      if (!rowData[0]) continue;
      const processedUploadRow = gradeFormatterUtil.processGradeRow(rowData, req.params.academic_level);
      if (req.params.academic_level === "undergraduate" && [processedUploadRow.mid_grade, processedUploadRow.final_grade, processedUploadRow.grade].some(value => Number(value) > 0 && Number(value) < 65)) {
        throw new Error('Grades below 65 are not allowed to be uploaded. Please review the grade entries and upload again.');
        await conn.rollback();
      }
      if (failurePolicy) {
        failureListService.enforceFailureListPolicy(
          failurePolicy,
          processedUploadRow,
          rowData[6],
          { restrictSpecialRemarksToListed: true }
        );
      }
      try {
        const { hasCredits, ...filteredData } = processedUploadRow;
        const credit = hasCredits ? subjectCredit : 0;
        const data = { ...filteredData, credit, modified_eventkey: modifiedEventKey, subject_code: subjectCode };
        const currentData = await model.getCurrentStudentGrade(conn, data.student_grades_id);
        const noChanges = gradeFormatterUtil.compareStudentGradeData(currentData[0], data);
        if (noChanges) continue;

        const result = await model.updateGradeRow(conn, data);

        totalAffectedRows += result.affectedRows || 0;
        totalChangedRows += result.changedRows || 0;
      } catch (err) {
        throw new Error(
          `Error processing row ${i}: ${err.message}. Please check the data format.`
        );
      }
    }
    await model.insertUpdateLog(conn, class_code, method, term_type);
    if (totalAffectedRows === 0) {
      await conn.rollback();
      throw new Error("No changes made.");
    }
    await conn.commit();

    return { totalAffectedRows, totalChangedRows };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await endConnection(conn);
    await fs.unlink(uploadFile.path);
  }
};

// Admin - Faculty - Student Grades
const updateGradeById = async (conn, data) => {
  try {
    const result = await model.updateGradeById(conn, data);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

const updateEncodedRow = async (
  conn,
  data,
  modified_eventkey,
  credit,
  academic_level
) => {
  const processedData = gradeFormatterUtil.processedEncodedRow(
    data,
    academic_level
  );
  const { hasCredits, ...filteredData } = processedData;
  const result = await updateGradeById(conn, { ...filteredData, credit: hasCredits ? credit : 0, modified_eventkey });
  return result;
};

const processRow = async (
  row,
  subjectCode,
  modifiedEventKey,
  conn,
  i,
  academic_level,
  failurePolicy
) => {
  const rowData = [
    row.values[1], // Student grade id
    gradeFormatterUtil.getVerifiedCellValue(row, 4), // Midterm grade
    gradeFormatterUtil.getVerifiedCellValue(row, 5), // Endterm grade
    gradeFormatterUtil.getVerifiedCellValue(row, 6), // Average value
    gradeFormatterUtil.getVerifiedCellValueForRemark(row, 7), // Status
    gradeFormatterUtil.getVerifiedCellValueForRemark(row, 8), // Remark
    row.values[3], // Student name
  ];
  try {
    const processedRow = gradeFormatterUtil.processGradeRow(
      rowData,
      academic_level
    );
    if (failurePolicy) {
      failureListService.enforceFailureListPolicy(
        failurePolicy,
        processedRow,
        rowData[6]
      );
    }
    const processedData = {
      ...processedRow,
      subjectCode,
      modifiedEventKey,
    };
    // Fetch the current grade to check if it has changed
    const currentGrade = await model.fetchStudentGradeById(
      conn,
      processedData.student_grades_id
    );

    // If the current grade matches the new grade, do not update
    const hasChanges = gradeFormatterUtil.compareStudentGradeData(
      currentGrade,
      processedData
    )
    if (!hasChanges) {
      return { affectedRows: 0, changedRows: 0 };
    }
    const result = await model.updateGradeRow(conn, processedData);
    return result;
  } catch (err) {
    throw new Error(
      `Error processing row ${i}: ${err.message}. Please check the data format.`
    );
  }
};

// Function to fetch students with no credits
const getStudentsWithNoCredits = async (req) => {
  const conn = await startConnection(req);
  try {
    const rows = await model.fetchStudentsWithNoCredits(conn, req.params);
    if (rows.length > 0) {
      const updatedRows = await model.updateCreditsForPassedStudents(
        conn,
        req.params
      );
      return {
        count: rows.length,
        updated: updatedRows.affectedRows,
      };
    }
    return {
      count: rows.length > 0 ? rows.length : 0,
      updated: 0,
    };
  } catch (err) {
    throw err;
  } finally {
    await endConnection(conn);
  }
};

// Function to fetch student(s) with grade(s)
const getStudentsWithGradesByClassCode = async (req) => {
  const conn = await startConnection(req); // Start a new database connection
  const { academic_level } = req.params;
  try {
    if (academic_level === "undergraduate") {
      return await model.getUndergradGradesByClassCode(
        conn,
        req.params.class_code
      ); // Fetch undergraduate student(s) grade in student_grades table
    }
    return await model.fetchGraduateStudiesStudentGrades(
      conn,
      req.params.class_code
    ); // Fetch undergraduate student(s) grade in student_grades table
  } catch (err) {
    throw err;
  } finally {
    await endConnection(conn); // Ensure the connection is closed after the operation
  }
};

// Function to update student grade
const updateStudentGrades = async (req) => {
  const conn = await startConnection(req);
  await conn.beginTransaction(); // Start a transaction for the update operation
  try {
    // Extract grades, class_code, and term_type from the request body
    const { grades, class_code, term_type } = req.body;
    const { academic_level } = req.params;
    const userName = req.cookies.name || req.cookies.email || "";
    const modifiedEventKey = await model.insertModifiedEventLog(
      conn,
      "modified_eventlog",
      "student_grades",
      userName,
      "Registrar",
      req.ip
    ); // Insert modified event log in modified_eventlog table
    const subjectCode = await model.getSubjectCodeByClassCode(
      conn,
      class_code
    )
    const subjectCredit = await model.getCredits(conn, subjectCode);
    const failurePolicy = academic_level === "undergraduate"
      ? await failureListService.getFailureListPolicy(conn, class_code, term_type)
      : null;

    if (
      failurePolicy?.isApplicable &&
      failurePolicy.isWindowClosed &&
      failurePolicy.isSubmitted &&
      failurePolicy.postDeadlineAction === "auto_pass"
    ) {
      await failureListService.applyAutoPassForNonListed(
        conn,
        failurePolicy.classInfo,
        term_type,
        failurePolicy.selectedStudents || []
      );
    }
    const affectedRowsArr = await Promise.all(
      grades.map(async (grade) => {
        if (failurePolicy) {
          const processed = gradeFormatterUtil.processedEncodedRow(
            grade,
            academic_level
          );
          failureListService.enforceFailureListPolicy(
            failurePolicy,
            { ...processed, student_id: grade.student_id },
            grade.name || grade.student_id || grade.sg_id
          );
        }
        const result = await updateEncodedRow(
          conn,
          grade,
          modifiedEventKey,
          subjectCredit,
          academic_level
        );
        return result.affectedRows;
      })
    ); // Update undergraduate student grade in student_grades table

    const totalAffectedRows = affectedRowsArr.reduce(
      (prev, current) => prev + current,
      0
    );

    await model.insertUpdateLog(conn, class_code, "Manual", term_type); // Insert update log in updates table
    if (totalAffectedRows < 1) {
      await conn.rollback();
      throw new Error("No rows were updated");
    }
    await conn.commit(); // Commit the transaction if all updates are successful
    return totalAffectedRows; // Return the total number of affected rows
  } catch (err) {
    await conn.rollback(); // Rollback the transaction in case of error
    throw err; // Propagate error so the controller can handle the response
  } finally {
    await endConnection(conn); // Ensure the connection is closed after the operation
  }
};

const uploadGradeSheet = async (req) => {
  const { class_code, method, term_type } = req.body;
  const { academic_level } = req.params;
  const file = req.file;
  if (!file) throw new Error("No file uploaded");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file.path);
  const sheet = workbook.worksheets[0];

  if (sheet.name !== class_code) {
    await fs.unlink(file.path);
    throw new Error(
      `The uploaded file does not match. Please upload the correct file.`
    );
  }

  const conn = await startConnection(req);
  const userName = req.cookies.name || req.cookies.email || "";

  try {
    const subjectCode = await model.getSubjectCodeByClassCode(conn, class_code);
    if (!subjectCode) throw new Error("Subject code not found");

    const failurePolicy = academic_level === "undergraduate"
      ? await failureListService.getFailureListPolicy(conn, class_code, term_type)
      : null;

    await conn.beginTransaction();

    const modifiedEventKey = await model.insertModifiedEventLog(
      conn,
      "modified_eventlog",
      "student_grades",
      userName,
      "Registrar",
      req.ip
    );

    if (
      failurePolicy?.isApplicable &&
      failurePolicy.isWindowClosed &&
      failurePolicy.isSubmitted &&
      failurePolicy.postDeadlineAction === "auto_pass"
    ) {
      await failureListService.applyAutoPassForNonListed(
        conn,
        failurePolicy.classInfo,
        term_type,
        failurePolicy.selectedStudents || []
      );
    }

    // Replace your for loop with:
    const rowPromises = [];
    for (let i = 14; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      // Skip empty rows (optional)
      if (!row.values[1]) continue;
      rowPromises.push(
        processRow(
          row,
          subjectCode,
          modifiedEventKey,
          conn,
          i,
          academic_level,
          failurePolicy
        )
      );
    }
    await Promise.all(rowPromises);
    await model.insertUpdateLog(conn, class_code, method, term_type); // Insert update log in updates table

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await endConnection(conn); // Ensure the connection is closed after the operation
    // Clean up the uploaded file
    await fs.unlink(file.path).catch((error) => {
      throw new Error(`Failed to delete uploaded file: ${error.message}`);
    });
  }
};

module.exports = {
  getStudents, // Fetch student with grades. This function is used by the faculty
  updateStudentGrade, // Update student grade. This function is used by the faculty
  uploadExcel, // Upload grade sheet. This function is used by the faculty
  getStudentsWithNoCredits, // Fetch students with no credits
  getStudentsWithGradesByClassCode, // Fetch undergraduate student(s) grade by class code
  updateStudentGrades, // Update undergraduate student grade
  uploadGradeSheet, // Upload grade sheet for undergraduate studies
};
