const { isNaNOrNullOrEmpty } = require("./value-formatter-util");

const getVerifiedCellValue = (row, index) => {
  const cell = row.getCell(index);

  if (cell.value !== undefined && cell.value !== null) {
    // If cell contains a computed formula result, return it
    if (typeof cell.result !== "undefined") {
      return cell.result;
    }

    // If cell.value is an object (e.g., sharedFormula), try accessing `formula` or `result`
    if (typeof cell.value === "object") {
      return cell.formula || cell.result || 0; // Prefer formula result, otherwise return 0
    }

    // Otherwise, return the actual value
    return cell.value;
  }
  // If cell is empty or invalid, return 0
  return 0;
};

const getVerifiedCellValueForRemark = (row, index) => {
  const cell = row.getCell(index);
  // Ensure cell has a value
  if (cell.value !== undefined && cell.value !== null) {
    // If cell has a computed formula result, return that
    if (typeof cell.result !== "undefined") {
      return cell.result;
    }

    // If value is an object (like { sharedFormula: 'G14' }), extract a valid value
    if (typeof cell.value === "object") {
      return ""; // Ignore non-string values
    }

    // Otherwise, return the raw value
    return cell.value;
  }

  return "";
};

const getGSUploadGrade = (data) => {
  const student_grades_id = data[0];
  const mid_grade = isNaN(data[1]) ? 0 : data[1]; // If mid grade is NaN, set it to 0
  const final_grade = isNaN(data[2]) ? 0 : data[2]; // If final grade is NaN, set it to 0
  const grade = isNaN(data[3]) ? 0 : data[3]; // If grade is NaN, set it to 0
  return {
    student_grades_id,
    mid_grade,
    final_grade,
    grade,
  };
};

const getGSUploadRemark = (grade, finalRemark) => {
  const isRemarkPassed = finalRemark === "passed" || (grade >= 1 && grade <= 2);
  const hasCredits = isRemarkPassed ? "subj.lec_units + subj.lab_units" : "0";
  return { hasCredits };
};

const getGSRemark = function (data, grade) {
  const status = data[4]?.toLowerCase();
  const remark = data[5];
  const arrayOfRemarks = [
    "Incomplete",
    "Dropped",
    "No Attendance",
    "No Grade",
    "Withdrawn",
  ];
  if ((grade >= 1 && grade <= 2) || status === "passed") {
    return { finalRemark: "passed" };
  }
  if (arrayOfRemarks.includes(remark)) {
    let remarks = "";
    switch (remark) {
      case "Incomplete":
        remarks = "inc";
        break;
      case "Dropped":
        remarks = "drp";
        break;
      case "No Attendance":
        remarks = "na";
      case "No Grade":
        remarks = "ng";
        break;
      case "Withdrawn":
        remarks = "w";
        break;
      default:
        break;
    }
    return { finalRemark: remarks };
  }
  return { finalRemark: status };
};

const getUploadGrade = (data, academic_level) => {
  if (academic_level === "undergraduate") {
    const student_grades_id = data[0];
    const mid_grade = isNaN(data[1]) ? 0 : data[1];
    const final_grade = isNaN(data[2]) ? 0 : data[2];
    const checkGrades = mid_grade > 0 && final_grade > 0;
    const grade = checkGrades
      ? Math.round([mid_grade, final_grade].reduce((a, b) => a + b) / 2)
      : 0;
    return {
      student_grades_id,
      mid_grade,
      final_grade,
      grade,
    };
  }
  const student_grades_id = data[0];
  const mid_grade = isNaN(data[1]) ? 0 : data[1]; // If mid grade is NaN, set it to 0
  const final_grade = isNaN(data[2]) ? 0 : data[2]; // If final grade is NaN, set it to 0
  const grade = isNaN(data[3]) ? 0 : data[3]; // If grade is NaN, set it to 0
  return {
    student_grades_id,
    mid_grade,
    final_grade,
    grade,
  };
};

const getCredits = (grade, finalRemark, academic_level) => {
  if(academic_level === "undergraduate") {
    const isRemarkPassed = grade > 74 || finalRemark === "passed";
    const hasCredits = isRemarkPassed ? "subj.lec_units + subj.lab_units" : "0";
    return { hasCredits };
  }
  const isRemarkPassed = (grade >= 1 && grade <= 2) || finalRemark === "passed";
  const hasCredits = isRemarkPassed ? "subj.lec_units + subj.lab_units" : "0";
  return { hasCredits };
};

