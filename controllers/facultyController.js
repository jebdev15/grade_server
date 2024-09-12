const FacultyService = require("../services/facultyService");

const FacultyController = {
    getFacultyBySchoolYearAndSemester: async (req, res) => {
        try {
            const rows = await FacultyService.getFacultyBySchoolYearAndSemester(req, res);
            res.status(200).json({rows, error: null});
          } catch(err) {
            res.status(500).json({rows: [], error: err.message});
            console.error(err.message);
          }
    }
}

module.exports = FacultyController