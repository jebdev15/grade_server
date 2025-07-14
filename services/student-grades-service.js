const ExcelJS = require("exceljs");
const fs = require("fs").promises;
const { startConnection, endConnection } = require("../config/conn");
const model = require("../models/student-grades-model");
const gradeFormatterUtil = require("../utils/grade-formatter-util");

const updateGradeById = async (
  conn,
  data,
  modifiedEventKey
) => {
  const result = await model.updateGradeById(conn, data, modifiedEventKey);
  return result;
};

const updateEncodedRow = async (
  conn,
  data,
  modifiedEventKey,
  academic_level
) => {
  try {
    const processedData = gradeFormatterUtil.processedEncodedRow(
      data,
      academic_level
    );
    const result = await updateGradeById(
      conn,
      processedData,
      modifiedEventKey
    );
    return result;
  } catch (error) {
    throw new Error(error.message);
  }
};

const processRow = async (row, subjectCode, modifiedEventKey, conn, i) => {
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
    if (
      currentGrade.length > 0 &&
      currentGrade[0].mid_grade === processedData.mid_grade &&
      currentGrade[0].final_grade === processedData.final_grade &&
      currentGrade[0].grade === processedData.grade &&
      currentGrade[0].remarks === processedData.remarks
    ) {
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

// services for Admin-Faculty Undergraduate Studies
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
    console.error("Error fetching undergraduate student grades:", err.message);
    throw err;
  } finally {
    await endConnection(conn); // Ensure the connection is closed after the operation
  }
};

const updateStudentGrades = async (req) => {
  const conn = await startConnection(req);
  await conn.beginTransaction(); // Start a transaction for the update operation
  try {
    // Extract grades, class_code, and term_type from the request body
    const { grades, class_code, term_type } = req.body;
    const { academic_level } = req.params;
    console.log({ academic_level });
    const userName = req.cookies.name;
    const modifiedEventKey = await model.insertModifiedEventLog(
      conn,
      "modified_eventlog",
      "student_grades",
      userName,
      "Registrar",
      req.ip
    ); // Insert modified event log in modified_eventlog table

    const affectedRowsArr = await Promise.all(
      grades.map(async (grade) => {
        const result = await updateEncodedRow(
          conn,
          grade,
          modifiedEventKey,
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
    await conn.commit(); // Commit the transaction if all updates are successful
    return totalAffectedRows; // Return the total number of affected rows
  } catch (err) {
    console.error("Error updating grades:", err.message);
    await conn.rollback(); // Rollback the transaction in case of error
    throw err; // Propagate error so the controller can handle the response
  } finally {
    await endConnection(conn); // Ensure the connection is closed after the operation
  }
};

const uploadGradeSheet = async (req) => {
  const { class_code, method, term_type } = req.body;
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
  const userName = req.cookies.name || "Unknown User";

  try {
    const subjectCode = await model.getSubjectCodeByClassCode(conn, class_code);
    if (!subjectCode) throw new Error("Class not found");

    await conn.beginTransaction();

    const modifiedEventKey = await model.insertModifiedEventLog(
      conn,
      "modified_eventlog",
      "student_grades",
      userName,
      "Registrar",
      req.ip
    );

    // Replace your for loop with:
    const rowPromises = [];
    for (let i = 14; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      // Skip empty rows (optional)
      if (!row.values[1]) continue;
      rowPromises.push(
        processRow(row, subjectCode, modifiedEventKey, conn, i, "undergraduate")
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
  getStudentsWithGradesByClassCode, // Fetch undergraduate student(s) grade by class code
  updateStudentGrades, // Update undergraduate student grade
  uploadGradeSheet, // Upload grade sheet for undergraduate studies
};
