const service = require("../services/generate-report-service");
const generateReport = async (req, res) => {
  const { reportType } = req.params;
  try {
    const reportBuffer = await service.generateReport(reportType, req);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${reportType}-${Date.now()}.xlsx`
    );
    res.send(reportBuffer);
  } catch (err) {
    res.status(500).send("Failed to generate report");
  }
};

module.exports = {
  generateReport,
};
