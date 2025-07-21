const ExcelJS = require("exceljs");
const { startConnection, endConnection } = require("../config/conn");
const model = require("../models/generate-report-model");
const generateReportUtil = require("../utils/generate-report-util");
const dateFormatterUtil = require("../utils/date-formatter-util");

// Generate report
const generateReport = async (reportType, filters) => {
  switch (reportType) {
    case "grade-sheet-submission-log":
      return await generateGradeSheetSubmissionLog(filters);

    case "deadline-log":
      return await generateDeadlineLog(filters);

    case "account-log":
      return await generateAccountLog(filters);

    case "class-status-log":
      return await generateClassStatusLog(filters);

    case "student-grade-update-log":
      return await generateStudentGradeUpdateLog(filters);

    default:
      throw new Error(`Unsupported report type: ${reportType}`);
  }
};

// Generate grade sheet submission log
const generateGradeSheetSubmissionLog = async (req) => {
  const { toGenerate, schoolYear, semester } = req.query;
  const { currentSemester } = generateReportUtil.getCurrentSemester(semester);
  const campusInfoValue = generateReportUtil.getCampus(req);
  const academicTerm = generateReportUtil.getAcademicTerm(schoolYear, currentSemester);
  const conn = await startConnection(req);

  try {
    const rows = await model.fetchGradeSheetSubmissionLog(
      conn,
      schoolYear,
      semester
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CHMSU Grading System";
    workbook.created = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;

    const sheet = workbook.addWorksheet(toGenerate, {
      pageSetup: { fitToPage: true, orientation: "portrait" },
    });

    // Common reusable formatting
    generateReportUtil.formatCommonHeaders(
      sheet,
      toGenerate,
      academicTerm,
      "",
      campusInfoValue,
      1
    );
    generateReportUtil.addLogo(workbook, sheet);

    // Define columns
    const columns = [
      { key: "fullName", width: 40 },
      { key: "class_code", width: 15 },
      { key: "subject_code", width: 15 },
      { key: "section", width: 30 },
      { key: "term_type", width: 15 },
      { key: "lastUpdate", width: 30 },
      { key: "submittedAt", width: 30 },
    ];

    const headers = [
      "Full Name",
      "Class Code",
      "Subject Code",
      "Program/Year Level/Section",
      "Term Type",
      "Last Update",
      "Submitted At",
    ];

    const dateFormatter = (date) =>
      date
        ? new Date(date).toLocaleString("en-PH", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          })
        : "";

    generateReportUtil.populateSheetContent(
      sheet,
      columns,
      headers,
      rows,
      (item) => ({
        fullName: item.fullName,
        class_code: item.class_code,
        subject_code: item.subject_code,
        section: item.section,
        term_type: item.term_type,
        lastUpdate: dateFormatter(item.lastUpdate),
        submittedAt: dateFormatter(item.submittedAt),
      })
    );

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    throw new Error(error); // Rethrow the error;
  } finally {
    await endConnection(conn);
  }
};

// Generate deadline log
const generateDeadlineLog = async (req) => {
  const { toGenerate, schoolYear, semester } = req.query;
  const campusInfoValue = generateReportUtil.getCampus(req);
  const { currentSemester } = generateReportUtil.getCurrentSemester(semester);
  const academicTerm = generateReportUtil.getAcademicTerm(schoolYear, currentSemester);
  const conn = await startConnection(req);

  try {
    const rows = await model.fetchDeadlineLog(conn, schoolYear, semester);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CHMSU Grading System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Deadline Logs");
    generateReportUtil.formatCommonHeaders(
      sheet,
      toGenerate,
      academicTerm,
      "",
      campusInfoValue,
      1
    );
    generateReportUtil.addLogo(workbook, sheet);

    const columns = [
      { key: "email_used", width: 20 },
      { key: "activity", width: 15 },
      { key: "status", width: 15 },
      { key: "from", width: 15 },
      { key: "to", width: 15 },
      { key: "timestamp", width: 25 },
    ];

    const headers = [
      "Email Used",
      "Activity",
      "Status",
      "From",
      "To",
      "Timestamp",
    ];

    const dateFormatter = (date, includeTime = true) => {
      if (!date) return "";
      const options = includeTime
        ? {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          }
        : { month: "long", day: "numeric", year: "numeric" };

      return new Date(date).toLocaleString("en-PH", options);
    };

    generateReportUtil.populateSheetContent(
      sheet,
      columns,
      headers,
      rows,
      (item) => ({
        email_used: item.email_used,
        activity: item.activity,
        status: item.status,
        from: dateFormatter(item.from, false),
        to: dateFormatter(item.to, false),
        timestamp: dateFormatter(item.timestamp),
      })
    );

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    throw new Error(error);
  } finally {
    await endConnection(conn);
  }
};

