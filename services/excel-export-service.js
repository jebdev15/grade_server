const ExcelJS = require("exceljs");
const { startConnection, endConnection } = require("../config/conn");
const model = require("../models/excel-export-model");

const buildExcelHeader = (
  sheet,
  { class_code, semester, currentSchoolYear },
  instructorName,
  classSection,
  subjectCode
) => {
  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = "Republic of the Philippines";
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value = "CARLOS HILADO MEMORIAL STATE UNIVERSITY";
  sheet.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell("A2").font = { size: 12, bold: true };

  const semesterWord =
    semester === "1st"
      ? "1st Semester"
      : semester === "2nd"
      ? "2nd Semester"
      : "Summer";

  sheet.mergeCells("A3:H3");
  sheet.getCell("A3").value = "Main Campus, Talisay City, Negros Occidental";
  sheet.getCell("A3").alignment = { vertical: "middle", horizontal: "center" };

  const logoPic = sheet.workbook.addImage({
    filename: `${__dirname}/../public/images/logo.png`,
    extension: "png",
  });
  sheet.addImage(logoPic, {
    tl: { col: 1, row: 1 },
    ext: { width: 100, height: 100 },
  });

  sheet.mergeCells("A5:H5");
  sheet.getCell("A5").value = "Office of the Registrar";
  sheet.getCell("A5").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell("A5").font = { size: 12, bold: true };

  sheet.mergeCells("A6:H6");
  sheet.getCell("A6").value = "Student Grade Sheet";
  sheet.getCell("A6").alignment = { vertical: "middle", horizontal: "center" };

  sheet.mergeCells("A7:H7");
  sheet.getCell("A7").value = `${semesterWord}, A.Y. ${currentSchoolYear} - ${
    parseInt(currentSchoolYear) + 1
  }`;
  sheet.getCell("A7").alignment = { vertical: "middle", horizontal: "center" };

  sheet.getCell("A9").value = `SUBJECT: ${subjectCode}`;
  sheet.getCell("A9").font = { bold: true, size: 13 };

  sheet.getCell("A10").value = `INSTRUCTOR: ${instructorName}`;
  sheet.getCell("A10").font = { bold: true, size: 13 };

  sheet.getCell("E10").value = `CURR/ YR/ SEC: ${decodeURI(classSection)}`;
  sheet.getCell("E10").font = { bold: true, size: 13 };
};

const buildExcelData = (sheet, data, academic_level) => {
  sheet.getRow(13).values = [
    "Grade ID",
    "Student ID",
    "Name",
    "Midterm",
    "Endterm",
    academic_level === "Undergraduate" ? "Average" : "Final Grade",
    "Status",
    "Remark",
  ];
  sheet.getRow(13).font = { bold: true };

  sheet.columns = [
    { key: "student_grades_id", width: 10 },
    { key: "student_id", width: 10 },
    { key: "name", width: 50 },
    { key: "mid_grade", width: 10 },
    { key: "final_grade", width: 10 },
    { key: "grade", width: 12 },
    { key: "status", width: 12 },
    { key: "remarks", width: 12 },
  ];

  data.forEach((item, i) => {
    const currentRow = i + 14;
    const remarksMap = {
      passed: { status: "Passed", remark: null },
      failed: { status: "Failed", remark: null },
      inc: { status: null, remark: "Incomplete" },
      drp: { status: null, remark: "Dropped" },
      ng: { status: null, remark: "No Grade" },
      na: { status: null, remark: "No Attendance" },
      w: { status: null, remark: "Withdrawn" },
    };

    const { status, remark } = remarksMap[item.remarks] || {};

    sheet.getRow(currentRow).values = {
      student_grades_id: item.student_grades_id,
      student_id: item.student_id,
      name: item.name,
      mid_grade: item.mid_grade,
      final_grade: item.final_grade,
      grade: item?.grade || 0,
      status,
      remarks: remark,
    };

    const average =
      academic_level === "Undergraduate"
        ? Math.round((parseInt(item.mid_grade) + parseInt(item.final_grade)) / 2)
        : item.grade;

    if (academic_level === "Undergraduate") {
      sheet.getCell(`F${currentRow}`).value = {
        formula: `IF(COUNTIF(D${currentRow}:E${currentRow}, "<>0") > 1, ROUND(AVERAGE(D${currentRow}:E${currentRow}), 0), "")`,
        result: average,
      };

      sheet.getCell(`G${currentRow}`).value = {
        formula: `IF(COUNTIF(D${currentRow}:E${currentRow}, "<>0") > 1, IF(ROUND(AVERAGE(D${currentRow}:E${currentRow}),0) >= 75, "Passed", "Failed"), "")`,
        result: status,
        locked: true,
      };
    } else {
      sheet.getCell(`F${currentRow}`).value = item.grade;
      sheet.getCell(`G${currentRow}`).value = {
        formula: `IF(AND(ISNUMBER(F${currentRow}), F${currentRow}<>""), IF(AND(MROUND(AVERAGE(F${currentRow}), 0.25) <= 2, MROUND(AVERAGE(F${currentRow}), 0.25) >= 1), "Passed", "Failed"), "")`,
        result: status,
        locked: true,
      };
    }

    sheet.getCell(`H${currentRow}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"Incomplete, Dropped, No Attendance, No Grade, Withdrawn"'],
      locked: true,
    };
  });
};

const generateGradesExcel = async (req) => {
  const { class_code, semester, currentSchoolYear, name, classSection } =
    req.query;

  const conn = await startConnection(req);

  try {
    const data = await model.getGradesData(conn, {
      class_code,
      semester,
      currentSchoolYear,
    });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CHMSU Grading Portal";
    workbook.created = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;

    const sheet = workbook.addWorksheet(class_code, {
      pageSetup: {
        fitToPage: true,
        orientation: "portrait",
        margins: {
          left: 0.5,
          right: 0.5,
          top: 0.5,
          bottom: 0.5,
          header: 0,
          footer: 0,
        },
      },
    });
    buildExcelHeader(
      sheet,
      { class_code, semester, currentSchoolYear },
      name,
      classSection,
      data[0].subject_code
    );
    buildExcelData(sheet, data, "Undergraduate");

    return workbook;
  } catch (error) {
    throw error; // Rethrow the error after logging
  } finally {
    await endConnection(conn);
  }
};

const generateGraduateStudiesGradesExcel = async (req) => {
  const { class_code, semester, currentSchoolYear, name, classSection } =
    req.query;

  const conn = await startConnection(req);

  try {
    const data = await model.getGraduateStudiesGradesData(conn, { class_code, semester, currentSchoolYear });
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CHMSU Grading Portal";
    workbook.created = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;

    const sheet = workbook.addWorksheet(class_code, {
      pageSetup: {
        fitToPage: true,
        orientation: "portrait",
        margins: {
          left: 0.5,
          right: 0.5,
          top: 0.5,
          bottom: 0.5,
          header: 0,
          footer: 0,
        },
      },
    });

    buildExcelHeader(
      sheet,
      { class_code, semester, currentSchoolYear },
      name,
      classSection,
      data[0].subject_code
    );
    buildExcelData(sheet, data, "Graduate Studies");

    return workbook;
  } catch (error) {
    throw error; // Rethrow the error after logging
  } finally {
    await endConnection(conn);
  }
};

module.exports = {
  generateGradesExcel,
  generateGraduateStudiesGradesExcel,
};
