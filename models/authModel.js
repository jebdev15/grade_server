class AuthModel {
    constructor(faculty_id, accessLevel, college_code, program_code) {
      this.faculty_id = faculty_id;
      this.accessLevel = accessLevel;
      this.college_code = college_code;
      this.program_code = program_code;
    }
}
  
module.exports = AuthModel;