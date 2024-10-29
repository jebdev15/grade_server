const SubjectLoadService = require("../services/subjectLoadService");

const SubjectLoadController = {
    getClassByFacultyIdYearAndSemester: async (req, res) => {
        try {
          const rows = await SubjectLoadService.getSubjectLoadByFacultyIdYearAndSemester(req);
          res.json(rows);
        } catch (err) {
          res.status(500).json(err.message);
        }
    },
    updateClassStatusByClassCode: async (req, res) => {
        try {
            const response = await SubjectLoadService.updateClassStatusByClassCode(req, res);
            res.json(response)
        } catch(err) {
            res.json({"success": false ,"message": "Failed to Update", "error": err.message})
            console.error(err.message);
        }
    },
    updateMidtermClassStatusByClassCode: async (req, res) => {
      try {
          const response = await SubjectLoadService.updateMidtermClassStatusByClassCode(req, res);
          res.json(response)
      } catch(err) {
          res.json({"success": false ,"message": "Failed to Update", "error": err.message})
          console.error(err.message);
      }
  },
    updateClassStatusByYearAndSemester: async (req, res) => {
        try {
          const response = await SubjectLoadService.updateClassStatusByYearAndSemester(req, res);
          res.json(response)
        } catch (error) {
          console.error(error);
          res.json({message: "Failed to Update", error: error.message});
        }
    },
}

module.exports = SubjectLoadController