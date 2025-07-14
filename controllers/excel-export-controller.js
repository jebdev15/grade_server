const service = require("../services/excel-export-service");
const downloadGradesExcel = async (req, res) => {
  try {
    // Generate the Excel workbook
    const workbook = await service.generateGradesExcel(req);

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Student_Grades.xlsx"'
    );

    // Write the workbook to the response stream
    await workbook.xlsx.write(res);

    res.end();
  } catch (err) {
    console.error("Error generating Excel file:", err);
    if (!res.headersSent) res.status(500).send("Error generating Excel file");
    else res.end();
  }
};

const downloadGraduateStudiesGradesExcel = async (req, res) => {
  try {
    const workbook = await service.generateGraduateStudiesGradesExcel(req);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="GS_Student_Grades.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error generating GS Excel file:", err.message);
    if (!res.headersSent) res.status(500).send("Error generating Excel file");
    else res.end();
  }
};

module.exports = {
  downloadGradesExcel,
  downloadGraduateStudiesGradesExcel,
};
