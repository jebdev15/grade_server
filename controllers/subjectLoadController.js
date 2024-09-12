const SubjectLoadService = require("../services/subjectLoadService");

const SubjectLoadController = {
    updateClassStatusByClassCode: async (req, res) => {
        try {
            const response = await SubjectLoadService.updateClassStatusByClassCode(req, res);
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
    }
}

module.exports = SubjectLoadController