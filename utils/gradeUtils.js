module.exports.GradeUtil = {
  getVerifiedCellValue: (row, index) => {
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
  },
  getVerifiedCellValueForRemark: (row, index) => {
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
  },
  getGSUploadGrade: (data) => {
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
  },
  getGSUploadRemark: (grade, finalRemark) => {
    const isRemarkPassed =
      finalRemark === "passed" || (grade >= 1 && grade <= 2);
    const hasCredits = isRemarkPassed
      ? `(${`subject`}.lec_units + ${`subject`}.lab_units)`
      : "0";
    return { hasCredits };
  },
  getGSRemark: function (data, grade) {
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
  },
  getUploadGrade: (data) => {
    const student_grades_id = data[0];
    const mid_grade = isNaN(data[1]) ? 0 : data[1];
    const final_grade = isNaN(data[2]) ? 0 : data[2];
    // const grade = isNaN(data[3]) ? 0 : data[3];
    const checkGrades = mid_grade > 64 && final_grade > 64;
    const grade = checkGrades
      ? Math.round([mid_grade, final_grade].reduce((a, b) => a + b) / 2)
      : 0;
    return {
      student_grades_id,
      mid_grade,
      final_grade,
      grade,
    };
  },
  getUploadRemark: (grade, finalRemark) => {
    const isRemarkPassed = grade > 74 || finalRemark === "passed";
    const hasCredits = isRemarkPassed
      ? `(${`subject`}.lec_units + ${`subject`}.lab_units)`
      : "0";
    return { hasCredits };
  },
  getRemark: function (data, grade) {
    const status = data[4]?.toLowerCase();
    const remark = data[5];
    const arrayOfRemarks = [
      "Incomplete",
      "Dropped",
      "No Attendance",
      "No Grade",
      "Withdrawn",
    ];
    if (grade > 74 || status === "passed") {
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
  },
};
