const StudentService = require("../services/studentService");

const StudentController = {
    getStudentsByClassCode: async (req, res) => {
        try {
            const rows = await StudentService.getStudentsByClassCode(req);
            res.status(200).json({rows, error: null});
        } catch (err) {
            console.log(err.message);
            res.status(500).json({rows: [], error: err.message});
        }
    }
}

module.exports = StudentController