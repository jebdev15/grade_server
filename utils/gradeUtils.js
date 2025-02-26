module.exports.GradeUtil = {
    getGSUploadGrade: (data) => {
        const student_grades_id = data[0];
        const mid_grade = isNaN(data[1]) ? 0 : data[1];    
        const final_grade = isNaN(data[2]) ? 0 : data[2];    
        const grade = isNaN(data[3]) ? 0 : data[3];    
        return {
            student_grades_id,
            mid_grade, 
            final_grade, 
            grade
        };    
    },
    getGSUploadRemark: (grade, finalRemark) => {
        const isRemarkPassed = finalRemark === 'passed' || (grade >= 1 && grade <= 2);
        const hasCredits = isRemarkPassed ? `(${`subject`}.lec_units + ${`subject`}.lab_units)` : '0';
        return { hasCredits };
    },
    getGSRemark: function(data, grade) {
        const status = data[4];
        const remark = data[5];
        let remarks = '';
        if((grade >= 1 && grade <= 2) || status === 'passed') {
            remarks = 'passed';
        } else {
            const arrayOfRemarks = ['Incomplete', 'Dropped', 'No Attendance', 'No Grade', 'Withdrawn'];
            if(arrayOfRemarks.includes(remark) && status !== 'passed') {
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
            } else {
                remarks = status;
            }
        }
        return {finalRemark:remarks};
    }
}