// Generate class status log
const generateClassStatusLog = async (req) => {
  const { toGenerate, from, to } = req.query;
  const campusInfoValue = generateReportUtil.getCampus(req);
  const dateRange = generateReportUtil.getDateRange(from, to);
  const conn = await startConnection(req);

  try {
    const rows = await model.fetchClassStatusLog(conn, from, to);
    const workbook = new ExcelJS.Workbook();

    workbook.creator = "CHMSU Grading System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(toGenerate);
    generateReportUtil.formatCommonHeaders(
      sheet,
      toGenerate,
      "",
      dateRange,
      campusInfoValue,
      0
    );
    generateReportUtil.addLogo(workbook, sheet);

    const columns = [
      { key: "email_used", width: 35 },
      { key: "class_code", width: 15 },
      { key: "section", width: 25 },
      { key: "school_year", width: 15 },
      { key: "semester", width: 15 },
      { key: "action_type", width: 15 },
      { key: "timestamp", width: 25 },
    ];

    const headers = [
      "Email Used",
      "Class Code",
      "Program/Year Level/Section",
      "School Year",
      "Semester",
      "Status",
      "Timestamp",
    ];

    const dateFormatter = (date) =>
      date
        ? new Date(date).toLocaleString("en-PH", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          })
        : "";

    generateReportUtil.populateSheetContent(
      sheet,
      columns,
      headers,
      rows,
      (item) => ({
        email_used: item.email_used,
        class_code: item.class_code,
        section: item.section,
        school_year: `${item.school_year}-${item.school_year + 1}`,
        semester: item.semester,
        action_type: item.action_type,
        timestamp: dateFormatter(item.timestamp),
      })
    );

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    throw new Error(error);
  } finally {
    await endConnection(conn);
  }
};

// Generate account log
const generateAccountLog = async (req) => {
  const { toGenerate, from, to } = req.query;
  const campusInfoValue = generateReportUtil.getCampus(req);
  const dateRange = generateReportUtil.getDateRange(from, to);
  const conn = await startConnection(req);

  try {
    const rows = await model.fetchAccountLog(conn, from, to);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CHMSU Grading System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Account Logs");
    generateReportUtil.formatCommonHeaders(
      sheet,
      toGenerate,
      "",
      dateRange,
      campusInfoValue,
      0
    );
    generateReportUtil.addLogo(workbook, sheet);

    const columns = [
      { key: "old_faculty_id", width: 15 },
      { key: "new_faculty_id", width: 15 },
      { key: "old_email", width: 25 },
      { key: "new_email", width: 25 },
      { key: "old_accessLevel", width: 20 },
      { key: "new_accessLevel", width: 20 },
      { key: "old_status", width: 20 },
      { key: "new_status", width: 20 },
      { key: "action_type", width: 20 },
      { key: "email_used", width: 20 },
      { key: "created_at", width: 25 },
    ];

    const headers = [
      "Old Faculty ID",
      "New Faculty ID",
      "Old Email",
      "New Email",
      "Old Access Level",
      "New Access Level",
      "Old Status",
      "New Status",
      "Action Type",
      "Email Used",
      "Timestamp",
    ];

    const dateFormatter = (date) =>
      date
        ? new Date(date).toLocaleString("en-PH", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          })
        : "";

    generateReportUtil.populateSheetContent(
      sheet,
      columns,
      headers,
      rows,
      (item) => ({
        old_faculty_id: item.old_faculty_id,
        new_faculty_id: item.new_faculty_id,
        old_email: item.old_email,
        new_email: item.new_email,
        old_accessLevel: item.old_accessLevel,
        new_accessLevel: item.new_accessLevel,
        old_status: item.old_status,
        new_status: item.new_status,
        action_type: item.action_type,
        email_used: item.email_used,
        created_at: dateFormatter(item.created_at),
      })
    );

    return await workbook.xlsx.writeBuffer();
  } finally {
    await endConnection(conn);
  }
};

const generateStudentGradeUpdateLog = async (req) => {
  const { toGenerate, schoolYear, semester } = req.query;
  const campusInfoValue = generateReportUtil.getCampus(req);
  const { currentSemester } = generateReportUtil.getCurrentSemester(semester);
  const academicTerm = generateReportUtil.getAcademicTerm(
    schoolYear,
    currentSemester
  );
  const conn = await startConnection(req);
  try {
    const rows = await model.fetchStudentGradeUpdateLog(
      conn,
      schoolYear,
      semester
    );
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CHMSU Grading System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Student Grade Update Logs");
    generateReportUtil.formatCommonHeaders(
      sheet,
      toGenerate,
      academicTerm,
      "",
      campusInfoValue,
      1
    );
    generateReportUtil.addLogo(workbook, sheet);

    const columns = [
      { key: "id", width: 10 },
      { key: "student_id", width: 15 },
      { key: "student_name", width: 40 },
      { key: "subject_code", width: 15 },
      // { key: "mid_grade", width: 10 },
      // { key: "final_grade", width: 10 },
      { key: "previous_grade", width: 20 },
      { key: "grade", width: 20 },
      { key: "remarks", width: 12 },
      { key: "credit", width: 10 },
      { key: "updated_by", width: 20 },
      { key: "updated_at", width: 25 },
    ];

    const headers = [
      "No.",
      "Student ID",
      "Student Name",
      "Subject Code",
      // "Midterm Grade",
      // "Endterm Grade",
      "Previous Grade",
      "Current Grade",
      "Remarks",
      "Credit",
      "Encoded By",
      "Timestamp",
    ];

    generateReportUtil.populateSheetContent(
      sheet,
      columns,
      headers,
      rows,
      (item, index) => ({
        id: ++index,
        student_id: item.student_id,
        student_name: item.student_name,
        subject_code: item.subject_code,
        school_year: item.school_year,
        semester: item.semester,
        // mid_grade: item.mid_grade,
        // final_grade: item.final_grade,
        previous_grade: item.previous_grade,
        grade: item.grade,
        remarks: item.remarks,
        credit: item.credit,
        updated_by: item.updated_by,
        updated_at: dateFormatterUtil.formatDateTime(item.updated_at),
      })
    );

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    throw new Error(error);
  } finally {
    await endConnection(conn);
  }
};

module.exports = {
  generateReport,
};