const getRemark = function (data, grade, academic_level) {
  const status = data.status?.toLowerCase();
  const remark = data.remark;
  const arrayOfRemarks = [
    "Incomplete",
    "Dropped",
    "No Attendance",
    "No Grade",
    "Withdrawn",
  ];
  if (academic_level === "undergraduate") {
    if (grade > 74 || status === "passed") return { finalRemark: "passed" };
  }
  if ((grade >= 1 && grade <= 2) || status === "passed") return { finalRemark: "passed" };
  if (arrayOfRemarks.includes(remark)) {
    let remarks = "";
    switch (remark) {
      case "Incomplete":
        remarks = "inc";
        break;
      case "Dropped":
        remarks = "drp";
        break;
      case "No Attendance":
        remarks = "na";
      case "No Grade":
        remarks = "ng";
        break;
      case "Withdrawn":
        remarks = "w";
        break;
      default:
        break;
    }
    return { finalRemark: remarks };
  }
  return { finalRemark: status };
};

// This function processes the encoded grade row
const processedEncodedRow = (data, academic_level) => {
  if (academic_level === "undergraduate") {
    return processEncodedUndergradRow(data);
  }
  return processEncodedGraduateRow(data);
};

// This function processes the encoded undergraduate row
const processEncodedUndergradRow = (data) => {
  let { sg_id, mid_grade, final_grade, dbRemark, status } = data;
  // Handle isNaN for mid_grade and final_grade
  mid_grade = isNaNOrNullOrEmpty(mid_grade) ? 0 : mid_grade;
  final_grade = isNaNOrNullOrEmpty(final_grade) ? 0 : final_grade;
  const parsedMidGrade = parseInt(mid_grade);
  const parsedFinalGrade = parseInt(final_grade);
  const checkGrades = parsedMidGrade > 0 && parsedFinalGrade > 0;
  const average = checkGrades
    ? Math.round((parsedMidGrade + parsedFinalGrade) / 2)
    : 0;
  const hasCredits = average > 74 ? "subj.lec_units + subj.lab_units" : "0";
  const remarks =
    status === "passed" || status === "failed" ? status : dbRemark;
  return {
    student_grades_id: sg_id,
    midterm_grade: mid_grade,
    endterm_grade: final_grade,
    grade: average,
    remarks,
    credits: hasCredits,
  };
};

// This function processes the encoded graduate row
const processEncodedGraduateRow = (data) => {
  const { sg_id, mid_grade, end_grade, grade, status, dbRemark } = data;
  // Handle isNaN for mid_grade and final_grade
  const filteredMidGrade = isNaNOrNullOrEmpty(mid_grade) ? 0 : mid_grade;
  const filteredEndGrade = isNaNOrNullOrEmpty(end_grade) ? 0 : end_grade;
  const parsedMidGrade = parseFloat(filteredMidGrade);
  const parsedFinalGrade = parseFloat(filteredEndGrade);
  const hasCredits =
    grade >= 1 && grade <= 2 ? "subj.lec_units + subj.lab_units" : "0";
  const remarks =
    status === "passed" || status === "failed" ? status : dbRemark;
  return {
    student_grades_id: sg_id,
    midterm_grade: parsedMidGrade,
    endterm_grade: parsedFinalGrade,
    grade,
    remarks,
    credits: hasCredits,
  };
};

// This function processes the grade row of the upload method.
const processGradeRow = (gradeData, academic_level) => {
  const { student_grades_id, mid_grade, final_grade, grade } = getUploadGrade(
    gradeData,
    academic_level
  );
  const { finalRemark } = getRemark(gradeData, grade, academic_level);
  const { hasCredits } = getCredits(grade, finalRemark, academic_level);
  return {
    student_grades_id,
    mid_grade,
    final_grade,
    grade,
    remarks: finalRemark,
    credits: hasCredits,
  };
};

module.exports = {
  getVerifiedCellValue,
  getVerifiedCellValueForRemark,
  getGSUploadGrade,
  getGSUploadRemark,
  getGSRemark,
  getUploadGrade,
  getRemark,
  processedEncodedRow,
  processGradeRow,
};
