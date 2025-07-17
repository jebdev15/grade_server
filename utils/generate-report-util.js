const path = require("path");
const getCurrentSemester = (semester) => {
  let currentSemester;
  switch (semester) {
    case "1st":
      currentSemester = "First Semester";
      break;
    case "2nd":
      currentSemester = "Second Semester";
      break;
    case "summer":
      currentSemester = "Summer";
      break;
  }
  return { currentSemester };
};

const getCampus = (req) => {
  const referer = req.headers.referer || req.headers.referrer;
  const refererURL = new URL(referer);
  const refererOrigin = refererURL.origin;
  let campusInfoValue;
  switch (refererOrigin) {
    case "http://localhost:3000":
      campusInfoValue = "Local Campus, Local City, Negros Occidental";
      break;
    case "https://staging-gs.chmsu.edu.ph":
      campusInfoValue = "Staging Campus, Staging City, Negros Occidental";
      break;
    case "https://gs.chmsu.edu.ph":
      campusInfoValue = "Main Campus, Talisay City, Negros Occidental";
      break;
    case "https://ft-gs.chmsu.edu.ph":
      campusInfoValue = "Fortune Towne Campus, Bacolod City, Negros Occidental";
      break;
    case "https://bin-gs.chmsu.edu.ph":
      campusInfoValue = "Binalbagan Campus, Binalbagan, Negros Occidental";
      break;
    case "https://ali-gs.chmsu.edu.ph":
      campusInfoValue = "Alijis Campus, Bacolod City, Negros Occidental";
      break;
    default:
      campusInfoValue = "Default Campus, Default City, Negros Occidental";
  }
  return campusInfoValue;
};

const formatCommonHeaders = (
  sheet,
  title,
  academicTerm,
  dateRange,
  campusInfo,
  isAcademicTerm
) => {
  sheet.mergeCells("A1", "H1");
  sheet.getCell("A1").value = "Republic of the Philippines";
  sheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

  sheet.mergeCells("A2", "H2");
  sheet.getCell("A2").value = "CARLOS HILADO MEMORIAL STATE UNIVERSITY";
  sheet.getCell("A2").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell("A2").font = { size: 12, bold: true };

  sheet.mergeCells("A3", "H3");
  sheet.getCell("A3").value = campusInfo;
  sheet.getCell("A3").alignment = { vertical: "middle", horizontal: "center" };

  sheet.mergeCells("A5", "H5");
  sheet.getCell("A5").value = "Office of the Registrar";
  sheet.getCell("A5").alignment = { vertical: "middle", horizontal: "center" };
  sheet.getCell("A5").font = { size: 12, bold: true };

  sheet.mergeCells("A6", "H6");
  sheet.getCell("A6").value = title;
  sheet.getCell("A6").alignment = { vertical: "middle", horizontal: "center" };

  sheet.mergeCells("A7", "H7");

  const a7Value = isAcademicTerm
    ? academicTerm
    : dateRange;
  sheet.getCell("A7").value = a7Value;
  sheet.getCell("A7").alignment = { vertical: "middle", horizontal: "center" };
};

const addLogo = (workbook, sheet) => {
  const logoPath = path.resolve(__dirname, "../public/images/logo.png");
  const logoPic = workbook.addImage({
    filename: logoPath,
    extension: "png",
  });
  sheet.addImage(logoPic, {
    tl: { col: 1, row: 1 },
    ext: { width: 100, height: 100 },
  });
};

const populateSheetContent = (sheet, columns, headers, rows, formatRowFn) => {
  sheet.columns = columns;
  sheet.getRow(9).values = headers;
  sheet.getRow(9).font = { bold: true, size: 13 };

  rows.forEach((item, i) => {
    const formattedRow = formatRowFn(item, i);
    const row = sheet.getRow(i + 10);
    row.values = formattedRow;
    row.font = { size: 13 };
  });
};

const getAcademicTerm = (schoolYear, currentSemester) => {
  console.log({ schoolYear, currentSemester });
  if (
    currentSemester === "First Semester" ||
    currentSemester === "Second Semester"
  ) {
    console.log(`Academic Term: ${schoolYear} - ${parseInt(schoolYear) + 1}, ${currentSemester}`)
    return `Academic Term: ${schoolYear} - ${parseInt(schoolYear) + 1}, ${currentSemester}`;
  }
  console.log(`Academic Term: ${schoolYear}, ${currentSemester}`)
  return `Academic Term: ${schoolYear}, ${currentSemester}`;
};

const getDateRange = (startDate, endDate) => `Date Range: ${startDate} to ${endDate}`;
module.exports = {
  getCurrentSemester,
  getCampus,
  formatCommonHeaders,
  addLogo,
  populateSheetContent,
  getAcademicTerm,
  getDateRange
};
